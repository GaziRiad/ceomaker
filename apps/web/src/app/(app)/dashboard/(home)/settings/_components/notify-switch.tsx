"use client";

import { useId, useState, useTransition } from "react";
import { Info } from "@/components/icons";
import { useToast } from "../../_components/toasts";
import { setNotificationsAction } from "../actions";

/** "Email me when someone sends a message", saved as soon as it's flipped. */
export function NotifySwitch({
  siteId,
  email,
  initial,
  ready,
}: {
  siteId: string;
  email: string;
  initial: boolean;
  /** False until emails can be sent: the choice is still saved. */
  ready: boolean;
}) {
  const id = useId();
  const say = useToast();
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      const result = await setNotificationsAction(siteId, next).catch(() => ({
        ok: false as const,
        error: "Couldn't reach the server. Try again.",
      }));
      if (!result.ok) {
        setOn(!next);
        say("error", result.error);
        return;
      }
      say("ok", next ? "Message emails on" : "Message emails off");
    });
  };

  return (
    <>
      <div className="flex items-center gap-5">
        <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5">
          <span className="font-medium">Email me when someone sends a message</span>
          <span className="text-sm [overflow-wrap:anywhere] text-neutral-700">To {email}</span>
        </label>
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={on}
          aria-busy={pending}
          onClick={toggle}
          className={`relative h-7 w-12 flex-none cursor-pointer rounded-full transition-colors duration-[250ms] ${on ? "bg-accent" : "bg-neutral-400"}`}
        >
          <span
            aria-hidden
            className="absolute top-[3px] size-[22px] rounded-full bg-neutral-100 shadow-sm transition-[left] duration-[250ms] ease-[cubic-bezier(.2,.7,.2,1)]"
            style={{ left: on ? 23 : 3 }}
          />
        </button>
      </div>
      {ready ? null : (
        <div className="flex items-start gap-3 bg-neutral-200 px-4 py-3.5">
          <span className="flex pt-0.5 text-neutral-700">
            <Info />
          </span>
          <div className="flex flex-col gap-1">
            <span className="tag tag-neutral self-start bg-neutral-100">Not available yet</span>
            <span className="text-[15px] text-pretty text-neutral-800">
              Message emails start once email sending is set up. Your choice is saved, and new
              messages always appear here in the meantime.
            </span>
          </div>
        </div>
      )}
    </>
  );
}
