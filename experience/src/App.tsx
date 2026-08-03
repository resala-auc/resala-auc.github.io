import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Backdrop } from "./components/Backdrop";
import { ProgressRail } from "./components/Chrome";
import { ActHero } from "./acts/ActHero";
import { ActIdentity } from "./acts/ActIdentity";
import { ActPen } from "./acts/ActPen";
import { ActPath } from "./acts/ActPath";
import { ActChapters } from "./acts/ActChapters";
import { ActBackup } from "./acts/ActBackup";
import { ActQuestions } from "./acts/ActQuestions";
import { ActSlot } from "./acts/ActSlot";
import { ActSealed } from "./acts/ActSealed";
import { findCommittee, findCommitteeRole } from "./data/committees";
import type { Committee, CommitteeRole } from "./data/committees";
import { submitApplication } from "./lib/api";
import type { Act, ApplicationPayload, CommitteeGroup, Identity, InterviewSlot } from "./types";

const STORAGE_KEY = "resala-join-draft";

const emptyIdentity: Identity = {
  fullName: "",
  aucEmail: "",
  studentId: "",
  major: "",
  yearLevel: "",
  phone: ""
};

// Keyed by question id, because each committee asks a different set.
const emptyAnswers: Record<string, string> = {};

type Draft = {
  identity: Identity;
  answers: Record<string, string>;
  pathGroup: CommitteeGroup | null;
  committeeId: string | null;
  roleId: string | null;
  secondCommitteeId: string | null;
  secondRoleId: string | null;
};

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("empty");
    const parsed = JSON.parse(raw) as Partial<Draft>;
    return {
      identity: { ...emptyIdentity, ...parsed.identity },
      answers: { ...emptyAnswers, ...parsed.answers },
      pathGroup: parsed.pathGroup ?? null,
      committeeId: parsed.committeeId ?? null,
      roleId: parsed.roleId ?? null,
      secondCommitteeId: parsed.secondCommitteeId ?? null,
      secondRoleId: parsed.secondRoleId ?? null
    };
  } catch {
    return {
      identity: emptyIdentity,
      answers: emptyAnswers,
      pathGroup: null,
      committeeId: null,
      roleId: null,
      secondCommitteeId: null,
      secondRoleId: null
    };
  }
}


/**
 * Committees ask between three and seven questions, but the Applications sheet
 * has four free-text columns. Questions carrying a `field` land in their column;
 * everything else is gathered, with its question text, into the last column so
 * no answer is lost and no existing sheet column has to move.
 */
function mapAnswersToColumns(
  committee: Committee,
  role: CommitteeRole | null,
  answers: Record<string, string>
): Pick<
  ApplicationPayload,
  "whyThisRole" | "whyChooseYourself" | "hopeToLearn" | "previousResalaExperience"
> {
  const questions = committee.questions(role);
  const columns = {
    whyThisRole: "",
    whyChooseYourself: "",
    hopeToLearn: "",
    previousResalaExperience: ""
  };
  const extra: string[] = [];

  for (const question of questions) {
    const answer = (answers[question.id] ?? "").trim();
    if (question.field) {
      columns[question.field] = answer;
    } else if (answer) {
      extra.push(`${question.prompt}\n${answer}`);
    }
  }

  if (extra.length) {
    const tail = extra.join("\n\n");
    columns.previousResalaExperience = columns.previousResalaExperience
      ? `${columns.previousResalaExperience}\n\n${tail}`
      : tail;
  }

  return columns;
}

export default function App() {
  const [draft] = useState(loadDraft);
  const [act, setAct] = useState<Act>("hero");
  const [identity, setIdentity] = useState<Identity>(draft.identity);
  const [answers, setAnswers] = useState<Record<string, string>>(draft.answers);
  const [pathGroup, setPathGroup] = useState<CommitteeGroup | null>(draft.pathGroup);
  const [committeeId, setCommitteeId] = useState<string | null>(draft.committeeId);
  const [roleId, setRoleId] = useState<string | null>(draft.roleId);
  const [secondCommitteeId, setSecondCommitteeId] = useState<string | null>(draft.secondCommitteeId);
  const [secondRoleId, setSecondRoleId] = useState<string | null>(draft.secondRoleId);
  const [slot, setSlot] = useState<InterviewSlot | null>(null);

  const committee = findCommittee(committeeId);
  const role = findCommitteeRole(committee, roleId);
  const secondCommittee = findCommittee(secondCommitteeId);
  const secondRole = findCommitteeRole(secondCommittee, secondRoleId);
  const firstName = identity.fullName.trim().split(/\s+/)[0] ?? "";

  // A refresh mid-flow should never cost the applicant their typing.
  useEffect(() => {
    if (act === "sealed") {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ identity, answers, pathGroup, committeeId, roleId, secondCommitteeId, secondRoleId })
    );
  }, [identity, answers, pathGroup, committeeId, roleId, secondCommitteeId, secondRoleId, act]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [act]);

  const submit = async () => {
    if (!committee) throw new Error("Choose a chapter before sending your application.");
    if (!secondCommittee) throw new Error("Choose a backup chapter before sending your application.");
    const now = new Date().toISOString();

    // Second preference is never asked its own written questions — it is only ever
    // evaluated live, at an interview, if the first chapter fills. The chosen head
    // (if any) rides along in the same free-text field the backend already expects.
    const secondPreference = secondRole
      ? `${secondCommittee.name} — ${secondRole.name}`
      : secondCommittee.name;

    const payload: ApplicationPayload = {
      timestamp: now,
      createdAt: now,
      fullName: identity.fullName.trim(),
      aucEmail: identity.aucEmail.trim(),
      studentId: identity.studentId.trim(),
      major: identity.major.trim(),
      yearLevel: identity.yearLevel,
      phone: identity.phone.trim(),
      // roleAppliedFor stays the bare committee name — the Supabase function looks it
      // up verbatim for task-doc and role-guide links. The chosen head goes into the
      // free-text step title instead, which nothing keys off of.
      roleAppliedFor: committee.name,
      roleStepTitle: role ? `${committee.stepTitle} · ${role.name}` : committee.stepTitle,
      roleDescription: role ? role.description : committee.shortDescription,
      secondPreference,
      ...mapAnswersToColumns(committee, role, answers),
      interviewSlot: slot?.startDateTime ?? "",
      interviewSlotId: slot?.id ?? "",
      interviewSlotLabel: slot?.label ?? ""
    };

    await submitApplication(payload);
    setAct("sealed");
  };

  return (
    <>
      <Backdrop intensity={act === "hero" || act === "pen" ? 0.15 : 1} />

      {/* Rendered once, outside the acts: the acts translate, and a transformed
          ancestor would drag this fixed rail along with it. */}
      <ProgressRail act={act} />

      <AnimatePresence mode="wait">
        {act === "hero" ? (
          <ActHero key="hero" onBegin={() => setAct("identity")} />
        ) : null}

        {act === "identity" ? (
          <ActIdentity
            key="identity"
            identity={identity}
            onChange={(patch) => setIdentity((current) => ({ ...current, ...patch }))}
            onContinue={() => setAct("pen")}
            onBack={() => setAct("hero")}
          />
        ) : null}

        {act === "pen" ? (
          <ActPen
            key="pen"
            firstName={firstName}
            onContinue={() => setAct("path")}
            onBack={() => setAct("identity")}
          />
        ) : null}

        {act === "path" ? (
          <ActPath
            key="path"
            onSelect={(group) => {
              // Only clear the choice already made if it belongs to the lane being left.
              if (committee && committee.group !== group) {
                setCommitteeId(null);
                setRoleId(null);
              }
              setPathGroup(group);
              setAct("chapters");
            }}
            onBack={() => setAct("pen")}
          />
        ) : null}

        {act === "chapters" && pathGroup ? (
          <ActChapters
            key="chapters"
            group={pathGroup}
            selectedId={committeeId}
            selectedRoleId={roleId}
            onSelect={(id) => {
              setCommitteeId(id);
              setRoleId(null);
              // A different first chapter can orphan a backup pointing at the same committee.
              if (secondCommitteeId === id) {
                setSecondCommitteeId(null);
                setSecondRoleId(null);
              }
            }}
            onSelectRole={(nextRoleId) => setRoleId(nextRoleId)}
            onContinue={() => setAct("backup")}
            onBack={() => setAct("path")}
          />
        ) : null}

        {act === "backup" ? (
          <ActBackup
            key="backup"
            excludeId={committeeId}
            selectedId={secondCommitteeId}
            selectedRoleId={secondRoleId}
            onSelect={(id) => {
              setSecondCommitteeId(id);
              setSecondRoleId(null);
            }}
            onSelectRole={(nextRoleId) => setSecondRoleId(nextRoleId)}
            onContinue={() => setAct("questions")}
            onBack={() => setAct("chapters")}
          />
        ) : null}

        {act === "questions" && committee ? (
          <ActQuestions
            key="questions"
            committee={committee}
            role={role}
            answers={answers}
            onChange={(patch) => setAnswers((current) => ({ ...current, ...patch }))}
            onContinue={() => setAct("slot")}
            onBack={() => setAct("backup")}
          />
        ) : null}

        {act === "slot" && committee ? (
          <ActSlot
            key="slot"
            committee={committee}
            role={role}
            selected={slot}
            onSelect={setSlot}
            onConfirm={submit}
            onBack={() => setAct("questions")}
          />
        ) : null}

        {act === "sealed" ? (
          <ActSealed key="sealed" firstName={firstName} committee={committee} role={role} slot={slot} />
        ) : null}
      </AnimatePresence>
    </>
  );
}
