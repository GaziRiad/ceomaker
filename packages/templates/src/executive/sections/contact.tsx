import type { SectionOf } from "@ceomaker/schema";
import { linkProps } from "../../links";
import { SectionShell } from "../ui";

const SOCIAL_LABELS: Record<SectionOf<"contact">["links"][number]["kind"], string> = {
  linkedin: "LinkedIn",
  x: "X",
  github: "GitHub",
  website: "Website",
  instagram: "Instagram",
  youtube: "YouTube",
  other: "Link",
};

export function Contact({ section }: { section: SectionOf<"contact"> }) {
  return (
    <SectionShell id={section.id} heading={section.heading}>
      {section.blurb ? (
        <p className="max-w-2xl font-site-heading text-2xl leading-snug text-pretty sm:text-3xl">
          {section.blurb}
        </p>
      ) : null}
      <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
        {section.email ? (
          <a
            href={`mailto:${section.email}`}
            className="inline-flex min-h-11 w-fit items-center rounded-site bg-site-primary px-6 py-3 text-sm font-semibold text-site-on-primary transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-site-primary"
          >
            {section.email}
          </a>
        ) : null}
        {section.links.length > 0 ? (
          <ul className="flex flex-wrap gap-x-6 gap-y-3">
            {section.links.map((link, index) => (
              <li key={index}>
                <a
                  {...linkProps(link.href, "me")}
                  className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium underline decoration-site-fg/25 underline-offset-4 hover:decoration-site-accent"
                >
                  {link.label || SOCIAL_LABELS[link.kind]}
                  <span aria-hidden="true" className="text-site-accent">
                    &#8599;
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </SectionShell>
  );
}
