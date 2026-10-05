import { getRedirectUrl, getRewrittenUrl, isRewrite } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

// Customer domains, as the database would answer: one connected apex domain for "amelia".
vi.mock("./lib/domain-routing", () => ({
  siteForHost: vi.fn(async (host: string) => {
    if (host === "ameliahart.com") {
      return { subdomain: "amelia", domain: host, isWww: false, ownerPlan: "pro" };
    }
    if (host === "www.ameliahart.com") {
      return { subdomain: "amelia", domain: "ameliahart.com", isWww: true, ownerPlan: "pro" };
    }
    if (host === "brunofree.com") {
      return { subdomain: "bruno", domain: host, isWww: false, ownerPlan: "free" };
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

describe("proxy", () => {
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

  it("has no /sites/<name> addresses: the path goes to the app, which has no such page", async () => {
    const response = await proxy(request("https://ceomaker.com/sites/amelia"));
    expect(isRewrite(response)).toBe(false);
    expect(getRedirectUrl(response)).toBeNull();
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

  it("forwards a free owner's custom domain to the site's own address", async () => {
    const response = await proxy(request("https://brunofree.com/press?x=1"));
    expect(response.status).toBe(307);
    expect(getRedirectUrl(response)).toBe("https://bruno.ceomaker.com/press?x=1");
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
  it("drops a trailing slash with a permanent redirect, on every host, keeping the query", async () => {
    const app = await proxy(request("https://ceomaker.com/pricing/?utm_source=x"));
    expect(app.status).toBe(308);
    expect(getRedirectUrl(app)).toBe("https://ceomaker.com/pricing?utm_source=x");
    const tenant = await proxy(request("https://bruno.ceomaker.com/press//"));
    expect(getRedirectUrl(tenant)).toBe("https://bruno.ceomaker.com/press");
    const home = await proxy(request("https://bruno.ceomaker.com/"));
    expect(getRedirectUrl(home)).toBeNull();
  });

  it("never turns a trailing-slash redirect into a jump to another site", async () => {
    const response = await proxy(request("https://ceomaker.com//attacker.example/"));
    const location = new URL(getRedirectUrl(response) ?? "", "https://ceomaker.com");
    expect(location.host).toBe("ceomaker.com");
  });

  it("relays analytics from the product's pages to PostHog's EU servers, without cookies", async () => {
    const response = await proxy(
      request("https://ceomaker.com/relay/i/v0/e/?compression=gzip-js", "session=secret"),
    );
    expect(getRewrittenUrl(response)).toBe("https://eu.i.posthog.com/i/v0/e/?compression=gzip-js");
    const forwarded = response.headers.get("x-middleware-override-headers")?.split(",") ?? [];
    expect(forwarded).toContain("host");
    expect(forwarded).not.toContain("cookie");
    expect(response.headers.get("x-middleware-request-cookie")).toBeNull();
    expect(response.headers.get("x-middleware-request-host")).toBe("eu.i.posthog.com");

    const script = await proxy(
      request("https://ceomaker.com/relay/static/exception-autocapture.js"),
    );
    expect(getRewrittenUrl(script)).toBe(
      "https://eu-assets.i.posthog.com/static/exception-autocapture.js",
    );
  });

  it("doesn't relay analytics on customer sites", async () => {
    const response = await proxy(request("https://bruno.ceomaker.com/relay/e/"));
    expect(getRewrittenUrl(response)).toBe("https://bruno.ceomaker.com/s/bruno/relay/e/");
  });
});
