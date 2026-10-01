import type { CSSProperties } from "react";

/** Props for a block that rises into place, staggered by its position on the page. */
export function enter(index: number): { className: string; style: CSSProperties } {
  return { className: "cm-enter", style: { "--delay": `${40 + index * 60}ms` } as CSSProperties };
}
