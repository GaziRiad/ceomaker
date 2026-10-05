import { describe, expect, it } from "vitest";
import { cardColumns } from "./columns";

/** The desktop spans of a grid of `count` cards. */
function desktop(count: number): string[] {
  return Array.from({ length: count }, (_, index) =>
    cardColumns(index, count)
      .split(" ")
      .filter((name) => name.startsWith("lg:col-span"))
      .join(""),
  );
}

describe("template card grid", () => {
  it("never leaves a card alone on the last row at three across", () => {
    const [third, half] = ["lg:col-span-4", "lg:col-span-6"];
    expect(desktop(6)).toEqual(Array(6).fill(third));
    expect(desktop(5)).toEqual([third, third, third, half, half]);
    expect(desktop(7)).toEqual([third, third, third, half, half, half, half]);
    expect(desktop(4)).toEqual([half, half, half, half]);
  });

  it("centres a single card, and an odd last card at two across", () => {
    expect(cardColumns(0, 1)).toContain("sm:col-start-4");
    expect(cardColumns(0, 1)).toContain("lg:col-span-6");
    expect(cardColumns(4, 5)).toContain("sm:col-start-4");
    expect(cardColumns(4, 5)).toContain("lg:col-start-auto");
    expect(cardColumns(3, 4)).not.toContain("col-start");
  });
});
