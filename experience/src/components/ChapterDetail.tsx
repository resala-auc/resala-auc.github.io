import { motion } from "motion/react";
import { X } from "lucide-react";
import { GhostButton, PrimaryButton } from "./ui";
import { CHAPTER_EASE } from "../lib/motion";
import type { Committee, CommitteeRole } from "../data/committees";

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-night/80 backdrop-blur-md sm:items-center"
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
        className="scroll-quiet max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/12 bg-brand-ink/95 p-8 sm:rounded-3xl md:p-10"
      >
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <p className="text-[11px] font-medium tracking-[0.22em] text-brand-orange uppercase">
              {committee.stepTitle}
            </p>
            <h2 className="mt-2 font-serif text-2xl text-white md:text-3xl">{committee.displayName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chapter details"
            className="rounded-full border border-white/20 p-2 text-white/60 transition-colors hover:border-white hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-8 leading-relaxed text-white/75">{committee.whyChoose}</p>

        <h3 className="mb-3 text-sm font-medium tracking-wide text-white/50 uppercase">
          The actual work
        </h3>
        <ul className="mb-8 flex flex-col gap-2">
          {committee.actualWork.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-relaxed text-white/70">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-orange" />
              {item}
            </li>
          ))}
        </ul>

        {hasRoles ? (
          <div className="mb-8">
            <h3 className="mb-3 text-sm font-medium tracking-wide text-white/50 uppercase">
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
                        ? "border-brand-orange bg-brand-orange/12"
                        : "border-white/12 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="font-serif text-base text-white">{role.name}</span>
                    {role.subtitle ? (
                      <span className="text-[11px] font-medium tracking-[0.15em] text-brand-orange uppercase">
                        {role.subtitle}
                      </span>
                    ) : null}
                    <span className="text-xs leading-relaxed text-white/55">{role.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mb-8 rounded-2xl border border-brand-orange/30 bg-brand-orange/[0.07] p-6">
          <p className="mb-2 text-[11px] font-medium tracking-[0.22em] text-brand-orange uppercase">
            The question you must answer honestly
          </p>
          <p className="font-serif text-lg leading-relaxed text-white">
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
