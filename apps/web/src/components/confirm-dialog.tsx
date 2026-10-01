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
  cancelLabel = "Cancel",
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
  /** What keeping things as they are is called: "Keep it", "Keep my site". */
  cancelLabel?: string;
  tone?: "primary" | "danger";
  canConfirm?: boolean;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  return (
    <Modal
      open={open}
      labelledBy={titleId}
      locked={pending}
      onClose={onClose}
      onSubmit={() => {
        if (canConfirm && !pending) onConfirm();
      }}
    >
      <h2
        id={titleId}
        className="m-0 font-heading text-[28px] leading-[1.05] font-semibold uppercase"
      >
        {title}
      </h2>
      <div className="flex flex-col gap-2.5 text-base text-neutral-800">{children}</div>
      {error ? (
        <p role="alert" className="m-0 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="btn btn-secondary min-h-11 flex-1 px-4 sm:min-h-10 sm:flex-none"
          disabled={pending}
          onClick={onClose}
        >
          {cancelLabel}
        </button>
        <button
          type="submit"
          className={`btn ${tone === "danger" ? "btn-danger" : "btn-primary"} min-h-11 flex-1 px-4 sm:min-h-10 sm:flex-none`}
          disabled={!canConfirm || pending}
        >
          {pending ? pendingLabel : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/**
 * The dialog frame shared by every dashboard modal: a native <dialog> with a blueprint card
 * holding a form. Escape and a click outside close it unless `locked` (while work is running).
 */
export function Modal({
  open,
  labelledBy,
  locked = false,
  onClose,
  onSubmit,
  children,
}: {
  open: boolean;
  labelledBy: string;
  locked?: boolean;
  onClose: () => void;
  onSubmit: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  const close = () => {
    if (!locked) onClose();
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby={labelledBy}
      className="m-auto w-[min(520px,calc(100%-24px))] overflow-visible bg-transparent p-0 backdrop:bg-[color-mix(in_srgb,var(--color-neutral-900)_40%,transparent)] backdrop:backdrop-blur-[3px]"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <form
        className="blueprint cm-rise flex flex-col gap-[18px] bg-neutral-100 px-5 py-[22px] text-left shadow-lg sm:p-7"
        // Entrances elsewhere on the page are staggered; the dialog shouldn't inherit a delay.
        style={{ "--delay": "0ms" } as CSSProperties}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Corners />
        {children}
      </form>
    </dialog>
  );
}
