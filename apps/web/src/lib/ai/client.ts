import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { serverEnv } from "../env";

/** Drafting quality is the product's first impression, so it uses the most capable model. */
export const AI_MODEL = "claude-opus-5-5";

/**
 * Server-side refusal fallbacks: if the model's safety classifiers decline a request, the API
 * re-runs it on Anthropic's recommended fallback model inside the same call.
 */
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let client: Anthropic | null = null;

/** Null when ANTHROPIC_API_KEY isn't set; callers then use the non-AI path. */
export function anthropic(): Anthropic | null {
  const apiKey = serverEnv().ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  client ??= new Anthropic({ apiKey, maxRetries: 2, timeout: 120_000 });
  return client;
}

export const DAY_MS = 24 * 60 * 60 * 1000;
/** Per user per rolling day. Drafting is the expensive call; rewrites are small. */
export const AI_LIMITS = { generate: 10, rewrite: 60 } as const;

export function aiEnabled(): boolean {
  return Boolean(serverEnv().ANTHROPIC_API_KEY);
}
