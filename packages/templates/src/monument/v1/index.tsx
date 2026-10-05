import { Fragment, type CSSProperties, type ReactNode } from "react";
import { ContactForm, type FormWords } from "../../contact-form";
import { FONTS } from "../../fonts";
import { linkProps } from "../../links";
import {
  headingOf,
  label,
  type HeadingKind,
  type MiddleKind,
  type ModelImage,
  type ModelQuote,
  type ModelText,
  type SiteModel,
} from "../../model";
import {
  ANCHORS,
  ContactLink,
  CtaLink,
  editable,
  loop,
  mailto,
  SkipLink,
  Spans,
} from "../../shared";
import type { SendContactMessage, TemplateProps } from "../../types";
import { MonumentMenu, MonumentMotion } from "./client";
import { displayWidth, monumentRoleStyle, nameLines, nameMeasure, titleScale } from "./measure";

// T4 Monument: the loud one. The name stacked edge to edge on a full accent field, the initials
// printed tone on tone behind it, then sections that alternate between paper and an inverse
// field. Layout lives in monument.css (container queries); this file decides what is shown.

const LABELS: Record<HeadingKind, string> = {
  about: "About",
  impact: "Impact",
  experience: "Experience",
  work: "Selected work",
  testimonials: "In their words",
  contact: "Contact",
};

type Ground = "paper" | "inverse";

/** Where a middle section sits: its ground, and its number among the visible sections. */
interface Place {
  ground: Ground;
  number: string;
  total: string;
}

function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

/** Template wording the owner can rewrite in the editor. */
function Words({ model, text }: { model: SiteModel; text: ModelText }) {
  return model.editable ? <span data-field={text.field}>{text.text}</span> : text.text;
}

/** A section's title: the owner's own, else Monument's label. */
function title(model: SiteModel, kind: HeadingKind): ModelText {
  return headingOf(model, kind, LABELS[kind]);
}

/** Title size follows its length, so a long title the owner wrote still fits. */
function titleStyle(text: string): CSSProperties {
  return { "--mon-ts": titleScale(text) } as CSSProperties;
}

/** "01 / 05": the section's place among the visible ones. */
function Count({ place, rise }: { place: Place; rise?: boolean }) {
  return (
    <span className="mon-count" data-rise={rise || undefined}>
      <span className="mon-count-n">{place.number}</span>
      <span aria-hidden="true"> / {place.total}</span>
    </span>
  );
}

function Picture({ image, className }: { image: ModelImage; className: string }) {
  return (
    // Templates are framework-agnostic, so a plain <img> rather than next/image.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image.src} alt={image.alt} loading="lazy" decoding="async" className={className} />
  );
}

function Header({ model }: { model: SiteModel }) {
  const contact = title(model, "contact");
  return (
    <header className="mon-header">
      <div className="mon-header-in">
        <a href={`#${ANCHORS.top}`} className="mon-brand">
          <span {...editable(model, model.fields.name)}>{model.name}</span>
        </a>
        <nav aria-label="Sections" className="mon-nav">
          {model.order.map((kind) => (
            <a key={kind} href={`#${ANCHORS[kind]}`} className="mon-nav-link">
              <Words model={model} text={title(model, kind)} />
            </a>
          ))}
        </nav>
        <a href={`#${ANCHORS.contact}`} className="mon-header-cta">
          <Words model={model} text={contact} />
        </a>
        <div className="mon-phone-only">
          <MonumentMenu
            name={model.name}
            items={model.order.map((kind) => ({
              href: `#${ANCHORS[kind]}`,
              label: title(model, kind).text,
            }))}
            contact={{ href: `#${ANCHORS.contact}`, label: contact.text }}
            openLabel={label(model, "menu", "Menu").text}
            closeLabel={label(model, "menu-close", "Close").text}
          />
        </div>
      </div>
    </header>
  );
}

/** The eyebrow, unless it only repeats the role and organisation already shown on the field. */
function eyebrowOf(model: SiteModel): string {
  const eyebrow = model.hero.eyebrow.trim();
  const plain = (text: string) =>
    text
      .toLowerCase()
      .replace(/[\s,·|]+/g, " ")
      .trim();
  const shown = [model.role, model.company].filter(Boolean).join(" ");
  return eyebrow && plain(eyebrow) !== plain(shown) && plain(eyebrow) !== plain(model.role)
    ? eyebrow
    : "";
}

function Hero({ model }: { model: SiteModel }) {
  const { hero } = model;
  const image = hero.image;
  const eyebrow = eyebrowOf(model);
  const keywords = model.keywords;
  // The short availability stands in for the long one when only one is set.
  const shortIsLong = model.availabilityShort === model.availability;
  const availabilityLong = model.availability && !shortIsLong ? model.availability : "";
  const lines = nameLines(model.name);

  return (
    <section aria-label="Introduction" className="mon-hero" data-photo={image ? "" : undefined}>
      <div className="mon-stage">
        {image ? null : (
          <span aria-hidden="true" className="mon-initials">
            {model.initials}
          </span>
        )}
        {model.role || model.company || model.location || model.availabilityShort ? (
          <div className="mon-field-top">
            {model.role || model.company || model.location ? (
              <span className="mon-meta">
                {model.role ? (
                  <span {...editable(model, model.fields.role)}>{model.role}</span>
                ) : null}
                {model.company ? (
                  <span {...editable(model, model.fields.company)}>{model.company}</span>
                ) : null}
                {model.location ? (
                  <span {...editable(model, model.fields.location)} className="mon-on2">
                    {model.location}
                  </span>
                ) : null}
              </span>
            ) : null}
            {model.availabilityShort ? (
              <span className="mon-status">
                <span aria-hidden="true" className="mon-ping">
                  <span />
                  <span />
                </span>
                <span
                  {...editable(
                    model,
                    shortIsLong ? model.fields.availability : model.fields.availabilityShort,
                  )}
                >
                  {model.availabilityShort}
                </span>
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="mon-name-row">
          <div className="mon-name-col">
            <h1 {...editable(model, model.fields.name)} className="mon-name">
              {lines.map((line, index) => (
                <Fragment key={index}>
                  {line.space ? " " : null}
                  <span className="mon-line" style={{ animationDelay: `${60 + index * 110}ms` }}>
                    {line.text}
                  </span>
                </Fragment>
              ))}
            </h1>
            {keywords.length ? (
              <ul aria-label="Keywords" className="mon-keywords">
                {keywords.map((keyword, index) => (
                  <li key={index}>
                    <span {...editable(model, model.fields.keywords[index]!)}>{keyword}</span>
                    {index < keywords.length - 1 ? (
                      <span aria-hidden="true" className="mon-on2">
                        /
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {image ? (
            <div className="mon-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.src} alt={image.alt} loading="eager" decoding="async" />
            </div>
          ) : null}
        </div>
      </div>
      <div className="mon-below">
        <div className="mon-headline-col mon-in" style={{ animationDelay: "380ms" }}>
          {eyebrow ? (
            <p {...editable(model, hero.fields.eyebrow)} className="mon-eyebrow">
              {eyebrow}
            </p>
          ) : null}
          {hero.headline ? (
            <p {...editable(model, hero.fields.headline)} className="mon-headline">
              {hero.headline}
            </p>
          ) : null}
        </div>
        <div className="mon-intro-col mon-in" style={{ animationDelay: "450ms" }}>
          {hero.subheadline ? (
            <p {...editable(model, hero.fields.subheadline)} className="mon-intro">
              {hero.subheadline}
            </p>
          ) : null}
          {availabilityLong ? (
            <p {...editable(model, model.fields.availability)} className="mon-avail">
              {availabilityLong}
            </p>
          ) : null}
          {hero.cta ? (
            <CtaLink link={hero.cta} className="mon-button">
              <span {...editable(model, hero.fields.cta)}>{hero.cta.label}</span>
              <span aria-hidden="true" className="mon-dot-arrow">
                →
              </span>
            </CtaLink>
          ) : (
            <a href={`#${ANCHORS.contact}`} className="mon-button">
              <Words
                model={model}
                text={{ text: title(model, "contact").text, field: hero.fields.cta }}
              />
              <span aria-hidden="true" className="mon-dot-arrow">
                →
              </span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function Affiliations({ model }: { model: SiteModel }) {
  const names = model.affiliations;
  const heading = label(model, "affiliations", "Boards & affiliations");
  // Three or more names run as a slow band; fewer read better as a still line.
  const band = names.length >= 3;
  const separator = (
    <span aria-hidden="true" className="mon-sep">
      /
    </span>
  );
  return (
    <section aria-label={heading.text} className="mon-aff">
      <div className="mon-aff-label">
        <Words model={model} text={heading} />
      </div>
      {band ? (
        <>
          <ul className="sr-only">
            {names.map((name, index) => (
              <li key={index}>{name}</li>
            ))}
          </ul>
          <div aria-hidden="true" className="mon-band">
            <div className="mon-track">
              {loop(
                names.map((name, index) => ({ name, index })),
                2 * Math.max(2, Math.ceil(10 / names.length)),
              ).map((item, position) => (
                <span key={position} className="mon-band-item">
                  <span {...editable(model, model.fields.affiliations[item.index]!)}>
                    {item.name}
                  </span>
                  {separator}
                </span>
              ))}
            </div>
          </div>
        </>
      ) : (
        <ul className="mon-aff-line">
          {names.map((name, index) => (
            <li key={index}>
              <span {...editable(model, model.fields.affiliations[index]!)}>{name}</span>
              {index < names.length - 1 ? separator : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Section({
  kind,
  place,
  className,
  children,
}: {
  kind: MiddleKind;
  place: Place;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={ANCHORS[kind]}
      aria-labelledby={`mon-${kind}-h`}
      className={cx("mon-sec", `mon-${place.ground}`, className)}
      data-wipe=""
    >
      {children}
    </section>
  );
}

function About({ model, place }: { model: SiteModel; place: Place }) {
  const about = model.about;
  if (!about) return null;
  const heading = title(model, "about");
  return (
    <Section kind="about" place={place} className="mon-about">
      <Count place={place} rise />
      <h2
        id="mon-about-h"
        data-rise=""
        className="mon-title mon-title-accent"
        style={titleStyle(heading.text)}
      >
        <Words model={model} text={heading} />
      </h2>
      <div className="mon-about-grid" data-image={about.image ? "" : undefined}>
        {about.image ? (
          <div data-rise="" className="mon-about-image">
            <Picture image={about.image} className="mon-grey" />
          </div>
        ) : null}
        <p {...editable(model, about.fields.lead)} data-rise="" className="mon-lead">
          <Spans spans={about.lead} emphasis={(text, key) => <em key={key}>{text}</em>} />
        </p>
        {about.rest.length ? (
          <div
            data-rise=""
            className="mon-rest"
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
    </Section>
  );
}

function Impact({ model, place }: { model: SiteModel; place: Place }) {
  const heading = title(model, "impact");
  const count = model.stats.length;
  return (
    <Section kind="impact" place={place} className="mon-impact">
      <div data-rise="" className="mon-impact-head">
        <h2 id="mon-impact-h" className="mon-title" style={titleStyle(heading.text)}>
          <Words model={model} text={heading} />
        </h2>
        <Count place={place} />
      </div>
      <div
        className="mon-stats"
        data-count={count >= 4 ? "many" : String(count)}
        style={{ "--mon-cols": Math.min(count, 4) } as CSSProperties}
      >
        {model.stats.map((stat, index) => (
          <div key={index} data-rise="" className="mon-stat">
            <span
              {...editable(model, stat.fields.value)}
              className="mon-stat-value"
              style={{ "--mon-w": Math.max(1, displayWidth(stat.value)) } as CSSProperties}
            >
              {stat.value}
            </span>
            <span {...editable(model, stat.fields.label)} className="mon-stat-label">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Experience({ model, place }: { model: SiteModel; place: Place }) {
  const heading = title(model, "experience");
  return (
    <Section kind="experience" place={place} className="mon-experience">
      <div data-rise="" className="mon-head-row">
        <h2 id="mon-experience-h" className="mon-title" style={titleStyle(heading.text)}>
          <Words model={model} text={heading} />
        </h2>
        <Count place={place} />
      </div>
      <ol className="mon-rows mon-rows-thin">
        {model.experience.map((item, index) => (
          <li key={index} data-rise="" tabIndex={0} className="mon-row mon-exp-row">
            <span className="mon-dates">
              {item.start ? (
                <span {...editable(model, item.fields.start)}>{item.start}</span>
              ) : null}
              {item.start && item.end ? " – " : null}
              {item.end ? <span {...editable(model, item.fields.end)}>{item.end}</span> : null}
            </span>
            <span className="mon-exp-main">
              <span {...editable(model, item.fields.role)} className="mon-role">
                {item.role}
              </span>
              {item.organization || item.location ? (
                <span className="mon-row2">
                  {item.organization ? (
                    <span {...editable(model, item.fields.organization)}>{item.organization}</span>
                  ) : null}
                  {item.organization && item.location ? " · " : null}
                  {item.location ? (
                    <span {...editable(model, item.fields.location)}>{item.location}</span>
                  ) : null}
                </span>
              ) : null}
            </span>
            {item.summary ? (
              <span {...editable(model, item.fields.summary)} className="mon-row2 mon-summary">
                {item.summary}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Work({ model, place }: { model: SiteModel; place: Place }) {
  const heading = title(model, "work");
  const cards = model.work.some((item) => item.image);
  return (
    <Section kind="work" place={place} className="mon-work">
      <Count place={place} rise />
      <h2 id="mon-work-h" data-rise="" className="mon-title" style={titleStyle(heading.text)}>
        <Words model={model} text={heading} />
      </h2>
      <ol className={cards ? "mon-cards" : "mon-rows"}>
        {model.work.map((item, index) => {
          const number = String(index + 1).padStart(2, "0");
          const kindYear =
            item.kind || item.year ? (
              <span className="mon-kind">
                {item.kind ? <span {...editable(model, item.fields.kind)}>{item.kind}</span> : null}
                {item.kind && item.year ? <span className="mon-row2"> · </span> : null}
                {item.year ? (
                  <span {...editable(model, item.fields.year)} className="mon-row2">
                    {item.year}
                  </span>
                ) : null}
              </span>
            ) : null;
          const heading = (
            <span className="mon-work-title">
              <span {...editable(model, item.fields.title)}>{item.title}</span>
              {item.href ? (
                <span aria-hidden="true" className="mon-ne">
                  ↗
                </span>
              ) : null}
            </span>
          );
          const context = item.context ? (
            <span {...editable(model, item.fields.context)} className="mon-context">
              {item.context}
            </span>
          ) : null;
          const description = item.description ? (
            <span {...editable(model, item.fields.description)} className="mon-row2 mon-desc">
              {item.description}
            </span>
          ) : null;
          const body = cards ? (
            <>
              <span className="mon-card-image">
                {item.image ? (
                  <Picture image={item.image} className="mon-grey mon-multiply" />
                ) : (
                  <span aria-hidden="true" className="mon-tile">
                    {number}
                  </span>
                )}
              </span>
              {kindYear}
              {heading}
              {context}
              {description}
            </>
          ) : (
            <>
              <span aria-hidden="true" className="mon-row2 mon-work-n">
                {number}
              </span>
              <span className="mon-work-main">
                {heading}
                {description}
              </span>
              <span className="mon-work-side">
                {kindYear}
                {context ? <span className="mon-row2">{context}</span> : null}
              </span>
            </>
          );
          const className = cards ? "mon-card" : "mon-row mon-work-row";
          return (
            <li key={index} data-rise="" className={cards ? undefined : "mon-row-wrap"}>
              {item.href ? (
                <a {...linkProps(item.href)} className={className}>
                  {body}
                </a>
              ) : (
                <div tabIndex={cards ? undefined : 0} className={className}>
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </Section>
  );
}

function Caption({
  model,
  quote,
  inline,
}: {
  model: SiteModel;
  quote: ModelQuote;
  inline?: boolean;
}) {
  return (
    <figcaption className={inline ? "mon-caption-small" : "mon-caption"}>
      {inline ? null : <span aria-hidden="true" className="mon-caption-rule" />}
      <span {...editable(model, quote.fields.author)} className="mon-caption-name">
        {quote.author}
      </span>
      {quote.role ? (
        <span className="mon-row2">
          {inline ? " · " : null}
          <span {...editable(model, quote.fields.role)}>{quote.role}</span>
        </span>
      ) : null}
    </figcaption>
  );
}

function Testimonials({ model, place }: { model: SiteModel; place: Place }) {
  const [lead, ...rest] = model.testimonials;
  if (!lead) return null;
  const heading = title(model, "testimonials");
  return (
    <Section kind="testimonials" place={place} className="mon-quotes">
      <div data-rise="" className="mon-head-row">
        <h2 id="mon-testimonials-h" className="mon-label-title">
          <Words model={model} text={heading} />
        </h2>
        <Count place={place} />
      </div>
      <figure data-rise="" className="mon-lead-quote" data-one={rest.length ? undefined : ""}>
        <span aria-hidden="true" className="mon-quote-mark">
          “
        </span>
        <div className="mon-lead-quote-body">
          <blockquote {...editable(model, lead.fields.quote)}>{lead.quote}</blockquote>
          <Caption model={model} quote={lead} />
        </div>
      </figure>
      {rest.length ? (
        <div
          className="mon-more-quotes"
          style={{ "--mon-cols": rest.length >= 3 ? 3 : 2 } as CSSProperties}
        >
          {rest.map((quote, index) => (
            <figure key={index} data-rise="" className="mon-quote">
              <blockquote>
                “<span {...editable(model, quote.fields.quote)}>{quote.quote}</span>”
              </blockquote>
              <Caption model={model} quote={quote} inline />
            </figure>
          ))}
        </div>
      ) : null}
    </Section>
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
  const heading = title(model, "contact");
  const form = contact.form.enabled;
  const direct = Boolean(contact.blurb || contact.email || contact.links.length);
  return (
    <section
      id={ANCHORS.contact}
      aria-labelledby="mon-contact-h"
      className="mon-contact"
      data-wipe=""
      data-form={form ? "" : undefined}
    >
      <h2
        id="mon-contact-h"
        data-rise=""
        className="mon-contact-title"
        style={titleStyle(heading.text)}
      >
        <Words model={model} text={heading} />
      </h2>
      {direct || form ? (
        <div className="mon-contact-grid" data-split={(direct && form) || undefined}>
          {direct ? (
            <div data-rise="" className="mon-direct">
              {contact.blurb ? (
                <p {...editable(model, contact.fields.blurb)} className="mon-blurb">
                  {contact.blurb}
                </p>
              ) : null}
              {contact.email ? (
                <a href={mailto(contact.email)} className="mon-email">
                  {contact.email}
                </a>
              ) : null}
              {contact.links.length ? (
                <ul className="mon-links">
                  {contact.links.map((link, index) => (
                    <li key={index}>
                      <ContactLink link={link} className="mon-link">
                        <span {...editable(model, link.field)} className="mon-link-label">
                          {link.label}
                        </span>
                        <span aria-hidden="true">↗</span>
                      </ContactLink>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {form ? (
            <div data-rise="" className="mon-form-column" data-alone={!direct || undefined}>
              <ContactForm
                prefix="mon"
                topics={contact.form.topics}
                topicFields={model.editable ? contact.fields.topics : []}
                words={formWords(model)}
                first={model.first}
                send={sendMessage}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function MonumentTemplate({ model, publishedAt, colors, sendMessage }: TemplateProps) {
  const renderers: Record<MiddleKind, (place: Place) => ReactNode> = {
    about: (place) => <About model={model} place={place} />,
    impact: (place) => <Impact model={model} place={place} />,
    experience: (place) => <Experience model={model} place={place} />,
    work: (place) => <Work model={model} place={place} />,
    testimonials: (place) => <Testimonials model={model} place={place} />,
  };
  const affiliations = model.affiliations.length > 0;
  const total = String(model.order.length).padStart(2, "0");

  return (
    <div
      id={ANCHORS.top}
      className="mon"
      style={
        {
          ...monumentRoleStyle(colors),
          "--mon-measure": nameMeasure(model.name || "Name").toFixed(3),
          fontFamily: FONTS.publicSans,
          minHeight: "inherit",
        } as CSSProperties
      }
    >
      <SkipLink />
      <Header model={model} />
      <main id="main">
        <Hero model={model} />
        {affiliations ? <Affiliations model={model} /> : null}
        {model.top
          ? null
          : model.order.map((kind, index) => (
              <Fragment key={kind}>
                {renderers[kind]({
                  // Grounds alternate down the page; the affiliations band counts as an inverse one.
                  ground: (index + (affiliations ? 1 : 0)) % 2 === 0 ? "inverse" : "paper",
                  number: String(index + 1).padStart(2, "0"),
                  total,
                })}
              </Fragment>
            ))}
        {model.top ? null : <Contact model={model} sendMessage={sendMessage} />}
      </main>
      {model.top ? null : (
        <footer className="mon-footer">
          <div className="mon-footer-in">
            <span>
              © {publishedAt.getUTCFullYear()}{" "}
              <Words model={model} text={{ text: model.name, field: model.fields.name }} />
            </span>
            <span className="mon-footer-location">
              {model.location ? (
                <span {...editable(model, model.fields.location)}>{model.location}</span>
              ) : null}
            </span>
            <a href={`#${ANCHORS.top}`} className="mon-top">
              {model.editable ? (
                <>
                  <Words model={model} text={label(model, "back-to-top", "Back to top")} />
                  <span aria-hidden="true"> ↑</span>
                </>
              ) : (
                `${label(model, "back-to-top", "Back to top").text} ↑`
              )}
            </a>
          </div>
        </footer>
      )}
      {/* In the editor the owner needs the whole page at once, so sections don't wipe in. */}
      {model.editable || model.top ? null : <MonumentMotion />}
    </div>
  );
}
