"use client";

import { useId, useRef, useState } from "react";
import { DOCUMENT_ACCEPT, DOCUMENT_MAX_BYTES } from "@/lib/pending-document";

/**
 * A CV or LinkedIn PDF to draft from: a hidden file input, opened by the caller's own button, and
 * the chosen file. Files over the request limit are refused here, before anything is sent.
 */
export function useDocumentFile() {
  const ref = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const input = (
    <input
      ref={ref}
      type="file"
      accept={DOCUMENT_ACCEPT}
      className="sr-only"
      tabIndex={-1}
      aria-hidden
      onChange={(event) => {
        const chosen = event.target.files?.[0];
        // Cleared so choosing the same file again (after Remove) still fires.
        event.target.value = "";
        if (!chosen) return;
        if (chosen.size > DOCUMENT_MAX_BYTES) {
          setError("That file is over 4 MB. Try a smaller one.");
          return;
        }
        setError(null);
        setFile(chosen);
      }}
    />
  );

  return {
    file,
    error,
    input,
    choose: () => ref.current?.click(),
    clear: () => {
      setFile(null);
      setError(null);
    },
  };
}

/**
 * How to get a LinkedIn profile as a PDF, with a picture of where to click behind "Show me how"
 * (it's hard to find from words alone). Opens in place, so it works inside dialogs too.
 */
export function LinkedInPdfHint() {
  const [open, setOpen] = useState(false);
  const guideId = useId();
  return (
    <span className="flex flex-col gap-2">
      <span>
        <strong className="font-medium text-text">No CV to hand?</strong> Use your LinkedIn profile:
        open it, select <strong className="font-medium">···</strong> under your name, then{" "}
        <strong className="font-medium">Save to PDF</strong>.{" "}
        <button
          type="button"
          className="text-accent-800 underline underline-offset-4 hover:text-text"
          aria-expanded={open}
          aria-controls={guideId}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? "Hide" : "Show me how"}
        </button>
      </span>
      {open ? (
        <span id={guideId}>
          <LinkedInPdfGuide />
        </span>
      ) : null}
    </span>
  );
}

const LINKEDIN_BLUE = "#0a66c2";

/** A drawing of a LinkedIn profile's ··· menu with Save to PDF marked, not a screenshot. */
export function LinkedInPdfGuide() {
  const step = (number: number) => (
    <span
      aria-hidden
      className="grid size-5 flex-none place-items-center rounded-full bg-accent text-[11px] font-semibold text-white"
    >
      {number}
    </span>
  );
  const pill = "rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap";
  return (
    <span className="flex max-w-[400px] flex-col gap-2.5 text-left">
      <span
        role="img"
        aria-label="A LinkedIn profile: the ··· button under the name opens a menu with Save to PDF."
        className="relative block overflow-hidden rounded-lg border border-[#d9d9d9] bg-white text-[#191919] shadow-sm"
      >
        <span className="block h-12 bg-[#a0b4b7]" />
        <span className="absolute top-5 left-4 block size-14 rounded-full border-[3px] border-white bg-[#c9d3d5]" />
        <span className="flex flex-col gap-1 px-4 pt-9 pb-3">
          <span className="text-[15px] font-semibold">Your name</span>
          <span className="block h-2 w-40 rounded bg-[#e3e3e3]" />
          <span className="block h-2 w-24 rounded bg-[#eeeeee]" />
          <span className="mt-2 flex items-center gap-1.5">
            <span
              className={pill}
              style={{ background: LINKEDIN_BLUE, borderColor: LINKEDIN_BLUE, color: "#fff" }}
            >
              Open to
            </span>
            <span className={pill} style={{ borderColor: LINKEDIN_BLUE, color: LINKEDIN_BLUE }}>
              Add section
            </span>
            <span className="relative">
              <span
                className="grid size-7 place-items-center rounded-full border text-[13px] font-bold outline-2 outline-offset-2 outline-accent"
                style={{ borderColor: "#666", outlineStyle: "solid" }}
              >
                ···
              </span>
              <span className="absolute -top-2.5 -right-2.5">{step(1)}</span>
            </span>
          </span>
        </span>
        <span className="mx-4 mb-4 ml-[132px] flex flex-col overflow-hidden rounded-md border border-[#e0e0e0] bg-white text-[12px] shadow-md">
          <span className="px-3 py-1.5 text-[#666]">Send profile in a message</span>
          <span
            className="relative flex items-center justify-between bg-accent-100 px-3 py-1.5 font-semibold outline-2 -outline-offset-2 outline-accent"
            style={{ outlineStyle: "solid" }}
          >
            Save to PDF
            {step(2)}
          </span>
          <span className="px-3 py-1.5 text-[#666]">Saved items</span>
          <span className="px-3 py-1.5 text-[#666]">Activity</span>
        </span>
      </span>
      <span className="flex flex-col gap-1.5 text-[13px] text-neutral-700">
        <span className="flex items-start gap-2">
          {step(1)}
          <span>
            On your LinkedIn profile, select the <strong className="font-medium">···</strong> button
            under your name (it may say <strong className="font-medium">More</strong>).
          </span>
        </span>
        <span className="flex items-start gap-2">
          {step(2)}
          <span>
            Choose <strong className="font-medium">Save to PDF</strong>. The file downloads; attach
            it here.
          </span>
        </span>
      </span>
    </span>
  );
}
