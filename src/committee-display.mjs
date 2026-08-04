import { roleGuides } from "./role-guide-data.mjs";

/**
 * Display-only renames. `role.name` itself must stay untouched — the Supabase
 * submit function looks it up verbatim for role-guide links and slot lookups,
 * so a cosmetic rename lives here instead, never on the field the backend keys
 * off of. Every surface (landing page, guides, /join) reads this one map so
 * they cannot drift apart.
 */
export const displayNames = {
  "tech-director": "Tech Team",
  "initiatives-director": "Initiatives",
  "children-day-director": "Children’s Day"
};

/** Roles that exist in the data but are not recruiting this cycle. */
export const excludedRoleIds = ["treasurer"];

export function displayName(role) {
  return displayNames[role?.id] ?? role?.name ?? "";
}

/** The committees actually recruiting heads this cycle, in guide order. */
export const cycleRoleGuides = roleGuides.filter((role) => !excludedRoleIds.includes(role.id));

/** Every head role open this cycle, across all committees. */
export const cycleHeadCount = cycleRoleGuides.reduce((total, role) => total + (role.heads?.length ?? 0), 0);
