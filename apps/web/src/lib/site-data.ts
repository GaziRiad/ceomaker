import "server-only";
import { getDb, getSiteForOwner, type OwnedSite } from "@ceomaker/db";
import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_TEMPLATE_KEY,
  normalizeTemplateKey,
  parseSiteContent,
  parseSiteContentForRender,
  parseThemeSettingsForRender,
  type SiteContent,
  type TemplateKey,
  type ThemeSettings,
} from "@ceomaker/schema";
import { notFound, redirect } from "next/navigation";
import { getSession } from "./auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

export interface EditableDraft {
  templateKey: TemplateKey;
  theme: ThemeSettings;
  content: SiteContent;
}

/**
 * Stored JSON as something the editor can hold. Saves are validated, so the strict parse
 * normally succeeds; if an older or damaged draft doesn't, keep every section that does parse.
 */
export function toEditableDraft(stored: {
  templateKey: string;
  theme: unknown;
  content: unknown;
}): EditableDraft {
  const strict = parseSiteContent(stored.content);
  let content: SiteContent;
  if (strict.success) {
    content = strict.data;
  } else {
    const tolerant = parseSiteContentForRender(stored.content);
    content = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      meta: tolerant.meta ?? { name: "Your Name", affiliations: [], keywords: [] },
      sections: tolerant.sections,
    };
  }
  return {
    templateKey: normalizeTemplateKey(stored.templateKey) ?? DEFAULT_TEMPLATE_KEY,
    theme: parseThemeSettingsForRender(stored.theme),
    content,
  };
}

/**
 * Loads a site for a signed-in owner's page. Signed-out visitors go to sign-in and come back;
 * anyone else's site (or a malformed id) is a 404, so ids can't be probed.
 */
export async function loadOwnedSite(
  siteId: string,
  returnTo: string,
): Promise<{
  user: { id: string; name: string; email: string };
  site: OwnedSite;
  draft: EditableDraft;
}> {
  const session = await getSession();
  if (!session) redirect(`/sign-in?callbackURL=${encodeURIComponent(returnTo)}`);
  if (!isUuid(siteId)) notFound();
  const site = await getSiteForOwner(getDb(), { userId: session.user.id, siteId });
  if (!site) notFound();
  return {
    user: { id: session.user.id, name: session.user.name, email: session.user.email },
    site,
    draft: toEditableDraft(site.draft),
  };
}

export function initialsFor(name: string, email: string): string {
  const words = (name || email.split("@")[0] || "").match(/\p{L}+/gu) ?? [];
  return (
    (words[0]?.[0] ?? "") + (words.length > 1 ? (words.at(-1)?.[0] ?? "") : "")
  ).toUpperCase();
}
