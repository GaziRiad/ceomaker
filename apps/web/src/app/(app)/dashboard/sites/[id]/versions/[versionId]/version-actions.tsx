"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { makeVersionLiveAction, openVersionInEditorAction } from "../../../../site-actions";

type Pending = "edit" | "live" | null;

/** The two ways back to an earlier version: keep working from it, or put it live right away. */
export function VersionActions({
  siteId,
  versionId,
  number,
  isLive,
}: {
  siteId: string;
  versionId: string;
  number: number;
  isLive: boolean;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const close = () => {
    setDialog(null);
    setError(null);
  };

  const run = (kind: Exclude<Pending, null>) => {
    setError(null);
    startTransition(async () => {
      const action = kind === "edit" ? openVersionInEditorAction : makeVersionLiveAction;
      const result = await action(siteId, versionId).catch(() => ({
        ok: false as const,
        error: "We couldn't reach the server. Try again.",
      }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDialog(null);
      if (kind === "edit") {
        router.push(`/dashboard/sites/${siteId}/edit`);
      } else {
        setNotice(`Version ${number} is live.`);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {notice ? (
        <span role="status" className="text-[13px] text-accent-700">
          {notice}
        </span>
      ) : null}
      <button type="button" className="btn btn-secondary" onClick={() => setDialog("edit")}>
        Open in editor
      </button>
      {isLive ? null : (
        <button
          type="button"
          className="btn btn-primary"
          style={{ padding: "10px 16px" }}
          onClick={() => setDialog("live")}
        >
          Make live now
        </button>
      )}
      <ConfirmDialog
        open={dialog === "edit"}
        title={`Edit from version ${number}`}
        confirmLabel="Replace my draft"
        pendingLabel="Opening…"
        pending={pending}
        error={error}
        onConfirm={() => run("edit")}
        onClose={close}
      >
        <span>
          Your current draft is replaced with version {number}, so you can keep working from it.
        </span>
        <span className="text-neutral-700">
          Your live site doesn&apos;t change until you publish.
        </span>
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "live"}
        title={`Make version ${number} live`}
        confirmLabel="Make live now"
        pendingLabel="Publishing…"
        pending={pending}
        error={error}
        onConfirm={() => run("live")}
        onClose={close}
      >
        <span>Visitors see version {number} right away.</span>
        <span className="text-neutral-700">
          Your draft keeps your latest edits, so the editor will show them as unpublished changes.
          The version that&apos;s live now stays in your history.
        </span>
      </ConfirmDialog>
    </div>
  );
}
