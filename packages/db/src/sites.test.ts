import { defaultTheme, demoSiteContent, parseSiteContentForRender } from "@ceomaker/schema";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "./client";
import { InvalidSiteDataError, SiteNotFoundError, SubdomainTakenError } from "./errors";
import { runMigrations } from "./migrate";
import {
  createSite,
  getPublishedSiteBySubdomain,
  listSitesForUser,
  publishSite,
  saveDraft,
} from "./queries/sites";
import { site, siteVersion, user } from "./schema";

const url = process.env.TEST_DATABASE_URL;

const draft = { templateKey: "executive" as const, theme: defaultTheme, content: demoSiteContent };

describe.skipIf(!url)("sites (integration)", () => {
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
    await db.execute(sql`truncate table "user", site, site_version cascade`);
    await db.insert(user).values([
      { id: "alice", name: "Alice", email: "alice@example.com" },
      { id: "mallory", name: "Mallory", email: "mallory@example.com" },
    ]);
  });

  it("does not serve a site until it is published", async () => {
    await createSite(db, { ...draft, userId: "alice", subdomain: "alice" });
    expect(await getPublishedSiteBySubdomain(db, "alice")).toBeNull();

    await publishSite(db, {
      userId: "alice",
      siteId: (await listSitesForUser(db, "alice"))[0]!.id,
    });
    const published = await getPublishedSiteBySubdomain(db, "alice");
    expect(published?.templateKey).toBe("executive");
    expect(parseSiteContentForRender(published?.content).sections).toHaveLength(
      demoSiteContent.sections.length,
    );
  });

  it("claims subdomains uniquely and case-insensitively", async () => {
    await createSite(db, { ...draft, userId: "alice", subdomain: "alice" });
    await expect(
      createSite(db, { ...draft, userId: "mallory", subdomain: "Alice" }),
    ).rejects.toBeInstanceOf(SubdomainTakenError);
  });

  it("rejects invalid content and writes nothing", async () => {
    const bad = {
      ...demoSiteContent,
      sections: [
        {
          id: "a",
          type: "about",
          heading: "x",
          body: [{ spans: [{ text: "hi", href: "javascript:alert(1)" }] }],
        },
      ],
    };
    await expect(
      // @ts-expect-error deliberately invalid input
      createSite(db, { ...draft, content: bad, userId: "alice", subdomain: "alice" }),
    ).rejects.toBeInstanceOf(InvalidSiteDataError);
    expect(await listSitesForUser(db, "alice")).toHaveLength(0);
  });

  it("does not let one user edit or publish another user's site", async () => {
    const { id } = await createSite(db, { ...draft, userId: "alice", subdomain: "alice" });
    await expect(saveDraft(db, { ...draft, userId: "mallory", siteId: id })).rejects.toBeInstanceOf(
      SiteNotFoundError,
    );
    await expect(publishSite(db, { userId: "mallory", siteId: id })).rejects.toBeInstanceOf(
      SiteNotFoundError,
    );
  });

  it("keeps published history immutable and moves the live pointer on republish", async () => {
    const { id } = await createSite(db, { ...draft, userId: "alice", subdomain: "alice" });
    const first = await publishSite(db, { userId: "alice", siteId: id });

    const edited = { ...demoSiteContent, meta: { name: "Alice", title: "Alice, Updated" } };
    await saveDraft(db, { ...draft, content: edited, userId: "alice", siteId: id });
    const second = await publishSite(db, { userId: "alice", siteId: id });

    expect(second.versionId).not.toBe(first.versionId);
    const live = await getPublishedSiteBySubdomain(db, "alice");
    expect(live?.versionId).toBe(second.versionId);
    expect(parseSiteContentForRender(live?.content).meta?.title).toBe("Alice, Updated");

    await expect(
      db.update(siteVersion).set({ schemaVersion: 99 }).where(eq(siteVersion.id, first.versionId)),
    ).rejects.toThrow();
  });

  it("stops serving a paused site", async () => {
    const { id } = await createSite(db, { ...draft, userId: "alice", subdomain: "alice" });
    await publishSite(db, { userId: "alice", siteId: id });
    await db.update(site).set({ status: "paused" }).where(eq(site.id, id));
    expect(await getPublishedSiteBySubdomain(db, "alice")).toBeNull();
  });

  it("enforces subdomain format in the database, even if app validation is bypassed", async () => {
    await expect(
      db.insert(site).values({ userId: "alice", subdomain: "Bad_Name" }),
    ).rejects.toThrow();
  });

  it("cannot point a site at another tenant's version", async () => {
    const a = await createSite(db, { ...draft, userId: "alice", subdomain: "alice" });
    const m = await createSite(db, { ...draft, userId: "mallory", subdomain: "mallory" });
    const mPublished = await publishSite(db, { userId: "mallory", siteId: m.id });
    await expect(
      db
        .update(site)
        .set({ status: "published", publishedVersionId: mPublished.versionId })
        .where(eq(site.id, a.id)),
    ).rejects.toThrow();
  });

  it("keeps a published version when its author (not the owner) deletes their account", async () => {
    const { id } = await createSite(db, { ...draft, userId: "alice", subdomain: "alice" });
    const { versionId } = await publishSite(db, { userId: "alice", siteId: id });
    await db.execute(sql`alter table site_version disable trigger site_version_guard_update`);
    await db.update(siteVersion).set({ createdBy: "mallory" }).where(eq(siteVersion.id, versionId));
    await db.execute(sql`alter table site_version enable trigger site_version_guard_update`);

    await db.delete(user).where(eq(user.id, "mallory"));
    const [kept] = await db.select().from(siteVersion).where(eq(siteVersion.id, versionId));
    expect(kept?.createdBy).toBeNull();
    expect((await getPublishedSiteBySubdomain(db, "alice"))?.versionId).toBe(versionId);
  });

  it("deletes everything when a user is deleted", async () => {
    const { id } = await createSite(db, { ...draft, userId: "alice", subdomain: "alice" });
    await publishSite(db, { userId: "alice", siteId: id });
    await db.delete(user).where(eq(user.id, "alice"));
    expect(await db.select().from(siteVersion)).toHaveLength(0);
  });
});
