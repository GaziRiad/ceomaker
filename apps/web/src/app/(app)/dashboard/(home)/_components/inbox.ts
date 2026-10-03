import type { OwnedSite } from "@ceomaker/db";
import { parseSiteContentForRender } from "@ceomaker/schema";
import { getTemplate } from "@ceomaker/templates";
import { siteUrl } from "@/lib/routing";
import { toEditableDraft } from "@/lib/site-data";

export interface InboxAction {
  label: string;
  href: string;
  external?: boolean;
}

/**
 * Why the inbox is empty, said plainly, with the one thing to do about it. `hasMessages` is
 * false when there are none at all; a site whose form is off can still have old messages.
 */
export function emptyInbox(
  site: OwnedSite,
  hasMessages: boolean,
  pro: boolean,
): { text: string; action: InboxAction } | null {
  if (hasMessages) return null;
  if (!pro) {
    return {
      text: "The contact form and this inbox are part of Pro. Until then, visitors reach you by email and your links.",
      action: { label: "See plans", href: "/dashboard/settings/billing" },
    };
  }
  const editor = `/dashboard/sites/${site.id}/edit`;
  if (site.status === "draft" || !site.published) {
    return {
      text: "Messages from your contact form appear here once your site is live.",
      action: { label: "Continue editing", href: editor },
    };
  }
  if (site.status === "paused") {
    return {
      text: "Your site is paused, so its contact form is offline. Messages appear here again once it's back.",
      action: { label: "Billing settings", href: "/dashboard/settings/billing" },
    };
  }
  const live = toEditableDraft(site.published);
  const template = getTemplate(live.templateKey, live.templateVersion);
  if (!template.contactForm) {
    return {
      text: `The ${template.name} template has no contact form. Meridian has one.`,
      action: { label: "Change template", href: editor },
    };
  }
  const contact = parseSiteContentForRender(live.content).sections.find(
    (section) => section.type === "contact",
  );
  if (contact?.type === "contact" && contact.form?.enabled === false) {
    return {
      text: "Your contact form is off. Turn it on in the editor, under Contact.",
      action: { label: "Open the editor", href: editor },
    };
  }
  return {
    text: "No messages yet. When someone writes through your site, it appears here.",
    action: { label: "View site", href: siteUrl(site.subdomain), external: true },
  };
}

/** One line of a message for a list: whitespace folded, a leading "Dear Amelia," dropped. */
export function snippet(message: string): string {
  return message
    .replace(/\s+/g, " ")
    .replace(/^(dear|hello|hi|hey) [^,]{1,40},\s*/i, "")
    .trim();
}

/** "3 new · 27 total", "27 total", "1 message". */
export function countLabel(total: number, unread: number): string {
  if (unread) return `${unread} new · ${total} total`;
  return total === 1 ? "1 message" : `${total} total`;
}
