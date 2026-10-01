import type {
  ContactMessageInput,
  SendContactMessageResult,
  SiteColors,
  TemplateKey,
} from "@ceomaker/schema";
import type { ReactNode } from "react";
import type { SiteModel } from "./model";

/** Delivers a message from a live site's contact form. */
export type SendContactMessage = (
  message: ContactMessageInput,
) => Promise<SendContactMessageResult>;

export interface TemplateProps {
  model: SiteModel;
  /** Drives the footer year, so rendering stays deterministic and cacheable. */
  publishedAt: Date;
  /** The site's three colours, for templates that derive contrast-safe roles from them. */
  colors: SiteColors;
  /** Present on live sites only. Previews show the contact form without sending anything. */
  sendMessage?: SendContactMessage | undefined;
}

/** One design of a template. Shipped designs are frozen: redesigns are a new version. */
export interface TemplateDefinition {
  key: TemplateKey;
  version: number;
  name: string;
  /** Long description, from the template overview board. */
  description: string;
  /** One line for the template picker. */
  tagline: string;
  /** Whether the template shows the contact form (so visitors can write without an email). */
  contactForm: boolean;
  Component: (props: TemplateProps) => ReactNode;
}
