import {
  defaultColors,
  demoSiteContent,
  demoThemeSettings,
  onboardingAnswersSchema,
  parseSiteContentForRender,
  withResolvedColors,
} from "@ceomaker/schema";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDatabase, type Database } from "./client";
import {
  AddressLockedError,
  InvalidSiteDataError,
  LowContrastError,
  SiteNotFoundError,
  SubdomainTakenError,
  VersionNotFoundError,
} from "./errors";
import { runMigrations } from "./migrate";
import { finishAiUsage, startAiUsage } from "./queries/ai-usage";
import { getMedia, insertMedia } from "./queries/media";
import {
  deleteContactMessage,
  listContactMessages,
  MESSAGE_LIMITS,
  saveContactMessage,
} from "./queries/messages";
import {
  changeSubdomain,
  createSite,
  createSiteFromAnswers,
  deleteSite,
  getPrimarySiteForOwner,
  getPublishedVersion,
  getSiteForOwner,
  getTenantSiteBySubdomain,
  isSubdomainAvailable,
  listPublishedVersions,
  listSitesForUser,
  makeVersionLive,
  copyVersionToDraft,
  publishSite,
  saveDraft,
} from "./queries/sites";
import { aiUsage, contactMessage, media, retiredAddress, site, siteVersion, user } from "./schema";

const url = process.env.TEST_DATABASE_URL;

const draft = {
  templateKey: "meridian" as const,
  templateVersion: 1,
  theme: demoThemeSettings,
  content: demoSiteContent,
};

const answers = onboardingAnswersSchema.parse({
  role: "Chief executive",
  industry: "Logistics",
  goals: ["Speaking invitations"],
  name: "Amelia Hart",
  org: "Meridian Freight Group",
});

async function getLive(db: Database, subdomain: string) {
  const tenant = await getTenantSiteBySubdomain(db, subdomain);
  return tenant?.status === "published" ? tenant.site : null;
}

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
    await db.execute(sql`truncate table "user", site, site_version, media, ai_usage cascade`);
    await db.insert(user).values([
      { id: "alice", name: "Alice", email: "alice@example.com" },
      { id: "mallory", name: "Mallory", email: "mallory@example.com" },
    ]);
  });

  it("does not serve a site until it is published", async () => {
    await createSite(db, { ...draft, userId: "alice", subdomain: "alice" });
    expect(await getLive(db, "alice")).toBeNull();

    await publishSite(db, {
      userId: "alice",
      siteId: (await listSitesForUser(db, "alice"))[0]!.id,
    });
    const published = await getLive(db, "alice");
    expect(published?.templateKey).toBe("meridian");
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

    const edited = {
      ...demoSiteContent,
      meta: { ...demoSiteContent.meta, title: "Alice, Updated" },
    };
    await saveDraft(db, { ...draft, content: edited, userId: "alice", siteId: id });
    const second = await publishSite(db, { userId: "alice", siteId: id });

    expect(second.versionId).not.toBe(first.versionId);
    const live = await getLive(db, "alice");
    expect(live?.versionId).toBe(second.versionId);
    expect(parseSiteContentForRender(live?.content).meta?.title).toBe("Alice, Updated");

    await expect(
      db.update(siteVersion).set({ schemaVersion: 99 }).where(eq(siteVersion.id, first.versionId)),
    ).rejects.toThrow();
  });

  it("reports draft and paused sites instead of serving them", async () => {
    const { id } = await createSite(db, { ...draft, userId: "alice", subdomain: "alice" });
    expect(await getTenantSiteBySubdomain(db, "alice")).toEqual({ status: "draft" });
    await publishSite(db, { userId: "alice", siteId: id });
    await db.update(site).set({ status: "paused" }).where(eq(site.id, id));
    expect(await getTenantSiteBySubdomain(db, "alice")).toEqual({ status: "paused" });
    expect(await getTenantSiteBySubdomain(db, "nobody")).toBeNull();
  });

  it("creates a site from answers on the best free address", async () => {
    const first = await createSiteFromAnswers(db, { userId: "alice", answers });
    const second = await createSiteFromAnswers(db, { userId: "mallory", answers });
    expect(first.subdomain).toBe("amelia");
    expect(second.subdomain).toBe("amelia-hart");

    const owned = await getSiteForOwner(db, { userId: "alice", siteId: first.id });
    expect(owned?.answers?.name).toBe("Amelia Hart");
    expect(owned?.draft.templateKey).toBe("meridian");
    expect(owned?.published).toBeNull();
    expect(await getSiteForOwner(db, { userId: "mallory", siteId: first.id })).toBeNull();
  });

  it("falls back to a random address for names without Latin letters", async () => {
    const created = await createSiteFromAnswers(db, {
      userId: "alice",
      answers: { ...answers, name: "李明" },
    });
    expect(created.subdomain).toMatch(/^site-[a-z0-9]{6}$/);
  });

  it("refuses to publish unreadable colours", async () => {
    const { id } = await createSite(db, {
      ...draft,
      theme: { palettes: { meridian: { bg: "#ffffff", ink: "#eeeeee", accent: "#000000" } } },
      userId: "alice",
      subdomain: "alice",
    });
    await expect(publishSite(db, { userId: "alice", siteId: id })).rejects.toBeInstanceOf(
      LowContrastError,
    );
  });

  it("numbers versions, previews one, and restores it live or into the draft", async () => {
    const { id } = await createSite(db, { ...draft, userId: "alice", subdomain: "alice" });
    const v1 = await publishSite(db, { userId: "alice", siteId: id });
    await saveDraft(db, { ...draft, templateKey: "bento", userId: "alice", siteId: id });
    const v2 = await publishSite(db, { userId: "alice", siteId: id });
    expect([v1.versionNumber, v2.versionNumber]).toEqual([1, 2]);

    const versions = await listPublishedVersions(db, { userId: "alice", siteId: id });
    expect(versions.map((v) => [v.number, v.templateKey, v.isCurrent])).toEqual([
      [2, "bento", true],
      [1, "meridian", false],
    ]);

    const first = await getPublishedVersion(db, {
      userId: "alice",
      siteId: id,
      versionId: v1.versionId,
    });
    expect(first?.templateKey).toBe("meridian");
    expect(parseSiteContentForRender(first?.content).meta?.name).toBe(demoSiteContent.meta.name);
    expect(
      await getPublishedVersion(db, { userId: "mallory", siteId: id, versionId: v1.versionId }),
    ).toBeNull();

    // Live goes back; the draft keeps the latest edits.
    await makeVersionLive(db, { userId: "alice", siteId: id, versionId: v1.versionId });
    expect((await getLive(db, "alice"))?.versionId).toBe(v1.versionId);
    expect((await getSiteForOwner(db, { userId: "alice", siteId: id }))?.draft.templateKey).toBe(
      "bento",
    );

    // The draft goes back; live stays where it is.
    await makeVersionLive(db, { userId: "alice", siteId: id, versionId: v2.versionId });
    await copyVersionToDraft(db, { userId: "alice", siteId: id, versionId: v1.versionId });
    const owned = await getSiteForOwner(db, { userId: "alice", siteId: id });
    expect(owned?.draft.templateKey).toBe("meridian");
    expect((await getLive(db, "alice"))?.versionId).toBe(v2.versionId);
    expect(owned?.versionCount).toBe(2);

    await expect(
      makeVersionLive(db, { userId: "mallory", siteId: id, versionId: v1.versionId }),
    ).rejects.toBeInstanceOf(SiteNotFoundError);
    await expect(
      copyVersionToDraft(db, { userId: "alice", siteId: id, versionId: id }),
    ).rejects.toBeInstanceOf(VersionNotFoundError);
  });

  it("loads the first site with its draft, live version and history", async () => {
    const { id } = await createSite(db, { ...draft, userId: "alice", subdomain: "alice" });
    await publishSite(db, { userId: "alice", siteId: id });
    await saveDraft(db, { ...draft, templateKey: "bento", userId: "alice", siteId: id });
    const live = await publishSite(db, { userId: "alice", siteId: id });
    await saveDraft(db, { ...draft, templateKey: "aurora", userId: "alice", siteId: id });
    await createSite(db, { ...draft, userId: "alice", subdomain: "alice-later" });
    await createSite(db, { ...draft, userId: "mallory", subdomain: "mallory" });

    const owned = await getPrimarySiteForOwner(db, "alice");
    expect(owned?.id).toBe(id);
    expect(owned?.draft.templateKey).toBe("aurora");
    expect(owned?.published?.id).toBe(live.versionId);
    expect(owned?.published?.templateKey).toBe("bento");
    expect(parseSiteContentForRender(owned?.published?.content).meta?.name).toBe(
      demoSiteContent.meta.name,
    );
    expect(owned?.published?.theme).toEqual(withResolvedColors(demoThemeSettings, "bento", 1));
    expect(owned?.versions.map((v) => [v.number, v.templateKey, v.isCurrent])).toEqual([
      [2, "bento", true],
      [1, "meridian", false],
    ]);
    expect(owned?.versionCount).toBe(2);
    expect(await getPrimarySiteForOwner(db, "nobody")).toBeNull();
  });

  it("deletes a site with its versions and images, keeping AI usage", async () => {
    const { id } = await createSite(db, { ...draft, userId: "alice", subdomain: "alice" });
    await publishSite(db, { userId: "alice", siteId: id });
    await insertMedia(db, {
      userId: "alice",
      contentType: "image/jpeg",
      width: 1,
      height: 1,
      sha256: "abc",
      data: new Uint8Array([1, 2, 3]),
    });
    await startAiUsage(db, {
      userId: "alice",
      siteId: id,
      kind: "generate",
      limit: 10,
      windowMs: 60_000,
    });

    await expect(deleteSite(db, { userId: "mallory", siteId: id })).rejects.toBeInstanceOf(
      SiteNotFoundError,
    );
    expect(await deleteSite(db, { userId: "alice", siteId: id })).toEqual({
      subdomain: "alice",
      addressHeld: true,
    });

    expect(await getPrimarySiteForOwner(db, "alice")).toBeNull();
    expect(await getTenantSiteBySubdomain(db, "alice")).toBeNull();
    expect(await db.select().from(siteVersion)).toEqual([]);
    expect(await db.select().from(media)).toEqual([]);
    const usage = await db.select().from(aiUsage);
    expect(usage.map((row) => [row.userId, row.siteId])).toEqual([["alice", null]]);
  });

  it("holds a deleted live site's address for its owner only", async () => {
    const live = await createSite(db, { ...draft, userId: "alice", subdomain: "alice" });
    await publishSite(db, { userId: "alice", siteId: live.id });
    await deleteSite(db, { userId: "alice", siteId: live.id });

    await expect(
      createSite(db, { ...draft, userId: "mallory", subdomain: "alice" }),
    ).rejects.toBeInstanceOf(SubdomainTakenError);
    expect(await isSubdomainAvailable(db, "alice")).toBe(false);
    expect(await isSubdomainAvailable(db, "alice", { userId: "mallory" })).toBe(false);
    expect(await isSubdomainAvailable(db, "alice", { userId: "alice" })).toBe(true);
    const mallory = await createSite(db, { ...draft, userId: "mallory", subdomain: "mallory" });
    await expect(
      changeSubdomain(db, { userId: "mallory", siteId: mallory.id, subdomain: "alice" }),
    ).rejects.toBeInstanceOf(SubdomainTakenError);

    // The owner gets it back, and the hold is cleared.
    const again = await createSiteFromAnswers(db, {
      userId: "alice",
      answers: { ...answers, name: "Alice" },
    });
    expect(again.subdomain).toBe("alice");
    expect(await db.select().from(retiredAddress)).toEqual([]);
  });

  it("frees a never-published address at once, and a held one after the hold", async () => {
    const draftOnly = await createSite(db, { ...draft, userId: "alice", subdomain: "draft-only" });
    expect(await deleteSite(db, { userId: "alice", siteId: draftOnly.id })).toEqual({
      subdomain: "draft-only",
      addressHeld: false,
    });
    expect(await isSubdomainAvailable(db, "draft-only", { userId: "mallory" })).toBe(true);

    const live = await createSite(db, { ...draft, userId: "alice", subdomain: "alice" });
    await publishSite(db, { userId: "alice", siteId: live.id });
    await deleteSite(db, { userId: "alice", siteId: live.id });
    await db
      .update(retiredAddress)
      .set({ retiredAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000) })
      .where(eq(retiredAddress.subdomain, "alice"));
    const claimed = await createSite(db, { ...draft, userId: "mallory", subdomain: "alice" });
    expect(claimed.subdomain).toBe("alice");
  });

  it("lets the address change only before the first publish", async () => {
    const { id } = await createSite(db, { ...draft, userId: "alice", subdomain: "alice" });
    await createSite(db, { ...draft, userId: "mallory", subdomain: "taken" });
    expect(await isSubdomainAvailable(db, "taken")).toBe(false);
    expect(await isSubdomainAvailable(db, "alice", { exceptSiteId: id })).toBe(true);
    expect(await isSubdomainAvailable(db, "www")).toBe(false);

    await expect(
      changeSubdomain(db, { userId: "alice", siteId: id, subdomain: "taken" }),
    ).rejects.toBeInstanceOf(SubdomainTakenError);
    await changeSubdomain(db, { userId: "alice", siteId: id, subdomain: "alice-hart" });
    await publishSite(db, { userId: "alice", siteId: id });
    await expect(
      changeSubdomain(db, { userId: "alice", siteId: id, subdomain: "alice-2" }),
    ).rejects.toBeInstanceOf(AddressLockedError);
  });

  it("enforces AI rate limits per user, counting concurrent requests", async () => {
    const limits = { kind: "rewrite" as const, limit: 2, windowMs: 60_000, siteId: null };
    const a = await startAiUsage(db, { ...limits, userId: "alice" });
    const b = await startAiUsage(db, { ...limits, userId: "alice" });
    expect(a && b).toBeTruthy();
    expect(await startAiUsage(db, { ...limits, userId: "alice" })).toBeNull();
    expect(await startAiUsage(db, { ...limits, userId: "mallory" })).not.toBeNull();
    await finishAiUsage(db, { id: a!.id, status: "succeeded", inputTokens: 10, outputTokens: 5 });
  });

  it("stores and serves uploaded media", async () => {
    const data = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
    const { id } = await insertMedia(db, {
      userId: "alice",
      contentType: "image/jpeg",
      width: 10,
      height: 10,
      sha256: "abc",
      data,
    });
    const stored = await getMedia(db, id);
    expect(stored?.contentType).toBe("image/jpeg");
    expect(Buffer.from(stored!.data).equals(Buffer.from(data))).toBe(true);
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
    expect((await getLive(db, "alice"))?.versionId).toBe(versionId);
  });

  it("deletes everything when a user is deleted", async () => {
    const { id } = await createSite(db, { ...draft, userId: "alice", subdomain: "alice" });
    await publishSite(db, { userId: "alice", siteId: id });
    await db.delete(user).where(eq(user.id, "alice"));
    expect(await db.select().from(siteVersion)).toHaveLength(0);
  });
  it("pins each version to the template design it used", async () => {
    const { id } = await createSite(db, { ...draft, userId: "alice", subdomain: "alice" });
    await expect(
      saveDraft(db, { ...draft, templateVersion: 99, userId: "alice", siteId: id }),
    ).rejects.toBeInstanceOf(InvalidSiteDataError);

    const first = await publishSite(db, { userId: "alice", siteId: id });
    expect((await getLive(db, "alice"))?.templateVersion).toBe(1);
    const owned = await getSiteForOwner(db, { userId: "alice", siteId: id });
    expect(owned?.draft.templateVersion).toBe(1);
    expect(owned?.published?.templateVersion).toBe(1);
    expect(owned?.versions[0]?.templateVersion).toBe(1);

    // The draft moves on; the published version and its design stay as they were.
    await saveDraft(db, { ...draft, templateKey: "bento", userId: "alice", siteId: id });
    await publishSite(db, { userId: "alice", siteId: id });
    await makeVersionLive(db, { userId: "alice", siteId: id, versionId: first.versionId });
    expect(await getLive(db, "alice")).toMatchObject({
      templateKey: "meridian",
      templateVersion: 1,
    });
    await copyVersionToDraft(db, { userId: "alice", siteId: id, versionId: first.versionId });
    const back = await getSiteForOwner(db, { userId: "alice", siteId: id });
    expect(back?.draft).toMatchObject({ templateKey: "meridian", templateVersion: 1 });
    expect(
      (await getPublishedVersion(db, { userId: "alice", siteId: id, versionId: first.versionId }))
        ?.templateVersion,
    ).toBe(1);
  });

  it("writes out the colours a site was published with", async () => {
    const { id } = await createSite(db, {
      ...draft,
      theme: { palettes: {} },
      userId: "alice",
      subdomain: "alice",
    });
    await publishSite(db, { userId: "alice", siteId: id });
    const live = await getLive(db, "alice");
    // Not following the default any more: a new default can't recolour the live site.
    expect((live?.theme as { palettes: Record<string, unknown> }).palettes.meridian).toEqual(
      defaultColors("meridian", 1),
    );
    const owned = await getSiteForOwner(db, { userId: "alice", siteId: id });
    expect(owned?.draft.theme).toEqual({ palettes: {} });
  });

  it("keeps contact messages for the site's owner, within limits", async () => {
    const { id: siteId } = await createSite(db, { ...draft, userId: "alice", subdomain: "alice" });
    const message = {
      name: "Jonas Weber",
      email: "jonas@northgate.example",
      organisation: "",
      topic: "Board and advisory",
      message: "Would value a conversation.",
    };
    const now = new Date("2026-06-01T12:00:00Z");
    for (let index = 0; index < MESSAGE_LIMITS.perSenderPerHour; index += 1) {
      const saved = await saveContactMessage(db, { siteId, message, senderKey: "k1", now });
      expect(saved.ok).toBe(true);
    }
    expect(await saveContactMessage(db, { siteId, message, senderKey: "k1", now })).toEqual({
      ok: false,
      reason: "rate-limited",
    });
    // Someone else, or the same sender an hour later, still gets through.
    expect((await saveContactMessage(db, { siteId, message, senderKey: "k2", now })).ok).toBe(true);
    const later = new Date(now.getTime() + 61 * 60 * 1000);
    expect(
      (await saveContactMessage(db, { siteId, message, senderKey: "k1", now: later })).ok,
    ).toBe(true);

    const inbox = await listContactMessages(db, { userId: "alice", siteId });
    expect(inbox).toHaveLength(MESSAGE_LIMITS.perSenderPerHour + 2);
    expect(inbox[0]).toMatchObject({ name: "Jonas Weber", organisation: null });
    expect(await listContactMessages(db, { userId: "mallory", siteId })).toEqual([]);

    expect(await deleteContactMessage(db, { userId: "mallory", messageId: inbox[0]!.id })).toBe(
      false,
    );
    expect(await deleteContactMessage(db, { userId: "alice", messageId: inbox[0]!.id })).toBe(true);

    await deleteSite(db, { userId: "alice", siteId });
    expect((await db.select().from(contactMessage)).length).toBe(0);
  });
});
