import {
  DEFAULT_PHOTO_GRADE,
  parseSiteContentForRender,
  parseThemeSettingsForRender,
  resolvePhotoGrade,
  resolveSiteColors,
  resolveTemplateRef,
  type PhotoGrade,
  type RenderableSiteContent,
  type SiteColors,
  type TemplateKey,
} from "@ceomaker/schema";
import { buildSiteModel } from "./model";
import { getTemplate } from "./registry";
import { themeToStyle } from "./theme-style";
import type { SendContactMessage } from "./types";

export interface TemplateViewProps {
  templateKey: TemplateKey;
  /** The design of the template: a stored version keeps the look it was saved with. */
  templateVersion: number;
  colors: SiteColors;
  /** The site's photo treatment; templates that don't grade photos ignore it. */
  photoGrade?: PhotoGrade | undefined;
  content: RenderableSiteContent;
  publishedAt: Date;
  /** Inside an editor or thumbnail frame: don't stretch to the viewport height. */
  preview?: boolean;
  /** Pause animations (thumbnails). */
  still?: boolean;
  /** Only the header and the hero: all a thumbnail shows. */
  top?: boolean;
  /** Mark text for in-place editing (the editor's preview). */
  editable?: boolean;
  /** Only the person's own answers, with placeholders for the rest (the questions screen). */
  draft?: boolean;
  /** Live sites only: delivers contact form messages. */
  sendMessage?: SendContactMessage | undefined;
}

/** Renders validated content with a template. Used live and by the editor's previews. */
export function TemplateView({
  templateKey,
  templateVersion,
  colors,
  photoGrade = DEFAULT_PHOTO_GRADE,
  content,
  publishedAt,
  preview = false,
  still = false,
  top = false,
  editable = false,
  draft = false,
  sendMessage,
}: TemplateViewProps) {
  const Template = getTemplate(templateKey, templateVersion).Component;
  return (
    <div
      className="ceomaker-site"
      data-still={still || undefined}
      style={{ ...themeToStyle(colors), minHeight: preview ? undefined : "100dvh" }}
    >
      <Template
        model={buildSiteModel(content, { editable, draft, top })}
        publishedAt={publishedAt}
        colors={colors}
        photoGrade={photoGrade}
        sendMessage={sendMessage}
      />
    </div>
  );
}

export interface SiteRendererProps {
  templateKey: string;
  /** As stored; an unknown value renders the template's oldest design, never its newest. */
  templateVersion: unknown;
  /** Raw stored JSON; validated here before anything is rendered. */
  theme: unknown;
  content: unknown;
  publishedAt: Date;
  sendMessage?: SendContactMessage | undefined;
}

/**
 * Renders a stored site version. Inputs are untrusted database JSON: content is parsed leniently
 * (bad sections are skipped) and invalid colours fall back to the template's defaults.
 */
export function SiteRenderer({
  templateKey,
  templateVersion,
  theme,
  content,
  publishedAt,
  sendMessage,
}: SiteRendererProps) {
  const { key, version } = resolveTemplateRef(templateKey, templateVersion);
  const settings = parseThemeSettingsForRender(theme);
  return (
    <TemplateView
      templateKey={key}
      templateVersion={version}
      colors={resolveSiteColors(settings, key, version)}
      photoGrade={resolvePhotoGrade(settings)}
      content={parseSiteContentForRender(content)}
      publishedAt={publishedAt}
      sendMessage={sendMessage}
    />
  );
}
