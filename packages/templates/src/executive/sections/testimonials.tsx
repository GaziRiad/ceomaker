import type { SectionOf } from "@ceomaker/schema";
import { SectionShell } from "../ui";

export function Testimonials({ section }: { section: SectionOf<"testimonials"> }) {
  return (
    <SectionShell id={section.id} heading={section.heading}>
      <div className="space-y-12">
        {section.items.map((item, index) => (
          <figure key={index} className="max-w-3xl">
            <blockquote className="font-site-heading text-2xl leading-snug text-pretty sm:text-3xl">
              <span aria-hidden="true" className="text-site-accent">
                &ldquo;
              </span>
              {item.quote}
              <span aria-hidden="true" className="text-site-accent">
                &rdquo;
              </span>
            </blockquote>
            <figcaption className="mt-5 text-sm">
              <span className="font-semibold">{item.author}</span>
              {item.role ? <span className="text-site-muted">, {item.role}</span> : null}
            </figcaption>
          </figure>
        ))}
      </div>
    </SectionShell>
  );
}
