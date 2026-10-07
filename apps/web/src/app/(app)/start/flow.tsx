"use client";

import {
  answersFromDraft,
  defaultColors,
  DOCUMENT_SOURCE,
  encodeAnswers,
  formTopicsFromOutcomes,
  GOAL_CHOICES,
  industryForRole,
  INDUSTRY_OPTIONS,
  latestTemplateVersion,
  normalizeSources,
  ONBOARDING_STEPS,
  OUTCOME_CHOICES,
  OUTCOME_LIMIT,
  ROLE_MAX,
  ROLE_SUGGESTIONS,
  SOURCE_OPTIONS,
  suggestSubdomains,
  VOICE_OPTIONS,
  type AnswersDraft,
  type CompanyStatus,
  type OnboardingStepKey,
  type RenderableSiteContent,
  type SiteGoal,
} from "@ceomaker/schema";
import { TemplateView } from "@ceomaker/templates";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { LinkedInPdfHint } from "@/components/document-file";
import { ScaledFrame } from "@/components/scaled-frame";
import { trackEvent } from "@/lib/product-analytics/browser";
import { AddressBar, ArrowRight, Blueprint, Wordmark } from "@/components/ui";
import { finishOnboarding } from "./actions";
import { clearFlow, hasProgress, loadFlow, saveFlow } from "./storage";

const LAST_STEP = ONBOARDING_STEPS.length - 1;
const STEP = Object.fromEntries(ONBOARDING_STEPS.map((step, index) => [step.key, index])) as Record<
  OnboardingStepKey,
  number
>;
const FRESH_ANSWERS: AnswersDraft = { voice: "Measured", outcomes: [], sources: [] };
const PREVIEW_DATE = new Date("2026-01-01T00:00:00Z");

const PREVIEW_HEIGHT = 560;
/** The preview shows the design a new site starts on. */
const PREVIEW_TEMPLATE = { key: "meridian", version: latestTemplateVersion("meridian") } as const;

/** The company question, by goal: its label and the one-tap answers that need no name. */
const COMPANY_QUESTION: Record<
  SiteGoal,
  { title: string; placeholder: string; statuses: { status: CompanyStatus; label: string }[] }
> = {
  hired: {
    title: "I currently or most recently worked at…",
    placeholder: "Northwind",
    statuses: [{ status: "between_roles", label: "Between roles" }],
  },
  clients: {
    title: "My business is called…",
    placeholder: "Reyes Coaching",
    statuses: [{ status: "independent", label: "Independent, just me" }],
  },
  credibility: { title: "I lead…", placeholder: "Meridian Freight Group", statuses: [] },
  other: {
    title: "I work at…",
    placeholder: "Northwind",
    statuses: [
      { status: "between_roles", label: "Between roles" },
      { status: "independent", label: "Independent" },
    ],
  },
};

/**
 * The questions screen preview: Meridian in draft mode with only what the person has chosen or
 * typed. Nothing is made up; everything else is a grey line until the draft is written.
 */
function draftContent(answers: AnswersDraft): RenderableSiteContent {
  const org = answers.org?.trim();
  const employed = org && (answers.orgStatus ?? "employed") === "employed";
  const title = [answers.role?.trim(), employed ? org : null].filter(Boolean).join(", ");
  return {
    meta: { name: answers.name?.trim() ?? "", affiliations: [], keywords: [] },
    sections: [
      { id: "hero", type: "hero", visible: true, eyebrow: title, headline: "" },
      {
        id: "contact",
        type: "contact",
        visible: true,
        links: [],
        form: { enabled: true, topics: formTopicsFromOutcomes(answers.outcomes ?? []) },
      },
    ],
    droppedSections: 0,
  };
}

/** The template as it takes shape, always from the top of the page. */
function DraftPreview({ content }: { content: RenderableSiteContent }) {
  return (
    <ScaledFrame initialZoom={0.45} style={{ height: PREVIEW_HEIGHT }}>
      <TemplateView
        templateKey={PREVIEW_TEMPLATE.key}
        templateVersion={PREVIEW_TEMPLATE.version}
        colors={defaultColors(PREVIEW_TEMPLATE.key, PREVIEW_TEMPLATE.version)}
        content={content}
        publishedAt={PREVIEW_DATE}
        preview
        draft
      />
    </ScaledFrame>
  );
}

function Chip({
  label,
  selected,
  onClick,
  disabled,
  fontSize = 17,
  className = "",
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  fontSize?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      disabled={disabled}
      className={`chip disabled:opacity-45 ${className}`}
      style={{ fontSize }}
    >
      {selected ? <span className="text-accent-700">✓</span> : null}
      {label}
    </button>
  );
}

export function QuestionsFlow({
  start,
  signedIn,
  addressPrefix,
  addressSuffix,
}: {
  /**
   * A goal chosen before the questions: they open on the role question. From a link (ads) the
   * goal isn't counted as a step; from the home page, which asked it, it is.
   */
  start: { goal: SiteGoal; role: string | null; fromHome: boolean } | null;
  signedIn: boolean;
  addressPrefix: string;
  addressSuffix: string;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<AnswersDraft>(FRESH_ANSWERS);
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [resumed, setResumed] = useState(false);
  // Arrived from a link with the goal chosen: steps count from the role question until they go
  // back to it.
  const fromDeepLink = start !== null && !start.fromHome;
  const [goalShown, setGoalShown] = useState(!fromDeepLink);
  const [roleChipUsed, setRoleChipUsed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const advanceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Restore saved answers after hydration; a goal from the link wins.
  useEffect(() => {
    const stored = loadFlow();
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from localStorage */
    if (start) {
      const kept = stored?.answers ?? {};
      setAnswers({
        ...FRESH_ANSWERS,
        ...kept,
        goal: start.goal,
        ...(start.role ? { role: start.role } : {}),
        // Outcomes belong to a goal: a different goal starts them afresh.
        outcomes: kept.goal === start.goal ? (kept.outcomes ?? []) : [],
      });
      setStep(STEP.role);
    } else if (stored) {
      setAnswers({ ...FRESH_ANSWERS, ...stored.answers });
      setStep(Math.min(Math.max(stored.step, 0), stored.answers.goal ? LAST_STEP : STEP.goal));
    }
    setResumed(stored !== null && hasProgress(stored));
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    trackEvent("questions_started", {
      signed_in: signedIn,
      resumed: stored !== null && hasProgress(stored),
      role_from_landing: Boolean(start?.role),
      from_deep_link: start !== null && !start.fromHome,
      ...(start ? { goal: start.goal } : {}),
    });
    // The home page asked the first question: count it like any answered step.
    if (start?.fromHome) {
      trackEvent("onboarding_step_completed", {
        step_name: "goal",
        step_index: 1,
        goal: start.goal,
        from_deep_link: false,
        from_home: true,
      });
    }
    return () => clearTimeout(advanceTimer.current);
  }, [start, signedIn]);

  useEffect(() => {
    if (loaded) saveFlow({ answers, step });
  }, [answers, step, loaded]);

  const goal = answers.goal ?? null;
  const outcomes = answers.outcomes ?? [];
  // Saved answers may hold the earlier CV and LinkedIn choices; they show as the file upload.
  const chosenSources = normalizeSources(answers.sources ?? []);

  const update = (patch: Partial<AnswersDraft>) =>
    setAnswers((current) => ({ ...current, ...patch }));

  /** Counts a finished step, with the goal it was answered for. Never the role or company text. */
  const completed = (key: OnboardingStepKey, current: AnswersDraft, extra = {}) =>
    trackEvent("onboarding_step_completed", {
      step_name: key,
      step_index: STEP[key] + 1,
      goal: current.goal ?? null,
      from_deep_link: fromDeepLink,
      ...extra,
    });

  /** Leaves a step forward: counts it, and fills in what the answer makes obvious. */
  const advance = (from: number, current: AnswersDraft) => {
    const key = ONBOARDING_STEPS[from]!.key;
    if (key === "role") {
      completed(key, current, { role_chip_used: roleChipUsed });
      const industry = industryForRole(current.role);
      if (!current.industry && industry) update({ industry });
    } else if (key === "industry") {
      completed(key, current, { industry: current.industry ?? null });
    } else {
      completed(key, current);
    }
    setStep(Math.min(LAST_STEP, from + 1));
  };

  /** A one-tap answer: saved, then on to the next question. */
  const pickOne = (patch: Partial<AnswersDraft>) => {
    const from = step;
    const next = { ...answers, ...patch };
    setAnswers(next);
    clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => advance(from, next), 180);
  };

  const chooseGoal = (value: SiteGoal) =>
    pickOne({
      goal: value,
      outcomes: value === goal ? outcomes : [],
    });

  const toggleOutcome = (value: string) =>
    update({
      outcomes: outcomes.includes(value)
        ? outcomes.filter((item) => item !== value)
        : [...outcomes, value].slice(0, OUTCOME_LIMIT),
    });

  const stepKey = ONBOARDING_STEPS[step]!.key;
  const nextDisabled =
    (stepKey === "goal" && !goal) ||
    (stepKey === "role" && !answers.role?.trim()) ||
    (stepKey === "industry" && !answers.industry) ||
    (stepKey === "outcomes" && outcomes.length === 0) ||
    (stepKey === "tone" && !answers.name?.trim());

  const finish = () => {
    setError(null);
    const parsed = answersFromDraft(answers);
    if (!parsed) {
      setError("A few answers are missing. Go back and check each step.");
      return;
    }
    completed("tone", answers);
    if (chosenSources.length) {
      trackEvent("cv_choice", {
        choice: chosenSources.includes(DOCUMENT_SOURCE) ? "upload" : "later",
        goal: parsed.goal,
        from_deep_link: fromDeepLink,
      });
    }
    const encoded = encodeAnswers(parsed);
    trackEvent("questions_completed", { signed_in: signedIn, goal: parsed.goal });
    if (!signedIn) {
      const callbackURL = `/start/finish?a=${encoded}`;
      router.push(`/sign-in?from=start&callbackURL=${encodeURIComponent(callbackURL)}`);
      return;
    }
    startTransition(async () => {
      const result = await finishOnboarding(encoded);
      if (result.ok) {
        clearFlow();
        router.push(`/dashboard/sites/${result.siteId}/template`);
      } else if (result.reason === "signed-out") {
        router.push(
          `/sign-in?from=start&callbackURL=${encodeURIComponent(`/start/finish?a=${encoded}`)}`,
        );
      } else {
        setError("Something in your answers didn't come through. Please check each step.");
      }
    });
  };

  const startOver = () => {
    clearTimeout(advanceTimer.current);
    clearFlow();
    setAnswers(FRESH_ANSWERS);
    setStep(0);
    setGoalShown(true);
    setResumed(false);
    setError(null);
  };

  const next = () => {
    if (nextDisabled || pending) return;
    if (step < LAST_STEP) advance(step, answers);
    else finish();
  };
  const back = () => {
    clearTimeout(advanceTimer.current);
    if (step === 0) {
      router.push("/");
      return;
    }
    if (step - 1 === STEP.goal) setGoalShown(true);
    setStep(step - 1);
  };
  /** Text questions go on with Enter, like the Continue button. */
  const onEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      next();
    }
  };

  const preview = useMemo(() => draftContent(answers), [answers]);
  const address = suggestSubdomains(answers.name ?? "")[0] ?? "yourname";

  // From a link, the goal isn't counted: the role question is "Step 1 of 5".
  const counted = goalShown ? ONBOARDING_STEPS.length : ONBOARDING_STEPS.length - 1;
  const shownStep = goalShown ? step + 1 : step;
  const company = COMPANY_QUESTION[goal ?? "other"];
  const status = answers.orgStatus ?? "employed";

  const questions: Record<OnboardingStepKey, { title: string; hint: string; body: ReactNode }> = {
    goal: {
      title: "What's your website for?",
      hint: "This shapes the questions and your draft.",
      body: (
        <div className="flex flex-col gap-2.5">
          {GOAL_CHOICES.map((choice) => (
            <button
              key={choice.value}
              type="button"
              aria-pressed={goal === choice.value}
              onClick={() => chooseGoal(choice.value)}
              className="chip flex-col items-start gap-0.5 px-[18px] py-3.5 text-left"
            >
              <span className="text-lg font-medium">{choice.label}</span>
              <span className="text-[14px] leading-snug text-neutral-700">{choice.hint}</span>
            </button>
          ))}
        </div>
      ),
    },
    role: {
      title: "I'm a…",
      hint: "Type your role, or tap one to start from.",
      body: (
        <>
          <div className="field">
            <label htmlFor="role" className="sr-only">
              Your role
            </label>
            <input
              id="role"
              className="input"
              autoFocus
              autoComplete="organization-title"
              enterKeyHint="next"
              maxLength={ROLE_MAX}
              value={answers.role ?? ""}
              onChange={(event) => update({ role: event.target.value })}
              onKeyDown={onEnter}
              placeholder={ROLE_SUGGESTIONS[goal ?? "other"][0]}
              style={{ fontSize: 18, padding: "14px 16px" }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {ROLE_SUGGESTIONS[goal ?? "other"].map((role) => (
              <Chip
                key={role}
                label={role}
                fontSize={15}
                selected={answers.role === role}
                onClick={() => {
                  setRoleChipUsed(true);
                  update({ role });
                }}
              />
            ))}
          </div>
        </>
      ),
    },
    industry: {
      title: "My industry is…",
      hint: "This sets the vocabulary of your draft.",
      body: (
        <>
          <div className="flex flex-wrap gap-2">
            {INDUSTRY_OPTIONS.map((industry) => (
              <Chip
                key={industry}
                label={industry}
                fontSize={15}
                selected={answers.industry === industry}
                onClick={() =>
                  industry === "Other" ? update({ industry }) : pickOne({ industry })
                }
              />
            ))}
          </div>
          {answers.industry === "Other" ? (
            <div className="field">
              <label htmlFor="industry-other">Which one? (optional)</label>
              <input
                id="industry-other"
                className="input"
                autoFocus
                enterKeyHint="next"
                maxLength={40}
                value={answers.industryOther ?? ""}
                onChange={(event) => update({ industryOther: event.target.value })}
                onKeyDown={onEnter}
                placeholder="Logistics"
              />
            </div>
          ) : null}
        </>
      ),
    },
    company: {
      title: company.title,
      hint: "Optional. We'll phrase it for you.",
      body: (
        <>
          <div className="field">
            <label htmlFor="org" className="sr-only">
              {company.title}
            </label>
            <input
              id="org"
              className="input"
              autoFocus
              autoComplete="organization"
              enterKeyHint="next"
              maxLength={80}
              value={answers.org ?? ""}
              onChange={(event) => update({ org: event.target.value })}
              onKeyDown={onEnter}
              placeholder={company.placeholder}
              style={{ fontSize: 18, padding: "14px 16px" }}
            />
          </div>
          {company.statuses.length ? (
            <div className="flex flex-wrap gap-2.5">
              {company.statuses.map((option) => (
                <Chip
                  key={option.status}
                  label={option.label}
                  selected={status === option.status}
                  onClick={() =>
                    status === option.status
                      ? update({ orgStatus: "employed" })
                      : pickOne({ orgStatus: option.status })
                  }
                />
              ))}
            </div>
          ) : null}
        </>
      ),
    },
    outcomes: {
      title: "I want the site to bring me…",
      hint: "Choose up to two. It decides the call to action and the contact form.",
      body: (
        <div className="flex flex-wrap gap-2.5">
          {[
            ...OUTCOME_CHOICES[goal ?? "other"],
            // Kept from earlier answers ("Board and advisory roles"), so they can be unticked.
            ...outcomes.filter((outcome) => !OUTCOME_CHOICES[goal ?? "other"].includes(outcome)),
          ].map((outcome) => (
            <Chip
              key={outcome}
              label={outcome}
              selected={outcomes.includes(outcome)}
              disabled={!outcomes.includes(outcome) && outcomes.length >= OUTCOME_LIMIT}
              onClick={() => toggleOutcome(outcome)}
            />
          ))}
        </div>
      ),
    },
    tone: {
      title: "Last one: how should it sound?",
      hint: "Then just your name. Everything else is optional.",
      body: (
        <>
          <div
            role="radiogroup"
            aria-label="Voice"
            className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2 sm:gap-3"
          >
            {VOICE_OPTIONS.map((voice) => {
              const selected = answers.voice === voice.label;
              return (
                <button
                  key={voice.label}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => update({ voice: voice.label })}
                  className="chip flex-col items-start gap-0 px-3.5 py-2 text-left sm:gap-2.5 sm:p-[18px]"
                >
                  <span className="font-heading text-lg font-semibold uppercase sm:text-2xl">
                    {voice.label}
                  </span>
                  <span className="text-[13px] leading-[1.35] text-neutral-800 sm:text-[15px] sm:leading-[1.45]">
                    {voice.sample}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              className="input"
              autoComplete="name"
              enterKeyHint="done"
              maxLength={60}
              value={answers.name ?? ""}
              onChange={(event) => update({ name: event.target.value })}
              onKeyDown={onEnter}
              placeholder="Amelia Hart"
            />
          </div>
          <span className="text-[13px] tracking-[0.1em] text-neutral-600 uppercase sm:mt-1.5">
            Optional · fills in your experience and results
          </span>
          <div className="flex flex-wrap gap-2.5">
            {SOURCE_OPTIONS.map((source) => (
              <Chip
                key={source}
                label={source}
                fontSize={15}
                className="max-sm:px-3 max-sm:py-2.5"
                selected={chosenSources.includes(source)}
                // One or the other: choosing one clears the other.
                onClick={() => update({ sources: chosenSources.includes(source) ? [] : [source] })}
              />
            ))}
          </div>
          {chosenSources.includes(DOCUMENT_SOURCE) ? (
            <div className="flex flex-col gap-1.5 text-sm text-neutral-700">
              <span>
                You&apos;ll attach it after choosing a template. It&apos;s used once to draft your
                site and isn&apos;t stored.
              </span>
              <LinkedInPdfHint />
            </div>
          ) : null}
        </>
      ),
    },
  };
  const question = questions[stepKey];

  return (
    <div className="grid min-h-dvh grid-cols-[repeat(auto-fit,minmax(min(100%,520px),1fr))]">
      <div
        className="flex flex-col gap-6 sm:gap-8"
        style={{ padding: "20px clamp(20px,4vw,56px) 40px" }}
      >
        <div className="flex items-center gap-4">
          <Link href="/" className="mr-auto text-text no-underline hover:text-text">
            <Wordmark />
          </Link>
          <Link href="/" className="btn btn-ghost">
            Save and exit
          </Link>
        </div>
        {resumed ? (
          <div
            role="status"
            className="flex max-w-[640px] flex-wrap items-center gap-x-4 gap-y-2 border border-accent bg-accent-100 px-4 py-3 text-[15px]"
          >
            <span className="flex-1">Welcome back. We kept your answers from last time.</span>
            <button type="button" className="btn btn-ghost" onClick={startOver}>
              Start over
            </button>
          </div>
        ) : null}
        <div className="flex flex-col gap-2.5">
          <div className="flex justify-between text-[13px] tracking-[0.1em] text-accent-700 uppercase">
            <span>
              Step {shownStep} of {counted}
            </span>
            <span className="text-neutral-600">{ONBOARDING_STEPS[step]!.name}</span>
          </div>
          <div
            className="h-[3px] bg-neutral-300"
            role="progressbar"
            aria-label="Progress"
            aria-valuemin={1}
            aria-valuemax={counted}
            aria-valuenow={shownStep}
          >
            <div
              className="h-[3px] bg-accent transition-[width] duration-300"
              style={{ width: `${(shownStep / counted) * 100}%` }}
            />
          </div>
        </div>
        <div key={step} className="cm-slide flex max-w-[640px] flex-1 flex-col gap-4 sm:gap-[22px]">
          <h1 className="m-0 font-heading text-[clamp(32px,4vw,52px)] leading-none font-semibold uppercase">
            {question.title}
          </h1>
          <span className="-mt-1 text-neutral-700 sm:-mt-2">{question.hint}</span>
          {question.body}
        </div>
        {error ? (
          <p role="alert" className="m-0 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: "12px 16px" }}
            onClick={back}
          >
            Back
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{
              minWidth: 220,
              justifyContent: "space-between",
              padding: "12px 16px",
              fontSize: 16,
            }}
            disabled={nextDisabled || pending}
            onClick={next}
          >
            {step === LAST_STEP ? "Save and choose a template" : "Continue"} <ArrowRight />
          </button>
        </div>
      </div>
      <aside
        aria-label="Preview"
        className="flex flex-col gap-3.5 border-l border-divider bg-surface"
        style={{ padding: "40px clamp(20px,3vw,48px)" }}
      >
        <span className="kicker">Your site, taking shape</span>
        <Blueprint className="bg-neutral-100 shadow-md">
          <AddressBar address={`${addressPrefix}${address}${addressSuffix}`} />
          <DraftPreview content={preview} />
        </Blueprint>
        <span className="text-sm text-neutral-700">
          Only what you&apos;ve chosen or typed. Grey lines are written for you after you choose a
          template.
        </span>
      </aside>
    </div>
  );
}
