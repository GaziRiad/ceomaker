import type { SectionOf } from "@ceomaker/schema";
import { SectionShell } from "../ui";

export function Achievements({ section }: { section: SectionOf<"achievements"> }) {
  return (
    <SectionShell id={section.id} heading={section.heading}>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-4">
        {section.items.map((item, index) => (
          <div key={index} className="flex flex-col border-t border-site-fg/15 pt-5">
            <dt className="text-sm leading-snug text-site-muted">{item.label}</dt>
            <dd className="order-first mb-2 font-site-heading text-4xl font-semibold tracking-tight text-site-primary sm:text-5xl">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </SectionShell>
  );
}
