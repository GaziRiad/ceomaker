import { describe, expect, it } from "vitest";
import { clickKindOf, deviceOf, isBot, sitePath, sourceOf } from "./classify";

const own = ["ameliahart.com", "ceomaker.vercel.app"];

describe("sourceOf", () => {
  it.each([
    [null, "direct", null],
    ["", "direct", null],
    ["https://www.linkedin.com/feed/", "linkedin", null],
    ["https://lnkd.in/abc", "linkedin", null],
    ["https://www.google.com/", "google", null],
    ["https://www.google.co.uk/", "google", null],
    ["https://mail.google.com/mail/u/0/", "email", null],
    ["https://outlook.office.com/mail/", "email", null],
    ["android-app://com.google.android.gm/", "email", null],
    ["android-app://com.linkedin.android/", "linkedin", null],
    ["https://www.logisticsweekly.com/feature", "other", "logisticsweekly.com"],
    ["https://ameliahart.com/press", "direct", null],
    ["https://ceomaker.vercel.app/sites/amelia", "direct", null],
    ["not a url", "direct", null],
  ] as const)("reads %s", (referrer, source, referrerHost) => {
    expect(sourceOf(referrer, own)).toEqual({ source, referrerHost });
  });

  it("counts email campaigns as email whatever the referrer", () => {
    expect(sourceOf("https://www.google.com/", own, { medium: "Email" })).toEqual({
      source: "email",
      referrerHost: null,
    });
  });
});

describe("clickKindOf", () => {
  const page = "ameliahart.com";
  it.each([
    ["mailto:amelia@example.com", "email"],
    ["tel:+44 20 7946 0000", "phone"],
    ["https://www.linkedin.com/in/ameliahart", "linkedin"],
    ["https://meridianfreight.com/about", "site"],
    ["https://www.ft.com/content/x", "other"],
    ["https://ameliahart.com/#contact", null],
    ["javascript:void(0)", null],
  ] as const)("classifies %s", (href, kind) => {
    expect(clickKindOf(href, ["meridianfreight.com"], page)).toBe(kind);
  });
});

describe("devices and bots", () => {
  const iphone =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  const ipad =
    "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Safari/604.1";
  const androidTablet =
    "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/128.0 Safari/537.36";
  const mac =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/537.36 Chrome/128.0 Safari/537.36";

  it("tells phones, tablets and computers apart", () => {
    expect(deviceOf(iphone)).toBe("phone");
    expect(deviceOf(ipad)).toBe("tablet");
    expect(deviceOf(androidTablet)).toBe("tablet");
    expect(deviceOf(mac)).toBe("desktop");
  });

  it("ignores crawlers and scripts", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(
      true,
    );
    expect(isBot("LinkedInBot/1.0")).toBe(true);
    expect(isBot("Mozilla/5.0 HeadlessChrome/128.0")).toBe(true);
    expect(isBot(null)).toBe(true);
    expect(isBot(mac)).toBe(false);
  });
});

describe("sitePath", () => {
  it("keeps the path only, starting with a slash", () => {
    expect(sitePath("/")).toBe("/");
    expect(sitePath("/press?ref=x#top")).toBe("/press");
    expect(sitePath("press")).toBe("/press");
  });
});
