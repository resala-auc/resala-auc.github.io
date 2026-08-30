import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Quote } from "lucide-react";
import { ActLayout, TopNav } from "../components/Chrome";
import { TextAreaField } from "../components/Field";
import { BackLink, PrimaryButton } from "../components/ui";
import { rise, stagger } from "../lib/motion";
import type { ApplicationQuestion, Committee, CommitteeRole } from "../data/members";


type ActQuestionsProps = {
  committee: Committee;
  role: CommitteeRole | null;
  answers: Record<string, string>;
  onChange: (patch: Record<string, string>) => void;
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
  const questions: ApplicationQuestion[] = committee.questions(role);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const blocks = useRef(new Map<string, HTMLDivElement>());

  const submit = () => {
    const found: Record<string, string> = {};
    for (const question of questions) {
      if (question.required && (answers[question.id] ?? "").trim().length < 20) {
        found[question.id] = "This one needs a real answer, at least a couple of sentences.";
      }
    }
    setErrors(found);

    const first = questions.find((question) => found[question.id]);
    if (first) {
      blocks.current.get(first.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
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
              className="mb-8 flex flex-wrap items-center gap-3 text-sm text-brand-muted"
            >
              <span className="rounded-full border border-brand-glow px-3 py-1 text-brand-blue">
                {committee.displayName}
              </span>
              <span>{role ? role.name : committee.stepTitle}</span>
              <span className="text-brand-muted">· {questions.length} questions, one page</span>
            </motion.p>

            <div className="flex flex-col gap-14">
              {questions.map((question) => (
                <div
                  key={question.id}
                  ref={(node) => {
                    if (node) blocks.current.set(question.id, node);
                    else blocks.current.delete(question.id);
                  }}
                  className="flex flex-col"
                >
                  <motion.p
                    variants={rise}
                    className="mb-4 text-sm font-medium tracking-[0.22em] text-brand-blue uppercase"
                  >
                    {question.eyebrow}
                  </motion.p>

                  <motion.div variants={rise} className="mb-6 flex gap-4">
                    <Quote className="mt-1 h-5 w-5 shrink-0 text-brand-blue/60" strokeWidth={1.5} />
                    <h2 className="font-serif text-2xl leading-[1.3] font-bold text-brand-blue md:text-3xl">
                      {question.prompt}
                    </h2>
                  </motion.div>

                  <TextAreaField
                    id={question.id}
                    label={question.required ? "Your answer" : "Your answer (optional)"}
                    helper={question.helper}
                    placeholder={question.placeholder}
                    rows={6}
                    value={answers[question.id] ?? ""}
                    error={errors[question.id]}
                    onChange={(next) => {
                      onChange({ [question.id]: next });
                      if (errors[question.id]) {
                        setErrors((current) => {
                          const rest = { ...current };
                          delete rest[question.id];
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

          </div>
        </main>
      </ActLayout>
    </motion.div>
  );
}
