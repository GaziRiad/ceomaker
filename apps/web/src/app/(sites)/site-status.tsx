import { appUrl } from "@/lib/routing";

const COPY = {
  "not-live": {
    kicker: "Not available",
    title: "This site isn't live",
    body: "The address may be unclaimed, or its owner has not published it yet.",
  },
  paused: {
    kicker: "Paused",
    title: "This site is taking a break",
    body: "The owner's subscription has lapsed. The site will return as soon as it's renewed.",
  },
} as const;

const heading = "var(--font-barlow-condensed), system-ui, sans-serif";

/**
 * Shown on a customer address with nothing to serve. Styled inline with the product's colours:
 * customer pages load only the template stylesheet.
 */
export function SiteStatus({ variant }: { variant: keyof typeof COPY }) {
  const copy = COPY[variant];
  const corner = (position: React.CSSProperties) => (
    <i
      aria-hidden
      style={{
        position: "absolute",
        width: 11,
        height: 11,
        backgroundImage:
          "linear-gradient(#1d1f208c,#1d1f208c), linear-gradient(#1d1f208c,#1d1f208c)",
        backgroundSize: "1px 100%, 100% 1px",
        backgroundPosition: "5px 0, 0 5px",
        backgroundRepeat: "no-repeat",
        ...position,
      }}
    />
  );
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        background: "radial-gradient(800px 420px at 50% 0%, #eef6ff, transparent 70%), #f2f2f3",
        color: "#1d1f20",
        fontFamily: "var(--font-barlow), system-ui, sans-serif",
        fontSize: 17,
        lineHeight: 1.5,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 520,
          background: "#f5f5f8",
          border: "1px solid color-mix(in srgb, #1d1f20 16%, transparent)",
          boxShadow: "0 12px 32px color-mix(in srgb, #2b2b2d 22%, transparent)",
          padding: 36,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {corner({ top: -6, left: -6 })}
        {corner({ top: -6, right: -6 })}
        {corner({ bottom: -6, left: -6 })}
        {corner({ bottom: -6, right: -6 })}
        <span
          style={{
            fontSize: 13,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#416180",
          }}
        >
          {copy.kicker}
        </span>
        <h1
          style={{
            margin: 0,
            fontFamily: heading,
            fontWeight: 600,
            lineHeight: 1,
            textTransform: "uppercase",
            fontSize: 44,
          }}
        >
          {copy.title}
        </h1>
        <span style={{ color: "#424244" }}>{copy.body}</span>
        <a
          href={appUrl()}
          style={{
            alignSelf: "flex-start",
            marginTop: 8,
            minWidth: 240,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "12px 16px",
            background: "#5980a6",
            color: "#f2f2f3",
            fontFamily: heading,
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          Create your own site
          <svg
            aria-hidden
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </a>
        <span style={{ marginTop: 20, fontSize: 13, color: "#7a7a7d" }}>
          Powered by{" "}
          <span
            style={{
              fontFamily: heading,
              fontWeight: 600,
              textTransform: "uppercase",
              color: "#1d1f20",
            }}
          >
            CEO<span style={{ color: "#5980a6" }}>Maker</span>
          </span>
        </span>
      </div>
    </main>
  );
}
