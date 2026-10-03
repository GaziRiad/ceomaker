import { getDb, getUserPlan, type PublishedSite } from "@ceomaker/db";
import {
  FREE_FALLBACK_TEMPLATE,
  isPremiumTemplate,
  isPro,
  resolveTemplateRef,
  type Plan,
} from "@ceomaker/schema";

/** The signed-in account's plan, read fresh: billing can change it at any moment. */
export function planFor(userId: string): Promise<Plan> {
  return getUserPlan(getDb(), userId);
}

/** The contact section's form switched off, in raw stored content (rendered tolerantly later). */
function withoutForm(content: unknown): unknown {
  if (typeof content !== "object" || content === null) return content;
  const document = content as { sections?: unknown };
  if (!Array.isArray(document.sections)) return content;
  return {
    ...document,
    sections: document.sections.map((section: unknown) => {
      if (typeof section !== "object" || section === null) return section;
      const value = section as { type?: unknown; form?: unknown };
      if (value.type !== "contact") return section;
      const form = typeof value.form === "object" && value.form !== null ? value.form : {};
      return { ...value, form: { ...form, enabled: false } };
    }),
  };
}

/**
 * What a published site shows given its owner's plan. A free site keeps its content, but a
 * premium template renders as Meridian (with Meridian's colours) and the contact form is off.
 * Applied when rendering, so the stored version is untouched and Pro brings it all back.
 */
export function asEntitled<
  T extends Pick<PublishedSite, "templateKey" | "templateVersion" | "content">,
>(site: T, plan: Plan): T {
  if (isPro(plan)) return site;
  const { key } = resolveTemplateRef(site.templateKey, site.templateVersion);
  const template = isPremiumTemplate(key)
    ? { templateKey: FREE_FALLBACK_TEMPLATE.key, templateVersion: FREE_FALLBACK_TEMPLATE.version }
    : {};
  return { ...site, ...template, content: withoutForm(site.content) };
}
