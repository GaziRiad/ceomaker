"use client";

import {
  type RenderableSiteContent,
  type TemplateKey,
  type TemplateRef,
  type ThemeSettings,
  isPremiumTemplate,
} from "@ceomaker/schema";
import { designOnChoosing, getTemplate, newerDesign, templateList } from "@ceomaker/templates";
import { TemplateThumbnail } from "@/components/template-thumbnail";
import { ExternalLink, Sparkles } from "@/components/icons";
import { ProTag, UpgradePrompt } from "@/components/pro";

export function TemplatePanel({
  siteId,
  current,
  live,
  theme,
  content,
  pro,
  onChoose,
  onDesign,
}: {
  siteId: string;
  /** The draft's template and design. */
  current: TemplateRef;
  /** The live site's, or null before the first publish. */
  live: TemplateRef | null;
  theme: ThemeSettings;
  content: RenderableSiteContent;
  /** On the free plan, premium templates can be tried in the draft but not published. */
  pro: boolean;
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
      {!pro && isPremiumTemplate(current.key) ? (
        <UpgradePrompt title={`${name} is a Pro template`}>
          Try it here as much as you like. Upgrade to publish it, or switch to Meridian or Harbour,
          which are included in the free plan.
        </UpgradePrompt>
      ) : null}
      <p className="m-0 text-[13px] text-neutral-700">
        Preview opens your draft in a template, full size, in a new tab. It doesn&apos;t change your
        choice.
      </p>
      <div role="radiogroup" aria-label="Template" className="flex flex-col gap-3">
        {choices.map((template, index) => {
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
              <TemplateThumbnail
                templateKey={template.key}
                templateVersion={template.version}
                theme={theme}
                content={content}
                height={120}
                initialZoom={0.255}
                eager={index < 3}
              />
              <div className="flex items-center gap-3 px-3 py-2.5">
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChoose(template.key)}
                  className="flex flex-1 cursor-pointer items-center gap-2 text-left outline-none after:absolute after:inset-0 after:content-['']"
                >
                  <span className="font-heading text-lg font-semibold uppercase">
                    {template.name}
                  </span>
                  {isPremiumTemplate(template.key) ? <ProTag /> : null}
                </button>
                {/* Above the radio's overlay, so it opens the preview instead of choosing. */}
                <a
                  href={`/preview/${siteId}/${template.key}`}
                  target="_blank"
                  rel="noopener"
                  aria-label={`Preview ${template.name} in a new tab`}
                  className="relative z-[1] flex items-center gap-1 text-[13px]"
                >
                  Preview <ExternalLink size={13} />
                </a>
                <span
                  aria-hidden
                  className="size-4 flex-none rounded-full border"
                  style={{
                    borderColor: selected ? "var(--color-accent)" : "var(--color-divider)",
                    background: selected ? "var(--color-accent)" : "transparent",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-start gap-2.5 border border-dashed border-divider p-3.5 text-[13px] text-neutral-700">
        <Sparkles size={14} className="mt-0.5 flex-none text-accent-800" />
        <span>
          <strong className="font-medium text-text">More on the way.</strong> We add new templates
          regularly, and they appear here when they&apos;re ready. Your content moves to any of them
          in one click.
        </span>
      </div>
    </div>
  );
}
