import { contrastRatio, type SiteColors } from "@ceomaker/schema";
import type { CSSProperties } from "react";
import { mixHex } from "./meridian/v1/measure";
import { folioRoles, textWidth as folioWidth } from "./folio/v1/measure";
import { initialsOf } from "./monogram";
import { salonRoles, textWidth } from "./salon/v1/measure";
import { splitName, tempoRoles, textWidth as tempoWidth } from "./tempo/v1/measure";

// The image shown when a link to a site is shared (LinkedIn, WhatsApp, email): 1200 x 630,
// drawn from the template's three colours, the name, role and organisation, and the initials or
// portrait. One markup serves the editor's previews (in the browser) and the generated image
// (Satori, which lays out with flexbox only), so every box with children is a flex box. Text is
// uppercased in code so both renderers agree on it.

export const SHARE_CARD_WIDTH = 1200;
export const SHARE_CARD_HEIGHT = 630;

export interface ShareCardProps {
  /** "meridian", "monument", "salon", "folio" or "tempo"; anything else is drawn as Meridian. */
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
    /** Folio's grotesk (Geist) and its mono (Geist Mono). */
    folio: string;
    folioMono: string;
    /** Tempo's expanded grotesk (Archivo at width 125) and its mono (Martian Mono). */
    tempo: string;
    tempoMono: string;
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

/**
 * Name size on Folio, in Geist SemiBold with the accent square after it: as large as fits its
 * column in two lines (three beside a photo), never breaking a word.
 */
/** A name's words, split after each hyphen: the places a line may break. */
function nameUnits(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.flatMap((word, at) =>
    word.split(/(?<=-)/).map((text, index, parts) => ({
      text,
      /** Ends a word, so a space follows unless it's the last. */
      end: index === parts.length - 1,
      last: at === words.length - 1 && index === parts.length - 1,
    })),
  );
}

export function folioNameSize(name: string, withPhoto: boolean): number {
  // The square after the last word takes about a fifth of an em.
  const square = 0.2;
  const longest = Math.max(2, ...nameUnits(name).map((unit) => folioWidth(unit.text))) + square;
  const total = Math.max(2, folioWidth(name) + square);
  const room = withPhoto ? 600 : 1040;
  const lines = withPhoto ? 3 : 2;
  const largest = withPhoto ? 120 : 156;
  return Math.round(Math.min(largest, (room * 0.97) / longest, (room * lines) / (total * 1.12)));
}

/**
 * Name size on Tempo, in expanded Archivo on two lines (first part left, the rest right): as
 * large as the wider line fits the card, and as the height left beside the portrait allows.
 */
export function tempoNameSize(name: string, withPhoto: boolean): number {
  const lines = splitName(name).filter(Boolean);
  const widest = Math.max(1.5, ...lines.map((line) => tempoWidth(line)));
  const largest = withPhoto ? 112 : 196;
  return Math.max(48, Math.round(Math.min(largest, (1072 * 0.97) / widest)));
}

export function ShareCard(props: ShareCardProps) {
  if (props.template === "monument") return <MonumentCard {...props} />;
  if (props.template === "salon") return <SalonCard {...props} />;
  if (props.template === "folio") return <FolioCard {...props} />;
  if (props.template === "tempo") return <TempoCard {...props} />;
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

function FolioCard({ colors, name, role, organization, domain, photo, fonts }: ShareCardProps) {
  const folio = folioRoles(colors);
  const ink2 = mixHex(colors.ink, colors.bg, folio.secondary / 100);
  const act = mixHex(colors.accent, colors.ink, folio.accentText / 100);
  const mark = mixHex(colors.accent, colors.ink, folio.mark / 100);
  const rule = mixHex(colors.ink, colors.bg, 0.13);
  const kicker = [role, organization].filter(Boolean).join(" · ");
  const size = folioNameSize(name, Boolean(photo));
  const units = nameUnits(name);
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
        fontFamily: fonts.folio,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 80,
          right: photo ? 500 : 80,
          top: 76,
          bottom: 72,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: fonts.folioMono,
            fontWeight: 400,
            fontSize: 19,
            lineHeight: 1.5,
            letterSpacing: "0.04em",
            color: act,
            maxWidth: photo ? 600 : 960,
          }}
        >
          {kicker.toLocaleUpperCase() || " "}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            fontWeight: 600,
            fontSize: size,
            lineHeight: 0.94,
            letterSpacing: "-0.045em",
          }}
        >
          {(units.length ? units : [{ text: " ", end: true, last: true }]).map((unit, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "flex-end",
                whiteSpace: "nowrap",
                // A space between words; hyphenated parts join up unless the line breaks there.
                marginRight: unit.end && !unit.last ? Math.round(size * 0.19) : 0,
              }}
            >
              {unit.text}
              {unit.last ? (
                <div
                  style={{
                    display: "flex",
                    width: Math.round(size * 0.17),
                    height: Math.round(size * 0.17),
                    // Pulls back the last letter's tracking, which the image renderer keeps.
                    marginLeft: Math.round(size * -0.01),
                    // Sits on the baseline: Geist's descent less half the negative leading.
                    marginBottom: Math.round(size * 0.115),
                    borderRadius: Math.max(2, Math.round(size * 0.03)),
                    background: mark,
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            paddingTop: 24,
            borderTop: `1px solid ${rule}`,
            fontSize: 22,
            fontWeight: 500,
            color: ink2,
          }}
        >
          <div
            style={{ display: "flex", width: 14, height: 14, borderRadius: 3, background: mark }}
          />
          <div style={{ display: "flex" }}>{domain}</div>
        </div>
      </div>
      {photo ? (
        <div
          style={{
            position: "absolute",
            right: 80,
            top: 90,
            width: 360,
            height: 450,
            display: "flex",
            overflow: "hidden",
            borderRadius: 24,
            background: mixHex(colors.ink, colors.bg, 0.08),
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- also drawn by the image renderer */}
          <img
            src={photo}
            alt=""
            width={360}
            height={450}
            style={{ width: 360, height: 450, objectFit: "cover" }}
          />
        </div>
      ) : null}
    </div>
  );
}

function TempoCard({ colors, name, role, organization, domain, photo, fonts }: ShareCardProps) {
  const tempo = tempoRoles(colors);
  const ink2 = mixHex(colors.ink, colors.bg, tempo.secondary / 100);
  const act = mixHex(colors.accent, colors.ink, tempo.accentText / 100);
  const mark = mixHex(colors.accent, colors.ink, tempo.mark / 100);
  const kicker = [role, organization].filter(Boolean).join(" · ");
  const size = tempoNameSize(name, Boolean(photo));
  const [first, rest] = splitName(name || " ");
  const line = (text: string, right: boolean) => (
    <div
      style={{
        display: "flex",
        justifyContent: right ? "flex-end" : "flex-start",
        fontFamily: fonts.tempo,
        // The image renderer has only this weight (registered as 400); browsers set it exactly.
        fontWeight: 440,
        fontStretch: "125%",
        fontSize: size,
        lineHeight: 0.86,
        letterSpacing: "-0.045em",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
        padding: "60px 64px 56px",
        overflow: "hidden",
        background: colors.bg,
        color: colors.ink,
      }}
    >
      {line(first, false)}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 40 }}>
        {photo ? (
          <div
            style={{
              display: "flex",
              flex: "none",
              width: 208,
              height: 260,
              overflow: "hidden",
              background: mixHex(colors.ink, colors.bg, 0.09),
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- also drawn by the image renderer */}
            <img
              src={photo}
              alt=""
              width={208}
              height={260}
              style={{ width: 208, height: 260, objectFit: "cover" }}
            />
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: photo ? "column" : "row",
            alignItems: photo ? "flex-start" : "flex-end",
            justifyContent: "space-between",
            gap: photo ? 18 : 40,
            fontFamily: fonts.tempoMono,
            fontSize: 20,
            lineHeight: 1.5,
            letterSpacing: "0.04em",
          }}
        >
          <div style={{ display: "flex", maxWidth: 680, color: act, ...clamp2 }}>
            {kicker.toLocaleUpperCase() || " "}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: ink2 }}>
            {/* The template's ✦, drawn: neither font has the glyph. */}
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M8 0C8.6 5.4 10.6 7.4 16 8C10.6 8.6 8.6 10.6 8 16C7.4 10.6 5.4 8.6 0 8C5.4 7.4 7.4 5.4 8 0Z"
                fill={mark}
              />
            </svg>
            <div style={{ display: "flex" }}>{domain.toLocaleUpperCase()}</div>
          </div>
        </div>
      </div>
      {rest ? line(rest, true) : null}
    </div>
  );
}
