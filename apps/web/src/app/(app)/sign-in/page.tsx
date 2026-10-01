import { decodeAnswers } from "@ceomaker/schema";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { googleSignInEnabled } from "@/lib/env";
import { safeCallbackPath } from "@/lib/redirects";
import { SignInCard } from "./sign-in-card";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

const ERRORS: Record<string, string> = {
  link: "That sign-in link has expired or was already used. Ask for a new one below.",
  google: "Google sign-in didn't complete. Try again, or use your email instead.",
};

async function SignIn({ searchParams }: { searchParams: PageProps<"/sign-in">["searchParams"] }) {
  const params = await searchParams;
  const callbackURL = safeCallbackPath(params.callbackURL) ?? "/dashboard";
  if (await getSession()) redirect(callbackURL);

  const fromStart = params.from === "start";
  // New accounts from the questions flow get the name they typed there.
  const encoded = new URL(callbackURL, "https://app.invalid").searchParams.get("a");
  const name = encoded ? (decodeAnswers(encoded)?.name ?? null) : null;
  const error = typeof params.error === "string" ? (ERRORS[params.error] ?? null) : null;

  return (
    <SignInCard
      fromStart={fromStart}
      callbackURL={callbackURL}
      name={name}
      googleEnabled={googleSignInEnabled()}
      initialError={error}
    />
  );
}

export default function SignInPage(props: PageProps<"/sign-in">) {
  return (
    <main
      className="flex min-h-dvh items-center justify-center px-5 py-10"
      style={{
        background:
          "radial-gradient(800px 420px at 50% 0%, var(--color-accent-100), transparent 70%)",
      }}
    >
      <Suspense fallback={null}>
        <SignIn searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
