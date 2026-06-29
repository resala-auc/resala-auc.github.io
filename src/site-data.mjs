import { roleGuides } from "./role-guide-data.mjs";

export const navItems = [
  { label: "00 Campaign", href: "#campaign" },
  { label: "01 Impact", href: "#impact" },
  { label: "02 Roles", href: "#roles" },
  { label: "03 Process", href: "#process" },
  { label: "04 FAQ", href: "#faq" },
  { label: "05 Submit Tasks", href: "./tasks/" }
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

export const roles = roleGuides.map((role) => ({
  id: role.id,
  name: role.name,
  step: role.stepTitle,
  description: role.shortDescription,
  preparation: role.preparation,
  guidingQuestion: role.guidingQuestion
}));

export const processSteps = [
  "Explore the mission, impact, and role expectations",
  "Choose where your strengths can build the first step",
  "Submit the role-based application form",
  "Attend your interview and meet the team"
];

export const faqs = [
  {
    question: "Who can apply?",
    answer: "AUC students who want to serve through Resala and can commit to the recruitment process."
  },
  {
    question: "Do I need previous experience?",
    answer: "No. Some roles benefit from experience, but commitment, clarity, and willingness to learn matter most."
  },
  {
    question: "Can I apply for more than one role?",
    answer: "Use the form to apply for the role you want the team to review first."
  },
  {
    question: "Where do I apply?",
    answer: "Use the Apply Now button or choose Apply from any role row to open the application form."
  },
  {
    question: "How will interviews work?",
    answer: "Shortlisted applicants will be contacted with their interview details after the application period starts."
  }
];
