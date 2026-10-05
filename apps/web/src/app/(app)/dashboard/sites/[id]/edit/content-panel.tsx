"use client";

import {
  FIXED_SECTION_TYPES,
  paragraphFromMarkup,
  paragraphToMarkup,
  richTextToPlain,
  type EditableSectionType,
  type ExperienceItem,
  type FocusItem,
  type PortfolioItem,
  type Section,
  type SectionOf,
  type SiteContent,
  type SiteMeta,
  type TestimonialItem,
} from "@ceomaker/schema";
import type { TemplateDefinition } from "@ceomaker/templates";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Blueprint, Spinner } from "@/components/ui";
import type { RewriteMode } from "@/lib/ai/draft";
import { offersSection, SECTION_LABELS, sectionIdOfField, type FieldErrors } from "./editor-model";
import { RemoveButton, TextAreaField, TextField } from "./fields";
import { ImageField, PhotosField, PortraitField } from "./portrait-field";
import { UpgradePrompt } from "@/components/pro";

const REWRITE_OPTIONS: RewriteMode[] = ["Sharper", "More formal", "Shorter"];

const QUICK_LINKS: [string, string][] = [
  ["LinkedIn", "https://www.linkedin.com/in/"],
  ["X", "https://x.com/"],
  ["Company site", "https://"],
  ["Book a call", "https://"],
];

const LINK_SHAPE =
  /^(https?:\/\/[^\s]+\.[^\s]+|mailto:[^\s@]+@[^\s@]+|tel:[+\d][\d\s-]+|#[\w-]+)$/i;

function linkMessage(href: string | undefined): { text: string; tone: "muted" | "ok" | "error" } {
  if (!href) return { text: "Add a URL", tone: "muted" };
  if (LINK_SHAPE.test(href)) return { text: "Opens in a new tab", tone: "ok" };
  return { text: "Use a full address starting with https://", tone: "error" };
}

type Editable = Extract<Section, { type: EditableSectionType }>;

export interface ContentPanelProps {
  content: SiteContent;
  selectedId: string;
  errors: FieldErrors;
  initials: string;
  rewriting: boolean;
  rewriteError: string | null;
  /** Bumped when text is edited in the preview, so forms that keep local text re-read it. */
  revision: number;
  /** Bumped by "Fix" in the save status: the form opens at its first field with an error. */
  fixRequest: number;
  /** The current template, for settings only some templates show (the contact form, photos). */
  template: Pick<TemplateDefinition, "name" | "contactForm" | "shows">;
  /** The contact form can only be switched on with Pro. */
  pro: boolean;
  onSelect: (id: string) => void;
  onSections: (sections: Section[]) => void;
  onSection: (id: string, update: (section: Section) => Section) => void;
  onMeta: (patch: Partial<SiteMeta>) => void;
  onRewrite: (mode: RewriteMode) => void;
}

/** Sections the current template shows. The rest stay in the content, untouched. */
function offered(template: ContentPanelProps["template"]) {
  return (section: Section) => offersSection(template.shows, section.type);
}

export function ContentPanel(props: ContentPanelProps) {
  const { content, selectedId } = props;
  const sections = (content.sections as Editable[]).filter(offered(props.template));
  const selected = sections.find((section) => section.id === selectedId) ?? sections[0]!;
  const form = useRef<HTMLDivElement>(null);
  const { fixRequest } = props;

  // After "Fix", the form has remounted with the failing row open: go to its first bad field.
  useEffect(() => {
    if (!fixRequest) return;
    const frame = requestAnimationFrame(() => {
      const field = form.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
      const target = field ?? form.current;
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
      field?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [fixRequest]);

  return (
    <>
      <SectionList {...props} sections={sections} />
      <div
        key={selected.id}
        ref={form}
        className="cm-rise flex flex-col gap-3.5 border-t border-divider"
        style={{ padding: "16px 16px 40px", "--delay": "0ms" } as React.CSSProperties}
      >
        <span className="kicker">{SECTION_LABELS[selected.type]}</span>
        <SectionForm key={`${props.revision}-${fixRequest}`} {...props} section={selected} />
      </div>
    </>
  );
}

function SectionList({
  content,
  sections,
  selectedId,
  template,
  errors,
  onSelect,
  onSections,
}: ContentPanelProps & { sections: Editable[] }) {
  const rows = useRef(new Map<string, HTMLDivElement>());
  const failing = new Set([...errors.keys()].map((path) => sectionIdOfField(content, path)));
  const [dragging, setDragging] = useState<string | null>(null);
  const middle = sections.slice(1, -1);

  const move = (id: string, to: number) => {
    const from = middle.findIndex((section) => section.id === id);
    if (from < 0 || to < 0 || to >= middle.length || to === from) return;
    const next = [...middle];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    // Sections this template doesn't offer keep their places among the others.
    const shown = offered(template);
    let at = 0;
    onSections(
      content.sections.map((section) =>
        shown(section) && !FIXED_SECTION_TYPES.has(section.type) ? next[at++]! : section,
      ),
    );
  };

  const onPointerMove = (event: PointerEvent, id: string) => {
    if (dragging !== id) return;
    // Target the slot whose midpoint the pointer has passed.
    let target = 0;
    middle.forEach((section, index) => {
      const box = rows.current.get(section.id)?.getBoundingClientRect();
      if (box && event.clientY > box.top + box.height / 2) target = index;
    });
    const from = middle.findIndex((section) => section.id === id);
    if (target !== from) move(id, target);
  };

  const onKeyDown = (event: KeyboardEvent, id: string) => {
    const from = middle.findIndex((section) => section.id === id);
    if (event.key === "ArrowUp") {
      event.preventDefault();
      move(id, from - 1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      move(id, from + 1);
    }
  };

  const toggle = (id: string) =>
    onSections(
      content.sections.map((section) =>
        section.id === id ? { ...section, visible: !section.visible } : section,
      ),
    );

  return (
    <div
      role="list"
      aria-label="Sections"
      className="flex flex-col gap-0.5"
      style={{ padding: "12px 12px 8px" }}
    >
      {sections.map((section) => {
        const fixed = FIXED_SECTION_TYPES.has(section.type);
        const label = SECTION_LABELS[section.type];
        const isSelected = section.id === selectedId;
        return (
          <div
            key={section.id}
            role="listitem"
            ref={(element) => {
              if (element) rows.current.set(section.id, element);
              else rows.current.delete(section.id);
            }}
            className="flex cursor-pointer items-center gap-2.5 transition-[background,border-color,opacity] duration-200 hover:bg-accent-100"
            style={{
              padding: "10px 12px",
              border: `1px solid ${isSelected ? "var(--color-accent)" : "transparent"}`,
              background: isSelected
                ? "var(--color-accent-100)"
                : dragging === section.id
                  ? "var(--color-neutral-200)"
                  : undefined,
              opacity: section.visible ? 1 : 0.45,
            }}
            onClick={() => onSelect(section.id)}
          >
            {fixed ? (
              <span aria-hidden className="w-4 text-[13px] tracking-[-2px] text-neutral-300">
                ⋮⋮
              </span>
            ) : (
              <button
                type="button"
                aria-label={`Move ${label}. Use the arrow keys.`}
                className="w-4 cursor-grab touch-none text-[13px] tracking-[-2px] text-neutral-500 active:cursor-grabbing"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => onKeyDown(event, section.id)}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setDragging(section.id);
                }}
                onPointerMove={(event) => onPointerMove(event, section.id)}
                onPointerUp={() => setDragging(null)}
                onPointerCancel={() => setDragging(null)}
              >
                ⋮⋮
              </button>
            )}
            <span className="flex flex-1 items-center gap-2 text-[15px]">
              {label}
              {failing.has(section.id) ? (
                <span className="flex items-center gap-1.5 text-xs text-danger">
                  <span aria-hidden className="size-1.5 rounded-full bg-danger" />
                  Needs fixing
                </span>
              ) : null}
            </span>
            {fixed ? (
              <span className="px-2 text-xs text-neutral-500">Fixed</span>
            ) : (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: "2px 8px", fontSize: 12, color: "var(--color-neutral-700)" }}
                aria-pressed={!section.visible}
                aria-label={`${section.visible ? "Hide" : "Show"} ${label}`}
                onClick={(event) => {
                  event.stopPropagation();
                  toggle(section.id);
                }}
              >
                {section.visible ? "Hide" : "Show"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SectionForm(props: ContentPanelProps & { section: Editable }) {
  const { section } = props;
  const error = (path: string, prefix = false) => {
    const key = `${section.id}.${path}`;
    if (!prefix) return props.errors.get(key);
    for (const [found, message] of props.errors) if (found.startsWith(key)) return message;
    return undefined;
  };
  const update = <T extends Editable>(change: (current: T) => T) =>
    props.onSection(section.id, (current) => change(current as T));

  switch (section.type) {
    case "hero":
      return <HeroForm {...props} section={section} error={error} update={update} />;
    case "about":
      return (
        <AboutForm
          section={section}
          error={error}
          update={update}
          template={props.template}
          name={props.content.meta.name}
        />
      );
    case "achievements":
      return <ImpactForm section={section} error={error} update={update} />;
    case "focus":
      return <FocusForm section={section} error={error} update={update} />;
    case "experience":
      return <ExperienceForm section={section} error={error} update={update} />;
    case "portfolio":
      return <WorkForm section={section} error={error} update={update} template={props.template} />;
    case "testimonials":
      return (
        <QuotesForm section={section} error={error} update={update} template={props.template} />
      );
    case "cta":
      return <CtaForm section={section} error={error} update={update} />;
    case "contact":
      return (
        <ContactForm
          section={section}
          error={error}
          update={update}
          template={props.template}
          pro={props.pro}
        />
      );
  }
}

type FormProps<T extends EditableSectionType> = {
  section: SectionOf<T>;
  /** The error of a field; with `prefix`, the first error of any field under that path. */
  error: (path: string, prefix?: boolean) => string | undefined;
  update: (change: (current: SectionOf<T>) => SectionOf<T>) => void;
};

type TemplateProps = { template: ContentPanelProps["template"] };

function HiddenNote({ section, count, noun }: { section: Section; count: number; noun: string }) {
  if (!section.visible) {
    return (
      <span className="text-[13px] text-neutral-700">
        Hidden on your site. Use Show in the list above when it&apos;s ready.
      </span>
    );
  }
  if (count === 0) {
    return (
      <span className="text-[13px] text-neutral-700">
        Add at least one {noun} to show this section.
      </span>
    );
  }
  return null;
}

function HeroForm({
  section,
  error,
  update,
  content,
  initials,
  rewriting,
  rewriteError,
  onMeta,
  onRewrite,
  errors,
  template,
}: FormProps<"hero"> & ContentPanelProps) {
  const meta = content.meta;
  const cta = section.primaryCta ?? { label: "", href: "" };
  const [affiliations, setAffiliations] = useState(meta.affiliations.join("\n"));
  const [keywords, setKeywords] = useState(meta.keywords.join(", "));
  return (
    <>
      <PortraitField
        image={section.image}
        initials={initials}
        name={meta.name}
        focus={template.shows.focal}
        onChange={(image) => update((current) => ({ ...current, image }))}
      />
      {template.shows.gallery ? (
        <PhotosField
          photos={section.gallery ?? []}
          onChange={(change) =>
            update((current) => {
              const gallery = change(current.gallery ?? []);
              return { ...current, gallery: gallery.length ? gallery : undefined };
            })
          }
        />
      ) : null}
      <TextField
        label="Eyebrow"
        value={section.eyebrow}
        error={error("eyebrow")}
        maxLength={80}
        onChange={(eyebrow) => update((current) => ({ ...current, eyebrow }))}
      />
      <TextAreaField
        label="Headline"
        value={section.headline}
        error={error("headline")}
        minHeight={76}
        maxLength={120}
        style={{ opacity: rewriting ? 0.35 : 1, transition: "opacity .3s" }}
        onChange={(headline) => update((current) => ({ ...current, headline }))}
      />
      <Blueprint className="flex flex-col gap-2.5 bg-accent-100 p-3.5">
        <span className="flex items-center gap-2 text-[13px] text-accent-800">
          {rewriting ? <Spinner size={12} /> : null}
          {rewriting ? "Rewriting…" : "Rewrite the headline"}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {REWRITE_OPTIONS.map((mode) => (
            <button
              key={mode}
              type="button"
              className="btn btn-secondary hover:-translate-y-px"
              style={{ fontSize: 13, padding: "5px 10px", background: "var(--color-neutral-100)" }}
              disabled={rewriting}
              onClick={() => onRewrite(mode)}
            >
              {mode}
            </button>
          ))}
        </div>
        {rewriteError ? (
          <span role="alert" className="text-xs text-danger">
            {rewriteError}
          </span>
        ) : null}
      </Blueprint>
      <TextAreaField
        label="Introduction"
        value={section.subheadline}
        error={error("subheadline")}
        minHeight={120}
        maxLength={280}
        onChange={(subheadline) => update((current) => ({ ...current, subheadline }))}
      />
      <div className="grid grid-cols-2 gap-2">
        <TextField
          label="Button label"
          value={cta.label}
          error={error("primaryCta.label")}
          maxLength={40}
          onChange={(label) => update((current) => ({ ...current, primaryCta: { ...cta, label } }))}
        />
        <TextField
          label="Button link"
          value={cta.href}
          error={error("primaryCta.href")}
          placeholder="#contact"
          spellCheck={false}
          onChange={(href) =>
            update((current) => ({ ...current, primaryCta: { ...cta, href: href.trim() } }))
          }
        />
      </div>
      <span className="kicker mt-2">Profile details</span>
      <TextField
        label="Full name"
        value={meta.name}
        error={errors.get("meta.name")}
        maxLength={60}
        onChange={(name) => onMeta({ name })}
      />
      <div className="grid grid-cols-2 gap-2">
        <TextField
          label="Title"
          value={meta.role}
          error={errors.get("meta.role")}
          maxLength={80}
          placeholder="Chief Executive Officer"
          onChange={(role) => onMeta({ role })}
        />
        <TextField
          label="Organisation"
          value={meta.company}
          error={errors.get("meta.company")}
          maxLength={80}
          onChange={(company) => onMeta({ company })}
        />
      </div>
      <TextField
        label="Based in"
        value={meta.location}
        error={errors.get("meta.location")}
        maxLength={60}
        placeholder="City"
        onChange={(location) => onMeta({ location })}
      />
      <TextField
        label="Open to"
        value={meta.availability}
        error={errors.get("meta.availability")}
        maxLength={80}
        placeholder="Open to board and advisory roles"
        onChange={(availability) => onMeta({ availability })}
      />
      <TextField
        label="Open to, short"
        value={meta.availabilityShort}
        error={errors.get("meta.availabilityShort")}
        maxLength={40}
        placeholder="Board and advisory roles"
        onChange={(availabilityShort) => onMeta({ availabilityShort })}
      />
      <TextAreaField
        label="Boards and affiliations"
        value={affiliations}
        minHeight={76}
        hint="One per line. Shown as a strip or marquee in some templates."
        onChange={(value) => {
          setAffiliations(value);
          onMeta({
            affiliations: value
              .split("\n")
              .map((item) => item.trim())
              .filter(Boolean)
              .slice(0, 12),
          });
        }}
      />
      <TextField
        label="Keywords"
        value={keywords}
        hint="Comma separated, e.g. Operator, Board member. Used by Monument."
        onChange={(value) => {
          setKeywords(value);
          onMeta({
            keywords: value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
              .slice(0, 8),
          });
        }}
      />
    </>
  );
}

function AboutForm({
  section,
  error,
  update,
  template,
  name,
}: FormProps<"about"> & TemplateProps & { name: string }) {
  const [opening, setOpening] = useState(section.body[0] ? paragraphToMarkup(section.body[0]) : "");
  const [rest, setRest] = useState(richTextToPlain(section.body.slice(1)));
  const commit = (nextOpening: string, nextRest: string) =>
    update((current) => ({
      ...current,
      body: [
        paragraphFromMarkup(nextOpening),
        ...nextRest.split(/\n\s*\n/).map((paragraph) => paragraphFromMarkup(paragraph)),
      ].filter((paragraph) => paragraph !== null),
    }));
  return (
    <>
      <TextAreaField
        label="Opening paragraph"
        value={opening}
        minHeight={120}
        error={error("body")}
        hint="Wrap a phrase in *asterisks* to highlight it."
        onChange={(value) => {
          setOpening(value);
          commit(value, rest);
        }}
      />
      <TextAreaField
        label="Second paragraph"
        value={rest}
        minHeight={140}
        onChange={(value) => {
          setRest(value);
          commit(opening, value);
        }}
      />
      {template.shows.aboutImage ? (
        <ImageField
          label="Photo"
          image={section.image}
          alt={name}
          focus={template.shows.focal}
          onChange={(image) => update((current) => ({ ...current, image }))}
        />
      ) : null}
      <HiddenNote section={section} count={section.body.length} noun="paragraph" />
    </>
  );
}

function ImpactForm({ section, error, update }: FormProps<"achievements">) {
  const setItem = (index: number, patch: Partial<{ value: string; label: string }>) =>
    update((current) => ({
      ...current,
      items: current.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  return (
    <>
      {section.items.map((item, index) => (
        <div key={index} className="grid grid-cols-[96px_minmax(0,1fr)_auto] items-start gap-2">
          <input
            className="input"
            aria-label={`Number ${index + 1}`}
            placeholder="42%"
            maxLength={20}
            value={item.value}
            aria-invalid={error(`items.${index}.value`) ? true : undefined}
            onChange={(event) => setItem(index, { value: event.target.value })}
          />
          <input
            className="input"
            aria-label={`What number ${index + 1} measures`}
            placeholder="Reduction in delivery variance"
            maxLength={80}
            value={item.label}
            aria-invalid={error(`items.${index}.label`) ? true : undefined}
            onChange={(event) => setItem(index, { label: event.target.value })}
          />
          <RemoveButton
            label={`Remove number ${index + 1}`}
            onClick={() =>
              update((current) => ({
                ...current,
                items: current.items.filter((_, i) => i !== index),
              }))
            }
          />
        </div>
      ))}
      {section.items.length < 8 ? (
        <button
          type="button"
          className="btn btn-ghost self-start"
          style={{ paddingLeft: 0 }}
          onClick={() =>
            update((current) => ({
              ...current,
              items: [...current.items, { value: "", label: "" }],
            }))
          }
        >
          + Add a number
        </button>
      ) : null}
      <span className="text-[13px] text-neutral-700">
        Up to 8 numbers. Four reads best. Only numbers you can stand behind.
      </span>
      <HiddenNote section={section} count={section.items.length} noun="number" />
    </>
  );
}

/** A collapsible list of items, each summarized in one row and edited in place. */
function ItemList<T>({
  items,
  summary,
  editor,
  addLabel,
  onAdd,
  onRemove,
  removeLabel,
  max,
  invalid,
}: {
  items: T[];
  summary: (item: T) => ReactNode;
  editor: (item: T, index: number) => ReactNode;
  addLabel: string;
  onAdd: () => void;
  onRemove: (index: number) => void;
  removeLabel: string;
  max: number;
  /** Rows with a field that needs fixing: marked, and the first one opens. */
  invalid: (index: number) => boolean;
}) {
  const [open, setOpen] = useState<number | null>(() => {
    const first = items.findIndex((_, index) => invalid(index));
    return first >= 0 ? first : null;
  });
  return (
    <>
      {items.map((item, index) => (
        <div
          key={index}
          className="flex flex-col border"
          style={{ borderColor: invalid(index) ? "var(--color-danger)" : "var(--color-divider)" }}
        >
          <button
            type="button"
            className="flex flex-col gap-0.5 p-3 text-left hover:bg-accent-100"
            aria-expanded={open === index}
            onClick={() => setOpen(open === index ? null : index)}
          >
            {summary(item)}
            {invalid(index) ? <span className="text-xs text-danger">Needs fixing</span> : null}
          </button>
          {open === index ? (
            <div className="flex flex-col gap-2.5 border-t border-divider bg-bg p-3">
              {editor(item, index)}
              <button
                type="button"
                className="btn btn-ghost self-start"
                style={{ paddingLeft: 0, color: "var(--color-danger)" }}
                onClick={() => {
                  setOpen(null);
                  onRemove(index);
                }}
              >
                {removeLabel}
              </button>
            </div>
          ) : null}
        </div>
      ))}
      {items.length < max ? (
        <button
          type="button"
          className="btn btn-ghost self-start"
          style={{ paddingLeft: 0 }}
          onClick={() => {
            onAdd();
            setOpen(items.length);
          }}
        >
          {addLabel}
        </button>
      ) : null}
    </>
  );
}

function FocusForm({ section, error, update }: FormProps<"focus">) {
  const setItem = (index: number, patch: Partial<FocusItem>) =>
    update((current) => ({
      ...current,
      items: current.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  return (
    <>
      <ItemList
        items={section.items}
        invalid={(index) => Boolean(error(`items.${index}.`, true))}
        max={6}
        addLabel="+ Add an area"
        removeLabel="Remove this area"
        onAdd={() =>
          update((current) => ({ ...current, items: [...current.items, { title: "" }] }))
        }
        onRemove={(index) =>
          update((current) => ({ ...current, items: current.items.filter((_, i) => i !== index) }))
        }
        summary={(item) => (
          <>
            <span className="font-medium">{item.title || "New area"}</span>
            {item.description ? (
              <span className="line-clamp-1 text-[13px] text-neutral-700">{item.description}</span>
            ) : null}
          </>
        )}
        editor={(item, index) => (
          <>
            <TextField
              label="Area"
              value={item.title}
              placeholder="Board work"
              maxLength={60}
              error={error(`items.${index}.title`)}
              onChange={(title) => setItem(index, { title })}
            />
            <TextAreaField
              label="What you do there (optional)"
              value={item.description}
              maxLength={200}
              error={error(`items.${index}.description`)}
              onChange={(description) => setItem(index, { description })}
            />
          </>
        )}
      />
      <span className="text-[13px] text-neutral-700">
        Up to 6 areas you work on now. Four reads best.
      </span>
      <HiddenNote section={section} count={section.items.length} noun="area" />
    </>
  );
}

function ExperienceForm({ section, error, update }: FormProps<"experience">) {
  const setItem = (index: number, patch: Partial<ExperienceItem>) =>
    update((current) => ({
      ...current,
      items: current.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  return (
    <>
      <ItemList
        items={section.items}
        invalid={(index) => Boolean(error(`items.${index}.`, true))}
        max={20}
        addLabel="+ Add a role"
        removeLabel="Remove this role"
        onAdd={() =>
          update((current) => ({
            ...current,
            items: [...current.items, { role: "", organization: "" }],
          }))
        }
        onRemove={(index) =>
          update((current) => ({ ...current, items: current.items.filter((_, i) => i !== index) }))
        }
        summary={(item) => (
          <>
            <span className="font-medium">{item.role || "New role"}</span>
            <span className="text-[13px] text-neutral-700">
              {[item.organization, [item.start, item.end].filter(Boolean).join(" – ")]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </>
        )}
        editor={(item, index) => (
          <>
            <TextField
              label="Role"
              value={item.role}
              maxLength={100}
              error={error(`items.${index}.role`)}
              onChange={(role) => setItem(index, { role })}
            />
            <TextField
              label="Organisation"
              value={item.organization}
              maxLength={100}
              error={error(`items.${index}.organization`)}
              onChange={(organization) => setItem(index, { organization })}
            />
            <TextField
              label="Location"
              value={item.location}
              maxLength={80}
              onChange={(location) => setItem(index, { location })}
            />
            <div className="grid grid-cols-2 gap-2">
              <TextField
                label="From"
                value={item.start}
                placeholder="2019"
                maxLength={20}
                onChange={(start) => setItem(index, { start })}
              />
              <TextField
                label="To"
                value={item.end}
                placeholder="Present"
                maxLength={20}
                onChange={(end) => setItem(index, { end })}
              />
            </div>
            <TextAreaField
              label="What changed under you"
              value={item.summary}
              maxLength={500}
              onChange={(summary) => setItem(index, { summary })}
            />
          </>
        )}
      />
      <HiddenNote section={section} count={section.items.length} noun="role" />
    </>
  );
}

function WorkForm({ section, error, update, template }: FormProps<"portfolio"> & TemplateProps) {
  const setItem = (index: number, patch: Partial<PortfolioItem>) =>
    update((current) => ({
      ...current,
      items: current.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  return (
    <>
      <ItemList
        items={section.items}
        invalid={(index) => Boolean(error(`items.${index}.`, true))}
        max={12}
        addLabel="+ Add a talk, article or board seat"
        removeLabel="Remove this item"
        onAdd={() =>
          update((current) => ({ ...current, items: [...current.items, { title: "" }] }))
        }
        onRemove={(index) =>
          update((current) => ({ ...current, items: current.items.filter((_, i) => i !== index) }))
        }
        summary={(item) => (
          <>
            {item.kind ? (
              <span className="text-xs tracking-[0.08em] text-accent-700 uppercase">
                {item.kind}
              </span>
            ) : null}
            <span className="font-medium">{item.title || "New item"}</span>
            <span className="text-[13px] text-neutral-700">
              {[item.meta, item.year].filter(Boolean).join(" · ")}
            </span>
          </>
        )}
        editor={(item, index) => (
          <>
            <TextField
              label="Kind"
              value={item.kind}
              placeholder="Keynote, Essay, Board"
              maxLength={30}
              onChange={(kind) => setItem(index, { kind })}
            />
            <TextField
              label="Title"
              value={item.title}
              maxLength={120}
              error={error(`items.${index}.title`)}
              onChange={(title) => setItem(index, { title })}
            />
            <TextField
              label="Where or what"
              value={item.meta}
              placeholder="European Freight Forum"
              maxLength={120}
              onChange={(meta) => setItem(index, { meta })}
            />
            <TextField
              label="Year"
              value={item.year}
              placeholder="2025"
              maxLength={20}
              onChange={(year) => setItem(index, { year })}
            />
            <TextField
              label="Link (optional)"
              value={item.href}
              placeholder="https://"
              spellCheck={false}
              error={error(`items.${index}.href`)}
              onChange={(href) => setItem(index, { href: href.trim() })}
            />
            {template.shows.workImages ? (
              <ImageField
                label="Image (optional)"
                image={item.image}
                alt=""
                focus={template.shows.focal}
                onChange={(image) => setItem(index, { image })}
              />
            ) : null}
          </>
        )}
      />
      <HiddenNote section={section} count={section.items.length} noun="item" />
    </>
  );
}

function QuotesForm({
  section,
  error,
  update,
  template,
}: FormProps<"testimonials"> & TemplateProps) {
  const setItem = (index: number, patch: Partial<TestimonialItem>) =>
    update((current) => ({
      ...current,
      items: current.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  return (
    <>
      <ItemList
        items={section.items}
        invalid={(index) => Boolean(error(`items.${index}.`, true))}
        max={10}
        addLabel="+ Add a quote"
        removeLabel="Remove this quote"
        onAdd={() =>
          update((current) => ({
            ...current,
            items: [...current.items, { quote: "", author: "" }],
          }))
        }
        onRemove={(index) =>
          update((current) => ({ ...current, items: current.items.filter((_, i) => i !== index) }))
        }
        summary={(item) => (
          <>
            <span className="text-sm">“{item.quote || "New quote"}”</span>
            <span className="text-[13px] text-neutral-700">
              {[item.author, item.role].filter(Boolean).join(", ")}
            </span>
          </>
        )}
        editor={(item, index) => (
          <>
            <TextAreaField
              label="Quote"
              value={item.quote}
              maxLength={500}
              error={error(`items.${index}.quote`)}
              onChange={(quote) => setItem(index, { quote })}
            />
            <TextField
              label="Who said it"
              value={item.author}
              maxLength={80}
              error={error(`items.${index}.author`)}
              onChange={(author) => setItem(index, { author })}
            />
            <TextField
              label="Their role"
              value={item.role}
              placeholder="Chair, Meridian Freight Group"
              maxLength={100}
              onChange={(role) => setItem(index, { role })}
            />
            {template.shows.quotePhotos ? (
              <ImageField
                label="Their photo (optional)"
                image={item.photo}
                alt=""
                emptyHint="A portrait beside the quote. Without one, the quote stands alone."
                focus={template.shows.focal}
                onChange={(photo) => setItem(index, { photo })}
              />
            ) : null}
          </>
        )}
      />
      <span className="text-[13px] text-neutral-700">
        Only publish quotes you have permission to use.
      </span>
      <HiddenNote section={section} count={section.items.length} noun="quote" />
    </>
  );
}

function CtaForm({ section, error, update }: FormProps<"cta">) {
  const button = section.button ?? { label: "", href: "" };
  return (
    <>
      <TextAreaField
        label="Headline"
        value={section.headline}
        error={error("headline")}
        minHeight={76}
        maxLength={120}
        onChange={(headline) => update((current) => ({ ...current, headline }))}
      />
      <TextAreaField
        label="A line under it (optional)"
        value={section.body}
        error={error("body")}
        minHeight={76}
        maxLength={280}
        onChange={(body) => update((current) => ({ ...current, body }))}
      />
      <div className="grid grid-cols-2 gap-2">
        <TextField
          label="Button label"
          value={button.label}
          error={error("button.label")}
          maxLength={40}
          onChange={(label) =>
            update((current) => ({
              ...current,
              button: { label, href: current.button?.href || "#contact" },
            }))
          }
        />
        <TextField
          label="Button link"
          value={button.href}
          error={error("button.href")}
          placeholder="#contact"
          spellCheck={false}
          onChange={(href) =>
            update((current) => ({ ...current, button: { ...button, href: href.trim() } }))
          }
        />
      </div>
      <span className="text-[13px] text-neutral-700">
        {!section.visible
          ? "Hidden on your site. Use Show in the list above when it's ready."
          : section.headline.trim()
            ? "A closing invitation just before your contact details."
            : "Add a headline to show this section."}
      </span>
    </>
  );
}

function ContactForm({
  section,
  error,
  update,
  template,
  pro,
}: FormProps<"contact"> & { template: ContentPanelProps["template"]; pro: boolean }) {
  // On the free plan the form is off on the live site whatever is saved, so show it off.
  const formOn = pro && section.form?.enabled !== false;
  const formHint = !template.contactForm
    ? `${template.name} doesn't show a contact form. Meridian does.`
    : formOn
      ? "Visitors can write to you without seeing your email address. Messages arrive in your dashboard."
      : "Visitors use your email and links instead.";
  const links = section.links;
  const setLinks = (next: typeof links) => update((current) => ({ ...current, links: next }));
  const quick = QUICK_LINKS.filter(([label]) => !links.some((link) => link.label === label));
  return (
    <>
      <TextAreaField
        label="Invitation"
        value={section.blurb}
        minHeight={76}
        maxLength={280}
        error={error("blurb")}
        onChange={(blurb) => update((current) => ({ ...current, blurb }))}
      />
      <TextField
        label="Email"
        type="email"
        value={section.email}
        maxLength={254}
        error={error("email") ? "Enter a valid email address" : undefined}
        onChange={(email) => update((current) => ({ ...current, email: email.trim() }))}
      />
      <div className="flex flex-col gap-2">
        <span className="text-xs text-neutral-700">Links</span>
        {links.map((link, index) => {
          const message = linkMessage(link.href);
          const invalid =
            message.tone === "error" || Boolean(error(`links.${index}.href`) && link.href);
          return (
            <div
              key={index}
              className="cm-rise flex flex-col gap-1.5 bg-bg p-2.5"
              style={{
                border: `1px solid ${invalid ? "var(--color-danger)" : "var(--color-divider)"}`,
              }}
            >
              <div className="flex gap-1.5">
                <input
                  className="input flex-1"
                  aria-label={`Link ${index + 1} label`}
                  placeholder="Label"
                  maxLength={40}
                  value={link.label ?? ""}
                  onChange={(event) =>
                    setLinks(
                      links.map((item, i) =>
                        i === index ? { ...item, label: event.target.value } : item,
                      ),
                    )
                  }
                />
                <RemoveButton
                  label="Remove link"
                  onClick={() => setLinks(links.filter((_, i) => i !== index))}
                />
              </div>
              <input
                className="input"
                aria-label={`Link ${index + 1} address`}
                placeholder="https://"
                spellCheck={false}
                value={link.href}
                aria-invalid={invalid || undefined}
                onChange={(event) =>
                  setLinks(
                    links.map((item, i) =>
                      i === index ? { ...item, href: event.target.value.trim() } : item,
                    ),
                  )
                }
              />
              <span
                className="text-xs"
                style={{
                  color:
                    message.tone === "error" || invalid
                      ? "var(--color-danger)"
                      : message.tone === "ok"
                        ? "var(--color-accent-700)"
                        : "var(--color-neutral-600)",
                }}
              >
                {message.text}
              </span>
            </div>
          );
        })}
        {links.length < 10 && quick.length ? (
          <div className="flex flex-wrap gap-1.5">
            {quick.map(([label, href]) => (
              <button
                key={label}
                type="button"
                className="btn btn-secondary"
                style={{
                  fontSize: 12,
                  padding: "4px 10px",
                  background: "var(--color-neutral-100)",
                }}
                onClick={() => setLinks([...links, { label, href }])}
              >
                + {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs text-neutral-700">Contact form</span>
        <div className="seg grid w-full grid-cols-2" role="radiogroup" aria-label="Contact form">
          {(["on", "off"] as const).map((key) => (
            <label key={key} className="seg-opt justify-center">
              <input
                type="radio"
                name="contact-form"
                disabled={!pro}
                checked={formOn === (key === "on")}
                onChange={() =>
                  update((current) => ({
                    ...current,
                    form: { enabled: key === "on", topics: current.form?.topics ?? [] },
                  }))
                }
              />
              {key === "on" ? "On" : "Off"}
            </label>
          ))}
        </div>
        {pro ? (
          <span className="text-xs text-neutral-600">{formHint}</span>
        ) : (
          <UpgradePrompt title="Let visitors write to you">
            With Pro, visitors send you messages from your site without seeing your email address,
            and you read them in your dashboard.
          </UpgradePrompt>
        )}
      </div>
    </>
  );
}
