import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./env", () => ({ serverEnv: () => ({ BETTER_AUTH_SECRET: "x".repeat(32) }) }));
vi.mock("./routing", () => ({ appUrl: () => "https://www.ceomaker.app" }));

const { DRAFT_CARD_DAYS, draftCardToken, draftCardUrl, verifyDraftCardToken } =
  await import("./draft-card");

const issued = new Date("2026-10-06T12:00:00Z");
const later = (days: number) => new Date(issued.getTime() + days * 24 * 60 * 60 * 1000);

describe("draft picture links", () => {
  it("open for the account they were made for, until they expire", () => {
    const token = draftCardToken("user-1", issued);
    expect(verifyDraftCardToken(token, later(1))).toBe("user-1");
    expect(verifyDraftCardToken(token, later(DRAFT_CARD_DAYS - 1))).toBe("user-1");
    expect(verifyDraftCardToken(token, later(DRAFT_CARD_DAYS + 1))).toBeNull();
    expect(draftCardUrl("user-1", issued)).toBe(`https://www.ceomaker.app/api/draft-card/${token}`);
  });

  it("refuse another account, a changed date or a forged signature", () => {
    const [, time, signature] = draftCardToken("user-1", issued).split(".");
    expect(verifyDraftCardToken(`user-2.${time}.${signature}`, issued)).toBeNull();
    expect(verifyDraftCardToken(`user-1.${Number(time) + 1}.${signature}`, issued)).toBeNull();
    expect(verifyDraftCardToken(`user-1.${time}.${"A".repeat(32)}`, issued)).toBeNull();
    expect(verifyDraftCardToken("user-1", issued)).toBeNull();
  });
});
