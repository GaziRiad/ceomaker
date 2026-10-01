import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { site } from "./sites";

/**
 * Messages visitors send through a site's contact form. They belong to the site and go with it
 * when it's deleted. `senderKey` is a keyed hash of the sender's network address, kept only to
 * rate-limit repeat senders; the address itself is never stored.
 */
export const contactMessage = pgTable(
  "contact_message",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    siteId: uuid("site_id")
      .notNull()
      .references(() => site.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    organisation: text("organisation"),
    topic: text("topic"),
    message: text("message").notNull(),
    senderKey: text("sender_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("contact_message_site_id_created_at_idx").on(table.siteId, table.createdAt)],
);
