"use client";

import type { SocialKind } from "@ceomaker/schema";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";

// Tempo's client parts: the motion that needs script (reveals, the figures counting up, the
// header that steps aside, smooth scrolling, the magnetic button) and the phone menu. Each
// enhances markup that is complete without script: nothing is hidden until this runs, and it
// only hides what is still below the fold when the page loads.

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Inside the editor or a thumbnail: nothing moves. */
const isStatic = (element: Element | null) => !!element?.closest(".tp[data-static], [data-still]");

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
const pad2 = (value: number) => String(value).padStart(2, "0");

/** A figure's number and what's around it: "€410M" is "€", "410" and "M". */
const FIGURE = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/;

/** Counts a figure up from zero; only the number moves, "€" and "M" stay. */
function countUp(element: HTMLElement, value: string, from: boolean) {
  const node = element.firstChild;
  const match = value.match(FIGURE);
  if (!node || node.nodeType !== Node.TEXT_NODE || !match) return;
  const [, before = "", number = "", after = ""] = match;
  const target = parseFloat(number.replace(/,/g, ""));
  const decimals = (number.split(".")[1] ?? "").length;
  const commas = number.includes(",");
  const format = (current: number) => {
    let text = current.toFixed(decimals);
    if (commas) text = text.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return before + text + after;
  };
  if (from) {
    node.nodeValue = format(0);
    return;
  }
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / 1600);
    node.nodeValue = t < 1 ? format(target * easeOutExpo(t)) : value;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/**
 * The motion that needs script. Section titles, rows, tiles and figures still below the fold
 * when the page loads wait, then rise as they come into view, and figures count up. The header
 * gains a hairline once the page moves and slides away while reading down (after 520px),
 * returning on any scroll up or focus. With a mouse or trackpad the page eases toward where the
 * wheel sends it (lerp 0.1), and section links glide to their section. The closing button
 * follows the pointer. None of it runs under reduced motion, in the editor or in thumbnails,
 * except the header's hairline.
 */
export function TempoMotion() {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const root = marker.current?.closest<HTMLElement>(".tp");
    if (!root || isStatic(root)) return;
    const live = !reducedMotion();
    const cleanups: (() => void)[] = [];

    // The header.
    const header = root.querySelector<HTMLElement>(".tp-header");
    let last = window.scrollY;
    const onHeaderScroll = () => {
      if (!header) return;
      const y = window.scrollY;
      if (y > 8) header.dataset.sc = "";
      else delete header.dataset.sc;
      const menuOpen = !!root.querySelector(".tp-menu");
      if (live && y > last + 4 && y > 520 && !menuOpen) header.dataset.up = "";
      else if (y < last - 4 || y < 520) delete header.dataset.up;
      last = y;
    };
    onHeaderScroll();
    window.addEventListener("scroll", onHeaderScroll, { passive: true });
    cleanups.push(() => window.removeEventListener("scroll", onHeaderScroll));

    if (!live) return () => cleanups.forEach((cleanup) => cleanup());

    // Reveals and figures, armed a moment after load for what is still below the fold.
    let observer: IntersectionObserver | null = null;
    const arm = window.setTimeout(() => {
      const fold = window.innerHeight * 0.92;
      const waiting = [
        ...root.querySelectorAll<HTMLElement>("[data-rv], [data-sp], [data-count]"),
      ].filter((element) => element.getBoundingClientRect().top > fold);
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const element = entry.target as HTMLElement;
            observer?.unobserve(element);
            delete element.dataset.wait;
            if (element.dataset.count != null) countUp(element, element.dataset.v ?? "", false);
          }
        },
        { rootMargin: "0px 0px -12% 0px" },
      );
      for (const element of waiting) {
        element.dataset.wait = "";
        if (element.dataset.count != null) countUp(element, element.dataset.v ?? "", true);
        observer.observe(element);
      }
    }, 250);
    cleanups.push(() => {
      window.clearTimeout(arm);
      observer?.disconnect();
    });

    // The closing button follows the pointer by a quarter of its distance, within 300px.
    const closing = root.querySelector<HTMLElement>(".tp-cta");
    const magnet = closing?.querySelector<HTMLElement>(".tp-mag");
    if (closing && magnet) {
      const onMove = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        const box = magnet.getBoundingClientRect();
        const dx = event.clientX - (box.left + box.width / 2);
        const dy = event.clientY - (box.top + box.height / 2);
        const pull = Math.hypot(dx, dy) < 300 ? 0.24 : 0;
        magnet.style.transform = `translate(${(dx * pull).toFixed(1)}px, ${(dy * pull).toFixed(1)}px)`;
      };
      const onLeave = () => {
        magnet.style.transform = "";
      };
      closing.addEventListener("pointermove", onMove);
      closing.addEventListener("pointerleave", onLeave);
      cleanups.push(() => {
        closing.removeEventListener("pointermove", onMove);
        closing.removeEventListener("pointerleave", onLeave);
      });
    }

    // Smooth scrolling.
    const page = document.scrollingElement ?? document.documentElement;
    const html = document.documentElement;
    // The site stylesheet asks for smooth anchor scrolling; this takes over, and its own steps
    // must land at once.
    const previousBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    const fine = window.matchMedia("(pointer: fine)").matches;
    let target = page.scrollTop;
    let current = target;
    let frame = 0;
    let glide: { from: number; to: number; start: number; duration: number } | null = null;
    const max = () => page.scrollHeight - window.innerHeight;

    const tick = (now: number) => {
      if (glide) {
        const t = Math.min(1, (now - glide.start) / glide.duration);
        current = glide.from + (glide.to - glide.from) * easeOutExpo(t);
        if (t >= 1) {
          glide = null;
          target = current;
        }
      } else {
        current += (target - current) * 0.1;
        if (Math.abs(target - current) < 0.5) current = target;
      }
      page.scrollTop = current;
      frame = glide || current !== target ? requestAnimationFrame(tick) : 0;
    };

    const onWheel = (event: WheelEvent) => {
      if (!fine || event.ctrlKey || event.defaultPrevented) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const element = event.target instanceof Element ? event.target : null;
      if (element?.closest("textarea, [role=dialog], [data-gwrap]")) return;
      event.preventDefault();
      if (!frame) current = target = page.scrollTop;
      glide = null;
      const delta =
        event.deltaMode === 1
          ? event.deltaY * 16
          : event.deltaMode === 2
            ? event.deltaY * window.innerHeight
            : event.deltaY;
      target = Math.max(0, Math.min(max(), target + delta));
      if (!frame) frame = requestAnimationFrame(tick);
    };

    // Keys, the scrollbar and find-in-page scroll natively; follow them.
    const onScroll = () => {
      if (!frame) current = target = page.scrollTop;
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>('a[href^="#"]')
          : null;
      if (!link || !root.contains(link)) return;
      const id = decodeURIComponent(link.getAttribute("href")!.slice(1));
      const section = id ? document.getElementById(id) : null;
      if (!section) return;
      event.preventDefault();
      const from = page.scrollTop;
      const to = Math.max(0, Math.min(max(), section.getBoundingClientRect().top + from));
      glide = {
        from,
        to,
        start: performance.now(),
        duration: Math.min(1600, 700 + Math.abs(to - from) * 0.15),
      };
      current = from;
      // Keyboard users continue from the section they jumped to, as with a native jump.
      if (!section.hasAttribute("tabindex")) section.setAttribute("tabindex", "-1");
      section.focus({ preventScroll: true });
      if (!frame) frame = requestAnimationFrame(tick);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick);
    cleanups.push(() => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick);
      cancelAnimationFrame(frame);
      html.style.scrollBehavior = previousBehavior;
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);
  return <span ref={marker} hidden />;
}

export interface MenuItem {
  href: string;
  label: string;
}

export interface MenuLink extends MenuItem {
  kind: SocialKind;
}

/** The menu below desktop: a full-screen sheet of numbered sections, then the owner's links. */
export function TempoMenu({
  name,
  items,
  links,
  openLabel,
  closeLabel,
}: {
  name: string;
  items: MenuItem[];
  links: MenuLink[];
  openLabel: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  // The sheet is drawn at the page root, not inside the header: the header's blur
  // (backdrop-filter) makes it the box a fixed sheet fills, which on iPhone squeezes the menu
  // into the bar.
  const [root, setRoot] = useState<HTMLElement | null>(null);
  useEffect(() => setRoot(openButton.current?.closest<HTMLElement>(".tp") ?? null), []);

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
        className="tp-menu-button"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {openLabel}
      </button>
      {open && root
        ? createPortal(
            <div role="dialog" aria-modal="true" aria-label={openLabel} className="tp-menu">
              <div className="tp-menu-bar">
                <span className="tp-menu-name">{name}</span>
                <button
                  ref={closeButton}
                  type="button"
                  className="tp-menu-close"
                  onClick={() => setOpen(false)}
                >
                  {closeLabel}
                </button>
              </div>
              <nav aria-label="Sections" className="tp-menu-nav">
                {items.map((item, index) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="tp-menu-item"
                    style={{ animationDelay: `${50 + index * 50}ms` }}
                    onClick={() => setOpen(false)}
                  >
                    <span className="tp-menu-label">{item.label}</span>
                    <span aria-hidden="true" className="tp-menu-n">
                      {pad2(index + 1)}
                    </span>
                  </a>
                ))}
              </nav>
              {links.length ? (
                <div className="tp-menu-links">
                  {links.map((link, index) => {
                    const external = /^https?:\/\//.test(link.href);
                    return (
                      <a
                        key={index}
                        href={link.href}
                        {...(external ? { target: "_blank", rel: "noopener me" } : {})}
                        className="tp-menu-link"
                      >
                        <Icon kind={link.kind} size={15} />
                        {link.label}
                      </a>
                    );
                  })}
                </div>
              ) : null}
            </div>,
            root,
          )
        : null}
    </>
  );
}
