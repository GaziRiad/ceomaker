"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Corners, Spinner } from "@/components/ui";
import { checkAddressAction, publishAction } from "../../../site-actions";
import { ProTag } from "@/components/pro";

type Stage = "plan" | "publishing" | "done";

export interface PublishedResult {
  subdomain: string;
  url: string;
  versionNumber: number;
}

export function PublishDialog({
  open,
  onClose,
  siteId,
  live,
  subdomain,
  addressPrefix,
  addressSuffix,
  nextVersion,
  blocker,
  pro,
  ensureSaved,
  onPublished,
}: {
  open: boolean;
  onClose: () => void;
  siteId: string;
  /** Published before: the address is fixed and this publishes an update. */
  live: boolean;
  subdomain: string;
  addressPrefix: string;
  addressSuffix: string;
  nextVersion: number;
  /** A reason publishing can't happen yet (unreadable colours, fields to fix). */
  blocker: string | null;
  /** Shown in the plan box: what the live site includes. */
  pro: boolean;
  ensureSaved: () => Promise<boolean>;
  onPublished: (result: PublishedResult) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [stage, setStage] = useState<Stage>("plan");
  const [address, setAddress] = useState(subdomain);
  const [availability, setAvailability] = useState<{ ok: boolean; message: string }>({
    ok: true,
    message: "Available",
  });
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublishedResult | null>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      setStage("plan");
      setError(null);
      setAddress(subdomain);
      setAvailability({ ok: true, message: "Available" });
      element.showModal();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open, subdomain]);

  // Check the address as it's typed, after a short pause.
  useEffect(() => {
    if (live || !open || address === subdomain) return;
    const timer = setTimeout(async () => {
      const check = await checkAddressAction(siteId, address);
      setAvailability({ ok: check.available, message: check.message });
      setChecking(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [address, live, open, siteId, subdomain]);

  const publish = async () => {
    setError(null);
    if (blocker) {
      setError(blocker);
      return;
    }
    setStage("publishing");
    if (!(await ensureSaved())) {
      setStage("plan");
      setError("Your latest changes haven't saved yet. Fix any highlighted fields and try again.");
      return;
    }
    const outcome = await publishAction(siteId, live ? {} : { subdomain: address });
    if (!outcome.ok) {
      setStage("plan");
      setError(outcome.error);
      return;
    }
    setResult(outcome);
    setStage("done");
    onPublished(outcome);
  };

  const close = () => {
    if (stage !== "publishing") onClose();
  };
  const shownAddress = `${addressPrefix}${result?.subdomain ?? address}${addressSuffix}`;

  return (
    <dialog
      ref={dialog}
      aria-labelledby="publish-title"
      className="m-auto w-[min(540px,calc(100%-32px))] overflow-visible bg-transparent p-0 backdrop:bg-[color-mix(in_srgb,var(--color-neutral-900)_40%,transparent)] backdrop:backdrop-blur-[3px]"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="blueprint cm-rise flex flex-col gap-[18px] bg-surface p-[26px] shadow-lg">
        <Corners />
        {stage === "plan" ? (
          <>
            <div className="flex flex-col gap-1">
              <h2
                id="publish-title"
                className="m-0 font-heading text-[34px] leading-none font-semibold uppercase"
              >
                {live ? "Publish your update" : "Publish your site"}
              </h2>
              <span className="text-[15px] text-neutral-700">
                {live
                  ? "Your live site will switch to this draft. Earlier versions stay in your history."
                  : "Your draft becomes your public site. You can keep editing and publish again any time."}
              </span>
            </div>
            <div className="field">
              <label htmlFor="publish-address">Your address</label>
              <div
                className="flex min-h-[42px] items-stretch bg-neutral-100"
                style={{
                  border: `1px solid ${checking || availability.ok ? "var(--color-accent)" : "var(--color-danger)"}`,
                }}
              >
                {addressPrefix ? (
                  <span className="flex items-center bg-surface px-3 text-sm text-neutral-700">
                    {addressPrefix}
                  </span>
                ) : null}
                <input
                  id="publish-address"
                  value={address}
                  readOnly={live}
                  spellCheck={false}
                  maxLength={40}
                  aria-describedby="publish-address-status"
                  className="min-w-0 flex-1 border-0 bg-transparent px-3 text-base text-text outline-none"
                  onChange={(event) => {
                    const next = event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                    setAddress(next);
                    setChecking(next !== subdomain);
                    if (next === subdomain) setAvailability({ ok: true, message: "Available" });
                  }}
                />
                {addressSuffix ? (
                  <span className="flex items-center bg-surface px-3 text-sm text-neutral-700">
                    {addressSuffix}
                  </span>
                ) : null}
              </div>
              <span
                id="publish-address-status"
                className="mt-1.5 flex items-center gap-1.5 text-[13px]"
                style={{
                  color: checking
                    ? "var(--color-neutral-600)"
                    : availability.ok
                      ? "var(--color-accent-700)"
                      : "var(--color-danger)",
                }}
              >
                {live ? (
                  "Your address stays the same."
                ) : checking ? (
                  "Checking…"
                ) : availability.ok ? (
                  <>
                    <Check size={14} strokeWidth={2} />
                    {address === subdomain ? "Available" : availability.message}
                  </>
                ) : (
                  availability.message
                )}
              </span>
            </div>
            <div className="flex flex-col gap-1 border border-accent bg-accent-100 p-3.5">
              <span className="flex items-center justify-between gap-3 text-[13px] text-neutral-700">
                Your plan
                {pro ? <ProTag /> : null}
              </span>
              <span className="font-heading text-[26px] leading-[1.1] font-semibold">
                {pro ? "Pro" : "Free · $0"}
              </span>
              <span className="text-xs text-neutral-700">
                {pro
                  ? "Every template, your own domain, the contact form and analytics."
                  : "Free sites use Meridian or Harbour, are reached by email and links, and carry a small “Made with CEOMaker” badge."}
              </span>
            </div>
            {error ? (
              <p role="alert" className="m-0 text-sm text-danger">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              className="btn btn-primary"
              style={{ justifyContent: "space-between", padding: "13px 16px", fontSize: 16 }}
              disabled={checking || !availability.ok || address.length < 3}
              onClick={publish}
            >
              <span>{live ? "Publish update" : "Publish my site"}</span>
              <ArrowRight />
            </button>
            <span className="text-xs text-neutral-600">
              Anyone with the address can see your site. Drafts stay private.
            </span>
          </>
        ) : null}
        {stage === "publishing" ? (
          <div role="status" className="flex items-center gap-4 px-1 py-7">
            <Spinner />
            <div className="flex flex-col">
              <span className="font-medium">Publishing your site</span>
              <span className="text-sm text-neutral-700">
                Snapshotting your draft as version {nextVersion}.
              </span>
            </div>
          </div>
        ) : null}
        {stage === "done" && result ? (
          <>
            <svg aria-hidden width="56" height="56" viewBox="0 0 56 56" fill="none">
              <circle cx="28" cy="28" r="26" stroke="var(--color-accent)" strokeWidth="1.5" />
              <path
                className="cm-draw"
                d="M17 29l7 7 15-16"
                stroke="var(--color-accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="48"
                strokeDashoffset="0"
              />
            </svg>
            <div className="flex flex-col gap-1">
              <h2
                id="publish-title"
                className="m-0 font-heading text-[34px] leading-none font-semibold uppercase"
              >
                You&apos;re live
              </h2>
              <span className="text-[15px] text-neutral-700">
                Published at{" "}
                <a href={result.url} target="_blank" rel="noopener noreferrer">
                  {shownAddress}
                </a>
                . Future edits stay in draft until you publish again.
              </span>
            </div>
            <div className="flex gap-2.5">
              <Link href="/dashboard" className="btn btn-primary">
                Go to dashboard
              </Link>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Keep editing
              </button>
            </div>
          </>
        ) : null}
      </div>
    </dialog>
  );
}
