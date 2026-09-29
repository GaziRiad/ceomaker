import type { SectionOf } from "@ceomaker/schema";
import { linkProps } from "../../links";
import { SectionShell } from "../ui";

export function Portfolio({ section }: { section: SectionOf<"portfolio"> }) {
  return (
    <SectionShell id={section.id} heading={section.heading}>
      <ul className="grid gap-6 sm:grid-cols-2">
        {section.items.map((item, index) => {
          const body = (
            <>
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image.src}
                  alt={item.image.alt}
                  loading="lazy"
                  decoding="async"
                  className="mb-5 aspect-[16/10] w-full rounded-site object-cover"
                />
              ) : null}
              <h3 className="font-site-heading text-xl font-semibold">
                {item.title}
                {item.href ? (
                  <span aria-hidden="true" className="ml-2 text-site-accent">
                    &#8599;
                  </span>
                ) : null}
              </h3>
              {item.description ? (
                <p className="mt-2 leading-relaxed text-site-muted">{item.description}</p>
              ) : null}
            </>
          );
          return (
            <li key={index} className="rounded-site border border-site-fg/10 p-6">
              {item.href ? (
                <a {...linkProps(item.href)} className="block hover:text-site-primary">
                  {body}
                </a>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}
