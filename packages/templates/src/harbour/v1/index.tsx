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
import { HarbourMenu } from "./client";
import { Icon } from "./icons";
import {
  cardColumns,
  figureStyle,
  galleryColumns,
  gradeStyle,
  harbourRoleStyle,
  nameStyle,
} from "./measure";

// Harbour: a warm greeting and a large arched portrait on soft white, for leaders who want to
// come across as personal and easy to reach. Figtree only, rounded cards and pill buttons, calm
// bands of tint behind Focus and Kind words. A free template. Layout lives in harbour.css
// (container queries on the site's width: 640px leaves the phone layout, 1000px is desktop);
// this file decides what is shown and in which order.

type TitledKind = HeadingKind | "focus";

/** Section titles the owner hasn't rewritten. */
const TITLES: Record<TitledKind, string> = {
  about: "About",
  focus: "How I help",
  experience: "Experience",
  impact: "Along the way",
  work: "Selected work",
  testimonials: "Kind words",
  contact: "Say hello",
};

/** Shorter words for the header and menu, while the owner hasn't renamed the section. */
const NAV: Record<Exclude<TitledKind, "impact">, string> = {
  about: "About",
  focus: "Focus",
  experience: "Experience",
  work: "Work",
  testimonials: "Kind words",
  contact: "Contact",
};

const ANCHOR: Record<Exclude<SequenceKind, "cta"> | "contact" | "gallery", string> = {
  ...ANCHORS,
  focus: "focus",
  gallery: "gallery",
};

function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

/** Template wording the owner can rewrite in the editor. */
function Words({ model, text }: { model: SiteModel; text: ModelText }) {
  return model.editable ? <span data-field={text.field}>{text.text}</span> : text.text;
}

/** The owner's own title for a section, or "" when they haven't written one. */
function ownTitle(model: SiteModel, kind: TitledKind): ModelText {
  if (kind === "focus") {
    return {
      text: model.focus?.heading ?? "",
      field: model.focus?.headingField ?? "focus.heading",
    };
  }
  return headingOf(model, kind, "");
}

/** A section's title: the owner's own, else Harbour's. */
function title(model: SiteModel, kind: TitledKind): ModelText {
  const own = ownTitle(model, kind);
  return own.text ? own : { ...own, text: TITLES[kind] };
}

/** A photo with the site's grade: its filter, and the accent multiplied over it. */
function Photo({ image, eager }: { image: ModelImage; eager?: boolean }) {
  return (
    <span className="hb-photo">
      {/* Templates are framework-agnostic, so a plain <img> rather than next/image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.src}
        alt={image.alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        style={{ objectPosition: image.position }}
      />
      <span aria-hidden="true" className="hb-tint" />
    </span>
  );
}

/** Rich text: bold is semibold, italic stays italic, links underline in the accent. */
function Rich({ spans }: { spans: RichTextSpan[] }) {
  return spans.map((span, index) => {
    let node: ReactNode = span.text;
    if (span.italic) node = <em>{node}</em>;
    if (span.bold) node = <strong className="hb-strong">{node}</strong>;
    if (!span.href) return <Fragment key={index}>{node}</Fragment>;
    return (
      <a key={index} {...linkProps(span.href)} className="hb-inline-link">
        {node}
      </a>
    );
  });
}

/** The sections in the header and menu: what's on the page, in its order, then contact. */
function navOf(model: SiteModel) {
  const kinds = model.sequence.filter(
    (kind): kind is Exclude<SequenceKind, "cta" | "impact"> => kind !== "cta" && kind !== "impact",
  );
  return [...kinds, "contact" as const].map((kind) => {
    const own = ownTitle(model, kind);
    return {
      href: `#${ANCHOR[kind]}`,
      text: own.text ? own : { ...own, text: NAV[kind] },
    };
  });
}

function Header({ model }: { model: SiteModel }) {
  const nav = navOf(model);
  return (
    <header className="hb-header">
      <div className="hb-bar">
        <a href={`#${ANCHORS.top}`} className="hb-brand">
          <span {...editable(model, model.fields.name)}>{model.name}</span>
        </a>
        <nav aria-label="Sections" className="hb-nav">
          {nav.map((item) => (
            <a key={item.href} href={item.href} className="hb-nav-link">
              <Words model={model} text={item.text} />
            </a>
          ))}
        </nav>
        <div className="hb-menu-slot">
          <HarbourMenu
            name={model.name}
            items={nav.map((item) => ({ href: item.href, label: item.text.text }))}
            openLabel={label(model, "menu", "Menu").text}
            closeLabel={label(model, "menu-close", "Close").text}
          />
        </div>
      </div>
    </header>
  );
}

function Hero({ model }: { model: SiteModel }) {
  const { hero } = model;
  const portrait = hero.image;
  // A headline that only repeats the name (older sites) isn't shown twice.
  const line =
    hero.headline.trim() && hero.headline.trim() !== model.name.trim() ? hero.headline : "";
  // The owner's eyebrow, else Harbour's greeting.
  const greeting = hero.eyebrow
    ? { text: hero.eyebrow, field: hero.fields.eyebrow }
    : label(model, "greeting", "Hello, I'm");
  return (
    <section
      id={ANCHORS.top}
      aria-labelledby="hb-name"
      className="hb-hero"
      data-portrait={portrait ? "" : undefined}
    >
      <div data-in="" className="hb-hero-text">
        <p className="hb-greet">
          <Words model={model} text={greeting} />
        </p>
        <h1
          id="hb-name"
          {...editable(model, model.fields.name)}
          className="hb-name"
          style={nameStyle(model.name, Boolean(portrait))}
        >
          {model.name}
        </h1>
        {line ? (
          <p {...editable(model, hero.fields.headline)} className="hb-lede">
            {line}
          </p>
        ) : null}
        {hero.subheadline ? (
          <p {...editable(model, hero.fields.subheadline)} className="hb-intro">
            {hero.subheadline}
          </p>
        ) : null}
        {hero.cta ? (
          <CtaLink link={hero.cta} className="hb-button hb-hero-button">
            <span {...editable(model, hero.fields.cta)}>{hero.cta.label}</span>
            <span aria-hidden="true">→</span>
          </CtaLink>
        ) : null}
      </div>
      {portrait ? (
        <div data-in="" className="hb-stage">
          <span aria-hidden="true" className="hb-stage-band" />
          <figure className="hb-portrait">
            <Photo image={portrait} eager />
          </figure>
        </div>
      ) : null}
    </section>
  );
}

/** How a section sits: on a band of tint, or tucked under the section before it. */
interface Place {
  band: boolean;
  tight: boolean;
}

function Section({
  kind,
  place,
  className,
  children,
}: {
  kind: Exclude<SequenceKind, "cta"> | "contact" | "gallery";
  place: Place;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={ANCHOR[kind]}
      aria-labelledby={`hb-${kind}-h`}
      className={cx("hb-sec", className)}
      data-band={place.band || undefined}
      data-tight={place.tight || undefined}
    >
      <div className="hb-wrap">{children}</div>
    </section>
  );
}

function Title({
  model,
  kind,
  className,
}: {
  model: SiteModel;
  kind: TitledKind;
  className?: string;
}) {
  return (
    <h2 id={`hb-${kind}-h`} data-rise="" className={cx("hb-title", className)}>
      <Words model={model} text={title(model, kind)} />
    </h2>
  );
}

function About({ model, place }: { model: SiteModel; place: Place }) {
  const about = model.about;
  if (!about) return null;
  return (
    <Section kind="about" place={place} className="hb-about">
      <div className="hb-about-grid" data-image={about.image ? "" : undefined}>
        {about.image ? (
          <figure data-rise="" className="hb-about-image">
            <Photo image={about.image} />
          </figure>
        ) : null}
        <div data-rise="" className="hb-about-text">
          <Title model={model} kind="about" className="hb-title-start" />
          <p {...editable(model, about.fields.lead)} className="hb-para">
            <Rich spans={about.lead} />
          </p>
          {about.rest.map((paragraph, index) => (
            <p key={index} {...editable(model, paragraph.field)} className="hb-para">
              {paragraph.text}
            </p>
          ))}
        </div>
      </div>
    </Section>
  );
}

function Focus({ model, place }: { model: SiteModel; place: Place }) {
  const focus = model.focus;
  if (!focus) return null;
  return (
    <Section kind="focus" place={place}>
      <Title model={model} kind="focus" />
      <ul
        className="hb-cards"
        style={{ "--hb-cards": cardColumns(focus.items.length, "focus") } as CSSProperties}
      >
        {focus.items.map((item, index) => (
          <li key={index} data-rise="" className="hb-focus-card">
            <span aria-hidden="true" className="hb-dot" />
            <h3 {...editable(model, item.fields.title)} className="hb-focus-name">
              {item.title}
            </h3>
            {item.description ? (
              <p {...editable(model, item.fields.description)} className="hb-small">
                {item.description}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Role({ model, item }: { model: SiteModel; item: ModelExperience }) {
  return (
    <li data-rise="" className="hb-role">
      <span className="hb-dates">
        {item.start ? <span {...editable(model, item.fields.start)}>{item.start}</span> : null}
        {item.start && item.end ? " – " : null}
        {item.end ? <span {...editable(model, item.fields.end)}>{item.end}</span> : null}
      </span>
      <div className="hb-role-main">
        <h3 {...editable(model, item.fields.role)} className="hb-role-name">
          {item.role}
        </h3>
        {item.organization || item.location ? (
          <span className="hb-org">
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
          <p {...editable(model, item.fields.summary)} className="hb-small hb-summary">
            {item.summary}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function Experience({ model, place }: { model: SiteModel; place: Place }) {
  return (
    <Section kind="experience" place={place} className="hb-narrow">
      <Title model={model} kind="experience" />
      <ol className="hb-roles">
        {model.experience.map((item, index) => (
          <Role key={index} model={model} item={item} />
        ))}
      </ol>
    </Section>
  );
}

function Impact({ model, place }: { model: SiteModel; place: Place }) {
  return (
    <Section kind="impact" place={place}>
      <Title model={model} kind="impact" className="hb-label" />
      <ul className="hb-figures" style={figureStyle(model.stats.map((stat) => stat.value))}>
        {model.stats.map((stat, index) => (
          <li key={index} data-rise="" className="hb-figure-item">
            <span {...editable(model, stat.fields.value)} className="hb-figure">
              {stat.value}
            </span>
            {stat.label ? (
              <span {...editable(model, stat.fields.label)} className="hb-figure-label">
                {stat.label}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function WorkCard({ model, item }: { model: SiteModel; item: ModelWork }) {
  return (
    <li data-rise="" className="hb-work-card">
      {item.image ? (
        <span className="hb-work-image">
          <Photo image={item.image} />
        </span>
      ) : null}
      <div className="hb-work-body">
        {item.kind || item.year ? (
          <span className="hb-kind">
            {item.kind ? <span {...editable(model, item.fields.kind)}>{item.kind}</span> : null}
            {item.kind && item.year ? " · " : null}
            {item.year ? <span {...editable(model, item.fields.year)}>{item.year}</span> : null}
          </span>
        ) : null}
        <h3 {...editable(model, item.fields.title)} className="hb-work-title">
          {item.title}
        </h3>
        {item.context ? (
          <span {...editable(model, item.fields.context)} className="hb-meta">
            {item.context}
          </span>
        ) : null}
        {item.description ? (
          <p {...editable(model, item.fields.description)} className="hb-small">
            {item.description}
          </p>
        ) : null}
        {item.href ? (
          // The link covers the card, so the whole card opens it.
          <a {...linkProps(item.href)} className="hb-more">
            <Words model={model} text={label(model, "read-more", "Read more")} />
            <span className="hb-sr">: {item.title}</span>
            <span aria-hidden="true">→</span>
          </a>
        ) : null}
      </div>
    </li>
  );
}

function Work({ model, place }: { model: SiteModel; place: Place }) {
  return (
    <Section kind="work" place={place}>
      <Title model={model} kind="work" />
      <ul
        className="hb-cards"
        style={{ "--hb-cards": cardColumns(model.work.length, "work") } as CSSProperties}
      >
        {model.work.map((item, index) => (
          <WorkCard key={index} model={model} item={item} />
        ))}
      </ul>
    </Section>
  );
}

function Testimonials({ model, place }: { model: SiteModel; place: Place }) {
  return (
    <Section kind="testimonials" place={place} className="hb-quotes-sec">
      <Title model={model} kind="testimonials" />
      <ul className="hb-quotes">
        {model.testimonials.map((quote, index) => (
          <li key={index} data-rise="">
            <figure className="hb-quote">
              <span aria-hidden="true" className="hb-quote-mark">
                “
              </span>
              <blockquote {...editable(model, quote.fields.quote)} className="hb-quote-text">
                {quote.quote}
              </blockquote>
              <figcaption className="hb-quote-by">
                {quote.photo ? (
                  <span className="hb-avatar">
                    <Photo image={quote.photo} />
                  </span>
                ) : null}
                <span className="hb-quote-who">
                  <span {...editable(model, quote.fields.author)} className="hb-quote-author">
                    {quote.author}
                  </span>
                  {quote.role ? (
                    <span {...editable(model, quote.fields.role)} className="hb-quote-role">
                      {quote.role}
                    </span>
                  ) : null}
                </span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Closing({ model }: { model: SiteModel }) {
  const cta = model.cta;
  if (!cta) return null;
  return (
    <section aria-labelledby="hb-cta-h" className="hb-cta">
      <div data-rise="" className="hb-cta-panel">
        <h2 id="hb-cta-h" {...editable(model, cta.fields.headline)} className="hb-title">
          {cta.headline}
        </h2>
        {cta.body ? (
          <p {...editable(model, cta.fields.body)} className="hb-cta-body">
            {cta.body}
          </p>
        ) : null}
        {cta.button ? (
          <CtaLink link={cta.button} className="hb-button">
            <span {...editable(model, cta.fields.button)}>{cta.button.label}</span>
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
    question: word("form-question", "What is it about?"),
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
  place,
  sendMessage,
}: {
  model: SiteModel;
  place: Place;
  sendMessage: SendContactMessage | undefined;
}) {
  const { contact } = model;
  // On the free plan the form is off (the platform turns it off), and the email and links
  // become the card beside the title.
  const form = contact.form.enabled;
  const card = !form && Boolean(contact.email || contact.links.length);
  return (
    <Section
      kind="contact"
      place={place}
      className={cx("hb-contact", form && "hb-contact-form", card && "hb-contact-card")}
    >
      <div className="hb-contact-grid">
        <div data-rise="" className="hb-contact-text">
          <Title model={model} kind="contact" className="hb-title-start" />
          {contact.blurb ? (
            <p {...editable(model, contact.fields.blurb)} className="hb-contact-blurb">
              {contact.blurb}
            </p>
          ) : null}
          {form && (contact.email || contact.links.length) ? (
            <div className="hb-direct">
              {contact.email ? (
                <a href={mailto(contact.email)} className="hb-email-line">
                  {contact.email}
                </a>
              ) : null}
              {contact.links.length ? (
                <ul className="hb-pills">
                  {contact.links.map((link, index) => (
                    <li key={index}>
                      <ContactLink link={link} className="hb-pill hb-link-pill">
                        <Icon kind={link.kind} size={16} />
                        <span {...editable(model, link.field)}>{link.label}</span>
                      </ContactLink>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
        {card ? (
          <div data-rise="" className="hb-card">
            {contact.email ? (
              <div className="hb-card-email">
                <span className="hb-card-label">
                  <Words model={model} text={label(model, "email-me", "Email")} />
                </span>
                <a href={mailto(contact.email)} className="hb-email-big">
                  {contact.email}
                </a>
              </div>
            ) : null}
            {contact.links.length ? (
              <ul className="hb-link-rows">
                {contact.links.map((link, index) => (
                  <li key={index}>
                    <ContactLink link={link} className="hb-link-row">
                      <Icon kind={link.kind} size={18} />
                      <span {...editable(model, link.field)} className="hb-link-label">
                        {link.label}
                      </span>
                      <span aria-hidden="true" className="hb-link-arrow">
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
          <div data-rise="" className="hb-form-column">
            <ContactForm
              prefix="hb"
              topics={contact.form.topics}
              topicFields={model.editable ? contact.fields.topics : []}
              words={formWords(model)}
              first={model.first}
              send={sendMessage}
            />
          </div>
        ) : null}
      </div>
    </Section>
  );
}

/** The owner's photos, last on the page: a calm grid of squares. */
function Gallery({ model, place }: { model: SiteModel; place: Place }) {
  const photos = model.gallery;
  const columns = galleryColumns(photos.length);
  const heading = label(model, "gallery", "Moments");
  return (
    <Section kind="gallery" place={place}>
      <h2 id="hb-gallery-h" data-rise="" className="hb-title hb-label">
        <Words model={model} text={heading} />
      </h2>
      <ul
        className="hb-gallery"
        style={
          {
            "--hb-gc-d": columns.desktop,
            "--hb-gc-p": columns.phone,
          } as CSSProperties
        }
      >
        {photos.map((photo, index) => (
          <li key={index} data-rise="" className="hb-still">
            <span className="hb-still-frame">
              <Photo image={photo} />
            </span>
            {photo.alt ? <span className="hb-caption">{photo.alt}</span> : null}
          </li>
        ))}
      </ul>
    </Section>
  );
}

type Block = SequenceKind | "contact" | "gallery";

/**
 * Where each block sits. Focus and Kind words lie on a band of tint, never two bands in a row;
 * the figures and the gallery, which open with a small label, tuck under a section on the same
 * ground instead of starting a new one.
 */
function placesOf(model: SiteModel): Map<Block, Place> {
  const blocks: Block[] = [...model.sequence, "contact"];
  if (model.gallery.length) blocks.push("gallery");
  const places = new Map<Block, Place>();
  let previousBand = false;
  // The hero ends on the portrait's band when it has one, so nothing tucks under it then.
  let previousGround: "page" | "band" | "panel" = model.hero.image ? "panel" : "page";
  for (const block of blocks) {
    const band: boolean = (block === "focus" || block === "testimonials") && !previousBand;
    const tight = (block === "impact" || block === "gallery") && previousGround === "page";
    places.set(block, { band, tight });
    previousBand = band;
    previousGround = block === "cta" ? "panel" : band ? "band" : "page";
  }
  return places;
}

export function HarbourTemplate({ model, colors, photoGrade, sendMessage }: TemplateProps) {
  const places = placesOf(model);
  const at = (block: Block): Place => places.get(block) ?? { band: false, tight: false };
  const renderers: Record<SequenceKind, () => ReactNode> = {
    about: () => <About model={model} place={at("about")} />,
    focus: () => <Focus model={model} place={at("focus")} />,
    experience: () => <Experience model={model} place={at("experience")} />,
    impact: () => <Impact model={model} place={at("impact")} />,
    work: () => <Work model={model} place={at("work")} />,
    testimonials: () => <Testimonials model={model} place={at("testimonials")} />,
    cta: () => <Closing model={model} />,
  };
  const top = label(model, "back-to-top", "Back to top");

  return (
    <div
      className="hb"
      data-static={model.editable || undefined}
      style={
        {
          ...harbourRoleStyle(colors),
          ...gradeStyle(photoGrade),
          fontFamily: FONTS.figtree,
          minHeight: "inherit",
        } as CSSProperties
      }
    >
      <SkipLink />
      <Header model={model} />
      <main id="main">
        <Hero model={model} />
        {model.top
          ? null
          : model.sequence.map((kind) => <Fragment key={kind}>{renderers[kind]()}</Fragment>)}
        {model.top ? null : (
          <Contact model={model} place={at("contact")} sendMessage={sendMessage} />
        )}
        {model.top || !model.gallery.length ? null : (
          <Gallery model={model} place={at("gallery")} />
        )}
      </main>
      {model.top ? null : (
        <footer className="hb-footer">
          <div className="hb-footer-in">
            <span {...editable(model, model.fields.name)} className="hb-footer-name">
              {model.name}
            </span>
            <a href={`#${ANCHORS.top}`} className="hb-top">
              <Words model={model} text={top} />
            </a>
          </div>
        </footer>
      )}
    </div>
  );
}
