import type { SectionOf } from "@ceomaker/schema";
import { linkProps } from "../../links";
import { Container } from "../ui";

export function CallToActionBand({ section }: { section: SectionOf<"cta"> }) {
  return (
    <section
      id={section.id}
      aria-labelledby={`${section.id}-heading`}
      className="bg-site-primary py-16 text-site-on-primary sm:py-20"
    >
      <Container className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <h2
            id={`${section.id}-heading`}
            className="font-site-heading text-3xl leading-tight font-semibold text-balance sm:text-4xl"
          >
            {section.headline}
          </h2>
          {section.body ? (
            <p className="mt-4 text-lg leading-relaxed opacity-85">{section.body}</p>
          ) : null}
        </div>
        <a
          {...linkProps(section.button.href)}
          className="inline-flex min-h-11 w-fit shrink-0 items-center rounded-site border border-current px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-80"
        >
          {section.button.label}
        </a>
      </Container>
    </section>
  );
}
