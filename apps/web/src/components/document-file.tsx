"use client";

import { useRef, useState } from "react";
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

/** How to get a LinkedIn profile as a PDF. */
export function LinkedInPdfHint() {
  return (
    <span>
      <strong className="font-medium text-text">No CV to hand?</strong> Use your LinkedIn profile:
      open it on LinkedIn, select <strong className="font-medium">More</strong> (or{" "}
      <strong className="font-medium">Resources</strong>) under your name, then{" "}
      <strong className="font-medium">Save to PDF</strong>.
    </span>
  );
}
