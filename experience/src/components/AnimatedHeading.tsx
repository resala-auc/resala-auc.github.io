import { motion } from "motion/react";
import { Fragment } from "react";
import { word, wordContainer } from "../lib/motion";

type AnimatedHeadingProps = {
  /** Use "\n" to force a line break. */
  text: string;
  className?: string;
  as?: "h1" | "h2";
};

/**
 * Splits a headline into words so it arrives one word at a time, each rotating
 * up off its own baseline. Whitespace is preserved as real spaces, so the text
 * still wraps and reads normally to screen readers via aria-label.
 */
export function AnimatedHeading({ text, className = "", as = "h1" }: AnimatedHeadingProps) {
  const Tag = as === "h1" ? motion.h1 : motion.h2;
  const lines = text.split("\n");

  return (
    <Tag
      variants={wordContainer}
      aria-label={text.replace(/\n/g, " ")}
      className={className}
      style={{ perspective: 800 }}
    >
      {lines.map((line, lineIndex) => (
        <Fragment key={`${line}-${lineIndex}`}>
          {line.split(" ").map((item, wordIndex) => (
            <span
              key={`${item}-${wordIndex}`}
              aria-hidden="true"
              className="inline-block overflow-hidden align-bottom"
            >
              <motion.span variants={word} className="inline-block">
                {item}
              </motion.span>
              <span className="inline-block">&nbsp;</span>
            </span>
          ))}
          {lineIndex < lines.length - 1 ? <br aria-hidden="true" /> : null}
        </Fragment>
      ))}
    </Tag>
  );
}
