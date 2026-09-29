import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function Wordmark() {
  return (
    <Link href="/" className="font-display text-xl font-semibold tracking-tight">
      CEO<span className="text-gold-soft">Maker</span>
    </Link>
  );
}

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>{children}</div>;
}

const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:cursor-not-allowed disabled:opacity-60";

export const buttonStyles = {
  primary: `${buttonBase} bg-navy text-white hover:bg-navy-deep`,
  secondary: `${buttonBase} border border-line bg-white text-ink hover:border-ink/30`,
  ghost: `${buttonBase} text-ink hover:bg-ink/5`,
};

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof buttonStyles }) {
  return <Link {...props} className={`${buttonStyles[variant]} ${className}`} />;
}
