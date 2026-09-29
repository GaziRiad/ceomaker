"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { buttonStyles } from "./components";

const inputStyles =
  "mt-2 block min-h-11 w-full rounded-md border border-line bg-white px-3.5 text-base text-ink placeholder:text-stone/60 focus:border-navy focus:ring-2 focus:ring-navy/20 focus:outline-none";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isSignUp = mode === "sign-up";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    const result = isSignUp
      ? await authClient.signUp.email({ email, password, name: String(form.get("name") ?? "") })
      : await authClient.signIn.email({ email, password });

    if (result.error) {
      setPending(false);
      setError(
        result.error.status === 429
          ? "Too many attempts. Please wait a minute and try again."
          : (result.error.message ?? "Something went wrong. Please try again."),
      );
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate={false}>
      {isSignUp ? (
        <label className="block text-sm font-medium">
          Full name
          <input name="name" required maxLength={60} autoComplete="name" className={inputStyles} />
        </label>
      ) : null}
      <label className="block text-sm font-medium">
        Email
        <input name="email" type="email" required autoComplete="email" className={inputStyles} />
      </label>
      <label className="block text-sm font-medium">
        Password
        <input
          name="password"
          type="password"
          required
          minLength={isSignUp ? 12 : undefined}
          maxLength={128}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          className={inputStyles}
        />
        {isSignUp ? (
          <span className="mt-1.5 block text-xs text-stone">At least 12 characters.</span>
        ) : null}
      </label>

      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className={`${buttonStyles.primary} w-full`}>
        {pending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
      </button>

      <p className="text-center text-sm text-stone">
        {isSignUp ? "Already have an account? " : "New to CEOMaker? "}
        <Link
          href={isSignUp ? "/sign-in" : "/sign-up"}
          className="font-semibold text-navy underline-offset-4 hover:underline"
        >
          {isSignUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
