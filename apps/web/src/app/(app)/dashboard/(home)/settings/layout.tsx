import type { ReactNode } from "react";
import { enter } from "../_components/enter";
import { SettingsNav } from "./_components/settings-nav";

/** Site, Account and Billing share the heading and the section menu. */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto grid max-w-[1200px] grid-cols-1 items-start gap-5 px-5 pt-6 pb-16 sm:px-10 sm:pt-10 sm:pb-24 md:grid-cols-[220px_minmax(0,1fr)] md:gap-14">
      <div className="flex min-w-0 flex-col gap-5">
        <h1
          {...enter(0)}
          className="cm-enter m-0 font-heading text-[40px] leading-none font-semibold uppercase sm:text-[56px]"
        >
          Settings
        </h1>
        <div {...enter(0)} className="cm-enter">
          <SettingsNav />
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-6 md:pt-[76px]">{children}</div>
    </main>
  );
}
