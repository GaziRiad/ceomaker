/**
 * Site analytics: first-party, cookieless and anonymous. Each event keeps the page, the kind of
 * source, the device type and an approximate place (country, city). Visitors are counted with a
 * hash that changes every day, so nobody can be followed from one day to the next.
 */

/** Where a visit came from, as owners think about it. */
export const ANALYTICS_SOURCES = ["linkedin", "google", "direct", "email", "other"] as const;
export type AnalyticsSource = (typeof ANALYTICS_SOURCES)[number];

/** Links on a site whose clicks are counted. */
export const CLICK_KINDS = ["email", "phone", "linkedin", "site", "other"] as const;
export type ClickKind = (typeof CLICK_KINDS)[number];

export const DEVICE_KINDS = ["phone", "desktop", "tablet"] as const;
export type DeviceKind = (typeof DEVICE_KINDS)[number];

export const ANALYTICS_EVENT_KINDS = ["pageview", "click"] as const;
export type AnalyticsEventKind = (typeof ANALYTICS_EVENT_KINDS)[number];

/** The date ranges the dashboard offers, in days. */
export const ANALYTICS_RANGES = [7, 30, 90] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

/** Below this many visitors since publishing, the dashboard lists each visit instead of charts. */
export const FEW_VISITORS = 10;
