import type {
  ContactMessageInput,
  PhotoGrade,
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
  /** The site's photo treatment, for templates that grade photos. */
  photoGrade: PhotoGrade;
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
  /**
   * Optional content only some templates show. The editor offers it only on those, and keeps it
   * when the owner switches to a template that ignores it.
   */
  shows: {
    /** More photos after the hero image. */
    gallery: boolean;
    /** A photo beside each testimonial. */
    quotePhotos: boolean;
    /** The site-wide photo treatment. */
    photoGrade: boolean;
    /** The closing call to action. */
    cta: boolean;
    /** Photos cropped around their focus point. */
    focal: boolean;
    /** A photo in the About section. */
    aboutImage: boolean;
    /** Photos on selected work. */
    workImages: boolean;
    /** The Focus section: a few cards on what the owner works on now. */
    focusSection: boolean;
  };
  Component: (props: TemplateProps) => ReactNode;
}
