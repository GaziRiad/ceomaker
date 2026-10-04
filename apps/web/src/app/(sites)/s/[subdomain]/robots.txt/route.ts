import { isValidSubdomain } from "@ceomaker/schema";
import { asEntitled } from "@/lib/plan";
import { canonicalSiteUrl, siteRobots } from "@/lib/seo";
import { getTenantSite } from "@/lib/sites";

/**
 * robots.txt on a customer site's host (its subdomain or own domain): open, with the site's
 * sitemap, once the site is live in production; closed for drafts, paused sites and previews.
 */
export async function GET(_request: Request, context: RouteContext<"/s/[subdomain]/robots.txt">) {
  const { subdomain } = await context.params;
  const tenant = isValidSubdomain(subdomain) ? await getTenantSite(subdomain) : null;
  const canonical =
    tenant?.status === "published"
      ? canonicalSiteUrl(asEntitled(tenant.site, tenant.site.ownerPlan))
      : null;
  return new Response(siteRobots(canonical), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
