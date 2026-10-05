// Product analytics (PostHog) for the product's own pages: never customer sites, no cookies or
// browser storage, EU hosting. See README, "Product analytics (PostHog)".

/** Where the browser sends PostHog's requests: our own address, forwarded by proxy.ts. */
export const RELAY_PATH = "/relay";

/** PostHog's EU cloud (Frankfurt). */
export const POSTHOG_API_HOST = "https://eu.i.posthog.com";
export const POSTHOG_ASSETS_HOST = "https://eu-assets.i.posthog.com";
export const POSTHOG_UI_HOST = "https://eu.posthog.com";

/** The project's key. It's public (it can only send events); unset turns product analytics off. */
export function posthogKey(): string | null {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() || null;
}

export function isRelayPath(pathname: string): boolean {
  return pathname === RELAY_PATH || pathname.startsWith(`${RELAY_PATH}/`);
}

/** Where a relayed request goes at PostHog: its scripts come from the assets host. */
export function relayTarget(pathname: string, search: string): string {
  const rest = pathname.slice(RELAY_PATH.length) || "/";
  const host =
    rest.startsWith("/static/") || rest.startsWith("/array/")
      ? POSTHOG_ASSETS_HOST
      : POSTHOG_API_HOST;
  return `${host}${rest}${search}`;
}
