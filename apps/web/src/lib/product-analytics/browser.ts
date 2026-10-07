import posthog from "posthog-js";
import { POSTHOG_UI_HOST, posthogKey, RELAY_PATH } from "./config";
import { RECORDING_OPTIONS } from "./recording";
import { scrubEvent } from "./scrub";
import { cookiesAllowed, onConsentChange } from "../consent";
import { encodeVisitSource, readVisitSource, type VisitSource } from "./visit-source";

// PostHog in the browser, on the product's own pages only (the (app) layout starts it; customer
// sites never load it). With cookies allowed (see lib/consent.ts) it keeps the visitor's id in a
// first-party cookie on this host, so a visit is one visitor across pages and days. Without
// them it stores nothing on the device: PostHog's servers count the visitor from a daily-salted
// hash instead (cookieless mode), and a choice made later switches over. Our own admins'
// browsers are flagged and left out entirely (INTERNAL_KEY).

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
    // Cookies only with consent (or outside the consent region); otherwise the visitor is counted
    // without storing anything, from a hash PostHog's servers make. Needs "Cookieless server hash
    // mode" on in the PostHog project.
    cookieless_mode: "on_reject",
    opt_out_capturing_by_default: !cookiesAllowed(),
    // On this host only: customer sites live on its sibling subdomains and must never get it.
    cross_subdomain_cookie: false,
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
    // Our own admins' events are dropped here, whatever the consent mode.
    before_send: (event) => (internal ? null : scrubEvent(event, location.host)),
  });
  // Outside the consent region cookies are on until rejected: say so to PostHog, which otherwise
  // waits for a choice before counting anything.
  if (cookiesAllowed() && posthog.get_explicit_consent_status() === "pending") {
    posthog.opt_in_capturing({ captureEventName: false });
  }
  // A choice on the banner (or the privacy page) applies at once.
  onConsentChange((allowed) => {
    if (allowed) posthog.opt_in_capturing({ captureEventName: false });
    else posthog.opt_out_capturing();
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
  if (isInternal) internal = true;
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
