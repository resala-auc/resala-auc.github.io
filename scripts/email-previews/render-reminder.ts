/**
 * The T-60 reminder, rendered from the reminder function's own builder. Kept
 * in its own file because it lives in a different edge function, and importing
 * both in one process would start two HTTP handlers on the same port.
 */
import { buildReminderEmailTemplate } from "../../supabase/functions/send-interview-reminders/index.ts";

const OUT = Deno.args[0] ?? "email-previews";

const template = buildReminderEmailTemplate(
  "Nour Hassan",
  "2026-08-07 at 4:00 PM",
  "https://meet.google.com/abc-defg-hij",
  "Operations"
);

await Deno.writeTextFile(`${OUT}/reminder-1-hour-before.html`, template.html);
await Deno.writeTextFile(`${OUT}/reminder-1-hour-before.txt`, template.body);
await Deno.writeTextFile(
  `${OUT}/.reminder-manifest.json`,
  JSON.stringify(
    [
      {
        file: "reminder-1-hour-before.html",
        title: "Reminder · one hour before the interview",
        subject: template.subject
      }
    ],
    null,
    2
  )
);

console.log("reminder: 1 preview");
Deno.exit(0);
