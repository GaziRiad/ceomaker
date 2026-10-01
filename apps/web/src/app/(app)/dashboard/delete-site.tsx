"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteSiteAction } from "./site-actions";

/**
 * "Delete site" with a confirmation that asks for the site's address, so a stray click can't
 * remove anything. The server checks the address again.
 */
export function DeleteSite({
  siteId,
  subdomain,
  address,
  everPublished,
  holdDays,
}: {
  siteId: string;
  subdomain: string;
  /** The full address as shown to people, e.g. ceomaker.vercel.app/sites/amelia. */
  address: string;
  everPublished: boolean;
  holdDays: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const matches = typed.trim().toLowerCase() === subdomain;

  const close = () => {
    setOpen(false);
    setTyped("");
    setError(null);
  };

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteSiteAction(siteId, typed).catch(() => ({
        ok: false as const,
        error: "We couldn't reach the server. Try again.",
      }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>
        Delete site
      </button>
      <ConfirmDialog
        open={open}
        title="Delete your site"
        confirmLabel="Delete site"
        pendingLabel="Deleting…"
        tone="danger"
        canConfirm={matches}
        pending={pending}
        error={error}
        onConfirm={confirm}
        onClose={close}
      >
        <span>
          {everPublished ? `${address} goes offline right away. ` : null}
          Your draft{everPublished ? ", every published version" : ""} and your uploaded photos are
          deleted. This can&apos;t be undone.
        </span>
        <span className="text-neutral-700">
          {everPublished
            ? `The address stays reserved for you for ${holdDays} days, so nobody else can show a page at your old links. `
            : null}
          Your account stays, and you can start a new site.
        </span>
        <div className="field mt-2">
          <label htmlFor="delete-confirm">
            Type <strong className="font-semibold text-text">{subdomain}</strong> to confirm
          </label>
          <input
            id="delete-confirm"
            className="input"
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="none"
            value={typed}
            disabled={pending}
            onChange={(event) => setTyped(event.target.value)}
          />
        </div>
      </ConfirmDialog>
    </>
  );
}
