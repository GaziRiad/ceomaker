import type { ReactNode } from "react";
import { Blueprint } from "@/components/ui";
import { enter } from "../../_components/enter";

/** One settings block: a blueprint card with a heading. */
export function SettingsCard({
  index,
  title,
  aside,
  danger = false,
  className = "gap-3.5",
  children,
}: {
  /** Position on the page, for the staggered entrance. */
  index: number;
  title: string;
  /** Next to the title, e.g. a "Coming soon" tag. */
  aside?: ReactNode;
  /** Marks the block as a danger zone. */
  danger?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section {...enter(index)} className="cm-enter">
      <Blueprint className={`flex flex-col p-[18px] sm:px-6 sm:py-5 ${className}`}>
        {danger ? (
          <span className="text-[13px] tracking-[0.1em] text-danger uppercase">Danger zone</span>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="m-0 font-heading text-2xl leading-none font-semibold uppercase">
            {title}
          </h2>
          {aside}
        </div>
        {children}
      </Blueprint>
    </section>
  );
}

/** A settings block whose content draws its own heading (the custom domain card). */
export function SettingsSection({
  index,
  id,
  label,
  className = "",
  children,
}: {
  index: number;
  /** Anchor for links from elsewhere, e.g. the Overview's domain card. */
  id?: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section {...enter(index)} id={id} aria-label={label} className="cm-enter scroll-mt-32">
      <Blueprint className={`flex flex-col p-[18px] sm:px-6 sm:py-5 ${className}`}>
        {children}
      </Blueprint>
    </section>
  );
}

export function CardText({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`m-0 max-w-[620px] text-pretty text-neutral-800 ${className}`}>{children}</p>
  );
}

/** Placeholder blocks while a settings page loads. */
export function SettingsSkeleton({ heights }: { heights: number[] }) {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading settings">
      {heights.map((height, index) => (
        <span key={index} className="cm-shimmer block bg-neutral-200" style={{ height }} />
      ))}
    </div>
  );
}

/** The outlined red button that opens a delete dialog. */
export const DANGER_BUTTON =
  "btn min-h-11 gap-2 self-start border-danger px-4 text-danger hover:bg-danger-soft hover:text-danger sm:min-h-10";
