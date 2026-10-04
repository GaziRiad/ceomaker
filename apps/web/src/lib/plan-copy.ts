import { FREE_AI_LIMITS } from "@ceomaker/schema";

// What each plan includes, in one place for the landing page and Settings › Billing.

export const PRO_PRICES = {
  monthly: { price: "$9.99", amount: 9.99, per: "/ month", note: "Cancel any time" },
  annual: { price: "$99", amount: 99, per: "/ year", note: "$8.25 a month, billed yearly" },
} as const;

export const FREE_FEATURES = [
  "The Meridian template",
  "yourname.ceomaker.app address",
  `An AI first draft, and ${FREE_AI_LIMITS.rewritesPerDay} AI rewrites a day`,
  "Visitors reach you by email and your links",
  "A small “Made with CEOMaker” badge",
] as const;

export const PRO_FEATURES = [
  "Everything in Free, without the badge",
  "Monument and every new template",
  "Your own domain",
  "Contact form and Messages inbox",
  "Visitor analytics",
  "More AI rewrites, and drafting from your CV",
] as const;
