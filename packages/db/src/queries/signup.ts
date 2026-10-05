import { and, eq, gt, isNull } from "drizzle-orm";
import type { Database } from "../client";
import { user, type SignupSource } from "../schema";

/** How long after an account is created its sign-up source can still be saved. */
const SIGNUP_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Saves where the account's sign-up visit came from, once, and only while the account is new,
 * so an old link can't rewrite it. True when this call saved it: the sign-up is then counted.
 */
export async function recordSignupSource(
  db: Database,
  input: { userId: string; source: SignupSource; now?: Date },
): Promise<boolean> {
  const now = input.now ?? new Date();
  const saved = await db
    .update(user)
    .set({ signupSource: input.source })
    .where(
      and(
        eq(user.id, input.userId),
        isNull(user.signupSource),
        gt(user.createdAt, new Date(now.getTime() - SIGNUP_WINDOW_MS)),
      ),
    )
    .returning({ id: user.id });
  return saved.length > 0;
}
