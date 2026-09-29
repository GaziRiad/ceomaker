import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile("../../.env");
} catch {
  // No local .env (CI, hosted environments): rely on the process environment.
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: true,
});
