import "server-only";
import { getDb, tables } from "@ceomaker/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { serverEnv } from "./env";
import { appUrl } from "./routing";

/**
 * Origins allowed to call the auth API. A Vercel preview is reachable at both its branch URL and
 * its per-deployment URL, so both are trusted there. Production trusts only the app URL.
 */
function trustedOrigins(baseUrl: string): string[] {
  const origins = [baseUrl];
  if (process.env.VERCEL_ENV === "preview") {
    for (const host of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]) {
      if (host) origins.push(`https://${host}`);
    }
  }
  return origins;
}

function createAuth() {
  const env = serverEnv();
  const baseUrl = appUrl();
  return betterAuth({
    appName: "CEOMaker",
    baseURL: baseUrl,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: trustedOrigins(baseUrl),
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: tables.user,
        session: tables.session,
        account: tables.account,
        verification: tables.verification,
        rateLimit: tables.rateLimit,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      autoSignIn: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 14,
      updateAge: 60 * 60 * 24,
      // Short-lived signed cookie cache saves a database round trip on most dashboard requests.
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    rateLimit: {
      enabled: true,
      // Stored in Postgres so limits hold across serverless instances. Move to Redis at scale.
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60 * 60, max: 5 },
      },
    },
    advanced: {
      // Session cookies stay host-only on the app domain. Never share them with *.<root>,
      // which is where customer sites live.
      crossSubDomainCookies: { enabled: false },
      useSecureCookies: baseUrl.startsWith("https://"),
    },
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof createAuth>;
let instance: Auth | undefined;

export function getAuth(): Auth {
  instance ??= createAuth();
  return instance;
}

/** Current session for Server Components and Server Actions, or null. */
export async function getSession() {
  return getAuth().api.getSession({ headers: await headers() });
}
