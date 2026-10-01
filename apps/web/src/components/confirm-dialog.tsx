"use client";

import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import { Corners } from "./ui";

/**
 * A modal that asks before doing something hard to undo. The caller owns the state: it opens
 * and closes the dialog and runs the action, so it can show progress and errors here.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  pendingLabel,
  tone = "primary",
  canConfirm = true,
  pending = false,
  error = null,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  tone?: "primary" | "danger";
  canConfirm?: boolean;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  const close = () => {
    if (!pending) onClose();
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
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
        className="blueprint cm-rise flex flex-col gap-[18px] bg-surface p-[26px] text-left shadow-lg"
        // Entrances elsewhere on the page are staggered; the dialog shouldn't inherit a delay.
        style={{ "--delay": "0ms" } as CSSProperties}
        onSubmit={(event) => {
          event.preventDefault();
          if (canConfirm && !pending) onConfirm();
        }}
      >
        <Corners />
        <h2
          id={titleId}
          className="m-0 font-heading text-[34px] leading-none font-semibold uppercase"
        >
          {title}
        </h2>
        <div className="flex flex-col gap-2 text-[15px] text-neutral-800">{children}</div>
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
            className={`btn ${tone === "danger" ? "btn-danger" : "btn-primary"}`}
            style={{ padding: "10px 16px" }}
            disabled={!canConfirm || pending}
          >
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
