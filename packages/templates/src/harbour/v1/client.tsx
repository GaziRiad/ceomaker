"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Harbour's one client part: the menu on narrow pages. The header's links work without it; it
// only adds the sheet that holds them below 1000px.

export interface MenuItem {
  href: string;
  label: string;
}

/** A full-screen sheet with the sections, set large, and a Close pill. */
export function HarbourMenu({
  name,
  items,
  openLabel,
  closeLabel,
}: {
  name: string;
  items: MenuItem[];
  openLabel: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  // Drawn at the page root, not inside the header: the header's blur (backdrop-filter) makes it
  // the box a fixed sheet fills, which on iPhone squeezes the sheet into the bar.
  const [root, setRoot] = useState<HTMLElement | null>(null);
  useEffect(() => setRoot(openButton.current?.closest<HTMLElement>(".hb") ?? null), []);

  useEffect(() => {
    if (open) closeButton.current?.focus();
    else if (wasOpen.current) openButton.current?.focus();
    wasOpen.current = open;
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        ref={openButton}
        type="button"
        className="hb-pill hb-menu-button"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {openLabel}
      </button>
      {open && root
        ? createPortal(
            <div role="dialog" aria-modal="true" aria-label={openLabel} className="hb-menu">
              <div className="hb-bar">
                <span className="hb-brand">{name}</span>
                <button
                  ref={closeButton}
                  type="button"
                  className="hb-pill hb-menu-button"
                  onClick={() => setOpen(false)}
                >
                  {closeLabel}
                </button>
              </div>
              <nav aria-label="Sections" className="hb-menu-nav">
                {items.map((item, index) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="hb-menu-link"
                    style={{ animationDelay: `${40 + index * 40}ms` }}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>,
            root,
          )
        : null}
    </>
  );
}
