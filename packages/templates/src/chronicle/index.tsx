import type { CSSProperties, ReactNode } from "react";
import { fluid, FONTS } from "../fonts";
import { dropCap, type MiddleKind, type SiteModel } from "../model";
import {
  ANCHORS,
  ContactLink,
  CtaLink,
  mailto,
  navItems,
  Portrait,
  SkipLink,
  Spans,
} from "../shared";
import type { TemplateProps } from "../types";

// T6 Chronicle: a warm, long-form letter with a timeline. For writers, advisors and speakers.

const serif = FONTS.newsreader;
const sans = FONTS.inter;
const gutter = fluid(20, 48);
const kicker: CSSProperties = {
  fontFamily: sans,
  fontSize: 12,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: "var(--site-accent)",
};

function column(maxWidth: number, top: string, bottom: string | number = 0): CSSProperties {
  return {
    maxWidth,
    margin: "0 auto",
    padding: `${top} ${gutter} ${typeof bottom === "number" ? `${bottom}px` : bottom}`,
  };
}

function Hero({ model }: { model: SiteModel }) {
  const { hero } = model;
  return (
    <section
      style={{
        ...column(880, fluid(56, 88)),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 26,
      }}
    >
      <Portrait
        image={hero.image}
        style={{
          width: 128,
          height: 128,
          flex: "none",
          borderRadius: "50%",
          background:
            "linear-gradient(160deg, color-mix(in srgb, var(--site-accent) 30%, var(--site-bg)), var(--site-accent))",
          boxShadow:
            "0 0 0 8px var(--site-bg), 0 0 0 9px color-mix(in srgb, var(--site-ink) 12%, transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontStyle: "italic",
          fontSize: 44,
          color: "var(--site-bg)",
          overflow: "hidden",
        }}
      >
        {model.initials}
      </Portrait>
      {hero.eyebrow ? <span style={kicker}>{hero.eyebrow}</span> : null}
      <h1
        style={{
          margin: 0,
          fontFamily: serif,
          fontWeight: 400,
          fontSize: fluid(42, 74),
          lineHeight: 1.06,
          letterSpacing: "-0.025em",
          textWrap: "balance",
        }}
      >
        {hero.headline}
      </h1>
      {hero.subheadline ? (
        <p
          style={{
            margin: 0,
            maxWidth: 640,
            fontStyle: "italic",
            fontSize: fluid(20, 23),
            lineHeight: 1.5,
            color: "var(--site-muted)",
            textWrap: "pretty",
          }}
        >
          {hero.subheadline}
        </p>
      ) : null}
      {hero.cta ? (
        <CtaLink
          link={hero.cta}
          style={{
            marginTop: 8,
            fontFamily: sans,
            fontSize: 15,
            fontWeight: 600,
            color: "var(--site-accent)",
            borderBottom: "1px solid var(--site-accent)",
            paddingBottom: 3,
          }}
        >
          {hero.cta.label} →
        </CtaLink>
      ) : null}
    </section>
  );
}

function About({ model }: { model: SiteModel }) {
  const about = model.about!;
  const cap = dropCap(about.lead);
  return (
    <section id={ANCHORS.about} aria-label="About" style={column(720, fluid(64, 96))}>
      <p style={{ margin: 0, fontSize: fluid(21, 24), lineHeight: 1.6, textWrap: "pretty" }}>
        {cap ? (
          <span
            aria-hidden
            style={{
              float: "left",
              fontSize: fluid(72, 92),
              lineHeight: 0.8,
              padding: "8px 12px 0 0",
              color: "var(--site-accent)",
            }}
          >
            {cap.letter}
          </span>
        ) : null}
        {cap ? <span className="sr-only">{cap.letter}</span> : null}
        <Spans
          spans={cap ? cap.spans : about.lead}
          emphasis={(text, key) => <em key={key}>{text}</em>}
        />
      </p>
      {about.rest.map((paragraph, index) => (
        <p key={index} style={{ margin: "24px 0 0", color: "var(--site-muted)" }}>
          {paragraph}
        </p>
      ))}
    </section>
  );
}

function Impact({ model }: { model: SiteModel }) {
  return (
    <section
      id={ANCHORS.impact}
      aria-label="Impact"
      className="grid grid-cols-2 gap-6 @3xl:grid-cols-4"
      style={{ ...column(1080, fluid(72, 112)), textAlign: "center" }}
    >
      {model.stats.map((stat, index) => (
        <div key={index}>
          <div
            style={{
              fontSize: fluid(40, 52),
              lineHeight: 1,
              color: "var(--site-accent)",
              letterSpacing: "-0.02em",
            }}
          >
            {stat.value}
          </div>
          <div
            style={{ marginTop: 10, fontStyle: "italic", fontSize: 16, color: "var(--site-muted)" }}
          >
            {stat.label}
          </div>
        </div>
      ))}
    </section>
  );
}

function Record({ model }: { model: SiteModel }) {
  return (
    <section id={ANCHORS.experience} aria-label="The record" style={column(880, fluid(80, 128))}>
      <div style={{ ...kicker, textAlign: "center", marginBottom: 40 }}>The record</div>
      {model.experience.map((item, index) => {
        const where = [item.organization, item.location].filter(Boolean).join(", ");
        return (
          <div
            key={index}
            className="grid grid-cols-[84px_1fr] gap-5 @3xl:grid-cols-[140px_1fr] @3xl:gap-10"
            style={{ paddingBottom: 48 }}
          >
            <div
              style={{
                textAlign: "right",
                fontSize: fluid(28, 40),
                lineHeight: 1,
                color: "var(--site-accent)",
                borderRight: "1px solid color-mix(in srgb, var(--site-ink) 15%, transparent)",
                paddingRight: fluid(14, 28),
              }}
            >
              {item.startYear}
            </div>
            <div>
              <div style={{ fontSize: fluid(24, 28), lineHeight: 1.2 }}>{item.role}</div>
              <div style={{ marginTop: 4, fontStyle: "italic", color: "var(--site-muted)" }}>
                {[where, item.dates].filter(Boolean).join(" · ")}
              </div>
              {item.summary ? (
                <p
                  style={{
                    margin: "12px 0 0",
                    fontSize: 18,
                    color: "color-mix(in srgb, var(--site-ink) 85%, var(--site-bg))",
                  }}
                >
                  {item.summary}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function Notes({ model }: { model: SiteModel }) {
  return (
    <section
      id={ANCHORS.work}
      aria-label="Notes, talks and boards"
      style={column(880, fluid(64, 96))}
    >
      <div style={{ ...kicker, textAlign: "center", marginBottom: 28 }}>
        Notes, talks and boards
      </div>
      {model.work.map((item, index) => {
        const title = (
          <span style={{ fontSize: fluid(21, 24), lineHeight: 1.3 }}>{item.title}</span>
        );
        return (
          <div
            key={index}
            className="grid grid-cols-[84px_1fr] items-baseline gap-x-5 gap-y-1 @3xl:grid-cols-[140px_1fr_auto] @3xl:gap-10"
            style={{
              padding: "20px 0",
              borderTop: "1px solid color-mix(in srgb, var(--site-ink) 12%, transparent)",
            }}
          >
            <span
              style={{
                textAlign: "right",
                fontStyle: "italic",
                fontSize: 16,
                color: "var(--site-accent)",
              }}
            >
              {item.kind}
            </span>
            {item.href ? (
              <ContactLink
                link={{ label: item.title, href: item.href }}
                className="hover:underline"
              >
                {title}
              </ContactLink>
            ) : (
              title
            )}
            <span
              className="col-start-2 @3xl:col-start-auto"
              style={{ fontFamily: sans, fontSize: 13, color: "var(--site-muted)" }}
            >
              {item.year}
            </span>
          </div>
        );
      })}
    </section>
  );
}

function Testimonials({ model }: { model: SiteModel }) {
  return (
    <section
      id={ANCHORS.testimonials}
      aria-label="Testimonials"
      style={{
        ...column(880, fluid(80, 128)),
        display: "flex",
        flexDirection: "column",
        gap: 56,
        textAlign: "center",
      }}
    >
      {model.testimonials.map((item, index) => (
        <figure key={index} style={{ margin: 0 }}>
          <blockquote
            style={{
              margin: 0,
              fontStyle: "italic",
              fontSize: fluid(24, 32),
              lineHeight: 1.35,
              letterSpacing: "-0.01em",
              textWrap: "balance",
            }}
          >
            “{item.quote}”
          </blockquote>
          <figcaption
            style={{
              marginTop: 16,
              fontFamily: sans,
              fontSize: 13,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--site-muted)",
            }}
          >
            {[item.author, item.role].filter(Boolean).join(" · ")}
          </figcaption>
        </figure>
      ))}
    </section>
  );
}

function Contact({ model }: { model: SiteModel }) {
  const { contact } = model;
  return (
    <section
      id={ANCHORS.contact}
      aria-label="Write to me"
      style={{
        ...column(880, fluid(96, 144), fluid(80, 112)),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 22,
      }}
    >
      <span style={kicker}>Write to me</span>
      <h2
        style={{
          margin: 0,
          fontFamily: serif,
          fontWeight: 400,
          fontSize: fluid(34, 54),
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
        }}
      >
        {contact.blurb || "Get in touch."}
      </h2>
      {contact.email ? (
        <a
          href={mailto(contact.email)}
          style={{
            fontSize: fluid(22, 28),
            color: "var(--site-accent)",
            textDecoration: "underline",
            textDecorationThickness: 1,
            textUnderlineOffset: 7,
            overflowWrap: "anywhere",
          }}
        >
          {contact.email}
        </a>
      ) : null}
      {contact.links.length ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "12px 28px",
            fontFamily: sans,
            fontSize: 14,
            color: "var(--site-muted)",
          }}
        >
          {contact.links.map((link, index) => (
            <ContactLink key={index} link={link} className="hover:text-site-ink" />
          ))}
        </div>
      ) : null}
      {model.first ? (
        <span
          style={{ marginTop: 32, fontStyle: "italic", fontSize: 40, color: "var(--site-muted)" }}
        >
          — {model.first}
        </span>
      ) : null}
    </section>
  );
}

export function ChronicleTemplate({ model, publishedAt }: TemplateProps) {
  const nav = navItems(model, { about: "About", experience: "Record", work: "Notes" });
  const renderers: Record<MiddleKind, () => ReactNode> = {
    impact: () => <Impact model={model} />,
    about: () => <About model={model} />,
    experience: () => <Record model={model} />,
    work: () => <Notes model={model} />,
    testimonials: () => <Testimonials model={model} />,
  };

  return (
    <div id={ANCHORS.top} style={{ fontFamily: serif, fontSize: 19, lineHeight: 1.65 }}>
      <SkipLink />
      <header
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: `0 ${gutter}`,
          height: 84,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <a href={`#${ANCHORS.top}`} style={{ fontStyle: "italic", fontSize: 22 }}>
          {model.name}
        </a>
        <nav
          aria-label="Sections"
          style={{
            display: "flex",
            gap: 30,
            fontFamily: sans,
            fontSize: 13,
            color: "var(--site-muted)",
          }}
        >
          {nav.map((item) => (
            <a key={item.href} href={item.href} className="hidden hover:text-site-ink @3xl:inline">
              {item.label}
            </a>
          ))}
          <a
            href={`#${ANCHORS.contact}`}
            style={{ color: "var(--site-accent)", fontWeight: 600, whiteSpace: "nowrap" }}
          >
            Write to me
          </a>
        </nav>
      </header>
      <main id="main">
        <Hero model={model} />
        <div
          aria-hidden
          style={{ display: "flex", justifyContent: "center", padding: `${fluid(64, 96)} 0 0` }}
        >
          <span style={{ width: 56, height: 1, background: "var(--site-accent)" }} />
        </div>
        {model.order.map((kind) => (
          <div key={kind} style={{ display: "contents" }}>
            {renderers[kind]()}
          </div>
        ))}
        <Contact model={model} />
      </main>
      <footer
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: `24px ${gutter} 40px`,
          borderTop: "1px solid color-mix(in srgb, var(--site-ink) 12%, transparent)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 12,
          fontFamily: sans,
          fontSize: 13,
          color: "var(--site-muted)",
        }}
      >
        <span>
          © {publishedAt.getUTCFullYear()} {model.name}
        </span>
        <span>{model.location}</span>
      </footer>
    </div>
  );
}
