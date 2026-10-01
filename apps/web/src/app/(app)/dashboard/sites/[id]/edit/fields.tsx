"use client";

import { useId, type ReactNode } from "react";

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string | undefined;
  hint?: ReactNode;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}) {
  const id = useId();
  const noteId = `${id}-note`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children(id, error || hint ? noteId : undefined)}
      {error ? (
        <span id={noteId} className="mt-1 block text-xs text-danger">
          {error}
        </span>
      ) : hint ? (
        <span id={noteId} className="mt-1 block text-xs text-neutral-700">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  placeholder,
  maxLength,
  type = "text",
  spellCheck,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  error?: string | undefined;
  hint?: ReactNode;
  placeholder?: string;
  maxLength?: number;
  type?: string;
  spellCheck?: boolean;
}) {
  return (
    <Field label={label} error={error} hint={hint}>
      {(id, describedBy) => (
        <input
          id={id}
          className="input"
          type={type}
          value={value ?? ""}
          placeholder={placeholder}
          maxLength={maxLength}
          spellCheck={spellCheck}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  error,
  hint,
  minHeight = 90,
  maxLength,
  style,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  error?: string | undefined;
  hint?: ReactNode;
  minHeight?: number;
  maxLength?: number;
  style?: React.CSSProperties;
}) {
  return (
    <Field label={label} error={error} hint={hint}>
      {(id, describedBy) => (
        <textarea
          id={id}
          className="input"
          style={{ minHeight, ...style }}
          value={value ?? ""}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
}

/** A small "×" remove button for list rows. */
export function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="btn btn-ghost"
      style={{ padding: "0 8px", fontSize: 18, color: "var(--color-neutral-600)" }}
      aria-label={label}
      onClick={onClick}
    >
      ×
    </button>
  );
}
