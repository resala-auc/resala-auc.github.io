import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { CHAPTER_EASE, actContent } from "../lib/motion";
import { SHOW_INTERVIEW_BOOKING } from "../data/members";
import type { Act } from "../types";

const asset = (file: string) => `${import.meta.env.BASE_URL}${file}`;

export const ACT_ORDER: Act[] = [
  "identity",
  "pen",
  "path",
  "chapters",
  "questions",
  "slot",
  "sealed"
];

const ACT_LABELS: Record<Act, string> = {
  hero: "Opening",
  identity: "Who you are",
  pen: "The pen",
  path: "Where you fit",
  chapters: "Your chapter",
  questions: "Your words",
  // The last step only books a time while booking is switched on; otherwise
  // it is purely the send step.
  slot: SHOW_INTERVIEW_BOOKING ? "Your time" : "Send it",
  sealed: "Signed"
};

export function TopNav({ act }: { act: Act }) {
  const index = ACT_ORDER.indexOf(act);
  const label = index >= 0 ? `${ACT_LABELS[act]} · ${index + 1}/${ACT_ORDER.length}` : "Recruitment 2026";

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, ease: "easeOut" }}
      className="flex w-full items-center justify-center py-8 sm:justify-between"
    >
      <a
        href="../"
        className="hidden text-sm font-medium tracking-wide text-brand-ink transition-colors hover:text-brand-ink sm:block"
      >
        Resala AUC
      </a>

      {/* Cropped to the badge and circle-masked ahead of time. The brand SVG is a
          620KB raster wrapped in vector, which is not worth shipping for a 56px
          mark, so this is a 224px transparent PNG of the same artwork. */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{ scale: 1.08 }}
        className="flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24"
      >
        <img src={asset("resala-logo.png")} alt="Resala AUC" className="h-full w-full object-contain" />
      </motion.div>

      <div className="hidden h-5 overflow-hidden text-sm font-medium tracking-wide text-brand-muted sm:block">
        <AnimatePresence mode="wait">
          <motion.p
            key={label}
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -18, opacity: 0 }}
            transition={{ duration: 0.45, ease: CHAPTER_EASE }}
          >
            {label}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}

/** Six ink dots down the right edge; the current act glows and the line fills. */
export function ProgressRail({ act }: { act: Act }) {
  const index = ACT_ORDER.indexOf(act);
  if (index < 0) return null;

  return (
    <div className="pointer-events-none fixed top-1/2 right-5 z-20 hidden -translate-y-1/2 flex-col items-center gap-4 2xl:flex">
      {ACT_ORDER.map((step, position) => (
        <div key={step} className="flex items-center gap-3">
          <motion.span
            initial={false}
            animate={{
              opacity: position === index ? 1 : 0,
              x: position === index ? 0 : 8
            }}
            transition={{ duration: 0.4 }}
            className="text-[11px] font-medium tracking-[0.2em] text-brand-muted uppercase"
          >
            {ACT_LABELS[step]}
          </motion.span>
          <span className="relative flex h-1.5 w-1.5 items-center justify-center">
            <motion.span
              initial={false}
              animate={{
                /* Steps behind you, the step you are on, and the ones ahead.
                   The "ahead" colour was white at 22% — invisible on ivory. */
                backgroundColor:
                  position < index
                    ? "rgba(12,44,128,0.45)"
                    : position === index
                      ? "#0c2c80"
                      : "rgba(12,44,128,0.18)",
                scale: position === index ? 1.6 : 1
              }}
              transition={{ duration: 0.5 }}
              className="block h-1.5 w-1.5 rounded-full"
            />
            {position === index ? (
              <motion.span
                className="absolute h-1.5 w-1.5 rounded-full bg-brand-blue"
                animate={{ scale: [1, 3.4], opacity: [0.55, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
              />
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * In-flow shell for an act. It carries the horizontal travel, so acts can keep
 * their `position: fixed` chrome outside this element and unaffected by the
 * transform.
 */
export function ActLayout({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={actContent}
      className="relative z-10 mx-auto flex min-h-screen w-full max-w-screen-2xl flex-col px-6 md:px-12 lg:px-24"
    >
      {children}
    </motion.div>
  );
}
