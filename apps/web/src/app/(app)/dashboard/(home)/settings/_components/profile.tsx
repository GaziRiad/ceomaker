"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { useToast } from "../../_components/toasts";
import { saveNameAction } from "../actions";
import { ChangeEmail } from "./change-email";

/** Name and email. The name saves here; the email changes through a confirmation link. */
export function Profile({
  name,
  email,
  canChangeEmail,
}: {
  name: string;
  email: string;
  /** False until emails can be sent. */
  canChangeEmail: boolean;
}) {
  const id = useId();
  const router = useRouter();
  const say = useToast();
  const [saved, setSaved] = useState(name);
  const [value, setValue] = useState(name);
  const [pending, startTransition] = useTransition();
  const trimmed = value.trim();

  const save = () => {
    startTransition(async () => {
      const result = await saveNameAction(trimmed).catch(() => ({
        ok: false as const,
        error: "Couldn't reach the server. Try again.",
      }));
      if (!result.ok) {
        say("error", result.error);
        return;
      }
      setSaved(trimmed);
      setValue(trimmed);
      say("ok", "Changes saved");
      router.refresh();
    });
  };

  // The email's dialog holds a form of its own, so only the name field sits in this one; the
  // button below submits it through the form attribute.
  return (
    <div className="flex flex-col gap-[18px]">
      <form
        id={`${id}-form`}
        className="field max-w-[480px]"
        onSubmit={(event) => {
          event.preventDefault();
          if (trimmed && trimmed !== saved && !pending) save();
        }}
      >
        <label htmlFor={id}>Full name</label>
        <input
          id={id}
          className="input min-h-12 text-base"
          autoComplete="name"
          maxLength={80}
          value={value}
          disabled={pending}
          onChange={(event) => setValue(event.target.value)}
        />
      </form>
      <div className="flex flex-col gap-1.5">
        <span className="field-label mb-0">Email</span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-[17px] [overflow-wrap:anywhere]">{email}</span>
          <ChangeEmail email={email} available={canChangeEmail} />
        </div>
        <span className="text-sm text-neutral-700">
          Messages from your site and sign-in links go here.
        </span>
      </div>
      <button
        type="submit"
        form={`${id}-form`}
        className="btn btn-primary min-h-11 self-start px-[18px] sm:min-h-10"
        disabled={!trimmed || trimmed === saved || pending}
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
