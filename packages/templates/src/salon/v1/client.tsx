"use client";

import type { SocialKind } from "@ceomaker/schema";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./icons";

/**
 * Depth for the hero's photos: they shift a little against the pointer, nearer ones more, and
 * part from the name as the page scrolls. Sets --sl-mx, --sl-my (pointer, -1 to 1) and --sl-sp
 * (how far the hero has scrolled away, 0 to 1); salon.css turns them into movement. Nothing
 * runs under reduced motion or in thumbnails, and without it the photos simply stay put.
 */
export function SalonDrift() {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const hero = marker.current?.closest<HTMLElement>(".sl-hero");
    if (!hero || hero.closest("[data-still]")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const clamp = (value: number) => Math.min(1, Math.max(-1, value));
    const target = { x: 0, y: 0 };
    const now = { x: 0, y: 0 };
    let frame = 0;
    const tick = () => {
      frame = 0;
      now.x += (target.x - now.x) * 0.06;
      now.y += (target.y - now.y) * 0.06;
      const box = hero.getBoundingClientRect();
      const scrolled = Math.min(1, Math.max(0, -box.top / Math.max(1, box.height)));
      hero.style.setProperty("--sl-mx", now.x.toFixed(4));
      hero.style.setProperty("--sl-my", now.y.toFixed(4));
      hero.style.setProperty("--sl-sp", scrolled.toFixed(4));
      // Keep easing toward the pointer until it's there.
      if (Math.abs(target.x - now.x) + Math.abs(target.y - now.y) > 0.002) schedule();
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const onPointer = (event: PointerEvent) => {
      const box = hero.getBoundingClientRect();
      if (box.bottom < 0 || box.top > window.innerHeight) return;
      target.x = clamp((event.clientX - (box.left + box.width / 2)) / (box.width / 2));
      target.y = clamp((event.clientY - (box.top + box.height / 2)) / (box.height / 2));
      schedule();
    };
    const pointer = window.matchMedia("(pointer: fine)").matches;
    if (pointer) window.addEventListener("pointermove", onPointer, { passive: true });
    // Scroll events don't bubble; capturing them catches the editor's scrolling canvas too.
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      if (pointer) window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", schedule, { capture: true });
      for (const name of ["--sl-mx", "--sl-my", "--sl-sp"]) hero.style.removeProperty(name);
    };
  }, []);
  return <span ref={marker} hidden />;
}

export interface MenuItem {
  href: string;
  label: string;
}

/** The menu on narrow pages: a full-screen sheet of numbered sections, then the contact links. */
export function SalonMenu({
  name,
  items,
  links,
  openLabel,
  closeLabel,
}: {
  name: string;
  items: MenuItem[];
  links: (MenuItem & { kind: SocialKind })[];
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
        className="sl-bracket sl-menu-button"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {openLabel}
      </button>
      {open ? (
        <div role="dialog" aria-modal="true" aria-label={openLabel} className="sl-menu">
          <div className="sl-menu-top">
            <span className="sl-menu-name">{name}</span>
            <button
              ref={closeButton}
              type="button"
              className="sl-bracket sl-menu-button"
              onClick={() => setOpen(false)}
            >
              {closeLabel}
            </button>
          </div>
          <nav aria-label="Sections" className="sl-menu-nav">
            {items.map((item, index) => (
              <a
                key={item.href}
                href={item.href}
                className="sl-menu-item"
                style={{ animationDelay: `${50 + index * 50}ms` }}
                onClick={() => setOpen(false)}
              >
                <span className="sl-menu-n">{String(index + 1).padStart(2, "0")}</span>
                <span className="sl-menu-label">{item.label}</span>
              </a>
            ))}
          </nav>
          {links.length ? (
            <div className="sl-menu-links">
              {links.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  target="_blank"
                  rel="noopener me"
                  aria-label={link.label}
                  title={link.label}
                  className="sl-icon-link"
                >
                  <Icon kind={link.kind} />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/**
 * Testimonials one at a time on a scroll-snap track, so they swipe and scroll without script.
 * The counter and arrows are an enhancement on top.
 */
export function SalonQuotes({
  count,
  label,
  previous,
  next,
  children,
}: {
  count: number;
  label: string;
  previous: string;
  next: string;
  children: ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const current = Math.max(0, Math.min(at, count - 1));

  const onScroll = () => {
    const element = track.current;
    if (!element) return;
    const index = Math.round(element.scrollLeft / Math.max(1, element.clientWidth));
    if (index !== at) setAt(index);
  };

  const go = (step: number) => {
    const element = track.current;
    if (!element) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollBy({ left: step * element.clientWidth, behavior: still ? "auto" : "smooth" });
  };

  const pad = (value: number) => String(value).padStart(2, "0");

  return (
    <>
      <div
        ref={track}
        className="sl-track"
        tabIndex={0}
        role="region"
        aria-label={label}
        onScroll={onScroll}
      >
        {children}
      </div>
      {count > 1 ? (
        <div className="sl-track-bar">
          <span aria-live="polite" className="sl-counter">
            <span className="sl-counter-now">{pad(current + 1)}</span> / {pad(count)}
          </span>
          <span className="sl-arrows">
            <button
              type="button"
              className="sl-bracket sl-arrow"
              aria-label={previous}
              disabled={current <= 0}
              onClick={() => go(-1)}
            >
              ←
            </button>
            <button
              type="button"
              className="sl-bracket sl-arrow"
              aria-label={next}
              disabled={current >= count - 1}
              onClick={() => go(1)}
            >
              →
            </button>
          </span>
        </div>
      ) : null}
    </>
  );
}
