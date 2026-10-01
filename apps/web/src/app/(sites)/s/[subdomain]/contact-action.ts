"use server";

import { getDb, getMessageAlertAddress, saveContactMessage } from "@ceomaker/db";
import {
  CONTACT_MESSAGE_LIMITS,
  contactMessageSchema,
  isValidSubdomain,
  parseSiteContentForRender,
  type ContactMessageInput,
  type SendContactMessageResult,
} from "@ceomaker/schema";
import { getTemplate } from "@ceomaker/templates";
import { headers } from "next/headers";
import { after } from "next/server";
import { createHmac } from "node:crypto";
import { emailConfigured, sendMessageNotification } from "@/lib/email";
import { serverEnv } from "@/lib/env";
import { appUrl } from "@/lib/routing";
import { getTenantSite } from "@/lib/sites";

// The contact form on a live site. Anyone can call this, so it trusts nothing: the site must be
// live with its form on, the message is validated, bots are dropped and senders are rate-limited.

const UNAVAILABLE: SendContactMessageResult = {
  ok: false,
  error: "This form isn't taking messages right now. Please try again later.",
};

const FIELD_ERRORS: Record<string, SendContactMessageResult> = {
  name: { ok: false, field: "name", error: "Add your name." },
  email: { ok: false, field: "email", error: "Check the email address." },
  message: {
    ok: false,
    field: "message",
    error: `Add a short message, under ${CONTACT_MESSAGE_LIMITS.message.toLocaleString("en-GB")} characters.`,
  },
};

/** A keyed hash of the sender's address: enough to rate-limit, useless to anyone reading it. */
async function senderKey(): Promise<string | null> {
  const list = await headers();
  const address =
    list.get("x-forwarded-for")?.split(",")[0]?.trim() || list.get("x-real-ip")?.trim();
  if (!address) return null;
  return createHmac("sha256", serverEnv().BETTER_AUTH_SECRET)
    .update(`contact:${address}`)
    .digest("base64url")
    .slice(0, 32);
}

export async function sendContactMessage(
  subdomain: string,
  input: ContactMessageInput,
): Promise<SendContactMessageResult> {
  if (typeof subdomain !== "string" || !isValidSubdomain(subdomain)) return UNAVAILABLE;
  if (typeof input !== "object" || input === null) return UNAVAILABLE;
  // Bots fill in the hidden field. They get the same answer as people, and nothing is kept.
  if (typeof input.website === "string" && input.website.trim()) return { ok: true };

  const parsed = contactMessageSchema.safeParse(input);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    return (
      FIELD_ERRORS[field] ?? {
        ok: false,
        error: "Part of the message didn't come through. Check the form and try again.",
      }
    );
  }

  const tenant = await getTenantSite(subdomain);
  if (tenant?.status !== "published") return UNAVAILABLE;
  const contact = parseSiteContentForRender(tenant.site.content).sections.find(
    (section) => section.type === "contact",
  );
  const form = contact?.type === "contact" ? contact.form : undefined;
  const template = getTemplate(tenant.site.templateKey, tenant.site.templateVersion);
  if (!template.contactForm || form?.enabled === false) {
    return UNAVAILABLE;
  }

  const topics = form?.topics ?? [];
  const message = {
    ...parsed.data,
    // Only topics the site offers; anything else is noise from a scripted request.
    topic: topics.includes(parsed.data.topic) ? parsed.data.topic : "",
  };
  const saved = await saveContactMessage(getDb(), {
    siteId: tenant.site.siteId,
    message,
    senderKey: await senderKey(),
  });
  if (!saved.ok) {
    return {
      ok: false,
      error: "Too many messages from here for now. Please try again in an hour.",
    };
  }
  after(() => alertOwner(tenant.site.siteId, saved.id, message));
  return { ok: true };
}

/**
 * Emails the owner about a new message, after the sender has their answer. The message is saved
 * either way, so a failed email is logged, never shown to the sender. Skipped in production until
 * an email provider is set up; development prints the email instead.
 */
async function alertOwner(
  siteId: string,
  messageId: string,
  message: { name: string; topic: string },
): Promise<void> {
  if (!emailConfigured() && process.env.NODE_ENV === "production") return;
  try {
    const to = await getMessageAlertAddress(getDb(), siteId);
    if (!to) return;
    await sendMessageNotification({
      to,
      sender: message.name,
      topic: message.topic,
      url: `${appUrl()}/dashboard/messages?open=${encodeURIComponent(messageId)}`,
    });
  } catch (error) {
    console.error("Couldn't email the site owner about a new message", error);
  }
}
