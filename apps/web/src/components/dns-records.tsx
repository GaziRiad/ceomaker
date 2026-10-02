"use client";

import type { DnsRecord } from "@ceomaker/schema";
import { useEffect, useRef, useState } from "react";
import { Copy } from "@/components/icons";
import { Check } from "@/components/ui";

/** A record to add, with a hint about which host it's for. */
export interface RecordRow extends DnsRecord {
  hint: string;
}

const MONO = "font-mono text-sm [overflow-wrap:anywhere]";

/** Copies to the clipboard and remembers which value was copied, for "Copied" feedback. */
export function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = (key: string, value: string) => {
    void navigator.clipboard?.writeText(value).catch(() => {});
    setCopied(key);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 1800);
  };
  return { copied, copy };
}

export function CopyButton({
  label,
  text = "Copy",
  done,
  onCopy,
  className = "",
}: {
  /** For screen readers: what is copied. */
  label: string;
  /** The visible word. */
  text?: string;
  done: boolean;
  onCopy: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={label}
      className={`btn btn-secondary min-w-24 flex-none justify-center gap-1.5 px-3 text-sm ${className}`}
    >
      {done ? <Check size={16} /> : <Copy size={16} />}
      {done ? "Copied" : text}
    </button>
  );
}

/** The records to add: a table on wide screens, one card per record below that. */
export function RecordsTable({
  rows: records,
  copied,
  copy,
}: {
  rows: RecordRow[];
  copied: string | null;
  copy: (key: string, value: string) => void;
}) {
  const rows = records.map((record, index) => ({ ...record, key: `rec-${index}` }));
  return (
    <div className="cm-swap flex flex-col">
      <div
        role="table"
        aria-label="Records to add"
        className="hidden flex-col border border-divider min-[1040px]:flex"
      >
        <div
          role="row"
          className="grid grid-cols-[80px_130px_minmax(0,1fr)] gap-4 bg-neutral-200 px-4 py-2.5 text-xs tracking-[0.08em] text-neutral-800 uppercase"
        >
          <span role="columnheader">Type</span>
          <span role="columnheader">Name</span>
          <span role="columnheader">Value</span>
        </div>
        {rows.map((row) => (
          <div
            role="row"
            key={row.key}
            className="grid grid-cols-[80px_130px_minmax(0,1fr)] items-center gap-4 border-t border-divider px-4 py-3"
          >
            <span role="cell" className="font-medium">
              {row.type}
            </span>
            <span role="cell" className="flex min-w-0 flex-col">
              <code className="font-mono text-[15px]">{row.name}</code>
              <span className="text-xs [overflow-wrap:anywhere] text-neutral-700">{row.hint}</span>
            </span>
            <span role="cell" className="flex min-w-0 items-center gap-2">
              <code
                className={`min-w-0 flex-1 rounded-[4px] border border-divider bg-neutral-100 px-2.5 py-2 ${MONO}`}
              >
                {row.value}
              </code>
              <CopyButton
                label={`Copy ${row.type} value ${row.value}`}
                done={copied === row.key}
                onCopy={() => copy(row.key, row.value)}
                className="min-h-10"
              />
            </span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 min-[1040px]:hidden">
        {rows.map((row) => (
          <div key={row.key} className="flex flex-col gap-2.5 border border-divider p-3.5">
            <span className="flex justify-between gap-2.5 text-sm">
              <span className="font-medium">{row.type} record</span>
              <span className="text-right [overflow-wrap:anywhere] text-neutral-700">
                {row.hint}
              </span>
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-xs text-neutral-700">Name</span>
              <code className="font-mono text-[15px]">{row.name}</code>
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-xs text-neutral-700">Value</span>
              <code
                className={`rounded-[4px] border border-divider bg-neutral-100 px-2.5 py-2 ${MONO}`}
              >
                {row.value}
              </code>
            </span>
            <CopyButton
              label={`Copy ${row.type} value ${row.value}`}
              done={copied === row.key}
              onCopy={() => copy(row.key, row.value)}
              className="min-h-11"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
