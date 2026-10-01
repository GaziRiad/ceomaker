import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar, Wordmark } from "@/components/ui";

/** Top bar of the builder screens: wordmark / address / status / avatar. */
export function BuilderHeader({
  address,
  status,
  initials,
  children,
  maxWidth = 1320,
}: {
  address: string;
  status: { label: string; tone: "accent" | "neutral" | "warning" };
  initials: string;
  children?: ReactNode;
  maxWidth?: number;
}) {
  return (
    <header className="border-b border-divider bg-neutral-100">
      <div
        className="mx-auto flex h-16 items-center gap-5 text-[15px]"
        style={{ maxWidth, paddingInline: "clamp(20px,3vw,32px)" }}
      >
        <Link href="/dashboard" className="text-text no-underline hover:text-text">
          <Wordmark />
        </Link>
        <span className="hidden text-neutral-600 sm:inline">/</span>
        <span className="hidden min-w-0 truncate sm:inline">{address}</span>
        <span className={`tag tag-${status.tone}`}>{status.label}</span>
        <span className="ml-auto flex items-center gap-2.5">
          {children}
          <Avatar initials={initials} />
        </span>
      </div>
    </header>
  );
}
