import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaContentBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { OnboardingAnswers, SiteContent } from "@ceomaker/schema";
import { AI_MODEL, anthropic } from "./client";
import type { SourceDocument } from "./documents";
import {
  contentFromDraft,
  DRAFT_SYSTEM_PROMPT,
  draftOutputSchema,
  draftUserPrompt,
  PROGRESS_MARKERS,
} from "./draft";

export type DraftResult =
  | {
      status: "succeeded";
      content: SiteContent;
      model: string;
      inputTokens: number;
      outputTokens: number;
    }
  | { status: "unavailable" }
  | { status: "refused" | "failed"; model?: string; inputTokens?: number; outputTokens?: number };

/**
 * Writes a draft with Claude, streaming so the generating screen can follow along: `onStep`
 * fires as the output reaches the About section (step 2) and the work section (step 3).
 */
export async function generateDraft(input: {
  answers: OnboardingAnswers;
  document: SourceDocument | null;
  email?: string;
  onStep: (step: number) => void;
}): Promise<DraftResult> {
  const client = anthropic();
  if (!client) return { status: "unavailable" };

  const content: BetaContentBlockParam[] = [];
  if (input.document?.kind === "pdf") {
    content.push({
      type: "document",
      title: "CV or LinkedIn export",
      source: { type: "base64", media_type: "application/pdf", data: input.document.base64 },
    });
  } else if (input.document?.kind === "text") {
    content.push({
      type: "document",
      title: "CV",
      source: { type: "text", media_type: "text/plain", data: input.document.text },
    });
  }
  content.push({ type: "text", text: draftUserPrompt(input.answers, input.document !== null) });

  try {
    const stream = client.beta.messages.stream({
      model: AI_MODEL,
      max_tokens: 16_000,
      system: DRAFT_SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
      output_config: { format: betaZodOutputFormat(draftOutputSchema) },
    });

    let text = "";
    let reached = 0;
    for await (const event of stream) {
      if (event.type !== "content_block_delta" || event.delta.type !== "text_delta") continue;
      text += event.delta.text;
      while (reached < PROGRESS_MARKERS.length && text.includes(PROGRESS_MARKERS[reached]!)) {
        reached += 1;
        input.onStep(1 + reached);
      }
    }

    const message = await stream.finalMessage();
    const usage = {
      model: message.model,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    };
    if (message.stop_reason === "refusal") return { status: "refused", ...usage };
    if (message.stop_reason === "max_tokens" || !message.parsed_output) {
      return { status: "failed", ...usage };
    }
    const site = contentFromDraft(input.answers, message.parsed_output, { email: input.email });
    return site ? { status: "succeeded", content: site, ...usage } : { status: "failed", ...usage };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      // The API's own message says why (never the key itself).
      console.error(`AI draft failed: ${error.status ?? "network"} ${error.message}`);
      return { status: "failed" };
    }
    throw error;
  }
}
