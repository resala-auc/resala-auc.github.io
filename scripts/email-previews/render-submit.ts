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
  buildAcceptanceEmailHtml,
  buildConfirmationEmailTemplate,
  buildInterviewCancelledEmailHtml,
  buildPreferenceSwapCommitteeNoticeHtml,
  buildPreferenceSwapEmailHtml,
  buildRescheduleEmailHtml,
  buildSlotExtensionAnnouncementEmailHtml,
  buildSlotExtensionAnnouncementEmailText
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

  const confirmation = buildConfirmationEmailTemplate(payload, reservation, panel);
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
    title: "Withdrawal · sent when the applicant pulls out",
    subject: "Resala AUC: your application has been withdrawn"
  });
}

/* The one case that has no committee: an application that arrived without a
   slot, which reads the same whoever sent it. */
const noSlotPayload = { ...applicant(COMMITTEES[1]), interviewSlot: "", interviewSlotLabel: "", interviewSlotId: "" } as never;
const noSlot = buildConfirmationEmailTemplate(noSlotPayload, null, panel);
await Deno.writeTextFile(`${OUT}/confirmation-no-slot-booked.html`, noSlot.html);
await Deno.writeTextFile(`${OUT}/confirmation-no-slot-booked.txt`, noSlot.body);
written.push({
  committee: "",
  dir: "",
  file: "confirmation-no-slot-booked.html",
  title: "Confirmation · application received, no slot booked",
  subject: noSlot.subject
});

/*
 * Not per-committee: the swap-preference emails read the same regardless of
 * which two committees are involved, so one pair of examples covers it —
 * with, and without, an interview already booked.
 */
await Deno.mkdir(`${OUT}/preference-swap`, { recursive: true });
for (const [file, booking, movedBooking] of [
  ["applicant-notice-booked.html", { slotLabel: SLOT, meetLink: MEET }, false],
  ["applicant-notice-no-booking.html", null, false],
  ["applicant-notice-moved.html", { slotLabel: "2026-08-09 at 3:00 PM", meetLink: MEET }, true]
] as const) {
  await Deno.writeTextFile(
    `${OUT}/preference-swap/${file}`,
    buildPreferenceSwapEmailHtml({
      fullName: "Nour Hassan",
      firstLabel: "PR / Fundraising — Partnerships Head",
      secondLabel: "Children\u2019s Day — Creative Logistics & Visual Identity Lead",
      booking,
      movedBooking
    })
  );
  written.push({
    committee: "",
    dir: "preference-swap",
    file,
    title: `Applicant notice · preferences swapped (${
      movedBooking ? "interview moved to the new committee" : booking ? "interview already booked, untouched" : "no booking yet"
    })`,
    subject: "Resala AUC: your preferences have been updated"
  });
}

for (const [file, booking, movedAway] of [
  ["committee-notice.html", { slotLabel: SLOT, meetLink: MEET }, false],
  ["committee-notice-moved-away.html", null, true]
] as const) {
  await Deno.writeTextFile(
    `${OUT}/preference-swap/${file}`,
    buildPreferenceSwapCommitteeNoticeHtml({
      committeeName: "Children\u2019s Day",
      applicantName: "Nour Hassan",
      applicantEmail: "nour.hassan@aucegypt.edu",
      newFirstLabel: "PR / Fundraising — Partnerships Head",
      booking,
      movedAway
    })
  );
  written.push({
    committee: "",
    dir: "preference-swap",
    file,
    title: `Committee notice · sent to whichever committee just lost first preference (${
      movedAway ? "their interview left with the applicant" : "interview untouched, still theirs to run"
    })`,
    subject: "Resala AUC: Nour Hassan is now your second preference"
  });
}

/* One as Head, one as Co-Head, one as Member — the position and whether a
   committee Director exists to be "your partner" are the only things the
   copy actually changes on. */
await Deno.mkdir(`${OUT}/acceptance`, { recursive: true });
const samplePartner = { name: "Fatima Nageh", positionType: "Director", email: "fatimanageh@aucegypt.edu", phone: "+201024029437" };
for (const position of ["Head", "Co-Head", "Member"] as const) {
  const file = `${position.toLowerCase()}.html`;
  await Deno.writeTextFile(
    `${OUT}/acceptance/${file}`,
    buildAcceptanceEmailHtml({
      fullName: "Nour Hassan",
      committee: "Children’s Day",
      headName: "Creative Logistics & Visual Identity Lead",
      position,
      onboardingUrl: "https://resala-auc.github.io/heads-onboarding/?email=nour.hassan%40aucegypt.edu",
      partner: position === "Member" ? null : samplePartner
    })
  );
  written.push({
    committee: "",
    dir: "acceptance",
    file,
    title: `Acceptance · welcomed in as ${position}${position === "Member" ? " (no Director on file, partner card omitted)" : ""}`,
    subject: "Resala AUC: welcome to Children’s Day — you're in!"
  });
}

/*
 * One per committee, since each is extending for a different, deliberately
 * chosen subset of its own empty roles — never "all your empty roles",
 * only the ones actually still worth recruiting for.
 */
await Deno.mkdir(`${OUT}/extension`, { recursive: true });
const EXTENSION_END = "August 23";
const EXTENSION_ROLES: Array<{ dir: string; committee: string; director: string; roles: string[] }> = [
  { dir: "tech-team", committee: "Tech Team", director: "Director", roles: ["The Navigator", "The Scout", "The Builder", "The Verifier", "The Closer", "The Firefighter"] },
  { dir: "operations", committee: "Operations", director: "Director", roles: ["The Negotiator", "The Coordinator", "The Planner"] },
  { dir: "branding-media", committee: "Branding / Media", director: "Director", roles: ["Head of Acting & Production"] },
  { dir: "hr", committee: "HR", director: "Director", roles: ["Engagement Head"] },
  { dir: "pr-fundraising", committee: "PR / Fundraising", director: "Director", roles: ["Sponsorship Head", "Events Head", "Partnerships Head"] },
  { dir: "visits", committee: "Visits", director: "Director", roles: ["Storytelling Head", "Execution Head"] },
  { dir: "childrens-day", committee: "Children's Day", director: "Director", roles: ["Teaching & Organizing Lead"] },
  { dir: "initiatives", committee: "Initiatives", director: "Director", roles: ["Research Head", "Field Execution Head", "Teaching & Engagement Head"] }
];
for (const entry of EXTENSION_ROLES) {
  const html = buildSlotExtensionAnnouncementEmailHtml({
    directorName: entry.director,
    committee: entry.committee,
    roles: entry.roles,
    extensionEnd: EXTENSION_END
  });
  const text = buildSlotExtensionAnnouncementEmailText({
    directorName: entry.director,
    committee: entry.committee,
    roles: entry.roles,
    extensionEnd: EXTENSION_END
  });
  await Deno.mkdir(`${OUT}/extension/${entry.dir}`, { recursive: true });
  await Deno.writeTextFile(`${OUT}/extension/${entry.dir}/announcement.html`, html);
  await Deno.writeTextFile(`${OUT}/extension/${entry.dir}/announcement.txt`, text);
  written.push({
    committee: entry.committee,
    dir: `extension/${entry.dir}`,
    file: "announcement.html",
    title: `Extension announcement · ${entry.roles.length} role${entry.roles.length === 1 ? "" : "s"} through ${EXTENSION_END}`,
    subject: `Recruitment extended through ${EXTENSION_END} — ${entry.committee}`
  });
}

await Deno.writeTextFile(`${OUT}/.submit-manifest.json`, JSON.stringify(written, null, 2));
console.log(`submit: ${written.length} previews across ${COMMITTEES.length} committees`);

// The module starts its HTTP handler on import; nothing here needs it.
Deno.exit(0);
