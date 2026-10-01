import type { CSSProperties, ReactNode } from "react";
import { fluid, FONTS } from "../fonts";
import type { MiddleKind, SiteModel } from "../model";
import {
  ANCHORS,
  ContactLink,
  CtaLink,
  editable,
  loop,
  mailto,
  navItems,
  Portrait,
  sectionNumbers,
  SkipLink,
  Spans,
} from "../shared";
import type { TemplateProps } from "../types";

// T4 Monument: your name as the headline, in cobalt. For operators who want to be remembered.

const pad = fluid(20, 40);
const caps: CSSProperties = { fontSize: 13, fontWeight: 600, textTransform: "uppercase" };
const rule = "1px solid var(--site-ink)";
const rowRule = "1px solid color-mix(in srgb, var(--site-ink) 20%, transparent)";
const sectionGap = fluid(72, 120);

/** Width of a heavy uppercase Inter glyph, in em, used to keep long names on screen. */
const GLYPH_EM = 0.62;

function SectionLabel({
  number,
  title,
  aside,
  asideEdit,
}: {
  number: string | undefined;
  title: string;
  aside?: string;
  /** From editable(), when the aside is a content field. */
  asideEdit?: ReturnType<typeof editable>;
}) {
  return (
    <div
      style={{
        ...caps,
        borderTop: rule,
        paddingTop: 14,
        display: "flex",
        justifyContent: "space-between",
        gap: 24,
      }}
    >
      <span>{number ? `(${number}) ${title}` : title}</span>
      {aside ? (
        <span {...asideEdit} style={{ textAlign: "right" }}>
          {aside}
        </span>
      ) : null}
    </div>
  );
}

function NameHero({ model }: { model: SiteModel }) {
  const first = model.first || model.name;
  const last = model.last;
  // One size for both lines: the largest that fits the longer line, capped at the design's 236px.
  const size = [
    "236px",
    `calc((100cqw - 2 * ${pad}) / ${(Math.max(first.length, 1) * GLYPH_EM).toFixed(2)})`,
    last
      ? `calc((100cqw - 2 * ${pad} - var(--mn-reserve)) / ${(last.length * GLYPH_EM).toFixed(2)})`
      : "",
  ]
    .filter(Boolean)
    .join(", ");
  const nameStyle: CSSProperties = {
    fontWeight: 900,
    fontSize: `max(40px, min(${size}))`,
    lineHeight: 0.8,
    letterSpacing: "-0.075em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };
  return (
    <section
      className="[--mn-reserve:0px] @3xl:[--mn-reserve:480px]"
      style={{ padding: `36px ${pad} 0` }}
    >
      <div style={{ fontWeight: 900 }}>
        <span style={{ ...nameStyle, display: "block" }}>{first}</span>
        <span
          className="flex flex-wrap items-end gap-6 @3xl:flex-nowrap @3xl:gap-8"
          style={{ marginTop: 10 }}
        >
          {last ? <span style={nameStyle}>{last}</span> : null}
          <Portrait
            image={model.hero.image}
            className="h-[150px] w-[236px] @3xl:h-[190px] @3xl:w-[300px]"
            style={{
              flex: "none",
              background: "linear-gradient(135deg, var(--site-accent), var(--site-accent-deep))",
              marginBottom: 6,
            }}
          >
            <span
              style={{
                position: "absolute",
                right: 14,
                bottom: 4,
                fontWeight: 900,
                fontSize: fluid(84, 120),
                lineHeight: 1,
                color: "color-mix(in srgb, var(--site-on) 16%, transparent)",
                letterSpacing: "-0.06em",
              }}
            >
              {model.initials}
            </span>
          </Portrait>
          <span
            style={{
              flex: 1,
              fontSize: 14,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0,
              lineHeight: 1.5,
              paddingBottom: 8,
              whiteSpace: "nowrap",
            }}
          >
            (Portrait)
            {model.location ? (
              <>
                <br />
                <span {...editable(model, model.fields.location)}>{model.location}</span>
              </>
            ) : null}
          </span>
        </span>
      </div>
    </section>
  );
}

function Intro({ model }: { model: SiteModel }) {
  const { hero } = model;
  return (
    <section
      className="grid grid-cols-1 gap-6 @3xl:grid-cols-[4fr_8fr] @3xl:gap-10"
      style={{ padding: `${fluid(48, 72)} ${pad} ${fluid(64, 88)}` }}
    >
      <div style={{ ...caps, display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ color: "var(--site-accent)" }}>(Role)</span>
        <span {...editable(model, hero.eyebrow ? hero.fields.eyebrow : model.fields.role)}>
          {hero.eyebrow || model.role}
        </span>
      </div>
      <div>
        <h1
          {...editable(model, hero.fields.headline)}
          style={{
            margin: 0,
            fontFamily: FONTS.inter,
            fontWeight: 700,
            fontSize: fluid(32, 52),
            lineHeight: 1.02,
            letterSpacing: "-0.045em",
            textWrap: "balance",
          }}
        >
          {hero.headline}
        </h1>
        {hero.subheadline ? (
          <p
            {...editable(model, hero.fields.subheadline)}
            style={{
              margin: "22px 0 0",
              maxWidth: 640,
              fontSize: fluid(16, 18),
              color: "var(--site-muted)",
            }}
          >
            {hero.subheadline}
          </p>
        ) : null}
        {hero.cta ? (
          <CtaLink
            link={hero.cta}
            className="transition-opacity hover:opacity-90"
            style={{
              marginTop: 32,
              display: "inline-flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 24,
              minWidth: 280,
              padding: "18px 20px",
              background: "var(--site-accent)",
              color: "var(--site-on)",
              fontWeight: 700,
              textTransform: "uppercase",
              fontSize: 14,
              letterSpacing: "0.02em",
            }}
          >
            <span {...editable(model, hero.fields.cta)}>{hero.cta.label}</span>{" "}
            <span aria-hidden>→</span>
          </CtaLink>
        ) : null}
      </div>
    </section>
  );
}

function KeywordMarquee({ keywords }: { keywords: string[] }) {
  const copies = Math.max(1, Math.ceil(6 / keywords.length));
  return (
    <div
      role="group"
      aria-label="Keywords"
      style={{
        background: "var(--site-accent)",
        color: "var(--site-on)",
        overflow: "hidden",
        padding: "26px 0",
      }}
    >
      <div
        className="pt-marquee"
        style={{ display: "flex", width: "max-content", "--pt-duration": "30s" } as CSSProperties}
      >
        {loop(keywords, copies * 2).map((keyword, index) => (
          <span
            key={index}
            aria-hidden={index >= keywords.length}
            style={{
              padding: "0 28px",
              fontWeight: 900,
              fontSize: fluid(40, 64),
              lineHeight: 1,
              letterSpacing: "-0.05em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {keyword} <span style={{ color: "var(--site-ink)" }}>✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Impact({ model, number }: { model: SiteModel; number?: string }) {
  return (
    <section
      id={ANCHORS.impact}
      aria-label="Impact"
      style={{ padding: `${fluid(72, 104)} ${pad} 0` }}
    >
      <SectionLabel
        number={number}
        title="Impact"
        aside={model.company}
        asideEdit={editable(model, model.fields.company)}
      />
      <div className="grid grid-cols-2 gap-6 @3xl:grid-cols-4" style={{ marginTop: 40 }}>
        {model.stats.map((stat, index) => (
          <div key={index}>
            <div
              {...editable(model, stat.fields.value)}
              style={{
                fontWeight: 900,
                fontSize: fluid(52, 84),
                lineHeight: 0.9,
                letterSpacing: "-0.06em",
                color: "var(--site-accent)",
              }}
            >
              {stat.value}
            </div>
            <div
              {...editable(model, stat.fields.label)}
              style={{ marginTop: 16, fontSize: 15, fontWeight: 500, maxWidth: 220 }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function About({ model, number }: { model: SiteModel; number?: string }) {
  const about = model.about!;
  return (
    <section id={ANCHORS.about} aria-label="About" style={{ padding: `${sectionGap} ${pad} 0` }}>
      <SectionLabel number={number} title="About" />
      <div
        className="grid grid-cols-1 @3xl:grid-cols-[4fr_8fr] @3xl:gap-10"
        style={{ marginTop: 40 }}
      >
        <div />
        <div>
          <p
            {...editable(model, about.fields.lead)}
            style={{
              margin: 0,
              fontWeight: 700,
              fontSize: fluid(28, 40),
              lineHeight: 1.14,
              letterSpacing: "-0.04em",
              textWrap: "pretty",
            }}
          >
            <Spans
              spans={about.lead}
              emphasis={(text, key) => (
                <span key={key} style={{ color: "var(--site-accent)" }}>
                  {text}
                </span>
              )}
            />
          </p>
          {about.rest.map((paragraph, index) => (
            <p
              key={index}
              {...editable(model, paragraph.field)}
              style={{
                margin: "28px 0 0",
                maxWidth: 640,
                fontSize: 17,
                color: "var(--site-muted)",
              }}
            >
              {paragraph.text}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

function Experience({ model, number }: { model: SiteModel; number?: string }) {
  return (
    <section
      id={ANCHORS.experience}
      aria-label="Experience"
      style={{ padding: `${sectionGap} ${pad} 0` }}
    >
      <SectionLabel number={number} title="Experience" />
      <div style={{ marginTop: 24 }}>
        {model.experience.map((item, index) => (
          <div
            key={index}
            className="grid grid-cols-1 gap-3 transition-colors duration-200 hover:bg-site-soft @3xl:grid-cols-3 @3xl:gap-10"
            style={{ padding: "30px 0", borderBottom: rowRule }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
              {item.dates}
            </div>
            <div>
              <div
                {...editable(model, item.fields.role)}
                style={{
                  fontWeight: 800,
                  fontSize: fluid(24, 30),
                  lineHeight: 1.05,
                  letterSpacing: "-0.04em",
                }}
              >
                {item.role}
              </div>
              <div
                {...editable(model, item.fields.organization)}
                style={{ marginTop: 6, fontSize: 15, color: "var(--site-muted)" }}
              >
                {item.organization}
              </div>
            </div>
            {item.summary ? (
              <p
                {...editable(model, item.fields.summary)}
                style={{ margin: 0, fontSize: 15, color: "var(--site-muted)" }}
              >
                {item.summary}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function Work({ model, number }: { model: SiteModel; number?: string }) {
  return (
    <section
      id={ANCHORS.work}
      aria-label="Selected work"
      style={{ padding: `${sectionGap} ${pad} 0` }}
    >
      <SectionLabel number={number} title="Selected work" />
      <div style={{ marginTop: 16 }}>
        {model.work.map((item, index) => {
          const row = (
            <>
              <span {...(item.kind ? editable(model, item.fields.kind) : {})} style={{ ...caps }}>
                {item.kind}
              </span>
              <span
                {...editable(model, item.fields.title)}
                style={{
                  fontWeight: 800,
                  fontSize: fluid(28, 40),
                  lineHeight: 1.05,
                  letterSpacing: "-0.045em",
                }}
              >
                {item.title}
              </span>
              <span
                {...(item.year ? editable(model, item.fields.year) : {})}
                className="@3xl:justify-self-end"
                style={{ fontSize: 15, fontWeight: 600 }}
              >
                {item.year}
              </span>
            </>
          );
          const className =
            "grid grid-cols-1 items-baseline gap-2 transition-colors duration-200 hover:text-site-accent @3xl:grid-cols-[4fr_7fr_1fr] @3xl:gap-10";
          const style: CSSProperties = { padding: "22px 0", borderBottom: rowRule };
          return item.href ? (
            <ContactLink
              key={index}
              link={{ label: item.title, href: item.href }}
              className={className}
              style={style}
            >
              {row}
            </ContactLink>
          ) : (
            <div key={index} className={className} style={style}>
              {row}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Testimonials({ model }: { model: SiteModel }) {
  return (
    <section
      id={ANCHORS.testimonials}
      aria-label="Testimonials"
      className="grid grid-cols-1 gap-10 @3xl:grid-cols-2"
      style={{ padding: `${sectionGap} ${pad} 0` }}
    >
      {model.testimonials.map((item, index) => (
        <figure key={index} style={{ margin: 0, borderTop: rule, paddingTop: 24 }}>
          <blockquote
            style={{
              margin: 0,
              fontWeight: 700,
              fontSize: fluid(24, 30),
              lineHeight: 1.15,
              letterSpacing: "-0.035em",
            }}
          >
            “<span {...editable(model, item.fields.quote)}>{item.quote}</span>”
          </blockquote>
          <figcaption
            style={{
              ...caps,
              marginTop: 22,
              color: "color-mix(in srgb, var(--site-ink) 55%, transparent)",
            }}
          >
            <span {...editable(model, item.fields.author)}>{item.author}</span>
            {item.role ? (
              <>
                {" "}
                <span style={{ color: "var(--site-accent)" }}>/</span>{" "}
                <span {...editable(model, item.fields.role)}>{item.role}</span>
              </>
            ) : null}
          </figcaption>
        </figure>
      ))}
    </section>
  );
}

function Contact({ model, number, year }: { model: SiteModel; number?: string; year: number }) {
  const { contact } = model;
  return (
    <section
      id={ANCHORS.contact}
      aria-label="Contact"
      style={{ padding: `${fluid(96, 144)} ${pad} 48px` }}
    >
      <SectionLabel
        number={number}
        title="Contact"
        aside={contact.blurb}
        asideEdit={editable(model, contact.fields.blurb)}
      />
      {contact.email ? (
        <div
          style={{
            marginTop: 48,
            fontWeight: 900,
            fontSize: `min(108px, calc((100cqw - 2 * ${pad}) / ${Math.max(contact.email.length * 0.56, 1).toFixed(2)}))`,
            lineHeight: 0.9,
            letterSpacing: "-0.065em",
            color: "var(--site-accent)",
          }}
        >
          <a
            href={mailto(contact.email)}
            style={{
              textDecoration: "underline",
              textDecorationThickness: "0.055em",
              textUnderlineOffset: "0.15em",
            }}
          >
            {contact.email}
          </a>
        </div>
      ) : null}
      <footer
        style={{
          ...caps,
          marginTop: fluid(56, 80),
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <span>
          © {year} {model.name}
        </span>
        {contact.links.length ? (
          <span style={{ display: "flex", flexWrap: "wrap", gap: "12px 28px" }}>
            {contact.links.map((link, index) => (
              <ContactLink key={index} link={link} className="hover:text-site-accent" />
            ))}
          </span>
        ) : null}
      </footer>
    </section>
  );
}

export function MonumentTemplate({ model, publishedAt }: TemplateProps) {
  const numbers = sectionNumbers(model, ["impact", "about", "experience", "work", "contact"]);
  const nav = navItems(model, { about: "About", work: "Work" });
  const renderers: Record<MiddleKind, () => ReactNode> = {
    impact: () => <Impact model={model} number={numbers.impact} />,
    about: () => <About model={model} number={numbers.about} />,
    experience: () => <Experience model={model} number={numbers.experience} />,
    work: () => <Work model={model} number={numbers.work} />,
    testimonials: () => <Testimonials model={model} />,
  };

  return (
    <div
      id={ANCHORS.top}
      style={{ fontFamily: FONTS.inter, fontSize: 16, lineHeight: 1.5, overflow: "hidden" }}
    >
      <SkipLink />
      <header
        className="grid grid-cols-[1fr_auto] @3xl:grid-cols-3"
        style={{
          ...caps,
          padding: `0 ${pad}`,
          height: 64,
          alignItems: "center",
          gap: 16,
          borderBottom: rule,
          letterSpacing: "0.02em",
        }}
      >
        <a href={`#${ANCHORS.top}`} style={{ whiteSpace: "nowrap", overflow: "hidden" }}>
          <span {...editable(model, model.fields.name)}>{model.name}</span>
        </a>
        <span
          className="hidden @3xl:flex"
          style={{ alignItems: "center", gap: 10, justifyContent: "center" }}
        >
          {model.availability ? (
            <>
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--site-accent)",
                  flex: "none",
                }}
              />
              <span {...editable(model, model.fields.availability)}>{model.availability}</span>
            </>
          ) : null}
        </span>
        <nav aria-label="Sections" style={{ display: "flex", gap: 28, justifyContent: "flex-end" }}>
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="hidden hover:text-site-accent @xl:inline"
            >
              {item.label}
            </a>
          ))}
          <a href={`#${ANCHORS.contact}`} className="hover:text-site-accent">
            Contact
          </a>
        </nav>
      </header>
      <main id="main">
        <NameHero model={model} />
        <Intro model={model} />
        {model.keywords.length ? <KeywordMarquee keywords={model.keywords} /> : null}
        {model.order.map((kind) => (
          <div key={kind} style={{ display: "contents" }}>
            {renderers[kind]()}
          </div>
        ))}
        <Contact model={model} number={numbers.contact} year={publishedAt.getUTCFullYear()} />
      </main>
    </div>
  );
}
