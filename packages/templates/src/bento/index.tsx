import type { CSSProperties, ReactNode } from "react";
import { fluid, FONTS } from "../fonts";
import type { SiteModel } from "../model";
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

// T5 Bento: the whole profile in a single grid of cards. Scans in seconds.
// Unlike the other templates it packs everything into one grid in a fixed order.

const card: CSSProperties = {
  borderRadius: 28,
  background: "var(--site-surface)",
};
const cardLabel: CSSProperties = { fontSize: 13, fontWeight: 700, color: "var(--site-muted)" };
const faintRule = "1px solid color-mix(in srgb, var(--site-ink) 5%, transparent)";
const lift =
  "transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(.2,.7,.2,1)] hover:-translate-y-[3px] hover:shadow-[0_16px_32px_#0000000f]";

// Static class strings so Tailwind can see them. Phone: one column; tablet: two; desktop: four.
const SPAN4: Record<number, string> = {
  1: "@5xl:col-span-1",
  2: "@5xl:col-span-2",
  3: "@5xl:col-span-3",
  4: "@5xl:col-span-4",
};
const SPAN2: Record<number, string> = { 1: "@xl:col-span-1", 2: "@xl:col-span-2" };

function spanClass(desktop: number, tablet = Math.min(desktop, 2)): string {
  return `${SPAN2[tablet]} ${SPAN4[desktop]}`;
}

/** Column spans that fill whole rows: 3 items in the last row of 4 become [2, 1, 1]. */
function rowFill(count: number, columns: number): number[] {
  const spans = Array<number>(count).fill(1);
  const remainder = count % columns;
  if (remainder === 0) return spans;
  const start = count - remainder;
  const extra = columns - remainder;
  for (let index = 0; index < extra; index += 1) {
    spans[start + (index % remainder)]! += 1;
  }
  return spans;
}

function Tiles<T>({
  items,
  render,
}: {
  items: T[];
  render: (item: T, index: number, className: string) => ReactNode;
}) {
  const desktop = rowFill(items.length, 4);
  const tablet = rowFill(items.length, 2);
  return (
    <>
      {items.map((item, index) => render(item, index, spanClass(desktop[index]!, tablet[index]!)))}
    </>
  );
}

function PortraitCard({ model, className }: { model: SiteModel; className: string }) {
  return (
    <Portrait
      image={model.hero.image}
      className={className}
      style={{
        ...card,
        minHeight: 300,
        background:
          "linear-gradient(160deg, var(--site-accent-deep), color-mix(in srgb, var(--site-accent) 30%, #000))",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: 24,
      }}
    >
      {model.hero.image ? (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            background: "linear-gradient(180deg, transparent 45%, rgba(0, 0, 0, 0.55))",
          }}
        />
      ) : (
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 12,
            right: 18,
            fontWeight: 800,
            fontSize: 110,
            lineHeight: 1,
            letterSpacing: "-0.06em",
          }}
        >
          {model.initials}
        </span>
      )}
      <span
        style={{
          position: "relative",
          zIndex: 2,
          fontWeight: 800,
          fontSize: 22,
          letterSpacing: "-0.02em",
        }}
      >
        {model.name}
      </span>
      {model.role ? (
        <span style={{ position: "relative", zIndex: 2, fontSize: 14 }}>{model.role}</span>
      ) : null}
    </Portrait>
  );
}

function HeroCard({ model, className }: { model: SiteModel; className: string }) {
  const { hero } = model;
  return (
    <div
      className={className}
      style={{
        ...card,
        padding: fluid(26, 36),
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 24,
      }}
    >
      {hero.eyebrow ? (
        <span
          style={{
            alignSelf: "flex-start",
            padding: "6px 14px",
            borderRadius: 999,
            background: "var(--site-soft)",
            fontSize: 13,
            fontWeight: 700,
            color: "color-mix(in srgb, var(--site-ink) 85%, var(--site-bg))",
          }}
        >
          {hero.eyebrow}
        </span>
      ) : null}
      <h1
        style={{
          margin: 0,
          fontFamily: FONTS.manrope,
          fontWeight: 800,
          fontSize: fluid(34, 50),
          lineHeight: 1.04,
          letterSpacing: "-0.045em",
          textWrap: "balance",
        }}
      >
        {hero.headline}
      </h1>
      {hero.subheadline ? (
        <p style={{ margin: 0, fontSize: 16, color: "var(--site-muted)" }}>{hero.subheadline}</p>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {hero.cta ? (
          <CtaLink
            link={hero.cta}
            className="transition-opacity hover:opacity-90"
            style={{
              padding: "13px 22px",
              borderRadius: 999,
              background: "var(--site-ink)",
              color: "var(--site-surface)",
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            {hero.cta.label} →
          </CtaLink>
        ) : null}
        {model.order.includes("experience") ? (
          <a
            href={`#${ANCHORS.experience}`}
            style={{
              padding: "13px 22px",
              borderRadius: 999,
              background: "var(--site-soft)",
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            View experience
          </a>
        ) : null}
      </div>
    </div>
  );
}

function OpenToCard({ model, className }: { model: SiteModel; className: string }) {
  return (
    <div
      className={className}
      style={{
        ...card,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          fontWeight: 700,
          color: "var(--site-accent)",
        }}
      >
        <span
          aria-hidden
          className="pt-ping"
          style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", flex: "none" }}
        />
        Open to
      </span>
      <span style={{ fontWeight: 800, fontSize: 20, lineHeight: 1.25, letterSpacing: "-0.02em" }}>
        {model.availabilityShort}
      </span>
    </div>
  );
}

function BasedInCard({ model, className }: { model: SiteModel; className: string }) {
  return (
    <div
      className={className}
      style={{
        ...card,
        background: "var(--site-accent-soft)",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--site-accent)" }}>Based in</span>
      <span style={{ fontWeight: 800, fontSize: 26, letterSpacing: "-0.03em" }}>
        {model.location}
      </span>
    </div>
  );
}

function AboutCard({ model, className }: { model: SiteModel; className: string }) {
  const about = model.about!;
  return (
    <div
      id={ANCHORS.about}
      className={className}
      style={{ ...card, padding: 32, display: "flex", flexDirection: "column", gap: 14 }}
    >
      <span style={cardLabel}>About</span>
      <p
        style={{
          margin: 0,
          fontWeight: 700,
          fontSize: fluid(19, 21),
          lineHeight: 1.4,
          letterSpacing: "-0.02em",
        }}
      >
        <Spans spans={about.lead} emphasis={(text, key) => <span key={key}>{text}</span>} />
      </p>
      {about.rest.map((paragraph, index) => (
        <p key={index} style={{ margin: 0, fontSize: 15, color: "var(--site-muted)" }}>
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function QuoteCard({ model, className }: { model: SiteModel; className: string }) {
  const quote = model.pullQuote!;
  return (
    <figure
      id={ANCHORS.testimonials}
      className={className}
      style={{
        ...card,
        margin: 0,
        background: "var(--site-ink)",
        color: "var(--site-bg)",
        padding: 32,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 24,
      }}
    >
      <span
        aria-hidden
        style={{ fontWeight: 800, fontSize: 56, lineHeight: 0.5, color: "#22c55e" }}
      >
        “
      </span>
      <blockquote
        style={{
          margin: 0,
          fontWeight: 700,
          fontSize: fluid(20, 23),
          lineHeight: 1.4,
          letterSpacing: "-0.02em",
        }}
      >
        {quote.quote}
      </blockquote>
      <figcaption
        style={{ fontSize: 14, color: "color-mix(in srgb, var(--site-bg) 65%, transparent)" }}
      >
        {quote.attribution}
      </figcaption>
    </figure>
  );
}

function ExperienceCard({ model, className }: { model: SiteModel; className: string }) {
  return (
    <div
      id={ANCHORS.experience}
      className={className}
      style={{ ...card, padding: fluid(24, 32), display: "flex", flexDirection: "column", gap: 6 }}
    >
      <span style={{ ...cardLabel, marginBottom: 8 }}>Experience</span>
      {model.experience.map((item, index) => (
        <div
          key={index}
          style={{
            display: "grid",
            gridTemplateColumns: "48px 1fr auto",
            gap: 16,
            alignItems: "center",
            padding: "14px 0",
            borderTop: faintRule,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "var(--site-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            {item.orgInitials}
          </span>
          <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.015em" }}>
              {item.role}
            </span>
            <span style={{ fontSize: 14, color: "var(--site-muted)" }}>{item.organization}</span>
          </span>
          {item.dates ? (
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--site-muted)",
                padding: "5px 12px",
                borderRadius: 999,
                background: "var(--site-soft)",
                whiteSpace: "nowrap",
              }}
            >
              {item.dates}
            </span>
          ) : (
            <span />
          )}
        </div>
      ))}
    </div>
  );
}

function ElsewhereCard({ model, className }: { model: SiteModel; className: string }) {
  const row: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 0",
    borderTop: faintRule,
    fontWeight: 700,
  };
  return (
    <div
      className={className}
      style={{ ...card, padding: 24, display: "flex", flexDirection: "column", gap: 4 }}
    >
      <span style={{ ...cardLabel, marginBottom: 8 }}>Elsewhere</span>
      {model.contact.links.map((link, index) => (
        <ContactLink key={index} link={link} className="hover:text-site-accent" style={row}>
          {link.label} <span aria-hidden>↗</span>
        </ContactLink>
      ))}
      {model.contact.email ? (
        <a href={mailto(model.contact.email)} className="hover:text-site-accent" style={row}>
          Email <span aria-hidden>↗</span>
        </a>
      ) : null}
    </div>
  );
}

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

export function BentoTemplate({ model, publishedAt }: TemplateProps) {
  const nav = navItems(model, { about: "About", experience: "Experience", work: "Work" });
  const openTo = Boolean(model.availabilityShort);
  const basedIn = Boolean(model.location);
  const sideCards = Number(openTo) + Number(basedIn);
  const about = model.order.includes("about");
  const quote = model.order.includes("testimonials");
  const experience = model.order.includes("experience");
  const elsewhere = model.contact.links.length > 0 || Boolean(model.contact.email);

  return (
    <div
      id={ANCHORS.top}
      style={{
        fontFamily: FONTS.manrope,
        fontSize: 16,
        lineHeight: 1.55,
        padding: `28px ${fluid(16, 40)} 48px`,
      }}
    >
      <SkipLink />
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "4px 6px 8px",
          }}
        >
          <a
            href={`#${ANCHORS.top}`}
            style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em" }}
          >
            {model.name}
          </a>
          <nav
            aria-label="Sections"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              fontSize: 14,
              fontWeight: 600,
              color: "var(--site-muted)",
            }}
          >
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
                color: "var(--site-surface)",
              }}
            >
              Contact
            </a>
          </nav>
        </header>
        <main
          id="main"
          className="grid grid-flow-dense grid-cols-1 gap-4 @xl:grid-cols-2 @5xl:grid-cols-4"
          style={{ gridAutoRows: "minmax(150px, auto)" }}
        >
          <PortraitCard
            model={model}
            className={
              sideCards
                ? "@xl:col-span-1 @xl:row-span-2 @5xl:col-span-1"
                : "@xl:col-span-2 @xl:row-span-2 @5xl:col-span-1"
            }
          />
          <HeroCard
            model={model}
            className={
              sideCards
                ? "@xl:col-span-2 @5xl:row-span-2"
                : "@xl:col-span-2 @5xl:col-span-3 @5xl:row-span-2"
            }
          />
          {openTo ? (
            <OpenToCard
              model={model}
              className={basedIn ? "@xl:col-span-1" : "@xl:col-span-1 @xl:row-span-2"}
            />
          ) : null}
          {basedIn ? (
            <BasedInCard
              model={model}
              className={openTo ? "@xl:col-span-1" : "@xl:col-span-1 @xl:row-span-2"}
            />
          ) : null}
          {model.order.includes("impact") ? (
            <Tiles
              items={model.stats}
              render={(stat, index, className) => (
                <div
                  key={`stat-${index}`}
                  id={index === 0 ? ANCHORS.impact : undefined}
                  className={`${className} ${lift}`}
                  style={{
                    ...card,
                    padding: 24,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: fluid(38, 46),
                      lineHeight: 1,
                      letterSpacing: "-0.05em",
                    }}
                  >
                    {stat.value}
                  </span>
                  <span style={{ fontSize: 14, color: "var(--site-muted)" }}>{stat.label}</span>
                </div>
              )}
            />
          ) : null}
          {about ? <AboutCard model={model} className={spanClass(quote ? 2 : 4, 2)} /> : null}
          {quote ? <QuoteCard model={model} className={spanClass(about ? 2 : 4, 2)} /> : null}
          {experience ? (
            <ExperienceCard model={model} className={spanClass(elsewhere ? 3 : 4, 2)} />
          ) : null}
          {elsewhere ? (
            <ElsewhereCard model={model} className={spanClass(experience ? 1 : 4, 2)} />
          ) : null}
          {model.order.includes("work") ? (
            <Tiles
              items={model.work}
              render={(item, index, className) => {
                const body = (
                  <>
                    <div style={{ height: 110, background: WORK_TINTS[index % 4], padding: 14 }}>
                      {item.kind ? (
                        <span
                          style={{
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
                        gap: 4,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: 16,
                          lineHeight: 1.3,
                          letterSpacing: "-0.015em",
                        }}
                      >
                        {item.title}
                      </span>
                      {item.meta ? (
                        <span style={{ fontSize: 13, color: "var(--site-muted)" }}>
                          {item.meta}
                        </span>
                      ) : null}
                    </div>
                  </>
                );
                const style: CSSProperties = {
                  ...card,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                };
                const props = {
                  id: index === 0 ? ANCHORS.work : undefined,
                  className: `${className} ${lift}`,
                  style,
                };
                return item.href ? (
                  <ContactLink
                    key={`work-${index}`}
                    link={{ label: item.title, href: item.href }}
                    {...props}
                  >
                    {body}
                  </ContactLink>
                ) : (
                  <div key={`work-${index}`} {...props}>
                    {body}
                  </div>
                );
              }}
            />
          ) : null}
          <div
            id={ANCHORS.contact}
            className={spanClass(4, 2)}
            style={{
              ...card,
              padding: fluid(28, 40),
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 32,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={cardLabel}>Let&apos;s talk</span>
              <h2
                style={{
                  margin: 0,
                  fontFamily: FONTS.manrope,
                  fontWeight: 800,
                  fontSize: fluid(28, 40),
                  lineHeight: 1.05,
                  letterSpacing: "-0.045em",
                  maxWidth: 640,
                }}
              >
                {model.contact.blurb || "Get in touch."}
              </h2>
            </div>
            {model.contact.email ? (
              <a
                href={mailto(model.contact.email)}
                className="transition-opacity hover:opacity-90"
                style={{
                  padding: "16px 26px",
                  borderRadius: 999,
                  background: "var(--site-ink)",
                  color: "var(--site-surface)",
                  fontWeight: 700,
                  overflowWrap: "anywhere",
                }}
              >
                {model.contact.email}
              </a>
            ) : null}
          </div>
        </main>
        <footer
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 6px 0",
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
    </div>
  );
}
