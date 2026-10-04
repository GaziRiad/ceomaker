import { isValidSubdomain } from "@ceomaker/schema";
import { asEntitled } from "@/lib/plan";
import { canonicalSiteUrl, siteSitemap } from "@/lib/seo";
import { getTenantSite } from "@/lib/sites";

/** A live customer site's sitemap, on its own host: its one page and when it was last published. */
export async function GET(_request: Request, context: RouteContext<"/s/[subdomain]/sitemap.xml">) {
  const { subdomain } = await context.params;
  const tenant = isValidSubdomain(subdomain) ? await getTenantSite(subdomain) : null;
  if (tenant?.status !== "published") return new Response("Not found", { status: 404 });
  const site = asEntitled(tenant.site, tenant.site.ownerPlan);
  return new Response(siteSitemap(canonicalSiteUrl(site), site.publishedAt), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
