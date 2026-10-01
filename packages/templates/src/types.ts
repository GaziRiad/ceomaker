import type { TemplateKey } from "@ceomaker/schema";
import type { ReactNode } from "react";
import type { SiteModel } from "./model";

export interface TemplateProps {
  model: SiteModel;
  /** Drives the footer year, so rendering stays deterministic and cacheable. */
  publishedAt: Date;
}

export interface TemplateDefinition {
  key: TemplateKey;
  name: string;
  /** Long description, from the template overview board. */
  description: string;
  /** One line for the template picker. */
  tagline: string;
  Component: (props: TemplateProps) => ReactNode;
}
