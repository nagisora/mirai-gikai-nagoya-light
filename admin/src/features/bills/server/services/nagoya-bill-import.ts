import { randomUUID } from "node:crypto";
import {
  type Bill,
  type BillStatus,
  type CouncilSession,
  getAllBills,
  getAllCouncilSessions,
  saveBill,
} from "@mirai-gikai/data";
import { assertNagoyaOfficialFetchUrl } from "@/lib/assert-nagoya-official-fetch-url";

const MAYOR_BILLS_INDEX_URL =
  "https://www.city.nagoya.jp/shikai/shingi/1030858/1030859/index.html";
const COUNCIL_MEMBER_BILLS_INDEX_URL =
  "https://www.city.nagoya.jp/shikai/shingi/1030858/1030911/index.html";
const ADOPTED_OPINIONS_INDEX_URL =
  "https://www.city.nagoya.jp/shikai/shingi/1030956/index.html";

type SourceKind = "mayor" | "council_member";

type OfficialBill = {
  key: string;
  sourceKind: SourceKind;
  sourceLabel: string;
  sourceUrl: string;
  bill_number: string;
  name: string;
  submitted_date: string | null;
  committee: string | null;
  voted_date: string | null;
  result: string | null;
  status: BillStatus;
  status_note: string | null;
  pdf_url: string | null;
  pdf_match: "exact" | "none";
};

export type NagoyaBillImportStatus =
  | "create"
  | "update"
  | "unchanged"
  | "local_only"
  | "skipped";

export type NagoyaBillImportCandidate = {
  id: string;
  key: string;
  status: NagoyaBillImportStatus;
  reason: string;
  sourceKind: SourceKind | null;
  sourceLabel: string | null;
  sourceUrl: string | null;
  existing: Bill | null;
  next: Bill | null;
  changes: Array<{
    field:
      | "bill_number"
      | "name"
      | "submitted_date"
      | "status"
      | "status_note"
      | "pdf_url";
    before: string | null;
    after: string | null;
  }>;
};

export type NagoyaBillImportPreview = {
  councilSession: CouncilSession | null;
  candidates: NagoyaBillImportCandidate[];
  errors: string[];
};

function normalizeText(value: string) {
  return decodeHtmlEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalizeDigits(value: string) {
  return value.replace(/[０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0)
  );
}

function normalizeBillNumber(value: string, sourceKind?: SourceKind | null) {
  const normalized = normalizeDigits(value).replace(/\s+/g, "");
  if (sourceKind === "council_member") {
    return normalized.replace(/^議員提出議案/, "");
  }
  return normalized;
}

function normalizeBillName(value: string) {
  return normalizeDigits(value)
    .replace(/\s+/g, "")
    .replace(/（PDF[^）]*）/g, "")
    .replace(/の提出について$/, "")
    .trim();
}

function buildBillKey(
  billNumber: string,
  name: string,
  sourceKind?: SourceKind | null
) {
  return `${normalizeBillNumber(billNumber, sourceKind)}:${normalizeBillName(
    name
  )}`;
}

async function fetchText(url: string) {
  assertNagoyaOfficialFetchUrl(url);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

function findSessionLink(
  html: string,
  indexUrl: string,
  sessionName: string,
  label: string
) {
  const anchorPattern = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const href = match[1];
    const text = normalizeText(match[2]);
    if (text.includes(sessionName) && text.includes(label)) {
      return new URL(href, indexUrl).toString();
    }
  }
  return null;
}

function extractCells(rowHtml: string) {
  return [...rowHtml.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(
    (match) => normalizeText(match[1])
  );
}

function parseJapaneseMonthDay(value: string, councilSession: CouncilSession) {
  const match = normalizeDigits(value).match(/(\d{1,2})月(\d{1,2})日/);
  if (!match) return null;
  const year = Number(councilSession.start_date.slice(0, 4));
  const sessionMonth = Number(councilSession.start_date.slice(5, 7));
  const month = Number(match[1]);
  const day = Number(match[2]);
  const dateYear = month < sessionMonth ? year + 1 : year;
  return `${dateYear}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;
}

function mapResultToStatus(result: string | null): BillStatus {
  if (!result) return "submitted";
  if (result.includes("否決")) return "rejected";
  if (result.includes("一部採択")) return "partially_adopted";
  if (result.includes("採択")) return "adopted";
  if (result.includes("報告")) return "reported";
  if (result.includes("可決") || result.includes("同意")) return "approved";
  return "submitted";
}

function buildStatusNote(
  sourceLabel: string,
  committee: string | null,
  votedDate: string | null,
  result: string | null,
  sourceUrl: string
) {
  const parts = [`提出区分: ${sourceLabel}`];
  if (committee) parts.push(`付議委員会: ${committee}`);
  if (votedDate) parts.push(`議決日: ${votedDate}`);
  if (result) parts.push(`議決結果: ${result}`);
  parts.push(`公式URL: ${sourceUrl}`);
  return parts.join(" / ");
}

function parseBillRows(
  html: string,
  councilSession: CouncilSession,
  sourceKind: SourceKind,
  sourceUrl: string,
  pdfByName: Map<string, string>
) {
  const sourceLabel = sourceKind === "mayor" ? "市長提出案件" : "議員提出議案";
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  const bills: OfficialBill[] = [];
  let lastSubmittedDate: string | null = null;

  for (const row of rows) {
    const cells = extractCells(row[1]);
    if (cells.length < 6 || cells[0] === "議案番号") continue;
    const [rawNumber, name, submittedDate, committee, votedDate, result] =
      cells;
    if (!rawNumber || !name) continue;

    const parsedSubmittedDate = parseJapaneseMonthDay(
      submittedDate,
      councilSession
    );
    if (parsedSubmittedDate) {
      lastSubmittedDate = parsedSubmittedDate;
    }
    const parsedVotedDate = parseJapaneseMonthDay(votedDate, councilSession);
    const status = mapResultToStatus(result);
    const bill_number =
      sourceKind === "council_member" && !rawNumber.startsWith("議員提出議案")
        ? `議員提出議案${rawNumber}`
        : rawNumber;
    const status_note = buildStatusNote(
      sourceLabel,
      committee || null,
      parsedVotedDate,
      result || null,
      sourceUrl
    );
    const pdf_url =
      sourceKind === "council_member"
        ? (pdfByName.get(normalizeBillName(name)) ?? null)
        : null;

    bills.push({
      key: buildBillKey(bill_number, name, sourceKind),
      sourceKind,
      sourceLabel,
      sourceUrl,
      bill_number,
      name,
      submitted_date: parsedSubmittedDate ?? lastSubmittedDate,
      committee: committee || null,
      voted_date: parsedVotedDate,
      result: result || null,
      status,
      status_note,
      pdf_url,
      pdf_match: pdf_url ? "exact" : "none",
    });
  }

  return bills;
}

async function fetchOfficialBills(councilSession: CouncilSession) {
  const [mayorIndexHtml, councilMemberIndexHtml, adoptedOpinionsIndexHtml] =
    await Promise.all([
      fetchText(MAYOR_BILLS_INDEX_URL),
      fetchText(COUNCIL_MEMBER_BILLS_INDEX_URL),
      fetchText(ADOPTED_OPINIONS_INDEX_URL),
    ]);

  const adoptedOpinionsUrl = findSessionLink(
    adoptedOpinionsIndexHtml,
    ADOPTED_OPINIONS_INDEX_URL,
    councilSession.name,
    "可決された意見書"
  );
  const adoptedOpinionPdfByName = adoptedOpinionsUrl
    ? await fetchAdoptedOpinionPdfMap(adoptedOpinionsUrl)
    : new Map<string, string>();

  const links = [
    {
      sourceKind: "mayor" as const,
      sourceUrl: findSessionLink(
        mayorIndexHtml,
        MAYOR_BILLS_INDEX_URL,
        councilSession.name,
        "市長提出案件"
      ),
      pdfByName: new Map<string, string>(),
    },
    {
      sourceKind: "council_member" as const,
      sourceUrl: findSessionLink(
        councilMemberIndexHtml,
        COUNCIL_MEMBER_BILLS_INDEX_URL,
        councilSession.name,
        "議員提出議案"
      ),
      pdfByName: adoptedOpinionPdfByName,
    },
  ];

  const bills: OfficialBill[] = [];
  const errors: string[] = [];
  for (const link of links) {
    if (!link.sourceUrl) {
      errors.push(`${councilSession.name}: ${link.sourceKind} page not found`);
      continue;
    }
    const html = await fetchText(link.sourceUrl);
    bills.push(
      ...parseBillRows(
        html,
        councilSession,
        link.sourceKind,
        link.sourceUrl,
        link.pdfByName
      )
    );
  }

  return { bills, errors };
}

async function fetchAdoptedOpinionPdfMap(url: string) {
  const html = await fetchText(url);
  const anchorPattern = /<a\b[^>]*href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi;
  const pdfs = new Map<string, string>();
  for (const match of html.matchAll(anchorPattern)) {
    const label = normalizeText(match[2]);
    const key = normalizeBillName(label);
    if (!key || pdfs.has(key)) continue;
    pdfs.set(key, new URL(match[1], url).toString());
  }
  return pdfs;
}

function mergeBill(existing: Bill | undefined, official: OfficialBill) {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? randomUUID(),
    name: official.name,
    bill_number: official.bill_number,
    slug: existing?.slug ?? null,
    status: official.status,
    status_note: official.status_note,
    publish_status: existing?.publish_status ?? "draft",
    council_session_id: existing?.council_session_id ?? null,
    is_featured: existing?.is_featured ?? false,
    published_at: existing?.published_at ?? null,
    submitted_date: official.submitted_date,
    thumbnail_url: existing?.thumbnail_url ?? null,
    share_thumbnail_url: existing?.share_thumbnail_url ?? null,
    pdf_url: existing?.pdf_url ?? official.pdf_url,
    tag_ids: existing?.tag_ids ?? [],
    bill_contents: existing?.bill_contents ?? [],
    faction_stances: existing?.faction_stances ?? [],
    created_at: existing?.created_at ?? now,
    updated_at: now,
  } satisfies Bill;
}

function buildChanges(existing: Bill | undefined, next: Bill) {
  if (!existing) return [];
  const fields = [
    "bill_number",
    "name",
    "submitted_date",
    "status",
    "status_note",
    "pdf_url",
  ] as const;
  return fields
    .map((field) => ({ field, before: existing[field], after: next[field] }))
    .filter((change) => change.before !== change.after);
}

export async function previewNagoyaBillImport(
  councilSessionId: string
): Promise<NagoyaBillImportPreview> {
  const [sessions, allBills] = await Promise.all([
    getAllCouncilSessions(),
    getAllBills(),
  ]);
  const councilSession =
    sessions.find((session) => session.id === councilSessionId) ?? null;
  if (!councilSession) {
    return {
      councilSession: null,
      candidates: [],
      errors: [`Council session not found: ${councilSessionId}`],
    };
  }

  const existingBills = allBills.filter(
    (bill) => bill.council_session_id === councilSessionId
  );
  const existingByKey = new Map<string, Bill>();
  for (const bill of existingBills) {
    existingByKey.set(buildBillKey(bill.bill_number, bill.name, null), bill);
    existingByKey.set(
      buildBillKey(bill.bill_number, bill.name, "council_member"),
      bill
    );
  }
  const { bills: officialBills, errors } =
    await fetchOfficialBills(councilSession);
  const matchedExistingIds = new Set<string>();

  const candidates = officialBills.map<NagoyaBillImportCandidate>(
    (official) => {
      const existing = existingByKey.get(official.key);
      if (existing) matchedExistingIds.add(existing.id);
      const next = mergeBill(existing, official);
      next.council_session_id = councilSessionId;
      const changes = buildChanges(existing, next);
      const importId = `create:${councilSessionId}:${official.sourceKind}:${official.key}`;
      return {
        id: existing?.id ?? importId,
        key: official.key,
        status: existing
          ? changes.length > 0
            ? "update"
            : "unchanged"
          : "create",
        reason: "",
        sourceKind: official.sourceKind,
        sourceLabel: official.sourceLabel,
        sourceUrl: official.sourceUrl,
        existing: existing ?? null,
        next,
        changes,
      };
    }
  );

  for (const existing of existingBills) {
    if (matchedExistingIds.has(existing.id)) continue;
    candidates.push({
      id: existing.id,
      key: buildBillKey(existing.bill_number, existing.name, null),
      status: "local_only",
      reason: "公式一覧に一致する議案が見つかりません",
      sourceKind: null,
      sourceLabel: null,
      sourceUrl: null,
      existing,
      next: null,
      changes: [],
    });
  }

  return { councilSession, candidates, errors };
}

export async function applyNagoyaBillImport(
  councilSessionId: string,
  ids: string[]
) {
  const preview = await previewNagoyaBillImport(councilSessionId);
  if (preview.errors.length > 0) {
    return { appliedCount: 0, errors: preview.errors };
  }

  const selected = new Set(ids);
  const targets = preview.candidates
    .filter(
      (candidate) =>
        selected.has(candidate.id) &&
        candidate.next &&
        (candidate.status === "create" || candidate.status === "update")
    )
    .map((candidate) => candidate.next as Bill);

  for (const target of targets) {
    await saveBill(target);
  }

  return { appliedCount: targets.length, errors: [] };
}
