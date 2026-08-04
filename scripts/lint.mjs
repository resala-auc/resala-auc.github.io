import { readFile } from "node:fs/promises";
import { renderPage } from "../src/render.mjs";

const html = renderPage();
const css = await readFile("src/styles.css", "utf8");
const js = await readFile("src/app.js", "utf8");
const failures = [];

const requiredText = [
  "Build the first step toward a better life.",
  "ابني اول خطوة في حياتهم",
  "Apply Now",
  "Head applications are open."
];

for (const text of requiredText) {
  if (!html.includes(text)) {
    failures.push(`Missing required text: ${text}`);
  }
}

if (html.match(/<form[\s>]/i) || html.match(/<input[\s>]/i) || html.match(/<textarea[\s>]/i)) {
  failures.push("Landing page must not include application form fields.");
}

if (!html.includes('href="./join/"')) {
  failures.push("Landing page must link to the heads application route.");
}

// The director cycle left "closed" copy behind on every CTA; catch a relapse.
if (/Applications (are )?closed/i.test(html)) {
  failures.push("Landing page still says applications are closed.");
}

if (/\bDirector\b/.test(html)) {
  failures.push("Landing page names a Director role; this cycle recruits heads only.");
}

if (!css.includes("@media (prefers-reduced-motion: reduce)")) {
  failures.push("Missing reduced-motion support.");
}

if (!js.includes("IntersectionObserver")) {
  failures.push("Missing lightweight reveal behavior.");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Lint checks passed.");
