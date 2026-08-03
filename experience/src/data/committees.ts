import { roleGuides } from "../../../src/role-guide-data.mjs";
import {
  buildCommitteeSlots,
  getCommitteeContacts,
  getInterviewConfig
} from "../../../src/interview-config.mjs";
import type { InterviewSlot } from "../types";

export type InterviewTask = {
  required: boolean;
  summary?: string;
  detail?: string;
};

/** Who an applicant emails with questions about this committee. */
export type CommitteeContact = {
  name: string;
  email: string;
  title?: string;
};

/** Shape is inferred from the shared data file so the two can never drift. */
export type RoleGuide = (typeof roleGuides)[number];

/**
 * The /join experience recruits for a subset of chapters this cycle. Treasurer,
 * Children Day Director, and Initiatives Director are filled outside this cycle.
 * Everything else reuses the single source of truth in src/role-guide-data.mjs so
 * the guides at /guides and this flow never drift.
 */
export const EXCLUDED_ROLE_IDS = ["treasurer", "children-day-director", "initiatives-director"];

/** One head position (or persona) inside a committee that has more than one. */
export type CommitteeRole = {
  id: string;
  name: string;
  subtitle?: string;
  description: string;
};

export type QuestionSpec = {
  eyebrow: string;
  prompt: string;
  helper?: string;
  placeholder: string;
  required: boolean;
};

export type Committee = RoleGuide & {
  /**
   * The name shown to applicants. Falls back to the shared `name` field.
   * `name` itself must stay untouched — the Supabase function looks it up
   * verbatim (task docs, role-guide links), so a cosmetic rename lives here
   * instead, never on the field the backend keys off of.
   */
  displayName: string;
  /** One-line emotional promise shown on the chapter card. */
  vow: string;
  /**
   * Backstage committees build the systems nobody outside Resala sees.
   * Frontstage committees put the applicant in direct contact with the
   * people Resala serves. Drives the triage question right after the pen.
   */
  group: "backstage" | "frontstage";
  /** Head positions or personas an applicant must pick between. Empty for single-role chapters. */
  roles: CommitteeRole[];
  /** The two real questions this chapter asks, pulled from its own recruitment brief. */
  buildQuestions: (role: CommitteeRole | null) => {
    whyThisRole: QuestionSpec;
    whyChooseYourself: QuestionSpec;
  };
  /** Extra ground the real brief covers that does not fit the form — shown as interview prep, not typed. */
  alsoAsked: (role: CommitteeRole | null) => string[];
  /** How long this committee's interview runs. Differs per brief. */
  interviewDurationMinutes: number;
  /** Whether applicants must prepare something before the interview. */
  interviewTask: InterviewTask;
  /** This committee's own availability — every committee interviews on its own days. */
  interviewSlots: () => InterviewSlot[];
  /** Director and Vice-Director of this committee, for applicant questions. */
  contacts: CommitteeContact[];
};

const displayNames: Record<string, string> = {
  "tech-director": "Tech Team"
};

const vows: Record<string, string> = {
  "tech-director": "You will leave behind systems that keep working after you graduate.",
  operations: "Nothing happens on the ground until someone like you makes it happen.",
  "branding-media": "You decide how thousands of people first meet Resala.",
  hr: "You hold the people who hold everyone else.",
  "pr-fundraising": "You turn a conversation into a partnership, and a partnership into impact.",
  visits: "You are the one who actually sits with the family, face to face.",
  "children-day-director": "A child will remember one day you built for the rest of their life.",
  "initiatives-director": "You start the thing that did not exist before you."
};

const groups: Record<string, Committee["group"]> = {
  "tech-director": "backstage",
  "branding-media": "backstage",
  operations: "backstage",
  hr: "backstage",
  "pr-fundraising": "backstage",
  visits: "frontstage",
  "children-day-director": "frontstage",
  "initiatives-director": "frontstage"
};

type QuestionBuilder = Committee["buildQuestions"];
type AlsoAskedBuilder = Committee["alsoAsked"];

const questionBuilders: Record<string, QuestionBuilder> = {
  "tech-director": (role) => ({
    whyThisRole: {
      eyebrow: "Which persona are you, really",
      prompt: `Why does ${role?.name ?? "that persona"}'s job description sound like your Tuesday?`,
      helper: "Tools, past projects, or the kind of problems you gravitate toward.",
      placeholder: "Not a resume line — the actual reason this one, not one of the other five.",
      required: true
    },
    whyChooseYourself: {
      eyebrow: "Now prove it",
      prompt: "Tell us about a time you took full responsibility for a project or problem and saw it through to the end — not just started it.",
      placeholder: "What broke, what you did, how it ended.",
      required: true
    }
  }),
  "branding-media": (role) => ({
    whyThisRole: {
      eyebrow: "Why this head, specifically",
      prompt: `Why ${role?.name ?? "this head role"} — in three sentences, the way you'd actually say it out loud?`,
      placeholder: "Skip the resume voice. Say it like you're explaining it to a friend.",
      required: true
    },
    whyChooseYourself: {
      eyebrow: "Show us, don't tell us",
      prompt: "Link a portfolio, a Drive folder, an Instagram, a TikTok — anything you've made. If you have nothing to show yet, say so and tell us why you'd still be good at this.",
      placeholder: "A link, or an honest explanation.",
      required: true
    }
  }),
  operations: (role) => ({
    whyThisRole: {
      eyebrow: "Why this role, specifically",
      prompt: `Why ${role?.name ?? "this Operations role"}, and why you?`,
      placeholder: "The version you'd give a friend, not a form.",
      required: true
    },
    whyChooseYourself: {
      eyebrow: "Prove it happened once already",
      prompt: "Tell us about a time you took responsibility for something and saw it through — and about a time something went wrong that you had to fix yourself.",
      placeholder: "Two short stories beat one polished paragraph.",
      required: true
    }
  }),
  hr: () => ({
    whyThisRole: {
      eyebrow: "The role you already play",
      prompt: "Everyone naturally takes on a role in a team. What role do you usually end up playing, and why do you think that is?",
      placeholder: "The honest answer, not the flattering one.",
      required: true
    },
    whyChooseYourself: {
      eyebrow: "The problem nobody assigned you",
      prompt: "Tell us about a time you noticed a problem nobody asked you to solve. What did you do, and what happened?",
      placeholder: "Small counts. It just has to be real.",
      required: true
    }
  }),
  "pr-fundraising": (role) => ({
    whyThisRole: {
      eyebrow: "Which door you want to open",
      prompt: `Which role are you applying for, and why that one${role ? ` — what makes ${role.name} yours` : ""}?`,
      placeholder: "Say the real reason, not the impressive one.",
      required: true
    },
    whyChooseYourself: {
      eyebrow: "A challenge you actually had",
      prompt: "Describe a time you were working on a project and hit a real challenge. What was it, how did you handle it, and what did you learn?",
      placeholder: "The challenge, the handling, the lesson — in that order.",
      required: true
    }
  }),
  visits: (role) => ({
    whyThisRole: {
      eyebrow: "Which role, and why",
      prompt: `Which role are you applying for, and why do you believe it's the best fit for you${role ? ` as ${role.name}` : ""}?`,
      placeholder: "Not the title — the actual work of the role.",
      required: true
    },
    whyChooseYourself: {
      eyebrow: "A time you carried something",
      prompt: "Tell us about an experience where you took responsibility for a task, event, or project. What was your role, and what was the outcome?",
      placeholder: "One real experience, told straight.",
      required: true
    }
  }),
  "children-day-director": () => ({
    whyThisRole: {
      eyebrow: "The question this chapter asks",
      prompt: "Can you design a full journey that helps children grow week by week, not just plan activities for one Saturday?",
      helper: "Answer it the way you would answer it out loud, not the way you would write a CV.",
      placeholder: "Take your time. Two honest paragraphs beat ten polished lines.",
      required: true
    },
    whyChooseYourself: {
      eyebrow: "Consistency, not a single good day",
      prompt: "Tell us about a time you built or ran something over weeks, not just for one day — and had to keep it good every single time.",
      placeholder: "What it was, what made week 3 harder than week 1, how you kept it up.",
      required: true
    }
  }),
  "initiatives-director": () => ({
    whyThisRole: {
      eyebrow: "The question this chapter asks",
      prompt: "Why does your background and mindset align with this role?",
      placeholder: "Take your time. Two honest paragraphs beat ten polished lines.",
      required: true
    },
    whyChooseYourself: {
      eyebrow: "Full ownership, once",
      prompt: "Tell us about a situation where you took full ownership of a project, overcame unexpected challenges, and saw it through to completion.",
      placeholder: "The challenge, what you owned, how it ended.",
      required: true
    }
  })
};

const alsoAskedBuilders: Record<string, AlsoAskedBuilder> = {
  "tech-director": () => [
    "Walk us through a time you had to tell someone their request, timeline, or idea wasn't realistic — and how you handled it.",
    "When you hit a major blocker under deadline pressure, what's your actual first move?"
  ],
  "branding-media": () => [
    "Which tools do you actually use, and for how long? (Premiere, After Effects, CapCut, Photoshop, Illustrator, Canva, Figma, Lightroom, Meta Business Suite…)",
    "This isn't only online work — can you travel to visits, events, and filming days, including some weekends?",
    "What else are you committed to next semester: courses, another club, a job?"
  ],
  operations: (role) => {
    const base = ["Roughly how many hours a week can you realistically commit — and how are you planning to balance that with everything else?"];
    const byRole: Record<string, string> = {
      planning: "Tell us about a time you organized a project with multiple tasks and a tight deadline. How did you make sure it all landed?",
      inventory: "Tell us about a time you were responsible for keeping things organized or tracked. How did you make sure nothing went missing?",
      procurement: "Tell us about a time you had to manage a large number of items or resources. How did you keep track of everything?",
      logistics: "Describe a time something unexpected happened during an event. What did you actually do?"
    };
    return role && byRole[role.id] ? [...base, byRole[role.id]] : base;
  },
  hr: () => [
    "If you could improve one part of Resala's volunteer experience, what would it be — and how would you actually approach fixing it?"
  ],
  "pr-fundraising": (role) => {
    const base = [
      "What do you believe you'll add to Resala — and what do you hope to get out of the experience?",
      "What's one specific goal you'd want to hit if you got this role?"
    ];
    const byRole: Record<string, string> = {
      sponsorship: "Imagine you're working the Ramadan Bags event. Which sponsors would you contact, and how? Include the actual pitch.",
      events: "Imagine you're working the Ramadan Bags event. What kind of event would you run? Sketch the plan.",
      partnerships: "Imagine you're working the Ramadan Bags event. How would you campaign for manpower and awareness? Sketch the plan."
    };
    return role && byRole[role.id] ? [...base, byRole[role.id]] : base;
  },
  visits: (role) => {
    const base = [
      "Describe a challenge you faced while working in a team. How did you handle it, and what did you learn?",
      "How many hours per week can you realistically commit to Resala Visits this semester?"
    ];
    const byRole: Record<string, string> = {
      discovery: "Be ready to talk through: a Fixing Visit is two weeks out, 25 volunteers, materials not secured yet. What do you ask before you approve it?",
      execution: "Be ready to talk through: same visit. What's your timeline from planning to the last volunteer leaving?",
      impact: "Be ready to talk through: the visit already happened. How do you know if it actually worked?",
      storytelling: "Be ready to talk through: how do you tell this family's story without turning them into content?"
    };
    return role && byRole[role.id] ? [...base, byRole[role.id]] : base;
  },
  "children-day-director": () => [
    "Draft, roughly, what you think underprivileged children need most from a day like this — we'll talk it through at the interview."
  ],
  "initiatives-director": () => [
    "Roughly how many hours a week can you genuinely commit — including off-campus field execution if needed?"
  ]
};

export const committees: Committee[] = roleGuides
  .filter((role) => !EXCLUDED_ROLE_IDS.includes(role.id))
  .map((role) => ({
    ...role,
    displayName: displayNames[role.id] ?? role.name,
    vow: vows[role.id] ?? role.shortDescription,
    group: groups[role.id] ?? "backstage",
    // Heads live on the shared role-guide data (role-guide-data.mjs) so /join and
    // /guides can never drift on who the actual heads are.
    roles: (role as { heads?: CommitteeRole[] }).heads ?? [],
    buildQuestions: questionBuilders[role.id],
    alsoAsked: alsoAskedBuilders[role.id] ?? (() => []),
    interviewDurationMinutes: getInterviewConfig(role.id)?.durationMinutes ?? 60,
    interviewTask: getInterviewConfig(role.id)?.task ?? { required: false },
    interviewSlots: () => buildCommitteeSlots(role.id) as InterviewSlot[],
    contacts: getCommitteeContacts(role.id) as CommitteeContact[]
  }));

export function findCommittee(id: string | null): Committee | null {
  if (!id) return null;
  return committees.find((committee) => committee.id === id) ?? null;
}

export function findCommitteeRole(committee: Committee | null, roleId: string | null): CommitteeRole | null {
  if (!committee || !roleId) return null;
  return committee.roles.find((role) => role.id === roleId) ?? null;
}

export const yearLevelOptions = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
  "Graduate",
  "Other"
] as const;
