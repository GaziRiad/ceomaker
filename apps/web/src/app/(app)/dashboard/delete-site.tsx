"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { Corners } from "@/components/ui";
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
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const matches = typed.trim().toLowerCase() === subdomain;

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  const close = () => {
    if (pending) return;
    setOpen(false);
    setTyped("");
    setError(null);
  };

  const confirm = () => {
    if (!matches) return;
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
      <dialog
        ref={dialog}
        aria-labelledby="delete-site-title"
        className="m-auto w-[min(500px,calc(100%-32px))] overflow-visible bg-transparent p-0 backdrop:bg-[color-mix(in_srgb,var(--color-neutral-900)_40%,transparent)] backdrop:backdrop-blur-[3px]"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <form
          className="blueprint cm-rise flex flex-col gap-[18px] bg-surface p-[26px] shadow-lg"
          // The section around this staggers its entrance; the dialog shouldn't inherit the delay.
          style={{ "--delay": "0ms" } as CSSProperties}
          onSubmit={(event) => {
            event.preventDefault();
            confirm();
          }}
        >
          <Corners />
          <div className="flex flex-col gap-2">
            <h2
              id="delete-site-title"
              className="m-0 font-heading text-[34px] leading-none font-semibold uppercase"
            >
              Delete your site
            </h2>
            <span className="text-[15px] text-neutral-800">
              {everPublished ? `${address} goes offline right away. ` : null}
              Your draft{everPublished ? ", every published version" : ""} and your uploaded photos
              are deleted. This can&apos;t be undone.
            </span>
            {everPublished ? (
              <span className="text-[15px] text-neutral-700">
                The address stays reserved for you for {holdDays} days, so nobody else can show a
                page at your old links. Your account stays, and you can start a new site.
              </span>
            ) : (
              <span className="text-[15px] text-neutral-700">
                Your account stays, and you can start a new site.
              </span>
            )}
          </div>
          <div className="field">
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
          {error ? (
            <p role="alert" className="m-0 text-sm text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="btn btn-secondary" disabled={pending} onClick={close}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-danger"
              style={{ padding: "10px 16px" }}
              disabled={!matches || pending}
            >
              {pending ? "Deleting…" : "Delete site"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
