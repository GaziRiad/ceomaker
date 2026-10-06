import { getDb, recordSignupSource } from "@ceomaker/db";
import { getAuth } from "@/lib/auth";
import { lifecycleSignedUp } from "@/lib/lifecycle-email";
import { recordSignup } from "@/lib/product-analytics/server";
import { decodeVisitSource, UNKNOWN_SOURCE } from "@/lib/product-analytics/visit-source";
import { safeCallbackPath } from "@/lib/redirects";
import { appUrl } from "@/lib/routing";

/** PostHog's anonymous ids are UUIDs; anything else isn't joined. */
const ANONYMOUS_ID = /^[0-9a-zA-Z-]{8,64}$/;

/**
 * Where a new account lands after the sign-in link or Google (newUserCallbackURL): saves where
 * the visit came from on the account, once, counts the sign-up, then goes on to `next`. Signed
 * out, or an account that isn't new, it only goes on.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const next = safeCallbackPath(params.get("next")) ?? "/dashboard";
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (session) {
    const source = decodeVisitSource(params.get("src")) ?? UNKNOWN_SOURCE;
    const userId = session.user.id;
    if (await recordSignupSource(getDb(), { userId, source })) {
      const visitor = params.get("v");
      await recordSignup({
        userId,
        anonymousId: visitor && ANONYMOUS_ID.test(visitor) ? visitor : null,
        source,
        fromStart: next.startsWith("/start/"),
      });
      lifecycleSignedUp(session.user);
    }
  }
  return Response.redirect(`${appUrl()}${next}`, 303);
}
