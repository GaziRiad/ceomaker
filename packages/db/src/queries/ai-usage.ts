import { and, count, eq, gte, isNotNull, ne, or } from "drizzle-orm";
import type { Database } from "../client";
import { aiUsage } from "../schema";

type AiUsageKind = (typeof aiUsage.kind.enumValues)[number];
type AiUsageStatus = (typeof aiUsage.status.enumValues)[number];

/**
 * Records an AI request before it runs and enforces a per-user limit over a sliding window.
 * The row is inserted first and then counted, so concurrent requests can't all slip under the
 * limit. Returns null (and marks the row rejected) when the user is over the limit.
 */
export async function startAiUsage(
  db: Database,
  input: {
    userId: string;
    siteId: string | null;
    kind: AiUsageKind;
    limit: number;
    windowMs: number;
  },
): Promise<{ id: string } | null> {
  const [row] = await db
    .insert(aiUsage)
    .values({ userId: input.userId, siteId: input.siteId, kind: input.kind })
    .returning({ id: aiUsage.id });
  if (!row) throw new Error("AI usage insert returned no row");

  if ((await countAiUsage(db, input)) > input.limit) {
    await finishAiUsage(db, { id: row.id, status: "rejected" });
    return null;
  }
  return row;
}

/** AI requests that count toward a user's allowance in the window, including any running now. */
export async function countAiUsage(
  db: Database,
  input: { userId: string; kind: AiUsageKind; windowMs: number },
): Promise<number> {
  const [used] = await db
    .select({ value: count() })
    .from(aiUsage)
    .where(
      and(
        eq(aiUsage.userId, input.userId),
        eq(aiUsage.kind, input.kind),
        ne(aiUsage.status, "rejected"),
        // A request that failed before the model wrote anything (an outage, a bad key) cost
        // nothing and doesn't use up an allowance.
        or(ne(aiUsage.status, "failed"), isNotNull(aiUsage.inputTokens)),
        gte(aiUsage.createdAt, new Date(Date.now() - input.windowMs)),
      ),
    );
  return used?.value ?? 0;
}

export async function finishAiUsage(
  db: Database,
  input: {
    id: string;
    status: Exclude<AiUsageStatus, "started">;
    model?: string;
    inputTokens?: number;
    outputTokens?: number;
  },
) {
  await db
    .update(aiUsage)
    .set({
      status: input.status,
      model: input.model,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      finishedAt: new Date(),
    })
    .where(eq(aiUsage.id, input.id));
}
