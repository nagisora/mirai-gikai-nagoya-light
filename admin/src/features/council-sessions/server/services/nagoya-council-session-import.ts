import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import {
  type CouncilSession,
  getAllCouncilSessions,
  saveCouncilSession,
} from "@mirai-gikai/data";

const OVERVIEW_INDEX_URL =
  "https://www.city.nagoya.jp/shikai/kouhou/1031662/index.html";
const ANNUAL_SCHEDULE_URL =
  "https://www.city.nagoya.jp/shikai/about/1030648/1030649.html";
const KNOWN_ACTIVITY_URLS = [
  "https://www.city.nagoya.jp/shikai/kouhou/1030998/1030999/1034675/1044429/1044433.html",
];

const execFileAsync = promisify(execFile);
const PDFTOTEXT_MISSING_MESSAGE =
  "pdftotext が見つかりません。定例会概要PDFから会期を取得するには poppler-utils をインストールしてください。";

type DateConfidence = "actual" | "planned" | "existing" | "missing";

type DateSource = {
  start_date: string;
  end_date: string | null;
  source: string;
  confidence: DateConfidence;
};

type OverviewSession = {
  id: string;
  name: string;
  slug: string;
  council_url: string;
};

export type NagoyaCouncilSessionImportStatus =
  | "create"
  | "update"
  | "unchanged"
  | "skipped"
  | "needs_review";

export type NagoyaCouncilSessionImportCandidate = {
  id: string;
  name: string;
  councilUrl: string;
  status: NagoyaCouncilSessionImportStatus;
  reason: string;
  existing: CouncilSession | null;
  next: CouncilSession | null;
  dateSource: {
    url: string;
    confidence: DateConfidence;
  };
  changes: Array<{
    field: "name" | "start_date" | "end_date" | "council_url";
    before: string | null;
    after: string | null;
  }>;
};

export type NagoyaCouncilSessionImportPreview = {
  candidates: NagoyaCouncilSessionImportCandidate[];
  errors: string[];
};

export type ManualNagoyaCouncilSessionImportInput = {
  id: string;
  start_date: string;
  end_date: string | null;
};

function normalizeText(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDigits(value: string) {
  return value.replace(/[０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0)
  );
}

function normalizePdfText(value: string) {
  return normalizeDigits(value)
    .replace(/[⽇]/g, "日")
    .replace(/[︓]/g, "：")
    .replace(/\s+/g, "");
}

async function fetchText(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

function reiwaToYear(reiwaYear: string | number) {
  return 2018 + Number(reiwaYear);
}

function two(value: number) {
  return String(value).padStart(2, "0");
}

function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${two(month)}-${two(day)}`;
}

function sessionIdFromName(name: string) {
  const match = name.match(/^令和(\d+)年(\d+)月定例会/);
  if (!match) {
    throw new Error(`Unsupported session name: ${name}`);
  }
  const year = reiwaToYear(match[1]);
  const month = Number(match[2]);
  const monthSlug =
    {
      2: "feb",
      6: "jun",
      8: "aug",
      9: "sep",
      11: "nov",
    }[month] ?? String(month).padStart(2, "0");
  return `nagoya-r${match[1]}-${monthSlug}-${year}`;
}

function extractOverviewSessions(html: string): OverviewSession[] {
  const sessions: OverviewSession[] = [];
  const anchorPattern = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const href = match[1];
    const label = normalizeText(match[2]);
    const nameMatch = label.match(/^(令和\d+年\d+月定例会)の概要/);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    const id = sessionIdFromName(name);
    sessions.push({
      id,
      name,
      slug: id,
      council_url: new URL(href, OVERVIEW_INDEX_URL).toString(),
    });
  }

  return [...new Map(sessions.map((s) => [s.id, s])).values()].sort((a, b) =>
    b.id.localeCompare(a.id)
  );
}

function extractAnnualScheduleDates(html: string) {
  const text = normalizeText(html);
  const dates = new Map<string, DateSource>();
  const headings = [...text.matchAll(/令和(\d+)年度\s*議会予定/g)];

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const blockStart = heading.index ?? 0;
    const blockEnd = headings[i + 1]?.index ?? text.length;
    const block = text.slice(blockStart, blockEnd);
    const fiscalReiwaYear = Number(heading[1]);
    const pattern =
      /(\d+)月定例会\s+令和(\d+)年(\d+)月(\d+)日(?:（[^）]+）)?から(?:(?:令和(\d+)年)?(\d+)月)?(\d+)日(?:（[^）]+）)?/g;

    for (const match of block.matchAll(pattern)) {
      const sessionMonth = Number(match[1]);
      const startYear = reiwaToYear(match[2]);
      const startMonth = Number(match[3]);
      const startDay = Number(match[4]);
      const endYear = match[5] ? reiwaToYear(match[5]) : startYear;
      const endMonth = match[6] ? Number(match[6]) : startMonth;
      const endDay = Number(match[7]);
      const sessionYear =
        sessionMonth === 2
          ? reiwaToYear(fiscalReiwaYear + 1)
          : reiwaToYear(fiscalReiwaYear);
      const id = sessionIdFromName(
        `令和${sessionYear - 2018}年${sessionMonth}月定例会`
      );
      dates.set(id, {
        start_date: toIsoDate(startYear, startMonth, startDay),
        end_date: toIsoDate(endYear, endMonth, endDay),
        source: ANNUAL_SCHEDULE_URL,
        confidence: "planned",
      });
    }
  }

  return dates;
}

function extractActivityDates(html: string, url: string) {
  const text = normalizeText(html);
  const titleMatch = text.match(/令和(\d+)年 名古屋市会の歩み/);
  if (!titleMatch) return new Map<string, DateSource>();

  const calendarYear = reiwaToYear(titleMatch[1]);
  const dates = new Map<string, DateSource>();
  const pattern =
    /(\d+)月定例会は、(\d+)月(\d+)日から(?:(\d+)月)?(\d+)日まで開かれました/g;

  for (const match of text.matchAll(pattern)) {
    const sessionMonth = Number(match[1]);
    const startMonth = Number(match[2]);
    const startDay = Number(match[3]);
    const endMonth = match[4] ? Number(match[4]) : startMonth;
    const endDay = Number(match[5]);
    const endYear = endMonth < startMonth ? calendarYear + 1 : calendarYear;
    const id = sessionIdFromName(
      `令和${calendarYear - 2018}年${sessionMonth}月定例会`
    );
    dates.set(id, {
      start_date: toIsoDate(calendarYear, startMonth, startDay),
      end_date: toIsoDate(endYear, endMonth, endDay),
      source: url,
      confidence: "actual",
    });
  }

  return dates;
}

function extractPdfUrl(html: string, pageUrl: string) {
  const pdfLink = html.match(/<a\b[^>]*href="([^"]+\.pdf)"[^>]*>/i);
  return pdfLink ? new URL(pdfLink[1], pageUrl).toString() : null;
}

function extractSessionYear(name: string) {
  const match = name.match(/^令和(\d+)年/);
  return match ? reiwaToYear(match[1]) : null;
}

function extractDateSourceFromPdfText(
  text: string,
  session: OverviewSession,
  pdfUrl: string
): DateSource | null {
  const normalized = normalizePdfText(text);
  const match =
    normalized.match(
      /会期[：:]?(\d{1,2})月(\d{1,2})日[～〜-](\d{1,2})月(\d{1,2})日/
    ) ??
    normalized.match(/会期[：:]?(\d{1,2})月(\d{1,2})日(\d{1,2})月(\d{1,2})日/);
  if (!match) return null;

  const startMonth = Number(match[1]);
  const startDay = Number(match[2]);
  const endMonth = Number(match[3]);
  const endDay = Number(match[4]);
  const startYear = extractSessionYear(session.name);
  if (!startYear) return null;

  return {
    start_date: toIsoDate(startYear, startMonth, startDay),
    end_date: toIsoDate(
      endMonth < startMonth ? startYear + 1 : startYear,
      endMonth,
      endDay
    ),
    source: pdfUrl,
    confidence: "actual",
  };
}

async function pdfToText(pdfUrl: string) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "nagoya-session-"));
  const pdfPath = path.join(tmpDir, "session.pdf");
  try {
    const res = await fetch(pdfUrl, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(
        `Failed to fetch ${pdfUrl}: ${res.status} ${res.statusText}`
      );
    }
    await fs.writeFile(pdfPath, Buffer.from(await res.arrayBuffer()));
    let stdout: string;
    try {
      ({ stdout } = await execFileAsync("pdftotext", [pdfPath, "-"], {
        maxBuffer: 1024 * 1024 * 10,
      }));
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        throw new Error(PDFTOTEXT_MISSING_MESSAGE);
      }
      throw error;
    }
    return stdout;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

async function extractPdfDates(sessions: OverviewSession[]) {
  const errors: string[] = [];
  const entries = await Promise.all(
    sessions.map(async (session) => {
      try {
        const html = await fetchText(session.council_url);
        const pdfUrl = extractPdfUrl(html, session.council_url);
        if (!pdfUrl) return null;
        const text = await pdfToText(pdfUrl);
        const dateSource = extractDateSourceFromPdfText(text, session, pdfUrl);
        return dateSource ? ([session.id, dateSource] as const) : null;
      } catch (error) {
        if (error instanceof Error) {
          errors.push(`${session.name}: ${error.message}`);
        }
        return null;
      }
    })
  );
  return {
    dates: new Map(entries.filter((entry) => entry !== null)),
    errors: [...new Set(errors)],
  };
}

function mergeDateMaps(...maps: Array<Map<string, DateSource>>) {
  const result = new Map<string, DateSource>();
  for (const map of maps) {
    for (const [id, value] of map) {
      const current = result.get(id);
      if (!current || value.confidence === "actual") {
        result.set(id, value);
      }
    }
  }
  return result;
}

function isNagoyaCityUrl(url: string | null) {
  if (!url) return false;
  try {
    return new URL(url).hostname === "www.city.nagoya.jp";
  } catch {
    return false;
  }
}

function isValidDateRange(session: CouncilSession) {
  if (!session.start_date) return false;
  if (!session.end_date) return true;
  return session.start_date <= session.end_date;
}

function datesMatch(
  session: CouncilSession | undefined,
  dateSource: DateSource
) {
  return (
    session?.start_date === dateSource.start_date &&
    (session?.end_date ?? null) === dateSource.end_date
  );
}

function chooseDates(
  existing: CouncilSession | undefined,
  dateSource: DateSource | undefined
) {
  if (!dateSource) {
    return {
      start_date: existing?.start_date ?? "",
      end_date: existing?.end_date ?? null,
      source: existing ? "existing" : "missing",
      confidence: existing ? "existing" : "missing",
      needsReview: false,
    } satisfies DateSource & { needsReview: boolean };
  }

  if (
    existing?.start_date &&
    dateSource.confidence === "planned" &&
    !datesMatch(existing, dateSource)
  ) {
    return {
      start_date: existing.start_date,
      end_date: existing.end_date,
      source: dateSource.source,
      confidence: "existing",
      needsReview: true,
    } satisfies DateSource & { needsReview: boolean };
  }

  return {
    start_date: dateSource.start_date,
    end_date: dateSource.end_date,
    source: dateSource.source,
    confidence: dateSource.confidence,
    needsReview: false,
  } satisfies DateSource & { needsReview: boolean };
}

function buildChanges(
  existing: CouncilSession | undefined,
  next: CouncilSession
) {
  if (!existing) return [];
  const fields = ["name", "start_date", "end_date", "council_url"] as const;
  return fields
    .map((field) => ({
      field,
      before: existing[field],
      after: next[field],
    }))
    .filter((change) => change.before !== change.after);
}

function validateSessions(
  sessions: CouncilSession[],
  existingSessions: Map<string, CouncilSession>
) {
  const errors: string[] = [];
  const merged = new Map(existingSessions);

  for (const session of sessions) {
    merged.set(session.id, session);
    if (!isNagoyaCityUrl(session.council_url)) {
      errors.push(
        `${session.id}: council_url must be under www.city.nagoya.jp`
      );
    }
    if (!isValidDateRange(session)) {
      errors.push(`${session.id}: invalid date range`);
    }
  }

  const slugOwner = new Map<string, string>();
  for (const session of merged.values()) {
    if (!session.slug) continue;
    const owner = slugOwner.get(session.slug);
    if (owner && owner !== session.id) {
      errors.push(
        `${session.id}: duplicate slug "${session.slug}" with ${owner}`
      );
    }
    slugOwner.set(session.slug, session.id);
  }

  return errors;
}

export async function previewNagoyaCouncilSessionImport(): Promise<NagoyaCouncilSessionImportPreview> {
  const [overviewHtml, annualHtml, existingSessionsList] = await Promise.all([
    fetchText(OVERVIEW_INDEX_URL),
    fetchText(ANNUAL_SCHEDULE_URL),
    getAllCouncilSessions(),
  ]);
  const activityHtmls = await Promise.all(
    KNOWN_ACTIVITY_URLS.map(async (url) => [url, await fetchText(url)] as const)
  );

  const overviewSessions = extractOverviewSessions(overviewHtml);
  const existingSessions = new Map(existingSessionsList.map((s) => [s.id, s]));
  const pdfDates = await extractPdfDates(overviewSessions);
  const dateSources = mergeDateMaps(
    extractAnnualScheduleDates(annualHtml),
    ...activityHtmls.map(([url, html]) => extractActivityDates(html, url)),
    pdfDates.dates
  );
  const now = new Date().toISOString();

  const candidates = overviewSessions.map<NagoyaCouncilSessionImportCandidate>(
    (base) => {
      const existing = existingSessions.get(base.id);
      const selectedDates = chooseDates(existing, dateSources.get(base.id));
      if (!selectedDates.start_date) {
        return {
          id: base.id,
          name: base.name,
          councilUrl: base.council_url,
          status: "skipped",
          reason: "日付を取得できないためスキップします",
          existing: existing ?? null,
          next: null,
          dateSource: {
            url: selectedDates.source,
            confidence: selectedDates.confidence,
          },
          changes: [],
        };
      }

      const next: CouncilSession = {
        id: base.id,
        name: base.name,
        slug: existing?.slug ?? base.slug,
        start_date: selectedDates.start_date,
        end_date: selectedDates.end_date,
        is_active: existing?.is_active ?? false,
        council_url: base.council_url,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      };
      const changes = buildChanges(existing, next);
      const status = selectedDates.needsReview
        ? "needs_review"
        : existing
          ? changes.length > 0
            ? "update"
            : "unchanged"
          : "create";

      return {
        id: base.id,
        name: base.name,
        councilUrl: base.council_url,
        status,
        reason: selectedDates.needsReview
          ? "予定日付が既存日付と異なるため手動確認が必要です"
          : "",
        existing: existing ?? null,
        next,
        dateSource: {
          url: selectedDates.source,
          confidence: selectedDates.confidence,
        },
        changes,
      };
    }
  );

  const writableSessions = candidates
    .filter(
      (c) => c.next && c.status !== "skipped" && c.status !== "needs_review"
    )
    .map((c) => c.next as CouncilSession);

  return {
    candidates,
    errors: [
      ...pdfDates.errors,
      ...validateSessions(writableSessions, existingSessions),
    ],
  };
}

export async function applyNagoyaCouncilSessionImport(
  ids: string[],
  manualInputs: ManualNagoyaCouncilSessionImportInput[] = []
) {
  const preview = await previewNagoyaCouncilSessionImport();
  const selected = new Set(ids);
  const manualById = new Map(manualInputs.map((input) => [input.id, input]));
  const now = new Date().toISOString();
  const targets: CouncilSession[] = [];

  for (const candidate of preview.candidates) {
    if (!selected.has(candidate.id)) continue;
    if (
      candidate.next &&
      (candidate.status === "create" || candidate.status === "update")
    ) {
      targets.push(candidate.next);
      continue;
    }

    const manual = manualById.get(candidate.id);
    if (!manual?.start_date) continue;
    targets.push({
      id: candidate.id,
      name: candidate.name,
      slug: candidate.existing?.slug ?? candidate.id,
      start_date: manual.start_date,
      end_date: manual.end_date,
      is_active: candidate.existing?.is_active ?? false,
      council_url: candidate.councilUrl,
      created_at: candidate.existing?.created_at ?? now,
      updated_at: now,
    });
  }

  const validationErrors = validateSessions(
    targets,
    new Map(
      preview.candidates
        .filter((candidate) => candidate.existing)
        .map((candidate) => [
          candidate.id,
          candidate.existing as CouncilSession,
        ])
    )
  );
  const errors = [...preview.errors, ...validationErrors];
  if (errors.length > 0) {
    return { appliedCount: 0, errors };
  }

  for (const target of targets) {
    await saveCouncilSession(target);
  }

  return { appliedCount: targets.length, errors: [] };
}
