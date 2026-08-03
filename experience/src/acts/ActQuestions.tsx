import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Quote } from "lucide-react";
import { ActLayout, TopNav } from "../components/Chrome";
import { TextAreaField } from "../components/Field";
import { BackLink, PrimaryButton } from "../components/ui";
import { CHAPTER_EASE, rise, stagger } from "../lib/motion";
import type { Committee, CommitteeRole } from "../data/committees";
import type { Answers } from "../types";

type Question = {
  key: keyof Answers;
  eyebrow: string;
  prompt: string;
  helper?: string;
  placeholder: string;
  required: boolean;
};

function buildQuestions(committee: Committee, role: CommitteeRole | null): Question[] {
  const real = committee.buildQuestions(role);
  return [
    {
      key: "whyThisRole",
      ...real.whyThisRole
    },
    {
      key: "whyChooseYourself",
      ...real.whyChooseYourself
    },
    {
      key: "hopeToLearn",
      eyebrow: "What you want back",
      prompt: "What do you hope to walk out of this year knowing how to do?",
      helper: "Optional, but it tells us how to build the year around you.",
      placeholder: "The skill, the confidence, the thing you cannot do yet…",
      required: false
    },
    {
      key: "previousResalaExperience",
      eyebrow: "Your history with us",
      prompt: "Have you worked with Resala before? Tell us what you did.",
      helper: "Optional. Never having worked with Resala costs you nothing here.",
      placeholder: "Visits, Children's Day, campaigns, or nothing yet — all fine.",
      required: false
    }
  ];
}

type ActQuestionsProps = {
  committee: Committee;
  role: CommitteeRole | null;
  answers: Answers;
  onChange: (patch: Partial<Answers>) => void;
  onContinue: () => void;
  onBack: () => void;
};

export function ActQuestions({
  committee,
  role,
  answers,
  onChange,
  onContinue,
  onBack
}: ActQuestionsProps) {
  const questions = buildQuestions(committee, role);
  const alsoAsked = committee.alsoAsked(role);
  const [errors, setErrors] = useState<Partial<Record<keyof Answers, string>>>({});
  const blocks = useRef(new Map<string, HTMLDivElement>());

  const submit = () => {
    const found: Partial<Record<keyof Answers, string>> = {};
    for (const question of questions) {
      if (question.required && answers[question.key].trim().length < 20) {
        found[question.key] = "This one needs a real answer, at least a couple of sentences.";
      }
    }
    setErrors(found);

    const first = questions.find((question) => found[question.key]);
    if (first) {
      blocks.current.get(first.key)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    onContinue();
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" exit="exit">
      <ActLayout>
        <TopNav act="questions" />

        <main className="flex flex-1 flex-col pt-4 pb-20">
          <div className="w-full max-w-3xl">
            <motion.p
              variants={rise}
              className="mb-8 flex flex-wrap items-center gap-3 text-sm text-white/45"
            >
              <span className="rounded-full border border-brand-orange/40 px-3 py-1 text-brand-orange">
                {committee.displayName}
              </span>
              <span>{role ? role.name : committee.stepTitle}</span>
              <span className="text-white/25">· {questions.length} questions, one page</span>
            </motion.p>

            <div className="flex flex-col gap-14">
              {questions.map((question) => (
                <div
                  key={question.key}
                  ref={(node) => {
                    if (node) blocks.current.set(question.key, node);
                    else blocks.current.delete(question.key);
                  }}
                  className="flex flex-col"
                >
                  <motion.p
                    variants={rise}
                    className="mb-4 text-sm font-medium tracking-[0.22em] text-brand-orange uppercase"
                  >
                    {question.eyebrow}
                  </motion.p>

                  <motion.div variants={rise} className="mb-6 flex gap-4">
                    <Quote className="mt-1 h-5 w-5 shrink-0 text-brand-orange/50" strokeWidth={1.5} />
                    <h2 className="font-serif text-2xl leading-[1.3] font-normal text-white md:text-3xl">
                      {question.prompt}
                    </h2>
                  </motion.div>

                  <TextAreaField
                    id={question.key}
                    label={question.required ? "Your answer" : "Your answer (optional)"}
                    helper={question.helper}
                    placeholder={question.placeholder}
                    rows={6}
                    value={answers[question.key]}
                    error={errors[question.key]}
                    onChange={(next) => {
                      onChange({ [question.key]: next } as Partial<Answers>);
                      if (errors[question.key]) {
                        setErrors((current) => {
                          const rest = { ...current };
                          delete rest[question.key];
                          return rest;
                        });
                      }
                    }}
                  />
                </div>
              ))}
            </div>

            <motion.div
              variants={rise}
              className="mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6"
            >
              <PrimaryButton onClick={submit}>Choose your interview time</PrimaryButton>
              <BackLink onClick={onBack} label="Back to the chapters" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5, ease: CHAPTER_EASE }}
              className="mt-12 max-w-xl border-l-2 border-white/10 pl-5 text-sm leading-relaxed text-white/40"
            >
              {committee.interviewTask.required ? (
                <p className="mb-4 rounded-xl border border-brand-orange/35 bg-brand-orange/[0.08] px-4 py-3 text-white/85">
                  <span className="font-medium text-brand-orange">
                    {committee.displayName} asks for a task before the interview —{" "}
                    {committee.interviewTask.summary}.
                  </span>{" "}
                  {committee.interviewTask.detail}
                </p>
              ) : null}
              <p>
                <span className="text-white/60">Prepare for the interview:</span> {committee.taskPrompt}
              </p>
              {alsoAsked.length ? (
                <div className="mt-4">
                  <p className="text-white/60">Also come ready to answer, live, not on this form:</p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {alsoAsked.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/30" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </motion.div>
          </div>
        </main>
      </ActLayout>
    </motion.div>
  );
}
