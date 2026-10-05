import { sourceOf } from "../analytics/classify";
import { scrubPath } from "./scrub";

// Where a visit came from, read on its first page and carried through sign-up (in the sign-in
// link), so the account records it even though nothing is stored in the browser.

export interface VisitSource {
  /** "linkedin", "google", "email", "direct", "other", "customer-site", or a campaign's source. */
  source: string;
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  /** The first page of the visit, ids masked. */
  landingPath: string | null;
}

/** For accounts whose sign-up link didn't carry a source (an old link, or script off). */
export const UNKNOWN_SOURCE: VisitSource = {
  source: "unknown",
  referrerHost: null,
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  landingPath: null,
};

function clean(value: string | null | undefined, max: number): string | null {
  const text = value?.trim().slice(0, max);
  return text ? text : null;
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/**
 * The visit's source from its first page: campaign tags win, then the referrer. A referrer on
 * one of our customer sites (www.ceomaker.app is ours, amelia.ceomaker.app a customer's) usually
 * means the "Made with CEOMaker" badge.
 */
export function readVisitSource(input: { referrer: string; href: string; ownHost: string }) {
  const page = new URL(input.href);
  const utmSource = clean(page.searchParams.get("utm_source"), 100);
  const utmMedium = clean(page.searchParams.get("utm_medium"), 100);
  const utmCampaign = clean(page.searchParams.get("utm_campaign"), 100);
  const ownHostname = input.ownHost.split(":")[0]!.toLowerCase();
  const base = ownHostname.replace(/^www\./, "");
  const referrerHost = input.referrer ? hostOf(input.referrer) : null;
  const fromUs = referrerHost === base;
  const fromCustomerSite = !!referrerHost && !fromUs && referrerHost.endsWith(`.${base}`);

  let source: string;
  if (utmSource) source = utmSource.toLowerCase().slice(0, 60);
  else if (fromCustomerSite) source = "customer-site";
  else source = sourceOf(input.referrer || null, [ownHostname], { medium: utmMedium }).source;

  return {
    source,
    referrerHost: fromUs ? null : referrerHost ? referrerHost.slice(0, 120) : null,
    utmSource,
    utmMedium,
    utmCampaign,
    landingPath: scrubPath(page.pathname).slice(0, 200),
  } satisfies VisitSource;
}

const KEYS = {
  source: "s",
  referrerHost: "r",
  utmSource: "us",
  utmMedium: "um",
  utmCampaign: "uc",
  landingPath: "l",
} as const satisfies Record<keyof VisitSource, string>;

/** Short JSON for a URL parameter. */
export function encodeVisitSource(visit: VisitSource): string {
  const short: Record<string, string> = {};
  for (const [key, name] of Object.entries(KEYS)) {
    const value = visit[key as keyof VisitSource];
    if (value) short[name] = value;
  }
  return JSON.stringify(short);
}

/** Reads encodeVisitSource's output; anything malformed is null. Lengths are capped again. */
export function decodeVisitSource(value: string | null): VisitSource | null {
  if (!value || value.length > 1000) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  const short = parsed as Record<string, unknown>;
  const read = (name: string, max: number) =>
    typeof short[name] === "string" ? clean(short[name] as string, max) : null;
  const source = read(KEYS.source, 60);
  if (!source) return null;
  return {
    source,
    referrerHost: read(KEYS.referrerHost, 120),
    utmSource: read(KEYS.utmSource, 100),
    utmMedium: read(KEYS.utmMedium, 100),
    utmCampaign: read(KEYS.utmCampaign, 100),
    landingPath: read(KEYS.landingPath, 200),
  };
}
