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

/** Sign in and Start free, or Dashboard and Sign out for someone already signed in. */
async function AccountActions() {
  const session = await getSession();
  if (session) {
    return (
      <>
        <SignOutButton />
        <Link href="/dashboard" className="btn btn-primary" style={primaryHeaderButton}>
          Dashboard
        </Link>
      </>
    );
  }
  return (
    <>
      <Link href="/sign-in" className="btn btn-ghost">
        Sign in
      </Link>
      <Link href="/start" className="btn btn-primary" style={primaryHeaderButton}>
        Start free
      </Link>
    </>
  );
}

/** Holds the buttons' space while the session is checked, so nothing shows the wrong state. */
function AccountActionsPlaceholder() {
  return (
    <span aria-hidden className="invisible flex items-center gap-7">
      <span className="btn btn-ghost">Sign in</span>
      <span className="btn btn-primary" style={primaryHeaderButton}>
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

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-divider bg-bg/88 backdrop-blur-[10px]">
      <div
        className="mx-auto flex h-[68px] max-w-[1200px] items-center gap-7 text-[15px]"
        style={{ paddingInline: pad }}
      >
        <Link href="/" className="mr-auto no-underline text-text hover:text-text">
          <Wordmark size={24} />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="text-text no-underline hover:text-accent-700">
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
      className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 text-sm text-neutral-700"
      style={{ padding: `28px ${pad} 40px` }}
    >
      <Wordmark size={18} className="text-text" />
      <span>Personal websites for people who lead.</span>
      <span className="flex gap-5">
        <Link href="/templates">Templates</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <span>© 2026</span>
      </span>
    </footer>
  );
}
