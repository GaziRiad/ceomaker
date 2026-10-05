import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** See user.signupSource. `source` is a short label: "linkedin", "google", "direct", a campaign's name… */
export interface SignupSource {
  source: string;
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  landingPath: string | null;
}

// Tables required by Better Auth (verified against `getAuthTables` for better-auth 1.7).
// Property names must match Better Auth's field names; column names are snake_case.

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  /**
   * "free" or "pro" (see PLANS in @ceomaker/schema). Not a Better Auth field: the database default
   * makes every new account free. Kept in step with the account's subscriptions and its Pro
   * gift (proUntil) whenever either changes, so everything that reads the plan reads this.
   * Accounts set to Pro by hand, with neither, stay Pro until a gift or a subscription changes it.
   */
  plan: text("plan").notNull().default("free"),
  /** Pro given for free (from the admin page) until this moment. Kept after it ends, as history. */
  proUntil: timestamp("pro_until", { withTimezone: true }),
  /** Why the gift was given, for the admin page. */
  proNote: text("pro_note"),
  /** When the "your gift ends soon" email went out for the current gift. */
  proRemindedAt: timestamp("pro_reminded_at", { withTimezone: true }),
  /**
   * Where the visit that led to the sign-up came from (referrer and campaign tags), saved once
   * just after the account is created. Null for accounts made before this was recorded.
   */
  signupSource: jsonb("signup_source").$type<SignupSource>(),
  /** Last canvas size the owner picked in the editor: "desktop", "tablet" or "phone". */
  editorDevice: text("editor_device"),
  ...timestamps,
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

/** Shared rate-limit counters, so limits hold across serverless instances. */
export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});
