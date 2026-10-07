import { describe, expect, it } from "vitest";
import { signInErrorMessage, signInErrorPath } from "./sign-in-errors";

describe("signInErrorMessage", () => {
  it("explains expired or reused email links, whatever code the library adds", () => {
    for (const code of ["INVALID_TOKEN", "EXPIRED_TOKEN", undefined]) {
      expect(signInErrorMessage("link", code)).toMatch(/expired or was already used/);
    }
  });

  it("tells Google cancellations and unlinked accounts apart", () => {
    expect(signInErrorMessage("google", "access_denied")).toMatch(/cancelled/);
    expect(signInErrorMessage("google", ["account_not_linked", "x"])).toMatch(/email link once/);
    expect(signInErrorMessage(["google"], "invalid_code")).toMatch(/didn't complete/);
  });

  it("says nothing without a known source", () => {
    expect(signInErrorMessage(undefined, "access_denied")).toBeNull();
    expect(signInErrorMessage("elsewhere", undefined)).toBeNull();
  });

  it("builds the paths the auth library appends its code to", () => {
    expect(signInErrorPath("google")).toBe("/sign-in?via=google");
    expect(signInErrorPath("link", { callbackURL: "/dashboard", fromStart: false })).toBe(
      "/sign-in?via=link",
    );
  });

  it("keeps where a sign-in from the questions was going", () => {
    const path = signInErrorPath("link", { callbackURL: "/start/finish?a=xyz", fromStart: true });
    const params = new URL(path, "https://app.invalid").searchParams;
    expect(Object.fromEntries(params)).toEqual({
      via: "link",
      from: "start",
      callbackURL: "/start/finish?a=xyz",
    });
  });
});
