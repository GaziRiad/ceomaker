import { z } from "zod";
import { safeLinkUrl, spanText } from "./primitives";

/**
 * Rich text is structured data, not HTML. The renderer maps each span to escaped text
 * wrapped in <strong>/<em>/<a>. There is no path for user or AI content to become markup.
 */
export const richTextSpan = z.object({
  text: spanText(2000),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  href: safeLinkUrl.optional(),
});

export const richTextParagraph = z.object({
  spans: z.array(richTextSpan).min(1).max(50),
});

export const MAX_RICH_TEXT_CHARS = 5000;

export const richText = z
  .array(richTextParagraph)
  .max(20)
  .refine((paragraphs) => richTextLength(paragraphs) <= MAX_RICH_TEXT_CHARS, {
    message: `Text must be at most ${MAX_RICH_TEXT_CHARS} characters`,
  });

export type RichTextSpan = z.output<typeof richTextSpan>;
export type RichTextParagraph = z.output<typeof richTextParagraph>;
export type RichText = z.output<typeof richText>;

function richTextLength(paragraphs: { spans: { text: string }[] }[]): number {
  let total = 0;
  for (const paragraph of paragraphs) {
    for (const span of paragraph.spans) total += span.text.length;
  }
  return total;
}

/** Builds rich text from plain text, one paragraph per blank-line-separated block. */
export function richTextFromPlain(value: string): RichText {
  return value
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => ({ spans: [{ text: block }] }));
}

export function richTextToPlain(value: RichText): string {
  return value.map((paragraph) => paragraph.spans.map((span) => span.text).join("")).join("\n\n");
}
