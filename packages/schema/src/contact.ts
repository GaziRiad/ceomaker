import { z } from "zod";
import { longText, requiredText, text } from "./primitives";

/** Field limits for messages sent through a site's contact form, shared by form and server. */
export const CONTACT_MESSAGE_LIMITS = {
  name: 80,
  email: 254,
  organisation: 100,
  topic: 40,
  message: 4000,
} as const;

/** What a visitor sends through a site's contact form. */
export const contactMessageSchema = z.object({
  name: requiredText(CONTACT_MESSAGE_LIMITS.name),
  email: z.email().max(CONTACT_MESSAGE_LIMITS.email),
  organisation: text(CONTACT_MESSAGE_LIMITS.organisation).default(""),
  topic: text(CONTACT_MESSAGE_LIMITS.topic).default(""),
  message: longText(CONTACT_MESSAGE_LIMITS.message).min(1),
});

export type ContactMessage = z.output<typeof contactMessageSchema>;

export interface ContactMessageInput {
  name: string;
  email: string;
  organisation: string;
  topic: string;
  message: string;
  /** Honeypot: hidden from people, filled in by bots. */
  website: string;
}

export type ContactMessageField = "name" | "email" | "message";

export type SendContactMessageResult =
  { ok: true } | { ok: false; error: string; field?: ContactMessageField };

/** Loose shape check used by the form before sending; the server validates with the schema. */
export const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
