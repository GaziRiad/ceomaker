import type { RichTextSpan } from "@ceomaker/schema";
import type { CSSProperties, ReactNode } from "react";
import { linkProps } from "./links";
import type { MiddleKind, ModelImage, ModelLink, SiteModel } from "./model";

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

/**
 * The portrait box: a gradient-and-initials placeholder, covered by the photo when there is
 * one. The box itself (size, gradient, frame) belongs to each template.
 */
export function Portrait({
  image,
  className,
  style,
  children,
  eager = true,
}: {
  image: ModelImage | null;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  eager?: boolean;
}) {
  return (
    <div className={className} style={{ position: "relative", overflow: "hidden", ...style }}>
      {image ? (
        // Templates are framework-agnostic, so a plain <img> rather than next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.src}
          alt={image.alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 1,
            display: "block",
          }}
        />
      ) : null}
      {children}
    </div>
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

/** Nav entries for the sections the visitor can actually reach. */
export function navItems(
  model: SiteModel,
  labels: Partial<Record<MiddleKind, string>>,
): { href: string; label: string }[] {
  return (Object.keys(labels) as MiddleKind[])
    .filter((kind) => model.order.includes(kind))
    .map((kind) => ({ href: `#${ANCHORS[kind]}`, label: labels[kind]! }));
}

/** "01", "02"… for the visible sections a template numbers, in display order. */
export function sectionNumbers(
  model: SiteModel,
  numbered: readonly (MiddleKind | "contact")[],
): Partial<Record<MiddleKind | "contact", string>> {
  const result: Partial<Record<MiddleKind | "contact", string>> = {};
  let counter = 0;
  for (const kind of [...model.order, "contact" as const]) {
    if (!numbered.includes(kind)) continue;
    counter += 1;
    result[kind] = String(counter).padStart(2, "0");
  }
  return result;
}

/** Repeats a list so a CSS marquee that slides by -50% loops without a visible seam. */
export function loop<T>(items: readonly T[], times = 2): T[] {
  return Array.from({ length: times }, () => items).flat();
}
