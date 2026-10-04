import { contrastRatio, type SiteColors } from "@ceomaker/schema";
import type { CSSProperties } from "react";
import { mixHex } from "./meridian/v1/measure";
import { initialsOf } from "./monogram";
import { salonRoles, textWidth } from "./salon/v1/measure";

// The image shown when a link to a site is shared (LinkedIn, WhatsApp, email): 1200 x 630,
// drawn from the template's three colours, the name, role and organisation, and the initials or
// portrait. One markup serves the editor's previews (in the browser) and the generated image
// (Satori, which lays out with flexbox only), so every box with children is a flex box. Text is
// uppercased in code so both renderers agree on it.

export const SHARE_CARD_WIDTH = 1200;
export const SHARE_CARD_HEIGHT = 630;

export interface ShareCardProps {
  /** "meridian", "monument" or "salon"; anything else is drawn as Meridian. */
  template: string;
  colors: SiteColors;
  name: string;
  role?: string | undefined;
  organization?: string | undefined;
  /** Shown on the card: "amelia.ceomaker.app" or the owner's domain. */
  domain: string;
  /** Portrait, as a URL the renderer can load. */
  photo?: string | undefined;
  /** Font families: the browser passes its CSS variables, the image renderer its loaded fonts. */
  fonts: {
    serif: string;
    sans: string;
    display: string;
    body: string;
    /** Salon's display serif (Italiana) and its reading face (Hanken Grotesk). */
    salonDisplay: string;
    salonBody: string;
  };
}

const clamp2: CSSProperties = {
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 2,
  lineClamp: 2,
  overflow: "hidden",
};

function roles({ bg, ink, accent }: SiteColors) {
  const on = contrastRatio(bg, accent) >= contrastRatio(ink, accent) ? bg : ink;
  return {
    on,
    act: contrastRatio(accent, bg) >= 4.5 ? accent : mixHex(accent, ink, 0.55),
    ink2: mixHex(ink, bg, 0.68),
    rule: mixHex(ink, bg, 0.16),
    tone: mixHex(on, accent, 0.1),
  };
}

/** Name size on Monument: set by the longest word, and by the height three lines may take. */
export function monumentNameSize(words: string[], withPhoto: boolean): number {
  const longest = Math.max(4, ...words.map((word) => word.length));
  const room = withPhoto ? 640 : 1060;
  const size = Math.min(210, room / (longest * 0.5), 400 / (Math.max(1, words.length) * 0.86));
  return Math.round(size);
}

/** Name size on Meridian: steps down for long names, which wrap to two lines at most. */
export function meridianNameSize(name: string): number {
  return name.length <= 14 ? 112 : name.length <= 22 ? 92 : 72;
}

/**
 * Name size on Salon, set uppercase in Italiana: as large as fits its column, on at most two
 * lines without a photo (three beside one), never breaking a word.
 */
export function salonNameSize(name: string, withPhoto: boolean): number {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const longest = Math.max(2, ...words.map(textWidth));
  const total = Math.max(2, textWidth(name));
  const room = withPhoto ? 600 : 1000;
  const lines = withPhoto ? 3 : 2;
  const largest = withPhoto ? 112 : 150;
  // One line if it fits at a good size; otherwise as many lines as allowed.
  const oneLine = room / total;
  const size = oneLine >= largest * 0.7 ? oneLine : (room * lines) / (total * 1.15);
  return Math.round(Math.min(largest, size, room / longest));
}

export function ShareCard(props: ShareCardProps) {
  if (props.template === "monument") return <MonumentCard {...props} />;
  if (props.template === "salon") return <SalonCard {...props} />;
  return <MeridianCard {...props} />;
}

function MeridianCard({ colors, name, role, organization, domain, photo, fonts }: ShareCardProps) {
  const t = roles(colors);
  const kicker = [role, organization].filter(Boolean).join(" · ");
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
        overflow: "hidden",
        background: colors.bg,
        color: colors.ink,
        fontFamily: fonts.sans,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 32,
          left: 32,
          right: 32,
          bottom: 32,
          border: `1px solid ${t.rule}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 84,
          top: 84,
          bottom: 84,
          right: 470,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            fontWeight: 500,
            fontSize: 19,
            letterSpacing: "0.14em",
            color: t.act,
            lineHeight: 1.4,
            maxWidth: 640,
          }}
        >
          {kicker.toLocaleUpperCase() || " "}
        </div>
        <div
          style={{
            ...clamp2,
            fontFamily: fonts.serif,
            fontWeight: 400,
            fontSize: meridianNameSize(name),
            lineHeight: 1.02,
            letterSpacing: "-0.015em",
            textWrap: "balance",
          }}
        >
          {name}
        </div>
        <div
          style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 21, color: t.ink2 }}
        >
          <div style={{ width: 36, height: 1, background: colors.accent }} />
          <div style={{ display: "flex" }}>{domain}</div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 96,
          top: 165,
          width: 300,
          height: 300,
          borderRadius: "50%",
          border: `1.5px solid ${colors.accent}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            width: 256,
            height: 256,
            borderRadius: "50%",
            overflow: "hidden",
            background: colors.accent,
            color: t.on,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: fonts.serif,
            fontSize: 104,
            letterSpacing: "0.02em",
          }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- also drawn by the image renderer
            <img
              src={photo}
              alt=""
              width={256}
              height={256}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 256,
                height: 256,
                objectFit: "cover",
              }}
            />
          ) : (
            initialsOf(name)
          )}
        </div>
      </div>
    </div>
  );
}

function MonumentCard({ colors, name, role, organization, domain, photo, fonts }: ShareCardProps) {
  const t = roles(colors);
  const words = name.trim().split(/\s+/).filter(Boolean);
  const size = monumentNameSize(words, Boolean(photo));
  const roleLine = [role, organization].filter(Boolean).join(", ");
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
        overflow: "hidden",
        background: colors.accent,
        color: t.on,
        fontFamily: fonts.body,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: photo ? 380 : -40,
          bottom: -150,
          display: "flex",
          fontFamily: fonts.display,
          fontWeight: 900,
          fontSize: 720,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color: t.tone,
          whiteSpace: "nowrap",
        }}
      >
        {initialsOf(name)}
      </div>
      <div
        style={{
          position: "absolute",
          left: 64,
          top: 56,
          right: photo ? 464 : 64,
          bottom: 56,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontFamily: fonts.display,
            fontWeight: 900,
            fontSize: size,
            lineHeight: 0.86,
            letterSpacing: "-0.005em",
          }}
        >
          {(words.length ? words : [" "]).map((word, index) => (
            <div key={index} style={{ display: "flex", whiteSpace: "nowrap" }}>
              {word.toLocaleUpperCase()}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 32,
            paddingTop: 22,
            borderTop: `3px solid ${t.on}`,
            fontSize: 24,
            lineHeight: 1.3,
          }}
        >
          <div style={{ display: "flex", fontWeight: 600, maxWidth: 720 }}>{roleLine || " "}</div>
          <div style={{ display: "flex", flexShrink: 0, fontWeight: 500 }}>{domain}</div>
        </div>
      </div>
      {photo ? (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 400,
            display: "flex",
            background: t.tone,
            overflow: "hidden",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- also drawn by the image renderer */}
          <img
            src={photo}
            alt=""
            width={400}
            height={SHARE_CARD_HEIGHT}
            style={{ width: 400, height: SHARE_CARD_HEIGHT, objectFit: "cover" }}
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Four corner brackets inside a box of the given size, as Salon frames photos and buttons.
 * Placed from the top left only: the image renderer doesn't honour `right` here.
 */
function Brackets({
  width,
  height,
  inset,
  arm,
  color,
}: {
  width: number;
  height: number;
  inset: number;
  arm: number;
  color: string;
}) {
  const stroke = 1.5;
  const near = inset;
  const farX = width - inset;
  const farY = height - inset;
  const lines: CSSProperties[] = [
    { left: near, top: near, width: arm, height: stroke },
    { left: near, top: near, width: stroke, height: arm },
    { left: farX - arm, top: near, width: arm, height: stroke },
    { left: farX - stroke, top: near, width: stroke, height: arm },
    { left: near, top: farY - stroke, width: arm, height: stroke },
    { left: near, top: farY - arm, width: stroke, height: arm },
    { left: farX - arm, top: farY - stroke, width: arm, height: stroke },
    { left: farX - stroke, top: farY - arm, width: stroke, height: arm },
  ];
  return (
    <>
      {lines.map((style, index) => (
        <div
          key={index}
          style={{ position: "absolute", display: "flex", background: color, ...style }}
        />
      ))}
    </>
  );
}

function SalonCard({ colors, name, role, organization, domain, photo, fonts }: ShareCardProps) {
  const salon = salonRoles(colors);
  const ink2 = mixHex(colors.ink, colors.bg, salon.secondary / 100);
  const act = mixHex(colors.accent, colors.ink, salon.accentText / 100);
  const bracket = mixHex(colors.ink, colors.bg, salon.bracket / 100);
  const kicker = [role, organization].filter(Boolean).join(" · ");
  const size = salonNameSize(name, Boolean(photo));
  const centred = !photo;
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
        overflow: "hidden",
        background: colors.bg,
        color: colors.ink,
        fontFamily: fonts.salonBody,
      }}
    >
      <Brackets
        width={SHARE_CARD_WIDTH}
        height={SHARE_CARD_HEIGHT}
        inset={36}
        arm={44}
        color={bracket}
      />
      <div
        style={{
          position: "absolute",
          left: centred ? 100 : 96,
          right: centred ? 100 : 480,
          top: 92,
          bottom: 92,
          display: "flex",
          flexDirection: "column",
          alignItems: centred ? "center" : "flex-start",
          justifyContent: "space-between",
          textAlign: centred ? "center" : "left",
        }}
      >
        <div
          style={{
            display: "flex",
            fontWeight: 600,
            fontSize: 18,
            lineHeight: 1.5,
            letterSpacing: "0.18em",
            color: act,
            maxWidth: centred ? 900 : 600,
          }}
        >
          {kicker.toLocaleUpperCase() || " "}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: centred ? "center" : "flex-start",
            fontFamily: fonts.salonDisplay,
            fontWeight: 400,
            fontSize: size,
            lineHeight: 1,
            letterSpacing: "0.01em",
            textWrap: "balance",
          }}
        >
          {name.toLocaleUpperCase()}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 20, color: ink2 }}>
          <div style={{ width: 28, height: 1, background: colors.accent }} />
          <div style={{ display: "flex" }}>{domain}</div>
          {centred ? <div style={{ width: 28, height: 1, background: colors.accent }} /> : null}
        </div>
      </div>
      {photo ? (
        <div
          style={{
            position: "absolute",
            right: 106,
            top: 112,
            width: 324,
            height: 406,
            display: "flex",
          }}
        >
          <Brackets width={324} height={406} inset={-10} arm={14} color={bracket} />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 324,
              height: 406,
              display: "flex",
              overflow: "hidden",
              background: mixHex(colors.ink, colors.bg, 0.09),
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- also drawn by the image renderer */}
            <img
              src={photo}
              alt=""
              width={324}
              height={406}
              style={{ width: 324, height: 406, objectFit: "cover" }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
