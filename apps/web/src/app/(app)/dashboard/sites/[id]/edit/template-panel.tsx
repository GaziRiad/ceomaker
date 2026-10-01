"use client";

import {
  resolveSiteColors,
  type RenderableSiteContent,
  type TemplateKey,
  type ThemeSettings,
} from "@ceomaker/schema";
import { templateList, TemplateView } from "@ceomaker/templates";
import { ScaledFrame } from "@/components/scaled-frame";

const PREVIEW_DATE = new Date("2026-01-01T00:00:00Z");

export function TemplatePanel({
  templateKey,
  theme,
  content,
  onChoose,
}: {
  templateKey: TemplateKey;
  theme: ThemeSettings;
  content: RenderableSiteContent;
  onChoose: (key: TemplateKey) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Template"
      className="flex flex-col gap-3"
      style={{ padding: "14px 16px 40px" }}
    >
      {templateList.map((template) => {
        const selected = template.key === templateKey;
        return (
          <button
            key={template.key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChoose(template.key)}
            className="flex flex-col bg-bg text-left transition-[border-color,transform] duration-[250ms] ease-industry hover:-translate-y-0.5"
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
                colors={resolveSiteColors(theme, template.key)}
                content={content}
                publishedAt={PREVIEW_DATE}
                preview
                still
              />
            </ScaledFrame>
            <span className="flex items-center justify-between px-3 py-2.5">
              <span className="font-heading text-lg font-semibold uppercase">{template.name}</span>
              <span
                aria-hidden
                className="size-4 rounded-full border"
                style={{
                  borderColor: selected ? "var(--color-accent)" : "var(--color-divider)",
                  background: selected ? "var(--color-accent)" : "transparent",
                }}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}
