const SHEET_ID = Deno.env.get("SHEET_ID") ?? "";
const SHEET_NAME = Deno.env.get("SHEET_NAME") ?? "Applications";
const SLOT_SHEET_NAME = Deno.env.get("SLOT_SHEET_NAME") ?? "Interview Slots";
const RESERVATION_SHEET_NAME = Deno.env.get("RESERVATION_SHEET_NAME") ?? "Interview Reservations";
const GOOGLE_SERVICE_ACCOUNT_KEY = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY") ?? "";
const GOOGLE_CLIENT_EMAIL = Deno.env.get("GOOGLE_CLIENT_EMAIL") ?? "";
const GOOGLE_PRIVATE_KEY = Deno.env.get("GOOGLE_PRIVATE_KEY") ?? "";
const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID") ?? "";
const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET") ?? "";
const GMAIL_REFRESH_TOKEN = Deno.env.get("GMAIL_REFRESH_TOKEN") ?? "";
const GMAIL_SENDER_EMAIL = Deno.env.get("GMAIL_SENDER_EMAIL") ?? "";
const GMAIL_SENDER_NAME = Deno.env.get("GMAIL_SENDER_NAME") ?? "Resala AUC";
/*
 * Served from the site rather than the storage bucket: the bucket object is
 * named "Resala Logo - source.png", so its URL only resolves with the spaces
 * encoded exactly as %20 — the plus form answers 400. Any hop that re-encodes
 * a src on the way to the reader (proxies and older Outlook builds both do)
 * turns the logo into a broken image, and an email src is handled by far more
 * intermediaries than a browser one. This path has no characters to mangle.
 */
const EMAIL_LOGO_URL =
  Deno.env.get("EMAIL_LOGO_URL") ?? "https://resala-auc.github.io/join/resala-logo.png";
const ROLE_GUIDE_BASE_URL = (Deno.env.get("ROLE_GUIDE_BASE_URL") ?? "https://resala-auc.github.io/guides").replace(/\/+$/, "");
/** Generated task sheets, published with the site by scripts/build-task-files.mjs. */
const TASK_FILE_BASE_URL = (Deno.env.get("TASK_FILE_BASE_URL") ?? "https://resala-auc.github.io/task-files").replace(
  /\/+$/,
  ""
);
/** Where an applicant hands in a task their committee asks for beforehand. */
const TASK_SUBMISSION_URL = (Deno.env.get("TASK_SUBMISSION_URL") ?? "https://resala-auc.github.io/tasks/").replace(
  /\/*$/,
  "/"
);
/** The post-acceptance checklist a newly accepted head fills in themselves. */
/** The leadership-vs-management video the checklist asks them to watch. */
const LEADERSHIP_VIDEO_URL =
  Deno.env.get("LEADERSHIP_VIDEO_URL") ?? "https://www.youtube.com/watch?v=qzoIAJYPQwo";
/** When their notes on it are due. */
const VIDEO_NOTES_DEADLINE = Deno.env.get("VIDEO_NOTES_DEADLINE") ?? "Tuesday 26 August, 9:00 PM";
const HEADS_ONBOARDING_URL = (
  Deno.env.get("HEADS_ONBOARDING_URL") ?? "https://resala-auc.github.io/heads-onboarding/"
).replace(/\/*$/, "/");
/** Where a director signs in to score, build their team diagram, and add their own interview slots. */
const COMMITTEE_PORTAL_URL = (
  Deno.env.get("COMMITTEE_PORTAL_URL") ?? "https://resala-auc.github.io/committee/"
).replace(/\/*$/, "/");
const CALENDAR_ID = Deno.env.get("CALENDAR_ID") ?? GMAIL_SENDER_EMAIL;
const CALENDAR_TIME_ZONE = Deno.env.get("CALENDAR_TIME_ZONE") ?? "Africa/Cairo";
const ADMIN_RESET_SECRET = Deno.env.get("ADMIN_RESET_SECRET") ?? "";
const INTERVIEW_SLOT_DURATION_MINUTES = 60;
const INTERVIEW_REMINDER_MINUTES = 60;
/*
 * How far ahead an applicant must book. The people interviewing need time to
 * read an application — and, where the committee sets one, the task — before
 * they sit down, so a slot stops being offered once it is closer than this.
 * A slot inside the window is treated exactly like one already past.
 */
const INTERVIEW_BOOKING_LEAD_MINUTES = Number(Deno.env.get("INTERVIEW_BOOKING_LEAD_MINUTES") ?? "360");
/** Where interviewers review this cycle's applicants. */
/** An applicant must move a slot at least this far ahead of it. */
const RESCHEDULE_NOTICE_MINUTES = 60;

const APPLICATION_BASE_HEADERS = [
  "Timestamp",
  "Full Name",
  "AUC Email",
  "Student ID",
  "Major",
  "Year / Level",
  "Phone",
  "Role Applied For",
  "Role Step Title",
  "Role Description",
  "Why This Role",
  "Why Choose Yourself",
  "Hope To Learn",
  "Previous Resala Experience",
  "Interview Slot",
  "Created At",
  "Status",
  "Second Preference"
];

const APPLICATION_TASK_HEADERS = [
  "Task Submitted At",
  "First Preference Task Link",
  "Second Preference Task Link",
  "Task Notes",
  "Task Submission Status"
];

const HEADERS = [...APPLICATION_BASE_HEADERS, ...APPLICATION_TASK_HEADERS];

const INTERVIEW_SCORE_HEADERS = [
  "Interview Notes URL",
  "First Preference Score",
  "Second Preference Score",
  "Recommended Role",
  "Vision + Motivation Score",
  "Leadership Score",
  "Ownership Score",
  "Self-awareness + Commitment Score",
  "Role-Specific Module(s) Score",
  "Final Judgment Score",
  "Total Score",
  "Best Strength 1",
  "Best Strength 2"
];

const TASK_SCORE_HEADERS = [
  "Task 1 Understanding Score",
  "Task 1 Execution Score",
  "Task 1 Practicality Score",
  "Task 1 Initiative Score",
  "Task 1 Clarity Score",
  "Task 1 Total Score",
  "Task 2 Understanding Score",
  "Task 2 Execution Score",
  "Task 2 Practicality Score",
  "Task 2 Initiative Score",
  "Task 2 Clarity Score",
  "Task 2 Total Score"
];

const TASK_NOTE_HEADERS = [
  "Task 1 Evaluation Notes",
  "Task 2 Evaluation Notes"
];

/*
 * ---------------------------------------------------------------------------
 * Heads cycle (August 2026) interview scheduling.
 *
 * The director cycle used one global slot pool with a single 60-minute length.
 * The heads cycle does not work that way: every committee interviews on its own
 * days, and lengths differ (Operations and Branding run 30 minutes, the rest an
 * hour). So heads slots live in their OWN sheet tab, carrying a Committee
 * column, and the original "Interview Slots" tab is left untouched so the
 * finished director cycle stays intact and auditable.
 *
 * COMMITTEE_INTERVIEWS mirrors src/interview-config.mjs, which is what the
 * /join booking UI renders from. Edge Functions cannot import from the site
 * source, so the two must be changed together — keep them in sync.
 * ---------------------------------------------------------------------------
 */
const HEADS_SLOT_SHEET_NAME = Deno.env.get("HEADS_SLOT_SHEET_NAME") ?? "Interview Slots Heads";

/*
 * Heads-cycle interview scoring lives in its own tabs. The applications sheet
 * already carries score columns, but those are the director cycle's fixed six
 * categories — the heads rubrics differ per committee and, in HR's case, per
 * head, so they cannot be flattened into one set of columns.
 */
/*
 * The heads cycle's own applications tab.
 *
 * The original tab has four fixed answer columns, which was right for the
 * director cycle where every applicant answered the same four questions. Heads
 * applicants answer between three and six questions that differ by committee,
 * so those columns silently merged several answers into one cell. This tab
 * stores each question next to its own answer instead: the sheet stays readable
 * to a director, and no answer is lost or mixed with another.
 *
 * Six pairs, because six is the most any committee asks (Operations, Branding
 * and PR). A committee that later asks more needs another pair added here.
 */
const HEADS_APPLICATION_SHEET_NAME =
  Deno.env.get("HEADS_APPLICATION_SHEET_NAME") ?? "Heads Applications";
const HEADS_APPLICATION_QUESTION_SLOTS = 6;
const HEADS_APPLICATION_HEADERS = [
  "Timestamp",
  "Full Name",
  "AUC Email",
  "Student ID",
  "Major",
  "Year / Level",
  "Phone",
  "Committee",
  "Committee ID",
  "Head Applied For",
  "Head ID",
  "Second Preference Committee",
  "Second Preference Head",
  "Second Preference Committee ID",
  "Second Preference Head ID",
  "Interview Slot",
  "Interview Slot ID",
  "Interview Status",
  "Status",
  "Created At",
  ...Array.from({ length: HEADS_APPLICATION_QUESTION_SLOTS }, (_, i) => [
    `Question ${i + 1}`,
    `Answer ${i + 1}`
  ]).flat(),
  // Where a committee's task is handed in before the interview rather than
  // brought to it, this is the applicant's own submission. Last two columns so
  // adding them does not move anything a reader already knows the position of.
  "Task Link",
  "Task Submitted At",
  // There is one interview, run by the first-preference committee, and a
  // second-preference committee only ever joins it as a third interviewer —
  // so before HR assigns one, the second committee says whether they can
  // actually make that time.
  "Second Preference Availability",
  "Second Preference Availability Note",
  "Second Preference Availability Set At",
  // Whichever committee actually evaluated them decides this — first
  // preference, second preference, or an assigned third interviewer — so it
  // is not tied to "Committee" above the way everything else on this row is.
  // "" until a committee drafts them onto its team diagram, then "Draft" while
  // the diagram is still being built, then "Submitted" once the committee
  // confirms its diagram and hands it to the recruitment admin, then "Yes"
  // once the admin approves and the welcome email actually goes out. Nothing
  // is ever emailed on the committee's own say-so.
  "Accepted",
  "Accepted Role",
  "Accepted Position",
  "Accepted By",
  "Accepted At",
  // Which committee's diagram this draft/acceptance belongs to — not always
  // "Committee" above, since a second-preference or assigned committee can
  // accept someone too. Needed to filter a diagram to only its own rows.
  "Accepted Committee",
  // The applicant's own first-preference committee (— "Committee" above) has
  // first claim on them. A second-preference or assigned committee can still
  // draft them onto its diagram, but cannot submit it for admin approval
  // until the first-preference committee explicitly says here it does not
  // want them.
  "First Preference Released",
  "First Preference Released By",
  "First Preference Released At",
  // Who on the committee confirmed the diagram and handed it to the admin —
  // kept separate from Accepted By/At above, which stays whoever originally
  // drafted the placement, so the two steps stay distinguishable.
  "Submitted By",
  "Submitted At",
  // The post-acceptance checklist: replying to take the role, then watching
  // the leadership-vs-management video and writing up what they took from
  // it. Only ever set for a row that already reached "Yes" above.
  "Role Confirmed",
  "Role Confirmed At",
  "Video Notes",
  "Video Notes Submitted At"
];
const TASK_LINK_COLUMN = HEADS_APPLICATION_HEADERS.indexOf("Task Link");
const TASK_SUBMITTED_AT_COLUMN = HEADS_APPLICATION_HEADERS.indexOf("Task Submitted At");
const SECOND_PREFERENCE_COMMITTEE_COLUMN = HEADS_APPLICATION_HEADERS.indexOf("Second Preference Committee");
const FIRST_PREFERENCE_COMMITTEE_COLUMN = HEADS_APPLICATION_HEADERS.indexOf("Committee");
const ACCEPTED_COLUMN = HEADS_APPLICATION_HEADERS.indexOf("Accepted");
const ACCEPTED_ROLE_COLUMN = HEADS_APPLICATION_HEADERS.indexOf("Accepted Role");
const ACCEPTED_POSITION_COLUMN = HEADS_APPLICATION_HEADERS.indexOf("Accepted Position");
const ACCEPTED_BY_COLUMN = HEADS_APPLICATION_HEADERS.indexOf("Accepted By");
const ACCEPTED_AT_COLUMN = HEADS_APPLICATION_HEADERS.indexOf("Accepted At");
const ACCEPTED_COMMITTEE_COLUMN = HEADS_APPLICATION_HEADERS.indexOf("Accepted Committee");
const RELEASED_COLUMN = HEADS_APPLICATION_HEADERS.indexOf("First Preference Released");
const RELEASED_BY_COLUMN = HEADS_APPLICATION_HEADERS.indexOf("First Preference Released By");
const RELEASED_AT_COLUMN = HEADS_APPLICATION_HEADERS.indexOf("First Preference Released At");
const SUBMITTED_BY_COLUMN = HEADS_APPLICATION_HEADERS.indexOf("Submitted By");
const SUBMITTED_AT_COLUMN = HEADS_APPLICATION_HEADERS.indexOf("Submitted At");
const ROLE_CONFIRMED_COLUMN = HEADS_APPLICATION_HEADERS.indexOf("Role Confirmed");
const ROLE_CONFIRMED_AT_COLUMN = HEADS_APPLICATION_HEADERS.indexOf("Role Confirmed At");
const VIDEO_NOTES_COLUMN = HEADS_APPLICATION_HEADERS.indexOf("Video Notes");
const VIDEO_NOTES_AT_COLUMN = HEADS_APPLICATION_HEADERS.indexOf("Video Notes Submitted At");
const SECOND_PREF_AVAILABILITY_COLUMN = HEADS_APPLICATION_HEADERS.indexOf("Second Preference Availability");
const SECOND_PREF_AVAILABILITY_NOTE_COLUMN = HEADS_APPLICATION_HEADERS.indexOf("Second Preference Availability Note");
const SECOND_PREF_AVAILABILITY_SET_AT_COLUMN = HEADS_APPLICATION_HEADERS.indexOf(
  "Second Preference Availability Set At"
);

const HEADS_SCORE_SHEET_NAME = Deno.env.get("HEADS_SCORE_SHEET_NAME") ?? "Interview Scores Heads";
const HEADS_SCORE_HEADERS = [
  "Score ID",
  "Applicant Email",
  "Applicant Name",
  "Committee",
  "Head Role",
  "Preference",
  "Interviewer Email",
  "Interviewer Name",
  "Interviewer Position",
  "Criterion Scores",
  "Total Score",
  "Notes",
  "Task Link",
  "Updated At"
];

const HEADS_ASSIGNMENT_SHEET_NAME = Deno.env.get("HEADS_ASSIGNMENT_SHEET_NAME") ?? "Interview Assignments";
/*
 * Who wants whom. One row per (applicant, committee), so two committees can
 * both want the same person at once — which the Accepted* columns on the
 * application row cannot express, being a single placement.
 *
 * Those columns stay the resolved outcome: they are written only when the
 * admin approves one claim, and everything downstream (the acceptance email,
 * the onboarding checklist) still reads them exactly as before. A claim is the
 * asking; Accepted* is the answer.
 *
 * Status is Draft while the committee is still building, Submitted once handed
 * to the admin, then Approved on the one that won and Declined on its rivals.
 */
const HEADS_CLAIM_SHEET_NAME = Deno.env.get("HEADS_CLAIM_SHEET_NAME") ?? "Heads Claims";
const HEADS_CLAIM_HEADERS = [
  "Applicant Email",
  "Applicant Name",
  "Committee",
  "Head Role",
  "Head ID",
  "Position",
  "Status",
  "Claimed By",
  "Claimed At",
  "Submitted By",
  "Submitted At"
];

type HeadsClaim = {
  applicantEmail: string;
  applicantName: string;
  committee: string;
  headRole: string;
  headId: string;
  position: string;
  status: string;
  claimedBy: string;
  claimedAt: string;
  submittedBy: string;
  submittedAt: string;
  rowIndex: number;
};

/*
 * Ranked backups per role. When a committee places someone who put them
 * second, that applicant may still go to their first-preference committee, so
 * the role needs a next-in-line recorded at the moment the decision is made —
 * not reconstructed weeks later. Order is the Rank column, lowest first.
 */
const HEADS_WAITLIST_SHEET_NAME = Deno.env.get("HEADS_WAITLIST_SHEET_NAME") ?? "Heads Waiting List";
const HEADS_WAITLIST_HEADERS = [
  "Committee",
  "Head Role",
  "Rank",
  "Applicant Email",
  "Applicant Name",
  "Added By",
  "Added At"
];

const HEADS_ASSIGNMENT_HEADERS = [
  "Assignment ID",
  "Applicant Email",
  "Committee",
  "Head Role",
  "Assignee Email",
  "Assignee Name",
  "Assigned By",
  "Assigned At",
  "Note"
];

/*
 * Who may open the heads recruitment admin view. Deliberately NOT the general
 * admin secret: other admins exist who should not see applicant answers. The
 * sheet is the working list so it can be changed without a deploy; the env var
 * only exists so the first admin can get in before the sheet has any rows.
 */
const RECRUITMENT_ADMIN_SHEET_NAME =
  Deno.env.get("RECRUITMENT_ADMIN_SHEET_NAME") ?? "Recruitment Admins";
const RECRUITMENT_ADMIN_HEADERS = ["Name", "AUC Email", "Added At", "Note"];
const BOOTSTRAP_ADMIN_EMAILS = (Deno.env.get("RECRUITMENT_ADMIN_EMAILS") ?? "")
  .split(/[,;\s]+/)
  .map((value) => normalize(value))
  .filter(Boolean);
const HEADS_SLOT_HEADERS = [
  "Slot ID",
  "Committee",
  "Date",
  "Start Time",
  "End Time",
  "Slot Label",
  "Duration Minutes",
  "Capacity",
  "Active",
  "Calendar Event ID",
  "Meet Link"
];

type CommitteeInterviewDay = { date: string; times: string[]; double?: string[] };
type CommitteeInterview = {
  committee: string;
  durationMinutes: number;
  days: CommitteeInterviewDay[];
};

const WEEKDAY_TIMES_OPERATIONS = ["11:00", "12:00", "16:00", "20:00", "21:00", "22:00"];
const BRANDING_TIMES = ["13:00", "13:35", "14:10", "14:45", "15:20", "15:55"];
/*
 * The full run of interview days. Operations' brief prints only 5-8, 11 and 14
 * August, but it interviews on the 12th and 13th as well — kept by decision,
 * with an applicant already booked on the 12th.
 */
const CORE_DAYS = [
  "2026-08-05",
  "2026-08-06",
  "2026-08-07",
  "2026-08-08",
  "2026-08-11",
  "2026-08-12",
  "2026-08-13",
  "2026-08-14"
];

/**
 * The self-service extension window: a director can add their own committee's
 * interview slots on any of these dates, at least this many a day. Kept as a
 * hard window rather than open-ended, so "add slots" cannot drift into
 * scheduling interviews for a date nobody agreed to.
 */
const HEADS_SLOT_EXTENSION_START = "2026-08-18";
const HEADS_SLOT_EXTENSION_END = "2026-08-23";
const HEADS_SLOT_EXTENSION_MIN_PER_DAY = 4;

/**
 * Every head role a committee can accept an applicant into, keyed the same
 * way as COMMITTEE_INTERVIEWS. Mirrors src/role-guide-data.mjs by hand, same
 * as every other config in this file — the function cannot import it, since
 * that file is written for the browser bundle, not this Deno runtime.
 */
const COMMITTEE_HEADS: Record<string, Array<{ id: string; name: string }>> = {
  "tech director": [
    { id: "navigator", name: "The Navigator" },
    { id: "scout", name: "The Scout" },
    { id: "builder", name: "The Builder" },
    { id: "verifier", name: "The Verifier" },
    { id: "closer", name: "The Closer" },
    { id: "firefighter", name: "The Firefighter" }
  ],
  operations: [
    { id: "inventory", name: "The Organizer" },
    { id: "logistics", name: "The Coordinator" }
  ],
  "branding media": [{ id: "production", name: "Head of Acting & Production" }],
  hr: [{ id: "engagement-inclusion", name: "Engagement & Inclusion Head" }],
  "pr fundraising": [
    { id: "sponsorship", name: "Sponsorship Head" },
    { id: "events", name: "Events Head" },
    { id: "partnerships", name: "Partnerships Head" }
  ],
  visits: [
    { id: "discovery", name: "Discovery Head" },
    { id: "execution", name: "Execution Head" },
    { id: "storytelling", name: "Storytelling Head" }
  ],
  "children day director": [
    { id: "creative", name: "Creative Logistics & Visual Identity Lead" },
    { id: "english", name: "English Sessions Lead" },
    { id: "teaching", name: "Teaching & Organizing Lead" }
  ],
  "initiatives director": [
    { id: "execution-management", name: "Execution Management Head" },
    { id: "field-execution", name: "Field Execution Head" },
    { id: "teaching-engagement", name: "Teaching & Engagement Head" }
  ]
};

/*
 * Roles the cycle stopped recruiting for. Hand-mirrored from `retiredHeads` in
 * src/role-guide-data.mjs, same as COMMITTEE_HEADS above — Deno cannot import
 * the browser bundle, so the two must be edited together.
 *
 * These are never offered to an applicant and never appear on a guide page.
 * They exist so the recruitment admin can describe the board as it actually
 * is: someone can hold a position that is no longer advertised. Only the admin
 * placement path accepts them; a committee director building their own diagram
 * still sees the current roles only.
 */
const RETIRED_COMMITTEE_HEADS: Record<string, Array<{ id: string; name: string }>> = {
  hr: [{ id: "tracking", name: "Tracking System Head" }],
  "branding media": [
    { id: "projects", name: "Head of Projects" },
    { id: "design", name: "Head of Graphic Design" },
    { id: "editing", name: "Head of Video Editing" }
  ],
  operations: [
    { id: "planning", name: "The Planner" },
    { id: "procurement", name: "The Negotiator" }
  ],
  visits: []
};

/** Every position the board can hold for a committee: current, then retired. */
function headsForHierarchy(committee: string): Array<{ id: string; name: string }> {
  const key = normalizeRole(committee);
  return [...(COMMITTEE_HEADS[key] ?? []), ...(RETIRED_COMMITTEE_HEADS[key] ?? [])];
}

const COMMITTEE_INTERVIEWS: Record<string, CommitteeInterview> = {
  "tech director": {
    committee: "Tech Director",
    durationMinutes: 60,
    days: [
      { date: "2026-08-05", times: ["10:00", "13:00", "16:00", "19:00"] },
      { date: "2026-08-06", times: ["10:00", "13:00", "16:00", "19:00"] },
      { date: "2026-08-07", times: ["11:00", "14:00", "17:00", "20:00"] },
      { date: "2026-08-08", times: ["11:00", "14:00", "17:00", "20:00"] },
      { date: "2026-08-11", times: ["16:00", "17:00", "18:00", "19:00"] },
      { date: "2026-08-12", times: ["16:00", "17:00", "18:00", "19:00"] },
      { date: "2026-08-13", times: ["16:00", "17:00", "18:00", "19:00"] },
      { date: "2026-08-14", times: ["16:00", "17:00", "18:00", "19:00"] }
    ]
  },
  operations: {
    committee: "Operations",
    durationMinutes: 30,
    days: CORE_DAYS.map((date) => ({ date, times: WEEKDAY_TIMES_OPERATIONS }))
  },
  "branding media": {
    committee: "Branding / Media",
    durationMinutes: 30,
    days: CORE_DAYS.map((date) => ({ date, times: BRANDING_TIMES }))
  },
  hr: {
    committee: "HR",
    durationMinutes: 60,
    days: [
      { date: "2026-08-05", times: ["14:00", "15:00", "16:00", "17:00"] },
      { date: "2026-08-06", times: ["11:00", "17:00", "18:00", "19:00"] },
      { date: "2026-08-07", times: ["17:00", "18:00", "19:00", "20:00"] },
      { date: "2026-08-08", times: ["11:00", "17:00", "18:00", "19:00"] },
      { date: "2026-08-11", times: ["11:00", "17:00", "18:00", "19:00"] },
      { date: "2026-08-12", times: ["14:00", "15:00", "16:00", "17:00"] },
      { date: "2026-08-13", times: ["11:00", "17:00", "18:00", "19:00"] },
      { date: "2026-08-14", times: ["17:00", "18:00", "19:00", "20:00"] }
    ]
  },
  "pr fundraising": {
    committee: "PR / Fundraising",
    durationMinutes: 60,
    days: [
      { date: "2026-08-05", times: ["09:00", "10:00", "11:00", "12:00"] },
      { date: "2026-08-06", times: ["09:00", "10:00", "11:00", "12:00"] },
      { date: "2026-08-07", times: ["09:00", "10:00", "11:00", "12:00"] },
      { date: "2026-08-08", times: ["14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"] },
      { date: "2026-08-11", times: ["19:00", "20:00", "21:00", "22:00"] },
      { date: "2026-08-12", times: ["11:00", "12:00", "15:00", "16:00", "17:00"] },
      { date: "2026-08-13", times: ["11:00", "12:00", "15:00", "16:00", "17:00"] },
      { date: "2026-08-14", times: ["11:00", "12:00", "15:00", "16:00"] }
    ]
  },
  "children day director": {
    committee: "Children Day Director",
    durationMinutes: 60,
    // Mirrors src/interview-config.mjs — 11-14 Aug repeat 6 Aug's pattern,
    // the one full regular day this committee ran, to match every other
    // committee's campaign-standard end date.
    days: [
      { date: "2026-08-05", times: ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "19:00", "22:00", "23:00"] },
      { date: "2026-08-06", times: ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"] },
      { date: "2026-08-07", times: ["15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"] },
      { date: "2026-08-08", times: ["15:00", "16:00", "17:00"] },
      { date: "2026-08-11", times: ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"] },
      { date: "2026-08-12", times: ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"] },
      { date: "2026-08-13", times: ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"] },
      { date: "2026-08-14", times: ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"] }
    ]
  },
  "initiatives director": {
    committee: "Initiatives Director",
    durationMinutes: 30,
    days: [
      "2026-08-05",
      "2026-08-06",
      "2026-08-08",
      "2026-08-11",
      "2026-08-12",
      "2026-08-13",
      "2026-08-14"
    ].map((date) => ({ date, times: ["13:00", "13:45", "14:30", "15:15"] }))
  },
  visits: {
    committee: "Visits",
    durationMinutes: 60,
    // Ezz and Amina interview together, so every slot takes one applicant.
    days: [
      { date: "2026-08-04", times: ["14:00", "15:00", "16:00", "17:00"] },
      { date: "2026-08-05", times: ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"] },
      { date: "2026-08-06", times: ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"] },
      { date: "2026-08-07", times: ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"] },
      { date: "2026-08-08", times: ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"] },
      { date: "2026-08-11", times: ["14:00", "15:00", "16:00", "17:00", "18:00", "19:00"] },
      { date: "2026-08-12", times: ["14:00", "15:00", "16:00", "17:00", "18:00", "19:00"] },
      { date: "2026-08-13", times: ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"] },
      { date: "2026-08-14", times: ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"] },
      { date: "2026-08-15", times: ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"] }
    ]
  }
};

type HeadsTask = {
  summary: string;
  detail: string;
  scenario?: string;
  /** True when the task is handed out at the interview, not prepared beforehand. */
  atInterview?: boolean;
  /** Set when the task is handed in online beforehand: the deadline, and where. */
  dueBeforeInterviewMinutes?: number;
  submissionUrl?: string;
  byRole?: Record<string, { title: string; points: string[]; file?: string }>;
};

/*
 * Only two committees ask for anything before the interview this cycle. The
 * director cycle sent every applicant a pair of task documents; that is wrong
 * here, so the email states this committee's actual requirement, or says
 * plainly that there is none.
 *
 * Mirrors the `task` blocks in src/interview-config.mjs — change both together.
 */
const HEADS_TASKS: Record<string, HeadsTask> = {
  "children day director": {
    summary: "Prepare and submit a task for the head you applied to",
    detail:
      "Your task sheet is attached to this email. It carries the most weight in the scoring, so give it real time.",
    dueBeforeInterviewMinutes: 60,
    submissionUrl: TASK_SUBMISSION_URL,
    byRole: {
      creative: {
        title: "Interactive Session Deck · ~4 slides",
        file: "children-day-creative.pdf",
        points: [
          "Design a ~4-slide interactive presentation, in PowerPoint or Canva, formatted to hold children's attention and deliver a clear educational benefit by the end — not entertainment alone.",
          "Build it around a daily-life problem these underprivileged children face, the way a module does, and end on an activity with a tangible benefit.",
          "We are looking for a creative concept, a clean and simple layout, and a finished deck rather than a half-built idea."
        ]
      },
      english: {
        title: "English Lesson Deck · ~4 slides",
        file: "children-day-english.pdf",
        points: [
          "Structure an interactive ~4-slide deck for intermediate-level students, teaching key concept vocabulary alongside an appropriate grammar lesson.",
          "Choose a real-life problem these students face and build the lesson around it.",
          "We are looking for clear sequencing, age-appropriate language, and a lesson that teaches through activity rather than a lecture."
        ]
      },
      teaching: {
        title: "Scripts, Contingency & Placement Response",
        file: "children-day-teaching.pdf",
        points: [
          "Two ~150-word parent phone scripts, one for a child with 3 negative points and one for a child who kept falling asleep.",
          "A 200-250 word contingency plan for a craft activity whose supplies cannot be delivered in time.",
          "A 200-word response to a parent demanding their child move from the Beginner to the Intermediate English track."
        ]
      }
    }
  },
  visits: {
    summary: "Prepare a 1-2 page task for the head you applied to",
    detail:
      "One to two pages. Bullet points, tables, diagrams or sketches are fine.",
    // Mirrors src/interview-config.mjs — handed in online, an hour ahead.
    dueBeforeInterviewMinutes: 60,
    submissionUrl: TASK_SUBMISSION_URL,
    scenario:
      "Resala Visits is organizing a Fixing Visit for a low-income family. The house needs wall repairs, repainting, a replacement wooden door and several electrical repairs. The visit is two weeks away with 25 volunteers, the materials are not secured yet, and all planning must be done before the visit date.",
    byRole: {
      discovery: {
        title: "Discovery Report",
        file: "visits-discovery.pdf",
        points: [
          "The additional information you would collect before approving the visit.",
          "Questions you would ask the beneficiaries.",
          "Any measurements, observations, or documentation you believe are necessary.",
          "Potential risks or challenges you identified.",
          "Your final recommendation for the rest of the leadership team."
        ]
      },
      execution: {
        title: "Execution Plan",
        file: "visits-execution.pdf",
        points: [
          "A timeline from planning until the end of the visit.",
          "The main tasks that need to be completed before the visit.",
          "How volunteers will be organized and assigned responsibilities.",
          "Possible risks during execution and how you would handle them.",
          "A brief contingency plan for unexpected situations."
        ]
      },
      impact: {
        title: "Impact Evaluation Plan",
        file: "visits-impact.pdf",
        points: [
          "The success indicators you would use to evaluate the visit.",
          "The feedback you would collect and from whom.",
          "A simple outline of the post-visit report.",
          "Recommendations you might provide for improving future visits."
        ]
      },
      storytelling: {
        title: "Content & Media Plan",
        file: "visits-storytelling.pdf",
        points: [
          "The content you would create before, during, and after the visit.",
          "The types of photos and videos you would capture.",
          "A sample social media post or campaign idea.",
          "How you would ensure that beneficiaries are represented respectfully and ethically."
        ]
      }
    }
  }
};

/**
 * The committee task and, when the committee sets a different one per head, the
 * deliverable for the head this applicant picked.
 */
function getHeadsTask(payload: ApplicationPayload): {
  task: HeadsTask | undefined;
  forHead: { title: string; points: string[]; file?: string } | undefined;
} {
  const task = HEADS_TASKS[normalizeRole(payload.roleAppliedFor)];
  if (!task) return { task: undefined, forHead: undefined };

  // roleStepTitle carries the chosen head after a middle dot.
  const headName = getHeadName(payload);
  // Match on the head key ("storytelling"), not the deliverable title — the
  // Storytelling Head's task is called "Content & Media Plan", so matching on
  // the title silently found nothing.
  const forHead = task.byRole
    ? Object.entries(task.byRole).find(([key]) => normalize(headName).includes(key))?.[1]
    : undefined;

  return { task, forHead };
}

/** The task lines for this applicant, or an empty list when none is required. */
function buildHeadsTaskLines(payload: ApplicationPayload): string[] {
  const { task, forHead } = getHeadsTask(payload);
  // Committees with no task say nothing about tasks.
  if (!task) return [];

  /*
   * The brief itself lives in the attached PDF. Repeating the scenario and
   * every bullet point here made the confirmation a wall of text that buried
   * the two things an applicant needs from it — their slot and their Meet
   * link. Where a sheet is attached this stays a pointer; only a committee
   * with no sheet to attach still spells the task out in full.
   */
  const lines: string[] = [];

  if (forHead?.file) {
    // The attachment first, in its own line, because that is the instruction —
    // the title is just what the file is called.
    lines.push(
      "YOUR TASK IS THE PDF ATTACHED TO THIS EMAIL.",
      `Open "${forHead.title}". The scenario, what to hand in, and how long it should be are all in there.`,
      ""
    );
  } else {
    lines.push(`${task.atInterview ? "At your interview" : "Before your interview"}: ${task.summary}`, "");
    if (task.scenario) lines.push(task.scenario, "");
    lines.push(task.detail, "");
    if (forHead) {
      lines.push(`${forHead.title} — ${task.atInterview ? "your task will be" : "cover"}:`, ...forHead.points.map((p) => `- ${p}`), "");
    }
  }


  if (task.submissionUrl) {
    lines.push(`Hand it in here: ${task.submissionUrl}`, taskDeadlineSentence(task), "");
  }
  return lines;
}

/**
 * The deadline in the applicant's terms. A task that is submitted rather than
 * brought needs the cut-off said plainly wherever the task itself is mentioned:
 * an applicant who misses it because nobody told them is our failure.
 */
function taskDeadlineSentence(task: HeadsTask): string {
  const minutes = task.dueBeforeInterviewMinutes ?? 0;
  const due = minutes === 60 ? "one hour" : `${minutes} minutes`;
  return `Submit at least ${due} before your interview, so the people interviewing you can read it first.`;
}

function getCommitteeInterview(roleName: string): CommitteeInterview | null {
  return COMMITTEE_INTERVIEWS[normalizeRole(roleName)] ?? null;
}

function toDisplayTime(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Every heads-cycle slot, in sheet-row form. Mirrors buildCommitteeSlots(). */
function buildHeadsSlotRows(): Array<Array<string | number | boolean>> {
  const rows: Array<Array<string | number | boolean>> = [];

  for (const [key, config] of Object.entries(COMMITTEE_INTERVIEWS)) {
    for (const day of config.days) {
      const entries = [
        ...(day.times ?? []).map((t) => [t, 1] as const),
        ...(day.double ?? []).map((t) => [t, 2] as const)
      ].sort((a, b) => a[0].localeCompare(b[0]));

      for (const [time, capacity] of entries) {
        const endTime = addMinutesToTime(toDisplayTime(time), config.durationMinutes);
        const slug = key.replace(/\s+/g, "-");
        rows.push([
          `${slug}-${day.date}-${time.replace(":", "")}`,
          config.committee,
          day.date,
          toDisplayTime(time),
          endTime,
          `${day.date} at ${toDisplayTime(time)}`,
          config.durationMinutes,
          capacity,
          "TRUE",
          "",
          ""
        ]);
      }
    }
  }

  return rows;
}

const SLOT_HEADERS = [
  "Slot ID",
  "Date",
  "Start Time",
  "End Time",
  "Slot Label",
  "Capacity",
  "Active",
  "Calendar Event ID",
  "Meet Link"
];
const RESERVATION_HEADERS = [
  "Timestamp",
  "Slot ID",
  "Slot Label",
  "Full Name",
  "AUC Email",
  "Student ID",
  "Calendar Event ID",
  "Meet Link",
  "Interview Status",
  "Reminder Send At",
  "Reminder Sent At",
  "Reminder Status",
  "Role Applied For",
  "Second Preference"
];
const RECRUITMENT_START_DATE = "2026-06-22";
const RECRUITMENT_END_DATE = "2026-07-15";
const DAILY_SLOT_TIMES = [
  { code: "1201", startTime: "12:01 PM" },
  { code: "1400", startTime: "2:00 PM" },
  { code: "1500", startTime: "3:00 PM" },
  { code: "1900", startTime: "7:00 PM" },
  { code: "2000", startTime: "8:00 PM" },
  { code: "2200", startTime: "10:00 PM" }
];
const SAME_DAY_SLOT_CUTOFF_HOUR = 11;
const REMOVED_OVERLAPPING_DEFAULT_SLOT_CODES = new Set(["1530", "1930", "2030"]);

const HIERARCHY_SHEET_NAME = "Board Hierarchy";
/*
 * HR runs this recruitment, so its Director and Vice-Director are copied on
 * every mail an applicant receives — that is how they see the cycle moving
 * without asking each committee. Read from the hierarchy rather than named
 * here, so it follows whoever holds the role.
 */
const MONITOR_COMMITTEE = Deno.env.get("MONITOR_COMMITTEE") ?? "HR";
const HIERARCHY_HEADERS = ["Timestamp", "Department", "Position Type", "Name", "AUC Email", "Phone"];

const BOARD_ONBOARDING_SHEET_NAME = "Board Onboarding";
const BOARD_ONBOARDING_HEADERS = [
  "Timestamp",
  "Full Name",
  "AUC Email",
  "Department",
  "Position Type",
  "WhatsApp Joined",
  "Video Watched",
  "Retreat Days",
  "Slot ID",
  "Slot Label",
  "Calendar Event ID",
  "Meet Link"
];
const BOARD_ONBOARDING_DATE = "2026-07-19";
const BOARD_ONBOARDING_SLOT_START_HOUR = 12;
const BOARD_ONBOARDING_SLOT_END_HOUR = 22;
const BOARD_RETREAT_DAYS = ["2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30"];

const HEADS_ONBOARDING_MEETING_DATE = "2026-07-22";
const HEADS_ONBOARDING_MEETING_START = "3:00 PM";
const HEADS_ONBOARDING_MEETING_END = "4:00 PM";

type BoardOnboardingSlot = {
  id: string;
  label: string;
  date: string;
  startTime: string;
  endTime: string;
  startDateTime: string;
  endDateTime: string;
};

function buildBoardOnboardingSlots(): BoardOnboardingSlot[] {
  const slots: BoardOnboardingSlot[] = [];
  for (let hour = BOARD_ONBOARDING_SLOT_START_HOUR; hour < BOARD_ONBOARDING_SLOT_END_HOUR; hour++) {
    const endHour = hour + 1;
    const startDisplay = `${hour % 12 || 12}:00 ${hour >= 12 ? "PM" : "AM"}`;
    const endDisplay = `${endHour % 12 || 12}:00 ${endHour >= 12 ? "PM" : "AM"}`;
    slots.push({
      id: `board-${BOARD_ONBOARDING_DATE}-${String(hour).padStart(2, "0")}00`,
      label: `${startDisplay} - ${endDisplay}`,
      date: BOARD_ONBOARDING_DATE,
      startTime: startDisplay,
      endTime: endDisplay,
      startDateTime: `${BOARD_ONBOARDING_DATE}T${String(hour).padStart(2, "0")}:00:00`,
      endDateTime: `${BOARD_ONBOARDING_DATE}T${String(endHour).padStart(2, "0")}:00:00`
    });
  }
  return slots;
}

const BOARD_ONBOARDING_SLOTS = buildBoardOnboardingSlots();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-reset-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400"
};

type ApplicationPayload = {
  timestamp: string;
  fullName: string;
  aucEmail: string;
  studentId: string;
  major: string;
  yearLevel: string;
  phone: string;
  roleAppliedFor: string;
  roleStepTitle: string;
  roleDescription: string;
  secondPreference: string;
  committeeId?: string;
  roleId?: string;
  secondCommitteeId?: string;
  secondRoleId?: string;
  /** Every question this applicant was actually asked, in order. */
  answers?: Array<{ id: string; prompt: string; answer: string }>;
  whyThisRole: string;
  whyChooseYourself: string;
  hopeToLearn?: string;
  previousResalaExperience?: string;
  interviewSlot?: string;
  interviewSlotId?: string;
  interviewSlotLabel?: string;
  createdAt: string;
};

type AdminResetPayload = {
  mode: "admin-reset-test";
  aucEmail: string;
  studentId?: string;
};

type AdminAddTestSlotPayload = {
  mode: "admin-add-test-slot";
  date: string;
  startTime: string;
  endTime?: string;
  label?: string;
};

type AdminLoadPayload = {
  mode: "admin-load";
};

/**
 * An applicant handing in the task their committee asks for before the
 * interview. Open to applicants, not admins: the only key is the AUC email they
 * applied with, and it can only ever write to that applicant's own row.
 */
type HeadsTaskSubmissionPayload = {
  mode: "heads-task-submission";
  aucEmail: string;
  taskLink: string;
};

type AdminReschedulePayload = {
  mode: "admin-reschedule";
  reservationRowIndex: number;
  date: string;      // YYYY-MM-DD
  startTime: string; // HH:MM 24h
  endTime?: string;  // HH:MM 24h, optional; defaults to the configured slot duration.
};

type AdminUpdateInterviewStatusPayload = {
  mode: "admin-update-interview-status";
  reservationRowIndex: number;
  interviewStatus: string;
};

type AdminExtendInterviewDurationsPayload = {
  mode: "admin-extend-interview-durations";
};

type AdminLoadApplicantsPayload = {
  mode: "admin-load-applicants";
};

type AdminUpdateScorePayload = {
  mode: "admin-update-score";
  aucEmail: string;
  notesUrl: string;
  firstPreferenceScore: string;
  secondPreferenceScore: string;
  recommendedRole?: string;
  visionMotivationScore?: string;
  leadershipScore?: string;
  ownershipScore?: string;
  selfAwarenessCommitmentScore?: string;
  roleSpecificModulesScore?: string;
  finalJudgmentScore?: string;
  totalScore?: string;
  bestStrength1?: string;
  bestStrength2?: string;
};

type AdminUpdateTaskScorePayload = {
  mode: "admin-update-task-score";
  aucEmail: string;
  task1UnderstandingScore?: string;
  task1ExecutionScore?: string;
  task1PracticalityScore?: string;
  task1InitiativeScore?: string;
  task1ClarityScore?: string;
  task1TotalScore?: string;
  task2UnderstandingScore?: string;
  task2ExecutionScore?: string;
  task2PracticalityScore?: string;
  task2InitiativeScore?: string;
  task2ClarityScore?: string;
  task2TotalScore?: string;
  task1Notes?: string;
  task2Notes?: string;
};

type AdminScheduleInterviewPayload = {
  mode: "admin-schedule-interview";
  aucEmail: string;
  date: string;      // YYYY-MM-DD
  startTime: string; // HH:MM 24h
  endTime?: string;
};

type AdminLoadBoardOnboardingPayload = {
  mode: "admin-load-board-onboarding";
};

type AdminSendBoardEmailPayload = {
  mode: "admin-send-board-email";
  to: string;
  cc?: string;
  subject: string;
  html: string;
  text: string;
};

type AdminResetBoardOnboardingPayload = {
  mode: "admin-reset-board-onboarding";
  aucEmail: string;
};

type AdminLoadHierarchyPayload = {
  mode: "admin-load-hierarchy";
};

type HierarchyEntry = {
  department: string;
  positionType: string;
  name: string;
  aucEmail?: string;
  phone?: string;
};

type AdminSaveHierarchyPayload = {
  mode: "admin-save-hierarchy";
  entries: HierarchyEntry[];
};

type DirectorLoadApplicantsPayload = {
  mode: "director-load-applicants";
  email: string;
};

type HeadsCommitteeLoadPayload = {
  mode: "heads-committee-load";
  email: string;
};

type HeadsSaveScorePayload = {
  mode: "heads-save-score";
  email: string;
  applicantEmail: string;
  committee: string;
  headRole?: string;
  preference?: string;
  scores?: Record<string, number>;
  total?: number;
  notes?: string;
  taskLink?: string;
};

type HeadsMigrateLegacyPayload = {
  mode: "heads-migrate-legacy";
  email: string;
  /** Report what would move without writing anything. Defaults to true. */
  dryRun?: boolean;
  /*
   * The legacy tab kept answers but not the prompts that produced them, so a
   * migrated row would otherwise be labelled with the old generic column names.
   * The caller supplies the committee's real questions, in field order, and
   * they are written in place of those placeholders.
   */
  prompts?: Record<string, string[]>;
  /** Relabel rows already migrated, rather than skipping them. */
  relabel?: boolean;
};

type HeadsReschedulePayload = {
  mode: "heads-reschedule";
  email: string;
  reservationRowIndex: number;
  date: string;
  startTime: string;
  endTime?: string;
};

type HeadsSetInterviewStatusPayload = {
  mode: "heads-set-interview-status";
  email: string;
  applicantEmail: string;
  committee: string;
  interviewStatus: string;
};

type HeadsCommitteeReschedulePayload = {
  mode: "heads-committee-reschedule";
  email: string;
  applicantEmail: string;
  committee: string;
  date: string;
  startTime: string;
  endTime?: string;
};

/**
 * An applicant who asks to withdraw from their interview. Either the committee
 * running it or a recruitment admin can act on the request, so the caller is
 * authorized both ways.
 */
type HeadsCancelInterviewPayload = {
  mode: "heads-cancel-interview";
  email: string;
  applicantEmail: string;
  committee: string;
  /** Shown to nobody but the sheet: why the interview was called off. */
  reason?: string;
};

/**
 * The second-preference committee saying whether it can staff the interview
 * the applicant already has booked (with their first-preference committee) —
 * not a booking of its own, since second preference never gets one.
 */
type HeadsConfirmSecondAvailabilityPayload = {
  mode: "heads-confirm-second-availability";
  email: string;
  applicantEmail: string;
  committee: string;
  available: boolean;
  note?: string;
};

type HeadsAdminLoadPayload = {
  mode: "heads-admin-load";
  email: string;
};

type HeadsRepairSlotLinksPayload = {
  mode: "heads-repair-slot-links";
  email: string;
};

type HeadsAssignInterviewerPayload = {
  mode: "heads-assign-interviewer";
  email: string;
  applicantEmail: string;
  committee: string;
  headRole?: string;
  assigneeEmail: string;
  note?: string;
};

/**
 * Exchange what an applicant put first and second. Recruitment admin only —
 * same authority as assigning a third interviewer, for the same reason: it
 * changes how a committee sees an applicant, not just a note on their row.
 *
 * Deliberately narrow: it swaps the two committees/heads they already named,
 * nothing else. It never touches a booking — if one exists, it keeps running
 * under whichever committee it was actually scheduled with, and moving it is
 * what the reschedule feature is for.
 */
type HeadsSwapPreferencesPayload = {
  mode: "heads-swap-preferences";
  email: string;
  applicantEmail: string;
  /*
   * Both optional, both required together: a new time for an interview this
   * applicant already has booked, now that it may belong to a different
   * committee than the one that first booked it. Omit both to swap without
   * touching any booking, same as before.
   */
  date?: string;
  startTime?: string;
};

/**
 * A director opening up more interview time for their own committee — self
 * service, no code change or deploy needed. `committee` is never trusted
 * from the client: it is always the caller's own department, resolved via
 * requireCommitteeAccess, so a director can only ever add slots for the
 * committee they actually run.
 */
type HeadsAddSlotsPayload = {
  mode: "heads-add-slots";
  email: string;
  date: string;
  times: string[];
};

/** Reading back a committee's own slots for one date — existing ones to review, before adding more. */
/** `date` omitted returns every one of the caller's own committee's slots, across all days. */
type HeadsListSlotsPayload = {
  mode: "heads-list-slots";
  email: string;
  date?: string;
};

/**
 * Deactivating one of the committee's own slots — never a hard delete, the
 * same "Active" flag the sheet already uses for a slot turned off by hand.
 * Blocked outright if anyone already booked it: removing a slot out from
 * under a booked applicant is not something a director should be able to
 * do by accident from a list.
 */
type HeadsRemoveSlotPayload = {
  mode: "heads-remove-slot";
  email: string;
  slotId: string;
};

/**
 * The recruitment admin's view across every committee's slots at once — the
 * coverage check "does every committee actually have at least
 * HEADS_SLOT_EXTENSION_MIN_PER_DAY a day". Raw rows; the admin portal
 * aggregates into committee-by-date counts itself, the same way it already
 * aggregates applicants into Team diagrams and Onboarding.
 */
type HeadsAdminListSlotsPayload = {
  mode: "heads-admin-list-slots";
  email: string;
};

/**
 * A director placing an applicant onto the committee's team diagram — which
 * head-role team, and whether they join it as its Head or as a Member. Open
 * to whoever can already score this applicant, not only the first-preference
 * committee: this is an evaluation decision, not control over a booking, the
 * same distinction that already separates scoring from reschedule/cancel.
 *
 * This only drafts the placement — no email yet. The diagram can be built up
 * and corrected freely; nobody is contacted until the committee submits it
 * with HeadsSubmitTeamPayload below, and even then not until the recruitment
 * admin approves it with HeadsAdminConfirmTeamPayload.
 */
type HeadsAssignApplicantPayload = {
  mode: "heads-assign-applicant";
  email: string;
  applicantEmail: string;
  committee: string;
  headId: string;
  position: "Head" | "Co-Head" | "Member";
};

/**
 * The ordered backup list for one role, rewritten wholesale. Mainly there for
 * a role filled by someone who put this committee second: they may still be
 * claimed by their first preference, and the committee should record who takes
 * the seat instead while they still remember.
 */
type HeadsSetWaitlistPayload = {
  mode: "heads-set-waitlist";
  email: string;
  committee: string;
  headId: string;
  applicantEmails: string[];
};

/** Pulls an applicant back off the diagram before the committee has confirmed it. */
type HeadsUnassignApplicantPayload = {
  mode: "heads-unassign-applicant";
  email: string;
  applicantEmail: string;
  committee: string;
};

/**
 * The committee reviewing its finished diagram and handing it off: every
 * applicant currently drafted onto one of this committee's roles (and
 * eligible — first preference, or released) flips from Draft to Submitted.
 * Nothing is emailed here — this only queues the roster for the recruitment
 * admin, who is the one who actually sends it with
 * HeadsAdminConfirmTeamPayload below. Restricted to the committee itself, not
 * a second-preference committee or an assigned interviewer.
 */
type HeadsSubmitTeamPayload = {
  mode: "heads-submit-team";
  email: string;
  committee: string;
};

/**
 * The recruitment admin approving one committee's submitted roster: every
 * applicant currently Submitted for that committee gets the welcome email at
 * once and flips to Yes. This is the only mode that actually sends the
 * acceptance email — a committee's own submit never does.
 */
type HeadsAdminConfirmTeamPayload = {
  mode: "heads-admin-confirm-team";
  email: string;
  committee: string;
  /** Send only these Submitted applicants (by email) instead of the whole committee. Omit or empty to send everyone Submitted, as before. */
  applicantEmails?: string[];
};

/**
 * The recruitment admin sending one Submitted placement back to Draft —
 * the committee sees it reset right on their own diagram and can revise it
 * before submitting again. Nothing is emailed either way. Only a Submitted
 * row can be rejected — a Yes has already gone out and cannot be undone
 * from here.
 */
type HeadsAdminRejectApplicantPayload = {
  mode: "heads-admin-reject-applicant";
  email: string;
  applicantEmail: string;
  committee: string;
};

/**
 * The recruitment admin placing someone into a role themselves, without
 * waiting for that committee to build and submit a diagram. Lands straight on
 * Submitted rather than Draft: the admin is the one who sends, so there is
 * nobody left to hand it to, and it should be immediately selectable in the
 * send list. Unlike the committee's own placement this ignores the
 * first-preference claim — the admin sees every committee at once and is the
 * tiebreaker that rule exists to avoid needing.
 */
type HeadsAdminAssignApplicantPayload = {
  mode: "heads-admin-assign-applicant";
  email: string;
  applicantEmail: string;
  committee: string;
  headId: string;
  position: "Head" | "Co-Head" | "Member";
};

/** The recruitment admin pulling a placement back off, before it is emailed. */
/** The admin awarding a contested applicant to one committee over the others. */
type HeadsAdminPreviewAcceptancePayload = {
  mode: "heads-admin-preview-acceptance";
  email: string;
  committee: string;
  applicantEmails?: string[];
};

type HeadsAdminApproveClaimPayload = {
  mode: "heads-admin-approve-claim";
  email: string;
  applicantEmail: string;
  committee: string;
};

type HeadsAdminUnassignApplicantPayload = {
  mode: "heads-admin-unassign-applicant";
  email: string;
  applicantEmail: string;
};

/**
 * The onboarding checklist page reading its own status back, by email —
 * public, since the applicant is never asked to log in for this, the same
 * way the task-submission page works. Only ever returns something for a row
 * that has actually reached Accepted "Yes".
 */
type HeadsOnboardingStatusPayload = {
  mode: "heads-onboarding-status";
  applicantEmail: string;
};

/**
 * The applicant's own checklist submission: confirming they're taking the
 * role, and/or their notes on the leadership-vs-management video. Either can
 * arrive alone — the page saves whichever step was just completed — so both
 * are optional and only what is present gets written.
 */
type HeadsOnboardingSubmitPayload = {
  mode: "heads-onboarding-submit";
  applicantEmail: string;
  roleConfirmed?: boolean;
  videoNotes?: string;
};

/**
 * Only the applicant's actual first-preference committee can call this — the
 * same authority as requireFirstPreferenceCommittee. Releasing says "we do
 * not want this applicant," which is what lets a second-preference or
 * assigned committee's draft become confirmable. `release: false` undoes it.
 */
type HeadsReleaseFirstPreferencePayload = {
  mode: "heads-release-first-preference";
  email: string;
  applicantEmail: string;
  release: boolean;
};

type AdminCreateHeadsMeetingPayload = {
  mode: "admin-create-heads-meeting";
};

type AdminShareCalendarPayload = {
  mode: "admin-share-calendar";
  emails: string[];
  role?: "reader" | "writer" | "freeBusyReader";
};

type BoardOnboardingSlotsPayload = {
  mode: "board-onboarding-slots";
};

type BoardOnboardingStatusPayload = {
  mode: "board-onboarding-status";
  aucEmail: string;
};

type BoardOnboardingSubmitPayload = {
  mode: "board-onboarding-submit";
  aucEmail: string;
  fullName: string;
  department: string;
  positionType: string;
  whatsappJoined?: boolean;
  videoWatched?: boolean;
  retreatDays?: string[];
  slotId: string;
  partnerName?: string;
  partnerEmail?: string;
};

type SubmissionPayload =
  | ApplicationPayload
  | AdminResetPayload
  | AdminAddTestSlotPayload
  | AdminLoadPayload
  | AdminReschedulePayload
  | AdminUpdateInterviewStatusPayload
  | AdminExtendInterviewDurationsPayload
  | AdminLoadApplicantsPayload
  | AdminUpdateScorePayload
  | AdminUpdateTaskScorePayload
  | AdminScheduleInterviewPayload
  | AdminLoadBoardOnboardingPayload
  | AdminSendBoardEmailPayload
  | AdminResetBoardOnboardingPayload
  | AdminLoadHierarchyPayload
  | AdminSaveHierarchyPayload
  | DirectorLoadApplicantsPayload
  | HeadsCommitteeLoadPayload
  | HeadsTaskSubmissionPayload
  | HeadsSaveScorePayload
  | HeadsAdminLoadPayload
  | HeadsRepairSlotLinksPayload
  | HeadsMigrateLegacyPayload
  | HeadsReschedulePayload
  | HeadsSetInterviewStatusPayload
  | HeadsCommitteeReschedulePayload
  | HeadsCancelInterviewPayload
  | HeadsConfirmSecondAvailabilityPayload
  | HeadsAssignInterviewerPayload
  | HeadsSwapPreferencesPayload
  | HeadsAddSlotsPayload
  | HeadsListSlotsPayload
  | HeadsRemoveSlotPayload
  | HeadsAdminListSlotsPayload
  | HeadsAssignApplicantPayload
  | HeadsUnassignApplicantPayload
  | HeadsSubmitTeamPayload
  | HeadsAdminConfirmTeamPayload
  | HeadsAdminRejectApplicantPayload
  | HeadsSetWaitlistPayload
  | HeadsAdminAssignApplicantPayload
  | HeadsAdminUnassignApplicantPayload
  | HeadsAdminApproveClaimPayload
  | HeadsAdminPreviewAcceptancePayload
  | HeadsOnboardingStatusPayload
  | HeadsOnboardingSubmitPayload
  | HeadsReleaseFirstPreferencePayload
  | AdminCreateHeadsMeetingPayload
  | AdminShareCalendarPayload
  | BoardOnboardingSlotsPayload
  | BoardOnboardingStatusPayload
  | BoardOnboardingSubmitPayload;

type ConfirmationEmailTemplate = {
  subject: string;
  body: string;
  html: string;
};

type RoleGuideLink = {
  preferenceLabel: string;
  roleName: string;
  url: string;
};

type EmailAttachment = {
  filename: string;
  contentType: string;
  contentBytes: Uint8Array;
};

type InterviewSlotOption = {
  id: string;
  label: string;
  date: string;
  startTime: string;
  endTime: string;
  startDateTime: string;
  endDateTime: string;
  capacity: number;
  active: boolean;
  reservedCount: number;
  remaining: number;
  full: boolean;
  /** Starts too soon to be booked — inside the lead time, or already gone. */
  tooSoon?: boolean;
  calendarEventId?: string;
  meetLink?: string;
  rowIndex?: number;
  /* Which sheet `rowIndex` points into. The two slot sheets have different
     columns, so writing to the wrong one silently corrupts a row. */
  sheet?: "heads" | "director";
};

type ReservationDetails = {
  slot: InterviewSlotOption;
  calendarEventId: string;
  meetLink: string;
};

let resolvedSheetName: string | null = null;
let resolvedSheetTitles: Set<string> | null = null;

/*
 * Sheets allows 60 reads per minute per project. Two things used to blow
 * straight through that:
 *
 *   - ensureSheetHeaders re-read row 1 on every single call, from thirteen
 *     call sites, even though headers cannot change while an instance is warm.
 *   - buildApplicantCc resolves the committee panel and the HR monitors from
 *     the Board Hierarchy sheet, and it runs once per applicant. Each call was
 *     two loadHierarchy round trips, and each of those was a header check plus
 *     a data read — four reads per person emailed, for a cc list that is
 *     identical for everyone in the same committee. Fifteen acceptances hit
 *     the ceiling on their own.
 *
 * Both are now cached per warm instance. Headers are checked once per tab; the
 * hierarchy is held briefly and dropped whenever it is written, so an edit made
 * in the admin dashboard is still visible immediately.
 */
const verifiedSheetHeaders = new Set<string>();
const HIERARCHY_CACHE_MS = 30_000;
let hierarchyCache: { at: number; entries: HierarchyEntry[] } | null = null;

/** Called by anything that writes the Board Hierarchy, so the next read is fresh. */
function invalidateHierarchyCache(): void {
  hierarchyCache = null;
}

const ROLE_GUIDE_SLUGS: Record<string, string> = {
  treasurer: "treasurer",
  "tech director": "tech-director",
  operations: "operations",
  "branding media": "branding-media",
  hr: "hr",
  "pr fundraising": "pr-fundraising",
  pr: "pr-fundraising",
  fundraising: "pr-fundraising",
  visits: "visits",
  "children day director": "children-day-director",
  "initiatives director": "initiatives-director"
};

/**
 * Cosmetic committee renames, mirroring src/committee-display.mjs. The stored
 * `roleAppliedFor` still carries the raw name because every lookup here keys off
 * it verbatim, so the rename happens at the moment of display instead.
 */
const COMMITTEE_DISPLAY_NAMES: Record<string, string> = {
  "tech director": "Tech Team",
  "initiatives director": "Initiatives",
  "children day director": "Children’s Day"
};

function displayCommitteeName(name: unknown): string {
  const raw = String(name ?? "").trim();
  return COMMITTEE_DISPLAY_NAMES[normalizeRole(raw)] ?? raw;
}

/*
 * "Which committee" comparisons in the acceptance lifecycle mix two
 * representations that don't match each other: function parameters — always
 * the raw internal name ("Tech Director"), since that's what the frontend
 * reads off the diagram — against the Accepted Committee column, the Claims
 * sheet's Committee column, and the Waiting List sheet's Committee column,
 * all of which are always written through displayCommitteeName ("Tech
 * Team"). For a committee with no rename the two strings are identical and
 * normalizeRole(committee) alone happens to work; for Tech, Initiatives and
 * Children's Day they never match, so every comparison written that way
 * silently found nothing for those three. Passing both sides through this
 * first collapses them to the same key regardless of which form either side
 * happens to be in — displayCommitteeName is idempotent on an already-display
 * name, so wrapping a value that's already correct costs nothing.
 */
function committeeKey(value: unknown): string {
  return normalizeRole(displayCommitteeName(value));
}

/**
 * The head this applicant chose. roleStepTitle is `${stepTitle} · ${head}`, so
 * without the separator there is no head to read — returning the step title
 * would label them with the committee's motto.
 */
function getHeadName(payload: { roleStepTitle?: string }): string {
  const title = String(payload.roleStepTitle ?? "");
  if (!title.includes("·")) return "";
  return title.split("·").pop()?.trim() ?? "";
}

/**
 * What the applicant actually applied for, as they should read it: the
 * committee under its display name, then the head. Never bare "… Director" —
 * nobody in this cycle is applying to be a Director.
 */
function firstPreferenceLabel(payload: ApplicationPayload): string {
  const committee = displayCommitteeName(payload.roleAppliedFor);
  const head = getHeadName(payload);
  return head ? `${committee} — ${head}` : committee;
}

/** Same treatment for the second preference, which arrives pre-joined. */
function secondPreferenceLabel(payload: ApplicationPayload): string {
  const raw = String(payload.secondPreference ?? "").trim();
  const [committee, ...rest] = raw.split("—");
  const head = rest.join("—").trim();
  const named = displayCommitteeName(committee);
  return head ? `${named} — ${head}` : named;
}

/**
 * "Second Preference Committee" is stored pre-joined as "Committee — Head" (see
 * `secondPreferenceLabel` above) — the applicant chooses both in one step and
 * only the combined string comes back from the form. Everywhere that needs to
 * match the committee alone against a department, or hand the head name to a
 * rubric, has to split it back apart first.
 */
function splitSecondPreference(value: unknown): { committee: string; head: string } {
  const raw = String(value ?? "").trim();
  const [committee, ...rest] = raw.split("—");
  return { committee: committee.trim(), head: rest.join("—").trim() };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method === "GET") {
    try {
      if (!SHEET_ID) {
        throw new Error("SHEET_ID is not configured.");
      }

      const token = await getGoogleAccessToken();
      const url = new URL(request.url);

      /*
       * Public contact lookup: the Director and Vice-Director(s) an applicant
       * should reach about a committee. Deliberately narrow — name, position and
       * AUC email only, never phone numbers, and only for director-level rows.
       */
      const contactsFor = url.searchParams.get("contacts");
      if (contactsFor) {
        const panel = await getCommitteePanel(token, contactsFor);
        return jsonResponse({ ok: true, contacts: panel });
      }

      const committee = url.searchParams.get("committee");
      // A committee query means the heads cycle; without one, fall back to the
      // original pool so nothing that already depends on this endpoint breaks.
      const allSlots = committee
        ? await getHeadsInterviewSlots(token, committee)
        : await getInterviewSlots(token);
      /*
       * A time that has passed, or that starts sooner than the lead time, is
       * not a choice — showing it struck through only invites the question of
       * why it cannot be picked. Full slots stay: those are real times that
       * someone else took, which is worth seeing.
       */
      const slots = allSlots.filter((slot) => !slot.tooSoon);
      return jsonResponse({ ok: true, slots, leadMinutes: INTERVIEW_BOOKING_LEAD_MINUTES });
    } catch (error) {
      return jsonResponse(
        {
          ok: false,
          error: error instanceof Error ? error.message : "Could not load interview slots."
        },
        400
      );
    }
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
  }

  try {
    const payload = await parsePayload(request);

    if (isAdminResetPayload(payload)) {
      authorizeAdminReset(request);

      if (!SHEET_ID) {
        throw new Error("SHEET_ID is not configured.");
      }

      const token = await getGoogleAccessToken();
      const sheetName = await getSheetName(token);
      const result = await resetTestApplicant(token, payload, sheetName);

      return jsonResponse({ ok: true, ...result });
    }

    if (isAdminAddTestSlotPayload(payload)) {
      authorizeAdminReset(request);

      if (!SHEET_ID) {
        throw new Error("SHEET_ID is not configured.");
      }

      const token = await getGoogleAccessToken();
      const result = await addTestInterviewSlot(token, payload);

      return jsonResponse({ ok: true, ...result });
    }

    if (isAdminLoadPayload(payload)) {
      authorizeAdminReset(request);

      if (!SHEET_ID) {
        throw new Error("SHEET_ID is not configured.");
      }

      const token = await getGoogleAccessToken();
      const result = await loadAdminDashboard(token);

      return jsonResponse({ ok: true, ...result });
    }

    if (isAdminReschedulePayload(payload)) {
      authorizeAdminReset(request);

      if (!SHEET_ID) {
        throw new Error("SHEET_ID is not configured.");
      }

      const token = await getGoogleAccessToken();
      const result = await rescheduleInterview(token, payload);

      return jsonResponse({ ok: true, ...result });
    }

    if (isAdminUpdateInterviewStatusPayload(payload)) {
      authorizeAdminReset(request);

      if (!SHEET_ID) {
        throw new Error("SHEET_ID is not configured.");
      }

      const token = await getGoogleAccessToken();
      const result = await updateReservationInterviewStatus(token, payload);

      return jsonResponse({ ok: true, ...result });
    }

    if (isAdminExtendInterviewDurationsPayload(payload)) {
      authorizeAdminReset(request);

      if (!SHEET_ID) {
        throw new Error("SHEET_ID is not configured.");
      }

      const token = await getGoogleAccessToken();
      const result = await extendReservedInterviewDurations(token);

      return jsonResponse({ ok: true, ...result });
    }

    if (isAdminLoadApplicantsPayload(payload)) {
      authorizeAdminReset(request);

      if (!SHEET_ID) {
        throw new Error("SHEET_ID is not configured.");
      }

      const token = await getGoogleAccessToken();
      const result = await loadAdminApplicants(token);

      return jsonResponse({ ok: true, ...result });
    }

    if (isAdminUpdateScorePayload(payload)) {
      authorizeAdminReset(request);

      if (!SHEET_ID) {
        throw new Error("SHEET_ID is not configured.");
      }

      const token = await getGoogleAccessToken();
      const result = await updateApplicantScore(token, payload);

      return jsonResponse({ ok: true, ...result });
    }

    if (isAdminUpdateTaskScorePayload(payload)) {
      authorizeAdminReset(request);

      if (!SHEET_ID) {
        throw new Error("SHEET_ID is not configured.");
      }

      const token = await getGoogleAccessToken();
      const result = await updateApplicantTaskScore(token, payload);

      return jsonResponse({ ok: true, ...result });
    }

    if (isAdminScheduleInterviewPayload(payload)) {
      authorizeAdminReset(request);

      if (!SHEET_ID) {
        throw new Error("SHEET_ID is not configured.");
      }

      const token = await getGoogleAccessToken();
      const result = await scheduleInterviewForApplicant(token, payload);

      return jsonResponse({ ok: true, ...result });
    }

    if (isAdminLoadBoardOnboardingPayload(payload)) {
      authorizeAdminReset(request);

      if (!SHEET_ID) {
        throw new Error("SHEET_ID is not configured.");
      }

      const token = await getGoogleAccessToken();
      const result = await loadBoardOnboardingRecords(token);

      return jsonResponse({ ok: true, ...result });
    }

    if (isAdminSendBoardEmailPayload(payload)) {
      authorizeAdminReset(request);

      const result = await sendBoardEmail(payload);

      return jsonResponse({ ok: true, ...result });
    }

    if (isAdminResetBoardOnboardingPayload(payload)) {
      authorizeAdminReset(request);

      if (!SHEET_ID) {
        throw new Error("SHEET_ID is not configured.");
      }

      const token = await getGoogleAccessToken();
      const result = await resetBoardOnboardingApplicant(token, payload);

      return jsonResponse({ ok: true, ...result });
    }

    if (isAdminLoadHierarchyPayload(payload)) {
      authorizeAdminReset(request);

      if (!SHEET_ID) {
        throw new Error("SHEET_ID is not configured.");
      }

      const token = await getGoogleAccessToken();
      const result = await loadHierarchy(token);

      return jsonResponse({ ok: true, ...result });
    }

    if (isAdminSaveHierarchyPayload(payload)) {
      authorizeAdminReset(request);

      if (!SHEET_ID) {
        throw new Error("SHEET_ID is not configured.");
      }

      const token = await getGoogleAccessToken();
      const result = await saveHierarchy(token, payload);

      return jsonResponse({ ok: true, ...result });
    }

    if (isDirectorLoadApplicantsPayload(payload)) {
      if (!SHEET_ID) {
        throw new Error("SHEET_ID is not configured.");
      }

      const token = await getGoogleAccessToken();
      const result = await loadDirectorApplicants(token, payload.email);

      return jsonResponse({ ok: true, ...result });
    }

    if (isHeadsTaskSubmissionPayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await submitHeadsTask(token, payload)) });
    }

    if (isHeadsCommitteeLoadPayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await loadCommitteePortal(token, payload.email)) });
    }

    if (isHeadsSaveScorePayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await saveHeadsScore(token, payload)) });
    }

    if (isHeadsMigrateLegacyPayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await migrateLegacyApplications(token, payload)) });
    }

    if (isHeadsSetInterviewStatusPayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await setHeadsInterviewStatus(token, payload)) });
    }

    if (isHeadsCommitteeReschedulePayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await rescheduleAsCommittee(token, payload)) });
    }

    if (isHeadsCancelInterviewPayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await cancelHeadsInterview(token, payload)) });
    }

    if (isHeadsConfirmSecondAvailabilityPayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await confirmSecondPreferenceAvailability(token, payload)) });
    }

    if (isHeadsReschedulePayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      // Same move as the general admin dashboard, but gated on the recruitment
      // allowlist rather than the shared admin secret.
      await requireRecruitmentAdmin(token, payload.email);
      const result = await rescheduleInterview(token, {
        mode: "admin-reschedule",
        reservationRowIndex: payload.reservationRowIndex,
        date: payload.date,
        startTime: payload.startTime,
        endTime: payload.endTime
      });
      return jsonResponse({ ok: true, ...result });
    }

    if (isHeadsAdminLoadPayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await loadHeadsAdmin(token, payload.email)) });
    }

    if (isHeadsRepairSlotLinksPayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await repairHeadsSlotLinks(token, payload.email)) });
    }

    if (isHeadsAssignInterviewerPayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await assignHeadsInterviewer(token, payload)) });
    }

    if (isHeadsSwapPreferencesPayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await swapHeadsPreferences(token, payload)) });
    }

    if (isHeadsAddSlotsPayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await addHeadsSlots(token, payload)) });
    }

    if (isHeadsListSlotsPayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await listHeadsSlotsForDate(token, payload)) });
    }

    if (isHeadsRemoveSlotPayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await removeHeadsSlot(token, payload)) });
    }

    if (isHeadsAdminListSlotsPayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await listAllHeadsSlots(token, payload)) });
    }

    if (isHeadsAssignApplicantPayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await assignHeadsApplicant(token, payload)) });
    }

    if (isHeadsUnassignApplicantPayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await unassignHeadsApplicant(token, payload)) });
    }

    if (isHeadsSubmitTeamPayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await submitHeadsTeam(token, payload)) });
    }

    if (isHeadsAdminConfirmTeamPayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await sendHeadsTeamAcceptances(token, payload)) });
    }

    if (isHeadsSetWaitlistPayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await setHeadsWaitlist(token, payload)) });
    }

    if (isHeadsAdminRejectApplicantPayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await rejectHeadsSubmission(token, payload)) });
    }

    if (isHeadsAdminAssignApplicantPayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await adminAssignHeadsApplicant(token, payload)) });
    }

    if (isHeadsAdminPreviewAcceptancePayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await previewHeadsAcceptances(token, payload)) });
    }

    if (isHeadsAdminApproveClaimPayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await approveHeadsClaim(token, payload)) });
    }

    if (isHeadsAdminUnassignApplicantPayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await adminUnassignHeadsApplicant(token, payload)) });
    }

    if (isHeadsOnboardingStatusPayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await loadHeadsOnboardingStatus(token, payload.applicantEmail)) });
    }

    if (isHeadsOnboardingSubmitPayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await submitHeadsOnboarding(token, payload)) });
    }

    if (isHeadsReleaseFirstPreferencePayload(payload)) {
      if (!SHEET_ID) throw new Error("SHEET_ID is not configured.");
      const token = await getGoogleAccessToken();
      return jsonResponse({ ok: true, ...(await setFirstPreferenceRelease(token, payload)) });
    }

    if (isAdminCreateHeadsMeetingPayload(payload)) {
      authorizeAdminReset(request);

      const result = await createHeadsOnboardingMeeting();

      return jsonResponse({ ok: true, ...result });
    }

    if (isAdminShareCalendarPayload(payload)) {
      authorizeAdminReset(request);

      const result = await shareCalendarWithEmails(payload.emails, payload.role ?? "reader");

      return jsonResponse({ ok: true, ...result });
    }

    if (isBoardOnboardingSlotsPayload(payload)) {
      if (!SHEET_ID) {
        throw new Error("SHEET_ID is not configured.");
      }

      const token = await getGoogleAccessToken();
      const result = await getBoardOnboardingSlots(token);

      return jsonResponse({ ok: true, ...result });
    }

    if (isBoardOnboardingStatusPayload(payload)) {
      if (!SHEET_ID) {
        throw new Error("SHEET_ID is not configured.");
      }

      const token = await getGoogleAccessToken();
      const result = await getBoardOnboardingStatus(token, payload);

      return jsonResponse({ ok: true, ...result });
    }

    if (isBoardOnboardingSubmitPayload(payload)) {
      if (!SHEET_ID) {
        throw new Error("SHEET_ID is not configured.");
      }

      const token = await getGoogleAccessToken();
      const result = await submitBoardOnboarding(token, payload);

      return jsonResponse({ ok: true, ...result });
    }

    validateApplication(payload);

    if (!SHEET_ID) {
      throw new Error("SHEET_ID is not configured.");
    }

    const token = await getGoogleAccessToken();
    const sheetName = await getSheetName(token);
    await ensureSlotSheets(token);
    await ensureHeaders(token, sheetName);
    await ensureNotDuplicate(token, payload, sheetName);

    let reservation: ReservationDetails | null = null;
    if (payload.interviewSlotId) {
      reservation = await reserveInterviewSlot(token, payload);
      payload.interviewSlot = reservation.slot.label;
      payload.interviewSlotLabel = reservation.slot.label;
    }

    await appendApplication(token, payload, sheetName);
    /*
     * The heads tab is what the committee dashboards read. A failure to write it
     * must not lose an application that is already in the legacy tab and already
     * holds a booked slot, so it is logged rather than thrown.
     */
    try {
      await appendHeadsApplication(token, payload);
    } catch (error) {
      console.error(
        `Heads applications row failed for ${payload.aucEmail}: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      );
    }
    // Same panel the invite went to, so the email names the right people.
    const panel = await getCommitteePanel(token, payload.roleAppliedFor);
    // The panel is CC'd on that confirmation and is on the calendar invite, so
    // a separate "new applicant" email to them is a third copy of the same news.
    const emailSent = await trySendConfirmationEmail(payload, reservation, panel, token);

    return jsonResponse({ ok: true, emailSent });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Submission failed."
      },
      400
    );
  }
});

async function parsePayload(
  request: Request
): Promise<SubmissionPayload> {
  const text = await request.text();
  if (!text.trim()) {
    throw new Error("Missing submission body.");
  }

  return JSON.parse(text) as SubmissionPayload;
}

function isHeadsCommitteeLoadPayload(payload: SubmissionPayload): payload is HeadsCommitteeLoadPayload {
  return (payload as HeadsCommitteeLoadPayload).mode === "heads-committee-load";
}

function isHeadsTaskSubmissionPayload(payload: SubmissionPayload): payload is HeadsTaskSubmissionPayload {
  return (payload as HeadsTaskSubmissionPayload).mode === "heads-task-submission";
}

function isHeadsSaveScorePayload(payload: SubmissionPayload): payload is HeadsSaveScorePayload {
  return (payload as HeadsSaveScorePayload).mode === "heads-save-score";
}

function isHeadsMigrateLegacyPayload(payload: SubmissionPayload): payload is HeadsMigrateLegacyPayload {
  return (payload as HeadsMigrateLegacyPayload).mode === "heads-migrate-legacy";
}

function isHeadsSetInterviewStatusPayload(
  payload: SubmissionPayload
): payload is HeadsSetInterviewStatusPayload {
  return (payload as HeadsSetInterviewStatusPayload).mode === "heads-set-interview-status";
}

function isHeadsCommitteeReschedulePayload(
  payload: SubmissionPayload
): payload is HeadsCommitteeReschedulePayload {
  return (payload as HeadsCommitteeReschedulePayload).mode === "heads-committee-reschedule";
}

function isHeadsReschedulePayload(payload: SubmissionPayload): payload is HeadsReschedulePayload {
  return (payload as HeadsReschedulePayload).mode === "heads-reschedule";
}

function isHeadsCancelInterviewPayload(
  payload: SubmissionPayload
): payload is HeadsCancelInterviewPayload {
  return (payload as HeadsCancelInterviewPayload).mode === "heads-cancel-interview";
}

function isHeadsConfirmSecondAvailabilityPayload(
  payload: SubmissionPayload
): payload is HeadsConfirmSecondAvailabilityPayload {
  return (payload as HeadsConfirmSecondAvailabilityPayload).mode === "heads-confirm-second-availability";
}

function isHeadsAdminLoadPayload(payload: SubmissionPayload): payload is HeadsAdminLoadPayload {
  return (payload as HeadsAdminLoadPayload).mode === "heads-admin-load";
}

function isHeadsRepairSlotLinksPayload(payload: SubmissionPayload): payload is HeadsRepairSlotLinksPayload {
  return (payload as HeadsRepairSlotLinksPayload).mode === "heads-repair-slot-links";
}

function isHeadsAssignInterviewerPayload(
  payload: SubmissionPayload
): payload is HeadsAssignInterviewerPayload {
  return (payload as HeadsAssignInterviewerPayload).mode === "heads-assign-interviewer";
}

function isHeadsSwapPreferencesPayload(
  payload: SubmissionPayload
): payload is HeadsSwapPreferencesPayload {
  return (payload as HeadsSwapPreferencesPayload).mode === "heads-swap-preferences";
}

function isHeadsAddSlotsPayload(payload: SubmissionPayload): payload is HeadsAddSlotsPayload {
  return (payload as HeadsAddSlotsPayload).mode === "heads-add-slots";
}
function isHeadsListSlotsPayload(payload: SubmissionPayload): payload is HeadsListSlotsPayload {
  return (payload as HeadsListSlotsPayload).mode === "heads-list-slots";
}
function isHeadsRemoveSlotPayload(payload: SubmissionPayload): payload is HeadsRemoveSlotPayload {
  return (payload as HeadsRemoveSlotPayload).mode === "heads-remove-slot";
}
function isHeadsAdminListSlotsPayload(
  payload: SubmissionPayload
): payload is HeadsAdminListSlotsPayload {
  return (payload as HeadsAdminListSlotsPayload).mode === "heads-admin-list-slots";
}
function isHeadsAssignApplicantPayload(
  payload: SubmissionPayload
): payload is HeadsAssignApplicantPayload {
  return (payload as HeadsAssignApplicantPayload).mode === "heads-assign-applicant";
}
function isHeadsUnassignApplicantPayload(
  payload: SubmissionPayload
): payload is HeadsUnassignApplicantPayload {
  return (payload as HeadsUnassignApplicantPayload).mode === "heads-unassign-applicant";
}
function isHeadsSubmitTeamPayload(payload: SubmissionPayload): payload is HeadsSubmitTeamPayload {
  return (payload as HeadsSubmitTeamPayload).mode === "heads-submit-team";
}
function isHeadsAdminConfirmTeamPayload(
  payload: SubmissionPayload
): payload is HeadsAdminConfirmTeamPayload {
  return (payload as HeadsAdminConfirmTeamPayload).mode === "heads-admin-confirm-team";
}
function isHeadsSetWaitlistPayload(
  payload: SubmissionPayload
): payload is HeadsSetWaitlistPayload {
  return (payload as HeadsSetWaitlistPayload).mode === "heads-set-waitlist";
}

function isHeadsAdminRejectApplicantPayload(
  payload: SubmissionPayload
): payload is HeadsAdminRejectApplicantPayload {
  return (payload as HeadsAdminRejectApplicantPayload).mode === "heads-admin-reject-applicant";
}

function isHeadsAdminAssignApplicantPayload(
  payload: SubmissionPayload
): payload is HeadsAdminAssignApplicantPayload {
  return (payload as HeadsAdminAssignApplicantPayload).mode === "heads-admin-assign-applicant";
}

function isHeadsAdminPreviewAcceptancePayload(
  payload: SubmissionPayload
): payload is HeadsAdminPreviewAcceptancePayload {
  return (payload as HeadsAdminPreviewAcceptancePayload).mode === "heads-admin-preview-acceptance";
}

function isHeadsAdminApproveClaimPayload(
  payload: SubmissionPayload
): payload is HeadsAdminApproveClaimPayload {
  return (payload as HeadsAdminApproveClaimPayload).mode === "heads-admin-approve-claim";
}

function isHeadsAdminUnassignApplicantPayload(
  payload: SubmissionPayload
): payload is HeadsAdminUnassignApplicantPayload {
  return (payload as HeadsAdminUnassignApplicantPayload).mode === "heads-admin-unassign-applicant";
}
function isHeadsOnboardingStatusPayload(
  payload: SubmissionPayload
): payload is HeadsOnboardingStatusPayload {
  return (payload as HeadsOnboardingStatusPayload).mode === "heads-onboarding-status";
}
function isHeadsOnboardingSubmitPayload(
  payload: SubmissionPayload
): payload is HeadsOnboardingSubmitPayload {
  return (payload as HeadsOnboardingSubmitPayload).mode === "heads-onboarding-submit";
}
function isHeadsReleaseFirstPreferencePayload(
  payload: SubmissionPayload
): payload is HeadsReleaseFirstPreferencePayload {
  return (payload as HeadsReleaseFirstPreferencePayload).mode === "heads-release-first-preference";
}

function isAdminResetPayload(payload: SubmissionPayload): payload is AdminResetPayload {
  return (payload as AdminResetPayload).mode === "admin-reset-test";
}

function isAdminAddTestSlotPayload(payload: SubmissionPayload): payload is AdminAddTestSlotPayload {
  return (payload as AdminAddTestSlotPayload).mode === "admin-add-test-slot";
}

function isAdminLoadPayload(payload: SubmissionPayload): payload is AdminLoadPayload {
  return (payload as AdminLoadPayload).mode === "admin-load";
}

function isAdminReschedulePayload(payload: SubmissionPayload): payload is AdminReschedulePayload {
  return (payload as AdminReschedulePayload).mode === "admin-reschedule";
}

function isAdminUpdateInterviewStatusPayload(payload: SubmissionPayload): payload is AdminUpdateInterviewStatusPayload {
  return (payload as AdminUpdateInterviewStatusPayload).mode === "admin-update-interview-status";
}

function isAdminExtendInterviewDurationsPayload(payload: SubmissionPayload): payload is AdminExtendInterviewDurationsPayload {
  return (payload as AdminExtendInterviewDurationsPayload).mode === "admin-extend-interview-durations";
}

function isAdminLoadApplicantsPayload(payload: SubmissionPayload): payload is AdminLoadApplicantsPayload {
  return (payload as AdminLoadApplicantsPayload).mode === "admin-load-applicants";
}

function isAdminUpdateScorePayload(payload: SubmissionPayload): payload is AdminUpdateScorePayload {
  return (payload as AdminUpdateScorePayload).mode === "admin-update-score";
}

function isAdminUpdateTaskScorePayload(payload: SubmissionPayload): payload is AdminUpdateTaskScorePayload {
  return (payload as AdminUpdateTaskScorePayload).mode === "admin-update-task-score";
}

function isAdminScheduleInterviewPayload(payload: SubmissionPayload): payload is AdminScheduleInterviewPayload {
  return (payload as AdminScheduleInterviewPayload).mode === "admin-schedule-interview";
}

function isAdminLoadBoardOnboardingPayload(payload: SubmissionPayload): payload is AdminLoadBoardOnboardingPayload {
  return (payload as AdminLoadBoardOnboardingPayload).mode === "admin-load-board-onboarding";
}

function isAdminSendBoardEmailPayload(payload: SubmissionPayload): payload is AdminSendBoardEmailPayload {
  return (payload as AdminSendBoardEmailPayload).mode === "admin-send-board-email";
}

function isAdminResetBoardOnboardingPayload(payload: SubmissionPayload): payload is AdminResetBoardOnboardingPayload {
  return (payload as AdminResetBoardOnboardingPayload).mode === "admin-reset-board-onboarding";
}

function isAdminLoadHierarchyPayload(payload: SubmissionPayload): payload is AdminLoadHierarchyPayload {
  return (payload as AdminLoadHierarchyPayload).mode === "admin-load-hierarchy";
}

function isAdminSaveHierarchyPayload(payload: SubmissionPayload): payload is AdminSaveHierarchyPayload {
  return (payload as AdminSaveHierarchyPayload).mode === "admin-save-hierarchy";
}

function isDirectorLoadApplicantsPayload(payload: SubmissionPayload): payload is DirectorLoadApplicantsPayload {
  return (payload as DirectorLoadApplicantsPayload).mode === "director-load-applicants";
}

function isAdminCreateHeadsMeetingPayload(payload: SubmissionPayload): payload is AdminCreateHeadsMeetingPayload {
  return (payload as AdminCreateHeadsMeetingPayload).mode === "admin-create-heads-meeting";
}

function isAdminShareCalendarPayload(payload: SubmissionPayload): payload is AdminShareCalendarPayload {
  return (payload as AdminShareCalendarPayload).mode === "admin-share-calendar";
}

function isBoardOnboardingSlotsPayload(payload: SubmissionPayload): payload is BoardOnboardingSlotsPayload {
  return (payload as BoardOnboardingSlotsPayload).mode === "board-onboarding-slots";
}

function isBoardOnboardingStatusPayload(payload: SubmissionPayload): payload is BoardOnboardingStatusPayload {
  return (payload as BoardOnboardingStatusPayload).mode === "board-onboarding-status";
}

function isBoardOnboardingSubmitPayload(payload: SubmissionPayload): payload is BoardOnboardingSubmitPayload {
  return (payload as BoardOnboardingSubmitPayload).mode === "board-onboarding-submit";
}

function authorizeAdminReset(request: Request): void {
  const secret = request.headers.get("x-admin-reset-secret");
  /*
   * The secret comes only from the environment. A hardcoded fallback used to sit
   * here beside it, which meant anyone who could read the repository could reach
   * every admin endpoint; if ADMIN_RESET_SECRET is unset the correct behaviour is
   * to refuse, not to accept a value that is public.
   */
  if (!ADMIN_RESET_SECRET || secret !== ADMIN_RESET_SECRET) {
    throw new Error("Unauthorized admin reset request.");
  }
}

function isValidAucEmail(value: unknown): boolean {
  return /^[A-Za-z0-9._%+-]+@aucegypt\.edu$/i.test(String(value ?? "").trim());
}

function validateApplication(payload: ApplicationPayload): void {
  const requiredFields: Array<keyof ApplicationPayload> = [
    "timestamp",
    "fullName",
    "aucEmail",
    "studentId",
    "major",
    "yearLevel",
    "phone",
    "roleAppliedFor",
    "roleStepTitle",
    "roleDescription",
    "secondPreference",
    "whyThisRole",
    "whyChooseYourself",
    "createdAt"
  ];

  const missing = requiredFields.filter((field) => !String(payload[field] ?? "").trim());
  if (missing.length) {
    throw new Error(`Missing required fields: ${missing.join(", ")}.`);
  }

  if (!isValidAucEmail(payload.aucEmail)) {
    throw new Error("Invalid AUC email.");
  }

  if (normalizeRole(payload.secondPreference) === normalizeRole(payload.roleAppliedFor)) {
    throw new Error("Second preference must be different from the first role preference.");
  }
}

async function ensureHeaders(token: string, sheetName: string): Promise<void> {
  const headerRange = `A1:${columnLetter(HEADERS.length)}1`;
  const response = await sheetsFetch(token, "GET", `${sheetRange(sheetName, headerRange)}`);
  const currentValues = (await response.json()).values?.[0] ?? [];

  if (currentValues.length === 0) {
    await sheetsFetch(token, "PUT", `${sheetRange(sheetName, headerRange)}?valueInputOption=RAW`, {
      values: [HEADERS]
    });
    return;
  }

  const baseHeadersMatch = APPLICATION_BASE_HEADERS.every((header, index) => currentValues[index] === header);
  if (baseHeadersMatch && currentValues.length < HEADERS.length) {
    await sheetsFetch(token, "PUT", `${sheetRange(sheetName, headerRange)}?valueInputOption=RAW`, {
      values: [HEADERS]
    });
    return;
  }

  const preSecondPreferenceHeadersMatch = APPLICATION_BASE_HEADERS.slice(0, -1).every(
    (header, index) => currentValues[index] === header
  );
  if (preSecondPreferenceHeadersMatch && currentValues.length < HEADERS.length) {
    await sheetsFetch(token, "PUT", `${sheetRange(sheetName, headerRange)}?valueInputOption=RAW`, {
      values: [HEADERS]
    });
    return;
  }

  const headersMatch = HEADERS.every((header, index) => currentValues[index] === header);
  if (!headersMatch) {
    throw new Error("Applications sheet headers do not match the expected schema.");
  }
}

async function ensureNotDuplicate(token: string, payload: ApplicationPayload, sheetName: string): Promise<void> {
  const response = await sheetsFetch(token, "GET", sheetRange(sheetName, "A2:R"));
  const rows = (await response.json()).values ?? [];
  const submittedEmail = normalize(payload.aucEmail);
  const submittedStudentId = normalize(payload.studentId);

  const duplicate = rows.some((row: string[]) => {
    const email = normalize(row[2]);
    const studentId = normalize(row[3]);
    return email === submittedEmail || studentId === submittedStudentId;
  });

  if (duplicate) {
    throw new Error("An application with this AUC email or Student ID already exists.");
  }
}

/**
 * The heads-cycle row: identity, both preferences by name *and* stable id, the
 * booked slot, and each question paired with its own answer.
 */
async function appendHeadsApplication(token: string, payload: ApplicationPayload): Promise<void> {
  await ensureSheetTab(token, HEADS_APPLICATION_SHEET_NAME);
  await ensureSheetHeaders(token, HEADS_APPLICATION_SHEET_NAME, HEADS_APPLICATION_HEADERS);

  // roleStepTitle carries the chosen head after a middle dot.
  const headName = getHeadName(payload);

  /*
   * A browser running a cached bundle from before the answers array existed
   * sends only the four legacy fields. Falling back to them keeps the answers,
   * labelled generically, instead of writing an empty row that looks like the
   * applicant said nothing.
   */
  let answers = Array.isArray(payload.answers) ? payload.answers.filter((a) => a && (a.prompt || a.answer)) : [];
  if (!answers.length) {
    answers = [
      { id: "why-role", prompt: "Why this role", answer: payload.whyThisRole ?? "" },
      { id: "why-you", prompt: "Why choose yourself", answer: payload.whyChooseYourself ?? "" },
      { id: "learn", prompt: "What do you hope to learn", answer: payload.hopeToLearn ?? "" },
      { id: "experience", prompt: "Previous Resala experience", answer: payload.previousResalaExperience ?? "" }
    ].filter((entry) => String(entry.answer).trim());
    if (answers.length) {
      console.error(`${payload.aucEmail} submitted without the answers array; fell back to the legacy fields.`);
    }
  }

  const questionCells: string[] = [];
  for (let i = 0; i < HEADS_APPLICATION_QUESTION_SLOTS; i += 1) {
    const entry = answers[i];
    questionCells.push(entry ? String(entry.prompt ?? "") : "", entry ? String(entry.answer ?? "") : "");
  }

  if (answers.length > HEADS_APPLICATION_QUESTION_SLOTS) {
    // Never silently drop an answer: fold the overflow into the last pair
    // rather than losing it, and make the crowding visible in the sheet.
    const overflow = answers
      .slice(HEADS_APPLICATION_QUESTION_SLOTS)
      .map((entry) => `${entry.prompt}\n${entry.answer}`)
      .join("\n\n");
    const lastAnswer = questionCells.length - 1;
    questionCells[lastAnswer] = `${questionCells[lastAnswer]}\n\n[overflow]\n${overflow}`;
    console.error(
      `${payload.aucEmail} answered ${answers.length} questions but the sheet has ${HEADS_APPLICATION_QUESTION_SLOTS} pairs.`
    );
  }

  const row = [
    payload.timestamp,
    payload.fullName,
    payload.aucEmail,
    payload.studentId,
    payload.major,
    payload.yearLevel,
    payload.phone,
    payload.roleAppliedFor,
    payload.committeeId ?? "",
    headName,
    payload.roleId ?? "",
    payload.secondPreference,
    "",
    payload.secondCommitteeId ?? "",
    payload.secondRoleId ?? "",
    payload.interviewSlotLabel ?? payload.interviewSlot ?? "",
    payload.interviewSlotId ?? "",
    "Scheduled",
    "Submitted",
    payload.createdAt,
    ...questionCells
  ];

  await sheetsFetch(
    token,
    "POST",
    `${sheetRange(HEADS_APPLICATION_SHEET_NAME, `A:${columnLetter(HEADS_APPLICATION_HEADERS.length)}`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { values: [row] }
  );
}

async function appendApplication(token: string, payload: ApplicationPayload, sheetName: string): Promise<void> {
  await sheetsFetch(token, "POST", `${sheetRange(sheetName, `A:${columnLetter(HEADERS.length)}`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    values: [
      [
        payload.timestamp,
        payload.fullName,
        payload.aucEmail,
        payload.studentId,
        payload.major,
        payload.yearLevel,
        payload.phone,
        payload.roleAppliedFor,
        payload.roleStepTitle,
        payload.roleDescription,
        payload.whyThisRole,
        payload.whyChooseYourself,
        payload.hopeToLearn ?? "",
        payload.previousResalaExperience ?? "",
        payload.interviewSlot,
        payload.createdAt,
        "Pending",
        payload.secondPreference,
        "",
        "",
        "",
        "",
        "Not Submitted"
      ]
    ]
  });
}

async function sendConfirmationEmail(
  payload: ApplicationPayload,
  reservation: ReservationDetails | null,
  panel: Array<{ email: string; name: string; positionType: string }> = [],
  token?: string
): Promise<void> {
  if (!gmailConfigured()) {
    return;
  }

  const template = buildConfirmationEmailTemplate(payload, reservation, panel);
  const attachments = await getHeadsTaskAttachments(payload);
  const sheetsToken = token ?? (await getGoogleAccessToken());
  const accessToken = await getGmailAccessToken();
  const rawMessage = buildRawEmailMessage({
    from: `${GMAIL_SENDER_NAME} <${GMAIL_SENDER_EMAIL}>`,
    to: payload.aucEmail,
    cc: await buildApplicantCc(sheetsToken, payload.roleAppliedFor, payload.aucEmail, panel),
    subject: template.subject,
    text: template.body,
    html: template.html,
    attachments
  });

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      raw: rawMessage
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail send failed: ${errorText}`);
  }
}

async function trySendConfirmationEmail(
  payload: ApplicationPayload,
  reservation: ReservationDetails,
  panel: Array<{ email: string; name: string; positionType: string }> = [],
  token?: string
): Promise<boolean> {
  try {
    await sendConfirmationEmail(payload, reservation, panel, token);
    return gmailConfigured();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Confirmation email failed.");
    return false;
  }
}

function gmailConfigured(): boolean {
  return Boolean(GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN && GMAIL_SENDER_EMAIL);
}

export function buildConfirmationEmailTemplate(
  payload: ApplicationPayload,
  reservation: ReservationDetails | null,
  panel: Array<{ email: string; name: string; positionType: string }> = []
): ConfirmationEmailTemplate {
  const slot = payload.interviewSlotLabel ?? payload.interviewSlot;
  const hasSlot = Boolean(reservation && slot);
  const subject = "Resala AUC Application Confirmation";
  const bodyLines = [
    `Hi ${payload.fullName},`,
    "",
    // Says up front what this email is for. People skim a confirmation for the
    // time and close it; the task and the thread rules are further down.
    getHeadsTask(payload).task
      ? "Please read this to the end — your time, your task, and the thread to use are all below."
      : "Please read this to the end — your interview time and the thread to use are both below.",
    "",
    "You applied for:",
    `- First choice: ${firstPreferenceLabel(payload)}`,
    `- Second choice: ${secondPreferenceLabel(payload)}`,
    "",
  ];

  if (hasSlot) {
    bodyLines.push(
      `Your interview slot is: ${slot}.`,
      `Google Meet link: ${reservation!.meetLink}`,
      "Please keep your camera on for the interview.",
      `A calendar invitation is on its way, and a reminder ${INTERVIEW_REMINDER_MINUTES} minutes before.`,
      "",
    );
  } else {
    bodyLines.push(
      "Your application has been received. We will contact you soon to schedule your interview.",
      "",
    );
  }

  /*
   * No role guide here. It is what somebody reads to decide what to apply for,
   * and this email only exists once they have. Keeping it made the message
   * longer for a link nobody clicks twice.
   */
  bodyLines.push(...buildHeadsTaskLines(payload));

  /*
   * The task block above already names the attached sheet, the deadline and
   * the hand-in link. Repeating them here is what made this email read as
   * three different sets of instructions for one task, so only the committees
   * that hand their task over in the room still get a line — that is the one
   * case the block above cannot state on its own.
   */
  const { task: emailTask, forHead: emailHead } = getHeadsTask(payload);
  if (emailTask && !emailTask.atInterview && !emailTask.submissionUrl) {
    const sheetLine = emailHead?.file ? "Your task sheet is attached to this email." : "";
    bodyLines.push(`${sheetLine} Bring your work with you to the interview.`.trim(), "");
  }

  /*
   * One thread, and the reason for it: the committee running the interview is
   * copied on this email and nowhere else. A fresh message to the Resala inbox
   * reaches nobody who can move a slot, which is how a reschedule request sits
   * unread until the interview has been and gone.
   */
  if (panel.length) {
    bodyLines.push(
      "Everything about this interview goes through this email thread:",
      "- Reply to this email, and use Reply All so the people below stay on it.",
      "- Please do not start a new email to resala@aucegypt.edu. It does not reach your committee, and nobody there can move your interview.",
      `- To move or cancel, reply at least ${RESCHEDULE_NOTICE_MINUTES} minutes before your slot and agree the new time with them.`,
      "",
      `The people interviewing you for ${firstPreferenceLabel(payload)}:`,
      ...panel.map((m) => `- ${m.name}${m.positionType ? ` (${m.positionType})` : ""}: ${m.email}`),
      ""
    );
  }

  bodyLines.push("Best,", "Resala AUC");

  return {
    subject,
    body: bodyLines.join("\n"),
    html: buildConfirmationEmailHtml({
      payload,
      fullName: payload.fullName,
      // Labels, not lookup keys: anything inside the template that has to find a
      // task or a slot reads `payload` instead.
      firstPreference: firstPreferenceLabel(payload),
      secondPreference: secondPreferenceLabel(payload),
      slot: hasSlot ? slot : "",
      meetLink: hasSlot ? reservation!.meetLink : "",
      hasSlot,
      panel
    })
  };
}

function buildConfirmationEmailHtml({
  payload,
  fullName,
  firstPreference,
  secondPreference,
  slot,
  meetLink,
  hasSlot = true,
  panel = []
}: {
  payload: ApplicationPayload;
  fullName: string;
  firstPreference: string;
  secondPreference: string;
  slot: string;
  meetLink: string;
  hasSlot?: boolean;
  panel?: Array<{ email: string; name: string; positionType: string }>;
}): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f3ea;color:#172033;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your Resala AUC application has been received.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f7f3ea;margin:0;padding:24px 0;">
      <tr>
        <td align="center" style="padding:0 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #eadfca;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="background:#0d2b45;padding:24px 28px 30px;text-align:center;color:#ffffff;">
                <img src="${escapeHtml(EMAIL_LOGO_URL)}" alt="Resala AUC" width="128" style="display:block;width:128px;max-width:128px;height:auto;border:0;outline:none;text-decoration:none;margin:0 auto;">
                <div style="font-size:25px;line-height:1.15;color:#ffffff;font-weight:bold;margin-top:14px;">Beyond Ana Maly</div>
                <div style="font-size:14px;line-height:1.5;color:#f5c46b;margin-top:6px;font-weight:bold;letter-spacing:0.5px;">Build the First Step</div>
                <div style="font-size:28px;line-height:1.15;color:#ffffff;font-weight:bold;margin-top:22px;">${hasSlot ? "Your Interview Slot Is Reserved" : "Application Received"}</div>
                <div style="font-size:15px;line-height:1.5;color:#dbe7ef;margin-top:10px;">${hasSlot ? "Everything you need before the interview." : "We will contact you soon to schedule your interview."}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 28px 8px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi ${escapeHtml(fullName)},</p>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#172033;"><strong>Please read this to the end</strong> — ${getHeadsTask(payload).task ? "your time, your task, and the thread to use are all below." : "your interview time and the thread to use are both below."}</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;">
                  <tr>
                    <td style="padding:0 0 6px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:bold;">You applied for</td>
                  </tr>
                  <tr>
                    <td style="font-size:16px;line-height:1.6;color:#172033;">
                      <span style="color:#64748b;">First choice</span> · <strong>${escapeHtml(firstPreference)}</strong><br>
                      <span style="color:#64748b;">Second choice</span> · <strong>${escapeHtml(secondPreference)}</strong>
                    </td>
                  </tr>
                </table>${hasSlot ? "" : `
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">We will be in touch to schedule your interview.</p>`}
                ${hasSlot ? `
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;">
                  <tr>
                    <td style="background:#fff7e8;border:1px solid #f0d7a5;border-left:5px solid #f5a623;border-radius:14px;padding:18px;">
                      <div style="font-size:13px;color:#8a4706;text-transform:uppercase;letter-spacing:1px;font-weight:bold;margin-bottom:7px;">Your interview slot</div>
                      <div style="font-size:22px;line-height:1.3;font-weight:bold;color:#0d2b45;">${escapeHtml(slot)}</div>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;">
                  <tr>
                    <td style="background:#f8fafc;border:1px solid #e6edf2;border-radius:14px;padding:16px;">
                      <div style="font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:bold;margin-bottom:8px;">Google Meet</div>
                      <a href="${escapeHtml(meetLink)}" style="color:#0d2b45;font-size:16px;font-weight:bold;text-decoration:underline;">Join the interview meeting</a>
                      <div style="font-size:14px;line-height:1.55;color:#4b5563;margin-top:8px;">Please keep your camera on for the interview.</div>
                      <div style="font-size:14px;line-height:1.55;color:#4b5563;margin-top:4px;">A calendar invitation is on its way, and a reminder ${INTERVIEW_REMINDER_MINUTES} minutes before.</div>
                    </td>
                  </tr>
                </table>
                ` : `
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;">
                  <tr>
                    <td style="background:#f0f7f0;border:1px solid #c8e0c8;border-left:5px solid #4caf50;border-radius:14px;padding:18px;">
                      <div style="font-size:13px;color:#2e7d32;text-transform:uppercase;letter-spacing:1px;font-weight:bold;margin-bottom:7px;">Interview reservation</div>
                      <div style="font-size:16px;line-height:1.5;font-weight:bold;color:#1b5e20;">Someone from the Resala AUC team will contact you soon to schedule your interview.</div>
                    </td>
                  </tr>
                </table>
                `}
                ${buildHeadsTaskHtml(payload)}
                ${!getHeadsTask(payload).task || getHeadsTask(payload).task!.atInterview || getHeadsTask(payload).task!.submissionUrl ? "" : `
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:4px 0 22px;">
                  <tr>
                    <td style="background:#0d2b45;border-radius:14px;padding:16px 18px;color:#ffffff;">
                      <div style="font-size:14px;color:#f5c46b;font-weight:bold;letter-spacing:.8px;text-transform:uppercase;">Before your interview</div>
                      <div style="font-size:15px;line-height:1.7;color:#ffffff;margin-top:8px;">${buildTaskHandInHtml(payload)}</div>
                    </td>
                  </tr>
                </table>
                `}
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px;">
                  <tr>
                    <td style="background:#eef3fb;border:1px solid #cddcf0;border-left:5px solid #0d2b45;border-radius:14px;padding:18px;">
                      <div style="font-size:13px;color:#0d2b45;text-transform:uppercase;letter-spacing:1px;font-weight:bold;margin-bottom:8px;">Use this thread for everything</div>
                      <div style="font-size:15px;line-height:1.65;color:#172033;">
                        Your committee is copied on this email and nowhere else. Reply here — and use
                        <strong>Reply All</strong> so they stay on it.
                      </div>
                      <div style="font-size:15px;line-height:1.65;color:#172033;margin-top:10px;">
                        Please do not start a new email to resala@aucegypt.edu. It does not reach your committee,
                        and nobody there can move your interview.
                      </div>
                      <div style="font-size:15px;line-height:1.65;color:#172033;margin-top:10px;">
                        To move or cancel, reply at least ${RESCHEDULE_NOTICE_MINUTES} minutes before your slot and agree the new time with them.
                      </div>
                      ${
                        panel.length
                          ? `<div style="font-size:14px;line-height:1.7;color:#4b5563;margin-top:12px;border-top:1px solid #cddcf0;padding-top:12px;">
                               <strong style="color:#0d2b45;">On this thread:</strong><br>${panel
                                 .map((m) => `${escapeHtml(m.name)}${m.positionType ? ` (${escapeHtml(m.positionType)})` : ""} — ${escapeHtml(m.email)}`)
                                 .join("<br>")}
                             </div>`
                          : ""
                      }
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 4px;font-size:16px;line-height:1.6;color:#172033;font-weight:bold;">Be the first step toward someone's better life.</p>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Best,<br>Resala AUC</p>
              </td>
            </tr>
            <tr>
              <td style="background:#f3efe5;padding:16px 28px;text-align:center;border-top:1px solid #eadfca;">
                <div style="font-size:12px;line-height:1.5;color:#667085;">Resala AUC · Build the First Step</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * The guide is found by the raw committee name; the applicant reads the display
 * label. Keeping the two apart is why the card can say "Children’s Day —
 * Creative Head" and still link to the right guide.
 */
export function getApplicantRoleGuideLinks(payload: ApplicationPayload): RoleGuideLink[] {
  return [
    { preferenceLabel: "First preference", roleName: firstPreferenceLabel(payload), lookup: payload.roleAppliedFor },
    { preferenceLabel: "Second preference", roleName: secondPreferenceLabel(payload), lookup: payload.secondPreference }
  ].map(({ preferenceLabel, roleName, lookup }) => ({
    preferenceLabel,
    roleName,
    url: getRoleGuideUrl(lookup)
  }));
}

function getRoleGuideUrl(roleName: string): string {
  // The second preference arrives as "Committee — Head", which matches no slug;
  // the committee half in front of the dash does.
  const committee = String(roleName ?? "").split("—")[0];
  const slug = ROLE_GUIDE_SLUGS[normalizeRole(roleName)] ?? ROLE_GUIDE_SLUGS[normalizeRole(committee)];
  return slug ? `${ROLE_GUIDE_BASE_URL}/${slug}/` : `${ROLE_GUIDE_BASE_URL}/`;
}



function buildHeadsTaskHtml(payload: ApplicationPayload): string {
  const { task, forHead } = getHeadsTask(payload);
  if (!task) return "";

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;">
    <tr><td style="background:#fff7e8;border:1px solid #f0d7a5;border-left:5px solid #f5a623;border-radius:14px;padding:18px;">
      <div style="font-size:13px;color:#8a4706;text-transform:uppercase;letter-spacing:1px;font-weight:bold;margin-bottom:7px;">${forHead?.file ? "Your task is attached" : task.atInterview ? "At your interview" : "Before your interview"}</div>
      <div style="font-size:17px;line-height:1.4;font-weight:bold;color:#0d2b45;margin-bottom:8px;">${
        forHead?.file
          ? `Open the PDF attached to this email — ${escapeHtml(forHead.title)}`
          : escapeHtml(forHead ? forHead.title : task.summary)
      }</div>
      ${
        /* Attached as a PDF, so the email points at it instead of reprinting
           it. Without an attachment there is nowhere else to read it. */
        forHead?.file
          ? `<div style="font-size:15px;line-height:1.6;color:#4b5563;">The scenario, what to hand in, and how long it should be are all in there.</div>`
          : `${task.scenario ? `<div style="font-size:14px;line-height:1.6;color:#4b5563;margin-bottom:8px;">${escapeHtml(task.scenario)}</div>` : ""}
             <div style="font-size:15px;line-height:1.6;color:#172033;">${escapeHtml(task.detail)}</div>
             ${forHead ? `<ul style="margin:10px 0 0;padding-left:20px;font-size:14px;line-height:1.7;color:#4b5563;">${forHead.points.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>` : ""}`
      }
      ${
        task.submissionUrl
          ? `<div style="font-size:14px;line-height:1.6;color:#8a4706;margin-top:12px;font-weight:bold;">${escapeHtml(taskDeadlineSentence(task))}</div>
             <a href="${escapeHtml(task.submissionUrl)}" style="display:inline-block;margin-top:10px;background:#0d2b45;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;border-radius:10px;padding:11px 16px;">Submit your task</a>`
          : ""
      }
    </td></tr></table>`;
}

/** The one-line reminder under the interview details: hand it in, or bring it. */
function buildTaskHandInHtml(payload: ApplicationPayload): string {
  const { task, forHead } = getHeadsTask(payload);
  if (!task) return "";

  const sheet = forHead?.file ? "Your task sheet is attached to this email." : "";
  if (!task.submissionUrl) return `${sheet} Bring your work with you to the interview.`.trim();

  return `${sheet} ${escapeHtml(taskDeadlineSentence(task))} <a href="${escapeHtml(task.submissionUrl)}" style="color:#f5c46b;font-weight:bold;">Submit your task here</a>.`.trim();
}

/**
 * The applicant's own task sheet, when their committee sets one per head. A
 * failure here must not lose the confirmation email, so it is logged and the
 * mail goes out with the task spelled out in the body instead.
 */
async function getHeadsTaskAttachments(payload: ApplicationPayload): Promise<EmailAttachment[]> {
  const { task, forHead } = getHeadsTask(payload);
  if (!task || task.atInterview || !forHead?.file) return [];

  const url = `${TASK_FILE_BASE_URL}/${forHead.file}`;
  try {
    const response = await fetch(url);
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.toLowerCase().includes("pdf")) {
      throw new Error(`status ${response.status}, content-type ${contentType || "none"}`);
    }

    return [
      {
        filename: forHead.file,
        contentType: "application/pdf",
        contentBytes: new Uint8Array(await response.arrayBuffer())
      }
    ];
  } catch (error) {
    console.error(`Task sheet attachment failed for ${url}: ${error instanceof Error ? error.message : "unknown error"}`);
    return [];
  }
}

async function getGmailAccessToken(): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type: "refresh_token"
    })
  });

  const body = await response.json();
  if (!response.ok || !body.access_token) {
    throw new Error(`Gmail token refresh failed: ${JSON.stringify(body)}`);
  }

  return body.access_token;
}

/**
 * RFC 2047 encoding for a header value.
 *
 * Mail headers are ASCII only. A raw UTF-8 character in Subject or a sender name
 * is decoded by the client as Latin-1, which is why an em dash arrived as
 * "Ã¢Â€Â”". Non-ASCII must travel as encoded-words instead.
 *
 * Chunks are split on character boundaries, never mid-sequence: an encoded-word
 * has to hold a whole number of characters, and 45 bytes keeps the whole word
 * inside the 75-character limit once the "=?UTF-8?B?" wrapper is added.
 */
function encodeEmailHeader(value: string): string {
  const raw = String(value ?? "");
  // Printable ASCII needs no encoding, and leaving it alone keeps headers readable.
  if (/^[\x20-\x7E]*$/.test(raw)) return raw;

  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let current = "";

  for (const character of raw) {
    const candidate = current + character;
    if (encoder.encode(candidate).length > 45) {
      if (current) chunks.push(current);
      current = character;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);

  // Folded with CRLF + space, the continuation form for a long header.
  return chunks.map((chunk) => `=?UTF-8?B?${bytesToBase64(encoder.encode(chunk))}?=`).join("\r\n ");
}

/** Encodes the display name of "Name <address>" and leaves the address alone. */
function encodeAddressHeader(value: string): string {
  const match = String(value ?? "").match(/^(.*)<([^>]+)>\s*$/);
  if (!match) return encodeEmailHeader(value);

  const name = match[1].trim().replace(/^"|"$/g, "");
  const address = match[2].trim();
  return name ? `${encodeEmailHeader(name)} <${address}>` : `<${address}>`;
}

function buildRawEmailMessage({
  from,
  to,
  cc,
  subject,
  text,
  html,
  attachments = []
}: {
  from: string;
  to: string;
  cc?: string;
  subject: string;
  text: string;
  html: string;
  attachments?: EmailAttachment[];
}): string {
  const alternativeBoundary = `resala-alt-${crypto.randomUUID()}`;
  const alternativePart = [
    `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
    "",
    `--${alternativeBoundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    text,
    "",
    `--${alternativeBoundary}`,
    "Content-Type: text/html; charset=utf-8",
    "",
    html,
    "",
    `--${alternativeBoundary}--`
  ].join("\r\n");

  const headers = [
    `From: ${encodeAddressHeader(from)}`,
    `To: ${to}`,
    ...(cc ? [`Cc: ${cc}`] : []),
    "MIME-Version: 1.0",
    `Subject: ${encodeEmailHeader(subject)}`
  ];

  if (!attachments.length) {
    return base64UrlEncode([
      ...headers,
      `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
      "",
      `--${alternativeBoundary}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      text,
      "",
      `--${alternativeBoundary}`,
      "Content-Type: text/html; charset=utf-8",
      "",
      html,
      "",
      `--${alternativeBoundary}--`
    ].join("\r\n"));
  }

  const mixedBoundary = `resala-mixed-${crypto.randomUUID()}`;
  const attachmentParts = attachments.map((attachment) =>
    [
      `--${mixedBoundary}`,
      `Content-Type: ${attachment.contentType}; name="${escapeMimeHeader(attachment.filename)}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${escapeMimeHeader(attachment.filename)}"`,
      "",
      foldBase64(bytesToBase64(attachment.contentBytes))
    ].join("\r\n")
  );

  const message = [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    "",
    `--${mixedBoundary}`,
    alternativePart,
    "",
    ...attachmentParts,
    `--${mixedBoundary}--`
  ].join("\r\n");

  return base64UrlEncode(message);
}

async function getSheetName(token: string): Promise<string> {
  if (resolvedSheetName) return resolvedSheetName;

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets.properties.title`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Sheets metadata request failed: ${errorText}`);
  }

  const body = await response.json();
  const title = body?.sheets?.[0]?.properties?.title;

  if (typeof title !== "string" || !title.trim()) {
    throw new Error("Could not determine the active sheet tab name.");
  }

  resolvedSheetName = title.trim();
  return resolvedSheetName;
}

async function getSpreadsheetSheetTitles(token: string): Promise<Set<string>> {
  if (resolvedSheetTitles) return resolvedSheetTitles;

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets.properties.title`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Sheets metadata request failed: ${errorText}`);
  }

  const body = await response.json();
  const titles = new Set<string>();

  for (const sheet of body?.sheets ?? []) {
    const title = sheet?.properties?.title;
    if (typeof title === "string" && title.trim()) {
      titles.add(title.trim());
    }
  }

  resolvedSheetTitles = titles;
  return resolvedSheetTitles;
}

async function ensureSlotSheets(token: string): Promise<void> {
  await ensureSheetTab(token, SLOT_SHEET_NAME);
  await ensureSheetTab(token, RESERVATION_SHEET_NAME);
  await ensureHeadsSlotSheet(token);
  await ensureSheetSeed(
    token,
    SLOT_SHEET_NAME,
    SLOT_HEADERS,
    buildRecruitmentSlotRows()
  );
  await ensureRemainingRecruitmentSlotRows(token);
  await ensureSheetHeaders(token, RESERVATION_SHEET_NAME, RESERVATION_HEADERS);
}

async function ensureHeadsSlotSheet(token: string): Promise<void> {
  await ensureSheetTab(token, HEADS_SLOT_SHEET_NAME);
  await ensureSheetHeaders(token, HEADS_SLOT_SHEET_NAME, HEADS_SLOT_HEADERS);

  /*
   * Append only the slots that are not in the sheet yet, matched on Slot ID.
   * Existing rows are never rewritten, so a slot deactivated by hand stays
   * deactivated — and a committee added to the cycle later still gets its rows
   * without the sheet having to be cleared.
   */
  const response = await sheetsFetch(token, "GET", `${sheetRange(HEADS_SLOT_SHEET_NAME, "A2:K")}`);
  const existing = ((await response.json()).values ?? []) as string[][];
  const present = new Set(existing.map((row) => normalize(row[0])));

  const published = buildHeadsSlotRows();
  const missing = published.filter((row) => !present.has(normalize(String(row[0]))));

  if (missing.length) {
    await sheetsFetch(
      token,
      "POST",
      `${sheetRange(HEADS_SLOT_SHEET_NAME, "A:K")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      { values: missing }
    );
  }

  /*
   * Reconcile capacity and duration on rows that already exist. Appending alone
   * is not enough: Visits was seeded when two interviewers were assumed to take
   * two bookings an hour, and those rows kept a capacity of 2 after the schedule
   * changed to one shared interview. Only these two columns are touched, so a
   * slot deactivated by hand stays deactivated.
   */
  const byId = new Map(published.map((row) => [normalize(String(row[0])), row]));
  const updates: Array<{ range: string; values: string[][] }> = [];

  for (const [index, row] of existing.entries()) {
    const wanted = byId.get(normalize(row[0]));
    if (!wanted) continue;
    const rowIndex = index + 2;
    if (String(row[6] ?? "") !== String(wanted[6])) {
      updates.push({ range: sheetA1Range(HEADS_SLOT_SHEET_NAME, `G${rowIndex}`), values: [[String(wanted[6])]] });
    }
    if (String(row[7] ?? "") !== String(wanted[7])) {
      updates.push({ range: sheetA1Range(HEADS_SLOT_SHEET_NAME, `H${rowIndex}`), values: [[String(wanted[7])]] });
    }
  }

  await sheetsBatchUpdateValues(token, updates);
}

/**
 * Heads-cycle availability for one committee. Unlike the director-cycle reader
 * this trusts the End Time stored on the row rather than forcing a global
 * duration, because committees interview for different lengths.
 */
async function getHeadsInterviewSlots(token: string, committee?: string): Promise<InterviewSlotOption[]> {
  await ensureHeadsSlotSheet(token);

  const slotResponse = await sheetsFetch(token, "GET", `${sheetRange(HEADS_SLOT_SHEET_NAME, "A2:K")}`);
  const slotRows = ((await slotResponse.json()).values ?? []) as string[][];

  const reservationResponse = await sheetsFetch(token, "GET", `${sheetRange(RESERVATION_SHEET_NAME, "A2:L")}`);
  const reservationRows = ((await reservationResponse.json()).values ?? []) as string[][];
  const reservedCounts = new Map<string, number>();
  for (const row of reservationRows) {
    const slotId = normalize(row[1]);
    if (!slotId) continue;
    reservedCounts.set(slotId, (reservedCounts.get(slotId) ?? 0) + 1);
  }

  const wanted = committee ? normalizeRole(committee) : "";

  return slotRows
    .map((row: string[], index: number) => {
      const id = String(row[0] ?? "").trim();
      const rowCommittee = String(row[1] ?? "").trim();
      const date = String(row[2] ?? "").trim();
      const startTime = String(row[3] ?? "").trim();
      const endTime = String(row[4] ?? "").trim();
      const label = String(row[5] ?? "").trim() || buildSlotLabel(date, startTime);
      const capacity = Number(row[7] ?? 1) || 1;
      const active = String(row[8] ?? "TRUE").toLowerCase() !== "false";
      const calendarEventId = String(row[9] ?? "").trim();
      const meetLink = String(row[10] ?? "").trim();
      const reservedCount = reservedCounts.get(normalize(id)) ?? 0;
      const remaining = Math.max(capacity - reservedCount, 0);
      const startDateTime = buildLocalDateTime(date, startTime);
      const endDateTime = resolveEndDateTime(startDateTime, buildLocalDateTime(date, endTime));
      // Past and "too close to prepare for" are the same answer to an
      // applicant, so one flag covers both.
      const tooSoon = isWithinBookingLeadTime(startDateTime, CALENDAR_TIME_ZONE);

      return {
        id,
        label,
        date,
        startTime,
        endTime,
        startDateTime,
        endDateTime,
        capacity,
        active,
        reservedCount,
        remaining,
        tooSoon,
        full: !active || !date || !startTime || !startDateTime || !endDateTime || tooSoon || remaining <= 0,
        calendarEventId,
        meetLink,
        rowIndex: index + 2,
        committee: rowCommittee
      } as InterviewSlotOption & { committee: string };
    })
    .filter((slot) => slot.active && (!wanted || normalizeRole(slot.committee) === wanted))
    .sort((a, b) => (a.startDateTime || a.label).localeCompare(b.startDateTime || b.label));
}

async function normalizeSlotDurations(token: string): Promise<number> {
  const response = await sheetsFetch(token, "GET", `${sheetRange(SLOT_SHEET_NAME, "A2:I")}`);
  const rows = (await response.json()).values ?? [];
  const updates: Array<{ range: string; values: string[][] }> = [];

  for (const [index, row] of rows.entries()) {
    const startTime = String(row[2] ?? "").trim();
    const currentEndTime = String(row[3] ?? "").trim();
    const expectedEndTime = addMinutesToTime(startTime, INTERVIEW_SLOT_DURATION_MINUTES);

    if (!startTime || !expectedEndTime || currentEndTime === expectedEndTime) {
      continue;
    }

    const rowIndex = index + 2;
    updates.push({
      range: sheetA1Range(SLOT_SHEET_NAME, `D${rowIndex}`),
      values: [[expectedEndTime]]
    });
  }

  await sheetsBatchUpdateValues(token, updates);
  return updates.length;
}

async function ensureSheetTab(token: string, tabName: string): Promise<void> {
  const titles = await getSpreadsheetSheetTitles(token);
  if (titles.has(tabName)) return;

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: {
              title: tabName
            }
          }
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (!String(errorText).includes("already exists")) {
      throw new Error(`Could not create sheet tab ${tabName}: ${errorText}`);
    }
  }

  titles.add(tabName);
}

async function ensureSheetHeaders(token: string, sheetName: string, headers: string[]): Promise<void> {
  // Headers cannot change under a warm instance, and this used to cost a read
  // on every call from thirteen call sites. Verify once per tab, then trust it.
  if (verifiedSheetHeaders.has(sheetName)) return;

  const width = headers.length;
  const range = `${sheetRange(sheetName, `A1:${columnLetter(width)}1`)}`;
  const response = await sheetsFetch(token, "GET", range);
  const currentValues = (await response.json()).values?.[0] ?? [];

  if (currentValues.length === 0) {
    await sheetsFetch(token, "PUT", `${sheetRange(sheetName, `A1:${columnLetter(width)}1`)}?valueInputOption=RAW`, {
      values: [headers]
    });
    verifiedSheetHeaders.add(sheetName);
    return;
  }

  const headersMatch = headers.every((header, index) => currentValues[index] === header);
  if (!headersMatch) {
    await sheetsFetch(token, "PUT", `${sheetRange(sheetName, `A1:${columnLetter(width)}1`)}?valueInputOption=RAW`, {
      values: [headers]
    });
  }
  verifiedSheetHeaders.add(sheetName);
}

async function resetTestApplicant(token: string, payload: AdminResetPayload, applicationSheetName: string): Promise<{
  deletedReservations: number;
  deletedApplications: number;
  clearedSlots: number;
  deletedCalendarEvents: number;
}> {
  const email = String(payload.aucEmail ?? "").trim().toLowerCase();
  const studentId = String(payload.studentId ?? "").trim();
  const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!hasValidEmail && !studentId) {
    throw new Error("Provide a valid AUC email or Student ID.");
  }

  await ensureSlotSheets(token);
  await ensureHeaders(token, applicationSheetName);

  const reservationResponse = await sheetsFetch(token, "GET", `${sheetRange(RESERVATION_SHEET_NAME, "A2:N")}`);
  const reservationRows = ((await reservationResponse.json()).values ?? []) as string[][];
  const reservationMatches = reservationRows
    .map((row: string[], index: number) => ({ row, rowIndex: index + 2 }))
    .filter(({ row }) => {
      const rowEmail = normalize(row[4]);
      const rowStudentId = normalize(row[5]);
      return (hasValidEmail && rowEmail === normalize(email)) || (studentId && rowStudentId === normalize(studentId));
    });

  const slotIdsToReview = new Set(reservationMatches.map(({ row }) => String(row[1] ?? "").trim()).filter(Boolean));
  const calendarEventIds = [
    ...new Set(reservationMatches.map(({ row }) => String(row[6] ?? "").trim()).filter(Boolean))
  ];

  const applicationWidth = columnLetter(HEADERS.length);
  const applicationResponse = await sheetsFetch(token, "GET", `${sheetRange(applicationSheetName, `A2:${applicationWidth}`)}`);
  const applicationRows = ((await applicationResponse.json()).values ?? []) as string[][];
  const applicationMatches = applicationRows
    .map((row: string[], index: number) => ({ row, rowIndex: index + 2 }))
    .filter(({ row }) => {
      const rowEmail = normalize(row[2]);
      const rowStudentId = normalize(row[3]);
      return (hasValidEmail && rowEmail === normalize(email)) || (studentId && rowStudentId === normalize(studentId));
    });

  const sheetIds = await getSpreadsheetSheetIds(token);
  const reservationSheetId = sheetIds.get(RESERVATION_SHEET_NAME);
  const applicationSheetId = sheetIds.get(applicationSheetName);

  if (reservationMatches.length && reservationSheetId === undefined) {
    throw new Error(`Could not find sheet ID for ${RESERVATION_SHEET_NAME}.`);
  }

  if (applicationMatches.length && applicationSheetId === undefined) {
    throw new Error(`Could not find sheet ID for ${applicationSheetName}.`);
  }

  const deleteRequests = [
    ...buildDeleteRowRequests(reservationSheetId, reservationMatches.map((match) => match.rowIndex)),
    ...buildDeleteRowRequests(applicationSheetId, applicationMatches.map((match) => match.rowIndex))
  ];

  if (deleteRequests.length) {
    await batchUpdateSpreadsheet(token, deleteRequests);
  }

  let clearedSlots = 0;
  if (slotIdsToReview.size) {
    clearedSlots = await clearFreedSlotCalendarFields(token, slotIdsToReview);
  }

  let deletedCalendarEvents = 0;
  for (const eventId of calendarEventIds) {
    if (await deleteCalendarEvent(eventId)) {
      deletedCalendarEvents += 1;
    }
  }

  return {
    deletedReservations: reservationMatches.length,
    deletedApplications: applicationMatches.length,
    clearedSlots,
    deletedCalendarEvents
  };
}

async function addTestInterviewSlot(
  token: string,
  payload: AdminAddTestSlotPayload
): Promise<{ slotId: string; label: string; rowIndex: number }> {
  const date = String(payload.date ?? "").trim();
  const startTime = String(payload.startTime ?? "").trim();
  const endTime = String(payload.endTime ?? "").trim() || addMinutesToTime(startTime, INTERVIEW_SLOT_DURATION_MINUTES);
  const label = String(payload.label ?? "").trim() || buildSlotLabel(date, startTime);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid slot date.");
  }

  if (!startTime) {
    throw new Error("Invalid slot start time.");
  }

  await ensureSlotSheets(token);

  const slotId = `test-slot-${date}-${startTime.replace(/[^0-9A-Za-z]/g, "").toLowerCase()}`;
  const row = [slotId, date, startTime, endTime, label, 1, "TRUE", "", ""];
  await sheetsFetch(token, "POST", `${sheetRange(SLOT_SHEET_NAME, "A:I")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    values: [row]
  });

  const slotResponse = await sheetsFetch(token, "GET", `${sheetRange(SLOT_SHEET_NAME, "A2:I")}`);
  const slotRows = ((await slotResponse.json()).values ?? []) as string[][];
  const rowIndex = slotRows.findIndex((sheetRow: string[]) => normalize(sheetRow[0]) === normalize(slotId)) + 2;

  if (rowIndex < 2) {
    throw new Error("Could not confirm inserted test slot.");
  }

  return {
    slotId,
    label,
    rowIndex
  };
}

async function loadAdminDashboard(token: string): Promise<{
  reservations: Array<Record<string, string | number>>;
  slots: InterviewSlotOption[];
}> {
  await ensureSlotSheets(token);
  const sheetName = await getSheetName(token);

  const [reservationResponse, applicationResponse] = await Promise.all([
    sheetsFetch(token, "GET", `${sheetRange(RESERVATION_SHEET_NAME, "A2:N")}`),
    sheetsFetch(token, "GET", `${sheetRange(sheetName, "A2:W")}`)
  ]);

  const reservationRows = (await reservationResponse.json()).values ?? [];
  const applicationRows = (await applicationResponse.json()).values ?? [];

  const appByEmail = new Map<string, string[]>();
  for (const row of applicationRows) {
    const email = normalize(String(row[2] ?? ""));
    if (email) appByEmail.set(email, row);
  }

  const reservedEmails = new Set<string>();
  const reservations = reservationRows.map((row: string[], index: number) => {
    const aucEmail = String(row[4] ?? "").trim();
    if (aucEmail) reservedEmails.add(normalize(aucEmail));
    const app = appByEmail.get(normalize(aucEmail)) ?? [];
    const roleAppliedFor = String(row[12] ?? "").trim() || String(app[7] ?? "").trim();
    const secondPreference = String(row[13] ?? "").trim() || String(app[17] ?? "").trim();
    const taskSubmission = getTaskSubmissionState(app);
    return {
      rowIndex: index + 2,
      timestamp: row[0] ?? "",
      slotId: row[1] ?? "",
      slotLabel: row[2] ?? "",
      fullName: row[3] ?? "",
      aucEmail,
      studentId: row[5] ?? "",
      calendarEventId: row[6] ?? "",
      meetLink: row[7] ?? "",
      interviewStatus: row[8] ?? "",
      reminderSendAt: row[9] ?? "",
      reminderSentAt: row[10] ?? "",
      reminderStatus: row[11] ?? "",
      roleAppliedFor,
      secondPreference,
      major: app[4] ?? "",
      yearLevel: app[5] ?? "",
      phone: app[6] ?? "",
      whyThisRole: app[10] ?? "",
      whyChooseYourself: app[11] ?? "",
      hopeToLearn: app[12] ?? "",
      previousResalaExperience: app[13] ?? "",
      noSlot: false,
      ...taskSubmission
    };
  });

  for (const [email, app] of appByEmail) {
    if (reservedEmails.has(email)) continue;
    const taskSubmission = getTaskSubmissionState(app);
    const aucEmail = String(app[2] ?? "").trim();
    reservations.push({
      rowIndex: -(appByEmail.size + reservations.length + 1),
      timestamp: app[0] ?? "",
      slotId: "",
      slotLabel: "",
      fullName: app[1] ?? "",
      aucEmail,
      studentId: app[3] ?? "",
      calendarEventId: "",
      meetLink: "",
      interviewStatus: "",
      reminderSendAt: "",
      reminderSentAt: "",
      reminderStatus: "",
      roleAppliedFor: app[7] ?? "",
      secondPreference: app[17] ?? "",
      major: app[4] ?? "",
      yearLevel: app[5] ?? "",
      phone: app[6] ?? "",
      whyThisRole: app[10] ?? "",
      whyChooseYourself: app[11] ?? "",
      hopeToLearn: app[12] ?? "",
      previousResalaExperience: app[13] ?? "",
      noSlot: true,
      ...taskSubmission
    });
  }

  const slots = await getInterviewSlots(token);

  return { reservations, slots };
}

async function scheduleInterviewForApplicant(
  token: string,
  payload: AdminScheduleInterviewPayload
): Promise<{
  scheduled: boolean;
  emailSent: boolean;
  slotLabel: string;
}> {
  const { aucEmail, date, startTime: rawStartTime } = payload;
  const rawEndTime = String(payload.endTime ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid date format. Use YYYY-MM-DD.");
  }

  if (!/^\d{1,2}:\d{2}$/.test(rawStartTime)) {
    throw new Error("Invalid time format. Use HH:MM (24h).");
  }

  const sheetName = await getSheetName(token);
  const applicationWidth = columnLetter(HEADERS.length);
  const applicationResponse = await sheetsFetch(token, "GET", `${sheetRange(sheetName, `A2:${applicationWidth}`)}`);
  const applicationRows = (await applicationResponse.json()).values ?? [];

  const appRowIndex = applicationRows.findIndex((row: string[]) => normalize(row[2]) === normalize(aucEmail));
  if (appRowIndex === -1) {
    throw new Error(`Applicant not found: ${aucEmail}`);
  }

  const app = applicationRows[appRowIndex];
  const sheetRow = appRowIndex + 2;
  const fullName = String(app[1] ?? "").trim();
  const studentId = String(app[3] ?? "").trim();
  const roleAppliedFor = String(app[7] ?? "").trim();
  const secondPreference = String(app[17] ?? "").trim();

  const [sh, sm] = rawStartTime.split(":").map(Number);
  const startDateTime = `${date}T${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}:00`;

  const endMinutesTotal = sh * 60 + sm + INTERVIEW_SLOT_DURATION_MINUTES;
  const eh = Math.floor(endMinutesTotal / 60) % 24;
  const em = endMinutesTotal % 60;
  const resolvedEndTime = rawEndTime || `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
  const [reh, rem] = resolvedEndTime.split(":").map(Number);
  // Same midnight wrap as the sheet-derived slots: an admin moving somebody to
  // 23:00 for an hour ends them at 00:00 the following day.
  const endDateTime = resolveEndDateTime(
    startDateTime,
    `${date}T${String(reh).padStart(2, "0")}:${String(rem).padStart(2, "0")}:00`
  );

  const displayHour = sh % 12 || 12;
  const meridiem = sh >= 12 ? "PM" : "AM";
  const slotLabel = `${date} at ${displayHour}:${String(sm).padStart(2, "0")} ${meridiem}`;
  const slotId = `admin-${date}-${String(sh).padStart(2, "0")}${String(sm).padStart(2, "0")}`;

  const newSlot: InterviewSlotOption = {
    id: slotId,
    label: slotLabel,
    date,
    startTime: `${displayHour}:${String(sm).padStart(2, "0")} ${meridiem}`,
    endTime: `${reh % 12 || 12}:${String(rem).padStart(2, "0")} ${reh >= 12 ? "PM" : "AM"}`,
    startDateTime,
    endDateTime,
    capacity: 1,
    active: true,
    reservedCount: 0,
    remaining: 1,
    full: false
  };

  const applicantPayload: ApplicationPayload = {
    timestamp: new Date().toISOString(),
    fullName,
    aucEmail,
    studentId,
    major: String(app[4] ?? ""),
    yearLevel: String(app[5] ?? ""),
    phone: String(app[6] ?? ""),
    roleAppliedFor,
    roleStepTitle: "",
    roleDescription: "",
    secondPreference,
    whyThisRole: "",
    whyChooseYourself: "",
    interviewSlot: newSlot.label,
    interviewSlotId: newSlot.id,
    interviewSlotLabel: newSlot.label,
    createdAt: new Date().toISOString()
  };

  const calendarToken = await getGmailAccessToken();
  const calendarEvent = await createCalendarEvent(calendarToken, applicantPayload, newSlot);

  const newReminderSendAt = subtractMinutesFromLocalDateTime(newSlot.startDateTime, INTERVIEW_REMINDER_MINUTES);

  await sheetsFetch(token, "POST", `${sheetRange(RESERVATION_SHEET_NAME, "A:N")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    values: [[
      new Date().toISOString(),
      slotId,
      slotLabel,
      fullName,
      aucEmail,
      studentId,
      calendarEvent.calendarEventId,
      calendarEvent.meetLink,
      "Not Done",
      newReminderSendAt,
      "",
      "Pending",
      roleAppliedFor,
      secondPreference
    ]]
  });

  await sheetsFetch(token, "PUT", `${sheetRange(sheetName, `O${sheetRow}`)}?valueInputOption=RAW`, {
    values: [[newSlot.label]]
  });
  await sheetsFetch(token, "PUT", `${sheetRange(sheetName, `Q${sheetRow}`)}?valueInputOption=RAW`, {
    values: [["Not Done"]]
  });

  let emailSent = false;
  try {
    await sendConfirmationEmail(applicantPayload, {
      slot: newSlot,
      calendarEventId: calendarEvent.calendarEventId,
      meetLink: calendarEvent.meetLink
    });
    emailSent = gmailConfigured();
  } catch (error) {
    console.error(`Schedule interview email failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  return { scheduled: true, emailSent, slotLabel };
}

async function ensureBoardOnboardingSheet(token: string): Promise<void> {
  await ensureSheetTab(token, BOARD_ONBOARDING_SHEET_NAME);
  await ensureSheetHeaders(token, BOARD_ONBOARDING_SHEET_NAME, BOARD_ONBOARDING_HEADERS);
}

async function readBoardOnboardingRows(token: string): Promise<string[][]> {
  const width = columnLetter(BOARD_ONBOARDING_HEADERS.length);
  const response = await sheetsFetch(token, "GET", `${sheetRange(BOARD_ONBOARDING_SHEET_NAME, `A2:${width}`)}`);
  return ((await response.json()).values ?? []) as string[][];
}

async function getBoardOnboardingSlots(token: string): Promise<{ slots: (BoardOnboardingSlot & { remaining: number; full: boolean })[] }> {
  await ensureBoardOnboardingSheet(token);
  const rows = await readBoardOnboardingRows(token);
  const bookedSlotIds = new Set(rows.map((row) => normalize(row[8])).filter(Boolean));

  const slots = BOARD_ONBOARDING_SLOTS.map((slot) => {
    const full = bookedSlotIds.has(normalize(slot.id));
    return { ...slot, remaining: full ? 0 : 1, full };
  });

  return { slots };
}

function findBoardOnboardingRowIndex(rows: string[][], aucEmail: string): number {
  const target = normalize(aucEmail);
  return rows.findIndex((row) => normalize(row[2]) === target);
}

async function getBoardOnboardingStatus(
  token: string,
  payload: BoardOnboardingStatusPayload
): Promise<{ found: boolean; record: Record<string, string> | null }> {
  const email = String(payload.aucEmail ?? "").trim();
  if (!isValidAucEmail(email)) {
    throw new Error("Provide a valid AUC email.");
  }

  await ensureBoardOnboardingSheet(token);
  const rows = await readBoardOnboardingRows(token);
  const rowIndex = findBoardOnboardingRowIndex(rows, email);

  if (rowIndex === -1) {
    return { found: false, record: null };
  }

  const row = rows[rowIndex];
  return {
    found: true,
    record: {
      fullName: row[1] ?? "",
      aucEmail: row[2] ?? "",
      department: row[3] ?? "",
      positionType: row[4] ?? "",
      whatsappJoined: row[5] ?? "",
      videoWatched: row[6] ?? "",
      retreatDays: row[7] ?? "",
      slotId: row[8] ?? "",
      slotLabel: row[9] ?? "",
      meetLink: row[11] ?? ""
    }
  };
}

async function loadBoardOnboardingRecords(token: string): Promise<{ records: Record<string, string>[] }> {
  await ensureBoardOnboardingSheet(token);
  const rows = await readBoardOnboardingRows(token);

  const records = rows
    .filter((row) => normalize(row[2]))
    .map((row) => ({
      fullName: row[1] ?? "",
      aucEmail: row[2] ?? "",
      department: row[3] ?? "",
      positionType: row[4] ?? "",
      whatsappJoined: row[5] ?? "",
      videoWatched: row[6] ?? "",
      retreatDays: row[7] ?? "",
      slotId: row[8] ?? "",
      slotLabel: row[9] ?? "",
      meetLink: row[11] ?? ""
    }));

  return { records };
}

async function sendBoardEmail(payload: AdminSendBoardEmailPayload): Promise<{ sent: boolean }> {
  const to = String(payload.to ?? "").trim();
  const cc = String(payload.cc ?? "").trim();
  const subject = String(payload.subject ?? "").trim();
  const html = String(payload.html ?? "");
  const text = String(payload.text ?? "");

  if (!isValidAucEmail(to)) {
    throw new Error("Provide a valid AUC email for 'to'.");
  }
  if (!subject || !html || !text) {
    throw new Error("subject, html, and text are all required.");
  }
  if (!gmailConfigured()) {
    throw new Error("Gmail is not configured on this deployment.");
  }

  const token = await getGmailAccessToken();
  const rawMessage = buildRawEmailMessage({
    from: `${GMAIL_SENDER_NAME} <${GMAIL_SENDER_EMAIL}>`,
    to,
    cc: cc || undefined,
    subject,
    text,
    html
  });

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ raw: rawMessage })
  });

  if (!response.ok) {
    const body = await response.json();
    throw new Error(`Gmail send failed: ${JSON.stringify(body)}`);
  }

  return { sent: true };
}

async function resetBoardOnboardingApplicant(token: string, payload: AdminResetBoardOnboardingPayload): Promise<{ removed: number }> {
  const email = String(payload.aucEmail ?? "").trim();
  if (!isValidAucEmail(email)) {
    throw new Error("Provide a valid AUC email.");
  }

  await ensureBoardOnboardingSheet(token);
  const rows = await readBoardOnboardingRows(token);
  const remaining = rows.filter((row) => normalize(row[2]) !== normalize(email));
  const removed = rows.length - remaining.length;

  await sheetsFetch(token, "POST", `${sheetRange(BOARD_ONBOARDING_SHEET_NAME, "A2:L")}:clear`, {});
  if (remaining.length) {
    await sheetsFetch(token, "POST", `${sheetRange(BOARD_ONBOARDING_SHEET_NAME, "A:L")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      values: remaining
    });
  }

  return { removed };
}

async function submitBoardOnboarding(
  token: string,
  payload: BoardOnboardingSubmitPayload
): Promise<{ slotLabel: string; meetLink: string; calendarInviteSent: boolean }> {
  const email = String(payload.aucEmail ?? "").trim();
  const fullName = String(payload.fullName ?? "").trim();
  const department = String(payload.department ?? "").trim();
  const positionType = String(payload.positionType ?? "").trim();
  const slotId = String(payload.slotId ?? "").trim();
  const retreatDays = Array.isArray(payload.retreatDays)
    ? payload.retreatDays.filter((day) => BOARD_RETREAT_DAYS.includes(String(day)))
    : [];

  if (!isValidAucEmail(email)) {
    throw new Error("Provide a valid AUC email.");
  }
  if (!fullName) {
    throw new Error("Full name is required.");
  }
  if (!department || !positionType) {
    throw new Error("Department and position are required.");
  }

  const slot = BOARD_ONBOARDING_SLOTS.find((candidate) => candidate.id === slotId);
  if (!slot) {
    throw new Error("Invalid or missing appointment slot.");
  }

  await ensureBoardOnboardingSheet(token);
  const rows = await readBoardOnboardingRows(token);
  const existingRowIndex = findBoardOnboardingRowIndex(rows, email);

  if (existingRowIndex !== -1) {
    const existing = rows[existingRowIndex];
    const sheetRow = existingRowIndex + 2;
    await sheetsFetch(
      token,
      "PUT",
      `${sheetRange(BOARD_ONBOARDING_SHEET_NAME, `F${sheetRow}:H${sheetRow}`)}?valueInputOption=RAW`,
      { values: [[payload.whatsappJoined ? "Yes" : "No", payload.videoWatched ? "Yes" : "No", retreatDays.join(", ")]] }
    );

    return {
      slotLabel: existing[9] ?? slot.label,
      meetLink: existing[11] ?? "",
      calendarInviteSent: false
    };
  }

  const partnerName = String(payload.partnerName ?? "").trim();
  const partnerEmailRaw = String(payload.partnerEmail ?? "").trim();
  const hasPartner = Boolean(partnerName && partnerEmailRaw);
  if (hasPartner && !isValidAucEmail(partnerEmailRaw)) {
    throw new Error("Partner email looks invalid.");
  }

  const partnerRowIndex = hasPartner ? findBoardOnboardingRowIndex(rows, partnerEmailRaw) : -1;
  const partnerRow = partnerRowIndex !== -1 ? rows[partnerRowIndex] : null;
  const partnerAlreadyBookedSlotId = partnerRow ? String(partnerRow[8] ?? "").trim() : "";

  const rowValues = (name: string, personEmail: string, calendarEventId: string, meetLink: string) => [
    new Date().toISOString(),
    name,
    personEmail,
    department,
    positionType,
    personEmail === email ? (payload.whatsappJoined ? "Yes" : "No") : "",
    personEmail === email ? (payload.videoWatched ? "Yes" : "No") : "",
    personEmail === email ? retreatDays.join(", ") : "",
    slotId,
    slot.label,
    calendarEventId,
    meetLink
  ];

  const calendarToken = await getGmailAccessToken();

  // Partner already booked a slot -- join them there instead of creating a second event.
  if (hasPartner && partnerAlreadyBookedSlotId) {
    const partnerSlot = BOARD_ONBOARDING_SLOTS.find((candidate) => candidate.id === partnerAlreadyBookedSlotId) ?? slot;
    const partnerCalendarEventId = String(partnerRow?.[10] ?? "").trim();
    const partnerMeetLink = String(partnerRow?.[11] ?? "").trim();

    if (partnerCalendarEventId) {
      await addCalendarEventAttendee(calendarToken, partnerCalendarEventId, { email, displayName: fullName });
    }

    await sheetsFetch(token, "POST", `${sheetRange(BOARD_ONBOARDING_SHEET_NAME, "A:L")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      values: [[
        new Date().toISOString(),
        fullName,
        email,
        department,
        positionType,
        payload.whatsappJoined ? "Yes" : "No",
        payload.videoWatched ? "Yes" : "No",
        retreatDays.join(", "),
        partnerSlot.id,
        partnerSlot.label,
        partnerCalendarEventId,
        partnerMeetLink
      ]]
    });

    return { slotLabel: partnerSlot.label, meetLink: partnerMeetLink, calendarInviteSent: Boolean(partnerCalendarEventId) };
  }

  const slotAlreadyTaken = rows.some((row) => normalize(row[8]) === normalize(slotId));
  if (slotAlreadyTaken) {
    throw new Error("That appointment slot was just booked by someone else. Please pick another.");
  }

  // Re-check right before committing: closes the race window where both
  // partners open their links around the same time and neither sees the
  // other's booking yet.
  const freshRows = await readBoardOnboardingRows(token);
  if (freshRows.some((row) => normalize(row[8]) === normalize(slotId))) {
    throw new Error("That appointment slot was just booked by someone else. Please pick another.");
  }
  if (hasPartner) {
    const freshPartnerRowIndex = findBoardOnboardingRowIndex(freshRows, partnerEmailRaw);
    if (freshPartnerRowIndex !== -1 && String(freshRows[freshPartnerRowIndex][8] ?? "").trim()) {
      throw new Error("Your partner just booked a slot. Refresh the page to confirm the same one.");
    }
  }

  const applicantPayload: ApplicationPayload = {
    timestamp: new Date().toISOString(),
    fullName,
    aucEmail: email,
    studentId: "",
    major: "",
    yearLevel: "",
    phone: "",
    roleAppliedFor: positionType,
    roleStepTitle: "",
    roleDescription: "",
    secondPreference: department,
    whyThisRole: "",
    whyChooseYourself: "",
    createdAt: new Date().toISOString()
  };

  const boardSlot: InterviewSlotOption = {
    id: slot.id,
    label: slot.label,
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    startDateTime: slot.startDateTime,
    endDateTime: slot.endDateTime,
    capacity: 1,
    active: true,
    reservedCount: 0,
    remaining: 1,
    full: false
  };

  const calendarEvent = await createCalendarEvent(calendarToken, applicantPayload, boardSlot);

  if (hasPartner) {
    await addCalendarEventAttendee(calendarToken, calendarEvent.calendarEventId, { email: partnerEmailRaw, displayName: partnerName });
  }

  const appendValues = [rowValues(fullName, email, calendarEvent.calendarEventId, calendarEvent.meetLink)];
  if (hasPartner && partnerRowIndex === -1) {
    appendValues.push(rowValues(partnerName, partnerEmailRaw, calendarEvent.calendarEventId, calendarEvent.meetLink));
  }

  await sheetsFetch(token, "POST", `${sheetRange(BOARD_ONBOARDING_SHEET_NAME, "A:L")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    values: appendValues
  });

  return { slotLabel: slot.label, meetLink: calendarEvent.meetLink, calendarInviteSent: true };
}

async function updateReservationInterviewStatus(
  token: string,
  payload: AdminUpdateInterviewStatusPayload
): Promise<{ updatedReservation: boolean; updatedApplication: boolean; interviewStatus: string }> {
  const rowIndex = Number(payload.reservationRowIndex);
  const interviewStatus = normalizeInterviewStatus(payload.interviewStatus);

  if (!Number.isInteger(rowIndex) || rowIndex < 2) {
    throw new Error("Invalid reservation row.");
  }

  if (!interviewStatus) {
    throw new Error("Invalid interview status.");
  }

  const reservationResponse = await sheetsFetch(token, "GET", `${sheetRange(RESERVATION_SHEET_NAME, `A${rowIndex}:N${rowIndex}`)}`);
  const reservationValues = (await reservationResponse.json()).values?.[0] ?? [];

  if (!reservationValues.length) {
    throw new Error(`No reservation found at row ${rowIndex}.`);
  }

  const aucEmail = String(reservationValues[4] ?? "").trim();

  await sheetsFetch(token, "PUT", `${sheetRange(RESERVATION_SHEET_NAME, `I${rowIndex}`)}?valueInputOption=RAW`, {
    values: [[interviewStatus]]
  });

  let updatedApplication = false;
  if (aucEmail) {
    const sheetName = await getSheetName(token);
    const applicationWidth = columnLetter(HEADERS.length);
    const applicationResponse = await sheetsFetch(token, "GET", `${sheetRange(sheetName, `A2:${applicationWidth}`)}`);
    const applicationRows = (await applicationResponse.json()).values ?? [];
    const appRowIndex = applicationRows.findIndex((row: string[]) => normalize(row[2]) === normalize(aucEmail));

    if (appRowIndex !== -1) {
      const sheetRow = appRowIndex + 2;
      await sheetsFetch(token, "PUT", `${sheetRange(sheetName, `Q${sheetRow}`)}?valueInputOption=RAW`, {
        values: [[interviewStatus]]
      });
      updatedApplication = true;
    }
  }

  return { updatedReservation: true, updatedApplication, interviewStatus };
}

async function extendReservedInterviewDurations(token: string): Promise<{
  normalizedSlots: number;
  checkedReservations: number;
  updatedCalendarEvents: number;
  skippedReservations: number;
}> {
  if (!CALENDAR_ID || !gmailConfigured()) {
    throw new Error("Google Calendar event updates are not configured.");
  }

  await ensureSlotSheets(token);
  const normalizedSlots = await normalizeSlotDurations(token);

  const [slotResponse, reservationResponse] = await Promise.all([
    sheetsFetch(token, "GET", `${sheetRange(SLOT_SHEET_NAME, "A2:I")}`),
    sheetsFetch(token, "GET", `${sheetRange(RESERVATION_SHEET_NAME, "A2:N")}`)
  ]);
  const slotRows = (await slotResponse.json()).values ?? [];
  const reservationRows = ((await reservationResponse.json()).values ?? []) as string[][];
  const slotById = new Map<string, { startDateTime: string; endDateTime: string }>();

  for (const row of slotRows) {
    const id = String(row[0] ?? "").trim();
    const date = String(row[1] ?? "").trim();
    const startTime = String(row[2] ?? "").trim();
    const endTime = addMinutesToTime(startTime, INTERVIEW_SLOT_DURATION_MINUTES);
    const startDateTime = buildLocalDateTime(date, startTime);
    const endDateTime = resolveEndDateTime(startDateTime, buildLocalDateTime(date, endTime));

    if (id && startDateTime && endDateTime) {
      slotById.set(normalize(id), { startDateTime, endDateTime });
    }
  }

  const calendarToken = await getGmailAccessToken();
  let updatedCalendarEvents = 0;
  let skippedReservations = 0;

  for (const row of reservationRows) {
    const slotId = String(row[1] ?? "").trim();
    const calendarEventId = String(row[6] ?? "").trim();
    const slot = slotById.get(normalize(slotId));

    if (!calendarEventId || !slot) {
      skippedReservations += 1;
      continue;
    }

    await updateCalendarEventEnd(calendarToken, calendarEventId, slot.endDateTime);
    updatedCalendarEvents += 1;
  }

  return {
    normalizedSlots,
    checkedReservations: reservationRows.length,
    updatedCalendarEvents,
    skippedReservations
  };
}

// sendUpdates=none everywhere in this file: the applicant, the panel, and HR
// already get one of our own emails for whatever changed. Letting Google
// Calendar send its own native notification on top is the second copy of the
// same news, from a different sender, in different words.
async function updateCalendarEventEnd(token: string, eventId: string, endDateTime: string): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${encodeURIComponent(eventId)}?sendUpdates=none`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        end: {
          dateTime: endDateTime,
          timeZone: CALENDAR_TIME_ZONE
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Calendar event update failed: ${errorText}`);
  }
}

function normalizeInterviewStatus(value: unknown): string {
  const status = String(value ?? "").trim();
  const allowedStatuses = new Set(["Not Done", "Done", "No Show", "Pending"]);
  return allowedStatuses.has(status) ? status : "";
}

async function ensureInterviewScoreHeaders(token: string, sheetName: string): Promise<void> {
  const startCol = columnLetter(HEADERS.length + 1);
  const endCol = columnLetter(HEADERS.length + INTERVIEW_SCORE_HEADERS.length);
  const response = await sheetsFetch(token, "GET", `${sheetRange(sheetName, `${startCol}1:${endCol}1`)}`);
  const current = (await response.json()).values?.[0] ?? [];
  const match = INTERVIEW_SCORE_HEADERS.every((h, i) => current[i] === h);
  if (!match) {
    await sheetsFetch(token, "PUT", `${sheetRange(sheetName, `${startCol}1:${endCol}1`)}?valueInputOption=RAW`, {
      values: [INTERVIEW_SCORE_HEADERS]
    });
  }
}

async function ensureTaskScoreHeaders(token: string, sheetName: string): Promise<void> {
  const startCol = columnLetter(HEADERS.length + INTERVIEW_SCORE_HEADERS.length + 1);
  const endCol = columnLetter(HEADERS.length + INTERVIEW_SCORE_HEADERS.length + TASK_SCORE_HEADERS.length);
  await ensureColumnCount(token, sheetName, HEADERS.length + INTERVIEW_SCORE_HEADERS.length + TASK_SCORE_HEADERS.length);
  const response = await sheetsFetch(token, "GET", `${sheetRange(sheetName, `${startCol}1:${endCol}1`)}`);
  const current = (await response.json()).values?.[0] ?? [];
  const match = TASK_SCORE_HEADERS.every((h, i) => current[i] === h);
  if (!match) {
    await sheetsFetch(token, "PUT", `${sheetRange(sheetName, `${startCol}1:${endCol}1`)}?valueInputOption=RAW`, {
      values: [TASK_SCORE_HEADERS]
    });
  }
}

async function ensureTaskNoteHeaders(token: string, sheetName: string): Promise<void> {
  const startCol = columnLetter(HEADERS.length + INTERVIEW_SCORE_HEADERS.length + TASK_SCORE_HEADERS.length + 1);
  const endCol = columnLetter(HEADERS.length + INTERVIEW_SCORE_HEADERS.length + TASK_SCORE_HEADERS.length + TASK_NOTE_HEADERS.length);
  await ensureColumnCount(token, sheetName, HEADERS.length + INTERVIEW_SCORE_HEADERS.length + TASK_SCORE_HEADERS.length + TASK_NOTE_HEADERS.length);
  const response = await sheetsFetch(token, "GET", `${sheetRange(sheetName, `${startCol}1:${endCol}1`)}`);
  const current = (await response.json()).values?.[0] ?? [];
  const match = TASK_NOTE_HEADERS.every((h, i) => current[i] === h);
  if (!match) {
    await sheetsFetch(token, "PUT", `${sheetRange(sheetName, `${startCol}1:${endCol}1`)}?valueInputOption=RAW`, {
      values: [TASK_NOTE_HEADERS]
    });
  }
}

async function loadAdminApplicants(token: string): Promise<{
  applicants: Array<Record<string, string | number>>;
}> {
  const sheetName = await getSheetName(token);
  await ensureInterviewScoreHeaders(token, sheetName);
  await ensureTaskScoreHeaders(token, sheetName);
  await ensureTaskNoteHeaders(token, sheetName);

  const totalCols = HEADERS.length + INTERVIEW_SCORE_HEADERS.length + TASK_SCORE_HEADERS.length + TASK_NOTE_HEADERS.length;
  const width = columnLetter(totalCols);
  const response = await sheetsFetch(token, "GET", `${sheetRange(sheetName, `A2:${width}`)}`);
  const rows = (await response.json()).values ?? [];

  const applicants = rows.map((row: string[], index: number) => ({
    rowIndex: index + 2,
    fullName: row[1] ?? "",
    aucEmail: row[2] ?? "",
    studentId: row[3] ?? "",
    phone: row[6] ?? "",
    roleAppliedFor: row[7] ?? "",
    whyThisRole: row[10] ?? "",
    whyChooseYourself: row[11] ?? "",
    hopeToLearn: row[12] ?? "",
    previousResalaExperience: row[13] ?? "",
    secondPreference: row[17] ?? "",
    interviewSlot: row[14] ?? "",
    status: row[16] ?? "",
    ...getTaskSubmissionState(row),
    notesUrl: row[23] ?? "",
    firstPreferenceScore: row[24] ?? "",
    secondPreferenceScore: row[25] ?? "",
    recommendedRole: row[26] ?? "",
    visionMotivationScore: row[27] ?? "",
    leadershipScore: row[28] ?? "",
    ownershipScore: row[29] ?? "",
    selfAwarenessCommitmentScore: row[30] ?? "",
    roleSpecificModulesScore: row[31] ?? "",
    finalJudgmentScore: row[32] ?? "",
    totalScore: row[33] ?? "",
    bestStrength1: row[34] ?? "",
    bestStrength2: row[35] ?? "",
    task1UnderstandingScore: row[36] ?? "",
    task1ExecutionScore: row[37] ?? "",
    task1PracticalityScore: row[38] ?? "",
    task1InitiativeScore: row[39] ?? "",
    task1ClarityScore: row[40] ?? "",
    task1TotalScore: row[41] ?? "",
    task2UnderstandingScore: row[42] ?? "",
    task2ExecutionScore: row[43] ?? "",
    task2PracticalityScore: row[44] ?? "",
    task2InitiativeScore: row[45] ?? "",
    task2ClarityScore: row[46] ?? "",
    task2TotalScore: row[47] ?? "",
    task1Notes: row[48] ?? "",
    task2Notes: row[49] ?? ""
  }));

  return { applicants };
}

/* ══════════════════════════════════════════════════════════════════════════
 * Heads recruitment dashboards
 *
 * Two audiences. A committee portal, shared by a committee's Director and
 * Vice-Director, that shows only their own applicants. And an admin view for
 * the people running this cycle, which sees everything.
 *
 * Access is by AUC email in both cases, checked live against a sheet, so a
 * roster change takes effect without a deploy. Email alone is a weak boundary
 * and is a deliberate choice: anyone who knows a director's address can read
 * their applicants. Adding an emailed one-time code later only changes the two
 * `require*` helpers below.
 * ══════════════════════════════════════════════════════════════════════════ */

type CommitteeAccess = {
  department: string;
  name: string;
  positionType: string;
  email: string;
};

/** Verifies the caller runs a committee, and returns which one. */
async function requireCommitteeAccess(token: string, email: string): Promise<CommitteeAccess> {
  const wanted = normalize(email);
  if (!wanted) throw new Error("Enter your AUC email.");

  const { entries } = await loadHierarchy(token);
  const match = entries.find(
    (entry) =>
      normalize(entry.aucEmail ?? "") === wanted &&
      Boolean(entry.department) &&
      (entry.positionType === "Director" || entry.positionType === "Vice-Director")
  );

  if (!match) throw new Error("No committee access found for this email.");

  return {
    department: match.department,
    name: String(match.name ?? "").trim(),
    positionType: String(match.positionType ?? "").trim(),
    email: String(match.aucEmail ?? "").trim()
  };
}

/**
 * Verifies the caller runs THIS recruitment cycle. Separate from the general
 * admin secret on purpose: other admins exist who should not see applications.
 */
async function requireRecruitmentAdmin(token: string, email: string): Promise<{ name: string; email: string }> {
  const wanted = normalize(email);
  if (!wanted) throw new Error("Enter your AUC email.");

  await ensureSheetTab(token, RECRUITMENT_ADMIN_SHEET_NAME);
  await ensureSheetHeaders(token, RECRUITMENT_ADMIN_SHEET_NAME, RECRUITMENT_ADMIN_HEADERS);

  const response = await sheetsFetch(token, "GET", `${sheetRange(RECRUITMENT_ADMIN_SHEET_NAME, "A2:D")}`);
  const rows = ((await response.json()).values ?? []) as string[][];

  const listed = rows.find((row) => normalize(row[1] ?? "") === wanted);
  if (listed) return { name: String(listed[0] ?? "").trim(), email: String(listed[1] ?? "").trim() };

  // Bootstrap: the sheet starts empty, so the first admin comes from the env.
  if (BOOTSTRAP_ADMIN_EMAILS.includes(wanted)) return { name: "Recruitment admin", email: email.trim() };

  throw new Error("No recruitment admin access found for this email.");
}

/**
 * May this person move, cancel, or mark this applicant's interview?
 *
 * Only the committee the applicant put FIRST. There is one interview and one
 * calendar event, run by the first-preference committee and following their
 * questions; a second-preference committee and an assigned third interviewer
 * are guests on it. Letting a guest move it means the committee actually
 * running the interview learns their slot changed from the applicant.
 *
 * Scoring, the profile, and the Meet link stay open to all of them — this
 * gate is only on the controls that change the booking itself.
 */
async function requireFirstPreferenceCommittee(
  token: string,
  email: string,
  applicantEmail: string
): Promise<CommitteeAccess> {
  const access = await requireCommitteeAccess(token, email);

  const response = await sheetsFetch(token, "GET", `${sheetRange(HEADS_APPLICATION_SHEET_NAME, "A2:H")}`);
  const rows = ((await response.json()).values ?? []) as string[][];
  const row = rows.find((entry) => normalize(String(entry[2] ?? "")) === normalize(applicantEmail));
  if (!row) throw new Error("No application found for that applicant.");

  const firstPreference = String(row[7] ?? "").trim();
  if (normalizeRole(firstPreference) !== normalizeRole(access.department)) {
    throw new Error(
      `${displayCommitteeName(firstPreference)} runs this interview, so only they can move, cancel, or mark it. ` +
        "You can still score this applicant and join the interview."
    );
  }
  return access;
}

/**
 * May this person act on this applicant, for this committee?
 *
 * Either they run the committee, or an admin assigned them to the applicant —
 * the second case is what lets a third interviewer work on someone whose
 * committee they have nothing to do with.
 */
async function authorizeApplicantAccess(
  token: string,
  email: string,
  committee: string,
  applicantEmail: string
): Promise<CommitteeAccess> {
  const access = await requireCommitteeAccess(token, email);
  if (normalizeRole(access.department) === normalizeRole(committee)) return access;

  const assignments = await readHeadsAssignments(token);
  const assigned = assignments.some(
    (entry) =>
      normalize(entry.assigneeEmail) === normalize(access.email) &&
      normalize(entry.applicantEmail) === normalize(applicantEmail) &&
      normalizeRole(entry.committee) === normalizeRole(committee)
  );
  if (!assigned) throw new Error("You do not have access to this applicant.");
  return access;
}

/**
 * The applicant's own row in a sheet keyed by email in `column` — the LAST
 * one, not the first.
 *
 * Withdrawing and reapplying is a supported flow: a withdrawal clears a row
 * rather than deleting it, specifically so someone can be rebooked later
 * without reapplying. That means more than one row can exist under the same
 * email, an old dead one and a new live one. Every dashboard read here already
 * treats the newest as current — they join reservation data through a Map
 * keyed by email, where a later `.set()` silently overwrites an earlier one.
 * A first-match `findIndex` disagreed with that, so an action taken on someone
 * who had withdrawn and rebooked landed on their old, already-cleared row
 * instead of their live one — which is exactly what made a fresh booking
 * report itself as "already withdrawn".
 */
function findCurrentRowIndex(rows: string[][], column: number, email: string): number {
  const target = normalize(email);
  for (let i = rows.length - 1; i >= 0; i--) {
    if (normalize(String(rows[i][column] ?? "")) === target) return i;
  }
  return -1;
}

/** The applicant's row in the reservations sheet, or 0 when they never booked. */
async function findReservationRow(token: string, applicantEmail: string): Promise<number> {
  const response = await sheetsFetch(token, "GET", `${sheetRange(RESERVATION_SHEET_NAME, "A2:N")}`);
  const rows = ((await response.json()).values ?? []) as string[][];
  const index = findCurrentRowIndex(rows, 4, applicantEmail);
  return index >= 0 ? index + 2 : 0;
}

/**
 * Mark an interview done, missed, or back to not done. Committees run their own
 * interview phase, so this does not need an admin.
 */
async function setHeadsInterviewStatus(
  token: string,
  payload: HeadsSetInterviewStatusPayload
): Promise<{ interviewStatus: string }> {
  const status = normalizeInterviewStatus(payload.interviewStatus);
  if (!status) throw new Error("Unknown interview status.");

  await requireFirstPreferenceCommittee(token, payload.email, payload.applicantEmail);

  const rowNumber = await findReservationRow(token, payload.applicantEmail);
  if (!rowNumber) throw new Error("This applicant has no booked interview.");

  // Column I of the reservations sheet is Interview Status.
  await sheetsFetch(
    token,
    "PUT",
    `${sheetRange(RESERVATION_SHEET_NAME, `I${rowNumber}:I${rowNumber}`)}?valueInputOption=RAW`,
    { values: [[status]] }
  );

  return { interviewStatus: status };
}

/**
 * The same reschedule the admin has, but scoped: the caller must be the
 * committee the applicant put first, and the reservation row is looked up
 * here rather than taken from the client.
 */
async function rescheduleAsCommittee(
  token: string,
  payload: HeadsCommitteeReschedulePayload
): Promise<Record<string, unknown>> {
  await requireFirstPreferenceCommittee(token, payload.email, payload.applicantEmail);

  const rowNumber = await findReservationRow(token, payload.applicantEmail);
  if (!rowNumber) throw new Error("This applicant has no booked interview.");

  return await rescheduleInterview(token, {
    mode: "admin-reschedule",
    reservationRowIndex: rowNumber,
    date: payload.date,
    startTime: payload.startTime,
    endTime: payload.endTime
  });
}

/**
 * An applicant withdrawing. This is the only thing cancelling means — somebody
 * pulling out, not a time being moved, which is what the reschedule is for. So
 * it frees the slot for another applicant, drops the calendar event, stops the
 * reminder, and marks the application Withdrawn.
 *
 * The row itself stays. Withdrawals get reversed — people change their minds —
 * and putting them back on a time is then a reschedule rather than a whole new
 * application.
 */
async function cancelHeadsInterview(
  token: string,
  payload: HeadsCancelInterviewPayload
): Promise<{
  applicantEmail: string;
  slot: string;
  deletedEvent: boolean;
  freedSlot: boolean;
  emailSent: boolean;
}> {
  const applicantEmail = String(payload.applicantEmail ?? "").trim();
  if (!applicantEmail) throw new Error("Which applicant is cancelling?");

  /*
   * Either authority is enough. The committee the applicant put first cancels
   * their own interviews; a recruitment admin cancels anyone's. A second
   * preference cannot: they are a guest on an interview somebody else runs.
   * The committee check goes first because it is the common case, and its
   * error message is the more useful one.
   */
  try {
    await requireFirstPreferenceCommittee(token, payload.email, applicantEmail);
  } catch (committeeError) {
    try {
      await requireRecruitmentAdmin(token, payload.email);
    } catch {
      throw committeeError;
    }
  }

  const rowNumber = await findReservationRow(token, applicantEmail);
  if (!rowNumber) throw new Error("This applicant has no booked interview to cancel.");

  const response = await sheetsFetch(
    token,
    "GET",
    `${sheetRange(RESERVATION_SHEET_NAME, `A${rowNumber}:N${rowNumber}`)}`
  );
  const row = (await response.json()).values?.[0] ?? [];
  const slotId = String(row[1] ?? "").trim();
  const slotLabel = String(row[2] ?? "").trim();
  const fullName = String(row[3] ?? "").trim();
  const calendarEventId = String(row[6] ?? "").trim();
  const status = String(row[8] ?? "").trim();
  // Column M: the committee they applied to, which is who gets copied.
  const roleAppliedFor = String(row[12] ?? "").trim() || String(payload.committee ?? "").trim();

  if (!slotId && (normalize(status) === "withdrawn" || normalize(status) === "cancelled")) {
    throw new Error("That application has already been withdrawn.");
  }

  let deletedEvent = false;
  if (calendarEventId) {
    try {
      deletedEvent = await deleteCalendarEvent(calendarEventId);
    } catch {
      console.error(`Failed to delete calendar event ${calendarEventId} while cancelling`);
    }
  }

  // Slot ID and Label, then the event and Meet link, then the status, then the
  // reminder columns: written separately because they are not adjacent.
  await sheetsFetch(
    token,
    "PUT",
    `${sheetRange(RESERVATION_SHEET_NAME, `B${rowNumber}:C${rowNumber}`)}?valueInputOption=RAW`,
    { values: [["", ""]] }
  );
  await sheetsFetch(
    token,
    "PUT",
    `${sheetRange(RESERVATION_SHEET_NAME, `G${rowNumber}:L${rowNumber}`)}?valueInputOption=RAW`,
    { values: [["", "", "Withdrawn", "", "", "Cancelled"]] }
  );

  let freedSlot = false;
  if (slotId) {
    // The slot row still advertises the meeting it was given; nobody should
    // join a call for an interview that is not happening.
    await clearFreedSlotCalendarFields(token, new Set([slotId]));
    await clearFreedHeadsSlot(token, slotId);
    freedSlot = true;
  }

  await clearHeadsApplicationSlot(token, applicantEmail);

  // The legacy applications sheet keeps its own copy of the slot in column O.
  try {
    const sheetName = await getSheetName(token);
    const applicationResponse = await sheetsFetch(
      token,
      "GET",
      `${sheetRange(sheetName, `A2:${columnLetter(HEADERS.length)}`)}`
    );
    const applicationRows = ((await applicationResponse.json()).values ?? []) as string[][];
    const index = applicationRows.findIndex((entry) => normalize(entry[2]) === normalize(applicantEmail));
    if (index !== -1) {
      await sheetsFetch(token, "PUT", `${sheetRange(sheetName, `O${index + 2}`)}?valueInputOption=RAW`, {
        values: [[""]]
      });
    }
  } catch (error) {
    console.error(
      `Application slot not cleared for ${applicantEmail}: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }

  let emailSent = false;
  try {
    await sendInterviewCancelledEmail({
      fullName,
      aucEmail: applicantEmail,
      slot: slotLabel,
      cc: await buildApplicantCc(token, roleAppliedFor, applicantEmail)
    });
    emailSent = gmailConfigured();
  } catch (error) {
    console.error(`Cancellation email failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  return { applicantEmail, slot: slotLabel, deletedEvent, freedSlot, emailSent };
}

/** Interview Slot (P), Slot ID (Q), Interview Status (R), Status (S). */
async function clearHeadsApplicationSlot(token: string, aucEmail: string): Promise<boolean> {
  const response = await sheetsFetch(token, "GET", `${sheetRange(HEADS_APPLICATION_SHEET_NAME, "A2:C")}`);
  const rows = ((await response.json()).values ?? []) as string[][];
  const index = findCurrentRowIndex(rows, 2, aucEmail);
  if (index === -1) return false;

  await sheetsFetch(
    token,
    "PUT",
    `${sheetRange(HEADS_APPLICATION_SHEET_NAME, `P${index + 2}:S${index + 2}`)}?valueInputOption=RAW`,
    { values: [["", "", "Withdrawn", "Withdrawn"]] }
  );
  return true;
}

/**
 * A second-preference committee saying whether it can actually staff the
 * interview an applicant already booked with their first-preference one.
 * There is no separate second-preference slot to accept or decline — this
 * only ever answers "can you make that time", and a "No" is what should send
 * HR to the assign-a-third-interviewer flow to find someone who can.
 */
async function confirmSecondPreferenceAvailability(
  token: string,
  payload: HeadsConfirmSecondAvailabilityPayload
): Promise<{
  applicantEmail: string;
  committee: string;
  available: boolean;
  setAt: string;
}> {
  const applicantEmail = String(payload.applicantEmail ?? "").trim();
  const committee = String(payload.committee ?? "").trim();
  if (!applicantEmail || !committee) {
    throw new Error("Applicant and committee are required.");
  }

  // Only the second-preference committee itself answers this — not an
  // assigned third interviewer, who is a stand-in for exactly the case this
  // exists to flag.
  const access = await requireCommitteeAccess(token, payload.email);
  if (normalizeRole(access.department) !== normalizeRole(committee)) {
    throw new Error("You do not run this committee.");
  }

  const response = await sheetsFetch(token, "GET", `${sheetRange(HEADS_APPLICATION_SHEET_NAME, "A2:C")}`);
  const rows = ((await response.json()).values ?? []) as string[][];
  const index = findCurrentRowIndex(rows, 2, applicantEmail);
  if (index === -1) throw new Error("No application found for that applicant.");

  // This applicant must actually have named this committee as their second
  // preference — otherwise a mistaken click here would silently overwrite a
  // status meant for whichever committee they really picked.
  const secondPrefColumn = columnLetter(SECOND_PREFERENCE_COMMITTEE_COLUMN + 1);
  const fullRowResponse = await sheetsFetch(
    token,
    "GET",
    `${sheetRange(HEADS_APPLICATION_SHEET_NAME, `${secondPrefColumn}${index + 2}:${secondPrefColumn}${index + 2}`)}`
  );
  const storedSecondPreference = fullRowResponse.ok ? (await fullRowResponse.json()).values?.[0]?.[0] ?? "" : "";
  if (normalizeRole(splitSecondPreference(storedSecondPreference).committee) !== normalizeRole(committee)) {
    throw new Error("This committee is not this applicant's second preference.");
  }

  const setAt = new Date().toISOString();
  const status = payload.available ? "Available" : "Not Available";
  const note = String(payload.note ?? "").trim();

  await sheetsBatchUpdateValues(token, [
    {
      range: sheetA1Range(
        HEADS_APPLICATION_SHEET_NAME,
        `${columnLetter(SECOND_PREF_AVAILABILITY_COLUMN + 1)}${index + 2}:${columnLetter(
          SECOND_PREF_AVAILABILITY_SET_AT_COLUMN + 1
        )}${index + 2}`
      ),
      values: [[status, note, setAt]]
    }
  ]);

  return { applicantEmail, committee, available: payload.available, setAt };
}

/** Deterministic, so saving a second time updates the row instead of duplicating it. */
function headsScoreId(applicantEmail: string, committee: string, interviewerEmail: string): string {
  return [normalize(applicantEmail), normalizeRole(committee), normalize(interviewerEmail)].join("::");
}

function headsAssignmentId(applicantEmail: string, committee: string, assigneeEmail: string): string {
  return [normalize(applicantEmail), normalizeRole(committee), normalize(assigneeEmail)].join("::");
}

async function ensureHeadsScoreSheet(token: string): Promise<void> {
  await ensureSheetTab(token, HEADS_SCORE_SHEET_NAME);
  await ensureSheetHeaders(token, HEADS_SCORE_SHEET_NAME, HEADS_SCORE_HEADERS);
}

async function ensureHeadsClaimSheet(token: string): Promise<void> {
  await ensureSheetTab(token, HEADS_CLAIM_SHEET_NAME);
  await ensureSheetHeaders(token, HEADS_CLAIM_SHEET_NAME, HEADS_CLAIM_HEADERS);
}

function claimFromRow(row: string[], rowIndex: number): HeadsClaim {
  return {
    applicantEmail: String(row[0] ?? "").trim(),
    applicantName: String(row[1] ?? "").trim(),
    committee: String(row[2] ?? "").trim(),
    headRole: String(row[3] ?? "").trim(),
    headId: String(row[4] ?? "").trim(),
    position: String(row[5] ?? "").trim() || "Member",
    status: String(row[6] ?? "").trim(),
    claimedBy: String(row[7] ?? "").trim(),
    claimedAt: String(row[8] ?? "").trim(),
    submittedBy: String(row[9] ?? "").trim(),
    submittedAt: String(row[10] ?? "").trim(),
    rowIndex
  };
}

async function readHeadsClaims(token: string): Promise<HeadsClaim[]> {
  await ensureHeadsClaimSheet(token);
  const width = columnLetter(HEADS_CLAIM_HEADERS.length);
  const response = await sheetsFetch(token, "GET", `${sheetRange(HEADS_CLAIM_SHEET_NAME, `A2:${width}`)}`);
  const rows = ((await response.json()).values ?? []) as string[][];
  return rows
    .map((row, i) => claimFromRow(row, i + 2))
    .filter((claim) => claim.applicantEmail && claim.committee && claim.status !== "Declined");
}

/*
 * Placements made before claims existed live only in the Accepted* columns.
 * Seeding them across on first read means a committee's diagram survives the
 * switch instead of appearing to have been wiped — and it runs once, because
 * afterwards the claim exists and is skipped.
 */
async function backfillClaimsFromApplications(token: string, applicationRows: string[][]): Promise<void> {
  const existing = await readHeadsClaims(token);
  const seen = new Set(existing.map((c) => `${normalize(c.applicantEmail)}|${normalizeRole(c.committee)}`));
  const emailColumn = HEADS_APPLICATION_HEADERS.indexOf("AUC Email");
  const nameColumn = HEADS_APPLICATION_HEADERS.indexOf("Full Name");

  const missing: string[][] = [];
  for (const row of applicationRows) {
    const status = String(row[ACCEPTED_COLUMN] ?? "").trim();
    if (!["Draft", "Submitted", "Yes"].includes(status)) continue;
    const applicantEmail = String(row[emailColumn] ?? "").trim();
    const committee = String(row[ACCEPTED_COMMITTEE_COLUMN] ?? "").trim();
    if (!applicantEmail || !committee) continue;
    if (seen.has(`${normalize(applicantEmail)}|${normalizeRole(committee)}`)) continue;

    const headRole = String(row[ACCEPTED_ROLE_COLUMN] ?? "").trim();
    const head = headsForHierarchy(committee).find((h) => normalizeRole(h.name) === normalizeRole(headRole));
    missing.push([
      applicantEmail,
      String(row[nameColumn] ?? "").trim(),
      committee,
      headRole,
      head?.id ?? "",
      String(row[ACCEPTED_POSITION_COLUMN] ?? "").trim() || "Member",
      status === "Yes" ? "Approved" : status,
      String(row[ACCEPTED_BY_COLUMN] ?? "").trim(),
      String(row[ACCEPTED_AT_COLUMN] ?? "").trim(),
      String(row[SUBMITTED_BY_COLUMN] ?? "").trim(),
      String(row[SUBMITTED_AT_COLUMN] ?? "").trim()
    ]);
  }

  if (!missing.length) return;
  const width = columnLetter(HEADS_CLAIM_HEADERS.length);
  await sheetsFetch(
    token,
    "POST",
    `${sheetRange(HEADS_CLAIM_SHEET_NAME, `A:${width}`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { values: missing }
  );
}

/** Adds or replaces one committee's claim on one applicant. */
async function upsertHeadsClaim(
  token: string,
  claim: Omit<HeadsClaim, "rowIndex">
): Promise<void> {
  await ensureHeadsClaimSheet(token);
  const width = columnLetter(HEADS_CLAIM_HEADERS.length);
  const response = await sheetsFetch(token, "GET", `${sheetRange(HEADS_CLAIM_SHEET_NAME, `A2:${width}`)}`);
  const rows = ((await response.json()).values ?? []) as string[][];
  const values = [
    claim.applicantEmail,
    claim.applicantName,
    claim.committee,
    claim.headRole,
    claim.headId,
    claim.position,
    claim.status,
    claim.claimedBy,
    claim.claimedAt,
    claim.submittedBy,
    claim.submittedAt
  ];

  const at = rows.findIndex(
    (row) =>
      normalize(String(row[0] ?? "")) === normalize(claim.applicantEmail) &&
      normalizeRole(String(row[2] ?? "")) === normalizeRole(claim.committee)
  );

  if (at === -1) {
    await sheetsFetch(
      token,
      "POST",
      `${sheetRange(HEADS_CLAIM_SHEET_NAME, `A:${width}`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      { values: [values] }
    );
    return;
  }
  await sheetsFetch(
    token,
    "PUT",
    `${sheetRange(HEADS_CLAIM_SHEET_NAME, `A${at + 2}:${width}${at + 2}`)}?valueInputOption=RAW`,
    { values: [values] }
  );
}

/** Drops one committee's claim entirely. */
async function removeHeadsClaim(token: string, applicantEmail: string, committee: string): Promise<void> {
  await ensureHeadsClaimSheet(token);
  const width = columnLetter(HEADS_CLAIM_HEADERS.length);
  const response = await sheetsFetch(token, "GET", `${sheetRange(HEADS_CLAIM_SHEET_NAME, `A2:${width}`)}`);
  const rows = ((await response.json()).values ?? []) as string[][];
  const at = rows.findIndex(
    (row) =>
      normalize(String(row[0] ?? "")) === normalize(applicantEmail) &&
      normalizeRole(String(row[2] ?? "")) === normalizeRole(committee)
  );
  if (at === -1) return;
  await sheetsFetch(
    token,
    "PUT",
    `${sheetRange(HEADS_CLAIM_SHEET_NAME, `A${at + 2}:${width}${at + 2}`)}?valueInputOption=RAW`,
    { values: [["", "", "", "", "", "", "", "", "", "", ""]] }
  );
}

async function ensureHeadsWaitlistSheet(token: string): Promise<void> {
  await ensureSheetTab(token, HEADS_WAITLIST_SHEET_NAME);
  await ensureSheetHeaders(token, HEADS_WAITLIST_SHEET_NAME, HEADS_WAITLIST_HEADERS);
}

/** Every backup row, ranked, for whoever is reading the diagram. */
async function readHeadsWaitlist(
  token: string
): Promise<Array<{ committee: string; headRole: string; rank: number; applicantEmail: string; applicantName: string }>> {
  await ensureHeadsWaitlistSheet(token);
  const width = columnLetter(HEADS_WAITLIST_HEADERS.length);
  const response = await sheetsFetch(token, "GET", `${sheetRange(HEADS_WAITLIST_SHEET_NAME, `A2:${width}`)}`);
  const rows = ((await response.json()).values ?? []) as string[][];
  return rows
    .filter((row) => String(row[3] ?? "").trim())
    .map((row) => ({
      committee: String(row[0] ?? "").trim(),
      headRole: String(row[1] ?? "").trim(),
      rank: Number(row[2] ?? 0) || 0,
      applicantEmail: String(row[3] ?? "").trim(),
      applicantName: String(row[4] ?? "").trim()
    }))
    .sort((a, b) => a.rank - b.rank);
}

/**
 * Rewrites one role's backup list wholesale. The client sends the order it
 * wants, which is simpler to reason about than patching individual ranks and
 * makes reordering and removal the same operation.
 */
async function setHeadsWaitlist(
  token: string,
  payload: HeadsSetWaitlistPayload
): Promise<{ committee: string; headName: string; waitlist: Array<{ applicantEmail: string; applicantName: string }> }> {
  const committee = String(payload.committee ?? "").trim();
  const headId = String(payload.headId ?? "").trim();
  if (!committee || !headId) throw new Error("Committee and role are both required.");

  const access = await requireCommitteeAccess(token, payload.email);
  if (normalizeRole(access.department) !== normalizeRole(committee)) {
    throw new Error(`${displayCommitteeName(access.department)} does not run ${displayCommitteeName(committee)}'s diagram.`);
  }

  const head = headsForHierarchy(committee).find((h) => h.id === headId);
  if (!head) throw new Error(`${displayCommitteeName(committee)} has no role called that.`);

  const wanted = (Array.isArray(payload.applicantEmails) ? payload.applicantEmails : [])
    .map((e) => String(e ?? "").trim())
    .filter(Boolean);

  // Names come from the applications sheet rather than the client, so a
  // backup list cannot be made to show a name the applicant never gave.
  const width = columnLetter(HEADS_APPLICATION_HEADERS.length);
  const appsResponse = await sheetsFetch(token, "GET", `${sheetRange(HEADS_APPLICATION_SHEET_NAME, `A2:${width}`)}`);
  const appRows = ((await appsResponse.json()).values ?? []) as string[][];
  const emailColumn = HEADS_APPLICATION_HEADERS.indexOf("AUC Email");
  const nameColumn = HEADS_APPLICATION_HEADERS.indexOf("Full Name");
  const nameOf = (email: string) => {
    const i = findCurrentRowIndex(appRows, emailColumn, email);
    return i === -1 ? "" : String(appRows[i][nameColumn] ?? "").trim();
  };

  await ensureHeadsWaitlistSheet(token);
  const listWidth = columnLetter(HEADS_WAITLIST_HEADERS.length);
  const current = await sheetsFetch(token, "GET", `${sheetRange(HEADS_WAITLIST_SHEET_NAME, `A2:${listWidth}`)}`);
  const rows = ((await current.json()).values ?? []) as string[][];

  // Everything except this committee+role, then this role's new order appended.
  const keep = rows.filter(
    (row) =>
      String(row[3] ?? "").trim() &&
      !(committeeKey(row[0]) === committeeKey(committee) &&
        normalizeRole(String(row[1] ?? "")) === normalizeRole(head.name))
  );
  const addedAt = new Date().toISOString();
  const mine = wanted.map((email, i) => [
    displayCommitteeName(committee),
    head.name,
    String(i + 1),
    email,
    nameOf(email),
    access.email,
    addedAt
  ]);

  await sheetsFetch(token, "POST", `${sheetRange(HEADS_WAITLIST_SHEET_NAME, `A2:${listWidth}`)}:clear`, {});
  const all = [...keep, ...mine];
  if (all.length) {
    await sheetsFetch(
      token,
      "POST",
      `${sheetRange(HEADS_WAITLIST_SHEET_NAME, `A:${listWidth}`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      { values: all }
    );
  }

  return {
    committee: displayCommitteeName(committee),
    headName: head.name,
    waitlist: wanted.map((email) => ({ applicantEmail: email, applicantName: nameOf(email) }))
  };
}

async function ensureHeadsAssignmentSheet(token: string): Promise<void> {
  await ensureSheetTab(token, HEADS_ASSIGNMENT_SHEET_NAME);
  await ensureSheetHeaders(token, HEADS_ASSIGNMENT_SHEET_NAME, HEADS_ASSIGNMENT_HEADERS);
}

type HeadsScoreRow = {
  rowNumber: number;
  scoreId: string;
  applicantEmail: string;
  committee: string;
  headRole: string;
  preference: string;
  interviewerEmail: string;
  interviewerName: string;
  interviewerPosition: string;
  scores: Record<string, number>;
  total: string;
  notes: string;
  taskLink: string;
  updatedAt: string;
};

async function readHeadsScores(token: string): Promise<HeadsScoreRow[]> {
  await ensureHeadsScoreSheet(token);
  const response = await sheetsFetch(token, "GET", `${sheetRange(HEADS_SCORE_SHEET_NAME, "A2:N")}`);
  const rows = ((await response.json()).values ?? []) as string[][];

  return rows.map((row, index) => {
    let scores: Record<string, number> = {};
    try {
      scores = row[9] ? JSON.parse(String(row[9])) : {};
    } catch {
      scores = {}; // A hand-edited cell must not take the whole portal down.
    }
    return {
      rowNumber: index + 2,
      scoreId: String(row[0] ?? ""),
      applicantEmail: String(row[1] ?? ""),
      committee: String(row[3] ?? ""),
      headRole: String(row[4] ?? ""),
      preference: String(row[5] ?? ""),
      interviewerEmail: String(row[6] ?? ""),
      interviewerName: String(row[7] ?? ""),
      interviewerPosition: String(row[8] ?? ""),
      scores,
      total: String(row[10] ?? ""),
      notes: String(row[11] ?? ""),
      taskLink: String(row[12] ?? ""),
      updatedAt: String(row[13] ?? "")
    };
  });
}

async function readHeadsAssignments(token: string): Promise<
  Array<{ applicantEmail: string; committee: string; headRole: string; assigneeEmail: string; assigneeName: string; assignedBy: string; assignedAt: string; note: string }>
> {
  await ensureHeadsAssignmentSheet(token);
  const response = await sheetsFetch(token, "GET", `${sheetRange(HEADS_ASSIGNMENT_SHEET_NAME, "A2:I")}`);
  const rows = ((await response.json()).values ?? []) as string[][];

  return rows.map((row) => ({
    applicantEmail: String(row[1] ?? ""),
    committee: String(row[2] ?? ""),
    headRole: String(row[3] ?? ""),
    assigneeEmail: String(row[4] ?? ""),
    assigneeName: String(row[5] ?? ""),
    assignedBy: String(row[6] ?? ""),
    assignedAt: String(row[7] ?? ""),
    note: String(row[8] ?? "")
  }));
}

/**
 * An applicant handing in their task before the interview.
 *
 * The email they applied with is the whole key: no password, because there is
 * nothing here worth guarding behind one and an applicant who cannot hand their
 * work in is a worse outcome than an applicant whose link someone overwrote.
 * A submission can be replaced right up to the deadline — people fix things.
 *
 * Only rows for a committee that actually sets a submitted task are accepted,
 * so this cannot become a side door for writing to any application row.
 */
async function submitHeadsTask(
  token: string,
  payload: HeadsTaskSubmissionPayload
): Promise<{ committee: string; headName: string; interviewSlot: string; taskLink: string; submittedAt: string }> {
  const email = String(payload.aucEmail ?? "").trim();
  const link = String(payload.taskLink ?? "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter the AUC email you applied with.");
  }
  if (!/^https?:\/\/\S+$/i.test(link)) {
    throw new Error("Paste a link that starts with http:// or https:// — Google Drive, Canva, or a PDF.");
  }

  await ensureSheetTab(token, HEADS_APPLICATION_SHEET_NAME);
  await ensureSheetHeaders(token, HEADS_APPLICATION_SHEET_NAME, HEADS_APPLICATION_HEADERS);

  const width = columnLetter(HEADS_APPLICATION_HEADERS.length);
  const [response, reservationResponse] = await Promise.all([
    sheetsFetch(token, "GET", `${sheetRange(HEADS_APPLICATION_SHEET_NAME, `A2:${width}`)}`),
    sheetsFetch(token, "GET", `${sheetRange(RESERVATION_SHEET_NAME, "A2:N")}`)
  ]);
  const rows = ((await response.json()).values ?? []) as string[][];
  const reservationRows = ((await reservationResponse.json()).values ?? []) as string[][];

  const index = findCurrentRowIndex(rows, 2, email);
  if (index < 0) {
    throw new Error("We could not find an application under that email. Use the address you applied with.");
  }

  const row = rows[index];
  const committee = String(row[7] ?? "");
  const task = HEADS_TASKS[normalizeRole(committee)];
  if (!task?.submissionUrl) {
    throw new Error(`${displayCommitteeName(committee)} does not collect a task before the interview.`);
  }

  const submittedAt = new Date().toISOString();
  await sheetsBatchUpdateValues(token, [
    {
      range: sheetA1Range(
        HEADS_APPLICATION_SHEET_NAME,
        `${columnLetter(TASK_LINK_COLUMN + 1)}${index + 2}:${columnLetter(TASK_SUBMITTED_AT_COLUMN + 1)}${index + 2}`
      ),
      values: [[link, submittedAt]]
    }
  ]);

  // The booking lives on the reservation row; the application row only holds a
  // copy from submission time, which a reschedule never rewrites.
  const reservation = reservationRows.find((res) => normalize(String(res[4] ?? "")) === normalize(email));

  return {
    committee: displayCommitteeName(committee),
    headName: String(row[9] ?? ""),
    interviewSlot: String(reservation?.[2] ?? row[15] ?? ""),
    taskLink: link,
    submittedAt
  };
}

/**
 * Every heads-cycle applicant, read from the heads tab so each answer arrives
 * with the question that produced it. Interview status is joined in from the
 * reservations sheet, which is where rescheduling and no-shows are recorded.
 */
async function readHeadsApplicants(token: string): Promise<Array<Record<string, unknown>>> {
  await ensureSheetTab(token, HEADS_APPLICATION_SHEET_NAME);
  await ensureSheetHeaders(token, HEADS_APPLICATION_SHEET_NAME, HEADS_APPLICATION_HEADERS);

  const width = columnLetter(HEADS_APPLICATION_HEADERS.length);
  const [applicationResponse, reservationResponse] = await Promise.all([
    sheetsFetch(token, "GET", `${sheetRange(HEADS_APPLICATION_SHEET_NAME, `A2:${width}`)}`),
    sheetsFetch(token, "GET", `${sheetRange(RESERVATION_SHEET_NAME, "A2:N")}`)
  ]);

  const rows = ((await applicationResponse.json()).values ?? []) as string[][];
  const reservationRows = ((await reservationResponse.json()).values ?? []) as string[][];

  const statusByEmail = new Map<string, string>();
  const meetByEmail = new Map<string, string>();
  const reservationRowByEmail = new Map<string, number>();
  /*
   * The booking itself lives on the reservation row: that is what a reschedule
   * rewrites, what the calendar event follows, and what the reminder job reads.
   * The application row only ever held a copy taken at submission time, so
   * whenever the two disagree the reservation is right and the copy is stale.
   */
  const slotByEmail = new Map<string, { label: string; id: string }>();
  reservationRows.forEach((row, index) => {
    const resEmail = normalize(String(row[4] ?? ""));
    if (!resEmail) return;
    const status = String(row[8] ?? "").trim();
    if (status) statusByEmail.set(resEmail, status);
    const meet = String(row[7] ?? "").trim();
    if (meet) meetByEmail.set(resEmail, meet);
    const slotLabel = String(row[2] ?? "").trim();
    const slotId = String(row[1] ?? "").trim();
    if (slotLabel || slotId) slotByEmail.set(resEmail, { label: slotLabel, id: slotId });
    reservationRowByEmail.set(resEmail, index + 2);
  });

  const FIRST_QUESTION_COLUMN = 20;

  return rows
    .filter((row) => String(row[2] ?? "").trim())
    .map((row) => {
      const answers: Array<{ prompt: string; answer: string }> = [];
      for (let i = 0; i < HEADS_APPLICATION_QUESTION_SLOTS; i += 1) {
        const prompt = String(row[FIRST_QUESTION_COLUMN + i * 2] ?? "").trim();
        const answer = String(row[FIRST_QUESTION_COLUMN + i * 2 + 1] ?? "").trim();
        if (prompt || answer) answers.push({ prompt, answer });
      }

      const email = String(row[2] ?? "");
      const booked = slotByEmail.get(normalize(email));
      return {
        timestamp: String(row[0] ?? ""),
        fullName: String(row[1] ?? ""),
        email,
        studentId: String(row[3] ?? ""),
        major: String(row[4] ?? ""),
        yearLevel: String(row[5] ?? ""),
        phone: String(row[6] ?? ""),
        roleAppliedFor: String(row[7] ?? ""),
        committeeId: String(row[8] ?? ""),
        headName: String(row[9] ?? ""),
        headId: String(row[10] ?? ""),
        secondPreference: String(row[11] ?? ""),
        secondHeadName: String(row[12] ?? ""),
        secondCommitteeId: String(row[13] ?? ""),
        secondHeadId: String(row[14] ?? ""),
        interviewSlot: booked?.label || String(row[15] ?? ""),
        interviewSlotId: booked?.id || String(row[16] ?? ""),
        status: String(row[18] ?? ""),
        createdAt: String(row[19] ?? ""),
        answers,
        // What the applicant handed in, where their committee collects a task
        // before the interview. Blank for every other committee.
        taskLink: String(row[TASK_LINK_COLUMN] ?? ""),
        taskSubmittedAt: String(row[TASK_SUBMITTED_AT_COLUMN] ?? ""),
        // Whether the second-preference committee can staff the interview
        // already booked with the first-preference one. Blank until they say.
        secondPreferenceAvailability: String(row[SECOND_PREF_AVAILABILITY_COLUMN] ?? ""),
        secondPreferenceAvailabilityNote: String(row[SECOND_PREF_AVAILABILITY_NOTE_COLUMN] ?? ""),
        secondPreferenceAvailabilitySetAt: String(row[SECOND_PREF_AVAILABILITY_SET_AT_COLUMN] ?? ""),
        // Set once a committee has drafted or confirmed this applicant onto its
        // team diagram — which head-role team, Head or Member, and which
        // status: "" (unplaced), "Draft" (on the diagram, not emailed yet), or
        // "Yes" (diagram confirmed, welcome email sent).
        acceptedStatus: String(row[ACCEPTED_COLUMN] ?? "").trim(),
        accepted: String(row[ACCEPTED_COLUMN] ?? "").trim() === "Yes",
        acceptedDraft: String(row[ACCEPTED_COLUMN] ?? "").trim() === "Draft",
        acceptedRole: String(row[ACCEPTED_ROLE_COLUMN] ?? ""),
        acceptedPosition: String(row[ACCEPTED_POSITION_COLUMN] ?? ""),
        acceptedCommittee: String(row[ACCEPTED_COMMITTEE_COLUMN] ?? ""),
        acceptedBy: String(row[ACCEPTED_BY_COLUMN] ?? ""),
        acceptedAt: String(row[ACCEPTED_AT_COLUMN] ?? ""),
        // Whether the applicant's own first-preference committee has said it
        // does not want them, freeing whoever else drafted them to confirm.
        firstPreferenceReleased: String(row[RELEASED_COLUMN] ?? "").trim() === "Yes",
        firstPreferenceReleasedBy: String(row[RELEASED_BY_COLUMN] ?? ""),
        firstPreferenceReleasedAt: String(row[RELEASED_AT_COLUMN] ?? ""),
        // Who on the committee confirmed the diagram and sent it to the admin
        // for approval — distinct from acceptedBy/acceptedAt, which stays
        // whoever originally drafted the placement.
        submittedBy: String(row[SUBMITTED_BY_COLUMN] ?? ""),
        submittedAt: String(row[SUBMITTED_AT_COLUMN] ?? ""),
        // The post-acceptance checklist an applicant fills in themselves,
        // once Accepted is "Yes" — separate from anything a committee or
        // admin does.
        roleConfirmed: String(row[ROLE_CONFIRMED_COLUMN] ?? "").trim() === "Yes",
        roleConfirmedAt: String(row[ROLE_CONFIRMED_AT_COLUMN] ?? ""),
        videoNotes: String(row[VIDEO_NOTES_COLUMN] ?? ""),
        videoNotesAt: String(row[VIDEO_NOTES_AT_COLUMN] ?? ""),
        interviewStatus: statusByEmail.get(normalize(email)) ?? String(row[17] ?? ""),
        meetLink: meetByEmail.get(normalize(email)) ?? "",
        reservationRowIndex: reservationRowByEmail.get(normalize(email)) ?? 0
      };
    });
}

/**
 * The committee portal payload: this committee's first preferences, the people
 * who put it second, and anything the caller was assigned as third interviewer.
 */
async function loadCommitteePortal(
  token: string,
  email: string
): Promise<{
  access: CommitteeAccess;
  firstPreference: Array<Record<string, unknown>>;
  secondPreference: Array<Record<string, unknown>>;
  assigned: Array<Record<string, unknown>>;
  waitlist: Array<{ committee: string; headRole: string; rank: number; applicantEmail: string; applicantName: string }>;
  claims: HeadsClaim[];
}> {
  const access = await requireCommitteeAccess(token, email);
  const [applicants, scores, assignments, waitlist, claims] = await Promise.all([
    readHeadsApplicants(token),
    readHeadsScores(token),
    readHeadsAssignments(token),
    readHeadsWaitlist(token),
    readHeadsClaims(token)
  ]);

  const department = normalizeRole(access.department);
  const me = normalize(access.email);

  // A director sees every score on their own applicants, including their
  // vice-director's — they share one portal and are expected to compare.
  const decorate = (applicant: Record<string, unknown>, committee: string, preference: string) => ({
    ...applicant,
    committee,
    preference,
    scores: scores.filter(
      (score) =>
        normalize(score.applicantEmail) === normalize(String(applicant.email ?? "")) &&
        normalizeRole(score.committee) === normalizeRole(committee)
    )
  });

  const firstPreference = applicants
    .filter((a) => normalizeRole(String(a.roleAppliedFor ?? "")) === department)
    .map((a) => decorate(a, String(a.roleAppliedFor ?? ""), "First"));

  /*
   * "Second Preference Committee" is stored as "Committee — Head" in one cell
   * (see `splitSecondPreference`), so matching it against a bare department
   * name needs the split first — comparing the combined string never matches,
   * which is why this tab was silently empty for every committee. The split
   * committee/head also replace the applicant's first-preference committeeId
   * and headId for this row, or the rubric and task lookups below would grade
   * the second-preference committee's applicant against the first committee's
   * rubric.
   */
  const secondPreference = applicants
    .filter((a) => normalizeRole(splitSecondPreference(a.secondPreference).committee) === department)
    .filter((a) => normalizeRole(String(a.roleAppliedFor ?? "")) !== department)
    .map((a) => {
      const { committee, head } = splitSecondPreference(a.secondPreference);
      return decorate(
        {
          ...a,
          committee,
          committeeId: String(a.secondCommitteeId ?? "") || String(a.committeeId ?? ""),
          headId: String(a.secondHeadId ?? "") || "",
          headName: head || String(a.headName ?? "")
        },
        committee,
        "Second"
      );
    });

  const myAssignments = assignments.filter((entry) => normalize(entry.assigneeEmail) === me);
  const assigned = myAssignments
    .map((entry) => {
      const applicant = applicants.find((a) => normalize(String(a.email ?? "")) === normalize(entry.applicantEmail));
      if (!applicant) return null;
      return { ...decorate(applicant, entry.committee, "Assigned"), assignmentNote: entry.note };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;

  return { access, firstPreference, secondPreference, assigned, waitlist, claims };
}

/**
 * Upsert one interviewer's score for one applicant in one committee. Keyed on
 * Score ID so a director revising their own numbers overwrites their row and
 * never touches their vice-director's.
 */
async function saveHeadsScore(
  token: string,
  payload: HeadsSaveScorePayload
): Promise<{ scoreId: string; updated: boolean }> {
  const committee = String(payload.committee ?? "").trim();
  const applicantEmail = String(payload.applicantEmail ?? "").trim();
  if (!committee || !applicantEmail) throw new Error("Applicant and committee are required.");

  /*
   * The caller may score a committee they do not run — that is the whole point
   * of a third interviewer — so committee access alone is not enough. Either
   * they run this committee, an admin assigned them to this applicant, or they
   * are on the recruitment board, who sit in on interviews across committees
   * and would otherwise have to be assigned to every applicant one at a time.
   */
  let access: CommitteeAccess;
  try {
    access = await authorizeApplicantAccess(token, payload.email, committee, applicantEmail);
  } catch (committeeError) {
    let admin: { name: string; email: string };
    try {
      admin = await requireRecruitmentAdmin(token, payload.email);
    } catch {
      throw committeeError;
    }
    access = {
      department: committee,
      name: admin.name,
      positionType: "Recruitment board",
      email: admin.email
    };
  }

  const applicants = await readHeadsApplicants(token);
  const applicant = applicants.find((a) => normalize(String(a.email ?? "")) === normalize(applicantEmail));
  if (!applicant) throw new Error("Applicant not found.");

  const scoreId = headsScoreId(applicantEmail, committee, access.email);
  const row = [
    scoreId,
    applicantEmail,
    String(applicant.fullName ?? ""),
    committee,
    String(payload.headRole ?? ""),
    String(payload.preference ?? ""),
    access.email,
    access.name,
    access.positionType,
    JSON.stringify(payload.scores ?? {}),
    payload.total === undefined || payload.total === null ? "" : String(payload.total),
    String(payload.notes ?? ""),
    String(payload.taskLink ?? ""),
    new Date().toISOString()
  ];

  const existing = await readHeadsScores(token);
  const match = existing.find((entry) => entry.scoreId === scoreId);

  if (match) {
    await sheetsFetch(
      token,
      "PUT",
      `${sheetRange(HEADS_SCORE_SHEET_NAME, `A${match.rowNumber}:N${match.rowNumber}`)}?valueInputOption=RAW`,
      { values: [row] }
    );
    return { scoreId, updated: true };
  }

  await sheetsFetch(
    token,
    "POST",
    `${sheetRange(HEADS_SCORE_SHEET_NAME, "A:N")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { values: [row] }
  );
  return { scoreId, updated: false };
}

/**
 * Move heads-cycle rows out of the director cycle's tab and into the heads tab.
 *
 * Both cycles share the legacy tab, so a row belongs to this cycle only if its
 * booked slot is one of the heads slots — a timestamp cut-off would be guesswork
 * and could drag a director-cycle applicant across.
 *
 * The legacy tab is never modified. Rows are copied, and an applicant already
 * present in the heads tab is skipped, so running this twice is harmless.
 */
async function migrateLegacyApplications(
  token: string,
  payload: HeadsMigrateLegacyPayload
): Promise<{
  dryRun: boolean;
  legacyRows: number;
  headsCycleRows: number;
  alreadyMigrated: number;
  migrated: number;
  samples: Array<Record<string, string>>;
  unmatched: Array<Record<string, string>>;
  suspicious: Array<Record<string, string>>;
  timestampRange: { earliest: string; latest: string };
}> {
  await requireRecruitmentAdmin(token, payload.email);
  const dryRun = payload.dryRun !== false;

  const sheetName = await getSheetName(token);
  await ensureSheetTab(token, HEADS_APPLICATION_SHEET_NAME);
  await ensureSheetHeaders(token, HEADS_APPLICATION_SHEET_NAME, HEADS_APPLICATION_HEADERS);
  await ensureHeadsSlotSheet(token);

  const [legacyResponse, headsSlotResponse, headsResponse] = await Promise.all([
    sheetsFetch(token, "GET", `${sheetRange(sheetName, `A2:${columnLetter(HEADERS.length)}`)}`),
    sheetsFetch(token, "GET", `${sheetRange(HEADS_SLOT_SHEET_NAME, "A2:K")}`),
    sheetsFetch(
      token,
      "GET",
      `${sheetRange(HEADS_APPLICATION_SHEET_NAME, `A2:${columnLetter(HEADS_APPLICATION_HEADERS.length)}`)}`
    )
  ]);

  const legacyRows = ((await legacyResponse.json()).values ?? []) as string[][];
  const headsSlotRows = ((await headsSlotResponse.json()).values ?? []) as string[][];
  const headsRows = ((await headsResponse.json()).values ?? []) as string[][];

  const headsSlotIds = new Set(headsSlotRows.map((row) => normalize(row[0])).filter(Boolean));
  const headsSlotLabels = new Set(headsSlotRows.map((row) => normalize(row[5])).filter(Boolean));
  const alreadyPresent = new Set(headsRows.map((row) => normalize(row[2])).filter(Boolean));

  const samples: Array<Record<string, string>> = [];
  const unmatched: Array<Record<string, string>> = [];
  const suspicious: Array<Record<string, string>> = [];
  const timestamps: string[] = [];
  const toAppend: string[][] = [];
  let headsCycleRows = 0;
  let alreadyMigrated = 0;

  for (const row of legacyRows) {
    const email = String(row[2] ?? "").trim();
    if (!email) continue;

    const timestamp = String(row[0] ?? "").trim();
    if (timestamp) timestamps.push(timestamp);

    const slotLabel = String(row[14] ?? "").trim();

    // Anything without a slot, or dated on or after the heads cycle opened,
    // needs a human look even if the slot match says director cycle.
    if (!slotLabel || timestamp >= "2026-08-01") {
      suspicious.push({ email, role: String(row[7] ?? ""), slot: slotLabel || "(none)", timestamp });
    }
    const isHeadsCycle =
      headsSlotLabels.has(normalize(slotLabel)) || headsSlotIds.has(normalize(slotLabel));

    if (!isHeadsCycle) {
      if (unmatched.length < 8) {
        unmatched.push({ email, role: String(row[7] ?? ""), slot: slotLabel, timestamp: String(row[0] ?? "") });
      }
      continue;
    }

    headsCycleRows += 1;
    const existingRowNumber = headsRows.findIndex((entry) => normalize(entry[2] ?? "") === normalize(email));
    if (existingRowNumber >= 0 && !payload.relabel) {
      alreadyMigrated += 1;
      continue;
    }

    /*
     * The legacy tab lost which prompt produced which answer, so the four fixed
     * columns are restored under their own headings and the packed column is
     * split back on the blank line the client used to join it.
     */
    const answers: Array<{ prompt: string; answer: string }> = [];
    const realPrompts = payload.prompts?.[normalizeRole(String(row[7] ?? ""))] ?? [];
    const promptFor = (index: number, fallback: string) => realPrompts[index]?.trim() || fallback;

    const fixed: Array<[string, string]> = [
      [promptFor(0, "Why this role"), String(row[10] ?? "")],
      [promptFor(1, "Why choose yourself"), String(row[11] ?? "")],
      [promptFor(2, "What do you hope to learn"), String(row[12] ?? "")]
    ];
    for (const [prompt, answer] of fixed) {
      if (answer.trim()) answers.push({ prompt, answer: answer.trim() });
    }

    const packed = String(row[13] ?? "").trim();
    if (packed) {
      for (const block of packed.split(/\n\s*\n/)) {
        const lines = block.split("\n");
        if (lines.length > 1) {
          answers.push({ prompt: lines[0].trim(), answer: lines.slice(1).join("\n").trim() });
        } else {
          answers.push({ prompt: promptFor(3, "Previous Resala experience"), answer: block.trim() });
        }
      }
    }

    const questionCells: string[] = [];
    for (let i = 0; i < HEADS_APPLICATION_QUESTION_SLOTS; i += 1) {
      const entry = answers[i];
      questionCells.push(entry ? entry.prompt : "", entry ? entry.answer : "");
    }

    const headName = String(row[8] ?? "").split("\u00b7").pop()?.trim() ?? "";

    toAppend.push([
      String(row[0] ?? ""),
      String(row[1] ?? ""),
      email,
      String(row[3] ?? ""),
      String(row[4] ?? ""),
      String(row[5] ?? ""),
      String(row[6] ?? ""),
      String(row[7] ?? ""),
      "",
      headName,
      "",
      String(row[17] ?? ""),
      "",
      "",
      "",
      slotLabel,
      "",
      "Scheduled",
      "Submitted (migrated)",
      String(row[15] ?? ""),
      ...questionCells
    ]);

    if (samples.length < 8) {
      samples.push({ email, name: String(row[1] ?? ""), role: String(row[7] ?? ""), head: headName, slot: slotLabel, answers: String(answers.length) });
    }
  }

  if (!dryRun && toAppend.length) {
    if (payload.relabel) {
      // Rewrite in place so the relabel cannot create a duplicate applicant.
      for (const row of toAppend) {
        const index = headsRows.findIndex((entry) => normalize(entry[2] ?? "") === normalize(String(row[2])));
        const rowNumber = index >= 0 ? index + 2 : -1;
        if (rowNumber < 2) continue;

        /*
         * Repair, not replace. A rebuilt cell wins where it has content, so
         * missing answers get filled and generic prompts get corrected; the
         * existing cell survives where the legacy tab has nothing to offer,
         * which is how the committee and head ids written by a live submission
         * are not wiped by a row reconstructed from the old sheet.
         */
        const existing = headsRows[index] ?? [];
        for (let col = 0; col < row.length; col += 1) {
          if (!String(row[col] ?? "").trim() && String(existing[col] ?? "").trim()) {
            row[col] = existing[col];
          }
        }
        await sheetsFetch(
          token,
          "PUT",
          `${sheetRange(
            HEADS_APPLICATION_SHEET_NAME,
            `A${rowNumber}:${columnLetter(HEADS_APPLICATION_HEADERS.length)}${rowNumber}`
          )}?valueInputOption=RAW`,
          { values: [row] }
        );
      }
    } else {
      await sheetsFetch(
        token,
        "POST",
        `${sheetRange(HEADS_APPLICATION_SHEET_NAME, `A:${columnLetter(HEADS_APPLICATION_HEADERS.length)}`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
        { values: toAppend }
      );
    }
  }

  return {
    dryRun,
    legacyRows: legacyRows.filter((row) => String(row[2] ?? "").trim()).length,
    headsCycleRows,
    alreadyMigrated,
    migrated: dryRun ? 0 : toAppend.length,
    samples,
    unmatched,
    suspicious,
    timestampRange: {
      earliest: timestamps.length ? timestamps.slice().sort()[0] : "",
      latest: timestamps.length ? timestamps.slice().sort().at(-1)! : ""
    }
  };
}

/** Everything, for whoever is running this cycle. */
/**
 * Repairs bookings the old reschedule left dangling. Before the resolver knew
 * about the heads slot sheet, a moved interview was written with a made-up slot
 * id, so the slot it actually occupies still counts as free and could be handed
 * to somebody else. This re-points those reservations at the real slot and
 * copies the booked time back onto the application row.
 *
 * Touches sheets only: no calendar changes, no email, so it can be run again
 * safely.
 */
async function repairHeadsSlotLinks(
  token: string,
  email: string
): Promise<{
  relinked: Array<Record<string, string>>;
  slotsCopied: number;
  slotsCleared: number;
  unmatched: Array<Record<string, string>>;
}> {
  await requireRecruitmentAdmin(token, email);

  const [slotResponse, reservationResponse, applicationResponse] = await Promise.all([
    sheetsFetch(token, "GET", `${sheetRange(HEADS_SLOT_SHEET_NAME, "A2:K")}`),
    sheetsFetch(token, "GET", `${sheetRange(RESERVATION_SHEET_NAME, "A2:N")}`),
    sheetsFetch(token, "GET", `${sheetRange(HEADS_APPLICATION_SHEET_NAME, "A2:Q")}`)
  ]);
  const slotRows = ((await slotResponse.json()).values ?? []) as string[][];
  const reservationRows = ((await reservationResponse.json()).values ?? []) as string[][];
  const applicationRows = ((await applicationResponse.json()).values ?? []) as string[][];

  const knownSlotIds = new Set(slotRows.map((row) => normalize(row[0])).filter(Boolean));
  const relinked: Array<Record<string, string>> = [];
  const unmatched: Array<Record<string, string>> = [];

  for (const [index, row] of reservationRows.entries()) {
    const slotId = String(row[1] ?? "").trim();
    const label = String(row[2] ?? "").trim();
    const applicant = String(row[4] ?? "").trim();
    const committee = String(row[12] ?? "").trim();
    if (!slotId || knownSlotIds.has(normalize(slotId))) continue;

    // "2026-08-07 at 10:00 PM" — the only record of when the interview moved to.
    const parts = label.split(" at ");
    const date = parts[0]?.trim() ?? "";
    const startTime24 = normalizeTime24(parts.slice(1).join(" at ").trim());
    const wanted = normalizeRole(committee);
    const match = slotRows.find(
      (slotRow) =>
        normalizeRole(slotRow[1]) === wanted &&
        String(slotRow[2] ?? "").trim() === date &&
        normalizeTime24(slotRow[3]) === startTime24
    );

    if (!match) {
      unmatched.push({ applicant, committee, slotId, label });
      continue;
    }

    await sheetsFetch(
      token,
      "PUT",
      `${sheetRange(RESERVATION_SHEET_NAME, `B${index + 2}`)}?valueInputOption=RAW`,
      { values: [[String(match[0] ?? "").trim()]] }
    );
    relinked.push({ applicant, committee, from: slotId, to: String(match[0] ?? "").trim(), label });
  }

  // Second pass: the application row is a copy, so bring every stale one in line.
  const bookedByEmail = new Map<string, { id: string; label: string }>();
  reservationRows.forEach((row, index) => {
    const resEmail = normalize(String(row[4] ?? ""));
    if (!resEmail) return;
    const relink = relinked.find((entry) => normalize(entry.applicant) === resEmail);
    bookedByEmail.set(resEmail, {
      id: relink ? relink.to : String(row[1] ?? "").trim(),
      label: String(row[2] ?? "").trim()
    });
    void index;
  });

  let slotsCopied = 0;
  for (const [index, row] of applicationRows.entries()) {
    const booked = bookedByEmail.get(normalize(String(row[2] ?? "")));
    if (!booked) continue;
    if (String(row[15] ?? "").trim() === booked.label && String(row[16] ?? "").trim() === booked.id) continue;

    await sheetsFetch(
      token,
      "PUT",
      `${sheetRange(HEADS_APPLICATION_SHEET_NAME, `P${index + 2}:Q${index + 2}`)}?valueInputOption=RAW`,
      { values: [[booked.label, booked.id]] }
    );
    slotsCopied += 1;
  }

  // Third pass: a slot nobody holds should not still advertise last booking's
  // meeting, which is what the old reschedule left behind when it freed one.
  let slotsCleared = 0;
  const heldSlotIds = new Set(
    reservationRows
      .map((row) => normalize(row[1]))
      .filter(Boolean)
      .concat(relinked.map((entry) => normalize(entry.to)))
  );
  for (const [index, row] of slotRows.entries()) {
    const slotId = normalize(row[0]);
    const hasCalendarFields = String(row[9] ?? "").trim() || String(row[10] ?? "").trim();
    if (!slotId || heldSlotIds.has(slotId) || !hasCalendarFields) continue;

    await sheetsFetch(
      token,
      "PUT",
      `${sheetRange(HEADS_SLOT_SHEET_NAME, `J${index + 2}:K${index + 2}`)}?valueInputOption=RAW`,
      { values: [["", ""]] }
    );
    slotsCleared += 1;
  }

  return { relinked, slotsCopied, slotsCleared, unmatched };
}

async function loadHeadsAdmin(
  token: string,
  email: string
): Promise<{
  admin: { name: string; email: string };
  applicants: Array<Record<string, unknown>>;
  assignments: Array<Record<string, string>>;
  panel: Array<{ name: string; email: string; department: string; positionType: string }>;
  waitlist: Array<{ committee: string; headRole: string; rank: number; applicantEmail: string; applicantName: string }>;
  claims: HeadsClaim[];
}> {
  const admin = await requireRecruitmentAdmin(token, email);
  const [applicants, scores, assignments, hierarchy, waitlist, claims] = await Promise.all([
    readHeadsApplicants(token),
    readHeadsScores(token),
    readHeadsAssignments(token),
    loadHierarchy(token),
    readHeadsWaitlist(token),
    readHeadsClaims(token)
  ]);

  const withScores = applicants.map((applicant) => ({
    ...applicant,
    scores: scores.filter(
      (score) => normalize(score.applicantEmail) === normalize(String(applicant.email ?? ""))
    ),
    assignments: assignments.filter(
      (entry) => normalize(entry.applicantEmail) === normalize(String(applicant.email ?? ""))
    )
  }));

  // Who an admin can pick as a third interviewer: anyone who runs a committee.
  const panel = hierarchy.entries
    .filter((entry) => entry.positionType === "Director" || entry.positionType === "Vice-Director")
    .filter((entry) => isValidAucEmail(entry.aucEmail))
    .map((entry) => ({
      name: String(entry.name ?? "").trim(),
      email: String(entry.aucEmail ?? "").trim(),
      department: String(entry.department ?? "").trim(),
      positionType: String(entry.positionType ?? "").trim()
    }));

  return { admin, applicants: withScores, assignments, panel, waitlist, claims };
}

/**
 * Assign a third interviewer, normally so somebody can probe an applicant's
 * second preference during the interview they already have booked.
 */
async function assignHeadsInterviewer(
  token: string,
  payload: HeadsAssignInterviewerPayload
): Promise<{ assignmentId: string; updated: boolean }> {
  const admin = await requireRecruitmentAdmin(token, payload.email);

  const applicantEmail = String(payload.applicantEmail ?? "").trim();
  const committee = String(payload.committee ?? "").trim();
  const assigneeEmail = String(payload.assigneeEmail ?? "").trim();
  if (!applicantEmail || !committee || !assigneeEmail) {
    throw new Error("Applicant, committee and interviewer are required.");
  }

  const { entries } = await loadHierarchy(token);
  const assignee = entries.find((entry) => normalize(entry.aucEmail ?? "") === normalize(assigneeEmail));
  if (!assignee) throw new Error("That interviewer is not on the board hierarchy.");

  const assignmentId = headsAssignmentId(applicantEmail, committee, assigneeEmail);
  const row = [
    assignmentId,
    applicantEmail,
    committee,
    String(payload.headRole ?? ""),
    assigneeEmail,
    String(assignee.name ?? "").trim(),
    admin.email,
    new Date().toISOString(),
    String(payload.note ?? "")
  ];

  await ensureHeadsAssignmentSheet(token);
  const response = await sheetsFetch(token, "GET", `${sheetRange(HEADS_ASSIGNMENT_SHEET_NAME, "A2:I")}`);
  const rows = ((await response.json()).values ?? []) as string[][];
  const index = rows.findIndex((entry) => String(entry[0] ?? "") === assignmentId);

  if (index >= 0) {
    const rowNumber = index + 2;
    await sheetsFetch(
      token,
      "PUT",
      `${sheetRange(HEADS_ASSIGNMENT_SHEET_NAME, `A${rowNumber}:I${rowNumber}`)}?valueInputOption=RAW`,
      { values: [row] }
    );
    return { assignmentId, updated: true };
  }

  await sheetsFetch(
    token,
    "POST",
    `${sheetRange(HEADS_ASSIGNMENT_SHEET_NAME, "A:I")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { values: [row] }
  );
  return { assignmentId, updated: false };
}

/**
 * Exchange first and second preference. Both are stored differently — first
 * as four plain columns, second as one "Committee — Head" string plus two id
 * columns, because the applicant chooses it in a single free-text step — so
 * swapping means reading both shapes and writing each back in the other's.
 *
 * Deliberately does not touch the reservation: if this applicant already has
 * an interview booked, it keeps running with whichever committee actually
 * booked it. A swap can leave that committee no longer this applicant's first
 * preference — the reschedule and cancel actions are what move a booking, and
 * they still work exactly as before, just now possibly across the new split.
 */
async function swapHeadsPreferences(
  token: string,
  payload: HeadsSwapPreferencesPayload
): Promise<{
  applicantEmail: string;
  firstPreference: string;
  secondPreference: string;
  applicantEmailSent: boolean;
  committeeNotified: boolean;
}> {
  await requireRecruitmentAdmin(token, payload.email);

  const applicantEmail = String(payload.applicantEmail ?? "").trim();
  if (!applicantEmail) throw new Error("Which applicant?");

  const firstCol = HEADS_APPLICATION_HEADERS.indexOf("Committee");
  const firstIdCol = HEADS_APPLICATION_HEADERS.indexOf("Committee ID");
  const headCol = HEADS_APPLICATION_HEADERS.indexOf("Head Applied For");
  const headIdCol = HEADS_APPLICATION_HEADERS.indexOf("Head ID");
  const secondCol = HEADS_APPLICATION_HEADERS.indexOf("Second Preference Committee");
  const secondIdCol = HEADS_APPLICATION_HEADERS.indexOf("Second Preference Committee ID");
  const secondHeadIdCol = HEADS_APPLICATION_HEADERS.indexOf("Second Preference Head ID");
  // The eight columns above are contiguous (Committee through Second
  // Preference Head ID), so one range covers all of them.
  const lastCol = Math.max(firstCol, firstIdCol, headCol, headIdCol, secondCol, secondIdCol, secondHeadIdCol);

  const width = columnLetter(HEADS_APPLICATION_HEADERS.length);
  const response = await sheetsFetch(token, "GET", `${sheetRange(HEADS_APPLICATION_SHEET_NAME, `A2:${width}`)}`);
  const rows = ((await response.json()).values ?? []) as string[][];
  const index = findCurrentRowIndex(rows, HEADS_APPLICATION_HEADERS.indexOf("AUC Email"), applicantEmail);
  if (index === -1) throw new Error("No application found for that applicant.");

  const row = rows[index];
  const oldFirst = {
    committee: String(row[firstCol] ?? "").trim(),
    committeeId: String(row[firstIdCol] ?? "").trim(),
    headName: String(row[headCol] ?? "").trim(),
    headId: String(row[headIdCol] ?? "").trim()
  };
  const oldSecondCombined = String(row[secondCol] ?? "").trim();
  const oldSecondCommitteeId = String(row[secondIdCol] ?? "").trim();
  const oldSecondHeadId = String(row[secondHeadIdCol] ?? "").trim();

  if (!oldSecondCombined) {
    throw new Error("This applicant has no second preference to swap with.");
  }

  const oldSecond = splitSecondPreference(oldSecondCombined);
  const newFirst = {
    committee: oldSecond.committee,
    committeeId: oldSecondCommitteeId,
    headName: oldSecond.head,
    headId: oldSecondHeadId
  };
  const newSecondCombined = oldFirst.headName ? `${oldFirst.committee} — ${oldFirst.headName}` : oldFirst.committee;

  const newRow = [...row];
  newRow[firstCol] = newFirst.committee;
  newRow[firstIdCol] = newFirst.committeeId;
  newRow[headCol] = newFirst.headName;
  newRow[headIdCol] = newFirst.headId;
  newRow[secondCol] = newSecondCombined;
  newRow[secondIdCol] = oldFirst.committeeId;
  newRow[secondHeadIdCol] = oldFirst.headId;

  await sheetsFetch(
    token,
    "PUT",
    `${sheetRange(HEADS_APPLICATION_SHEET_NAME, `${columnLetter(firstCol + 1)}${index + 2}:${columnLetter(lastCol + 1)}${index + 2}`)}?valueInputOption=RAW`,
    { values: [newRow.slice(firstCol, lastCol + 1)] }
  );

  const fullName = String(row[HEADS_APPLICATION_HEADERS.indexOf("Full Name")] ?? "").trim();
  const firstLabel = newFirst.headName ? `${newFirst.committee} — ${newFirst.headName}` : newFirst.committee;
  const secondLabel = newSecondCombined;

  /*
   * Changing the time is part of the same action, not a second one, so it
   * shares the one email below rather than triggering the ordinary reschedule
   * mail on top of it — that would be two emails about one decision.
   */
  const wantsTimeChange = Boolean(payload.date && payload.startTime);
  let movedBooking = false;

  if (wantsTimeChange) {
    const reservationRowIndex = await findReservationRow(token, applicantEmail);
    if (!reservationRowIndex) {
      throw new Error("This applicant has no interview booked yet, so there is no time to change.");
    }

    // The reservation still names whichever committee first booked it. Point
    // it at the new first preference before moving the time, or the move
    // would resolve slots and invite the panel of the committee this
    // applicant just left instead of the one they are now applying to first.
    const roleColumn = RESERVATION_HEADERS.indexOf("Role Applied For");
    const secondColumn = RESERVATION_HEADERS.indexOf("Second Preference");
    await sheetsFetch(
      token,
      "PUT",
      `${sheetRange(
        RESERVATION_SHEET_NAME,
        `${columnLetter(roleColumn + 1)}${reservationRowIndex}:${columnLetter(secondColumn + 1)}${reservationRowIndex}`
      )}?valueInputOption=RAW`,
      { values: [[newFirst.committee, newSecondCombined]] }
    );

    await rescheduleInterview(
      token,
      {
        mode: "admin-reschedule",
        reservationRowIndex,
        date: String(payload.date),
        startTime: String(payload.startTime)
      },
      false
    );
    movedBooking = true;
  }

  const booking = await findLiveBooking(token, applicantEmail);

  // Neither send blocks the swap already written above — the sheet is the
  // record of what changed; these are best-effort notice of it.
  let applicantEmailSent = false;
  try {
    const cc = await buildApplicantCc(token, newFirst.committee, applicantEmail);
    await sendPreferenceSwapEmail({ fullName, aucEmail: applicantEmail, firstLabel, secondLabel, booking, cc, movedBooking });
    applicantEmailSent = gmailConfigured();
  } catch (error) {
    console.error(`Preference-swap applicant email failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  let committeeNotified = false;
  try {
    committeeNotified = await sendPreferenceSwapCommitteeNotice({
      token,
      committee: oldFirst.committee,
      applicantName: fullName,
      applicantEmail,
      newFirstLabel: firstLabel,
      // What the old committee needs to hear differs by exactly this: did
      // their booked interview just leave with the applicant, or is it still
      // theirs to run.
      booking: movedBooking ? null : booking,
      movedAway: movedBooking
    });
  } catch (error) {
    console.error(`Preference-swap committee notice failed: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  return { applicantEmail, firstPreference: firstLabel, secondPreference: secondLabel, applicantEmailSent, committeeNotified };
}

/** The applicant's active reservation, if the slot is still theirs — null once withdrawn or never booked. */
async function findLiveBooking(
  token: string,
  applicantEmail: string
): Promise<{ slotLabel: string; meetLink: string } | null> {
  const rowNumber = await findReservationRow(token, applicantEmail);
  if (!rowNumber) return null;

  const response = await sheetsFetch(token, "GET", `${sheetRange(RESERVATION_SHEET_NAME, `A${rowNumber}:N${rowNumber}`)}`);
  const row = (await response.json()).values?.[0] ?? [];
  const slotId = String(row[1] ?? "").trim();
  if (!slotId) return null;

  return { slotLabel: String(row[2] ?? "").trim(), meetLink: String(row[7] ?? "").trim() };
}

/**
 * Tells the applicant their preferences changed. Cc is the new first
 * preference's committee plus HR — the same audience every other applicant
 * email already carries — because from here on that committee is who the
 * applicant should expect to hear from first.
 */
async function sendPreferenceSwapEmail({
  fullName,
  aucEmail,
  firstLabel,
  secondLabel,
  booking,
  movedBooking = false,
  cc
}: {
  fullName: string;
  aucEmail: string;
  firstLabel: string;
  secondLabel: string;
  booking: { slotLabel: string; meetLink: string } | null;
  /** True when the interview itself was moved as part of this same change. */
  movedBooking?: boolean;
  cc: string;
}): Promise<void> {
  if (!gmailConfigured()) return;

  const subject = "Resala AUC: your preferences have been updated";
  const bookingLine = booking
    ? movedBooking
      ? `Your interview has been moved to match: ${booking.slotLabel}. The Google Meet link is the same as always — join at the new time.`
      : `Your interview on ${booking.slotLabel} stands exactly as booked — the time and the Google Meet link do not change.`
    : "You do not have an interview booked yet.";
  const body = [
    `Hi ${fullName},`,
    "",
    "Your application preferences have been updated:",
    `- First choice: ${firstLabel}`,
    `- Second choice: ${secondLabel}`,
    "",
    bookingLine,
    "",
    "If this was not what you meant, reply to this email and we will sort it out.",
    "",
    "Best,",
    "Resala AUC"
  ].join("\n");

  const html = buildPreferenceSwapEmailHtml({ fullName, firstLabel, secondLabel, booking, movedBooking });
  const accessToken = await getGmailAccessToken();
  const rawMessage = buildRawEmailMessage({
    from: `${GMAIL_SENDER_NAME} <${GMAIL_SENDER_EMAIL}>`,
    to: aucEmail,
    cc: cc || undefined,
    subject,
    text: body,
    html,
    attachments: []
  });

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: rawMessage })
  });

  if (!response.ok) {
    throw new Error(`Gmail send failed: ${await response.text()}`);
  }
}

export function buildPreferenceSwapEmailHtml({
  fullName,
  firstLabel,
  secondLabel,
  booking,
  movedBooking = false
}: {
  fullName: string;
  firstLabel: string;
  secondLabel: string;
  booking: { slotLabel: string; meetLink: string } | null;
  movedBooking?: boolean;
}): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f3ea;color:#172033;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f7f3ea;margin:0;padding:24px 0;">
      <tr>
        <td align="center" style="padding:0 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #eadfca;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="background:#0d2b45;padding:24px 28px 30px;text-align:center;color:#ffffff;">
                <img src="${escapeHtml(EMAIL_LOGO_URL)}" alt="Resala AUC" width="128" style="display:block;width:128px;max-width:128px;height:auto;border:0;margin:0 auto;">
                <div style="font-size:26px;line-height:1.2;color:#ffffff;font-weight:bold;margin-top:20px;">Preferences Updated</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 28px 8px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi ${escapeHtml(fullName)},</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;">
                  <tr>
                    <td style="padding:0 0 6px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:bold;">Your preferences now</td>
                  </tr>
                  <tr>
                    <td style="font-size:16px;line-height:1.6;color:#172033;">
                      <span style="color:#64748b;">First choice</span> · <strong>${escapeHtml(firstLabel)}</strong><br>
                      <span style="color:#64748b;">Second choice</span> · <strong>${escapeHtml(secondLabel)}</strong>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;">
                  <tr>
                    <td style="background:#f8fafc;border:1px solid #e6edf2;border-radius:14px;padding:16px;">
                      <div style="font-size:15px;line-height:1.55;color:#4b5563;">${
                        booking
                          ? movedBooking
                            ? `Your interview has been moved to match: <strong>${escapeHtml(booking.slotLabel)}</strong>. The Google Meet link is the same as always — join at the new time.`
                            : `Your interview on <strong>${escapeHtml(booking.slotLabel)}</strong> stands exactly as booked — the time and the Google Meet link do not change.`
                          : "You do not have an interview booked yet."
                      }</div>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#4b5563;">If this was not what you meant, reply to this email and we will sort it out.</p>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Best,<br>Resala AUC</p>
              </td>
            </tr>
            <tr>
              <td style="background:#f3efe5;padding:16px 28px;text-align:center;border-top:1px solid #eadfca;">
                <div style="font-size:12px;line-height:1.5;color:#667085;">Resala AUC · Build the First Step</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Tells the committee an applicant just left as their first preference. Sent
 * to that committee alone — this is an internal heads-up, not addressed to
 * the applicant, so it says plainly what does and does not change for them:
 * if they already have this applicant's interview booked, it is still theirs
 * to run. What changed is only which committee the applicant is now counted
 * against as first choice.
 */
async function sendPreferenceSwapCommitteeNotice({
  token,
  committee,
  applicantName,
  applicantEmail,
  newFirstLabel,
  booking,
  movedAway = false
}: {
  token: string;
  committee: string;
  applicantName: string;
  applicantEmail: string;
  newFirstLabel: string;
  /** Null when there is nothing left to report — either never booked, or moved away (see movedAway). */
  booking: { slotLabel: string; meetLink: string } | null;
  /** True when their interview left with them, rather than never having existed. */
  movedAway?: boolean;
}): Promise<boolean> {
  if (!gmailConfigured()) return false;

  const panel = await getCommitteePanel(token, committee).catch(() => []);
  if (!panel.length) return false;

  const committeeName = displayCommitteeName(committee);
  const subject = `Resala AUC: ${applicantName} is now your second preference`;
  const bookingLine = booking
    ? `Their interview with you on ${booking.slotLabel} is unaffected — it is still yours to run as scheduled. Only their preference order changed, not the booking.`
    : movedAway
      ? `Their interview has moved with them to ${newFirstLabel} — it is no longer on your board.`
      : "They have no interview booked yet.";

  const body = [
    `Hi ${committeeName},`,
    "",
    `${applicantName} (${applicantEmail}) had you as their first preference. Their preferences were just swapped — you are now their second preference, and their first is ${newFirstLabel}.`,
    "",
    bookingLine,
    "",
    "Best,",
    "Resala AUC"
  ].join("\n");

  const html = buildPreferenceSwapCommitteeNoticeHtml({ committeeName, applicantName, applicantEmail, newFirstLabel, booking, movedAway });
  const accessToken = await getGmailAccessToken();
  const rawMessage = buildRawEmailMessage({
    from: `${GMAIL_SENDER_NAME} <${GMAIL_SENDER_EMAIL}>`,
    to: panel.map((member) => member.email).join(", "),
    subject,
    text: body,
    html,
    attachments: []
  });

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: rawMessage })
  });

  if (!response.ok) {
    throw new Error(`Gmail send failed: ${await response.text()}`);
  }
  return true;
}

export function buildPreferenceSwapCommitteeNoticeHtml({
  committeeName,
  applicantName,
  applicantEmail,
  newFirstLabel,
  booking,
  movedAway = false
}: {
  committeeName: string;
  applicantName: string;
  applicantEmail: string;
  newFirstLabel: string;
  booking: { slotLabel: string; meetLink: string } | null;
  movedAway?: boolean;
}): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f3ea;color:#172033;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f7f3ea;margin:0;padding:24px 0;">
      <tr>
        <td align="center" style="padding:0 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #eadfca;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="background:#0d2b45;padding:24px 28px 30px;text-align:center;color:#ffffff;">
                <img src="${escapeHtml(EMAIL_LOGO_URL)}" alt="Resala AUC" width="128" style="display:block;width:128px;max-width:128px;height:auto;border:0;margin:0 auto;">
                <div style="font-size:24px;line-height:1.25;color:#ffffff;font-weight:bold;margin-top:20px;">${escapeHtml(applicantName)} is now your second preference</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 28px 8px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi ${escapeHtml(committeeName)},</p>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">
                  <strong>${escapeHtml(applicantName)}</strong> (${escapeHtml(applicantEmail)}) had you as their first
                  preference. Their preferences were just swapped — you are now their <strong>second</strong> preference,
                  and their first is <strong>${escapeHtml(newFirstLabel)}</strong>.
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;">
                  <tr>
                    <td style="background:#f8fafc;border:1px solid #e6edf2;border-radius:14px;padding:16px;">
                      <div style="font-size:15px;line-height:1.6;color:#172033;">${
                        booking
                          ? `Their interview with you on <strong>${escapeHtml(booking.slotLabel)}</strong> is unaffected — it is still yours to run as scheduled. Only their preference order changed, not the booking.`
                          : movedAway
                            ? `Their interview has moved with them to <strong>${escapeHtml(newFirstLabel)}</strong> — it is no longer on your board.`
                            : "They have no interview booked yet."
                      }</div>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Best,<br>Resala AUC</p>
              </td>
            </tr>
            <tr>
              <td style="background:#f3efe5;padding:16px 28px;text-align:center;border-top:1px solid #eadfca;">
                <div style="font-size:12px;line-height:1.5;color:#667085;">Resala AUC · Build the First Step</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * A director opening up more interview time for their own committee, self
 * service — no code change, no deploy. Restricted to the extension window,
 * and a day has to reach HEADS_SLOT_EXTENSION_MIN_PER_DAY active slots
 * before it counts as covered — but that minimum is per day, not per call:
 * a day starting from nothing needs the full minimum in one submission,
 * a day that already has it can take just one more. Every added slot runs
 * the committee's own established interview length — a director sets when
 * it starts, not how long it runs, so a Tech Director slot is always an
 * hour and an HR slot is always whatever HR already interviews for, the
 * same as every slot that shipped with the cycle.
 */
async function addHeadsSlots(
  token: string,
  payload: HeadsAddSlotsPayload
): Promise<{ committee: string; date: string; added: string[]; alreadyExisted: string[] }> {
  const access = await requireCommitteeAccess(token, payload.email);
  const committee = access.department;

  const date = String(payload.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Pick a valid date.");
  if (date < HEADS_SLOT_EXTENSION_START || date > HEADS_SLOT_EXTENSION_END) {
    throw new Error(`Slots can only be added between ${HEADS_SLOT_EXTENSION_START} and ${HEADS_SLOT_EXTENSION_END}.`);
  }

  const times = [...new Set((payload.times ?? []).map((t) => normalizeTime24(t)).filter(Boolean))];
  if (!times.length) throw new Error("Add at least one time.");

  const interview = COMMITTEE_INTERVIEWS[normalizeRole(committee)];
  const durationMinutes = interview?.durationMinutes ?? 60;
  const slug = normalizeRole(committee).replace(/\s+/g, "-");

  await ensureHeadsSlotSheet(token);
  const response = await sheetsFetch(token, "GET", `${sheetRange(HEADS_SLOT_SHEET_NAME, "A2:K")}`);
  const existing = ((await response.json()).values ?? []) as string[][];
  const present = new Set(existing.map((row) => normalize(row[0])));

  /*
   * The minimum is per day, not per call — once a day already has it, a
   * director should be able to top up with just one more slot. Only a day
   * starting from nothing has to arrive with the full minimum in one go.
   */
  const activeForDay = existing.filter(
    (row) =>
      normalizeRole(String(row[1] ?? "")) === normalizeRole(committee) &&
      String(row[2] ?? "").trim() === date &&
      String(row[8] ?? "").trim().toUpperCase() === "TRUE"
  ).length;
  if (activeForDay + times.length < HEADS_SLOT_EXTENSION_MIN_PER_DAY) {
    const need = HEADS_SLOT_EXTENSION_MIN_PER_DAY - activeForDay;
    throw new Error(
      activeForDay > 0
        ? `This day only has ${activeForDay} active slot${activeForDay === 1 ? "" : "s"} so far — add at least ${need} more to reach ${HEADS_SLOT_EXTENSION_MIN_PER_DAY}.`
        : `Add at least ${HEADS_SLOT_EXTENSION_MIN_PER_DAY} different times to start a new day.`
    );
  }

  const toAppend: Array<Array<string | number>> = [];
  const added: string[] = [];
  const alreadyExisted: string[] = [];

  for (const time of times) {
    const id = `${slug}-${date}-${time.replace(":", "")}`;
    const startLabel = toDisplayTime(time);
    const label = `${date} at ${startLabel}`;
    if (present.has(normalize(id))) {
      alreadyExisted.push(label);
      continue;
    }
    present.add(normalize(id));
    toAppend.push([
      id,
      committee,
      date,
      startLabel,
      addMinutesToTime(startLabel, durationMinutes),
      label,
      durationMinutes,
      1,
      "TRUE",
      "",
      ""
    ]);
    added.push(label);
  }

  if (toAppend.length) {
    await sheetsFetch(
      token,
      "POST",
      `${sheetRange(HEADS_SLOT_SHEET_NAME, "A:K")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      { values: toAppend }
    );
  }

  return { committee: displayCommitteeName(committee), date, added, alreadyExisted };
}

/**
 * A committee's own slots, with whether each is already booked — read
 * before adding more, or before deciding one can safely come down. Omitting
 * `date` returns every day at once, the overview a director needs to even
 * know which days have anything on them before picking one to drill into.
 * Not limited to the extension window: a director should be able to see the
 * cycle's original days for their committee too.
 */
async function listHeadsSlotsForDate(
  token: string,
  payload: HeadsListSlotsPayload
): Promise<{
  committee: string;
  date: string;
  slots: Array<{ id: string; date: string; label: string; startTime: string; endTime: string; active: boolean; booked: boolean }>;
}> {
  const access = await requireCommitteeAccess(token, payload.email);
  const committee = access.department;

  const date = String(payload.date ?? "").trim();
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Pick a valid date.");

  await ensureHeadsSlotSheet(token);
  const [slotResponse, reservationResponse] = await Promise.all([
    sheetsFetch(token, "GET", `${sheetRange(HEADS_SLOT_SHEET_NAME, "A2:K")}`),
    sheetsFetch(token, "GET", `${sheetRange(RESERVATION_SHEET_NAME, "A2:N")}`)
  ]);
  const slotRows = ((await slotResponse.json()).values ?? []) as string[][];
  const reservationRows = ((await reservationResponse.json()).values ?? []) as string[][];

  const bookedSlotIds = new Set(
    reservationRows.filter((row) => String(row[4] ?? "").trim()).map((row) => normalize(row[1]))
  );

  // No date means every one of this committee's slots — the overview a
  // director sees before drilling into a single day.
  const slots = slotRows
    .filter(
      (row) =>
        normalizeRole(String(row[1] ?? "")) === normalizeRole(committee) &&
        (!date || String(row[2] ?? "").trim() === date)
    )
    .map((row) => ({
      id: String(row[0] ?? ""),
      date: String(row[2] ?? "").trim(),
      label: String(row[5] ?? ""),
      startTime: String(row[3] ?? ""),
      endTime: String(row[4] ?? ""),
      active: String(row[8] ?? "").trim().toUpperCase() === "TRUE",
      booked: bookedSlotIds.has(normalize(row[0]))
    }))
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

  return { committee: displayCommitteeName(committee), date, slots };
}

/**
 * Turns one of a committee's own slots off — soft, via the Active column,
 * never a row deletion. Refuses outright if the slot has a booking; the
 * director has to move that applicant first, this is not the tool for it.
 */
async function removeHeadsSlot(
  token: string,
  payload: HeadsRemoveSlotPayload
): Promise<{ slotId: string }> {
  const access = await requireCommitteeAccess(token, payload.email);
  const slotId = String(payload.slotId ?? "").trim();
  if (!slotId) throw new Error("Slot is required.");

  const [slotResponse, reservationResponse] = await Promise.all([
    sheetsFetch(token, "GET", `${sheetRange(HEADS_SLOT_SHEET_NAME, "A2:K")}`),
    sheetsFetch(token, "GET", `${sheetRange(RESERVATION_SHEET_NAME, "A2:N")}`)
  ]);
  const slotRows = ((await slotResponse.json()).values ?? []) as string[][];
  const reservationRows = ((await reservationResponse.json()).values ?? []) as string[][];

  const index = slotRows.findIndex((row) => normalize(row[0]) === normalize(slotId));
  if (index === -1) throw new Error("No such slot.");

  if (normalizeRole(String(slotRows[index][1] ?? "")) !== normalizeRole(access.department)) {
    throw new Error("That slot does not belong to your committee.");
  }

  const booked = reservationRows.some(
    (row) => normalize(row[1]) === normalize(slotId) && String(row[4] ?? "").trim()
  );
  if (booked) {
    throw new Error("Someone has already booked this slot — reschedule or withdraw them first, then remove it.");
  }

  await sheetsFetch(
    token,
    "PUT",
    `${sheetRange(HEADS_SLOT_SHEET_NAME, `I${index + 2}`)}?valueInputOption=RAW`,
    { values: [["FALSE"]] }
  );

  return { slotId };
}

/**
 * Every committee's slots, for the admin's own coverage check — raw rows,
 * so the portal can group them into a committee-by-date grid the same way
 * it already builds Team diagrams and Onboarding from a flat applicant list.
 */
async function listAllHeadsSlots(
  token: string,
  payload: HeadsAdminListSlotsPayload
): Promise<{
  slots: Array<{ committee: string; date: string; active: boolean }>;
}> {
  await requireRecruitmentAdmin(token, payload.email);

  await ensureHeadsSlotSheet(token);
  const response = await sheetsFetch(token, "GET", `${sheetRange(HEADS_SLOT_SHEET_NAME, "A2:K")}`);
  const rows = ((await response.json()).values ?? []) as string[][];

  const slots = rows
    .filter((row) => String(row[0] ?? "").trim())
    .map((row) => ({
      committee: displayCommitteeName(String(row[1] ?? "")),
      date: String(row[2] ?? "").trim(),
      active: String(row[8] ?? "").trim().toUpperCase() === "TRUE"
    }));

  return { slots };
}

/**
 * A director dropping an applicant onto the team diagram: which committee,
 * which head-role team, Head or Member. Recorded as a Draft — nothing is
 * emailed here. The committee reviews the whole diagram and submits it with
 * submitHeadsTeam below, then the recruitment admin approves it with
 * sendHeadsTeamAcceptances before anyone is actually emailed.
 */
async function assignHeadsApplicant(
  token: string,
  payload: HeadsAssignApplicantPayload
): Promise<{
  applicantEmail: string;
  committee: string;
  headName: string;
  position: string;
}> {
  const applicantEmail = String(payload.applicantEmail ?? "").trim();
  const committee = String(payload.committee ?? "").trim();
  const headId = String(payload.headId ?? "").trim();
  const position = payload.position === "Member" ? "Member" : payload.position === "Co-Head" ? "Co-Head" : "Head";
  if (!applicantEmail || !committee || !headId) {
    throw new Error("Applicant, committee and role are all required.");
  }

  /*
   * Same authority as scoring, not the stricter first-preference-only rule
   * reschedule and cancel use — placing someone on the diagram evaluates an
   * applicant, it does not move or control the interview they already
   * booked, so whoever the committee trusted to score them (first
   * preference, second preference, or an assigned third interviewer) can
   * also decide they are in.
   */
  const access = await authorizeApplicantAccess(token, payload.email, committee, applicantEmail);

  // Closed roles included: a committee can still hold a position the cycle
  // stopped advertising, and the director's diagram offers those too. They are
  // never offered to an applicant, and missingHeadRolesFor still ignores them,
  // so an unfilled closed role never reads as a vacancy.
  const head = headsForHierarchy(committee).find((h) => h.id === headId);
  if (!head) {
    throw new Error(`${displayCommitteeName(committee)} has no role called that. Pick one from the list.`);
  }

  const width = columnLetter(HEADS_APPLICATION_HEADERS.length);
  const response = await sheetsFetch(token, "GET", `${sheetRange(HEADS_APPLICATION_SHEET_NAME, `A2:${width}`)}`);
  const rows = ((await response.json()).values ?? []) as string[][];
  const index = findCurrentRowIndex(rows, HEADS_APPLICATION_HEADERS.indexOf("AUC Email"), applicantEmail);
  if (index === -1) throw new Error("No application found for that applicant.");

  const currentStatus = String(rows[index][ACCEPTED_COLUMN] ?? "").trim();
  if (currentStatus === "Yes") {
    throw new Error("Already confirmed and emailed — pull them off the diagram first if this needs to change.");
  }

  /*
   * A claim, not a placement. Another committee wanting the same applicant no
   * longer blocks this one: both claims stand, both reach the admin, and the
   * admin decides. That is the whole point — the first-preference committee
   * used to be locked out entirely by whoever drafted first.
   */
  await backfillClaimsFromApplications(token, rows);
  assertRoleSlotFreeInClaims(await readHeadsClaims(token), applicantEmail, committee, head.name, position);

  const nameColumn = HEADS_APPLICATION_HEADERS.indexOf("Full Name");
  const draftedAt = new Date().toISOString();
  await upsertHeadsClaim(token, {
    applicantEmail,
    applicantName: String(rows[index][nameColumn] ?? "").trim(),
    committee: displayCommitteeName(committee),
    headRole: head.name,
    headId: head.id,
    position,
    status: "Draft",
    claimedBy: access.email,
    claimedAt: draftedAt,
    submittedBy: "",
    submittedAt: ""
  });

  /*
   * Accepted* is the single-value "what everyone else reads" mirror of
   * claims — readHeadsApplicants, every dashboard, and the send functions all
   * read it directly and know nothing about the Claims sheet. A claim alone
   * is invisible everywhere else, so it has to be mirrored here too, not just
   * recorded. Only mirrored when doing so does not clobber a different,
   * currently-standing claim: the applicant's own first-preference committee
   * always wins the mirror (matching the old, pre-claims priority rule), and
   * anyone else only takes it while nobody else currently holds it. A
   * genuine conflict — two committees, neither first preference, both
   * wanting the mirror — is exactly what the admin's contested-claims view
   * exists to settle; the claim itself is still recorded and visible there
   * either way.
   */
  const isFirstPreference =
    normalizeRole(String(rows[index][FIRST_PREFERENCE_COMMITTEE_COLUMN] ?? "")) === normalizeRole(committee);
  const currentHolder = String(rows[index][ACCEPTED_COMMITTEE_COLUMN] ?? "").trim();
  const mirrorAccepted = isFirstPreference || !currentHolder || committeeKey(currentHolder) === committeeKey(committee);

  if (mirrorAccepted) {
    await sheetsFetch(
      token,
      "PUT",
      `${sheetRange(
        HEADS_APPLICATION_SHEET_NAME,
        isFirstPreference
          ? `${columnLetter(ACCEPTED_COLUMN + 1)}${index + 2}:${columnLetter(SUBMITTED_AT_COLUMN + 1)}${index + 2}`
          : `${columnLetter(ACCEPTED_COLUMN + 1)}${index + 2}:${columnLetter(ACCEPTED_COMMITTEE_COLUMN + 1)}${index + 2}`
      )}?valueInputOption=RAW`,
      {
        values: [
          isFirstPreference
            // Reclaiming as first preference also clears any release and any
            // prior submission — both are moot once the committee that
            // mattered wants them after all, and this draft needs its own
            // fresh confirm before it can go to the admin again.
            ? ["Draft", head.name, position, access.email, draftedAt, displayCommitteeName(committee), "", "", "", "", ""]
            : ["Draft", head.name, position, access.email, draftedAt, displayCommitteeName(committee)]
        ]
      }
    );

    // Redrafting a non-first-preference placement (say, changing the role)
    // un-submits it too, so a stale "Submitted" does not linger for the
    // admin to approve against what the committee actually meant.
    if (!isFirstPreference) {
      await sheetsFetch(
        token,
        "PUT",
        `${sheetRange(
          HEADS_APPLICATION_SHEET_NAME,
          `${columnLetter(SUBMITTED_BY_COLUMN + 1)}${index + 2}:${columnLetter(SUBMITTED_AT_COLUMN + 1)}${index + 2}`
        )}?valueInputOption=RAW`,
        { values: [["", ""]] }
      );
    }
  }

  return { applicantEmail, committee: displayCommitteeName(committee), headName: head.name, position };
}

/**
 * Only one Head, and separately only one Co-Head, per role — whoever is doing
 * the placing. Shared by the committee's own diagram and the admin's direct
 * placement so the two can never disagree about what a role can hold.
 * Members are uncapped and never checked here.
 */
/*
 * One Head and one Co-Head per role, counted across claims rather than the
 * application rows. Only this committee's own claims count — another
 * committee wanting the same person says nothing about who holds a seat here.
 */
/*
 * (applicant, committee) pairs the admin has already approved — via
 * approveClaim, or via placing/force-submitting someone directly, both of
 * which write an Approved claim. A send that skipped anyone still holding
 * the old first-preference-unreleased flag would otherwise re-block a
 * placement the admin already decided on, even though placing it was the
 * decision: two checks of the same rule, and only one of them movable.
 */
async function approvedClaimKeys(token: string): Promise<Set<string>> {
  const claims = await readHeadsClaims(token);
  return new Set(
    claims
      .filter((c) => c.status === "Approved")
      .map((c) => `${normalize(c.applicantEmail)}|${committeeKey(c.committee)}`)
  );
}

function assertRoleSlotFreeInClaims(
  claims: HeadsClaim[],
  applicantEmail: string,
  committee: string,
  headName: string,
  position: string
): void {
  if (position !== "Head" && position !== "Co-Head") return;
  const taken = claims.find(
    (c) =>
      normalize(c.applicantEmail) !== normalize(applicantEmail) &&
      committeeKey(c.committee) === committeeKey(committee) &&
      normalizeRole(c.headRole) === normalizeRole(headName) &&
      c.position === position &&
      ["Draft", "Submitted", "Approved"].includes(c.status)
  );
  if (!taken) return;
  throw new Error(
    `${taken.applicantName || "Someone else"} is already ${position} of ${headName}. Remove them first to replace them.`
  );
}

/**
 * The recruitment admin placing someone into a role directly, without waiting
 * for that committee to build a diagram — which is the only way a committee
 * that has not submitted anything can still have its roles filled and sent.
 *
 * Lands on Submitted, not Draft: the admin is the one who sends, so there is
 * nobody left to hand a draft to, and it should show up immediately in the
 * send list. The first-preference claim is deliberately not enforced here —
 * that rule exists to stop two committees fighting over an applicant, and the
 * admin seeing all of them at once is the tiebreaker it was standing in for.
 */
async function adminAssignHeadsApplicant(
  token: string,
  payload: HeadsAdminAssignApplicantPayload
): Promise<{ applicantEmail: string; committee: string; headName: string; position: string }> {
  const applicantEmail = String(payload.applicantEmail ?? "").trim();
  const committee = String(payload.committee ?? "").trim();
  const headId = String(payload.headId ?? "").trim();
  const position = payload.position === "Member" ? "Member" : payload.position === "Co-Head" ? "Co-Head" : "Head";
  if (!applicantEmail || !committee || !headId) {
    throw new Error("Applicant, committee and role are all required.");
  }

  const admin = await requireRecruitmentAdmin(token, payload.email);

  // The admin builds the board as it actually is, so retired roles are
  // placeable here — and only here. A committee director's own diagram still
  // resolves against COMMITTEE_HEADS alone.
  const head = headsForHierarchy(committee).find((h) => h.id === headId);
  if (!head) {
    throw new Error(`${displayCommitteeName(committee)} has no role called that. Pick one from the list.`);
  }

  const width = columnLetter(HEADS_APPLICATION_HEADERS.length);
  const response = await sheetsFetch(token, "GET", `${sheetRange(HEADS_APPLICATION_SHEET_NAME, `A2:${width}`)}`);
  const rows = ((await response.json()).values ?? []) as string[][];
  const index = findCurrentRowIndex(rows, HEADS_APPLICATION_HEADERS.indexOf("AUC Email"), applicantEmail);
  if (index === -1) throw new Error("No application found for that applicant.");

  if (String(rows[index][ACCEPTED_COLUMN] ?? "").trim() === "Yes") {
    throw new Error("Already confirmed and emailed — remove them first if this needs to change.");
  }

  await backfillClaimsFromApplications(token, rows);
  assertRoleSlotFreeInClaims(await readHeadsClaims(token), applicantEmail, committee, head.name, position);

  const now = new Date().toISOString();
  // The admin placing someone is also the admin deciding, so their claim goes
  // straight in as Approved and the resolved columns are written with it.
  await upsertHeadsClaim(token, {
    applicantEmail,
    applicantName: String(rows[index][HEADS_APPLICATION_HEADERS.indexOf("Full Name")] ?? "").trim(),
    committee: displayCommitteeName(committee),
    headRole: head.name,
    headId: head.id,
    position,
    status: "Approved",
    claimedBy: admin.email,
    claimedAt: now,
    submittedBy: admin.email,
    submittedAt: now
  });
  for (const rival of (await readHeadsClaims(token)).filter(
    (c) => normalize(c.applicantEmail) === normalize(applicantEmail) && normalizeRole(c.committee) !== normalizeRole(committee)
  )) {
    await upsertHeadsClaim(token, { ...rival, status: "Declined" });
  }

  await sheetsFetch(
    token,
    "PUT",
    `${sheetRange(
      HEADS_APPLICATION_SHEET_NAME,
      `${columnLetter(ACCEPTED_COLUMN + 1)}${index + 2}:${columnLetter(SUBMITTED_AT_COLUMN + 1)}${index + 2}`
    )}?valueInputOption=RAW`,
    {
      // Eleven columns, in sheet order: Accepted, Role, Position, Accepted
      // By/At, Accepted Committee, the three First Preference Released
      // columns, then Submitted By/At.
      //
      // Accepted By/At and Submitted By/At are both the admin: they are the
      // only person who touched this placement, and the trail should say so
      // rather than leaving those columns misleadingly blank. The three
      // release columns are cleared — a release is meaningless once the admin
      // has decided, and a stale one would outlive its reason.
      values: [
        ["Submitted", head.name, position, admin.email, now, displayCommitteeName(committee), "", "", "", admin.email, now]
      ]
    }
  );

  return { applicantEmail, committee: displayCommitteeName(committee), headName: head.name, position };
}

/**
 * The admin settling who gets an applicant two committees both want. The
 * winning claim becomes Approved and is written into the Accepted* columns —
 * which is what the acceptance email and the onboarding checklist read, so
 * nothing downstream had to learn about claims. Every rival claim on the same
 * applicant is Declined in the same pass, so the losing committee's diagram
 * stops showing them as theirs.
 */
async function approveHeadsClaim(
  token: string,
  payload: HeadsAdminApproveClaimPayload
): Promise<{ applicantEmail: string; committee: string; headName: string; position: string; declined: string[] }> {
  const applicantEmail = String(payload.applicantEmail ?? "").trim();
  const committee = String(payload.committee ?? "").trim();
  if (!applicantEmail || !committee) throw new Error("Applicant and committee are required.");

  await requireRecruitmentAdmin(token, payload.email);

  const width = columnLetter(HEADS_APPLICATION_HEADERS.length);
  const response = await sheetsFetch(token, "GET", `${sheetRange(HEADS_APPLICATION_SHEET_NAME, `A2:${width}`)}`);
  const rows = ((await response.json()).values ?? []) as string[][];
  const index = findCurrentRowIndex(rows, HEADS_APPLICATION_HEADERS.indexOf("AUC Email"), applicantEmail);
  if (index === -1) throw new Error("No application found for that applicant.");
  if (String(rows[index][ACCEPTED_COLUMN] ?? "").trim() === "Yes") {
    throw new Error("Their acceptance email has already gone out.");
  }

  await backfillClaimsFromApplications(token, rows);
  const claims = await readHeadsClaims(token);
  const mine = claims.filter((c) => normalize(c.applicantEmail) === normalize(applicantEmail));
  const winner = mine.find((c) => normalizeRole(c.committee) === normalizeRole(committee));
  if (!winner) throw new Error(`${displayCommitteeName(committee)} has not claimed that applicant.`);

  const declined: string[] = [];
  for (const rival of mine) {
    if (normalizeRole(rival.committee) === normalizeRole(committee)) continue;
    await upsertHeadsClaim(token, { ...rival, status: "Declined" });
    declined.push(displayCommitteeName(rival.committee));
  }

  await upsertHeadsClaim(token, { ...winner, status: "Approved" });

  // The resolved placement, in the columns everything downstream already reads.
  const now = new Date().toISOString();
  await sheetsFetch(
    token,
    "PUT",
    `${sheetRange(
      HEADS_APPLICATION_SHEET_NAME,
      `${columnLetter(ACCEPTED_COLUMN + 1)}${index + 2}:${columnLetter(SUBMITTED_AT_COLUMN + 1)}${index + 2}`
    )}?valueInputOption=RAW`,
    {
      values: [[
        "Submitted",
        winner.headRole,
        winner.position,
        winner.claimedBy || payload.email,
        winner.claimedAt || now,
        displayCommitteeName(winner.committee),
        "",
        "",
        "",
        winner.submittedBy || payload.email,
        winner.submittedAt || now
      ]]
    }
  );

  return {
    applicantEmail,
    committee: displayCommitteeName(winner.committee),
    headName: winner.headRole,
    position: winner.position,
    declined
  };
}

/** The recruitment admin pulling a placement back off entirely. Blocked once it has been emailed. */
async function adminUnassignHeadsApplicant(
  token: string,
  payload: HeadsAdminUnassignApplicantPayload
): Promise<{ applicantEmail: string }> {
  const applicantEmail = String(payload.applicantEmail ?? "").trim();
  if (!applicantEmail) throw new Error("Applicant is required.");

  await requireRecruitmentAdmin(token, payload.email);

  const width = columnLetter(HEADS_APPLICATION_HEADERS.length);
  const response = await sheetsFetch(token, "GET", `${sheetRange(HEADS_APPLICATION_SHEET_NAME, `A2:${width}`)}`);
  const rows = ((await response.json()).values ?? []) as string[][];
  const index = findCurrentRowIndex(rows, HEADS_APPLICATION_HEADERS.indexOf("AUC Email"), applicantEmail);
  if (index === -1) throw new Error("No application found for that applicant.");

  if (String(rows[index][ACCEPTED_COLUMN] ?? "").trim() === "Yes") {
    throw new Error("Their acceptance email has already gone out — this cannot be undone from here.");
  }

  await sheetsFetch(
    token,
    "PUT",
    `${sheetRange(
      HEADS_APPLICATION_SHEET_NAME,
      `${columnLetter(ACCEPTED_COLUMN + 1)}${index + 2}:${columnLetter(SUBMITTED_AT_COLUMN + 1)}${index + 2}`
    )}?valueInputOption=RAW`,
    // Same eleven columns the placement above writes, all cleared.
    { values: [["", "", "", "", "", "", "", "", "", "", ""]] }
  );

  // Drop every committee's claim: the admin removing someone is removing them
  // from the board, not handing them back to one of the rivals.
  await backfillClaimsFromApplications(token, rows);
  for (const claim of (await readHeadsClaims(token)).filter(
    (c) => normalize(c.applicantEmail) === normalize(applicantEmail)
  )) {
    await removeHeadsClaim(token, claim.applicantEmail, claim.committee);
  }

  return { applicantEmail };
}

/** Pulls a draft placement back off the diagram. Blocked once the committee has already confirmed and emailed it. */
async function unassignHeadsApplicant(
  token: string,
  payload: HeadsUnassignApplicantPayload
): Promise<{ applicantEmail: string }> {
  const applicantEmail = String(payload.applicantEmail ?? "").trim();
  const committee = String(payload.committee ?? "").trim();
  if (!applicantEmail || !committee) throw new Error("Applicant and committee are required.");

  await authorizeApplicantAccess(token, payload.email, committee, applicantEmail);

  const width = columnLetter(HEADS_APPLICATION_HEADERS.length);
  const response = await sheetsFetch(token, "GET", `${sheetRange(HEADS_APPLICATION_SHEET_NAME, `A2:${width}`)}`);
  const rows = ((await response.json()).values ?? []) as string[][];
  const index = findCurrentRowIndex(rows, HEADS_APPLICATION_HEADERS.indexOf("AUC Email"), applicantEmail);
  if (index === -1) throw new Error("No application found for that applicant.");

  const status = String(rows[index][ACCEPTED_COLUMN] ?? "").trim();
  const mirroredByThisCommittee = committeeKey(rows[index][ACCEPTED_COMMITTEE_COLUMN]) === committeeKey(committee);
  if (status === "Yes" && mirroredByThisCommittee) {
    throw new Error("Already approved and emailed — this can't be undone from the diagram.");
  }

  // Only this committee's own claim goes. Another committee wanting the same
  // applicant is none of this committee's business to withdraw.
  await backfillClaimsFromApplications(token, rows);
  await removeHeadsClaim(token, applicantEmail, displayCommitteeName(committee));

  /*
   * Accepted* is a mirror of whichever claim currently owns it — see
   * assignHeadsApplicant. If it was mirroring THIS committee's claim, the
   * mirror is now stale: removing the claim above leaves the row still
   * reading Draft/Submitted for a committee that no longer wants them, which
   * is exactly the diagram-says-removed-but-admin-still-shows-them bug. It is
   * only cleared here, never handed to a rival claim automatically — a
   * remaining rival is left for the admin to see and settle explicitly via
   * the contested view, rather than guessed at.
   */
  if (mirroredByThisCommittee && status !== "Yes") {
    await sheetsFetch(
      token,
      "PUT",
      `${sheetRange(
        HEADS_APPLICATION_SHEET_NAME,
        `${columnLetter(ACCEPTED_COLUMN + 1)}${index + 2}:${columnLetter(SUBMITTED_AT_COLUMN + 1)}${index + 2}`
      )}?valueInputOption=RAW`,
      { values: [["", "", "", "", "", "", "", "", "", "", ""]] }
    );
  }

  return { applicantEmail };
}

/**
 * Filled by anything on the diagram for this committee that is not a dead
 * "" — Draft, Submitted, or Yes — so a role someone was just placed into (but
 * not yet submitted, or not yet approved) does not falsely show up as
 * missing while the committee is still mid-build.
 */
function missingHeadRolesFor(rows: string[][], committee: string): string[] {
  const heads = COMMITTEE_HEADS[normalizeRole(committee)] ?? [];
  const filled = new Set(
    rows
      .filter(
        (row) =>
          ["Draft", "Submitted", "Yes"].includes(String(row[ACCEPTED_COLUMN] ?? "").trim()) &&
          committeeKey(row[ACCEPTED_COMMITTEE_COLUMN]) === committeeKey(committee) &&
          String(row[ACCEPTED_POSITION_COLUMN] ?? "").trim() === "Head"
      )
      .map((row) => normalizeRole(String(row[ACCEPTED_ROLE_COLUMN] ?? "")))
  );
  return heads.filter((h) => !filled.has(normalizeRole(h.name))).map((h) => h.name);
}

/**
 * The committee confirming its finished diagram — this does NOT email anyone.
 * It hands every eligible Draft to the recruitment admin by flipping it to
 * Submitted; the admin reviews across every committee and is the one who
 * actually triggers the welcome email, with sendHeadsTeamAcceptances below.
 * Head roles still empty afterward come back in `missingHeadRoles`, so the
 * committee (and the admin) can see what to flag for a deadline extension.
 */
async function submitHeadsTeam(
  token: string,
  payload: HeadsSubmitTeamPayload
): Promise<{
  committee: string;
  submitted: Array<{ applicantEmail: string; fullName: string; headName: string; position: string }>;
  held: Array<{ applicantEmail: string; fullName: string; firstPreferenceCommittee: string }>;
  missingHeadRoles: string[];
}> {
  const committee = String(payload.committee ?? "").trim();
  if (!committee) throw new Error("Committee is required.");

  // Only the committee itself submits its own diagram — not a
  // second-preference committee or an assigned interviewer, who may draft
  // placements but should not be the ones handing the whole roster to the
  // admin on this committee's behalf.
  const access = await requireCommitteeAccess(token, payload.email);
  if (normalizeRole(access.department) !== normalizeRole(committee)) {
    throw new Error(`${displayCommitteeName(access.department)} does not run ${displayCommitteeName(committee)}'s diagram.`);
  }

  const width = columnLetter(HEADS_APPLICATION_HEADERS.length);
  const response = await sheetsFetch(token, "GET", `${sheetRange(HEADS_APPLICATION_SHEET_NAME, `A2:${width}`)}`);
  const rows = ((await response.json()).values ?? []) as string[][];
  const emailColumn = HEADS_APPLICATION_HEADERS.indexOf("AUC Email");
  const nameColumn = HEADS_APPLICATION_HEADERS.indexOf("Full Name");

  await backfillClaimsFromApplications(token, rows);
  const claims = await readHeadsClaims(token);

  const submittedAt = new Date().toISOString();
  const submitted: Array<{ applicantEmail: string; fullName: string; headName: string; position: string }> = [];
  const held: Array<{ applicantEmail: string; fullName: string; firstPreferenceCommittee: string }> = [];
  const emailColumn2 = HEADS_APPLICATION_HEADERS.indexOf("AUC Email");

  /*
   * Only this committee's own Draft claims. A rival claim on the same
   * applicant is left exactly as it is — both go to the admin, who is the one
   * who decides between them.
   */
  const mine = claims.filter(
    (c) => committeeKey(c.committee) === committeeKey(committee) && c.status === "Draft"
  );

  for (const claim of mine) {
    const rowIndex = findCurrentRowIndex(rows, emailColumn2, claim.applicantEmail);
    const firstPreferenceCommittee =
      rowIndex === -1 ? "" : String(rows[rowIndex][FIRST_PREFERENCE_COMMITTEE_COLUMN] ?? "").trim();
    const isFirstPreference = normalizeRole(firstPreferenceCommittee) === normalizeRole(committee);
    if (!isFirstPreference) {
      held.push({
        applicantEmail: claim.applicantEmail,
        fullName: claim.applicantName,
        firstPreferenceCommittee: displayCommitteeName(firstPreferenceCommittee)
      });
    }

    await upsertHeadsClaim(token, {
      ...claim,
      status: "Submitted",
      submittedBy: access.email,
      submittedAt
    });

    /*
     * Mirror into Accepted* — see the same note in assignHeadsApplicant. The
     * send functions read Accepted* directly and know nothing about claims,
     * so a claim that flips to Submitted here but is never mirrored is
     * invisible to them: reachable in the Hierarchy tab's contested view, but
     * never actually sendable. Same eligibility rule as the draft: this
     * committee's first-preference claim always mirrors; anyone else only
     * while nobody else's claim currently occupies the mirror.
     */
    if (rowIndex !== -1) {
      const currentHolder = String(rows[rowIndex][ACCEPTED_COMMITTEE_COLUMN] ?? "").trim();
      const mirrorAccepted =
        isFirstPreference || !currentHolder || committeeKey(currentHolder) === committeeKey(committee);
      if (mirrorAccepted) {
        await sheetsFetch(
          token,
          "PUT",
          `${sheetRange(
            HEADS_APPLICATION_SHEET_NAME,
            `${columnLetter(ACCEPTED_COLUMN + 1)}${rowIndex + 2}:${columnLetter(SUBMITTED_AT_COLUMN + 1)}${rowIndex + 2}`
          )}?valueInputOption=RAW`,
          {
            values: [[
              "Submitted",
              claim.headRole,
              claim.position,
              claim.claimedBy || access.email,
              claim.claimedAt || submittedAt,
              displayCommitteeName(committee),
              "",
              "",
              "",
              access.email,
              submittedAt
            ]]
          }
        );
      }
    }

    submitted.push({
      applicantEmail: claim.applicantEmail,
      fullName: claim.applicantName,
      headName: claim.headRole,
      position: claim.position
    });
  }

  return {
    committee: displayCommitteeName(committee),
    submitted,
    held,
    missingHeadRoles: missingHeadRolesFor(rows, committee)
  };
}

/**
 * The recruitment admin approving a committee's submitted roster: every
 * applicant currently Submitted for this committee gets the welcome email at
 * once and flips to Yes. This is the only place that email actually goes
 * out — a committee confirming its own diagram never sends anything by
 * itself, only hands it here first.
 */
async function sendHeadsTeamAcceptances(
  token: string,
  payload: HeadsAdminConfirmTeamPayload
): Promise<{
  committee: string;
  sent: Array<{ applicantEmail: string; fullName: string; headName: string; position: string }>;
  skippedContested: Array<{ applicantEmail: string; fullName: string; firstPreferenceCommittee: string }>;
  missingHeadRoles: string[];
}> {
  const committee = String(payload.committee ?? "").trim();
  if (!committee) throw new Error("Committee is required.");

  await requireRecruitmentAdmin(token, payload.email);

  const width = columnLetter(HEADS_APPLICATION_HEADERS.length);
  const response = await sheetsFetch(token, "GET", `${sheetRange(HEADS_APPLICATION_SHEET_NAME, `A2:${width}`)}`);
  const rows = ((await response.json()).values ?? []) as string[][];
  const emailColumn = HEADS_APPLICATION_HEADERS.indexOf("AUC Email");
  const nameColumn = HEADS_APPLICATION_HEADERS.indexOf("Full Name");

  const onlyEmails = new Set(
    (payload.applicantEmails ?? []).map((e) => String(e ?? "").trim().toLowerCase()).filter(Boolean)
  );

  /*
   * The cc list is the accepting committee's panel plus the HR monitors, which
   * is the same answer for every applicant here apart from dropping their own
   * address. Resolved once for the whole batch rather than per person — this
   * used to be two Board Hierarchy round trips each, which is what pushed a
   * batch send past the Sheets read quota.
   */
  const ccPanel = await getCommitteePanel(token, committee).catch(() => []);

  /*
   * A placement by a committee that is not the applicant's first preference,
   * where that first-preference committee has not released them, is contested:
   * the admin is meant to decide who needs them more. It reaches this point so
   * it can be seen and decided on, but a bulk send skips it — only naming the
   * applicant explicitly in applicantEmails sends it, which is the admin
   * saying they have made that call.
   *
   * An Approved claim on this committee counts as that call already having
   * been made — approveClaim writes one when settling a genuine two-committee
   * conflict, and so does the admin placing or force-submitting someone
   * directly. Without this, either of those would place someone the send step
   * immediately re-blocks on the same rule the placement had just overridden.
   */
  const approvedHere = await approvedClaimKeys(token);
  const isContested = (row: string[], applicantEmail: string): boolean => {
    // Claims store the committee's display name ("Tech Team"), while this
    // function's own `committee` is the raw internal name ("Tech Director")
    // — the same rename that keeps FIRST_PREFERENCE_COMMITTEE_COLUMN matching
    // below, which is raw too. The two must not be normalized the same way.
    if (approvedHere.has(`${normalize(applicantEmail)}|${committeeKey(committee)}`)) return false;
    const first = normalizeRole(String(row[FIRST_PREFERENCE_COMMITTEE_COLUMN] ?? ""));
    const released = String(row[RELEASED_COLUMN] ?? "").trim() === "Yes";
    return first !== normalizeRole(committee) && !released;
  };

  const skippedContested: Array<{ applicantEmail: string; fullName: string; firstPreferenceCommittee: string }> = [];

  const submitted = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => {
      if (String(row[ACCEPTED_COLUMN] ?? "").trim() !== "Submitted") return false;
      if (committeeKey(row[ACCEPTED_COMMITTEE_COLUMN]) !== committeeKey(committee)) return false;
      const named = onlyEmails.has(String(row[emailColumn] ?? "").trim().toLowerCase());
      if (onlyEmails.size > 0) return named;
      const applicantEmail = String(row[emailColumn] ?? "").trim();
      if (isContested(row, applicantEmail)) {
        skippedContested.push({
          applicantEmail,
          fullName: String(row[nameColumn] ?? "").trim(),
          firstPreferenceCommittee: displayCommitteeName(String(row[FIRST_PREFERENCE_COMMITTEE_COLUMN] ?? ""))
        });
        return false;
      }
      return true;
    });

  const sent: Array<{ applicantEmail: string; fullName: string; headName: string; position: string }> = [];

  for (const { row, index } of submitted) {
    const applicantEmail = String(row[emailColumn] ?? "").trim();
    const fullName = String(row[nameColumn] ?? "").trim();
    const headName = String(row[ACCEPTED_ROLE_COLUMN] ?? "").trim();
    const position = String(row[ACCEPTED_POSITION_COLUMN] ?? "").trim() || "Member";
    if (!applicantEmail) continue;

    // Only the status cell — Accepted By/At stays whoever originally drafted
    // the placement, and Submitted By/At stays whoever on the committee
    // confirmed it, so the audit trail keeps both steps distinct.
    await sheetsFetch(
      token,
      "PUT",
      `${sheetRange(HEADS_APPLICATION_SHEET_NAME, `${columnLetter(ACCEPTED_COLUMN + 1)}${index + 2}`)}?valueInputOption=RAW`,
      { values: [["Yes"]] }
    );

    try {
      const cc = await buildApplicantCc(token, committee, applicantEmail, ccPanel);
      await sendAcceptanceEmail({
        fullName,
        aucEmail: applicantEmail,
        committee: displayCommitteeName(committee),
        headName,
        position,
        cc
      });
    } catch (error) {
      console.error(`Acceptance email failed for ${applicantEmail}: ${error instanceof Error ? error.message : "unknown error"}`);
    }
    sent.push({ applicantEmail, fullName, headName, position });
  }

  return {
    committee: displayCommitteeName(committee),
    sent,
    skippedContested,
    missingHeadRoles: missingHeadRolesFor(rows, committee)
  };
}

/**
 * The recruitment admin sending one Submitted placement back to Draft —
 * the committee sees it reset right on their own diagram (still showing the
 * same role and position, so nothing about who it was for is lost) and can
 * revise it before submitting again. Nothing is emailed either way; a Yes
 * has already gone out and cannot be undone from here.
 */
/**
 * What the send would produce, without sending it. Built by the same builder
 * the send uses and addressed with the same cc resolution, so the preview
 * cannot show one thing and the mail say another — the only difference is that
 * nothing reaches Gmail.
 */
async function previewHeadsAcceptances(
  token: string,
  payload: HeadsAdminPreviewAcceptancePayload
): Promise<{
  committee: string;
  messages: Array<{ applicantEmail: string; fullName: string; subject: string; to: string; cc: string; html: string }>;
  skippedContested: Array<{ applicantEmail: string; fullName: string; firstPreferenceCommittee: string }>;
}> {
  const committee = String(payload.committee ?? "").trim();
  if (!committee) throw new Error("Committee is required.");
  await requireRecruitmentAdmin(token, payload.email);

  const width = columnLetter(HEADS_APPLICATION_HEADERS.length);
  const response = await sheetsFetch(token, "GET", `${sheetRange(HEADS_APPLICATION_SHEET_NAME, `A2:${width}`)}`);
  const rows = ((await response.json()).values ?? []) as string[][];
  const emailColumn = HEADS_APPLICATION_HEADERS.indexOf("AUC Email");
  const nameColumn = HEADS_APPLICATION_HEADERS.indexOf("Full Name");

  const onlyEmails = new Set(
    (payload.applicantEmails ?? []).map((e) => String(e ?? "").trim().toLowerCase()).filter(Boolean)
  );

  // Same rule, same claims override, as sendHeadsTeamAcceptances — the
  // preview has to skip exactly what the send would skip, or the drafts shown
  // and the drafts actually delivered are two different lists.
  const approvedHere = await approvedClaimKeys(token);
  const contested = (row: string[], applicantEmail: string): boolean => {
    // Claims store the committee's display name ("Tech Team"), while this
    // function's own `committee` is the raw internal name ("Tech Director")
    // — the same rename that keeps FIRST_PREFERENCE_COMMITTEE_COLUMN matching
    // below, which is raw too. The two must not be normalized the same way.
    if (approvedHere.has(`${normalize(applicantEmail)}|${committeeKey(committee)}`)) return false;
    return (
      normalizeRole(String(row[FIRST_PREFERENCE_COMMITTEE_COLUMN] ?? "")) !== normalizeRole(committee) &&
      String(row[RELEASED_COLUMN] ?? "").trim() !== "Yes"
    );
  };

  const skippedContested: Array<{ applicantEmail: string; fullName: string; firstPreferenceCommittee: string }> = [];
  const ccPanel = await getCommitteePanel(token, committee).catch(() => []);
  const messages: Array<{ applicantEmail: string; fullName: string; subject: string; to: string; cc: string; html: string }> = [];

  for (const row of rows) {
    if (String(row[ACCEPTED_COLUMN] ?? "").trim() !== "Submitted") continue;
    if (committeeKey(row[ACCEPTED_COMMITTEE_COLUMN]) !== committeeKey(committee)) continue;
    const applicantEmail = String(row[emailColumn] ?? "").trim();
    if (!applicantEmail) continue;

    if (onlyEmails.size > 0) {
      if (!onlyEmails.has(applicantEmail.toLowerCase())) continue;
    } else if (contested(row, applicantEmail)) {
      skippedContested.push({
        applicantEmail,
        fullName: String(row[nameColumn] ?? "").trim(),
        firstPreferenceCommittee: displayCommitteeName(String(row[FIRST_PREFERENCE_COMMITTEE_COLUMN] ?? ""))
      });
      continue;
    }

    const fullName = String(row[nameColumn] ?? "").trim();
    messages.push({
      applicantEmail,
      fullName,
      subject: `Resala AUC: welcome to ${displayCommitteeName(committee)} — you're in!`,
      to: applicantEmail,
      cc: await buildApplicantCc(token, committee, applicantEmail, ccPanel),
      html: buildAcceptanceEmailHtml({
        fullName,
        committee: displayCommitteeName(committee),
        headName: String(row[ACCEPTED_ROLE_COLUMN] ?? "").trim(),
        position: String(row[ACCEPTED_POSITION_COLUMN] ?? "").trim() || "Member",
        onboardingUrl: headsOnboardingUrl(applicantEmail)
      })
    });
  }

  return { committee: displayCommitteeName(committee), messages, skippedContested };
}

async function rejectHeadsSubmission(
  token: string,
  payload: HeadsAdminRejectApplicantPayload
): Promise<{ applicantEmail: string; committee: string }> {
  const applicantEmail = String(payload.applicantEmail ?? "").trim();
  const committee = String(payload.committee ?? "").trim();
  if (!applicantEmail || !committee) throw new Error("Applicant and committee are required.");

  await requireRecruitmentAdmin(token, payload.email);

  const width = columnLetter(HEADS_APPLICATION_HEADERS.length);
  const response = await sheetsFetch(token, "GET", `${sheetRange(HEADS_APPLICATION_SHEET_NAME, `A2:${width}`)}`);
  const rows = ((await response.json()).values ?? []) as string[][];
  const index = findCurrentRowIndex(rows, HEADS_APPLICATION_HEADERS.indexOf("AUC Email"), applicantEmail);
  if (index === -1) throw new Error("No application found for that applicant.");

  const status = String(rows[index][ACCEPTED_COLUMN] ?? "").trim();
  if (status === "Yes") throw new Error("Already approved and emailed — this can't be rejected from here.");
  if (status !== "Submitted") throw new Error("This applicant has not been submitted for approval.");
  if (committeeKey(rows[index][ACCEPTED_COMMITTEE_COLUMN]) !== committeeKey(committee)) {
    throw new Error("This applicant is not on that committee's diagram.");
  }

  await sheetsFetch(
    token,
    "PUT",
    `${sheetRange(HEADS_APPLICATION_SHEET_NAME, `${columnLetter(ACCEPTED_COLUMN + 1)}${index + 2}`)}?valueInputOption=RAW`,
    { values: [["Draft"]] }
  );
  await sheetsFetch(
    token,
    "PUT",
    `${sheetRange(
      HEADS_APPLICATION_SHEET_NAME,
      `${columnLetter(SUBMITTED_BY_COLUMN + 1)}${index + 2}:${columnLetter(SUBMITTED_AT_COLUMN + 1)}${index + 2}`
    )}?valueInputOption=RAW`,
    { values: [["", ""]] }
  );

  return { applicantEmail, committee: displayCommitteeName(committee) };
}

/**
 * The onboarding checklist page's own read: is this email actually an
 * accepted applicant, and if so, where do they stand. No auth beyond that —
 * the page is reached from a link in their acceptance email, the same way
 * the task-submission page works.
 */
async function loadHeadsOnboardingStatus(
  token: string,
  applicantEmailRaw: string
): Promise<{
  found: boolean;
  record?: {
    fullName: string;
    committee: string;
    headRole: string;
    position: string;
    roleConfirmed: boolean;
    roleConfirmedAt: string;
    videoNotes: string;
    videoNotesAt: string;
  };
}> {
  const applicantEmail = String(applicantEmailRaw ?? "").trim();
  if (!applicantEmail) throw new Error("Enter your AUC email.");

  const applicants = await readHeadsApplicants(token);
  const applicant = applicants.find((a) => normalize(String(a.email ?? "")) === normalize(applicantEmail));
  if (!applicant || !applicant.accepted) return { found: false };

  return {
    found: true,
    record: {
      fullName: String(applicant.fullName ?? ""),
      committee: String(applicant.acceptedCommittee ?? ""),
      headRole: String(applicant.acceptedRole ?? ""),
      position: String(applicant.acceptedPosition ?? ""),
      roleConfirmed: Boolean(applicant.roleConfirmed),
      roleConfirmedAt: String(applicant.roleConfirmedAt ?? ""),
      videoNotes: String(applicant.videoNotes ?? ""),
      videoNotesAt: String(applicant.videoNotesAt ?? "")
    }
  };
}

/**
 * The applicant saving their own checklist progress: confirming the role,
 * and/or their notes on the video. Either can arrive alone, so only what is
 * actually present in the payload gets written — a blank notes field on a
 * role-confirm-only save must never wipe out notes sent in earlier.
 */
async function submitHeadsOnboarding(
  token: string,
  payload: HeadsOnboardingSubmitPayload
): Promise<{ applicantEmail: string; roleConfirmed: boolean; videoNotesSaved: boolean }> {
  const applicantEmail = String(payload.applicantEmail ?? "").trim();
  if (!applicantEmail) throw new Error("Enter your AUC email.");

  const width = columnLetter(HEADS_APPLICATION_HEADERS.length);
  const response = await sheetsFetch(token, "GET", `${sheetRange(HEADS_APPLICATION_SHEET_NAME, `A2:${width}`)}`);
  const rows = ((await response.json()).values ?? []) as string[][];
  const index = findCurrentRowIndex(rows, HEADS_APPLICATION_HEADERS.indexOf("AUC Email"), applicantEmail);
  if (index === -1) throw new Error("No application found for that applicant.");

  if (String(rows[index][ACCEPTED_COLUMN] ?? "").trim() !== "Yes") {
    throw new Error("This checklist opens once your acceptance has actually gone out.");
  }

  const roleConfirmed = payload.roleConfirmed === true;
  const videoNotes = typeof payload.videoNotes === "string" ? payload.videoNotes.trim() : "";
  const now = new Date().toISOString();

  if (roleConfirmed) {
    await sheetsFetch(
      token,
      "PUT",
      `${sheetRange(
        HEADS_APPLICATION_SHEET_NAME,
        `${columnLetter(ROLE_CONFIRMED_COLUMN + 1)}${index + 2}:${columnLetter(ROLE_CONFIRMED_AT_COLUMN + 1)}${index + 2}`
      )}?valueInputOption=RAW`,
      { values: [["Yes", now]] }
    );
  }

  if (videoNotes) {
    await sheetsFetch(
      token,
      "PUT",
      `${sheetRange(
        HEADS_APPLICATION_SHEET_NAME,
        `${columnLetter(VIDEO_NOTES_COLUMN + 1)}${index + 2}:${columnLetter(VIDEO_NOTES_AT_COLUMN + 1)}${index + 2}`
      )}?valueInputOption=RAW`,
      { values: [[videoNotes, now]] }
    );
  }

  return { applicantEmail, roleConfirmed, videoNotesSaved: Boolean(videoNotes) };
}

/**
 * The applicant's first-preference committee saying whether it wants them —
 * the only thing that unblocks a second-preference or assigned committee's
 * draft of the same applicant. `release: false` takes the release back.
 */
async function setFirstPreferenceRelease(
  token: string,
  payload: HeadsReleaseFirstPreferencePayload
): Promise<{ applicantEmail: string; released: boolean }> {
  const applicantEmail = String(payload.applicantEmail ?? "").trim();
  if (!applicantEmail) throw new Error("Applicant is required.");
  const release = payload.release !== false;

  // Same authority as reschedule/cancel: only the committee the applicant put
  // first. Releasing is that committee giving up its own claim, so nobody
  // else should be able to do it on their behalf.
  const access = await requireFirstPreferenceCommittee(token, payload.email, applicantEmail);

  const width = columnLetter(HEADS_APPLICATION_HEADERS.length);
  const response = await sheetsFetch(token, "GET", `${sheetRange(HEADS_APPLICATION_SHEET_NAME, `A2:${width}`)}`);
  const rows = ((await response.json()).values ?? []) as string[][];
  const index = findCurrentRowIndex(rows, HEADS_APPLICATION_HEADERS.indexOf("AUC Email"), applicantEmail);
  if (index === -1) throw new Error("No application found for that applicant.");

  if (String(rows[index][ACCEPTED_COLUMN] ?? "").trim() === "Yes") {
    throw new Error("Already confirmed and emailed — nothing left to release.");
  }

  await sheetsFetch(
    token,
    "PUT",
    `${sheetRange(
      HEADS_APPLICATION_SHEET_NAME,
      `${columnLetter(RELEASED_COLUMN + 1)}${index + 2}:${columnLetter(RELEASED_AT_COLUMN + 1)}${index + 2}`
    )}?valueInputOption=RAW`,
    { values: [[release ? "Yes" : "", release ? access.email : "", release ? new Date().toISOString() : ""]] }
  );

  return { applicantEmail, released: release };
}

/*
 * Tech Team has no Head / Co-Head / Member — it is flat, and every accepted
 * applicant is simply part of the team. The diagram still records a slot per
 * applicant, because the one-Head-per-role rule needs somewhere to attach to,
 * but a director choosing "Member" for everyone there is a placeholder, not a
 * real distinction, and the applicant's own email must not say otherwise.
 */
function isFlatCommittee(committee: string): boolean {
  return normalizeRole(committee) === normalizeRole("Tech Team");
}

/*
 * Role names already carry their own title — "Head of Graphic Design",
 * "Discovery Head", "The Organizer" — so pasting a position in front of them
 * produced "Head of Head of Graphic Design" and "Head of Discovery Head".
 * The position word is stripped out of the name before being put back once, in
 * front, where it belongs.
 */
function roleTitle(position: string, headName: string): string {
  const name = String(headName ?? "").trim();
  if (!name) return position;

  // "Head of Graphic Design" -> "Graphic Design"
  const withoutPrefix = name.replace(/^(?:co-)?heads?\s+of\s+/i, "");
  // "Discovery Head" -> "Discovery"
  const core = withoutPrefix.replace(/\s+heads?$/i, "").trim() || name;

  // "The Organizer" is the whole title; "Head of The Organizer" reads wrong.
  if (/^the\s+/i.test(core)) return `${position} — ${core}`;
  return `${position} of ${core}`;
}

/*
 * How the role reads in the acceptance email, e.g. "Head of Graphic Design".
 * Tech gets just the role name on its own — "The Navigator" — since Head,
 * Co-Head and Member all mean the same nothing there: no position word, no
 * "Team Leader" label standing in for one either, just which of the six
 * roles they hold.
 */
function acceptanceRoleLine(committee: string, position: string, headName: string): string {
  if (isFlatCommittee(committee)) return String(headName ?? "").trim();
  return roleTitle(position, headName);
}

/** Where the checklist in the acceptance email actually sends them. */
function headsOnboardingUrl(aucEmail: string): string {
  return `${HEADS_ONBOARDING_URL}?email=${encodeURIComponent(aucEmail)}`;
}

async function sendAcceptanceEmail({
  fullName,
  aucEmail,
  committee,
  headName,
  position,
  cc
}: {
  fullName: string;
  aucEmail: string;
  committee: string;
  headName: string;
  position: string;
  cc: string;
}): Promise<void> {
  if (!gmailConfigured()) return;

  const onboardingUrl = headsOnboardingUrl(aucEmail);
  const roleLine = acceptanceRoleLine(committee, position, headName);
  const subject = `Resala AUC: welcome to ${committee} — you're in!`;
  const body = [
    `Hi ${fullName},`,
    "",
    `"Ana maly." Not my problem. Dr. Sherif Abdel Azeem, the professor whose class project became Resala, refused to accept that from his students. That refusal grew into a room of 50 people, then a nationwide NGO with over 100,000 volunteers across Egypt. One reason, carried forward every year by one more person who decides it is their problem.`,
    "",
    `This year, that person is you. Build the First Step was our call, and you answered it.`,
    "",
    "-----------------------------------------------",
    `YOU ARE IN: ${roleLine.toUpperCase()}`,
    committee,
    "-----------------------------------------------",
    "",
    "It wasn't an easy call. We went through every interview and every task submission, and out of everyone who applied, we believe you're right for this. We're genuinely happy to have you.",
    "",
    "This is your initial acceptance. It becomes final at the board meeting on 31 August, where you sign the letter of responsibility for the role. Between now and then, start meeting your committee and getting to know the people you will be working with.",
    "",
    "",
    "STEP 1 — REPLY TO THIS EMAIL WITHIN 24 HOURS",
    "",
    "Reply directly to this email confirming all three:",
    `  - You're ${fullName}, and you're taking this role.`,
    "  - You can attend both dates below.",
    "  - You consent to your WhatsApp number being added to the board group,",
    "    which is where the team coordinates day to day.",
    "",
    "",
    "BOTH DAYS ARE MANDATORY",
    "",
    "  Monday 31 August",
    "    2:00 - 4:00 PM   Engagement Fair, day one",
    "    4:00 - 8:00 PM   Board meeting, offline and in person",
    "",
    "  Tuesday 1 September",
    "    2:00 - 4:00 PM   Engagement Fair, day two",
    "",
    "Put both days in your calendar now. If either is a problem, say so in your reply.",
    "",
    "",
    "STEP 2 — YOUR ONBOARDING CHECKLIST",
    "",
    "Completing this checklist is mandatory. It is part of the recruitment",
    "process, not an extra, and it cannot be skipped.",
    "",
    "  1. Confirm you have sent the reply above.",
    `  2. Watch the leadership vs. management video: ${LEADERSHIP_VIDEO_URL}`,
    `  3. Send us your notes on what stuck with you, by ${VIDEO_NOTES_DEADLINE}.`,
    "",
    `Open your checklist: ${onboardingUrl}`,
    "",
    "",
    "Welcome to the team. Let's build something real this year.",
    "",
    "Best,",
    "Resala AUC",
    "",
    "-----------------------------------------------",
    "Please note: this email is not proof of contribution. It only",
    "confirms your selection, not any work done for the club yet, and",
    "can't be used as documentation now or later. Real proof comes at",
    "the end of the semester, based on what you actually contribute.",
    "",
    "Resala AUC - Build the First Step"
  ].join("\n");

  const html = buildAcceptanceEmailHtml({ fullName, committee, headName, position, onboardingUrl });
  const accessToken = await getGmailAccessToken();
  const rawMessage = buildRawEmailMessage({
    from: `${GMAIL_SENDER_NAME} <${GMAIL_SENDER_EMAIL}>`,
    to: aucEmail,
    cc: cc || undefined,
    subject,
    text: body,
    html,
    attachments: []
  });

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: rawMessage })
  });

  if (!response.ok) {
    throw new Error(`Gmail send failed: ${await response.text()}`);
  }
}

export function buildAcceptanceEmailHtml({
  fullName,
  committee,
  headName,
  position,
  onboardingUrl
}: {
  fullName: string;
  committee: string;
  headName: string;
  position: string;
  onboardingUrl: string;
}): string {
  const roleLine = acceptanceRoleLine(committee, position, headName);

  /*
   * The three dates are the one thing in this email that costs someone their
   * place if they skim past it, so they get their own block with the date
   * itself carrying the weight — never buried inside a checklist sentence.
   */
  const dates = [
    {
      when: "Monday 31 August",
      events: [
        "2:00 &ndash; 4:00 PM &middot; Engagement Fair, day one",
        "4:00 &ndash; 8:00 PM &middot; Board meeting, offline and in person"
      ]
    },
    {
      when: "Tuesday 1 September",
      events: ["2:00 &ndash; 4:00 PM &middot; Engagement Fair, day two"]
    }
  ];

  /*
   * A step opens on a Royal Blue numeral in the margin rather than a filled
   * box. Boxes are spent on the two things that must not be skimmed — the role
   * and the dates — so the steps stay quiet and the card keeps its air.
   */
  /*
   * A bulleted item. Mail clients treat <ul> inconsistently enough that the
   * marker and the text drift apart, so the bullet sits in its own fixed-width
   * cell and the text wraps in the next one — which also keeps a wrapped second
   * line aligned under the first rather than under the bullet.
   */
  const bullet = (text: string) => `
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 9px;">
                  <tr>
                    <td width="20" valign="top" style="width:20px;padding:0;">
                      <div class="blue" style="font-size:17px;line-height:1.5;color:#0c2c80;font-weight:bold;">&bull;</div>
                    </td>
                    <td valign="top" style="padding:0;">
                      <div class="body-text ink" style="font-size:16px;line-height:1.55;color:#1b1f23;">${text}</div>
                    </td>
                  </tr>
                </table>`;

  const stepHeading = (n: string, title: string) => `
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 13px;">
                  <tr>
                    <td width="36" valign="top" style="width:36px;padding:0;">
                      <div class="stepnum" style="font-family:Arial Black,Arial Bold,Arial,sans-serif;font-size:28px;line-height:1;font-weight:900;color:#0c2c80;">${n}</div>
                    </td>
                    <td valign="top" style="padding:3px 0 0;">
                      <div class="stepttl blue" style="font-size:19px;line-height:1.3;font-weight:bold;color:#0c2c80;">${title}</div>
                    </td>
                  </tr>
                </table>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <!-- Declaring both schemes stops Apple Mail and Outlook running their own
         blind inversion, which is what turns Royal-Blue-on-white into near-black
         on near-black. The dark palette below is a deliberate design instead. -->
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>You're in — welcome to ${escapeHtml(committee)}</title>
    <!--[if mso]>
    <style>
      .hero, .stepnum { font-family: Arial Black, Arial, sans-serif !important; }
      .body-text, .ink, .blue, .muted, .faint { font-family: Arial, sans-serif !important; }
    </style>
    <![endif]-->
    <style>
      :root { color-scheme: light dark; supported-color-schemes: light dark; }

      /* Phones: the card sheds its side padding first, then the display sizes
         step down — so the statement, the role and the three dates keep their
         weight instead of every line collapsing into one grey block. */
      @media only screen and (max-width: 480px) {
        .pad      { padding-left: 24px !important; padding-right: 24px !important; }
        .hero     { font-size: 40px !important; letter-spacing: -1.5px !important; }
        .rolename { font-size: 20px !important; }
        .stepttl  { font-size: 17.5px !important; }
        .p        { font-size: 16px !important; }
        .datewhen { font-size: 16.5px !important; }
        .cta-td   { display: block !important; width: 100% !important; }
        .cta-text { display: block !important; text-align: center !important; }
      }

      /* Dark mode. Royal Blue is a *light-ground* colour: on a dark card it
         falls to roughly 1.5:1 and vanishes, so every blue mark moves to Sky
         Blue. Sunshine with Charcoal text already passes on either ground, so
         the CTA is left untouched and stays the same object in both themes. */
      @media (prefers-color-scheme: dark) {
        .wrap     { background: #0d111c !important; }
        .card     { background: #161c2b !important; border-color: #2a3348 !important; }
        .masthead { background: #101833 !important; }
        .footer   { background: #101833 !important; }
        .ink      { color: #f4efe6 !important; }
        .blue,
        .stepnum,
        .hero,
        .eyebrow,
        .goldlbl,
        .foot-b   { color: #a7d4f2 !important; }
        .muted    { color: #c3cbd9 !important; }
        .faint    { color: #93a0b4 !important; }
        .askbox   { background: #1c2439 !important; border-left-color: #a7d4f2 !important; }
        .datecell { background: #131a2b !important; border-color: #2a3348 !important; border-left-color: #eac262 !important; }
        .rule     { border-top-color: #2a3348 !important; }
        .foot-a   { color: #ffffff !important; }
      }

      /* Outlook.com and the Gmail app repaint colours instead of honouring the
         query above, and tag whatever they touched with these attributes. They
         are the only hook available for putting the contrast back. */
      [data-ogsc] .ink     { color: #f4efe6 !important; }
      [data-ogsc] .blue,
      [data-ogsc] .stepnum,
      [data-ogsc] .hero,
      [data-ogsc] .eyebrow,
      [data-ogsc] .goldlbl,
      [data-ogsc] .foot-b  { color: #a7d4f2 !important; }
      [data-ogsc] .muted   { color: #c3cbd9 !important; }
      [data-ogsc] .faint   { color: #93a0b4 !important; }
      [data-ogsb] .card    { background: #161c2b !important; }
      [data-ogsb] .askbox  { background: #1c2439 !important; }
      [data-ogsb] .datecell { background: #131a2b !important; }
      /* The CTA must never be repainted: charcoal on Sunshine is the one pair
         that holds on any ground, and an inverted version costs us the button. */
      [data-ogsb] .cta      { background: #eac262 !important; }
      [data-ogsc] .cta-text { color: #1b1f23 !important; }
    </style>
  </head>
  <body class="wrap" style="margin:0;padding:0;background:#fdf9f3;color:#1b1f23;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
    <!-- Preheader: what the inbox shows, and the two things actually due. -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">You're in. Reply within 24 hours, and keep 31 Aug and 1 Sep free.</div>

    <table role="presentation" class="wrap" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fdf9f3;margin:0;padding:18px 0;">
      <tr>
        <td align="center" style="padding:0 12px;">
          <table role="presentation" class="card" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #ece2d2;border-radius:20px;overflow:hidden;">

            <!-- Masthead. The eyebrow is text, not part of the logo, so a client
                 with remote images turned off still shows a branded header
                 rather than an anonymous blue bar. -->
            <tr>
              <td class="masthead" align="center" style="background:#0c2c80;padding:20px 28px 16px;">
                <img src="${escapeHtml(EMAIL_LOGO_URL)}" alt="Resala AUC" width="72" style="display:block;width:72px;max-width:72px;height:auto;border:0;outline:none;text-decoration:none;margin:0 auto 9px;">
                <div class="eyebrow" style="font-size:11px;line-height:1.4;letter-spacing:2.4px;text-transform:uppercase;color:#a7d4f2;font-weight:bold;">Heads Recruitment &middot; 2026</div>
              </td>
            </tr>

            <!-- The statement, carried on the card the way the announcement
                 carries its pyramid — the masthead stays brand only. -->
            <tr>
              <td class="pad" style="padding:26px 40px 0;">
                <p class="body-text ink p" style="margin:0 0 16px;font-size:17px;line-height:1.6;color:#1b1f23;">Hi ${escapeHtml(fullName)},</p>
                <div class="hero" style="font-family:Arial Black,Arial Bold,Arial,sans-serif;font-size:52px;line-height:1.02;font-weight:900;color:#0c2c80;letter-spacing:-2px;">You&rsquo;re in.</div>
              </td>
            </tr>

            <!-- Story -->
            <tr>
              <td class="pad" style="padding:20px 40px 0;">
                <p class="body-text muted p" style="margin:0 0 16px;font-size:17px;line-height:1.65;color:#3f4650;">&ldquo;Ana maly.&rdquo; Not my problem. Dr. Sherif Abdel Azeem, the professor whose class project became Resala, refused to accept that from his students. That refusal grew into a room of 50 people, then a nationwide NGO with over 100,000 volunteers across Egypt &mdash; one reason, carried forward every year by one more person who decides it <i>is</i> their problem.</p>
                <p class="body-text ink p" style="margin:0 0 22px;font-size:17px;line-height:1.65;color:#1b1f23;">This year, that person is you. <b>Build the First Step</b> was our call, and you answered it.</p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px;">
                  <tr>
                    <td class="askbox" style="background:#fdf9f3;border-left:5px solid #0c2c80;border-radius:4px;padding:17px 20px;">
                      <div class="goldlbl" style="font-size:11px;color:#0c2c80;text-transform:uppercase;letter-spacing:2px;font-weight:bold;margin-bottom:9px;">You have been selected as</div>
                      <div class="rolename ink" style="font-size:22px;line-height:1.3;font-weight:bold;color:#1b1f23;">${escapeHtml(roleLine)}</div>
                      <div class="muted" style="font-size:14.5px;line-height:1.5;color:#3f4650;margin-top:6px;">${escapeHtml(committee)}</div>
                    </td>
                  </tr>
                </table>

                <p class="body-text muted p" style="margin:0 0 20px;font-size:17px;line-height:1.65;color:#3f4650;">It wasn&rsquo;t an easy call. We went through every interview and every task submission, and out of everyone who applied, we believe you&rsquo;re right for this. We&rsquo;re genuinely happy to have you.</p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0;">
                  <tr>
                    <td class="askbox" style="background:#fdf9f3;border-left:5px solid #eac262;border-radius:4px;padding:17px 20px;">
                      <div class="goldlbl" style="font-size:11px;color:#0c2c80;text-transform:uppercase;letter-spacing:2px;font-weight:bold;margin-bottom:9px;">This is an initial acceptance</div>
                      <div class="body-text ink" style="font-size:15.5px;line-height:1.65;color:#1b1f23;">It becomes final at the board meeting on <b>31 August</b>, where you sign the <b>letter of responsibility</b> for the role.</div>
                      <div class="body-text muted" style="font-size:15px;line-height:1.6;color:#3f4650;margin-top:7px;">Between now and then, start meeting your committee and getting to know the people you will be working with.</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr><td class="pad" style="padding:26px 40px 0;"><div class="rule" style="border-top:1px solid #ece2d2;font-size:0;line-height:0;">&nbsp;</div></td></tr>

            <!-- Step 1 -->
            <tr>
              <td class="pad" style="padding:24px 40px 0;">
                ${stepHeading("1", "Reply to this email within 24 hours")}
                <div class="body-text muted" style="font-size:15.5px;line-height:1.6;color:#3f4650;margin:0 0 12px;">Just hit reply and confirm all three:</div>
                ${bullet(`You&rsquo;re <b>${escapeHtml(fullName)}</b>, and you&rsquo;re taking this role.`)}
                ${bullet("You can attend <b>both dates</b> below.")}
                ${bullet("You consent to your <b>WhatsApp number</b> being added to the board group, which is where the team coordinates day to day.")}
              </td>
            </tr>

            <!-- The three dates. Each gets its own Sunshine rule so the block
                 reads as three separate commitments, not one paragraph. -->
            <tr>
              <td class="pad" style="padding:18px 40px 0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td class="askbox" style="background:#fdf9f3;border-left:5px solid #eac262;border-radius:4px;padding:17px 20px;">
                      <div class="goldlbl" style="font-size:11px;color:#0c2c80;text-transform:uppercase;letter-spacing:2px;font-weight:bold;margin-bottom:15px;">Both days are mandatory</div>
                      ${dates
                        .map(
                          (d, i) => `
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 ${i === dates.length - 1 ? "0" : "10px"};">
                        <tr>
                          <td class="datecell" style="background:#ffffff;border:1px solid #ece2d2;border-left:4px solid #eac262;border-radius:4px;padding:11px 14px;">
                            <div class="datewhen blue" style="font-size:17px;line-height:1.3;font-weight:bold;color:#0c2c80;">${d.when}</div>
                            ${d.events
                              .map(
                                (e) =>
                                  `<div class="muted" style="font-size:14px;line-height:1.5;color:#3f4650;margin-top:4px;">${e}</div>`
                              )
                              .join("")}
                          </td>
                        </tr>
                      </table>`
                        )
                        .join("")}
                    </td>
                  </tr>
                </table>
                <div class="faint" style="font-size:13.5px;line-height:1.6;color:#6b7280;margin-top:11px;">Put both days in your calendar now. If either is a problem, say so in your reply.</div>
              </td>
            </tr>

            <tr><td class="pad" style="padding:26px 40px 0;"><div class="rule" style="border-top:1px solid #ece2d2;font-size:0;line-height:0;">&nbsp;</div></td></tr>

            <!-- Step 2 -->
            <tr>
              <td class="pad" style="padding:24px 40px 0;">
                ${stepHeading("2", "Finish your onboarding checklist")}
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 14px;">
                  <tr>
                    <td class="askbox" style="background:#fdf9f3;border-left:5px solid #eac262;border-radius:4px;padding:13px 16px;">
                      <div class="body-text ink" style="font-size:15px;line-height:1.6;color:#1b1f23;"><b>This is mandatory.</b> The checklist is part of the recruitment process, not an extra on top of it, and it cannot be skipped.</div>
                    </td>
                  </tr>
                </table>
                ${bullet("Confirm you have sent the reply above.")}
                ${bullet(`Watch the <a href="${escapeHtml(LEADERSHIP_VIDEO_URL)}" target="_blank" rel="noopener" style="color:#0c2c80;font-weight:bold;">leadership vs. management video</a>.`)}
                ${bullet(`Send us your notes on what stuck with you, <b>by ${escapeHtml(VIDEO_NOTES_DEADLINE)}</b>.`)}
                <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>

                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td class="cta cta-td" align="center" style="background:#eac262;border-radius:12px;">
                      <a class="cta-text" href="${escapeHtml(onboardingUrl)}" target="_blank" rel="noopener" style="display:inline-block;padding:15px 36px;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:bold;letter-spacing:.3px;color:#1b1f23;text-decoration:none;">Open my onboarding checklist</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Sign-off -->
            <tr>
              <td class="pad" style="padding:28px 40px 0;">
                <p class="body-text ink" style="margin:0 0 4px;font-size:17px;line-height:1.5;color:#1b1f23;font-weight:bold;">Welcome to the team.</p>
                <p class="body-text muted" style="margin:0 0 16px;font-size:17px;line-height:1.6;color:#3f4650;">Let&rsquo;s build something real this year.</p>
                <p class="body-text ink" style="margin:0;font-size:17px;line-height:1.6;color:#1b1f23;">Best,<br>Resala AUC</p>
              </td>
            </tr>

            <!-- Fine print, deliberately last on the card: it is true and it
                 matters, but it must not compete with the two things asked for. -->
            <tr>
              <td class="pad" style="padding:24px 40px 26px;">
                <div class="rule" style="border-top:1px solid #ece2d2;font-size:0;line-height:0;margin-bottom:14px;">&nbsp;</div>
                <div class="faint" style="font-size:12px;line-height:1.65;color:#6b7280;">
                  <b>Please note:</b> this email is not proof of contribution. It only confirms your selection &mdash; not any work done for the club yet &mdash; and cannot be used as documentation now or later. Real proof comes at the end of the semester, based on what you actually contribute.
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td class="footer" align="center" style="background:#0c2c80;padding:16px 28px;">
                <p class="foot-a" style="margin:0 0 4px;font-size:15px;line-height:1.5;color:#ffffff;font-weight:bold;">beyond Ana Maly</p>
                <p class="foot-b" style="margin:0;font-size:12px;line-height:1.6;letter-spacing:1.2px;text-transform:uppercase;color:#a7d4f2;">Build the First Step &middot; @resalaauc</p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * The extension announcement: which of a committee's own head roles are
 * still open through the extension window, and that they can now open their
 * own interview slots for it directly — no request to admin needed. `roles`
 * is exactly the list the committee should actually keep interviewing for;
 * this is not "you have empty roles," it is "here is what to still recruit
 * for," so a role deliberately left unfilled never appears here.
 */
export function buildSlotExtensionAnnouncementEmailText({
  directorName,
  committee,
  roles,
  extensionEnd
}: {
  directorName: string;
  committee: string;
  roles: string[];
  extensionEnd: string;
}): string {
  return [
    `Hi ${directorName},`,
    "",
    `Recruitment is extending through ${extensionEnd} for ${committee}, specifically to keep interviewing for:`,
    ...roles.map((role) => `- ${role}`),
    "",
    "You can open your own interview slots for these dates directly — no need to ask us. In your committee " +
      `portal, open the Slots tab: ${COMMITTEE_PORTAL_URL}`,
    "",
    "A day starting from nothing needs at least 4 different times in one go; once a day already has that many, " +
      "add just one more whenever you need it. Every slot runs your committee's own established interview length.",
    "",
    "Thanks for keeping this moving.",
    "",
    "Best,",
    "Resala AUC"
  ].join("\n");
}

export function buildSlotExtensionAnnouncementEmailHtml({
  directorName,
  committee,
  roles,
  extensionEnd
}: {
  directorName: string;
  committee: string;
  roles: string[];
  extensionEnd: string;
}): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f3ea;color:#172033;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f7f3ea;margin:0;padding:24px 0;">
      <tr>
        <td align="center" style="padding:0 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;width:100%;background:#ffffff;border:1px solid #eadfca;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="background:#0d2b45;padding:28px 28px 34px;text-align:center;color:#ffffff;">
                <img src="${escapeHtml(EMAIL_LOGO_URL)}" alt="Resala AUC" width="128" style="display:block;width:128px;max-width:128px;height:auto;border:0;margin:0 auto;">
                <div style="font-size:26px;line-height:1.25;color:#ffffff;font-weight:bold;margin-top:20px;">Recruitment extended through ${escapeHtml(extensionEnd)}</div>
                <div style="font-size:15px;line-height:1.5;color:#dbe7ef;margin-top:8px;">${escapeHtml(committee)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 28px 8px;">
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Hi ${escapeHtml(directorName)},</p>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#4b5563;">
                  Recruitment is extending through <b>${escapeHtml(extensionEnd)}</b> for ${escapeHtml(committee)}, specifically to keep interviewing for:
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;">
                  <tr>
                    <td style="background:#fff7e8;border:1px solid #f0d7a5;border-left:5px solid #f5a623;border-radius:14px;padding:18px;">
                      ${roles
                        .map(
                          (role) =>
                            `<div style="font-size:16px;line-height:1.6;font-weight:bold;color:#0d2b45;">${escapeHtml(role)}</div>`
                        )
                        .join("")}
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px;">
                  <tr>
                    <td style="background:#f8fafc;border:1px solid #e6edf2;border-radius:14px;padding:18px;">
                      <div style="font-size:13px;color:#0d2b45;text-transform:uppercase;letter-spacing:1px;font-weight:bold;margin-bottom:10px;">You can open these slots yourself</div>
                      <div style="font-size:15px;line-height:1.6;color:#172033;margin-bottom:14px;">
                        No need to ask us — in your committee portal, open the <b>Slots</b> tab. A day starting from
                        nothing needs at least 4 different times in one go; once a day already has that many, add
                        just one more whenever you need it. Every slot runs your committee's own established
                        interview length.
                      </div>
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="border-radius:10px;background:#0d2b45;">
                            <a href="${escapeHtml(COMMITTEE_PORTAL_URL)}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:10px;">Open your committee portal</a>
                          </td>
                        </tr>
                      </table>
                      <div style="font-size:12.5px;line-height:1.5;color:#667085;margin-top:10px;">${escapeHtml(COMMITTEE_PORTAL_URL)}</div>
                    </td>
                  </tr>
                </table>

                <p style="margin:0 0 4px;font-size:16px;line-height:1.6;color:#172033;font-weight:bold;">Thanks for keeping this moving.</p>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Best,<br>Resala AUC</p>
              </td>
            </tr>
            <tr>
              <td style="background:#f3efe5;padding:16px 28px;text-align:center;border-top:1px solid #eadfca;">
                <div style="font-size:12px;line-height:1.5;color:#667085;">Resala AUC · Build the First Step</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function loadDirectorApplicants(
  token: string,
  email: string
): Promise<{
  department: string;
  positionType: string;
  directorName: string;
  applicants: Array<Record<string, string | number>>;
}> {
  const normalizedEmail = normalize(email);
  if (!normalizedEmail) {
    throw new Error("Enter your AUC email.");
  }

  const { entries } = await loadHierarchy(token);
  const match = entries.find(
    (entry) =>
      normalize(entry.aucEmail ?? "") === normalizedEmail &&
      Boolean(entry.department) &&
      (entry.positionType === "Director" || entry.positionType === "Vice-Director")
  );

  if (!match) {
    throw new Error("No director access found for this email.");
  }

  const department = match.department;

  const sheetName = await getSheetName(token);
  await ensureInterviewScoreHeaders(token, sheetName);
  await ensureTaskScoreHeaders(token, sheetName);
  await ensureTaskNoteHeaders(token, sheetName);

  const totalCols = HEADERS.length + INTERVIEW_SCORE_HEADERS.length + TASK_SCORE_HEADERS.length + TASK_NOTE_HEADERS.length;
  const width = columnLetter(totalCols);

  const [applicationResponse, reservationResponse] = await Promise.all([
    sheetsFetch(token, "GET", `${sheetRange(sheetName, `A2:${width}`)}`),
    sheetsFetch(token, "GET", `${sheetRange(RESERVATION_SHEET_NAME, "A2:N")}`)
  ]);

  const rows = ((await applicationResponse.json()).values ?? []) as string[][];
  const reservationRows = ((await reservationResponse.json()).values ?? []) as string[][];

  const interviewStatusByEmail = new Map<string, string>();
  for (const row of reservationRows) {
    const resEmail = normalize(String(row[4] ?? ""));
    const status = String(row[8] ?? "").trim();
    if (resEmail && status) interviewStatusByEmail.set(resEmail, status);
  }

  const acceptedEmails = new Set(
    entries.map((entry) => normalize(entry.aucEmail ?? "")).filter(Boolean)
  );

  const applicants = rows
    .map((row) => {
      const roleAppliedFor = row[7] ?? "";
      const secondPreference = row[17] ?? "";
      const preferenceMatch =
        normalizeRole(roleAppliedFor) === normalizeRole(department)
          ? 1
          : normalizeRole(secondPreference) === normalizeRole(department)
            ? 2
            : 0;
      if (!preferenceMatch) return null;

      const applicantEmail = normalize(String(row[2] ?? ""));
      if (acceptedEmails.has(applicantEmail)) return null;

      const interviewStatus = interviewStatusByEmail.get(applicantEmail) ?? "";
      const taskSubmission = getTaskSubmissionState(row);

      if (interviewStatus !== "Done" || taskSubmission.taskSubmissionStatus !== "Submitted") return null;

      return {
        fullName: row[1] ?? "",
        aucEmail: row[2] ?? "",
        studentId: row[3] ?? "",
        major: row[4] ?? "",
        yearLevel: row[5] ?? "",
        phone: row[6] ?? "",
        roleAppliedFor,
        secondPreference,
        preferenceMatch,
        whyThisRole: row[10] ?? "",
        whyChooseYourself: row[11] ?? "",
        hopeToLearn: row[12] ?? "",
        previousResalaExperience: row[13] ?? "",
        taskLink: preferenceMatch === 1 ? taskSubmission.firstPreferenceTaskLink : taskSubmission.secondPreferenceTaskLink
      };
    })
    .filter((applicant): applicant is NonNullable<typeof applicant> => applicant !== null);

  return {
    department,
    positionType: match.positionType,
    directorName: match.name,
    applicants
  };
}

async function updateApplicantScore(
  token: string,
  payload: AdminUpdateScorePayload
): Promise<{ updated: boolean }> {
  const sheetName = await getSheetName(token);
  await ensureInterviewScoreHeaders(token, sheetName);

  const totalCols = HEADERS.length + INTERVIEW_SCORE_HEADERS.length;
  const width = columnLetter(totalCols);
  const response = await sheetsFetch(token, "GET", `${sheetRange(sheetName, `A2:${width}`)}`);
  const rows = (await response.json()).values ?? [];

  const rowIndex = rows.findIndex((row: string[]) => normalize(row[2]) === normalize(payload.aucEmail));
  if (rowIndex === -1) {
    throw new Error(`Applicant not found: ${payload.aucEmail}`);
  }

  const sheetRow = rowIndex + 2;
  const startCol = columnLetter(HEADERS.length + 1); // X
  const endCol = columnLetter(HEADERS.length + INTERVIEW_SCORE_HEADERS.length); // AH

  await sheetsFetch(token, "PUT", `${sheetRange(sheetName, `${startCol}${sheetRow}:${endCol}${sheetRow}`)}?valueInputOption=RAW`, {
    values: [[
      payload.notesUrl,
      payload.firstPreferenceScore,
      payload.secondPreferenceScore,
      payload.recommendedRole ?? "",
      payload.visionMotivationScore ?? "",
      payload.leadershipScore ?? "",
      payload.ownershipScore ?? "",
      payload.selfAwarenessCommitmentScore ?? "",
      payload.roleSpecificModulesScore ?? "",
      payload.finalJudgmentScore ?? "",
      payload.totalScore ?? "",
      payload.bestStrength1 ?? "",
      payload.bestStrength2 ?? ""
    ]]
  });

  return { updated: true };
}

async function updateApplicantTaskScore(
  token: string,
  payload: AdminUpdateTaskScorePayload
): Promise<{ updated: boolean }> {
  const sheetName = await getSheetName(token);
  await ensureInterviewScoreHeaders(token, sheetName);
  await ensureTaskScoreHeaders(token, sheetName);
  await ensureTaskNoteHeaders(token, sheetName);

  const totalCols = HEADERS.length + INTERVIEW_SCORE_HEADERS.length + TASK_SCORE_HEADERS.length + TASK_NOTE_HEADERS.length;
  const width = columnLetter(totalCols);
  const response = await sheetsFetch(token, "GET", `${sheetRange(sheetName, `A2:${width}`)}`);
  const rows = (await response.json()).values ?? [];

  const rowIndex = rows.findIndex((row: string[]) => normalize(row[2]) === normalize(payload.aucEmail));
  if (rowIndex === -1) {
    throw new Error(`Applicant not found: ${payload.aucEmail}`);
  }

  const sheetRow = rowIndex + 2;
  const startCol = columnLetter(HEADERS.length + INTERVIEW_SCORE_HEADERS.length + 1);
  const endCol = columnLetter(HEADERS.length + INTERVIEW_SCORE_HEADERS.length + TASK_SCORE_HEADERS.length + TASK_NOTE_HEADERS.length);

  await sheetsFetch(token, "PUT", `${sheetRange(sheetName, `${startCol}${sheetRow}:${endCol}${sheetRow}`)}?valueInputOption=RAW`, {
    values: [[
      payload.task1UnderstandingScore ?? "",
      payload.task1ExecutionScore ?? "",
      payload.task1PracticalityScore ?? "",
      payload.task1InitiativeScore ?? "",
      payload.task1ClarityScore ?? "",
      payload.task1TotalScore ?? "",
      payload.task2UnderstandingScore ?? "",
      payload.task2ExecutionScore ?? "",
      payload.task2PracticalityScore ?? "",
      payload.task2InitiativeScore ?? "",
      payload.task2ClarityScore ?? "",
      payload.task2TotalScore ?? "",
      payload.task1Notes ?? "",
      payload.task2Notes ?? ""
    ]]
  });

  return { updated: true };
}

async function ensureHierarchySheet(token: string): Promise<void> {
  await ensureSheetTab(token, HIERARCHY_SHEET_NAME);
  await ensureSheetHeaders(token, HIERARCHY_SHEET_NAME, HIERARCHY_HEADERS);
}

async function loadHierarchy(token: string): Promise<{ entries: HierarchyEntry[] }> {
  // buildApplicantCc resolves a panel per applicant, so a batch send would
  // otherwise re-read this whole sheet once per person for an answer that does
  // not change between them.
  if (hierarchyCache && Date.now() - hierarchyCache.at < HIERARCHY_CACHE_MS) {
    return { entries: hierarchyCache.entries };
  }

  await ensureHierarchySheet(token);
  const width = columnLetter(HIERARCHY_HEADERS.length);
  const response = await sheetsFetch(token, "GET", `${sheetRange(HIERARCHY_SHEET_NAME, `A2:${width}`)}`);
  const rows = ((await response.json()).values ?? []) as string[][];

  const entries: HierarchyEntry[] = rows
    .filter((row) => normalize(row[3]))
    .map((row) => ({
      department: String(row[1] ?? ""),
      positionType: String(row[2] ?? ""),
      name: String(row[3] ?? ""),
      aucEmail: String(row[4] ?? ""),
      phone: String(row[5] ?? "")
    }));

  hierarchyCache = { at: Date.now(), entries };
  return { entries };
}

async function saveHierarchy(token: string, payload: AdminSaveHierarchyPayload): Promise<{ saved: number }> {
  const entries = Array.isArray(payload.entries) ? payload.entries : [];
  const cleaned = entries
    .map((entry) => ({
      department: String(entry.department ?? "").trim(),
      positionType: String(entry.positionType ?? "").trim(),
      name: String(entry.name ?? "").trim(),
      aucEmail: String(entry.aucEmail ?? "").trim(),
      phone: String(entry.phone ?? "").trim()
    }))
    .filter((entry) => entry.positionType && entry.name);

  await ensureHierarchySheet(token);
  // Anything cached from before this write is now wrong.
  invalidateHierarchyCache();
  await sheetsFetch(token, "POST", `${sheetRange(HIERARCHY_SHEET_NAME, "A2:F")}:clear`, {});

  if (cleaned.length) {
    const timestamp = new Date().toISOString();
    await sheetsFetch(token, "POST", `${sheetRange(HIERARCHY_SHEET_NAME, "A:F")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      values: cleaned.map((entry) => [timestamp, entry.department, entry.positionType, entry.name, entry.aucEmail, entry.phone])
    });
  }

  invalidateHierarchyCache();
  return { saved: cleaned.length };
}

async function rescheduleInterview(
  token: string,
  payload: AdminReschedulePayload,
  /*
   * False only when this move is one part of a larger action that sends its
   * own single email covering everything that changed — a preference swap
   * that also moves the time, so far. Every existing caller moves a slot on
   * its own and still needs its own email, so they all keep the default.
   */
  notifyApplicant = true
): Promise<{
  updatedReservation: boolean;
  updatedApplication: boolean;
  updatedHeadsApplication: boolean;
  deletedOldEvent: boolean;
  createdNewEvent: boolean;
  emailSent: boolean;
}> {
  const { reservationRowIndex, date, startTime: rawStartTime } = payload;
  const rawEndTime = String(payload.endTime ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid date format. Use YYYY-MM-DD.");
  }

  if (!/^\d{1,2}:\d{2}$/.test(rawStartTime)) {
    throw new Error("Invalid time format. Use HH:MM (24h).");
  }

  const reservationResponse = await sheetsFetch(token, "GET", `${sheetRange(RESERVATION_SHEET_NAME, `A${reservationRowIndex}:N${reservationRowIndex}`)}`);
  const reservationValues = (await reservationResponse.json()).values?.[0] ?? [];

  if (!reservationValues.length) {
    throw new Error(`No reservation found at row ${reservationRowIndex}.`);
  }

  const fullName = String(reservationValues[3] ?? "").trim();
  const aucEmail = String(reservationValues[4] ?? "").trim();
  const studentId = String(reservationValues[5] ?? "").trim();
  const oldSlotId = String(reservationValues[1] ?? "").trim();
  const oldCalendarEventId = String(reservationValues[6] ?? "").trim();
  const roleAppliedFor = String(reservationValues[12] ?? "").trim();
  const secondPreference = String(reservationValues[13] ?? "").trim();

  if (!aucEmail) {
    throw new Error("Reservation is missing applicant email.");
  }

  const [sh, sm] = rawStartTime.split(":").map(Number);
  const startDateTime = `${date}T${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}:00`;

  /*
   * Committees run interviews at different lengths — Operations and Branding
   * are 30 minutes, everyone else 60 — so a reschedule with no explicit end
   * time has to ask which committee it is for, not assume the global default.
   * This matters more now than it used to: a preference swap can move this
   * same reservation to a different committee than the one that first booked
   * it, and that committee's own length is the only correct one to use.
   */
  const committeeDuration =
    COMMITTEE_INTERVIEWS[normalizeRole(roleAppliedFor)]?.durationMinutes ?? INTERVIEW_SLOT_DURATION_MINUTES;
  const endMinutesTotal = sh * 60 + sm + committeeDuration;
  const eh = Math.floor(endMinutesTotal / 60) % 24;
  const em = endMinutesTotal % 60;
  const resolvedEndTime = rawEndTime || `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
  const [reh, rem] = resolvedEndTime.split(":").map(Number);
  // Same midnight wrap as the sheet-derived slots: an admin moving somebody to
  // 23:00 for an hour ends them at 00:00 the following day.
  const endDateTime = resolveEndDateTime(
    startDateTime,
    `${date}T${String(reh).padStart(2, "0")}:${String(rem).padStart(2, "0")}:00`
  );

  const displayHour = sh % 12 || 12;
  const meridiem = sh >= 12 ? "PM" : "AM";
  const slotLabel = `${date} at ${displayHour}:${String(sm).padStart(2, "0")} ${meridiem}`;
  const slotId = `admin-${date}-${String(sh).padStart(2, "0")}${String(sm).padStart(2, "0")}`;
  const fallbackSlot: InterviewSlotOption = {
    id: slotId,
    label: slotLabel,
    date,
    startTime: `${displayHour}:${String(sm).padStart(2, "0")} ${meridiem}`,
    endTime: `${reh % 12 || 12}:${String(rem).padStart(2, "0")} ${reh >= 12 ? "PM" : "AM"}`,
    startDateTime,
    endDateTime,
    capacity: 1,
    active: true,
    reservedCount: 0,
    remaining: 1,
    full: false
  };

  const newSlot = await resolveRescheduleSlot(token, {
    committee: roleAppliedFor,
    date,
    startTime24: `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`,
    currentReservationRowIndex: reservationRowIndex,
    fallbackSlot
  });

  if (newSlot.full) {
    throw new Error("That interview slot is already full. Please choose another slot.");
  }

  let deletedOldEvent = false;
  if (oldCalendarEventId) {
    try {
      deletedOldEvent = await deleteCalendarEvent(oldCalendarEventId);
    } catch {
      console.error(`Failed to delete old calendar event ${oldCalendarEventId}`);
    }
  }

  const applicantPayload: ApplicationPayload = {
    timestamp: new Date().toISOString(),
    fullName,
    aucEmail,
    studentId,
    major: "",
    yearLevel: "",
    phone: "",
    roleAppliedFor,
    roleStepTitle: "",
    roleDescription: "",
    secondPreference,
    whyThisRole: "",
    whyChooseYourself: "",
    interviewSlot: newSlot.label,
    interviewSlotId: newSlot.id,
    interviewSlotLabel: newSlot.label,
    createdAt: new Date().toISOString()
  };

  const calendarToken = await getGmailAccessToken();
  // The replacement event needs the same panel on it, or the committee running
  // the interview loses the invite the moment anyone moves the time. They are
  // guests on the invite only — the reschedule email itself goes to the
  // applicant alone.
  const reschedulePanel = await getCommitteePanel(token, roleAppliedFor).catch(() => []);
  const newCalendarEvent = await createCalendarEvent(calendarToken, applicantPayload, newSlot, reschedulePanel);
  if (newSlot.sheet === "heads") {
    await updateHeadsSlotCalendarFields(token, newSlot, newCalendarEvent);
  } else {
    await updateSlotCalendarFields(token, newSlot, newCalendarEvent);
  }

  const newReminderSendAt = subtractMinutesFromLocalDateTime(newSlot.startDateTime, INTERVIEW_REMINDER_MINUTES);

  await sheetsFetch(token, "PUT", `${sheetRange(RESERVATION_SHEET_NAME, `B${reservationRowIndex}:C${reservationRowIndex}`)}?valueInputOption=RAW`, {
    values: [[newSlot.id, newSlot.label]]
  });
  await sheetsFetch(token, "PUT", `${sheetRange(RESERVATION_SHEET_NAME, `G${reservationRowIndex}:H${reservationRowIndex}`)}?valueInputOption=RAW`, {
    values: [[newCalendarEvent.calendarEventId, newCalendarEvent.meetLink]]
  });
  await sheetsFetch(token, "PUT", `${sheetRange(RESERVATION_SHEET_NAME, `J${reservationRowIndex}:L${reservationRowIndex}`)}?valueInputOption=RAW`, {
    values: [[newReminderSendAt, "", "Pending"]]
  });

  if (oldSlotId && oldSlotId !== newSlot.id) {
    // Both sheets: the reservation row no longer names the old slot, so
    // whichever sheet holds it should stop advertising a meeting there.
    await clearFreedSlotCalendarFields(token, new Set([oldSlotId]));
    await clearFreedHeadsSlot(token, oldSlotId);
  }

  const sheetName = await getSheetName(token);
  const applicationWidth = columnLetter(HEADERS.length);
  const applicationResponse = await sheetsFetch(token, "GET", `${sheetRange(sheetName, `A2:${applicationWidth}`)}`);
  const applicationRows = (await applicationResponse.json()).values ?? [];
  const appRowIndex = applicationRows.findIndex((row: string[]) => normalize(row[2]) === normalize(aucEmail));
  let updatedApplication = false;

  if (appRowIndex !== -1) {
    const sheetRow = appRowIndex + 2;
    await sheetsFetch(token, "PUT", `${sheetRange(sheetName, `O${sheetRow}`)}?valueInputOption=RAW`, {
      values: [[newSlot.label]]
    });
    updatedApplication = true;
  }

  // The portals read the slot off the Heads Applications row, not off the
  // reservation, so a reschedule that skipped this row showed the old time to
  // every interviewer until someone re-read the reservations sheet by hand.
  let updatedHeadsApplication = false;
  try {
    updatedHeadsApplication = await updateHeadsApplicationSlot(token, aucEmail, newSlot);
  } catch (error) {
    console.error(
      `Heads application slot not updated for ${aucEmail}: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }

  let emailSent = false;
  if (notifyApplicant) {
    try {
      await sendRescheduleEmail(
        applicantPayload,
        {
          slot: newSlot,
          calendarEventId: newCalendarEvent.calendarEventId,
          meetLink: newCalendarEvent.meetLink
        },
        await buildApplicantCc(token, roleAppliedFor, aucEmail, reschedulePanel)
      );
      emailSent = gmailConfigured();
    } catch (error) {
      console.error(`Reschedule email failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  return {
    updatedReservation: true,
    updatedApplication,
    updatedHeadsApplication,
    deletedOldEvent,
    createdNewEvent: true,
    emailSent
  };
}

/** Interview Slot (P) and Interview Slot ID (Q) on the heads-cycle sheet. */
async function updateHeadsApplicationSlot(
  token: string,
  aucEmail: string,
  slot: InterviewSlotOption
): Promise<boolean> {
  const response = await sheetsFetch(
    token,
    "GET",
    `${sheetRange(HEADS_APPLICATION_SHEET_NAME, "A2:C")}`
  );
  const rows = ((await response.json()).values ?? []) as string[][];
  const index = findCurrentRowIndex(rows, 2, aucEmail);
  if (index === -1) return false;

  const sheetRow = index + 2;
  await sheetsFetch(
    token,
    "PUT",
    `${sheetRange(HEADS_APPLICATION_SHEET_NAME, `P${sheetRow}:Q${sheetRow}`)}?valueInputOption=RAW`,
    { values: [[slot.label, slot.id]] }
  );
  return true;
}

/**
 * The heads cycle keeps its slots in their own sheet, one row per committee per
 * time. A reschedule that cannot find the new time here books a slot nobody
 * counts: the applicant's reservation points at an id no slot owns, so the time
 * still reads as free and two people can be given it.
 */
async function findHeadsSlotForReschedule(
  token: string,
  {
    committee,
    date,
    startTime24,
    currentReservationRowIndex
  }: { committee: string; date: string; startTime24: string; currentReservationRowIndex: number }
): Promise<InterviewSlotOption | null> {
  if (!committee) return null;

  const [slotResponse, reservationResponse] = await Promise.all([
    sheetsFetch(token, "GET", `${sheetRange(HEADS_SLOT_SHEET_NAME, "A2:K")}`),
    sheetsFetch(token, "GET", `${sheetRange(RESERVATION_SHEET_NAME, "A2:B")}`)
  ]);
  const slotRows = ((await slotResponse.json()).values ?? []) as string[][];
  const reservationRows = ((await reservationResponse.json()).values ?? []) as string[][];

  const wanted = normalizeRole(committee);
  const match = slotRows
    .map((row, index) => ({ row, rowIndex: index + 2 }))
    .find(
      ({ row }) =>
        normalizeRole(row[1]) === wanted &&
        String(row[2] ?? "").trim() === date &&
        normalizeTime24(row[3]) === startTime24
    );

  if (!match) return null;

  const { row, rowIndex } = match;
  const id = String(row[0] ?? "").trim();
  const startTime = String(row[3] ?? "").trim();
  const endTime = String(row[4] ?? "").trim();
  const capacity = Number(row[7] ?? 1) || 1;
  const active = String(row[8] ?? "TRUE").toLowerCase() !== "false";
  // The applicant's own reservation is about to move onto this slot, so it must
  // not count against the space it is moving into.
  const reservedCount = reservationRows.reduce((count, reservationRow, index) => {
    if (index + 2 === currentReservationRowIndex) return count;
    return normalize(reservationRow[1]) === normalize(id) ? count + 1 : count;
  }, 0);
  const remaining = Math.max(capacity - reservedCount, 0);
  const startDateTime = buildLocalDateTime(date, startTime);
  const endDateTime = resolveEndDateTime(startDateTime, buildLocalDateTime(date, endTime));

  return {
    id,
    label: String(row[5] ?? "").trim() || buildSlotLabel(date, startTime),
    date,
    startTime,
    endTime,
    startDateTime,
    endDateTime,
    capacity,
    active,
    reservedCount,
    remaining,
    full: !active || !startDateTime || !endDateTime || remaining <= 0,
    calendarEventId: String(row[9] ?? "").trim(),
    meetLink: String(row[10] ?? "").trim(),
    rowIndex,
    sheet: "heads"
  };
}

/** Blank the calendar columns on a heads slot nobody holds any more. */
async function clearFreedHeadsSlot(token: string, slotId: string): Promise<void> {
  if (!slotId) return;

  const [slotResponse, reservationResponse] = await Promise.all([
    sheetsFetch(token, "GET", `${sheetRange(HEADS_SLOT_SHEET_NAME, "A2:A")}`),
    sheetsFetch(token, "GET", `${sheetRange(RESERVATION_SHEET_NAME, "A2:B")}`)
  ]);
  const slotIds = ((await slotResponse.json()).values ?? []) as string[][];
  const reservationRows = ((await reservationResponse.json()).values ?? []) as string[][];

  const stillHeld = reservationRows.some((row) => normalize(row[1]) === normalize(slotId));
  if (stillHeld) return;

  const index = slotIds.findIndex((row) => normalize(row[0]) === normalize(slotId));
  if (index === -1) return;

  await sheetsFetch(
    token,
    "PUT",
    `${sheetRange(HEADS_SLOT_SHEET_NAME, `J${index + 2}:K${index + 2}`)}?valueInputOption=RAW`,
    { values: [["", ""]] }
  );
}

async function resolveRescheduleSlot(
  token: string,
  {
    committee,
    date,
    startTime24,
    currentReservationRowIndex,
    fallbackSlot
  }: {
    committee: string;
    date: string;
    startTime24: string;
    currentReservationRowIndex: number;
    fallbackSlot: InterviewSlotOption;
  }
): Promise<InterviewSlotOption> {
  const headsSlot = await findHeadsSlotForReschedule(token, {
    committee,
    date,
    startTime24,
    currentReservationRowIndex
  });
  if (headsSlot) return headsSlot;

  const [slotResponse, reservationResponse] = await Promise.all([
    sheetsFetch(token, "GET", `${sheetRange(SLOT_SHEET_NAME, "A2:I")}`),
    sheetsFetch(token, "GET", `${sheetRange(RESERVATION_SHEET_NAME, "A2:B")}`)
  ]);
  const slotRows = ((await slotResponse.json()).values ?? []) as string[][];
  const reservationRows = (await reservationResponse.json()).values ?? [];

  const match = slotRows
    .map((row: string[], index: number) => ({ row, rowIndex: index + 2 }))
    .find(({ row }) => String(row[1] ?? "").trim() === date && normalizeTime24(row[2]) === startTime24);

  if (!match) {
    return fallbackSlot;
  }

  const row = match.row;
  const id = String(row[0] ?? "").trim();
  const startTime = String(row[2] ?? "").trim();
  const endTime = addMinutesToTime(startTime, INTERVIEW_SLOT_DURATION_MINUTES) || String(row[3] ?? "").trim();
  const label = String(row[4] ?? "").trim() || buildSlotLabel(date, startTime);
  const capacity = Number(row[5] ?? 1) || 1;
  const active = String(row[6] ?? "TRUE").toLowerCase() !== "false" && !isRemovedOverlappingDefaultSlot(id);
  const reservedCount = reservationRows.reduce((count: number, reservationRow: string[], index: number) => {
    const sheetRow = index + 2;
    if (sheetRow === currentReservationRowIndex) return count;
    return normalize(reservationRow[1]) === normalize(id) ? count + 1 : count;
  }, 0);
  const remaining = Math.max(capacity - reservedCount, 0);
  const startDateTime = buildLocalDateTime(date, startTime);
  const endDateTime = resolveEndDateTime(startDateTime, buildLocalDateTime(date, endTime));
  const past = isPastLocalDateTime(startDateTime, CALENDAR_TIME_ZONE);

  return {
    id,
    label,
    date,
    startTime,
    endTime,
    startDateTime,
    endDateTime,
    capacity,
    active,
    reservedCount,
    remaining,
    full: !active || !date || !startTime || !startDateTime || !endDateTime || past || remaining <= 0,
    calendarEventId: String(row[7] ?? "").trim(),
    meetLink: String(row[8] ?? "").trim(),
    rowIndex: match.rowIndex,
    sheet: "director"
  };
}

async function sendRescheduleEmail(
  payload: ApplicationPayload,
  reservation: ReservationDetails,
  cc = ""
): Promise<void> {
  if (!gmailConfigured()) return;

  const slot = payload.interviewSlotLabel ?? payload.interviewSlot;
  const subject = "Resala AUC: Your interview has been rescheduled";
  const body = [
    `Hi ${payload.fullName},`,
    "",
    "Your Resala AUC interview has been rescheduled.",
    "",
    `New interview slot: ${slot}.`,
    `Google Meet link: ${reservation.meetLink}`,
    "You will receive a new Google Calendar invitation for this time.",
    "",
    "If you have any questions, just reply to this email.",
    "",
    "Best,",
    "Resala AUC"
  ].join("\n");

  const html = buildRescheduleEmailHtml({ fullName: payload.fullName, slot, meetLink: reservation.meetLink });
  const accessToken = await getGmailAccessToken();
  const rawMessage = buildRawEmailMessage({
    from: `${GMAIL_SENDER_NAME} <${GMAIL_SENDER_EMAIL}>`,
    to: payload.aucEmail,
    cc: cc || undefined,
    subject,
    text: body,
    html,
    attachments: []
  });

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ raw: rawMessage })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail send failed: ${errorText}`);
  }
}

/**
 * Sent when an interview is called off at the applicant's request. It does not
 * close the door: a cancelled booking leaves the application standing, and the
 * committee can put them on a new time.
 */
async function sendInterviewCancelledEmail(
  { fullName, aucEmail, slot, cc = "" }: { fullName: string; aucEmail: string; slot: string; cc?: string }
): Promise<void> {
  if (!gmailConfigured()) return;

  const subject = "Resala AUC: your application has been withdrawn";
  const body = [
    `Hi ${fullName},`,
    "",
    slot
      ? `We have withdrawn your application and cancelled your interview on ${slot}, as you asked.`
      : "We have withdrawn your application and cancelled your interview, as you asked.",
    "The calendar invitation has been removed. There is nothing left for you to do.",
    "",
    "Thank you for the time you put into applying — it was read, and it was appreciated.",
    "",
    "This closes one application, not the door. Resala is still yours to be part of:",
    "come to the visits, the packing nights and the days out, and apply again whenever",
    "you are ready. We would be glad to have you with us.",
    "",
    "If this was not what you meant, or you change your mind, reply to this email and we will sort it out.",
    "",
    "Best,",
    "Resala AUC"
  ].join("\n");

  const html = buildInterviewCancelledEmailHtml({ fullName, slot });
  const accessToken = await getGmailAccessToken();
  const rawMessage = buildRawEmailMessage({
    from: `${GMAIL_SENDER_NAME} <${GMAIL_SENDER_EMAIL}>`,
    to: aucEmail,
    cc: cc || undefined,
    subject,
    text: body,
    html,
    attachments: []
  });

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: rawMessage })
  });

  if (!response.ok) {
    throw new Error(`Gmail send failed: ${await response.text()}`);
  }
}

export function buildInterviewCancelledEmailHtml({ fullName, slot }: { fullName: string; slot: string }): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f3ea;color:#172033;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f7f3ea;margin:0;padding:24px 0;">
      <tr>
        <td align="center" style="padding:0 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #eadfca;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="background:#0d2b45;padding:24px 28px 30px;text-align:center;color:#ffffff;">
                <img src="${escapeHtml(EMAIL_LOGO_URL)}" alt="Resala AUC" width="128" style="display:block;width:128px;max-width:128px;height:auto;border:0;margin:0 auto;">
                <div style="font-size:26px;line-height:1.2;color:#ffffff;font-weight:bold;margin-top:20px;">Application Withdrawn</div>
                <div style="font-size:15px;line-height:1.5;color:#dbe7ef;margin-top:8px;">The door stays open.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 28px 8px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi ${escapeHtml(fullName)},</p>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">
                  ${slot
                    ? `We have withdrawn your application and cancelled your interview on <b>${escapeHtml(slot)}</b>, as you asked.`
                    : "We have withdrawn your application and cancelled your interview, as you asked."}
                  The calendar invitation has been removed.
                </p>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#4b5563;">
                  Thank you for the time you put into applying — it was read, and it was appreciated.
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;">
                  <tr>
                    <td style="background:#fff7e8;border:1px solid #f0d7a5;border-left:5px solid #f5a623;border-radius:14px;padding:18px;">
                      <div style="font-size:13px;color:#8a4706;text-transform:uppercase;letter-spacing:1px;font-weight:bold;margin-bottom:7px;">You are still one of us</div>
                      <div style="font-size:15px;line-height:1.65;color:#172033;">
                        This closes one application, not the door. Come to the visits, the packing nights and
                        the days out, and apply again whenever you are ready — we would be glad to have you
                        with us.
                      </div>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;">
                  <tr>
                    <td style="background:#f8fafc;border:1px solid #e6edf2;border-radius:14px;padding:16px;">
                      <div style="font-size:15px;line-height:1.55;color:#4b5563;">If this was not what you meant, or you change your mind, reply to this email and we will sort it out.</div>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Best,<br>Resala AUC</p>
              </td>
            </tr>
            <tr>
              <td style="background:#f3efe5;padding:16px 28px;text-align:center;border-top:1px solid #eadfca;">
                <div style="font-size:12px;line-height:1.5;color:#667085;">Resala AUC · Build the First Step</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildRescheduleEmailHtml({ fullName, slot, meetLink }: { fullName: string; slot: string; meetLink: string }): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f3ea;color:#172033;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f7f3ea;margin:0;padding:24px 0;">
      <tr>
        <td align="center" style="padding:0 12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #eadfca;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="background:#0d2b45;padding:24px 28px 30px;text-align:center;color:#ffffff;">
                <img src="${escapeHtml(EMAIL_LOGO_URL)}" alt="Resala AUC" width="128" style="display:block;width:128px;max-width:128px;height:auto;border:0;margin:0 auto;">
                <div style="font-size:26px;line-height:1.2;color:#ffffff;font-weight:bold;margin-top:20px;">Interview Rescheduled</div>
                <div style="font-size:15px;line-height:1.5;color:#dbe7ef;margin-top:8px;">Your updated interview details are below.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 28px 8px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi ${escapeHtml(fullName)},</p>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Your Resala AUC interview has been rescheduled to a new time.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;">
                  <tr>
                    <td style="background:#fff7e8;border:1px solid #f0d7a5;border-left:5px solid #f5a623;border-radius:14px;padding:18px;">
                      <div style="font-size:13px;color:#8a4706;text-transform:uppercase;letter-spacing:1px;font-weight:bold;margin-bottom:7px;">New interview slot</div>
                      <div style="font-size:22px;line-height:1.3;font-weight:bold;color:#0d2b45;">${escapeHtml(slot)}</div>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;">
                  <tr>
                    <td style="background:#f8fafc;border:1px solid #e6edf2;border-radius:14px;padding:16px;">
                      <div style="font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:bold;margin-bottom:8px;">Google Meet</div>
                      <a href="${escapeHtml(meetLink)}" style="color:#0d2b45;font-size:16px;font-weight:bold;text-decoration:underline;">Join the interview meeting</a>
                      <div style="font-size:14px;line-height:1.55;color:#4b5563;margin-top:8px;">A new Google Calendar invitation has been sent. You will also receive a reminder ${INTERVIEW_REMINDER_MINUTES} minutes before.</div>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#4b5563;">If you have any questions, just reply to this email.</p>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Best,<br>Resala AUC</p>
              </td>
            </tr>
            <tr>
              <td style="background:#f3efe5;padding:16px 28px;text-align:center;border-top:1px solid #eadfca;">
                <div style="font-size:12px;line-height:1.5;color:#667085;">Resala AUC · Build the First Step</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function ensureColumnCount(token: string, sheetName: string, minColumnCount: number): Promise<void> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets.properties(sheetId,title,gridProperties)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Sheets metadata request failed: ${errorText}`);
  }

  const body = await response.json();
  const sheet = (body?.sheets ?? []).find((s: { properties?: { title?: string } }) => s?.properties?.title === sheetName);
  const sheetId = sheet?.properties?.sheetId;
  const currentColumnCount = sheet?.properties?.gridProperties?.columnCount ?? 0;

  if (typeof sheetId !== "number" || currentColumnCount >= minColumnCount) return;

  await batchUpdateSpreadsheet(token, [{
    appendDimension: {
      sheetId,
      dimension: "COLUMNS",
      length: minColumnCount - currentColumnCount
    }
  }]);
}

async function getSpreadsheetSheetIds(token: string): Promise<Map<string, number>> {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets.properties(sheetId,title)`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Sheets metadata request failed: ${errorText}`);
  }

  const body = await response.json();
  const sheetIds = new Map<string, number>();

  for (const sheet of body?.sheets ?? []) {
    const title = sheet?.properties?.title;
    const sheetId = sheet?.properties?.sheetId;
    if (typeof title === "string" && typeof sheetId === "number") {
      sheetIds.set(title, sheetId);
    }
  }

  return sheetIds;
}

function buildDeleteRowRequests(sheetId: number | undefined, rowIndexes: number[]): Array<Record<string, unknown>> {
  if (sheetId === undefined) return [];

  return [...rowIndexes]
    .sort((a, b) => b - a)
    .map((rowIndex) => ({
      deleteDimension: {
        range: {
          sheetId,
          dimension: "ROWS",
          startIndex: rowIndex - 1,
          endIndex: rowIndex
        }
      }
    }));
}

async function batchUpdateSpreadsheet(token: string, requests: Array<Record<string, unknown>>): Promise<void> {
  if (!requests.length) return;

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ requests })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Sheets batch update failed: ${errorText}`);
  }
}

async function clearFreedSlotCalendarFields(token: string, slotIds: Set<string>): Promise<number> {
  const reservationResponse = await sheetsFetch(token, "GET", `${sheetRange(RESERVATION_SHEET_NAME, "A2:B")}`);
  const remainingReservationRows = (await reservationResponse.json()).values ?? [];
  const stillReservedSlotIds = new Set(
    remainingReservationRows.map((row: string[]) => String(row[1] ?? "").trim()).filter(Boolean).map((slotId: string) => normalize(slotId))
  );

  const slotResponse = await sheetsFetch(token, "GET", `${sheetRange(SLOT_SHEET_NAME, "A2:I")}`);
  const slotRows = ((await slotResponse.json()).values ?? []) as string[][];
  let cleared = 0;

  for (const [index, row] of slotRows.entries()) {
    const slotId = String(row[0] ?? "").trim();
    if (!slotIds.has(slotId) || stillReservedSlotIds.has(normalize(slotId))) continue;

    const rowIndex = index + 2;
    await sheetsFetch(token, "PUT", `${sheetRange(SLOT_SHEET_NAME, `H${rowIndex}:I${rowIndex}`)}?valueInputOption=RAW`, {
      values: [["", ""]]
    });
    cleared += 1;
  }

  return cleared;
}

async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  if (!CALENDAR_ID || !gmailConfigured()) return false;

  const token = await getGmailAccessToken();
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${encodeURIComponent(eventId)}?sendUpdates=none`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (response.status === 404 || response.status === 410) {
    return false;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Calendar event delete failed: ${errorText}`);
  }

  return true;
}

async function ensureSheetSeed(
  token: string,
  sheetName: string,
  headers: string[],
  rows: Array<Array<string | number | boolean>>
): Promise<void> {
  await ensureSheetHeaders(token, sheetName, headers);
  const response = await sheetsFetch(token, "GET", `${sheetRange(sheetName, "A2:Z")}`);
  const existingRows = (await response.json()).values ?? [];

  if (existingRows.length === 0 || shouldResetSlotRows(sheetName, existingRows)) {
    if (existingRows.length > 0) {
      await sheetsFetch(token, "POST", `${sheetRange(sheetName, "A2:Z")}:clear`, {});
    }

    await sheetsFetch(token, "POST", `${sheetRange(sheetName, "A:Z")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      values: rows
    });
  }
}

function shouldResetSlotRows(sheetName: string, rows: string[][]): boolean {
  if (sheetName !== SLOT_SHEET_NAME) return false;
  if (!rows.length) return false;

  const hasDatedRows = rows.some((row) => /^\d{4}-\d{2}-\d{2}$/.test(String(row[1] ?? "").trim()));

  if (hasDatedRows) {
    return false;
  }

  return rows.every((row) => {
    const date = String(row[1] ?? "").trim();
    const startTime = String(row[2] ?? "").trim();
    return !date && Boolean(startTime);
  });
}

async function ensureRemainingRecruitmentSlotRows(token: string): Promise<void> {
  const slotResponse = await sheetsFetch(token, "GET", `${sheetRange(SLOT_SHEET_NAME, "A2:I")}`);
  const existingRows = ((await slotResponse.json()).values ?? []) as string[][];
  const existingSlotKeys = new Set(
    existingRows
      .map((row) => {
        const date = String(row[1] ?? "").trim();
        const startTime = normalizeTime24(row[2]);
        return date && startTime ? `${date}|${startTime}` : "";
      })
      .filter(Boolean)
  );

  const missingRows = buildRecruitmentSlotRows(getRemainingRecruitmentStartDate()).filter((row) => {
    const date = String(row[1] ?? "").trim();
    const startTime = normalizeTime24(row[2]);
    return date && startTime && !existingSlotKeys.has(`${date}|${startTime}`);
  });

  if (!missingRows.length) return;

  await sheetsFetch(token, "POST", `${sheetRange(SLOT_SHEET_NAME, "A:I")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    values: missingRows
  });
}

function buildRecruitmentSlotRows(fromDate?: Date): Array<Array<string | number>> {
  const rows: Array<Array<string | number>> = [];
  const configuredStartDate = parseDateOnly(RECRUITMENT_START_DATE);
  const endDate = parseDateOnly(RECRUITMENT_END_DATE);

  if (!configuredStartDate || !endDate) {
    throw new Error("Recruitment slot date range is invalid.");
  }

  const startDate = fromDate && fromDate > configuredStartDate ? fromDate : configuredStartDate;

  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    const dateString = formatDateOnly(date);

    for (const slot of DAILY_SLOT_TIMES) {
      rows.push([
        `slot-${dateString}-${slot.code}`,
        dateString,
        slot.startTime,
        addMinutesToTime(slot.startTime, INTERVIEW_SLOT_DURATION_MINUTES),
        `${dateString} at ${slot.startTime}`,
        1,
        "TRUE",
        "",
        ""
      ]);
    }
  }

  return rows;
}

function getRemainingRecruitmentStartDate(): Date {
  const currentLocalDate = parseDateOnly(getCurrentLocalDateTime(CALENDAR_TIME_ZONE).slice(0, 10));
  const recruitmentStartDate = parseDateOnly(RECRUITMENT_START_DATE);

  if (!currentLocalDate || !recruitmentStartDate) {
    throw new Error("Recruitment slot date range is invalid.");
  }

  return currentLocalDate > recruitmentStartDate ? currentLocalDate : recruitmentStartDate;
}

async function getInterviewSlots(token: string): Promise<InterviewSlotOption[]> {
  await ensureSlotSheets(token);

  const slotResponse = await sheetsFetch(token, "GET", `${sheetRange(SLOT_SHEET_NAME, "A2:I")}`);
  const slotRows = ((await slotResponse.json()).values ?? []) as string[][];

  const reservationResponse = await sheetsFetch(token, "GET", `${sheetRange(RESERVATION_SHEET_NAME, "A2:L")}`);
  const reservationRows = ((await reservationResponse.json()).values ?? []) as string[][];
  const reservedCounts = new Map<string, number>();

  for (const row of reservationRows) {
    const slotId = normalize(row[1]);
    if (!slotId) continue;
    reservedCounts.set(slotId, (reservedCounts.get(slotId) ?? 0) + 1);
  }

  return slotRows
    .map((row: string[], index: number) => {
      const id = String(row[0] ?? "").trim();
      const date = String(row[1] ?? "").trim();
      const startTime = String(row[2] ?? "").trim();
      const endTime = addMinutesToTime(startTime, INTERVIEW_SLOT_DURATION_MINUTES) || String(row[3] ?? "").trim();
      const label = String(row[4] ?? "").trim() || buildSlotLabel(date, startTime);
      const capacity = Number(row[5] ?? 1) || 1;
      const active = String(row[6] ?? "TRUE").toLowerCase() !== "false" && !isRemovedOverlappingDefaultSlot(id);
      const calendarEventId = String(row[7] ?? "").trim();
      const meetLink = String(row[8] ?? "").trim();
      const reservedCount = reservedCounts.get(normalize(id)) ?? 0;
      const remaining = Math.max(capacity - reservedCount, 0);
      const startDateTime = buildLocalDateTime(date, startTime);
      const endDateTime = resolveEndDateTime(startDateTime, buildLocalDateTime(date, endTime));
      // Same lead time as the heads pool: the panel reads the application
      // before the interview, not during it.
      const tooSoon = isWithinBookingLeadTime(startDateTime, CALENDAR_TIME_ZONE);
      const sameDayCutoffReached = isSameDaySlotCutoffReached(date, CALENDAR_TIME_ZONE);

      return {
        id,
        label,
        date,
        startTime,
        endTime,
        startDateTime,
        endDateTime,
        capacity,
        active,
        reservedCount,
        remaining,
        tooSoon,
        full: !active || !date || !startTime || !startDateTime || !endDateTime || tooSoon || sameDayCutoffReached || remaining <= 0,
        calendarEventId,
        meetLink,
        rowIndex: index + 2
      };
    })
    .filter((slot) => slot.active)
    .sort((a, b) => (a.startDateTime || a.label).localeCompare(b.startDateTime || b.label));
}

async function reserveInterviewSlot(token: string, payload: ApplicationPayload): Promise<ReservationDetails> {
  /*
   * Heads-cycle slots are keyed by committee and live in their own sheet. Look
   * there first using the applicant's committee, and only fall back to the
   * original pool if the id is not one of theirs.
   */
  const headsSlots = await getHeadsInterviewSlots(token, payload.roleAppliedFor);
  let selected = headsSlots.find((slot) => slot.id === payload.interviewSlotId);
  let isHeadsSlot = Boolean(selected);

  if (!selected) {
    const slots = await getInterviewSlots(token);
    selected = slots.find((slot) => slot.id === payload.interviewSlotId);
    isHeadsSlot = false;
  }

  if (!selected) {
    throw new Error("Selected interview slot is not available.");
  }

  /*
   * Checked before `full`, and separately from it: a slot inside the lead time
   * is not taken, it is simply too close, and "already full" would send the
   * applicant looking for a different day when the real answer is that this
   * one closed while they were filling the form in.
   */
  if (selected.tooSoon) {
    const hours = Math.round(INTERVIEW_BOOKING_LEAD_MINUTES / 60);
    throw new Error(
      `That time is no longer open — interviews have to be booked at least ${hours} hours ahead, ` +
        "so the people interviewing you can read your application first. Please choose a later slot."
    );
  }

  if (selected.full) {
    throw new Error("That interview slot is already full. Please choose another slot.");
  }

  const calendarToken = await getGmailAccessToken();
  const panel = await getCommitteePanel(token, payload.roleAppliedFor);
  const calendarEvent = await createCalendarEvent(calendarToken, payload, selected, panel);
  if (isHeadsSlot) {
    await updateHeadsSlotCalendarFields(token, selected, calendarEvent);
  } else {
    await updateSlotCalendarFields(token, selected, calendarEvent);
  }

  await sheetsFetch(token, "POST", `${sheetRange(RESERVATION_SHEET_NAME, "A:N")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    values: [
      [
        payload.timestamp,
        selected.id,
        selected.label,
        payload.fullName,
        payload.aucEmail,
        payload.studentId,
        calendarEvent.calendarEventId,
        calendarEvent.meetLink,
        "Not Done",
        subtractMinutesFromLocalDateTime(selected.startDateTime, INTERVIEW_REMINDER_MINUTES),
        "",
        "Pending",
        payload.roleAppliedFor,
        payload.secondPreference
      ]
    ]
  });

  return {
    slot: selected,
    calendarEventId: calendarEvent.calendarEventId,
    meetLink: calendarEvent.meetLink
  };
}

async function addCalendarEventAttendee(
  token: string,
  calendarEventId: string,
  attendee: { email: string; displayName: string }
): Promise<void> {
  if (!CALENDAR_ID) {
    throw new Error("CALENDAR_ID is not configured.");
  }

  const getResponse = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${encodeURIComponent(calendarEventId)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const eventBody = await getResponse.json();
  if (!getResponse.ok) {
    throw new Error(`Could not load calendar event: ${JSON.stringify(eventBody)}`);
  }

  const existingAttendees: { email: string; displayName?: string }[] = eventBody.attendees ?? [];
  if (existingAttendees.some((a) => normalize(a.email) === normalize(attendee.email))) {
    return;
  }

  const patchResponse = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${encodeURIComponent(calendarEventId)}?sendUpdates=none`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ attendees: [...existingAttendees, attendee] })
    }
  );
  if (!patchResponse.ok) {
    const patchBody = await patchResponse.json();
    throw new Error(`Could not add attendee to calendar event: ${JSON.stringify(patchBody)}`);
  }
}

/**
 * The Director and Vice-Director(s) of the committee the applicant applied to.
 * These are the people an applicant deals with, so they are put on the calendar
 * invite and named in the confirmation email instead of a shared inbox.
 * Read live from the Board Hierarchy sheet so it tracks roster changes.
 */
/**
 * Who is copied on an applicant's mail: the committee interviewing them, then
 * the recruitment monitors. Deduplicated, and never the applicant themselves —
 * a person appearing in both To and Cc gets two copies in some clients.
 */
async function buildApplicantCc(
  token: string,
  roleAppliedFor: string,
  applicantEmail: string,
  panel?: Array<{ email: string; name: string; positionType: string }>
): Promise<string> {
  const committee = panel ?? (await getCommitteePanel(token, roleAppliedFor).catch(() => []));
  const monitors = await getCommitteePanel(token, MONITOR_COMMITTEE).catch(() => []);

  const seen = new Set([normalize(applicantEmail)]);
  const addresses: string[] = [];
  for (const person of [...committee, ...monitors]) {
    const key = normalize(person.email);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    addresses.push(person.email);
  }
  return addresses.join(", ");
}

async function getCommitteePanel(
  token: string,
  roleAppliedFor: string
): Promise<Array<{ email: string; name: string; positionType: string }>> {
  try {
    const { entries } = await loadHierarchy(token);
    const wanted = normalizeRole(roleAppliedFor);

    return entries
      .filter((entry) => {
        if (normalizeRole(entry.department) !== wanted) return false;
        const position = normalize(entry.positionType);
        return position.includes("director");
      })
      .filter((entry) => isValidAucEmail(entry.aucEmail))
      .map((entry) => ({
        email: String(entry.aucEmail).trim(),
        name: String(entry.name).trim(),
        positionType: String(entry.positionType).trim()
      }));
  } catch (error) {
    // A hierarchy problem must never block an application from being booked.
    console.error(`Could not load committee panel: ${error instanceof Error ? error.message : error}`);
    return [];
  }
}

async function updateHeadsSlotCalendarFields(
  token: string,
  slot: InterviewSlotOption,
  calendarEvent: { calendarEventId: string; meetLink: string }
): Promise<void> {
  if (!slot.rowIndex) return;
  await sheetsFetch(
    token,
    "PUT",
    `${sheetRange(HEADS_SLOT_SHEET_NAME, `J${slot.rowIndex}:K${slot.rowIndex}`)}?valueInputOption=RAW`,
    { values: [[calendarEvent.calendarEventId, calendarEvent.meetLink]] }
  );
}

async function createCalendarEvent(
  token: string,
  payload: ApplicationPayload,
  slot: InterviewSlotOption,
  panel: Array<{ email: string; name: string; positionType: string }> = []
): Promise<{ calendarEventId: string; meetLink: string }> {
  if (!CALENDAR_ID) {
    throw new Error("CALENDAR_ID is not configured.");
  }

  const requestId = `resala-${payload.studentId}-${Date.now()}`.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 100);
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?conferenceDataVersion=1&sendUpdates=none`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        summary: `Resala AUC Interview - ${payload.fullName}`,
        description: [
          `Applicant: ${payload.fullName}`,
          `Role: ${firstPreferenceLabel(payload)}`,
          `Second preference: ${secondPreferenceLabel(payload)}`,
          `AUC Email: ${payload.aucEmail}`,
          `Student ID: ${payload.studentId}`
        ].join("\n"),
        start: {
          dateTime: slot.startDateTime,
          timeZone: CALENDAR_TIME_ZONE
        },
        end: {
          dateTime: slot.endDateTime,
          timeZone: CALENDAR_TIME_ZONE
        },
        attendees: [
          {
            email: payload.aucEmail,
            displayName: payload.fullName
          },
          // The committee's Director and Vice-Director(s) run this interview.
          ...panel.map((member) => ({
            email: member.email,
            displayName: member.positionType ? `${member.name} (${member.positionType})` : member.name
          }))
        ],
        // Reminders set here apply to the organiser's copy — the Resala
        // calendar — and nobody reads that mailbox for interviews the
        // committees run. The applicant and the panel are attendees, so their
        // own calendars remind them on their own settings, and the hour-before
        // email still goes out from the reminder job.
        reminders: {
          useDefault: false,
          overrides: []
        },
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: {
              type: "hangoutsMeet"
            }
          }
        }
      })
    }
  );

  const body = await response.json();
  if (!response.ok) {
    throw new Error(`Google Calendar event creation failed: ${JSON.stringify(body)}`);
  }

  const meetLink =
    body.hangoutLink ??
    body.conferenceData?.entryPoints?.find((entryPoint: { entryPointType?: string; uri?: string }) => entryPoint.entryPointType === "video")
      ?.uri ??
    "";

  if (!body.id || !meetLink) {
    throw new Error("Google Calendar did not return a Meet link.");
  }

  return {
    calendarEventId: body.id,
    meetLink
  };
}

function buildGoogleCalendarAddUrl({
  summary,
  description,
  location,
  startDateTime,
  endDateTime
}: {
  summary: string;
  description: string;
  location: string;
  startDateTime: string;
  endDateTime: string;
}): string {
  const toCompact = (dateTime: string) => dateTime.replace(/[-:]/g, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: summary,
    details: description,
    location,
    dates: `${toCompact(startDateTime)}/${toCompact(endDateTime)}`,
    ctz: CALENDAR_TIME_ZONE
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

async function createHeadsOnboardingMeeting(): Promise<{
  calendarEventId: string;
  meetLink: string;
  addToCalendarUrl: string;
  startDateTime: string;
  endDateTime: string;
}> {
  if (!CALENDAR_ID) {
    throw new Error("CALENDAR_ID is not configured.");
  }

  const calendarToken = await getGmailAccessToken();

  const startDateTime = buildLocalDateTime(HEADS_ONBOARDING_MEETING_DATE, HEADS_ONBOARDING_MEETING_START);
  const endDateTime = buildLocalDateTime(HEADS_ONBOARDING_MEETING_DATE, HEADS_ONBOARDING_MEETING_END);
  if (!startDateTime || !endDateTime) {
    throw new Error("Invalid meeting date/time configuration.");
  }

  const summary = "Resala AUC — Heads Onboarding Meeting";
  const description = "Onboarding meeting for newly accepted committee heads.";

  const syntheticPayload: ApplicationPayload = {
    timestamp: new Date().toISOString(),
    fullName: "Resala AUC Heads",
    aucEmail: GMAIL_SENDER_EMAIL || "resala@aucegypt.edu",
    studentId: "heads-meeting",
    major: "",
    yearLevel: "",
    phone: "",
    roleAppliedFor: "Heads Onboarding",
    roleStepTitle: "",
    roleDescription: "",
    secondPreference: "",
    whyThisRole: "",
    whyChooseYourself: "",
    createdAt: new Date().toISOString()
  };
  const syntheticSlot: InterviewSlotOption = {
    id: "heads-onboarding-meeting",
    label: summary,
    date: HEADS_ONBOARDING_MEETING_DATE,
    startTime: HEADS_ONBOARDING_MEETING_START,
    endTime: HEADS_ONBOARDING_MEETING_END,
    startDateTime,
    endDateTime,
    capacity: 999,
    active: true,
    reservedCount: 0,
    remaining: 999,
    full: false
  };

  const { calendarEventId, meetLink } = await createCalendarEvent(calendarToken, syntheticPayload, syntheticSlot);

  const addToCalendarUrl = buildGoogleCalendarAddUrl({
    summary,
    description: `${description}\n\nJoin: ${meetLink}`,
    location: meetLink,
    startDateTime,
    endDateTime
  });

  return { calendarEventId, meetLink, addToCalendarUrl, startDateTime, endDateTime };
}

async function shareCalendarWithEmails(
  emails: string[],
  role: "reader" | "writer" | "freeBusyReader"
): Promise<{ shared: string[]; failed: { email: string; error: string }[] }> {
  if (!CALENDAR_ID) {
    throw new Error("CALENDAR_ID is not configured.");
  }
  if (!emails || emails.length === 0) {
    throw new Error("No emails provided.");
  }

  const calendarToken = await getGmailAccessToken();

  const shared: string[] = [];
  const failed: { email: string; error: string }[] = [];

  for (const email of emails) {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/acl`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${calendarToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          role,
          scope: { type: "user", value: email }
        })
      }
    );

    if (response.ok) {
      shared.push(email);
    } else {
      const errorText = await response.text();
      failed.push({ email, error: errorText });
    }
  }

  return { shared, failed };
}

async function updateSlotCalendarFields(
  token: string,
  slot: InterviewSlotOption,
  calendarEvent: { calendarEventId: string; meetLink: string }
): Promise<void> {
  if (!slot.rowIndex) return;

  await sheetsFetch(token, "PUT", `${sheetRange(SLOT_SHEET_NAME, `H${slot.rowIndex}:I${slot.rowIndex}`)}?valueInputOption=RAW`, {
    values: [[calendarEvent.calendarEventId, calendarEvent.meetLink]]
  });
}

/*
 * Sheets enforces 60 reads and 60 writes per minute per project, and it is a
 * rolling window rather than a bucket that refills all at once. A batch send
 * can legitimately crowd the limit even with the caching above, so a 429 is
 * worth waiting out rather than failing the whole operation — especially on a
 * write, where giving up part-way through leaves the sheet half-updated.
 */
async function sheetsFetch(token: string, method: string, path: string, body?: unknown): Promise<Response> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${path}`;
  const attempts = 4;

  for (let attempt = 1; ; attempt += 1) {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (response.ok) return response;

    const errorText = await response.text();
    const retriable = response.status === 429 || response.status >= 500;
    if (!retriable || attempt >= attempts) {
      throw new Error(`Google Sheets request failed: ${errorText}`);
    }

    // 2s, 6s, 14s — the window is per minute, so the last wait has to be long
    // enough to actually clear it rather than just re-hitting the same wall.
    const waitMs = 2000 * (2 ** attempt - 1);
    console.warn(`Sheets ${response.status} on ${method} ${path} — retrying in ${waitMs}ms (attempt ${attempt} of ${attempts - 1})`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

async function sheetsBatchUpdateValues(
  token: string,
  data: Array<{ range: string; values: string[][] }>
): Promise<void> {
  if (!data.length) return;

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      valueInputOption: "RAW",
      data
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Sheets batch values update failed: ${errorText}`);
  }
}

async function getGoogleAccessToken(): Promise<string> {
  const credentials = getGoogleCredentials();
  const now = Math.floor(Date.now() / 1000);
  const jwtHeader = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const jwtClaim = base64UrlEncode(
    JSON.stringify({
      iss: credentials.clientEmail,
      scope:
        "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now
    })
  );
  const unsignedJwt = `${jwtHeader}.${jwtClaim}`;
  const signature = await signJwt(unsignedJwt, credentials.privateKey);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsignedJwt}.${signature}`
    })
  });

  const body = await response.json();
  if (!response.ok || !body.access_token) {
    throw new Error(`Google auth failed: ${JSON.stringify(body)}`);
  }

  return body.access_token;
}

function getGoogleCredentials(): { clientEmail: string; privateKey: string } {
  if (GOOGLE_SERVICE_ACCOUNT_KEY) {
    const decoded = decodeMaybeBase64(GOOGLE_SERVICE_ACCOUNT_KEY);
    const credentials = JSON.parse(decoded);

    if (credentials.client_email && credentials.private_key) {
      return {
        clientEmail: credentials.client_email,
        privateKey: credentials.private_key
      };
    }
  }

  if (GOOGLE_CLIENT_EMAIL && GOOGLE_PRIVATE_KEY) {
    return {
      clientEmail: GOOGLE_CLIENT_EMAIL,
      privateKey: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")
    };
  }

  throw new Error("Google service account credentials are not configured.");
}

async function signJwt(unsignedJwt: string, privateKey: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsignedJwt));
  return base64UrlEncode(signature);
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

function base64UrlEncode(value: string | ArrayBuffer): string {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function foldBase64(value: string): string {
  return value.match(/.{1,76}/g)?.join("\r\n") ?? value;
}

function escapeMimeHeader(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function decodeMaybeBase64(value: string): string {
  const trimmed = value.trim();

  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  return atob(trimmed);
}

function sheetRange(sheetName: string, range: string): string {
  return `${encodeURIComponent(sheetName)}!${range}`;
}

function sheetA1Range(sheetName: string, range: string): string {
  return `'${sheetName.replaceAll("'", "''")}'!${range}`;
}

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function isRemovedOverlappingDefaultSlot(slotId: string): boolean {
  const match = String(slotId ?? "").trim().match(/^slot-\d{4}-\d{2}-\d{2}-(\d{4})$/);
  return Boolean(match && REMOVED_OVERLAPPING_DEFAULT_SLOT_CODES.has(match[1]));
}

function getTaskSubmissionState(row: string[]): Record<string, string> {
  const taskSubmittedAt = String(row[18] ?? "").trim();
  const firstPreferenceTaskLink = String(row[19] ?? "").trim();
  const secondPreferenceTaskLink = String(row[20] ?? "").trim();
  const taskNotes = String(row[21] ?? "").trim();
  const rawTaskSubmissionStatus = String(row[22] ?? "").trim();
  const hasFirstTaskLink = isLikelyUrl(firstPreferenceTaskLink);
  const hasSecondTaskLink = isLikelyUrl(secondPreferenceTaskLink);
  const isComplete = hasFirstTaskLink && hasSecondTaskLink;
  const hasAnySubmissionData = Boolean(
    taskSubmittedAt ||
      firstPreferenceTaskLink ||
      secondPreferenceTaskLink ||
      taskNotes ||
      rawTaskSubmissionStatus
  );

  let taskSubmissionIssue = "";
  if (!isComplete && hasAnySubmissionData) {
    if (!hasFirstTaskLink && !hasSecondTaskLink) {
      taskSubmissionIssue = "Missing both task links";
    } else if (!hasFirstTaskLink) {
      taskSubmissionIssue = "Missing first preference task link";
    } else {
      taskSubmissionIssue = "Missing second preference task link";
    }
  }

  return {
    taskSubmittedAt,
    firstPreferenceTaskLink,
    secondPreferenceTaskLink,
    taskNotes,
    taskSubmissionStatus: isComplete ? "Submitted" : "",
    taskSubmissionIssue
  };
}

function isLikelyUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeRole(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("/", " ")
    .replace(/\s+/g, " ");
}

function buildSlotLabel(date: string, startTime: string): string {
  if (!date || !startTime) return startTime || date || "";
  return `${date} at ${startTime}`;
}

function parseDateOnly(value: string): Date | null {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function addDays(value: Date, daysToAdd: number): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() + daysToAdd));
}

function formatDateOnly(value: Date): string {
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0")
  ].join("-");
}

/**
 * An interview that starts at 23:00 and runs an hour ends at 00:00 — the next
 * day. The sheet stores a date and two clock times, so pairing the end time
 * with the start's date puts the end 23 hours *before* the start, and Google
 * rejects the event with "The specified time range is empty".
 *
 * Anywhere an end is built from a date and a wall-clock time, it goes through
 * here: if it does not sit after the start, it belongs to the following day.
 */
function resolveEndDateTime(startDateTime: string, endDateTime: string): string {
  if (!startDateTime || !endDateTime || endDateTime > startDateTime) return endDateTime;

  const match = endDateTime.match(/^(\d{4})-(\d{2})-(\d{2})T(.+)$/);
  if (!match) return endDateTime;

  const [, year, month, day, clock] = match;
  const nextDay = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) + 1));
  return `${nextDay.toISOString().slice(0, 10)}T${clock}`;
}

function buildLocalDateTime(date: string, time: string): string {
  const parsedTime = parseTime(time);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !parsedTime) {
    return "";
  }

  return `${date}T${parsedTime}:00`;
}

function normalizeTime24(value: unknown): string {
  const raw = String(value ?? "").trim();
  const twentyFourHourMatch = raw.match(/^(\d{1,2}):(\d{2})$/);

  if (twentyFourHourMatch) {
    const hour = Number(twentyFourHourMatch[1]);
    const minute = Number(twentyFourHourMatch[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }
  }

  return parseTime(raw);
}

function isPastLocalDateTime(value: string, timeZone: string): boolean {
  if (!value) return false;
  return value <= getCurrentLocalDateTime(timeZone);
}

/**
 * True when a slot is past, or so close that nobody could prepare for it.
 * Both cases mean the same thing to an applicant looking at the board — the
 * time is not on offer — so they are answered by one function.
 */
function isWithinBookingLeadTime(
  startDateTime: string,
  timeZone: string,
  leadMinutes = INTERVIEW_BOOKING_LEAD_MINUTES
): boolean {
  if (!startDateTime) return false;
  // Negative subtraction adds: the earliest start we will still offer.
  const earliest = subtractMinutesFromLocalDateTime(getCurrentLocalDateTime(timeZone), -leadMinutes);
  return startDateTime <= earliest;
}

function isSameDaySlotCutoffReached(date: string, timeZone: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const currentLocalDateTime = getCurrentLocalDateTime(timeZone);
  const currentDate = currentLocalDateTime.slice(0, 10);
  if (date !== currentDate) return false;

  return currentLocalDateTime >= `${date}T${String(SAME_DAY_SLOT_CUTOFF_HOUR).padStart(2, "0")}:00:00`;
}

function parseTime(value: string): string {
  const normalizedValue = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
  const match = normalizedValue.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/);

  if (!match) {
    return "";
  }

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const meridiem = match[3] ?? "PM";

  if (minute < 0 || minute > 59 || hour < 1 || hour > 12) {
    return "";
  }

  if (meridiem === "PM" && hour !== 12) {
    hour += 12;
  }

  if (meridiem === "AM" && hour === 12) {
    hour = 0;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function addMinutesToTime(value: string, minutesToAdd: number): string {
  const parsedTime = normalizeTime24(value);
  if (!parsedTime) return "";

  const [hours, minutes] = parsedTime.split(":").map(Number);
  const date = new Date(Date.UTC(2000, 0, 1, hours, minutes + minutesToAdd));
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const displayHour = hour % 12 || 12;
  const meridiem = hour >= 12 ? "PM" : "AM";

  return `${displayHour}:${String(minute).padStart(2, "0")} ${meridiem}`;
}

function formatLocalDateTimeLabel(value: string): string {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return "";

  const [, year, month, day, hour, minute] = match;
  const numericHour = Number(hour);
  const displayHour = numericHour % 12 || 12;
  const meridiem = numericHour >= 12 ? "PM" : "AM";

  return `${year}-${month}-${day} at ${displayHour}:${minute} ${meridiem}`;
}

function subtractMinutesFromLocalDateTime(value: string, minutesToSubtract: number): string {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return "";

  const [, year, month, day, hour, minute, second] = match.map(String);
  const date = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute) - minutesToSubtract,
      Number(second)
    )
  );

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-") + `T${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}:${String(date.getUTCSeconds()).padStart(2, "0")}`;
}

function getCurrentLocalDateTime(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());
  const byType = new Map(parts.map((part) => [part.type, part.value]));

  return `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}T${byType.get("hour")}:${byType.get("minute")}:${byType.get("second")}`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function columnLetter(index: number): string {
  let value = index;
  let result = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }

  return result;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
