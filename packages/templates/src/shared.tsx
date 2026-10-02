import type { RichTextSpan } from "@ceomaker/schema";
import type { CSSProperties, ReactNode } from "react";
import { linkProps } from "./links";
import type { FieldPath, MiddleKind, ModelLink, SiteModel } from "./model";

/** Section anchors are stable per kind, so nav links and "#contact" buttons always resolve. */
export const ANCHORS: Record<MiddleKind | "contact" | "top", string> = {
  top: "top",
  impact: "impact",
  about: "about",
  experience: "experience",
  work: "work",
  testimonials: "testimonials",
  contact: "contact",
};

/**
 * Marks an element whose text is exactly one content field, so the editor's preview can edit it
 * in place. Decorations inside it must be aria-hidden. Live sites get no attribute.
 */
export function editable(model: SiteModel, field: FieldPath): { "data-field"?: FieldPath } {
  return model.editable ? { "data-field": field } : {};
}

/** Keyboard users jump past the header straight to the content. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-site-ink focus:px-4 focus:py-2 focus:text-site-bg"
    >
      Skip to content
    </a>
  );
}

/** Renders rich-text spans as escaped text; each template styles the emphasized run. */
export function Spans({
  spans,
  emphasis,
}: {
  spans: RichTextSpan[];
  emphasis: (text: string, key: number) => ReactNode;
}) {
  return (
    <>
      {spans.map((span, index) => {
        const node = span.bold || span.italic ? emphasis(span.text, index) : span.text;
        if (!span.href) return <span key={index}>{node}</span>;
        return (
          <a
            key={index}
            {...linkProps(span.href)}
            style={{ textDecoration: "underline", textUnderlineOffset: "4px" }}
          >
            {node}
          </a>
        );
      })}
    </>
  );
}

/** A visitor-facing contact link: new tab, rel="me" for identity verification, no opener. */
export function ContactLink({
  link,
  className,
  style,
  children,
}: {
  link: ModelLink;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const external = link.href.startsWith("http://") || link.href.startsWith("https://");
  return (
    <a
      href={link.href}
      {...(external ? { target: "_blank", rel: "noopener me" } : {})}
      className={className}
      style={style}
    >
      {children ?? `${link.label} ↗`}
    </a>
  );
}

/** The primary call to action; in-page anchors stay in the tab, external links open a new one. */
export function CtaLink({
  link,
  className,
  style,
  children,
}: {
  link: ModelLink;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <a {...linkProps(link.href)} className={className} style={style}>
      {children ?? link.label}
    </a>
  );
}

export function mailto(email: string): string {
  return `mailto:${email}`;
}

/** Repeats a list so a CSS marquee that slides by -50% loops without a visible seam. */
export function loop<T>(items: readonly T[], times = 2): T[] {
  return Array.from({ length: times }, () => items).flat();
}
