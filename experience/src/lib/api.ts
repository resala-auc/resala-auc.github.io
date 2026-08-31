import type { ApplicationPayload, InterviewSlot } from "../types";

type EndpointMode = "cors" | "no-cors";

type RuntimeConfig = typeof globalThis & {
  RESALA_APPLICATIONS_ENDPOINT?: string;
  RESALA_APPLICATIONS_ENDPOINT_MODE?: EndpointMode;
};

const runtime = globalThis as RuntimeConfig;

/**
 * Same Supabase Edge Function the classic /apply form posts to. Kept overridable
 * through the global so a page can swap endpoints without a rebuild.
 */
const FALLBACK_ENDPOINT = "https://upnmxdgqdkvgzfwqaicb.supabase.co/functions/v1/submit";

export const ENDPOINT = runtime.RESALA_APPLICATIONS_ENDPOINT?.trim() || FALLBACK_ENDPOINT;
export const ENDPOINT_MODE: EndpointMode =
  runtime.RESALA_APPLICATIONS_ENDPOINT_MODE === "no-cors" ? "no-cors" : "cors";

/**
 * This app now serves the Members cycle only (heads intake is closed), so
 * this always hits the member-specific GET branch. Using the old `?committee=`
 * param would silently route into the heads-cycle slot lookup instead —
 * wrong data, and a same-named committee (e.g. "Tech Team" exists in both
 * cycles) could return real heads interview slots to a member applicant.
 */
export async function fetchInterviewSlots(committee?: string): Promise<InterviewSlot[]> {
  const url = committee
    ? `${ENDPOINT}?memberCommittee=${encodeURIComponent(committee)}`
    : ENDPOINT;
  const response = await fetch(url, { method: "GET", mode: ENDPOINT_MODE });
  const body = await response.json();

  if (!response.ok || body?.ok === false) {
    throw new Error(body?.error || "Could not load interview slots.");
  }

  return Array.isArray(body?.slots) ? (body.slots as InterviewSlot[]) : [];
}

export async function submitApplication(payload: ApplicationPayload): Promise<void> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    mode: ENDPOINT_MODE,
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });

  if (response.type === "opaque") return;

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok || body?.ok === false) {
    throw new Error(body?.error || "The application could not be saved. Please try again.");
  }
}

export type PanelContact = { name: string; email: string; positionType: string };

/**
 * The Director and Vice-Director(s) for a committee, read from the same Board
 * Hierarchy sheet the interview invite uses — so the page can never disagree
 * with who actually gets the calendar invite.
 */
export async function fetchCommitteeContacts(committee: string): Promise<PanelContact[]> {
  const response = await fetch(`${ENDPOINT}?memberContacts=${encodeURIComponent(committee)}`, {
    method: "GET",
    mode: ENDPOINT_MODE
  });
  const body = await response.json();
  if (!response.ok || body?.ok === false) return [];
  return Array.isArray(body?.contacts) ? (body.contacts as PanelContact[]) : [];
}
