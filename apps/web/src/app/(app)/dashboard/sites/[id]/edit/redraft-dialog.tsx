"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Modal } from "@/components/confirm-dialog";
import { LinkedInPdfHint, useDocumentFile } from "@/components/document-file";
import { UpgradePrompt } from "@/components/pro";
import { setPendingDocument } from "@/lib/pending-document";

/**
 * Writes the site's text again with AI, from the answers and, if attached, a CV or LinkedIn PDF.
 * The generating screen does the work and comes back to the editor; the live site changes only
 * when the owner publishes.
 */
export function RedraftDialog({
  open,
  siteId,
  pro,
  freeDraftLeft,
  ensureSaved,
  onClose,
}: {
  open: boolean;
  siteId: string;
  pro: boolean;
  /** A free account that hasn't had its one AI draft can use it here. */
  freeDraftLeft: boolean;
  /** Saves pending edits first, so the redraft keeps the latest photos and settings. */
  ensureSaved: () => Promise<boolean>;
  onClose: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const cv = useDocumentFile();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canDraft = pro || freeDraftLeft;
  const free = !pro && freeDraftLeft;

  const close = () => {
    cv.clear();
    setError(null);
    onClose();
  };

  const redraft = async () => {
    setPending(true);
    setError(null);
    if (!(await ensureSaved())) {
      setPending(false);
      setError("Your latest edits aren't saved yet. Fix or retry saving, then redraft.");
      return;
    }
    setPendingDocument(cv.file);
    router.push(`/dashboard/sites/${siteId}/generating?redraft=1`);
  };

  return (
    <Modal
      open={open}
      labelledBy={titleId}
      locked={pending}
      onClose={close}
      onSubmit={canDraft ? redraft : close}
    >
      <h2
        id={titleId}
        className="m-0 font-heading text-[28px] leading-[1.05] font-semibold uppercase"
      >
        {free ? "Draft with AI" : "Redraft with AI"}
      </h2>
      {canDraft ? (
        <>
          <div className="flex flex-col gap-2.5 text-base text-neutral-800">
            <p className="m-0">
              Writes your headline, introduction, about, impact, experience and work again from your
              answers, and from a CV or LinkedIn PDF if you attach one.
            </p>
            <p className="m-0">
              It replaces that text. Photos, design, testimonials and contact details stay, and your
              live site doesn&apos;t change until you publish.
            </p>
            {free ? (
              <p className="m-0">
                This uses your free AI draft. With Pro you can redraft any time.
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 text-sm text-neutral-700">
            {cv.input}
            {cv.file ? (
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate">Drafting from {cv.file.name}</span>
                <button type="button" className="btn btn-ghost" onClick={cv.clear}>
                  Remove
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="btn btn-secondary self-start"
                disabled={pending}
                onClick={cv.choose}
              >
                Attach CV or LinkedIn PDF (optional)
              </button>
            )}
            <LinkedInPdfHint />
            <span>The file is used once for this draft and isn&apos;t stored.</span>
          </div>
          {error || cv.error ? (
            <p role="alert" className="m-0 text-sm text-danger">
              {error ?? cv.error}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="btn btn-secondary min-h-11 flex-1 px-4 sm:min-h-10 sm:flex-none"
              disabled={pending}
              onClick={close}
            >
              Keep my text
            </button>
            <button
              type="submit"
              className="btn btn-primary min-h-11 flex-1 px-4 sm:min-h-10 sm:flex-none"
              disabled={pending}
            >
              {pending ? "Starting…" : free ? "Draft" : "Redraft"}
            </button>
          </div>
        </>
      ) : (
        <>
          <UpgradePrompt title="Redrafting is part of Pro">
            You&apos;ve used your free AI draft. With Pro, write your site&apos;s text again with AI
            whenever you like, from your answers or from a CV or LinkedIn PDF.
          </UpgradePrompt>
          <div className="flex justify-end">
            <button type="button" className="btn btn-secondary px-4" onClick={close}>
              Close
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
