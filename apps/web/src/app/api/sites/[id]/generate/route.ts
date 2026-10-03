import { finishAiUsage, getDb, getSiteForOwner, saveDraft, startAiUsage } from "@ceomaker/db";
import { FREE_AI_LIMITS, isPro, parseThemeSettingsForRender } from "@ceomaker/schema";
import { getAuth } from "@/lib/auth";
import { AI_LIMITS, aiEnabled, DAY_MS } from "@/lib/ai/client";
import { DOCUMENT_MAX_BYTES, readSourceDocument, type SourceDocument } from "@/lib/ai/documents";
import type { GenerateEvent } from "@/lib/ai/events";
import { generateDraft } from "@/lib/ai/generate";
import { planFor } from "@/lib/plan";
import { isSameOrigin } from "@/lib/same-origin";
import { isUuid, toEditableDraft } from "@/lib/site-data";

/** A window long enough to count every draft an account has ever made. */
const FOREVER_MS = 100 * 365 * DAY_MS;

// Drafting with a long CV can take a minute or more.
export const maxDuration = 300;

function json(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

/**
 * Writes the first draft of a site with AI and streams progress as NDJSON. The draft built from
 * the answers already exists, so every failure path still leaves the user something to edit.
 */
export async function POST(request: Request, context: RouteContext<"/api/sites/[id]/generate">) {
  if (!isSameOrigin(request)) return json(403, "Cross-site request refused");
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return json(401, "Sign in to continue");
  const { id } = await context.params;
  if (!isUuid(id)) return json(404, "Site not found");

  const db = getDb();
  const userId = session.user.id;
  const site = await getSiteForOwner(db, { userId, siteId: id });
  if (!site) return json(404, "Site not found");
  if (!site.answers) return json(409, "This site has no answers to draft from");
  const pro = isPro(await planFor(userId));

  let document: SourceDocument | null = null;
  if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
    if (Number(request.headers.get("content-length") ?? 0) > DOCUMENT_MAX_BYTES + 64 * 1024) {
      return json(413, "That file is over 4 MB. Try a smaller one.");
    }
    const file = (await request.formData()).get("document");
    if (file instanceof File && file.size > 0) {
      if (!pro) return json(403, "Drafting from a CV is part of Pro.");
      if (file.size > DOCUMENT_MAX_BYTES)
        return json(413, "That file is over 4 MB. Try a smaller one.");
      document = readSourceDocument(new Uint8Array(await file.arrayBuffer()));
      if (!document) return json(415, "Use a PDF or a Word (.docx) file.");
    }
  }

  const answers = site.answers;
  const current = toEditableDraft(site.draft);
  const encoder = new TextEncoder();
  let open = true;

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: GenerateEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          open = false;
        }
      };
      const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      try {
        send({ type: "step", step: 1 });
        if (!aiEnabled()) {
          for (const step of [2, 3, 4]) {
            await pause(450);
            send({ type: "step", step });
          }
          send({ type: "done", source: "starter", notice: "unavailable" });
          return;
        }
        const usage = await startAiUsage(db, {
          userId,
          siteId: id,
          kind: "generate",
          // Free accounts get one AI draft, ever; starting over doesn't reset it.
          limit: pro ? AI_LIMITS.generate : FREE_AI_LIMITS.drafts,
          windowMs: pro ? DAY_MS : FOREVER_MS,
        });
        if (!usage) {
          send({ type: "done", source: "starter", notice: pro ? "limited" : "free-used" });
          return;
        }

        // The work continues if the visitor leaves, so the draft is saved either way.
        const result = await generateDraft({
          answers,
          document,
          email: session.user.email,
          onStep: (step) => send({ type: "step", step }),
        });
        if (result.status === "unavailable") {
          await finishAiUsage(db, { id: usage.id, status: "failed" });
          send({ type: "done", source: "starter", notice: "unavailable" });
          return;
        }

        await finishAiUsage(db, {
          id: usage.id,
          status: result.status,
          model: result.model,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        });
        if (result.status !== "succeeded") {
          send({ type: "done", source: "starter", notice: "failed" });
          return;
        }

        send({ type: "step", step: 4 });
        await saveDraft(db, {
          userId,
          siteId: id,
          templateKey: current.templateKey,
          templateVersion: current.templateVersion,
          theme: parseThemeSettingsForRender(current.theme),
          content: result.content,
        });
        send({ type: "done", source: "ai", content: result.content });
      } catch (error) {
        console.error("Draft generation failed", error);
        send({ type: "error", message: "Something went wrong while writing your draft." });
      } finally {
        if (open) {
          open = false;
          controller.close();
        }
      }
    },
    cancel() {
      open = false;
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
