"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "../../_components/toasts";
import { cancelProAction } from "../actions";

/** Switches off renewal, after asking. Pro stays on until the paid period ends. */
export function CancelPro({ paidUntil }: { paidUntil: string | null }) {
  const router = useRouter();
  const say = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await cancelProAction().catch(() => ({
        ok: false as const,
        error: "Couldn't reach the server. Try again.",
      }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      say("ok", "Your subscription is cancelled. You won't be charged again.");
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost min-h-11 px-4 sm:min-h-10"
        onClick={() => setOpen(true)}
      >
        Cancel subscription
      </button>
      <ConfirmDialog
        open={open}
        title="Cancel Pro?"
        confirmLabel="Cancel subscription"
        pendingLabel="Cancelling…"
        cancelLabel="Keep Pro"
        tone="danger-quiet"
        pending={pending}
        error={error}
        onConfirm={confirm}
        onClose={() => setOpen(false)}
      >
        <p className="m-0">
          You won&apos;t be charged again.{" "}
          {paidUntil
            ? `Pro stays on until ${paidUntil}, the end of the period you've paid for.`
            : "Pro stays on until the end of the period you've paid for."}
        </p>
        <p className="m-0">
          After that your site stays live on the free plan: a premium template shows as Meridian,
          the contact form switches off, a custom domain forwards to your ceomaker.app address, and
          the badge appears. Upgrading again brings it all back.
        </p>
      </ConfirmDialog>
    </>
  );
}
