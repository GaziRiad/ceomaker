import type { ReactNode } from "react";
import { Wordmark } from "./components";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <Wordmark />
          <h1 className="mt-8 font-display text-3xl font-semibold">{title}</h1>
          <p className="mt-2 text-stone">{subtitle}</p>
        </div>
        <div className="mt-8 rounded-xl border border-line bg-white p-6 sm:p-7">{children}</div>
      </div>
    </main>
  );
}
