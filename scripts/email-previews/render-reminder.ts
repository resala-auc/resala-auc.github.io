/**
 * The T-60 reminder, rendered from the reminder function's own builder. Kept
 * in its own file because it lives in a different edge function, and importing
 * both in one process would start two HTTP handlers on the same port.
 */
import { buildReminderEmailTemplate } from "../../supabase/functions/send-interview-reminders/index.ts";

const OUT = Deno.args[0] ?? "email-previews";

/*
 * One per committee: the only thing that changes is the committee's own name,
 * but that is the line an applicant checks to be sure the mail is about the
 * interview they are waiting for, so it is worth seeing rendered.
 */
const committees = [
  { role: "Operations", file: "reminder-1-hour-before.html", label: "Operations" },
  { role: "Visits", file: "reminder-1-hour-before-visits.html", label: "Visits" }
];

const written = [];
for (const entry of committees) {
  const template = buildReminderEmailTemplate(
    "Nour Hassan",
    "2026-08-08 at 1:00 PM",
    "https://meet.google.com/abc-defg-hij",
    entry.role
  );
  await Deno.writeTextFile(`${OUT}/${entry.file}`, template.html);
  await Deno.writeTextFile(`${OUT}/${entry.file.replace(/\.html$/, ".txt")}`, template.body);
  written.push({
    file: entry.file,
    title: `Reminder · one hour before the interview (${entry.label})`,
    subject: template.subject
  });
}

await Deno.writeTextFile(`${OUT}/.reminder-manifest.json`, JSON.stringify(written, null, 2));
console.log(`reminder: ${written.length} previews`);
Deno.exit(0);
