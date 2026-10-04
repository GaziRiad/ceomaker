import { getAuth } from "@/lib/auth";
import { freemiusCardUpdateLink } from "@/lib/freemius";
import { appUrl } from "@/lib/routing";

const BILLING = "/dashboard/settings/billing";

/**
 * Sends the owner to Freemius's secure page to change the card on their subscription. Card
 * details never touch our servers; Freemius returns them to Billing afterwards.
 */
export async function GET(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) {
    return Response.redirect(`${appUrl()}/sign-in?callbackURL=${BILLING}`, 303);
  }
  const link = await freemiusCardUpdateLink(session.user.id).catch((error: unknown) => {
    console.error("Creating a card update link failed", error);
    return null;
  });
  return Response.redirect(link ?? `${appUrl()}${BILLING}?card=unavailable`, 303);
}
