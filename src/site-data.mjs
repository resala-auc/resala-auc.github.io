import { cycleRoleGuides, displayName } from "./committee-display.mjs";

export const navItems = [
  { label: "00 Campaign", href: "#campaign" },
  { label: "01 Impact", href: "#impact" },
  { label: "02 Roles", href: "#roles" },
  { label: "03 Process", href: "#process" },
  { label: "04 FAQ", href: "#faq" },
  { label: "05 Apply", href: "./join/" }
];

export const impactStats = [
  {
    value: "6000+",
    label: "Ramadan packs prepared",
    description: "Relief work organized by students, donors, and volunteers."
  },
  {
    value: "Children's Day",
    label: "Learning and play",
    description: "Activities that help children feel seen, included, and capable."
  },
  {
    value: "Visits",
    label: "Presence where it matters",
    description: "Teams showing up with care, attention, and consistency."
  },
  {
    value: "Blood Drive",
    label: "Access to help",
    description: "Connecting the AUC community to urgent forms of support."
  }
];

export const values = [
  {
    name: "Education",
    description: "Children's Day gives children a place to learn, play, ask, try, and feel seen."
  },
  {
    name: "Relief",
    description: "Ramadan packs and family support ease pressure in moments that can change a household's week."
  },
  {
    name: "Presence",
    description: "Visits turn care from an idea into someone showing up, listening, and staying."
  },
  {
    name: "Access",
    description: "Blood Drive, Be My Eyes, and initiatives connect the community to help they might not reach alone."
  }
];

// TODO: Confirm final program names and numerical targets before publishing.
export const mealSupportProgramName = "Et'am / Maeda";

export const yearlyGoals = [
  {
    title: "Ramadan Packs Across Egypt",
    target: "10,000 packs",
    category: "Food Support",
    description: "A large-scale seasonal campaign focused on essential food support during Ramadan through organized fundraising, packing, logistics, and distribution."
  },
  {
    title: "Clothing Support",
    target: "5,000 families",
    category: "Clothing Support",
    description: "Collecting, sorting, preparing, and distributing clothing in a respectful, organized way so families can receive useful support with dignity."
  },
  {
    title: "Meals Support",
    target: "30,000 meals",
    category: "Food Support",
    programName: mealSupportProgramName,
    description: `Supporting food access through organized ${mealSupportProgramName}-style meal preparation, packaging, and distribution efforts.`
  },
  {
    title: "Children's Development Days",
    target: "",
    category: "Children & Learning",
    description: "Designing safe, engaging experiences where children can learn, play, build confidence, and explore technology, English, and practical skills."
  },
  {
    title: "Micro Factory Initiative",
    target: "",
    category: "Employment Access",
    description: "Supporting pathways where people can explore practical skills, connect with work opportunities, or develop small income-generating projects."
  },
  {
    title: "Kheir Platform",
    target: "",
    category: "Digital Systems",
    description: "A digital platform that helps organize service activities, track impact, support operations, and make Resala's work more structured and sustainable."
  },
  {
    title: "Blood Drive & Health Awareness",
    target: "",
    category: "Health Awareness",
    description: "Mobilizing students around health-related campaigns through awareness, coordination, and participation where community needs are time-sensitive."
  },
  {
    title: "Resala Juniors Program",
    target: "",
    category: "Youth Development",
    description: "Helping younger participants learn responsibility, service values, teamwork, and leadership through age-appropriate activities."
  },
  {
    title: "Visits Program",
    target: "",
    category: "Community Visits",
    description: "Regular visits where volunteers show up, listen, support, and help address practical problems with care, respect, and consistency."
  },
  {
    title: "Roofing & Community Improvement",
    target: "",
    category: "Community Support",
    description: "Supporting practical improvements that can make homes and community spaces safer and more livable, based on confirmed needs and resources."
  },
  {
    title: "Be My Eyes Initiative",
    target: "",
    category: "Accessibility",
    description: "Creating accessibility-aware activities and facilitated experiences for visually impaired people, with respect for independence, choice, and dignity."
  }
];

export const roles = cycleRoleGuides.map((role) => ({
  id: role.id,
  name: displayName(role),
  headCount: role.heads?.length ?? 0,
  step: role.stepTitle,
  description: role.shortDescription,
  preparation: role.preparation,
  guidingQuestion: role.guidingQuestion
}));

export const processSteps = [
  "Read the committees and find the work you actually want to do",
  "Pick a first and a second head role, each on its own page",
  "Answer your committee's own questions and book an interview slot",
  "Get your confirmation email, then meet the people you would work with"
];

export const faqs = [
  {
    question: "What is open right now?",
    answer: "Head positions across every committee. The director and vice-director cycle is finished — these are the people who run the work day to day."
  },
  {
    question: "Who can apply?",
    answer: "AUC students who want to serve through Resala and can commit to the recruitment process."
  },
  {
    question: "Do I need previous experience?",
    answer: "No. Some roles benefit from experience, but commitment, clarity, and willingness to learn matter most."
  },
  {
    question: "Do I pick one role or two?",
    answer: "Two. You choose a first and a second preference, but the questions you answer and the interview you sit follow your first preference only."
  },
  {
    question: "Do I have to prepare a task?",
    answer: "Two committees do. Visits asks for a 1–2 page task for the head you picked, sent with your confirmation email. Children’s Day gives you a short trial task during the interview itself, with nothing to prepare. Every other committee is questions and conversation only."
  },
  {
    question: "How do interviews work?",
    answer: "You book your own slot at the end of the application. Slot lengths differ by committee. You get a Google Meet link, a calendar invitation, and a reminder an hour before."
  }
];
