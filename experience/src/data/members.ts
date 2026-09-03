import type { InterviewSlot } from "../types";

/**
 * Parallel to committees.ts, but for the Members recruitment cycle instead of
 * Heads. Deliberately self-contained — it does NOT import role-guide-data.mjs
 * / committee-display.mjs / interview-config.mjs / application-questions.mjs,
 * since those are the Heads cycle's shared source of truth and are also read
 * by /guides, the committee dashboard, and the Deno backend's hand-mirrored
 * copies. A members-only edit here can never desync any of that.
 *
 * Exports the same symbol names as committees.ts (committees, findCommittee,
 * findCommitteeRole, yearLevelOptions is still imported from committees.ts
 * directly since it's cycle-agnostic) so every act/component in this app can
 * be repointed here with a one-line import swap and nothing else changes.
 */

export type ApplicationQuestion = {
  id: string;
  field: "whyThisRole" | "whyChooseYourself" | "hopeToLearn" | "previousResalaExperience" | null;
  eyebrow: string;
  prompt: string;
  helper?: string;
  placeholder: string;
  required: boolean;
};

export type InterviewTask = {
  required: boolean;
  atInterview?: boolean;
  summary?: string;
  detail?: string;
  title?: string;
  points?: string[];
  dueBeforeInterviewMinutes?: number;
};

export type CommitteeContact = {
  name: string;
  email: string;
  title?: string;
};

export type CommitteeRole = {
  id: string;
  name: string;
  subtitle?: string;
  description: string;
};

export type Committee = {
  id: string;
  /** Backend-keyed — used verbatim in the interview-slot/contacts lookups. */
  name: string;
  displayName: string;
  stepTitle: string;
  vow: string;
  whyChoose: string;
  actualWork: string[];
  guidingQuestion: string;
  group: "backstage" | "frontstage";
  /** The sub-committees inside this committee. The applicant picks one. */
  roles: CommitteeRole[];
  questions: (role: CommitteeRole | null) => ApplicationQuestion[];
  alsoAsked: (role: CommitteeRole | null) => string[];
  interviewDurationMinutes: number;
  interviewTask: (role: CommitteeRole | null) => InterviewTask;
  interviewSlots: () => InterviewSlot[];
  contacts: CommitteeContact[];
};

/** Members book their own 15-minute interview as the last step. */
export const SHOW_INTERVIEW_BOOKING = true;

/**
 * Applications close at the end of 20 September 2026, Cairo time. The flow
 * closes itself past this; the backend rejects a late post independently, so
 * a tab left open overnight cannot slip one through.
 */
export const APPLICATION_DEADLINE = "2026-09-20T23:59:59+02:00";
export const APPLICATION_DEADLINE_LABEL = "20 September";

export function applicationsClosed(now: Date = new Date()): boolean {
  return now.getTime() > new Date(APPLICATION_DEADLINE).getTime();
}

const GENERAL_CONTACT: CommitteeContact = {
  name: "Resala AUC",
  email: "resala@aucegypt.edu",
  title: "General enquiries"
};

/*
 * Every committee interviews on the same board: 2-20 September, 3pm to 9pm,
 * 15 minutes each. Mirrored by hand in supabase/functions/submit/index.ts,
 * which cannot import this file — change the two together.
 */
const MEMBER_INTERVIEW_DAYS = Array.from({ length: 19 }, (_, i) => `2026-09-${String(i + 2).padStart(2, "0")}`);
const MEMBER_INTERVIEW_TIMES = Array.from({ length: 24 }, (_, i) => {
  const minutes = 15 * 60 + i * 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});
const MEMBER_SLOT_MINUTES = 15;
const MEMBER_SLOT_CAPACITY = 1;
const MEMBER_BOOKING_LEAD_MINUTES = 360;
/**
 * An applicant may only book inside the five days that start on the day they
 * apply — today plus the next four. Interviewing people while their
 * application is still fresh is the whole point; a slot three weeks out is
 * how applicants go cold and stop showing up.
 */
export const MEMBER_BOOKING_WINDOW_DAYS = 5;

/**
 * Today's date as the interview board means it: slot dates are plain Cairo
 * calendar days, so "today" has to be Cairo's today, not the browser's or the
 * server's. Egypt sits at UTC+2 year-round, the same offset every slot
 * timestamp in this file is written with.
 */
export function cairoToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The last day this applicant may book, inclusive. */
export function bookingWindowEnd(now: Date = new Date()): string {
  return addDays(cairoToday(now), MEMBER_BOOKING_WINDOW_DAYS - 1);
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function formatLabel(date: string, startTime: string, endTime: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const dayPart = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  const to12h = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${period}`;
  };
  return `${dayPart} · ${to12h(startTime)}–${to12h(endTime)}`;
}

function buildMemberSlots(committeeId: string): InterviewSlot[] {
  const now = new Date();
  const from = cairoToday(now);
  const until = bookingWindowEnd(now);
  const slots: InterviewSlot[] = [];
  for (const date of MEMBER_INTERVIEW_DAYS) {
    // ISO dates compare correctly as plain strings.
    if (date < from || date > until) continue;
    for (const startTime of MEMBER_INTERVIEW_TIMES) {
      const endTime = addMinutes(startTime, MEMBER_SLOT_MINUTES);
      const startDateTime = `${date}T${startTime}:00+02:00`;
      const endDateTime = `${date}T${endTime}:00+02:00`;
      const tooSoon = new Date(startDateTime).getTime() - now.getTime() < MEMBER_BOOKING_LEAD_MINUTES * 60_000;
      if (tooSoon) continue;
      slots.push({
        id: `${committeeId}-${date}-${startTime}`,
        label: formatLabel(date, startTime, endTime),
        date,
        startTime,
        endTime,
        startDateTime,
        endDateTime,
        capacity: MEMBER_SLOT_CAPACITY,
        active: true,
        reservedCount: 0,
        remaining: MEMBER_SLOT_CAPACITY,
        full: false
      });
    }
  }
  return slots;
}

type CommitteeSeed = {
  id: string;
  name: string;
  group: Committee["group"];
  vow: string;
  whyChoose: string;
  actualWork: string[];
  questions: [string, string, string];
  /**
   * The sub-committees a member can join, mirroring the sub-teams the Heads
   * cycle placed heads over (src/role-guide-data.mjs). Transcribed rather than
   * imported, on purpose: this file stays self-contained so a members-only
   * edit can never desync /guides, the committee dashboard, or the backend's
   * hand-mirrored copies. The names here are the team, not the head's job
   * title, because a member joins the team.
   */
  subCommittees: CommitteeRole[];
};

const seeds: CommitteeSeed[] = [
  {
    id: "tech",
    name: "Tech Team",
    group: "backstage",
    vow: "You will leave behind systems that keep working after you graduate.",
    whyChoose:
      "Tech Team is for someone who wants to build real systems that solve real problems. You will not only build projects for practice; you will build tools and workflows that people in Resala actually use.",
    actualWork: [
      "Build or improve systems that make Resala's work easier.",
      "Create automations, forms, dashboards, trackers, or platforms.",
      "Support recruitment, interviews, volunteers, data, and internal workflows.",
      "Notice repeated problems and suggest tech-based solutions.",
      "Document systems so others can use and continue them.",
      "Help other committees understand how tech can support their work."
    ],
    questions: [
      "What interests you about joining the Tech Team?",
      "Have you used or are you interested in learning any technical skills? (For example: coding, website building, spreadsheets, automation, design systems, etc.)",
      "What is one thing you would like to help improve or build in Resala?"
    ],
    subCommittees: [
      {
        id: "navigator",
        name: "The Navigator",
        subtitle: "Project Lead",
        description:
          "Owns tech projects end to end — keeps the work inside the system that is already in place and makes sure deadlines are actually met."
      },
      {
        id: "scout",
        name: "The Scout",
        subtitle: "Solutions Researcher",
        description:
          "Takes incoming requests and researches every possible way to solve them, weighs the pros and cons, and brings the options back to the committee."
      },
      {
        id: "builder",
        name: "The Builder",
        subtitle: "Developer",
        description:
          "Turns the plan into working software. Writes clear, documented code other people can pick up, and says early when something is stuck."
      },
      {
        id: "verifier",
        name: "The Verifier",
        subtitle: "Quality Tester",
        description:
          "Tests what was built against what was actually asked for, not just whether it runs. The last checkpoint before anything is handed over."
      },
      {
        id: "closer",
        name: "The Closer",
        subtitle: "Deployment Specialist",
        description:
          "Handles the handover: delivers the solution, trains the non-technical people who will use it, writes the documentation, and checks back until they are self-sufficient."
      },
      {
        id: "firefighter",
        name: "The Firefighter",
        subtitle: "On-Call Responder",
        description:
          "First responder when something already deployed breaks. Works fast under pressure so the rest of the team is not pulled off their own projects."
      }
    ]
  },
  {
    id: "operations",
    name: "Operations",
    group: "backstage",
    vow: "Nothing happens on the ground until someone like you makes it happen.",
    whyChoose:
      "Operations is one of the main pillars of any event. It turns plans into reality and gives real-life experience in execution, movement, problem-solving, and practical decision-making.",
    actualWork: [
      "Plan event logistics and setup.",
      "Search for vendors, prices, supplies, and alternatives.",
      "Coordinate purchasing, transportation, storage, and preparation.",
      "Build systems for operations requests and tracking.",
      "Lead an operations team and divide the workload.",
      "Make sure events have what they need to happen successfully.",
      "Stay flexible when money, timing, or availability changes."
    ],
    questions: [
      "Why do you want to join the Operations Team?",
      "Do you enjoy planning, organizing, or solving problems? Tell us a little about why.",
      "What do you think is most important when organizing an event or activity?"
    ],
    subCommittees: [
      {
        id: "inventory",
        name: "The Organizer",
        subtitle: "Inventory & Storage",
        description:
          "Runs the inventory: tracks equipment, organizes storage, keeps records accurate, and makes sure every item an event needs is there and ready."
      },
      {
        id: "logistics",
        name: "The Coordinator",
        subtitle: "Logistics & Event Support",
        description:
          "Transportation, setup, on-site support, equipment handling, teardown — everything that makes an event physically happen."
      }
    ]
  },
  {
    id: "branding-media",
    name: "Branding/Media",
    group: "backstage",
    vow: "You decide how thousands of people first meet Resala.",
    whyChoose:
      "Branding is how people see, understand, and remember Resala. If Resala does strong work but no one sees it clearly, the impact becomes less visible.",
    actualWork: [
      "Build content campaigns and posting strategies.",
      "Lead design, media, video editing, photography, captions, and reels.",
      "Organize the branding team and assign clear tasks.",
      "Cover events and turn moments into meaningful stories.",
      "Make sure Resala's visual identity and tone are consistent.",
      "Use content to support recruitment, trust, visibility, and impact.",
      "Follow up from idea to final post."
    ],
    questions: [
      "What interests you about joining Branding/Media?",
      "Which area interests you the most? (Design, photography, videography, editing, content creation, writing, or social media)",
      "If you could help people see one side of Resala better, what would it be?"
    ],
    subCommittees: [
      {
        id: "production",
        name: "Acting & Production",
        description:
          "Everything that happens on filming day: who appears on camera, scripts, directing interviews and documentary shoots, locations, schedules, and getting every shot on the list before the team leaves."
      }
    ]
  },
  {
    id: "hr",
    name: "HR",
    group: "backstage",
    vow: "You hold the people who hold everyone else.",
    whyChoose:
      "Resala's main asset is its people. HR keeps the community alive through engagement, belonging, inclusion, culture, recognition, feedback, and accountability.",
    actualWork: [
      "Build systems to keep members engaged.",
      "Monitor community health and notice when engagement drops.",
      "Organize bonding and engagement activities.",
      "Follow up with inactive or disconnected members.",
      "Support onboarding and member experience.",
      "Create systems for appreciation, feedback, and accountability.",
      "Help members feel included and connected to Resala's vision."
    ],
    questions: [
      "Why do you want to join HR?",
      "What do you think makes a community feel welcoming and connected?",
      "How would you like to help make the Resala experience better for its members?"
    ],
    subCommittees: [
      {
        id: "engagement-inclusion",
        name: "Engagement & Inclusion",
        subtitle: "The Connector",
        description:
          "Activities that help volunteers build friendships and stay engaged, and the work that makes sure every volunteer can actually take part — team building, feedback, accessibility, support for visually impaired and international students."
      }
    ]
  },
  {
    id: "pr-fundraising",
    name: "PR/Fundraising",
    group: "backstage",
    vow: "You turn a conversation into a partnership, and a partnership into impact.",
    whyChoose:
      "PR / Fundraising opens doors for Resala. It builds the external connections, collaborations, sponsorships, and opportunities that help the club grow its impact.",
    actualWork: [
      "Identify people, organizations, alumni, communities, influencers, companies, or partners Resala can reach.",
      "Check whether collaborations or sponsors align with Resala's vision.",
      "Build outreach and fundraising strategies.",
      "Prepare messages, proposals, pitches, or sponsorship packages.",
      "Reach out and follow up professionally.",
      "Negotiate support, resources, sponsorships, discounts, or collaborations.",
      "Track contacts, replies, progress, and next steps.",
      "Represent Resala respectfully and professionally."
    ],
    questions: [
      "What interests you about PR/Fundraising?",
      "Which part interests you the most? (Partnerships, sponsorships, outreach, fundraising, communication, or something else.)",
      "What do you think makes someone good at representing Resala to other people or organizations?"
    ],
    subCommittees: [
      {
        id: "sponsorship",
        name: "Sponsorship",
        description:
          "Gathers the money and in-kind donations behind every Resala initiative: finding sponsors, approaching them, building the strategy, and keeping the relationship alive. For someone who enjoys networking and can negotiate."
      },
      {
        id: "events",
        name: "Events",
        description:
          "Fundraising events and donation campaigns, from planning through to the day itself. For someone who enjoys planning and stays calm when it changes."
      },
      {
        id: "partnerships",
        name: "Partnerships",
        description:
          "PR campaigns that gather resources and awareness, plus collaborations with other clubs on the big events. For someone who enjoys working across teams and thinks creatively."
      }
    ]
  },
  {
    id: "visits",
    name: "Visits",
    group: "frontstage",
    vow: "You are the one who actually sits with the family, face to face.",
    whyChoose:
      "Visits bring Resala's impact directly to society. It completes the impact of other initiatives and helps fill real gaps through direct presence on the ground.",
    actualWork: [
      "Build a monthly visits plan.",
      "Choose visit types based on real needs.",
      "Organize Islah visits, educational visits, awareness visits, or fun visits.",
      "Search for orphanages, institutions, or places that need support.",
      "Communicate with concerned entities.",
      "Plan the visit goal, flow, volunteers, materials, and operations.",
      "Coordinate with Operations and Branding when needed.",
      "Prepare volunteers and protect dignity and privacy.",
      "Evaluate what was achieved after each visit."
    ],
    questions: [
      "Why do you want to join the Visits Committee?",
      "What type of visits or activities would you be interested in helping organize?",
      "What do you think is important when interacting with the people and communities we visit?"
    ],
    subCommittees: [
      {
        id: "discovery",
        name: "Discovery",
        description:
          "The work before the visit: assessing what the beneficiaries actually need, gathering information, and preparing the reports the plan is built on."
      },
      {
        id: "execution",
        name: "Execution",
        description:
          "Running the visit itself — organizing volunteers, coordinating activities, and keeping the day moving."
      },
      {
        id: "storytelling",
        name: "Storytelling",
        description:
          "Capturing and telling the story of every visit through photography, videography, and social media."
      }
    ]
  },
  {
    id: "childrens-day",
    name: "Children's Day",
    group: "frontstage",
    vow: "A child will remember one day you built for the rest of their life.",
    whyChoose:
      "Children's Day is one of the most central roles in Resala. It is where Resala works directly on children's educational, emotional, and developmental growth week by week.",
    actualWork: [
      "Set the semester goals for Children's Day.",
      "Review previous mistakes and improve the plan.",
      "Build the curriculum for the semester.",
      "Plan weekly Saturday sessions.",
      "Prepare or review slides, activities, worksheets, games, and materials.",
      "Align heads and volunteers with the vision.",
      "Make sure activities serve a clear goal.",
      "Attend or strongly follow up on Saturdays.",
      "Evaluate each week and improve the next one.",
      "Track progress across the semester."
    ],
    questions: [
      "Why do you want to join Children's Day?",
      "Have you worked with or spent time with children before? (Tell us about any experience you have.)",
      "What do you think makes a child enjoy and benefit from an activity?"
    ],
    subCommittees: [
      {
        id: "creative",
        name: "Creative & Visual Identity",
        description:
          "Turns each session's content into polished, kid-friendly slide decks a full module ahead of time, designs certificates and event visuals, and tells Operations exactly what each session needs."
      },
      {
        id: "english",
        name: "English Sessions",
        description:
          "Adapts each module into interactive English lessons, prepares the volunteer instructors, and makes sure homework is assigned and graded every week."
      },
      {
        id: "teaching",
        name: "Teaching & Organizing",
        description:
          "The live Saturday sessions: facilitating, supporting the other facilitators, tracking attendance and behaviour in real time, and keeping parents in the loop."
      }
    ]
  },
  {
    id: "initiatives",
    name: "Initiatives",
    group: "frontstage",
    vow: "You start the thing that did not exist before you.",
    whyChoose:
      "Initiatives is one of the heaviest and most dynamic sectors in Resala. It changes from one campaign to another, each with its own problem, goal, audience, logistics, and impact.",
    actualWork: [
      "Define the goal of each initiative.",
      "Understand the problem the initiative is solving.",
      "Review previous versions and identify what can be improved.",
      "Build the strategy and approach.",
      "Plan operations, branding, volunteers, partners, and resources.",
      "Coordinate with other committees.",
      "Lead the initiative team during preparation and execution.",
      "Think through risks and solutions.",
      "Measure whether the initiative achieved its goal.",
      "Document lessons learned for future campaigns."
    ],
    questions: [
      "Why do you want to join Initiatives?",
      "If you noticed a problem around you, what is one thing you would want to help change?",
      "Do you prefer coming up with ideas, planning them, organizing them, or working during execution? Why?"
    ],
    subCommittees: [
      {
        id: "execution-management",
        name: "Execution Management",
        description:
          "Builds the plans, timelines, and resource allocations that keep an initiative coordinated across committees and delivered on schedule."
      },
      {
        id: "field-execution",
        name: "Field Execution",
        description:
          "On-ground operations during a campaign — quick decisions, managing teams, keeping a live event running."
      },
      {
        id: "teaching-engagement",
        name: "Teaching & Engagement",
        description:
          "Builds the workshop materials and runs the learning sessions that make a complex idea land with the people in the room."
      }
    ]
  }
];

function buildQuestions(seed: CommitteeSeed): ApplicationQuestion[] {
  const fields: Array<ApplicationQuestion["field"]> = ["whyThisRole", "whyChooseYourself", "hopeToLearn"];
  const eyebrows = ["Why this committee", "What you bring", "What you're hoping for"];
  return seed.questions.map((prompt, index) => ({
    id: `${seed.id}-q${index + 1}`,
    field: fields[index],
    eyebrow: eyebrows[index],
    prompt,
    placeholder: "Take your time — a couple of honest sentences is plenty.",
    required: true
  }));
}

export const committees: Committee[] = seeds.map((seed) => ({
  id: seed.id,
  name: seed.name,
  displayName: seed.name,
  stepTitle: `${seed.name} Member`,
  vow: seed.vow,
  whyChoose: seed.whyChoose,
  actualWork: seed.actualWork,
  guidingQuestion: seed.questions[0],
  group: seed.group,
  roles: seed.subCommittees,
  questions: () => buildQuestions(seed),
  alsoAsked: () => [],
  interviewDurationMinutes: MEMBER_SLOT_MINUTES,
  interviewTask: () => ({ required: false }),
  interviewSlots: () => buildMemberSlots(seed.id),
  contacts: [GENERAL_CONTACT]
}));

export function findCommittee(id: string | null): Committee | null {
  if (!id) return null;
  return committees.find((committee) => committee.id === id) ?? null;
}

export function findCommitteeRole(committee: Committee | null, roleId: string | null): CommitteeRole | null {
  if (!committee || !roleId) return null;
  return committee.roles.find((role) => role.id === roleId) ?? null;
}
