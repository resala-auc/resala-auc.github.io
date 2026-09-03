/**
 * Every email a MEMBER applicant can receive, rendered by the same builders
 * the submit function sends with — so a preview can never drift from what
 * lands in an inbox.
 *
 * Separate from render-submit.ts, which renders the heads cycle: the two
 * cycles share an edge function but not a single template, and the question
 * this folder answers is "what does a member get", not "what does the submit
 * function contain".
 *
 * There is deliberately no reminder here. The reminder job
 * (supabase/functions/send-interview-reminders) reads the classic "Interview
 * Reservations" tab and knows nothing about members, so a member currently
 * receives the confirmation and then nothing until the interview. When that
 * is built, it belongs in this file.
 *
 * Deno, not Node: these builders live in the edge function.
 */
import {
  buildGeneralVolunteerEmail,
  buildMemberConfirmationEmail,
  buildMemberInterviewIcs,
  buildMemberNoticeEmail
} from "../../supabase/functions/submit/index.ts";

const OUT = Deno.args[0] ?? "email-previews";
const DIR = "members";

const MEET = "https://meet.google.com/abc-defg-hij";
/* A real slot off the September board, in the real Cairo offset (+03:00 —
   Egypt is on daylight saving until the end of October). */
const SLOT_LABEL = "Tue, Sep 8 · 3:00 PM–3:15 PM";
const SLOT_START = "2026-09-08T15:00:00+03:00";

/** One applicant, reused everywhere, so the states are compared not the names. */
const applicant = {
  mode: "member-submit",
  timestamp: "2026-09-03T18:39:05.000Z",
  createdAt: "2026-09-03T18:39:05.000Z",
  fullName: "Nour Hassan",
  aucEmail: "nour.hassan@aucegypt.edu",
  studentId: "900221133",
  major: "Mechanical Engineering",
  yearLevel: "Freshman",
  phone: "+20 10 1234 5678",
  whatsappConsent: true,
  roleAppliedFor: "Tech Team",
  committeeId: "tech",
  subCommittee: "The Builder",
  subCommitteeId: "builder",
  interviewSlot: SLOT_START,
  interviewSlotId: "tech-2026-09-08-15:00",
  interviewSlotLabel: SLOT_LABEL
} as never;

/**
 * Stand-ins for the people really copied in: the committee's directors, the
 * heads it placed this cycle, and HR. They are on the Cc, never named in the
 * body — a member is interviewed by whichever head is free.
 */
const recipients = [
  { email: "tech.director@aucegypt.edu", name: "Committee Director", positionType: "Director" },
  { email: "tech.head@aucegypt.edu", name: "Committee Head", positionType: "Head" },
  { email: "hr.director@aucegypt.edu", name: "HR Director", positionType: "Director" }
];

const written: Array<{ committee: string; dir: string; file: string; title: string; subject: string }> = [];

await Deno.mkdir(`${OUT}/${DIR}`, { recursive: true });

async function write(
  file: string,
  title: string,
  template: { subject: string; text: string; html: string }
) {
  await Deno.writeTextFile(`${OUT}/${DIR}/${file}.html`, template.html);
  await Deno.writeTextFile(`${OUT}/${DIR}/${file}.txt`, template.text);
  written.push({ committee: "Members", dir: DIR, file: `${file}.html`, title, subject: template.subject });
}

/* The three states the confirmation can be in, which is the whole point of
   previewing it: the happy path, the one where Google Calendar failed and the
   booking was kept anyway, and the one where no slot was picked. */
await write(
  "confirmation",
  "Confirmation · interview booked, invite created",
  buildMemberConfirmationEmail(applicant, SLOT_LABEL, MEET, recipients)
);

await write(
  "confirmation-no-meet-link",
  "Confirmation · booked, but the calendar invite failed",
  buildMemberConfirmationEmail(applicant, SLOT_LABEL, "", recipients)
);

await write(
  "confirmation-no-slot",
  "Confirmation · application received, no slot booked",
  buildMemberConfirmationEmail(applicant, "", "", recipients)
);

await write(
  "reschedule",
  "Reschedule · sent when an admin moves the interview",
  buildMemberNoticeEmail(applicant.fullName, {
    heading: "Your Interview Has Moved",
    committee: "Tech Team",
    lead: "Your interview has been moved to a new time.",
    slotLabel: "Wed, Sep 9 · 6:30 PM–6:45 PM",
    meetLink: MEET,
    closing: "If this time does not work, reply to this email and we will find another."
  })
);

await write(
  "general-volunteer",
  "General volunteer · accepted, but not onto a committee",
  buildGeneralVolunteerEmail(applicant.fullName, "Tech Team")
);

/* The .ics rides on the confirmation. It is what actually puts the interview
   in the calendar of an applicant whose address is not a Google account, so
   it is worth being able to open and check the time on. */
const invite = buildMemberInterviewIcs(applicant, MEET);
if (invite) {
  await Deno.writeTextFile(`${OUT}/${DIR}/interview.ics`, new TextDecoder().decode(invite.contentBytes));
}

await Deno.writeTextFile(`${OUT}/.members-manifest.json`, JSON.stringify(written, null, 2));
console.log(`members: ${written.length} previews`);

// The module starts its HTTP handler on import; nothing here needs it.
Deno.exit(0);
