import { getDb, getPrimarySiteForOwner } from "@ceomaker/db";
import productImage from "@/app/(app)/opengraph-image";
import { verifyDraftCardToken } from "@/lib/draft-card";
import { renderShareCard } from "@/lib/share-card";

/** Short: the draft keeps changing, and mail apps keep their own copy anyway. */
const DRAFT_CACHE = "public, max-age=600, s-maxage=600";

/**
 * The welcome email's picture of the owner's draft, drawn like the site's share image. With no
 * site yet it shows CEOMaker's own image, so the email never shows a broken picture.
 */
export async function GET(_request: Request, context: RouteContext<"/api/draft-card/[token]">) {
  const { token } = await context.params;
  const userId = verifyDraftCardToken(token);
  if (!userId) return new Response("Not found", { status: 404 });
  const site = await getPrimarySiteForOwner(getDb(), userId);
  if (!site) return productImage();
  return renderShareCard(
    { subdomain: site.subdomain, customDomain: null, ...site.draft },
    DRAFT_CACHE,
  );
}
