import { getDb, recordAnalyticsEvent } from "@ceomaker/db";
import { CLICK_KINDS, isValidSubdomain, type ClickKind } from "@ceomaker/schema";
import { getSessionCookie } from "better-auth/cookies";
import { createHmac } from "node:crypto";
import { deviceOf, isBot, sitePath, sourceOf } from "@/lib/analytics/classify";
import { serverEnv } from "@/lib/env";
import { appHostnames, hostnameOf } from "@/lib/routing";
import { getTenantSite } from "@/lib/sites";

// Anonymous page views and link clicks from live sites. No cookies are read or set for
// visitors, and no network address is stored: `visitor` is a keyed hash of the address and
// browser that changes every day, so a person can be counted once a day and never followed.

const MAX_BODY = 2048;
const noContent = () => new Response(null, { status: 204 });

interface Beacon {
  s?: unknown;
  t?: unknown;
  p?: unknown;
  r?: unknown;
  k?: unknown;
  m?: unknown;
}

function header(request: Request, name: string): string | null {
  const value = request.headers.get(name)?.trim();
  return value ? value : null;
}

function coordinate(value: string | null, limit: number): number | null {
  if (!value) return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= limit
    ? Math.round(number * 100) / 100
    : null;
}

/** Vercel sends the city URI-encoded ("S%C3%A3o%20Paulo"). */
function decodeCity(value: string): string | null {
  try {
    return decodeURIComponent(value).slice(0, 80) || null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const userAgent = header(request, "user-agent");
  if (isBot(userAgent)) return noContent();
  // The owner (or anyone signed in to CEOMaker) looking at a site doesn't count as a visitor.
  if (getSessionCookie(request)) return noContent();

  const text = await request.text().catch(() => "");
  if (!text || text.length > MAX_BODY) return noContent();
  let beacon: Beacon;
  try {
    beacon = JSON.parse(text) as Beacon;
  } catch {
    return noContent();
  }
  const subdomain = typeof beacon.s === "string" ? beacon.s : "";
  const kind = beacon.t === "click" ? "click" : beacon.t === "pageview" ? "pageview" : null;
  if (!kind || !isValidSubdomain(subdomain)) return noContent();
  const clickKind: ClickKind | null =
    kind === "click" && CLICK_KINDS.includes(beacon.k as ClickKind)
      ? (beacon.k as ClickKind)
      : null;
  if (kind === "click" && !clickKind) return noContent();

  // Only live sites collect; the lookup is cached, so this rarely touches the database.
  const tenant = await getTenantSite(subdomain);
  if (tenant?.status !== "published") return noContent();
  const { site } = tenant;

  const host = hostnameOf(header(request, "host") ?? "");
  const ownHosts = [host, ...appHostnames(), ...(site.customDomain ? [site.customDomain] : [])];
  const { source, referrerHost } = sourceOf(
    typeof beacon.r === "string" ? beacon.r.slice(0, 500) : null,
    ownHosts,
    { medium: typeof beacon.m === "string" ? beacon.m.slice(0, 40) : null },
  );
  const address =
    header(request, "x-forwarded-for")?.split(",")[0]?.trim() ?? header(request, "x-real-ip") ?? "";
  const day = new Date().toISOString().slice(0, 10);
  const visitor = createHmac("sha256", serverEnv().BETTER_AUTH_SECRET)
    .update(`visitor:${day}:${site.siteId}:${address}:${userAgent}`)
    .digest("base64url")
    .slice(0, 22);
  const city = header(request, "x-vercel-ip-city");
  const country = header(request, "x-vercel-ip-country");

  try {
    await recordAnalyticsEvent(getDb(), {
      siteId: site.siteId,
      kind,
      path: sitePath(typeof beacon.p === "string" ? beacon.p : "/"),
      source,
      referrerHost,
      clickKind,
      country: country && /^[A-Z]{2}$/.test(country) ? country : null,
      city: city ? decodeCity(city) : null,
      latitude: coordinate(header(request, "x-vercel-ip-latitude"), 90),
      longitude: coordinate(header(request, "x-vercel-ip-longitude"), 180),
      device: deviceOf(userAgent ?? ""),
      visitor,
    });
  } catch (error) {
    console.error("Couldn't record a page view", error);
  }
  return noContent();
}
