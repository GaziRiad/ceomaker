import type { AnswersDraft } from "@ceomaker/schema";

// Answers live in the browser until the user signs in, so nothing is stored for visitors
// who never create an account.
const KEY = "ceomaker:answers:v1";

export interface StoredFlow {
  answers: AnswersDraft;
  step: number;
}

export function loadFlow(): StoredFlow | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredFlow>;
    if (typeof parsed !== "object" || parsed === null || typeof parsed.answers !== "object") {
      return null;
    }
    return { answers: parsed.answers ?? {}, step: Number(parsed.step) || 0 };
  } catch {
    return null;
  }
}

export function saveFlow(flow: StoredFlow) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(flow));
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
