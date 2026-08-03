import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { TOUCH_SPRING, popIn } from "../lib/motion";
import type { Committee } from "../data/committees";

/**
 * A single chapter card. Multi-role chapters expose the head picker as chips
 * right here — never something the applicant has to discover inside a sheet —
 * and the picked head's real description appears the moment it is tapped.
 * Clicking empty space on the card opens the full sheet to read more.
 */
export function CommitteeCard({
  committee,
  active,
  activeRoleId,
  onSelect,
  onSelectRole,
  onOpenDetail
}: {
  committee: Committee;
  active: boolean;
  activeRoleId: string | null;
  onSelect: (id: string) => void;
  onSelectRole: (roleId: string) => void;
  onOpenDetail: (committee: Committee) => void;
}) {
  const hasRoles = committee.roles.length > 0;
  const pickedRole = committee.roles.find((role) => role.id === activeRoleId) ?? null;

  return (
    <motion.div
      layoutId={`chapter-${committee.id}`}
      variants={popIn}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={TOUCH_SPRING}
      className={`group relative flex flex-col items-start gap-3 overflow-hidden rounded-3xl border p-6 text-left backdrop-blur-sm transition-colors duration-300 ${
        active
          ? "border-brand-orange bg-brand-orange/10"
          : "border-white/12 bg-white/[0.04] hover:border-white/35 hover:bg-white/[0.07]"
      }`}
    >
      <button
        type="button"
        onClick={() => (hasRoles ? onOpenDetail(committee) : onSelect(committee.id))}
        aria-pressed={active}
        aria-label={hasRoles ? `Read more about ${committee.displayName}` : `Choose ${committee.displayName}`}
        className="absolute inset-0 z-0 cursor-pointer rounded-3xl"
      />

      <span className="pointer-events-none text-[11px] font-medium tracking-[0.22em] text-brand-orange uppercase">
        {committee.stepTitle}
      </span>
      <span className="pointer-events-none font-serif text-xl text-white">{committee.displayName}</span>
      <span className="pointer-events-none text-sm leading-relaxed text-white/60">{committee.vow}</span>

      {hasRoles ? (
        <div className="relative z-10 flex w-full flex-col gap-2">
          <span className="text-xs font-medium text-white/45">Tap the head you want:</span>
          <div className="flex flex-wrap gap-1.5">
            {committee.roles.map((role) => {
              const roleActive = active && activeRoleId === role.id;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => {
                    onSelect(committee.id);
                    onSelectRole(role.id);
                  }}
                  aria-pressed={roleActive}
                  className={`inline-flex min-h-9 items-center rounded-full border px-3.5 py-2 text-xs font-medium transition-colors duration-300 ${
                    roleActive
                      ? "border-brand-orange bg-brand-orange text-brand-ink"
                      : "border-white/20 text-white/70 hover:border-white/50 hover:text-white"
                  }`}
                >
                  {role.name}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {pickedRole ? (
              <motion.p
                key={pickedRole.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded-xl border border-brand-orange/25 bg-brand-orange/[0.06] px-3 py-2 text-xs leading-relaxed text-white/70"
              >
                <span className="font-medium text-brand-orange">{pickedRole.name}.</span>{" "}
                {pickedRole.description}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => onOpenDetail(committee)}
        className="relative z-10 -my-1 inline-flex min-h-9 items-center py-2 text-xs font-medium text-white/45 underline-offset-4 transition-colors hover:text-white hover:underline"
      >
        What this chapter really asks
      </button>

      <AnimatePresence>
        {active ? (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="pointer-events-none absolute top-5 right-5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-brand-orange text-brand-ink"
          >
            <Check className="h-4 w-4" strokeWidth={3} />
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
