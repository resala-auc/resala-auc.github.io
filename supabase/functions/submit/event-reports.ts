/*
 * Event Reports: the rules, kept apart from index.ts so they can be tested
 * without booting the server (index.ts calls Deno.serve when it loads).
 *
 *   Director / Vice-Director ──sign in──► portal ──save──► validateReport
 *                                                         │
 *                     key = academicYear | event | committee (normalized)
 *                                                         │
 *                     planUpsert(existing rows, key, version)
 *                        ├─ no row        → append, version 1
 *                        ├─ same version  → overwrite in place, version + 1
 *                        └─ newer version → refuse (someone else saved first)
 *
 * One report per committee per event per academic year, edited in place.
 * Repeated events (Weekly Tuesday Visit, Bonding Events) are one report for
 * the whole semester, with the specific dates in "occurrences".
 */

export const EVENT_REPORT_EVENTS = [
  "Children's Day",
  "Weekly Tuesday Visit",
  "Mother's Day",
  "Back to School",
  "Blood Drive 1",
  "Blood Drive 2",
  "Winter Campaign",
  "Kheir Competition",
  "Opening",
  "Bonding Events",
  "Other"
] as const;

export const REPEATED_EVENTS = ["Weekly Tuesday Visit", "Bonding Events"];

export const PREP_START_OPTIONS = [
  "Less than 1 week before",
  "1–2 weeks before",
  "2–4 weeks before",
  "1–2 months before",
  "More than 2 months before"
];

export const PREP_ENOUGH_OPTIONS = ["Yes", "Partly", "No"];

/* What kind of committee a Board Hierarchy department is. Department names in
   the sheet vary ("Tech Director", "Children Day Director", "PR / Fundraising"),
   so match on a stable word, most specific first. */
export type CommitteeKind =
  | "branding" | "operations" | "hr" | "pr" | "tech"
  | "visits" | "childrens-day" | "initiatives" | "presidential" | "other";

export function committeeKind(department: string): CommitteeKind {
  const d = normalizeName(department);
  if (/child/.test(d)) return "childrens-day";
  if (/brand|media/.test(d)) return "branding";
  if (/operation/.test(d)) return "operations";
  if (/fundrais|\bpr\b|public relation/.test(d)) return "pr";
  if (/\bhr\b|human/.test(d)) return "hr";
  if (/tech/.test(d)) return "tech";
  if (/visit/.test(d)) return "visits";
  if (/initiative/.test(d)) return "initiatives";
  if (/presiden/.test(d)) return "presidential";
  return "other";
}

/* The one extra question each committee answers about its own job. Defined
   here, not by the page, so the stored question can't be edited by a request. */
export const ROLE_QUESTIONS: Record<CommitteeKind, string> = {
  branding: "Were designs, content and approvals on time? What slowed them down?",
  operations: "How did logistics go: venue, transport, materials, setup and timing on the day?",
  hr: "How did volunteer recruitment, attendance and the team's energy go for this event?",
  pr: "How did sponsors, partners, outreach and fundraising go for this event?",
  tech: "Did forms, registrations, links and any systems work as needed? What broke?",
  visits: "How did coordination with the place you visited and the beneficiaries go?",
  "childrens-day": "How did planning for the children (activities, safety, flow of the day) go?",
  initiatives: "How did the planning timeline and coordination with the other committees go?",
  presidential: "How did oversight and decisions across committees go for this event?",
  other: "What part of this event was specific to your committee's role, and how did it go?"
};

/* The academic year runs August to July, read in Cairo time: a report saved in
   November 2026 belongs to 2026-2027, one saved in March 2027 also does. */
export function academicYear(date: Date): string {
  const cairo = new Date(date.toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
  const y = cairo.getFullYear();
  const start = cairo.getMonth() >= 7 ? y : y - 1; // getMonth: 7 = August
  return `${start}-${start + 1}`;
}

/** Lowercase, trimmed, inner spaces collapsed: "Ramadan  Iftar " = "ramadan iftar". */
export function normalizeName(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

/** "Tech Director" → "Tech", "Children Day Director" → "Children Day". */
export function cleanCommittee(department: string): string {
  return String(department ?? "").trim().replace(/\s+director$/i, "").trim();
}

export function eventLabel(event: string, eventOther: string): string {
  return event === "Other" ? String(eventOther ?? "").trim().replace(/\s+/g, " ") : event;
}

export function reportKey(year: string, event: string, eventOther: string, committee: string): string {
  return [year, normalizeName(eventLabel(event, eventOther)), normalizeName(cleanCommittee(committee))].join("|");
}

type FieldSpec = { key: string; header: string; required: boolean; max: number };

/* The answers a writer sends. Order = sheet column order after the fixed columns. */
export const ANSWER_FIELDS: FieldSpec[] = [
  { key: "occurrences", header: "Dates / Occurrences", required: false, max: 500 },
  { key: "responsibilities", header: "Our Responsibilities", required: true, max: 5000 },
  { key: "wentWell", header: "What Went Well", required: true, max: 5000 },
  { key: "problems", header: "Problems & Mistakes", required: true, max: 5000 },
  { key: "causes", header: "Why They Happened", required: true, max: 5000 },
  { key: "handling", header: "How We Handled Them", required: false, max: 5000 },
  { key: "nextYear", header: "What Next Year Should Do Differently", required: true, max: 5000 },
  { key: "workedWith", header: "Worked With", required: false, max: 500 },
  { key: "collaboration", header: "How Working With Them Went", required: false, max: 5000 },
  { key: "prepStart", header: "Preparation Started", required: false, max: 60 },
  { key: "prepEnough", header: "Was It Enough", required: false, max: 20 },
  { key: "numbers", header: "Key Numbers", required: false, max: 2000 },
  { key: "links", header: "Links", required: false, max: 2000 },
  { key: "roleAnswer", header: "Committee Question Answer", required: true, max: 5000 },
  { key: "rating", header: "Rating (1-5)", required: true, max: 10 }
];

/* The questions a document must cover, at minimum, when a committee submits
   its report as a document instead of typing it. Same set the form requires. */
export const REQUIRED_QUESTION_KEYS = ["responsibilities", "wentWell", "problems", "causes", "roleAnswer", "nextYear"];
export const REPORT_FORMATS = ["written", "document"];

/* Format and document columns sit after Version so rows saved before they
   existed keep every column where it was. */
export const EVENT_REPORT_HEADERS = [
  "Key", "Academic Year", "Event", "Event Name", "Committee", "Committee Question",
  ...ANSWER_FIELDS.map((f) => f.header),
  "Created By", "Created At", "Updated By", "Updated At", "Version",
  "Format", "Document Link", "Document Covers"
];
const FIXED_BEFORE = 6;

export type ReportInput = Record<string, unknown> & { event?: unknown; eventOther?: unknown };
export type CleanReport = Record<string, string> & { event: string; eventOther: string };

export class ReportError extends Error {}

/** Throws ReportError with a message a writer can act on; returns trimmed strings. */
export function validateReport(input: ReportInput): CleanReport {
  const event = String(input.event ?? "").trim();
  if (!(EVENT_REPORT_EVENTS as readonly string[]).includes(event)) throw new ReportError("Choose an event from the list.");
  const eventOther = event === "Other" ? String(input.eventOther ?? "").trim().replace(/\s+/g, " ") : "";
  if (event === "Other" && !eventOther) throw new ReportError("Write the name of the event.");
  if (eventOther.length > 120) throw new ReportError("The event name is too long (120 characters at most).");

  const format = String(input.format ?? "written").trim() || "written";
  if (!REPORT_FORMATS.includes(format)) throw new ReportError("Choose whether to write the report here or attach a document.");
  const isDoc = format === "document";

  const out: Record<string, string> = { event, eventOther, format, docLink: "", docCovers: "" };
  if (isDoc) {
    const link = String(input.docLink ?? "").trim();
    if (!link) throw new ReportError("Paste the link to your report document.");
    let url: URL;
    try { url = new URL(link); } catch { throw new ReportError("The document link doesn't look like a link. Copy it from the browser's address bar."); }
    if (url.protocol !== "https:") throw new ReportError("The document link must start with https://.");
    if (link.length > 1000) throw new ReportError("The document link is too long.");
    const covers = new Set((Array.isArray(input.docCovers) ? input.docCovers : String(input.docCovers ?? "").split(","))
      .map((v) => String(v).trim()).filter(Boolean));
    const missing = REQUIRED_QUESTION_KEYS.filter((k) => !covers.has(k));
    if (missing.length) {
      const names = missing.map((k) => ANSWER_FIELDS.find((f) => f.key === k)!.header);
      throw new ReportError(`Your document must answer every required question. Not confirmed yet: ${names.join(", ")}.`);
    }
    out.docLink = link;
    out.docCovers = REQUIRED_QUESTION_KEYS.join(", ");
  }

  for (const f of ANSWER_FIELDS) {
    let value = input[f.key];
    if (Array.isArray(value)) value = value.map((v) => String(v).trim()).filter(Boolean).join(", ");
    const text = String(value ?? "").trim();
    // A document carries the written answers; the rating is still asked here.
    const required = f.required && (!isDoc || f.key === "rating");
    if (required && !text) throw new ReportError(`Please answer: ${f.header}.`);
    if (text.length > f.max) throw new ReportError(`"${f.header}" is too long (${f.max} characters at most).`);
    out[f.key] = text;
  }
  if (!/^[1-5]$/.test(out.rating)) throw new ReportError("Rate your committee's part from 1 to 5.");
  if (out.prepStart && !PREP_START_OPTIONS.includes(out.prepStart)) throw new ReportError("Choose when preparation started from the list.");
  if (out.prepEnough && !PREP_ENOUGH_OPTIONS.includes(out.prepEnough)) throw new ReportError("Choose whether preparation time was enough.");
  return out as CleanReport;
}

export type StoredReport = Record<string, string>;

export function reportFromRow(row: string[]): StoredReport {
  const cell = (i: number) => String(row[i] ?? "");
  const r: StoredReport = {
    key: cell(0), academicYear: cell(1), event: cell(2), eventOther: cell(3),
    committee: cell(4), roleQuestion: cell(5)
  };
  ANSWER_FIELDS.forEach((f, i) => { r[f.key] = cell(FIXED_BEFORE + i); });
  const tail = FIXED_BEFORE + ANSWER_FIELDS.length;
  r.createdBy = cell(tail); r.createdAt = cell(tail + 1);
  r.updatedBy = cell(tail + 2); r.updatedAt = cell(tail + 3); r.version = cell(tail + 4) || "1";
  r.format = cell(tail + 5) || "written"; r.docLink = cell(tail + 6); r.docCovers = cell(tail + 7);
  r.eventLabel = eventLabel(r.event, r.eventOther);
  return r;
}

export function rowFromReport(r: StoredReport): string[] {
  return [
    r.key, r.academicYear, r.event, r.eventOther, r.committee, r.roleQuestion,
    ...ANSWER_FIELDS.map((f) => r[f.key] ?? ""),
    r.createdBy, r.createdAt, r.updatedBy, r.updatedAt, r.version,
    r.format || "written", r.docLink ?? "", r.docCovers ?? ""
  ];
}

export type UpsertPlan = { index: number; version: number };

/**
 * Where a save goes. `index` is the row's position among existing data rows
 * (-1 = append). `expectedVersion` is the version the writer opened: 0 for a
 * new report. A mismatch means someone saved in between, and their work would
 * be silently lost, so refuse.
 */
export function planUpsert(rows: string[][], key: string, expectedVersion: number): UpsertPlan {
  const index = rows.findIndex((row) => String(row[0] ?? "") === key);
  if (index === -1) {
    if (expectedVersion > 0) throw new ReportError("This report was not found. Reload the page and try again.");
    return { index: -1, version: 1 };
  }
  const current = Number(reportFromRow(rows[index]).version) || 1;
  if (expectedVersion !== current) {
    const who = reportFromRow(rows[index]).updatedBy || "someone";
    throw new ReportError(`${who} saved this report since you opened it. Reload to see their changes, then save again.`);
  }
  return { index, version: current + 1 };
}

/* A cell that starts with = + - @ (or a tab/CR) runs as a formula when the CSV
   is opened in Excel. The sheet is safe (RAW); the export needs this. */
export function csvCell(value: unknown): string {
  let s = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
