"use client";

import { useEffect, useState } from "react";

/** Formats in the visitor's own time zone once mounted; the server render shows UTC. */
export function LocalTime({ iso }: { iso: string }) {
  const [text, setText] = useState(
    () =>
      new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(new Date(iso)) + " UTC",
  );
  useEffect(() => {
    const date = new Date(iso);
    const today = new Date();
    const time = new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(date);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- local time zone is client-only
    setText(
      date.toDateString() === today.toDateString()
        ? `Today, ${time}`
        : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
            date,
          ),
    );
  }, [iso]);
  return <time dateTime={iso}>{text}</time>;
}
