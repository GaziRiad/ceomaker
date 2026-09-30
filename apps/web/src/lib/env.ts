import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters (see .env.example)"),
  // Optional: derived from Vercel's system variables when unset (see appUrl in lib/routing).
  APP_URL: z.url().optional(),
  // Optional: unset means path mode, with customer sites at /sites/<name>.
  ROOT_DOMAIN: z.string().min(1).optional(),
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
