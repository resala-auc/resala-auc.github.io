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

const manifest = [];
for (const file of [".submit-manifest.json", ".reminder-manifest.json"]) {
  manifest.push(...JSON.parse(await readFile(`${OUT}/${file}`, "utf8")));
  await rm(`${OUT}/${file}`);
}

const esc = (value) =>
  String(value).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const rows = manifest
  .map(
    (entry) => `      <li>
        <a href="${esc(entry.file)}">${esc(entry.title)}</a>
        <div class="subject">Subject: ${esc(entry.subject)}</div>
        <div class="files"><a href="${esc(entry.file)}">HTML</a>${
          entry.file.startsWith("confirmation") || entry.file.startsWith("reminder")
            ? ` · <a href="${esc(entry.file.replace(/\.html$/, ".txt"))}">plain text</a>`
            : ""
        }</div>
      </li>`
  )
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
  main { max-width: 760px; margin: 0 auto; }
  h1 { color: var(--blue); font-weight: 900; letter-spacing: -0.02em; margin: 0 0 6px; }
  .lede { color: var(--muted); margin: 0 0 30px; }
  ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
  li { background:#fff; border:1px solid var(--line); border-radius:14px; padding:16px 18px; }
  li > a { color: var(--blue); font-weight: 700; font-size: 17px; text-decoration: none; }
  li > a:hover { text-decoration: underline; }
  .subject { color: var(--muted); font-size: 14px; margin-top: 4px; }
  .files { font-size: 13.5px; margin-top: 8px; }
  .files a { color: var(--blue); }
  footer { color: var(--muted); font-size: 14px; margin-top: 28px; }
  code { background:#fff; border:1px solid var(--line); border-radius:6px; padding:1px 6px; font-size: 14px; }
</style>
</head>
<body>
  <main>
    <h1>Emails an applicant receives</h1>
    <p class="lede">Rendered from the same builders the edge functions send with, so these are what actually arrives.</p>
    <ul>
${rows}
    </ul>
    <footer>
      Regenerate with <code>node scripts/build-email-previews.mjs</code> after changing any template.
      Attachments (the per-head task sheets) are not shown here — they live in <code>task-files/</code>.
    </footer>
  </main>
</body>
</html>
`,
  "utf8"
);

console.log(`Wrote ${manifest.length} email previews to ${OUT}/`);
