import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

// Local development keeps one .env at the monorepo root. Hosted environments inject variables.
const rootEnv = path.resolve(process.cwd(), "../../.env");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ["@ceomaker/schema", "@ceomaker/db", "@ceomaker/templates"],
  experimental: {
    globalNotFound: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders(isDev) }];
  },
};

export default nextConfig;
