"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, CreditCard, LogOut, User } from "@/components/icons";
import { Corners, Wordmark } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { clearFlow } from "../../../start/storage";

const TABS = [
  { href: "/dashboard", label: "Overview", match: (path: string) => path === "/dashboard" },
  {
    href: "/dashboard/messages",
    label: "Messages",
    match: (path: string) => path.startsWith("/dashboard/messages"),
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    match: (path: string) => path.startsWith("/dashboard/settings"),
  },
] as const;

/** Sign out here, and forget answers this browser kept for the questions. */
export async function signOutEverywhereInThisBrowser() {
  clearFlow();
  await authClient.signOut();
}

/** The dashboard's sticky header: wordmark, account menu and the three tabs. */
export function DashboardBar({
  name,
  email,
  initials,
  unread,
}: {
  name: string;
  email: string;
  initials: string;
  unread: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === "Escape"
          : !menu.current?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  // Close the menu after navigating.
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(false);
  }

  const signOut = async () => {
    setOpen(false);
    await signOutEverywhereInThisBrowser();
    router.replace("/");
    router.refresh();
  };

  const item =
    "flex min-h-11 w-full items-center gap-3 px-4 text-left text-[15px] text-text no-underline transition-colors hover:bg-neutral-200 hover:text-text";

  return (
    <header className="sticky top-0 z-20 border-b border-divider bg-neutral-100">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-5 px-5 sm:h-16 sm:px-10">
        <Link href="/dashboard" className="flex-1 text-text no-underline hover:text-text">
          <Wordmark />
        </Link>
        <span className="hidden text-sm text-neutral-700 sm:inline">{email}</span>
        <div ref={menu} className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Account menu"
            onClick={() => setOpen((current) => !current)}
            className="-m-1 flex min-h-11 items-center gap-1.5 p-1 text-text"
          >
            <span className="flex size-[34px] items-center justify-center rounded-full bg-accent-200 text-[13px] font-medium text-accent-800">
              {initials}
            </span>
            <span
              className="flex text-neutral-700 transition-transform duration-[250ms]"
              style={{ transform: open ? "rotate(180deg)" : "none" }}
            >
              <ChevronDown size={16} />
            </span>
          </button>
          {open ? (
            <div
              role="menu"
              className="blueprint cm-drop absolute top-[calc(100%+10px)] right-0 z-30 flex w-[248px] flex-col bg-neutral-100 py-1.5 shadow-md"
            >
              <Corners />
              <div className="flex flex-col border-b border-divider px-4 pt-2.5 pb-3">
                <span className="font-medium">{name}</span>
                <span className="text-[13px] [overflow-wrap:anywhere] text-neutral-700">
                  {email}
                </span>
              </div>
              <Link role="menuitem" href="/dashboard/settings/account" className={item}>
                <span className="flex text-neutral-700">
                  <User />
                </span>
                Account
              </Link>
              <Link role="menuitem" href="/dashboard/settings/billing" className={item}>
                <span className="flex text-neutral-700">
                  <CreditCard />
                </span>
                Billing
              </Link>
              <button role="menuitem" type="button" className={item} onClick={signOut}>
                <span className="flex text-neutral-700">
                  <LogOut />
                </span>
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <nav
        aria-label="Dashboard"
        className="mx-auto flex max-w-[1200px] gap-6 px-5 sm:gap-8 sm:px-10"
      >
        {TABS.map((tab) => {
          const current = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={current ? "page" : undefined}
              className="flex h-[46px] items-center gap-2 text-[15px] font-medium no-underline transition-[color,box-shadow] duration-200 hover:text-text"
              style={{
                color: current ? "var(--color-text)" : "var(--color-neutral-700)",
                boxShadow: `inset 0 -2px 0 ${current ? "var(--color-accent)" : "transparent"}`,
              }}
            >
              {tab.label}
              {tab.href === "/dashboard/messages" && unread > 0 ? (
                <span className="tag tag-accent" style={{ padding: "1px 7px", fontSize: 12 }}>
                  {unread}
                  <span className="sr-only"> new</span>
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

/** Painted from the static shell while the session loads. */
export function DashboardBarSkeleton() {
  return (
    <header className="sticky top-0 z-20 border-b border-divider bg-neutral-100">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-5 px-5 sm:h-16 sm:px-10">
        <span className="flex-1">
          <Wordmark />
        </span>
        <span className="size-[34px] rounded-full bg-neutral-200" />
      </div>
      <nav
        aria-label="Dashboard"
        className="mx-auto flex max-w-[1200px] gap-6 px-5 sm:gap-8 sm:px-10"
      >
        {TABS.map((tab) => (
          <span
            key={tab.href}
            className="flex h-[46px] items-center text-[15px] font-medium text-neutral-700"
          >
            {tab.label}
          </span>
        ))}
      </nav>
    </header>
  );
}
