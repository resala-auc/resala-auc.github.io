import type { Variants } from "motion/react";

/** Elegant, snappy-yet-smooth arrival curve used across the whole experience. */
export const CHAPTER_EASE = [0.16, 1, 0.3, 1] as const;

/** Physical feel for anything the applicant touches directly. */
export const TOUCH_SPRING = { type: "spring", stiffness: 460, damping: 30, mass: 0.6 } as const;

export const stagger: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.1 }
  },
  exit: {
    transition: { staggerChildren: 0.02, staggerDirection: -1 }
  }
};

export const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: CHAPTER_EASE }
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.22, ease: CHAPTER_EASE }
  }
};

/**
 * Act wrapper: opacity only, never transform or filter. Either would turn the
 * wrapper into the containing block for its `position: fixed` descendants (the
 * audio control, the chapter sheet), anchoring them to the act's scroll height
 * instead of the viewport. The travel lives in `actContent` below, which wraps
 * only in-flow content.
 */
export const actTransition: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.32, ease: CHAPTER_EASE } },
  exit: { opacity: 0, transition: { duration: 0.22, ease: CHAPTER_EASE } }
};

/** The page itself travels: the outgoing act leaves left, the new one enters right. */
export const actContent: Variants = {
  hidden: { x: 34, scale: 0.99 },
  show: {
    x: 0,
    scale: 1,
    transition: { duration: 0.5, ease: CHAPTER_EASE }
  },
  exit: {
    x: -26,
    scale: 0.995,
    transition: { duration: 0.26, ease: CHAPTER_EASE }
  }
};

/** Headlines arrive one word at a time — the "written, not printed" feel. */
export const wordContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.028, delayChildren: 0.06 }
  },
  exit: { transition: { staggerChildren: 0.01, staggerDirection: -1 } }
};

export const word: Variants = {
  hidden: { opacity: 0, y: "0.28em" },
  show: {
    opacity: 1,
    y: "0em",
    transition: { duration: 0.45, ease: CHAPTER_EASE }
  },
  exit: { opacity: 0, y: "-0.16em", transition: { duration: 0.16 } }
};

/** Cards and slots that pop in as a group. */
export const popIn: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.38, ease: CHAPTER_EASE }
  }
};

export const popStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035, delayChildren: 0.06 } }
};
