import { describe, expect, it } from "vitest";
import {
  appUrl,
  parseSitesPath,
  resolveHost,
  routingConfigFromEnv,
  siteAddressParts,
  siteUrl,
  type SubdomainRoutingConfig,
} from "./routing";

const prod: SubdomainRoutingConfig = {
  mode: "subdomain",
  rootDomain: "ceomaker.com",
  unknownHostsServeApp: false,
};
const dev: SubdomainRoutingConfig = {
  mode: "subdomain",
  rootDomain: "localhost:3000",
  unknownHostsServeApp: true,
};

describe("resolveHost (subdomain mode)", () => {
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

describe("parseSitesPath (path mode)", () => {
  it.each([
    ["/", { kind: "none" }],
    ["/dashboard", { kind: "none" }],
    ["/sitesmap", { kind: "none" }],
    ["/sites", { kind: "invalid" }],
    ["/sites/", { kind: "invalid" }],
    ["/sites/ab", { kind: "invalid" }],
    ["/sites/app", { kind: "invalid" }],
    ["/sites/bad--name", { kind: "invalid" }],
    ["/sites/amelia", { kind: "site", subdomain: "amelia", rest: "", canonical: true }],
    ["/sites/amelia/press", { kind: "site", subdomain: "amelia", rest: "/press", canonical: true }],
    ["/sites/Amelia", { kind: "site", subdomain: "amelia", rest: "", canonical: false }],
  ] as const)("parses %s", (pathname, expected) => {
    expect(parseSitesPath(pathname)).toEqual(expected);
  });
});

describe("routingConfigFromEnv", () => {
  it("uses path mode when no root domain is configured", () => {
    expect(routingConfigFromEnv({})).toEqual({ mode: "path" });
    expect(routingConfigFromEnv({ ROOT_DOMAIN: "  " })).toEqual({ mode: "path" });
  });

  it("uses subdomain mode when a root domain is configured", () => {
    expect(
      routingConfigFromEnv({
        ROOT_DOMAIN: "ceomaker.com",
        NODE_ENV: "production",
        VERCEL_ENV: "production",
      }),
    ).toEqual({ mode: "subdomain", rootDomain: "ceomaker.com", unknownHostsServeApp: false });
    expect(
      routingConfigFromEnv({
        ROOT_DOMAIN: "ceomaker.com",
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
      }),
    ).toMatchObject({ unknownHostsServeApp: true });
  });
});

describe("appUrl", () => {
  it("prefers APP_URL and drops a trailing slash", () => {
    expect(appUrl({ APP_URL: "https://ceomaker.com/", VERCEL_ENV: "production" })).toBe(
      "https://ceomaker.com",
    );
  });

  it("uses the production domain on Vercel production", () => {
    expect(
      appUrl({
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "ceomaker.vercel.app",
        VERCEL_URL: "ceomaker-abc123.vercel.app",
      }),
    ).toBe("https://ceomaker.vercel.app");
  });

  it("uses the branch URL on previews, then the deployment URL", () => {
    expect(
      appUrl({
        VERCEL_ENV: "preview",
        VERCEL_BRANCH_URL: "ceomaker-git-feature.vercel.app",
        VERCEL_URL: "ceomaker-abc123.vercel.app",
      }),
    ).toBe("https://ceomaker-git-feature.vercel.app");
    expect(appUrl({ VERCEL_ENV: "preview", VERCEL_URL: "ceomaker-abc123.vercel.app" })).toBe(
      "https://ceomaker-abc123.vercel.app",
    );
  });

  it("falls back to localhost", () => {
    expect(appUrl({})).toBe("http://localhost:3000");
  });
});

describe("siteUrl and siteAddressParts", () => {
  it("builds subdomain addresses", () => {
    expect(siteUrl("amelia", prod, "https://ceomaker.com")).toBe("https://amelia.ceomaker.com");
    expect(siteUrl("demo", dev, "http://localhost:3000")).toBe("http://demo.localhost:3000");
    expect(siteAddressParts(prod, "https://ceomaker.com")).toEqual({
      prefix: "",
      suffix: ".ceomaker.com",
    });
  });

  it("builds path addresses", () => {
    const path = { mode: "path" } as const;
    expect(siteUrl("amelia", path, "https://ceomaker.vercel.app")).toBe(
      "https://ceomaker.vercel.app/sites/amelia",
    );
    expect(siteAddressParts(path, "https://ceomaker.vercel.app")).toEqual({
      prefix: "ceomaker.vercel.app/sites/",
      suffix: "",
    });
  });
});
