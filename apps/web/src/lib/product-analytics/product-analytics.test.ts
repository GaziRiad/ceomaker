import { describe, expect, it } from "vitest";
import { isRelayPath, relayTarget } from "./config";
import { scrubEvent, scrubPath, scrubUrl } from "./scrub";
import { decodeVisitSource, encodeVisitSource, readVisitSource } from "./visit-source";

const OWN = "www.ceomaker.app";

describe("scrubbing", () => {
  it("masks ids and private tokens in paths", () => {
    expect(scrubPath("/dashboard/sites/0b6f6f1e-3f43-4a76-9b7e-2a1d5f3c9e10/edit")).toBe(
      "/dashboard/sites/:id/edit",
    );
    expect(scrubPath("/dns/Zx81kQ")).toBe("/dns/:token");
    expect(scrubPath("/start/finish")).toBe("/start/finish");
  });

  it("keeps only campaign tags on our URLs and only the origin of others", () => {
    expect(scrubUrl("https://www.ceomaker.app/start/finish?a=eyJuYW1lIjoiQW1lbGlhIn0", OWN)).toBe(
      "https://www.ceomaker.app/start/finish",
    );
    expect(
      scrubUrl(
        "https://www.ceomaker.app/?utm_source=linkedin&utm_campaign=launch&gclid=x#top",
        OWN,
      ),
    ).toBe("https://www.ceomaker.app/?utm_source=linkedin&utm_campaign=launch");
    expect(scrubUrl("https://mail.google.com/mail/u/0/#inbox/FMfcgz", OWN)).toBe(
      "https://mail.google.com/",
    );
    expect(scrubUrl("$direct", OWN)).toBe("$direct");
    expect(scrubUrl("javascript:alert(1)", OWN)).toBe("");
  });

  it("cleans an event's URLs, paths, titles and person properties", () => {
    const event = scrubEvent(
      {
        properties: {
          $current_url: "https://www.ceomaker.app/sign-in?callbackURL=%2Fstart%2Ffinish%3Fa%3Dxyz",
          $pathname: "/dashboard/sites/0b6f6f1e-3f43-4a76-9b7e-2a1d5f3c9e10/edit",
          $referrer: "https://www.linkedin.com/feed/update/123",
          title: "Amelia Hart",
          plan: "pro",
        },
        $set_once: { $initial_current_url: "https://www.ceomaker.app/dns/secret" },
      },
      OWN,
    );
    expect(event).toEqual({
      properties: {
        $current_url: "https://www.ceomaker.app/sign-in",
        $pathname: "/dashboard/sites/:id/edit",
        $referrer: "https://www.linkedin.com/",
        plan: "pro",
      },
      $set_once: { $initial_current_url: "https://www.ceomaker.app/dns/:token" },
    });
    expect(scrubEvent(null, OWN)).toBeNull();
  });

  it("cleans URLs nested in web vitals measurements", () => {
    const event = scrubEvent(
      {
        properties: {
          $web_vitals_LCP_event: {
            name: "LCP",
            value: 1200,
            $current_url: "https://www.ceomaker.app/start/finish?a=eyJuYW1lIjoiUGF0In0",
          },
        },
      },
      OWN,
    );
    expect(event?.properties.$web_vitals_LCP_event).toEqual({
      name: "LCP",
      value: 1200,
      $current_url: "https://www.ceomaker.app/start/finish",
    });
  });
});

describe("visit source", () => {
  const read = (referrer: string, href = "https://www.ceomaker.app/") =>
    readVisitSource({ referrer, href, ownHost: OWN });

  it("names where a visit came from", () => {
    expect(read("https://www.linkedin.com/")).toMatchObject({
      source: "linkedin",
      referrerHost: "linkedin.com",
    });
    expect(read("https://www.google.com/").source).toBe("google");
    expect(read("").source).toBe("direct");
    expect(read("https://news.ycombinator.com/item?id=1")).toMatchObject({
      source: "other",
      referrerHost: "news.ycombinator.com",
    });
    // Our own pages aren't a source; a customer's site is (the badge links to us).
    expect(read("https://www.ceomaker.app/pricing")).toMatchObject({
      source: "direct",
      referrerHost: null,
    });
    expect(read("https://amelia.ceomaker.app/")).toMatchObject({
      source: "customer-site",
      referrerHost: "amelia.ceomaker.app",
    });
  });

  it("lets campaign tags win, and records the landing page", () => {
    expect(
      read(
        "https://www.google.com/",
        "https://www.ceomaker.app/start?utm_source=Newsletter&utm_medium=email&utm_campaign=oct",
      ),
    ).toEqual({
      source: "newsletter",
      referrerHost: "google.com",
      utmSource: "Newsletter",
      utmMedium: "email",
      utmCampaign: "oct",
      landingPath: "/start",
    });
  });

  it("travels in a URL and comes back the same, rejecting anything else", () => {
    const visit = read("https://www.linkedin.com/", "https://www.ceomaker.app/?utm_campaign=x");
    expect(decodeVisitSource(encodeVisitSource(visit))).toEqual(visit);
    expect(decodeVisitSource(null)).toBeNull();
    expect(decodeVisitSource("not json")).toBeNull();
    expect(decodeVisitSource('{"r":"linkedin.com"}')).toBeNull();
    expect(decodeVisitSource(`{"s":"${"x".repeat(2000)}"}`)).toBeNull();
    expect(decodeVisitSource(`{"s":"${"y".repeat(90)}"}`)?.source).toHaveLength(60);
  });
});

describe("relay", () => {
  it("sends PostHog's scripts to its assets host and the rest to its API", () => {
    expect(isRelayPath("/relay/e/")).toBe(true);
    expect(isRelayPath("/relayed")).toBe(false);
    expect(relayTarget("/relay/static/array.js", "?v=1")).toBe(
      "https://eu-assets.i.posthog.com/static/array.js?v=1",
    );
    expect(relayTarget("/relay/i/v0/e/", "?ip=0")).toBe("https://eu.i.posthog.com/i/v0/e/?ip=0");
  });
});
