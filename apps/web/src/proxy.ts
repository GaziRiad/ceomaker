import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import {
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
  if (isProtected(request.nextUrl.pathname) && !getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/sign-in", request.url), 307);
  }
  return NextResponse.next();
}

/**
 * Routes each request to the product or to a customer site.
 *
 * - Subdomain mode (ROOT_DOMAIN set): the apex is the product, <name>.<root> is a customer site.
 *   The Host header is trusted because the platform only routes our configured domains here.
 * - Path mode (no ROOT_DOMAIN, e.g. on *.vercel.app): customer sites live at /sites/<name>.
 *
 * In both modes the internal /s/* route is unreachable directly.
 */
export function proxy(request: NextRequest) {
  const routing = routingConfigFromEnv();
  const { pathname, search } = request.nextUrl;

  if (routing.mode === "path") {
    if (isInternalTenantPath(pathname)) return notFound(request);
    const site = parseSitesPath(pathname);
    switch (site.kind) {
      case "none":
        return serveApp(request);
      case "invalid":
        return notFound(request);
      case "site":
        if (!site.canonical) {
          const url = new URL(
            `${SITES_PATH_PREFIX}/${site.subdomain}${site.rest}${search}`,
            request.url,
          );
          return NextResponse.redirect(url, 308);
        }
        if (site.rest.startsWith("/api/")) return notFound(request);
        return rewriteToTenant(request, site.subdomain, site.rest);
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
      // Tenant hosts serve published pages only: no API, auth or dashboard surface.
      if (pathname.startsWith("/api/")) return notFound(request);
      return rewriteToTenant(request, resolution.subdomain, pathname === "/" ? "" : pathname);
    case "not-found":
      return notFound(request);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
