import { describe, expect, it } from "vitest";
import { confirmLinkFor, readLinkParams, VERIFY_PATH, verifyPathFor } from "./sign-in-link";

// The link the auth library hands to sendMagicLink.
const verifyUrl =
  "https://www.ceomaker.app/api/auth/magic-link/verify?token=abc123&callbackURL=%2Fdashboard" +
  "&newUserCallbackURL=%2Fapi%2Fwelcome%3Fnext%3D%252Fdashboard&errorCallbackURL=%2Fsign-in%3Fvia%3Dlink";

describe("confirmLinkFor", () => {
  it("sends the email to the confirm page with the link's own parameters", () => {
    const confirm = new URL(confirmLinkFor(verifyUrl));
    expect(confirm.origin).toBe("https://www.ceomaker.app");
    expect(confirm.pathname).toBe("/sign-in/confirm");
    expect(Object.fromEntries(confirm.searchParams)).toEqual({
      token: "abc123",
      callbackURL: "/dashboard",
      newUserCallbackURL: "/api/welcome?next=%2Fdashboard",
      errorCallbackURL: "/sign-in?via=link",
    });
  });

  it("leaves a link of another shape as it is, so sign-in still works", () => {
    const other = "https://www.ceomaker.app/api/auth/other/verify?token=abc123";
    expect(confirmLinkFor(other)).toBe(other);
    const tokenless = "https://www.ceomaker.app/api/auth/magic-link/verify?callbackURL=%2F";
    expect(confirmLinkFor(tokenless)).toBe(tokenless);
  });
});

describe("verifyPathFor", () => {
  it("goes back to the auth library's check with the same parameters", () => {
    const confirm = new URL(confirmLinkFor(verifyUrl));
    const path = verifyPathFor((name) => confirm.searchParams.get(name));
    const back = new URL(path!, "https://www.ceomaker.app");
    const original = new URL(verifyUrl);
    expect(back.pathname).toBe(VERIFY_PATH);
    expect(Object.fromEntries(back.searchParams)).toEqual(
      Object.fromEntries(original.searchParams),
    );
  });

  it("stays on our own host and carries nothing but the link's parameters", () => {
    const form: Record<string, unknown> = {
      token: "abc123",
      callbackURL: "/dashboard",
      redirect: "https://evil.example",
    };
    const path = verifyPathFor((name) => form[name]);
    expect(path).toBe(`${VERIFY_PATH}?token=abc123&callbackURL=%2Fdashboard`);
  });

  it("needs a token", () => {
    expect(verifyPathFor(() => null)).toBeNull();
    expect(readLinkParams((name) => (name === "token" ? "" : "/x"))).toBeNull();
    expect(readLinkParams((name) => (name === "token" ? "x".repeat(9000) : null))).toBeNull();
  });

  it("carries callback addresses holding long answers from the questions", () => {
    const callbackURL = `/start/finish?a=${"x".repeat(4000)}`;
    const params = readLinkParams((name) =>
      name === "token" ? "abc123" : name === "callbackURL" ? callbackURL : null,
    );
    expect(params?.callbackURL).toBe(callbackURL);
  });
});
