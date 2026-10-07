// Sign-in emails carry a link and a 6-digit code. Company email security (Microsoft Safe Links,
// Mimecast, Proofpoint and others) opens every link in an email to check it; a link that signed
// in when opened would be used up by that scan, and the person's own click would fail.
// So the link opens a confirm page that changes nothing by itself: a script on it posts the link
// back at once (most scanners fetch pages without running scripts), and only then does the auth
// library check it, use it and sign in. Scanners that do run scripts can still use a link up;
// the code is the fallback for that, since no scanner types it in.

/** How long a sign-in link and its code stay valid. Both are single-use. */
export const MAGIC_LINK_MINUTES = 60;
/** The same, in words, for emails and pages. */
export const MAGIC_LINK_LIFETIME = "1 hour";
/** Digits in the sign-in code. */
export const SIGN_IN_CODE_LENGTH = 6;

/** The auth library's endpoint that checks a link, signs in and redirects (its default path). */
export const VERIFY_PATH = "/api/auth/magic-link/verify";
/** The page the email links to. */
export const CONFIRM_PAGE = "/sign-in/confirm";
/** Where it posts. */
export const CONFIRM_ACTION = "/api/sign-in/confirm";

/** The link's own parameters, as the auth library writes them. Nothing else is carried. */
export const LINK_PARAMS = [
  "token",
  "callbackURL",
  "newUserCallbackURL",
  "errorCallbackURL",
] as const;
export type LinkParams = Partial<Record<(typeof LINK_PARAMS)[number], string>>;

// The callback addresses carry the questions' answers (up to 4,000 characters, see decodeAnswers).
const MAX_PARAM_LENGTH = 8192;

/** The link's parameters from any source (a URL, a form, a page's query), or null without a token. */
export function readLinkParams(read: (name: string) => unknown): LinkParams | null {
  const params: LinkParams = {};
  for (const name of LINK_PARAMS) {
    const value = read(name);
    if (typeof value === "string" && value && value.length <= MAX_PARAM_LENGTH) {
      params[name] = value;
    }
  }
  return params.token ? params : null;
}

/**
 * The address the email links to: the confirm page, with the auth library's link parameters.
 * A link of any other shape (a library change) goes out as it is, so sign-in still works.
 */
export function confirmLinkFor(verifyUrl: string): string {
  const url = new URL(verifyUrl);
  const params = readLinkParams((name) => url.searchParams.get(name));
  if (url.pathname !== VERIFY_PATH || !params) return verifyUrl;
  const confirm = new URL(CONFIRM_PAGE, url.origin);
  for (const [name, value] of Object.entries(params)) confirm.searchParams.set(name, value);
  return confirm.toString();
}

/** Where the post goes: the auth library's check, on our own host, or null. */
export function verifyPathFor(read: (name: string) => unknown): string | null {
  const params = readLinkParams(read);
  return params ? `${VERIFY_PATH}?${new URLSearchParams(params)}` : null;
}
