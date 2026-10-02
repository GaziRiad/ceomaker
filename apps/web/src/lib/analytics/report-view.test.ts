import type { AnalyticsReport } from "@ceomaker/db";
import { describe, expect, it } from "vitest";
import {
  countChange,
  flagOf,
  percentChange,
  reportView,
  weeklyView,
  withArticle,
} from "./report-view";

const now = new Date("2026-10-02T12:00:00Z");
const published = new Date("2026-09-28T09:00:00Z");

function report(overrides: Partial<AnalyticsReport> = {}): AnalyticsReport {
  return {
    days: 30,
    now,
    visitorsEver: 142,
    current: { visitors: 142, pageviews: 227, messages: 9 },
    previous: { visitors: 120, pageviews: 203, messages: 6 },
    series: Array.from({ length: 30 }, (_, index) => ({
      start: new Date(Date.UTC(2026, 8, 3 + index)),
      visitors: index === 19 ? 16 : 4,
    })),
    places: [
      {
        country: "GB",
        city: "London",
        latitude: 51.5,
        longitude: -0.1,
        visitors: 28,
        recent: true,
      },
      {
        country: "US",
        city: "New York",
        latitude: 40.7,
        longitude: -74,
        visitors: 14,
        recent: false,
      },
      { country: "GB", city: "Leeds", latitude: 53.8, longitude: -1.5, visitors: 5, recent: false },
      { country: null, city: null, latitude: null, longitude: null, visitors: 2, recent: false },
    ],
    sources: [
      { source: "linkedin", visitors: 61 },
      { source: "google", visitors: 27 },
      { source: "other", visitors: 16 },
    ],
    otherSites: [{ host: "logisticsweekly.com", visitors: 5 }],
    devices: [
      { device: "phone", visitors: 88 },
      { device: "desktop", visitors: 50 },
    ],
    clicks: [{ kind: "linkedin", count: 19 }],
    pages: [{ path: "/", views: 227, visitors: 142 }],
    visits: [],
    ...overrides,
  };
}

describe("reportView", () => {
  it("writes the summary the design shows", () => {
    expect(reportView(report(), published).summary).toBe(
      "142 people visited your site in the last 30 days, 18% more than the 30 days before. Most came from LinkedIn, and more were in the United Kingdom than anywhere else.",
    );
  });

  it("says fewer, the same, or nothing to compare with", () => {
    const fewer = report({ current: { visitors: 90, pageviews: 100, messages: 0 } });
    expect(reportView(fewer, published).summary).toContain("25% fewer than the 30 days before");
    const first = report({ previous: { visitors: 0, pageviews: 0, messages: 0 } });
    expect(reportView(first, published).summary).toMatch(
      /^142 people visited your site in the last 30 days\. Most/,
    );
    const nobody = report({ current: { visitors: 0, pageviews: 0, messages: 0 } });
    expect(reportView(nobody, published).summary).toBe(
      "Nobody visited your site in the last 30 days.",
    );
  });

  it("groups cities by country, keeps unknown places off the map, and labels the chart", () => {
    const view = reportView(report(), published);
    expect(view.mode).toBe("full");
    expect(
      view.countries.map((country) => [country.name, country.visitors, country.cities.length]),
    ).toEqual([
      ["United Kingdom", 33, 2],
      ["United States", 14, 1],
      ["Unknown location", 2, 1],
    ]);
    expect(view.places).toHaveLength(3);
    expect(view.geoSubtitle).toBe("2 countries · 3 cities");
    expect(view.chart?.axis).toEqual(["3 Sep", "18 Sep", "Today"]);
    expect(view.chart?.top).toBe(16);
    expect(view.chart?.busiest).toBe("Busiest day: Tue 22 Sep · 16 visitors");
    expect(view.tiles.map((tile) => [tile.value, tile.change?.text ?? tile.note])).toEqual([
      ["142", "+18% on the previous 30 days"],
      ["227", "+12% on the previous 30 days"],
      ["9", "+3 on the previous 30 days"],
      ["LinkedIn", "59% of visitors"],
    ]);
    expect(view.actions.map((action) => action.key)).toEqual(["linkedin", "form"]);
    expect(view.sources.find((source) => source.key === "other")?.sub).toEqual([
      { host: "logisticsweekly.com", visitors: 5 },
    ]);
  });

  it("lists every visit while there are only a few", () => {
    const view = reportView(
      report({
        visitorsEver: 3,
        current: { visitors: 3, pageviews: 5, messages: 0 },
        sources: [
          { source: "linkedin", visitors: 2 },
          { source: "direct", visitors: 1 },
        ],
        visits: [
          {
            at: new Date("2026-10-02T09:12:00Z"),
            country: "GB",
            city: "London",
            source: "linkedin",
            device: "phone",
          },
          {
            at: new Date("2026-09-30T18:40:00Z"),
            country: "AE",
            city: "Dubai",
            source: "linkedin",
            device: "phone",
          },
          {
            at: new Date("2026-09-29T08:05:00Z"),
            country: "CA",
            city: "Toronto",
            source: "direct",
            device: "desktop",
          },
        ],
      }),
      published,
    );
    expect(view.mode).toBe("few");
    expect(view.summary).toBe(
      "3 people have visited your site since you published on 28 September. Two came from LinkedIn.",
    );
    expect(view.chart).toBeNull();
    expect(view.visits.map((visit) => [visit.place, visit.how])).toEqual([
      ["London, United Kingdom", "From LinkedIn · Phone"],
      ["Dubai, United Arab Emirates", "From LinkedIn · Phone"],
      ["Toronto, Canada", "Typed the address · Desktop"],
    ]);
    expect(view.tiles.map((tile) => tile.note)).toEqual([
      "Since 28 Sep",
      "About 2 per visitor",
      "None yet",
      "2 of 3 visitors",
    ]);
  });

  it("knows when nobody has visited yet", () => {
    expect(reportView(report({ visitorsEver: 0 }), published).mode).toBe("none");
  });
});

describe("wording helpers", () => {
  it("describes changes", () => {
    expect(percentChange(10, 0, 7)).toEqual({
      text: "None in the previous 7 days",
      direction: "up",
    });
    expect(percentChange(0, 0, 7).direction).toBe("flat");
    expect(percentChange(9, 12, 7)).toEqual({
      text: "−25% on the previous 7 days",
      direction: "down",
    });
    expect(countChange(4, 4, 30)).toEqual({
      text: "Same as the previous 30 days",
      direction: "flat",
    });
  });

  it("names countries naturally", () => {
    expect(withArticle("United Kingdom")).toBe("the United Kingdom");
    expect(withArticle("Netherlands")).toBe("the Netherlands");
    expect(withArticle("Germany")).toBe("Germany");
    expect(flagOf("GB")).toBe("🇬🇧");
    expect(flagOf(null)).toBe("🌐");
  });

  it("summarises the week for the Overview", () => {
    expect(
      weeklyView({
        visitors: 41,
        previous: 36,
        series: [1, 2, 3, 4, 5, 6, 7],
        topCountry: "GB",
        visitorsEver: 300,
      }),
    ).toEqual({
      visitors: 41,
      series: [1, 2, 3, 4, 5, 6, 7],
      change: "+14% on last week",
      top: "the United Kingdom",
    });
    expect(
      weeklyView({ visitors: 3, previous: 0, series: [], topCountry: null, visitorsEver: 3 })
        .change,
    ).toBe("None the week before");
  });
});
