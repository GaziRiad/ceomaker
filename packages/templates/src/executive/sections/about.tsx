import type { SectionOf } from "@ceomaker/schema";
import { RichTextView } from "../../rich-text";
import { SectionShell } from "../ui";

export function About({ section }: { section: SectionOf<"about"> }) {
  return (
    <SectionShell id={section.id} heading={section.heading}>
      <div className={section.image ? "grid gap-10 md:grid-cols-[1fr_14rem]" : ""}>
        <RichTextView
          value={section.body}
          className="max-w-2xl space-y-5 text-lg leading-relaxed text-pretty sm:text-xl"
        />
        {section.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={section.image.src}
            alt={section.image.alt}
            loading="lazy"
            decoding="async"
            className="aspect-square w-full rounded-site object-cover"
          />
        ) : null}
      </div>
    </SectionShell>
  );
}
