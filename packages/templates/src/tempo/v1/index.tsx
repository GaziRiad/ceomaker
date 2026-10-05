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
import { TempoMenu, TempoMotion } from "./client";
import { Icon } from "./icons";
import {
  bigNameSizes,
  ctaSizes,
  emailSizes,
  figureColumns,
  figureSizes,
  fullNavFrom,
  gradeStyle,
  headlineSizes,
  leadSizes,
  nameSizes,
  quoteSizes,
  ringText,
  sizeVars,
  splitName,
  stripTravel,
  stripWidths,
  tempoRoleStyle,
  titleSizes,
  workTitleSizes,
} from "./measure";

// Tempo: big moving type on clean white. The owner's name is set in two expanded lines with
// the portrait between them, and every section arrives in time with the scroll. Archivo, whose
// width axis lets the name stretch into place, does both display and body work; Martian Mono
// sets labels, dates and numbers. Layout lives in tempo.css (container queries on the site's
// width: 640px leaves the phone layout, 1000px is desktop); this file decides what is shown,
// and measure.ts works out the sizes that depend on the content.

type TitledKind = HeadingKind | "focus";
type NumberedKind = Exclude<SequenceKind, "cta"> | "contact";

const LABELS: Record<TitledKind, string> = {
  about: "About",
  impact: "Achievements",
  focus: "Focus",
  experience: "Experience",
  work: "Work",
  testimonials: "Testimonials",
  contact: "Contact",
};

const ANCHOR: Record<NumberedKind, string> = { ...ANCHORS, focus: "focus" };

/** Longest hero button label shown as the round badge; longer ones get a square button. */
const BADGE_MAX = 34;
/** Longest closing button label shown as the round button. */
const ROUND_MAX = 32;

const pad2 = (value: number) => String(value).padStart(2, "0");

function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

/** Template wording the owner can rewrite in the editor. */
function Words({ model, text }: { model: SiteModel; text: ModelText }) {
  return model.editable ? <span data-field={text.field}>{text.text}</span> : text.text;
}

/** A section's title: the owner's own, else Tempo's label. */
function title(model: SiteModel, kind: TitledKind): ModelText {
  if (kind === "focus") {
    return {
      text: model.focus?.heading || LABELS.focus,
      field: model.focus?.headingField ?? "focus.heading",
    };
  }
  return headingOf(model, kind, LABELS[kind]);
}

/** The numbered sections in page order (not the closing panel), then contact. */
function numbered(model: SiteModel): NumberedKind[] {
  return [
    ...model.sequence.filter((kind): kind is Exclude<SequenceKind, "cta"> => kind !== "cta"),
    "contact",
  ];
}

/** Text that rises word by word from a mask as it comes into view. Real spaces between. */
function Rising({ text }: { text: string }) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.map((word, index) => (
    <Fragment key={index}>
      {index ? " " : null}
      <span className="tp-rw" style={{ "--i": index } as CSSProperties}>
        <span>{word}</span>
      </span>
    </Fragment>
  ));
}

/** A rolling label: on hover the text slides up and an identical copy takes its place. */
function Roll({ children, copy }: { children: ReactNode; copy: string }) {
  return (
    <span className="tp-roll">
      <span className="tp-roll-in">
        <span>{children}</span>
        <span aria-hidden="true">{copy}</span>
      </span>
    </span>
  );
}

/** A photo, graded: the site's filter, and the accent laid over it in colour blend. */
function Photo({ image, eager, alt }: { image: ModelImage; eager?: boolean; alt?: string }) {
  return (
    <>
      {/* Templates are framework-agnostic, so a plain <img> rather than next/image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.src}
        alt={alt ?? image.alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="tp-img"
        style={{ objectPosition: image.position }}
      />
      <span aria-hidden="true" className="tp-tint" />
    </>
  );
}

function Header({ model }: { model: SiteModel }) {
  const nav = numbered(model);
  const icons = model.contact.links.filter((link) => link.kind !== "other").slice(0, 3);
  const full = fullNavFrom(
    model.name,
    nav.map((kind) => title(model, kind).text),
    icons.length,
  );
  return (
    <header className="tp-header" data-full={full ?? undefined}>
      <div className="tp-bar">
        <a href={`#${ANCHORS.top}`} className="tp-brand">
          <span {...editable(model, model.fields.name)}>{model.name}</span>
        </a>
        <nav aria-label="Sections" className="tp-nav">
          {nav.map((kind, index) => {
            const text = title(model, kind);
            return (
              <a key={kind} href={`#${ANCHOR[kind]}`} className="tp-nav-link">
                <Roll copy={text.text}>
                  <Words model={model} text={text} />
                </Roll>
                <span aria-hidden="true" className="tp-nav-n">
                  {pad2(index + 1)}
                </span>
              </a>
            );
          })}
        </nav>
        {icons.length ? (
          <div className="tp-head-icons">
            {icons.map((link, index) => (
              <ContactLink key={index} link={link} className="tp-head-icon">
                <Icon kind={link.kind} size={16} />
                <span className="sr-only">{link.label}</span>
              </ContactLink>
            ))}
          </div>
        ) : null}
        <div className="tp-menu-slot">
          <TempoMenu
            name={model.name}
            items={nav.map((kind) => ({
              href: `#${ANCHOR[kind]}`,
              label: title(model, kind).text,
            }))}
            links={model.contact.links.map((link) => ({
              href: link.href,
              label: link.label,
              kind: link.kind,
            }))}
            openLabel={label(model, "menu", "Menu").text}
            closeLabel={label(model, "menu-close", "Close").text}
          />
        </div>
      </div>
    </header>
  );
}

/** The hero's round button: the label runs round a turning ring, the dot swells on hover. */
function Badge({ href, text }: { href: string; text: string }) {
  const ring = ringText(text);
  return (
    <a {...linkProps(href)} aria-label={text} className="tp-badge">
      <svg viewBox="0 0 140 140" aria-hidden="true" className="tp-ring">
        <defs>
          <path id="tp-ring" d="M70,70 m-56,0 a56,56 0 1,1 112,0 a56,56 0 1,1 -112,0" />
        </defs>
        <text fill="currentColor" className="tp-ring-text">
          <textPath
            href="#tp-ring"
            textLength={(2 * Math.PI * 56 - 1).toFixed(1)}
            lengthAdjust="spacing"
          >
            {ring}
          </textPath>
        </text>
      </svg>
      <span aria-hidden="true" className="tp-badge-dot" />
      <span aria-hidden="true" className="tp-badge-arrow">
        →
      </span>
    </a>
  );
}

function Hero({ model }: { model: SiteModel }) {
  const { hero } = model;
  const portrait = hero.image;
  const [first, rest] = splitName(model.name);
  // A headline that only repeats the name (older sites) isn't shown twice.
  const headline =
    hero.headline.trim() && hero.headline.trim() !== model.name.trim() ? hero.headline : "";
  const button = hero.cta;
  const badge = button ? button.label.length <= BADGE_MAX : false;
  const text = Boolean(headline || hero.subheadline || button);
  return (
    <section
      aria-labelledby="tp-name"
      className="tp-hero"
      data-portrait={portrait ? "" : undefined}
      data-text={text || undefined}
    >
      <div className="tp-in">
        {hero.eyebrow ? (
          <p {...editable(model, hero.fields.eyebrow)} className="tp-eyebrow tp-enter">
            {hero.eyebrow}
          </p>
        ) : null}
        <div className="tp-hero-grid">
          <h1
            id="tp-name"
            {...editable(model, model.fields.name)}
            className="tp-name"
            style={sizeVars("tp-fs", nameSizes(model.name))}
          >
            <span className="tp-line tp-line-1">
              <span className="tp-wide">{rest ? `${first} ` : first}</span>
            </span>
            {rest ? (
              <span className="tp-line tp-line-2">
                <span className="tp-wide tp-wide-2">{rest}</span>
              </span>
            ) : null}
          </h1>
          <div className="tp-band">
            {portrait ? (
              <div className="tp-portrait">
                <span className="tp-drift-zoom">
                  <span className="tp-zoom-in">
                    <Photo image={portrait} eager />
                  </span>
                </span>
              </div>
            ) : null}
            {text ? (
              <div className="tp-band-text">
                {headline ? (
                  <p
                    {...editable(model, hero.fields.headline)}
                    className="tp-headline"
                    style={sizeVars("tp-hs", headlineSizes(headline.length))}
                  >
                    {headline}
                  </p>
                ) : null}
                {hero.subheadline || button ? (
                  <div className="tp-hero-rest">
                    {hero.subheadline ? (
                      <p {...editable(model, hero.fields.subheadline)} className="tp-intro">
                        {hero.subheadline}
                      </p>
                    ) : null}
                    {button && badge ? <Badge href={button.href} text={button.label} /> : null}
                    {button && !badge ? (
                      <CtaLink link={button} className="tp-rect">
                        <Roll copy={button.label}>
                          <span {...editable(model, hero.fields.cta)}>{button.label}</span>
                        </Roll>
                        <span aria-hidden="true">→</span>
                      </CtaLink>
                    ) : null}
                    {button && badge ? (
                      <CtaLink link={button} className="tp-rect tp-phone-only">
                        <span {...editable(model, hero.fields.cta)}>{button.label}</span>
                        <span aria-hidden="true">→</span>
                      </CtaLink>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function Gallery({ model }: { model: SiteModel }) {
  const photos = model.gallery;
  const count = photos.length;
  if (!count) return null;
  // One photo: wide. Two or three: a row, a strip on phones. Four or more: a strip that the
  // page's scroll carries sideways.
  const mode = count === 1 ? "one" : count <= 3 ? "row" : "strip";
  const name = label(model, "gallery", "Gallery").text;
  return (
    <section className="tp-gallery">
      <div
        className="tp-gwrap"
        role="region"
        aria-label={name}
        data-mode={mode}
        data-gwrap={count > 1 ? "" : undefined}
        tabIndex={count > 1 ? 0 : undefined}
      >
        <ul className="tp-gtrack" style={sizeVars("tp-gx", stripTravel(count))}>
          {photos.map((photo, index) => {
            const width = stripWidths(index);
            return (
              <li
                key={index}
                data-rv=""
                className="tp-gitem"
                data-wide={index % 2 ? "" : undefined}
                style={
                  {
                    "--rd": `${(index * 0.08).toFixed(2)}s`,
                    "--tp-gw-d": `${width.d}px`,
                    "--tp-gw-t": `${width.t}px`,
                    "--tp-gw-p": `${width.p}px`,
                  } as CSSProperties
                }
              >
                <span className="tp-frame tp-gframe">
                  <Photo image={photo} />
                </span>
                {photo.alt ? <span className="tp-caption">{photo.alt}</span> : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function Section({
  model,
  kind,
  number,
  className,
  children,
}: {
  model: SiteModel;
  kind: NumberedKind;
  number: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={ANCHOR[kind]} aria-labelledby={`tp-${kind}-h`} className={cx("tp-sec", className)}>
      <div className="tp-in">
        <Title model={model} kind={kind} number={number} />
        {children}
      </div>
    </section>
  );
}

function Title({ model, kind, number }: { model: SiteModel; kind: TitledKind; number: number }) {
  const heading = title(model, kind);
  return (
    <div className="tp-head">
      <h2
        id={`tp-${kind}-h`}
        data-sp=""
        className="tp-title"
        style={sizeVars("tp-fs", titleSizes(heading.text))}
      >
        <span {...editable(model, heading.field)} className="tp-title-words">
          <Rising text={heading.text} />
        </span>
        <sup aria-hidden="true" className="tp-title-n">
          {pad2(number)}
        </sup>
      </h2>
    </div>
  );
}

/** The About lead, word by word, each lit in turn as the paragraph scrolls through. */
function Lead({ spans }: { spans: RichTextSpan[] }) {
  let index = 0;
  return spans.map((span, key) => {
    const words = span.text.split(/(?<=\s)/).filter(Boolean);
    let node: ReactNode = words.map((word) => (
      <span key={index} className="tp-w" style={{ "--i": index++ } as CSSProperties}>
        {word}
      </span>
    ));
    if (span.italic) node = <em>{node}</em>;
    if (span.bold) node = <strong>{node}</strong>;
    if (!span.href) return <Fragment key={key}>{node}</Fragment>;
    return (
      <a key={key} {...linkProps(span.href)} className="tp-lead-link">
        {node}
      </a>
    );
  });
}

function About({ model, number }: { model: SiteModel; number: number }) {
  const about = model.about;
  if (!about) return null;
  const length = about.lead.reduce((total, span) => total + span.text.length, 0);
  const words = about.lead.reduce(
    (total, span) => total + span.text.split(/(?<=\s)/).filter(Boolean).length,
    0,
  );
  return (
    <Section model={model} kind="about" number={number} className="tp-about">
      <div className="tp-about-grid" data-image={about.image ? "" : undefined}>
        {about.image ? (
          <div data-rv="" className="tp-frame tp-about-image">
            <Photo image={about.image} />
          </div>
        ) : null}
        <div className="tp-about-text">
          <p
            {...editable(model, about.fields.lead)}
            className="tp-lead"
            style={
              {
                "--n": Math.max(1, words),
                ...sizeVars("tp-ls", leadSizes(length, Boolean(about.image))),
              } as CSSProperties
            }
          >
            <Lead spans={about.lead} />
          </p>
          {about.rest.length ? (
            <div
              data-rv=""
              className="tp-about-rest"
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

function Role({ model, item, rise }: { model: SiteModel; item: ModelExperience; rise: boolean }) {
  return (
    <li data-rv={rise ? "" : undefined} className="tp-role-row">
      <span aria-hidden="true" className="tp-role-dot" />
      {item.start || item.end ? (
        <span className="tp-dates">
          {item.start ? <span {...editable(model, item.fields.start)}>{item.start}</span> : null}
          {item.start && item.end ? " – " : null}
          {item.end ? <span {...editable(model, item.fields.end)}>{item.end}</span> : null}
        </span>
      ) : null}
      <div className="tp-role-main">
        <h3 {...editable(model, item.fields.role)} className="tp-role">
          {item.role}
        </h3>
        {item.organization || item.location ? (
          <span className="tp-org">
            {item.organization ? (
              <span {...editable(model, item.fields.organization)}>{item.organization}</span>
            ) : null}
            {item.organization && item.location ? " · " : null}
            {item.location ? (
              <span {...editable(model, item.fields.location)}>{item.location}</span>
            ) : null}
          </span>
        ) : null}
      </div>
      {item.summary ? (
        <p {...editable(model, item.fields.summary)} className="tp-summary">
          {item.summary}
        </p>
      ) : null}
    </li>
  );
}

function Experience({ model, number }: { model: SiteModel; number: number }) {
  const roles = model.experience;
  // More than ten roles: the first eight show, the rest open from a button. The editor lists
  // every role open, with the button above the rest so its wording can be changed.
  const cut = roles.length > 10 ? 8 : roles.length;
  const rest = roles.slice(cut);
  return (
    <Section model={model} kind="experience" number={number}>
      <div className="tp-timeline">
        <span aria-hidden="true" className="tp-rail" />
        <span aria-hidden="true" className="tp-rail-line" />
        <ol className="tp-roles">
          {roles.slice(0, cut).map((item, index) => (
            <Role key={index} model={model} item={item} rise />
          ))}
        </ol>
        {rest.length ? (
          <details className="tp-more" open={model.editable || undefined}>
            <summary className="tp-more-button">
              <Words model={model} text={label(model, "show-more", "Show more")} />
              <span className="tp-more-n">{rest.length}</span>
              <span aria-hidden="true">↓</span>
            </summary>
            <ol className="tp-roles" start={cut + 1}>
              {rest.map((item, index) => (
                <Role key={index} model={model} item={item} rise={false} />
              ))}
            </ol>
          </details>
        ) : null}
      </div>
    </Section>
  );
}

function Impact({ model, number }: { model: SiteModel; number: number }) {
  const stats = model.stats;
  const columns = figureColumns(stats.length);
  return (
    <Section model={model} kind="impact" number={number}>
      <ul
        className="tp-figures"
        data-d={columns.d}
        data-t={columns.t}
        data-p={columns.p}
        style={
          {
            "--tp-c-d": columns.d,
            "--tp-c-t": columns.t,
            "--tp-c-p": columns.p,
            ...sizeVars("tp-fs", figureSizes(stats.map((stat) => stat.value))),
          } as CSSProperties
        }
      >
        {stats.map((stat, index) => (
          <li key={index} data-rv="" className="tp-figure-cell">
            <span {...editable(model, stat.fields.value)} className="tp-figure">
              {model.editable ? (
                stat.value
              ) : (
                // The figure counts up from zero as it comes into view; readers get its value.
                <>
                  <span aria-hidden="true" data-count="" data-v={stat.value}>
                    {stat.value}
                  </span>
                  <span className="sr-only">{stat.value}</span>
                </>
              )}
            </span>
            {stat.label ? (
              <span {...editable(model, stat.fields.label)} className="tp-figure-label">
                {stat.label}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Kind and year, in mono: "BOOK · 2022". */
function KindYear({
  model,
  item,
  className,
}: {
  model: SiteModel;
  item: ModelWork;
  className: string;
}) {
  if (!item.kind && !item.year) return null;
  return (
    <span className={className}>
      {item.kind ? <span {...editable(model, item.fields.kind)}>{item.kind}</span> : null}
      {item.kind && item.year ? " · " : null}
      {item.year ? <span {...editable(model, item.fields.year)}>{item.year}</span> : null}
    </span>
  );
}

function WorkRow({ model, item, index }: { model: SiteModel; item: ModelWork; index: number }) {
  const body = (
    <>
      {item.image ? (
        <span className="tp-frame tp-row-image">
          <Photo image={item.image} />
        </span>
      ) : null}
      <span aria-hidden="true" className="tp-row-n">
        {pad2(index + 1)}
      </span>
      <div className="tp-row-main">
        <KindYear model={model} item={item} className="tp-kind tp-kind-top" />
        <h3
          {...editable(model, item.fields.title)}
          className="tp-row-title"
          style={sizeVars("tp-ws", workTitleSizes(item.title.length))}
        >
          {item.title}
        </h3>
        {item.context ? (
          <span {...editable(model, item.fields.context)} className="tp-meta">
            {item.context}
          </span>
        ) : null}
      </div>
      {item.description ? (
        <p {...editable(model, item.fields.description)} className="tp-row-desc">
          {item.description}
        </p>
      ) : null}
      {item.kind || item.year || item.href ? (
        <div className="tp-row-end">
          <KindYear model={model} item={item} className="tp-kind tp-kind-end" />
          {item.href ? (
            <span aria-hidden="true" className="tp-arrow">
              →
            </span>
          ) : null}
        </div>
      ) : null}
      {item.image ? (
        <span aria-hidden="true" className="tp-preview">
          <Photo image={item.image} alt="" />
        </span>
      ) : null}
    </>
  );
  const attributes = {
    className: "tp-row",
    "data-image": item.image ? "" : undefined,
  };
  return (
    <li data-rv="" className="tp-row-item">
      {item.href ? (
        <a {...linkProps(item.href)} {...attributes} data-link="">
          {body}
        </a>
      ) : (
        <div {...attributes}>{body}</div>
      )}
    </li>
  );
}

function Work({ model, number }: { model: SiteModel; number: number }) {
  return (
    <Section model={model} kind="work" number={number} className="tp-work">
      <ul className="tp-rows">
        {model.work.map((item, index) => (
          <WorkRow key={index} model={model} item={item} index={index} />
        ))}
      </ul>
    </Section>
  );
}

function Focus({ model, number }: { model: SiteModel; number: number }) {
  const focus = model.focus;
  if (!focus) return null;
  const count = focus.items.length;
  const columns = count === 1 ? 1 : count === 2 || count === 4 ? 2 : 3;
  // The band runs at about 0.55s a character. Short titles repeat until a run is longer than
  // the widest page, so the loop never shows a gap; the still band shows them once.
  const characters = focus.items.reduce((total, item) => total + item.title.length, 0);
  const repeats = Math.max(1, Math.ceil(40 / Math.max(1, characters)));
  const seconds = Math.max(24, Math.round(characters * repeats * 0.55));
  const group = (copy: boolean) => (
    <div className="tp-marquee-group" data-copy={copy || undefined}>
      {Array.from({ length: repeats }, (_, round) =>
        focus.items.map((item, index) => (
          <span
            key={`${round}-${index}`}
            className="tp-marquee-item"
            data-repeat={round > 0 || undefined}
          >
            <span>{item.title}</span>
            <span className="tp-star">✦</span>
          </span>
        )),
      )}
    </div>
  );
  return (
    <section id={ANCHOR.focus} aria-labelledby="tp-focus-h" className="tp-focus">
      <div aria-hidden="true" className="tp-marquee">
        <div className="tp-marquee-run" style={{ "--tp-md": `${seconds}s` } as CSSProperties}>
          {group(false)}
          {group(true)}
        </div>
      </div>
      <div className="tp-in tp-focus-in">
        <Title model={model} kind="focus" number={number} />
        <ul className="tp-tiles" data-columns={columns}>
          {focus.items.map((item, index) => (
            <li
              key={index}
              data-rv=""
              className="tp-tile"
              style={{ "--rd": `${((index % columns) * 0.08).toFixed(2)}s` } as CSSProperties}
            >
              <span aria-hidden="true" className="tp-tile-n">
                {pad2(index + 1)}
              </span>
              <div className="tp-tile-main">
                <h3 {...editable(model, item.fields.title)} className="tp-tile-title">
                  {item.title}
                </h3>
                {item.description ? (
                  <p {...editable(model, item.fields.description)} className="tp-tile-desc">
                    {item.description}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Testimonials({ model, number }: { model: SiteModel; number: number }) {
  const quotes = model.testimonials;
  return (
    <Section model={model} kind="testimonials" number={number}>
      <div className="tp-quotes">
        {quotes.map((quote, index) => (
          <figure key={index} className="tp-quote" style={{ "--i": index } as CSSProperties}>
            <span aria-hidden="true" className="tp-quote-mark">
              “
            </span>
            <div className="tp-quote-main">
              <blockquote
                {...editable(model, quote.fields.quote)}
                className="tp-quote-text"
                style={sizeVars("tp-qs", quoteSizes(quote.quote.length))}
              >
                {quote.quote}
              </blockquote>
              <figcaption className="tp-quote-by">
                {quote.photo ? (
                  <span className="tp-avatar">
                    <Photo image={quote.photo} alt="" />
                  </span>
                ) : null}
                <span className="tp-quote-who">
                  <span {...editable(model, quote.fields.author)} className="tp-quote-author">
                    {quote.author}
                  </span>
                  {quote.role ? (
                    <span {...editable(model, quote.fields.role)} className="tp-quote-role">
                      {quote.role}
                    </span>
                  ) : null}
                </span>
                <span aria-hidden="true" className="tp-quote-n">
                  {pad2(index + 1)} / {pad2(quotes.length)}
                </span>
              </figcaption>
            </div>
          </figure>
        ))}
      </div>
    </Section>
  );
}

function Closing({ model }: { model: SiteModel }) {
  const cta = model.cta;
  if (!cta) return null;
  const button = cta.button;
  const round = button ? button.label.length <= ROUND_MAX : false;
  return (
    <section aria-labelledby="tp-cta-h" className="tp-cta">
      <div className="tp-cta-in">
        <h2
          id="tp-cta-h"
          data-sp=""
          className="tp-cta-title"
          style={sizeVars("tp-fs", ctaSizes(cta.headline))}
        >
          <span {...editable(model, cta.fields.headline)}>
            <Rising text={cta.headline} />
          </span>
        </h2>
        {cta.body ? (
          <p {...editable(model, cta.fields.body)} data-rv="" className="tp-cta-body">
            {cta.body}
          </p>
        ) : null}
        {button && round ? (
          <CtaLink link={button} className="tp-mag">
            <span {...editable(model, cta.fields.button)} className="tp-mag-label">
              {button.label}
            </span>
            <span aria-hidden="true" className="tp-mag-arrow">
              →
            </span>
          </CtaLink>
        ) : null}
        {button ? (
          <CtaLink link={button} className={cx("tp-cta-rect", round && "tp-phone-only")}>
            <span {...editable(model, cta.fields.button)}>{button.label}</span>
            <span aria-hidden="true">→</span>
          </CtaLink>
        ) : null}
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
    name: word("form-name", "Name"),
    email: word("form-email", "Email"),
    organisation: word("form-organisation", "Organisation"),
    optional: word("form-optional", "optional"),
    message: word("form-message", "Message"),
    send: word("form-send", "Send message"),
    note: word(
      "form-note",
      model.first
        ? `Goes straight to ${model.first}. Your details are not shared.`
        : "Your details are not shared.",
    ),
  };
}

function Contact({
  model,
  number,
  sendMessage,
}: {
  model: SiteModel;
  number: number;
  sendMessage: SendContactMessage | undefined;
}) {
  const { contact } = model;
  const form = contact.form.enabled;
  const direct = Boolean(contact.blurb || contact.email || contact.links.length);
  return (
    <section
      id={ANCHORS.contact}
      aria-labelledby="tp-contact-h"
      className="tp-contact"
      data-form={form || undefined}
      data-direct={direct || undefined}
    >
      <div className="tp-in">
        <Title model={model} kind="contact" number={number} />
        <div className="tp-contact-grid">
          {direct ? (
            <div className="tp-direct">
              {contact.blurb ? (
                <p {...editable(model, contact.fields.blurb)} className="tp-blurb">
                  {contact.blurb}
                </p>
              ) : null}
              {contact.email ? (
                <a
                  href={mailto(contact.email)}
                  className="tp-email"
                  style={sizeVars("tp-es", emailSizes(contact.email, form, form && direct))}
                >
                  {contact.email}
                </a>
              ) : null}
              {contact.links.length ? (
                <ul className="tp-links">
                  {contact.links.map((link, index) => (
                    <li key={index}>
                      <ContactLink link={link} className="tp-link">
                        <Icon kind={link.kind} size={17} />
                        <span className="tp-link-label">
                          <Roll copy={link.label}>
                            <span {...editable(model, link.field)}>{link.label}</span>
                          </Roll>
                        </span>
                        <span aria-hidden="true" className="tp-link-arrow">
                          ↗
                        </span>
                      </ContactLink>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {form ? (
            <div className="tp-form-column">
              <ContactForm
                prefix="tp"
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

export function TempoTemplate({ model, colors, photoGrade, sendMessage }: TemplateProps) {
  const order = numbered(model);
  const at = (kind: NumberedKind) => order.indexOf(kind) + 1;
  const renderers: Record<SequenceKind, () => ReactNode> = {
    about: () => <About model={model} number={at("about")} />,
    impact: () => <Impact model={model} number={at("impact")} />,
    focus: () => <Focus model={model} number={at("focus")} />,
    experience: () => <Experience model={model} number={at("experience")} />,
    work: () => <Work model={model} number={at("work")} />,
    testimonials: () => <Testimonials model={model} number={at("testimonials")} />,
    cta: () => <Closing model={model} />,
  };
  const top = label(model, "back-to-top", "Back to top");

  return (
    <div
      id={ANCHORS.top}
      className="tp"
      data-static={model.editable || undefined}
      style={
        {
          ...tempoRoleStyle(colors),
          ...gradeStyle(photoGrade),
          "--tp-mono": FONTS.martianMono,
          fontFamily: FONTS.archivo,
          minHeight: "inherit",
        } as CSSProperties
      }
    >
      <SkipLink />
      {model.top ? null : <TempoMotion />}
      <Header model={model} />
      <main id="main">
        <Hero model={model} />
        {model.top ? null : <Gallery model={model} />}
        {model.top
          ? null
          : model.sequence.map((kind) => <Fragment key={kind}>{renderers[kind]()}</Fragment>)}
        {model.top ? null : (
          <Contact model={model} number={at("contact")} sendMessage={sendMessage} />
        )}
      </main>
      {model.top ? null : (
        <footer className="tp-footer">
          <div className="tp-in">
            <div
              aria-hidden="true"
              data-sp=""
              className="tp-big"
              style={sizeVars("tp-fs", bigNameSizes(model.name))}
            >
              <Rising text={model.name} />
            </div>
            <div className="tp-foot">
              <span {...editable(model, model.fields.name)}>{model.name}</span>
              <a href={`#${ANCHORS.top}`} className="tp-top">
                <Roll copy={top.text}>
                  <Words model={model} text={top} />
                </Roll>
                <span aria-hidden="true">↑</span>
              </a>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
