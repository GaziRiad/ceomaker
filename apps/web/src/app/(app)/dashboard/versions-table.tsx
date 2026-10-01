"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export interface VersionRow {
  id: string;
  number: number;
  publishedAt: string;
  templateName: string;
  isCurrent: boolean;
}

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

export function VersionsTable({ siteId, rows }: { siteId: string; rows: VersionRow[] }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th scope="col">Version</th>
          <th scope="col">Published</th>
          <th scope="col">Template</th>
          <th scope="col">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={4} className="text-neutral-700">
              Not published yet. Your first publish appears here.
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.id}>
              <td>Version {row.number}</td>
              <td className="text-neutral-700">
                <LocalTime iso={row.publishedAt} />
              </td>
              <td className="text-neutral-700">{row.templateName}</td>
              <td className="text-right whitespace-nowrap">
                {row.isCurrent ? <span className="tag tag-accent mr-3">Live</span> : null}
                <Link
                  href={`/dashboard/sites/${siteId}/versions/${row.id}`}
                  className="btn btn-ghost"
                  aria-label={`View version ${row.number}`}
                >
                  View
                </Link>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
