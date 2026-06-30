const logoPath = "../The brand System/logos/Resala Logo - source.svg";

function textField({
  id,
  label,
  type = "text",
  autocomplete,
  placeholder,
  helper
}: {
  id: string;
  label: string;
  type?: string;
  autocomplete?: string;
  placeholder?: string;
  helper?: string;
}): string {
  return `
    <div class="apply-field" data-field="${id}">
      <label for="${id}">${label} <span aria-hidden="true">*</span></label>
      ${helper ? `<p class="field-helper" id="${id}-helper">${helper}</p>` : ""}
      <input id="${id}" name="${id}" type="${type}" ${autocomplete ? `autocomplete="${autocomplete}"` : ""} ${placeholder ? `placeholder="${placeholder}"` : ""} required>
      <p class="field-error" id="${id}-error" data-error-for="${id}"></p>
    </div>
  `;
}

export function TaskSubmissionForm(): string {
  return `
    <form class="application-form task-submission-form" data-task-submission-form novalidate>
      <div class="form-error-summary" data-error-summary hidden role="alert"></div>

      <section class="apply-card" aria-labelledby="task-identity-title">
        <div class="apply-card-heading">
          <span class="apply-step-number">01</span>
          <div>
            <h2 id="task-identity-title">Find your application</h2>
            <p>Use the same AUC email and Student ID from your application so we can update the correct row.</p>
          </div>
        </div>
        <div class="apply-field-grid">
          ${textField({ id: "aucEmail", label: "AUC email", type: "email", autocomplete: "email", placeholder: "name@aucegypt.edu" })}
          ${textField({ id: "studentId", label: "Student ID", autocomplete: "off" })}
        </div>
      </section>

      <section class="apply-card" aria-labelledby="task-links-title">
        <div class="apply-card-heading">
          <span class="apply-step-number">02</span>
          <div>
            <h2 id="task-links-title">Submit your task links</h2>
            <p>Paste one shareable link for each task. Google Docs, PDFs, slides, or Drive links are accepted.</p>
          </div>
        </div>
        <div class="apply-field-grid">
          ${textField({
            id: "firstPreferenceTaskLink",
            label: "First preference task link",
            type: "url",
            placeholder: "https://docs.google.com/...",
            helper: "This should match the task for your first role preference."
          })}
          ${textField({
            id: "secondPreferenceTaskLink",
            label: "Second preference task link",
            type: "url",
            placeholder: "https://docs.google.com/...",
            helper: "This should match the task for your second role preference."
          })}
          <div class="apply-field apply-field-full" data-field="taskNotes">
            <label for="taskNotes">Notes</label>
            <textarea id="taskNotes" name="taskNotes" rows="4" placeholder="Optional: add anything the reviewers should know about your submission."></textarea>
            <p class="field-error" id="taskNotes-error" data-error-for="taskNotes"></p>
          </div>
        </div>
      </section>

      <div class="apply-submit-bar">
        <p>Submit before the deadline shown in your confirmation email.</p>
        <button class="button button-primary apply-submit-button" type="submit" data-submit-button>Submit tasks</button>
      </div>
    </form>
  `;
}

export function TaskSuccessState(): string {
  return `
    <section class="success-state" data-success-state hidden tabindex="-1" aria-labelledby="task-success-title">
      <span class="success-mark" aria-hidden="true">02</span>
      <h2 id="task-success-title">Your task submission was received.</h2>
      <p>We updated your application row with both task links.</p>
      <a class="button button-secondary" href="../">Back to recruitment page</a>
    </section>
  `;
}

export function TaskPage(): string {
  return `
    <main class="apply-page task-page">
      <section class="apply-hero" aria-labelledby="task-title">
        <div class="apply-hero-pattern" aria-hidden="true"></div>
        <header class="apply-topbar">
          <a class="apply-logo-link" href="../" aria-label="Back to Resala AUC recruitment home">
            <span class="brand-logo-frame">
              <img src="${logoPath}" alt="Resala AUC logo" width="420" height="236">
            </span>
          </a>
          <div class="task-topbar-actions">
            <a class="button button-secondary apply-back-link" href="../apply/">Application form</a>
            <a class="button button-secondary apply-back-link" href="../">Back to landing page</a>
          </div>
        </header>
        <div class="container apply-hero-grid">
          <div class="apply-hero-copy">
            <p class="eyebrow">Resala AUC Recruitment</p>
            <h1 id="task-title">Submit Your Tasks</h1>
            <p>Send the completed task links for both of your role preferences.</p>
          </div>
          <div class="apply-hero-note" aria-label="Task submission guidance">
            <span>Task submission</span>
            <strong>Your links will be mapped back to your application row.</strong>
          </div>
        </div>
      </section>

      <section class="apply-form-section" aria-label="Resala AUC task submission form">
        <div class="container apply-form-layout">
          <div class="apply-side-panel">
            <span class="side-panel-label">Before your interview</span>
            <h2>Two preferences, two tasks.</h2>
            <p>Submit one link for your first preference and one link for your second preference. Make sure each link is viewable by the Resala team.</p>
          </div>
          <div>
            ${TaskSubmissionForm()}
            ${TaskSuccessState()}
          </div>
        </div>
      </section>
    </main>
  `;
}

export function renderTaskPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Submit Tasks | Resala AUC Recruitment</title>
    <meta name="description" content="Submit Resala AUC recruitment task links for both role preferences.">
    <link rel="icon" type="image/png" href="../favicon.png">
    <link rel="apple-touch-icon" href="../favicon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fredoka+One&family=Noto+Sans:wght@400;500;600;700;800&family=Roboto+Slab:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../styles.css">
  </head>
  <body class="apply-page-body">
    ${TaskPage()}
    <script src="../spreadsheet-config.js"></script>
    <script type="module" src="../tasks.js"></script>
  </body>
</html>`;
}
