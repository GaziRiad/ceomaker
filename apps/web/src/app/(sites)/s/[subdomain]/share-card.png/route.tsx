import { isValidSubdomain } from "@ceomaker/schema";
import { asEntitled } from "@/lib/plan";
import { renderShareCard } from "@/lib/share-card";
import { getTenantSite } from "@/lib/sites";

/** The generated image shown when a link to a live site is shared, at <site>/share-card.png. */
export async function GET(
  _request: Request,
  context: RouteContext<"/s/[subdomain]/share-card.png">,
) {
  const { subdomain } = await context.params;
  if (!isValidSubdomain(subdomain)) return new Response("Not found", { status: 404 });
  const tenant = await getTenantSite(subdomain);
  if (tenant?.status !== "published") return new Response("Not found", { status: 404 });
  return renderShareCard(asEntitled(tenant.site, tenant.site.ownerPlan));
}
