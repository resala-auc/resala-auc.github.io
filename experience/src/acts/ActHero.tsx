import { motion } from "motion/react";
import { Feather } from "lucide-react";
import { ActLayout, TopNav } from "../components/Chrome";
import { APPLICATION_DEADLINE_LABEL } from "../data/members";
import { AnimatedHeading } from "../components/AnimatedHeading";
import { Eyebrow, InkDivider, PrimaryButton } from "../components/ui";
import { actTransition, rise, stagger } from "../lib/motion";

export function ActHero({ onBegin }: { onBegin: () => void }) {
  return (
    <motion.div variants={actTransition} initial="hidden" animate="show" exit="exit">
      <ActLayout>
        <TopNav act="hero" />

        <motion.main
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-1 flex-col justify-center pt-10 pb-24"
        >
          <div className="max-w-2xl">
            <Eyebrow>Small hands. Real change.</Eyebrow>

            <AnimatedHeading
              text={"Every year, someone puts the pen down.\nThis year, it is handed to you."}
              className="mb-8 font-serif text-3xl leading-[1.08] font-black tracking-tight text-brand-blue md:text-4xl lg:text-5xl"
            />

            <InkDivider icon={<Feather className="h-5 w-5" strokeWidth={1.5} />} />

            <motion.p
              variants={rise}
              className="mb-10 max-w-lg text-lg leading-relaxed font-light text-brand-ink md:text-xl"
            >
              Ten honest minutes: who you are, the work you want to carry, and when you can sit
              with us.
            </motion.p>

            {/* No guide link here: /guides is the heads cycle's role library,
                and every member committee already carries its own description
                inside the flow. */}
            <motion.div variants={rise} className="flex flex-col gap-4 sm:flex-row">
              <PrimaryButton onClick={onBegin}>Take the pen</PrimaryButton>
            </motion.div>

            <motion.p variants={rise} className="mt-10 text-sm text-brand-muted">
              Have an email (AUC or personal) and your student ID ready. Applications close{" "}
              {APPLICATION_DEADLINE_LABEL}.
            </motion.p>
          </div>
        </motion.main>
      </ActLayout>
    </motion.div>
  );
}
