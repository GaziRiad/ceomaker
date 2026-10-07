import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { liveDomainFor, siteForHost } from "./lib/domain-routing";
import { isPro } from "@ceomaker/schema";
import { isRelayPath, relayTarget } from "./lib/product-analytics/config";
import { regionForCountry, REGION_COOKIE } from "./lib/consent";
import {
  isInternalTenantPath,
  NOT_FOUND_PATH,
  resolveHost,
  routingConfigFromEnv,
  TENANT_PATH_PREFIX,
} from "./lib/routing";

/** Paths that need a signed-in user. */
const PROTECTED_PREFIXES = ["/dashboard", "/preview"];

/** Uploaded images are served by the app on every host, including customer sites. */
const MEDIA_PREFIX = "/media/";
/** Where live sites send their anonymous page views. Reachable on every site host. */
const COLLECT_PATH = "/api/collect";

function notFound(request: NextRequest) {
  return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
}

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function rewriteToTenant(request: NextRequest, subdomain: string, rest: string) {
  return NextResponse.rewrite(new URL(`${TENANT_PATH_PREFIX}/${subdomain}${rest}`, request.url));
}

/**
 * Product analytics requests from the product's pages, forwarded to PostHog's EU servers so they
 * go to our own address. Cookies and credentials are dropped first: PostHog never sees a session.
 */
function relayToPostHog(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const target = new URL(relayTarget(pathname, search));
  const headers = new Headers(request.headers);
  headers.delete("cookie");
  headers.delete("authorization");
  headers.set("host", target.host);
  return NextResponse.rewrite(target, { request: { headers } });
}

/**
 * Next's own trailing-slash redirect is off (next.config) because PostHog's paths end in a
 * slash. Every other path gets the same redirect here: /pricing/ → /pricing.
 */
function withoutTrailingSlash(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/" || !pathname.endsWith("/") || isRelayPath(pathname)) return null;
  // Edits the URL rather than building one from text, so "//other.site/" stays on our host. A
  // plain URL: NextURL would put the trailing slash back.
  const url = new URL(request.url);
  url.pathname = pathname.replace(/\/+$/, "") || "/";
  return NextResponse.redirect(url, 308);
}

/** Product routes. */
function serveApp(request: NextRequest) {
  // Optimistic check on cookie presence only, so signed-out visitors get a real redirect
  // instead of a streamed one. Pages and server actions still verify the session itself.
  const { pathname, search } = request.nextUrl;
  if (isRelayPath(pathname)) return relayToPostHog(request);
  if (isProtected(pathname) && !getSessionCookie(request)) {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("callbackURL", `${pathname}${search}`);
    return NextResponse.redirect(signIn, 307);
  }
  return withConsentRegion(request, NextResponse.next());
}

/**
 * Tells the page whether this visitor must choose about cookies (EEA, UK, Switzerland) or gets a
 * notice, from Vercel's country header. Set only when missing or changed, so cached pages stay
 * cacheable. It holds "eu" or "other", nothing about the person.
 */
function withConsentRegion(request: NextRequest, response: NextResponse): NextResponse {
  const region = regionForCountry(request.headers.get("x-vercel-ip-country"));
  if (request.cookies.get(REGION_COOKIE)?.value !== region) {
    response.cookies.set(REGION_COOKIE, region, {
      path: "/",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      maxAge: 60 * 60 * 24,
    });
  }
  return response;
}

/**
 * Once a site has a live custom domain, its own address forwards there (page loads only, so a
 * form posted from an old tab still arrives). Production only: locally the domain can't resolve.
 */
async function forwardToLiveDomain(request: NextRequest, subdomain: string, rest: string) {
  if (process.env.NODE_ENV !== "production") return null;
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const domain = await liveDomainFor(subdomain);
  if (!domain) return null;
  return NextResponse.redirect(`https://${domain}${rest || "/"}${request.nextUrl.search}`, 308);
}

/** A site host (its subdomain or its own domain) serves the site, its images and page views. */
async function serveSiteHost(request: NextRequest, subdomain: string, forward: boolean) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith(MEDIA_PREFIX) || pathname === COLLECT_PATH) return NextResponse.next();
  if (pathname.startsWith("/api/")) return notFound(request);
  const rest = pathname === "/" ? "" : pathname;
  if (forward) {
    const forwarded = await forwardToLiveDomain(request, subdomain, rest);
    if (forwarded) return forwarded;
  }
  return rewriteToTenant(request, subdomain, rest);
}

/**
 * A customer's own domain: its site, or (for www) a redirect to the domain. Null if unknown. If
 * the owner isn't on Pro, the domain forwards to the site's own address instead.
 */
async function serveCustomDomain(request: NextRequest, hostname: string, rootDomain: string) {
  const found = await siteForHost(hostname);
  if (!found) return null;
  const { pathname, search } = request.nextUrl;
  if (!isPro(found.ownerPlan)) {
    return NextResponse.redirect(
      `${request.nextUrl.protocol}//${found.subdomain}.${rootDomain}${pathname}${search}`,
      307,
    );
  }
  if (found.isWww) {
    return NextResponse.redirect(`https://${found.domain}${pathname}${search}`, 308);
  }
  return serveSiteHost(request, found.subdomain, false);
}

/**
 * Routes each request to the product or to a customer site.
 *
 * The root domain (or its www, following APP_URL) is the product, <name>.<root> is a customer
 * site, and a customer's own domain (added through Settings) serves their site. The Host header
 * is trusted because the platform only routes our configured domains here. The internal /s/*
 * route is unreachable directly.
 */
export async function proxy(request: NextRequest) {
  const routing = routingConfigFromEnv();
  const { pathname, search } = request.nextUrl;
  const trimmed = withoutTrailingSlash(request);
  if (trimmed) return trimmed;

  const resolution = resolveHost(request.headers.get("host"), routing);
  switch (resolution.kind) {
    case "redirect-to-app": {
      const host = routing.appOnWww ? `www.${routing.rootDomain}` : routing.rootDomain;
      return NextResponse.redirect(`${request.nextUrl.protocol}//${host}${pathname}${search}`, 308);
    }
    case "app":
      if (isInternalTenantPath(pathname)) return notFound(request);
      return serveApp(request);
    case "tenant":
      // Tenant hosts serve published pages and their images only: no API, auth or dashboard.
      return serveSiteHost(request, resolution.subdomain, true);
    case "custom": {
      const custom = await serveCustomDomain(request, resolution.hostname, routing.rootDomain);
      if (custom) return custom;
      return routing.unknownHostsServeApp ? serveApp(request) : notFound(request);
    }
    case "not-found":
      return notFound(request);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
