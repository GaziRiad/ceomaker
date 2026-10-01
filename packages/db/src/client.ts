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
 * include `channel_binding=require`.
 */
const CLIENT_ONLY_PARAMS = ["channel_binding"];

/** sslmode values under which postgres.js encrypts but does not verify the server certificate. */
const UNVERIFIED_SSL_MODES = new Set(["require", "prefer", "allow"]);

function isLocalHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "");
  return (
    host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".localhost")
  );
}

/**
 * Makes copy-pasted connection strings safe for postgres.js:
 * - drops client-only libpq parameters it would forward to the server;
 * - for remote hosts, upgrades a missing or unverified sslmode to `verify-full`. postgres.js
 *   treats `sslmode=require` as "encrypt, but accept any certificate", which lets anyone on
 *   the network path impersonate the database. Explicit `disable`, `verify-ca` and
 *   `verify-full` are respected, and local hosts are left alone so Docker and CI work.
 */
export function normalizeConnectionString(url: string): string {
  const parsed = new URL(url);
  let changed = false;
  for (const name of CLIENT_ONLY_PARAMS) {
    if (parsed.searchParams.has(name)) {
      parsed.searchParams.delete(name);
      changed = true;
    }
  }
  const sslmode = parsed.searchParams.get("sslmode");
  if (!isLocalHost(parsed.hostname) && (sslmode === null || UNVERIFIED_SSL_MODES.has(sslmode))) {
    parsed.searchParams.set("sslmode", "verify-full");
    changed = true;
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
