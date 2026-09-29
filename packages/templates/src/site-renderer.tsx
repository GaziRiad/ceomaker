import { defaultTheme, parseSiteContentForRender, themeSchema } from "@ceomaker/schema";
import { getTemplate } from "./registry";
import { themeToStyle } from "./theme-style";

export interface SiteRendererProps {
  templateKey: string;
  /** Raw stored JSON; validated here before anything is rendered. */
  theme: unknown;
  content: unknown;
  publishedAt: Date;
}

/**
 * Renders a stored site version. Inputs are untrusted database JSON: content is parsed leniently
 * (bad sections are skipped) and an invalid theme falls back to the default rather than failing.
 */
export function SiteRenderer({ templateKey, theme, content, publishedAt }: SiteRendererProps) {
  const parsedTheme = themeSchema.safeParse(theme);
  const resolvedTheme = parsedTheme.success ? parsedTheme.data : defaultTheme;
  const template = getTemplate(templateKey);
  const Template = template.Component;

  return (
    <div
      style={themeToStyle(resolvedTheme)}
      className="min-h-dvh bg-site-bg font-site-body text-site-fg antialiased selection:bg-site-accent/30"
    >
      <Template
        content={parseSiteContentForRender(content)}
        theme={resolvedTheme}
        publishedAt={publishedAt}
      />
    </div>
  );
}
