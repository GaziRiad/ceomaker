"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Sections below the fold wipe in once as they arrive. Runs only after the page has loaded, so
 * nothing is ever hidden waiting for a script: without it (or with reduced motion, or in a
 * thumbnail) every section is simply there. Sections already on screen never animate.
 */
export function MonumentMotion() {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const root = marker.current?.closest<HTMLElement>(".mon");
    if (!root || !("IntersectionObserver" in window)) return;
    if (root.closest("[data-still]")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const below = [...root.querySelectorAll<HTMLElement>("[data-wipe]")].filter(
      (section) => section.getBoundingClientRect().top > window.innerHeight,
    );
    if (!below.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const section = entry.target as HTMLElement;
          observer.unobserve(section);
          section.querySelectorAll<HTMLElement>("[data-rise]").forEach((item, index) => {
            item.style.setProperty("--mon-i", String(index));
          });
          section.dataset.wipe = "play";
        }
      },
      { threshold: 0.12 },
    );
    for (const section of below) {
      section.dataset.wipe = "wait";
      observer.observe(section);
    }
    return () => {
      observer.disconnect();
      for (const section of below) section.dataset.wipe = "";
    };
  }, []);
  return <span ref={marker} hidden />;
}

export interface MenuItem {
  href: string;
  label: string;
}

/** The phone menu: a full-screen sheet of the section titles and the contact button. */
export function MonumentMenu({
  name,
  items,
  contact,
  openLabel,
  closeLabel,
}: {
  name: string;
  items: MenuItem[];
  contact: MenuItem;
  openLabel: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

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
        className="mon-menu-button"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {openLabel}
        <span aria-hidden="true" className="mon-burger">
          <span />
          <span />
        </span>
      </button>
      {open ? (
        <div role="dialog" aria-modal="true" aria-label={openLabel} className="mon-menu">
          <div className="mon-menu-top">
            <span className="mon-menu-name">{name}</span>
            <button
              ref={closeButton}
              type="button"
              className="mon-menu-button"
              onClick={() => setOpen(false)}
            >
              {closeLabel} <span aria-hidden="true">✕</span>
            </button>
          </div>
          <nav aria-label="Sections" className="mon-menu-nav">
            {items.map((item, index) => (
              <a
                key={item.href}
                href={item.href}
                className="mon-menu-item"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <a href={contact.href} className="mon-menu-contact" onClick={() => setOpen(false)}>
            {contact.label}
            <span aria-hidden="true" className="mon-dot-arrow">
              →
            </span>
          </a>
        </div>
      ) : null}
    </>
  );
}
