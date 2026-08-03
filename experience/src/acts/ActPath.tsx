import { motion } from "motion/react";
import { Users, Wrench } from "lucide-react";
import { ActLayout, TopNav } from "../components/Chrome";
import { AnimatedHeading } from "../components/AnimatedHeading";
import { BackLink, Eyebrow, InkDivider } from "../components/ui";
import { TOUCH_SPRING, actTransition, popIn, popStagger, stagger } from "../lib/motion";
import type { CommitteeGroup } from "../types";

type ActPathProps = {
  onSelect: (group: CommitteeGroup) => void;
  onBack: () => void;
};

const lanes: {
  group: CommitteeGroup;
  icon: typeof Wrench;
  title: string;
  subtitle: string;
  body: string;
}[] = [
  {
    group: "backstage",
    icon: Wrench,
    title: "Behind the scenes",
    subtitle: "Tech · Branding · Operations · HR · PR & Fundraising",
    body: "You build the systems, the look, the logistics, the people, the money that let everything else happen. Nobody claps for this. It is still why the rest works."
  },
  {
    group: "frontstage",
    icon: Users,
    title: "Direct contact",
    subtitle: "Resala Visits",
    body: "You are the one in the room. A family's front door, a face, a conversation that is not happening through a screen. You watch the impact happen in front of you."
  }
];

export function ActPath({ onSelect, onBack }: ActPathProps) {
  return (
    <motion.div variants={actTransition} initial="hidden" animate="show" exit="exit">
      <ActLayout>
        <TopNav act="path" />

        <motion.main
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-1 flex-col justify-center pt-4 pb-20"
        >
          <Eyebrow>Before the chapters · the lane</Eyebrow>

          <AnimatedHeading
            text="Two kinds of work build a better life. Which one is yours?"
            className="mb-6 max-w-3xl font-serif text-3xl leading-[1.15] font-normal text-white md:text-4xl"
          />

          <InkDivider icon={<Wrench className="h-5 w-5" strokeWidth={1.5} />} />

          <motion.div variants={popStagger} initial="hidden" animate="show" className="grid gap-5 md:grid-cols-2">
            {lanes.map(({ group, icon: Icon, title, subtitle, body }) => (
              <motion.button
                key={group}
                type="button"
                variants={popIn}
                whileHover={{ y: -8, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={TOUCH_SPRING}
                onClick={() => onSelect(group)}
                className="group flex flex-col items-start gap-4 rounded-3xl border border-white/12 bg-white/[0.04] p-8 text-left backdrop-blur-sm transition-colors duration-300 hover:border-brand-orange hover:bg-brand-orange/10"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-brand-orange/40 text-brand-orange transition-colors duration-300 group-hover:border-brand-orange group-hover:bg-brand-orange/10">
                  <Icon className="h-6 w-6" strokeWidth={1.5} />
                </span>
                <span className="font-serif text-2xl text-white">{title}</span>
                <span className="text-xs font-medium tracking-[0.18em] text-brand-orange uppercase">
                  {subtitle}
                </span>
                <span className="text-sm leading-relaxed text-white/65">{body}</span>
              </motion.button>
            ))}
          </motion.div>

          <div className="mt-10">
            <BackLink onClick={onBack} label="Back to the handover" />
          </div>
        </motion.main>
      </ActLayout>
    </motion.div>
  );
}
