"use server";

import { endProGift, getDb, giveProGift } from "@ceomaker/db";
import { GIFT_MONTHS, type GiftMonths } from "@ceomaker/schema";
import { adminSession } from "@/lib/admin";
import { refreshLiveSites } from "@/lib/billing";
import { trackServerEvent } from "@/lib/product-analytics/server";

// Gifts of Pro from the admin page. Each action checks again that an admin is signed in. When
// the plan changes, the owner's live site shows it on its next visit.

type Result = { ok: true; message: string } | { ok: false; error: string };

const NOT_ALLOWED: Result = { ok: false, error: "Only admins can do this." };
const NO_ACCOUNT: Result = { ok: false, error: "This account no longer exists." };

/** How long a gift's note can be. */
const NOTE_MAX = 200;

const longDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function isGiftMonths(value: unknown): value is GiftMonths {
  return GIFT_MONTHS.some((months) => months === value);
}

/** Gives Pro for 1, 3, 6 or 12 months, added to a gift that hasn't ended. */
export async function giveProGiftAction(
  userId: string,
  months: number,
  note: string,
): Promise<Result> {
  if (!(await adminSession())) return NOT_ALLOWED;
  if (typeof userId !== "string" || !userId) return NO_ACCOUNT;
  if (!isGiftMonths(months)) return { ok: false, error: "Choose 1, 3, 6 or 12 months." };
  const text = typeof note === "string" ? note.trim().slice(0, NOTE_MAX) : "";
  const gift = await giveProGift(getDb(), { userId, months, note: text || null });
  if (!gift?.proUntil) return NO_ACCOUNT;
  if (gift.planChanged) {
    await refreshLiveSites(userId);
    trackServerEvent(userId, "plan_changed", { plan: gift.plan, cause: "gift" });
  }
  return { ok: true, message: `Pro until ${longDate.format(gift.proUntil)}` };
}

/** Ends the gift now; the account keeps Pro only if a subscription pays for it. */
export async function endProGiftAction(userId: string): Promise<Result> {
  if (!(await adminSession())) return NOT_ALLOWED;
  if (typeof userId !== "string" || !userId) return NO_ACCOUNT;
  const ended = await endProGift(getDb(), { userId });
  if (!ended) return { ok: false, error: "There's no gift to end." };
  if (ended.planChanged) {
    await refreshLiveSites(userId);
    trackServerEvent(userId, "plan_changed", { plan: ended.plan, cause: "gift_ended" });
  }
  return {
    ok: true,
    message: ended.plan === "pro" ? "Gift ended. Their subscription keeps Pro." : "Gift ended",
  };
}
