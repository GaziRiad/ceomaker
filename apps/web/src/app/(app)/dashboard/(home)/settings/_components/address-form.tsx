"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { Alert } from "@/components/icons";
import { checkAddressAction } from "../../../site-actions";
import { useToast } from "../../_components/toasts";
import { saveAddressAction } from "../actions";

type Check = "short" | "checking" | "available" | "taken" | "saved" | "idle";

const MESSAGES: Record<Check, { text: string; className: string }> = {
  idle: { text: "", className: "" },
  short: { text: "Use at least 3 letters or numbers", className: "text-neutral-700" },
  checking: { text: "Checking…", className: "text-neutral-700" },
  available: { text: "✓ Available", className: "text-accent-700" },
  taken: { text: "Someone already has this address", className: "text-danger" },
  saved: { text: "Saved", className: "text-accent-700" },
};

/** The address field before the first publish: checked as it's typed, saved on demand. */
export function AddressForm({
  siteId,
  subdomain,
  prefix,
  suffix,
}: {
  siteId: string;
  subdomain: string;
  prefix: string;
  suffix: string;
}) {
  const id = useId();
  const router = useRouter();
  const say = useToast();
  const [saved, setSaved] = useState(subdomain);
  const [value, setValue] = useState(subdomain);
  const [check, setCheck] = useState<Check>("idle");
  const [takenMessage, setTakenMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Check the address after a short pause in typing.
  useEffect(() => {
    if (check !== "checking") return;
    const timer = setTimeout(async () => {
      const result = await checkAddressAction(siteId, value).catch(() => null);
      if (!result) {
        setCheck("idle");
        return;
      }
      setTakenMessage(result.available ? null : result.message.replace(/\.$/, ""));
      setCheck(result.available ? "available" : "taken");
    }, 400);
    return () => clearTimeout(timer);
  }, [check, siteId, value]);

  const onChange = (raw: string) => {
    const next = raw
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 40);
    setValue(next);
    setCheck(next === saved ? "idle" : next.length < 3 ? "short" : "checking");
  };

  const save = () => {
    startTransition(async () => {
      const result = await saveAddressAction(siteId, value).catch(() => ({
        ok: false as const,
        error: "Couldn't reach the server. Try again.",
      }));
      if (!result.ok) {
        say("error", result.error);
        return;
      }
      setSaved(result.subdomain);
      setValue(result.subdomain);
      setCheck("saved");
      say("ok", "Address saved");
      router.refresh();
    });
  };

  const message =
    check === "taken" && takenMessage ? { ...MESSAGES.taken, text: takenMessage } : MESSAGES[check];
  const box =
    "flex flex-none items-center border border-divider bg-neutral-200 px-3.5 text-[15px] text-neutral-800";

  return (
    <form
      className="flex flex-col gap-3.5"
      onSubmit={(event) => {
        event.preventDefault();
        if (check === "available" && !pending) save();
      }}
    >
      <p className="m-0 max-w-[600px] text-neutral-800">
        You can change your address until you publish for the first time. After that it&apos;s
        locked.
      </p>
      <div className="field max-w-[560px]">
        <label htmlFor={id}>Address</label>
        <div className="flex items-stretch">
          {prefix ? <span className={`${box} border-r-0`}>{prefix}</span> : null}
          <input
            id={id}
            className="input min-h-12 min-w-0 flex-1 text-base"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={check === "taken"}
            aria-describedby={`${id}-status`}
            disabled={pending}
          />
          {suffix ? <span className={`${box} border-l-0`}>{suffix}</span> : null}
        </div>
      </div>
      <span
        id={`${id}-status`}
        role="status"
        className={`flex min-h-5 items-center gap-2 text-sm ${message.className}`}
      >
        {check === "taken" ? <Alert size={16} /> : null}
        {message.text}
      </span>
      <button
        type="submit"
        className="btn btn-primary min-h-11 self-start px-[18px] sm:min-h-10"
        disabled={check !== "available" || pending}
      >
        {pending ? "Saving…" : "Save address"}
      </button>
    </form>
  );
}
