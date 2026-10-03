import { isPro } from "@ceomaker/schema";
import { getAuth } from "@/lib/auth";
import { freemiusCheckoutLink } from "@/lib/freemius";
import { planFor } from "@/lib/plan";
import { appUrl } from "@/lib/routing";

const BILLING = "/dashboard/settings/billing";

/**
 * Sends the signed-in owner to Freemius's checkout for Pro, monthly or yearly (?cycle=). The
 * checkout is built here so the account's email is fixed in it and the sandbox keys stay secret.
 */
export async function GET(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) {
    return Response.redirect(`${appUrl()}/sign-in?callbackURL=${BILLING}`, 303);
  }
  if (isPro(await planFor(session.user.id))) return Response.redirect(appUrl() + BILLING, 303);
  const cycle = new URL(request.url).searchParams.get("cycle") === "monthly" ? "monthly" : "annual";
  const link = await freemiusCheckoutLink(session.user, cycle);
  return Response.redirect(link ?? appUrl() + BILLING, 303);
}
