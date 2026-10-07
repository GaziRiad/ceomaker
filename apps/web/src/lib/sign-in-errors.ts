/** Where a failed sign-in came from. Sent as `via`; the auth library adds its own `error` code. */
export type SignInSource = "link" | "google";

/**
 * Where the auth library sends people back to when a sign-in fails. It keeps where they were
 * going (and that they came from the questions), so signing in from there still gets them there.
 */
export function signInErrorPath(
  source: SignInSource,
  from?: { callbackURL: string; fromStart: boolean },
): string {
  const params = new URLSearchParams({ via: source });
  if (from?.fromStart) params.set("from", "start");
  if (from && from.callbackURL !== "/dashboard") params.set("callbackURL", from.callbackURL);
  return `/sign-in?${params}`;
}

function first(value: unknown): string | null {
  const item = Array.isArray(value) ? value[0] : value;
  return typeof item === "string" ? item : null;
}

/**
 * The message for a failed sign-in. The library replaces `error` for email links and appends
 * another one for Google, so the source travels separately and repeated values are tolerated.
 */
export function signInErrorMessage(via: unknown, error: unknown): string | null {
  const source = first(via);
  const code = first(error);
  if (source === "link") {
    return "That sign-in link has expired or was already used. Enter the code from the same email, or ask for a new one.";
  }
  if (source !== "google") return null;
  switch (code) {
    case "access_denied":
      return "Google sign-in was cancelled. Try again, or use your email instead.";
    case "account_not_linked":
      return "This email already has an account. Sign in with an email link once, and Google will work after that.";
    default:
      return "Google sign-in didn't complete. Try again, or use your email instead.";
  }
}
