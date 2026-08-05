import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { build as viteBuild } from "vite";
import { renderPage } from "../src/render.mjs";
import { renderRoleGuideIndexPage, renderRoleGuidePage } from "../src/role-guide-page.mjs";
import { cycleRoleGuides } from "../src/committee-display.mjs";
import { renderWorldCupPage } from "../src/world-cup-page.ts";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await mkdir("dist/guides", { recursive: true });
await mkdir("dist/world-cup", { recursive: true });
await writeFile("dist/index.html", renderPage(), "utf8");
await writeFile("dist/world-cup/index.html", renderWorldCupPage(), "utf8");
await writeFile("dist/guides/index.html", renderRoleGuideIndexPage(), "utf8");
// Only the committees recruiting this cycle get a page. Treasurer still lives
// in the role data for next time, but a guide for it would end in an "Apply as
// a head" button leading to a flow that does not offer it.
for (const role of cycleRoleGuides) {
  await mkdir(`dist/guides/${role.id}`, { recursive: true });
  await writeFile(`dist/guides/${role.id}/index.html`, renderRoleGuidePage(role), "utf8");
}
await writeFile("dist/.nojekyll", "", "utf8");
await cp("favicon.png", "dist/favicon.png");
await cp("src/styles.css", "dist/styles.css");
await cp("src/app.js", "dist/app.js");
await cp("src/spreadsheet-config.js", "dist/spreadsheet-config.js");
await cp("The brand System", "dist/The brand System", { recursive: true });
await cp("admin", "dist/admin", { recursive: true });
// Interview task sheets, fetched by the submit function to attach to emails.
await cp("task-files", "dist/task-files", { recursive: true });
await cp("onboarding", "dist/onboarding", { recursive: true });
await cp("director", "dist/director", { recursive: true });
await cp("committee", "dist/committee", { recursive: true });
await cp("recruitment", "dist/recruitment", { recursive: true });
// The committee portal builds its scoring form from the rubrics at runtime.
// Copied as .js: some static hosts serve .mjs as application/octet-stream,
// which browsers refuse to execute as a module.
await cp("src/scoring-rubrics.mjs", "dist/scoring-rubrics.js");

await cp("src/role-guide-data.mjs", "dist/role-guide-data.mjs");

// The animated recruitment experience is a Vite app; it emits into dist/join/.
await viteBuild();

console.log("Built static site to dist/");
