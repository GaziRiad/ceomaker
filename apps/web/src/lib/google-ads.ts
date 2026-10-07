// Google Ads on the product's own pages: the Google tag with Consent Mode v2, and the sign-up
// conversion. Off until NEXT_PUBLIC_GOOGLE_ADS_ID is set. Customer sites never load it.

/** The Google Ads account's tag id ("AW-123456789"), or null when ads aren't set up. */
export function googleAdsId(): string | null {
  const id = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim();
  return id && /^AW-\d+$/.test(id) ? id : null;
}

/** The sign-up conversion's label, from the conversion action in Google Ads. */
export function googleAdsSignupLabel(): string | null {
  return process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL?.trim() || null;
}

/**
 * Set by /api/welcome for a new account, read once by the Google tag to count the sign-up.
 * Holds "1" and lasts ten minutes; it says nothing about the person.
 */
export const SIGNUP_COOKIE = "ceomaker_signup";

/** Where the Google tag loads from and talks to, for the content security policy. */
export const GOOGLE_ADS_ORIGINS = {
  script: ["https://www.googletagmanager.com"],
  connect: [
    "https://www.googletagmanager.com",
    "https://www.google.com",
    "https://googleads.g.doubleclick.net",
    "https://pagead2.googlesyndication.com",
  ],
  frame: ["https://td.doubleclick.net", "https://www.googletagmanager.com"],
} as const;
