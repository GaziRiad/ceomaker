"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Blueprint } from "@/components/ui";
import { deleteMessageAction } from "./site-actions";
import { LocalTime } from "./versions-table";

export interface MessageRow {
  id: string;
  name: string;
  email: string;
  organisation: string | null;
  topic: string | null;
  message: string;
  /** ISO timestamp. */
  createdAt: string;
}

function replyHref(row: MessageRow): string {
  const subject = row.topic ? `Re: ${row.topic}` : "Re: your message";
  return `mailto:${row.email}?subject=${encodeURIComponent(subject)}`;
}

/** The inbox for the site's contact form: newest first, reply by email, delete. */
export function MessageList({ rows, empty }: { rows: MessageRow[]; empty: string }) {
  const [messages, setMessages] = useState(rows);
  const [deleting, setDeleting] = useState<MessageRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!messages.length) {
    return (
      <Blueprint className="p-5">
        <span className="text-sm text-neutral-700">{empty}</span>
      </Blueprint>
    );
  }

  const confirm = () => {
    if (!deleting) return;
    const target = deleting;
    setError(null);
    startTransition(async () => {
      const result = await deleteMessageAction(target.id).catch(() => ({
        ok: false as const,
        error: "We couldn't reach the server. Try again.",
      }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessages((current) => current.filter((row) => row.id !== target.id));
      setDeleting(null);
    });
  };

  return (
    <>
      <Blueprint className="flex flex-col">
        {messages.map((row) => (
          <article
            key={row.id}
            className="flex flex-col gap-2.5 border-t border-divider p-5 first:border-t-0"
            aria-label={`Message from ${row.name}`}
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-medium">{row.name}</span>
              {row.organisation ? (
                <span className="text-sm text-neutral-700">{row.organisation}</span>
              ) : null}
              {row.topic ? <span className="tag tag-accent">{row.topic}</span> : null}
              <span className="ml-auto text-[13px] text-neutral-600">
                <LocalTime iso={row.createdAt} />
              </span>
            </div>
            <p className="m-0 max-w-[720px] text-[15px] leading-relaxed whitespace-pre-wrap text-neutral-900">
              {row.message}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={replyHref(row)}
                className="btn btn-secondary"
                style={{ padding: "6px 12px" }}
              >
                Reply to {row.email}
              </a>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: "6px 12px" }}
                onClick={() => {
                  setError(null);
                  setDeleting(row);
                }}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </Blueprint>
      <ConfirmDialog
        open={deleting !== null}
        title="Delete this message"
        confirmLabel="Delete message"
        pendingLabel="Deleting…"
        tone="danger"
        pending={pending}
        error={error}
        onConfirm={confirm}
        onClose={() => setDeleting(null)}
      >
        <span>
          The message from {deleting?.name ?? "this sender"} is deleted for good. Reply first if you
          still need it.
        </span>
      </ConfirmDialog>
    </>
  );
}
