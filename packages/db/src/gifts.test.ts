import { demoSiteContent, demoThemeSettings } from "@ceomaker/schema";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "./client";
import { runMigrations } from "./migrate";
import { getAdminOverview, listAccountsForAdmin } from "./queries/admin";
import { recordAnalyticsEvent } from "./queries/analytics";
import { applySubscriptionEvent, type SubscriptionEvent } from "./queries/billing";
import {
  endProGift,
  expireProGifts,
  giveProGift,
  listGiftReminders,
  markGiftReminded,
} from "./queries/gifts";
import { createSite, getUserPlan, publishSite } from "./queries/sites";
import { session, siteDomain, user } from "./schema";

const url = process.env.TEST_DATABASE_URL;

const NOW = new Date("2026-10-05T12:00:00Z");
const days = (count: number) => new Date(NOW.getTime() + count * 24 * 60 * 60 * 1000);

function payment(overrides: Partial<SubscriptionEvent> = {}): SubscriptionEvent {
  return {
    provider: "freemius",
    subscriptionId: "sub_1",
    userId: "alice",
    status: "active",
    currentPeriodEnd: days(30),
    occurredAt: NOW,
    ...overrides,
  };
}

const draft = {
  templateKey: "meridian" as const,
  templateVersion: 1,
  theme: demoThemeSettings,
  content: demoSiteContent,
};

describe.skipIf(!url)("gifts and admin (integration)", () => {
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
    await db.execute(
      sql`truncate table "user", subscription, site, site_version, analytics_event cascade`,
    );
    await db.insert(user).values([
      { id: "alice", name: "Alice", email: "alice@example.com", createdAt: days(-10) },
      { id: "bob", name: "Bob", email: "bob@example.com", createdAt: days(-2) },
    ]);
  });

  const account = async (id: string) => {
    const [row] = await db.select().from(user).where(eq(user.id, id));
    return row!;
  };

  it("makes the account Pro for the months given, and adds to a gift that hasn't ended", async () => {
    const first = await giveProGift(db, { userId: "alice", months: 3, note: "Beta", now: NOW });
    expect(first).toEqual({
      userId: "alice",
      plan: "pro",
      planChanged: true,
      proUntil: new Date("2027-01-05T12:00:00Z"),
    });
    expect(await getUserPlan(db, "alice")).toBe("pro");

    // A month later, one more month is added to the end, not to today; the note stays.
    const second = await giveProGift(db, { userId: "alice", months: 1, now: days(30) });
    expect(second?.proUntil).toEqual(new Date("2027-02-05T12:00:00Z"));
    expect(second?.planChanged).toBe(false);
    expect((await account("alice")).proNote).toBe("Beta");

    expect(await giveProGift(db, { userId: "nobody", months: 1, now: NOW })).toBeNull();
  });

  it("starts a new gift from today once the last one has ended", async () => {
    await giveProGift(db, { userId: "alice", months: 1, now: days(-60) });
    const gift = await giveProGift(db, { userId: "alice", months: 1, note: "Again", now: NOW });
    expect(gift?.proUntil).toEqual(new Date("2026-11-05T12:00:00Z"));
    expect((await account("alice")).proNote).toBe("Again");
  });

  it("ends a gift, keeping Pro only when a subscription pays for it", async () => {
    await giveProGift(db, { userId: "alice", months: 3, now: NOW });
    const ended = await endProGift(db, { userId: "alice", now: days(1) });
    expect(ended).toMatchObject({ plan: "free", planChanged: true, proUntil: days(1) });
    expect(await getUserPlan(db, "alice")).toBe("free");
    // Nothing left to end.
    expect(await endProGift(db, { userId: "alice", now: days(2) })).toBeNull();
    expect(await endProGift(db, { userId: "bob", now: days(2) })).toBeNull();

    await giveProGift(db, { userId: "bob", months: 3, now: NOW });
    await applySubscriptionEvent(db, payment({ userId: "bob" }), NOW);
    expect(await endProGift(db, { userId: "bob", now: days(1) })).toMatchObject({
      plan: "pro",
      planChanged: false,
    });
  });

  it("ends Pro set by hand, which has no end date, but not a paid one", async () => {
    await db.update(user).set({ plan: "pro" }).where(eq(user.id, "alice"));
    expect(await endProGift(db, { userId: "alice", now: NOW })).toMatchObject({
      plan: "free",
      planChanged: true,
    });

    await applySubscriptionEvent(db, payment({ userId: "bob" }), NOW);
    expect(await endProGift(db, { userId: "bob", now: NOW })).toBeNull();
    expect((await account("bob")).proUntil).toBeNull();
  });

  it("keeps a gift's Pro when billing reports a cancelled subscription", async () => {
    await giveProGift(db, { userId: "alice", months: 3, now: NOW });
    await applySubscriptionEvent(db, payment(), NOW);
    const cancelled = await applySubscriptionEvent(
      db,
      payment({ status: "canceled", occurredAt: days(1) }),
      days(1),
    );
    expect(cancelled).toMatchObject({ outcome: "applied", plan: "pro", planChanged: false });

    // Once the gift has ended, the next billing event finds nothing to keep Pro.
    const late = await applySubscriptionEvent(
      db,
      payment({ status: "canceled", occurredAt: days(100) }),
      days(100),
    );
    expect(late).toMatchObject({ plan: "free", planChanged: true });
  });

  it("ends gifts whose date has passed, and only those", async () => {
    await db.insert(user).values([
      { id: "carol", name: "Carol", email: "carol@example.com", plan: "pro" },
      { id: "dave", name: "Dave", email: "dave@example.com" },
    ]);
    await giveProGift(db, { userId: "alice", months: 1, now: days(-40) }); // ended
    await giveProGift(db, { userId: "bob", months: 1, now: NOW }); // still on
    await giveProGift(db, { userId: "dave", months: 1, now: days(-40) }); // ended, but pays
    await applySubscriptionEvent(db, payment({ userId: "dave", subscriptionId: "sub_d" }), NOW);
    // carol: Pro by hand, no end date.

    expect(await expireProGifts(db, NOW)).toEqual(["alice"]);
    expect(await getUserPlan(db, "alice")).toBe("free");
    expect(await getUserPlan(db, "bob")).toBe("pro");
    expect(await getUserPlan(db, "carol")).toBe("pro");
    expect(await getUserPlan(db, "dave")).toBe("pro");
    // The ended gift's date stays, as history.
    expect((await account("alice")).proUntil).not.toBeNull();
    expect(await expireProGifts(db, NOW)).toEqual([]);
  });

  it("lists gifts ending within a week once, and again after a new gift", async () => {
    await db.insert(user).values({ id: "dave", name: "Dave", email: "dave@example.com" });
    await giveProGift(db, { userId: "alice", months: 1, now: days(-25) }); // ends in 5 or 6 days
    await giveProGift(db, { userId: "bob", months: 1, now: days(-10) }); // ends in about 20 days
    await giveProGift(db, { userId: "dave", months: 1, now: days(-25) }); // ends soon, but pays
    await applySubscriptionEvent(db, payment({ userId: "dave", subscriptionId: "sub_d" }), NOW);

    const due = await listGiftReminders(db, NOW);
    expect(due.map((row) => row.userId)).toEqual(["alice"]);
    expect(due[0]).toMatchObject({ email: "alice@example.com", name: "Alice" });

    // A reminder for an end date that has since changed isn't recorded.
    await markGiftReminded(db, { userId: "alice", proUntil: days(99), now: NOW });
    expect(await listGiftReminders(db, NOW)).toHaveLength(1);
    await markGiftReminded(db, { userId: "alice", proUntil: due[0]!.proUntil, now: NOW });
    expect(await listGiftReminders(db, NOW)).toEqual([]);

    // Extending the gift asks for a new reminder before the new end.
    await giveProGift(db, { userId: "alice", months: 1, now: NOW });
    expect(await listGiftReminders(db, NOW)).toEqual([]);
    expect((await listGiftReminders(db, days(30))).map((row) => row.userId)).toEqual(["alice"]);
  });

  it("counts accounts, published sites, paying and gifted accounts", async () => {
    await db.insert(user).values({ id: "carol", name: "Carol", email: "carol@example.com" });
    const live = await createSite(db, { ...draft, userId: "alice", subdomain: "alice-hart" });
    await publishSite(db, { userId: "alice", siteId: live.id });
    await createSite(db, { ...draft, userId: "bob", subdomain: "bob-draft" });
    await giveProGift(db, { userId: "alice", months: 1, now: NOW });
    await giveProGift(db, { userId: "bob", months: 1, now: NOW });
    await applySubscriptionEvent(db, payment({ userId: "bob" }), NOW);
    await applySubscriptionEvent(db, payment({ userId: "carol", subscriptionId: "sub_c" }), NOW);

    // Carol signed up just now (the database clock), so she counts among the new accounts too.
    expect(await getAdminOverview(db, NOW)).toEqual({
      accounts: 3,
      newAccounts: 2,
      published: 1,
      paying: 2,
      gifted: 1,
    });
  });

  it("lists accounts newest first with their plan, gift and site", async () => {
    const live = await createSite(db, { ...draft, userId: "alice", subdomain: "alice-hart" });
    await publishSite(db, { userId: "alice", siteId: live.id });
    await db.insert(siteDomain).values({
      siteId: live.id,
      domain: "alicehart.com",
      kind: "apex",
      stage: "connected",
      aValue: "76.76.21.21",
      cnameValue: "cname.vercel-dns.com",
      shareToken: "token-alice",
    });
    await createSite(db, {
      ...draft,
      templateKey: "salon",
      userId: "bob",
      subdomain: "bob-draft",
    });
    await giveProGift(db, { userId: "alice", months: 3, note: "Early user", now: NOW });
    await db.insert(session).values({
      id: "s1",
      token: "t1",
      userId: "alice",
      expiresAt: days(7),
      updatedAt: days(-1),
    });
    const view = {
      siteId: live.id,
      kind: "pageview" as const,
      path: "/",
      source: "direct" as const,
      referrerHost: null,
      clickKind: null,
      country: null,
      city: null,
      latitude: null,
      longitude: null,
      device: "desktop" as const,
      visitor: "v",
    };
    await recordAnalyticsEvent(db, { ...view, createdAt: days(-2) });
    await recordAnalyticsEvent(db, { ...view, createdAt: days(-3) });
    await recordAnalyticsEvent(db, { ...view, createdAt: days(-45) }); // too old
    await recordAnalyticsEvent(db, { ...view, kind: "click", clickKind: "email" });

    const { accounts, more } = await listAccountsForAdmin(db, { now: NOW });
    expect(more).toBe(false);
    expect(accounts.map((row) => row.id)).toEqual(["bob", "alice"]);
    const [bob, alice] = accounts;
    expect(bob).toMatchObject({
      plan: "free",
      paid: null,
      proUntil: null,
      lastSeenAt: null,
      site: { subdomain: "bob-draft", status: "draft", templateKey: "salon", views: 0 },
      otherSites: 0,
    });
    expect(bob?.site?.publishedAt).toBeNull();
    expect(alice).toMatchObject({
      plan: "pro",
      paid: null,
      proUntil: new Date("2027-01-05T12:00:00Z"),
      proNote: "Early user",
      lastSeenAt: days(-1),
      site: {
        subdomain: "alice-hart",
        status: "published",
        templateKey: "meridian",
        domain: "alicehart.com",
        views: 2,
      },
    });
    expect(alice?.site?.publishedAt).toBeInstanceOf(Date);
  });

  it("finds accounts by name, email or site address, and pages them", async () => {
    await createSite(db, { ...draft, userId: "bob", subdomain: "bob-draft" });
    const ids = async (search: string) =>
      (await listAccountsForAdmin(db, { search, now: NOW })).accounts.map((row) => row.id);
    expect(await ids("ALICE@")).toEqual(["alice"]);
    expect(await ids("bob-dr")).toEqual(["bob"]);
    expect(await ids("Bo")).toEqual(["bob"]);
    // The search's own % and _ match literally.
    expect(await ids("%")).toEqual([]);
    expect(await ids("_")).toEqual([]);

    const first = await listAccountsForAdmin(db, { limit: 1, now: NOW });
    expect(first.accounts.map((row) => row.id)).toEqual(["bob"]);
    expect(first.more).toBe(true);
  });
});
