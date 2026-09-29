import { defaultTheme, demoSiteContent } from "@ceomaker/schema";
import { eq } from "drizzle-orm";
import { createDatabase, type Database } from "./client";
import { createSite, publishSite, saveDraft } from "./queries/sites";
import { site, user } from "./schema";

export const DEMO_SUBDOMAIN = "demo";
const DEMO_OWNER_ID = "seed_demo_owner";

/** Idempotent: creates or refreshes the demo owner and publishes demo.<root domain>. */
export async function seedDemoSite(db: Database) {
  await db
    .insert(user)
    .values({
      id: DEMO_OWNER_ID,
      name: "Demo Owner",
      // .invalid is reserved (RFC 2606): this address can never receive mail.
      email: "demo-owner@ceomaker.invalid",
      emailVerified: true,
    })
    .onConflictDoNothing();

  const draft = {
    templateKey: "executive" as const,
    theme: defaultTheme,
    content: demoSiteContent,
  };
  const [existing] = await db
    .select({ id: site.id })
    .from(site)
    .where(eq(site.subdomain, DEMO_SUBDOMAIN))
    .limit(1);

  const siteId = existing
    ? (await saveDraft(db, { ...draft, userId: DEMO_OWNER_ID, siteId: existing.id }), existing.id)
    : (await createSite(db, { ...draft, userId: DEMO_OWNER_ID, subdomain: DEMO_SUBDOMAIN })).id;

  return publishSite(db, { userId: DEMO_OWNER_ID, siteId });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
    console.error("Refusing to seed a production database without --force");
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  const { db, close } = createDatabase(url, { maxConnections: 1 });
  try {
    const result = await seedDemoSite(db);
    console.log(`Published demo site "${result.subdomain}" (version ${result.versionId})`);
  } finally {
    await close();
  }
}
