/**
 * The T-60 reminder, rendered from the reminder function's own builder, into
 * each committee's folder. Kept separate from render-submit.ts because it
 * lives in a different edge function, and importing both in one process would
 * start two HTTP handlers on the same port.
 *
 * Committees that collect a task get two versions — submitted and not — since
 * that is the difference the applicant actually sees.
 */
import { buildReminderEmailTemplate } from "../../supabase/functions/send-interview-reminders/index.ts";

const OUT = Deno.args[0] ?? "email-previews";
const SLOT = "2026-08-08 at 1:00 PM";
const MEET = "https://meet.google.com/abc-defg-hij";

const COMMITTEES = [
  { dir: "tech-team", label: "Tech Team", role: "Tech Director", task: false },
  { dir: "operations", label: "Operations", role: "Operations", task: false },
  { dir: "branding-media", label: "Branding / Media", role: "Branding / Media", task: false },
  { dir: "hr", label: "HR", role: "HR", task: false },
  { dir: "pr-fundraising", label: "PR / Fundraising", role: "PR / Fundraising", task: false },
  { dir: "visits", label: "Visits", role: "Visits", task: true },
  { dir: "childrens-day", label: "Children's Day", role: "Children Day Director", task: true },
  { dir: "initiatives", label: "Initiatives", role: "Initiatives Director", task: false }
];

const written: Array<{ committee: string; dir: string; file: string; title: string; subject: string }> = [];

for (const committee of COMMITTEES) {
  await Deno.mkdir(`${OUT}/${committee.dir}`, { recursive: true });

  const variants = committee.task
    ? [
        { file: "reminder-task-missing.html", title: "Reminder · task still missing", state: { expected: true, submitted: false } },
        { file: "reminder-task-received.html", title: "Reminder · task already in", state: { expected: true, submitted: true } }
      ]
    : [{ file: "reminder.html", title: "Reminder · one hour before the interview", state: undefined }];

  for (const variant of variants) {
    const template = buildReminderEmailTemplate("Nour Hassan", SLOT, MEET, committee.role, variant.state);
    await Deno.writeTextFile(`${OUT}/${committee.dir}/${variant.file}`, template.html);
    await Deno.writeTextFile(`${OUT}/${committee.dir}/${variant.file.replace(/\.html$/, ".txt")}`, template.body);
    written.push({
      committee: committee.label,
      dir: committee.dir,
      file: variant.file,
      title: variant.title,
      subject: template.subject
    });
  }
}

await Deno.writeTextFile(`${OUT}/.reminder-manifest.json`, JSON.stringify(written, null, 2));
console.log(`reminder: ${written.length} previews`);
Deno.exit(0);
