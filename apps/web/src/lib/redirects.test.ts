import { describe, expect, it } from "vitest";
import { safeCallbackPath } from "./redirects";

describe("safeCallbackPath", () => {
  it.each(["/dashboard", "/start/finish?a=abc", "/dashboard/sites/x/edit?notice=failed"])(
    "keeps %s",
    (path) => {
      expect(safeCallbackPath(path)).toBe(path);
    },
  );

  it.each([
    "https://evil.example/",
    "//evil.example/path",
    "/\\evil.example",
    "javascript:alert(1)",
    "dashboard",
    "",
    42,
    undefined,
  ])("rejects %j", (value) => {
    expect(safeCallbackPath(value)).toBeNull();
  });
});
