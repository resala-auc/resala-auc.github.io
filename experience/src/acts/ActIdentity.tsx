import { useState } from "react";
import { motion } from "motion/react";
import { PenLine } from "lucide-react";
import { ActLayout, TopNav } from "../components/Chrome";
import { AnimatedHeading } from "../components/AnimatedHeading";
import { SelectField, TextField } from "../components/Field";
import { BackLink, Eyebrow, InkDivider, PrimaryButton } from "../components/ui";
import { actTransition, rise, stagger } from "../lib/motion";
import { yearLevelOptions } from "../data/committees";
import { hasErrors, validateIdentity, type Errors } from "../lib/validation";
import type { Identity } from "../types";

type ActIdentityProps = {
  identity: Identity;
  onChange: (patch: Partial<Identity>) => void;
  onContinue: () => void;
  onBack: () => void;
};

export function ActIdentity({ identity, onChange, onContinue, onBack }: ActIdentityProps) {
  const [errors, setErrors] = useState<Errors<Identity>>({});

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const found = validateIdentity(identity);
    setErrors(found);
    if (!hasErrors(found)) onContinue();
  };

  const field = <K extends Exclude<keyof Identity, "whatsappConsent">>(key: K) => ({
    value: identity[key],
    error: errors[key],
    onChange: (value: string) => {
      onChange({ [key]: value } as Partial<Identity>);
      if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
    }
  });

  return (
    <motion.div variants={actTransition} initial="hidden" animate="show" exit="exit">
      <ActLayout>
        <TopNav act="identity" />

        <motion.main
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-1 flex-col justify-center pt-4 pb-20"
        >
          <div className="w-full max-w-3xl">
            <Eyebrow>Chapter one · the signature</Eyebrow>

            <AnimatedHeading
              text="Who is holding the pen?"
              className="mb-6 font-serif text-3xl leading-[1.12] font-black tracking-tight text-brand-blue md:text-4xl"
            />

            <InkDivider icon={<PenLine className="h-5 w-5" strokeWidth={1.5} />} />

            <motion.p variants={rise} className="mb-10 max-w-lg leading-relaxed text-brand-muted">
              Only used to reach you about the interview.
            </motion.p>

            <form onSubmit={submit} noValidate className="flex flex-col gap-6">
              <div className="grid gap-6 md:grid-cols-2">
                <TextField
                  id="fullName"
                  label="Full name"
                  placeholder="As it appears on your AUC record"
                  autoComplete="name"
                  {...field("fullName")}
                />
                <TextField
                  id="aucEmail"
                  label="AUC email"
                  type="email"
                  inputMode="email"
                  placeholder="you@aucegypt.edu"
                  autoComplete="email"
                  {...field("aucEmail")}
                />
                <TextField
                  id="studentId"
                  label="Student ID"
                  inputMode="numeric"
                  placeholder="900XXXXXX"
                  {...field("studentId")}
                />
                <TextField
                  id="phone"
                  label="Phone / WhatsApp"
                  type="tel"
                  inputMode="tel"
                  placeholder="+20 1X XXX XXXX"
                  autoComplete="tel"
                  helper="We send interview reminders here."
                  {...field("phone")}
                />
                <TextField
                  id="major"
                  label="Major"
                  placeholder="Mechanical Engineering, Business, …"
                  {...field("major")}
                />
                <SelectField
                  id="yearLevel"
                  label="Standing"
                  options={yearLevelOptions}
                  {...field("yearLevel")}
                />
              </div>

              <motion.label
                variants={rise}
                htmlFor="whatsappConsent"
                className="flex items-start gap-3 text-sm leading-relaxed text-brand-muted"
              >
                <input
                  id="whatsappConsent"
                  type="checkbox"
                  checked={identity.whatsappConsent}
                  onChange={(event) => {
                    onChange({ whatsappConsent: event.target.checked });
                    if (errors.whatsappConsent) setErrors((current) => ({ ...current, whatsappConsent: undefined }));
                  }}
                  className="mt-0.5 h-5 w-5 flex-none rounded border-brand-line text-brand-blue focus:ring-brand-blue"
                />
                <span>
                  I consent to being added to a WhatsApp group with this number.
                  {errors.whatsappConsent ? (
                    <span className="mt-1 block text-brand-orange">{errors.whatsappConsent}</span>
                  ) : null}
                </span>
              </motion.label>

              <motion.div variants={rise} className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
                <PrimaryButton type="submit">Sign and continue</PrimaryButton>
                <BackLink onClick={onBack} label="Back to the opening" />
              </motion.div>
            </form>
          </div>
        </motion.main>
      </ActLayout>
    </motion.div>
  );
}
