export type Act =
  | "hero"
  | "identity"
  | "pen"
  | "path"
  | "chapters"
  | "backup"
  | "questions"
  | "slot"
  | "sealed";

export type CommitteeGroup = "backstage" | "frontstage";

export type Identity = {
  fullName: string;
  aucEmail: string;
  studentId: string;
  major: string;
  yearLevel: string;
  phone: string;
};

export type Answers = {
  whyThisRole: string;
  whyChooseYourself: string;
  hopeToLearn: string;
  previousResalaExperience: string;
};

export type InterviewSlot = {
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
  meetLink?: string;
};

/** Wire format expected by the Supabase submit function. Field names are fixed. */
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
