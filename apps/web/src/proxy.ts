import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { liveDomainFor, siteForHost } from "./lib/domain-routing";
import {
  appHostnames,
  hostnameOf,
  isCustomDomainCandidate,
  isInternalTenantPath,
  NOT_FOUND_PATH,
  parseSitesPath,
  resolveHost,
  routingConfigFromEnv,
  SITES_PATH_PREFIX,
  TENANT_PATH_PREFIX,
} from "./lib/routing";

/** Paths that need a signed-in user. */
const PROTECTED_PREFIXES = ["/dashboard"];

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

/** Product routes, shared by both routing modes. */
function serveApp(request: NextRequest) {
  // Optimistic check on cookie presence only, so signed-out visitors get a real redirect
  // instead of a streamed one. Pages and server actions still verify the session itself.
  const { pathname, search } = request.nextUrl;
  if (isProtected(pathname) && !getSessionCookie(request)) {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("callbackURL", `${pathname}${search}`);
    return NextResponse.redirect(signIn, 307);
  }
  return NextResponse.next();
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

/** A customer's own domain: its site, or (for www) a redirect to the domain. Null if unknown. */
async function serveCustomDomain(request: NextRequest, hostname: string) {
  const found = await siteForHost(hostname);
  if (!found) return null;
  if (found.isWww) {
    const { pathname, search } = request.nextUrl;
    return NextResponse.redirect(`https://${found.domain}${pathname}${search}`, 308);
  }
  return serveSiteHost(request, found.subdomain, false);
}

/**
 * Routes each request to the product or to a customer site.
 *
 * - Subdomain mode (ROOT_DOMAIN set): the apex is the product, <name>.<root> is a customer site.
 *   The Host header is trusted because the platform only routes our configured domains here.
 * - Path mode (no ROOT_DOMAIN, e.g. on *.vercel.app): customer sites live at /sites/<name>.
 * - In both, a customer's own domain (added through Settings) serves their site.
 *
 * In every mode the internal /s/* route is unreachable directly.
 */
export async function proxy(request: NextRequest) {
  const routing = routingConfigFromEnv();
  const { pathname, search } = request.nextUrl;

  if (routing.mode === "path") {
    const hostname = hostnameOf(request.headers.get("host") ?? "");
    if (isCustomDomainCandidate(hostname) && !appHostnames().has(hostname)) {
      const custom = await serveCustomDomain(request, hostname);
      if (custom) return custom;
    }
    if (isInternalTenantPath(pathname)) return notFound(request);
    const site = parseSitesPath(pathname);
    switch (site.kind) {
      case "none":
        return serveApp(request);
      case "invalid":
        return notFound(request);
      case "site": {
        if (!site.canonical) {
          const url = new URL(
            `${SITES_PATH_PREFIX}/${site.subdomain}${site.rest}${search}`,
            request.url,
          );
          return NextResponse.redirect(url, 308);
        }
        if (site.rest.startsWith("/api/")) return notFound(request);
        const forwarded = await forwardToLiveDomain(request, site.subdomain, site.rest);
        return forwarded ?? rewriteToTenant(request, site.subdomain, site.rest);
      }
    }
  }

  const resolution = resolveHost(request.headers.get("host"), routing);
  switch (resolution.kind) {
    case "redirect-to-apex":
      return NextResponse.redirect(
        `${request.nextUrl.protocol}//${routing.rootDomain}${pathname}${search}`,
        308,
      );
    case "app":
      // One URL per site: path-mode addresses don't exist once subdomains are in use.
      if (isInternalTenantPath(pathname) || parseSitesPath(pathname).kind !== "none") {
        return notFound(request);
      }
      return serveApp(request);
    case "tenant":
      // Tenant hosts serve published pages and their images only: no API, auth or dashboard.
      return serveSiteHost(request, resolution.subdomain, true);
    case "custom": {
      const custom = await serveCustomDomain(request, resolution.hostname);
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
