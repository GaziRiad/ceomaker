import { connection } from "next/server";
import { freemius, syncFreemiusLicense } from "@/lib/freemius";
import { appUrl } from "@/lib/routing";

/**
 * Where Freemius sends the buyer after paying or changing their card (Plans › Customization,
 * "Redirect Checkout to a custom URL"). The signed redirect is checked, the license is read from Freemius and
 * applied, so Billing shows Pro straight away; the webhook would get there too, moments later.
 */
export async function GET(request: Request) {
  await connection(); // Never prerendered: each redirect carries its own signed purchase.
  const info = await freemius()?.checkout.processRedirect(request.url, appUrl());
  const after = info?.action === "payment_method_update" ? "card=updated" : "checkout=done";
  if (info?.license_id) {
    try {
      await syncFreemiusLicense(info.license_id);
    } catch (error) {
      console.error("Applying a Freemius purchase after checkout failed", error);
    }
  }
  return Response.redirect(`${appUrl()}/dashboard/settings/billing?${after}`, 303);
}
