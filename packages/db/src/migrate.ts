import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { isMainModule } from "./cli";
import { createDatabase } from "./client";

export const migrationsFolder = fileURLToPath(new URL("../migrations", import.meta.url));

export async function runMigrations(url: string) {
  const { db, close } = createDatabase(url, { maxConnections: 1 });
  try {
    await migrate(db, { migrationsFolder });
  } finally {
    await close();
  }
}

if (isMainModule(import.meta.url)) {
  // Neon and other poolers recommend a direct connection for schema changes.
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL (or DATABASE_URL_UNPOOLED) is not set");
    process.exit(1);
  }
  await runMigrations(url);
  console.log("Migrations applied");
}
