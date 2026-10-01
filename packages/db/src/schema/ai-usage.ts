import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { site } from "./sites";

export const aiUsageKind = pgEnum("ai_usage_kind", ["generate", "rewrite"]);
export const aiUsageStatus = pgEnum("ai_usage_status", [
  "started",
  "succeeded",
  "failed",
  "refused",
  "rejected",
]);

/**
 * One row per AI request: the basis for per-user rate limits and for cost tracking.
 * A row is written before the model is called, so concurrent requests count against the limit.
 */
export const aiUsage = pgTable(
  "ai_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    siteId: uuid("site_id").references(() => site.id, { onDelete: "set null" }),
    kind: aiUsageKind("kind").notNull(),
    status: aiUsageStatus("status").notNull().default("started"),
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [index("ai_usage_user_id_created_at_idx").on(table.userId, table.createdAt)],
);
