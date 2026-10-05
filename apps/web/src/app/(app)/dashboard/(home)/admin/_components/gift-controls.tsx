"use client";

import { GIFT_MONTHS, giftEndAfter, giftGrantsPro, type GiftMonths } from "@ceomaker/schema";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "../../_components/toasts";
import { endProGiftAction, giveProGiftAction } from "../actions";

const longDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const UNREACHABLE = { ok: false as const, error: "Couldn't reach the server. Try again." };

/** Gives Pro for some months, added to a gift that hasn't ended, with an optional note. */
export function GiftPro({
  userId,
  name,
  giftEnd,
}: {
  userId: string;
  name: string;
  /** ISO date the current or last gift ends, if any. */
  giftEnd: string | null;
}) {
  const id = useId();
  const router = useRouter();
  const say = useToast();
  const [open, setOpen] = useState(false);
  const [months, setMonths] = useState<GiftMonths>(3);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const give = () => {
    setError(null);
    startTransition(async () => {
      const result = await giveProGiftAction(userId, months, note).catch(() => UNREACHABLE);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setNote("");
      say("ok", `${name}: ${result.message}`);
      router.refresh();
    });
  };

  // Worked out only while the dialog is open, so the server and browser render the same page.
  const preview = () => {
    const now = new Date();
    const current = giftEnd ? new Date(giftEnd) : null;
    const ends = longDate.format(giftEndAfter(current, months, now));
    return current && giftGrantsPro(current, now)
      ? `Added to the current gift: Pro until ${ends}.`
      : `Pro until ${ends}.`;
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary min-h-11 px-3.5 sm:min-h-9"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Gift Pro
      </button>
      <ConfirmDialog
        open={open}
        title={`Gift Pro to ${name}`}
        confirmLabel={`Gift ${months === 12 ? "1 year" : `${months} month${months === 1 ? "" : "s"}`}`}
        pendingLabel="Giving…"
        pending={pending}
        error={error}
        onConfirm={give}
        onClose={() => setOpen(false)}
      >
        <div className="seg grid w-full grid-cols-4" role="radiogroup" aria-label="How long">
          {GIFT_MONTHS.map((option) => (
            <label key={option} className="seg-opt min-h-11 justify-center text-[15px]">
              <input
                type="radio"
                name={`${id}-months`}
                checked={months === option}
                onChange={() => setMonths(option)}
              />
              {option === 12 ? "1 year" : `${option} mo`}
            </label>
          ))}
        </div>
        <p className="m-0">{open ? preview() : null}</p>
        <div className="field">
          <label htmlFor={`${id}-note`}>Note (only admins see it)</label>
          <input
            id={`${id}-note`}
            className="input min-h-11"
            value={note}
            maxLength={200}
            placeholder="Why, e.g. early user, feedback call"
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <p className="m-0 text-sm text-neutral-700">
          Their live site shows Pro straight away. They aren&apos;t emailed now; they get one
          reminder a week before it ends, unless they subscribe.
        </p>
      </ConfirmDialog>
    </>
  );
}

/** Ends the gift now, after asking. Pro stays only if they pay. */
export function EndGift({ userId, name, paid }: { userId: string; name: string; paid: boolean }) {
  const router = useRouter();
  const say = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const end = () => {
    setError(null);
    startTransition(async () => {
      const result = await endProGiftAction(userId).catch(() => UNREACHABLE);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      say("ok", `${name}: ${result.message}`);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost min-h-11 px-3.5 sm:min-h-9"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        End gift
      </button>
      <ConfirmDialog
        open={open}
        title={`End ${name}'s gift?`}
        confirmLabel="End gift"
        pendingLabel="Ending…"
        cancelLabel="Keep it"
        tone="danger-quiet"
        pending={pending}
        error={error}
        onConfirm={end}
        onClose={() => setOpen(false)}
      >
        <p className="m-0">
          {paid
            ? "They keep Pro through their subscription."
            : "Their site moves to the free plan now: a premium template shows as Meridian, the contact form switches off, a custom domain forwards to their ceomaker.app address, and the badge appears. Nothing they made is lost."}
        </p>
      </ConfirmDialog>
    </>
  );
}
