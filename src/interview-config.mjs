/**
 * Per-committee interview availability for the 2026 Heads cycle.
 *
 * Every day/time here is transcribed from that committee's own recruitment
 * brief in "Heads Roles/". Interview length differs by committee (Branding runs
 * short back-to-back slots; everyone else runs an hour), so duration lives per
 * committee rather than as one global constant.
 *
 * Times are 24h "HH:MM" in Africa/Cairo. `capacity` is how many applicants can
 * hold the same start time — above 1 only where a committee has more than one
 * interviewer free at that hour.
 *
 * Source of truth for BOTH the /join booking UI and (once wired) the Supabase
 * scheduler, so the two can never disagree about when a committee is free.
 */

/** Committees whose applicants must prepare something before the interview. */
const NO_TASK = { required: false };

/**
 * Who an applicant should contact with questions: the Director and
 * Vice-Director of the committee they applied to, never a general inbox.
 *
 * The live source of truth is the "Board Hierarchy" sheet (Department /
 * Position Type / Name / AUC Email). Until this flow reads that sheet directly,
 * fill the entries in below. Any committee left empty falls back to the general
 * Resala address rather than showing a blank or a placeholder name.
 */
export const GENERAL_CONTACT = { name: "Resala AUC", email: "resala@aucegypt.edu" };

export const committeeContacts = {
  "tech-director": [],
  operations: [],
  "branding-media": [],
  hr: [],
  "pr-fundraising": [],
  "children-day-director": [],
  "initiatives-director": [],
  visits: []
};

export function getCommitteeContacts(committeeId) {
  const listed = (committeeContacts[committeeId] ?? []).filter((c) => c && c.email);
  return listed.length ? listed : [{ ...GENERAL_CONTACT, title: "General enquiries" }];
}

export const interviewConfig = {
  "tech-director": {
    durationMinutes: 60,
    interviewers: ["Tech Team leads"],
    task: NO_TASK,
    days: [
      { date: "2026-08-05", times: ["10:00", "13:00", "16:00", "19:00"] },
      { date: "2026-08-06", times: ["10:00", "13:00", "16:00", "19:00"] },
      { date: "2026-08-07", times: ["11:00", "14:00", "17:00", "20:00"] },
      { date: "2026-08-08", times: ["11:00", "14:00", "17:00", "20:00"] },
      { date: "2026-08-11", times: ["16:00", "17:00", "18:00", "19:00"] },
      { date: "2026-08-12", times: ["16:00", "17:00", "18:00", "19:00"] },
      { date: "2026-08-13", times: ["16:00", "17:00", "18:00", "19:00"] },
      { date: "2026-08-14", times: ["16:00", "17:00", "18:00", "19:00"] }
    ]
  },

  operations: {
    /*
     * 30-minute interviews. The brief lists explicit start times rather than a
     * window and a count, so those start times are kept exactly as published —
     * the shorter interview simply leaves a gap after each one instead of
     * running back-to-back.
     *
     * The days run 5-8, 11-14 Aug. The brief's table skips 12 and 13, but
     * Operations interviews on them too and an applicant is already booked on
     * the 12th; kept by decision rather than trimmed back to the table.
     */
    durationMinutes: 30,
    interviewers: ["Operations leads"],
    task: NO_TASK,
    days: [
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
      "2026-08-08",
      "2026-08-11",
      "2026-08-12",
      "2026-08-13",
      "2026-08-14"
    ].map((date) => ({ date, times: ["11:00", "12:00", "16:00", "20:00", "21:00", "22:00"] }))
  },

  "branding-media": {
    /*
     * 30-minute interviews with a 5-minute break between them, 6 per day.
     * That needs 6x30 + 5x5 = 205 minutes, so the day runs 1:00pm to 4:25pm —
     * the brief's stated 1:00–3:30pm window only holds 150 minutes and cannot
     * fit six 30-minute interviews. The times below are the real schedule.
     */
    durationMinutes: 30,
    interviewers: ["Marketing & Branding leads"],
    task: NO_TASK,
    // 9-10 Aug are dropped: every other committee treats them as a rest gap,
    // and Visits marks them "Not Available" outright.
    days: [
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
      "2026-08-08",
      "2026-08-11",
      "2026-08-12",
      "2026-08-13",
      "2026-08-14"
    ].map((date) => ({
      date,
      times: ["13:00", "13:35", "14:10", "14:45", "15:20", "15:55"]
    }))
  },

  hr: {
    durationMinutes: 60,
    interviewers: ["HR leads"],
    task: NO_TASK,
    days: [
      { date: "2026-08-05", times: ["14:00", "15:00", "16:00", "17:00"] },
      { date: "2026-08-06", times: ["11:00", "17:00", "18:00", "19:00"] },
      { date: "2026-08-07", times: ["17:00", "18:00", "19:00", "20:00"] },
      { date: "2026-08-08", times: ["11:00", "17:00", "18:00", "19:00"] },
      { date: "2026-08-11", times: ["11:00", "17:00", "18:00", "19:00"] },
      { date: "2026-08-12", times: ["14:00", "15:00", "16:00", "17:00"] },
      { date: "2026-08-13", times: ["11:00", "17:00", "18:00", "19:00"] },
      // The brief's last row reads "Friday 11th August", but the 11th is a
      // Tuesday and already has its own row; the run ends on Friday the 14th.
      { date: "2026-08-14", times: ["17:00", "18:00", "19:00", "20:00"] }
    ]
  },

  "pr-fundraising": {
    durationMinutes: 60,
    interviewers: ["PR & Fundraising leads"],
    task: NO_TASK,
    days: [
      { date: "2026-08-05", times: ["09:00", "10:00", "11:00", "12:00"] },
      { date: "2026-08-06", times: ["09:00", "10:00", "11:00", "12:00"] },
      { date: "2026-08-07", times: ["09:00", "10:00", "11:00", "12:00"] },
      { date: "2026-08-08", times: ["14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"] },
      { date: "2026-08-11", times: ["19:00", "20:00", "21:00", "22:00"] },
      { date: "2026-08-12", times: ["11:00", "12:00", "15:00", "16:00", "17:00"] },
      { date: "2026-08-13", times: ["11:00", "12:00", "15:00", "16:00", "17:00"] },
      { date: "2026-08-14", times: ["11:00", "12:00", "15:00", "16:00"] }
    ]
  },

  "children-day-director": {
    /*
     * The brief does not state a length. Slots are spaced an hour apart, and the
     * flow runs seven fixed questions plus 10-20 minutes to review the trial
     * task, so an hour is the only length that fits.
     */
    durationMinutes: 60,
    interviewers: ["Children's Day leads"],
    /*
     * The trial task is prepared in advance and submitted, not handed out in
     * the room: the applicant gets their own sheet with the confirmation email
     * and uploads a link to their work at least an hour before the interview,
     * so the interviewers can read it before they sit down. It carries the most
     * weight in the scoring (Skills, 40 of 100).
     */
    task: {
      required: true,
      summary: "Prepare and submit a task for the head you applied to",
      detail:
        "Your task sheet is attached to your confirmation email. It carries the most weight in the scoring, so give it real time.",
      dueBeforeInterviewMinutes: 60,
      submissionUrl: "https://resala-auc.github.io/tasks/",
      // The brief's own note to applicants, kept in their words.
      aiNote: "You can use AI as a tool, but not the other way around.",
      byRole: {
        creative: {
          title: "Interactive Session Deck · ~4 slides",
          file: "children-day-creative.pdf",
          points: [
            "Design a ~4-slide interactive presentation, in PowerPoint or Canva, formatted to hold children's attention and deliver a clear educational benefit by the end — not entertainment alone.",
            "Build it around a daily-life problem these underprivileged children face, the way a module does, and end on an activity with a tangible benefit.",
            "Think of a creative concept and put forward your best execution.",
            "We are looking for a creative concept, a clean and simple layout, and a finished deck rather than a half-built idea."
          ]
        },
        english: {
          title: "English Lesson Deck · ~4 slides",
          file: "children-day-english.pdf",
          points: [
            "Structure an interactive ~4-slide deck for intermediate-level students — they already understand questions like “What is your name?” or “How old are you?”.",
            "Teach key concept vocabulary alongside an appropriate grammar lesson (should / shouldn't, imperative verbs, and the like).",
            "Choose a real-life problem these students face and build the lesson around it. For water pollution: words like pollution, trash, health, affect, then “You shouldn't pollute the water” or “You should reduce water pollution”.",
            "We are looking for clear sequencing, age-appropriate language, and a lesson that teaches through activity rather than a lecture."
          ]
        },
        teaching: {
          title: "Scripts, Contingency & Placement Response",
          file: "children-day-teaching.pdf",
          points: [
            "Parent outreach: two ~150-word phone scripts for a facilitator calling a mother. Script A for a child who accumulated 3 negative points during the session; Script B for a child who was excessively sleepy, unfocused, and kept falling asleep. Both must balance firm behavioural feedback with empathy and encouragement.",
            "Operations emergency: Operations tells you on Friday night that the budget and supplies for Saturday's craft activity cannot be delivered. Write a 200-250 word contingency plan for running the activity without disruption.",
            "Placement conflict: a child was placed in the Beginner English track after their baseline test, and the parent demands the Intermediate track, believing their child is held back. Write a 200-word response — diplomatic, friendly, reassuring.",
            "We are looking for decisive, step-by-step plans that solve the live scenario rather than list concerns, and communication that keeps firm boundaries while treating mothers as respected partners."
          ]
        }
      }
    },
    days: [
      { date: "2026-08-05", times: ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "19:00", "22:00", "23:00"] },
      { date: "2026-08-06", times: ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"] },
      { date: "2026-08-07", times: ["15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"] },
      { date: "2026-08-08", times: ["15:00", "16:00", "17:00"] }
    ]
  },

  "initiatives-director": {
    durationMinutes: 30,
    interviewers: ["Initiatives leads"],
    task: NO_TASK,
    days: [
      "2026-08-05",
      "2026-08-06",
      "2026-08-08",
      "2026-08-11",
      "2026-08-12",
      "2026-08-13",
      "2026-08-14"
    ].map((date) => ({ date, times: ["13:00", "13:45", "14:30", "15:15"] }))
  },

  visits: {
    durationMinutes: 60,
    // Ezz and Amina interview together, so an hour where both are free is still
    // a single interview. Their schedules are merged into one pool of times and
    // every slot takes exactly one applicant. The pool is the union of the two,
    // not the overlap: either of them can run an interview alone, and by
    // decision applicants get the wider choice.
    //
    // Ezz's published table also lists an 11:00 PM-12:00 AM slot on every one of
    // his days. It is deliberately not offered here: it would schedule an
    // interview across midnight, and it was dropped by decision.
    interviewers: ["Ezz", "Amina"],
    task: {
      required: true,
      summary: "Prepare a 1–2 page role task",
      /*
       * Part B of the Visits brief sets one shared scenario, then a different
       * deliverable per head. Applicants must see their own, not a generic one.
       */
      scenario:
        "Resala Visits is organizing a Fixing Visit for a low-income family. The initial assessment found the house needs wall repairs, repainting, a replacement wooden door and several electrical repairs. The visit is two weeks away with 25 volunteers, the materials are not secured yet, and all planning must be done before the visit date.",
      detail:
        "Complete the practical task for the head you picked, based on the Fixing Visit scenario. One to two pages — bullet points, tables, diagrams or sketches are fine.",
      pageLimit: "One to two pages maximum.",
      byRole: {
        discovery: {
          title: "Discovery Report · 1–2 pages",
          file: "visits-discovery.pdf",
          points: [
            "The additional information you would collect before approving the visit.",
            "Questions you would ask the beneficiaries.",
            "Any measurements, observations, or documentation you believe are necessary.",
            "Potential risks or challenges you identified.",
            "Your final recommendation for the rest of the leadership team."
          ]
        },
        execution: {
          title: "Execution Plan · 1–2 pages",
          file: "visits-execution.pdf",
          points: [
            "A timeline from planning until the end of the visit.",
            "The main tasks that need to be completed before the visit.",
            "How volunteers will be organized and assigned responsibilities.",
            "Possible risks during execution and how you would handle them.",
            "A brief contingency plan for unexpected situations."
          ]
        },
        impact: {
          title: "Impact Evaluation Plan · 1–2 pages",
          file: "visits-impact.pdf",
          points: [
            "The success indicators you would use to evaluate the visit.",
            "The feedback you would collect and from whom.",
            "A simple outline of the post-visit report.",
            "Recommendations you might provide for improving future visits."
          ]
        },
        storytelling: {
          title: "Content & Media Plan · 1–2 pages",
          file: "visits-storytelling.pdf",
          points: [
            "The content you would create before, during, and after the visit.",
            "The types of photos and videos you would capture.",
            "A sample social media post or campaign idea.",
            "How you would ensure that beneficiaries are represented respectfully and ethically."
          ]
        }
      }
    },
    days: [
      { date: "2026-08-04", times: ["14:00", "15:00", "16:00", "17:00"] },
      {
        date: "2026-08-05",
        times: ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"]
      },
      {
        date: "2026-08-06",
        times: ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]
      },
      {
        date: "2026-08-07",
        times: ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]
      },
      {
        date: "2026-08-08",
        times: ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]
      },
      {
        date: "2026-08-11",
        times: ["14:00", "15:00", "16:00", "17:00", "18:00", "19:00"]
      },
      {
        date: "2026-08-12",
        times: ["14:00", "15:00", "16:00", "17:00", "18:00", "19:00"]
      },
      {
        date: "2026-08-13",
        times: ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]
      },
      {
        date: "2026-08-14",
        times: ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]
      },
      {
        date: "2026-08-15",
        times: ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]
      }
    ]
  }
};

function pad(n) {
  return String(n).padStart(2, "0");
}

function addMinutes(time, minutes) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

function display(time) {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${pad(m)} ${suffix}`;
}

/**
 * Expand a committee's config into concrete bookable slots, shaped to match the
 * InterviewSlot contract the booking UI already speaks.
 */
export function buildCommitteeSlots(committeeId) {
  const config = interviewConfig[committeeId];
  if (!config) return [];

  const slots = [];
  for (const day of config.days) {
    const single = day.times ?? [];
    const double = day.double ?? [];
    const all = [...single.map((t) => [t, 1]), ...double.map((t) => [t, 2])].sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    for (const [time, capacity] of all) {
      const endTime = addMinutes(time, config.durationMinutes);
      slots.push({
        id: `${committeeId}-${day.date}-${time.replace(":", "")}`,
        date: day.date,
        startTime: display(time),
        endTime: display(endTime),
        label: `${day.date} at ${display(time)}`,
        startDateTime: `${day.date}T${time}:00`,
        endDateTime: `${day.date}T${endTime}:00`,
        capacity,
        active: true,
        reservedCount: 0,
        remaining: capacity,
        full: false,
        durationMinutes: config.durationMinutes
      });
    }
  }
  return slots;
}

export function getInterviewConfig(committeeId) {
  return interviewConfig[committeeId] ?? null;
}
