import { ROLE_OPTIONS } from "@ceomaker/schema";

export const heroRoles = ROLE_OPTIONS;

export const heroWords = "A personal website that matches your standing.".split(" ");

export const audiences = [
  "Chief executives",
  "Founders",
  "Board members",
  "Investors",
  "Managing partners",
  "Chief financial officers",
  "Non-executive directors",
];

export const realities = [
  {
    delay: 0,
    n: "1st",
    t: "Your name is searched before almost every serious meeting, introduction or offer.",
  },
  {
    delay: 110,
    n: "3 lines",
    t: "That's usually all a company bio says about you, and it's written for the company.",
  },
  {
    delay: 220,
    n: "0",
    t: "Places online where your story is told in your words, in one place, on your terms.",
  },
];

type Mark = "✓" | "–";

export const compare: {
  delay: number;
  name: string;
  time: string;
  cost: string;
  highlight: boolean;
  rows: [Mark, string][];
}[] = [
  {
    delay: 0,
    name: "CEOMaker",
    time: "Minutes",
    cost: "Free, or $19 a month for Pro",
    highlight: true,
    rows: [
      ["✓", "Copy drafted in your voice"],
      ["✓", "Templates designed for executives"],
      ["✓", "Edit anything, instantly"],
      ["✓", "Hosting and security included"],
    ],
  },
  {
    delay: 110,
    name: "Design agency",
    time: "6–10 weeks",
    cost: "$5,000 to $20,000 upfront",
    highlight: false,
    rows: [
      ["✓", "Copy written for you"],
      ["✓", "Bespoke design"],
      ["–", "Every change is a billable request"],
      ["–", "Hosting often extra"],
    ],
  },
  {
    delay: 220,
    name: "DIY site builder",
    time: "Weekends",
    cost: "$15 to $40 a month, plus your time",
    highlight: false,
    rows: [
      ["–", "You write every line"],
      ["–", "Generic templates"],
      ["✓", "Edit anything"],
      ["✓", "Hosting included"],
    ],
  },
];

/**
 * Customer quotes for the testimonials band. Empty until there are real, approved quotes from
 * real customers: the band is hidden rather than showing invented endorsements.
 */
export const quotes: { quote: string; name: string; initials: string; role: string }[] = [];

export const faq: [string, string][] = [
  [
    "How long does it take?",
    "About two minutes of questions, then a first draft in under a minute. Most people publish the same evening.",
  ],
  [
    "Do I have to write anything?",
    "Only your name. Everything else is a tap. Add a CV or LinkedIn PDF and it fills in your experience.",
  ],
  [
    "Who can see my site before I publish?",
    "Only you. Drafts are private, and nothing goes live until you choose to publish.",
  ],
  [
    "Can I use my own domain?",
    "Yes, with Pro. On the free plan your site lives at yourname.ceomaker.app.",
  ],
  [
    "What happens if I cancel Pro?",
    "Your site stays live on the free plan, at yourname.ceomaker.app with the badge; a Pro template shows as Meridian. Nothing is deleted, and upgrading again brings everything back.",
  ],
  [
    "Is my information used to train AI?",
    "No. Your answers and CV are used only to write your site.",
  ],
];
