import type { RichTextSpan } from "@ceomaker/schema";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { ContactForm, type FormWords } from "../../contact-form";
import { FONTS } from "../../fonts";
import { linkProps } from "../../links";
import {
  headingOf,
  label,
  type HeadingKind,
  type ModelExperience,
  type ModelImage,
  type ModelText,
  type ModelWork,
  type SequenceKind,
  type SiteModel,
} from "../../model";
import { ANCHORS, ContactLink, CtaLink, editable, mailto, SkipLink } from "../../shared";
import type { SendContactMessage, TemplateProps } from "../../types";
import { FolioCarousel, FolioMenu, FolioSmooth } from "./client";
import { Icon } from "./icons";
import {
  ctaSizes,
  emailSizes,
  featureTitleSizes,
  figureSizes,
  folioRoleStyle,
  fullNavFrom,
  gradeStyle,
  nameSizes,
  quoteSizes,
  sizeVars,
  slideTitleSizes,
  statementSizes,
  tileSizes,
  titleSizes,
} from "./measure";

// Folio: the owner's work as large projects people can swipe through, with a clear story
// around them. A warm paper ground, Geist set large with tight tracking, Geist Mono for kinds,
// years and counters, soft-cornered cards, and a full-bleed work carousel at the centre.
// Layout lives in folio.css (container queries on the site's width: 600px leaves the phone
// layout, 1000px is desktop); this file decides what is shown, and measure.ts works out the
// sizes that depend on the content.

type TitledKind = HeadingKind | "focus";

const LABELS: Record<TitledKind, string> = {
  about: "About",
  impact: "Achievements",
  focus: "Focus",
  experience: "Experience",
  work: "Work",
  testimonials: "Testimonials",
  contact: "Contact",
};

const ANCHOR: Record<Exclude<SequenceKind, "cta"> | "contact", string> = {
  ...ANCHORS,
  focus: "focus",
};

function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

/** Template wording the owner can rewrite in the editor. */
function Words({ model, text }: { model: SiteModel; text: ModelText }) {
  return model.editable ? <span data-field={text.field}>{text.text}</span> : text.text;
}

/** A section's title: the owner's own, else Folio's label. */
function title(model: SiteModel, kind: TitledKind): ModelText {
  if (kind === "focus") {
    return {
      text: model.focus?.heading || LABELS.focus,
      field: model.focus?.headingField ?? "focus.heading",
    };
  }
  return headingOf(model, kind, LABELS[kind]);
}

/**
 * A display title with a square in the accent after it (when it ends in a letter or a figure),
 * kept on the line of the last word.
 */
function Titled({ model, text }: { model: SiteModel; text: ModelText }) {
  const words = text.text.trim().split(/\s+/);
  const last = words.pop() ?? "";
  const body = (
    <>
      {words.length ? `${words.join(" ")} ` : null}
      <span className="fo-nowrap-end">
        {last}
        {/[\p{L}\p{N}]$/u.test(last) ? <span aria-hidden="true" className="fo-square" /> : null}
      </span>
    </>
  );
  return model.editable ? <span data-field={text.field}>{body}</span> : body;
}

/** A photo, graded: the site's filter, and the accent laid over it in colour blend. */
function Photo({ image, eager }: { image: ModelImage; eager?: boolean }) {
  return (
    <span className="fo-photo">
      {/* Templates are framework-agnostic, so a plain <img> rather than next/image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.src}
        alt={image.alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        style={{ objectPosition: image.position }}
      />
      <span aria-hidden="true" className="fo-tint" />
    </span>
  );
}

/** Rich text: bold sits on a tint highlight, italic stays italic, links underline in the accent. */
function Rich({ spans }: { spans: RichTextSpan[] }) {
  return spans.map((span, index) => {
    let node: ReactNode = span.text;
    if (span.italic) node = <em>{node}</em>;
    if (span.bold) node = <strong className="fo-strong">{node}</strong>;
    if (!span.href) return <Fragment key={index}>{node}</Fragment>;
    return (
      <a key={index} {...linkProps(span.href)} className="fo-inline-link">
        {node}
      </a>
    );
  });
}

/** The visible sections (not the closing panel) and contact, for the header, menu and footer. */
function navOf(model: SiteModel) {
  return [
    ...model.sequence.filter((kind): kind is Exclude<SequenceKind, "cta"> => kind !== "cta"),
    "contact" as const,
  ].map((kind) => ({ href: `#${ANCHOR[kind]}`, text: title(model, kind) }));
}

/** The header's button: the hero's own, else one to the contact section. */
function headButton(model: SiteModel) {
  const cta = model.hero.cta;
  if (cta) return { href: cta.href, text: { text: cta.label, field: model.hero.fields.cta } };
  return {
    href: `#${ANCHORS.contact}`,
    text: { text: title(model, "contact").text, field: model.hero.fields.cta },
  };
}

function Brand({ model }: { model: SiteModel }) {
  return (
    <a href={`#${ANCHORS.top}`} className="fo-brand">
      <span aria-hidden="true" className="fo-mark" />
      <span {...editable(model, model.fields.name)} className="fo-brand-name">
        {model.name}
      </span>
    </a>
  );
}

function Header({ model }: { model: SiteModel }) {
  const nav = navOf(model);
  const button = headButton(model);
  const full = fullNavFrom(
    model.name,
    nav.map((item) => item.text.text),
    button.text.text,
  );
  return (
    <header className="fo-header" data-full={full ?? undefined}>
      <div className="fo-bar">
        <Brand model={model} />
        <nav aria-label="Sections" className="fo-nav">
          {nav.map((item) => (
            <a key={item.href} href={item.href} className="fo-nav-link">
              <Words model={model} text={item.text} />
            </a>
          ))}
        </nav>
        <CtaLink
          link={{ href: button.href, label: button.text.text }}
          className="fo-pill fo-head-cta"
        >
          <Words model={model} text={button.text} />
        </CtaLink>
        <div className="fo-menu-slot">
          <FolioMenu
            name={model.name}
            items={nav.map((item) => ({ href: item.href, label: item.text.text }))}
            button={
              model.hero.cta ? { href: model.hero.cta.href, label: model.hero.cta.label } : null
            }
            openLabel={label(model, "menu", "Menu").text}
            closeLabel={label(model, "menu-close", "Close").text}
          />
        </div>
      </div>
    </header>
  );
}

function Gallery({ model }: { model: SiteModel }) {
  const photos = model.gallery;
  if (!photos.length) return null;
  const caption = (photo: ModelImage) => photo.alt;
  if (photos.length < 4) {
    return (
      <ul className="fo-stills" data-n={photos.length}>
        {photos.map((photo, index) => (
          <li key={index} data-rise="" className="fo-still">
            <span className="fo-frame fo-still-frame">
              <Photo image={photo} />
            </span>
            {caption(photo) ? <span className="fo-caption">{caption(photo)}</span> : null}
          </li>
        ))}
      </ul>
    );
  }
  // From four photos, a slow strip that loops: the second copy is only there to close the seam.
  const strip = (copy: boolean) => (
    <ul className="fo-strip-list" aria-hidden={copy || undefined} data-copy={copy || undefined}>
      {photos.map((photo, index) => (
        <li key={index} className="fo-strip-item">
          <span className="fo-frame fo-strip-frame">
            <Photo image={copy ? { ...photo, alt: "" } : photo} />
          </span>
          {caption(photo) ? <span className="fo-strip-caption">{caption(photo)}</span> : null}
        </li>
      ))}
    </ul>
  );
  return (
    <div
      className="fo-strip"
      role="region"
      aria-label={label(model, "gallery", "Gallery").text}
      tabIndex={0}
    >
      <div
        className="fo-strip-run"
        style={{ "--fo-strip-t": `${photos.length * 6}s` } as CSSProperties}
      >
        {strip(false)}
        {strip(true)}
      </div>
    </div>
  );
}

function Hero({ model }: { model: SiteModel }) {
  const { hero } = model;
  const portrait = hero.image;
  // A headline that only repeats the name (older sites) isn't shown twice.
  const line =
    hero.headline.trim() && hero.headline.trim() !== model.name.trim() ? hero.headline : "";
  const strip = model.gallery.length >= 4;
  return (
    <>
      <section
        aria-labelledby="fo-name"
        className="fo-hero"
        data-portrait={portrait ? "" : undefined}
        data-strip={strip || undefined}
      >
        <div className="fo-hero-grid">
          <div className="fo-hero-text">
            {hero.eyebrow ? (
              <p {...editable(model, hero.fields.eyebrow)} className="fo-eyebrow fo-enter-1">
                {hero.eyebrow}
              </p>
            ) : null}
            <h1
              id="fo-name"
              {...editable(model, model.fields.name)}
              className="fo-name fo-fit fo-enter-2"
              style={sizeVars("fo-fs", nameSizes(model.name, Boolean(portrait)))}
            >
              {model.name}
            </h1>
            {line ? (
              <p
                {...editable(model, hero.fields.headline)}
                className="fo-line fo-enter-3"
                data-long={line.length > 90 || undefined}
              >
                {line}
              </p>
            ) : null}
          </div>
          {portrait ? (
            <span className="fo-frame fo-portrait fo-enter-img">
              <Photo image={portrait} eager />
            </span>
          ) : null}
        </div>
        {hero.subheadline || hero.cta ? (
          <div className="fo-hero-foot fo-enter-4">
            {hero.subheadline ? (
              <p {...editable(model, hero.fields.subheadline)} className="fo-intro">
                {hero.subheadline}
              </p>
            ) : null}
            {hero.cta ? (
              <CtaLink link={hero.cta} className="fo-pill fo-cta-pill fo-hero-button">
                <span {...editable(model, hero.fields.cta)}>{hero.cta.label}</span>
                <span aria-hidden="true" className="fo-arrow-glyph">
                  →
                </span>
              </CtaLink>
            ) : null}
          </div>
        ) : null}
        {strip ? null : <Gallery model={model} />}
      </section>
      {strip ? <Gallery model={model} /> : null}
    </>
  );
}

function Section({
  kind,
  className,
  children,
}: {
  kind: Exclude<SequenceKind, "cta"> | "contact";
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={ANCHOR[kind]} aria-labelledby={`fo-${kind}-h`} className={cx("fo-sec", className)}>
      <div className="fo-wrap">{children}</div>
    </section>
  );
}

function Title({
  model,
  kind,
  side,
  className,
}: {
  model: SiteModel;
  kind: TitledKind;
  side?: boolean;
  className?: string;
}) {
  const heading = title(model, kind);
  return (
    <h2
      id={`fo-${kind}-h`}
      data-rise=""
      className={cx("fo-title fo-fit", className)}
      style={sizeVars("fo-fs", titleSizes(heading.text, side))}
    >
      <Titled model={model} text={heading} />
    </h2>
  );
}

function About({ model }: { model: SiteModel }) {
  const about = model.about;
  if (!about) return null;
  const length = about.lead.reduce((total, span) => total + span.text.length, 0);
  return (
    <Section kind="about" className="fo-about">
      <Title model={model} kind="about" />
      <div className="fo-about-grid" data-image={about.image ? "" : undefined}>
        {about.image ? (
          <span data-reveal="" className="fo-frame fo-about-image">
            <Photo image={about.image} />
          </span>
        ) : null}
        <div className="fo-about-text">
          <p
            {...editable(model, about.fields.lead)}
            data-rise=""
            className="fo-statement"
            style={sizeVars("fo-st", statementSizes(length, Boolean(about.image)))}
          >
            <Rich spans={about.lead} />
          </p>
          {about.rest.length ? (
            <div
              data-rise=""
              className="fo-about-rest"
              data-columns={about.rest.length >= 2 ? "" : undefined}
            >
              {about.rest.map((paragraph, index) => (
                <p key={index} {...editable(model, paragraph.field)}>
                  {paragraph.text}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Section>
  );
}

function Impact({ model }: { model: SiteModel }) {
  const count = model.stats.length;
  return (
    <Section kind="impact">
      <Title model={model} kind="impact" />
      <ul className="fo-figures" data-n={Math.min(count, 4)}>
        {model.stats.map((stat, index) => (
          <li key={index} data-rise="" className="fo-card fo-figure-card">
            <span
              {...editable(model, stat.fields.value)}
              className="fo-figure fo-fit"
              style={sizeVars("fo-fs", figureSizes(stat.value, count))}
            >
              {stat.value}
            </span>
            {stat.label ? (
              <span {...editable(model, stat.fields.label)} className="fo-figure-label">
                {stat.label}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Focus({ model }: { model: SiteModel }) {
  const focus = model.focus;
  if (!focus) return null;
  return (
    <Section kind="focus" className="fo-focus">
      <div className="fo-focus-grid">
        <Title model={model} kind="focus" side className="fo-focus-title" />
        <ul className="fo-focus-list" data-one={focus.items.length === 1 || undefined}>
          {focus.items.map((item, index) => (
            <li key={index} data-rise="" className="fo-card fo-focus-card">
              <span aria-hidden="true" className="fo-focus-n">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 {...editable(model, item.fields.title)} className="fo-focus-name">
                {item.title}
              </h3>
              {item.description ? (
                <p {...editable(model, item.fields.description)} className="fo-focus-desc">
                  {item.description}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

function Role({ model, item }: { model: SiteModel; item: ModelExperience }) {
  return (
    <li data-rise="" className="fo-role-row">
      <div className="fo-role-in">
        <div className="fo-role-main">
          <span {...editable(model, item.fields.role)} className="fo-role">
            {item.role}
          </span>
          {item.organization || item.location ? (
            <span className="fo-org">
              {item.organization ? (
                <span {...editable(model, item.fields.organization)}>{item.organization}</span>
              ) : null}
              {item.organization && item.location ? " · " : null}
              {item.location ? (
                <span {...editable(model, item.fields.location)}>{item.location}</span>
              ) : null}
            </span>
          ) : null}
          {item.summary ? (
            <span {...editable(model, item.fields.summary)} className="fo-summary">
              {item.summary}
            </span>
          ) : null}
        </div>
        {item.start || item.end ? (
          <span className="fo-dates">
            {item.start ? <span {...editable(model, item.fields.start)}>{item.start}</span> : null}
            {item.start && item.end ? " – " : null}
            {item.end ? <span {...editable(model, item.fields.end)}>{item.end}</span> : null}
          </span>
        ) : null}
      </div>
    </li>
  );
}

function Experience({ model }: { model: SiteModel }) {
  const roles = model.experience;
  // More than ten roles: the first eight show, the rest open from a button. The editor lists
  // every role open, with the button above the rest so its wording can be changed.
  const cut = roles.length > 10 ? 8 : roles.length;
  const rest = roles.slice(cut);
  return (
    <Section kind="experience">
      <Title model={model} kind="experience" />
      <ol className="fo-roles">
        {roles.slice(0, cut).map((item, index) => (
          <Role key={index} model={model} item={item} />
        ))}
      </ol>
      {rest.length ? (
        <details className="fo-more" open={model.editable || undefined}>
          <summary className="fo-pill fo-outline fo-more-button">
            <Words model={model} text={label(model, "show-more", "Show more")} />
            <span className="fo-more-n">{rest.length}</span>
            <span aria-hidden="true">↓</span>
          </summary>
          <ol className="fo-roles fo-roles-rest" start={cut + 1}>
            {rest.map((item, index) => (
              <Role key={index} model={model} item={item} />
            ))}
          </ol>
        </details>
      ) : null}
    </Section>
  );
}

/** Kind and year, in mono: "BOOK · 2022". */
function KindYear({ model, item }: { model: SiteModel; item: ModelWork }) {
  if (!item.kind && !item.year) return null;
  return (
    <span className="fo-kind">
      {item.kind ? <span {...editable(model, item.fields.kind)}>{item.kind}</span> : null}
      {item.kind && item.year ? " · " : null}
      {item.year ? <span {...editable(model, item.fields.year)}>{item.year}</span> : null}
    </span>
  );
}

/** A project's picture: its image, or its kind, year and title set large on the tint. */
function Media({ item, single }: { item: ModelWork; single: boolean }) {
  return (
    <span className="fo-frame fo-media">
      {item.image ? (
        <span className="fo-zoom">
          <Photo image={item.image} />
        </span>
      ) : (
        <span aria-hidden="true" className="fo-tile">
          <span className="fo-tile-top">
            <span>{item.kind}</span>
            <span>{item.year}</span>
          </span>
          <span
            className="fo-tile-title fo-fit"
            style={sizeVars("fo-fs", tileSizes(item.title, single))}
          >
            {item.title}
          </span>
        </span>
      )}
    </span>
  );
}

function ViewLink({
  model,
  item,
  className,
}: {
  model: SiteModel;
  item: ModelWork;
  className: string;
}) {
  if (!item.href) return null;
  return (
    <a {...linkProps(item.href)} className={className}>
      <Words model={model} text={label(model, "view-project", "View project")} />
      <span aria-hidden="true">↗</span>
    </a>
  );
}

function Work({ model }: { model: SiteModel }) {
  const items = model.work;
  const count = items.length;
  const heading = <Title model={model} kind="work" className="fo-work-title" />;
  if (count === 1) {
    const item = items[0]!;
    return (
      <section id={ANCHORS.work} aria-labelledby="fo-work-h" className="fo-sec fo-work">
        <div className="fo-work-head">{heading}</div>
        <article data-rise="" className="fo-feature">
          <Media item={item} single />
          <div className="fo-feature-text">
            <KindYear model={model} item={item} />
            <h3
              {...editable(model, item.fields.title)}
              className="fo-feature-title fo-fit"
              style={sizeVars("fo-fs", featureTitleSizes(item.title))}
            >
              {item.title}
            </h3>
            {item.context ? (
              <span {...editable(model, item.fields.context)} className="fo-meta">
                {item.context}
              </span>
            ) : null}
            {item.description ? (
              <p {...editable(model, item.fields.description)} className="fo-feature-desc">
                {item.description}
              </p>
            ) : null}
            <ViewLink model={model} item={item} className="fo-pill fo-outline fo-view-pill" />
          </div>
        </article>
      </section>
    );
  }
  return (
    <section id={ANCHORS.work} aria-labelledby="fo-work-h" className="fo-sec fo-work">
      <div>
        <FolioCarousel
          count={count}
          labelledBy="fo-work-h"
          previous={label(model, "previous", "Previous project").text}
          next={label(model, "next", "Next project").text}
          title={heading}
        >
          {items.map((item, index) => (
            <article
              key={index}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} / ${count}`}
              className="fo-slide"
            >
              <Media item={item} single={false} />
              <div className="fo-slide-text">
                <KindYear model={model} item={item} />
                <h3
                  {...editable(model, item.fields.title)}
                  className="fo-slide-title"
                  style={sizeVars("fo-ts", slideTitleSizes(item.title.length))}
                >
                  {item.title}
                </h3>
                {item.context ? (
                  <span {...editable(model, item.fields.context)} className="fo-meta">
                    {item.context}
                  </span>
                ) : null}
                {item.description ? (
                  <p {...editable(model, item.fields.description)} className="fo-slide-desc">
                    {item.description}
                  </p>
                ) : null}
                <ViewLink model={model} item={item} className="fo-view-link" />
              </div>
            </article>
          ))}
        </FolioCarousel>
      </div>
    </section>
  );
}

function Testimonials({ model }: { model: SiteModel }) {
  const quotes = model.testimonials;
  const alone = quotes.length === 1;
  return (
    <Section kind="testimonials">
      <Title model={model} kind="testimonials" />
      <div
        className="fo-quotes"
        data-alone={alone || undefined}
        data-two={quotes.length === 2 || undefined}
      >
        {quotes.map((quote, index) => (
          <figure
            key={index}
            data-rise=""
            className={alone ? "fo-quote-alone" : "fo-card fo-quote"}
          >
            <blockquote
              className="fo-quote-text"
              style={sizeVars("fo-qs", quoteSizes(quote.quote.length, alone))}
            >
              “<span {...editable(model, quote.fields.quote)}>{quote.quote}</span>”
            </blockquote>
            <figcaption className="fo-quote-by">
              {quote.photo ? (
                <span className="fo-avatar">
                  <Photo image={quote.photo} />
                </span>
              ) : null}
              <span className="fo-quote-who">
                <span {...editable(model, quote.fields.author)} className="fo-quote-author">
                  {quote.author}
                </span>
                {quote.role ? (
                  <span {...editable(model, quote.fields.role)} className="fo-quote-role">
                    {quote.role}
                  </span>
                ) : null}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}

function Closing({ model }: { model: SiteModel }) {
  const cta = model.cta;
  if (!cta) return null;
  const portrait = model.hero.image;
  return (
    <section aria-labelledby="fo-cta-h" className="fo-cta">
      <div data-rise="" className="fo-closing">
        <div className="fo-closing-side">
          <div className="fo-closing-who">
            {portrait ? (
              <span className="fo-avatar fo-closing-avatar">
                <Photo image={portrait} />
              </span>
            ) : null}
            <span className="fo-closing-names">
              <span {...editable(model, model.fields.name)} className="fo-closing-name">
                {model.name}
              </span>
              {model.hero.eyebrow ? (
                <span
                  {...editable(model, model.hero.fields.eyebrow)}
                  className="fo-closing-eyebrow"
                >
                  {model.hero.eyebrow}
                </span>
              ) : null}
            </span>
          </div>
          {cta.body ? (
            <p {...editable(model, cta.fields.body)} className="fo-closing-body">
              {cta.body}
            </p>
          ) : null}
          {cta.button ? (
            <CtaLink link={cta.button} className="fo-pill fo-closing-button">
              <span {...editable(model, cta.fields.button)}>{cta.button.label}</span>
              <span aria-hidden="true" className="fo-arrow-glyph">
                →
              </span>
            </CtaLink>
          ) : null}
        </div>
        <h2
          id="fo-cta-h"
          className="fo-closing-title fo-fit"
          style={sizeVars("fo-fs", ctaSizes(cta.headline))}
        >
          <Titled model={model} text={{ text: cta.headline, field: cta.fields.headline }} />
        </h2>
      </div>
    </section>
  );
}

/** The form's wording, with each text's field when the preview edits in place. */
function formWords(model: SiteModel): FormWords {
  const word = (key: string, fallback: string) => {
    const text = label(model, key, fallback);
    return model.editable ? text : { text: text.text, field: "" };
  };
  return {
    question: word("form-question", "Topic"),
    name: word("form-name", "Your name"),
    email: word("form-email", "Email"),
    organisation: word("form-organisation", "Organisation"),
    optional: word("form-optional", "optional"),
    message: word("form-message", "Message"),
    send: word("form-send", "Send message"),
    note: word(
      "form-note",
      model.first
        ? `Goes straight to ${model.first}. Your details aren't shared.`
        : "Your details aren't shared.",
    ),
  };
}

function Contact({
  model,
  sendMessage,
}: {
  model: SiteModel;
  sendMessage: SendContactMessage | undefined;
}) {
  const { contact } = model;
  const form = contact.form.enabled;
  const direct = Boolean(contact.blurb || contact.email || contact.links.length);
  return (
    <section
      id={ANCHORS.contact}
      aria-labelledby="fo-contact-h"
      className="fo-sec fo-contact"
      data-form={form || undefined}
      data-direct={direct || undefined}
    >
      <div className="fo-wrap">
        <Title model={model} kind="contact" className="fo-contact-title" />
        <div className="fo-contact-grid">
          {direct ? (
            <div data-rise="" className="fo-direct">
              {contact.blurb ? (
                <p {...editable(model, contact.fields.blurb)} className="fo-blurb">
                  {contact.blurb}
                </p>
              ) : null}
              {contact.email ? (
                <a
                  href={mailto(contact.email)}
                  className="fo-email"
                  style={form ? undefined : sizeVars("fo-es", emailSizes(contact.email))}
                >
                  {contact.email}
                </a>
              ) : null}
              {contact.links.length ? (
                <ul className={form ? "fo-link-list" : "fo-chips"}>
                  {contact.links.map((link, index) => (
                    <li key={index}>
                      <ContactLink
                        link={link}
                        className={form ? "fo-link-row" : "fo-pill fo-outline fo-chip"}
                      >
                        <Icon kind={link.kind} size={form ? 18 : 16} />
                        <span {...editable(model, link.field)} className="fo-link-label">
                          {link.label}
                        </span>
                        {form ? (
                          <span aria-hidden="true" className="fo-link-arrow">
                            ↗
                          </span>
                        ) : null}
                      </ContactLink>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {form ? (
            <div data-rise="" className="fo-form-column">
              <ContactForm
                prefix="fo"
                topics={contact.form.topics}
                topicFields={model.editable ? contact.fields.topics : []}
                words={formWords(model)}
                first={model.first}
                send={sendMessage}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function FolioTemplate({ model, colors, photoGrade, sendMessage }: TemplateProps) {
  const renderers: Record<SequenceKind, () => ReactNode> = {
    about: () => <About model={model} />,
    impact: () => <Impact model={model} />,
    focus: () => <Focus model={model} />,
    experience: () => <Experience model={model} />,
    work: () => <Work model={model} />,
    testimonials: () => <Testimonials model={model} />,
    cta: () => <Closing model={model} />,
  };
  const top = label(model, "back-to-top", "Back to top");

  return (
    <div
      id={ANCHORS.top}
      className="fo"
      data-static={model.editable || undefined}
      style={
        {
          ...folioRoleStyle(colors),
          ...gradeStyle(photoGrade),
          fontFamily: FONTS.geist,
          minHeight: "inherit",
        } as CSSProperties
      }
    >
      <SkipLink />
      <FolioSmooth />
      <Header model={model} />
      <main id="main">
        <Hero model={model} />
        {model.sequence.map((kind) => (
          <Fragment key={kind}>{renderers[kind]()}</Fragment>
        ))}
        <Contact model={model} sendMessage={sendMessage} />
      </main>
      <footer className="fo-footer">
        <div className="fo-footer-in">
          <Brand model={model} />
          <nav aria-label="Footer" className="fo-footer-nav">
            {navOf(model).map((item) => (
              <a key={item.href} href={item.href} className="fo-footer-link">
                <Words model={model} text={item.text} />
              </a>
            ))}
          </nav>
          <a href={`#${ANCHORS.top}`} className="fo-top">
            <Words model={model} text={top} />
            <span aria-hidden="true"> ↑</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
