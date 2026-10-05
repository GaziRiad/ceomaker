import { describe, expect, it, vi } from "vitest";
import { adminEmails, isAdmin } from "./admin";

vi.mock("server-only", () => ({}));
vi.mock("./auth", () => ({ getSession: vi.fn() }));

describe("admin access", () => {
  const emails = adminEmails(" Owner@CEOMaker.app, second@example.com;third@example.com ");

  it("reads the list without case or stray spaces", () => {
    expect([...emails]).toEqual(["owner@ceomaker.app", "second@example.com", "third@example.com"]);
    expect(adminEmails(undefined).size).toBe(0);
    expect(adminEmails("").size).toBe(0);
  });

  it("lets in listed emails the account has verified, and nobody else", () => {
    expect(isAdmin({ email: "owner@ceomaker.app", emailVerified: true }, emails)).toBe(true);
    expect(isAdmin({ email: "OWNER@ceomaker.app", emailVerified: true }, emails)).toBe(true);
    expect(isAdmin({ email: "owner@ceomaker.app", emailVerified: false }, emails)).toBe(false);
    expect(isAdmin({ email: "someone@ceomaker.app", emailVerified: true }, emails)).toBe(false);
    expect(isAdmin({ email: "owner@ceomaker.app", emailVerified: true }, new Set())).toBe(false);
  });
});
