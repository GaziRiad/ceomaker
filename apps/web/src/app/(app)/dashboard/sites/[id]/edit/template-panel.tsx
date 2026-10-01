"use client";

import {
  resolveSiteColors,
  type RenderableSiteContent,
  type TemplateKey,
  type TemplateRef,
  type ThemeSettings,
} from "@ceomaker/schema";
import {
  designOnChoosing,
  getTemplate,
  newerDesign,
  templateList,
  TemplateView,
} from "@ceomaker/templates";
import { ScaledFrame } from "@/components/scaled-frame";

const PREVIEW_DATE = new Date("2026-01-01T00:00:00Z");

export function TemplatePanel({
  current,
  live,
  theme,
  content,
  onChoose,
  onDesign,
}: {
  /** The draft's template and design. */
  current: TemplateRef;
  /** The live site's, or null before the first publish. */
  live: TemplateRef | null;
  theme: ThemeSettings;
  content: RenderableSiteContent;
  onChoose: (key: TemplateKey) => void;
  onDesign: (version: number) => void;
}) {
  const name = getTemplate(current.key, current.version).name;
  const newer = newerDesign(current.key, current.version);
  // The draft tries another design of the template the live site uses.
  const trying = live && live.key === current.key && live.version !== current.version;
  // Each card shows the design the site would get: the draft's for its template, else the one
  // the site already uses, else the newest.
  const choices = templateList.map((template) =>
    getTemplate(
      template.key,
      template.key === current.key ? current.version : designOnChoosing(template.key, [live]),
    ),
  );

  return (
    <div className="flex flex-col gap-3" style={{ padding: "14px 16px 40px" }}>
      {newer ? (
        <div className="flex flex-col gap-2.5 border border-accent bg-accent-100 p-3 text-[13px]">
          <span>
            <strong className="font-medium">{name} has a new design.</strong> Try it here: your live
            site keeps its current look until you publish.
          </span>
          <button
            type="button"
            className="btn btn-secondary self-start"
            style={{ padding: "6px 12px" }}
            onClick={() => onDesign(newer.version)}
          >
            Try the new design
          </button>
        </div>
      ) : trying ? (
        <div className="flex flex-col gap-2.5 border border-accent bg-accent-100 p-3 text-[13px]">
          <span>
            You&apos;re trying another design of {name}. Your live site keeps its current look until
            you publish.
          </span>
          <button
            type="button"
            className="btn btn-secondary self-start"
            style={{ padding: "6px 12px" }}
            onClick={() => onDesign(live.version)}
          >
            Back to the current design
          </button>
        </div>
      ) : null}
      <div role="radiogroup" aria-label="Template" className="flex flex-col gap-3">
        {choices.map((template) => {
          const selected = template.key === current.key;
          return (
            // Preview beside the radio, not inside it (templates contain buttons and forms).
            <div
              key={template.key}
              className="relative flex flex-col bg-bg text-left transition-[border-color,transform] duration-[250ms] ease-industry hover:-translate-y-0.5 has-[button:focus-visible]:outline-2 has-[button:focus-visible]:outline-offset-2 has-[button:focus-visible]:outline-accent"
              style={{
                border: `1px solid ${selected ? "var(--color-accent)" : "var(--color-divider)"}`,
              }}
            >
              <ScaledFrame
                initialZoom={0.255}
                className="w-full border-b border-divider"
                style={{ height: 120 }}
              >
                <TemplateView
                  templateKey={template.key}
                  templateVersion={template.version}
                  colors={resolveSiteColors(theme, template.key, template.version)}
                  content={content}
                  publishedAt={PREVIEW_DATE}
                  preview
                  still
                />
              </ScaledFrame>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChoose(template.key)}
                className="flex cursor-pointer items-center justify-between px-3 py-2.5 text-left outline-none after:absolute after:inset-0 after:content-['']"
              >
                <span className="font-heading text-lg font-semibold uppercase">
                  {template.name}
                </span>
                <span
                  aria-hidden
                  className="size-4 rounded-full border"
                  style={{
                    borderColor: selected ? "var(--color-accent)" : "var(--color-divider)",
                    background: selected ? "var(--color-accent)" : "transparent",
                  }}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
