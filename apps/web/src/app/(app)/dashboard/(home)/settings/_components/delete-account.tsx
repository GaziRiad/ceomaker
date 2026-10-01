"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Trash } from "@/components/icons";
import { clearFlow } from "../../../../start/storage";
import { deleteAccountAction } from "../actions";
import { DANGER_BUTTON } from "./card";

/** "Delete account", confirmed by typing the account's email. The server checks it again. */
export function DeleteAccount({ email, address }: { email: string; address: string | null }) {
  const id = useId();
  const router = useRouter();
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
      const result = await deleteAccountAction(typed).catch(() => ({
        ok: false as const,
        error: "Couldn't reach the server. Try again.",
      }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      clearFlow();
      router.replace("/");
      router.refresh();
    });
  };

  return (
    <>
      <button type="button" className={DANGER_BUTTON} onClick={() => setOpen(true)}>
        <Trash size={16} />
        Delete account
      </button>
      <ConfirmDialog
        open={open}
        title="Delete your account?"
        confirmLabel="Delete account"
        pendingLabel="Deleting…"
        cancelLabel="Keep my account"
        tone="danger"
        canConfirm={typed.trim().toLowerCase() === email.toLowerCase()}
        pending={pending}
        error={error}
        onConfirm={confirm}
        onClose={close}
      >
        <span className="text-pretty">
          {address
            ? `This deletes your account and your site, ${address}, at once: the draft, every published version, your photos and your messages.`
            : "This deletes your account and everything in it at once."}{" "}
          It can&apos;t be undone.
        </span>
        <div className="field mt-1">
          <label htmlFor={id}>Type {email} to confirm</label>
          <input
            id={id}
            className="input min-h-12 text-base"
            type="email"
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
