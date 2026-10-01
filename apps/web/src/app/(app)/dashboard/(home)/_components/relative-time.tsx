"use client";

import { useEffect, useState } from "react";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "Just now", "1 h ago", "Yesterday", "3 days ago", "2 weeks ago", then a date. */
export function relativeTime(date: Date, now: Date): string {
  const ago = now.getTime() - date.getTime();
  if (ago < MINUTE) return "Just now";
  if (ago < HOUR) return `${Math.floor(ago / MINUTE)} min ago`;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (date.getTime() >= startOfToday) return `${Math.floor(ago / HOUR)} h ago`;
  if (date.getTime() >= startOfToday - DAY) return "Yesterday";
  const days = Math.floor((startOfToday - date.getTime()) / DAY) + 1;
  if (days < 7) return `${days} days ago`;
  if (days < 30) return days < 14 ? "1 week ago" : `${Math.floor(days / 7)} weeks ago`;
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(date);
}

/** "Today, 10:22", "Yesterday, 14:12", "Mon 28 Sep, 09:14". */
export function messageTime(date: Date, now: Date): string {
  const time = new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(date);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (date.getTime() >= startOfToday) return `Today, ${time}`;
  if (date.getTime() >= startOfToday - DAY) return `Yesterday, ${time}`;
  const day = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  }).format(date);
  return `${day}, ${time}`;
}

/**
 * A time in the reader's own time zone. The server renders a neutral UTC date, the browser swaps
 * in the local wording after hydration, so the two never disagree.
 */
export function When({ iso, style }: { iso: string; style: "relative" | "message" | "day" }) {
  const [text, setText] = useState(() =>
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: style === "day" ? "long" : "short",
      ...(style === "day" ? { year: "numeric" } : {}),
      timeZone: "UTC",
    }).format(new Date(iso)),
  );
  useEffect(() => {
    const date = new Date(iso);
    const now = new Date();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- local time zone is client-only
    setText(
      style === "relative"
        ? relativeTime(date, now)
        : style === "message"
          ? messageTime(date, now)
          : new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(date),
    );
  }, [iso, style]);
  return <time dateTime={iso}>{text}</time>;
}
