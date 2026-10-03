import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/ui";

/** Shown at the top of both legal pages; change it whenever either page changes. */
export const LEGAL_UPDATED = "3 October 2026";
export const LEGAL_CONTACT = "riadhallouch447@gmail.com";

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

/** Plain, readable layout for the privacy policy and the terms: a contents list, then sections. */
export function LegalPage({
  kicker,
  title,
  intro,
  sections,
}: {
  kicker: string;
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <>
      <header className="border-b border-divider bg-neutral-100">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-6 px-5 sm:h-16 sm:px-10">
          <Link href="/" className="text-text no-underline hover:text-text">
            <Wordmark />
          </Link>
          <nav aria-label="Legal" className="flex gap-5 text-sm">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto grid max-w-[1200px] gap-10 px-5 pt-8 pb-20 text-base sm:px-10 sm:pt-12 sm:pb-28 sm:text-[17px] lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <span className="kicker">{kicker}</span>
          <h1 className="m-0 font-heading text-[44px] leading-none font-semibold uppercase sm:text-[64px]">
            {title}
          </h1>
          <span className="text-sm text-neutral-700">Last updated {LEGAL_UPDATED}</span>
        </div>
        <nav aria-label="On this page" className="hidden lg:block">
          <ol className="sticky top-8 m-0 flex list-none flex-col gap-2 p-0 text-sm">
            {sections.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-neutral-800 no-underline hover:text-text"
                >
                  {index + 1}. {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="legal flex max-w-[720px] flex-col gap-10">
          <div className="text-pretty text-neutral-800">{intro}</div>
          {sections.map((section, index) => (
            <section key={section.id} id={section.id} className="flex scroll-mt-8 flex-col gap-3">
              <h2 className="m-0 font-heading text-[26px] leading-tight font-semibold uppercase">
                {index + 1}. {section.title}
              </h2>
              <div className="flex flex-col gap-3 text-pretty">{section.body}</div>
            </section>
          ))}
        </article>
      </main>
      <footer className="border-t border-divider">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-5 py-7 text-sm text-neutral-700 sm:px-10">
          <Wordmark size={18} className="text-text" />
          <span>
            Questions: <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a>
          </span>
        </div>
      </footer>
    </>
  );
}
