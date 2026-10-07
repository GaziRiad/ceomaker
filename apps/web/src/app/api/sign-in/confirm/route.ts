import { isCrossSite } from "@/lib/same-origin";
import { signInErrorPath } from "@/lib/sign-in-errors";
import { verifyPathFor } from "@/lib/sign-in-link";

/**
 * The confirm page's button (see lib/sign-in-link): passes the sign-in link to the auth
 * library's check, which uses it, signs in and redirects. A form post, so link scanners that
 * only open pages never get here. A link without a token goes back to sign-in with the usual
 * message.
 */
export async function POST(request: Request) {
  if (isCrossSite(request)) return new Response("Cross-site request refused", { status: 403 });
  const form = await request.formData().catch(() => null);
  const target = form ? verifyPathFor((name) => form.get(name)) : null;
  return Response.redirect(new URL(target ?? signInErrorPath("link"), request.url), 303);
}
