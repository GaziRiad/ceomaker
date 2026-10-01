"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Trash } from "@/components/icons";
import { deleteSiteAction } from "../../../site-actions";
import { useToast } from "../../_components/toasts";
import { DANGER_BUTTON } from "./card";

/**
 * "Delete site", confirmed by typing the address so a stray click can't remove anything. The
 * server checks the address again.
 */
export function DeleteSite({
  siteId,
  address,
  everPublished,
  holdDays,
}: {
  siteId: string;
  /** The full address as shown, e.g. hart.ceomaker.com. */
  address: string;
  everPublished: boolean;
  holdDays: number;
}) {
  const id = useId();
  const router = useRouter();
  const say = useToast();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
        error: "Couldn't reach the server. Try again.",
      }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      close();
      say(
        "ok",
        everPublished
          ? `Site deleted. ${address} is reserved for you for ${holdDays} days.`
          : "Site deleted",
      );
      router.push("/dashboard");
      router.refresh();
    });
  };

  const facts = [
    everPublished ? `${address} goes offline at once.` : null,
    everPublished
      ? "Your draft, published versions and photos are deleted."
      : "Your draft and photos are deleted.",
    everPublished ? `The address stays reserved for you for ${holdDays} days.` : null,
    "Your account stays, and you can start a new site.",
  ].filter((fact): fact is string => fact !== null);

  return (
    <>
      <button type="button" className={DANGER_BUTTON} onClick={() => setOpen(true)}>
        <Trash size={16} />
        Delete site
      </button>
      <ConfirmDialog
        open={open}
        title="Delete your site?"
        confirmLabel="Delete site"
        pendingLabel="Deleting…"
        cancelLabel="Keep my site"
        tone="danger"
        canConfirm={typed.trim().toLowerCase() === address.toLowerCase()}
        pending={pending}
        error={error}
        onConfirm={confirm}
        onClose={close}
      >
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-text">
          {facts.map((fact) => (
            <li key={fact} className="flex items-start gap-2.5">
              <span aria-hidden className="mt-2.5 size-[5px] flex-none bg-neutral-700" />
              <span>{fact}</span>
            </li>
          ))}
        </ul>
        <div className="field mt-1">
          <label htmlFor={id}>Type {address} to confirm</label>
          <input
            id={id}
            className="input min-h-12 text-base"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={typed}
            disabled={pending}
            onChange={(event) => setTyped(event.target.value)}
          />
        </div>
      </ConfirmDialog>
    </>
  );
}
