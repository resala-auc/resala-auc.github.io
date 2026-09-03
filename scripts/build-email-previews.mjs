/**
 * Writes email-previews/: one HTML file per email an applicant can receive,
 * rendered by the same builders the edge functions send with.
 *
 * The two renderers run as separate Deno processes on purpose — each edge
 * function starts its HTTP handler when imported, and two in one process would
 * fight over the same port.
 *
 * Run: node scripts/build-email-previews.mjs
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const OUT = "email-previews";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "inherit", "inherit"] });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`))));
  });
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

// --allow-env: the functions read config from the environment at import time.
const deno = ["run", "--allow-env", "--allow-read", "--allow-write", "--allow-net"];
await run("deno", [...deno, "scripts/email-previews/render-submit.ts", OUT]);
await run("deno", [...deno, "scripts/email-previews/render-reminder.ts", OUT]);
await run("deno", [...deno, "scripts/email-previews/render-members.ts", OUT]);

const manifest = [];
for (const file of [".submit-manifest.json", ".reminder-manifest.json", ".members-manifest.json"]) {
  manifest.push(...JSON.parse(await readFile(`${OUT}/${file}`, "utf8")));
  await rm(`${OUT}/${file}`);
}

const esc = (value) =>
  String(value).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/* Grouped by committee, because the question this folder answers is "what does
   a Visits applicant get", not "what does a reschedule look like". */
const groups = new Map();
for (const entry of manifest) {
  const key = entry.committee || "Any committee";
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(entry);
}

const order = ["Members", "Tech Team", "Operations", "Branding / Media", "HR", "PR / Fundraising", "Visits", "Children's Day", "Initiatives", "Any committee"];
const sorted = [...groups.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));

const sections = sorted
  .map(([committee, entries]) => {
    const rows = entries
      .map((entry) => {
        const href = entry.dir ? `${entry.dir}/${entry.file}` : entry.file;
        const text = href.replace(/\.html$/, ".txt");
        return `        <li>
          <a href="${esc(href)}">${esc(entry.title)}</a>
          <div class="subject">${esc(entry.subject)}</div>
          <div class="files"><a href="${esc(href)}">HTML</a> · <a href="${esc(text)}">plain text</a></div>
        </li>`;
      })
      .join("\n");
    return `      <section>
        <h2>${esc(committee)}</h2>
        <ul>
${rows}
        </ul>
      </section>`;
  })
  .join("\n");

await writeFile(
  `${OUT}/index.html`,
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Applicant emails — Resala AUC</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700;900&display=swap" rel="stylesheet">
<style>
  :root { --blue:#0c2c80; --ink:#1b1f23; --muted:#55606e; --line:#d7e3f0; --ivory:#fdf9f3; }
  body { margin:0; padding:40px 24px; background:var(--ivory); color:var(--ink);
         font:16px/1.6 "Source Sans 3", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; }
  main { max-width: 820px; margin: 0 auto; }
  h1 { color: var(--blue); font-weight: 900; letter-spacing: -0.02em; margin: 0 0 6px; }
  .lede { color: var(--muted); margin: 0 0 34px; }
  section { margin-bottom: 30px; }
  h2 { color: var(--blue); font-size: 20px; font-weight: 800; margin: 0 0 12px;
       padding-bottom: 8px; border-bottom: 1px solid var(--line); }
  ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
  li { background:#fff; border:1px solid var(--line); border-radius:14px; padding:14px 16px; }
  li > a { color: var(--blue); font-weight: 700; font-size: 16px; text-decoration: none; }
  li > a:hover { text-decoration: underline; }
  .subject { color: var(--muted); font-size: 14px; margin-top: 3px; }
  .files { font-size: 13.5px; margin-top: 7px; }
  .files a { color: var(--blue); }
  footer { color: var(--muted); font-size: 14px; margin-top: 30px; border-top:1px solid var(--line); padding-top:16px; }
  code { background:#fff; border:1px solid var(--line); border-radius:6px; padding:1px 6px; font-size:14px; }
</style>
</head>
<body>
  <main>
    <h1>Emails an applicant receives</h1>
    <p class="lede">Grouped by the committee they put first. Rendered from the same builders the edge
       functions send with, so these are what actually arrives.</p>
${sections}
    <footer>
      Regenerate with <code>node scripts/build-email-previews.mjs</code> after changing any template.
      Only Visits and Children's Day set a task, so only they have the two reminder versions.
      The task sheets themselves are the PDFs in <code>task-files/</code>, attached to the confirmation.
    </footer>
  </main>
</body>
</html>
`,
  "utf8"
);

console.log(`Wrote ${manifest.length} email previews to ${OUT}/`);
