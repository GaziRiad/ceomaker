"use server";

import { createSiteFromAnswers, getDb, getPrimarySiteId, saveSiteAnswers } from "@ceomaker/db";
import { decodeAnswers } from "@ceomaker/schema";
import { isAdmin } from "@/lib/admin";
import { getSession } from "@/lib/auth";
import { trackServerEvent } from "@/lib/product-analytics/server";

export type FinishResult =
  { ok: true; siteId: string } | { ok: false; reason: "signed-out" | "invalid-answers" };

/**
 * Turns the guided answers into the user's site after sign-in. Users have one site for now:
 * a returning user's answers are saved onto it rather than creating a second one. Admins can
 * make a new site for someone they write to (`forSomeone`); it carries no contact email.
 */
export async function finishOnboarding(
  encodedAnswers: string,
  options: { forSomeone?: boolean } = {},
): Promise<FinishResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "signed-out" };
  const answers = decodeAnswers(String(encodedAnswers).slice(0, 4000));
  if (!answers) return { ok: false, reason: "invalid-answers" };

  const db = getDb();
  const userId = session.user.id;
  // Not counted as a sign-up's site in product analytics.
  if (options.forSomeone === true && isAdmin(session.user)) {
    const created = await createSiteFromAnswers(db, { userId, answers });
    return { ok: true, siteId: created.id };
  }
  const existing = await getPrimarySiteId(db, userId);
  if (existing) {
    await saveSiteAnswers(db, { userId, siteId: existing, answers });
    return { ok: true, siteId: existing };
  }
  const created = await createSiteFromAnswers(db, {
    userId,
    answers,
    email: session.user.email,
  });
  trackServerEvent(userId, "site_created", { goal: answers.goal }, { goal: answers.goal });
  return { ok: true, siteId: created.id };
}
