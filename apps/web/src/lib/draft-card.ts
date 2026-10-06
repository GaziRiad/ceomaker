import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "./env";
import { appUrl } from "./routing";

// The picture of an owner's draft in the welcome email: a link that can't be guessed (the account
// id, when it was made, and a signature) and stops working after DRAFT_CARD_DAYS. The account's
// first site is looked up when the picture is fetched, so it shows the draft as it is then.

export const DRAFT_CARD_DAYS = 30;
const DAY_S = 24 * 60 * 60;

function signature(userId: string, issued: number): string {
  return createHmac("sha256", serverEnv().BETTER_AUTH_SECRET)
    .update(`draft-card|${userId}|${issued}`)
    .digest("base64url")
    .slice(0, 32);
}

/** The token in /api/draft-card/<token>. */
export function draftCardToken(userId: string, now = new Date()): string {
  const issued = Math.floor(now.getTime() / 1000);
  return `${userId}.${issued}.${signature(userId, issued)}`;
}

export function draftCardUrl(userId: string, now = new Date()): string {
  return `${appUrl()}/api/draft-card/${draftCardToken(userId, now)}`;
}

/** The account a token was made for, or null when it's forged, malformed or expired. */
export function verifyDraftCardToken(token: string, now = new Date()): string | null {
  const [userId, issuedText, given] = token.split(".");
  if (!userId || !issuedText || !given || !/^\d{1,12}$/.test(issuedText)) return null;
  const issued = Number(issuedText);
  const age = now.getTime() / 1000 - issued;
  if (age < -60 || age > DRAFT_CARD_DAYS * DAY_S) return null;
  const expected = Buffer.from(signature(userId, issued));
  const actual = Buffer.from(given);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return userId;
}
