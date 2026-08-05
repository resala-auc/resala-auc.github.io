import { cycleRoleGuides, displayName, excludedRoleIds } from "../../../src/committee-display.mjs";
import {
  buildCommitteeSlots,
  getCommitteeContacts,
  getInterviewConfig
} from "../../../src/interview-config.mjs";
import { buildApplicationQuestions } from "../../../src/application-questions.mjs";
import type { InterviewSlot } from "../types";

/** One question exactly as the committee's own brief words it. */
export type ApplicationQuestion = {
  id: string;
  /** Applications-sheet column this answer lands in, or null to be grouped. */
  field: "whyThisRole" | "whyChooseYourself" | "hopeToLearn" | "previousResalaExperience" | null;
  eyebrow: string;
  prompt: string;
  helper?: string;
  placeholder: string;
  required: boolean;
};

export type InterviewTask = {
  required: boolean;
  /** True when the task is handed out at the interview, not prepared beforehand. */
  atInterview?: boolean;
  summary?: string;
  detail?: string;
  /** The shared situation the task is set in, where a brief defines one. */
  scenario?: string;
  /** What this specific head must hand in. */
  title?: string;
  points?: string[];
  /** Set when the task is handed in online before the interview, not brought to it. */
  dueBeforeInterviewMinutes?: number;
  submissionUrl?: string;
};

/** Who an applicant emails with questions about this committee. */
export type CommitteeContact = {
  name: string;
  email: string;
  title?: string;
};

/** Shape is inferred from the shared data file so the two can never drift. */
export type RoleGuide = (typeof cycleRoleGuides)[number];

/**
 * The /join experience recruits for a subset of chapters this cycle. Treasurer,
 * Children Day Director, and Initiatives Director are filled outside this cycle.
 * Everything else reuses the single source of truth in src/role-guide-data.mjs so
 * the guides at /guides and this flow never drift.
 */
/** Treasurer is filled outside this cycle; every other committee recruits here. */
export const EXCLUDED_ROLE_IDS = excludedRoleIds;

/** One head position (or persona) inside a committee that has more than one. */
export type CommitteeRole = {
  id: string;
  name: string;
  subtitle?: string;
  description: string;
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
  /** Every question this committee's brief asks, in its own wording. */
  questions: (role: CommitteeRole | null) => ApplicationQuestion[];
  /** Extra ground the real brief covers that does not fit the form — shown as interview prep, not typed. */
  alsoAsked: (role: CommitteeRole | null) => string[];
  /** How long this committee's interview runs. Differs per brief. */
  interviewDurationMinutes: number;
  /** What this head must prepare beforehand. Differs per head where the brief says so. */
  interviewTask: (role: CommitteeRole | null) => InterviewTask;
  /** This committee's own availability — every committee interviews on its own days. */
  interviewSlots: () => InterviewSlot[];
  /** Director and Vice-Director of this committee, for applicant questions. */
  contacts: CommitteeContact[];
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

type AlsoAskedBuilder = Committee["alsoAsked"];

/*
 * Interview-only ground. Everything the briefs list as an application question
 * now appears on the form itself, so this holds only what a brief explicitly
 * keeps back for the live interview.
 */
const alsoAskedBuilders: Record<string, AlsoAskedBuilder> = {
  "branding-media": (role) => [
    "Ownership, leadership and how you handle failure are deliberately not on this form — they come up live, where we can follow up.",
    ...(({
      design: [
        "Live: how do you balance making something visually appealing while keeping the message clear?",
        "Live: an event is tomorrow and the post still is not finished. What do you do?"
      ],
      editing: [
        "Live: if two editors have completely different styles, how would you keep the account consistent?",
        "Live: how would you keep members on deadline if they are not answering?"
      ],
      production: [
        "Live: what will you do if you cannot find anyone who can act? Will you teach them?",
        "Live: if there are no good shots, what will you do?"
      ],
      projects: [
        "Live: how do you prioritise deadlines when several events land in the same week?"
      ]
    })[role?.id ?? ""] ?? [])
  ],
  "tech-director": () => [
    "These same questions come back in the interview, asked in a different order."
  ],
  operations: (role) =>
    ({
      planning: ["Live: tell us about a time you organized a project with multiple tasks and tight deadlines. How did you ensure everything was completed?"],
      procurement: ["Live: tell us about a time you had to organize a large number of items or resources. How did you ensure nothing was lost or forgotten?"],
      logistics: ["Live: describe a situation where something unexpected happened during an event or project. What did you do to solve it?"],
      inventory: ["Live: tell us about a time you were responsible for keeping things organized or tracking important items. How did you make sure nothing was misplaced?"]
    })[role?.id ?? ""] ?? [],
  "children-day-director": (role) => [
    "There is a task for your head, and it carries the most weight in scoring. The sheet is emailed to you when you book, and you submit your work at least an hour before your interview.",
    ...(({
      creative: [
        "Your task: design a ~4-slide interactive presentation that holds children's attention and delivers a clear educational benefit by the end.",
        "Live: how would you organise your committee to design 15+ slide decks in three weeks while keeping quality high?"
      ],
      english: [
        "Your task: structure a ~4-slide deck for intermediate-level students teaching key vocabulary alongside a grammar lesson, built around a real-life problem these students face.",
        "Live: what criteria do you look for in a mock-teaching audition to decide if someone is fit to teach children?"
      ],
      teaching: [
        "Your task: two ~150-word parent phone scripts, an operations contingency plan, and a placement-conflict response.",
        "Live: how do you keep a minimum of 3 facilitators per 20 students if volunteers do not show up on Saturday morning?"
      ]
    })[role?.id ?? ""] ?? [])
  ],
  "initiatives-director": (role) =>
    ({
      research: [
        "Live: how do you gather and analyse feedback, and turn raw data into actionable campaign improvements?",
        "Live: post-campaign feedback shows 40% of participants felt a project missed expectations, but committee heads disagree. How do you present that to the board?"
      ],
      "execution-management": [
        "Live: planning a multi-week campaign that depends on Operations, Tech, HR and Branding — how do you enforce timelines and keep everyone accountable?",
        "Live: two weeks before launch, a supporting committee falls behind and the delivery date is at risk. What are your first three steps?"
      ],
      "field-execution": [
        "Live: an operational breakdown or logistical delay happens on the ground during a live event. How do you handle it on the spot?",
        "Live: venue security asks you to move your setup in 15 minutes and half your volunteers have not shown up. What do you do?"
      ],
      "teaching-engagement": [
        "Live: how do you design slides and activities so participants stay engaged and absorb complex ideas?",
        "Live: 15 minutes into a workshop half the audience is disengaged and struggling. How do you pivot?"
      ]
    })[role?.id ?? ""] ?? [],
  visits: () => [
    "Communication and teamwork, commitment, problem solving, and character carry the interview score."
  ],
  hr: (role) =>
    ({
      engagement: ["Live: with a limited budget, what engagement activity would you run to bring members closer together?"],
      inclusion: ["Live: a visually impaired volunteer wants to join an event that was not designed with accessibility in mind. How would you approach it?"],
      tracking: ["Live: walk us through how you would organize a messy spreadsheet with hundreds of inconsistent entries."],
      recognition: ["Live: walk us through how you would decide between a warning and a demotion for an inactive member."]
    })[role?.id ?? ""] ?? []
};

export const committees: Committee[] = cycleRoleGuides
  .map((role) => ({
    ...role,
    displayName: displayName(role),
    vow: vows[role.id] ?? role.shortDescription,
    group: groups[role.id] ?? "backstage",
    // Heads live on the shared role-guide data (role-guide-data.mjs) so /join and
    // /guides can never drift on who the actual heads are.
    roles: (role as { heads?: CommitteeRole[] }).heads ?? [],
    questions: (r: CommitteeRole | null) => buildApplicationQuestions(role.id, r) as ApplicationQuestion[],
    alsoAsked: alsoAskedBuilders[role.id] ?? (() => []),
    interviewDurationMinutes: getInterviewConfig(role.id)?.durationMinutes ?? 60,
    interviewTask: (r: CommitteeRole | null): InterviewTask => {
      const task = getInterviewConfig(role.id)?.task as
        | (InterviewTask & { byRole?: Record<string, { title: string; points: string[] }> })
        | undefined;
      if (!task?.required) return { required: false };
      const forRole = r ? task.byRole?.[r.id] : undefined;
      return { ...task, title: forRole?.title, points: forRole?.points };
    },
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
