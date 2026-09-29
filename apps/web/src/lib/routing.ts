import { isValidSubdomain } from "@ceomaker/schema";

/** Internal path prefix tenant requests are rewritten to. Never reachable directly. */
export const TENANT_PATH_PREFIX = "/s";
/** Rewrite target that matches no route, so global-not-found renders with a 404 status. */
export const NOT_FOUND_PATH = "/__not-found";

export type HostResolution =
  | { kind: "app" }
  | { kind: "redirect-to-apex" }
  | { kind: "tenant"; subdomain: string }
  | { kind: "not-found" };

export interface RoutingConfig {
  /** e.g. "ceomaker.com" in production, "localhost:3000" in development. Port is ignored. */
  rootDomain: string;
  /** Serve the app on hosts we don't recognise (local IPs, preview deployments). Off in production. */
  unknownHostsServeApp: boolean;
}

function hostnameOf(host: string): string {
  const value = host.trim().toLowerCase();
  // IPv6 literal, e.g. "[::1]:3000"
  if (value.startsWith("[")) return value.slice(0, value.indexOf("]") + 1);
  // Drop the port and any trailing dot of a fully qualified name.
  return value.split(":")[0]!.replace(/\.$/, "");
}

/**
 * Decides which surface a request belongs to, from the Host header alone.
 * Tenant labels are validated here so a malformed or reserved name never reaches the database.
 */
export function resolveHost(host: string | null, config: RoutingConfig): HostResolution {
  if (!host) return { kind: "not-found" };
  const hostname = hostnameOf(host);
  const root = hostnameOf(config.rootDomain);

  if (hostname === root) return { kind: "app" };
  if (hostname === `www.${root}`) return { kind: "redirect-to-apex" };

  if (hostname.endsWith(`.${root}`)) {
    const label = hostname.slice(0, -(root.length + 1));
    // Rejects nested labels ("a.b"), reserved names ("app", "api", ...) and malformed input.
    return isValidSubdomain(label) ? { kind: "tenant", subdomain: label } : { kind: "not-found" };
  }

  return config.unknownHostsServeApp ? { kind: "app" } : { kind: "not-found" };
}

/** Read on every request, so it uses the raw environment rather than the validated server env. */
export function routingConfigFromEnv(): RoutingConfig {
  return {
    rootDomain: process.env.ROOT_DOMAIN ?? "localhost:3000",
    // Only production refuses unknown hosts; dev and preview deployments serve the app on them.
    unknownHostsServeApp:
      process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV === "preview",
  };
}

/** Public URL of a tenant site, e.g. https://amelia.ceomaker.com */
export function tenantUrl(subdomain: string, appUrl: string, rootDomain: string): string {
  const { protocol } = new URL(appUrl);
  return `${protocol}//${subdomain}.${rootDomain}`;
}
