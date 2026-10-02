import { getRedirectUrl, getRewrittenUrl, isRewrite } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

// Customer domains, as the database would answer: one connected apex domain for "amelia".
vi.mock("./lib/domain-routing", () => ({
  siteForHost: vi.fn(async (host: string) => {
    if (host === "ameliahart.com") return { subdomain: "amelia", domain: host, isWww: false };
    if (host === "www.ameliahart.com") {
      return { subdomain: "amelia", domain: "ameliahart.com", isWww: true };
    }
    return null;
  }),
  liveDomainFor: vi.fn(async (subdomain: string) =>
    subdomain === "amelia" ? "ameliahart.com" : null,
  ),
  forgetDomainRouting: vi.fn(),
}));

function request(url: string, cookie?: string) {
  const parsed = new URL(url);
  return new NextRequest(url, {
    headers: { host: parsed.host, ...(cookie ? { cookie } : {}) },
  });
}

describe("proxy in subdomain mode", () => {
  beforeEach(() => {
    vi.stubEnv("ROOT_DOMAIN", "ceomaker.com");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rewrites a tenant host to the internal tenant route", async () => {
    const response = await proxy(request("https://bruno.ceomaker.com/"));
    expect(isRewrite(response)).toBe(true);
    expect(getRewrittenUrl(response)).toBe("https://bruno.ceomaker.com/s/bruno");
  });

  it("keeps the path for tenant sub-pages", async () => {
    const response = await proxy(request("https://bruno.ceomaker.com/press"));
    expect(getRewrittenUrl(response)).toBe("https://bruno.ceomaker.com/s/bruno/press");
  });

  it("blocks API routes on tenant hosts", async () => {
    const response = await proxy(request("https://amelia.ceomaker.com/api/auth/get-session"));
    expect(getRewrittenUrl(response)).toBe("https://amelia.ceomaker.com/__not-found");
  });

  it("blocks direct access to the internal tenant route on the app host", async () => {
    const response = await proxy(request("https://ceomaker.com/s/amelia"));
    expect(getRewrittenUrl(response)).toBe("https://ceomaker.com/__not-found");
  });

  it("does not let one tenant host reach another tenant's route", async () => {
    const response = await proxy(request("https://bruno.ceomaker.com/s/mallory"));
    expect(getRewrittenUrl(response)).toBe("https://bruno.ceomaker.com/s/bruno/s/mallory");
  });

  it("passes the app host through", async () => {
    const response = await proxy(request("https://ceomaker.com/pricing"));
    expect(isRewrite(response)).toBe(false);
    expect(getRedirectUrl(response)).toBeNull();
  });

  it("redirects signed-out visitors to sign in, then back to where they were going", async () => {
    const response = await proxy(request("https://ceomaker.com/dashboard"));
    expect(response.status).toBe(307);
    expect(getRedirectUrl(response)).toBe("https://ceomaker.com/sign-in?callbackURL=%2Fdashboard");
    const deep = await proxy(request("https://ceomaker.com/dashboard/sites/abc/edit?x=1"));
    expect(getRedirectUrl(deep)).toBe(
      "https://ceomaker.com/sign-in?callbackURL=%2Fdashboard%2Fsites%2Fabc%2Fedit%3Fx%3D1",
    );
  });

  it("serves uploaded images on tenant hosts", async () => {
    const response = await proxy(
      request("https://amelia.ceomaker.com/media/0b546125-b657-4ed2-b39f-846f38c86be4"),
    );
    expect(isRewrite(response)).toBe(false);
    expect(getRedirectUrl(response)).toBeNull();
    expect(response.status).toBe(200);
  });

  it("lets a request with a session cookie reach the dashboard (the page re-verifies it)", async () => {
    const response = await proxy(
      request("https://ceomaker.com/dashboard", "__Secure-better-auth.session_token=abc.def"),
    );
    expect(getRedirectUrl(response)).toBeNull();
  });

  it("redirects www to the apex, keeping the path", async () => {
    const response = await proxy(request("https://www.ceomaker.com/sign-in?next=%2Fdashboard"));
    expect(response.status).toBe(308);
    expect(getRedirectUrl(response)).toBe("https://ceomaker.com/sign-in?next=%2Fdashboard");
  });

  it("serves the app on www and forwards the apex there when APP_URL is on www", async () => {
    vi.stubEnv("APP_URL", "https://www.ceomaker.com");
    const apex = await proxy(request("https://ceomaker.com/sign-in?x=1"));
    expect(apex.status).toBe(308);
    expect(getRedirectUrl(apex)).toBe("https://www.ceomaker.com/sign-in?x=1");
    expect(isRewrite(await proxy(request("https://www.ceomaker.com/")))).toBe(false);
    expect((await proxy(request("https://www.ceomaker.com/"))).status).toBe(200);
  });

  it("forwards path-mode addresses from before subdomains to the site's subdomain", async () => {
    const response = await proxy(request("https://ceomaker.com/sites/Amelia/press?ref=card"));
    expect(response.status).toBe(308);
    expect(getRedirectUrl(response)).toBe("https://amelia.ceomaker.com/press?ref=card");
    expect(getRewrittenUrl(await proxy(request("https://ceomaker.com/sites/app")))).toBe(
      "https://ceomaker.com/__not-found",
    );
  });

  it("serves a customer's own domain, its images and page views, and nothing else", async () => {
    expect(getRewrittenUrl(await proxy(request("https://ameliahart.com/")))).toBe(
      "https://ameliahart.com/s/amelia",
    );
    expect(getRewrittenUrl(await proxy(request("https://ameliahart.com/press")))).toBe(
      "https://ameliahart.com/s/amelia/press",
    );
    for (const path of ["/media/0b546125-b657-4ed2-b39f-846f38c86be4", "/api/collect"]) {
      const response = await proxy(request(`https://ameliahart.com${path}`));
      expect(isRewrite(response)).toBe(false);
      expect(getRedirectUrl(response)).toBeNull();
    }
    expect(
      getRewrittenUrl(await proxy(request("https://ameliahart.com/api/auth/get-session"))),
    ).toBe("https://ameliahart.com/__not-found");
    expect(getRewrittenUrl(await proxy(request("https://ameliahart.com/dashboard")))).toBe(
      "https://ameliahart.com/s/amelia/dashboard",
    );
  });

  it("forwards www of a customer domain to the domain", async () => {
    const response = await proxy(request("https://www.ameliahart.com/press?ref=1"));
    expect(response.status).toBe(308);
    expect(getRedirectUrl(response)).toBe("https://ameliahart.com/press?ref=1");
  });

  it("forwards a site's own address to its live domain, for page loads only", async () => {
    const response = await proxy(request("https://amelia.ceomaker.com/press?ref=card"));
    expect(response.status).toBe(308);
    expect(getRedirectUrl(response)).toBe("https://ameliahart.com/press?ref=card");
    const post = await proxy(
      new NextRequest("https://amelia.ceomaker.com/", {
        method: "POST",
        headers: { host: "amelia.ceomaker.com" },
      }),
    );
    expect(getRewrittenUrl(post)).toBe("https://amelia.ceomaker.com/s/amelia");
    expect(getRewrittenUrl(await proxy(request("https://bruno.ceomaker.com/")))).toBe(
      "https://bruno.ceomaker.com/s/bruno",
    );
  });

  it("returns not found for unknown hosts in production", async () => {
    const response = await proxy(request("https://attacker.example/"));
    expect(getRewrittenUrl(response)).toBe("https://attacker.example/__not-found");
  });
});

describe("proxy in path mode (no ROOT_DOMAIN, e.g. *.vercel.app)", () => {
  beforeEach(() => {
    vi.stubEnv("ROOT_DOMAIN", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const app = "https://ceomaker.vercel.app";

  it("rewrites /sites/<name> to the internal tenant route", async () => {
    const response = await proxy(request(`${app}/sites/bruno`));
    expect(isRewrite(response)).toBe(true);
    expect(getRewrittenUrl(response)).toBe(`${app}/s/bruno`);
  });

  it("keeps the rest of the path", async () => {
    expect(getRewrittenUrl(await proxy(request(`${app}/sites/bruno/press`)))).toBe(
      `${app}/s/bruno/press`,
    );
  });

  it("redirects mixed-case names to the lowercase address", async () => {
    const response = await proxy(request(`${app}/sites/Amelia?ref=card`));
    expect(response.status).toBe(308);
    expect(getRedirectUrl(response)).toBe(`${app}/sites/amelia?ref=card`);
  });

  it.each(["/sites", "/sites/ab", "/sites/app", "/sites/bad--name", "/s/amelia", "/s"])(
    "returns not found for %s",
    async (path) => {
      expect(getRewrittenUrl(await proxy(request(`${app}${path}`)))).toBe(`${app}/__not-found`);
    },
  );

  it("never exposes API routes under a site path", async () => {
    expect(getRewrittenUrl(await proxy(request(`${app}/sites/amelia/api/auth/get-session`)))).toBe(
      `${app}/__not-found`,
    );
  });

  it("serves the app on any host, since there are no tenant hosts", async () => {
    for (const host of [app, "https://ceomaker-git-feature.vercel.app"]) {
      const response = await proxy(request(`${host}/sign-in`));
      expect(isRewrite(response)).toBe(false);
      expect(getRedirectUrl(response)).toBeNull();
    }
  });

  it("serves customer domains and forwards /sites/<name> once one is live", async () => {
    expect(getRewrittenUrl(await proxy(request("https://ameliahart.com/")))).toBe(
      "https://ameliahart.com/s/amelia",
    );
    const forwarded = await proxy(request(`${app}/sites/amelia/press`));
    expect(forwarded.status).toBe(308);
    expect(getRedirectUrl(forwarded)).toBe("https://ameliahart.com/press");
    expect(getRewrittenUrl(await proxy(request(`${app}/sites/bruno`)))).toBe(`${app}/s/bruno`);
  });

  it("still redirects signed-out visitors away from the dashboard", async () => {
    const response = await proxy(request(`${app}/dashboard`));
    expect(response.status).toBe(307);
    expect(getRedirectUrl(response)).toBe(`${app}/sign-in?callbackURL=%2Fdashboard`);
  });
});
