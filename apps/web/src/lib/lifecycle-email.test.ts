import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./share-card", () => ({ SHARE_CARD_PATH: "/share-card.png" }));

const { firstName, giftGivenPayload, greetingName } = await import("./lifecycle-email");

describe("the emails' greeting", () => {
  it("uses the first word of the account's name, or 'there' without one", () => {
    expect(firstName("Amelia Hart")).toBe("Amelia");
    expect(greetingName("  Amelia   Hart ")).toBe("Amelia");
    expect(greetingName("")).toBe("there");
    expect(greetingName(null)).toBe("there");
  });
});

describe("the gift of Pro email", () => {
  it("gets the greeting, the end date as people read it, the link, and whether it extends one", () => {
    expect(
      giftGivenPayload({
        name: "Brad Dyke",
        endsOn: new Date("2027-01-14T08:00:00Z"),
        extended: false,
        editUrl: "https://www.ceomaker.app/dashboard/sites/s1/edit",
      }),
    ).toEqual({
      greeting_name: "Brad",
      ends_on: "14 January 2027",
      edit_url: "https://www.ceomaker.app/dashboard/sites/s1/edit",
      extended: false,
    });
    expect(
      giftGivenPayload({ name: "", endsOn: new Date(), extended: true, editUrl: "x" })
        .greeting_name,
    ).toBe("there");
  });
});
