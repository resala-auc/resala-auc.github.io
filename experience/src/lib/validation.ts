import type { Identity } from "../types";

export type Errors<T> = Partial<Record<keyof T, string>>;

const AUC_EMAIL = /^[A-Za-z0-9._%+-]+@aucegypt\.edu$/i;
const PHONE = /^[+0-9()\-\s]{8,20}$/;

export function validateIdentity(identity: Identity): Errors<Identity> {
  const errors: Errors<Identity> = {};

  if (identity.fullName.trim().length < 3) {
    errors.fullName = "Write your full name as it appears on your AUC record.";
  }
  if (!AUC_EMAIL.test(identity.aucEmail.trim())) {
    errors.aucEmail = "Use your AUC email — it must end with @aucegypt.edu.";
  }
  if (!identity.studentId.trim()) {
    errors.studentId = "Your student ID is required.";
  }
  if (!identity.major.trim()) {
    errors.major = "Tell us what you study.";
  }
  if (!identity.yearLevel.trim()) {
    errors.yearLevel = "Select your standing.";
  }
  if (!PHONE.test(identity.phone.trim())) {
    errors.phone = "Add a WhatsApp number we can actually reach you on.";
  }
  if (!identity.whatsappConsent) {
    errors.whatsappConsent = "We need your consent to add this number to the WhatsApp group.";
  }

  return errors;
}

export function hasErrors(errors: Record<string, unknown>): boolean {
  return Object.keys(errors).length > 0;
}
