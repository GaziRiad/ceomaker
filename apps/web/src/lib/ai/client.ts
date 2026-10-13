import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { serverEnv } from "../env";

/**
 * The smallest current model, for cost while most sign-ups don't publish (owner, October 2026):
 * about $0.02 a draft and a tenth of a cent a rewrite. Without thinking or effort settings, which
 * it doesn't take. Move drafting to a larger model once sign-ups convert.
 */
export const AI_MODEL = "claude-haiku-4-5";

let client: Anthropic | null = null;

/** Null when ANTHROPIC_API_KEY isn't set; callers then use the non-AI path. */
export function anthropic(): Anthropic | null {
  const apiKey = serverEnv().ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  client ??= new Anthropic({ apiKey, maxRetries: 2, timeout: 120_000 });
  return client;
}

export const DAY_MS = 24 * 60 * 60 * 1000;
/** A window long enough to count every draft an account has ever made. */
export const FOREVER_MS = 100 * 365 * DAY_MS;
/** Per user per rolling day. Drafting is the expensive call; rewrites are small. */
export const AI_LIMITS = { generate: 3, rewrite: 30 } as const;
/**
 * Drafts an admin can write in a rolling day for people they write to (owner, October 2026):
 * about $0.40 at most. Their own site keeps Pro's limit.
 */
export const ADMIN_DRAFTS_PER_DAY = 20;

export function aiEnabled(): boolean {
  return Boolean(serverEnv().ANTHROPIC_API_KEY);
}
