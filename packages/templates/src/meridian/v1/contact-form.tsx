"use client";

import {
  CONTACT_MESSAGE_LIMITS,
  LOOKS_LIKE_EMAIL,
  type ContactMessageField,
  type SendContactMessageResult,
} from "@ceomaker/schema";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { SendContactMessage } from "../../types";

interface Values {
  name: string;
  email: string;
  organisation: string;
  message: string;
  topic: string | null;
}

const EMPTY: Values = { name: "", email: "", organisation: "", message: "", topic: null };
const FIELD_ORDER: ContactMessageField[] = ["name", "email", "message"];
const NO_CONNECTION = "Your message wasn't sent. Check your connection and try again.";

type Errors = Partial<Record<ContactMessageField, string>>;

function validate(values: Values, first: string): Errors {
  const errors: Errors = {};
  if (!values.name.trim()) errors.name = "Add your name.";
  const email = values.email.trim();
  if (!email) {
    errors.email = first
      ? `Add your email so ${first} can reply.`
      : "Add your email so we can reply.";
  } else if (!LOOKS_LIKE_EMAIL.test(email)) {
    errors.email = "Check the email address.";
  }
  if (!values.message.trim()) errors.message = "Add a short message.";
  return errors;
}

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <span id={id} className="mer-error">
      <span aria-hidden="true" className="mer-error-icon">
        !
      </span>
      {message}
    </span>
  );
}

/**
 * Meridian's contact form. Validates on submit, then sends through `send` on a live site. In
 * previews there's nothing to send to, so it walks through the same states and says so.
 */
export function MeridianContactForm({
  topics,
  first,
  send,
}: {
  topics: string[];
  /** The owner's first name, for "Add your email so Amelia can reply." */
  first: string;
  send?: SendContactMessage | undefined;
}) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [failure, setFailure] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const sent = useRef<HTMLDivElement>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const busy = status === "sending";

  useEffect(() => () => clearTimeout(previewTimer.current), []);
  useEffect(() => {
    if (status === "sent") sent.current?.focus();
  }, [status]);

  const set = (key: keyof Values, value: string | null) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (key in errors) {
      setErrors((current) => {
        const next = { ...current };
        delete next[key as ContactMessageField];
        return next;
      });
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status !== "idle") return;
    const found = validate(values, first);
    const firstInvalid = FIELD_ORDER.find((field) => found[field]);
    if (firstInvalid) {
      setErrors(found);
      form.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }
    setErrors({});
    setFailure(null);
    setStatus("sending");
    const website = new FormData(event.currentTarget).get("website");
    const message = {
      name: values.name.trim(),
      email: values.email.trim(),
      organisation: values.organisation.trim(),
      topic: values.topic ?? "",
      message: values.message.trim(),
      website: typeof website === "string" ? website : "",
    };
    const result: SendContactMessageResult = send
      ? await send(message).catch(() => ({ ok: false as const, error: NO_CONNECTION }))
      : await new Promise((resolve) => {
          previewTimer.current = setTimeout(() => resolve({ ok: true }), 900);
        });
    if (result.ok) {
      setStatus("sent");
      return;
    }
    setStatus("idle");
    if (result.field) setErrors({ [result.field]: result.error });
    else setFailure(result.error);
  };

  const reset = () => {
    setValues(EMPTY);
    setErrors({});
    setFailure(null);
    setStatus("idle");
  };

  if (status === "sent") {
    const sender = values.name.trim().split(/\s+/)[0] ?? "";
    const email = values.email.trim();
    return (
      <div ref={sent} tabIndex={-1} role="status" className="mer-panel mer-sent">
        <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
          <circle className="mer-check-ring" cx="24" cy="24" r="23" />
          <path className="mer-check" d="M15 24.5l6 6 12-13" />
        </svg>
        <span className="mer-sent-title">Message sent</span>
        <span className="mer-sent-line">
          {send
            ? `${sender ? `Thanks, ${sender}. ` : "Thanks. "}${first ? `${first} will reply to ` : "You'll get a reply at "}${email}.`
            : "This is a preview. On your live site, messages arrive in your dashboard."}
        </span>
        <button type="button" className="mer-again" onClick={reset}>
          Send another message
        </button>
      </div>
    );
  }

  const describedBy = (field: ContactMessageField) =>
    errors[field] ? `mer-${field}-error` : undefined;

  return (
    <div className="mer-panel">
      <form ref={form} noValidate aria-label="Contact form" className="mer-form" onSubmit={submit}>
        {topics.length ? (
          <fieldset className="mer-fieldset">
            <legend className="mer-legend">What is it about?</legend>
            <div className="mer-topics">
              {topics.map((topic) => {
                const on = values.topic === topic;
                return (
                  <button
                    key={topic}
                    type="button"
                    aria-pressed={on}
                    disabled={busy}
                    className="mer-topic"
                    onClick={() => set("topic", on ? null : topic)}
                  >
                    {on ? (
                      <span aria-hidden="true" className="mer-topic-tick">
                        ✓
                      </span>
                    ) : null}
                    {topic}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}
        <div className="mer-fields">
          <label className="mer-field">
            <span className="mer-field-label">Your name</span>
            <input
              name="name"
              autoComplete="name"
              maxLength={CONTACT_MESSAGE_LIMITS.name}
              className="mer-input"
              value={values.name}
              disabled={busy}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={describedBy("name")}
              onChange={(event) => set("name", event.target.value)}
            />
            <FieldError id="mer-name-error" message={errors.name} />
          </label>
          <label className="mer-field">
            <span className="mer-field-label">Email</span>
            <input
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={CONTACT_MESSAGE_LIMITS.email}
              className="mer-input"
              value={values.email}
              disabled={busy}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={describedBy("email")}
              onChange={(event) => set("email", event.target.value)}
            />
            <FieldError id="mer-email-error" message={errors.email} />
          </label>
        </div>
        <label className="mer-field">
          <span className="mer-field-label">
            Organisation<span className="mer-optional"> · Optional</span>
          </span>
          <input
            name="organisation"
            autoComplete="organization"
            maxLength={CONTACT_MESSAGE_LIMITS.organisation}
            className="mer-input"
            value={values.organisation}
            disabled={busy}
            onChange={(event) => set("organisation", event.target.value)}
          />
        </label>
        <label className="mer-field">
          <span className="mer-field-label">Message</span>
          <textarea
            name="message"
            rows={5}
            maxLength={CONTACT_MESSAGE_LIMITS.message}
            className="mer-input mer-textarea"
            value={values.message}
            disabled={busy}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={describedBy("message")}
            onChange={(event) => set("message", event.target.value)}
          />
          <FieldError id="mer-message-error" message={errors.message} />
        </label>
        <input
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="mer-honeypot"
          defaultValue=""
        />
        {failure ? (
          <span role="alert" className="mer-error">
            <span aria-hidden="true" className="mer-error-icon">
              !
            </span>
            {failure}
          </span>
        ) : null}
        <div className="mer-submit-row">
          <button type="submit" disabled={busy} className="mer-button mer-submit">
            {busy ? "Sending…" : "Send message"}
            {busy ? (
              <span aria-hidden="true" className="mer-spinner" />
            ) : (
              <span aria-hidden="true">→</span>
            )}
          </button>
          <span className="mer-note">
            {first
              ? `Sent privately to ${first}. Your details aren't shared.`
              : "Sent privately. Your details aren't shared."}
          </span>
        </div>
      </form>
    </div>
  );
}
