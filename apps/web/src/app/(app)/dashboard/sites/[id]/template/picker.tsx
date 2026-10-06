"use client";

import {
  isPremiumTemplate,
  type RenderableSiteContent,
  type TemplateKey,
  type TemplateRef,
  type ThemeSettings,
} from "@ceomaker/schema";
import { designOnChoosing, getTemplate, templateList } from "@ceomaker/templates";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TemplateThumbnail } from "@/components/template-thumbnail";
import { ArrowRight } from "@/components/ui";
import { LinkedInPdfHint, useDocumentFile } from "@/components/document-file";
import { setPendingDocument } from "@/lib/pending-document";
import { chooseTemplateAction } from "../../../site-actions";
import { ProTag } from "@/components/pro";

export function TemplatePicker({
  siteId,
  initialTemplate,
  current,
  theme,
  content,
  wantsDocument,
  pro,
}: {
  siteId: string;
  initialTemplate: TemplateKey;
  /** The designs the site uses now, live first: picking one of those templates keeps it. */
  current: (TemplateRef | null)[];
  theme: ThemeSettings;
  content: RenderableSiteContent;
  wantsDocument: boolean;
  /** Free accounts can pick any template, but publish premium ones and draft from a CV with Pro. */
  pro: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<TemplateKey>(initialTemplate);
  const cv = useDocumentFile();
  const { file } = cv;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // They said they'd draft from a file: attaching it is the main step, skipping it a choice.
  const asksForFile = wantsDocument && pro && !file;
  // Each card shows the design the site would get: the one it uses, else the newest.
  const choices = templateList.map((template) =>
    getTemplate(template.key, designOnChoosing(template.key, current)),
  );
  const selectedName = choices.find((template) => template.key === selected)?.name;

  const write = () => {
    setError(null);
    startTransition(async () => {
      const result = await chooseTemplateAction(siteId, selected);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPendingDocument(file);
      router.push(`/dashboard/sites/${siteId}/generating`);
    });
  };

  return (
    <>
      <main
        className="mx-auto flex max-w-[1320px] flex-col gap-7"
        style={{ padding: "40px clamp(20px,3vw,32px) 160px" }}
      >
        <div className="flex flex-col gap-2">
          <span className="kicker">Your answers are saved · Choose a look</span>
          <h1 className="m-0 font-heading text-[clamp(36px,4vw,52px)] leading-none font-semibold uppercase">
            How should you be presented?
          </h1>
          <span className="text-neutral-700">
            Each preview uses your answers. You can switch at any time without losing edits.
          </span>
        </div>
        <div
          role="radiogroup"
          aria-label="Template"
          className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,380px),1fr))] gap-6"
        >
          {choices.map((template, index) => {
            const isSelected = template.key === selected;
            return (
              // The preview sits beside the radio, not inside it: templates contain their own
              // buttons and forms, which can't be nested in a button. The radio's overlay makes
              // the whole card clickable.
              <div
                key={template.key}
                className="blueprint lift relative flex flex-col bg-neutral-100 text-left has-[button:focus-visible]:outline-2 has-[button:focus-visible]:outline-offset-2 has-[button:focus-visible]:outline-accent"
                style={{ borderColor: isSelected ? "var(--color-accent)" : undefined }}
              >
                <i aria-hidden className="corner tl" />
                <i aria-hidden className="corner tr" />
                <i aria-hidden className="corner bl" />
                <i aria-hidden className="corner br" />
                <TemplateThumbnail
                  templateKey={template.key}
                  templateVersion={template.version}
                  theme={theme}
                  content={content}
                  height={260}
                  initialZoom={0.3}
                  eager={index < 3}
                />
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelected(template.key)}
                  className="flex cursor-pointer items-start gap-3 p-4 text-left outline-none after:absolute after:inset-0 after:content-['']"
                >
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2">
                      <span className="font-heading text-[22px] font-semibold uppercase">
                        {template.name}
                      </span>
                      {isPremiumTemplate(template.key) ? <ProTag /> : null}
                    </span>
                    <span className="text-sm text-neutral-700">{template.tagline}</span>
                    {isPremiumTemplate(template.key) && !pro ? (
                      <span className="text-[13px] text-neutral-600">
                        Try it free; publishing it needs Pro.
                      </span>
                    ) : null}
                  </span>
                  <span
                    aria-hidden
                    className="size-[22px] flex-none rounded-full border"
                    style={{
                      borderColor: isSelected ? "var(--color-accent)" : "var(--color-divider)",
                      background: isSelected ? "var(--color-accent)" : "transparent",
                    }}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </main>
      <div className="fixed inset-x-0 bottom-0 border-t border-divider bg-neutral-100 shadow-lg">
        <div
          className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-4"
          style={{ padding: "14px clamp(20px,3vw,32px)" }}
        >
          <span className="flex-1">
            Selected: <strong className="font-medium">{selectedName}</strong>
          </span>
          {wantsDocument && !pro ? (
            <span className="flex items-center gap-2 text-sm text-neutral-700">
              <ProTag />
              Drafting from a CV or LinkedIn PDF is part of Pro, so this draft uses your answers.
            </span>
          ) : null}
          {wantsDocument && pro ? (
            <span className="flex min-w-0 items-center gap-2 text-sm text-neutral-700">
              {cv.input}
              {file ? (
                <>
                  <span className="max-w-[260px] truncate">Drafting from {file.name}</span>
                  <button type="button" className="btn btn-ghost" onClick={cv.clear}>
                    Remove
                  </button>
                </>
              ) : (
                <span className="hidden max-w-[460px] md:inline">
                  <LinkedInPdfHint />
                </span>
              )}
            </span>
          ) : null}
          {error || cv.error ? (
            <span role="alert" className="w-full text-sm text-danger md:order-last">
              {error ?? cv.error}
            </span>
          ) : null}
          {asksForFile ? (
            <button type="button" className="btn btn-ghost" disabled={pending} onClick={write}>
              Skip, use my answers
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-primary"
            style={{
              minWidth: 240,
              justifyContent: "space-between",
              padding: "12px 16px",
              fontSize: 16,
            }}
            disabled={pending}
            onClick={asksForFile ? cv.choose : write}
          >
            {pending ? "Saving…" : asksForFile ? "Attach CV or LinkedIn PDF" : "Write my site"}{" "}
            <ArrowRight />
          </button>
        </div>
      </div>
    </>
  );
}
