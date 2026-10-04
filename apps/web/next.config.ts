import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

// Local development keeps one .env at the monorepo root. Hosted environments inject variables.
const rootEnv = path.resolve(process.cwd(), "../../.env");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const isDev = process.env.NODE_ENV !== "production";
// Only the production deployment may be indexed; previews and local runs would show up in
// search as copies of real pages (same rule as isIndexable in src/lib/seo.ts).
const indexable = process.env.VERCEL_ENV === "production";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ["@ceomaker/schema", "@ceomaker/db", "@ceomaker/templates"],
  // Fonts for the generated share images, read from disk at request time.
  outputFileTracingIncludes: {
    "/s/[subdomain]/share-card.png": ["./assets/share-fonts/**"],
    "/opengraph-image": ["./assets/share-fonts/**"],
  },
  experimental: {
    globalNotFound: true,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders(isDev) },
      ...(indexable
        ? []
        : [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }]),
      // Freemius's checkout (another origin) loads public/brand/freemius-checkout.css, and the
      // fonts it names are only used across origins when they allow it.
      {
        source: "/brand/fonts/:file",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
};

export default nextConfig;
