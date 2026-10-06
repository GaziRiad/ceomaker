import { FREE_AI_LIMITS } from "@ceomaker/schema";

// What each plan includes, in one place for the landing page and Settings › Billing.

export const PRO_PRICES = {
  monthly: { price: "$19", amount: 19, per: "/ month", note: "Cancel any time" },
  annual: { price: "$190", amount: 190, per: "/ year", note: "$15.83 a month, billed yearly" },
} as const;

export const FREE_FEATURES = [
  "The Meridian and Harbour templates",
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
  "Redraft your site with AI any time, and more AI rewrites",
] as const;
