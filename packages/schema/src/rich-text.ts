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

const EMPHASIS = /\*([^*\n]+)\*/g;

/**
 * Editor convention for one paragraph: a phrase wrapped in *asterisks* is the highlighted run
 * (italic in Meridian, gradient in Aurora, accent in Monument). Links are not editable here.
 */
export function paragraphToMarkup(paragraph: RichTextParagraph): string {
  return paragraph.spans
    .map((span) => (span.bold || span.italic ? `*${span.text}*` : span.text))
    .join("");
}

/** Inverse of paragraphToMarkup. Unpaired asterisks stay literal. Null for blank input. */
export function paragraphFromMarkup(value: string): RichTextParagraph | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const spans: RichTextSpan[] = [];
  let last = 0;
  for (const match of trimmed.matchAll(EMPHASIS)) {
    const index = match.index ?? 0;
    if (index > last) spans.push({ text: trimmed.slice(last, index) });
    spans.push({ text: match[1] ?? "", italic: true });
    last = index + match[0].length;
  }
  if (last < trimmed.length) spans.push({ text: trimmed.slice(last) });
  return { spans };
}
