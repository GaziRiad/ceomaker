import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "./client";
import { runMigrations } from "./migrate";
import { recordSignupSource } from "./queries/signup";
import { user, type SignupSource } from "./schema";

const url = process.env.TEST_DATABASE_URL;

const NOW = new Date("2026-10-05T12:00:00Z");
const hours = (count: number) => new Date(NOW.getTime() + count * 60 * 60 * 1000);

const linkedin: SignupSource = {
  source: "linkedin",
  referrerHost: "linkedin.com",
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  landingPath: "/",
};

describe.skipIf(!url)("sign-up source (integration)", () => {
  let db: Database;
  let close: () => Promise<void>;

  beforeAll(async () => {
    if (!url || !new URL(url).pathname.endsWith("_test")) {
      throw new Error("TEST_DATABASE_URL must point at a database whose name ends in _test");
    }
    await runMigrations(url);
    ({ db, close } = createDatabase(url, { maxConnections: 2 }));
  });

  afterAll(async () => {
    await close?.();
  });

  beforeEach(async () => {
    await db.execute(sql`truncate table "user" cascade`);
    await db.insert(user).values([
      { id: "new", name: "New", email: "new@example.com", createdAt: hours(-1) },
      { id: "old", name: "Old", email: "old@example.com", createdAt: hours(-48) },
    ]);
  });

  const stored = async (id: string) =>
    (await db.select({ source: user.signupSource }).from(user).where(eq(user.id, id)))[0]?.source;

  it("saves the source once, for a new account", async () => {
    expect(await recordSignupSource(db, { userId: "new", source: linkedin, now: NOW })).toBe(true);
    expect(await stored("new")).toEqual(linkedin);
    // A second visit to the same link changes nothing and isn't counted again.
    expect(
      await recordSignupSource(db, {
        userId: "new",
        source: { ...linkedin, source: "google" },
        now: NOW,
      }),
    ).toBe(false);
    expect(await stored("new")).toEqual(linkedin);
  });

  it("leaves accounts older than a day, and unknown accounts, alone", async () => {
    expect(await recordSignupSource(db, { userId: "old", source: linkedin, now: NOW })).toBe(false);
    expect(await stored("old")).toBeNull();
    expect(await recordSignupSource(db, { userId: "nobody", source: linkedin, now: NOW })).toBe(
      false,
    );
  });
});
