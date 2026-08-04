import { motion } from "motion/react";
import { Feather } from "lucide-react";
import { ActLayout, TopNav } from "../components/Chrome";
import { AnimatedHeading } from "../components/AnimatedHeading";
import { Eyebrow, GhostButton, InkDivider, PrimaryButton } from "../components/ui";
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
              className="mb-8 font-serif text-3xl leading-[1.1] font-normal text-white md:text-4xl lg:text-5xl"
            />

            <InkDivider icon={<Feather className="h-5 w-5" strokeWidth={1.5} />} />

            <motion.p
              variants={rise}
              className="mb-10 max-w-lg text-lg leading-relaxed font-light text-white/80 md:text-xl"
            >
              Ten honest minutes: who you are, the work you want to carry, and when you can sit
              with us.
            </motion.p>

            <motion.div variants={rise} className="flex flex-col gap-4 sm:flex-row">
              <PrimaryButton onClick={onBegin}>Take the pen</PrimaryButton>
              <GhostButton href="../guides/">Read the chapter guides</GhostButton>
            </motion.div>

            <motion.p variants={rise} className="mt-10 text-sm text-white/40">
              Have your AUC email and student ID ready.
            </motion.p>
          </div>
        </motion.main>
      </ActLayout>
    </motion.div>
  );
}
