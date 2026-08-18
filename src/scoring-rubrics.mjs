/**
 * Interview scoring rubrics, taken verbatim from each committee's own §4.
 *
 * These are not interchangeable. Committees differ in their criteria, their
 * weights, and even the shape of their scale — PR grades in three bands where
 * everyone else grades against a full-mark/low-mark pair, and HR sets a
 * different weighting for each of its heads. So the dashboard builds its
 * scoring form from this file rather than from one fixed set of columns.
 *
 * The anchor text is the point. Branding's brief is explicit about why: without
 * written criteria, two interviewers score the same applicant differently and a
 * rejection cannot be defended later. Every anchor here is quoted, not
 * paraphrased — if a committee rewrites its brief, change it here and the form
 * follows.
 *
 * Weights are stored as numbers out of 100 whatever the source used; HR writes
 * percentages and the others write points, but they all total 100.
 */

/** Full marks vs low marks, the shape six of the seven committees use. */
const pair = (weight, full, low) => ({ weight, anchors: { full, low } });

export const rubrics = {
  "tech-director": {
    source: "tech recruitment.docx §4",
    criteria: [
      pair(
        30,
        "Gave a real example of putting the work above their own convenience and taking accountability for mistakes.",
        "Only spoke in intentions, blamed others for setbacks, didn't take responsibility for problems."
      ),
      pair(
        30,
        "Demonstrated decisiveness, the ability to push back on unrealistic demands, and strong communication skills.",
        "Doesn't face conflict directly, goes with a “we'll see and deal with it later”, doesn't want to step up."
      ),
      pair(
        20,
        "Honest about their limitations, flags blockers early instead of hiding them, and understands the importance of documentation.",
        "Prefers to work in total isolation or over-promises on their capacity. Doesn't want to fully commit to the committee."
      ),
      pair(
        20,
        "Showed concrete problem-solving steps, technical literacy, or research habits.",
        "Relies on AI, no projects, no shown critical thinking during projects."
      )
    ].map((c, i) => ({ ...c, name: ["Ownership", "Leadership", "Self-awareness & commitment", "Skills"][i] }))
  },

  operations: {
    source: "operations-recruitment.docx §4",
    criteria: [
      { name: "Ownership", ...pair(30, "Gives a real example of taking ownership and completing a task despite challenges.", "Speaks only about intentions without a clear example.") },
      { name: "Leadership", ...pair(30, "Demonstrates initiative, teamwork, and the ability to influence or support others.", "Avoids responsibility or relies completely on teammates.") },
      { name: "Self-awareness & Commitment", ...pair(20, "Understands personal strengths and weaknesses and can commit realistic time to Operations.", "Gives vague answers or unrealistic commitments.") },
      { name: "Skills", ...pair(20, "Demonstrates communication, organization, planning, and problem-solving through real examples.", "Cannot provide evidence of the required skills.") }
    ]
  },

  "branding-media": {
    source: "branding recruitment.docx §4.1",
    // Five points were moved from Leadership to Skills against the suggested
    // split, because all four branding heads are hands-on producing roles.
    note:
      "A Head of Video Editing who cannot edit cannot lead the editing team, so Skills carries the same weight as Ownership.",
    criteria: [
      { name: "Ownership", ...pair(30, "Gives a specific example of putting the work above their own convenience, names a real cost they paid, and finished the thing.", "Speaks only in intentions with no example, or the story ends with someone else fixing it.") },
      { name: "Leadership", ...pair(20, "Has led people who were not obliged to listen, adjusts their approach person by person, and goes directly to the person rather than complaining upward.", "Describes assigning tasks and nothing else, or cannot state the other side of a disagreement fairly.") },
      { name: "Self-awareness & commitment", ...pair(20, "Names a real, role-relevant weakness with a concrete plan; the hours they claimed survive a walk through their actual week.", "A disguised strength (“I'm a perfectionist”), or numbers that do not add up.") },
      { name: "Skills", ...pair(30, "Can defend the choices behind their own work, and answers the role-specific scenario with a method rather than a wish.", "Shows work but cannot explain why any of it is the way it is.") }
    ]
  },

  "initiatives-director": {
    source: "initiatives recruitment.docx §4",
    criteria: [
      { name: "Ownership", ...pair(30, "Gave a real example of prioritizing work and accountability over personal convenience.", "Spoke only in general intentions without providing a concrete example.") },
      { name: "Leadership", ...pair(30, "Demonstrated clear ability to guide team members, make decisive choices under pressure, and navigate obstacles.", "Relied strictly on title/authority or struggled to guide others.") },
      { name: "Self-awareness & commitment", ...pair(20, "Displayed clear knowledge of personal limits and offered a realistic, high-commitment schedule.", "Overpromised availability without boundaries or lacked awareness of personal weaknesses.") },
      { name: "Skills", ...pair(20, "Demonstrated key capabilities tailored to their role (e.g. research analysis, project management, field adaptability, or curriculum design).", "Showed minimal understanding or application of core role requirements.") }
    ]
  },

  visits: {
    source: "Resala Visits Subclub — Recruitment Preparation, Section 4",
    // Visits is the only committee that renamed its criteria outright.
    criteria: [
      { name: "Communication / Teamwork", ...pair(25, "Provides examples of working successfully within a team or handling disagreements, listens carefully, communicates in a respectful way, and can communicate with all types of people.", "Struggles to communicate ideas, interrupts others, blames teammates, or cannot describe positive teamwork experiences.") },
      { name: "Commitment", ...pair(30, "Gives real examples of good attendance in any activity they participated in before, takes responsibility without being asked to do so, and shows genuine willingness to participate in Resala activities.", "Is not able to explain how they will manage their responsibilities, keeps promising they will attend and barely does, and has inconsistent attendance.") },
      { name: "Problem Solving", ...pair(25, "Gives examples of staying calm under pressure, solving unexpected problems, adapting during events, and thinking quickly.", "Becomes overwhelmed easily, struggles to think of solutions, or relies on others to solve problems.") },
      { name: "Character / Passion", ...pair(20, "Shows enthusiasm, positive energy, empathy, initiative, and a genuine passion for community service. Demonstrates qualities that show how they will make participants feel engaged during the visits.", "Is uninterested, lacks motivation, or joins mainly for the title or certificate rather than the mission.") }
    ]
  },

  "pr-fundraising": {
    source: "pr recruitment.docx §4",
    // PR is the only committee grading in bands rather than against a pair, so
    // the form shows three descriptions and the score range each one earns.
    scale: "bands",
    criteria: [
      {
        name: "Leadership",
        weight: 30,
        bands: [
          { label: "Strong", range: [20, 30], text: "Gave one or more real and strong examples of leadership positions that they were in. Was leading, not managing. Was able to delegate and not do all the work. Was able to handle conflicts and handle challenges." },
          { label: "Moderate", range: [10, 19], text: "Gave only 1 weak leadership example. Was able to lead but often ended up doing the work. Had minor trouble handling conflicts." },
          { label: "Weak", range: [0, 9], text: "No true examples, only intentions. Can't think of ways to lead, follows more of a managing style. Can't think of ways to handle conflicts." }
        ]
      },
      {
        name: "Ownership",
        weight: 30,
        bands: [
          { label: "Strong", range: [20, 30], text: "Shows responsibility and doesn't make excuses, gives one or more real and strong examples of going beyond what was expected, understands the value of team success and not only focused on personal success, understands Resala's missions and aligns with it in daily life." },
          { label: "Moderate", range: [10, 19], text: "Does exactly what is asked and does not go beyond, sometimes finds ways to make excuses and other times takes responsibility, focused more on personal success, aligns with Resala's vision." },
          { label: "Weak", range: [0, 9], text: "Often does not complete what is asked, does not go beyond what is needed, makes a lot of excuses and does not align with Resala's mission." }
        ]
      },
      {
        name: "Self Awareness & Commitment",
        weight: 20,
        bands: [
          { label: "Strong", range: [15, 20], text: "Is honest and accountable, knows strengths and weaknesses and takes responsibility for them, includes how weaknesses can be fixed in a realistic way, shows reliability, demonstrates realistic goals and how they can be implemented, shows commitment with proof." },
          { label: "Moderate", range: [9, 14], text: "Is honest, knows some strengths and weaknesses, gives generic answers on how they can be improved, shows commitment but no proof." },
          { label: "Weak", range: [0, 8], text: "Is not honest, gives generic answers on self and doesn't show real commitment." }
        ]
      },
      {
        name: "Skills + Scenarios",
        weight: 20,
        bands: [
          { label: "Strong", range: [15, 20], text: "6-4 skills, handles scenario excellently." },
          { label: "Moderate", range: [9, 14], text: "3-2 skills, handles scenario in an acceptable way." },
          { label: "Weak", range: [0, 8], text: "1-0 skills, doesn't know how to handle the scenario." }
        ],
        // Which skills count depends on the head the applicant applied to.
        // Keyed by head id, so the portal can look them up with the same key it
        // already uses everywhere else.
        skillsByRole: {
          sponsorship: "Negotiation, networking, persuasion, communication, determination, and sales & pitching.",
          events: "Planning, time management, problem solving, organization, creative, adaptable.",
          partnerships: "Communication, networking, collaborative, creative, presentation, planning skills."
        }
      }
    ]
  },

  "children-day-director": {
    source: "childrenday recruitment.pdf §5",
    // The trial task in §4 is not scored on its own: it is the evidence the
    // Skills section is looking for, which is why Skills carries 40 here.
    note: "The trial task carries high weight inside Skills — score what they produced, not the promise.",
    criteria: [
      { name: "Ownership", ...pair(15, "Gives a real example of putting the team above personal convenience — stayed late, covered a gap, gave up something to see it through.", "Speaks only in intentions or promises, with no concrete example.") },
      { name: "Leadership", ...pair(30, "Describes one specific decision or conflict they handled, and owns the outcome, good or bad.", "Talks about leadership in the abstract, or credits every decision to someone else.") },
      { name: "Self-awareness & commitment", ...pair(15, "Names a real limit and how they manage it, and is specific about the hours and weeks they can commit.", "Claims to have no weaknesses, or is vague about availability.") },
      { name: "Skills", ...pair(40, "Shows concrete proof tied to what the role actually owns — a design sample, teaching experience, or event-ops experience.", "Shows general enthusiasm with nothing concrete behind it.") }
    ]
  },

  /*
   * HR is the exception that forced the per-head override: the same four
   * criteria carry different weights for each head, because the roles are not
   * comparable: Tracking weights Skills at 40%, Engagement weights Leadership at 35%.
   */
  hr: {
    source: "HR Recruitment Task §2.4",
    byRole: {
      // Engagement and Inclusion merged into one role; kept as the current
      // head's rubric. "engagement", "inclusion", and "tracking" below stay
      // for applicants already scored against the old three-role split —
      // never delete a rubric a real score references.
      "engagement-inclusion": {
        label: "Engagement & Inclusion Head",
        criteria: [
          { name: "Ownership", lookFor: "initiative, accountability, commitment", ...pair(20, "Takes initiative without being asked, follows through on commitments, takes responsibility when things go wrong, and is willing to advocate for members as readily as they plan for them.", "Waits for instructions, gives excuses, or only contributes when specifically assigned a task.") },
          { name: "Leadership", lookFor: "communication, motivating others, teamwork, confidence", ...pair(30, "Communicates confidently and respectfully, motivates others, resolves conflicts maturely, earns people's trust across different committees, and creates an environment where every member feels included and valued.", "Struggles to communicate, avoids taking charge or difficult conversations, or has difficulty working with different personalities.") },
          { name: "Self-awareness & Commitment", lookFor: "reflection, empathy, maturity, coachability", ...pair(20, "Recognizes personal strengths, weaknesses, and biases; accepts feedback positively; demonstrates empathy and active listening; and realistically explains the time they can commit.", "Cannot reflect on their own performance, becomes defensive, makes assumptions about others, or overcommits without justification.") },
          { name: "Role-Specific Skills", lookFor: "creativity, planning, inclusion mindset, member experience", ...pair(30, "Generates creative engagement ideas, understands how to increase participation, identifies participation barriers, proposes practical accommodations, and thinks proactively about building a community where everyone belongs.", "Provides generic ideas, focuses only on logistics, makes assumptions about people's needs, or struggles to propose realistic inclusive practices.") }
        ]
      },
      engagement: {
        label: "Engagement Head",
        criteria: [
          { name: "Ownership", lookFor: "initiative, accountability, commitment", ...pair(20, "Takes initiative without being asked, follows through on commitments, takes responsibility when things go wrong, and demonstrates genuine passion for improving member experience.", "Waits for instructions, gives excuses, or only contributes when specifically assigned a task.") },
          { name: "Leadership", lookFor: "communication, motivating others, teamwork, confidence", ...pair(35, "Communicates confidently, motivates others, resolves conflicts maturely, builds relationships easily, and creates an environment where people feel included and valued.", "Struggles to communicate, avoids taking charge, or has difficulty working with different personalities.") },
          { name: "Self-awareness & Commitment", lookFor: "reflection, maturity, coachability", ...pair(15, "Recognizes personal strengths and weaknesses, accepts feedback positively, demonstrates emotional maturity, and realistically explains the time they can commit.", "Cannot reflect on their performance, becomes defensive, or overcommits without justification.") },
          { name: "Role-Specific Skills", lookFor: "creativity, planning, member experience", ...pair(30, "Generates creative engagement ideas, understands how to increase participation, enjoys organizing events, identifies ways to improve member satisfaction, and thinks proactively about building community.", "Provides generic ideas, lacks creativity, or focuses only on logistics without considering member experience.") }
        ]
      },
      inclusion: {
        label: "Inclusion Head",
        criteria: [
          { name: "Ownership", ...pair(20, "Takes initiative to support others, follows through on responsibilities, is willing to advocate for members, and demonstrates accountability when addressing challenges.", "Waits for others to solve problems or avoids taking responsibility.") },
          { name: "Leadership", ...pair(25, "Communicates respectfully, earns people's trust, collaborates effectively with different committees, and confidently represents members' needs in difficult situations.", "Avoids difficult conversations, struggles to communicate clearly, or cannot work collaboratively.") },
          { name: "Self-Awareness & Commitment", ...pair(25, "Demonstrates empathy, actively listens, is open to learning, recognizes personal biases, accepts feedback, and understands the importance of treating every member as an individual.", "Makes assumptions about others, lacks empathy, or shows little willingness to learn or hear from different perspectives.") },
          { name: "Role Specific Skills", lookFor: "inclusion, problem-solving, accessibility mindset", ...pair(30, "Thinks inclusively, identifies participation barriers, proposes practical accommodations, asks thoughtful questions instead of making assumptions, and understands that inclusion is about equal opportunity rather than special treatment.", "Suggests standardized solutions, makes assumptions about people's needs, or struggles to propose realistic inclusive practices.") }
        ]
      },
      tracking: {
        label: "Tracking System Head",
        criteria: [
          { name: "Ownership", ...pair(25, "Takes initiative without being asked, follows through on commitments, takes responsibility when things go wrong, and demonstrates genuine passion for improving member experience.", "Waits for instructions, gives excuses, or only contributes when specifically assigned a task.") },
          { name: "Leadership", ...pair(20, "Explains technical issues clearly to non-technical people, coordinates well with the Tech Team, raises concerns respectfully when accuracy is at risk.", "Struggles to communicate technical needs, avoids raising issues, works in isolation.") },
          { name: "Self-awareness & Commitment", ...pair(15, "Honest about their own tool gaps, willing to learn what they don't know, realistic about the routine nature of the work.", "Overstates technical comfort, avoids naming gaps, underestimates how repetitive the role can be.") },
          { name: "Skills", ...pair(40, "Comfortable with spreadsheets/databases, thinks in structured systems, catches inconsistencies, turns raw data into something usable.", "Disorganized, struggles with structured tools, presents data in ways nobody can act on.") }
        ]
      }
    }
  }
};

/**
 * The rubric for this applicant: the committee's own, or the head-specific one
 * where the committee sets a different weighting per head (HR).
 *
 * `headId` is the head key ("engagement", "tracking"), not its label.
 */
export function getRubric(committeeId, headId) {
  const entry = rubrics[committeeId];
  if (!entry) return null;

  if (entry.byRole) {
    const forHead = headId ? entry.byRole[headId] : null;
    if (!forHead) return null; // HR cannot be scored without knowing the head.
    return { ...entry, ...forHead, committeeId, headId };
  }

  return { ...entry, committeeId, headId };
}

/** Every committee that can be scored, for the admin overview. */
export function committeesWithRubrics() {
  return Object.keys(rubrics);
}

/**
 * Weighted total out of 100. Scores come in already on each criterion's own
 * scale (a 30-weight criterion is scored 0-30), so this is a sum with a guard
 * against a criterion being left blank.
 */
export function totalScore(rubric, scores) {
  if (!rubric) return null;
  let total = 0;
  for (const criterion of rubric.criteria) {
    const raw = Number(scores?.[criterion.name]);
    if (!Number.isFinite(raw)) return null; // incomplete, not zero
    total += Math.min(Math.max(raw, 0), criterion.weight);
  }
  return Math.round(total * 10) / 10;
}

/** Sanity check: a rubric whose weights do not total 100 is a transcription bug. */
export function validateRubrics() {
  const problems = [];
  const check = (id, criteria) => {
    const sum = criteria.reduce((t, c) => t + c.weight, 0);
    if (sum !== 100) problems.push(`${id} weights total ${sum}, expected 100`);
  };
  for (const [id, entry] of Object.entries(rubrics)) {
    if (entry.byRole) {
      for (const [head, forHead] of Object.entries(entry.byRole)) check(`${id}/${head}`, forHead.criteria);
    } else {
      check(id, entry.criteria);
    }
  }
  return problems;
}
