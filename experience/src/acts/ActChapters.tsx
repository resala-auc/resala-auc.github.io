import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen } from "lucide-react";
import { ActLayout, TopNav } from "../components/Chrome";
import { AnimatedHeading } from "../components/AnimatedHeading";
import { BackLink, Eyebrow, InkDivider, PrimaryButton } from "../components/ui";
import { CommitteeCard } from "../components/CommitteeCard";
import { ChapterDetail } from "../components/ChapterDetail";
import { TOUCH_SPRING, actTransition, popStagger, rise, stagger } from "../lib/motion";
import { committees, type Committee } from "../data/committees";
import type { CommitteeGroup } from "../types";

type ActChaptersProps = {
  group: CommitteeGroup;
  selectedId: string | null;
  selectedRoleId: string | null;
  onSelect: (id: string) => void;
  onSelectRole: (roleId: string | null) => void;
  onContinue: () => void;
  onBack: () => void;
};

const COUNT_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];

/*
 * The heading counts the chapters actually in the lane. It used to be written
 * out by hand and went stale twice as committees were added.
 */
function laneCopy(group: CommitteeGroup, count: number) {
  const word = COUNT_WORDS[count] ?? String(count);
  const plural = count === 1 ? "chapter" : "chapters";
  const verb = count === 1 ? "builds" : "build";
  const puts = count === 1 ? "puts" : "put";

  return group === "backstage"
    ? {
        eyebrow: "Chapter two · behind the scenes",
        heading: `${word} ${plural} ${verb} the systems no one sees. Choose the one you would still show up for on a bad week.`
      }
    : {
        eyebrow: "Chapter two · direct contact",
        heading: `${word} ${plural} ${puts} you face to face with the people Resala serves. Choose the one you would still show up for on a bad week.`
      };
}

export function ActChapters({
  group,
  selectedId,
  selectedRoleId,
  onSelect,
  onSelectRole,
  onContinue,
  onBack
}: ActChaptersProps) {
  const [open, setOpen] = useState<Committee | null>(null);
  const [pickedRoleId, setPickedRoleId] = useState<string | null>(null);

  const visible = committees.filter((committee) => committee.group === group);
  const selectedCommittee = committees.find((committee) => committee.id === selectedId) ?? null;
  const needsRole = Boolean(selectedCommittee?.roles.length);
  const canContinue = Boolean(selectedId) && (!needsRole || Boolean(selectedRoleId));

  // The sheet owns scrolling while it is up; the grid behind it must hold still.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openDetail = (committee: Committee) => {
    setPickedRoleId(selectedId === committee.id ? selectedRoleId : null);
    setOpen(committee);
  };

  const { eyebrow, heading } = laneCopy(group, visible.length);

  return (
    <motion.div variants={actTransition} initial="hidden" animate="show" exit="exit">
      <ActLayout>
        <TopNav act="chapters" />

        <motion.main
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-1 flex-col justify-center pt-4 pb-20"
        >
          <Eyebrow>{eyebrow}</Eyebrow>

          <AnimatedHeading
            text={heading}
            className="mb-6 max-w-3xl font-serif text-3xl leading-[1.15] font-normal text-white md:text-4xl"
          />

          <InkDivider icon={<BookOpen className="h-5 w-5" strokeWidth={1.5} />} />

          <motion.div
            variants={popStagger}
            initial="hidden"
            animate="show"
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          >
            {visible.map((committee) => (
              <CommitteeCard
                key={committee.id}
                committee={committee}
                active={selectedId === committee.id}
                activeRoleId={selectedId === committee.id ? selectedRoleId : null}
                onSelect={onSelect}
                onSelectRole={onSelectRole}
                onOpenDetail={openDetail}
              />
            ))}
          </motion.div>

          <motion.div variants={rise} className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
            <PrimaryButton onClick={onContinue} disabled={!canContinue}>
              {!selectedId
                ? "Choose a chapter first"
                : needsRole && !selectedRoleId
                  ? "Choose your head first"
                  : "This is my chapter"}
            </PrimaryButton>
            <BackLink onClick={onBack} label="Back to the lane" />
          </motion.div>
        </motion.main>
      </ActLayout>

      <AnimatePresence>
        {open ? (
          <ChapterDetail
            committee={open}
            pickedRoleId={pickedRoleId}
            onPickRole={setPickedRoleId}
            onClose={() => setOpen(null)}
            onChoose={() => {
              onSelect(open.id);
              onSelectRole(pickedRoleId);
              setOpen(null);
            }}
          />
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
