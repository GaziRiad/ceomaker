import posthog from "posthog-js";
import { POSTHOG_UI_HOST, posthogKey, RELAY_PATH } from "./config";
import { RECORDING_OPTIONS } from "./recording";
import { scrubEvent } from "./scrub";
import { encodeVisitSource, readVisitSource, type VisitSource } from "./visit-source";

// PostHog in the browser, on the product's own pages only (the (app) layout starts it; customer
// sites never load it). Nothing is stored in the browser: the visitor's id lives in memory for
// this page load, so a new tab or a reload is a new visitor until they sign in. The one exception
// is our own admins' browsers, flagged so they're left out entirely (INTERNAL_KEY).

let started = false;
let internal = false;
let visit: VisitSource | null = null;

/**
 * Set in a browser where one of our own admin accounts has signed in, so its visits stay out of
 * the numbers on every page, including the home page before sign-in (which can't know who it
 * is). A preference flag, not an identifier: it holds no id and is never sent anywhere.
 */
const INTERNAL_KEY = "ceomaker:internal";

function internalBrowser(): boolean {
  try {
    return localStorage.getItem(INTERNAL_KEY) === "1";
  } catch {
    return false;
  }
}

function on(): boolean {
  return started && !internal && posthogKey() !== null;
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
  internal = internalBrowser();
  const key = posthogKey();
  if (!key || internal) return;
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
    // Recordings with everything personal hidden (see recording.ts). They start once session
    // replay is switched on in the PostHog project; the masking here can't be loosened there.
    session_recording: RECORDING_OPTIONS,
    enable_recording_console_log: false,
    // Off: clicks would send the text people type into their site; heatmaps aren't used, nor
    // the rest.
    autocapture: false,
    rageclick: false,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    disable_surveys: true,
    disable_product_tours: true,
    disable_conversations: true,
    // Page speed (LCP, CLS, FCP, INP) from Google's web-vitals library; nothing is stored.
    capture_performance: { web_vitals: true, network_timing: false },
    // The project's remote settings load (recordings need them); feature flags aren't used.
    advanced_disable_feature_flags: true,
    mask_personal_data_properties: true,
    before_send: (event) => scrubEvent(event, location.host),
  });
}

/** Links this page load to the signed-in account. `internal` marks our own accounts. */
export function identifyAccount(id: string, isInternal: boolean): void {
  startProductAnalytics();
  if (isInternal) {
    try {
      localStorage.setItem(INTERNAL_KEY, "1");
    } catch {
      // Storage blocked: this page load is still marked below.
    }
  }
  if (!on() || posthog.get_distinct_id() === id) return;
  posthog.identify(id, isInternal ? { internal: true } : undefined);
  // From here on this browser sends nothing (the flag above covers later page loads).
  if (isInternal) {
    posthog.opt_out_capturing();
    internal = true;
  }
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
