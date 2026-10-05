import { useId, type CSSProperties, type ReactNode } from "react";
import { FONTS } from "../../fonts";
import { linkProps } from "../../links";
import {
  headingOf,
  label,
  type HeadingKind,
  type MiddleKind,
  type ModelQuote,
  type ModelText,
  type SiteModel,
} from "../../model";
import { ContactForm, type FormWords } from "../../contact-form";
import { ANCHORS, ContactLink, CtaLink, editable, mailto, SkipLink, Spans } from "../../shared";
import type { SendContactMessage, TemplateProps } from "../../types";
import { longestWord, meridianRoleStyle, RING_CIRCUMFERENCE, ringText } from "./measure";

// T1 Meridian: editorial and neutral, a serif name and the seal. For chief executives and chairs.
// Layout values live in styles.css (container queries); this file decides what is shown.

const LABELS: Record<HeadingKind, string> = {
  about: "About",
  impact: "Impact",
  experience: "Experience",
  work: "Selected work",
  testimonials: "In their words",
  contact: "Contact",
};

/** Sections that get a link in the header, in the order they appear on the page. */
const NAV_KINDS: readonly MiddleKind[] = ["about", "experience", "work"];

/** Template wording the owner can rewrite in the editor. */
function Words({ model, text }: { model: SiteModel; text: ModelText }) {
  return model.editable ? <span data-field={text.field}>{text.text}</span> : text.text;
}

/** A section's title: the owner's own, else Meridian's label. */
function title(model: SiteModel, kind: HeadingKind): ModelText {
  return headingOf(model, kind, LABELS[kind]);
}

function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

/** Soft grey line standing in for copy that will be written later (questions preview only). */
function Placeholder({ className, style }: { className?: string; style?: CSSProperties }) {
  return <span aria-hidden="true" className={cx("mer-ph", className)} style={style} />;
}

function PlaceholderLines({ widths, className }: { widths: readonly number[]; className: string }) {
  return (
    <span aria-hidden="true" className={cx("mer-ph-lines", className)}>
      {widths.map((width, index) => (
        <Placeholder key={index} style={{ width: `${width}%` }} />
      ))}
    </span>
  );
}

function Header({ model }: { model: SiteModel }) {
  const nav = model.order.filter((kind) => NAV_KINDS.includes(kind));
  if (model.draft && !model.about) nav.unshift("about");
  return (
    <header className="mer-header">
      <div className="mer-wrap mer-header-in">
        <a href={`#${ANCHORS.top}`} className="mer-brand">
          <span aria-hidden="true" className="mer-mark">
            {model.initials}
          </span>
          {model.name ? (
            <span
              {...editable(model, model.fields.name)}
              className={cx("mer-brand-name", model.draft && "mer-fill")}
            >
              {model.name}
            </span>
          ) : model.draft ? (
            <Placeholder className="mer-ph-brand" />
          ) : null}
        </a>
        <nav aria-label="Sections" className="mer-nav">
          {nav.map((kind) => (
            <a key={kind} href={`#${ANCHORS[kind]}`}>
              <Words model={model} text={title(model, kind)} />
            </a>
          ))}
        </nav>
        <a href={`#${ANCHORS.contact}`} className="mer-header-cta">
          <Words model={model} text={title(model, "contact")} />
        </a>
      </div>
    </header>
  );
}

function RingLine({
  id,
  className,
  fontSize,
  text,
}: {
  id: string;
  className: string;
  fontSize: number;
  text: string;
}) {
  return (
    <text className={className} style={{ fontFamily: FONTS.inter, fontWeight: 500, fontSize }}>
      <textPath href={`#${id}`} textLength={Math.round(RING_CIRCUMFERENCE)} lengthAdjust="spacing">
        {text}
      </textPath>
    </text>
  );
}

/**
 * The signature: two accent hairlines with the name and location set round the ring, and the
 * initials (or the photo) in the middle. Phone and desktop set the ring text at different sizes,
 * so both are rendered and the stylesheet shows one.
 */
function Seal({ model }: { model: SiteModel }) {
  const pathId = `mer-ring-${useId().replace(/[^\w-]/g, "")}`;
  const phone = ringText(model.name, model.location, 19);
  const desktop = ringText(model.name, model.location, 12.5);
  const image = model.hero.image;
  return (
    <div className="mer-seal">
      <svg viewBox="0 0 320 320" aria-hidden="true" focusable="false">
        <defs>
          <path id={pathId} d="M 160 160 m -138 0 a 138 138 0 1 1 276 0 a 138 138 0 1 1 -276 0" />
        </defs>
        <circle cx="160" cy="160" r="159.5" />
        <circle cx="160" cy="160" r="116.5" />
        <g className="mer-ring">
          <g className="mer-spin">
            {phone ? <RingLine id={pathId} className="mer-ring-phone" {...phone} /> : null}
            {desktop ? <RingLine id={pathId} className="mer-ring-desktop" {...desktop} /> : null}
          </g>
        </g>
      </svg>
      <div
        // A name appearing in the questions preview replays the fade-in.
        key={model.name ? "named" : "unnamed"}
        className={cx("mer-seal-face", model.draft && "mer-fill")}
      >
        <span aria-hidden="true" className="mer-seal-initials">
          {model.initials}
        </span>
        {image ? (
          // Templates are framework-agnostic, so a plain <img> rather than next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.src}
            alt={image.alt}
            loading="eager"
            decoding="async"
            className="mer-seal-photo"
          />
        ) : null}
      </div>
    </div>
  );
}

function Hero({ model }: { model: SiteModel }) {
  const { hero, draft } = model;
  // Without an eyebrow, the title line falls back to role and organisation.
  const kicker = hero.eyebrow || model.role || model.company;
  const entrance = draft ? "mer-fill" : "mer-in";
  let step = 0;
  const delay = () => ({ "--mer-delay": `${60 + step++ * 90}ms` }) as CSSProperties;

  return (
    <section aria-label="Introduction" className="mer-wrap mer-hero">
      <div className="mer-hero-text">
        {kicker || model.location ? (
          <p className={cx("mer-kicker", entrance)} style={delay()}>
            {hero.eyebrow ? (
              <span {...editable(model, hero.fields.eyebrow)}>{hero.eyebrow}</span>
            ) : kicker ? (
              <>
                {model.role ? (
                  <span {...editable(model, model.fields.role)}>{model.role}</span>
                ) : null}
                {model.role && model.company ? ", " : null}
                {model.company ? (
                  <span {...editable(model, model.fields.company)}>{model.company}</span>
                ) : null}
              </>
            ) : null}
            {kicker && model.location ? " · " : null}
            {model.location ? (
              <span {...editable(model, model.fields.location)}>{model.location}</span>
            ) : null}
          </p>
        ) : draft ? (
          <Placeholder className="mer-ph-kicker" />
        ) : null}
        {model.name ? (
          <h1
            {...editable(model, model.fields.name)}
            className={cx("mer-name", entrance)}
            style={delay()}
          >
            {model.name}
          </h1>
        ) : draft ? (
          <Placeholder className="mer-ph-name" />
        ) : null}
        {hero.headline ? (
          <p
            {...editable(model, hero.fields.headline)}
            className={cx("mer-statement", entrance)}
            style={delay()}
          >
            {hero.headline}
          </p>
        ) : draft ? (
          <PlaceholderLines widths={[92, 56]} className="mer-ph-statement" />
        ) : null}
        {hero.subheadline ? (
          <p
            {...editable(model, hero.fields.subheadline)}
            className={cx("mer-intro", entrance)}
            style={delay()}
          >
            {hero.subheadline}
          </p>
        ) : null}
        <div className={cx("mer-actions", !draft && "mer-in")} style={delay()}>
          {hero.cta ? (
            <CtaLink link={hero.cta} className="mer-button">
              <span {...editable(model, hero.fields.cta)}>{hero.cta.label}</span>
              <span aria-hidden="true">→</span>
            </CtaLink>
          ) : (
            <a href={`#${ANCHORS.contact}`} className="mer-button">
              <Words
                model={model}
                text={{ text: title(model, "contact").text, field: hero.fields.cta }}
              />
              <span aria-hidden="true">→</span>
            </a>
          )}
        </div>
      </div>
      <Seal model={model} />
    </section>
  );
}

function Affiliations({ model }: { model: SiteModel }) {
  const last = model.affiliations.length - 1;
  return (
    <section aria-label="Boards and affiliations" className="mer-wrap mer-affiliations">
      <div className="mer-affiliations-row">
        <span className="mer-label mer-affiliations-label">
          <Words model={model} text={label(model, "affiliations", "Boards & affiliations")} />
        </span>
        {model.affiliations.map((name, index) => (
          <span key={index} className="mer-affiliation">
            <span {...editable(model, model.fields.affiliations[index]!)}>{name}</span>
            {index < last ? (
              <span aria-hidden="true" className="mer-affiliation-dot">
                ·
              </span>
            ) : null}
          </span>
        ))}
      </div>
    </section>
  );
}

function Section({
  model,
  kind,
  children,
}: {
  model: SiteModel;
  kind: HeadingKind;
  children: ReactNode;
}) {
  return (
    <section id={ANCHORS[kind]} className={cx("mer-wrap mer-section", `mer-${kind}`)}>
      <div className="mer-columns mer-section-grid">
        <h2 className="mer-label">
          <Words model={model} text={title(model, kind)} />
        </h2>
        <div className="mer-content">{children}</div>
      </div>
    </section>
  );
}

function About({ model }: { model: SiteModel }) {
  const about = model.about;
  if (!about) {
    return (
      <Section model={model} kind="about">
        <PlaceholderLines widths={[100, 94, 97, 48]} className="mer-ph-about" />
      </Section>
    );
  }
  const leadLength = about.lead.reduce((length, span) => length + span.text.length, 0);
  return (
    <Section model={model} kind="about">
      <p
        {...editable(model, about.fields.lead)}
        className={cx("mer-lede", model.draft && "mer-fill")}
        data-long={leadLength > 320 || undefined}
      >
        <Spans spans={about.lead} emphasis={(text, key) => <em key={key}>{text}</em>} />
      </p>
      {about.rest.map((paragraph, index) => (
        <p key={index} {...editable(model, paragraph.field)} className="mer-body">
          {paragraph.text}
        </p>
      ))}
    </Section>
  );
}

/** Columns follow the count: all in one row up to four, then three or four per row. */
function statColumns(count: number): number {
  if (count <= 4) return count;
  return count <= 6 ? 3 : 4;
}

function Impact({ model }: { model: SiteModel }) {
  const count = model.stats.length;
  return (
    <Section model={model} kind="impact">
      <div
        className="mer-stats"
        data-one={count === 1 || undefined}
        style={{ "--mer-cols": statColumns(count) } as CSSProperties}
      >
        {model.stats.map((stat, index) => (
          <div key={index} className="mer-stat">
            <div {...editable(model, stat.fields.value)} className="mer-stat-value">
              {stat.value}
            </div>
            <div {...editable(model, stat.fields.label)} className="mer-stat-label">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Experience({ model }: { model: SiteModel }) {
  return (
    <Section model={model} kind="experience">
      <div className="mer-list">
        {model.experience.map((item, index) => (
          <div key={index} className="mer-row mer-experience-row">
            <div className="mer-dates">
              {model.editable ? (
                <>
                  {item.start ? <span data-field={item.fields.start}>{item.start}</span> : null}
                  {item.start && item.end ? " – " : null}
                  {item.end ? <span data-field={item.fields.end}>{item.end}</span> : null}
                </>
              ) : (
                item.dates
              )}
            </div>
            <div className="mer-content">
              <div {...editable(model, item.fields.role)} className="mer-role">
                {item.role}
              </div>
              {item.organization || item.location ? (
                <div className="mer-org">
                  {item.organization ? (
                    <span {...editable(model, item.fields.organization)}>{item.organization}</span>
                  ) : null}
                  {item.organization && item.location ? " · " : null}
                  {item.location ? (
                    <span {...editable(model, item.fields.location)}>{item.location}</span>
                  ) : null}
                </div>
              ) : null}
              {item.summary ? (
                <p {...editable(model, item.fields.summary)} className="mer-summary">
                  {item.summary}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Work({ model }: { model: SiteModel }) {
  return (
    <Section model={model} kind="work">
      <div className="mer-list">
        {model.work.map((item, index) => {
          const cells = (
            <>
              <span className="mer-work-kind">
                {item.kind ? <span {...editable(model, item.fields.kind)}>{item.kind}</span> : null}
              </span>
              <span className="mer-work-main">
                <span className="mer-work-title">
                  <span {...editable(model, item.fields.title)}>{item.title}</span>
                  {item.href ? (
                    <span aria-hidden="true" className="mer-arrow">
                      {" ↗"}
                    </span>
                  ) : null}
                </span>
                {item.meta ? (
                  <span {...editable(model, item.fields.meta)} className="mer-work-meta">
                    {item.meta}
                  </span>
                ) : null}
              </span>
              <span className="mer-work-year">
                {item.year ? <span {...editable(model, item.fields.year)}>{item.year}</span> : null}
              </span>
            </>
          );
          return item.href ? (
            <a key={index} {...linkProps(item.href)} className="mer-row mer-work-row">
              {cells}
            </a>
          ) : (
            <div key={index} className="mer-row mer-work-row">
              {cells}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function Caption({ model, quote }: { model: SiteModel; quote: ModelQuote }) {
  return (
    <figcaption className="mer-caption">
      <span {...editable(model, quote.fields.author)} className="mer-caption-name">
        {quote.author}
      </span>
      {quote.role ? (
        <span className="mer-caption-role">
          {" · "}
          <span {...editable(model, quote.fields.role)}>{quote.role}</span>
        </span>
      ) : null}
    </figcaption>
  );
}

function Testimonials({ model }: { model: SiteModel }) {
  const [lead, ...rest] = model.testimonials;
  if (!lead) return null;
  return (
    <section id={ANCHORS.testimonials} className="mer-band">
      <div className="mer-wrap mer-columns mer-band-in">
        <h2 className="mer-label">
          <Words model={model} text={title(model, "testimonials")} />
        </h2>
        <div className="mer-content mer-quotes">
          <figure className="mer-lead-quote" data-long={lead.quote.length > 200 || undefined}>
            <blockquote>
              “<span {...editable(model, lead.fields.quote)}>{lead.quote}</span>”
            </blockquote>
            <Caption model={model} quote={lead} />
          </figure>
          {rest.length ? (
            <div
              className="mer-more-quotes"
              style={{ "--mer-cols": Math.min(rest.length, 3) } as CSSProperties}
            >
              {rest.map((quote, index) => (
                <figure key={index} className="mer-quote">
                  <blockquote>
                    “<span {...editable(model, quote.fields.quote)}>{quote.quote}</span>”
                  </blockquote>
                  <Caption model={model} quote={quote} />
                </figure>
              ))}
            </div>
          ) : null}
        </div>
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
    optional: word("form-optional", "Optional"),
    message: word("form-message", "Message"),
    send: word("form-send", "Send message"),
    note: word(
      "form-note",
      model.first
        ? `Sent privately to ${model.first}. Your details aren't shared.`
        : "Sent privately. Your details aren't shared.",
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
  const { contact, draft } = model;
  const form = contact.form.enabled;
  // With no invitation, the email address becomes the headline.
  const emailHeadline = !contact.blurb && Boolean(contact.email) && !draft;
  const emailRow = Boolean(contact.email) && !emailHeadline;
  const direct = emailRow || contact.links.length > 0;

  return (
    <Section model={model} kind="contact">
      {contact.blurb ? (
        <p
          {...editable(model, contact.fields.blurb)}
          className="mer-invitation"
          data-long={contact.blurb.length > 90 || undefined}
        >
          {contact.blurb}
        </p>
      ) : emailHeadline ? (
        <a href={mailto(contact.email)} className="mer-email-headline">
          {contact.email}
        </a>
      ) : draft ? (
        <PlaceholderLines widths={[88, 42]} className="mer-ph-invitation" />
      ) : null}
      {direct || form ? (
        <div className="mer-contact-grid" data-split={(direct && form) || undefined}>
          {direct ? (
            <div className="mer-direct">
              {emailRow ? (
                <div className="mer-direct-group">
                  <span className="mer-small">
                    <Words model={model} text={label(model, "contact-email", "Email")} />
                  </span>
                  <a
                    href={mailto(contact.email)}
                    className="mer-email"
                    data-large={!form || undefined}
                  >
                    {contact.email}
                  </a>
                </div>
              ) : null}
              {contact.links.length ? (
                <div className="mer-links">
                  <span className="mer-small mer-links-label">
                    <Words model={model} text={label(model, "contact-elsewhere", "Elsewhere")} />
                  </span>
                  {contact.links.map((link, index) => (
                    <ContactLink key={index} link={link} className="mer-link">
                      <span {...editable(model, link.field)} className="mer-link-label">
                        {link.label}
                      </span>
                      <span aria-hidden="true" className="mer-arrow">
                        ↗
                      </span>
                    </ContactLink>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {form ? (
            <div
              // Topics appearing in the questions preview replay the fade-in.
              key={draft ? `topics-${contact.form.topics.length > 0}` : "form"}
              className={cx("mer-form-column", draft && "mer-fill")}
              data-alone={!direct || undefined}
            >
              <ContactForm
                prefix="mer"
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
    </Section>
  );
}

export function MeridianTemplate({ model, publishedAt, colors, sendMessage }: TemplateProps) {
  const renderers: Record<MiddleKind, () => ReactNode> = {
    about: () => <About model={model} />,
    impact: () => <Impact model={model} />,
    experience: () => <Experience model={model} />,
    work: () => <Work model={model} />,
    testimonials: () => <Testimonials model={model} />,
  };
  // The questions preview shows About as grey lines until it's written.
  const order: MiddleKind[] = model.draft && !model.about ? ["about", ...model.order] : model.order;

  return (
    <div
      id={ANCHORS.top}
      className="mer"
      data-draft={model.draft || undefined}
      style={
        {
          ...meridianRoleStyle(colors),
          "--mer-measure": String(longestWord(model.name || "Your Name") * 0.52),
          fontFamily: FONTS.inter,
          minHeight: "inherit",
        } as CSSProperties
      }
    >
      <SkipLink />
      <Header model={model} />
      <main id="main">
        <Hero model={model} />
        {model.affiliations.length ? <Affiliations model={model} /> : null}
        {model.top
          ? null
          : order.map((kind) => (
              <div key={kind} style={{ display: "contents" }}>
                {renderers[kind]()}
              </div>
            ))}
        {model.top ? null : <Contact model={model} sendMessage={sendMessage} />}
      </main>
      {model.top ? null : (
        <footer className="mer-wrap mer-footer">
          <div className="mer-footer-in">
            <span>
              © {publishedAt.getUTCFullYear()}{" "}
              <Words model={model} text={{ text: model.name, field: model.fields.name }} />
            </span>
            <span className="mer-footer-location">
              {model.location ? (
                <span {...editable(model, model.fields.location)}>{model.location}</span>
              ) : null}
            </span>
            <a href={`#${ANCHORS.top}`} className="mer-top">
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
    </div>
  );
}
