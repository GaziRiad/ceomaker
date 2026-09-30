import { describe, expect, it } from "vitest";
import { normalizeConnectionString } from "./client";

describe("normalizeConnectionString", () => {
  it("drops channel_binding from Neon connection strings and keeps sslmode", () => {
    const neon =
      "postgresql://user:pass@ep-cool-name-pooler.eu-central-1.aws.neon.tech/ceomaker?sslmode=require&channel_binding=require";
    const normalized = new URL(normalizeConnectionString(neon));
    expect(normalized.searchParams.get("channel_binding")).toBeNull();
    expect(normalized.searchParams.get("sslmode")).toBe("require");
    expect(normalized.hostname).toBe("ep-cool-name-pooler.eu-central-1.aws.neon.tech");
    expect(normalized.password).toBe("pass");
  });

  it("leaves other connection strings untouched", () => {
    const local = "postgres://ceomaker:ceomaker@127.0.0.1:5432/ceomaker";
    expect(normalizeConnectionString(local)).toBe(local);
  });
});
