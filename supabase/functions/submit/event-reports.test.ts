import {
  academicYear, cleanCommittee, committeeKind, csvCell, planUpsert, reportFromRow, reportKey,
  ReportError, rowFromReport, validateReport, EVENT_REPORT_HEADERS
} from "./event-reports.ts";

function assertEquals(actual: unknown, expected: unknown, msg = "") {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg} expected ${e}, got ${a}`);
}
function assertThrows(fn: () => unknown, includes: string) {
  try { fn(); } catch (err) {
    if (!(err instanceof ReportError)) throw new Error(`threw non-ReportError: ${err}`);
    if (!String((err as Error).message).includes(includes)) throw new Error(`message "${(err as Error).message}" lacks "${includes}"`);
    return;
  }
  throw new Error(`did not throw (${includes})`);
}

const valid = () => ({
  event: "Back to School", responsibilities: "r", wentWell: "w", problems: "p", causes: "c",
  nextYear: "n", roleAnswer: "x", rating: "4"
});

Deno.test("valid report passes and is trimmed", () => {
  const out = validateReport({ ...valid(), problems: "  late designs  " });
  assertEquals(out.problems, "late designs");
  assertEquals(out.eventOther, "");
});

Deno.test("each required answer is enforced", () => {
  for (const key of ["responsibilities", "wentWell", "problems", "causes", "nextYear", "roleAnswer"]) {
    assertThrows(() => validateReport({ ...valid(), [key]: "  " }), "Please answer");
  }
});

Deno.test("rating must be 1-5", () => {
  for (const rating of ["0", "6", "4.5", "", "abc"]) {
    assertThrows(() => validateReport({ ...valid(), rating }), rating === "" ? "Please answer" : "1 to 5");
  }
  assertEquals(validateReport({ ...valid(), rating: "1" }).rating, "1");
});

Deno.test("unknown event is rejected", () => {
  assertThrows(() => validateReport({ ...valid(), event: "Ramadan" }), "Choose an event");
});

Deno.test("Other needs a name, and the name is cleaned", () => {
  assertThrows(() => validateReport({ ...valid(), event: "Other", eventOther: "   " }), "name of the event");
  assertEquals(validateReport({ ...valid(), event: "Other", eventOther: " Ramadan   Iftar " }).eventOther, "Ramadan Iftar");
});

Deno.test("eventOther is ignored for listed events", () => {
  assertEquals(validateReport({ ...valid(), eventOther: "junk" }).eventOther, "");
});

Deno.test("too long answers are rejected", () => {
  assertThrows(() => validateReport({ ...valid(), problems: "x".repeat(5001) }), "too long");
});

Deno.test("prep options must come from the list", () => {
  assertThrows(() => validateReport({ ...valid(), prepStart: "yesterday" }), "preparation started");
  assertThrows(() => validateReport({ ...valid(), prepEnough: "maybe" }), "enough");
  assertEquals(validateReport({ ...valid(), prepStart: "2–4 weeks before", prepEnough: "Partly" }).prepEnough, "Partly");
});

Deno.test("workedWith array becomes a list", () => {
  assertEquals(validateReport({ ...valid(), workedWith: ["Operations", " ", "HR"] }).workedWith, "Operations, HR");
});

Deno.test("academic year runs August to July in Cairo time", () => {
  assertEquals(academicYear(new Date("2026-11-21T12:00:00Z")), "2026-2027");
  assertEquals(academicYear(new Date("2027-03-01T12:00:00Z")), "2026-2027");
  assertEquals(academicYear(new Date("2027-07-31T12:00:00Z")), "2026-2027");
  assertEquals(academicYear(new Date("2027-08-01T12:00:00Z")), "2027-2028");
  // 31 July 22:30 UTC is already 1 August in Cairo
  assertEquals(academicYear(new Date("2027-07-31T22:30:00Z")), "2027-2028");
});

Deno.test("key: Other names and committee spellings collapse; years differ", () => {
  const a = reportKey("2026-2027", "Other", " Ramadan  Iftar", "Tech Director");
  const b = reportKey("2026-2027", "Other", "ramadan iftar ", "tech");
  assertEquals(a, b);
  const nextYear = reportKey("2027-2028", "Other", "Ramadan Iftar", "Tech");
  if (a === nextYear) throw new Error("year must be part of the key");
});

Deno.test("committee names and kinds", () => {
  assertEquals(cleanCommittee("Children Day Director"), "Children Day");
  assertEquals(committeeKind("Children Day Director"), "childrens-day");
  assertEquals(committeeKind("Branding / Media"), "branding");
  assertEquals(committeeKind("PR / Fundraising"), "pr");
  assertEquals(committeeKind("HR"), "hr");
  assertEquals(committeeKind("Tech Director"), "tech");
  assertEquals(committeeKind("Operations"), "operations");
  assertEquals(committeeKind("Visits"), "visits");
  assertEquals(committeeKind("Initiatives Director"), "initiatives");
  assertEquals(committeeKind("Something New"), "other");
});

Deno.test("row round-trip keeps every column", () => {
  const stored = {
    ...validateReport(valid()),
    key: "k", academicYear: "2026-2027", event: "Opening", eventOther: "", committee: "HR", roleQuestion: "q",
    createdBy: "a@aucegypt.edu", createdAt: "t1", updatedBy: "b@aucegypt.edu", updatedAt: "t2", version: "3"
  };
  const row = rowFromReport(stored);
  assertEquals(row.length, EVENT_REPORT_HEADERS.length);
  const back = reportFromRow(row);
  assertEquals(back.problems, "p");
  assertEquals(back.version, "3");
  assertEquals(back.updatedBy, "b@aucegypt.edu");
  assertEquals(back.eventLabel, "Opening");
});

Deno.test("upsert: new report appends at version 1", () => {
  assertEquals(planUpsert([], "k", 0), { index: -1, version: 1 });
});

Deno.test("upsert: saving the version you opened overwrites in place", () => {
  const row = rowFromReport({ key: "k", version: "2", updatedBy: "x" } as Record<string, string>);
  assertEquals(planUpsert([["other"], row], "k", 2), { index: 1, version: 3 });
});

Deno.test("upsert: a stale version is refused with who saved", () => {
  const row = rowFromReport({ key: "k", version: "3", updatedBy: "dina@aucegypt.edu" } as Record<string, string>);
  assertThrows(() => planUpsert([row], "k", 2), "dina@aucegypt.edu saved this report");
});

Deno.test("upsert: opening as new while one exists is refused", () => {
  const row = rowFromReport({ key: "k", version: "1", updatedBy: "x" } as Record<string, string>);
  assertThrows(() => planUpsert([row], "k", 0), "saved this report");
});

Deno.test("upsert: editing a report that vanished is refused", () => {
  assertThrows(() => planUpsert([], "k", 2), "not found");
});

Deno.test("csv cells are formula-safe and quoted", () => {
  assertEquals(csvCell("=SUM(A1)"), "'=SUM(A1)");
  assertEquals(csvCell("+20 volunteers"), "'+20 volunteers");
  assertEquals(csvCell("-late"), "'-late");
  assertEquals(csvCell("@here"), "'@here");
  assertEquals(csvCell('a, "b"'), '"a, ""b"""');
  assertEquals(csvCell("line1\nline2"), '"line1\nline2"');
  assertEquals(csvCell(null), "");
});

const docReport = () => ({
  event: "Opening", format: "document", docLink: "https://docs.google.com/document/d/abc/edit",
  docCovers: ["responsibilities", "wentWell", "problems", "causes", "roleAnswer", "nextYear"], rating: "3"
});

Deno.test("document report: link + all questions confirmed + rating is enough", () => {
  const out = validateReport(docReport());
  assertEquals(out.format, "document");
  assertEquals(out.docLink, "https://docs.google.com/document/d/abc/edit");
  assertEquals(out.problems, "");
});

Deno.test("document report: every required question must be confirmed, named in the error", () => {
  const d = docReport(); d.docCovers = d.docCovers.filter((k) => k !== "causes" && k !== "nextYear");
  assertThrows(() => validateReport(d), "Why They Happened, What Next Year Should Do Differently");
});

Deno.test("document report: needs an https link", () => {
  assertThrows(() => validateReport({ ...docReport(), docLink: "" }), "Paste the link");
  assertThrows(() => validateReport({ ...docReport(), docLink: "my report" }), "doesn't look like a link");
  assertThrows(() => validateReport({ ...docReport(), docLink: "http://example.com/x" }), "https://");
  assertThrows(() => validateReport({ ...docReport(), docLink: "javascript:alert(1)" }), "https://");
});

Deno.test("document report: rating is still required", () => {
  assertThrows(() => validateReport({ ...docReport(), rating: "" }), "Please answer: Rating");
});

Deno.test("written report ignores a stray document link", () => {
  const out = validateReport({ ...valid(), docLink: "https://x.y" });
  assertEquals(out.format, "written");
  assertEquals(out.docLink, "");
});

Deno.test("unknown format is rejected", () => {
  assertThrows(() => validateReport({ ...valid(), format: "video" }), "attach a document");
});

Deno.test("document columns round-trip and old rows read as written", () => {
  const stored = { ...validateReport(docReport()), key: "k", academicYear: "y", committee: "HR", roleQuestion: "q", createdBy: "a", createdAt: "t", updatedBy: "a", updatedAt: "t", version: "1" };
  const back = reportFromRow(rowFromReport(stored));
  assertEquals(back.format, "document");
  assertEquals(back.docLink, "https://docs.google.com/document/d/abc/edit");
  const oldRow = rowFromReport({ ...stored, format: "", docLink: "", docCovers: "" }).slice(0, -3);
  assertEquals(reportFromRow(oldRow).format, "written");
});
