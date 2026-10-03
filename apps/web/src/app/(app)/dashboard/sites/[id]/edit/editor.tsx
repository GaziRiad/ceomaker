"use client";

import {
  contrastRatio,
  isPremiumTemplate,
  isPublishableColors,
  MIN_TEXT_CONTRAST,
  resolveSiteColors,
  roleFromEyebrow,
  siteDescription,
  siteTitle,
  type Section,
  type SiteColors,
  type SiteMeta,
  type TemplateKey,
  type TemplateRef,
} from "@ceomaker/schema";
import {
  designOnChoosing,
  getTemplate,
  initialsOf,
  newerDesign,
  TemplateView,
} from "@ceomaker/templates";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Wordmark } from "@/components/ui";
import type { RewriteMode } from "@/lib/ai/draft";
import {
  rewriteHeadlineAction,
  saveDraftAction,
  saveEditorDeviceAction,
} from "../../../site-actions";
import { BrandPanel } from "./brand-panel";
import { ContentPanel } from "./content-panel";
import { DeviceCanvas } from "./device-canvas";
import type { Device } from "./devices";
import {
  canEditInPlace,
  editInPlace,
  fingerprint,
  liveFingerprint,
  normalizeForEditing,
  prepareForSave,
  previewContent,
  sectionIdOfField,
  SECTION_LABELS,
  sectionOf,
  updateLastValid,
  type Draft,
  type FieldErrors,
} from "./editor-model";
import { InlineEditing } from "./inline-editing";
import { SharingPanel, SharingPreviews, type ShareView } from "./sharing";
import { sectionElement, sectionIdAt } from "./section-dom";
import { PublishDialog, type PublishedResult } from "./publish-dialog";
import { TemplatePanel } from "./template-panel";

type Tab = "content" | "brand" | "design" | "share";
type SaveState = "saved" | "saving" | "invalid" | "error";

const TABS: [Tab, string][] = [
  ["content", "Content"],
  ["brand", "Brand"],
  ["design", "Template"],
  ["share", "Sharing"],
];

const PREVIEW_DATE = new Date();
/** "Saving…" stays up at least this long, so quick saves still read as saves. */
const MIN_SAVING_MS = 900;
const AUTOSAVE_DELAY_MS = 700;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function Editor({
  siteId,
  subdomain: initialSubdomain,
  addressPrefix,
  addressSuffix,
  initialDraft,
  publishedFingerprint,
  liveTemplate,
  status,
  versionCount,
  initials,
  notice,
  pro,
  initialDevice,
  customDomain,
}: {
  siteId: string;
  subdomain: string;
  addressPrefix: string;
  addressSuffix: string;
  initialDraft: Draft;
  publishedFingerprint: string | null;
  /** The design the live site shows, or null before the first publish. */
  liveTemplate: TemplateRef | null;
  status: "draft" | "published" | "paused";
  versionCount: number;
  initials: string;
  notice: string | null;
  /** The account is on Pro: premium templates publish and the contact form can be on. */
  pro: boolean;
  /** The canvas size the owner last picked, on any computer. */
  initialDevice: Device;
  /** The site's own domain, when connected and the account is on Pro. */
  customDomain: string | null;
}) {
  // The draft and, for the preview, the last valid version of each section, updated together.
  const [state, setState] = useState(() => {
    const draft: Draft = { ...initialDraft, content: normalizeForEditing(initialDraft.content) };
    return { draft, lastValid: updateLastValid(new Map(), draft.content) };
  });
  const draft = state.draft;
  const setDraft = useCallback(
    (update: (current: Draft) => Draft) =>
      setState((current) => {
        const next = update(current.draft);
        return next.content === current.draft.content
          ? { ...current, draft: next }
          : { draft: next, lastValid: updateLastValid(current.lastValid, next.content) };
      }),
    [],
  );
  const [tab, setTab] = useState<Tab>("content");
  const [selectedId, setSelectedId] = useState(() => draft.content.sections[0]?.id ?? "hero");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>(() => new Map());
  const [subdomain, setSubdomain] = useState(initialSubdomain);
  const [livePrint, setLivePrint] = useState(publishedFingerprint);
  const [live, setLive] = useState(liveTemplate);
  const [designNoticeSeen, setDesignNoticeSeen] = useState(false);
  const [versions, setVersions] = useState(versionCount);
  const [publishOpen, setPublishOpen] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [banner, setBanner] = useState(notice);
  const [formRevision, setFormRevision] = useState(0);
  const [device, setDevice] = useState(initialDevice);
  // Bumped by picks in the sidebar, so the canvas scrolls to them (page clicks don't scroll).
  const [selectionScroll, setSelectionScroll] = useState(0);

  const latest = useRef(draft);
  const savedPrint = useRef(fingerprint(initialDraft));
  const chain = useRef<Promise<boolean>>(Promise.resolve(true));

  useEffect(() => {
    latest.current = draft;
  }, [draft]);

  /** Saves the latest draft. Saves run one at a time so an older one can never land last. */
  const save = useCallback((): Promise<boolean> => {
    chain.current = chain.current.then(async () => {
      const target = latest.current;
      const print = fingerprint(target);
      if (print === savedPrint.current) return true;
      const prepared = prepareForSave(target.content);
      if (!prepared.ok) {
        setErrors(prepared.errors);
        setSaveState("invalid");
        return false;
      }
      setErrors(new Map());
      setSaveState("saving");
      const started = Date.now();
      const result = await saveDraftAction(siteId, {
        templateKey: target.templateKey,
        templateVersion: target.templateVersion,
        theme: target.theme,
        content: prepared.content,
      }).catch(() => ({ ok: false as const, error: "We couldn't reach the server." }));
      await wait(Math.max(0, MIN_SAVING_MS - (Date.now() - started)));
      if (!result.ok) {
        setSaveError(result.error);
        setSaveState("error");
        return false;
      }
      savedPrint.current = print;
      setSaveError(null);
      setSaveState(fingerprint(latest.current) === print ? "saved" : "saving");
      return true;
    });
    return chain.current;
  }, [siteId]);

  // Autosave shortly after the last change.
  useEffect(() => {
    if (fingerprint(draft) === savedPrint.current) return;
    const timer = setTimeout(() => void save(), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, save]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (fingerprint(latest.current) !== savedPrint.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const ensureSaved = useCallback(async () => {
    await chain.current;
    if (fingerprint(latest.current) === savedPrint.current) return true;
    return save();
  }, [save]);

  const setSections = (sections: Section[]) =>
    setDraft((current) => ({ ...current, content: { ...current.content, sections } }));
  const updateSection = (id: string, change: (section: Section) => Section) =>
    setDraft((current) => ({
      ...current,
      content: {
        ...current.content,
        sections: current.content.sections.map((section) =>
          section.id === id ? change(section) : section,
        ),
      },
    }));
  const updateMeta = (patch: Partial<SiteMeta>) =>
    setDraft((current) => ({
      ...current,
      content: { ...current.content, meta: { ...current.content.meta, ...patch } },
    }));
  const setColors = (colors: SiteColors) =>
    setDraft((current) => ({
      ...current,
      theme: { palettes: { ...current.theme.palettes, [current.templateKey]: colors } },
    }));
  const resetColors = () =>
    setDraft((current) => {
      const palettes = { ...current.theme.palettes };
      delete palettes[current.templateKey];
      return { ...current, theme: { palettes } };
    });
  // Switching templates keeps the design the site already uses for that template; moving to a
  // newer design is its own choice (setDesign), made in the Template tab.
  const setTemplate = (templateKey: TemplateKey) =>
    setDraft((current) => ({
      ...current,
      templateKey,
      templateVersion: designOnChoosing(templateKey, [
        live,
        { key: current.templateKey, version: current.templateVersion },
      ]),
    }));
  const setDesign = (templateVersion: number) =>
    setDraft((current) => ({ ...current, templateVersion }));

  /** A text in the preview was clicked: show its form, and say whether it can be edited there. */
  const startInlineEdit = (path: string) => {
    const sectionId = sectionIdOfField(latest.current.content, path);
    if (sectionId) {
      setTab("content");
      setSelectedId(sectionId);
    }
    return canEditInPlace(latest.current.content, path);
  };
  const commitInlineEdit = (path: string, before: string, after: string) => {
    setDraft((current) => {
      const content = editInPlace(current.content, path, before, after);
      return content ? { ...current, content } : current;
    });
    setFormRevision((revision) => revision + 1);
  };

  const rewrite = async (mode: RewriteMode) => {
    const hero = sectionOf(draft.content, "hero");
    if (!hero) return;
    setRewriting(true);
    setRewriteError(null);
    const result = await rewriteHeadlineAction(siteId, hero.headline, mode).catch(() => ({
      ok: false as const,
      error: "AI rewriting is unavailable right now.",
    }));
    setRewriting(false);
    if (result.ok) updateSection(hero.id, (section) => ({ ...section, headline: result.headline }));
    else setRewriteError(result.error);
  };

  const colors = resolveSiteColors(draft.theme, draft.templateKey, draft.templateVersion);
  const template = getTemplate(draft.templateKey, draft.templateVersion);
  const newer = newerDesign(draft.templateKey, draft.templateVersion);
  const renderable = useMemo(() => {
    const content = previewContent(draft.content, state.lastValid);
    // The preview shows what the live site will: on the free plan the form stays off.
    return pro
      ? content
      : {
          ...content,
          sections: content.sections.map((section) =>
            section.type === "contact"
              ? { ...section, form: { enabled: false, topics: section.form?.topics ?? [] } }
              : section,
          ),
        };
  }, [draft.content, state.lastValid, pro]);
  const currentPrint = liveFingerprint(draft);
  const everPublished = livePrint !== null;
  const statusTag =
    status === "paused"
      ? { label: "Paused", className: "tag tag-warning" }
      : !everPublished
        ? { label: "Draft", className: "tag tag-neutral" }
        : currentPrint === livePrint
          ? { label: "Live", className: "tag tag-accent" }
          : { label: "Unpublished changes", className: "tag tag-warning" };
  const contact = draft.content.sections.find((section) => section.type === "contact");
  const reachable =
    contact?.type === "contact" &&
    (Boolean(contact.email?.trim()) ||
      contact.links.some((link) => link.href.trim()) ||
      (pro && template.contactForm && contact.form?.enabled !== false));
  const blocker =
    !pro && isPremiumTemplate(draft.templateKey)
      ? `${template.name} is a Pro template. Switch to Meridian under Template to publish on the free plan.`
      : !isPublishableColors(colors)
        ? `Text contrast is ${contrastRatio(colors.ink, colors.bg).toFixed(1)}:1. Publishing needs at least ${MIN_TEXT_CONTRAST}:1: adjust your colours in Brand.`
        : errors.size
          ? "Some fields need fixing before you can publish. They're highlighted in Content."
          : !reachable
            ? pro
              ? "Visitors need a way to reach you. Under Contact, add an email or a link, or turn on the contact form."
              : "Visitors need a way to reach you. Under Contact, add an email or a link."
            : null;

  const onPublished = (result: PublishedResult) => {
    setSubdomain(result.subdomain);
    setVersions(result.versionNumber);
    setLivePrint(liveFingerprint(latest.current));
    setLive({ key: latest.current.templateKey, version: latest.current.templateVersion });
  };

  const address = `${addressPrefix}${subdomain}${addressSuffix}`;
  const selected = draft.content.sections.find((section) => section.id === selectedId);
  const hero = sectionOf(draft.content, "hero");
  const meta = draft.content.meta;
  const shareView: ShareView = {
    template: draft.templateKey,
    templateName: template.name,
    colors,
    name: meta.name,
    initials: initialsOf(meta.name),
    role: meta.role || roleFromEyebrow(hero?.eyebrow) || undefined,
    organization: meta.company || undefined,
    photo: hero?.image?.src,
    domain: customDomain ?? address,
    title: meta.title ?? "",
    description: meta.description ?? "",
    autoTitle: siteTitle({ ...meta, title: undefined }, hero),
    autoDescription: siteDescription({ ...meta, description: undefined }, hero) ?? "",
    shareImage: meta.shareImage,
    favicon: meta.favicon,
  };
  const chooseDevice = (next: Device) => {
    setDevice(next);
    void saveEditorDeviceAction(next).catch(() => undefined);
  };
  const selectFromSidebar = (id: string) => {
    setSelectedId(id);
    setSelectionScroll((count) => count + 1);
  };
  const selectFromPage = (id: string) => {
    setTab("content");
    setSelectedId(id);
  };
  const saveLabel = {
    saved: "All changes saved",
    saving: "Saving…",
    invalid: "Fix highlighted fields to save",
    error: saveError ?? "Couldn't save",
  }[saveState];
  const saveDot = {
    saved: "var(--color-accent)",
    saving: "var(--color-neutral-400)",
    invalid: "var(--color-danger)",
    error: "var(--color-danger)",
  }[saveState];

  return (
    <div className="grid min-h-dvh grid-rows-[auto_minmax(0,1fr)] lg:h-dvh">
      <header
        className="flex h-[60px] items-center gap-4 border-b border-divider bg-neutral-100 text-[15px]"
        style={{ paddingInline: "clamp(16px,2vw,24px)" }}
      >
        <Link href="/dashboard" className="text-text no-underline hover:text-text">
          <Wordmark />
        </Link>
        <span className="hidden text-neutral-500 md:inline">/</span>
        <span className="hidden min-w-0 truncate md:inline">{address}</span>
        <span className={`${statusTag.className} hidden sm:inline-flex`}>{statusTag.label}</span>
        <span
          role="status"
          className="ml-auto flex items-center gap-2 text-[13px] text-neutral-700"
          title={saveState === "error" ? "Changes will retry on your next edit" : undefined}
        >
          <span
            className="size-[7px] rounded-full transition-[background] duration-300"
            style={{ background: saveDot }}
          />
          <span className="hidden sm:inline">{saveLabel}</span>
          {saveState === "error" ? (
            <button type="button" className="btn btn-ghost" onClick={() => void save()}>
              Retry
            </button>
          ) : null}
        </span>
        <Link href="/dashboard" className="btn btn-ghost hidden sm:inline-flex">
          Dashboard
        </Link>
        <button
          type="button"
          className="btn btn-primary"
          style={{ padding: "10px 16px", gap: 10, justifyContent: "space-between", minWidth: 140 }}
          onClick={() => setPublishOpen(true)}
        >
          {everPublished ? "Update site" : "Publish"} <ArrowRight />
        </button>
      </header>
      <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside
          aria-label="Editor"
          className="flex min-h-0 flex-col border-divider bg-neutral-100 lg:overflow-auto lg:border-r"
        >
          <div className="border-b border-divider" style={{ padding: "14px 16px" }}>
            <div className="seg grid w-full grid-cols-4" role="radiogroup" aria-label="Panel">
              {TABS.map(([key, label]) => (
                <label key={key} className="seg-opt justify-center" style={{ paddingInline: 4 }}>
                  <input
                    type="radio"
                    name="editor-tab"
                    checked={tab === key}
                    onChange={() => setTab(key)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          {banner ? (
            <div className="m-3 mb-0 flex items-start gap-2 border border-accent bg-accent-100 p-3 text-[13px]">
              <span className="flex-1">{banner}</span>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: "0 6px" }}
                aria-label="Dismiss"
                onClick={() => setBanner(null)}
              >
                ×
              </button>
            </div>
          ) : null}
          {newer && !designNoticeSeen && tab !== "design" ? (
            <div className="m-3 mb-0 flex items-start gap-2 border border-accent bg-accent-100 p-3 text-[13px]">
              <span className="flex-1">
                {template.name} has a new design. Your site keeps its current look unless you choose
                the new one and publish.
              </span>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: "0 6px" }}
                onClick={() => {
                  setDesignNoticeSeen(true);
                  setTab("design");
                }}
              >
                See it
              </button>
            </div>
          ) : null}
          {tab === "content" ? (
            <ContentPanel
              content={draft.content}
              selectedId={selectedId}
              errors={errors}
              initials={initials}
              rewriting={rewriting}
              rewriteError={rewriteError}
              revision={formRevision}
              template={{ name: template.name, contactForm: template.contactForm }}
              pro={pro}
              onSelect={selectFromSidebar}
              onSections={setSections}
              onSection={updateSection}
              onMeta={updateMeta}
              onRewrite={rewrite}
            />
          ) : tab === "brand" ? (
            <BrandPanel
              templateKey={draft.templateKey}
              templateVersion={draft.templateVersion}
              templateName={template.name}
              colors={colors}
              onColors={setColors}
              onReset={resetColors}
            />
          ) : tab === "share" ? (
            <SharingPanel view={shareView} onMeta={updateMeta} />
          ) : (
            <TemplatePanel
              current={{ key: draft.templateKey, version: draft.templateVersion }}
              live={live}
              theme={draft.theme}
              content={renderable}
              pro={pro}
              onChoose={setTemplate}
              onDesign={setDesign}
            />
          )}
        </aside>
        {tab === "share" ? (
          <SharingPreviews view={shareView} />
        ) : (
          <DeviceCanvas
            device={device}
            onDevice={chooseDevice}
            address={address}
            selectedLabel={
              selected?.visible && selected.type !== "cta" ? SECTION_LABELS[selected.type] : null
            }
            findSection={(root) => (selected ? sectionElement(root, selected) : null)}
            sectionAt={(root, target) => sectionIdAt(root, draft.content.sections, target)}
            onSelect={selectFromPage}
            scrollKey={selectionScroll}
          >
            <InlineEditing onStart={startInlineEdit} onCommit={commitInlineEdit}>
              <TemplateView
                templateKey={draft.templateKey}
                templateVersion={draft.templateVersion}
                colors={colors}
                content={renderable}
                publishedAt={PREVIEW_DATE}
                preview
                editable
              />
            </InlineEditing>
          </DeviceCanvas>
        )}
      </div>
      <PublishDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        siteId={siteId}
        live={everPublished}
        subdomain={subdomain}
        addressPrefix={addressPrefix}
        addressSuffix={addressSuffix}
        nextVersion={versions + 1}
        blocker={blocker}
        pro={pro}
        ensureSaved={ensureSaved}
        onPublished={onPublished}
      />
    </div>
  );
}
