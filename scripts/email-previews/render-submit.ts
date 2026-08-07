/**
 * Renders the applicant emails the submit function sends, straight from the
 * builders it uses in production — so a preview can never drift from what an
 * applicant actually receives. Run through scripts/build-email-previews.mjs.
 *
 * One folder per committee, holding what that committee's own applicant gets
 * when it is their first preference: confirmation, reschedule, cancellation.
 * The reminder is added by render-reminder.ts, which lives in the other edge
 * function.
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

/**
 * Every committee recruiting this cycle, with the head an applicant would have
 * picked. `role` is the raw name the sheet stores and every lookup keys off;
 * `step` is the free-text field the head name rides in.
 */
const COMMITTEES = [
  { dir: "tech-team", label: "Tech Team", role: "Tech Director", step: "The Step of System · The Builder", second: "Operations — The Coordinator" },
  { dir: "operations", label: "Operations", role: "Operations", step: "The Step of Execution · The Coordinator", second: "Branding / Media — Head of Projects" },
  { dir: "branding-media", label: "Branding / Media", role: "Branding / Media", step: "The Step of Voice · Head of Projects", second: "PR / Fundraising — Events Head" },
  { dir: "hr", label: "HR", role: "HR", step: "The Step of People · Engagement Head", second: "Initiatives Director — Campaigns Head" },
  { dir: "pr-fundraising", label: "PR / Fundraising", role: "PR / Fundraising", step: "The Step of Opportunity · Sponsorship Head", second: "Branding / Media — Head of Projects" },
  { dir: "visits", label: "Visits", role: "Visits", step: "The Step of Presence · Discovery Head", second: "Initiatives Director — Campaigns Head" },
  { dir: "childrens-day", label: "Children's Day", role: "Children Day Director", step: "The Step of Growth · Creative Head", second: "HR — Engagement Head" },
  { dir: "initiatives", label: "Initiatives", role: "Initiatives Director", step: "The Step of Innovation · Campaigns Head", second: "Visits — Discovery Head" }
];

const SLOT = "2026-08-08 at 1:00 PM";
const MEET = "https://meet.google.com/abc-defg-hij";

function applicant(committee: (typeof COMMITTEES)[number]) {
  return {
    timestamp: "2026-08-05T18:39:05.000Z",
    createdAt: "2026-08-05T18:39:05.000Z",
    fullName: "Nour Hassan",
    aucEmail: "nour.hassan@aucegypt.edu",
    studentId: "900221133",
    major: "Mechanical Engineering",
    yearLevel: "Junior",
    phone: "+20 10 1234 5678",
    roleAppliedFor: committee.role,
    roleStepTitle: committee.step,
    roleDescription: "",
    secondPreference: committee.second,
    whyThisRole: "",
    whyChooseYourself: "",
    interviewSlot: SLOT,
    interviewSlotLabel: SLOT,
    interviewSlotId: "preview-slot"
  };
}

const reservation = {
  slot: {
    id: "preview-slot",
    label: SLOT,
    date: "2026-08-08",
    startTime: "1:00 PM",
    endTime: "2:00 PM",
    startDateTime: "2026-08-08T13:00:00",
    endDateTime: "2026-08-08T14:00:00",
    capacity: 1,
    active: true,
    reservedCount: 1,
    remaining: 0,
    full: true
  },
  calendarEventId: "preview-event-id",
  meetLink: MEET
};

/** Stand-ins for the Director and Vice-Director the real mail copies in. */
const panel = [
  { email: "director@aucegypt.edu", name: "Committee Director", positionType: "Director" },
  { email: "vice@aucegypt.edu", name: "Committee Vice-Director", positionType: "Vice-Director" }
];

const written: Array<{ committee: string; dir: string; file: string; title: string; subject: string }> = [];

for (const committee of COMMITTEES) {
  await Deno.mkdir(`${OUT}/${committee.dir}`, { recursive: true });
  const payload = applicant(committee) as never;

  const confirmation = buildConfirmationEmailTemplate(
    payload,
    reservation,
    getApplicantRoleGuideLinks(payload),
    panel
  );
  await Deno.writeTextFile(`${OUT}/${committee.dir}/confirmation.html`, confirmation.html);
  await Deno.writeTextFile(`${OUT}/${committee.dir}/confirmation.txt`, confirmation.body);
  written.push({
    committee: committee.label,
    dir: committee.dir,
    file: "confirmation.html",
    title: "Confirmation · sent the moment they book",
    subject: confirmation.subject
  });

  await Deno.writeTextFile(
    `${OUT}/${committee.dir}/reschedule.html`,
    buildRescheduleEmailHtml({ fullName: "Nour Hassan", slot: "2026-08-09 at 2:00 PM", meetLink: MEET })
  );
  written.push({
    committee: committee.label,
    dir: committee.dir,
    file: "reschedule.html",
    title: "Reschedule · sent when the time moves",
    subject: "Resala AUC: Your interview has been rescheduled"
  });

  await Deno.writeTextFile(
    `${OUT}/${committee.dir}/cancelled.html`,
    buildInterviewCancelledEmailHtml({ fullName: "Nour Hassan", slot: SLOT })
  );
  written.push({
    committee: committee.label,
    dir: committee.dir,
    file: "cancelled.html",
    title: "Cancellation · sent when the booking is called off",
    subject: "Resala AUC: Your interview has been cancelled"
  });
}

/* The one case that has no committee: an application that arrived without a
   slot, which reads the same whoever sent it. */
const noSlotPayload = { ...applicant(COMMITTEES[1]), interviewSlot: "", interviewSlotLabel: "", interviewSlotId: "" } as never;
const noSlot = buildConfirmationEmailTemplate(noSlotPayload, null, getApplicantRoleGuideLinks(noSlotPayload), panel);
await Deno.writeTextFile(`${OUT}/confirmation-no-slot-booked.html`, noSlot.html);
await Deno.writeTextFile(`${OUT}/confirmation-no-slot-booked.txt`, noSlot.body);
written.push({
  committee: "",
  dir: "",
  file: "confirmation-no-slot-booked.html",
  title: "Confirmation · application received, no slot booked",
  subject: noSlot.subject
});

await Deno.writeTextFile(`${OUT}/.submit-manifest.json`, JSON.stringify(written, null, 2));
console.log(`submit: ${written.length} previews across ${COMMITTEES.length} committees`);

// The module starts its HTTP handler on import; nothing here needs it.
Deno.exit(0);
