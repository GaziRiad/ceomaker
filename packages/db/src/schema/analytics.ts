import type { AnalyticsSource, ClickKind, DeviceKind } from "@ceomaker/schema";
import {
  bigserial,
  index,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { site } from "./sites";

export const analyticsEventKind = pgEnum("analytics_event_kind", ["pageview", "click"]);

/**
 * One page view or link click on a live site. Nothing here identifies a person: no cookies, no
 * network address. `visitor` is a keyed hash of the address and browser that changes every day,
 * enough to count people per day and nothing more. Places are as precise as a city.
 */
export const analyticsEvent = pgTable(
  "analytics_event",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => site.id, { onDelete: "cascade" }),
    kind: analyticsEventKind("kind").notNull(),
    /** The page, relative to the site: "/" for the home page. */
    path: text("path").notNull(),
    source: text("source").$type<AnalyticsSource>().notNull(),
    /** The other site a visitor came from, for "Other sites". */
    referrerHost: text("referrer_host"),
    clickKind: text("click_kind").$type<ClickKind>(),
    /** ISO 3166-1 alpha-2, e.g. "GB". */
    country: text("country"),
    city: text("city"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    device: text("device").$type<DeviceKind>().notNull(),
    visitor: text("visitor").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("analytics_event_site_id_created_at_idx").on(table.siteId, table.createdAt)],
);
