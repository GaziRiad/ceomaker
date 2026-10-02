import type { DomainDiagnosis, DomainKind } from "@ceomaker/schema";
import { sql } from "drizzle-orm";
import { check, index, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { site } from "./sites";

export const domainStage = pgEnum("domain_stage", ["records", "waiting", "securing", "connected"]);

/**
 * A domain the owner connects to their site (one per site). For an apex domain the www host
 * comes with it and forwards to the domain. The row exists from the moment they type it in, so
 * the domain is reserved for them while they add the records; unconnected claims expire.
 */
export const siteDomain = pgTable(
  "site_domain",
  {
    siteId: uuid("site_id")
      .primaryKey()
      .references(() => site.id, { onDelete: "cascade" }),
    /** Lowercase ASCII (punycode), no trailing dot: "ameliahart.com" or "me.ameliahart.com". */
    domain: text("domain").notNull().unique(),
    kind: text("kind").$type<DomainKind>().notNull(),
    stage: domainStage("stage").notNull().default("records"),
    /** The record values the owner was asked to add, fixed when the domain was added. */
    aValue: text("a_value").notNull(),
    cnameValue: text("cname_value").notNull(),
    /** What the latest check found, including anything the owner needs to fix. */
    diagnosis: jsonb("diagnosis").$type<DomainDiagnosis>(),
    /** For the page with the steps that can be sent to an assistant. Unguessable. */
    shareToken: text("share_token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    checkedAt: timestamp("checked_at", { withTimezone: true }),
    connectedAt: timestamp("connected_at", { withTimezone: true }),
  },
  (table) => [
    index("site_domain_stage_checked_at_idx").on(table.stage, table.checkedAt),
    check("site_domain_format", sql`${table.domain} ~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$'`),
    check("site_domain_kind", sql`${table.kind} in ('apex', 'subdomain')`),
  ],
);
