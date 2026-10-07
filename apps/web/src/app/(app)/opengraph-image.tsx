import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SYMBOL_PATH } from "@/components/ui";
import { appUrl } from "@/lib/routing";

// The image shown when a link to the product (the landing page, or any app page) is shared.
// Drawn once at build time in the brand's own type: Barlow Condensed and Barlow.

export const alt = "CEOMaker: a personal website that opens doors";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#1d1f20";
const ACCENT = "#5980a6";
const GROUND = "#f2f2f3";
const MUTED = "#55595d";

export default async function Image() {
  const fonts = join(process.cwd(), "assets/share-fonts");
  const [condensed, body] = await Promise.all([
    readFile(join(fonts, "BarlowCondensed-600.ttf")),
    readFile(join(fonts, "Barlow-500.ttf")),
  ]);
  const host = new URL(appUrl()).host;
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "72px 80px",
        background: GROUND,
        color: INK,
        fontFamily: "Barlow",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <svg width={40} height={40} viewBox="0 0 28 28">
          <path fill={ACCENT} fillRule="evenodd" d={SYMBOL_PATH} />
        </svg>
        <div
          style={{
            display: "flex",
            fontFamily: "Barlow Condensed",
            fontSize: 40,
            letterSpacing: "0.02em",
          }}
        >
          <span>CEO</span>
          <span style={{ color: ACCENT }}>MAKER</span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: "Barlow Condensed",
          fontSize: 104,
          lineHeight: 0.95,
          letterSpacing: "-0.01em",
          maxWidth: 980,
        }}
      >
        A PERSONAL WEBSITE THAT OPENS DOORS.
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          fontSize: 28,
          color: MUTED,
        }}
      >
        <div style={{ display: "flex", maxWidth: 760 }}>
          Answer a few questions. Your site, drafted in your voice, live in minutes.
        </div>
        <div style={{ display: "flex", color: ACCENT }}>{host}</div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Barlow Condensed", data: condensed, weight: 600, style: "normal" },
        { name: "Barlow", data: body, weight: 500, style: "normal" },
      ],
    },
  );
}
