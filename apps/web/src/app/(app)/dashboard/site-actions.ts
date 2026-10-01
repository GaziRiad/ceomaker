"use server";

import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import {
  AddressLockedError,
  changeSubdomain,
  copyVersionToDraft,
  deleteContactMessage,
  deleteSite,
  finishAiUsage,
  getDb,
  getSiteForOwner,
  InvalidSiteDataError,
  isSubdomainAvailable,
  LowContrastError,
  makeVersionLive,
  publishSite,
  saveDraft,
  SiteNotFoundError,
  startAiUsage,
  SubdomainTakenError,
  VersionNotFoundError,
} from "@ceomaker/db";
import {
  MIN_TEXT_CONTRAST,
  subdomainSchema,
  templateKeySchema,
  type SiteContentInput,
  type ThemeSettingsInput,
} from "@ceomaker/schema";
import { updateTag } from "next/cache";
import { z } from "zod";
import { AI_LIMITS, AI_MODEL, anthropic, DAY_MS, FALLBACK_BETA } from "@/lib/ai/client";
import {
  fallbackRewrite,
  REWRITE_MODES,
  REWRITE_SYSTEM_PROMPT,
  type RewriteMode,
} from "@/lib/ai/draft";
import { getSession } from "@/lib/auth";
import { siteUrl } from "@/lib/routing";
import { isUuid, toEditableDraft } from "@/lib/site-data";
import { siteCacheTag } from "@/lib/sites";

// Every action re-checks the session and passes the user id to queries that scope by owner.

type Failure = { ok: false; error: string };

async function currentUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user.id ?? null;
}

const SIGNED_OUT: Failure = {
  ok: false,
  error: "Your session ended. Sign in again to keep editing.",
};
const NOT_FOUND: Failure = { ok: false, error: "This site no longer exists." };
/** Generous for a one-page site; stops oversized payloads before validation work. */
const MAX_DRAFT_BYTES = 256 * 1024;

export interface DraftPayload {
  templateKey: string;
  theme: ThemeSettingsInput;
  content: SiteContentInput;
}

export async function saveDraftAction(
  siteId: string,
  draft: DraftPayload,
): Promise<{ ok: true; savedAt: string } | Failure> {
  const userId = await currentUserId();
  if (!userId) return SIGNED_OUT;
  if (!isUuid(siteId)) return NOT_FOUND;
  if (JSON.stringify(draft).length > MAX_DRAFT_BYTES) {
    return { ok: false, error: "This draft is too large to save." };
  }
  try {
    const saved = await saveDraft(getDb(), { userId, siteId, ...draft });
    return { ok: true, savedAt: saved.updatedAt.toISOString() };
  } catch (error) {
    if (error instanceof SiteNotFoundError) return NOT_FOUND;
    if (error instanceof InvalidSiteDataError) {
      return { ok: false, error: "Some fields need fixing before this can be saved." };
    }
    throw error;
  }
}

/** Template picker: switches the draft's template, keeping content and colours. */
export async function chooseTemplateAction(
  siteId: string,
  templateKey: string,
): Promise<{ ok: true } | Failure> {
  const userId = await currentUserId();
  if (!userId) return SIGNED_OUT;
  if (!isUuid(siteId)) return NOT_FOUND;
  const key = templateKeySchema.safeParse(templateKey);
  if (!key.success) return { ok: false, error: "Unknown template." };
  const db = getDb();
  const site = await getSiteForOwner(db, { userId, siteId });
  if (!site) return NOT_FOUND;
  const draft = toEditableDraft(site.draft);
  await saveDraft(db, { userId, siteId, ...draft, templateKey: key.data });
  return { ok: true };
}

export async function checkAddressAction(
  siteId: string,
  subdomain: string,
): Promise<{ available: boolean; message: string }> {
  const userId = await currentUserId();
  if (!userId || !isUuid(siteId))
    return { available: false, message: "Sign in to check addresses." };
  const parsed = subdomainSchema.safeParse(subdomain);
  if (!parsed.success) {
    return { available: false, message: parsed.error.issues[0]?.message ?? "Not a valid address." };
  }
  const available = await isSubdomainAvailable(getDb(), parsed.data, {
    exceptSiteId: siteId,
    userId,
  });
  return available
    ? { available: true, message: "Available" }
    : { available: false, message: "Someone already has this address." };
}

export async function publishAction(
  siteId: string,
  options: { subdomain?: string } = {},
): Promise<{ ok: true; versionNumber: number; url: string; subdomain: string } | Failure> {
  const userId = await currentUserId();
  if (!userId) return SIGNED_OUT;
  if (!isUuid(siteId)) return NOT_FOUND;
  const db = getDb();
  const site = await getSiteForOwner(db, { userId, siteId });
  if (!site) return NOT_FOUND;

  // Billing isn't live yet: during the beta every account may publish (docs/PLAN.md, Phase 3).
  try {
    let subdomain = site.subdomain;
    if (options.subdomain && options.subdomain !== site.subdomain) {
      subdomain = (await changeSubdomain(db, { userId, siteId, subdomain: options.subdomain }))
        .subdomain;
      updateTag(siteCacheTag(site.subdomain));
    }
    const published = await publishSite(db, { userId, siteId });
    updateTag(siteCacheTag(subdomain));
    return {
      ok: true,
      versionNumber: published.versionNumber,
      url: siteUrl(subdomain),
      subdomain,
    };
  } catch (error) {
    if (error instanceof SubdomainTakenError) {
      return { ok: false, error: "Someone already has this address. Try another." };
    }
    if (error instanceof AddressLockedError) {
      return { ok: false, error: "Your address can't change once the site has been live." };
    }
    if (error instanceof LowContrastError) {
      return {
        ok: false,
        error: `Text contrast is ${error.ratio.toFixed(1)}:1. Publishing needs at least ${MIN_TEXT_CONTRAST}:1: adjust your colours in Brand.`,
      };
    }
    if (error instanceof InvalidSiteDataError) {
      return { ok: false, error: "Some fields need fixing before this can be published." };
    }
    if (error instanceof SiteNotFoundError) return NOT_FOUND;
    throw error;
  }
}

const VERSION_GONE: Failure = { ok: false, error: "That version no longer exists." };

/** Puts an earlier version live at once. The draft keeps the latest edits. */
export async function makeVersionLiveAction(
  siteId: string,
  versionId: string,
): Promise<{ ok: true } | Failure> {
  const userId = await currentUserId();
  if (!userId) return SIGNED_OUT;
  if (!isUuid(siteId) || !isUuid(versionId)) return VERSION_GONE;
  try {
    const { subdomain } = await makeVersionLive(getDb(), { userId, siteId, versionId });
    updateTag(siteCacheTag(subdomain));
    return { ok: true };
  } catch (error) {
    if (error instanceof SiteNotFoundError || error instanceof VersionNotFoundError) {
      return VERSION_GONE;
    }
    throw error;
  }
}

/** Replaces the draft with an earlier version to keep working from it. Live is untouched. */
export async function openVersionInEditorAction(
  siteId: string,
  versionId: string,
): Promise<{ ok: true } | Failure> {
  const userId = await currentUserId();
  if (!userId) return SIGNED_OUT;
  if (!isUuid(siteId) || !isUuid(versionId)) return VERSION_GONE;
  try {
    await copyVersionToDraft(getDb(), { userId, siteId, versionId });
    return { ok: true };
  } catch (error) {
    if (error instanceof SiteNotFoundError || error instanceof VersionNotFoundError) {
      return VERSION_GONE;
    }
    throw error;
  }
}

/**
 * Deletes the user's site. The confirmation must be the site's address, checked here as well as
 * in the dialog, so no stray request can delete a site.
 */
export async function deleteSiteAction(
  siteId: string,
  confirmation: string,
): Promise<{ ok: true } | Failure> {
  const userId = await currentUserId();
  if (!userId) return SIGNED_OUT;
  if (!isUuid(siteId)) return NOT_FOUND;
  const db = getDb();
  const site = await getSiteForOwner(db, { userId, siteId });
  if (!site) return NOT_FOUND;
  if (String(confirmation).trim().toLowerCase() !== site.subdomain) {
    return { ok: false, error: "Type the address exactly as shown to confirm." };
  }
  try {
    const deleted = await deleteSite(db, { userId, siteId });
    updateTag(siteCacheTag(deleted.subdomain));
    return { ok: true };
  } catch (error) {
    if (error instanceof SiteNotFoundError) return NOT_FOUND;
    throw error;
  }
}

/** Deletes one message from the owner's inbox. */
export async function deleteMessageAction(messageId: string): Promise<{ ok: true } | Failure> {
  const userId = await currentUserId();
  if (!userId) return SIGNED_OUT;
  const gone: Failure = { ok: false, error: "This message was already deleted." };
  if (typeof messageId !== "string" || !isUuid(messageId)) return gone;
  return (await deleteContactMessage(getDb(), { userId, messageId })) ? { ok: true } : gone;
}

const rewriteOutput = z.object({ headline: z.string() });

export async function rewriteHeadlineAction(
  siteId: string,
  headline: string,
  mode: RewriteMode,
): Promise<{ ok: true; headline: string } | Failure> {
  const userId = await currentUserId();
  if (!userId) return SIGNED_OUT;
  if (!isUuid(siteId) || !REWRITE_MODES.includes(mode)) return NOT_FOUND;
  const db = getDb();
  const site = await getSiteForOwner(db, { userId, siteId });
  if (!site) return NOT_FOUND;

  const client = anthropic();
  if (!client) {
    const suggestion = fallbackRewrite(site.answers, mode);
    return suggestion
      ? { ok: true, headline: suggestion }
      : { ok: false, error: "AI rewriting isn't switched on yet." };
  }

  const usage = await startAiUsage(db, {
    userId,
    siteId,
    kind: "rewrite",
    limit: AI_LIMITS.rewrite,
    windowMs: DAY_MS,
  });
  if (!usage) return { ok: false, error: "You've reached today's limit for AI rewrites." };

  try {
    const message = await client.beta.messages.parse({
      model: AI_MODEL,
      max_tokens: 4000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      system: REWRITE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            mode,
            headline: headline.slice(0, 300),
            person: site.answers
              ? {
                  role: site.answers.role,
                  industry: site.answers.industry,
                  voice: site.answers.voice,
                }
              : null,
          }),
        },
      ],
      output_config: { effort: "low", format: betaZodOutputFormat(rewriteOutput) },
    });
    const next = message.parsed_output?.headline.replace(/\s+/g, " ").trim().slice(0, 120);
    await finishAiUsage(db, {
      id: usage.id,
      status: message.stop_reason === "refusal" ? "refused" : next ? "succeeded" : "failed",
      model: message.model,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    });
    if (!next || message.stop_reason === "refusal") {
      return { ok: false, error: "That rewrite didn't work. Try another option." };
    }
    return { ok: true, headline: next };
  } catch (error) {
    await finishAiUsage(db, { id: usage.id, status: "failed" });
    console.error("Headline rewrite failed", error);
    return { ok: false, error: "AI rewriting is unavailable right now. Try again shortly." };
  }
}
