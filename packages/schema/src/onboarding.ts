import { z } from "zod";
import { requiredText, text } from "./primitives";
import { richTextFromPlain } from "./rich-text";
import { CURRENT_SCHEMA_VERSION, type SiteContentInput } from "./site";

// The guided questions. Labels are stored as answers, so renaming one is a data migration.

export const ROLE_OPTIONS = [
  "Chief executive",
  "Founder",
  "Investor",
  "Board member",
  "Executive",
  "Managing partner",
  "Something else",
] as const;
export type RoleOption = (typeof ROLE_OPTIONS)[number];

/** Industry → the phrase that completes "Building …" in the first headline. */
export const INDUSTRY_PHRASES = {
  Technology: "technology that earns its place",
  Finance: "capital that compounds",
  Logistics: "supply chains that hold up under pressure",
  Healthcare: "healthcare that reaches more people",
  Energy: "energy systems for the next decade",
  Consumer: "brands people come back to",
  Industrial: "industry that runs on precision",
  "Real estate": "places that last",
  "Professional services": "advice that changes outcomes",
} as const;
export type IndustryOption = keyof typeof INDUSTRY_PHRASES;
export const INDUSTRY_OPTIONS = Object.keys(INDUSTRY_PHRASES) as [
  IndustryOption,
  ...IndustryOption[],
];

/** Short headlines per industry, used when AI rewriting is unavailable. */
export const INDUSTRY_SHORT_HEADLINES: Record<IndustryOption, string> = {
  Technology: "Technology, built to last.",
  Finance: "Capital that compounds.",
  Logistics: "Freight that holds up.",
  Healthcare: "Care that reaches further.",
  Energy: "Energy for the next decade.",
  Consumer: "Brands people return to.",
  Industrial: "Industry, run with precision.",
  "Real estate": "Places that last.",
  "Professional services": "Advice that changes outcomes.",
};

export const STAGE_OPTIONS = [
  "Early-stage startup",
  "Scale-up, 50–500 people",
  "Mid-size, 500–5,000",
  "Enterprise, 5,000+",
  "Fund or investment firm",
  "Advisory or portfolio career",
] as const;
export type StageOption = (typeof STAGE_OPTIONS)[number];

export const GOAL_OPTIONS = [
  "Speaking invitations",
  "Board and advisory roles",
  "Investor relations",
  "Press and media",
  "Attracting talent",
  "A credible first result on Google",
] as const;
export type GoalOption = (typeof GOAL_OPTIONS)[number];

export const VOICE_OPTIONS = [
  { label: "Measured", sample: "Calm and precise. Numbers do the talking." },
  { label: "Warm", sample: "First person and approachable, a little more personal." },
  { label: "Bold", sample: "Short sentences, strong claims. Suits founders." },
] as const;
export const VOICE_LABELS = ["Measured", "Warm", "Bold"] as const;
export type VoiceOption = (typeof VOICE_LABELS)[number];

export const SOURCE_OPTIONS = [
  "Upload CV (PDF or DOCX)",
  "Import from LinkedIn",
  "I'll add it later",
] as const;
export type SourceOption = (typeof SOURCE_OPTIONS)[number];

/** Sources that mean the user wants to hand us a document to draft from. */
export const DOCUMENT_SOURCES: ReadonlySet<SourceOption> = new Set([
  "Upload CV (PDF or DOCX)",
  "Import from LinkedIn",
]);

export const ONBOARDING_STEP_NAMES = [
  "Your role",
  "Your industry",
  "Your organisation",
  "What the site is for",
  "Voice and details",
] as const;

export const onboardingAnswersSchema = z.object({
  role: z.enum(ROLE_OPTIONS),
  industry: z.enum(INDUSTRY_OPTIONS),
  /** Skippable step. */
  stage: z.enum(STAGE_OPTIONS).nullable().default(null),
  goals: z.array(z.enum(GOAL_OPTIONS)).min(1).max(GOAL_OPTIONS.length),
  voice: z.enum(VOICE_LABELS).default("Measured"),
  name: requiredText(60),
  org: text(80).default(""),
  sources: z.array(z.enum(SOURCE_OPTIONS)).max(SOURCE_OPTIONS.length).default([]),
});

export type OnboardingAnswers = z.output<typeof onboardingAnswersSchema>;
export type OnboardingAnswersInput = z.input<typeof onboardingAnswersSchema>;

/** Answers while the user is still clicking through: anything may be missing. */
export interface AnswersDraft {
  role?: RoleOption | null;
  industry?: IndustryOption | null;
  stage?: StageOption | null;
  goals?: readonly GoalOption[];
  voice?: VoiceOption;
  name?: string;
  org?: string;
  sources?: readonly SourceOption[];
}

// Answers travel through the sign-in link (so they survive opening it on another device),
// encoded as base64url JSON. Decoding validates them like any other untrusted input.

export function encodeAnswers(answers: OnboardingAnswersInput): string {
  const bytes = new TextEncoder().encode(JSON.stringify(answers));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeAnswers(value: string): OnboardingAnswers | null {
  if (value.length > 4000) return null;
  try {
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed = onboardingAnswersSchema.safeParse(JSON.parse(new TextDecoder().decode(bytes)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const STAGE_CLAUSES: Record<StageOption, string> = {
  "Early-stage startup": "I lead an early-stage company",
  "Scale-up, 50–500 people": "I lead a scale-up of 50 to 500 people",
  "Mid-size, 500–5,000": "I lead a business of 500 to 5,000 people",
  "Enterprise, 5,000+": "I lead an organisation of more than 5,000 people",
  "Fund or investment firm": "I invest through a fund",
  "Advisory or portfolio career": "I hold a portfolio of board and advisory roles",
};

/** "I'm the chief executive of Meridian Freight Group." / "I'm with Meridian Freight Group." */
const ROLE_AT: Record<RoleOption, string> = {
  "Chief executive": "the chief executive of",
  Founder: "the founder of",
  Investor: "an investor at",
  "Board member": "a board member at",
  Executive: "an executive at",
  "Managing partner": "a managing partner at",
  "Something else": "with",
};

/** What each goal makes the person "open to". Null when the goal is not an invitation. */
const GOAL_INVITATIONS: Record<GoalOption, { long: string; short: string; noun: string } | null> = {
  "Speaking invitations": {
    long: "speaking invitations",
    short: "Speaking invitations",
    noun: "speaking",
  },
  "Board and advisory roles": {
    long: "board and advisory roles",
    short: "Board and advisory roles",
    noun: "board and advisory",
  },
  "Investor relations": {
    long: "conversations with investors",
    short: "Investor conversations",
    noun: "investor",
  },
  "Press and media": { long: "press and media requests", short: "Press and media", noun: "press" },
  "Attracting talent": {
    long: "meeting future colleagues",
    short: "Future colleagues",
    noun: "hiring",
  },
  "A credible first result on Google": null,
};

/** Availability lines lead with the most specific goal, not the order the user tapped them. */
const AVAILABILITY_PRIORITY: readonly GoalOption[] = [
  "Board and advisory roles",
  "Speaking invitations",
  "Investor relations",
  "Press and media",
  "Attracting talent",
];

function invitationsOf(goals: readonly GoalOption[]) {
  return GOAL_OPTIONS.filter((goal) => goals.includes(goal))
    .map((goal) => GOAL_INVITATIONS[goal])
    .filter((value) => value !== null);
}

export function roleLabel(role: RoleOption | null | undefined): string | null {
  return role && role !== "Something else" ? role : null;
}

export interface AnswersPreview {
  name: string;
  company: string;
  eyebrow: string;
  headline: string;
  subheadline: string;
}

/** The live preview on the questions screen, and the starting point of every draft. */
export function previewFromAnswers(answers: AnswersDraft): AnswersPreview {
  const name = answers.name?.trim() || "Your Name";
  const org = answers.org?.trim() ?? "";
  const role = roleLabel(answers.role) ?? "Leader";
  const phrase = answers.industry
    ? INDUSTRY_PHRASES[answers.industry]
    : "work that holds up under pressure";
  const lead = answers.stage ? STAGE_CLAUSES[answers.stage] : "I lead a growing organisation";
  const industry = answers.industry ? ` in ${answers.industry.toLowerCase()}` : "";
  const open = invitationsOf(answers.goals ?? [])
    .slice(0, 2)
    .map((invitation) => invitation.long);
  return {
    name,
    company: org || "Your organisation",
    eyebrow: role + (org ? `, ${org}` : answers.stage ? ` · ${answers.stage}` : ""),
    headline: `${answers.voice === "Bold" ? "I build" : "Building"} ${phrase}.`,
    subheadline: `${lead}${industry}.${open.length ? ` Open to ${open.join(" and ")}.` : ""}`,
  };
}

/** "For speaking, board and advisory enquiries." */
export function contactInvitation(goals: readonly GoalOption[]): string {
  const nouns = invitationsOf(goals)
    .slice(0, 2)
    .map((invitation) => invitation.noun);
  return nouns.length ? `For ${nouns.join(", ")} enquiries.` : "For enquiries and introductions.";
}

export function availabilityFromGoals(
  goals: readonly GoalOption[],
): { availability: string; availabilityShort: string } | null {
  const goal = AVAILABILITY_PRIORITY.find((candidate) => goals.includes(candidate));
  const invitation = goal ? GOAL_INVITATIONS[goal] : null;
  if (!invitation) return null;
  return { availability: `Open to ${invitation.long}`, availabilityShort: invitation.short };
}

/**
 * A complete, honest first draft built only from the answers. Sections that need facts we
 * don't have yet (numbers, past roles, work, quotes) start hidden and empty, so nothing
 * invented can ever be published. AI generation later rewrites the copy in the chosen voice.
 */
export function buildStarterContent(
  answers: OnboardingAnswers,
  options: { email?: string | undefined } = {},
): SiteContentInput {
  const preview = previewFromAnswers(answers);
  const role = roleLabel(answers.role);
  const org = answers.org.trim();
  const availability = availabilityFromGoals(answers.goals);
  const open = invitationsOf(answers.goals)
    .slice(0, 2)
    .map((invitation) => invitation.long);
  const lead = answers.stage ? STAGE_CLAUSES[answers.stage] : "I lead a growing organisation";

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    meta: {
      name: answers.name,
      ...(role ? { role } : {}),
      ...(org ? { company: org } : {}),
      ...(availability ?? {}),
      affiliations: org ? [org] : [],
      keywords: [role, answers.industry].filter((value): value is string => Boolean(value)),
    },
    sections: [
      {
        id: "hero",
        type: "hero",
        eyebrow: preview.eyebrow,
        headline: preview.headline,
        subheadline: preview.subheadline,
        primaryCta: { label: "Get in touch", href: "#contact" },
      },
      { id: "impact", type: "achievements", visible: false, items: [] },
      {
        id: "about",
        type: "about",
        body: richTextFromPlain(
          [
            [
              org ? `I'm ${ROLE_AT[answers.role]} ${org}.` : "",
              `${lead} in ${answers.industry.toLowerCase()}.`,
            ]
              .filter(Boolean)
              .join(" "),
            open.length ? `I'm open to ${open.join(" and ")}.` : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
        ),
      },
      {
        id: "experience",
        type: "experience",
        visible: false,
        items: org && role ? [{ role, organization: org }] : [],
      },
      { id: "work", type: "portfolio", visible: false, items: [] },
      { id: "testimonials", type: "testimonials", visible: false, items: [] },
      {
        id: "contact",
        type: "contact",
        blurb: contactInvitation(answers.goals),
        ...(options.email ? { email: options.email } : {}),
        links: [],
      },
    ],
  };
}
