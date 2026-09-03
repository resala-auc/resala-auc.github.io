export type Act =
  | "hero"
  | "identity"
  | "pen"
  | "path"
  | "chapters"
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
  whatsappConsent: boolean;
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
  /** Routes this submission to the members sheet/tabs instead of the classic fall-through path. */
  mode: "member-submit";
  timestamp: string;
  fullName: string;
  aucEmail: string;
  studentId: string;
  major: string;
  yearLevel: string;
  phone: string;
  whatsappConsent: boolean;
  roleAppliedFor: string;
  roleStepTitle: string;
  roleDescription: string;
  /** The sub-committee inside the chosen committee, and its stable id. */
  subCommittee: string;
  subCommitteeId: string;
  /*
   * Stable ids alongside the display names. The names are what a human reads in
   * the sheet; these are what the dashboards match on, so a committee being
   * renamed never orphans an application.
   */
  committeeId: string;
  roleId: string;
  /*
   * Every question this applicant was actually asked, with its prompt, in the
   * order it appeared. Committees ask between three and six different
   * questions, so the four fixed columns below cannot hold them without
   * collapsing several answers into one cell.
   */
  answers: Array<{ id: string; prompt: string; answer: string }>;
  whyThisRole: string;
  whyChooseYourself: string;
  hopeToLearn: string;
  previousResalaExperience: string;
  interviewSlot: string;
  interviewSlotId: string;
  interviewSlotLabel: string;
  createdAt: string;
};
