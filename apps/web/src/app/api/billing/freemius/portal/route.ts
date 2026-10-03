import { getAuth } from "@/lib/auth";
import { freemiusPortalLink } from "@/lib/freemius";
import { appUrl } from "@/lib/routing";

const BILLING = "/dashboard/settings/billing";

/** Signs the owner in to Freemius's customer portal: their card, invoices and cancelling. */
export async function GET(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) {
    return Response.redirect(`${appUrl()}/sign-in?callbackURL=${BILLING}`, 303);
  }
  const link = await freemiusPortalLink(session.user.email);
  return Response.redirect(link ?? `${appUrl()}${BILLING}?portal=unavailable`, 303);
}
