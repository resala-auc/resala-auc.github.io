import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { CHAPTER_EASE, TOUCH_SPRING, rise } from "../lib/motion";

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <motion.p
      variants={rise}
      /* Sunshine Yellow on ivory is ~1.7:1 — it was legible on black and is
         not here. Eyebrows carry real words, so they take Royal Blue, and the
         yellow moves underneath them as the campaign's highlighter stroke. */
      className="mb-6 text-sm font-semibold tracking-[0.2em] text-brand-blue uppercase sm:text-base sm:tracking-[0.25em]"
    >
      <Highlighted>{children}</Highlighted>
    </motion.p>
  );
}

/**
 * The hand-drawn yellow marker stroke from the recruitment campaign posters:
 * it sits *behind* the baseline, never over the letters, so it reads as
 * emphasis without touching the text's contrast. Purely decorative — the
 * words carry their own colour.
 */
export function Highlighted({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block">
      <motion.span
        aria-hidden
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.7, ease: CHAPTER_EASE, delay: 0.5 }}
        className="absolute inset-x-[-0.15em] bottom-[0.05em] -z-10 h-[0.42em] origin-left rounded-full bg-brand-orange/55"
      />
      <span className="relative">{children}</span>
    </span>
  );
}

/** A mark, then a line that draws itself out into nothing. */
export function InkDivider({ icon }: { icon: ReactNode }) {
  return (
    <motion.div variants={rise} className="mb-8 flex items-center gap-4 text-brand-blue">
      <motion.span
        animate={{ rotate: [0, -7, 0, 5, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="inline-flex"
      >
        {icon}
      </motion.span>
      <motion.span
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.4, ease: CHAPTER_EASE, delay: 0.4 }}
        className="h-px w-32 origin-left bg-brand-glow"
      />
    </motion.div>
  );
}

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  showArrow?: boolean;
};

export function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled,
  showArrow = true
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.04, y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={TOUCH_SPRING}
      /*
       * Royal Blue rather than Sunshine Yellow: this is the one control the
       * whole page points at, and blue-on-white holds 12.4:1 where yellow on
       * ivory relies entirely on its dark label to be seen at all.
       *
       * The disabled state must not simply fade: this button's label carries the
       * instruction ("Choose a chapter first"), so dimming the whole thing to 45%
       * dropped that text to ~1.6:1 and made the guidance unreadable. It swaps to
       * a hairline-grey surface with muted text instead, which keeps the label
       * legible while still reading clearly as unavailable.
       */
      className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-brand-blue px-5 py-4 font-semibold whitespace-nowrap text-white shadow-[0_10px_30px_-14px_rgba(12,44,128,0.65)] transition-colors duration-300 hover:bg-[#123ba6] disabled:cursor-not-allowed disabled:bg-brand-line disabled:text-brand-muted disabled:shadow-none sm:w-auto sm:px-8"
    >
      {/* Light sweeps across the face on hover. */}
      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
        <span className="absolute inset-y-0 -left-1/3 w-1/3 bg-white/25 opacity-0 group-hover:opacity-100 group-hover:[animation:sheen_0.9s_ease-out]" />
      </span>
      <span className="relative">{children}</span>
      {showArrow ? (
        <ArrowRight className="relative h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
      ) : null}
    </motion.button>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled,
  showArrow = true,
  href
}: ButtonProps & { href?: string }) {
  const className =
    "group flex w-full items-center justify-center gap-3 rounded-full border border-brand-blue/35 bg-white/70 px-5 py-4 font-semibold whitespace-nowrap text-brand-blue transition-colors duration-300 hover:border-brand-blue hover:bg-brand-pale disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto sm:px-8";
  const arrow = showArrow ? (
    <ArrowRight className="h-5 w-5 opacity-70 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
  ) : null;

  if (href) {
    return (
      <motion.a
        href={href}
        whileHover={{ scale: 1.03, y: -2 }}
        whileTap={{ scale: 0.97 }}
        transition={TOUCH_SPRING}
        className={className}
      >
        {children}
        {arrow}
      </motion.a>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.03, y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={TOUCH_SPRING}
      className={className}
    >
      {children}
      {arrow}
    </motion.button>
  );
}

export function BackLink({ onClick, label = "Back" }: { onClick: () => void; label?: string }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ x: -4 }}
      transition={TOUCH_SPRING}
      /* Bare text sat at a 20px-tall hit area — under the 44px touch minimum.
         The negative margin keeps the surrounding layout spacing unchanged. */
      className="-my-3 inline-flex min-h-11 items-center py-3 text-sm font-semibold text-brand-muted transition-colors duration-300 hover:text-brand-blue"
    >
      ← {label}
    </motion.button>
  );
}
