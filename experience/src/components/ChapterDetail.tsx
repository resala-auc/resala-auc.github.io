import { motion } from "motion/react";
import { X } from "lucide-react";
import { GhostButton, PrimaryButton } from "./ui";
import { CHAPTER_EASE } from "../lib/motion";
import type { Committee, CommitteeRole } from "../data/members";

export function ChapterDetail({
  committee,
  pickedRoleId,
  onPickRole,
  onClose,
  onChoose
}: {
  committee: Committee;
  pickedRoleId: string | null;
  onPickRole: (id: string | null) => void;
  onClose: () => void;
  onChoose: () => void;
}) {
  const hasRoles = committee.roles.length > 0;
  const canChoose = !hasRoles || Boolean(pickedRoleId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-ink/45 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-label={`${committee.displayName} details`}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.5, ease: CHAPTER_EASE }}
        onClick={(event) => event.stopPropagation()}
        className="scroll-quiet max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-brand-line bg-brand-cream p-8 sm:rounded-3xl md:p-10"
      >
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] text-brand-blue uppercase">
              {committee.stepTitle}
            </p>
            <h2 className="mt-2 font-serif text-2xl font-bold text-brand-blue md:text-3xl">{committee.displayName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chapter details"
            className="rounded-full border border-brand-line p-2 text-brand-muted transition-colors hover:border-brand-blue hover:text-brand-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-8 leading-relaxed text-brand-ink">{committee.whyChoose}</p>

        <h3 className="mb-3 text-sm font-medium tracking-wide text-brand-muted uppercase">
          The actual work
        </h3>
        <ul className="mb-8 flex flex-col gap-2">
          {committee.actualWork.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-relaxed text-brand-muted">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-blue" />
              {item}
            </li>
          ))}
        </ul>

        {hasRoles ? (
          <div className="mb-8">
            <h3 className="mb-3 text-sm font-medium tracking-wide text-brand-muted uppercase">
              Pick your head — this chapter has {committee.roles.length}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {committee.roles.map((role: CommitteeRole) => {
                const active = pickedRoleId === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => onPickRole(role.id)}
                    aria-pressed={active}
                    className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-colors duration-300 ${
                      active
                        ? "border-brand-blue bg-brand-pale"
                        : "border-brand-line bg-white hover:border-brand-blue/45 hover:bg-brand-pale"
                    }`}
                  >
                    <span className="font-serif text-base font-semibold text-brand-ink">{role.name}</span>
                    {role.subtitle ? (
                      <span className="text-[11px] font-medium tracking-[0.15em] text-brand-blue uppercase">
                        {role.subtitle}
                      </span>
                    ) : null}
                    <span className="text-xs leading-relaxed text-brand-muted">{role.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mb-8 rounded-2xl border border-brand-glow bg-brand-pale p-6">
          <p className="mb-2 text-[11px] font-semibold tracking-[0.22em] text-brand-blue uppercase">
            The question you must answer honestly
          </p>
          <p className="font-serif text-lg leading-relaxed text-brand-ink">
            {committee.guidingQuestion}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <PrimaryButton onClick={onChoose} disabled={!canChoose}>
            {hasRoles && !pickedRoleId ? "Pick a head first" : "Take this chapter"}
          </PrimaryButton>
          <GhostButton href={`../guides/${committee.id}/`} showArrow={false}>
            Read the full guide
          </GhostButton>
        </div>
      </motion.section>
    </motion.div>
  );
}
