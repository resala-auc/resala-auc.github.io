import { motion } from "motion/react";
import { Check } from "lucide-react";
import { ActLayout, TopNav } from "../components/Chrome";
import { AnimatedHeading } from "../components/AnimatedHeading";
import { GhostButton } from "../components/ui";
import { ContactBlock } from "../components/ContactBlock";
import { CHAPTER_EASE, actTransition, rise, stagger } from "../lib/motion";
import type { Committee, CommitteeRole } from "../data/committees";
import type { InterviewSlot } from "../types";

type ActSealedProps = {
  firstName: string;
  committee: Committee | null;
  role: CommitteeRole | null;
  slot: InterviewSlot | null;
};

export function ActSealed({ firstName, committee, role, slot }: ActSealedProps) {
  return (
    <motion.div variants={actTransition} initial="hidden" animate="show" exit="exit">
      <ActLayout>
        <TopNav act="sealed" />

        <motion.main
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-1 flex-col justify-center pt-4 pb-24"
        >
          <div className="w-full max-w-2xl">
            {/* The wax seal presses down, and the impact rings spread out. */}
            <div className="relative mb-10 h-20 w-20">
              {[0, 1].map((ring) => (
                <motion.span
                  key={ring}
                  className="absolute inset-0 rounded-full border border-brand-orange"
                  initial={{ scale: 1, opacity: 0 }}
                  animate={{ scale: [1, 2.4], opacity: [0.6, 0] }}
                  transition={{
                    duration: 2.4,
                    delay: 1 + ring * 0.6,
                    repeat: Infinity,
                    repeatDelay: 1.2,
                    ease: "easeOut"
                  }}
                />
              ))}
              <motion.div
                initial={{ scale: 2.2, opacity: 0, rotate: -25 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ duration: 1, ease: CHAPTER_EASE, delay: 0.2 }}
                className="relative flex h-20 w-20 items-center justify-center rounded-full bg-brand-orange shadow-[0_0_60px_rgba(234,194,98,0.45)]"
              >
                <motion.span
                  initial={{ pathLength: 0 }}
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 0.6, delay: 1 }}
                >
                  <Check className="h-9 w-9 text-brand-ink" strokeWidth={2.5} />
                </motion.span>
              </motion.div>
            </div>

            <AnimatedHeading
              text={`It is signed, ${firstName || "friend"}.`}
              className="mb-6 font-serif text-3xl leading-[1.15] font-normal text-white md:text-4xl lg:text-5xl"
            />

            <motion.p
              variants={rise}
              className="mb-10 max-w-lg text-lg leading-relaxed font-light text-white/80"
            >
              Your chapter is reserved and your application is with the board. A confirmation email
              is on its way to your AUC inbox.
            </motion.p>

            <motion.dl
              variants={rise}
              className="mb-10 grid gap-px overflow-hidden rounded-3xl border border-white/12 bg-white/10 sm:grid-cols-2"
            >
              <div className="bg-brand-night/80 p-6">
                <dt className="mb-2 text-[11px] font-medium tracking-[0.22em] text-brand-orange uppercase">
                  Your chapter
                </dt>
                <dd className="font-serif text-xl text-white">{committee?.displayName ?? "—"}</dd>
                <dd className="mt-1 text-sm text-white/50">
                  {role ? role.name : committee?.stepTitle}
                </dd>
              </div>
              <div className="bg-brand-night/80 p-6">
                <dt className="mb-2 text-[11px] font-medium tracking-[0.22em] text-brand-orange uppercase">
                  Your interview
                </dt>
                <dd className="font-serif text-xl text-white">
                  {slot ? `${slot.startTime} – ${slot.endTime}` : "To be scheduled"}
                </dd>
                <dd className="mt-1 text-sm text-white/50">
                  {slot ? slot.label || slot.date : "The team will contact you with a time."}
                </dd>
              </div>
            </motion.dl>

            {committee ? (
              <motion.div
                variants={rise}
                className="mb-10 rounded-3xl border border-brand-orange/30 bg-brand-orange/[0.07] p-6"
              >
                <p className="mb-2 text-[11px] font-medium tracking-[0.22em] text-brand-orange uppercase">
                  Bring this to the interview
                </p>
                <p className="leading-relaxed text-white/80">{committee.taskPrompt}</p>
              </motion.div>
            ) : null}

            {committee ? <ContactBlock committee={committee} className="mb-10" /> : null}

            <motion.div variants={rise} className="flex flex-col gap-4 sm:flex-row">
              <GhostButton href="../tasks/">Submit your task links</GhostButton>
              <GhostButton href="../" showArrow={false}>
                Back to Resala AUC
              </GhostButton>
            </motion.div>
          </div>
        </motion.main>
      </ActLayout>
    </motion.div>
  );
}
