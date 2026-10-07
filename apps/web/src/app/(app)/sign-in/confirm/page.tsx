import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Blueprint, Wordmark } from "@/components/ui";
import { CONFIRM_ACTION, readLinkParams } from "@/lib/sign-in-link";
import { AutoContinue } from "./auto-continue";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

/**
 * Where a sign-in email's link opens. Opening it changes nothing (email scanners open links to
 * check them); a script posts the link back to be used, so people go straight through.
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
              Signing you in
            </h1>
            <span role="status" className="text-neutral-700">
              One moment…
            </span>
          </div>
          <AutoContinue action={CONFIRM_ACTION}>
            {Object.entries(params).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
          </AutoContinue>
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
