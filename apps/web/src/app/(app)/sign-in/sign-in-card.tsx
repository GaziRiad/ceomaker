"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Blueprint, Mail, Wordmark } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export function SignInCard({
  fromStart,
  callbackURL,
  name,
  googleEnabled,
  initialError,
}: {
  fromStart: boolean;
  callbackURL: string;
  name: string | null;
  googleEnabled: boolean;
  initialError: string | null;
}) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState<"email" | "google" | null>(null);

  async function sendLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending("email");
    const result = await authClient.signIn.magicLink({
      email: email.trim(),
      ...(name ? { name } : {}),
      callbackURL,
      newUserCallbackURL: callbackURL,
      errorCallbackURL: "/sign-in?error=link",
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
    setSentTo(email.trim());
  }

  async function continueWithGoogle() {
    setError(null);
    setPending("google");
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL,
      newUserCallbackURL: callbackURL,
      errorCallbackURL: "/sign-in?error=google",
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
            <span
              aria-hidden
              className="flex size-[22px] items-center justify-center rounded-full border border-divider text-[13px] font-bold"
            >
              G
            </span>
            Continue with Google
          </button>
          <div className="flex items-center gap-3 text-[13px] text-neutral-600">
            <span className="h-px flex-1 bg-divider" />
            or
            <span className="h-px flex-1 bg-divider" />
          </div>
        </>
      ) : null}
      {sentTo ? (
        <div role="status" className="flex flex-col gap-1.5 border border-accent bg-accent-100 p-4">
          <span className="font-medium">Check your inbox</span>
          <span className="text-[15px] text-neutral-800">
            We sent a sign-in link to {sentTo}. It works once and expires in 15 minutes.
          </span>
          <button
            type="button"
            className="btn btn-ghost self-start"
            style={{ paddingLeft: 0 }}
            onClick={() => setSentTo(null)}
          >
            Use a different email
          </button>
        </div>
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
        No password needed. Your answers are saved to your account and stay private.
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
