import type { RenderableSiteContent, SectionType, TemplateKey, Theme } from "@ceomaker/schema";
import type { ReactNode } from "react";

export interface TemplateProps {
  content: RenderableSiteContent;
  theme: Theme;
  /** Drives the footer year, so rendering stays deterministic and cacheable. */
  publishedAt: Date;
}

export interface TemplateDefinition {
  key: TemplateKey;
  name: string;
  description: string;
  supportedSections: readonly SectionType[];
  Component: (props: TemplateProps) => ReactNode;
}
