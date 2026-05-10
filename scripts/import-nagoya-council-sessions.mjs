/**
 * Import Nagoya City Council session records from official pages.
 *
 * Default mode is dry-run. Use --apply to write data/council-sessions/*.json.
 */
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const OVERVIEW_INDEX_URL =
  "https://www.city.nagoya.jp/shikai/kouhou/1031662/index.html";
const ANNUAL_SCHEDULE_URL =
  "https://www.city.nagoya.jp/shikai/about/1030648/1030649.html";
const KNOWN_ACTIVITY_URLS = [
  "https://www.city.nagoya.jp/shikai/kouhou/1030998/1030999/1034675/1044429/1044433.html",
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const sessionsDir = path.join(root, "data", "council-sessions");
const apply = process.argv.includes("--apply");
const execFileAsync = promisify(execFile);

function normalizeText(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDigits(value) {
  return value.replace(/[０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0),
  );
}

function normalizePdfText(value) {
  return normalizeDigits(value)
    .replace(/[⽇]/g, "日")
    .replace(/[︓]/g, "：")
    .replace(/\s+/g, "");
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

function reiwaToYear(reiwaYear) {
  return 2018 + Number(reiwaYear);
}

function two(value) {
  return String(value).padStart(2, "0");
}

function toIsoDate(year, month, day) {
  return `${year}-${two(month)}-${two(day)}`;
}

function sessionIdFromName(name) {
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

function extractOverviewSessions(html) {
  const sessions = [];
  const anchorPattern = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const label = normalizeText(match[2]);
    const nameMatch = label.match(/^(令和\d+年\d+月定例会)の概要/);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    const id = sessionIdFromName(name);
    sessions.push({
      id,
      name,
      slug: id,
      council_url: new URL(match[1], OVERVIEW_INDEX_URL).toString(),
    });
  }
  return [...new Map(sessions.map((s) => [s.id, s])).values()].sort((a, b) =>
    b.id.localeCompare(a.id),
  );
}

function extractAnnualScheduleDates(html) {
  const text = normalizeText(html);
  const dates = new Map();
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
        `令和${sessionYear - 2018}年${sessionMonth}月定例会`,
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

function extractActivityDates(html, url) {
  const text = normalizeText(html);
  const titleMatch = text.match(/令和(\d+)年 名古屋市会の歩み/);
  if (!titleMatch) return new Map();

  const calendarYear = reiwaToYear(titleMatch[1]);
  const dates = new Map();
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
      `令和${calendarYear - 2018}年${sessionMonth}月定例会`,
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

function extractPdfUrl(html, pageUrl) {
  const pdfLink = html.match(/<a\b[^>]*href="([^"]+\.pdf)"[^>]*>/i);
  return pdfLink ? new URL(pdfLink[1], pageUrl).toString() : null;
}

function extractSessionYear(name) {
  const match = name.match(/^令和(\d+)年/);
  return match ? reiwaToYear(match[1]) : null;
}

function extractDateSourceFromPdfText(text, session, pdfUrl) {
  const normalized = normalizePdfText(text);
  const match =
    normalized.match(
      /会期[：:]?(\d{1,2})月(\d{1,2})日[～〜-](\d{1,2})月(\d{1,2})日/,
    ) ??
    normalized.match(
      /会期[：:]?(\d{1,2})月(\d{1,2})日(\d{1,2})月(\d{1,2})日/,
    );
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
      endDay,
    ),
    source: pdfUrl,
    confidence: "actual",
  };
}

async function pdfToText(pdfUrl) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "nagoya-session-"));
  const pdfPath = path.join(tmpDir, "session.pdf");
  try {
    const res = await fetch(pdfUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${pdfUrl}: ${res.status} ${res.statusText}`);
    }
    await fs.writeFile(pdfPath, Buffer.from(await res.arrayBuffer()));
    const { stdout } = await execFileAsync("pdftotext", [pdfPath, "-"], {
      maxBuffer: 1024 * 1024 * 10,
    });
    return stdout;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

async function extractPdfDates(sessions) {
  const entries = await Promise.all(
    sessions.map(async (session) => {
      try {
        const html = await fetchText(session.council_url);
        const pdfUrl = extractPdfUrl(html, session.council_url);
        if (!pdfUrl) return null;
        const text = await pdfToText(pdfUrl);
        const dateSource = extractDateSourceFromPdfText(text, session, pdfUrl);
        return dateSource ? [session.id, dateSource] : null;
      } catch {
        return null;
      }
    }),
  );
  return new Map(entries.filter((entry) => entry !== null));
}

function mergeDateMaps(...maps) {
  const result = new Map();
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

async function readExistingSessions() {
  const result = new Map();
  const entries = await fs.readdir(sessionsDir).catch(() => []);
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    const filePath = path.join(sessionsDir, entry);
    try {
      const session = JSON.parse(await fs.readFile(filePath, "utf8"));
      result.set(session.id, session);
    } catch {
      // Ignore broken local files; validation below handles generated output.
    }
  }
  return result;
}

function datesMatch(session, dateSource) {
  return (
    session?.start_date === dateSource?.start_date &&
    (session?.end_date ?? null) === (dateSource?.end_date ?? null)
  );
}

function chooseDates(existing, dateSource) {
  if (!dateSource) {
    return {
      start_date: existing?.start_date ?? "",
      end_date: existing?.end_date ?? null,
      source: existing ? "existing" : "missing",
      confidence: existing ? "existing" : "missing",
      needsReview: false,
    };
  }
  if (
    existing?.start_date &&
    dateSource.confidence === "planned" &&
    !datesMatch(existing, dateSource)
  ) {
    return {
      start_date: existing.start_date,
      end_date: existing.end_date ?? null,
      source: dateSource.source,
      confidence: "existing",
      needsReview: true,
    };
  }
  return { ...dateSource, needsReview: false };
}

function isNagoyaCityUrl(url) {
  try {
    return new URL(url).hostname === "www.city.nagoya.jp";
  } catch {
    return false;
  }
}

function validateSessions(sessions, existingSessions) {
  const errors = [];
  const merged = new Map(existingSessions);
  for (const session of sessions) {
    merged.set(session.id, session);
    if (!isNagoyaCityUrl(session.council_url)) {
      errors.push(`${session.id}: council_url must be under www.city.nagoya.jp`);
    }
    if (session.end_date && session.start_date > session.end_date) {
      errors.push(`${session.id}: invalid date range`);
    }
  }
  const slugOwner = new Map();
  for (const session of merged.values()) {
    if (!session.slug) continue;
    const owner = slugOwner.get(session.slug);
    if (owner && owner !== session.id) {
      errors.push(`${session.id}: duplicate slug "${session.slug}" with ${owner}`);
    }
    slugOwner.set(session.slug, session.id);
  }
  return errors;
}

async function writeSession(session) {
  await fs.mkdir(sessionsDir, { recursive: true });
  await fs.writeFile(
    path.join(sessionsDir, `${session.id}.json`),
    `${JSON.stringify(session, null, 2)}\n`,
    "utf8",
  );
}

const [overviewHtml, annualHtml, existingSessions] = await Promise.all([
  fetchText(OVERVIEW_INDEX_URL),
  fetchText(ANNUAL_SCHEDULE_URL),
  readExistingSessions(),
]);
const activityHtmls = await Promise.all(
  KNOWN_ACTIVITY_URLS.map(async (url) => [url, await fetchText(url)]),
);
const overviewSessions = extractOverviewSessions(overviewHtml);
const pdfDates = await extractPdfDates(overviewSessions);
const dateSources = mergeDateMaps(
  extractAnnualScheduleDates(annualHtml),
  ...activityHtmls.map(([url, html]) => extractActivityDates(html, url)),
  pdfDates,
);
const now = new Date().toISOString();
const candidates = overviewSessions.map((base) => {
  const existing = existingSessions.get(base.id);
  const dates = chooseDates(existing, dateSources.get(base.id));
  const next = dates.start_date
    ? {
        id: base.id,
        name: base.name,
        slug: existing?.slug ?? base.slug,
        start_date: dates.start_date,
        end_date: dates.end_date,
        is_active: existing?.is_active ?? false,
        council_url: base.council_url,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      }
    : null;
  const status = !next
    ? "skipped"
    : dates.needsReview
      ? "needs_review"
      : existing
        ? JSON.stringify({
            name: existing.name,
            start_date: existing.start_date,
            end_date: existing.end_date,
            council_url: existing.council_url,
          }) ===
          JSON.stringify({
            name: next.name,
            start_date: next.start_date,
            end_date: next.end_date,
            council_url: next.council_url,
          })
          ? "unchanged"
          : "update"
        : "create";
  return { id: base.id, status, next, dates };
});

const writable = candidates
  .filter((candidate) => candidate.next && candidate.status !== "needs_review")
  .map((candidate) => candidate.next);
const errors = validateSessions(writable, existingSessions);
for (const error of errors) {
  console.error(`validation-error ${error}`);
}

for (const candidate of candidates) {
  const mode = apply ? "write" : "dry-run";
  const startDate = candidate.next?.start_date ?? "????-??-??";
  const endDate = candidate.next?.end_date ?? "null";
  console.log(
    `${mode} ${candidate.status} ${candidate.id} ${startDate} ${endDate} ${candidate.dates.confidence}:${candidate.dates.source}`,
  );
}

if (errors.length > 0) {
  process.exit(1);
}

if (apply) {
  let count = 0;
  for (const candidate of candidates) {
    if (
      candidate.next &&
      (candidate.status === "create" || candidate.status === "update")
    ) {
      await writeSession(candidate.next);
      count++;
    }
  }
  console.log(`applied ${count} sessions`);
}
