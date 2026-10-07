"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Blueprint, Mail, Wordmark } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { trackEvent, welcomeUrl } from "@/lib/product-analytics/browser";
import { signInErrorPath } from "@/lib/sign-in-errors";
import { MAGIC_LINK_LIFETIME, SIGN_IN_CODE_LENGTH } from "@/lib/sign-in-link";

/** Google's "G" mark, as its sign-in branding guidelines require on the button. */
function GoogleMark() {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 48 48">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/** What to say when a code doesn't sign in, by the auth library's error. */
function codeErrorMessage(error: { status?: number; code?: string }): string {
  if (error.status === 429) return "Too many tries. Wait a minute and try again.";
  switch (error.code) {
    case "TOO_MANY_ATTEMPTS":
      return "Too many wrong codes. Ask for a new email below.";
    case "OTP_EXPIRED":
      return "That code has expired. Ask for a new email below.";
    default:
      return "That code didn't work. Check it against the latest email and try again.";
  }
}

export function SignInCard({
  fromStart,
  callbackURL,
  name,
  googleEnabled,
  initialError,
  linkFailed,
}: {
  fromStart: boolean;
  callbackURL: string;
  name: string | null;
  googleEnabled: boolean;
  initialError: string | null;
  /** Back from a sign-in link that didn't work: the code from the same email is the way in. */
  linkFailed: boolean;
}) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  // The code form shows after sending, and straight away after a failed link (with the email).
  const [enteringCode, setEnteringCode] = useState(linkFailed);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState<"email" | "code" | "google" | null>(null);

  async function sendLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending("email");
    const result = await authClient.signIn.magicLink({
      email: email.trim(),
      ...(name ? { name } : {}),
      callbackURL,
      newUserCallbackURL: welcomeUrl(callbackURL),
      errorCallbackURL: signInErrorPath("link", { callbackURL, fromStart }),
    });
    setPending(null);
    if (result.error) {
      setError(
        result.error.status === 429
          ? "Too many requests. Wait a minute and try again."
          : "We couldn't send the email. Check the address and try again.",
      );
      return;
    }
    trackEvent("sign_in_requested", { method: "email", from_start: fromStart });
    setSentTo(email.trim());
    setCode("");
    setEnteringCode(true);
  }

  async function signInWithCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending("code");
    const result = await authClient.signIn.emailOtp({
      email: (sentTo ?? email).trim(),
      otp: code,
      ...(name ? { name } : {}),
    });
    if (result.error) {
      setPending(null);
      setError(codeErrorMessage(result.error));
      return;
    }
    // New accounts are counted there; for others it only goes on to where they were going.
    window.location.assign(welcomeUrl(callbackURL));
  }

  function askForNewEmail() {
    setSentTo(null);
    setEnteringCode(false);
    setCode("");
    setError(null);
  }

  async function continueWithGoogle() {
    setError(null);
    setPending("google");
    trackEvent("sign_in_requested", { method: "google", from_start: fromStart });
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL,
      newUserCallbackURL: welcomeUrl(callbackURL),
      errorCallbackURL: signInErrorPath("google", { callbackURL, fromStart }),
    });
    if (result.error) {
      setPending(null);
      setError("Google sign-in isn't available right now. Use your email instead.");
    }
  }

  return (
    <Blueprint className="flex w-full max-w-[440px] flex-col gap-[18px] bg-neutral-100 p-8 shadow-lg">
      <Wordmark size={20} />
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 font-heading text-[40px] leading-none font-semibold uppercase">
          {fromStart ? "Save your site" : "Welcome back"}
        </h1>
        <span className="text-neutral-700">
          {fromStart
            ? "Create a free account to keep your answers and continue to the builder."
            : "Sign in to keep building."}
        </span>
      </div>
      {googleEnabled ? (
        <>
          <button
            type="button"
            className="btn btn-secondary"
            style={{
              justifyContent: "flex-start",
              gap: 12,
              padding: "13px 16px",
              fontSize: 16,
              background: "var(--color-bg)",
            }}
            disabled={pending !== null}
            onClick={continueWithGoogle}
          >
            <GoogleMark />
            {pending === "google" ? "Opening Google…" : "Continue with Google"}
          </button>
          <div className="flex items-center gap-3 text-[13px] text-neutral-600">
            <span className="h-px flex-1 bg-divider" />
            or
            <span className="h-px flex-1 bg-divider" />
          </div>
        </>
      ) : null}
      {enteringCode ? (
        <form onSubmit={signInWithCode} className="flex flex-col gap-[18px]">
          {sentTo ? (
            <div
              role="status"
              className="flex flex-col gap-1.5 border border-accent bg-accent-100 p-4"
            >
              <span className="font-medium">Check your inbox</span>
              <span className="text-[15px] text-neutral-800">
                We sent a sign-in link and a code to {sentTo}. Open the link, or enter the code
                here. Both work once and expire in {MAGIC_LINK_LIFETIME}.
              </span>
            </div>
          ) : (
            <div className="field">
              <label htmlFor="email">Work email</label>
              <input
                id="email"
                className="input"
                type="email"
                required
                autoComplete="email"
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="code">Code from the email</label>
            <input
              id="code"
              className="input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              pattern={`[0-9]{${SIGN_IN_CODE_LENGTH}}`}
              maxLength={SIGN_IN_CODE_LENGTH}
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, SIGN_IN_CODE_LENGTH))
              }
              placeholder={"0".repeat(SIGN_IN_CODE_LENGTH)}
              style={{ letterSpacing: "0.3em", fontSize: 20 }}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ justifyContent: "center", padding: "13px 16px", fontSize: 16 }}
            disabled={pending !== null || code.length !== SIGN_IN_CODE_LENGTH}
          >
            {pending === "code" ? "Signing in…" : "Sign in"}
          </button>
          <button
            type="button"
            className="btn btn-ghost self-start"
            style={{ paddingLeft: 0 }}
            onClick={askForNewEmail}
          >
            {sentTo ? "Use a different email" : "Email me a new link"}
          </button>
        </form>
      ) : (
        <form onSubmit={sendLink} className="flex flex-col gap-[18px]">
          <div className="field">
            <label htmlFor="email">Work email</label>
            <input
              id="email"
              className="input"
              type="email"
              required
              autoComplete="email"
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ justifyContent: "space-between", padding: "13px 16px", fontSize: 16 }}
            disabled={pending !== null}
          >
            {pending === "email" ? "Sending…" : "Email me a sign-in link"} <Mail />
          </button>
        </form>
      )}
      {error ? (
        <p role="alert" className="m-0 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <span className="text-[13px] text-neutral-600">
        No password needed. Your answers are saved to your account and stay private. By continuing
        you agree to our <Link href="/terms">terms</Link> and{" "}
        <Link href="/privacy">privacy policy</Link>.
      </span>
      <Link
        href={fromStart ? "/start" : "/"}
        className="btn btn-ghost self-start"
        style={{ paddingLeft: 0 }}
      >
        {fromStart ? "Back to questions" : "Back to home"}
      </Link>
    </Blueprint>
  );
}
