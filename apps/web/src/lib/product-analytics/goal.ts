import { decodeAnswers, type SiteGoal } from "@ceomaker/schema";

/**
 * What the site is for, read from a sign-in callback that carries the questions' answers
 * (`/start/finish?a=…`). Null for any other address. Only the goal leaves here, never the answers.
 */
export function goalOfCallback(path: string): SiteGoal | null {
  if (!path.startsWith("/start/finish?")) return null;
  const encoded = new URL(path, "https://app.invalid").searchParams.get("a");
  return encoded ? (decodeAnswers(encoded)?.goal ?? null) : null;
}
