import "server-only";
import { z } from "zod";

const optional = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

const serverEnvSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters (see .env.example)"),
  // Optional: derived from Vercel's system variables when unset (see appUrl in lib/routing).
  APP_URL: z.url().optional(),
  // Optional: customer sites live at <name>.<ROOT_DOMAIN>; unset means the app's own host.
  ROOT_DOMAIN: z.string().min(1).optional(),
  // Sign-in emails. Without a key, development prints sign-in links to the server console.
  RESEND_API_KEY: optional,
  EMAIL_FROM: optional,
  // "Continue with Google" appears only when both are set.
  GOOGLE_CLIENT_ID: optional,
  GOOGLE_CLIENT_SECRET: optional,
  // AI drafting. Without a key, drafts are built from the answers alone and rewrites are off.
  ANTHROPIC_API_KEY: optional,
  // Custom domains are added to this Vercel project through its API. Without them, production
  // says custom domains aren't available yet (development simulates the hosting side).
  VERCEL_API_TOKEN: optional,
  VERCEL_PROJECT_ID: optional,
  VERCEL_TEAM_ID: optional,
  // Optional: a hostname of ours that points at Vercel, given to customers as their www CNAME
  // so moving hosts later doesn't need every customer to edit DNS. Defaults to Vercel's.
  CUSTOM_DOMAIN_CNAME: optional,
  // Secret for the scheduled domain check (Vercel sends it as a bearer token).
  CRON_SECRET: optional,
});

export type ServerEnv = z.output<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/** Validated lazily so `next build` can run without secrets; the first real request fails fast. */
export function serverEnv(): ServerEnv {
  if (!cached) {
    const result = serverEnvSchema.safeParse(process.env);
    if (!result.success) {
      const problems = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
      throw new Error(`Invalid server environment:\n  ${problems.join("\n  ")}`);
    }
    cached = result.data;
  }
  return cached;
}

export function googleSignInEnabled(env: ServerEnv = serverEnv()): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}
