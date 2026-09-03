import type { Identity } from "../types";

export type Errors<T> = Partial<Record<keyof T, string>>;

/**
 * Any real email, not only @aucegypt.edu. Incoming freshmen have not been
 * issued an AUC address yet, and the interview's Meet link only lets a guest
 * in without knocking when they are on the invite under the address they are
 * actually signed in as — so we take whichever address they can open.
 */
const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PHONE = /^[+0-9()\-\s]{8,20}$/;

export function validateIdentity(identity: Identity): Errors<Identity> {
  const errors: Errors<Identity> = {};

  if (identity.fullName.trim().length < 3) {
    errors.fullName = "Write your full name as it appears on your AUC record.";
  }
  if (!EMAIL.test(identity.aucEmail.trim())) {
    errors.aucEmail = "Enter an email we can reach you on — AUC or personal.";
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
