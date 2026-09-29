import type { SectionOf } from "@ceomaker/schema";
import { linkProps } from "../../links";
import { Container } from "../ui";

export function Hero({ section }: { section: SectionOf<"hero"> }) {
  return (
    <section
      id={section.id}
      aria-labelledby={`${section.id}-heading`}
      className="pt-20 pb-16 sm:pt-32 sm:pb-24"
    >
      <Container>
        <div className={section.image ? "grid items-center gap-12 lg:grid-cols-[1fr_20rem]" : ""}>
          <div className="max-w-3xl">
            {section.eyebrow ? (
              <p className="mb-6 flex items-center gap-4 text-sm font-medium tracking-[0.14em] text-site-accent uppercase">
                <span aria-hidden="true" className="h-px w-10 bg-site-accent" />
                {section.eyebrow}
              </p>
            ) : null}
            <h1
              id={`${section.id}-heading`}
              className="font-site-heading text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-6xl"
            >
              {section.headline}
            </h1>
            {section.subheadline ? (
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-site-muted sm:text-xl">
                {section.subheadline}
              </p>
            ) : null}
            {section.primaryCta ? (
              <a
                {...linkProps(section.primaryCta.href)}
                className="mt-10 inline-flex min-h-11 items-center gap-2 rounded-site bg-site-primary px-6 py-3 text-sm font-semibold text-site-on-primary transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-site-primary"
              >
                {section.primaryCta.label}
                <span aria-hidden="true">&rarr;</span>
              </a>
            ) : null}
          </div>
          {section.image ? (
            // Tenant images are served from our media CDN; the Next image optimizer is not
            // exposed to arbitrary tenant URLs to avoid SSRF and optimizer cost abuse.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={section.image.src}
              alt={section.image.alt}
              fetchPriority="high"
              className="aspect-[4/5] w-full rounded-site object-cover"
            />
          ) : null}
        </div>
      </Container>
    </section>
  );
}
