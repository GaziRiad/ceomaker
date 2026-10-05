import {
  isValidSubdomain,
  MEDIA_PATH,
  parseSiteContentForRender,
  parseThemeSettingsForRender,
  resolveSiteColors,
  resolveTemplateRef,
} from "@ceomaker/schema";
import { monogramIconDataUri } from "@ceomaker/templates";
import { mediaStore } from "@/lib/media-store";
import { getTenantSite } from "@/lib/sites";

const CACHE = "public, max-age=86400, s-maxage=31536000, immutable";

/**
 * A live site's uploaded favicon, at <site>/site-icon.png. If the upload can't be loaded, the
 * monogram is served instead, so the tab never shows a broken icon.
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/s/[subdomain]/site-icon.png">,
) {
  const { subdomain } = await context.params;
  if (!isValidSubdomain(subdomain)) return new Response("Not found", { status: 404 });
  const tenant = await getTenantSite(subdomain);
  if (tenant?.status !== "published") return new Response("Not found", { status: 404 });
  const site = tenant.site;
  const { meta } = parseSiteContentForRender(site.content);

  const src = meta?.favicon;
  const media =
    src && MEDIA_PATH.test(src)
      ? await mediaStore()
          ?.get(src.slice("/media/".length))
          .catch(() => null)
      : null;
  if (media) {
    return new Response(media.data, {
      headers: { "Content-Type": media.contentType, "Cache-Control": CACHE },
    });
  }

  const { key, version } = resolveTemplateRef(site.templateKey, site.templateVersion);
  const colors = resolveSiteColors(parseThemeSettingsForRender(site.theme), key, version);
  const svg = decodeURIComponent(
    monogramIconDataUri(meta?.name ?? subdomain, colors).replace("data:image/svg+xml,", ""),
  );
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": CACHE },
  });
}
