import { describe, expect, it } from "vitest";
import { normalizeConnectionString } from "./client";

const neon =
  "postgresql://user:pass@ep-cool-name-pooler.eu-central-1.aws.neon.tech/ceomaker?sslmode=require&channel_binding=require";

describe("normalizeConnectionString", () => {
  it("verifies the server certificate and drops channel_binding on Neon strings", () => {
    const normalized = new URL(normalizeConnectionString(neon));
    expect(normalized.searchParams.get("channel_binding")).toBeNull();
    expect(normalized.searchParams.get("sslmode")).toBe("verify-full");
    expect(normalized.hostname).toBe("ep-cool-name-pooler.eu-central-1.aws.neon.tech");
    expect(normalized.password).toBe("pass");
  });

  it("adds certificate verification to remote hosts without an sslmode", () => {
    const url = "postgres://u:p@db.example.com:5432/app";
    expect(new URL(normalizeConnectionString(url)).searchParams.get("sslmode")).toBe("verify-full");
  });

  it.each(["disable", "verify-ca", "verify-full"])("respects an explicit sslmode=%s", (mode) => {
    const url = `postgres://u:p@db.example.com/app?sslmode=${mode}`;
    expect(normalizeConnectionString(url)).toBe(url);
  });

  it.each([
    "postgres://ceomaker:ceomaker@127.0.0.1:5432/ceomaker",
    "postgres://ceomaker:ceomaker@localhost:5432/ceomaker?sslmode=require",
    "postgres://ceomaker:ceomaker@[::1]:5432/ceomaker",
  ])("leaves local connection strings untouched: %s", (local) => {
    expect(normalizeConnectionString(local)).toBe(local);
  });
});
