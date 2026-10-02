import type { AnalyticsReport, WeeklyVisitors } from "@ceomaker/db";
import {
  FEW_VISITORS,
  type AnalyticsSource,
  type ClickKind,
  type DeviceKind,
} from "@ceomaker/schema";

// Turns raw numbers into what the Analytics page says. Plain data in, plain data out: the page
// renders it, the tests read it.

export const SOURCE_LABELS: Record<AnalyticsSource, { label: string; note: string }> = {
  linkedin: { label: "LinkedIn", note: "" },
  google: { label: "Google", note: "Searched for you" },
  direct: { label: "Direct", note: "Typed the address or used a saved link" },
  email: { label: "Email", note: "Clicked a link in an email" },
  other: { label: "Other sites", note: "" },
};

export const CLICK_LABELS: Record<ClickKind | "form", string> = {
  form: "Sent a message through your form",
  email: "Clicked your email address",
  linkedin: "Clicked your LinkedIn",
  site: "Clicked your company website",
  phone: "Clicked your phone number",
  other: "Clicked another link",
};

export const DEVICE_LABELS: Record<DeviceKind, string> = {
  phone: "Phone",
  desktop: "Desktop",
  tablet: "Tablet",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const short = (date: Date) => `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
const long = (date: Date) => `${date.getUTCDate()} ${LONG_MONTHS[date.getUTCMonth()]}`;

const regions = new Intl.DisplayNames(["en"], { type: "region" });

export function countryName(code: string | null): string {
  if (!code) return "Unknown location";
  try {
    return regions.of(code) ?? code;
  } catch {
    return code;
  }
}

/** "the United Kingdom", "the Netherlands", "Germany". */
export function withArticle(country: string): string {
  return /^(United|Netherlands|Philippines|Bahamas|Gambia|Maldives|Czech|Dominican|Central African|Marshall|Solomon|Comoros|Seychelles)/.test(
    country,
  )
    ? `the ${country}`
    : country;
}

export function flagOf(code: string | null): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(...[...code].map((letter) => 127397 + letter.charCodeAt(0)));
}

const people = (count: number) => (count === 1 ? "1 person" : `${count} people`);
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export interface Change {
  text: string;
  /** up: shown with the rising icon in the accent colour; down and flat are neutral. */
  direction: "up" | "down" | "flat";
}

/** "+18% on the previous 30 days", for counts. */
export function percentChange(current: number, previous: number, days: number): Change {
  const period = `the previous ${days} days`;
  if (previous === 0) {
    return current === 0
      ? { text: `None in ${period} either`, direction: "flat" }
      : { text: `None in ${period}`, direction: "up" };
  }
  const percent = Math.round(((current - previous) / previous) * 100);
  if (percent === 0) return { text: `Same as ${period}`, direction: "flat" };
  return percent > 0
    ? { text: `+${percent}% on ${period}`, direction: "up" }
    : { text: `−${Math.abs(percent)}% on ${period}`, direction: "down" };
}

/** "+3 on the previous 30 days", for small counts like messages. */
export function countChange(current: number, previous: number, days: number): Change {
  const difference = current - previous;
  const period = `the previous ${days} days`;
  if (difference === 0) return { text: `Same as ${period}`, direction: "flat" };
  return difference > 0
    ? { text: `+${difference} on ${period}`, direction: "up" }
    : { text: `−${Math.abs(difference)} on ${period}`, direction: "down" };
}

export interface CountryView {
  code: string | null;
  name: string;
  flag: string;
  visitors: number;
  cities: { name: string; visitors: number; recent: boolean }[];
}

export interface MapPlaceView {
  key: string;
  city: string;
  country: string;
  code: string | null;
  latitude: number;
  longitude: number;
  visitors: number;
  recent: boolean;
}

export interface ReportView {
  mode: "none" | "few" | "full";
  summary: string;
  tiles: { label: string; value: string; change: Change | null; note: string }[];
  chart: {
    subtitle: string;
    aria: string;
    bars: { visitors: number; label: string; tip: string }[];
    top: number;
    axis: [string, string, string];
    busiest: string;
  } | null;
  /** Every visit when there have been only a few; `iso` lets the browser show local time. */
  visits: { when: string; iso: string; place: string; how: string }[];
  geoSubtitle: string;
  countries: CountryView[];
  places: MapPlaceView[];
  sources: {
    key: AnalyticsSource;
    label: string;
    note: string;
    visitors: number;
    percent: string;
    share: number;
    sub: { host: string; visitors: number }[];
  }[];
  actions: { key: ClickKind | "form"; label: string; count: number }[];
  pages: { name: string; path: string; views: number; visitors: number }[];
  devices: { key: DeviceKind; label: string; visitors: number; percent: string; share: number }[];
}

function niceTop(max: number): number {
  return max <= 4 ? 4 : Math.ceil(max / 4) * 4;
}

/** Everything the Analytics page shows, from one report. `publishedAt`: the first publish. */
export function reportView(report: AnalyticsReport, publishedAt: Date | null): ReportView {
  const { days, current, previous } = report;
  const mode =
    report.visitorsEver === 0 ? "none" : report.visitorsEver < FEW_VISITORS ? "few" : "full";
  const few = mode === "few";
  const totalVisitors = few ? report.visitorsEver : current.visitors;

  const byCountry = new Map<string, CountryView>();
  for (const place of report.places) {
    const key = place.country ?? "";
    const country =
      byCountry.get(key) ??
      byCountry
        .set(key, {
          code: place.country,
          name: countryName(place.country),
          flag: flagOf(place.country),
          visitors: 0,
          cities: [],
        })
        .get(key)!;
    country.visitors += place.visitors;
    country.cities.push({
      name: place.city ?? "Unknown city",
      visitors: place.visitors,
      recent: place.recent,
    });
  }
  const countries = [...byCountry.values()].sort(
    (a, b) => b.visitors - a.visitors || Number(a.code === null) - Number(b.code === null),
  );
  for (const country of countries) country.cities.sort((a, b) => b.visitors - a.visitors);
  const places: MapPlaceView[] = report.places
    .filter((place) => place.latitude !== null && place.longitude !== null && place.country)
    .map((place) => ({
      key: `${place.country}:${place.city ?? ""}`,
      city: place.city ?? "Unknown city",
      country: countryName(place.country),
      code: place.country,
      latitude: place.latitude!,
      longitude: place.longitude!,
      visitors: place.visitors,
      recent: place.recent,
    }));
  const known = countries.filter((country) => country.code);
  const cityCount = report.places.filter((place) => place.city).length;

  const sourceTotal = report.sources.reduce((sum, row) => sum + row.visitors, 0) || 1;
  const sourceMax = Math.max(1, ...report.sources.map((row) => row.visitors));
  const sources = report.sources.map((row) => ({
    key: row.source,
    ...SOURCE_LABELS[row.source],
    visitors: row.visitors,
    percent: `${Math.round((row.visitors / sourceTotal) * 100)}%`,
    share: row.visitors / sourceMax,
    sub: row.source === "other" ? report.otherSites : [],
  }));
  const top = report.sources[0];

  const deviceTotal = report.devices.reduce((sum, row) => sum + row.visitors, 0) || 1;
  const devices = report.devices.map((row) => ({
    key: row.device,
    label: DEVICE_LABELS[row.device],
    visitors: row.visitors,
    percent: `${Math.round((row.visitors / deviceTotal) * 100)}%`,
    share: row.visitors / deviceTotal,
  }));

  const actions = [
    ...report.clicks.map((row) => ({
      key: row.kind,
      label: CLICK_LABELS[row.kind],
      count: row.count,
    })),
    ...(current.messages > 0
      ? [{ key: "form" as const, label: CLICK_LABELS.form, count: current.messages }]
      : []),
  ].sort((a, b) => b.count - a.count);

  const pages = report.pages.map((row) => ({
    name: row.path === "/" ? "Home" : row.path.replace(/^\//, ""),
    path: row.path,
    views: row.views,
    visitors: row.visitors,
  }));

  const since = publishedAt ? long(publishedAt) : null;
  let summary: string;
  if (mode === "none") summary = "";
  else if (few) {
    const fromTop = top ? report.visits.filter((visit) => visit.source === top.source).length : 0;
    summary = `${people(report.visitorsEver)} ${report.visitorsEver === 1 ? "has" : "have"} visited your site${since ? ` since you published on ${since}` : ""}.${
      top && fromTop > 0
        ? ` ${fromTop === report.visitorsEver ? (report.visitorsEver === 1 ? "They" : "All of them") : fromTop === 1 ? "One" : fromTop === 2 ? "Two" : String(fromTop)} came from ${SOURCE_LABELS[top.source].label}.`
        : ""
    }`;
  } else if (current.visitors === 0) {
    summary = `Nobody visited your site in the last ${days} days.`;
  } else {
    const percent = previous.visitors
      ? Math.round(((current.visitors - previous.visitors) / previous.visitors) * 100)
      : null;
    const comparison =
      percent === null
        ? ""
        : percent > 0
          ? `, ${percent}% more than the ${days} days before`
          : percent < 0
            ? `, ${Math.abs(percent)}% fewer than the ${days} days before`
            : `, about as many as the ${days} days before`;
    const lead = known[0];
    const where =
      lead && (known.length === 1 || lead.visitors > (known[1]?.visitors ?? 0))
        ? known.length === 1
          ? `, all in ${withArticle(lead.name)}`
          : `, and more were in ${withArticle(lead.name)} than anywhere else`
        : "";
    summary = `${people(current.visitors)} visited your site in the last ${days} days${comparison}.${
      top ? ` Most came from ${SOURCE_LABELS[top.source].label}${where}.` : ""
    }`;
  }

  const tiles = few
    ? [
        {
          label: "Visitors",
          value: String(report.visitorsEver),
          change: null,
          note: since ? `Since ${short(publishedAt!)}` : "So far",
        },
        {
          label: "Page views",
          value: String(current.pageviews),
          change: null,
          note: totalVisitors
            ? `About ${Math.max(1, Math.round(current.pageviews / totalVisitors))} per visitor`
            : "",
        },
        {
          label: "Messages received",
          value: String(current.messages),
          change: null,
          note: current.messages
            ? `${plural(current.messages, "message", "messages")} so far`
            : "None yet",
        },
        {
          label: "Top source",
          value: top ? SOURCE_LABELS[top.source].label : "None yet",
          change: null,
          note: top ? `${top.visitors} of ${sourceTotal} visitors` : "",
        },
      ]
    : [
        {
          label: "Visitors",
          value: String(current.visitors),
          change: percentChange(current.visitors, previous.visitors, days),
          note: "",
        },
        {
          label: "Page views",
          value: String(current.pageviews),
          change: percentChange(current.pageviews, previous.pageviews, days),
          note: "",
        },
        {
          label: "Messages received",
          value: String(current.messages),
          change: countChange(current.messages, previous.messages, days),
          note: "",
        },
        {
          label: "Top source",
          value: top ? SOURCE_LABELS[top.source].label : "None yet",
          change: null,
          note: top
            ? `${Math.round((top.visitors / sourceTotal) * 100)}% of visitors`
            : "No visitors yet",
        },
      ];

  const weekly = days > 31;
  let chart: ReportView["chart"] = null;
  if (mode === "full") {
    const bars = report.series.map((bucket, index) => {
      const label = weekly
        ? `Week of ${short(bucket.start)}`
        : `${DAYS[bucket.start.getUTCDay()]} ${short(bucket.start)}`;
      return {
        visitors: bucket.visitors,
        label: index === report.series.length - 1 && !weekly ? "Today" : label,
        tip: `${label} · ${plural(bucket.visitors, "visitor", "visitors")}`,
      };
    });
    const best = report.series.reduce(
      (winner, bucket, index) =>
        bucket.visitors > (report.series[winner]?.visitors ?? -1) ? index : winner,
      0,
    );
    const bestBucket = report.series[best];
    const topValue = niceTop(Math.max(0, ...report.series.map((bucket) => bucket.visitors)));
    const first = report.series[0]!.start;
    const middle = report.series[Math.floor(report.series.length / 2)]!.start;
    chart = {
      subtitle: weekly ? "Visitors per week" : "Visitors per day",
      aria: `Visitors per ${weekly ? "week" : "day"} for the last ${days} days`,
      bars,
      top: topValue,
      axis: [short(first), short(middle), weekly ? short(report.series.at(-1)!.start) : "Today"],
      busiest:
        bestBucket && bestBucket.visitors > 0
          ? weekly
            ? `Busiest week: week of ${short(bestBucket.start)} · ${plural(bestBucket.visitors, "visitor", "visitors")}`
            : `Busiest day: ${DAYS[bestBucket.start.getUTCDay()]} ${short(bestBucket.start)} · ${plural(bestBucket.visitors, "visitor", "visitors")}`
          : "",
    };
  }

  const visits = report.visits.map((visit) => ({
    when: `${DAYS[visit.at.getUTCDay()]} ${short(visit.at)}, ${String(visit.at.getUTCHours()).padStart(2, "0")}:${String(visit.at.getUTCMinutes()).padStart(2, "0")}`,
    iso: visit.at.toISOString(),
    place:
      [visit.city, visit.country ? countryName(visit.country) : null].filter(Boolean).join(", ") ||
      "Unknown location",
    how: `${visit.source === "direct" ? "Typed the address" : visit.source === "other" ? "From another site" : `From ${SOURCE_LABELS[visit.source].label}`} · ${DEVICE_LABELS[visit.device]}`,
  }));

  return {
    mode,
    summary,
    tiles,
    chart,
    visits,
    geoSubtitle: `${plural(known.length, "country", "countries")} · ${plural(cityCount, "city", "cities")}`,
    countries,
    places,
    sources,
    actions,
    pages,
    devices,
  };
}

/** The Overview's "Visitors this week" card. */
export function weeklyView(weekly: WeeklyVisitors): {
  visitors: number;
  series: number[];
  change: string;
  top: string | null;
} {
  const change = weekly.previous
    ? (() => {
        const percent = Math.round(((weekly.visitors - weekly.previous) / weekly.previous) * 100);
        return percent === 0
          ? "Same as last week"
          : `${percent > 0 ? "+" : "−"}${Math.abs(percent)}% on last week`;
      })()
    : weekly.visitors
      ? "None the week before"
      : "None this week yet";
  return {
    visitors: weekly.visitors,
    series: weekly.series,
    change,
    top: weekly.topCountry ? withArticle(countryName(weekly.topCountry)) : null,
  };
}
