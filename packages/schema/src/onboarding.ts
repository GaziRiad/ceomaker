import { z } from "zod";
import { requiredText, text } from "./primitives";
import { richTextFromPlain } from "./rich-text";
import { CURRENT_SCHEMA_VERSION, type SiteContentInput } from "./site";
import type { TemplateKey } from "./templates";

// The guided questions. Choice labels are stored as answers, so renaming one is a data migration.

/** What the site is for: the first question, and what shapes the rest of the flow and the draft. */
export const SITE_GOALS = ["hired", "clients", "credibility", "other"] as const;
export type SiteGoal = (typeof SITE_GOALS)[number];

export const GOAL_CHOICES: readonly { value: SiteGoal; label: string; hint: string }[] = [
  {
    value: "hired",
    label: "Get hired",
    hint: "Job seekers, career changers, open to new roles",
  },
  {
    value: "clients",
    label: "Win clients",
    hint: "Freelancers, consultants, coaches, independents",
  },
  {
    value: "credibility",
    label: "Build credibility",
    hint: "Founders, executives, leaders, advisors",
  },
  { value: "other", label: "Something else", hint: "A professional site about me" },
];

/** A goal from an untrusted value (a link), or null. */
export function siteGoalFrom(value: unknown): SiteGoal | null {
  return SITE_GOALS.find((goal) => goal === value) ?? null;
}

/** Roles offered as one tap on the role question; the person can type anything. */
export const ROLE_SUGGESTIONS: Record<SiteGoal, readonly string[]> = {
  hired: [
    "Product Manager",
    "Accountant",
    "Nurse",
    "Software Engineer",
    "Marketing Manager",
    "Teacher",
    "Project Manager",
    "Sales Manager",
  ],
  clients: [
    "Consultant",
    "Coach",
    "Designer",
    "Photographer",
    "Lawyer",
    "Copywriter",
    "Therapist",
    "Real Estate Agent",
  ],
  credibility: ["Founder", "CEO", "Director", "VP", "Managing Partner", "Advisor", "Board Member"],
  other: ["Manager", "Specialist", "Researcher", "Analyst", "Creator"],
};

export const ROLE_MAX = 60;

export const INDUSTRY_OPTIONS = [
  "Technology",
  "Finance & Banking",
  "Healthcare",
  "Education",
  "Legal",
  "Marketing & Media",
  "Consulting",
  "Real Estate",
  "Hospitality & Tourism",
  "Manufacturing",
  "Retail & E-commerce",
  "Nonprofit & Public Sector",
  "Other",
] as const;
export type IndustryOption = (typeof INDUSTRY_OPTIONS)[number];

/** The industry as it reads in a sentence ("I'm a nurse in healthcare."). */
const INDUSTRY_PROSE: Record<Exclude<IndustryOption, "Other">, string> = {
  Technology: "technology",
  "Finance & Banking": "finance and banking",
  Healthcare: "healthcare",
  Education: "education",
  Legal: "law",
  "Marketing & Media": "marketing and media",
  Consulting: "consulting",
  "Real Estate": "real estate",
  "Hospitality & Tourism": "hospitality and tourism",
  Manufacturing: "manufacturing",
  "Retail & E-commerce": "retail and e-commerce",
  "Nonprofit & Public Sector": "the nonprofit and public sector",
};

/** Suggested roles whose industry is plain, so that question starts answered. */
const ROLE_INDUSTRIES: Record<string, IndustryOption> = {
  accountant: "Finance & Banking",
  nurse: "Healthcare",
  "software engineer": "Technology",
  "marketing manager": "Marketing & Media",
  teacher: "Education",
  consultant: "Consulting",
  lawyer: "Legal",
  copywriter: "Marketing & Media",
  therapist: "Healthcare",
  "real estate agent": "Real Estate",
};

/** The industry a role most likely belongs to, or null when it could be any. */
export function industryForRole(role: string | null | undefined): IndustryOption | null {
  return ROLE_INDUSTRIES[role?.trim().toLowerCase() ?? ""] ?? null;
}

/** Credibility headlines: industry → the phrase that completes "Building …". */
const INDUSTRY_PHRASES: Record<IndustryOption, string> = {
  Technology: "technology that earns its place",
  "Finance & Banking": "capital that compounds",
  Healthcare: "healthcare that reaches more people",
  Education: "learning that changes lives",
  Legal: "counsel that holds up",
  "Marketing & Media": "brands people come back to",
  Consulting: "advice that changes outcomes",
  "Real Estate": "places that last",
  "Hospitality & Tourism": "places people return to",
  Manufacturing: "industry that runs on precision",
  "Retail & E-commerce": "stores people come back to",
  "Nonprofit & Public Sector": "institutions that serve people well",
  Other: "work that holds up under pressure",
};

/** Short credibility headlines, used when AI rewriting is unavailable. */
const INDUSTRY_SHORT_HEADLINES: Record<IndustryOption, string> = {
  Technology: "Technology, built to last.",
  "Finance & Banking": "Capital that compounds.",
  Healthcare: "Care that reaches further.",
  Education: "Learning that lasts.",
  Legal: "Counsel that holds up.",
  "Marketing & Media": "Brands people return to.",
  Consulting: "Advice that changes outcomes.",
  "Real Estate": "Places that last.",
  "Hospitality & Tourism": "Places people return to.",
  Manufacturing: "Industry, run with precision.",
  "Retail & E-commerce": "Stores people return to.",
  "Nonprofit & Public Sector": "Institutions that serve.",
  Other: "Work that holds up.",
};

/** Industries of earlier answers with no match in today's list; kept by name under "Other". */
const LEGACY_OTHER_INDUSTRIES: Record<string, { phrase: string; short: string }> = {
  Logistics: {
    phrase: "supply chains that hold up under pressure",
    short: "Freight that holds up.",
  },
  Energy: { phrase: "energy systems for the next decade", short: "Energy for the next decade." },
};

/** Where the person works, and on what footing. */
export const COMPANY_STATUSES = ["employed", "between_roles", "independent"] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

/** What the site should bring, offered per goal (up to OUTCOME_LIMIT). */
export const OUTCOME_CHOICES: Record<SiteGoal, readonly string[]> = {
  hired: ["Recruiters reaching out", "Interview invitations", "Referrals"],
  clients: ["New leads", "Bookings", "Project inquiries"],
  credibility: ["Speaking invitations", "Press & media", "Investors or partners"],
  other: ["People contacting me", "A professional online presence", "Showcasing my work"],
};
export const OUTCOME_LIMIT = 2;

/** Goals of earlier answers that today's choices don't cover; kept so their meaning isn't lost. */
const LEGACY_OUTCOMES = [
  "Board and advisory roles",
  "Attracting talent",
  "A credible first result on Google",
] as const;

export const ALL_OUTCOMES = [
  ...new Set([...SITE_GOALS.flatMap((goal) => OUTCOME_CHOICES[goal]), ...LEGACY_OUTCOMES]),
] as [string, ...string[]];

/**
 * What each outcome makes the person open to (credibility sites) and the contact form topic it
 * adds. Null where it isn't an invitation, or not a reason to write.
 */
const OUTCOME_DETAILS: Record<
  string,
  { invitation: { long: string; short: string; noun: string } | null; topic: string | null }
> = {
  "Recruiters reaching out": { invitation: null, topic: "Job opportunity" },
  "Interview invitations": { invitation: null, topic: "Interview" },
  Referrals: { invitation: null, topic: "Referral" },
  "New leads": { invitation: null, topic: "Working together" },
  Bookings: { invitation: null, topic: "Booking" },
  "Project inquiries": { invitation: null, topic: "A project" },
  "Speaking invitations": {
    invitation: { long: "speaking invitations", short: "Speaking invitations", noun: "speaking" },
    topic: "Speaking",
  },
  "Press & media": {
    invitation: { long: "press and media requests", short: "Press and media", noun: "press" },
    topic: "Press",
  },
  "Investors or partners": {
    invitation: {
      long: "conversations with investors and partners",
      short: "Investors and partners",
      noun: "investor and partnership",
    },
    topic: "Investors and partners",
  },
  "People contacting me": { invitation: null, topic: null },
  "A professional online presence": { invitation: null, topic: null },
  "Showcasing my work": { invitation: null, topic: null },
  "Board and advisory roles": {
    invitation: {
      long: "board and advisory roles",
      short: "Board and advisory roles",
      noun: "board and advisory",
    },
    topic: "Board and advisory",
  },
  "Attracting talent": {
    invitation: { long: "meeting future colleagues", short: "Future colleagues", noun: "hiring" },
    topic: "Careers",
  },
  "A credible first result on Google": { invitation: null, topic: null },
};

/** Availability lines lead with the most specific outcome, not the order the user tapped them. */
const AVAILABILITY_PRIORITY: readonly string[] = [
  "Board and advisory roles",
  "Speaking invitations",
  "Investors or partners",
  "Press & media",
  "Attracting talent",
];

/** The site's main button, by goal. Every one opens the contact section. */
export const GOAL_CALL_TO_ACTION: Record<SiteGoal, string> = {
  hired: "Contact me",
  clients: "Book a call",
  credibility: "Get in touch",
  other: "Contact me",
};

/** The template offered first for each goal; the others stay one tap away. */
export const RECOMMENDED_TEMPLATE: Record<SiteGoal, TemplateKey> = {
  hired: "meridian",
  clients: "harbour",
  credibility: "meridian",
  other: "harbour",
};

export const VOICE_OPTIONS = [
  { label: "Measured", sample: "Calm and precise. Numbers do the talking." },
  { label: "Warm", sample: "First person and approachable, a little more personal." },
  { label: "Bold", sample: "Short sentences, strong claims. Suits founders." },
] as const;
export const VOICE_LABELS = ["Measured", "Warm", "Bold"] as const;
export type VoiceOption = (typeof VOICE_LABELS)[number];

export const SOURCE_OPTIONS = ["Upload a CV or LinkedIn PDF", "I'll add it later"] as const;
export type SourceOption = (typeof SOURCE_OPTIONS)[number];

/** The choice that means the user will hand us a file to draft from. */
export const DOCUMENT_SOURCE: SourceOption = "Upload a CV or LinkedIn PDF";

/**
 * Earlier answers offered a CV and a LinkedIn import separately; both meant the same file upload
 * (LinkedIn's own "Save to PDF"). Saved answers keep those words, so they still count.
 */
const LEGACY_DOCUMENT_SOURCES = new Set(["Upload CV (PDF or DOCX)", "Import from LinkedIn"]);

/**
 * The one current choice: legacy ones become the file upload, unknown ones are dropped, and the
 * upload wins over "later" (answers saved when both could be picked).
 */
export function normalizeSources(values: readonly string[]): SourceOption[] {
  const known = values.map((value) =>
    LEGACY_DOCUMENT_SOURCES.has(value) ? DOCUMENT_SOURCE : value,
  );
  return SOURCE_OPTIONS.filter((option) => known.includes(option)).slice(0, 1);
}

/** Whether the user wants to draft from a file, from answers saved at any time. */
export function wantsDocument(sources: readonly string[] | undefined): boolean {
  return normalizeSources(sources ?? []).includes(DOCUMENT_SOURCE);
}

/** The questions, in order. The CV choice at the end of the last one isn't counted as a step. */
export const ONBOARDING_STEPS = [
  { key: "goal", name: "What the site is for" },
  { key: "role", name: "Your role" },
  { key: "industry", name: "Your industry" },
  { key: "company", name: "Where you work" },
  { key: "outcomes", name: "What it should bring" },
  { key: "tone", name: "Voice and details" },
] as const;
export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"];

// Earlier answers (before October 2026) were written for executives only. They still arrive from
// saved sites, sign-in links and browsers, and read as a credibility site with the same facts.

const LEGACY_ROLES = [
  "Chief executive",
  "Founder",
  "Investor",
  "Board member",
  "Executive",
  "Managing partner",
  "Something else",
] as const;

const LEGACY_INDUSTRIES: Record<string, { industry: IndustryOption; other?: string }> = {
  Technology: { industry: "Technology" },
  Finance: { industry: "Finance & Banking" },
  Logistics: { industry: "Other", other: "Logistics" },
  Healthcare: { industry: "Healthcare" },
  Energy: { industry: "Other", other: "Energy" },
  Consumer: { industry: "Retail & E-commerce" },
  Industrial: { industry: "Manufacturing" },
  "Real estate": { industry: "Real Estate" },
  "Professional services": { industry: "Consulting" },
};

/** Organisation sizes of earlier answers, kept as they were said. */
const STAGE_OPTIONS = [
  "Early-stage startup",
  "Scale-up, 50–500 people",
  "Mid-size, 500–5,000",
  "Enterprise, 5,000+",
  "Fund or investment firm",
  "Advisory or portfolio career",
] as const;
type StageOption = (typeof STAGE_OPTIONS)[number];

const STAGE_CLAUSES: Record<StageOption, string> = {
  "Early-stage startup": "I lead an early-stage company",
  "Scale-up, 50–500 people": "I lead a scale-up of 50 to 500 people",
  "Mid-size, 500–5,000": "I lead a business of 500 to 5,000 people",
  "Enterprise, 5,000+": "I lead an organisation of more than 5,000 people",
  "Fund or investment firm": "I invest through a fund",
  "Advisory or portfolio career": "I hold a portfolio of board and advisory roles",
};

const LEGACY_GOALS: Record<string, string> = {
  "Speaking invitations": "Speaking invitations",
  "Board and advisory roles": "Board and advisory roles",
  "Investor relations": "Investors or partners",
  "Press and media": "Press & media",
  "Attracting talent": "Attracting talent",
  "A credible first result on Google": "A credible first result on Google",
};

const sourcesSchema = z.array(z.string().max(60)).max(6).default([]).transform(normalizeSources);

const currentAnswersSchema = z.object({
  version: z.literal(2),
  goal: z.enum(SITE_GOALS),
  role: requiredText(ROLE_MAX),
  industry: z.enum(INDUSTRY_OPTIONS),
  /** What "Other" means, in their words. */
  industryOther: text(40).default(""),
  org: text(80).default(""),
  orgStatus: z.enum(COMPANY_STATUSES).default("employed"),
  /** Up to OUTCOME_LIMIT today; earlier answers may hold more. */
  outcomes: z.array(z.enum(ALL_OUTCOMES)).min(1).max(6),
  /** The organisation's size, from earlier answers only. */
  stage: z.enum(STAGE_OPTIONS).optional(),
  voice: z.enum(VOICE_LABELS).default("Measured"),
  name: requiredText(60),
  sources: sourcesSchema,
});

export type OnboardingAnswers = z.output<typeof currentAnswersSchema>;

const legacyAnswersSchema = z
  .object({
    role: z.enum(LEGACY_ROLES),
    industry: z.enum(Object.keys(LEGACY_INDUSTRIES) as [string, ...string[]]),
    stage: z.enum(STAGE_OPTIONS).nullable().default(null),
    goals: z
      .array(z.enum(Object.keys(LEGACY_GOALS) as [string, ...string[]]))
      .min(1)
      .max(6),
    voice: z.enum(VOICE_LABELS).default("Measured"),
    name: requiredText(60),
    org: text(80).default(""),
    sources: sourcesSchema,
  })
  .transform((old): OnboardingAnswers => ({
    version: 2,
    goal: "credibility",
    role: old.role === "Something else" ? "Leader" : old.role,
    industry: LEGACY_INDUSTRIES[old.industry]!.industry,
    industryOther: LEGACY_INDUSTRIES[old.industry]!.other ?? "",
    org: old.org,
    orgStatus: "employed",
    outcomes: old.goals.map((goal) => LEGACY_GOALS[goal]!),
    ...(old.stage ? { stage: old.stage } : {}),
    voice: old.voice,
    name: old.name,
    sources: old.sources,
  }));

/** Answers of any age; earlier ones come out in today's shape. */
export const onboardingAnswersSchema = z.union([currentAnswersSchema, legacyAnswersSchema]);
export type OnboardingAnswersInput = z.input<typeof currentAnswersSchema>;

/** Answers saved on a site (any age), or null when there are none or they don't read. */
export function readStoredAnswers(value: unknown): OnboardingAnswers | null {
  if (value === null || value === undefined) return null;
  const parsed = onboardingAnswersSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Answers while the user is still clicking through: anything may be missing. */
export interface AnswersDraft {
  goal?: SiteGoal | null;
  role?: string;
  industry?: IndustryOption | null;
  industryOther?: string;
  org?: string;
  orgStatus?: CompanyStatus;
  outcomes?: readonly string[];
  voice?: VoiceOption;
  name?: string;
  sources?: readonly SourceOption[];
}

/**
 * Unfinished answers kept in a browser, of any age: earlier executive answers read as a
 * credibility site. Anything unknown is dropped.
 */
export function draftFromStored(value: unknown): AnswersDraft {
  if (typeof value !== "object" || value === null) return {};
  const raw = value as Record<string, unknown>;
  const str = (key: string, max: number) =>
    typeof raw[key] === "string" ? (raw[key] as string).slice(0, max) : undefined;
  const legacy = !("goal" in raw) && ("goals" in raw || "stage" in raw || "role" in raw);
  const legacyIndustry = legacy ? LEGACY_INDUSTRIES[String(raw.industry)] : undefined;
  const industry = legacyIndustry
    ? legacyIndustry.industry
    : (INDUSTRY_OPTIONS.find((option) => option === raw.industry) ?? null);
  const outcomeList = Array.isArray(legacy ? raw.goals : raw.outcomes)
    ? ((legacy ? raw.goals : raw.outcomes) as unknown[])
    : [];
  const outcomes = outcomeList
    .map((item) => (legacy ? LEGACY_GOALS[String(item)] : String(item)))
    .filter((item): item is string => Boolean(item) && ALL_OUTCOMES.includes(item!));
  const role = str("role", ROLE_MAX);
  const status = COMPANY_STATUSES.find((option) => option === raw.orgStatus);
  const voice = VOICE_LABELS.find((option) => option === raw.voice);
  const goal = legacy ? "credibility" : siteGoalFrom(raw.goal);
  return {
    ...(goal ? { goal } : {}),
    ...(role && role !== "Something else" ? { role } : {}),
    ...(industry ? { industry } : {}),
    ...(legacyIndustry?.other
      ? { industryOther: legacyIndustry.other }
      : str("industryOther", 40)
        ? { industryOther: str("industryOther", 40) }
        : {}),
    ...(str("org", 80) ? { org: str("org", 80) } : {}),
    ...(status ? { orgStatus: status } : {}),
    outcomes,
    ...(voice ? { voice } : {}),
    ...(str("name", 60) ? { name: str("name", 60) } : {}),
    sources: normalizeSources(
      Array.isArray(raw.sources) ? raw.sources.map((item) => String(item)) : [],
    ),
  };
}

/** Finished answers from the questions screen, or null while something required is missing. */
export function answersFromDraft(draft: AnswersDraft): OnboardingAnswers | null {
  const parsed = currentAnswersSchema.safeParse({
    ...draft,
    version: 2,
    role: draft.role?.trim(),
    name: draft.name?.trim(),
    org: draft.org?.trim() ?? "",
    industryOther: draft.industry === "Other" ? (draft.industryOther?.trim() ?? "") : "",
  });
  return parsed.success ? parsed.data : null;
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
    return readStoredAnswers(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

/** The industry as the person named it: a listed one, what they typed for "Other", or "". */
export function industryLabel(answers: Pick<AnswersDraft, "industry" | "industryOther">): string {
  if (!answers.industry) return "";
  return answers.industry === "Other" ? (answers.industryOther?.trim() ?? "") : answers.industry;
}

/** The industry in a sentence: "healthcare", "finance and banking", or what they typed. */
function industryProse(answers: Pick<AnswersDraft, "industry" | "industryOther">): string {
  if (!answers.industry) return "";
  if (answers.industry !== "Other") return INDUSTRY_PROSE[answers.industry];
  const typed = answers.industryOther?.trim() ?? "";
  // "Logistics" reads "logistics"; anything with more capitals ("SaaS", "NGO") stays as typed.
  return /^[A-Z][^A-Z]*$/.test(typed) ? typed[0]!.toLowerCase() + typed.slice(1) : typed;
}

/** The phrase completing a credibility headline's "Building …". */
export function industryPhrase(answers: Pick<AnswersDraft, "industry" | "industryOther">): string {
  if (!answers.industry) return INDUSTRY_PHRASES.Other;
  const legacy =
    answers.industry === "Other"
      ? LEGACY_OTHER_INDUSTRIES[answers.industryOther?.trim() ?? ""]
      : null;
  return legacy?.phrase ?? INDUSTRY_PHRASES[answers.industry];
}

/** A short credibility headline, used when AI rewriting is unavailable. */
export function shortIndustryHeadline(
  answers: Pick<AnswersDraft, "industry" | "industryOther">,
): string {
  if (!answers.industry) return INDUSTRY_SHORT_HEADLINES.Other;
  const legacy =
    answers.industry === "Other"
      ? LEGACY_OTHER_INDUSTRIES[answers.industryOther?.trim() ?? ""]
      : null;
  return legacy?.short ?? INDUSTRY_SHORT_HEADLINES[answers.industry];
}

function withArticle(word: string): string {
  return `${/^[aeiou]/i.test(word) ? "an" : "a"} ${word}`;
}

function invitationsOf(outcomes: readonly string[]) {
  return ALL_OUTCOMES.filter((outcome) => outcomes.includes(outcome))
    .map((outcome) => OUTCOME_DETAILS[outcome]?.invitation ?? null)
    .filter((value) => value !== null);
}

/** "I'm a nurse in healthcare, most recently at St Mary's." Never "currently" between roles. */
function introSentence(answers: OnboardingAnswers): string {
  const industry = industryProse(answers);
  const org = answers.org.trim();
  const where =
    answers.orgStatus === "between_roles"
      ? org
        ? `, most recently at ${org}`
        : ""
      : answers.orgStatus === "independent"
        ? ", working independently"
        : org
          ? answers.goal === "credibility"
            ? `, leading ${org}`
            : ` at ${org}`
          : "";
  const sentence = `I'm ${withArticle(answers.role)}${industry ? ` in ${industry}` : ""}${where}.`;
  return answers.stage ? `${sentence} ${STAGE_CLAUSES[answers.stage]}.` : sentence;
}

/** The availability line templates show by the name, by goal. Null when there's nothing to say. */
export function availabilityFor(
  answers: Pick<OnboardingAnswers, "goal" | "outcomes">,
): { availability: string; availabilityShort: string } | null {
  switch (answers.goal) {
    case "hired":
      return { availability: "Open to new roles", availabilityShort: "Open to new roles" };
    case "clients":
      return { availability: "Taking on new clients", availabilityShort: "New clients" };
    case "other":
      return null;
    case "credibility": {
      const outcome = AVAILABILITY_PRIORITY.find((candidate) =>
        answers.outcomes.includes(candidate),
      );
      const invitation = outcome ? OUTCOME_DETAILS[outcome]?.invitation : null;
      return invitation
        ? { availability: `Open to ${invitation.long}`, availabilityShort: invitation.short }
        : null;
    }
  }
}

/** The second line of the hero and of About: what the person is open to, by goal. */
function openTo(answers: OnboardingAnswers): string {
  switch (answers.goal) {
    case "hired":
      return "open to new roles";
    case "clients":
      return "taking on new clients";
    case "other":
      return "";
    case "credibility": {
      const open = invitationsOf(answers.outcomes)
        .slice(0, 2)
        .map((invitation) => invitation.long);
      return open.length ? `open to ${open.join(" and ")}` : "";
    }
  }
}

/** The contact section's invitation line, by goal. */
export function contactInvitation(answers: Pick<OnboardingAnswers, "goal" | "outcomes">): string {
  switch (answers.goal) {
    case "hired":
      return "For job opportunities and introductions.";
    case "clients":
      return answers.outcomes.includes("Bookings")
        ? "For new projects and bookings."
        : "For new projects and enquiries.";
    case "other":
      return "For enquiries and introductions.";
    case "credibility": {
      const nouns = invitationsOf(answers.outcomes)
        .slice(0, 2)
        .map((invitation) => invitation.noun);
      return nouns.length
        ? `For ${nouns.join(", ")} enquiries.`
        : "For enquiries and introductions.";
    }
  }
}

/** Contact form topics from the outcomes, in the order they're listed, plus "Something else". */
export function formTopicsFromOutcomes(outcomes: readonly string[]): string[] {
  const topics = ALL_OUTCOMES.filter((outcome) => outcomes.includes(outcome))
    .map((outcome) => OUTCOME_DETAILS[outcome]?.topic ?? null)
    .filter((topic) => topic !== null);
  return topics.length ? [...topics, "Something else"] : [];
}

/** The section ids of a draft, in the order the goal puts first what its readers look for. */
export function sectionOrderFor(goal: SiteGoal): readonly string[] {
  switch (goal) {
    case "hired":
      return ["about", "experience", "focus", "impact", "work", "testimonials"];
    case "clients":
      return ["about", "focus", "impact", "testimonials", "work", "experience"];
    default:
      return ["impact", "about", "focus", "experience", "work", "testimonials"];
  }
}

/** The Focus section's title by goal: what it lists for those readers. */
export const FOCUS_HEADINGS: Partial<Record<SiteGoal, string>> = {
  hired: "Skills",
  clients: "Services",
};

/**
 * A complete, honest first draft built only from the answers. Sections that need facts we
 * don't have yet (numbers, past roles, skills, services, work, quotes) start hidden and empty,
 * so nothing invented can ever be published. AI generation later rewrites the copy in the
 * chosen voice.
 */
export function buildStarterContent(
  answers: OnboardingAnswers,
  options: { email?: string | undefined } = {},
): SiteContentInput {
  const org = answers.org.trim();
  const employed = answers.orgStatus === "employed" && org !== "";
  const credibility = answers.goal === "credibility";
  const availability = availabilityFor(answers);
  const intro = introSentence(answers);
  const open = openTo(answers);
  const industry = industryProse(answers);
  const headline = credibility
    ? `${answers.voice === "Bold" ? "I build" : "Building"} ${industryPhrase(answers)}.`
    : `${answers.role}${industry ? ` in ${industry}` : ""}.`;
  const eyebrow =
    answers.role +
    (employed ? `, ${org}` : answers.orgStatus === "independent" ? " · Independent" : "");
  const focusHeading = FOCUS_HEADINGS[answers.goal];

  const middle: Record<string, SiteContentInput["sections"][number]> = {
    impact: { id: "impact", type: "achievements", visible: false, items: [] },
    about: {
      id: "about",
      type: "about",
      body: richTextFromPlain([intro, open ? `I'm ${open}.` : ""].filter(Boolean).join("\n\n")),
    },
    focus: {
      id: "focus",
      type: "focus",
      visible: false,
      items: [],
      ...(focusHeading ? { heading: focusHeading } : {}),
    },
    experience: {
      id: "experience",
      type: "experience",
      visible: false,
      items: employed ? [{ role: answers.role, organization: org }] : [],
    },
    work: { id: "work", type: "portfolio", visible: false, items: [] },
    testimonials: { id: "testimonials", type: "testimonials", visible: false, items: [] },
  };

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    meta: {
      name: answers.name,
      role: answers.role,
      ...(employed ? { company: org } : {}),
      ...(availability ?? {}),
      // Templates title this list "Boards & affiliations": only leaders' organisations go in.
      affiliations: credibility && employed ? [org] : [],
      keywords: [answers.role, industryLabel(answers)].filter(Boolean),
    },
    sections: [
      {
        id: "hero",
        type: "hero",
        eyebrow,
        headline,
        subheadline: open ? `${intro} ${open[0]!.toUpperCase()}${open.slice(1)}.` : intro,
        primaryCta: { label: GOAL_CALL_TO_ACTION[answers.goal], href: "#contact" },
      },
      ...sectionOrderFor(answers.goal).map((id) => middle[id]!),
      {
        id: "contact",
        type: "contact",
        blurb: contactInvitation(answers),
        ...(options.email ? { email: options.email } : {}),
        links: [],
        form: { enabled: true, topics: formTopicsFromOutcomes(answers.outcomes) },
      },
    ],
  };
}
