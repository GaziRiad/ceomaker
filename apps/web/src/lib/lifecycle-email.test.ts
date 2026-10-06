import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./share-card", () => ({ SHARE_CARD_PATH: "/share-card.png" }));

const { firstName, greetingName } = await import("./lifecycle-email");

describe("the emails' greeting", () => {
  it("uses the first word of the account's name, or 'there' without one", () => {
    expect(firstName("Amelia Hart")).toBe("Amelia");
    expect(greetingName("  Amelia   Hart ")).toBe("Amelia");
    expect(greetingName("")).toBe("there");
    expect(greetingName(null)).toBe("there");
  });
});
