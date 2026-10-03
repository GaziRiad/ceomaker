import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "./client";
import { runMigrations } from "./migrate";
import {
  applySubscriptionEvent,
  findUserIdByEmail,
  listSubscriptions,
  type SubscriptionEvent,
} from "./queries/billing";
import { getUserPlan } from "./queries/sites";
import { subscription, user } from "./schema";

const url = process.env.TEST_DATABASE_URL;

const at = (minute: number) => new Date(Date.UTC(2026, 9, 1, 10, minute));

function event(overrides: Partial<SubscriptionEvent> = {}): SubscriptionEvent {
  return {
    provider: "paddle",
    subscriptionId: "sub_1",
    customerId: "ctm_1",
    userId: "alice",
    status: "active",
    currentPeriodEnd: new Date("2026-11-01T10:00:00Z"),
    occurredAt: at(0),
    ...overrides,
  };
}

describe.skipIf(!url)("billing (integration)", () => {
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
    await db.execute(sql`truncate table "user", subscription cascade`);
    await db.insert(user).values([
      { id: "alice", name: "Alice", email: "alice@example.com" },
      { id: "mallory", name: "Mallory", email: "mallory@example.com" },
    ]);
  });

  it("makes the account Pro when a subscription starts, and free when it is canceled", async () => {
    expect(await applySubscriptionEvent(db, event())).toEqual({
      outcome: "applied",
      userId: "alice",
      plan: "pro",
      planChanged: true,
    });
    expect(await getUserPlan(db, "alice")).toBe("pro");

    // Later events need not carry our account id.
    const canceled = event({ userId: null, status: "canceled", occurredAt: at(5) });
    expect(await applySubscriptionEvent(db, canceled)).toMatchObject({
      outcome: "applied",
      plan: "free",
      planChanged: true,
    });
    expect(await getUserPlan(db, "alice")).toBe("free");
  });

  it("keeps Pro while a payment is retried, and ends it when the subscription is paused", async () => {
    await applySubscriptionEvent(db, event());
    const retrying = await applySubscriptionEvent(
      db,
      event({ status: "past_due", occurredAt: at(1) }),
    );
    expect(retrying).toMatchObject({ outcome: "applied", plan: "pro", planChanged: false });

    await applySubscriptionEvent(db, event({ status: "paused", occurredAt: at(2) }));
    expect(await getUserPlan(db, "alice")).toBe("free");
  });

  it("ignores an older event that arrives after a newer one, and repeats safely", async () => {
    await applySubscriptionEvent(db, event({ status: "canceled", occurredAt: at(5) }));
    expect(await applySubscriptionEvent(db, event({ occurredAt: at(0) }))).toEqual({
      outcome: "stale",
      userId: "alice",
    });
    expect(await getUserPlan(db, "alice")).toBe("free");

    const again = await applySubscriptionEvent(
      db,
      event({ status: "canceled", occurredAt: at(5) }),
    );
    expect(again).toMatchObject({ outcome: "applied", plan: "free", planChanged: false });
    expect(await db.select().from(subscription)).toHaveLength(1);
  });

  it("stays Pro while any of the account's subscriptions grants it", async () => {
    await applySubscriptionEvent(db, event());
    await applySubscriptionEvent(db, event({ subscriptionId: "sub_2", occurredAt: at(1) }));
    await applySubscriptionEvent(db, event({ status: "canceled", occurredAt: at(2) }));
    expect(await getUserPlan(db, "alice")).toBe("pro");

    await applySubscriptionEvent(
      db,
      event({ subscriptionId: "sub_2", status: "canceled", occurredAt: at(3) }),
    );
    expect(await getUserPlan(db, "alice")).toBe("free");
  });

  it("keeps a subscription with the account it started on", async () => {
    await applySubscriptionEvent(db, event());
    const moved = await applySubscriptionEvent(
      db,
      event({ userId: "mallory", status: "canceled", occurredAt: at(1) }),
    );
    expect(moved).toMatchObject({ outcome: "applied", userId: "alice", plan: "free" });
    expect(await getUserPlan(db, "mallory")).toBe("free");
  });

  it("does nothing for a subscription it can't place", async () => {
    expect(await applySubscriptionEvent(db, event({ userId: null }))).toEqual({
      outcome: "unknown",
    });
    expect(await applySubscriptionEvent(db, event({ userId: "nobody" }))).toEqual({
      outcome: "unknown",
    });
    expect(await db.select().from(subscription)).toHaveLength(0);
  });

  it("leaves complimentary Pro alone on accounts without subscriptions", async () => {
    await db.update(user).set({ plan: "pro" }).where(eq(user.id, "mallory"));
    await applySubscriptionEvent(db, event({ status: "canceled" }));
    expect(await getUserPlan(db, "mallory")).toBe("pro");
  });

  it("removes the account's subscriptions with the account", async () => {
    await applySubscriptionEvent(db, event());
    await db.delete(user).where(eq(user.id, "alice"));
    expect(await db.select().from(subscription)).toHaveLength(0);
  });

  it("finds a buyer's account by email, whatever the case", async () => {
    expect(await findUserIdByEmail(db, " Alice@Example.com ")).toBe("alice");
    expect(await findUserIdByEmail(db, "nobody@example.com")).toBeNull();
  });

  it("lists the account's subscriptions, the latest change first", async () => {
    await applySubscriptionEvent(db, event({ status: "canceled", occurredAt: at(1) }));
    await applySubscriptionEvent(db, event({ subscriptionId: "sub_2", occurredAt: at(2) }));
    expect(await listSubscriptions(db, "alice")).toEqual([
      expect.objectContaining({ providerSubscriptionId: "sub_2", status: "active" }),
      expect.objectContaining({ providerSubscriptionId: "sub_1", status: "canceled" }),
    ]);
    expect(await listSubscriptions(db, "mallory")).toEqual([]);
  });
});
