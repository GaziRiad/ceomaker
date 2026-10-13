"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "../../_components/toasts";
import { deleteDraftForSomeoneAction } from "../actions";

const UNREACHABLE = { ok: false as const, error: "Couldn't reach the server. Try again." };

/** Deletes a draft made for someone else, after a confirmation. */
export function DeleteDraft({
  siteId,
  name,
  address,
  live,
}: {
  siteId: string;
  name: string;
  /** The full address as shown, e.g. akhila.ceomaker.app. */
  address: string;
  live: boolean;
}) {
  const router = useRouter();
  const say = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteDraftForSomeoneAction(siteId).catch(() => UNREACHABLE);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      say("ok", `${name}: ${result.message}`);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary min-h-11 px-3.5 sm:min-h-9"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Delete
      </button>
      <ConfirmDialog
        open={open}
        title={`Delete the draft for ${name}?`}
        confirmLabel="Delete draft"
        pendingLabel="Deleting…"
        cancelLabel="Keep it"
        tone="danger"
        pending={pending}
        error={error}
        onConfirm={confirm}
        onClose={() => setOpen(false)}
      >
        <p className="m-0">
          {live ? `${address} goes offline at once, and the address is free for anyone. ` : null}
          The draft and its published versions are deleted. Your own site isn&apos;t touched.
        </p>
      </ConfirmDialog>
    </>
  );
}
