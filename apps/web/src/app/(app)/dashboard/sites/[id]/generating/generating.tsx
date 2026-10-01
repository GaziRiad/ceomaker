"use client";

import {
  parseSiteContentForRender,
  type RenderableSiteContent,
  type SiteColors,
  type TemplateKey,
} from "@ceomaker/schema";
import { TemplateView } from "@ceomaker/templates";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ScaledFrame } from "@/components/scaled-frame";
import { AddressBar, Blueprint, Check, Spinner, Wordmark } from "@/components/ui";
import { takePendingDocument } from "@/lib/pending-document";
import type { GenerateEvent } from "@/lib/ai/events";

const STEPS = [
  "Reading your answers",
  "Writing your headline and introduction",
  "Drafting About, Impact and Experience",
  "Checking tone against your chosen voice",
  "Laying it out in your template",
];

const PREVIEW_DATE = new Date("2026-01-01T00:00:00Z");

export function GeneratingScreen({
  siteId,
  address,
  templateKey,
  templateVersion,
  templateName,
  voice,
  colors,
  content,
}: {
  siteId: string;
  address: string;
  templateKey: TemplateKey;
  templateVersion: number;
  templateName: string;
  voice: string;
  colors: SiteColors;
  content: RenderableSiteContent;
}) {
  const router = useRouter();
  const started = useRef(false);
  // `step` items are done; the one at `step` is in progress.
  const [step, setStep] = useState(0);
  const [preview, setPreview] = useState(content);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const editor = `/dashboard/sites/${siteId}/edit`;
    let finished = false;

    async function run() {
      const document = takePendingDocument();
      const body = document ? new FormData() : undefined;
      if (document && body) body.set("document", document);
      const response = await fetch(`/api/sites/${siteId}/generate`, { method: "POST", body });
      if (!response.ok || !response.body) {
        const detail = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(detail?.error ?? "We couldn't start your draft.");
        return;
      }
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        let newline = buffer.indexOf("\n");
        while (newline >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          newline = buffer.indexOf("\n");
          if (!line) continue;
          const event = JSON.parse(line) as GenerateEvent;
          if (event.type === "step") setStep((current) => Math.max(current, event.step));
          if (event.type === "error") setError(event.message);
          if (event.type === "done") {
            finished = true;
            if (event.content) setPreview(parseSiteContentForRender(event.content));
            setStep(STEPS.length);
            const query = event.notice ? `?notice=${encodeURIComponent(event.notice)}` : "";
            setTimeout(() => router.replace(`${editor}${query}`), 1100);
          }
        }
      }
      if (!finished) setError((current) => current ?? "The connection dropped while writing.");
    }

    run().catch(() => setError("The connection dropped while writing."));
  }, [router, siteId]);

  const progress = step / STEPS.length;
  return (
    <div
      className="grid min-h-dvh grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))]"
      style={{
        background:
          "radial-gradient(900px 520px at 15% 0%, var(--color-accent-100), transparent 70%)",
      }}
    >
      <div className="flex flex-col gap-10" style={{ padding: "28px clamp(20px,4vw,56px) 40px" }}>
        <Wordmark />
        <div className="flex max-w-[520px] flex-1 flex-col justify-center gap-[26px]">
          <span className="kicker cm-rise">
            {templateName} template · {voice} voice
          </span>
          <h1
            className="cm-rise m-0 font-heading text-[clamp(44px,5vw,68px)] leading-none font-semibold uppercase"
            style={{ "--delay": "80ms" } as React.CSSProperties}
          >
            Writing your first draft
          </h1>
          <div
            className="cm-rise h-[3px] bg-neutral-300"
            style={{ "--delay": "160ms" } as React.CSSProperties}
            role="progressbar"
            aria-label="Draft progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <div
              className="h-[3px] bg-accent transition-[width] duration-[900ms] ease-industry"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <ol className="m-0 flex list-none flex-col gap-4 p-0" aria-live="polite">
            {STEPS.map((label, index) => {
              const done = index < step;
              const active = index === step;
              return (
                <li
                  key={label}
                  className="flex items-center gap-3.5 text-[17px] transition-colors duration-[400ms]"
                  style={{
                    color: index <= step ? "var(--color-text)" : "var(--color-neutral-500)",
                  }}
                >
                  <span className="flex size-6 flex-none items-center justify-center">
                    {done ? (
                      <span className="cm-pop flex size-[22px] items-center justify-center rounded-full bg-accent">
                        <Check size={14} strokeWidth={2} color="var(--color-bg)" />
                      </span>
                    ) : active && !error ? (
                      <Spinner />
                    ) : (
                      <span className="size-2.5 rounded-full border border-neutral-400" />
                    )}
                  </span>
                  {label}
                  {done ? <span className="sr-only">(done)</span> : null}
                </li>
              );
            })}
          </ol>
          {error ? (
            <div
              role="alert"
              className="flex flex-col items-start gap-3 border border-danger bg-danger-soft p-4"
            >
              <span className="text-[15px]">{error}</span>
              <span className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => window.location.reload()}
                >
                  Try again
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => router.replace(`/dashboard/sites/${siteId}/edit`)}
                >
                  Edit the draft I have
                </button>
              </span>
            </div>
          ) : (
            <span className="text-sm text-neutral-700">
              Usually under a minute. Everything stays a draft until you publish.
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center" style={{ padding: "40px clamp(20px,3vw,48px)" }}>
        <Blueprint
          className="cm-rise w-full bg-neutral-100 shadow-lg"
          style={{ "--delay": "200ms" } as React.CSSProperties}
        >
          <AddressBar address={address} live height={34} />
          <div className="relative overflow-hidden" style={{ height: 600 }}>
            <ScaledFrame initialZoom={0.45} style={{ height: 600 }}>
              <TemplateView
                templateKey={templateKey}
                templateVersion={templateVersion}
                colors={colors}
                content={preview}
                publishedAt={PREVIEW_DATE}
                preview
                still
              />
            </ScaledFrame>
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 flex flex-col gap-3.5 bg-neutral-100 transition-[top] duration-1000 ease-industry"
              style={{ top: `${Math.round(progress * 100)}%`, padding: "36px 40px" }}
            >
              <span className="h-2.5 w-[38%] bg-neutral-200" />
              <span className="h-[26px] w-[78%] bg-neutral-200" />
              <span className="h-[26px] w-[64%] bg-neutral-200" />
              <span className="mt-3 h-2.5 w-[70%] bg-neutral-200" />
              <span className="h-2.5 w-[58%] bg-neutral-200" />
            </div>
            <div
              aria-hidden
              className="absolute inset-x-0 h-0.5 bg-accent transition-[top,opacity] duration-1000 ease-industry"
              style={{
                top: `${Math.round(progress * 100)}%`,
                opacity: progress >= 1 ? 0 : 1,
                boxShadow: "0 0 18px 2px var(--color-accent-300)",
              }}
            />
          </div>
        </Blueprint>
      </div>
    </div>
  );
}
