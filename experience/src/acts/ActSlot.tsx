import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, ClipboardList, Loader2 } from "lucide-react";
import { ActLayout, TopNav } from "../components/Chrome";
import { AnimatedHeading } from "../components/AnimatedHeading";
import { BackLink, Eyebrow, InkDivider, PrimaryButton } from "../components/ui";
import { CHAPTER_EASE, TOUCH_SPRING, actTransition, popIn, popStagger, rise, stagger } from "../lib/motion";
import { ContactBlock } from "../components/ContactBlock";
import { fetchInterviewSlots } from "../lib/api";
import type { Committee, CommitteeRole } from "../data/committees";
import type { InterviewSlot } from "../types";

type ActSlotProps = {
  committee: Committee;
  role: CommitteeRole | null;
  selected: InterviewSlot | null;
  onSelect: (slot: InterviewSlot | null) => void;
  onConfirm: () => Promise<void>;
  onBack: () => void;
};

function formatDay(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function ActSlot({ committee, role, selected, onSelect, onConfirm, onBack }: ActSlotProps) {
  const task = committee.interviewTask(role);
  const [slots, setSlots] = useState<InterviewSlot[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeDate, setActiveDate] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    /*
     * Availability is per committee — each one interviews on its own days, for
     * its own length. The committee's published schedule is the source of
     * truth; the live endpoint is only consulted to find out which of those
     * slots are already taken, and it is not fatal if it is unreachable.
     */
    const published = committee.interviewSlots();

    // Paint the published schedule immediately rather than blocking the whole
    // booking step on a network round-trip.
    setSlots(published);
    setActiveDate(published[0]?.date ?? null);

    fetchInterviewSlots(committee.name)
      .then((booked) => {
        if (cancelled || !booked.length) return;
        const takenById = new Map(booked.map((slot) => [slot.id, slot]));
        setSlots(
          published.map((slot) => {
            const live = takenById.get(slot.id);
            if (!live) return slot;
            const reserved = live.reservedCount ?? 0;
            const remaining = Math.max(0, slot.capacity - reserved);
            return { ...slot, reservedCount: reserved, remaining, full: remaining <= 0 };
          })
        );
      })
      // A failure here only means we cannot show live counts; the schedule stands.
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [committee]);

  const dates = useMemo(() => {
    if (!slots) return [];
    return [...new Set(slots.map((slot) => slot.date))].sort();
  }, [slots]);

  const daySlots = useMemo(
    () => (slots ?? []).filter((slot) => slot.date === activeDate),
    [slots, activeDate]
  );

  const confirm = async () => {
    if (!selected) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onConfirm();
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error ? error.message : "Something went wrong. Please try again."
      );
      setSubmitting(false);
    }
  };

  return (
    <motion.div variants={actTransition} initial="hidden" animate="show" exit="exit">
      <ActLayout>
        <TopNav act="slot" />

        <motion.main
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-1 flex-col justify-center pt-4 pb-20"
        >
          <div className="w-full max-w-3xl">
            <Eyebrow>Chapter three · the appointment</Eyebrow>

            <AnimatedHeading
              text="Pick a time you are certain you can keep."
              className="mb-6 font-serif text-3xl leading-[1.12] font-black tracking-tight text-brand-blue md:text-4xl"
            />

            <InkDivider icon={<CalendarClock className="h-5 w-5" strokeWidth={1.5} />} />

            <motion.p variants={rise} className="mb-6 max-w-lg leading-relaxed text-brand-muted">
              {committee.displayName} interviews on its own days. Each one runs{" "}
              {committee.interviewDurationMinutes} minutes.
            </motion.p>

            {task.required ? (
              <motion.div
                variants={rise}
                className="mb-10 rounded-2xl border border-brand-glow bg-brand-pale p-5"
              >
                <p className="mb-2 flex items-center gap-2 text-[11px] font-medium tracking-[0.22em] text-brand-blue uppercase">
                  <ClipboardList className="h-4 w-4" strokeWidth={1.8} />
                  {task.atInterview
                    ? "At your interview"
                    : task.dueBeforeInterviewMinutes
                      ? "Submit before your interview"
                      : "Bring this with you"}{" "}
                  · {task.title ?? task.summary}
                </p>
                <p className="text-sm leading-relaxed text-brand-ink">{task.detail}</p>
                {task.dueBeforeInterviewMinutes ? (
                  <p className="mt-3 text-sm leading-relaxed text-brand-ink">
                    Your task sheet is emailed to you as soon as you book, and you hand your work in
                    at{" "}
                    <a
                      className="font-medium text-brand-blue underline underline-offset-2"
                      href={task.submissionUrl}
                      target="_blank"
                      rel="noopener"
                    >
                      the submission page
                    </a>{" "}
                    at least{" "}
                    {task.dueBeforeInterviewMinutes === 60
                      ? "an hour"
                      : `${task.dueBeforeInterviewMinutes} minutes`}{" "}
                    before your interview.
                  </p>
                ) : null}
                {task.scenario ? (
                  <p className="mt-3 text-sm leading-relaxed text-brand-muted">{task.scenario}</p>
                ) : null}
                {task.points?.length ? (
                  <ul className="mt-3 flex flex-col gap-1.5">
                    {task.points.map((point) => (
                      <li key={point} className="flex gap-2 text-sm leading-relaxed text-brand-ink">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-blue" />
                        {point}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </motion.div>
            ) : (
              <div className="mb-10" />
            )}

            {slots === null ? (
              <motion.div variants={rise} className="flex items-center gap-3 text-brand-muted">
                <Loader2 className="h-5 w-5 animate-spin" />
                Opening the interview book…
              </motion.div>
            ) : loadError ? (
              <motion.div
                variants={rise}
                className="rounded-2xl border border-brand-glow bg-brand-pale p-6 text-sm leading-relaxed text-brand-ink"
              >
                <p className="mb-2 font-medium text-brand-blue">
                  The interview book would not open.
                </p>
                <p>{loadError}</p>
                <p className="mt-3 text-brand-muted">
                  You can still send your application — we will contact you to schedule the
                  interview by hand.
                </p>
              </motion.div>
            ) : dates.length === 0 ? (
              <motion.p variants={rise} className="text-brand-muted">
                No interview slots are open right now. Send your application anyway — the team will
                reach out with a time.
              </motion.p>
            ) : (
              <>
                <motion.div variants={rise} className="mb-6 flex flex-wrap gap-2">
                  {dates.map((date) => {
                    const active = date === activeDate;
                    return (
                      <motion.button
                        key={date}
                        type="button"
                        onClick={() => setActiveDate(date)}
                        whileHover={{ y: -3 }}
                        whileTap={{ scale: 0.94 }}
                        transition={TOUCH_SPRING}
                        className={`relative rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-300 ${
                          active
                            ? "border-transparent text-brand-ink"
                            : "border-brand-line text-brand-muted hover:border-brand-blue/45 hover:text-brand-ink"
                        }`}
                      >
                        {/* One highlight pill that slides between dates. */}
                        {active ? (
                          <motion.span
                            layoutId="active-date"
                            transition={{ type: "spring", stiffness: 380, damping: 32 }}
                            className="absolute inset-0 rounded-full border border-brand-blue bg-brand-pale"
                          />
                        ) : null}
                        <span className="relative">{formatDay(date)}</span>
                      </motion.button>
                    );
                  })}
                </motion.div>

                <motion.div
                  key={activeDate}
                  variants={popStagger}
                  initial="hidden"
                  animate="show"
                  className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                >
                  <AnimatePresence mode="popLayout">
                    {daySlots.map((slot) => {
                      const active = selected?.id === slot.id;
                      return (
                        <motion.button
                          key={slot.id}
                          type="button"
                          layout
                          variants={popIn}
                          exit={{ opacity: 0, y: -8 }}
                          whileHover={slot.full ? undefined : { y: -5, scale: 1.02 }}
                          whileTap={slot.full ? undefined : { scale: 0.97 }}
                          disabled={slot.full}
                          onClick={() => onSelect(active ? null : slot)}
                          className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-colors duration-300 ${
                            slot.full
                              ? "cursor-not-allowed border-brand-line bg-brand-night text-brand-muted line-through"
                              : active
                                ? "border-brand-blue bg-brand-pale text-brand-ink"
                                : "border-brand-line bg-white text-brand-ink hover:border-brand-blue/45 hover:bg-brand-pale"
                          }`}
                        >
                          <span className="font-serif text-lg">
                            {slot.startTime} – {slot.endTime}
                          </span>
                          <span className="text-xs text-brand-muted">
                            {slot.full
                              ? "Fully booked"
                              : `${slot.remaining} place${slot.remaining === 1 ? "" : "s"} left`}
                          </span>
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              </>
            )}

            {submitError ? (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="mt-6 text-sm font-medium text-brand-blue"
              >
                {submitError}
              </motion.p>
            ) : null}

            <motion.div variants={rise} className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
              {/* Sending is only allowed once the book has loaded — either with a
                  chosen slot, or with none on offer at all. */}
              <PrimaryButton
                onClick={confirm}
                disabled={submitting || slots === null || (!selected && dates.length > 0)}
              >
                {submitting ? "Sealing your application…" : "Sign and send"}
              </PrimaryButton>
              <BackLink onClick={onBack} label="Back to the questions" />
            </motion.div>

            <ContactBlock committee={committee} className="mt-10" />

            {selected ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-5 text-sm text-brand-muted"
              >
                You are booking {formatDay(selected.date)}, {selected.startTime} – {selected.endTime}.
              </motion.p>
            ) : null}
          </div>
        </motion.main>
      </ActLayout>
    </motion.div>
  );
}
