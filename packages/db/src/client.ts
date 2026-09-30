import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

export interface DatabaseOptions {
  maxConnections?: number;
}

/**
 * libpq options that postgres.js does not understand. postgres.js forwards unknown URL parameters
 * to the server as settings, which Postgres rejects, and Neon's copy-paste connection strings
 * include `channel_binding=require`. TLS is still enforced through `sslmode`.
 */
const CLIENT_ONLY_PARAMS = ["channel_binding"];

export function normalizeConnectionString(url: string): string {
  const parsed = new URL(url);
  let changed = false;
  for (const name of CLIENT_ONLY_PARAMS) {
    if (parsed.searchParams.has(name)) {
      parsed.searchParams.delete(name);
      changed = true;
    }
  }
  return changed ? parsed.toString() : url;
}

export function createDatabase(url: string, options: DatabaseOptions = {}) {
  const client = postgres(normalizeConnectionString(url), {
    max: options.maxConnections ?? 5,
    idle_timeout: 20,
    connect_timeout: 10,
    // Transaction-mode poolers (Neon, Supabase, PgBouncer) do not support prepared statements.
    prepare: false,
  });
  return {
    db: drizzle(client, { schema }),
    close: () => client.end({ timeout: 5 }),
  };
}

const globalForDb = globalThis as unknown as { __ceomakerDb?: Database };

/**
 * Process-wide database handle. Cached on globalThis so dev hot reloads and serverless
 * invocations on a warm instance reuse one small pool instead of opening new connections.
 */
export function getDb(): Database {
  if (!globalForDb.__ceomakerDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const maxConnections = Number(process.env.DATABASE_POOL_MAX ?? 5);
    globalForDb.__ceomakerDb = createDatabase(url, { maxConnections }).db;
  }
  return globalForDb.__ceomakerDb;
}
