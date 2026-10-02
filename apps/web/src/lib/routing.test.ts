import { describe, expect, it } from "vitest";
import {
  appHostnames,
  appUrl,
  isCustomDomainCandidate,
  resolveHost,
  routingConfigFromEnv,
  siteAddressParts,
  siteUrl,
  type RoutingConfig,
} from "./routing";

const prod: RoutingConfig = {
  rootDomain: "ceomaker.com",
  unknownHostsServeApp: false,
  appOnWww: false,
};
const dev: RoutingConfig = {
  rootDomain: "localhost:3000",
  unknownHostsServeApp: true,
  appOnWww: false,
};

describe("resolveHost", () => {
  it.each([
    ["ceomaker.com", { kind: "app" }],
    ["CEOMaker.com", { kind: "app" }],
    ["ceomaker.com.", { kind: "app" }],
    ["ceomaker.com:443", { kind: "app" }],
    ["www.ceomaker.com", { kind: "redirect-to-app" }],
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
    "",
  ])("refuses %s in production", (host) => {
    expect(resolveHost(host, prod)).toEqual({ kind: "not-found" });
  });

  it.each(["evilceomaker.com", "ceomaker.com.evil.example", "attacker.example", "AmeliaHart.com"])(
    "looks up %s as a possible customer domain",
    (host) => {
      expect(resolveHost(host, prod)).toEqual({ kind: "custom", hostname: host.toLowerCase() });
    },
  );

  it("never looks up IP addresses, localhost or Vercel addresses as customer domains", () => {
    for (const host of ["10.0.0.4", "foo.localhost", "ceomaker-git-x.vercel.app"]) {
      expect(isCustomDomainCandidate(host)).toBe(false);
    }
    expect(isCustomDomainCandidate("me.ameliahart.co.uk")).toBe(true);
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

describe("resolveHost with the product on www", () => {
  const www: RoutingConfig = { ...prod, appOnWww: true };
  it("serves the app on www, forwards the apex there, and keeps tenants", () => {
    expect(resolveHost("www.ceomaker.com", www)).toEqual({ kind: "app" });
    expect(resolveHost("ceomaker.com", www)).toEqual({ kind: "redirect-to-app" });
    expect(resolveHost("amelia.ceomaker.com", www)).toEqual({
      kind: "tenant",
      subdomain: "amelia",
    });
  });

  it("follows APP_URL", () => {
    const env = { ROOT_DOMAIN: "ceomaker.app", NODE_ENV: "production", VERCEL_ENV: "production" };
    expect(routingConfigFromEnv({ ...env, APP_URL: "https://www.ceomaker.app" })).toMatchObject({
      appOnWww: true,
    });
    expect(routingConfigFromEnv({ ...env, APP_URL: "https://ceomaker.app" })).toMatchObject({
      appOnWww: false,
    });
  });
});

describe("routingConfigFromEnv", () => {
  it("uses the app's own host as the root domain when none is configured", () => {
    expect(routingConfigFromEnv({})).toMatchObject({ rootDomain: "localhost:3000" });
    expect(
      routingConfigFromEnv({ ROOT_DOMAIN: "  ", APP_URL: "https://www.ceomaker.app" }),
    ).toEqual({ rootDomain: "ceomaker.app", unknownHostsServeApp: true, appOnWww: true });
  });

  it("uses the configured root domain", () => {
    expect(
      routingConfigFromEnv({
        ROOT_DOMAIN: "ceomaker.com",
        NODE_ENV: "production",
        VERCEL_ENV: "production",
      }),
    ).toEqual({
      rootDomain: "ceomaker.com",
      unknownHostsServeApp: false,
      appOnWww: false,
    });
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
    expect(siteAddressParts(prod)).toEqual({
      prefix: "",
      suffix: ".ceomaker.com",
    });
  });
});

describe("appHostnames", () => {
  it("lists the product's own hosts", () => {
    expect(
      appHostnames({
        APP_URL: "https://ceomaker.co",
        VERCEL_URL: "ceomaker-abc.vercel.app",
        VERCEL_PROJECT_PRODUCTION_URL: "ceomaker.vercel.app",
      }),
    ).toEqual(new Set(["ceomaker.co", "ceomaker-abc.vercel.app", "ceomaker.vercel.app"]));
    expect(appHostnames({})).toEqual(new Set(["localhost"]));
  });
});
