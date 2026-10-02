import {
  FEW_VISITORS,
  type AnalyticsEventKind,
  type AnalyticsSource,
  type ClickKind,
  type DeviceKind,
} from "@ceomaker/schema";
import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../client";
import { analyticsEvent, site } from "../schema";

// Site analytics. Events are written by the public collector; reports are read by the owner.
// A "visit" is a visitor's first page view in the period: their place, source and device come
// from it, so the breakdowns add up to the visitor count.

const DAY_MS = 24 * 60 * 60 * 1000;

export interface AnalyticsEventInput {
  siteId: string;
  kind: AnalyticsEventKind;
  path: string;
  source: AnalyticsSource;
  referrerHost: string | null;
  clickKind: ClickKind | null;
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  device: DeviceKind;
  visitor: string;
  createdAt?: Date;
}

export async function recordAnalyticsEvent(db: Database, event: AnalyticsEventInput) {
  await db.insert(analyticsEvent).values({ ...event, createdAt: event.createdAt ?? new Date() });
}

/** Start of the UTC day `daysAgo` days before `now`. */
function utcDay(now: Date, daysAgo = 0): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - daysAgo * DAY_MS,
  );
}

const iso = (date: Date) => date.toISOString();

export interface AnalyticsPlace {
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  visitors: number;
  /** Someone from here visited in the last 24 hours. */
  recent: boolean;
}

export interface AnalyticsVisit {
  at: Date;
  country: string | null;
  city: string | null;
  source: AnalyticsSource;
  device: DeviceKind;
}

export interface AnalyticsPeriod {
  visitors: number;
  pageviews: number;
  messages: number;
}

export interface AnalyticsReport {
  days: number;
  now: Date;
  /** Visitors since the first event: decides between "no visits", "a few" and full charts. */
  visitorsEver: number;
  current: AnalyticsPeriod;
  previous: AnalyticsPeriod;
  /** Visitors per day (7 and 30 days) or per week (90 days), oldest first. */
  series: { start: Date; visitors: number }[];
  places: AnalyticsPlace[];
  sources: { source: AnalyticsSource; visitors: number }[];
  otherSites: { host: string; visitors: number }[];
  devices: { device: DeviceKind; visitors: number }[];
  clicks: { kind: ClickKind; count: number }[];
  pages: { path: string; views: number; visitors: number }[];
  /** Every visit, newest first, when there have been only a few (FEW_VISITORS). */
  visits: AnalyticsVisit[];
}

async function ownsSite(db: Database, userId: string, siteId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: site.id })
    .from(site)
    .where(and(eq(site.id, siteId), eq(site.userId, userId)))
    .limit(1);
  return Boolean(row);
}

/** The first page view of each visitor between two instants. */
function visitsBetween(siteId: string, from: Date, to: Date) {
  return sql`
    select distinct on (visitor) visitor, created_at, country, city, latitude, longitude, source,
      referrer_host, device
    from analytics_event
    where site_id = ${siteId} and kind = 'pageview'
      and created_at >= ${iso(from)}::timestamptz and created_at < ${iso(to)}::timestamptz
    order by visitor, created_at`;
}

async function period(
  db: Database,
  siteId: string,
  from: Date,
  to: Date,
): Promise<AnalyticsPeriod> {
  const [row] = await db.execute<{ visitors: string; pageviews: string; messages: string }>(sql`
    select
      (select count(distinct visitor) from analytics_event
        where site_id = ${siteId} and kind = 'pageview'
          and created_at >= ${iso(from)}::timestamptz and created_at < ${iso(to)}::timestamptz)
        as visitors,
      (select count(*) from analytics_event
        where site_id = ${siteId} and kind = 'pageview'
          and created_at >= ${iso(from)}::timestamptz and created_at < ${iso(to)}::timestamptz)
        as pageviews,
      (select count(*) from contact_message
        where site_id = ${siteId}
          and created_at >= ${iso(from)}::timestamptz and created_at < ${iso(to)}::timestamptz)
        as messages`);
  return {
    visitors: Number(row?.visitors ?? 0),
    pageviews: Number(row?.pageviews ?? 0),
    messages: Number(row?.messages ?? 0),
  };
}

/**
 * Everything the Analytics page shows for the last `days` days (today included, UTC days), and
 * the same period before it for comparison. Null when the user doesn't own the site.
 */
export async function getAnalyticsReport(
  db: Database,
  input: { userId: string; siteId: string; days: number; now?: Date },
): Promise<AnalyticsReport | null> {
  if (!(await ownsSite(db, input.userId, input.siteId))) return null;
  const now = input.now ?? new Date();
  const { siteId, days } = input;
  const from = utcDay(now, days - 1);
  const to = new Date(now.getTime() + 1);
  const previousFrom = utcDay(now, 2 * days - 1);
  const weekly = days > 31;
  const today = utcDay(now);
  const dayAgo = new Date(now.getTime() - DAY_MS);

  const [current, previous, ever, series, places, sources, otherSites, devices, clicks, pages] =
    await Promise.all([
      period(db, siteId, from, to),
      period(db, siteId, previousFrom, from),
      db.execute<{ visitors: string }>(sql`
        select count(distinct visitor) as visitors from analytics_event
        where site_id = ${siteId} and kind = 'pageview'`),
      db.execute<{ bucket: number; visitors: string }>(sql`
        select floor(extract(epoch from (${iso(today)}::timestamptz - date_trunc('day', created_at, 'UTC'))) / 86400 / ${weekly ? 7 : 1})::int as bucket,
          count(distinct visitor) as visitors
        from analytics_event
        where site_id = ${siteId} and kind = 'pageview'
          and created_at >= ${iso(from)}::timestamptz and created_at < ${iso(to)}::timestamptz
        group by 1`),
      db.execute<{
        country: string | null;
        city: string | null;
        latitude: number | null;
        longitude: number | null;
        visitors: string;
        recent: boolean;
      }>(sql`
        select country, city, avg(latitude)::real as latitude, avg(longitude)::real as longitude,
          count(*) as visitors, bool_or(created_at > ${iso(dayAgo)}::timestamptz) as recent
        from (${visitsBetween(siteId, from, to)}) visits
        group by country, city
        order by count(*) desc, max(created_at) desc, country, city`),
      db.execute<{ source: AnalyticsSource; visitors: string }>(sql`
        select source, count(*) as visitors from (${visitsBetween(siteId, from, to)}) visits
        group by source order by count(*) desc`),
      db.execute<{ host: string; visitors: string }>(sql`
        select referrer_host as host, count(*) as visitors
        from (${visitsBetween(siteId, from, to)}) visits
        where source = 'other' and referrer_host is not null
        group by referrer_host order by count(*) desc, referrer_host limit 4`),
      db.execute<{ device: DeviceKind; visitors: string }>(sql`
        select device, count(*) as visitors from (${visitsBetween(siteId, from, to)}) visits
        group by device order by count(*) desc`),
      db.execute<{ kind: ClickKind; count: string }>(sql`
        select click_kind as kind, count(*) as count from analytics_event
        where site_id = ${siteId} and kind = 'click' and click_kind is not null
          and created_at >= ${iso(from)}::timestamptz and created_at < ${iso(to)}::timestamptz
        group by click_kind order by count(*) desc`),
      db.execute<{ path: string; views: string; visitors: string }>(sql`
        select path, count(*) as views, count(distinct visitor) as visitors from analytics_event
        where site_id = ${siteId} and kind = 'pageview'
          and created_at >= ${iso(from)}::timestamptz and created_at < ${iso(to)}::timestamptz
        group by path order by count(*) desc, path limit 20`),
    ]);

  const visitorsEver = Number(ever[0]?.visitors ?? 0);
  let visits: AnalyticsVisit[] = [];
  if (visitorsEver > 0 && visitorsEver < FEW_VISITORS) {
    const rows = await db.execute<{
      created_at: string;
      country: string | null;
      city: string | null;
      source: AnalyticsSource;
      device: DeviceKind;
    }>(sql`
      select created_at, country, city, source, device
      from (${visitsBetween(siteId, new Date(0), to)}) visits
      order by created_at desc limit ${FEW_VISITORS}`);
    visits = rows.map((row) => ({
      at: new Date(row.created_at),
      country: row.country,
      city: row.city,
      source: row.source,
      device: row.device,
    }));
  }

  const buckets = weekly ? Math.ceil(days / 7) : days;
  const perBucket = new Map(series.map((row) => [Number(row.bucket), Number(row.visitors)]));
  return {
    days,
    now,
    visitorsEver,
    current,
    previous,
    series: Array.from({ length: buckets }, (_, index) => {
      const ago = buckets - 1 - index;
      return {
        start: utcDay(now, weekly ? ago * 7 + 6 : ago),
        visitors: perBucket.get(ago) ?? 0,
      };
    }),
    places: places.map((row) => ({
      country: row.country,
      city: row.city,
      latitude: row.latitude === null ? null : Number(row.latitude),
      longitude: row.longitude === null ? null : Number(row.longitude),
      visitors: Number(row.visitors),
      recent: Boolean(row.recent),
    })),
    sources: sources.map((row) => ({ source: row.source, visitors: Number(row.visitors) })),
    otherSites: otherSites.map((row) => ({ host: row.host, visitors: Number(row.visitors) })),
    devices: devices.map((row) => ({ device: row.device, visitors: Number(row.visitors) })),
    clicks: clicks.map((row) => ({ kind: row.kind, count: Number(row.count) })),
    pages: pages.map((row) => ({
      path: row.path,
      views: Number(row.views),
      visitors: Number(row.visitors),
    })),
    visits,
  };
}

export interface WeeklyVisitors {
  visitors: number;
  previous: number;
  /** The last 7 days, oldest first. */
  series: number[];
  /** Where most visitors were this week (ISO country code), or null. */
  topCountry: string | null;
  visitorsEver: number;
}

/** The Overview's "Visitors this week" card. Null when the user doesn't own the site. */
export async function getWeeklyVisitors(
  db: Database,
  input: { userId: string; siteId: string; now?: Date },
): Promise<WeeklyVisitors | null> {
  if (!(await ownsSite(db, input.userId, input.siteId))) return null;
  const now = input.now ?? new Date();
  const { siteId } = input;
  const from = utcDay(now, 6);
  const to = new Date(now.getTime() + 1);
  const today = utcDay(now);
  const [[totals], days, [top]] = await Promise.all([
    db.execute<{ visitors: string; previous: string; ever: string }>(sql`
      select
        count(distinct visitor) filter (where created_at >= ${iso(from)}::timestamptz) as visitors,
        count(distinct visitor) filter (where created_at < ${iso(from)}::timestamptz
          and created_at >= ${iso(utcDay(now, 13))}::timestamptz) as previous,
        count(distinct visitor) as ever
      from analytics_event
      where site_id = ${siteId} and kind = 'pageview' and created_at < ${iso(to)}::timestamptz`),
    db.execute<{ bucket: number; visitors: string }>(sql`
      select floor(extract(epoch from (${iso(today)}::timestamptz - date_trunc('day', created_at, 'UTC'))) / 86400)::int as bucket,
        count(distinct visitor) as visitors
      from analytics_event
      where site_id = ${siteId} and kind = 'pageview'
        and created_at >= ${iso(from)}::timestamptz and created_at < ${iso(to)}::timestamptz
      group by 1`),
    db.execute<{ country: string }>(sql`
      select country from (${visitsBetween(siteId, from, to)}) visits
      where country is not null
      group by country order by count(*) desc, country limit 1`),
  ]);
  const perDay = new Map(days.map((row) => [Number(row.bucket), Number(row.visitors)]));
  return {
    visitors: Number(totals?.visitors ?? 0),
    previous: Number(totals?.previous ?? 0),
    series: Array.from({ length: 7 }, (_, index) => perDay.get(6 - index) ?? 0),
    topCountry: top?.country ?? null,
    visitorsEver: Number(totals?.ever ?? 0),
  };
}
