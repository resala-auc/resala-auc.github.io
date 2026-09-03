import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Backdrop } from "./components/Backdrop";
import { ProgressRail } from "./components/Chrome";
import { ActHero } from "./acts/ActHero";
import { ActIdentity } from "./acts/ActIdentity";
import { ActPen } from "./acts/ActPen";
import { ActPath } from "./acts/ActPath";
import { ActChapters } from "./acts/ActChapters";
import { ActQuestions } from "./acts/ActQuestions";
import { ActSlot } from "./acts/ActSlot";
import { ActSealed } from "./acts/ActSealed";
import { APPLICATION_DEADLINE_LABEL, applicationsClosed, findCommittee, findCommitteeRole } from "./data/members";
import type { Committee, CommitteeRole } from "./data/members";
import { submitApplication } from "./lib/api";
import type { Act, ApplicationPayload, CommitteeGroup, Identity, InterviewSlot } from "./types";

const STORAGE_KEY = "resala-join-draft";

const emptyIdentity: Identity = {
  fullName: "",
  aucEmail: "",
  studentId: "",
  major: "",
  yearLevel: "",
  phone: "",
  whatsappConsent: false
};

// Keyed by question id, because each committee asks a different set.
const emptyAnswers: Record<string, string> = {};

type Draft = {
  identity: Identity;
  answers: Record<string, string>;
  pathGroup: CommitteeGroup | null;
  committeeId: string | null;
  roleId: string | null;
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
      roleId: parsed.roleId ?? null
    };
  } catch {
    return {
      identity: emptyIdentity,
      answers: emptyAnswers,
      pathGroup: null,
      committeeId: null,
      roleId: null
    };
  }
}


/**
 * Committees ask between three and seven questions, but the Applications sheet
 * has four free-text columns. Questions carrying a `field` land in their column;
 * everything else is gathered, with its question text, into the last column so
 * no answer is lost and no existing sheet column has to move.
 */
/**
 * Every question this applicant was asked, with its prompt, in order. The four
 * fixed columns below stay for the old sheet; this is what the heads tab and
 * the committee dashboards read, because it survives committees asking
 * different questions from each other.
 */
function collectAnswers(
  committee: Committee,
  role: CommitteeRole | null,
  answers: Record<string, string>
): Array<{ id: string; prompt: string; answer: string }> {
  return committee.questions(role).map((question) => ({
    id: question.id,
    prompt: question.prompt,
    answer: (answers[question.id] ?? "").trim()
  }));
}

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
  const [slot, setSlot] = useState<InterviewSlot | null>(null);

  const committee = findCommittee(committeeId);
  const role = findCommitteeRole(committee, roleId);
  const firstName = identity.fullName.trim().split(/\s+/)[0] ?? "";

  // A refresh mid-flow should never cost the applicant their typing.
  useEffect(() => {
    if (act === "sealed") {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ identity, answers, pathGroup, committeeId, roleId })
    );
  }, [identity, answers, pathGroup, committeeId, roleId, act]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [act]);

  const submit = async () => {
    if (!committee) throw new Error("Choose a chapter before sending your application.");
    if (!role) throw new Error("Choose a sub-committee before sending your application.");
    const now = new Date().toISOString();

    const payload: ApplicationPayload = {
      mode: "member-submit",
      timestamp: now,
      createdAt: now,
      fullName: identity.fullName.trim(),
      aucEmail: identity.aucEmail.trim(),
      studentId: identity.studentId.trim(),
      major: identity.major.trim(),
      yearLevel: identity.yearLevel,
      phone: identity.phone.trim(),
      whatsappConsent: identity.whatsappConsent,
      // roleAppliedFor stays the bare committee name — the Supabase function looks it
      // up verbatim. The sub-committee goes into the free-text step title as well,
      // which nothing keys off of.
      roleAppliedFor: committee.name,
      roleStepTitle: role ? `${committee.stepTitle} · ${role.name}` : committee.stepTitle,
      roleDescription: role ? role.description : committee.whyChoose,
      // The sub-committee the applicant will actually sit in. Sent under its own
      // name and id so the sheet and the dashboard can group by it.
      subCommittee: role?.name ?? "",
      subCommitteeId: role?.id ?? "",
      committeeId: committee.id,
      roleId: role?.id ?? "",
      answers: collectAnswers(committee, role, answers),
      ...mapAnswersToColumns(committee, role, answers),
      interviewSlot: slot?.startDateTime ?? "",
      interviewSlotId: slot?.id ?? "",
      interviewSlotLabel: slot?.label ?? ""
    };

    await submitApplication(payload);
    setAct("sealed");
  };

  /*
   * Past the deadline the flow does not open at all — filling every step in
   * only to be refused by the server at the last one is a worse way to find
   * out. The server refuses it too; this is the courteous half.
   */
  if (applicationsClosed()) {
    return (
      <>
        <Backdrop intensity={0.15} />
        <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <p className="mb-4 text-sm font-semibold tracking-[0.22em] text-brand-blue uppercase">
            Beyond Ana Maly
          </p>
          <h1 className="mb-4 max-w-xl font-serif text-3xl leading-tight font-black text-brand-blue md:text-4xl">
            Applications closed on {APPLICATION_DEADLINE_LABEL}.
          </h1>
          <p className="max-w-md leading-relaxed text-brand-muted">
            Thank you to everyone who applied — the committees are going through every
            application. If you already sent yours, watch your AUC inbox.
          </p>
          <a
            href="../"
            className="mt-8 inline-flex items-center rounded-full border border-brand-blue/35 bg-white/70 px-6 py-3 font-semibold text-brand-blue"
          >
            Back to Resala AUC
          </a>
        </main>
      </>
    );
  }

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
            }}
            onSelectRole={(nextRoleId) => setRoleId(nextRoleId)}
            onContinue={() => setAct("questions")}
            onBack={() => setAct("path")}
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
            onBack={() => setAct("chapters")}
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
