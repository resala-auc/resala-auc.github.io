import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { renderPage } from "../src/render.mjs";
import { renderApplyPage } from "../src/apply-page.ts";
import { renderRoleGuideIndexPage, renderRoleGuidePage } from "../src/role-guide-page.mjs";
import { roleGuides } from "../src/role-guide-data.mjs";
import { renderTaskPage } from "../src/task-page.ts";
import { renderWorldCupPage } from "../src/world-cup-page.ts";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await mkdir("dist/apply", { recursive: true });
await mkdir("dist/guides", { recursive: true });
await mkdir("dist/tasks", { recursive: true });
await mkdir("dist/world-cup", { recursive: true });
await writeFile("dist/index.html", renderPage(), "utf8");
await writeFile("dist/apply/index.html", renderApplyPage(), "utf8");
await writeFile("dist/world-cup/index.html", renderWorldCupPage(), "utf8");
await writeFile("dist/guides/index.html", renderRoleGuideIndexPage(), "utf8");
for (const role of roleGuides) {
  await mkdir(`dist/guides/${role.id}`, { recursive: true });
  await writeFile(`dist/guides/${role.id}/index.html`, renderRoleGuidePage(role), "utf8");
}
await writeFile("dist/tasks/index.html", renderTaskPage(), "utf8");
await writeFile("dist/.nojekyll", "", "utf8");
await cp("favicon.png", "dist/favicon.png");
await cp("src/styles.css", "dist/styles.css");
await cp("src/app.js", "dist/app.js");
await cp("src/spreadsheet-config.js", "dist/spreadsheet-config.js");
await cp("The brand System", "dist/The brand System", { recursive: true });
await cp("admin", "dist/admin", { recursive: true });
await cp("onboarding", "dist/onboarding", { recursive: true });

const applyConfigSource = await readFile("src/apply-config.ts", "utf8");
const applySource = await readFile("src/apply.ts", "utf8");
const tasksSource = await readFile("src/tasks.ts", "utf8");

await writeFile("dist/apply-config.js", stripTypeScriptTypes(applyConfigSource), "utf8");
await writeFile("dist/apply.js", stripTypeScriptTypes(applySource), "utf8");
await writeFile("dist/tasks.js", stripTypeScriptTypes(tasksSource), "utf8");
await cp("src/role-guide-data.mjs", "dist/role-guide-data.mjs");

console.log("Built static site to dist/");
