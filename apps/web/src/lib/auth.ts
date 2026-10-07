import "server-only";
import { getDb, tables } from "@ceomaker/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { headers } from "next/headers";
import { sendEmailChangeLink, sendSignInEmail } from "./email";
import { googleSignInEnabled, serverEnv } from "./env";
import { appUrl } from "./routing";
import { confirmLinkFor, MAGIC_LINK_MINUTES } from "./sign-in-link";

/** How long the link that confirms a new email address stays valid. */
export const EMAIL_CHANGE_HOURS = 24;

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
    // Passwordless only: a sign-in link by email, or Google. No passwords to leak or reset.
    emailAndPassword: { enabled: false },
    user: {
      // A new address is confirmed by a link sent to it; nothing changes until it's opened.
      changeEmail: { enabled: true },
      // Accounts are removed by our own action (it keeps live addresses on hold), not this API.
      deleteUser: { enabled: false },
    },
    emailVerification: {
      expiresIn: EMAIL_CHANGE_HOURS * 60 * 60,
      // Only used for email changes: magic links and Google already verify the address.
      sendVerificationEmail: async ({ user, url }) => sendEmailChangeLink(user.email, url),
    },
    socialProviders: googleSignInEnabled(env)
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID!,
            clientSecret: env.GOOGLE_CLIENT_SECRET!,
            prompt: "select_account",
          },
        }
      : {},
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
        // Each request sends an email: keep it tight per IP.
        "/sign-in/magic-link": { window: 60, max: 3 },
      },
    },
    advanced: {
      // Session cookies stay host-only on the app domain. Never share them with *.<root>,
      // which is where customer sites live.
      crossSubDomainCookies: { enabled: false },
      useSecureCookies: baseUrl.startsWith("https://"),
    },
    plugins: [
      magicLink({
        expiresIn: MAGIC_LINK_MINUTES * 60,
        // Only a hash is stored, so a database leak can't be replayed as sign-in links.
        storeToken: "hashed",
        // The email links to a confirm page, so email scanners can't use the link up.
        sendMagicLink: async ({ email, url }) => sendSignInEmail(email, confirmLinkFor(url)),
      }),
      nextCookies(),
    ],
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
