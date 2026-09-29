import type { Metadata } from "next";
import { appFontVariables } from "./fonts";
import "./(app)/globals.css";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function GlobalNotFound() {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return (
    <html lang="en" className={appFontVariables}>
      <body>
        <main className="flex min-h-dvh items-center justify-center px-6">
          <div className="max-w-md text-center">
            <p className="text-sm font-medium tracking-[0.18em] text-gold uppercase">404</p>
            <h1 className="mt-4 font-display text-3xl font-semibold">Page not found</h1>
            <p className="mt-4 leading-relaxed text-stone">
              The page you are looking for does not exist.
            </p>
            <a
              href={appUrl}
              className="mt-8 inline-flex min-h-11 items-center rounded-md bg-navy px-6 text-sm font-semibold text-white"
            >
              Go to CEOMaker
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
