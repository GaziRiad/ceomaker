"use client";

import {
  CONTACT_MESSAGE_LIMITS,
  LOOKS_LIKE_EMAIL,
  type ContactMessageField,
  type SendContactMessageResult,
} from "@ceomaker/schema";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { SendContactMessage } from "./types";

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

function FieldError({
  id,
  message,
  prefix,
}: {
  id: string;
  message: string | undefined;
  prefix: string;
}) {
  if (!message) return null;
  return (
    <span id={id} className={`${prefix}-error`}>
      <span aria-hidden="true" className={`${prefix}-error-icon`}>
        !
      </span>
      {message}
    </span>
  );
}

/** One piece of the form's wording; `field` is set only in the editor's preview. */
interface Word {
  text: string;
  field: string;
}

export interface FormWords {
  question: Word;
  name: Word;
  email: Word;
  organisation: Word;
  optional: Word;
  message: Word;
  send: Word;
  note: Word;
}

/** Wording the editor's preview can rewrite in place. */
function Text({ word, className }: { word: Word; className?: string }) {
  if (!word.field && !className) return word.text;
  return (
    <span data-field={word.field || undefined} className={className}>
      {word.text}
    </span>
  );
}

/**
 * The contact form templates share. Validates on submit, then sends through `send` on a live
 * site. In previews there's nothing to send to, so it walks through the same states and says so.
 * Each template styles it through its own class prefix ("mer-panel", "mon-panel").
 */
export function ContactForm({
  prefix,
  topics,
  topicFields,
  words,
  first,
  send,
}: {
  /** The template's class prefix. */
  prefix: string;
  topics: string[];
  /** Content paths of the topics, in the editor's preview only. */
  topicFields: string[];
  words: FormWords;
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
      <div ref={sent} tabIndex={-1} role="status" className={`${prefix}-panel ${prefix}-sent`}>
        <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true">
          <circle className={`${prefix}-check-ring`} cx="24" cy="24" r="23" />
          <path className={`${prefix}-check`} d="M15 24.5l6 6 12-13" />
        </svg>
        <span className={`${prefix}-sent-title`}>Message sent</span>
        <span className={`${prefix}-sent-line`}>
          {send
            ? `${sender ? `Thanks, ${sender}. ` : "Thanks. "}${first ? `${first} will reply to ` : "You'll get a reply at "}${email}.`
            : "This is a preview. On your live site, messages arrive in your dashboard."}
        </span>
        <button type="button" className={`${prefix}-again`} onClick={reset}>
          Send another message
        </button>
      </div>
    );
  }

  const describedBy = (field: ContactMessageField) =>
    errors[field] ? `${prefix}-${field}-error` : undefined;

  return (
    <div className={`${prefix}-panel`}>
      <form
        ref={form}
        noValidate
        aria-label="Contact form"
        className={`${prefix}-form`}
        onSubmit={submit}
      >
        {topics.length ? (
          <fieldset className={`${prefix}-fieldset`}>
            <legend className={`${prefix}-legend`}>
              <Text word={words.question} />
            </legend>
            <div className={`${prefix}-topics`}>
              {topics.map((topic, index) => {
                const on = values.topic === topic;
                return (
                  <button
                    key={topic}
                    type="button"
                    aria-pressed={on}
                    disabled={busy}
                    className={`${prefix}-topic`}
                    onClick={() => set("topic", on ? null : topic)}
                  >
                    {on ? (
                      <span aria-hidden="true" className={`${prefix}-topic-tick`}>
                        ✓
                      </span>
                    ) : null}
                    {topicFields[index] ? (
                      <span data-field={topicFields[index]}>{topic}</span>
                    ) : (
                      topic
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}
        <div className={`${prefix}-fields`}>
          <label className={`${prefix}-field`}>
            <Text word={words.name} className={`${prefix}-field-label`} />
            <input
              name="name"
              autoComplete="name"
              maxLength={CONTACT_MESSAGE_LIMITS.name}
              className={`${prefix}-input`}
              value={values.name}
              disabled={busy}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={describedBy("name")}
              onChange={(event) => set("name", event.target.value)}
            />
            <FieldError id={`${prefix}-name-error`} message={errors.name} prefix={prefix} />
          </label>
          <label className={`${prefix}-field`}>
            <Text word={words.email} className={`${prefix}-field-label`} />
            <input
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={CONTACT_MESSAGE_LIMITS.email}
              className={`${prefix}-input`}
              value={values.email}
              disabled={busy}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={describedBy("email")}
              onChange={(event) => set("email", event.target.value)}
            />
            <FieldError id={`${prefix}-email-error`} message={errors.email} prefix={prefix} />
          </label>
        </div>
        <label className={`${prefix}-field`}>
          <span className={`${prefix}-field-label`}>
            <Text word={words.organisation} />
            <span className={`${prefix}-optional`}>
              {" · "}
              <Text word={words.optional} />
            </span>
          </span>
          <input
            name="organisation"
            autoComplete="organization"
            maxLength={CONTACT_MESSAGE_LIMITS.organisation}
            className={`${prefix}-input`}
            value={values.organisation}
            disabled={busy}
            onChange={(event) => set("organisation", event.target.value)}
          />
        </label>
        <label className={`${prefix}-field`}>
          <Text word={words.message} className={`${prefix}-field-label`} />
          <textarea
            name="message"
            rows={5}
            maxLength={CONTACT_MESSAGE_LIMITS.message}
            className={`${prefix}-input ${prefix}-textarea`}
            value={values.message}
            disabled={busy}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={describedBy("message")}
            onChange={(event) => set("message", event.target.value)}
          />
          <FieldError id={`${prefix}-message-error`} message={errors.message} prefix={prefix} />
        </label>
        <input
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className={`${prefix}-honeypot`}
          defaultValue=""
        />
        {failure ? (
          <span role="alert" className={`${prefix}-error`}>
            <span aria-hidden="true" className={`${prefix}-error-icon`}>
              !
            </span>
            {failure}
          </span>
        ) : null}
        <div className={`${prefix}-submit-row`}>
          <button type="submit" disabled={busy} className={`${prefix}-button ${prefix}-submit`}>
            {busy ? "Sending…" : <Text word={words.send} />}
            {busy ? (
              <span aria-hidden="true" className={`${prefix}-spinner`} />
            ) : (
              <span aria-hidden="true">→</span>
            )}
          </button>
          <Text word={words.note} className={`${prefix}-note`} />
        </div>
      </form>
    </div>
  );
}
