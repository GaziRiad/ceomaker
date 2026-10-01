"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Reply, Trash } from "@/components/icons";
import { Corners } from "@/components/ui";
import { deleteMessageAction } from "../../site-actions";
import { useToast } from "../_components/toasts";
import { When } from "../_components/relative-time";
import { loadOlderMessagesAction, setMessageReadAction } from "./actions";
import type { InboxMessage } from "./inbox-data";

/** Longer than this, or with more than two line breaks, a message starts folded to 3 lines. */
const FOLD_CHARACTERS = 220;

function isLong(message: string): boolean {
  return message.length > FOLD_CHARACTERS || (message.match(/\n/g) ?? []).length > 2;
}

function replyHref(row: InboxMessage): string {
  const subject = row.topic ? `Re: ${row.topic}` : "Re: your message";
  return `mailto:${row.email}?subject=${encodeURIComponent(subject)}`;
}

/**
 * The inbox: newest first, one page at a time. Opening, expanding or replying to a message marks
 * it read; it can be marked new again. Nothing is hidden: older pages load on request.
 */
export function Inbox({
  siteId,
  topic,
  total,
  initial,
  initialCursor,
  open: openId,
}: {
  siteId: string;
  /** The topic filter, or null for all. */
  topic: string | null;
  /** Messages matching the filter, for "Showing 15 of 27". */
  total: number;
  initial: InboxMessage[];
  initialCursor: string | null;
  /** A message to show expanded (arriving from the Overview). */
  open: string | null;
}) {
  const router = useRouter();
  const say = useToast();
  // A message opened from the Overview counts as read.
  const [rows, setRows] = useState(() =>
    initial.map((item) => (item.id === openId ? { ...item, unread: false } : item)),
  );
  const [cursor, setCursor] = useState(initialCursor);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(openId ? [openId] : []));
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<InboxMessage | null>(null);
  const [pending, startTransition] = useTransition();

  const saveRead = (id: string, read: boolean) =>
    setMessageReadAction(id, read)
      .then((result) => {
        if (!result.ok) say("error", result.error);
        router.refresh();
      })
      .catch(() => say("error", "Couldn't reach the server. Try again."));

  const setRead = (row: InboxMessage, read: boolean) => {
    if (row.unread === !read) return;
    setRows((current) =>
      current.map((item) => (item.id === row.id ? { ...item, unread: !read } : item)),
    );
    void saveRead(row.id, read);
  };

  // Saves the read state of the message the page was opened with (shown read from the start).
  useEffect(() => {
    if (openId && initial.some((item) => item.id === openId && item.unread)) {
      void saveRead(openId, true);
    }
    // Run once, for the message the page was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (row: InboxMessage) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(row.id)) next.delete(row.id);
      else next.add(row.id);
      return next;
    });
    setRead(row, true);
  };

  const loadOlder = async () => {
    if (!cursor) return;
    setLoading(true);
    const result = await loadOlderMessagesAction(siteId, topic, cursor).catch(() => null);
    setLoading(false);
    if (!result?.ok) {
      say("error", result?.error ?? "Couldn't reach the server. Try again.", {
        label: "Try again",
        run: () => void loadOlder(),
      });
      return;
    }
    setRows((current) => [
      ...current,
      ...result.rows.filter((row) => !current.some((item) => item.id === row.id)),
    ]);
    setCursor(result.nextCursor);
  };

  const confirmDelete = () => {
    const target = deleting;
    if (!target) return;
    startTransition(async () => {
      const result = await deleteMessageAction(target.id).catch(() => null);
      setDeleting(null);
      if (!result?.ok) {
        say("error", result?.error ?? "Couldn't reach the server. Try again.", {
          label: "Try again",
          run: () => setDeleting(target),
        });
        return;
      }
      setRows((current) => current.filter((row) => row.id !== target.id));
      say("ok", "Message deleted");
      router.refresh();
    });
  };

  const shown = rows.length;
  return (
    <>
      <div className="blueprint bg-neutral-100">
        <Corners />
        {rows.map((row) => {
          const long = isLong(row.message);
          const isOpen = expanded.has(row.id) || !long;
          return (
            <article
              key={row.id}
              aria-label={`${row.unread ? "New message" : "Message"} from ${row.name}`}
              className="flex flex-col gap-3 border-t border-divider px-[18px] py-5 first:border-t-0 sm:px-7 sm:py-6"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span
                  aria-hidden
                  className="size-2 flex-none rounded-full bg-accent transition-opacity duration-300"
                  style={{ opacity: row.unread ? 1 : 0 }}
                />
                <span className="text-[17px]" style={{ fontWeight: row.unread ? 600 : 400 }}>
                  {row.name}
                </span>
                {row.organisation ? (
                  <span className="text-[15px] text-neutral-700">{row.organisation}</span>
                ) : null}
                {row.topic ? <span className="tag tag-accent">{row.topic}</span> : null}
                <span className="ml-auto text-[13px] whitespace-nowrap text-neutral-700">
                  <When iso={row.createdAt} style="message" />
                </span>
              </div>
              <p
                onClick={() => setRead(row, true)}
                className="m-0 max-w-[780px] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-line sm:pl-5"
                style={
                  isOpen
                    ? undefined
                    : {
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 3,
                        overflow: "hidden",
                      }
                }
              >
                {row.message}
              </p>
              {long ? (
                <button
                  type="button"
                  className="btn btn-ghost -mt-1.5 min-h-11 self-start text-accent-700 sm:ml-4 sm:min-h-10"
                  aria-expanded={expanded.has(row.id)}
                  onClick={() => toggle(row)}
                >
                  {expanded.has(row.id) ? "Show less" : "Show more"}
                </button>
              ) : null}
              <div className="flex flex-wrap items-center gap-x-1 gap-y-2 sm:pl-5">
                <a
                  href={replyHref(row)}
                  onClick={() => setRead(row, true)}
                  className="btn btn-secondary mr-2 min-h-11 max-w-full gap-2 px-3.5 text-text sm:min-h-10"
                >
                  <span className="flex flex-none">
                    <Reply size={16} />
                  </span>
                  <span className="text-left [overflow-wrap:anywhere]">Reply to {row.email}</span>
                </a>
                <button
                  type="button"
                  className="btn btn-ghost min-h-11 text-accent-700 sm:min-h-10"
                  onClick={() => setRead(row, row.unread)}
                >
                  {row.unread ? "Mark as read" : "Mark as unread"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost min-h-11 gap-1.5 text-neutral-800 sm:min-h-10"
                  onClick={() => setDeleting(row)}
                >
                  <span className="flex">
                    <Trash size={16} />
                  </span>
                  Delete
                </button>
              </div>
            </article>
          );
        })}
        {loading
          ? [80, 60].map((width) => (
              <div
                key={width}
                className="flex flex-col gap-3 border-t border-divider px-[18px] py-5 sm:px-7 sm:py-6"
              >
                <span className="cm-shimmer block h-3.5 w-40 bg-neutral-200" />
                <span
                  className="cm-shimmer block h-3 bg-neutral-200"
                  style={{ width: `${width}%` }}
                />
              </div>
            ))
          : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        {cursor ? (
          <button
            type="button"
            className="btn btn-secondary min-h-11 px-[18px] sm:min-h-10"
            disabled={loading}
            onClick={() => void loadOlder()}
          >
            Load older messages
          </button>
        ) : null}
        <span className="text-sm text-neutral-700">
          {cursor
            ? `Showing ${shown} of ${Math.max(total, shown)}`
            : shown > 1
              ? `That's every message · ${shown} in total`
              : ""}
        </span>
      </div>
      <ConfirmDialog
        open={deleting !== null}
        title="Delete this message?"
        confirmLabel="Delete message"
        pendingLabel="Deleting…"
        cancelLabel="Keep it"
        tone="danger"
        pending={pending}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      >
        <span>It&apos;s deleted for good. Reply first if you still need it.</span>
        {deleting ? (
          <span className="flex flex-col gap-0.5 border border-divider px-3.5 py-3">
            <span className="font-medium text-text">
              {deleting.name}
              {deleting.topic ? ` · ${deleting.topic}` : ""}
            </span>
            <span className="truncate text-sm text-neutral-700">
              {deleting.message.replace(/\s+/g, " ")}
            </span>
          </span>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
