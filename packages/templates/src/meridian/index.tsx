import type { CSSProperties, ReactNode } from "react";
import { fluid, FONTS } from "../fonts";
import type { MiddleKind, SiteModel } from "../model";
import {
  ANCHORS,
  ContactLink,
  CtaLink,
  editable,
  mailto,
  navItems,
  Portrait,
  sectionNumbers,
  SkipLink,
  Spans,
} from "../shared";
import type { TemplateProps } from "../types";

// T1 Meridian: editorial ivory and a serif voice. For chief executives and chairs.

const serif = FONTS.newsreader;
const wrap: CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  paddingInline: fluid(20, 56),
};
const label: CSSProperties = {
  fontSize: 13,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--site-accent)",
};
const sectionGap = fluid(72, 128);

const LABELS: Record<MiddleKind | "contact", string> = {
  impact: "Impact",
  about: "About",
  experience: "Experience",
  work: "Selected work",
  testimonials: "In their words",
  contact: "Contact",
};

function Numbered({
  id,
  number,
  title,
  children,
  style,
}: {
  id: string;
  number: string | undefined;
  title: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section
      id={id}
      aria-label={title}
      className="grid grid-cols-1 gap-4 @3xl:grid-cols-[3fr_9fr] @3xl:gap-12"
      style={{ ...wrap, paddingTop: sectionGap, ...style }}
    >
      <div style={label}>{number ? `${number} — ${title}` : title}</div>
      <div>{children}</div>
    </section>
  );
}

function Hero({ model }: { model: SiteModel }) {
  const { hero } = model;
  return (
    <section
      className="grid grid-cols-1 items-end gap-12 @3xl:grid-cols-[7fr_5fr] @3xl:gap-[72px]"
      style={{ ...wrap, paddingTop: fluid(32, 56) }}
    >
      <div>
        {hero.eyebrow ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--site-accent)",
            }}
          >
            <span
              aria-hidden
              style={{ width: 32, height: 1, background: "var(--site-accent)", flex: "none" }}
            />
            <span {...editable(model, hero.fields.eyebrow)}>{hero.eyebrow}</span>
          </div>
        ) : null}
        <h1
          {...editable(model, hero.fields.headline)}
          style={{
            margin: "28px 0 0",
            fontFamily: serif,
            fontWeight: 400,
            fontSize: fluid(44, 84),
            lineHeight: 1.02,
            letterSpacing: "-0.025em",
            textWrap: "balance",
          }}
        >
          {hero.headline}
        </h1>
        {hero.subheadline ? (
          <p
            {...editable(model, hero.fields.subheadline)}
            style={{
              margin: "32px 0 0",
              maxWidth: 560,
              fontSize: fluid(17, 19),
              lineHeight: 1.6,
              color: "var(--site-muted)",
              textWrap: "pretty",
            }}
          >
            {hero.subheadline}
          </p>
        ) : null}
        <div
          style={{
            marginTop: 40,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 28,
            fontSize: 15,
          }}
        >
          {hero.cta ? (
            <CtaLink
              link={hero.cta}
              className="transition-opacity hover:opacity-85"
              style={{
                padding: "16px 26px",
                background: "var(--site-ink)",
                color: "var(--site-bg)",
                borderRadius: 2,
              }}
            >
              <span {...editable(model, hero.fields.cta)}>{hero.cta.label}</span>
            </CtaLink>
          ) : null}
          {model.about ? (
            <a
              href={`#${ANCHORS.about}`}
              style={{ borderBottom: "1px solid var(--site-ink)", paddingBottom: 3 }}
            >
              Read the profile
            </a>
          ) : null}
        </div>
      </div>
      <div className="mx-auto w-full max-w-[420px] @3xl:max-w-none">
        <Portrait
          image={hero.image}
          style={{
            aspectRatio: "4 / 5",
            background:
              "linear-gradient(165deg, color-mix(in srgb, var(--site-accent) 22%, var(--site-bg)), color-mix(in srgb, var(--site-accent) 45%, var(--site-bg)))",
          }}
        >
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: 28,
              bottom: 10,
              fontFamily: serif,
              fontSize: "clamp(120px, 15.625cqw, 200px)",
              lineHeight: 1,
              color: "var(--site-bg)",
              opacity: 0.55,
              letterSpacing: "-0.04em",
            }}
          >
            {model.initials}
          </span>
        </Portrait>
        <div
          style={{
            marginTop: 14,
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            fontSize: 13,
            color: "var(--site-muted)",
          }}
        >
          <span
            {...editable(model, model.fields.name)}
            style={{ fontFamily: serif, fontStyle: "italic", fontSize: 15 }}
          >
            {model.name}
          </span>
          <span {...editable(model, model.fields.location)}>{model.location}</span>
        </div>
      </div>
    </section>
  );
}

function Stats({ model }: { model: SiteModel }) {
  return (
    <section id={ANCHORS.impact} aria-label="Impact" style={{ ...wrap, paddingTop: fluid(64, 88) }}>
      <div
        className="grid grid-cols-2 gap-x-6 gap-y-2 @3xl:grid-cols-4 @3xl:gap-10"
        style={{ borderTop: "1px solid var(--site-ink)" }}
      >
        {model.stats.map((stat, index) => (
          <div key={index} style={{ paddingTop: 28 }}>
            <div
              {...editable(model, stat.fields.value)}
              style={{
                fontFamily: serif,
                fontSize: fluid(40, 60),
                lineHeight: 1,
                letterSpacing: "-0.03em",
              }}
            >
              {stat.value}
            </div>
            <div
              {...editable(model, stat.fields.label)}
              style={{ marginTop: 12, fontSize: 14, color: "var(--site-muted)", maxWidth: 200 }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Affiliations({ model }: { model: SiteModel }) {
  return (
    <section
      aria-label="Boards and affiliations"
      style={{
        ...wrap,
        paddingTop: fluid(48, 72),
        display: "flex",
        flexWrap: "wrap",
        alignItems: "baseline",
        gap: "10px 22px",
      }}
    >
      <span
        style={{
          fontSize: 12,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--site-accent)",
          marginRight: 12,
        }}
      >
        Boards &amp; affiliations
      </span>
      {model.affiliations.map((name, index) => (
        <span key={index} style={{ display: "contents" }}>
          <span
            {...editable(model, model.fields.affiliations[index]!)}
            style={{
              fontFamily: serif,
              fontStyle: "italic",
              fontSize: fluid(19, 22),
              color: "var(--site-muted)",
            }}
          >
            {name}
          </span>
          <span
            aria-hidden
            style={{ color: "color-mix(in srgb, var(--site-accent) 45%, var(--site-bg))" }}
          >
            ·
          </span>
        </span>
      ))}
    </section>
  );
}

function About({ model, number }: { model: SiteModel; number?: string }) {
  const about = model.about!;
  return (
    <Numbered id={ANCHORS.about} number={number} title={LABELS.about}>
      <p
        {...editable(model, about.fields.lead)}
        style={{
          margin: 0,
          fontFamily: serif,
          fontSize: fluid(26, 36),
          lineHeight: 1.32,
          letterSpacing: "-0.01em",
          textWrap: "pretty",
        }}
      >
        <Spans spans={about.lead} emphasis={(text, key) => <em key={key}>{text}</em>} />
      </p>
      {about.rest.map((paragraph, index) => (
        <p
          key={index}
          {...editable(model, paragraph.field)}
          style={{
            margin: "32px 0 0",
            maxWidth: 640,
            fontSize: 17,
            lineHeight: 1.7,
            color: "var(--site-muted)",
          }}
        >
          {paragraph.text}
        </p>
      ))}
    </Numbered>
  );
}

function Experience({ model, number }: { model: SiteModel; number?: string }) {
  return (
    <Numbered id={ANCHORS.experience} number={number} title={LABELS.experience}>
      {model.experience.map((item, index) => (
        <div
          key={index}
          className="grid grid-cols-1 gap-2 @3xl:grid-cols-[170px_1fr] @3xl:gap-8"
          style={{ padding: "30px 0", borderTop: "1px solid var(--site-line)" }}
        >
          <div
            className="@3xl:pt-2"
            style={{
              fontSize: 14,
              color: "var(--site-muted)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {item.dates}
          </div>
          <div>
            <div
              {...editable(model, item.fields.role)}
              style={{ fontFamily: serif, fontSize: fluid(24, 30), lineHeight: 1.15 }}
            >
              {item.role}
            </div>
            <div style={{ marginTop: 6, fontSize: 15, color: "var(--site-muted)" }}>
              <span {...editable(model, item.fields.organization)}>{item.organization}</span>
              {item.location ? (
                <>
                  {" · "}
                  <span {...editable(model, item.fields.location)}>{item.location}</span>
                </>
              ) : null}
            </div>
            {item.summary ? (
              <p
                {...editable(model, item.fields.summary)}
                style={{
                  margin: "14px 0 0",
                  maxWidth: 600,
                  fontSize: 16,
                  lineHeight: 1.65,
                  color: "color-mix(in srgb, var(--site-ink) 85%, var(--site-bg))",
                }}
              >
                {item.summary}
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </Numbered>
  );
}

function Work({ model, number }: { model: SiteModel; number?: string }) {
  return (
    <Numbered id={ANCHORS.work} number={number} title={LABELS.work}>
      <div className="grid grid-cols-1 gap-x-16 gap-y-10 @3xl:grid-cols-2 @3xl:gap-y-12">
        {model.work.map((item, index) => {
          const title = (
            <span style={{ fontFamily: serif, fontSize: fluid(23, 27), lineHeight: 1.2 }}>
              <span {...editable(model, item.fields.title)}>{item.title}</span>{" "}
              <span style={{ color: "var(--site-accent)" }}>↗</span>
            </span>
          );
          return (
            <div
              key={index}
              style={{
                borderTop: "1px solid var(--site-line)",
                paddingTop: 22,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {item.kind ? (
                <span
                  {...editable(model, item.fields.kind)}
                  style={{
                    fontSize: 12,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--site-accent)",
                  }}
                >
                  {item.kind}
                </span>
              ) : null}
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
              {item.meta ? (
                <span
                  {...editable(model, item.fields.meta)}
                  style={{ fontSize: 14, color: "var(--site-muted)" }}
                >
                  {item.meta}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </Numbered>
  );
}

function Testimonials({ model, number }: { model: SiteModel; number?: string }) {
  return (
    <section
      id={ANCHORS.testimonials}
      aria-label={LABELS.testimonials}
      style={{ marginTop: sectionGap, background: "var(--site-soft)" }}
    >
      <div
        className="grid grid-cols-1 gap-4 @3xl:grid-cols-[3fr_9fr] @3xl:gap-12"
        style={{ ...wrap, paddingBlock: fluid(72, 112) }}
      >
        <div style={label}>
          {number ? `${number} — ${LABELS.testimonials}` : LABELS.testimonials}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 56 }}>
          {model.testimonials.map((item, index) => (
            <figure key={index} style={{ margin: 0, maxWidth: 820 }}>
              <blockquote
                style={{
                  margin: 0,
                  fontFamily: serif,
                  fontStyle: "italic",
                  fontSize: fluid(24, 36),
                  lineHeight: 1.3,
                  letterSpacing: "-0.01em",
                  textWrap: "pretty",
                }}
              >
                “<span {...editable(model, item.fields.quote)}>{item.quote}</span>”
              </blockquote>
              <figcaption
                style={{
                  marginTop: 20,
                  fontSize: 14,
                  color: "color-mix(in srgb, var(--site-ink) 55%, transparent)",
                }}
              >
                <span {...editable(model, item.fields.author)} style={{ fontWeight: 500 }}>
                  {item.author}
                </span>
                {item.role ? (
                  <span style={{ color: "var(--site-muted)" }}>
                    {" — "}
                    <span {...editable(model, item.fields.role)}>{item.role}</span>
                  </span>
                ) : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact({ model, number }: { model: SiteModel; number?: string }) {
  const { contact } = model;
  return (
    <Numbered
      id={ANCHORS.contact}
      number={number}
      title={LABELS.contact}
      style={{ paddingBottom: fluid(80, 112) }}
    >
      <h2
        {...editable(model, contact.fields.blurb)}
        style={{
          margin: 0,
          fontFamily: serif,
          fontWeight: 400,
          fontSize: fluid(34, 68),
          lineHeight: 1.04,
          letterSpacing: "-0.025em",
          maxWidth: 820,
        }}
      >
        {contact.blurb || "Get in touch."}
      </h2>
      {contact.email ? (
        <div style={{ marginTop: 36, fontFamily: serif, fontSize: fluid(20, 30) }}>
          <a
            href={mailto(contact.email)}
            style={{
              textDecoration: "underline",
              textDecorationThickness: 1,
              textUnderlineOffset: 8,
              overflowWrap: "anywhere",
            }}
          >
            {contact.email}
          </a>
        </div>
      ) : null}
      {contact.links.length ? (
        <div
          style={{
            marginTop: 28,
            display: "flex",
            flexWrap: "wrap",
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
    </Numbered>
  );
}

export function MeridianTemplate({ model, publishedAt }: TemplateProps) {
  const numbers = sectionNumbers(model, ["about", "experience", "work", "testimonials", "contact"]);
  const nav = navItems(model, { about: "About", experience: "Experience", work: "Selected work" });
  const renderers: Record<MiddleKind, () => ReactNode> = {
    impact: () => (
      <>
        <Stats model={model} />
        {model.affiliations.length ? <Affiliations model={model} /> : null}
      </>
    ),
    about: () => <About model={model} number={numbers.about} />,
    experience: () => <Experience model={model} number={numbers.experience} />,
    work: () => <Work model={model} number={numbers.work} />,
    testimonials: () => <Testimonials model={model} number={numbers.testimonials} />,
  };

  return (
    <div
      id={ANCHORS.top}
      style={{ fontFamily: FONTS.inter, fontSize: 16, lineHeight: 1.55, minHeight: "inherit" }}
    >
      <SkipLink />
      <header
        style={{
          ...wrap,
          height: 84,
          display: "flex",
          alignItems: "center",
          gap: 36,
          fontSize: 14,
          color: "var(--site-muted)",
        }}
      >
        <a
          href={`#${ANCHORS.top}`}
          style={{
            marginRight: "auto",
            fontFamily: serif,
            fontSize: 22,
            fontWeight: 500,
            color: "var(--site-ink)",
            letterSpacing: "-0.01em",
          }}
        >
          <span {...editable(model, model.fields.name)}>{model.name}</span>
        </a>
        <nav aria-label="Sections" style={{ display: "flex", alignItems: "center", gap: 36 }}>
          {nav.map((item) => (
            <a key={item.href} href={item.href} className="hidden hover:text-site-ink @3xl:inline">
              {item.label}
            </a>
          ))}
          <a
            href={`#${ANCHORS.contact}`}
            style={{
              color: "var(--site-ink)",
              textDecoration: "underline",
              textUnderlineOffset: 5,
            }}
          >
            Contact
          </a>
        </nav>
      </header>
      <main id="main">
        <Hero model={model} />
        {model.order.includes("impact") ? null : model.affiliations.length ? (
          <Affiliations model={model} />
        ) : null}
        {model.order.map((kind) => (
          <div key={kind} style={{ display: "contents" }}>
            {renderers[kind]()}
          </div>
        ))}
        <Contact model={model} number={numbers.contact} />
      </main>
      <footer
        style={{
          ...wrap,
          paddingBlock: "28px 40px",
          borderTop: "1px solid var(--site-line)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 12,
          fontSize: 13,
          color: "var(--site-muted)",
        }}
      >
        <span>
          © {publishedAt.getUTCFullYear()} {model.name}
        </span>
        <span {...editable(model, model.fields.location)}>{model.location}</span>
      </footer>
    </div>
  );
}
