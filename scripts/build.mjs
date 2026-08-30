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
// The post-acceptance checklist a newly accepted head fills in themselves.
await cp("heads-onboarding", "dist/heads-onboarding", { recursive: true });
// Where applicants hand in a task their committee collects before the interview.
await cp("tasks", "dist/tasks", { recursive: true });
// The page used to live at /task/, and emails carrying that address are already
// in people's inboxes. Keep it, forwarding to the real one.
await cp("task", "dist/task", { recursive: true });
await cp("director", "dist/director", { recursive: true });
await cp("committee", "dist/committee", { recursive: true });
await cp("recruitment", "dist/recruitment", { recursive: true });
await cp("member-recruitment", "dist/member-recruitment", { recursive: true });
// The committee portal builds its scoring form from the rubrics at runtime.
// Copied as .js: some static hosts serve .mjs as application/octet-stream,
// which browsers refuse to execute as a module.
await cp("src/scoring-rubrics.mjs", "dist/scoring-rubrics.js");
// Both dashboards ask it which committees collect a task before the interview,
// so the answer comes from the same file the booking flow and emails read.
await cp("src/interview-config.mjs", "dist/interview-config.js");

await cp("src/role-guide-data.mjs", "dist/role-guide-data.mjs");
// The committee portal reads this too now, to list a committee's own head
// roles when a director accepts an applicant. Same .js copy as
// scoring-rubrics above, for the same reason — this one had never been
// loaded by a browser before, only by the build scripts above.
await cp("src/role-guide-data.mjs", "dist/role-guide-data.js");

// The animated recruitment experience is a Vite app; it emits into dist/join/.
await viteBuild();

console.log("Built static site to dist/");
