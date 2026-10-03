import type { SiteContent } from "@ceomaker/schema";

/** Why the editor opens with the draft built from the answers instead of an AI draft. */
export const DRAFT_NOTICES = {
  unavailable:
    "AI drafting isn't switched on yet, so this first draft is built from your answers. Edit anything you like.",
  limited:
    "You've reached today's limit for AI drafts, so we kept the draft built from your answers.",
  "free-used":
    "The free plan includes one AI draft, and this account has used it, so this draft is built from your answers. Pro includes more.",
  failed:
    "The AI draft didn't come through, so we kept the draft built from your answers. You can rewrite the headline with AI in the editor.",
} as const;

export type DraftNotice = keyof typeof DRAFT_NOTICES;

export function draftNoticeText(code: unknown): string | null {
  return typeof code === "string" && code in DRAFT_NOTICES
    ? DRAFT_NOTICES[code as DraftNotice]
    : null;
}

/** Events the draft endpoint streams to the generating screen, one JSON object per line. */
export type GenerateEvent =
  | { type: "step"; step: number }
  | { type: "done"; source: "ai" | "starter"; notice?: DraftNotice; content?: SiteContent }
  | { type: "error"; message: string };
