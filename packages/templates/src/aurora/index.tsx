import type { CSSProperties, ReactNode } from "react";
import { fluid, FONTS } from "../fonts";
import type { MiddleKind, SiteModel } from "../model";
import {
  ANCHORS,
  ContactLink,
  CtaLink,
  loop,
  mailto,
  navItems,
  Portrait,
  SkipLink,
  Spans,
} from "../shared";
import type { TemplateProps } from "../types";

// T2 Aurora: soft light, rounded cards and a floating profile. For founders and tech leaders.

const wrap: CSSProperties = {
  maxWidth: 1120,
  margin: "0 auto",
  paddingInline: fluid(20, 40),
};
const hairline = "1px solid color-mix(in srgb, var(--site-ink) 6%, transparent)";
const sectionGap = fluid(72, 128);
const pink = "color-mix(in srgb, var(--site-accent) 55%, #ec4899)";
/** The accent nudged towards violet, like the design's indigo-to-violet card. */
const violet = "oklch(from var(--site-accent) calc(l + 0.03) c calc(h + 16))";

/** Fixed pastel tints, softened on dark grounds through --site-pastel. */
function pastel(from: string, to: string): string {
  const tint = (color: string) =>
    `color-mix(in srgb, ${color} var(--site-pastel), var(--site-surface))`;
  return `linear-gradient(135deg, ${tint(from)}, ${tint(to)})`;
}

const WORK_TINTS = [
  pastel("#e0e7ff", "#fce7f3"),
  pastel("#dcfce7", "#e0f2fe"),
  pastel("#fef3c7", "#fde2e4"),
  pastel("#ede9fe", "#dbeafe"),
];

const STAT_CARDS: CSSProperties[] = [
  {
    backgroundColor: "var(--site-accent)",
    backgroundImage: `linear-gradient(145deg, var(--site-accent), ${violet})`,
    color: "var(--site-on)",
  },
  { background: "var(--site-surface)", color: "var(--site-ink)" },
  { background: "var(--site-surface)", color: "var(--site-ink)" },
  {
    background: `linear-gradient(145deg, color-mix(in srgb, #fdf2f8 var(--site-pastel), var(--site-surface)), color-mix(in srgb, #eef2ff var(--site-pastel), var(--site-surface)))`,
    color: "var(--site-ink)",
  },
];

function Pill({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        padding: "6px 14px",
        borderRadius: 999,
        background: "var(--site-accent-soft)",
        color: "var(--site-accent)",
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      {children}
    </span>
  );
}

function Split({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      id={id}
      aria-label={title}
      className="grid grid-cols-1 gap-6 @3xl:grid-cols-[4fr_8fr] @3xl:gap-14"
      style={{ ...wrap, paddingTop: sectionGap }}
    >
      <div>
        <Pill>{title}</Pill>
      </div>
      <div>{children}</div>
    </section>
  );
}

function Blobs() {
  const blob = (style: CSSProperties, className: string, seconds: number) => (
    <div
      className={className}
      style={
        {
          position: "absolute",
          borderRadius: "50%",
          "--pt-duration": `${seconds}s`,
          ...style,
        } as CSSProperties
      }
    />
  );
  return (
    <div
      aria-hidden
      style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}
    >
      {blob(
        {
          width: 620,
          height: 620,
          left: -120,
          top: -180,
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--site-accent) 22%, var(--site-bg)), transparent 65%)",
        },
        "pt-float",
        14,
      )}
      {blob(
        {
          width: 560,
          height: 560,
          right: -100,
          top: -120,
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--site-accent) 10%, #ffe0ec), transparent 65%)",
        },
        "pt-float-reverse",
        17,
      )}
      {blob(
        {
          width: 640,
          height: 640,
          left: "34%",
          top: 180,
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--site-accent) 12%, var(--site-bg)), transparent 65%)",
        },
        "pt-float",
        20,
      )}
    </div>
  );
}

function Hero({ model }: { model: SiteModel }) {
  const { hero } = model;
  const position = [model.role, model.company].filter(Boolean).join(" · ");
  return (
    <section
      style={{
        position: "relative",
        maxWidth: 1000,
        margin: "0 auto",
        padding: `${fluid(56, 104)} ${fluid(20, 40)} 0`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 26,
      }}
    >
      {model.availability ? (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "7px 16px 7px 12px",
            borderRadius: 999,
            background: "var(--site-surface)",
            border: "1px solid color-mix(in srgb, var(--site-ink) 8%, transparent)",
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 4px 14px color-mix(in srgb, var(--site-ink) 4%, transparent)",
          }}
        >
          <span
            aria-hidden
            className="pt-ping"
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#22c55e",
              flex: "none",
            }}
          />
          {model.availability}
        </span>
      ) : null}
      <h1
        style={{
          margin: 0,
          fontFamily: FONTS.manrope,
          fontWeight: 800,
          fontSize: fluid(40, 76),
          lineHeight: 1.02,
          letterSpacing: "-0.045em",
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
            fontSize: fluid(17, 19),
            color: "var(--site-muted)",
            textWrap: "pretty",
          }}
        >
          {hero.subheadline}
        </p>
      ) : null}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 12,
          marginTop: 6,
        }}
      >
        {hero.cta ? (
          <CtaLink
            link={hero.cta}
            className="transition-transform hover:-translate-y-0.5"
            style={{
              padding: "15px 24px",
              borderRadius: 999,
              background: "var(--site-ink)",
              color: "var(--site-bg)",
              fontWeight: 700,
              boxShadow: "0 10px 24px color-mix(in srgb, var(--site-ink) 20%, transparent)",
            }}
          >
            {hero.cta.label} →
          </CtaLink>
        ) : null}
        {model.order.includes("experience") ? (
          <a
            href={`#${ANCHORS.experience}`}
            className="transition-transform hover:-translate-y-0.5"
            style={{
              padding: "15px 24px",
              borderRadius: 999,
              background: "var(--site-surface)",
              border: "1px solid color-mix(in srgb, var(--site-ink) 8%, transparent)",
              fontWeight: 700,
            }}
          >
            View experience
          </a>
        ) : null}
      </div>
      <div
        style={{
          marginTop: 40,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "14px 22px 14px 14px",
          borderRadius: 24,
          background: "color-mix(in srgb, var(--site-surface) 90%, transparent)",
          border: hairline,
          boxShadow: "0 20px 50px color-mix(in srgb, var(--site-ink) 10%, transparent)",
          textAlign: "left",
          maxWidth: "100%",
        }}
      >
        <Portrait
          image={hero.image}
          style={{
            width: 60,
            height: 60,
            flex: "none",
            borderRadius: "50%",
            background: `linear-gradient(135deg, var(--site-accent), ${pink})`,
            color: "var(--site-on)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 20,
          }}
        >
          {model.initials}
        </Portrait>
        <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span style={{ fontWeight: 800, fontSize: 17 }}>{model.name}</span>
          {position ? (
            <span style={{ fontSize: 14, color: "var(--site-muted)" }}>{position}</span>
          ) : null}
        </span>
        {model.location ? (
          <>
            <span
              aria-hidden
              className="hidden @xl:block"
              style={{
                width: 1,
                height: 40,
                background: "color-mix(in srgb, var(--site-ink) 8%, transparent)",
                margin: "0 8px",
                flex: "none",
              }}
            />
            <span
              className="hidden @xl:flex"
              style={{ flexDirection: "column", fontSize: 13, color: "var(--site-muted)" }}
            >
              <span style={{ fontWeight: 700, color: "var(--site-ink)", fontSize: 15 }}>
                {model.location}
              </span>
              Based in
            </span>
          </>
        ) : null}
      </div>
    </section>
  );
}

function Marquee({ items }: { items: string[] }) {
  // Each half of the track must be wider than the screen for a seamless -50% loop.
  const copies = Math.max(1, Math.ceil(8 / items.length));
  return (
    <div
      aria-label="Affiliations"
      role="group"
      style={{
        position: "relative",
        marginTop: fluid(56, 80),
        overflow: "hidden",
        WebkitMaskImage: "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)",
        maskImage: "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)",
      }}
    >
      <div
        className="pt-marquee"
        style={{ display: "flex", width: "max-content", "--pt-duration": "40s" } as CSSProperties}
      >
        {loop(items, copies * 2).map((item, index) => (
          <span
            key={index}
            aria-hidden={index >= items.length}
            style={{
              padding: "0 30px",
              fontWeight: 700,
              fontSize: 20,
              color: "color-mix(in srgb, var(--site-ink) 40%, var(--site-bg))",
              whiteSpace: "nowrap",
              letterSpacing: "-0.01em",
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function Stats({ model }: { model: SiteModel }) {
  return (
    <section
      id={ANCHORS.impact}
      aria-label="Impact"
      className="grid grid-cols-2 gap-4 @5xl:grid-cols-4"
      style={{ ...wrap, paddingTop: sectionGap }}
    >
      {model.stats.map((stat, index) => (
        <div
          key={index}
          style={{
            minHeight: fluid(170, 210),
            borderRadius: 28,
            padding: 26,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 20,
            border: "1px solid color-mix(in srgb, var(--site-ink) 5%, transparent)",
            boxShadow: "0 1px 0 color-mix(in srgb, var(--site-ink) 4%, transparent)",
            ...STAT_CARDS[index % STAT_CARDS.length],
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.7 }}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            <div
              style={{
                fontWeight: 800,
                fontSize: fluid(38, 52),
                lineHeight: 1,
                letterSpacing: "-0.045em",
              }}
            >
              {stat.value}
            </div>
            <div style={{ marginTop: 10, fontSize: 14, opacity: 0.8 }}>{stat.label}</div>
          </div>
        </div>
      ))}
    </section>
  );
}

function About({ model }: { model: SiteModel }) {
  const about = model.about!;
  return (
    <Split id={ANCHORS.about} title="About">
      <p
        style={{
          margin: 0,
          fontWeight: 700,
          fontSize: fluid(23, 30),
          lineHeight: 1.35,
          letterSpacing: "-0.025em",
          textWrap: "pretty",
        }}
      >
        <Spans
          spans={about.lead}
          emphasis={(text, key) => (
            <span
              key={key}
              style={{
                background: `linear-gradient(90deg, var(--site-accent), ${pink})`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {text}
            </span>
          )}
        />
      </p>
      {about.rest.map((paragraph, index) => (
        <p
          key={index}
          style={{ margin: "24px 0 0", maxWidth: 640, fontSize: 17, color: "var(--site-muted)" }}
        >
          {paragraph}
        </p>
      ))}
    </Split>
  );
}

function Experience({ model }: { model: SiteModel }) {
  return (
    <Split id={ANCHORS.experience} title="Experience">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {model.experience.map((item, index) => (
          <div
            key={index}
            className="grid grid-cols-1 gap-3 transition-shadow duration-300 hover:shadow-[0_18px_40px_color-mix(in_srgb,var(--site-ink)_8%,transparent)]! @xl:grid-cols-[160px_1fr] @xl:gap-6"
            style={{
              borderRadius: 24,
              background: "var(--site-surface)",
              border: hairline,
              padding: "26px 28px",
              boxShadow: "0 1px 0 color-mix(in srgb, var(--site-ink) 4%, transparent)",
            }}
          >
            {item.dates ? (
              <span
                style={{
                  alignSelf: "start",
                  justifySelf: "start",
                  padding: "5px 12px",
                  borderRadius: 999,
                  background: "var(--site-soft)",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--site-muted)",
                }}
              >
                {item.dates}
              </span>
            ) : (
              <span className="hidden @xl:block" />
            )}
            <div>
              <div style={{ fontWeight: 800, fontSize: 21, letterSpacing: "-0.02em" }}>
                {item.role}
              </div>
              <div style={{ fontSize: 14, color: "var(--site-muted)" }}>
                {[item.organization, item.location].filter(Boolean).join(" · ")}
              </div>
              {item.summary ? (
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: 15,
                    color: "color-mix(in srgb, var(--site-ink) 85%, var(--site-bg))",
                  }}
                >
                  {item.summary}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Split>
  );
}

function Work({ model }: { model: SiteModel }) {
  return (
    <section
      id={ANCHORS.work}
      aria-label="Selected work"
      style={{ ...wrap, paddingTop: sectionGap }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 12,
          marginBottom: 28,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: FONTS.manrope,
            fontWeight: 800,
            fontSize: fluid(32, 44),
            lineHeight: 1.12,
            letterSpacing: "-0.04em",
          }}
        >
          Selected work
        </h2>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--site-accent)" }}>
          Talks, writing and boards
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @5xl:grid-cols-4">
        {model.work.map((item, index) => {
          const card = (
            <>
              <div style={{ height: 150, background: WORK_TINTS[index % 4], padding: 16 }}>
                {item.kind ? (
                  <span
                    style={{
                      display: "inline-flex",
                      padding: "5px 12px",
                      borderRadius: 999,
                      background: "color-mix(in srgb, var(--site-surface) 80%, transparent)",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {item.kind}
                  </span>
                ) : null}
              </div>
              <div
                style={{
                  padding: "18px 20px 22px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 17,
                    lineHeight: 1.3,
                    letterSpacing: "-0.015em",
                  }}
                >
                  {item.title}
                </span>
                {item.meta ? (
                  <span style={{ fontSize: 13, color: "var(--site-muted)" }}>{item.meta}</span>
                ) : null}
              </div>
            </>
          );
          const cardStyle: CSSProperties = {
            borderRadius: 24,
            background: "var(--site-surface)",
            border: hairline,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          };
          const hover =
            "transition-shadow duration-300 hover:shadow-[0_18px_40px_color-mix(in_srgb,var(--site-ink)_8%,transparent)]";
          return item.href ? (
            <ContactLink
              key={index}
              link={{ label: item.title, href: item.href }}
              className={hover}
              style={cardStyle}
            >
              {card}
            </ContactLink>
          ) : (
            <div key={index} className={hover} style={cardStyle}>
              {card}
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
      className="grid grid-cols-1 gap-4 @3xl:grid-cols-2"
      style={{ ...wrap, paddingTop: sectionGap }}
    >
      {model.testimonials.map((item, index) => (
        <figure
          key={index}
          style={{
            margin: 0,
            borderRadius: 28,
            background: "var(--site-surface)",
            border: hairline,
            padding: 32,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 28,
          }}
        >
          <blockquote
            style={{
              margin: 0,
              fontWeight: 600,
              fontSize: fluid(19, 21),
              lineHeight: 1.45,
              letterSpacing: "-0.015em",
            }}
          >
            “{item.quote}”
          </blockquote>
          <figcaption
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "color-mix(in srgb, var(--site-ink) 55%, transparent)",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 42,
                height: 42,
                flex: "none",
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, color-mix(in srgb, var(--site-accent) 30%, var(--site-bg)), color-mix(in srgb, var(--site-accent) 18%, #fbcfe8))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 14,
                color: "var(--site-accent-deep)",
              }}
            >
              {item.initials}
            </span>
            <span style={{ display: "flex", flexDirection: "column", fontSize: 14 }}>
              <span style={{ fontWeight: 800 }}>{item.author}</span>
              {item.role ? <span style={{ color: "var(--site-muted)" }}>{item.role}</span> : null}
            </span>
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
      aria-label="Contact"
      style={{ ...wrap, paddingTop: sectionGap, paddingBottom: 64 }}
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: fluid(28, 36),
          padding: `${fluid(40, 80)} ${fluid(24, 64)}`,
          backgroundColor: "var(--site-accent)",
          backgroundImage: `linear-gradient(135deg, var(--site-accent-deep), var(--site-accent) 55%, color-mix(in srgb, var(--site-accent) 75%, ${pink}))`,
          color: "var(--site-on)",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            width: 520,
            height: 520,
            right: -140,
            top: -200,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--site-accent) 40%, transparent), transparent 65%)",
          }}
        />
        <h2
          style={{
            position: "relative",
            margin: 0,
            maxWidth: 720,
            fontFamily: FONTS.manrope,
            fontWeight: 800,
            fontSize: fluid(32, 56),
            lineHeight: 1.04,
            letterSpacing: "-0.045em",
          }}
        >
          {contact.blurb || "Get in touch."}
        </h2>
        <div
          style={{
            position: "relative",
            marginTop: 32,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {contact.email ? (
            <a
              href={mailto(contact.email)}
              style={{
                padding: "15px 24px",
                borderRadius: 999,
                background: "var(--site-on)",
                color: "var(--site-accent-deep)",
                fontWeight: 800,
                overflowWrap: "anywhere",
              }}
            >
              {contact.email}
            </a>
          ) : null}
          {contact.links.map((link, index) => (
            <ContactLink
              key={index}
              link={link}
              style={{
                padding: "15px 24px",
                borderRadius: 999,
                border: "1px solid color-mix(in srgb, var(--site-on) 35%, transparent)",
                fontWeight: 700,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function AuroraTemplate({ model, publishedAt }: TemplateProps) {
  const nav = navItems(model, { about: "About", experience: "Experience", work: "Work" });
  const renderers: Record<MiddleKind, () => ReactNode> = {
    impact: () => <Stats model={model} />,
    about: () => <About model={model} />,
    experience: () => <Experience model={model} />,
    work: () => <Work model={model} />,
    testimonials: () => <Testimonials model={model} />,
  };

  return (
    <div
      id={ANCHORS.top}
      style={{
        position: "relative",
        fontFamily: FONTS.manrope,
        fontSize: 16,
        lineHeight: 1.6,
        overflow: "hidden",
      }}
    >
      <SkipLink />
      <Blobs />
      <header
        style={{
          position: "relative",
          padding: `24px ${fluid(16, 40)} 0`,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            padding: "8px 8px 8px 22px",
            borderRadius: 999,
            background: "color-mix(in srgb, var(--site-surface) 80%, transparent)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: hairline,
            boxShadow: "0 10px 30px color-mix(in srgb, var(--site-ink) 5%, transparent)",
            fontSize: 14,
            color: "var(--site-muted)",
          }}
        >
          <a
            href={`#${ANCHORS.top}`}
            style={{ fontWeight: 800, color: "var(--site-ink)", fontSize: 15, marginRight: 12 }}
          >
            {model.name}
          </a>
          <nav aria-label="Sections" style={{ display: "contents" }}>
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="hidden hover:text-site-ink @3xl:inline"
              >
                {item.label}
              </a>
            ))}
            <a
              href={`#${ANCHORS.contact}`}
              style={{
                padding: "10px 18px",
                borderRadius: 999,
                background: "var(--site-ink)",
                color: "var(--site-bg)",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              Get in touch
            </a>
          </nav>
        </div>
      </header>
      {/* Positioned, so it paints above the background blobs. */}
      <main id="main" style={{ position: "relative" }}>
        <Hero model={model} />
        {model.affiliations.length ? <Marquee items={model.affiliations} /> : null}
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
          position: "relative",
          paddingBottom: 40,
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
        <span>{model.location}</span>
      </footer>
    </div>
  );
}
