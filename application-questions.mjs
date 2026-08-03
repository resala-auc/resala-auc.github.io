/**
 * The application questions each committee actually asks, transcribed from its
 * own recruitment brief in "Heads Roles/". Wording is the committee's, not a
 * paraphrase — these are the questions their scoring rubric expects answers to.
 *
 * `field` maps an answer onto the fixed Applications-sheet columns. Committees
 * that ask more than four questions mark the remainder `field: null`; those are
 * gathered under one labelled heading so no answer is lost and no existing sheet
 * column has to move.
 *
 * Questions the brief asks that the flow already answers elsewhere are omitted:
 * "which role are you applying for" is the head picker, and "what is your second
 * preference" is the backup picker.
 */

const HOURS_PLACEHOLDER = "Be realistic — an honest number is worth more than a generous one.";

export const applicationQuestions = {
  "tech-director": (role) => [
    {
      id: "why-persona",
      field: "whyThisRole",
      eyebrow: "Which persona, and why",
      prompt: `You picked ${role?.name ?? "a persona"}. Why do you feel your personality fits that specific persona?`,
      placeholder: "The actual reason this one, not one of the other five.",
      required: true
    },
    {
      id: "responsibility",
      field: "whyChooseYourself",
      eyebrow: "Saw it through",
      prompt: "Tell us about a time you took responsibility for a project or problem and saw it through to the end.",
      placeholder: "What it was, what you did, how it ended.",
      required: true
    },
    {
      id: "pushback",
      field: "hopeToLearn",
      eyebrow: "Saying no",
      prompt: "Walk me through a time you had to tell someone that their request, timeline, or idea was not realistic. How did you handle it?",
      placeholder: "Who, what you said, and what happened after.",
      required: true
    },
    {
      id: "blocker",
      field: "previousResalaExperience",
      eyebrow: "Under pressure",
      prompt: "When you hit a major blocker or are working under intense deadline pressure, what is your immediate process for resolving it while working inside a team?",
      placeholder: "Your actual first move, not the ideal one.",
      required: true
    }
  ],

  /*
   * Only the numbered list under the brief's "Application Questions" heading is
   * asked here. Operations also lists a question per persona, but under a
   * separate "Additional question to ask for" heading — that is interview
   * material and is surfaced as interview prep instead.
   */
  operations: (role) => [
    {
      id: "which-role",
      field: "whyThisRole",
      eyebrow: "Which role, and why",
      prompt: `You picked ${role?.name ?? "an Operations role"}. Why that one?`,
      placeholder: "The version you'd give a friend, not a form.",
      required: true
    },
    {
      id: "responsibility",
      field: "whyChooseYourself",
      eyebrow: "Saw it through",
      prompt: "Tell us about a time you took responsibility for something and saw it through to completion.",
      placeholder: "One real example.",
      required: true
    },
    {
      id: "challenge",
      field: "hopeToLearn",
      eyebrow: "When it went wrong",
      prompt: "Tell us about a challenge or unexpected problem you faced. How did you handle it?",
      placeholder: "What broke, and what you actually did.",
      required: true
    },
    {
      id: "why-ops",
      field: "previousResalaExperience",
      eyebrow: "Why this committee",
      prompt: "Why do you want to join the Operations Committee?",
      placeholder: "Say the real reason.",
      required: true
    },
    {
      id: "hours",
      field: null,
      eyebrow: "Your week",
      prompt: "Approximately how many hours per week can you realistically commit to Resala, and how are you planning to balance Resala with your work?",
      placeholder: HOURS_PLACEHOLDER,
      required: true
    },
    {
      id: "anything-else",
      field: null,
      eyebrow: "Anything else",
      prompt: "Is there anything else you would like us to know about you?",
      placeholder: "Optional.",
      required: false
    }
  ],

  "branding-media": (role) => [
    {
      id: "why-role",
      field: "whyThisRole",
      eyebrow: "Why that role specifically",
      prompt: `Why ${role?.name ?? "that role"} specifically? (Three sentences maximum.)`,
      placeholder: "Three sentences. Say it the way you'd say it out loud.",
      required: true
    },
    {
      id: "portfolio",
      field: "whyChooseYourself",
      eyebrow: "Show us your work",
      prompt: "Show us your work. Link a portfolio, Drive folder, Instagram, TikTok, anything you have made: video, design, photography, captions, even coursework. If you have nothing to show, say so and tell us why you would still be good at this.",
      placeholder: "A link, or an honest explanation.",
      required: true
    },
    {
      id: "tools",
      field: "hopeToLearn",
      eyebrow: "Your tools",
      prompt: "Which tools do you actually use, and for how long? (Premiere Pro, After Effects, CapCut, Photoshop, Illustrator, Canva, Figma, Lightroom, Meta Business Suite, other, none.)",
      placeholder: "Name them and say how long you've used each.",
      required: true
    },
    {
      id: "hours",
      field: "previousResalaExperience",
      eyebrow: "Your week",
      prompt: "Roughly how many hours a week can you genuinely commit?",
      placeholder: HOURS_PLACEHOLDER,
      required: true
    },
    {
      id: "travel",
      field: null,
      eyebrow: "On the ground",
      prompt: "Resala work is not only online. Can you travel to visits, events and filming days, including some weekends? (Yes / Yes, with limits — explain / No.)",
      placeholder: "Yes, or yes with limits, or no.",
      required: true
    },
    {
      id: "commitments",
      field: null,
      eyebrow: "The rest of your semester",
      prompt: "What else are you committed to next semester: courses, another club, a job, an internship?",
      placeholder: "Everything that will compete for your time.",
      required: true
    }
  ],

  hr: () => [
    {
      id: "team-role",
      field: "whyThisRole",
      eyebrow: "The role you already play",
      prompt: "Everyone naturally takes on a role in a team. What role do you usually end up playing, and why do you think that is?",
      placeholder: "The honest answer, not the flattering one.",
      required: true
    },
    {
      id: "unassigned-problem",
      field: "whyChooseYourself",
      eyebrow: "The problem nobody assigned you",
      prompt: "Tell us about a time you noticed a problem that nobody asked you to solve. What did you do, and what happened?",
      placeholder: "Small counts. It just has to be real.",
      required: true
    },
    {
      id: "improve-experience",
      field: "hopeToLearn",
      eyebrow: "What you would change",
      prompt: "If you could improve one aspect of Resala's volunteer experience, what would it be, and how would you approach improving it?",
      placeholder: "One thing, and how you'd actually go about it.",
      required: true
    }
  ],

  "pr-fundraising": (role) => [
    {
      id: "which-role",
      field: "whyThisRole",
      eyebrow: "Which role, and why that one",
      prompt: `You picked ${role?.name ?? "a role"}. Why that one?`,
      placeholder: "Say the real reason, not the impressive one.",
      required: true
    },
    {
      id: "challenge",
      field: "whyChooseYourself",
      eyebrow: "A challenge you actually had",
      prompt: "Describe a time when you were working on a project and faced a challenge. What was the challenge, how did you handle it, and what did you learn from this experience?",
      placeholder: "The challenge, the handling, the lesson — in that order.",
      required: true
    },
    {
      id: "add-gain",
      field: "hopeToLearn",
      eyebrow: "Both directions",
      prompt: "What do you believe you will add to Resala? What do you hope to gain from your experience in Resala?",
      placeholder: "Be specific about both halves.",
      required: true
    },
    {
      id: "goal",
      field: "previousResalaExperience",
      eyebrow: "One goal",
      prompt: "What's one specific goal that you would like to accomplish if you are selected for this position?",
      placeholder: "Specific enough that we could check whether you hit it.",
      required: true
    },
    {
      id: "hours",
      field: null,
      eyebrow: "Your week",
      prompt: "Roughly how many hours a week can you genuinely commit?",
      placeholder: HOURS_PLACEHOLDER,
      required: true
    },
    ...(role
      ? [
          {
            id: "ramadan-bags",
            field: null,
            eyebrow: `For ${role.name}`,
            prompt: {
              sponsorship: "Imagine that you are working on the Ramadan Bags event. What potential sponsors would you contact and how would you contact them? Include a pitch.",
              events: "Imagine that you are working on the Ramadan Bags event. What type or types of event would you choose? Create a small plan or proposal for the event.",
              partnerships: "Imagine that you are working on the Ramadan Bags event. How would you campaign to get manpower and spread awareness for this event? Create a small plan or proposal of what you would do."
            }[role.id],
            placeholder: "A short plan is fine — we're reading how you think.",
            required: true
          }
        ]
      : [])
  ],

  visits: (role) => [
    {
      id: "which-role",
      field: "whyThisRole",
      eyebrow: "Which role, and why",
      prompt: `You picked ${role?.name ?? "a role"}. Why do you believe it is the best fit for you?`,
      placeholder: "Not the title — the actual work of the role.",
      required: true
    },
    {
      id: "responsibility",
      field: "whyChooseYourself",
      eyebrow: "A time you carried something",
      prompt: "Tell us about an experience where you took responsibility for a task, event, or project. What was your role, and what was the outcome?",
      placeholder: "One real experience, told straight.",
      required: true
    },
    {
      id: "why-visits",
      field: "hopeToLearn",
      eyebrow: "Why Resala Visits",
      prompt: "Why do you want to join Resala Visits, and what do you hope to contribute to the committee?",
      placeholder: "Both halves — the why and the what.",
      required: true
    },
    {
      id: "team-challenge",
      field: "previousResalaExperience",
      eyebrow: "Inside a team",
      prompt: "Describe a challenge you faced while working in a team. How did you handle it, and what did you learn from the experience?",
      placeholder: "What happened, what you did, what you took from it.",
      required: true
    },
    {
      id: "hours",
      field: null,
      eyebrow: "Your week",
      prompt: "How many hours per week can you realistically commit to Resala Visits during the semester?",
      placeholder: HOURS_PLACEHOLDER,
      required: true
    }
  ]
};

export function buildApplicationQuestions(committeeId, role) {
  const factory = applicationQuestions[committeeId];
  return factory ? factory(role).filter((q) => q && q.prompt) : [];
}
