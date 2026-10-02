import type { AnalyticsSource, ClickKind, DeviceKind } from "@ceomaker/schema";

// How a visit or a click is described. Pure functions, used by the collector (server) and the
// page-view script (browser).

/** Crawlers, link previews and scripts. They don't run our script often, but some do. */
const BOT =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|slack|curl|wget|python|axios|node-fetch|go-http|java\/|okhttp|phantom|puppeteer|playwright|selenium/i;

export function isBot(userAgent: string | null): boolean {
  return !userAgent || BOT.test(userAgent);
}

export function deviceOf(userAgent: string): DeviceKind {
  if (/iPad|Tablet|PlayBook|Silk|Kindle|Android(?!.*Mobile)/i.test(userAgent)) return "tablet";
  if (/Mobi|iPhone|iPod|Android|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) return "phone";
  return "desktop";
}

const EMAIL_HOSTS = [
  "mail.google.com",
  "outlook.live.com",
  "outlook.office.com",
  "outlook.office365.com",
  "mail.yahoo.com",
  "mail.proton.me",
  "app.hey.com",
  "mail.aol.com",
  "mail.zoho.com",
  "webmail",
];
const EMAIL_APPS = [
  "com.google.android.gm",
  "com.microsoft.office.outlook",
  "com.yahoo.mobile.client.android.mail",
];

const within = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

/**
 * Where a visit came from, from the browser's referrer. Visits from the site itself (moving
 * between its pages) and with no referrer count as direct.
 */
export function sourceOf(
  referrer: string | null,
  ownHosts: readonly string[],
  campaign: { medium?: string | null } = {},
): { source: AnalyticsSource; referrerHost: string | null } {
  if (campaign.medium?.toLowerCase() === "email") return { source: "email", referrerHost: null };
  if (!referrer) return { source: "direct", referrerHost: null };
  if (referrer.startsWith("android-app://")) {
    const app = referrer.slice("android-app://".length).split("/")[0] ?? "";
    if (EMAIL_APPS.includes(app)) return { source: "email", referrerHost: null };
    if (app === "com.linkedin.android") return { source: "linkedin", referrerHost: null };
    if (app === "com.google.android.googlequicksearchbox")
      return { source: "google", referrerHost: null };
    return { source: "other", referrerHost: null };
  }
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return { source: "direct", referrerHost: null };
  }
  if (!host || ownHosts.some((own) => within(host, own.replace(/^www\./, "")))) {
    return { source: "direct", referrerHost: null };
  }
  if (within(host, "linkedin.com") || host === "lnkd.in")
    return { source: "linkedin", referrerHost: null };
  if (EMAIL_HOSTS.some((mail) => host === mail || host.startsWith(`${mail}.`))) {
    return { source: "email", referrerHost: null };
  }
  if (/(^|\.)google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host))
    return { source: "google", referrerHost: null };
  return { source: "other", referrerHost: host.slice(0, 120) };
}

/**
 * Which kind of link a click was on, or null for links we don't count (moving around the site).
 * `websiteHosts` are the owner's own websites listed on the site, e.g. their company.
 */
export function clickKindOf(
  href: string,
  websiteHosts: readonly string[],
  pageHost: string,
): ClickKind | null {
  const lower = href.trim().toLowerCase();
  if (lower.startsWith("mailto:")) return "email";
  if (lower.startsWith("tel:")) return "phone";
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === pageHost.toLowerCase().replace(/^www\./, "")) return null;
  if (within(host, "linkedin.com") || host === "lnkd.in") return "linkedin";
  if (websiteHosts.some((website) => within(host, website.replace(/^www\./, "")))) return "site";
  return "other";
}

/** A page path as stored: without query or fragment, at most 200 characters, starting with "/". */
export function sitePath(pathname: string): string {
  const clean = (pathname || "/").split(/[?#]/)[0]!.slice(0, 200);
  return clean.startsWith("/") ? clean : `/${clean}`;
}
