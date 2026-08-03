import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PenTool, Volume2, VolumeX } from "lucide-react";
import { CHAPTER_EASE, actTransition } from "../lib/motion";
import { BackLink, PrimaryButton } from "../components/ui";

/**
 * Drop the recorded handover message at experience/public/media/chapter-intro.mp3.
 * Until that file exists the act still runs — the written lines carry it, and the
 * audio control simply hides itself.
 */
const AUDIO_SRC = `${import.meta.env.BASE_URL}media/chapter-intro.mp3`;

/** The stroke the pen writes. Also the motion path the pen nib follows. */
const SIGNATURE =
  "M20,120 C70,40 110,180 160,110 C200,55 235,150 285,105 C330,65 360,140 415,100 C455,72 480,120 520,96";

/**
 * Seconds at which each written line appears. Tuned to the actual 15.57s
 * recording (experience/public/media/chapter-intro.mp3):
 *
 *   0.0s   room tone, pen on paper
 *   1.1s   "«أنا مالي.» That's the sentence that stops everything."
 *   4.8s   "You already didn't say it. You're here, typing your name."
 *   9.1s   "You can't fix a life. You can build the first step of one."
 *  12.9s   "ومحدش بيبني خطوة لوحده."
 *  15.6s   end
 *
 * Screen line 1 (name) lands under beat 1. Screen line 2 lands in the gap
 * after beat 3 finishes and before the spoken Arabic line starts, so the
 * Arabic tagline is already resting on screen when the president says his
 * own Arabic line — they land together without repeating each other.
 */
const REVEAL_BEATS = [0.8, 11.0];

/** The pen finishes its stroke just before the recording ends. */
const WRITE_DURATION = 14.4;

export function ActPen({
  firstName,
  onContinue,
  onBack
}: {
  firstName: string;
  onContinue: () => void;
  onBack: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioAvailable, setAudioAvailable] = useState(true);
  const [muted, setMuted] = useState(false);
  const [revealed, setRevealed] = useState(0);

  const lines = [`${firstName || "You"}.`, "Pick the step you can carry."];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // The applicant clicked to get here, so autoplay is normally permitted.
    audio.play().catch(() => setAudioAvailable(false));
  }, []);

  useEffect(() => {
    const timers = REVEAL_BEATS.map((beat, index) =>
      window.setTimeout(() => setRevealed((current) => Math.max(current, index + 1)), beat * 1000)
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finished = revealed >= lines.length;

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  };

  return (
    <motion.div
      variants={actTransition}
      initial="hidden"
      animate="show"
      exit="exit"
      className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center"
    >
      {/* The room dims for the handover. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.6 }}
        className="pointer-events-none fixed inset-0 -z-10 bg-brand-night/70"
      />

      <audio
        ref={audioRef}
        src={AUDIO_SRC}
        preload="auto"
        onError={() => setAudioAvailable(false)}
      />

      <div className="relative w-full max-w-2xl">
        <svg viewBox="0 0 540 200" className="mx-auto w-full max-w-lg overflow-visible">
          <motion.path
            d={SIGNATURE}
            fill="none"
            stroke="#eac262"
            strokeWidth={3}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0.9 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: WRITE_DURATION, ease: "easeInOut", delay: 0.6 }}
          />
          <motion.path
            d={SIGNATURE}
            fill="none"
            stroke="#eac262"
            strokeWidth={10}
            strokeLinecap="round"
            className="blur-md"
            initial={{ pathLength: 0, opacity: 0.35 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: WRITE_DURATION, ease: "easeInOut", delay: 0.6 }}
          />
        </svg>

        {/* The nib rides the same curve it is drawing. */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            offsetPath: `path("${SIGNATURE}")`,
            offsetRotate: "0deg",
            width: "100%"
          }}
          initial={{ offsetDistance: "0%", opacity: 0 }}
          animate={{ offsetDistance: "100%", opacity: [0, 1, 1, 0] }}
          transition={{ duration: WRITE_DURATION, ease: "easeInOut", delay: 0.6 }}
        >
          <PenTool className="h-8 w-8 -translate-y-6 text-brand-orange drop-shadow-[0_0_18px_rgba(234,194,98,0.8)]" />
        </motion.div>
      </div>

      <div className="mt-10 flex min-h-[13rem] flex-col items-center justify-start gap-4">
        {lines.map((line, index) => (
          <AnimatePresence key={line}>
            {revealed > index ? (
              <motion.p
                initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
                animate={{ opacity: index === 0 ? 1 : 0.85, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 1, ease: CHAPTER_EASE }}
                className={
                  index === 0
                    ? "font-serif text-3xl text-white md:text-4xl"
                    : "max-w-xl text-lg leading-relaxed font-light text-white/75"
                }
              >
                {line}
              </motion.p>
            ) : null}
          </AnimatePresence>
        ))}

        {/* The president's closing words, printed the way they are spoken. */}
        <AnimatePresence>
          {finished ? (
            <motion.p
              lang="ar"
              dir="rtl"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: CHAPTER_EASE, delay: 0.35 }}
              className="font-arabic mt-2 text-2xl text-brand-orange md:text-3xl"
            >
              ابني أول خطوة في حياتهم.
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {finished ? (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: CHAPTER_EASE }}
            /* The button is w-full on phones and whitespace-nowrap, so a
               shrink-to-fit wrapper let it overflow by a few pixels. */
            className="mt-12 w-full max-w-xs"
          >
            <PrimaryButton onClick={onContinue}>Choose your chapter</PrimaryButton>
          </motion.div>
        ) : (
          <motion.button
            type="button"
            exit={{ opacity: 0 }}
            onClick={() => setRevealed(lines.length)}
            className="mt-12 inline-flex min-h-11 items-center py-3 text-sm font-medium text-white/40 transition-colors hover:text-white"
          >
            Skip the handover →
          </motion.button>
        )}
      </AnimatePresence>

      <div className="mt-6">
        <BackLink onClick={onBack} label="Back to your details" />
      </div>

      {audioAvailable ? (
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Unmute the recorded message" : "Mute the recorded message"}
          className="fixed right-6 bottom-6 flex h-12 w-12 items-center justify-center rounded-full border border-white/25 text-white/70 transition-colors hover:border-white hover:text-white"
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      ) : null}
    </motion.div>
  );
}
