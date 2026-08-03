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
    task: {
      required: true,
      summary: "Bring a portfolio link",
      detail:
        "Link a portfolio, Drive folder, Instagram, or TikTok — any video, design, photography, captions, even coursework. If you have nothing to show yet, say so and tell us why you would still be good at this."
    },
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

  visits: {
    durationMinutes: 60,
    // Ezz and Amina both interview. Their two schedules are merged into one
    // pool: the applicant picks a time, not a person, and an hour where both
    // are free simply takes two bookings.
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
      byRole: {
        discovery: {
          title: "Discovery Report · 1–2 pages",
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
          points: [
            "The success indicators you would use to evaluate the visit.",
            "The feedback you would collect and from whom.",
            "A simple outline of the post-visit report.",
            "Recommendations you might provide for improving future visits."
          ]
        },
        storytelling: {
          title: "Content & Media Plan · 1–2 pages",
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
        times: ["10:00", "11:00", "12:00", "13:00", "18:00"],
        double: ["14:00", "15:00", "16:00", "17:00"]
      },
      {
        date: "2026-08-06",
        times: ["10:00", "11:00", "12:00", "13:00"],
        double: ["14:00", "15:00", "16:00", "17:00"]
      },
      {
        date: "2026-08-07",
        times: ["10:00", "11:00", "12:00", "13:00", "17:00"],
        double: ["14:00", "15:00", "16:00"]
      },
      {
        date: "2026-08-08",
        times: ["10:00", "11:00", "12:00", "13:00", "17:00"],
        double: ["14:00", "15:00", "16:00"]
      },
      {
        date: "2026-08-11",
        times: ["14:00", "18:00", "19:00"],
        double: ["15:00", "16:00", "17:00"]
      },
      {
        date: "2026-08-12",
        times: ["14:00", "18:00", "19:00"],
        double: ["15:00", "16:00", "17:00"]
      },
      {
        date: "2026-08-13",
        times: ["10:00", "11:00", "12:00", "13:00"],
        double: ["14:00", "15:00", "16:00", "17:00"]
      },
      {
        date: "2026-08-14",
        times: ["10:00", "11:00", "12:00", "13:00", "17:00"],
        double: ["14:00", "15:00", "16:00"]
      },
      {
        date: "2026-08-15",
        times: ["10:00", "11:00", "12:00", "13:00", "17:00"],
        double: ["14:00", "15:00", "16:00"]
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
