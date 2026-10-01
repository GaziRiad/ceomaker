"use client";

import { useId, useState, useTransition } from "react";
import { Modal } from "@/components/confirm-dialog";
import { Mail, Spinner } from "@/components/ui";
import { useToast } from "../../_components/toasts";
import { changeEmailAction } from "../actions";

const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** "Change email": asks for the new address, then says to open the link sent there. */
export function ChangeEmail({ email, available }: { email: string; available: boolean }) {
  const titleId = useId();
  const inputId = useId();
  const say = useToast();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"form" | "sent">("form");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const next = value.trim();

  const close = () => {
    setOpen(false);
    setError(null);
  };

  const send = (again: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await changeEmailAction(next).catch(() => ({
        ok: false as const,
        error: "Couldn't reach the server. Try again.",
      }));
      if (!result.ok) {
        if (again) say("error", result.error);
        else setError(result.error);
        return;
      }
      if (again) say("ok", "Link sent again");
      else setStage("sent");
    });
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost min-h-11 text-accent-700 sm:min-h-10"
        disabled={!available}
        title={available ? undefined : "Not available yet"}
        onClick={() => {
          setStage("form");
          setValue("");
          setError(null);
          setOpen(true);
        }}
      >
        Change email
      </button>
      <Modal
        open={open}
        labelledBy={titleId}
        locked={pending}
        onClose={close}
        onSubmit={() => {
          if (stage === "form" && LOOKS_LIKE_EMAIL.test(next) && !pending) send(false);
          else if (stage === "sent") close();
        }}
      >
        {stage === "form" ? (
          <>
            <h2
              id={titleId}
              className="m-0 font-heading text-[28px] leading-[1.05] font-semibold uppercase"
            >
              Change email
            </h2>
            <p className="m-0 text-neutral-800">
              We&apos;ll send a link to the new address. Your email changes when you open it.
            </p>
            <div className="field">
              <label htmlFor={inputId}>New email</label>
              <input
                id={inputId}
                className="input min-h-12 text-base"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={value}
                disabled={pending}
                aria-invalid={error ? true : undefined}
                onChange={(event) => setValue(event.target.value)}
              />
            </div>
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
                onClick={close}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary min-h-11 flex-1 gap-2.5 px-4 sm:min-h-10 sm:flex-none"
                disabled={!LOOKS_LIKE_EMAIL.test(next) || pending}
              >
                {pending ? "Sending…" : "Send link"}
                {pending ? <Spinner size={14} /> : null}
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="flex size-[52px] items-center justify-center rounded-full border border-accent text-accent-700">
              <Mail size={24} />
            </span>
            <h2
              id={titleId}
              className="m-0 font-heading text-[28px] leading-[1.05] font-semibold uppercase"
            >
              Check your inbox
            </h2>
            <p className="m-0 text-pretty [overflow-wrap:anywhere] text-neutral-800">
              We sent a link to <strong className="font-medium text-text">{next}</strong>. Open it
              within 24 hours to confirm. Until then, you keep signing in with {email}.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-ghost mr-auto min-h-11 text-accent-700 sm:min-h-10"
                disabled={pending}
                onClick={() => send(true)}
              >
                {pending ? "Sending…" : "Send the link again"}
              </button>
              <button type="submit" className="btn btn-primary min-h-11 px-[18px] sm:min-h-10">
                Done
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
