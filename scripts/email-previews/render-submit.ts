/**
 * Renders the applicant emails the submit function sends, straight from the
 * builders it uses in production — so a preview can never drift from what an
 * applicant actually receives. Run through scripts/build-email-previews.mjs.
 *
 * Deno, not Node: these builders live in the edge function.
 */
import {
  buildConfirmationEmailTemplate,
  buildInterviewCancelledEmailHtml,
  buildRescheduleEmailHtml,
  getApplicantRoleGuideLinks
} from "../../supabase/functions/submit/index.ts";

const OUT = Deno.args[0] ?? "email-previews";

/** A plausible applicant. Only the fields the templates actually read matter. */
function applicant(overrides: Record<string, unknown> = {}) {
  return {
    timestamp: "2026-08-05T18:39:05.000Z",
    createdAt: "2026-08-05T18:39:05.000Z",
    fullName: "Nour Hassan",
    aucEmail: "nour.hassan@aucegypt.edu",
    studentId: "900221133",
    major: "Mechanical Engineering",
    yearLevel: "Junior",
    phone: "+20 10 1234 5678",
    roleAppliedFor: "Operations",
    roleStepTitle: "The Step of Execution · The Coordinator",
    roleDescription: "Keeps the moving parts of an event in one place.",
    secondPreference: "Branding / Media — Head of Projects",
    whyThisRole: "",
    whyChooseYourself: "",
    interviewSlot: "2026-08-07 at 4:00 PM",
    interviewSlotLabel: "2026-08-07 at 4:00 PM",
    interviewSlotId: "operations-2026-08-07-1600",
    ...overrides
  };
}

const reservation = (meetLink = "https://meet.google.com/abc-defg-hij") => ({
  slot: {
    id: "operations-2026-08-07-1600",
    label: "2026-08-07 at 4:00 PM",
    date: "2026-08-07",
    startTime: "4:00 PM",
    endTime: "4:30 PM",
    startDateTime: "2026-08-07T16:00:00",
    endDateTime: "2026-08-07T16:30:00",
    capacity: 1,
    active: true,
    reservedCount: 1,
    remaining: 0,
    full: true
  },
  calendarEventId: "preview-event-id",
  meetLink
});

const panel = [
  { email: "ali@aucegypt.edu", name: "Ali Abdelsalam", positionType: "Director" },
  { email: "jana@aucegypt.edu", name: "Jana Nabet", positionType: "Vice-Director" }
];

/* One file per situation an applicant can actually be in. The task variants are
   the point: what arrives differs by committee, and that is exactly what is
   hard to check without seeing them side by side. */
const cases = [
  {
    file: "confirmation-01-no-task.html",
    title: "Confirmation · committee with no task (Operations)",
    payload: applicant()
  },
  {
    file: "confirmation-02-task-submitted-before.html",
    title: "Confirmation · task submitted before the interview (Children's Day · Creative)",
    payload: applicant({
      roleAppliedFor: "Children Day Director",
      roleStepTitle: "The Step of Growth · Creative Head",
      interviewSlot: "2026-08-07 at 5:00 PM",
      interviewSlotLabel: "2026-08-07 at 5:00 PM",
      interviewSlotId: "children-day-director-2026-08-07-1700",
      secondPreference: "HR — Engagement Head"
    })
  },
  {
    file: "confirmation-03-task-brought-to-interview.html",
    title: "Confirmation · task brought to the interview (Visits · Discovery)",
    payload: applicant({
      roleAppliedFor: "Visits",
      roleStepTitle: "The Step of Presence · Discovery Head",
      interviewSlot: "2026-08-08 at 1:00 PM",
      interviewSlotLabel: "2026-08-08 at 1:00 PM",
      interviewSlotId: "visits-2026-08-08-1300",
      secondPreference: "Initiatives Director — Campaigns Head"
    })
  },
  {
    file: "confirmation-04-no-slot-booked.html",
    title: "Confirmation · application received, no slot booked yet",
    payload: applicant({ interviewSlot: "", interviewSlotLabel: "", interviewSlotId: "" }),
    noReservation: true
  }
];

const written: Array<{ file: string; title: string; subject: string }> = [];

for (const entry of cases) {
  const payload = entry.payload as never;
  const template = buildConfirmationEmailTemplate(
    payload,
    entry.noReservation ? null : reservation(),
    getApplicantRoleGuideLinks(payload),
    panel
  );
  await Deno.writeTextFile(`${OUT}/${entry.file}`, template.html);
  await Deno.writeTextFile(`${OUT}/${entry.file.replace(/\.html$/, ".txt")}`, template.body);
  written.push({ file: entry.file, title: entry.title, subject: template.subject });
}

await Deno.writeTextFile(
  `${OUT}/reschedule.html`,
  buildRescheduleEmailHtml({
    fullName: "Nour Hassan",
    slot: "2026-08-09 at 2:00 PM",
    meetLink: "https://meet.google.com/abc-defg-hij"
  })
);
written.push({
  file: "reschedule.html",
  title: "Interview moved to a new time",
  subject: "Resala AUC: Your interview has been rescheduled"
});

await Deno.writeTextFile(
  `${OUT}/cancelled.html`,
  buildInterviewCancelledEmailHtml({ fullName: "Nour Hassan", slot: "2026-08-09 at 2:00 PM" })
);
written.push({
  file: "cancelled.html",
  title: "Interview cancelled at the applicant's request",
  subject: "Resala AUC: Your interview has been cancelled"
});

await Deno.writeTextFile(`${OUT}/.submit-manifest.json`, JSON.stringify(written, null, 2));
console.log(`submit: ${written.length} previews`);

// The module starts its HTTP handler on import; nothing here needs it.
Deno.exit(0);
