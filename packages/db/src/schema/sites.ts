import type { SiteContent, TemplateKey, ThemeSettings } from "@ceomaker/schema";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
  type PgTableExtraConfigValue,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const siteStatus = pgEnum("site_status", ["draft", "published", "paused"]);
export const siteVersionKind = pgEnum("site_version_kind", ["draft", "published"]);

export const site = pgTable(
  "site",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    subdomain: text("subdomain").notNull().unique(),
    status: siteStatus("status").notNull().default("draft"),
    publishedVersionId: uuid("published_version_id"),
    /**
     * The guided-question answers the site was drafted from. Input for AI rewrites. Rows hold
     * answers of any age; read them with readStoredAnswers, never as they are.
     */
    answers: jsonb("answers").$type<unknown>(),
    /** Email the owner when someone writes through the contact form (once email is set up). */
    notifyMessages: boolean("notify_messages").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table): PgTableExtraConfigValue[] => [
    index("site_user_id_idx").on(table.userId),
    // Composite key: a site can only ever point at one of its own versions, so a bug can never
    // serve one tenant's content on another tenant's domain.
    foreignKey({
      name: "site_published_version_fk",
      columns: [table.publishedVersionId, table.id],
      foreignColumns: [siteVersion.id, siteVersion.siteId],
    }),
    // Defense in depth: mirrors subdomainSchema so no code path can store a malformed host label.
    check(
      "site_subdomain_format",
      sql`${table.subdomain} ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' and length(${table.subdomain}) between 3 and 40 and position('--' in ${table.subdomain}) = 0`,
    ),
    check(
      "site_published_has_version",
      sql`${table.status} = 'draft' or ${table.publishedVersionId} is not null`,
    ),
  ],
);

/**
 * One mutable draft per site plus an append-only history of published snapshots.
 * Published rows are made immutable by a database trigger (see the custom migration).
 */
export const siteVersion = pgTable(
  "site_version",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references((): AnyPgColumn => site.id, { onDelete: "cascade" }),
    kind: siteVersionKind("kind").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    templateKey: text("template_key").$type<TemplateKey>().notNull(),
    /**
     * The design of the template this version uses (TEMPLATE_VERSIONS). A published version
     * keeps showing it after newer designs ship; owners move to one by publishing.
     */
    templateVersion: integer("template_version").notNull().default(1),
    theme: jsonb("theme").$type<ThemeSettings>().notNull(),
    content: jsonb("content").$type<SiteContent>().notNull(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => [
    unique("site_version_id_site_id_unique").on(table.id, table.siteId),
    index("site_version_site_id_created_at_idx").on(table.siteId, table.createdAt),
    uniqueIndex("site_version_one_draft_per_site")
      .on(table.siteId)
      .where(sql`${table.kind} = 'draft'`),
    check("site_version_template_version", sql`${table.templateVersion} >= 1`),
    check(
      "site_version_published_at",
      sql`(${table.kind} = 'published') = (${table.publishedAt} is not null)`,
    ),
  ],
);

/** How long the address of a deleted site that was once live stays reserved for its owner. */
export const ADDRESS_HOLD_DAYS = 90;

/**
 * Addresses of deleted sites that were once published. Links to them may still be out there
 * (LinkedIn, email signatures), so for ADDRESS_HOLD_DAYS nobody else can claim one and show their
 * own page at someone's old link. The owner can take it back. The hold outlives an account deletion.
 */
export const retiredAddress = pgTable("retired_address", {
  subdomain: text("subdomain").primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  retiredAt: timestamp("retired_at", { withTimezone: true }).notNull().defaultNow(),
});
