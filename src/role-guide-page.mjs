import { roleGuide, roleGuides } from "./role-guide-data.mjs";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function listItems(items) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function GuideShell({ title, description, stylesheetHref, logoHref, homeHref, body }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} | Resala AUC Recruitment</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fredoka+One&family=Noto+Sans:wght@400;500;600;700;800&family=Roboto+Slab:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="${stylesheetHref}">
  </head>
  <body class="guide-page-body">
    <main class="guide-page">
      <header class="guide-topbar">
        <a class="apply-logo-link" href="${homeHref}" aria-label="Back to Resala AUC recruitment home">
          <span class="brand-logo-frame">
            <img src="${logoHref}" alt="Resala AUC logo" width="420" height="236">
          </span>
        </a>
        <div class="task-topbar-actions">
          <a class="button button-secondary" href="${homeHref}apply/">Apply</a>
          <a class="button button-primary" href="${homeHref}guides/">How to choose your role</a>
        </div>
      </header>
      ${body}
    </main>
  </body>
</html>`;
}

function RoleCard(role, basePath) {
  return `
    <article class="guide-role-card">
      <span>${escapeHtml(role.stepTitle)}</span>
      <h3>${escapeHtml(role.name)}</h3>
      <p>${escapeHtml(role.shortDescription)}</p>
      <a class="role-guide-link" href="${basePath}guides/${role.id}/">View role details</a>
    </article>
  `;
}

function ExpectationCard(expectation) {
  return `
    <section class="guide-panel">
      <h3>${escapeHtml(expectation.title)}</h3>
      <p>${escapeHtml(expectation.body)}</p>
      <ul>${listItems(expectation.points)}</ul>
    </section>
  `;
}

function ChoosingStep(step, index) {
  return `
    <section class="guide-step-panel">
      <span>${String(index + 1).padStart(2, "0")}</span>
      <h3>${escapeHtml(step.title)}</h3>
      <ul>${listItems(step.points)}</ul>
    </section>
  `;
}

export function renderRoleGuideIndexPage() {
  const body = `
    <section class="guide-hero">
      <div class="container guide-hero-grid">
        <div>
          <p class="eyebrow">${escapeHtml(roleGuide.subtitle)}</p>
          <h1>${escapeHtml(roleGuide.title)}</h1>
          ${roleGuide.opening.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
        </div>
        <aside class="guide-contact-panel">
          <span>Build the First Step</span>
          <strong>Choose responsibility, not only a title.</strong>
          <p>${escapeHtml(roleGuide.contactPhone)}<br>${escapeHtml(roleGuide.contactEmail)}</p>
        </aside>
      </div>
    </section>
    <section class="guide-section">
      <div class="container">
        <div class="section-heading">
          <p class="eyebrow">Director standard</p>
          <h2>What every director in Resala must have</h2>
        </div>
        <div class="guide-panel-grid">
          ${roleGuide.directorExpectations.map(ExpectationCard).join("")}
        </div>
      </div>
    </section>
    <section class="guide-section guide-section-soft">
      <div class="container">
        <div class="section-heading">
          <p class="eyebrow">Choose with clarity</p>
          <h2>Use this guide in three steps</h2>
        </div>
        <div class="guide-step-grid">
          ${roleGuide.choosingSteps.map(ChoosingStep).join("")}
        </div>
      </div>
    </section>
    <section class="guide-section">
      <div class="container">
        <div class="section-heading">
          <p class="eyebrow">Available roles</p>
          <h2>Find the responsibility that fits you</h2>
        </div>
        <div class="guide-role-grid">
          ${roleGuides.map((role) => RoleCard(role, "../")).join("")}
        </div>
      </div>
    </section>
    <section class="guide-section guide-section-soft">
      <div class="container guide-final-test">
        <div class="section-heading">
          <p class="eyebrow">Final test</p>
          <h2>Before you submit your preferences</h2>
        </div>
        <div class="guide-panel-grid">
          <section class="guide-panel">
            <h3>Ask yourself</h3>
            <ol>${roleGuide.finalTest.questions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ol>
          </section>
          <section class="guide-panel">
            <h3>Strong fit</h3>
            <ul>${listItems(roleGuide.finalTest.strongFit)}</ul>
          </section>
          <section class="guide-panel">
            <h3>Reconsider if</h3>
            <ul>${listItems(roleGuide.finalTest.weakFit)}</ul>
          </section>
        </div>
      </div>
    </section>
  `;

  return GuideShell({
    title: roleGuide.title,
    description: "A Resala AUC recruitment guide for choosing the director role that fits your skills, passion, and ownership.",
    stylesheetHref: "../styles.css",
    logoHref: "../The brand System/logos/Resala Logo - source.svg",
    homeHref: "../",
    body
  });
}

export function renderRoleGuidePage(role) {
  const body = `
    <section class="guide-hero role-guide-hero">
      <div class="container guide-hero-grid">
        <div>
          <p class="eyebrow">${escapeHtml(role.stepTitle)}</p>
          <h1>${escapeHtml(role.name)}</h1>
          <p>${escapeHtml(role.whyChoose)}</p>
        </div>
        <aside class="guide-contact-panel">
          <span>Guiding question</span>
          <strong>${escapeHtml(role.guidingQuestion)}</strong>
        </aside>
      </div>
    </section>
    <section class="guide-section">
      <div class="container">
        <div class="section-heading">
          <p class="eyebrow">Role details</p>
          <h2>What this director actually carries</h2>
        </div>
        <div class="guide-detail-layout">
          <section class="guide-panel guide-panel-wide">
            <h3>What you will actually do</h3>
            <ul>${listItems(role.actualWork)}</ul>
          </section>
          <section class="guide-panel">
            <h3>Leadership requirement</h3>
            <p>${escapeHtml(role.leadershipRequirement)}</p>
          </section>
          <section class="guide-panel">
            <h3>Ownership requirement</h3>
            <p>${escapeHtml(role.ownershipRequirement)}</p>
          </section>
          <section class="guide-panel">
            <h3>Skills requirement</h3>
            <ul>${listItems(role.skillsRequirement)}</ul>
          </section>
          <section class="guide-panel">
            <h3>Preferred experiences or passions</h3>
            <ul>${listItems(role.preferredExperiences)}</ul>
          </section>
          <section class="guide-panel guide-panel-wide guide-task-panel">
            <h3>Interview task direction</h3>
            <p>${escapeHtml(role.taskPrompt)}</p>
          </section>
        </div>
      </div>
    </section>
  `;

  return GuideShell({
    title: role.name,
    description: `${role.name} details for Resala AUC board recruitment.`,
    stylesheetHref: "../../styles.css",
    logoHref: "../../The brand System/logos/Resala Logo - source.svg",
    homeHref: "../../",
    body
  });
}
