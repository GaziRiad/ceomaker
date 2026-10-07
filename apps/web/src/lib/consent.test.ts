import { afterEach, describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "./security-headers";
import { regionForCountry } from "./consent";

describe("consent region", () => {
  it("asks in the EEA, the UK and Switzerland, and wherever the country is unknown", () => {
    for (const country of ["FR", "de", "GB", "CH", "NO", "IS", "IE"]) {
      expect(regionForCountry(country)).toBe("eu");
    }
    for (const country of [null, undefined, "", "XYZ", "1"]) {
      expect(regionForCountry(country)).toBe("eu");
    }
  });

  it("gives a notice elsewhere", () => {
    for (const country of ["US", "CA", "DZ", "AE", "IN", "AU", "BR"]) {
      expect(regionForCountry(country)).toBe("other");
    }
  });
});

describe("content security policy and the Google tag", () => {
  const before = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  afterEach(() => {
    if (before === undefined) delete process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
    else process.env.NEXT_PUBLIC_GOOGLE_ADS_ID = before;
  });

  it("allows Google's origins only once Google Ads is set up", () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
    expect(contentSecurityPolicy(false)).not.toContain("googletagmanager");
    expect(contentSecurityPolicy(false)).toContain("frame-src 'none'");
    process.env.NEXT_PUBLIC_GOOGLE_ADS_ID = "AW-123456789";
    const policy = contentSecurityPolicy(false);
    expect(policy).toMatch(/script-src [^;]*https:\/\/www\.googletagmanager\.com/);
    expect(policy).toMatch(/frame-src https:\/\/td\.doubleclick\.net/);
    process.env.NEXT_PUBLIC_GOOGLE_ADS_ID = "not-an-id";
    expect(contentSecurityPolicy(false)).not.toContain("googletagmanager");
  });
});
