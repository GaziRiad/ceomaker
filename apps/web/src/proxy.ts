import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import {
  NOT_FOUND_PATH,
  resolveHost,
  routingConfigFromEnv,
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

/**
 * Host-based routing: the apex serves the product, <name>.<root> serves that customer's site.
 * The Host header is trusted here because the platform (Vercel, or our own load balancer) only
 * routes domains we have configured to this deployment.
 */
export function proxy(request: NextRequest) {
  const routing = routingConfigFromEnv();
  const resolution = resolveHost(request.headers.get("host"), routing);
  const { pathname } = request.nextUrl;

  switch (resolution.kind) {
    case "redirect-to-apex": {
      const target = `${request.nextUrl.protocol}//${routing.rootDomain}${pathname}${request.nextUrl.search}`;
      return NextResponse.redirect(target, 308);
    }
    case "app": {
      // The internal tenant route is only reachable through a tenant host.
      if (pathname === TENANT_PATH_PREFIX || pathname.startsWith(`${TENANT_PATH_PREFIX}/`)) {
        return notFound(request);
      }
      // Optimistic check on cookie presence only, so signed-out visitors get a real redirect
      // instead of a streamed one. Pages and server actions still verify the session itself.
      if (isProtected(pathname) && !getSessionCookie(request)) {
        const signIn = new URL("/sign-in", request.url);
        return NextResponse.redirect(signIn, 307);
      }
      return NextResponse.next();
    }
    case "tenant": {
      // Tenant hosts serve published pages only: no API, auth or dashboard surface.
      if (pathname.startsWith("/api/")) return notFound(request);
      const target = `${TENANT_PATH_PREFIX}/${resolution.subdomain}${pathname === "/" ? "" : pathname}`;
      return NextResponse.rewrite(new URL(target, request.url));
    }
    case "not-found":
      return notFound(request);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
