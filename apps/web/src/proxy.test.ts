import { getRedirectUrl, getRewrittenUrl, isRewrite } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";

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

  it("rewrites a tenant host to the internal tenant route", () => {
    const response = proxy(request("https://amelia.ceomaker.com/"));
    expect(isRewrite(response)).toBe(true);
    expect(getRewrittenUrl(response)).toBe("https://amelia.ceomaker.com/s/amelia");
  });

  it("keeps the path for tenant sub-pages", () => {
    const response = proxy(request("https://amelia.ceomaker.com/press"));
    expect(getRewrittenUrl(response)).toBe("https://amelia.ceomaker.com/s/amelia/press");
  });

  it("blocks API routes on tenant hosts", () => {
    const response = proxy(request("https://amelia.ceomaker.com/api/auth/get-session"));
    expect(getRewrittenUrl(response)).toBe("https://amelia.ceomaker.com/__not-found");
  });

  it("blocks direct access to the internal tenant route on the app host", () => {
    const response = proxy(request("https://ceomaker.com/s/amelia"));
    expect(getRewrittenUrl(response)).toBe("https://ceomaker.com/__not-found");
  });

  it("does not let one tenant host reach another tenant's route", () => {
    const response = proxy(request("https://amelia.ceomaker.com/s/mallory"));
    expect(getRewrittenUrl(response)).toBe("https://amelia.ceomaker.com/s/amelia/s/mallory");
  });

  it("passes the app host through", () => {
    const response = proxy(request("https://ceomaker.com/pricing"));
    expect(isRewrite(response)).toBe(false);
    expect(getRedirectUrl(response)).toBeNull();
  });

  it("redirects signed-out visitors to sign in, then back to where they were going", () => {
    const response = proxy(request("https://ceomaker.com/dashboard"));
    expect(response.status).toBe(307);
    expect(getRedirectUrl(response)).toBe("https://ceomaker.com/sign-in?callbackURL=%2Fdashboard");
    const deep = proxy(request("https://ceomaker.com/dashboard/sites/abc/edit?x=1"));
    expect(getRedirectUrl(deep)).toBe(
      "https://ceomaker.com/sign-in?callbackURL=%2Fdashboard%2Fsites%2Fabc%2Fedit%3Fx%3D1",
    );
  });

  it("serves uploaded images on tenant hosts", () => {
    const response = proxy(
      request("https://amelia.ceomaker.com/media/0b546125-b657-4ed2-b39f-846f38c86be4"),
    );
    expect(isRewrite(response)).toBe(false);
    expect(getRedirectUrl(response)).toBeNull();
    expect(response.status).toBe(200);
  });

  it("lets a request with a session cookie reach the dashboard (the page re-verifies it)", () => {
    const response = proxy(
      request("https://ceomaker.com/dashboard", "__Secure-better-auth.session_token=abc.def"),
    );
    expect(getRedirectUrl(response)).toBeNull();
  });

  it("redirects www to the apex, keeping the path", () => {
    const response = proxy(request("https://www.ceomaker.com/sign-in?next=%2Fdashboard"));
    expect(response.status).toBe(308);
    expect(getRedirectUrl(response)).toBe("https://ceomaker.com/sign-in?next=%2Fdashboard");
  });

  it("does not serve path-mode addresses once subdomains are in use", () => {
    const response = proxy(request("https://ceomaker.com/sites/amelia"));
    expect(getRewrittenUrl(response)).toBe("https://ceomaker.com/__not-found");
  });

  it("returns not found for unknown hosts in production", () => {
    const response = proxy(request("https://attacker.example/"));
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

  it("rewrites /sites/<name> to the internal tenant route", () => {
    const response = proxy(request(`${app}/sites/amelia`));
    expect(isRewrite(response)).toBe(true);
    expect(getRewrittenUrl(response)).toBe(`${app}/s/amelia`);
  });

  it("keeps the rest of the path", () => {
    expect(getRewrittenUrl(proxy(request(`${app}/sites/amelia/press`)))).toBe(
      `${app}/s/amelia/press`,
    );
  });

  it("redirects mixed-case names to the lowercase address", () => {
    const response = proxy(request(`${app}/sites/Amelia?ref=card`));
    expect(response.status).toBe(308);
    expect(getRedirectUrl(response)).toBe(`${app}/sites/amelia?ref=card`);
  });

  it.each(["/sites", "/sites/ab", "/sites/app", "/sites/bad--name", "/s/amelia", "/s"])(
    "returns not found for %s",
    (path) => {
      expect(getRewrittenUrl(proxy(request(`${app}${path}`)))).toBe(`${app}/__not-found`);
    },
  );

  it("never exposes API routes under a site path", () => {
    expect(getRewrittenUrl(proxy(request(`${app}/sites/amelia/api/auth/get-session`)))).toBe(
      `${app}/__not-found`,
    );
  });

  it("serves the app on any host, since there are no tenant hosts", () => {
    for (const host of [app, "https://ceomaker-git-feature.vercel.app"]) {
      const response = proxy(request(`${host}/sign-in`));
      expect(isRewrite(response)).toBe(false);
      expect(getRedirectUrl(response)).toBeNull();
    }
  });

  it("still redirects signed-out visitors away from the dashboard", () => {
    const response = proxy(request(`${app}/dashboard`));
    expect(response.status).toBe(307);
    expect(getRedirectUrl(response)).toBe(`${app}/sign-in?callbackURL=%2Fdashboard`);
  });
});
