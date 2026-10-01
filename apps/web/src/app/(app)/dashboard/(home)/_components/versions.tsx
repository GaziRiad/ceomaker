"use client";

import Link from "next/link";
import { useState } from "react";
import { LocalTime } from "../../local-time";

export interface VersionItem {
  id: string;
  number: number;
  /** ISO timestamp. */
  publishedAt: string;
  /** "Meridian · design 1" */
  template: string;
  isCurrent: boolean;
}

const SHOWN = 5;

/** Published versions, newest first: the latest five, then all on request. */
export function Versions({ siteId, rows }: { siteId: string; rows: VersionItem[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, SHOWN);
  const action = (row: VersionItem, phone: boolean) =>
    row.isCurrent ? (
      <span className="tag tag-accent">Current</span>
    ) : (
      <Link
        href={`/dashboard/sites/${siteId}/versions/${row.id}`}
        aria-label={`View version ${row.number}`}
        className={`text-accent-700 hover:text-accent-600 ${phone ? "flex min-h-11 items-center px-1 text-[15px]" : "text-sm"}`}
      >
        View
      </Link>
    );

  return (
    <>
      {/* The .table class shares its name with Tailwind's display utility, so a wrapper toggles. */}
      <div className="hidden sm:block">
        <table className="table text-[15px]">
          <thead>
            <tr>
              <th scope="col">Version</th>
              <th scope="col">Published</th>
              <th scope="col">Template</th>
              <th scope="col" className="text-right">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.id}>
                <td className="py-3.5">Version {row.number}</td>
                <td className="text-neutral-700">
                  <LocalTime iso={row.publishedAt} />
                </td>
                <td className="text-neutral-700">{row.template}</td>
                <td className="text-right">{action(row, false)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col border-t border-divider sm:hidden">
        {shown.map((row) => (
          <div
            key={row.id}
            className="flex items-center gap-3 border-b border-[color-mix(in_srgb,var(--color-text)_8%,transparent)] py-3.5"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-medium">Version {row.number}</span>
              <span className="text-sm text-neutral-700">
                <LocalTime iso={row.publishedAt} /> · {row.template}
              </span>
            </div>
            {action(row, true)}
          </div>
        ))}
      </div>
      {rows.length > SHOWN ? (
        <button
          type="button"
          className="btn btn-ghost self-start pl-0 text-accent-700"
          aria-expanded={all}
          onClick={() => setAll((current) => !current)}
        >
          {all ? "Show the latest five" : `Show all ${rows.length} versions`}
        </button>
      ) : null}
    </>
  );
}
