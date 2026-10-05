import { expireProGifts, getDb, listGiftReminders, markGiftReminded } from "@ceomaker/db";
import { refreshLiveSites } from "@/lib/billing";
import { canSendEmail, sendGiftEndingEmail } from "@/lib/email";
import { serverEnv } from "@/lib/env";
import { trackServerEvent } from "@/lib/product-analytics/server";

// The daily gift check. Vercel calls it on the schedule in vercel.json with the CRON_SECRET as a
// bearer token. Gifts of Pro whose date has passed end, and the owner's live site moves to the
// free plan unless they pay. Owners whose gift ends within a week get one reminder email; if
// sending fails, the next run tries again.

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = serverEnv().CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const db = getDb();
  const ended = await expireProGifts(db);
  for (const userId of ended) {
    await refreshLiveSites(userId);
    trackServerEvent(userId, "plan_changed", { plan: "free", cause: "gift_ended" });
  }

  let reminded = 0;
  if (canSendEmail()) {
    for (const gift of await listGiftReminders(db)) {
      try {
        await sendGiftEndingEmail({ to: gift.email, endsOn: gift.proUntil });
        await markGiftReminded(db, { userId: gift.userId, proUntil: gift.proUntil });
        reminded += 1;
      } catch (error) {
        console.error(`Reminding ${gift.userId} that their gift of Pro ends failed`, error);
      }
    }
  }
  return Response.json({ ended: ended.length, reminded });
}
