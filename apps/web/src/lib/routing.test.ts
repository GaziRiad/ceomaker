import { describe, expect, it } from "vitest";
import { resolveHost, tenantUrl, type RoutingConfig } from "./routing";

const prod: RoutingConfig = { rootDomain: "ceomaker.com", unknownHostsServeApp: false };
const dev: RoutingConfig = { rootDomain: "localhost:3000", unknownHostsServeApp: true };

describe("resolveHost", () => {
  it.each([
    ["ceomaker.com", { kind: "app" }],
    ["CEOMaker.com", { kind: "app" }],
    ["ceomaker.com.", { kind: "app" }],
    ["ceomaker.com:443", { kind: "app" }],
    ["www.ceomaker.com", { kind: "redirect-to-apex" }],
    ["amelia.ceomaker.com", { kind: "tenant", subdomain: "amelia" }],
    ["Amelia.CEOMaker.com", { kind: "tenant", subdomain: "amelia" }],
    ["amelia-hart.ceomaker.com:443", { kind: "tenant", subdomain: "amelia-hart" }],
  ] as const)("routes %s", (host, expected) => {
    expect(resolveHost(host, prod)).toEqual(expected);
  });

  it.each([
    "app.ceomaker.com",
    "api.ceomaker.com",
    "a.b.ceomaker.com",
    "xn--mlia-bsa.ceomaker.com",
    "-bad.ceomaker.com",
    "ab.ceomaker.com",
    "evilceomaker.com",
    "ceomaker.com.evil.example",
    "attacker.example",
    "",
  ])("refuses %s in production", (host) => {
    expect(resolveHost(host, prod)).toEqual({ kind: "not-found" });
  });

  it("refuses a missing Host header", () => {
    expect(resolveHost(null, prod)).toEqual({ kind: "not-found" });
  });

  it("serves tenants on *.localhost in development and the app on other hosts", () => {
    expect(resolveHost("demo.localhost:3000", dev)).toEqual({ kind: "tenant", subdomain: "demo" });
    expect(resolveHost("localhost:3000", dev)).toEqual({ kind: "app" });
    expect(resolveHost("127.0.0.1:3000", dev)).toEqual({ kind: "app" });
    expect(resolveHost("[::1]:3000", dev)).toEqual({ kind: "app" });
  });
});

describe("tenantUrl", () => {
  it("builds the public site URL with the app's protocol", () => {
    expect(tenantUrl("amelia", "https://ceomaker.com", "ceomaker.com")).toBe(
      "https://amelia.ceomaker.com",
    );
    expect(tenantUrl("demo", "http://localhost:3000", "localhost:3000")).toBe(
      "http://demo.localhost:3000",
    );
  });
});
