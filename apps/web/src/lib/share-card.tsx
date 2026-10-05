import type { PublishedSite } from "@ceomaker/db";
import {
  MEDIA_PATH,
  parseSiteContentForRender,
  parseThemeSettingsForRender,
  resolveSiteColors,
  resolveTemplateRef,
  roleFromEyebrow,
} from "@ceomaker/schema";
import { ShareCard, type ShareCardProps } from "@ceomaker/templates";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { mediaStore } from "@/lib/media-store";
import { routingConfigFromEnv } from "@/lib/routing";

// The generated share image of a live site (see ShareCard), and its address.

/** Path of the generated share image on a site's own host. */
export const SHARE_CARD_PATH = "/share-card.png";

const FONT_DIR = join(process.cwd(), "assets/share-fonts");
const FONT_FILES = [
  ["Newsreader", "Newsreader-400.ttf", 400],
  ["Inter", "Inter-400.ttf", 400],
  ["Inter", "Inter-500.ttf", 500],
  ["Public Sans", "PublicSans-500.ttf", 500],
  ["Public Sans", "PublicSans-600.ttf", 600],
  ["Big Shoulders Display", "BigShouldersDisplay-900.ttf", 900],
  ["Italiana", "Italiana-400.ttf", 400],
  ["Hanken Grotesk", "HankenGrotesk-400.ttf", 400],
  ["Hanken Grotesk", "HankenGrotesk-600.ttf", 600],
  ["Geist", "Geist-500.ttf", 500],
  ["Geist", "Geist-600.ttf", 600],
  ["Geist Mono", "GeistMono-400.ttf", 400],
  ["Archivo Expanded", "ArchivoExpanded-440.ttf", 400],
  ["Martian Mono", "MartianMono-400.ttf", 400],
  ["Figtree", "Figtree-300.ttf", 300],
  ["Figtree", "Figtree-500.ttf", 500],
] as const;

let fonts: Promise<{ name: string; data: Buffer; weight: 300 | 400 | 500 | 600 | 900 }[]> | null =
  null;

function loadFonts() {
  fonts ??= Promise.all(
    FONT_FILES.map(async ([name, file, weight]) => ({
      name,
      data: await readFile(join(FONT_DIR, file)),
      weight,
    })),
  );
  return fonts;
}

const IMAGE_FONTS = {
  serif: "Newsreader",
  sans: "Inter",
  display: "Big Shoulders Display",
  body: "Public Sans",
  salonDisplay: "Italiana",
  salonBody: "Hanken Grotesk",
  folio: "Geist",
  folioMono: "Geist Mono",
  tempo: "Archivo Expanded",
  tempoMono: "Martian Mono",
  harbour: "Figtree",
};

/** What the card shows for a live site (already entitled), without the portrait's bytes. */
export function shareCardFor(site: PublishedSite): Omit<ShareCardProps, "fonts"> {
  const { meta, sections } = parseSiteContentForRender(site.content);
  const hero = sections.find((section) => section.type === "hero");
  const { key, version } = resolveTemplateRef(site.templateKey, site.templateVersion);
  return {
    template: key,
    colors: resolveSiteColors(parseThemeSettingsForRender(site.theme), key, version),
    name: meta?.name ?? site.subdomain,
    role:
      meta?.role || roleFromEyebrow(hero?.type === "hero" ? hero.eyebrow : undefined) || undefined,
    organization: meta?.company,
    domain: site.customDomain ?? `${site.subdomain}.${routingConfigFromEnv().rootDomain}`,
    photo: hero?.type === "hero" ? hero.image?.src : undefined,
  };
}

/**
 * Changes whenever the card would: a new version, a plan change (template, domain) or a new
 * domain. Added to the image address so apps and the CDN never keep an old card.
 */
export function shareCardVersion(site: PublishedSite): string {
  return createHash("sha256")
    .update(`${site.versionId}|${site.ownerPlan}|${site.customDomain ?? ""}`)
    .digest("hex")
    .slice(0, 12);
}

/** An uploaded portrait as a data URI the renderer can draw; outside images aren't fetched. */
async function portrait(src: string | undefined): Promise<string | undefined> {
  if (!src || !MEDIA_PATH.test(src)) return undefined;
  const media = await mediaStore()
    ?.get(src.slice("/media/".length))
    .catch(() => null);
  if (!media) return undefined;
  return `data:${media.contentType};base64,${Buffer.from(media.data).toString("base64")}`;
}

export async function renderShareCard(site: PublishedSite): Promise<ImageResponse> {
  const card = shareCardFor(site);
  const [loaded, photo] = await Promise.all([loadFonts(), portrait(card.photo)]);
  return new ImageResponse(<ShareCard {...card} photo={photo} fonts={IMAGE_FONTS} />, {
    width: 1200,
    height: 630,
    fonts: loaded.map((font) => ({ ...font, style: "normal" as const })),
    headers: { "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable" },
  });
}
