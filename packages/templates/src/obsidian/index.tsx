import type { CSSProperties, ReactNode } from "react";
import { fluid, FONTS } from "../fonts";
import type { MiddleKind, SiteModel } from "../model";
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

// T3 Obsidian: black and champagne, a framed portrait. For investors and private enquiries.

const display = FONTS.playfair;
const wrap: CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  paddingInline: fluid(20, 56),
};
const kicker: CSSProperties = {
  fontSize: 12,
  letterSpacing: "0.26em",
  textTransform: "uppercase",
  color: "var(--site-accent)",
};
const sectionGap = fluid(80, 144);

function Hero({ model }: { model: SiteModel }) {
  const { hero } = model;
  return (
    <section
      className="grid grid-cols-1 items-center gap-14 @3xl:grid-cols-[6fr_5fr] @3xl:gap-20"
      style={{ ...wrap, paddingTop: fluid(32, 56) }}
    >
      <div>
        {model.role ? (
          <div style={{ ...kicker, display: "flex", alignItems: "center", gap: 14 }}>
            <span
              aria-hidden
              style={{ width: 40, height: 1, background: "var(--site-accent)", flex: "none" }}
            />
            {model.role}
          </div>
        ) : null}
        <h1
          style={{
            margin: "30px 0 0",
            fontFamily: display,
            fontWeight: 400,
            fontSize: fluid(42, 80),
            lineHeight: 1.04,
            letterSpacing: "-0.02em",
            textWrap: "balance",
          }}
        >
          {hero.headline}
        </h1>
        {hero.subheadline ? (
          <p
            style={{
              margin: "30px 0 0",
              maxWidth: 540,
              fontSize: fluid(17, 18),
              color: "var(--site-muted)",
            }}
          >
            {hero.subheadline}
          </p>
        ) : null}
        <div
          style={{
            marginTop: 42,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 26,
            fontSize: 15,
          }}
        >
          {hero.cta ? (
            <CtaLink
              link={hero.cta}
              className="transition-opacity hover:opacity-90"
              style={{
                padding: "16px 28px",
                borderRadius: 999,
                background: "var(--site-accent)",
                color: "var(--site-on)",
                fontWeight: 600,
              }}
            />
          ) : null}
          {model.order.includes("experience") ? (
            <a
              href={`#${ANCHORS.experience}`}
              style={{
                color: "var(--site-ink)",
                borderBottom: "1px solid var(--site-accent)",
                paddingBottom: 3,
              }}
            >
              The record
            </a>
          ) : null}
        </div>
      </div>
      <div
        className="mx-auto w-full max-w-[400px] @3xl:max-w-none"
        style={{ position: "relative", padding: "0 22px 22px 0" }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: "22px 0 0 22px",
            border: "1px solid color-mix(in srgb, var(--site-accent) 40%, transparent)",
          }}
        />
        <Portrait
          image={model.hero.image}
          style={{
            aspectRatio: "4 / 5",
            background:
              "radial-gradient(120% 90% at 30% 20%, color-mix(in srgb, var(--site-ink) 12%, var(--site-bg)), color-mix(in srgb, var(--site-ink) 3%, var(--site-bg)) 70%)",
            border: "1px solid color-mix(in srgb, var(--site-ink) 7%, transparent)",
            display: "flex",
            alignItems: "flex-end",
            padding: 28,
          }}
        >
          <span
            aria-hidden
            style={{
              fontFamily: display,
              fontStyle: "italic",
              fontSize: "clamp(110px, 14.0625cqw, 180px)",
              lineHeight: 0.8,
              color: "color-mix(in srgb, var(--site-accent) 18%, transparent)",
            }}
          >
            {model.initials}
          </span>
        </Portrait>
      </div>
    </section>
  );
}

function Stats({ model }: { model: SiteModel }) {
  return (
    <section
      id={ANCHORS.impact}
      aria-label="Impact"
      className="grid grid-cols-2 gap-6 @3xl:grid-cols-4"
      style={{ ...wrap, paddingTop: fluid(72, 104) }}
    >
      {model.stats.map((stat, index) => (
        <div
          key={index}
          style={{
            borderTop: "1px solid color-mix(in srgb, var(--site-ink) 12%, transparent)",
            paddingTop: 26,
          }}
        >
          <div
            style={{
              fontFamily: display,
              fontSize: fluid(40, 56),
              lineHeight: 1,
              color: "var(--site-accent)",
            }}
          >
            {stat.value}
          </div>
          <div style={{ marginTop: 12, fontSize: 14, color: "var(--site-muted)" }}>
            {stat.label}
          </div>
        </div>
      ))}
    </section>
  );
}

function Affiliations({ model }: { model: SiteModel }) {
  return (
    <section
      aria-label="Affiliations"
      style={{
        ...wrap,
        paddingTop: fluid(56, 80),
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "12px 40px",
        fontFamily: display,
        fontStyle: "italic",
        fontSize: fluid(18, 21),
        color: "color-mix(in srgb, var(--site-ink) 45%, var(--site-bg))",
        textAlign: "center",
      }}
    >
      {model.affiliations.map((name, index) => (
        <span key={index}>{name}</span>
      ))}
    </section>
  );
}

function About({ model }: { model: SiteModel }) {
  const about = model.about!;
  return (
    <section
      id={ANCHORS.about}
      aria-label="About"
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: `${sectionGap} ${fluid(20, 56)} 0`,
        textAlign: "center",
      }}
    >
      <div style={kicker}>About</div>
      <p
        style={{
          margin: "28px 0 0",
          fontFamily: display,
          fontSize: fluid(26, 38),
          lineHeight: 1.36,
          textWrap: "pretty",
        }}
      >
        <Spans
          spans={about.lead}
          emphasis={(text, key) => (
            <em key={key} style={{ color: "var(--site-accent)" }}>
              {text}
            </em>
          )}
        />
      </p>
      {about.rest.map((paragraph, index) => (
        <p
          key={index}
          style={{
            margin: "32px auto 0",
            maxWidth: 640,
            fontSize: 17,
            color: "var(--site-muted)",
          }}
        >
          {paragraph}
        </p>
      ))}
    </section>
  );
}

function Record({ model }: { model: SiteModel }) {
  return (
    <section
      id={ANCHORS.experience}
      aria-label="The record"
      style={{ ...wrap, paddingTop: sectionGap }}
    >
      <div style={{ ...kicker, marginBottom: 24 }}>The record</div>
      {model.experience.map((item, index) => (
        <div
          key={index}
          className="grid grid-cols-1 gap-3 @3xl:grid-cols-[220px_1fr_1fr] @3xl:gap-10"
          style={{
            padding: "34px 0",
            borderTop: "1px solid color-mix(in srgb, var(--site-ink) 10%, transparent)",
          }}
        >
          <div
            className="@3xl:pt-2.5"
            style={{ fontSize: 14, color: "var(--site-accent)", letterSpacing: "0.04em" }}
          >
            {item.dates}
          </div>
          <div>
            <div style={{ fontFamily: display, fontSize: fluid(26, 32), lineHeight: 1.15 }}>
              {item.role}
            </div>
            <div style={{ marginTop: 6, fontSize: 14, color: "var(--site-muted)" }}>
              {[item.organization, item.location].filter(Boolean).join(" · ")}
            </div>
          </div>
          {item.summary ? (
            <p
              className="@3xl:pt-2"
              style={{ margin: 0, fontSize: 16, color: "var(--site-muted)" }}
            >
              {item.summary}
            </p>
          ) : null}
        </div>
      ))}
    </section>
  );
}

function Work({ model }: { model: SiteModel }) {
  return (
    <section
      id={ANCHORS.work}
      aria-label="Selected work"
      className="grid grid-cols-1 gap-5 @3xl:grid-cols-2"
      style={{ ...wrap, paddingTop: sectionGap }}
    >
      {model.work.map((item, index) => {
        const body = (
          <>
            {item.kind ? (
              <span style={{ ...kicker, letterSpacing: "0.22em" }}>{item.kind}</span>
            ) : null}
            <span
              style={{
                marginTop: "auto",
                fontFamily: display,
                fontSize: fluid(25, 30),
                lineHeight: 1.2,
              }}
            >
              {item.title}
            </span>
            <span
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                fontSize: 14,
                color: "var(--site-muted)",
              }}
            >
              <span>{item.meta}</span>
              <span style={{ color: "var(--site-accent)" }}>↗</span>
            </span>
          </>
        );
        const style: CSSProperties = {
          background: "var(--site-surface)",
          border: "1px solid color-mix(in srgb, var(--site-ink) 6%, transparent)",
          padding: fluid(26, 34),
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minHeight: 220,
        };
        const hover =
          "transition-colors duration-300 hover:border-[color-mix(in_srgb,var(--site-accent)_40%,transparent)]!";
        return item.href ? (
          <ContactLink
            key={index}
            link={{ label: item.title, href: item.href }}
            className={hover}
            style={style}
          >
            {body}
          </ContactLink>
        ) : (
          <div key={index} className={hover} style={style}>
            {body}
          </div>
        );
      })}
    </section>
  );
}

function PullQuote({ model }: { model: SiteModel }) {
  const quote = model.pullQuote!;
  return (
    <section
      id={ANCHORS.testimonials}
      aria-label="Testimonial"
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: `${sectionGap} ${fluid(20, 56)} 0`,
        textAlign: "center",
      }}
    >
      <figure style={{ margin: 0 }}>
        <div
          aria-hidden
          style={{
            fontFamily: display,
            fontSize: 96,
            lineHeight: 0.6,
            color: "var(--site-accent)",
          }}
        >
          “
        </div>
        <blockquote
          style={{
            margin: "24px 0 0",
            fontFamily: display,
            fontStyle: "italic",
            fontSize: fluid(28, 42),
            lineHeight: 1.3,
            textWrap: "balance",
          }}
        >
          {quote.quote}
        </blockquote>
        <figcaption
          style={{
            marginTop: 28,
            fontSize: 13,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--site-muted)",
          }}
        >
          {quote.attribution}
        </figcaption>
      </figure>
    </section>
  );
}

function Contact({ model }: { model: SiteModel }) {
  const { contact } = model;
  return (
    <section
      id={ANCHORS.contact}
      aria-label="Private enquiries"
      style={{
        ...wrap,
        paddingTop: fluid(96, 160),
        paddingBottom: fluid(88, 128),
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 28,
      }}
    >
      <div style={kicker}>Private enquiries</div>
      <h2
        style={{
          margin: 0,
          maxWidth: 860,
          fontFamily: display,
          fontWeight: 400,
          fontSize: fluid(34, 66),
          lineHeight: 1.06,
          letterSpacing: "-0.02em",
        }}
      >
        {contact.blurb || "Get in touch."}
      </h2>
      {contact.email ? (
        <a
          href={mailto(contact.email)}
          className="transition-opacity hover:opacity-90"
          style={{
            marginTop: 10,
            padding: "18px 32px",
            borderRadius: 999,
            background: "var(--site-accent)",
            color: "var(--site-on)",
            fontWeight: 600,
            fontSize: 16,
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
            fontSize: 14,
            color: "var(--site-muted)",
          }}
        >
          {contact.links.map((link, index) => (
            <ContactLink key={index} link={link} className="hover:text-site-ink" />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function ObsidianTemplate({ model, publishedAt }: TemplateProps) {
  const nav = navItems(model, { about: "About", experience: "Record", work: "Work" });
  const renderers: Record<MiddleKind, () => ReactNode> = {
    impact: () => (
      <>
        <Stats model={model} />
        {model.affiliations.length ? <Affiliations model={model} /> : null}
      </>
    ),
    about: () => <About model={model} />,
    experience: () => <Record model={model} />,
    work: () => <Work model={model} />,
    testimonials: () => <PullQuote model={model} />,
  };

  return (
    <div id={ANCHORS.top} style={{ fontFamily: FONTS.inter, fontSize: 16, lineHeight: 1.6 }}>
      <SkipLink />
      <header
        style={{
          ...wrap,
          height: 88,
          display: "flex",
          alignItems: "center",
          gap: fluid(16, 36),
          fontSize: 14,
          color: "var(--site-muted)",
        }}
      >
        <span
          aria-hidden
          style={{
            width: 42,
            height: 42,
            flex: "none",
            border: "1px solid var(--site-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: display,
            fontSize: 16,
            color: "var(--site-accent)",
          }}
        >
          {model.initials}
        </span>
        <a
          href={`#${ANCHORS.top}`}
          style={{
            marginRight: "auto",
            fontSize: 13,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--site-ink)",
          }}
        >
          {model.name}
        </a>
        <nav aria-label="Sections" style={{ display: "flex", alignItems: "center", gap: 36 }}>
          {nav.map((item) => (
            <a key={item.href} href={item.href} className="hidden hover:text-site-ink @3xl:inline">
              {item.label}
            </a>
          ))}
          <a
            href={`#${ANCHORS.contact}`}
            className="hidden @xl:inline"
            style={{
              padding: "10px 20px",
              border: "1px solid var(--site-accent)",
              borderRadius: 999,
              color: "var(--site-accent)",
              whiteSpace: "nowrap",
            }}
          >
            Private enquiries
          </a>
        </nav>
      </header>
      <main id="main">
        <Hero model={model} />
        {!model.order.includes("impact") && model.affiliations.length ? (
          <Affiliations model={model} />
        ) : null}
        {model.order.map((kind) => (
          <div key={kind} style={{ display: "contents" }}>
            {renderers[kind]()}
          </div>
        ))}
        <Contact model={model} />
      </main>
      <footer
        style={{
          ...wrap,
          paddingBlock: "28px 40px",
          borderTop: "1px solid color-mix(in srgb, var(--site-ink) 8%, transparent)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 12,
          fontSize: 13,
          color: "color-mix(in srgb, var(--site-ink) 45%, var(--site-bg))",
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
