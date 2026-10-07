// Cookie consent for the product's own pages (customer sites set no cookies and never load this).
//
// Visitors in the EEA, the UK and Switzerland choose: Accept (PostHog and Google Ads may store
// cookies) or Reject (PostHog counts them without cookies, Google gets no cookies). Everyone else
// gets a short notice and cookies by default; they can still reject on the privacy page.
// Where someone is comes from Vercel's country header, passed to the page by proxy.ts in a
// cookie that holds only "eu" or "other".

/** Set by proxy.ts on product pages. Not an identifier: only where the rules require a choice. */
export const REGION_COOKIE = "ceomaker_region";
/** The visitor's choice, kept in their browser. */
const CHOICE_KEY = "ceomaker:consent";

export type ConsentRegion = "eu" | "other";
export type ConsentChoice = "granted" | "denied";

/** EU, the rest of the EEA (Iceland, Liechtenstein, Norway), the UK and Switzerland. */
const CONSENT_COUNTRIES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  "IS",
  "LI",
  "NO",
  "GB",
  "CH",
]);

/** Where a country's visitors stand. Unknown counts as "eu": asking is the safe side. */
export function regionForCountry(country: string | null | undefined): ConsentRegion {
  const code = country?.trim().toUpperCase();
  return code && /^[A-Z]{2}$/.test(code) && !CONSENT_COUNTRIES.has(code) ? "other" : "eu";
}

/** This visitor's region, from the cookie proxy.ts sets. */
export function consentRegion(): ConsentRegion {
  if (typeof document === "undefined") return "eu";
  const match = document.cookie.match(new RegExp(`(?:^|; )${REGION_COOKIE}=(eu|other)(?:;|$)`));
  return match?.[1] === "other" ? "other" : "eu";
}

/** The choice this browser made, or null before one. */
export function storedChoice(): ConsentChoice | null {
  try {
    const value = localStorage.getItem(CHOICE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

/** Cookies may be stored: accepted here, or outside the consent region without a rejection. */
export function cookiesAllowed(): boolean {
  const choice = storedChoice();
  return choice ? choice === "granted" : consentRegion() === "other";
}

const listeners = new Set<(allowed: boolean) => void>();

/** Hears every change of choice (analytics and ads apply it). Returns the unsubscribe. */
export function onConsentChange(listener: (allowed: boolean) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Records a choice and applies it everywhere at once. */
export function chooseConsent(choice: ConsentChoice): void {
  try {
    localStorage.setItem(CHOICE_KEY, choice);
  } catch {
    // Storage blocked: the choice holds for this page load.
  }
  for (const listener of listeners) listener(choice === "granted");
}
