import type { SectionOf } from "@ceomaker/schema";
import { SectionShell } from "../ui";

export function Experience({ section }: { section: SectionOf<"experience"> }) {
  return (
    <SectionShell id={section.id} heading={section.heading}>
      <ol className="divide-y divide-site-fg/10 border-y border-site-fg/10">
        {section.items.map((item, index) => (
          <li key={index} className="grid gap-2 py-7 sm:grid-cols-[1fr_auto] sm:gap-8">
            <div>
              <h3 className="font-site-heading text-xl font-semibold">{item.role}</h3>
              <p className="mt-1 text-site-muted">
                {item.organization}
                {item.location ? <span> &middot; {item.location}</span> : null}
              </p>
              {item.summary ? (
                <p className="mt-4 max-w-2xl leading-relaxed text-pretty">{item.summary}</p>
              ) : null}
            </div>
            <p className="order-first text-sm font-medium tracking-wide text-site-muted tabular-nums sm:order-none sm:pt-1.5">
              {item.start}
              {item.end ? <> &ndash; {item.end}</> : null}
            </p>
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}
