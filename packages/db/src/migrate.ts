import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  await runMigrations(url);
  console.log("Migrations applied");
}
