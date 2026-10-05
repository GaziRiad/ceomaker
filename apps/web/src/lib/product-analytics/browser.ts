import posthog from "posthog-js";
import { POSTHOG_UI_HOST, posthogKey, RELAY_PATH } from "./config";
import { scrubEvent } from "./scrub";
import { encodeVisitSource, readVisitSource, type VisitSource } from "./visit-source";

// PostHog in the browser, on the product's own pages only (the (app) layout starts it; customer
// sites never load it). Nothing is stored in the browser: the visitor's id lives in memory for
// this page load, so a new tab or a reload is a new visitor until they sign in.

let started = false;
let visit: VisitSource | null = null;

function on(): boolean {
  return started && posthogKey() !== null;
}

/** Starts once per page load. Reads where the visit came from even when PostHog is off. */
export function startProductAnalytics(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  visit = readVisitSource({
    referrer: document.referrer,
    href: location.href,
    ownHost: location.host,
  });
  const key = posthogKey();
  if (!key) return;
  posthog.init(key, {
    api_host: RELAY_PATH,
    ui_host: POSTHOG_UI_HOST,
    defaults: "2026-08-30",
    persistence: "memory",
    // A fresh anonymous id per page load, said explicitly (PostHog warns otherwise).
    ...(typeof crypto.randomUUID === "function"
      ? { bootstrap: { distinctID: crypto.randomUUID() } }
      : {}),
    person_profiles: "identified_only",
    capture_pageview: "history_change",
    capture_exceptions: true,
    // Off: clicks would send the text people type into their site; recordings and heatmaps
    // would show their personal details; the rest isn't used.
    autocapture: false,
    rageclick: false,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    disable_session_recording: true,
    disable_surveys: true,
    disable_product_tours: true,
    disable_conversations: true,
    capture_performance: false,
    // Settings come from this code, not from PostHog's dashboard.
    advanced_disable_flags: true,
    mask_personal_data_properties: true,
    before_send: (event) => scrubEvent(event, location.host),
  });
}

/** Links this page load to the signed-in account. `internal` marks our own accounts. */
export function identifyAccount(id: string, internal: boolean): void {
  startProductAnalytics();
  if (!on() || posthog.get_distinct_id() === id) return;
  posthog.identify(id, internal ? { internal: true } : undefined);
}

/** After signing out, the next person on this browser starts anonymous. */
export function forgetAccount(): void {
  if (on()) posthog.reset();
}

export function trackEvent(
  event: string,
  properties: Record<string, string | number | boolean | null> = {},
): void {
  // Children's effects run before the layout's, so the first event may arrive before the start.
  startProductAnalytics();
  if (on()) posthog.capture(event, properties);
}

/**
 * Where new accounts land after the sign-in link or Google: /api/welcome records the sign-up
 * with this visit's source and id (so its earlier steps join the account), then goes to `next`.
 */
export function welcomeUrl(next: string): string {
  startProductAnalytics();
  const params = new URLSearchParams({ next });
  if (on()) params.set("v", posthog.get_distinct_id());
  if (visit) params.set("src", encodeVisitSource(visit));
  return `/api/welcome?${params}`;
}
