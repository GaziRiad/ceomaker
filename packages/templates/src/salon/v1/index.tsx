import type { RichTextSpan } from "@ceomaker/schema";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { ContactForm, type FormWords } from "../../contact-form";
import { FONTS } from "../../fonts";
import { linkProps } from "../../links";
import {
  headingOf,
  label,
  type HeadingKind,
  type MiddleKind,
  type ModelContactLink,
  type ModelImage,
  type ModelText,
  type SiteModel,
} from "../../model";
import { ANCHORS, ContactLink, CtaLink, editable, mailto, SkipLink } from "../../shared";
import type { SendContactMessage, TemplateProps } from "../../types";
import { SalonDrift, SalonMenu, SalonQuotes } from "./client";
import { Icon } from "./icons";
import {
  ctaCollage,
  CTA_PHOTOS,
  figureSizes,
  gradeStyle,
  heroCollage,
  HERO_PHOTOS,
  nameSizes,
  placeVars,
  quoteSizes,
  salonRoleStyle,
  sizeVars,
  splitNavFrom,
  statementSizes,
  tileSizes,
  titleSizes,
  ctaSizes,
  driftVars,
  type HeroMode,
} from "./measure";

// Salon: the name in a large serif, hung salon-style among the owner's own photographs, on a
// gallery ground. Layout lives in salon.css (container queries on the site's width: 600px
// leaves the phone layout, 1000px is desktop); this file decides what is shown, and measure.ts
// works out the sizes and photo places that depend on the content.

const LABELS: Record<HeadingKind, string> = {
  about: "About",
  impact: "Achievements",
  experience: "Experience",
  work: "Selected work",
  testimonials: "Kind words",
  contact: "Contact",
};

function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

const pad2 = (value: number) => String(value).padStart(2, "0");

/** Template wording the owner can rewrite in the editor. */
function Words({ model, text }: { model: SiteModel; text: ModelText }) {
  return model.editable ? <span data-field={text.field}>{text.text}</span> : text.text;
}

/** A section's title: the owner's own, else Salon's label. */
function title(model: SiteModel, kind: HeadingKind): ModelText {
  return headingOf(model, kind, LABELS[kind]);
}

/** A photo, graded: the site's filter, and the accent laid over it in colour blend. */
function Photo({ image, eager }: { image: ModelImage; eager?: boolean }) {
  return (
    <span className="sl-photo">
      {/* Templates are framework-agnostic, so a plain <img> rather than next/image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.src}
        alt={image.alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        style={{ objectPosition: image.position }}
      />
      <span aria-hidden="true" className="sl-tint" />
    </span>
  );
}

/** Photos floating around a centre, each at its own place for every width. */
function Floats({
  photos,
  places,
  phone,
  delay,
  stagger,
  rise,
  drift,
}: {
  photos: ModelImage[];
  places: ReturnType<typeof heroCollage>["places"];
  /** How many of them phones show. */
  phone: number;
  delay: number;
  stagger: number;
  /** Rise with the scroll instead of drifting in on load. */
  rise?: boolean;
  /** Keep moving once in: a slow float, and depth with the pointer and the scroll. */
  drift?: boolean;
}) {
  return places.map((place, index) => (
    <span
      key={index}
      className="sl-float"
      data-rise={rise ? "" : undefined}
      data-wide={index >= phone || undefined}
      style={{
        ...placeVars(place),
        ...(drift ? driftVars(index) : null),
        animationDelay: rise ? undefined : `${Math.round((delay + index * stagger) * 1000)}ms`,
      }}
    >
      {drift ? (
        <span className="sl-bob">
          <Photo image={photos[index]!} eager />
        </span>
      ) : (
        <Photo image={photos[index]!} eager={!rise} />
      )}
    </span>
  ));
}

/** Rich text: bold shows in accent text, italic stays italic, links are underlined. */
function Rich({ spans }: { spans: RichTextSpan[] }) {
  return spans.map((span, index) => {
    let node: ReactNode = span.text;
    if (span.italic) node = <em>{node}</em>;
    if (span.bold) node = <strong className="sl-strong">{node}</strong>;
    if (!span.href) return <Fragment key={index}>{node}</Fragment>;
    return (
      <a key={index} {...linkProps(span.href)} className="sl-inline-link">
        {node}
      </a>
    );
  });
}

function IconLinks({ links }: { links: ModelContactLink[] }) {
  return links.map((link, index) => (
    <ContactLink key={index} link={link} className="sl-icon-link">
      <Icon kind={link.kind} />
      <span className="sr-only">{link.label}</span>
    </ContactLink>
  ));
}

/** The visible middle sections and contact, for the header, menu and footer. */
function navOf(model: SiteModel) {
  return [...model.order, "contact" as const].map((kind) => ({
    href: `#${ANCHORS[kind]}`,
    text: title(model, kind),
  }));
}

function Header({ model }: { model: SiteModel }) {
  const nav = navOf(model);
  const half = Math.ceil(nav.length / 2);
  const split = splitNavFrom(
    model.name,
    nav.map((item) => item.text.text),
  );
  const link = (item: (typeof nav)[number]) => (
    <a key={item.href} href={item.href} title={item.text.text} className="sl-nav-link">
      <Words model={model} text={item.text} />
    </a>
  );
  return (
    <header className="sl-header" data-split={split ?? undefined}>
      <div className="sl-header-in">
        <nav aria-label="Sections" className="sl-nav">
          {nav.slice(0, half).map(link)}
        </nav>
        <a href={`#${ANCHORS.top}`} className="sl-brand">
          <span {...editable(model, model.fields.name)}>{model.name}</span>
        </a>
        <nav aria-label="More sections" className="sl-nav sl-nav-end">
          {nav.slice(half).map(link)}
        </nav>
        <div className="sl-menu-slot">
          <SalonMenu
            name={model.name}
            items={nav.map((item) => ({ href: item.href, label: item.text.text }))}
            links={model.contact.links}
            openLabel={label(model, "menu", "Menu").text}
            closeLabel={label(model, "menu-close", "Close").text}
          />
        </div>
      </div>
      <div className="sl-wrap">
        <div className="sl-rule" />
      </div>
    </header>
  );
}

/** The hero's photos: the hero image first, then the gallery. */
function heroPhotos(model: SiteModel): ModelImage[] {
  return [...(model.hero.image ? [model.hero.image] : []), ...model.gallery];
}

function Hero({ model }: { model: SiteModel }) {
  const { hero } = model;
  const photos = heroPhotos(model);
  const mode: HeroMode = photos.length === 0 ? "type" : photos.length < 3 ? "portrait" : "collage";
  const collage = mode === "collage" ? heroCollage(photos.length) : null;
  // A headline that only repeats the name (older sites) isn't shown twice.
  const lede =
    hero.headline.trim() && hero.headline.trim() !== model.name.trim() ? hero.headline : "";
  const art: Record<string, string> = {};
  if (collage) {
    for (const device of ["d", "t", "p"] as const) {
      const gap = device === "p" ? 6 : 3;
      art[`--sl-art-top-${device}`] = `${(collage.reach[device].top + gap).toFixed(2)}cqw`;
      art[`--sl-art-bottom-${device}`] = `${(collage.reach[device].bottom + gap).toFixed(2)}cqw`;
    }
  }
  return (
    <section
      aria-label="Introduction"
      className="sl-hero"
      data-mode={mode}
      style={
        { ...art, ...sizeVars("sl-fs", nameSizes(model.name || "Name", mode)) } as CSSProperties
      }
    >
      <div className="sl-art">
        {collage ? (
          <Floats
            photos={photos}
            places={collage.places}
            phone={HERO_PHOTOS.phone}
            delay={0.3}
            stagger={0.12}
            drift
          />
        ) : null}
        {collage ? <SalonDrift /> : null}
        <div className="sl-hero-centre">
          {mode === "portrait" ? (
            <span className="sl-frame sl-portrait">
              <Photo image={photos[0]!} eager />
            </span>
          ) : null}
          {hero.eyebrow ? (
            <p {...editable(model, hero.fields.eyebrow)} className="sl-eyebrow">
              {hero.eyebrow}
            </p>
          ) : null}
          <h1
            {...editable(model, model.fields.name)}
            className="sl-name sl-fit"
            data-long={model.name.length > 26 || undefined}
          >
            {model.name}
          </h1>
        </div>
      </div>
      {lede || hero.subheadline || hero.cta ? (
        <div className="sl-hero-foot">
          {lede || hero.subheadline ? (
            <div className="sl-hero-text">
              {lede ? (
                <p {...editable(model, hero.fields.headline)} className="sl-lede">
                  {lede}
                </p>
              ) : null}
              {hero.subheadline ? (
                <p {...editable(model, hero.fields.subheadline)} className="sl-sub">
                  {hero.subheadline}
                </p>
              ) : null}
            </div>
          ) : null}
          {hero.cta ? (
            <CtaLink link={hero.cta} className="sl-bracket sl-button sl-hero-button">
              <span {...editable(model, hero.fields.cta)}>{hero.cta.label}</span>
            </CtaLink>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Section({
  kind,
  className,
  children,
}: {
  kind: MiddleKind;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={ANCHORS[kind]}
      aria-labelledby={`sl-${kind}-h`}
      className={cx("sl-sec", className)}
    >
      <div className="sl-wrap">{children}</div>
    </section>
  );
}

function Title({ model, kind }: { model: SiteModel; kind: HeadingKind }) {
  const heading = title(model, kind);
  return (
    <h2
      id={`sl-${kind}-h`}
      data-rise=""
      className="sl-title sl-fit"
      style={sizeVars("sl-fs", titleSizes(heading.text))}
    >
      <Words model={model} text={heading} />
    </h2>
  );
}

function About({ model }: { model: SiteModel }) {
  const about = model.about;
  if (!about) return null;
  const links = model.contact.links;
  const before = Math.ceil(links.length / 2);
  const length = about.lead.reduce((total, span) => total + span.text.length, 0);
  const button = model.hero.cta;
  return (
    <Section kind="about" className="sl-about">
      <h2 id="sl-about-h" data-rise="" className="sl-label">
        <Words model={model} text={title(model, "about")} />
      </h2>
      {about.image ? (
        <span data-rise="" className="sl-frame sl-about-image">
          <Photo image={about.image} />
        </span>
      ) : null}
      <p
        {...editable(model, about.fields.lead)}
        data-rise=""
        className="sl-statement sl-fit"
        style={sizeVars("sl-fs", statementSizes(length))}
      >
        <Rich spans={about.lead} />
      </p>
      {about.rest.length ? (
        <div
          data-rise=""
          className="sl-about-rest"
          data-columns={about.rest.length >= 2 ? "" : undefined}
        >
          {about.rest.map((paragraph, index) => (
            <p key={index} {...editable(model, paragraph.field)}>
              {paragraph.text}
            </p>
          ))}
        </div>
      ) : null}
      <div data-rise="" className="sl-about-row">
        <IconLinks links={links.slice(0, before)} />
        {button ? (
          <CtaLink link={button} className="sl-bracket sl-button">
            <span {...editable(model, model.hero.fields.cta)}>{button.label}</span>
          </CtaLink>
        ) : (
          <a href={`#${ANCHORS.contact}`} className="sl-bracket sl-button">
            <Words
              model={model}
              text={{ text: title(model, "contact").text, field: model.hero.fields.cta }}
            />
          </a>
        )}
        <IconLinks links={links.slice(before)} />
      </div>
    </Section>
  );
}

/** Skills, services or areas of work: a title and a line each, in up to three columns. */
function Focus({ model }: { model: SiteModel }) {
  const focus = model.focus;
  if (!focus) return null;
  const heading = { text: focus.heading || "Focus", field: focus.headingField };
  return (
    <section id="focus" aria-labelledby="sl-focus-h" className="sl-sec">
      <div className="sl-wrap">
        <h2
          id="sl-focus-h"
          data-rise=""
          className="sl-title sl-fit"
          style={sizeVars("sl-fs", titleSizes(heading.text))}
        >
          <Words model={model} text={heading} />
        </h2>
        <ul className="sl-focus-list" data-count={Math.min(focus.items.length, 3)}>
          {focus.items.map((item, index) => (
            <li key={index} data-rise="" className="sl-focus-item">
              <h3 {...editable(model, item.fields.title)} className="sl-focus-name">
                {item.title}
              </h3>
              {item.description ? (
                <p {...editable(model, item.fields.description)} className="sl-figure-label">
                  {item.description}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Impact({ model }: { model: SiteModel }) {
  const count = model.stats.length;
  return (
    <Section kind="impact">
      <Title model={model} kind="impact" />
      <ul className="sl-figures" data-count={Math.min(count, 5)}>
        {model.stats.map((stat, index) => (
          <li key={index} data-rise="" className="sl-figure-cell">
            <span
              {...editable(model, stat.fields.value)}
              className="sl-figure sl-fit"
              style={sizeVars("sl-fs", figureSizes(stat.value, count))}
            >
              {stat.value}
            </span>
            {stat.label ? (
              <span {...editable(model, stat.fields.label)} className="sl-figure-label">
                {stat.label}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Work({ model }: { model: SiteModel }) {
  const images = model.work.some((item) => item.image);
  return (
    <Section kind="work">
      <Title model={model} kind="work" />
      <ul
        className="sl-works"
        data-n={Math.min(model.work.length, 3)}
        data-images={images || undefined}
      >
        {model.work.map((item, index) => {
          const kicker =
            item.kind || item.year || item.href ? (
              <span className="sl-kicker">
                <span>
                  {item.kind ? (
                    <span {...editable(model, item.fields.kind)}>{item.kind}</span>
                  ) : null}
                  {item.kind && item.year ? " · " : null}
                  {item.year ? (
                    <span {...editable(model, item.fields.year)}>{item.year}</span>
                  ) : null}
                </span>
                {item.href ? <span aria-hidden="true">↗</span> : null}
              </span>
            ) : null;
          const body = (
            <>
              <span className="sl-frame sl-work-frame">
                {item.image ? (
                  <Photo image={item.image} />
                ) : (
                  <span className="sl-tile">
                    {kicker ?? <span />}
                    <span
                      className="sl-tile-title sl-fit"
                      style={sizeVars("sl-fs", tileSizes(item.title.length))}
                    >
                      <span {...editable(model, item.fields.title)}>{item.title}</span>
                    </span>
                  </span>
                )}
              </span>
              {item.image ? (
                <>
                  {kicker}
                  <span {...editable(model, item.fields.title)} className="sl-work-title">
                    {item.title}
                  </span>
                </>
              ) : null}
              {item.context ? (
                <span {...editable(model, item.fields.context)} className="sl-work-context">
                  {item.context}
                </span>
              ) : null}
              {item.description ? (
                <span {...editable(model, item.fields.description)} className="sl-work-desc">
                  {item.description}
                </span>
              ) : null}
            </>
          );
          return (
            <li key={index} data-rise="" className="sl-work-cell">
              {item.href ? (
                <a
                  {...linkProps(item.href)}
                  className="sl-work"
                  data-image={item.image ? "" : undefined}
                >
                  {body}
                </a>
              ) : (
                <div className="sl-work" data-image={item.image ? "" : undefined}>
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function Experience({ model }: { model: SiteModel }) {
  return (
    <Section kind="experience">
      <Title model={model} kind="experience" />
      <ol className="sl-roles">
        {model.experience.map((item, index) => (
          <li key={index} data-rise="" className="sl-role-row">
            <span className="sl-role-n">{pad2(index + 1)}</span>
            <span className="sl-role-main">
              <span {...editable(model, item.fields.role)} className="sl-role">
                {item.role}
              </span>
              {item.organization ? (
                <span {...editable(model, item.fields.organization)} className="sl-org">
                  {item.organization}
                </span>
              ) : null}
              {item.summary ? (
                <span {...editable(model, item.fields.summary)} className="sl-summary">
                  {item.summary}
                </span>
              ) : null}
            </span>
            <span className="sl-role-side">
              {item.start || item.end ? (
                <span>
                  {item.start ? (
                    <span {...editable(model, item.fields.start)}>{item.start}</span>
                  ) : null}
                  {item.start && item.end ? " – " : null}
                  {item.end ? <span {...editable(model, item.fields.end)}>{item.end}</span> : null}
                </span>
              ) : null}
              {item.location ? (
                <span {...editable(model, item.fields.location)}>{item.location}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Testimonials({ model }: { model: SiteModel }) {
  const quotes = model.testimonials;
  const count = quotes.length;
  return (
    <Section kind="testimonials">
      <Title model={model} kind="testimonials" />
      <div data-rise="" className="sl-quotes">
        <SalonQuotes
          count={count}
          label={title(model, "testimonials").text}
          previous={label(model, "previous", "Previous").text}
          next={label(model, "next", "Next").text}
        >
          {quotes.map((quote, index) => (
            <figure
              key={index}
              aria-label={`${index + 1} / ${count}`}
              className="sl-quote"
              data-photo={quote.photo ? "" : undefined}
            >
              <div className="sl-quote-text">
                <blockquote
                  className="sl-quote-body sl-fit"
                  style={sizeVars("sl-fs", quoteSizes(quote.quote.length))}
                >
                  “<span {...editable(model, quote.fields.quote)}>{quote.quote}</span>”
                </blockquote>
                <figcaption className="sl-quote-caption">
                  <span className="sl-quote-author">
                    <span aria-hidden="true" className="sl-quote-rule" />
                    <span {...editable(model, quote.fields.author)}>{quote.author}</span>
                  </span>
                  {quote.role ? (
                    <span {...editable(model, quote.fields.role)} className="sl-quote-role">
                      {quote.role}
                    </span>
                  ) : null}
                </figcaption>
              </div>
              {quote.photo ? (
                <span className="sl-frame sl-quote-photo">
                  <Photo image={quote.photo} />
                </span>
              ) : null}
            </figure>
          ))}
        </SalonQuotes>
      </div>
    </Section>
  );
}

function Closing({ model }: { model: SiteModel }) {
  const cta = model.cta;
  if (!cta) return null;
  // The gallery again, newest first, floating at both sides; fewer than two close up into a
  // framed block of type.
  const photos = [...model.gallery].reverse().slice(0, CTA_PHOTOS.wide);
  const float = photos.length >= 2;
  const collage = float ? ctaCollage(photos.length) : null;
  const reach = collage?.reach.p;
  return (
    <section
      aria-labelledby="sl-cta-h"
      className="sl-cta"
      data-float={float || undefined}
      style={
        reach
          ? ({
              "--sl-cta-top-p": `${(reach.top + 8).toFixed(2)}cqw`,
              "--sl-cta-bottom-p": `${(reach.bottom + 8).toFixed(2)}cqw`,
            } as CSSProperties)
          : undefined
      }
    >
      {collage ? (
        <Floats
          photos={photos}
          places={collage.places}
          phone={CTA_PHOTOS.phone}
          delay={0}
          stagger={0.1}
          rise
        />
      ) : null}
      <div data-rise="" className="sl-cta-box">
        <h2
          id="sl-cta-h"
          {...editable(model, cta.fields.headline)}
          className="sl-cta-title sl-fit"
          style={sizeVars("sl-fs", ctaSizes(cta.headline, float))}
        >
          {cta.headline}
        </h2>
        {cta.body ? (
          <p {...editable(model, cta.fields.body)} className="sl-cta-body">
            {cta.body}
          </p>
        ) : null}
        {cta.button ? (
          <CtaLink link={cta.button} className="sl-bracket sl-button">
            <span {...editable(model, cta.fields.button)}>{cta.button.label}</span>
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
      aria-labelledby="sl-contact-h"
      className="sl-sec sl-contact"
      data-form={form || undefined}
      data-direct={direct || undefined}
    >
      <div className="sl-wrap">
        <Title model={model} kind="contact" />
        <div className="sl-contact-grid">
          {direct ? (
            <div data-rise="" className="sl-direct">
              {contact.blurb ? (
                <p {...editable(model, contact.fields.blurb)} className="sl-blurb">
                  {contact.blurb}
                </p>
              ) : null}
              {contact.email ? (
                <a href={mailto(contact.email)} className="sl-email">
                  <Icon kind="mail" size={20} />
                  {contact.email}
                </a>
              ) : null}
              {contact.links.length ? (
                <ul className={form ? "sl-link-list" : "sl-chips"}>
                  {contact.links.map((link, index) => (
                    <li key={index}>
                      <ContactLink
                        link={link}
                        className={form ? "sl-link-row" : "sl-bracket sl-chip"}
                      >
                        <Icon kind={link.kind} size={form ? 18 : 16} />
                        <span {...editable(model, link.field)} className="sl-link-label">
                          {link.label}
                        </span>
                        {form ? (
                          <span aria-hidden="true" className="sl-link-arrow">
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
            <div data-rise="" className="sl-frame sl-form-column">
              <ContactForm
                prefix="sl"
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

export function SalonTemplate({ model, colors, photoGrade, sendMessage }: TemplateProps) {
  const renderers: Record<MiddleKind, () => ReactNode> = {
    about: () => <About model={model} />,
    impact: () => <Impact model={model} />,
    experience: () => <Experience model={model} />,
    work: () => <Work model={model} />,
    testimonials: () => <Testimonials model={model} />,
  };
  const cta = model.cta ? <Closing model={model} /> : null;
  const after = model.cta?.after ?? 0;
  // Focus sits right after the section it follows on the page (or first).
  const blocks = model.sequence.filter((kind) => kind !== "cta");
  const focusAt = blocks.indexOf("focus");
  const focusAfter = focusAt > 0 ? blocks[focusAt - 1] : null;
  const focus = model.focus ? <Focus model={model} /> : null;
  const top = label(model, "back-to-top", "Back to top");

  return (
    <div
      id={ANCHORS.top}
      className="sl"
      data-static={model.editable || undefined}
      style={
        {
          ...salonRoleStyle(colors),
          ...gradeStyle(photoGrade),
          fontFamily: FONTS.hankenGrotesk,
          minHeight: "inherit",
        } as CSSProperties
      }
    >
      <SkipLink />
      <Header model={model} />
      <main id="main">
        <Hero model={model} />
        {after === 0 ? cta : null}
        {model.top || focusAt !== 0 ? null : focus}
        {model.top
          ? null
          : model.order.map((kind, index) => (
              <Fragment key={kind}>
                {renderers[kind]()}
                {focusAfter === kind ? focus : null}
                {after === index + 1 ? cta : null}
              </Fragment>
            ))}
        {model.top ? null : <Contact model={model} sendMessage={sendMessage} />}
      </main>
      {model.top ? null : (
        <footer className="sl-footer">
          <div className="sl-footer-in">
            <a href={`#${ANCHORS.top}`} className="sl-footer-name">
              <Words model={model} text={{ text: model.name, field: model.fields.name }} />
            </a>
            <nav aria-label="Footer" className="sl-footer-nav">
              {navOf(model).map((item) => (
                <a key={item.href} href={item.href} className="sl-footer-link">
                  <Words model={model} text={item.text} />
                </a>
              ))}
            </nav>
            <a href={`#${ANCHORS.top}`} className="sl-top">
              {model.editable ? (
                <>
                  <Words model={model} text={top} />
                  <span aria-hidden="true"> ↑</span>
                </>
              ) : (
                `${top.text} ↑`
              )}
            </a>
          </div>
        </footer>
      )}
    </div>
  );
}
