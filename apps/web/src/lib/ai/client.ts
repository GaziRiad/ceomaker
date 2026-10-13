import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { serverEnv } from "../env";

/**
 * Drafts from the answers alone and headline rewrites (owner, October 2026): the current small
 * model, about a tenth of Claude Haiku 4.5's price ($0.10 / $0.50 per million tokens), so well
 * under a cent a draft. It thinks by default; effort is set per request.
 */
export const AI_MODEL = "claude-haiku-5-5";

/**
 * Drafts from a CV or LinkedIn export (owner, October 2026): long exports need a stronger reader
 * than the small model (projects inside job descriptions, certifications, the profile link).
 * Claude Sonnet 5.5 at medium effort, about half Claude Opus 5.5's price: roughly $0.08 to $0.15
 * a draft. `ai_usage` records the real tokens.
 */
export const DOCUMENT_MODEL = "claude-sonnet-5-5";

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
