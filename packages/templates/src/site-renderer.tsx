import {
  DEFAULT_TEMPLATE_KEY,
  normalizeTemplateKey,
  parseSiteContentForRender,
  parseThemeSettingsForRender,
  resolveSiteColors,
  type RenderableSiteContent,
  type SiteColors,
  type TemplateKey,
} from "@ceomaker/schema";
import { buildSiteModel } from "./model";
import { getTemplate } from "./registry";
import { themeToStyle } from "./theme-style";

export interface TemplateViewProps {
  templateKey: TemplateKey;
  colors: SiteColors;
  content: RenderableSiteContent;
  publishedAt: Date;
  /** Inside an editor or thumbnail frame: don't stretch to the viewport height. */
  preview?: boolean;
  /** Pause animations (thumbnails). */
  still?: boolean;
  /** Mark text for in-place editing (the editor's preview). */
  editable?: boolean;
}

/** Renders validated content with a template. Used live and by the editor's previews. */
export function TemplateView({
  templateKey,
  colors,
  content,
  publishedAt,
  preview = false,
  still = false,
  editable = false,
}: TemplateViewProps) {
  const Template = getTemplate(templateKey).Component;
  return (
    <div
      className="ceomaker-site"
      data-still={still || undefined}
      style={{ ...themeToStyle(colors), minHeight: preview ? undefined : "100dvh" }}
    >
      <Template model={buildSiteModel(content, { editable })} publishedAt={publishedAt} />
    </div>
  );
}

export interface SiteRendererProps {
  templateKey: string;
  /** Raw stored JSON; validated here before anything is rendered. */
  theme: unknown;
  content: unknown;
  publishedAt: Date;
}

/**
 * Renders a stored site version. Inputs are untrusted database JSON: content is parsed leniently
 * (bad sections are skipped) and invalid colours fall back to the template's defaults.
 */
export function SiteRenderer({ templateKey, theme, content, publishedAt }: SiteRendererProps) {
  const key = normalizeTemplateKey(templateKey) ?? DEFAULT_TEMPLATE_KEY;
  return (
    <TemplateView
      templateKey={key}
      colors={resolveSiteColors(parseThemeSettingsForRender(theme), key)}
      content={parseSiteContentForRender(content)}
      publishedAt={publishedAt}
    />
  );
}
