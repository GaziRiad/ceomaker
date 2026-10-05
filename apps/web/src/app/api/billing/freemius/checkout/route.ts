import { getDb, listSubscriptions } from "@ceomaker/db";
import { subscriptionGrantsPro } from "@ceomaker/schema";
import { getAuth } from "@/lib/auth";
import { freemiusCheckoutLink } from "@/lib/freemius";
import { appUrl } from "@/lib/routing";

const BILLING = "/dashboard/settings/billing";

/**
 * Sends the signed-in owner to Freemius's checkout for Pro, monthly or yearly (?cycle=). The
 * checkout is built here so the account's email is fixed in it and the sandbox keys stay secret.
 * Owners who already pay are sent back to Billing; owners on a gift of Pro can subscribe.
 */
export async function GET(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) {
    return Response.redirect(`${appUrl()}/sign-in?callbackURL=${BILLING}`, 303);
  }
  const subscriptions = await listSubscriptions(getDb(), session.user.id);
  if (subscriptions.some((row) => subscriptionGrantsPro(row.status))) {
    return Response.redirect(appUrl() + BILLING, 303);
  }
  const cycle = new URL(request.url).searchParams.get("cycle") === "monthly" ? "monthly" : "annual";
  const link = await freemiusCheckoutLink(session.user, cycle);
  return Response.redirect(link ?? appUrl() + BILLING, 303);
}
