import { isValidSubdomain } from "@ceomaker/schema";

/** Internal path prefix tenant requests are rewritten to. Never reachable directly. */
export const TENANT_PATH_PREFIX = "/s";
/** Public prefix for customer sites in path mode (no custom domain yet). */
export const SITES_PATH_PREFIX = "/sites";
/** Rewrite target that matches no route, so global-not-found renders with a 404 status. */
export const NOT_FOUND_PATH = "/__not-found";

/**
 * - subdomain: customer sites at <name>.<rootDomain>. Used once we own a domain.
 * - path: customer sites at <app>/sites/<name>. Used on hosts where we can't create subdomains,
 *   such as a free *.vercel.app address.
 */
export type RoutingConfig = SubdomainRoutingConfig | { mode: "path" };

export interface SubdomainRoutingConfig {
  mode: "subdomain";
  /** e.g. "ceomaker.com" in production, "localhost:3000" in development. Port is ignored. */
  rootDomain: string;
  /** Serve the app on hosts we don't recognise (local IPs, preview deployments). */
  unknownHostsServeApp: boolean;
}

export type HostResolution =
  | { kind: "app" }
  | { kind: "redirect-to-apex" }
  | { kind: "tenant"; subdomain: string }
  | { kind: "not-found" };

type Env = Record<string, string | undefined>;

function hostnameOf(host: string): string {
  const value = host.trim().toLowerCase();
  // IPv6 literal, e.g. "[::1]:3000"
  if (value.startsWith("[")) return value.slice(0, value.indexOf("]") + 1);
  // Drop the port and any trailing dot of a fully qualified name.
  return value.split(":")[0]!.replace(/\.$/, "");
}

/**
 * Subdomain mode: decides which surface a request belongs to, from the Host header alone.
 * Tenant labels are validated here so a malformed or reserved name never reaches the database.
 */
export function resolveHost(host: string | null, config: SubdomainRoutingConfig): HostResolution {
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

export type SitesPathResolution =
  | { kind: "none" }
  | { kind: "invalid" }
  | { kind: "site"; subdomain: string; rest: string; canonical: boolean };

/** Path mode: parses "/sites/<name>[/rest]". Names are case-insensitive but served lowercase. */
export function parseSitesPath(pathname: string): SitesPathResolution {
  if (pathname !== SITES_PATH_PREFIX && !pathname.startsWith(`${SITES_PATH_PREFIX}/`)) {
    return { kind: "none" };
  }
  const [, , rawName = "", ...rest] = pathname.split("/");
  const subdomain = rawName.toLowerCase();
  if (!isValidSubdomain(subdomain)) return { kind: "invalid" };
  return {
    kind: "site",
    subdomain,
    rest: rest.length > 0 ? `/${rest.join("/")}` : "",
    canonical: rawName === subdomain,
  };
}

export function isInternalTenantPath(pathname: string): boolean {
  return pathname === TENANT_PATH_PREFIX || pathname.startsWith(`${TENANT_PATH_PREFIX}/`);
}

/** Subdomain mode when ROOT_DOMAIN is set, path mode otherwise. Read on every request. */
export function routingConfigFromEnv(env: Env = process.env): RoutingConfig {
  const rootDomain = env.ROOT_DOMAIN?.trim();
  if (!rootDomain) return { mode: "path" };
  return {
    mode: "subdomain",
    rootDomain,
    // Only production refuses unknown hosts; dev and preview deployments serve the app on them.
    unknownHostsServeApp: env.NODE_ENV !== "production" || env.VERCEL_ENV === "preview",
  };
}

/**
 * Public URL of the product, without a trailing slash. APP_URL wins; on Vercel it is derived
 * from the system variables so the free *.vercel.app address and previews work with no config.
 */
export function appUrl(env: Env = process.env): string {
  if (env.APP_URL) return env.APP_URL.replace(/\/+$/, "");
  const vercelHost =
    env.VERCEL_ENV === "production"
      ? env.VERCEL_PROJECT_PRODUCTION_URL
      : (env.VERCEL_BRANCH_URL ?? env.VERCEL_URL);
  return vercelHost ? `https://${vercelHost}` : "http://localhost:3000";
}

/** Public URL of a customer site: https://amelia.ceomaker.com or https://<app>/sites/amelia */
export function siteUrl(
  subdomain: string,
  config: RoutingConfig = routingConfigFromEnv(),
  base: string = appUrl(),
): string {
  if (config.mode === "path") return `${base}${SITES_PATH_PREFIX}/${subdomain}`;
  const { protocol } = new URL(base);
  return `${protocol}//${subdomain}.${config.rootDomain}`;
}

/** How a site address is displayed around the name the user types, without the protocol. */
export function siteAddressParts(
  config: RoutingConfig = routingConfigFromEnv(),
  base: string = appUrl(),
): { prefix: string; suffix: string } {
  if (config.mode === "path") {
    return { prefix: `${new URL(base).host}${SITES_PATH_PREFIX}/`, suffix: "" };
  }
  return { prefix: "", suffix: `.${config.rootDomain}` };
}
