"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "@/components/icons";
import { CARD_GRID, cardColumns, cardDelay } from "../landing/columns";

const PAGE = 12;

/**
 * Every template card, a page at a time: the server sends the first page, and "Show more
 * templates" adds the next one in place, moves focus to its first card and says so to screen
 * readers. No counts anywhere: the catalogue keeps growing.
 */
export function TemplateGrid({ cards }: { cards: { key: string; card: ReactNode }[] }) {
  const [shown, setShown] = useState(PAGE);
  const [announcement, setAnnouncement] = useState("");
  const list = useRef<HTMLUListElement>(null);
  const focusFrom = useRef<number | null>(null);
  const visible = cards.slice(0, shown);

  useEffect(() => {
    if (focusFrom.current === null) return;
    list.current?.children[focusFrom.current]?.querySelector("a")?.focus();
    focusFrom.current = null;
  }, [shown]);

  const showMore = () => {
    focusFrom.current = shown;
    setShown(shown + PAGE);
    setAnnouncement("More templates added below.");
  };

  return (
    <>
      <ul ref={list} className={CARD_GRID}>
        {visible.map(({ key, card }, index) => (
          <li
            key={key}
            data-reveal=""
            className={`flex flex-col ${cardColumns(index, visible.length)}`}
            style={cardDelay(index)}
          >
            {card}
          </li>
        ))}
      </ul>
      {shown < cards.length ? (
        <button
          type="button"
          onClick={showMore}
          className="btn btn-secondary mt-10 min-h-12 w-full gap-2 sm:mx-auto sm:mt-14 sm:w-auto sm:min-w-[240px]"
          style={{ padding: "12px 20px", fontSize: 16, justifyContent: "center" }}
        >
          Show more templates <ChevronDown size={16} />
        </button>
      ) : null}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
