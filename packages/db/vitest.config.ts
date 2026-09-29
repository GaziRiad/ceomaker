import { defineConfig } from "vitest/config";

try {
  process.loadEnvFile("../../.env");
} catch {
  // No local .env: CI provides TEST_DATABASE_URL directly.
}

export default defineConfig({
  test: {
    // Integration tests share one database; run files sequentially.
    fileParallelism: false,
    hookTimeout: 30_000,
  },
});
