import type { RichText } from "@ceomaker/schema";
import type { ReactNode } from "react";
import { linkProps } from "./links";

/**
 * Renders structured rich text. Every span is a React text node (escaped), optionally wrapped
 * in <strong>, <em> or <a>. There is deliberately no dangerouslySetInnerHTML anywhere.
 */
export function RichTextView({ value, className }: { value: RichText; className?: string }) {
  return (
    <div className={className}>
      {value.map((paragraph, paragraphIndex) => (
        <p key={paragraphIndex}>
          {paragraph.spans.map((span, spanIndex) => {
            let node: ReactNode = span.text;
            if (span.italic) node = <em>{node}</em>;
            if (span.bold) node = <strong className="font-semibold">{node}</strong>;
            if (span.href) {
              node = (
                <a
                  {...linkProps(span.href)}
                  className="underline decoration-site-accent underline-offset-4 hover:text-site-primary"
                >
                  {node}
                </a>
              );
            }
            return <span key={spanIndex}>{node}</span>;
          })}
        </p>
      ))}
    </div>
  );
}
