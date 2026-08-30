import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Shuffle } from "lucide-react";
import { ActLayout, TopNav } from "../components/Chrome";
import { AnimatedHeading } from "../components/AnimatedHeading";
import { BackLink, Eyebrow, InkDivider, PrimaryButton } from "../components/ui";
import { CommitteeCard } from "../components/CommitteeCard";
import { ChapterDetail } from "../components/ChapterDetail";
import { actTransition, popStagger, rise, stagger } from "../lib/motion";
import { committees, type Committee } from "../data/members";

type ActBackupProps = {
  excludeId: string | null;
  selectedId: string | null;
  selectedRoleId: string | null;
  onSelect: (id: string) => void;
  onSelectRole: (roleId: string | null) => void;
  onContinue: () => void;
  onBack: () => void;
};

export function ActBackup({
  excludeId,
  selectedId,
  selectedRoleId,
  onSelect,
  onSelectRole,
  onContinue,
  onBack
}: ActBackupProps) {
  const [open, setOpen] = useState<Committee | null>(null);
  const [pickedRoleId, setPickedRoleId] = useState<string | null>(null);

  const options = committees.filter((committee) => committee.id !== excludeId);
  const selectedCommittee = committees.find((committee) => committee.id === selectedId) ?? null;
  const needsRole = Boolean(selectedCommittee?.roles.length);
  const canContinue = Boolean(selectedId) && (!needsRole || Boolean(selectedRoleId));

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

  return (
    <motion.div variants={actTransition} initial="hidden" animate="show" exit="exit">
      <ActLayout>
        <TopNav act="backup" />

        <motion.main
          variants={stagger}
          initial="hidden"
          animate="show"
          className="flex flex-1 flex-col justify-center pt-4 pb-20"
        >
          <Eyebrow>Chapter two and a half · your backup</Eyebrow>

          <AnimatedHeading
            text="If your first chapter fills, which one would you still say yes to?"
            className="mb-4 max-w-3xl font-serif text-3xl leading-[1.12] font-black tracking-tight text-brand-blue md:text-4xl"
          />

          <motion.p variants={rise} className="mb-8 max-w-xl text-sm leading-relaxed text-brand-muted">
            No written questions here — this only matters if your first chapter fills.
          </motion.p>

          <InkDivider icon={<Shuffle className="h-5 w-5" strokeWidth={1.5} />} />

          <motion.div
            variants={popStagger}
            initial="hidden"
            animate="show"
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          >
            {options.map((committee) => (
              <CommitteeCard
                key={committee.id}
                committee={committee}
                active={selectedId === committee.id}
                activeRoleId={selectedId === committee.id ? selectedRoleId : null}
                onSelect={onSelect}
                onSelectRole={onSelectRole}
                onOpenDetail={openDetail}
                compact
              />
            ))}
          </motion.div>

          <motion.div variants={rise} className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
            <PrimaryButton onClick={onContinue} disabled={!canContinue}>
              {!selectedId
                ? "Choose a backup chapter"
                : needsRole && !selectedRoleId
                  ? "Choose your backup head"
                  : "This is my backup"}
            </PrimaryButton>
            <BackLink onClick={onBack} label="Back to your first chapter" />
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
