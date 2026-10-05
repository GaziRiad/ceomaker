import Link from "next/link";
import { Suspense, type CSSProperties } from "react";
import { Wordmark } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { SignOutButton } from "../dashboard/sign-out-button";

// What the public pages share: header, footer and the section styles.

export const pad = "clamp(20px,4vw,40px)";
export const sectionTitle =
  "m-0 font-heading text-[clamp(40px,5vw,64px)] leading-none font-semibold uppercase";
export const kicker = "text-[13px] tracking-[0.12em] text-accent-700 uppercase";

export function delay(ms: number): CSSProperties {
  return { "--delay": `${ms}ms` } as CSSProperties;
}

const primaryHeaderButton: CSSProperties = { padding: "10px 16px" };
/** Phones get 44px tap targets in the header (Templates Page handoff). */
const tap = "max-md:min-h-11";

/** Sign in and Start free, or Dashboard and Sign out for someone already signed in. */
async function AccountActions() {
  const session = await getSession();
  if (session) {
    return (
      <>
        <SignOutButton />
        <Link href="/dashboard" className={`btn btn-primary ${tap}`} style={primaryHeaderButton}>
          Dashboard
        </Link>
      </>
    );
  }
  return (
    <>
      <Link href="/sign-in" className={`btn btn-ghost ${tap} max-md:px-2.5`}>
        Sign in
      </Link>
      <Link href="/start" className={`btn btn-primary ${tap}`} style={primaryHeaderButton}>
        Start free
      </Link>
    </>
  );
}

/** Holds the buttons' space while the session is checked, so nothing shows the wrong state. */
function AccountActionsPlaceholder() {
  return (
    <span aria-hidden className="invisible flex items-center gap-3 md:gap-7">
      <span className={`btn btn-ghost ${tap} max-md:px-2.5`}>Sign in</span>
      <span className={`btn btn-primary ${tap}`} style={primaryHeaderButton}>
        Start free
      </span>
    </span>
  );
}

const NAV: [string, string][] = [
  ["/templates", "Templates"],
  ["/#how", "How it works"],
  ["/#pricing", "Pricing"],
  ["/#faq", "FAQ"],
];

/** `current`: the page's own address, marked in the menu. */
export function Header({ current }: { current?: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-divider bg-bg/88 backdrop-blur-[10px]">
      <div
        className="mx-auto flex h-[68px] max-w-[1200px] items-center gap-3 text-[15px] md:gap-7"
        style={{ paddingInline: pad }}
      >
        <Link href="/" className="mr-auto no-underline text-text hover:text-text">
          <Wordmark size={24} />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          {NAV.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={href === current ? "page" : undefined}
              className="text-text no-underline hover:text-accent-700 aria-[current=page]:text-accent-700"
            >
              {label}
            </Link>
          ))}
        </nav>
        <Suspense fallback={<AccountActionsPlaceholder />}>
          <AccountActions />
        </Suspense>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer
      className="mx-auto flex max-w-[1200px] flex-col items-start gap-3 text-sm text-neutral-700 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4"
      style={{ padding: `28px ${pad} 40px` }}
    >
      <Wordmark size={18} className="text-text" />
      <span>Personal websites for people who lead.</span>
      <span className="flex items-center gap-1 sm:gap-5">
        <Link href="/terms" className="inline-flex min-h-11 items-center pr-4 sm:min-h-0 sm:pr-0">
          Terms
        </Link>
        <Link href="/privacy" className="inline-flex min-h-11 items-center pr-4 sm:min-h-0 sm:pr-0">
          Privacy
        </Link>
        <span>© 2026</span>
      </span>
    </footer>
  );
}
