import { roleGuides } from "./role-guide-data.mjs";

export type RoleId =
  | "treasurer"
  | "tech-director"
  | "operations"
  | "branding-media"
  | "hr"
  | "pr-fundraising"
  | "visits"
  | "children-day-director"
  | "mothers-day-director"
  | "initiatives-director";

export type RoleOption = {
  id: RoleId;
  name: string;
  stepTitle: string;
  description: string;
  whyChoose: string;
  actualWork: string[];
  leadershipRequirement: string;
  ownershipRequirement: string;
  skillsRequirement: string[];
  preferredExperiences: string[];
  guidingQuestion: string;
  taskPrompt: string;
};

export type ApplicationPayload = {
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
  whyThisRole: string;
  whyChooseYourself: string;
  hopeToLearn: string;
  previousResalaExperience: string;
  interviewSlot: string;
  interviewSlotId: string;
  interviewSlotLabel: string;
  createdAt: string;
};

export type TaskSubmissionPayload = {
  mode: "task-submission";
  aucEmail: string;
  studentId: string;
  firstPreferenceTaskLink: string;
  secondPreferenceTaskLink: string;
  taskNotes: string;
  submittedAt: string;
};

export type ConfirmationEmailTemplate = {
  subject: string;
  body: string;
};

export type InterviewSlotOption = {
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
  calendarEventId?: string;
  meetLink?: string;
};

type ApplicationEndpointMode = "cors" | "no-cors";

type RuntimeSpreadsheetConfig = typeof globalThis & {
  RESALA_APPLICATIONS_ENDPOINT?: string;
  RESALA_APPLICATIONS_ENDPOINT_MODE?: ApplicationEndpointMode;
};

const runtimeConfig = globalThis as RuntimeSpreadsheetConfig;

export const APPLICATION_ENDPOINT = runtimeConfig.RESALA_APPLICATIONS_ENDPOINT?.trim() ?? "";
export const APPLICATION_ENDPOINT_MODE: ApplicationEndpointMode =
  runtimeConfig.RESALA_APPLICATIONS_ENDPOINT_MODE === "no-cors" ? "no-cors" : "cors";

export const roles: RoleOption[] = roleGuides.map((role) => ({
  id: role.id as RoleId,
  name: role.name,
  stepTitle: role.stepTitle,
  description: role.shortDescription,
  whyChoose: role.whyChoose,
  actualWork: role.actualWork,
  leadershipRequirement: role.leadershipRequirement,
  ownershipRequirement: role.ownershipRequirement,
  skillsRequirement: role.skillsRequirement,
  preferredExperiences: role.preferredExperiences,
  guidingQuestion: role.guidingQuestion,
  taskPrompt: role.taskPrompt
}));

export const yearLevelOptions = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate", "Other"] as const;

export async function fetchInterviewSlots(): Promise<InterviewSlotOption[]> {
  if (!APPLICATION_ENDPOINT) {
    throw new Error("Application database is not configured yet. Add the spreadsheet endpoint in spreadsheet-config.js.");
  }

  const response = await fetch(APPLICATION_ENDPOINT, { method: "GET", mode: APPLICATION_ENDPOINT_MODE });
  const body = await response.json();

  if (!response.ok || body?.ok === false) {
    throw new Error(body?.error || "Could not load interview slots.");
  }

  return Array.isArray(body?.slots) ? (body.slots as InterviewSlotOption[]) : [];
}

export function createConfirmationEmailTemplate(payload: ApplicationPayload): ConfirmationEmailTemplate {
  const selectedRole = roles.find((role) => role.name === payload.roleAppliedFor);
  const roleLine = selectedRole?.taskPrompt ?? "One practical idea for how you would help the team move the work forward.";

  return {
    subject: `Resala AUC: your ${payload.roleAppliedFor} application was received`,
    body: [
      `Hi ${payload.fullName},`,
      "",
      `Thanks for applying to Resala AUC. Your first preference is ${payload.roleAppliedFor}, and your second preference is ${payload.secondPreference}.`,
      "",
      `Your interview slot is: ${payload.interviewSlotLabel || payload.interviewSlot}.`,
      "",
      "Please prepare one simple idea for the role:",
      "",
      `- ${roleLine}`,
      "",
      "Keep it simple. We are not looking for a polished pitch.",
      "If anything feels unclear, just reply to this email and we will help.",
      "",
      "Best,",
      "Resala AUC"
    ].join("\n")
  };
}

export async function submitApplication(data: ApplicationPayload): Promise<{ ok: true }> {
  if (!APPLICATION_ENDPOINT) {
    throw new Error("Application database is not configured yet. Add the spreadsheet endpoint in spreadsheet-config.js.");
  }

  const response = await fetch(APPLICATION_ENDPOINT, {
    method: "POST",
    mode: APPLICATION_ENDPOINT_MODE,
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      ...data
    })
  });

  if (response.type === "opaque") {
    return { ok: true };
  }

  const responseText = await response.text();
  const responseBody = responseText ? JSON.parse(responseText) : null;

  if (!response.ok || responseBody?.ok === false) {
    throw new Error(responseBody?.error || "Application database rejected the submission.");
  }

  return { ok: true };
}

export async function submitTasks(data: TaskSubmissionPayload): Promise<{ ok: true }> {
  if (!APPLICATION_ENDPOINT) {
    throw new Error("Application database is not configured yet. Add the spreadsheet endpoint in spreadsheet-config.js.");
  }

  const response = await fetch(APPLICATION_ENDPOINT, {
    method: "POST",
    mode: APPLICATION_ENDPOINT_MODE,
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      ...data
    })
  });

  if (response.type === "opaque") {
    return { ok: true };
  }

  const responseText = await response.text();
  const responseBody = responseText ? JSON.parse(responseText) : null;

  if (!response.ok || responseBody?.ok === false) {
    throw new Error(responseBody?.error || "Application database rejected the task submission.");
  }

  return { ok: true };
}
