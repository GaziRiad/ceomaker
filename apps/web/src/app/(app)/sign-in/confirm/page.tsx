import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Blueprint, Wordmark } from "@/components/ui";
import { CONFIRM_ACTION, readLinkParams } from "@/lib/sign-in-link";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

/**
 * Where a sign-in email's link opens. Opening it changes nothing (email scanners open links to
 * check them); the button posts the link back to be used. No script presses it for the visitor.
 */
async function Confirm({
  searchParams,
}: {
  searchParams: PageProps<"/sign-in/confirm">["searchParams"];
}) {
  const query = await searchParams;
  const params = readLinkParams((name) => query[name]);

  return (
    <Blueprint className="flex w-full max-w-[440px] flex-col gap-[18px] bg-neutral-100 p-8 shadow-lg">
      <Wordmark size={20} />
      {params ? (
        <>
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 font-heading text-[40px] leading-none font-semibold uppercase">
              One last step
            </h1>
            <span className="text-neutral-700">Press the button to sign in to CEOMaker.</span>
          </div>
          <form method="post" action={CONFIRM_ACTION} className="flex flex-col">
            {Object.entries(params).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ justifyContent: "center", padding: "13px 16px", fontSize: 16 }}
            >
              Sign in to CEOMaker
            </button>
          </form>
          <span className="text-[13px] text-neutral-600">
            This step keeps your link safe from email security checks, which open links before you
            do.
          </span>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 font-heading text-[40px] leading-none font-semibold uppercase">
              Link incomplete
            </h1>
            <span className="text-neutral-700">
              This sign-in link is missing part of its address. Ask for a new one and open it from
              the email.
            </span>
          </div>
          <Link href="/sign-in" className="btn btn-primary self-start">
            Get a new link
          </Link>
        </>
      )}
    </Blueprint>
  );
}

export default function ConfirmSignInPage(props: PageProps<"/sign-in/confirm">) {
  return (
    <main
      className="flex min-h-dvh items-center justify-center px-5 py-10"
      style={{
        background:
          "radial-gradient(800px 420px at 50% 0%, var(--color-accent-100), transparent 70%)",
      }}
    >
      <Suspense fallback={null}>
        <Confirm searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
