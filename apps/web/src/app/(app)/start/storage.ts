import type { AnswersDraft } from "@ceomaker/schema";

// Answers live in the browser until the user signs in, so nothing is stored for visitors
// who never create an account. "Save and exit" relies on this to resume later.
const KEY = "ceomaker:answers:v1";

/** Saved answers are offered back for a week after the last change, then dropped. */
export const KEEP_ANSWERS_MS = 7 * 24 * 60 * 60 * 1000;

export interface StoredFlow {
  answers: AnswersDraft;
  step: number;
}

export function loadFlow(now: number = Date.now()): StoredFlow | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredFlow & { savedAt: number }>;
    const fresh =
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.answers === "object" &&
      parsed.answers !== null &&
      typeof parsed.savedAt === "number" &&
      parsed.savedAt <= now &&
      now - parsed.savedAt <= KEEP_ANSWERS_MS;
    if (!fresh) {
      // Malformed, stale, or saved before answers expired: start clean.
      clearFlow();
      return null;
    }
    return { answers: parsed.answers ?? {}, step: Number(parsed.step) || 0 };
  } catch {
    return null;
  }
}

export function saveFlow(flow: StoredFlow, now: number = Date.now()) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...flow, savedAt: now }));
  } catch {
    // Private mode or full storage: the flow still works, it just won't survive a reload.
  }
}

export function clearFlow() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

/** Whether saved answers hold anything worth offering back, beyond the defaults. */
export function hasProgress(flow: StoredFlow): boolean {
  const { answers } = flow;
  return Boolean(
    flow.step > 0 ||
    answers.industry ||
    answers.stage ||
    answers.name?.trim() ||
    answers.org?.trim() ||
    answers.goals?.length ||
    answers.sources?.length,
  );
}
