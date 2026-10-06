"use client";

import {
  defaultColors,
  DOCUMENT_SOURCE,
  encodeAnswers,
  formTopicsFromGoals,
  GOAL_OPTIONS,
  latestTemplateVersion,
  INDUSTRY_OPTIONS,
  normalizeSources,
  ONBOARDING_STEP_NAMES,
  onboardingAnswersSchema,
  roleLabel,
  ROLE_OPTIONS,
  SOURCE_OPTIONS,
  STAGE_OPTIONS,
  suggestSubdomains,
  VOICE_OPTIONS,
  type AnswersDraft,
  type RenderableSiteContent,
} from "@ceomaker/schema";
import { TemplateView } from "@ceomaker/templates";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { LinkedInPdfHint } from "@/components/document-file";
import { ProTag } from "@/components/pro";
import { ScaledFrame } from "@/components/scaled-frame";
import { trackEvent } from "@/lib/product-analytics/browser";
import { AddressBar, ArrowRight, Blueprint, Wordmark } from "@/components/ui";
import { finishOnboarding } from "./actions";
import { clearFlow, hasProgress, loadFlow, saveFlow } from "./storage";

const LAST_STEP = ONBOARDING_STEP_NAMES.length - 1;
const FRESH_ANSWERS: AnswersDraft = { voice: "Measured", goals: [], sources: [] };
const PREVIEW_DATE = new Date("2026-01-01T00:00:00Z");

const PREVIEW_HEIGHT = 560;
/** The preview shows the design a new site starts on. */
const PREVIEW_TEMPLATE = { key: "meridian", version: latestTemplateVersion("meridian") } as const;

/**
 * The questions screen preview: Meridian in draft mode with only what the person has chosen or
 * typed. Nothing is made up; everything else is a grey line until the draft is written.
 */
function draftContent(answers: AnswersDraft): RenderableSiteContent {
  const title = [roleLabel(answers.role), answers.org?.trim()].filter(Boolean).join(", ");
  return {
    meta: { name: answers.name?.trim() ?? "", affiliations: [], keywords: [] },
    sections: [
      { id: "hero", type: "hero", visible: true, eyebrow: title, headline: "" },
      {
        id: "contact",
        type: "contact",
        visible: true,
        links: [],
        form: { enabled: true, topics: formTopicsFromGoals(answers.goals ?? []) },
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
  fontSize = 17,
  tag,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  fontSize?: number;
  /** Shown after the label, such as the Pro badge. */
  tag?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className="chip"
      style={{ fontSize }}
    >
      {selected ? <span className="text-accent-700">✓</span> : null}
      {label}
      {tag}
    </button>
  );
}

export function QuestionsFlow({
  initialRole,
  signedIn,
  addressPrefix,
  addressSuffix,
}: {
  initialRole: string | null;
  signedIn: boolean;
  addressPrefix: string;
  addressSuffix: string;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<AnswersDraft>(FRESH_ANSWERS);
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const advanceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Restore saved answers after hydration; a role picked on the landing page wins.
  useEffect(() => {
    const stored = loadFlow();
    const role = ROLE_OPTIONS.find((option) => option === initialRole) ?? null;
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from localStorage */
    if (role) {
      setAnswers({ ...(stored?.answers ?? {}), voice: stored?.answers.voice ?? "Measured", role });
      setStep(1);
    } else if (stored) {
      setAnswers({ ...FRESH_ANSWERS, ...stored.answers });
      setStep(Math.min(Math.max(stored.step, 0), LAST_STEP));
    }
    setResumed(stored !== null && hasProgress(stored));
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    trackEvent("questions_started", {
      signed_in: signedIn,
      resumed: stored !== null && hasProgress(stored),
      role_from_landing: role !== null,
    });
    return () => clearTimeout(advanceTimer.current);
  }, [initialRole, signedIn]);

  useEffect(() => {
    if (loaded) saveFlow({ answers, step });
  }, [answers, step, loaded]);

  const update = (patch: Partial<AnswersDraft>) =>
    setAnswers((current) => ({ ...current, ...patch }));

  const pickOne = (patch: Partial<AnswersDraft>) => {
    update(patch);
    clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(
      () => setStep((current) => Math.min(LAST_STEP, current + 1)),
      180,
    );
  };

  const toggle = <T extends string>(list: readonly T[] | undefined, value: T): T[] =>
    (list ?? []).includes(value)
      ? (list ?? []).filter((item) => item !== value)
      : [...(list ?? []), value];

  const goals = answers.goals ?? [];
  // Saved answers may hold the earlier CV and LinkedIn choices; they show as the file upload.
  const chosenSources = normalizeSources(answers.sources ?? []);
  const nextDisabled =
    (step === 0 && !answers.role) ||
    (step === 1 && !answers.industry) ||
    (step === 3 && goals.length === 0) ||
    (step === 4 && !answers.name?.trim());

  const finish = () => {
    setError(null);
    const parsed = onboardingAnswersSchema.safeParse({
      ...answers,
      name: answers.name?.trim(),
      org: answers.org?.trim() ?? "",
    });
    if (!parsed.success) {
      setError("A few answers are missing. Go back and check each step.");
      return;
    }
    const encoded = encodeAnswers(parsed.data);
    trackEvent("questions_completed", { signed_in: signedIn });
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
    setResumed(false);
    setError(null);
  };

  const next = () => (step < LAST_STEP ? setStep(step + 1) : finish());
  const back = () => (step > 0 ? setStep(step - 1) : router.push("/"));

  const preview = useMemo(() => draftContent(answers), [answers]);
  const address = suggestSubdomains(answers.name ?? "")[0] ?? "yourname";

  const question = [
    {
      title: "I am a…",
      hint: "Pick the one that fits best.",
      body: (
        <div className="flex flex-wrap gap-2.5">
          {ROLE_OPTIONS.map((role) => (
            <Chip
              key={role}
              label={role}
              selected={answers.role === role}
              onClick={() => pickOne({ role })}
            />
          ))}
        </div>
      ),
    },
    {
      title: "My industry is…",
      hint: "This sets the vocabulary of your draft.",
      body: (
        <div className="flex flex-wrap gap-2.5">
          {INDUSTRY_OPTIONS.map((industry) => (
            <Chip
              key={industry}
              label={industry}
              selected={answers.industry === industry}
              onClick={() => pickOne({ industry })}
            />
          ))}
        </div>
      ),
    },
    {
      title: "I work at…",
      hint: "Roughly. We'll phrase it for you.",
      canSkip: true,
      body: (
        <div className="flex flex-wrap gap-2.5">
          {STAGE_OPTIONS.map((stage) => (
            <Chip
              key={stage}
              label={stage}
              selected={answers.stage === stage}
              onClick={() => pickOne({ stage })}
            />
          ))}
        </div>
      ),
    },
    {
      title: "I want the site to bring me…",
      hint: "Choose as many as you like. It decides section order and the call to action.",
      body: (
        <div className="flex flex-wrap gap-2.5">
          {GOAL_OPTIONS.map((goal) => (
            <Chip
              key={goal}
              label={goal}
              selected={goals.includes(goal)}
              onClick={() => update({ goals: toggle(goals, goal) })}
            />
          ))}
        </div>
      ),
    },
    {
      title: "Last one: how should it sound?",
      hint: "Then just your name. Everything else is optional.",
      body: (
        <>
          <div
            role="radiogroup"
            aria-label="Voice"
            className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3"
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
                  className="chip flex-col items-start gap-2.5 p-[18px] text-left"
                >
                  <span className="font-heading text-2xl font-semibold uppercase">
                    {voice.label}
                  </span>
                  <span className="text-[15px] leading-[1.45] text-neutral-800">
                    {voice.sample}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                className="input"
                autoComplete="name"
                maxLength={60}
                value={answers.name ?? ""}
                onChange={(event) => update({ name: event.target.value })}
                placeholder="Amelia Hart"
              />
            </div>
            <div className="field">
              <label htmlFor="org">Organisation (optional)</label>
              <input
                id="org"
                className="input"
                autoComplete="organization"
                maxLength={80}
                value={answers.org ?? ""}
                onChange={(event) => update({ org: event.target.value })}
                placeholder="Meridian Freight Group"
              />
            </div>
          </div>
          <span className="mt-1.5 text-[13px] tracking-[0.1em] text-neutral-600 uppercase">
            Optional · fills in your experience and results
          </span>
          <div className="flex flex-wrap gap-2.5">
            {SOURCE_OPTIONS.map((source) => (
              <Chip
                key={source}
                label={source}
                fontSize={16}
                tag={source === DOCUMENT_SOURCE ? <ProTag /> : null}
                selected={chosenSources.includes(source)}
                // One or the other: choosing one clears the other.
                onClick={() => update({ sources: chosenSources.includes(source) ? [] : [source] })}
              />
            ))}
          </div>
          {chosenSources.includes(DOCUMENT_SOURCE) ? (
            <div className="flex flex-col gap-1.5 text-sm text-neutral-700">
              <span>
                Drafting from a file is part of Pro. You&apos;ll attach it after choosing a
                template; it&apos;s used once to draft your site and isn&apos;t stored.
              </span>
              <LinkedInPdfHint />
            </div>
          ) : null}
        </>
      ),
    },
  ][step]!;

  return (
    <div className="grid min-h-dvh grid-cols-[repeat(auto-fit,minmax(min(100%,520px),1fr))]">
      <div className="flex flex-col gap-8" style={{ padding: "24px clamp(20px,4vw,56px) 40px" }}>
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
            <span>Step {step + 1} of 5</span>
            <span className="text-neutral-600">{ONBOARDING_STEP_NAMES[step]}</span>
          </div>
          <div
            className="h-[3px] bg-neutral-300"
            role="progressbar"
            aria-label="Progress"
            aria-valuemin={1}
            aria-valuemax={5}
            aria-valuenow={step + 1}
          >
            <div
              className="h-[3px] bg-accent transition-[width] duration-300"
              style={{ width: `${((step + 1) / 5) * 100}%` }}
            />
          </div>
        </div>
        <div key={step} className="cm-slide flex max-w-[640px] flex-1 flex-col gap-[22px]">
          <h1 className="m-0 font-heading text-[clamp(36px,4vw,52px)] leading-none font-semibold uppercase">
            {question.title}
          </h1>
          <span className="-mt-2 text-neutral-700">{question.hint}</span>
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
          {"canSkip" in question && question.canSkip ? (
            <button type="button" className="btn btn-ghost" onClick={() => setStep(step + 1)}>
              Skip
            </button>
          ) : null}
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
