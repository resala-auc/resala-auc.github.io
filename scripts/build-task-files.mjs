/**
 * Renders one task sheet per head into task-files/, for every committee whose
 * brief sets a task per head.
 *
 * A committee that sets one deliverable per head cannot send a shared sheet:
 * the applicant must receive their own. Content comes from
 * src/interview-config.mjs and head names from src/role-guide-data.mjs — the
 * same sources the booking page, the guides and the confirmation email read, so
 * none of them can disagree.
 *
 * Run with: node scripts/build-task-files.mjs
 * Uses headless Chrome directly (no Playwright); set CHROME_PATH if it is not
 * at /usr/bin/google-chrome. Not part of `npm run build` because the output is
 * committed and rarely changes.
 */
import { mkdir, writeFile, readdir, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { interviewConfig } from "../src/interview-config.mjs";
import { getRoleGuideById } from "../src/role-guide-data.mjs";
import { displayNames } from "../src/committee-display.mjs";

const run = promisify(execFile);
const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
const OUT = "task-files";

const escape = (v) =>
  String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * How the sheet ends differs by committee, because the briefs differ: Visits is
 * brought to the interview, Children's Day is submitted online beforehand.
 */
function submissionRules(task) {
  const rules = ["Complete only the task for the head you applied to."];
  if (task.pageLimit) rules.push(task.pageLimit);
  rules.push("You may use bullet points, tables, diagrams, or sketches where appropriate.");
  rules.push("Your work should be clear, organized, and practical. Creativity is encouraged where relevant.");
  if (task.aiNote) rules.push(task.aiNote);

  if (task.submissionUrl) {
    const due = task.dueBeforeInterviewMinutes === 60 ? "one hour" : `${task.dueBeforeInterviewMinutes} minutes`;
    rules.push(`Submit at ${task.submissionUrl} at least ${due} before your interview.`);
    rules.push("Share a link anyone at Resala can open — Google Drive, Canva, or a PDF link.");
    return { rules, footer: `Submit at least ${due} before your interview · ${task.submissionUrl}` };
  }

  rules.push("Bring it to your interview.");
  return { rules, footer: "Bring this to your interview · resala-auc.github.io/join" };
}

function sheet({ committeeName, headName, title, points, scenario, task }) {
  const { rules, footer } = submissionRules(task);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 16mm 15mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; color: #1b1f23; background: #ffffff;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 11.5pt; line-height: 1.55;
  }
  .kicker {
    font-size: 8.5pt; letter-spacing: .18em; text-transform: uppercase;
    color: #0c2c80; font-weight: 700; margin: 0 0 6px;
  }
  h1 {
    margin: 0 0 4px; font-size: 24pt; line-height: 1.1; letter-spacing: -.01em;
    color: #0c2c80; text-transform: uppercase;
  }
  .deliverable { margin: 0 0 18px; font-size: 12pt; font-weight: 700; color: #1b1f23; }
  .rule { height: 3px; background: #0c2c80; margin: 0 0 20px; }
  h2 {
    margin: 22px 0 8px; font-size: 9pt; letter-spacing: .16em;
    text-transform: uppercase; color: #6b6459; font-weight: 700;
  }
  .scenario {
    background: #fdf9f3; border-left: 4px solid #eac262;
    padding: 14px 16px; margin: 0 0 4px; border-radius: 3px;
  }
  ul { margin: 6px 0 0; padding-left: 20px; }
  li { margin-bottom: 7px; }
  .rules li { margin-bottom: 4px; color: #4b5563; }
  footer {
    position: fixed; bottom: 0; left: 0; right: 0;
    border-top: 1px solid #e6ded1; padding-top: 7px;
    font-size: 8.5pt; color: #6b6459;
  }
  </style></head><body>
    <p class="kicker">Resala AUC &middot; ${escape(committeeName)} &middot; Heads Recruitment 2026</p>
    <h1>${escape(headName)}</h1>
    <p class="deliverable">${escape(title)}</p>
    <div class="rule"></div>
    ${scenario ? `<h2>The scenario</h2><div class="scenario">${escape(scenario)}</div>` : ""}
    <h2>What your submission must cover</h2>
    <ul>${points.map((p) => `<li>${escape(p)}</li>`).join("")}</ul>

    <h2>Submission requirements</h2>
    <ul class="rules">${rules.map((r) => `<li>${escape(r)}</li>`).join("")}</ul>

    <footer>${escape(committeeName)} &middot; ${escape(footer)}</footer>
  </body></html>`;
}

async function renderPdf(html, outFile) {
  const work = join(tmpdir(), `resala-task-${Math.random().toString(36).slice(2)}`);
  await mkdir(work, { recursive: true });
  const htmlFile = join(work, "sheet.html");
  await writeFile(htmlFile, html, "utf8");
  await run(CHROME, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--no-pdf-header-footer",
    `--user-data-dir=${join(work, "profile")}`,
    `--print-to-pdf=${outFile}`,
    `file://${htmlFile}`
  ]);
  await rm(work, { recursive: true, force: true });
}

await mkdir(OUT, { recursive: true });
const written = [];

for (const [committeeId, config] of Object.entries(interviewConfig)) {
  const task = config.task;
  if (!task?.required || !task.byRole) continue;

  const guide = getRoleGuideById(committeeId);
  const committeeName = displayNames[committeeId] ?? guide?.name ?? committeeId;

  for (const [headId, entry] of Object.entries(task.byRole)) {
    if (!entry.file) continue;
    const headName = guide?.heads?.find((head) => head.id === headId)?.name ?? headId;
    const file = `${OUT}/${entry.file}`;
    await renderPdf(
      sheet({
        committeeName,
        headName,
        title: entry.title,
        points: entry.points,
        scenario: task.scenario,
        task
      }),
      file
    );
    written.push(file);
  }
}

await writeFile(
  `${OUT}/README.md`,
  "# Interview task sheets\n\nGenerated by `scripts/build-task-files.mjs` from `src/interview-config.mjs`.\nEdit the task there and re-run the script; do not edit these PDFs by hand.\n"
);

// A sheet left behind by a task that no longer exists would still be emailed if
// anything still pointed at it, so say so rather than leaving it unnoticed.
const expected = new Set([...written.map((f) => f.split("/").pop()), "README.md"]);
const stale = (await readdir(OUT)).filter((f) => !expected.has(f));
if (stale.length) console.log("stale files still in task-files/:\n  " + stale.join("\n  "));

console.log("wrote:\n  " + written.join("\n  "));
