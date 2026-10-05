import type { CSSProperties } from "react";

// The card grid of the landing page and /templates, shared with the client-side "Show more".

/**
 * Grid classes for card `index` of `count` on a 12-track grid: one across on phones, two from
 * 640px, three from 1024px. A short last row never leaves a card alone: with two left over they
 * share the row wide, with one left over the last two rows are two wide cards each, and a single
 * card is centred. At two across an odd last card is centred at the same width.
 */
export function cardColumns(index: number, count: number): string {
  const classes = ["col-span-12", "sm:col-span-6"];
  const oddLast = count % 2 === 1 && index === count - 1;
  if (oddLast) classes.push("sm:col-start-4");
  if (count === 1) {
    classes.push("lg:col-span-6");
  } else {
    const rest = count % 3;
    const wide = rest === 0 ? 0 : rest === 2 ? 2 : 4;
    classes.push(index >= count - wide ? "lg:col-span-6" : "lg:col-span-4");
    if (oddLast) classes.push("lg:col-start-auto");
  }
  return classes.join(" ");
}

export const CARD_GRID = "m-0 grid list-none grid-cols-12 gap-x-6 gap-y-8 p-0";

/** Cards rise in by column: 0, 110 and 220 ms. */
export function cardDelay(index: number): CSSProperties {
  return { "--delay": `${(index % 3) * 110}ms` } as CSSProperties;
}
