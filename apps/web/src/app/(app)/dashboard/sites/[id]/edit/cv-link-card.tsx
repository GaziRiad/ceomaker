"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { trackEvent } from "@/lib/product-analytics/browser";

/** The button's words once it opens the CV. */
export const CV_BUTTON_LABEL = "Download my CV";

/** A link someone can open from the site: http or https only. */
function linkFrom(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Whether the hero button already leads somewhere outside the page (a CV, most likely). */
export function opensLink(href: string | undefined): boolean {
  return Boolean(href && /^https?:\/\//.test(href));
}

/**
 * For job seekers: recruiters look for a CV, and the hero button can open one. The CV isn't
 * stored here: the owner pastes a link to it (Google Drive, Dropbox, OneDrive) and the button
 * becomes "Download my CV". Their contact section stays as it is.
 */
export function CvLinkCard({
  siteId,
  href,
  onSave,
}: {
  siteId: string;
  /** The hero button's current link. */
  href: string | undefined;
  onSave: (link: string) => void;
}) {
  const dismissKey = `ceomaker:cv-card:${siteId}`;
  const [dismissed, setDismissed] = useState(false);
  // Read after hydration: the server can't know what this browser hid.
  useEffect(() => {
    try {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read from storage */
      if (localStorage.getItem(dismissKey) === "1") setDismissed(true);
    } catch {
      // Storage blocked: the card shows.
    }
  }, [dismissKey]);
  const added = opensLink(href);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(added ? (href ?? "") : "");
  const [error, setError] = useState<string | null>(null);
  const [howOpen, setHowOpen] = useState(false);
  const howId = useId();

  if (dismissed && !editing) return null;

  if (added && !editing) {
    return (
      <div className="mx-3 mt-3 flex items-center gap-2 border border-divider px-3 py-2 text-[13px] text-neutral-700">
        <span className="flex-1">CV link added: your button opens your CV.</span>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ padding: "0 4px", fontSize: 13 }}
          onClick={() => setEditing(true)}
        >
          Change
        </button>
      </div>
    );
  }

  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const link = linkFrom(value);
    if (!link) {
      setError("Paste the full link, starting with https://");
      return;
    }
    setError(null);
    onSave(link);
    setEditing(false);
    trackEvent("cv_link_added", { changed: added });
  };

  const dismiss = () => {
    try {
      localStorage.setItem(dismissKey, "1");
    } catch {
      // Storage blocked: it stays hidden until the page reloads.
    }
    setDismissed(true);
    setEditing(false);
  };

  return (
    <form
      noValidate
      onSubmit={save}
      className="mx-3 mt-3 flex flex-col gap-2.5 border border-accent bg-accent-100 p-3 text-[13px]"
    >
      <div className="flex items-start gap-2">
        <span className="flex-1 leading-snug">
          <strong className="font-medium">Recruiters look for a CV.</strong> Paste a link to yours
          and your main button becomes &ldquo;{CV_BUTTON_LABEL}&rdquo;.
        </span>
        <button
          type="button"
          aria-label="Hide this"
          className="btn btn-ghost"
          style={{ padding: "0 4px" }}
          onClick={added ? () => setEditing(false) : dismiss}
        >
          ×
        </button>
      </div>
      <div className="flex gap-2">
        <label htmlFor={`${howId}-link`} className="sr-only">
          Link to your CV
        </label>
        <input
          id={`${howId}-link`}
          className="input min-w-0 flex-1"
          type="url"
          inputMode="url"
          maxLength={2048}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="https://drive.google.com/…"
          style={{ fontSize: 13, padding: "8px 10px" }}
        />
        <button type="submit" className="btn btn-primary" style={{ padding: "8px 12px" }}>
          Save
        </button>
      </div>
      {error ? (
        <span role="alert" className="text-danger">
          {error}
        </span>
      ) : null}
      <button
        type="button"
        className="self-start text-accent-800 underline underline-offset-4 hover:text-text"
        aria-expanded={howOpen}
        aria-controls={howId}
        onClick={() => setHowOpen((open) => !open)}
      >
        {howOpen ? "Hide" : "How do I get a link?"}
      </button>
      {howOpen ? (
        <ol id={howId} className="m-0 flex flex-col gap-1 pl-4 text-neutral-800">
          <li>Upload your CV (or LinkedIn PDF) to Google Drive.</li>
          <li>
            Choose <strong className="font-medium">Share</strong>, then set General access to{" "}
            <strong className="font-medium">Anyone with the link</strong>.
          </li>
          <li>
            Choose <strong className="font-medium">Copy link</strong> and paste it here. Dropbox and
            OneDrive work the same way.
          </li>
        </ol>
      ) : null}
      <span className="text-neutral-700">
        Make sure anyone with the link can view it, or recruiters will be asked to request access.
      </span>
    </form>
  );
}
