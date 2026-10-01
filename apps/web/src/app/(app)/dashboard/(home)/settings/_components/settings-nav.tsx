"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Globe, User } from "@/components/icons";

const SECTIONS = [
  { href: "/dashboard/settings", label: "Site", Icon: Globe },
  { href: "/dashboard/settings/account", label: "Account", Icon: User },
  { href: "/dashboard/settings/billing", label: "Billing", Icon: CreditCard },
] as const;

/** A side menu on wider screens, three segments on phones. */
export function SettingsNav() {
  const path = usePathname();
  return (
    <>
      <nav aria-label="Settings" className="hidden flex-col gap-0.5 md:flex">
        {SECTIONS.map(({ href, label, Icon }) => {
          const current = path === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={current ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 px-3.5 text-base no-underline transition-colors ${
                current
                  ? "bg-accent-100 text-accent-800 hover:text-accent-800"
                  : "text-text hover:bg-neutral-200 hover:text-text"
              }`}
            >
              <Icon />
              {label}
            </Link>
          );
        })}
      </nav>
      <nav aria-label="Settings" className="seg grid w-full grid-cols-3 md:hidden">
        {SECTIONS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={path === href ? "page" : undefined}
            className="seg-opt min-h-11 justify-center text-[15px] text-text no-underline hover:text-text"
          >
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
