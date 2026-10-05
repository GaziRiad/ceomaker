"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Arrow } from "./icons";

// Folio's client parts: the phone menu, the work carousel's controls and smooth scrolling. Each
// enhances markup that already works without script: links jump, the carousel scrolls and
// snaps natively, and nothing is hidden waiting for JavaScript.

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Inside the editor or a thumbnail: no smooth scrolling, no dragging, no dimming. */
const isStatic = (element: Element | null) => !!element?.closest(".fo[data-static], [data-still]");

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
const pad2 = (value: number) => String(value).padStart(2, "0");

/**
 * Smooth scrolling, as the design asks: with a mouse or trackpad the page eases toward where the
 * wheel sends it (like Lenis with lerp 0.1), and section links glide to their section. Off on
 * touch (native scrolling), under reduced motion, in the editor and in thumbnails.
 */
export function FolioSmooth() {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const root = marker.current?.closest<HTMLElement>(".fo");
    if (!root || isStatic(root) || reducedMotion()) return;
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
      if (element?.closest("textarea, [role=dialog]")) return;
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

    const onClick = (event: globalThis.MouseEvent) => {
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
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick);
      cancelAnimationFrame(frame);
      html.style.scrollBehavior = previousBehavior;
    };
  }, []);
  return <span ref={marker} hidden />;
}

export interface MenuItem {
  href: string;
  label: string;
}

/** The menu on narrow pages: a full-screen sheet of numbered sections and the hero's button. */
export function FolioMenu({
  name,
  items,
  button,
  openLabel,
  closeLabel,
}: {
  name: string;
  items: MenuItem[];
  button: MenuItem | null;
  openLabel: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  // The sheet is drawn at the page root, not inside the header: the header bar's blur
  // (backdrop-filter) makes it the box a fixed sheet fills, which on iPhone squeezed the menu
  // into the bar.
  const [root, setRoot] = useState<HTMLElement | null>(null);
  useEffect(() => setRoot(openButton.current?.closest<HTMLElement>(".fo") ?? null), []);

  useEffect(() => {
    if (open) closeButton.current?.focus();
    else if (wasOpen.current) openButton.current?.focus();
    wasOpen.current = open;
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
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
        className="fo-pill fo-menu-button"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {openLabel}
      </button>
      {open && root
        ? createPortal(
            <div role="dialog" aria-modal="true" aria-label={openLabel} className="fo-menu">
              <div className="fo-bar fo-menu-bar">
                <span className="fo-brand">
                  <span aria-hidden="true" className="fo-mark" />
                  <span className="fo-brand-name">{name}</span>
                </span>
                <button
                  ref={closeButton}
                  type="button"
                  className="fo-pill fo-menu-close"
                  onClick={() => setOpen(false)}
                >
                  {closeLabel}
                </button>
              </div>
              <nav aria-label="Sections" className="fo-menu-nav">
                {items.map((item, index) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="fo-menu-item"
                    style={{ animationDelay: `${40 + index * 40}ms` }}
                    onClick={() => setOpen(false)}
                  >
                    <span className="fo-menu-label">{item.label}</span>
                    <span aria-hidden="true" className="fo-menu-n">
                      {pad2(index + 1)}
                    </span>
                  </a>
                ))}
              </nav>
              {button ? (
                <a
                  href={button.href}
                  className="fo-pill fo-cta-pill fo-menu-cta"
                  onClick={() => setOpen(false)}
                >
                  {button.label} <span aria-hidden="true">→</span>
                </a>
              ) : null}
            </div>,
            root,
          )
        : null}
    </>
  );
}

/**
 * The work carousel. The track is a native scroll-snap row that swipes and scrolls without
 * script; this adds the arrows, ←/→/Home/End, mouse dragging with a glide to the nearest
 * project, the counter and progress bar, and dims the projects at the edges. Controls stay
 * hidden until it runs.
 */
export function FolioCarousel({
  count,
  labelledBy,
  previous,
  next,
  title,
  children,
}: {
  count: number;
  /** The id of the section title, which names the carousel. */
  labelledBy: string;
  previous: string;
  next: string;
  title: ReactNode;
  children: ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [still, setStill] = useState(true);
  const [at, setAt] = useState(0);
  const current = Math.max(0, Math.min(at, count - 1));
  const glideFrame = useRef(0);
  const scrollFrame = useRef(0);
  const drag = useRef<{ x: number; left: number; moved: number; from: number } | null>(null);
  const swallowClick = useRef(false);

  useEffect(() => {
    setStill(isStatic(track.current));
    setReady(true);
    return () => {
      cancelAnimationFrame(glideFrame.current);
      cancelAnimationFrame(scrollFrame.current);
    };
  }, []);

  const slides = useCallback(
    () => Array.from(track.current?.querySelectorAll<HTMLElement>(":scope > .fo-slide") ?? []),
    [],
  );

  const offset = useCallback(
    (index: number) => {
      const element = track.current;
      const slide = slides()[index];
      if (!element || !slide) return 0;
      return slide.offsetLeft - (parseFloat(getComputedStyle(element).paddingLeft) || 0);
    },
    [slides],
  );

  const nearest = useCallback(() => {
    const element = track.current;
    if (!element) return 0;
    let best = 0;
    let distance = Infinity;
    slides().forEach((_, index) => {
      const gap = Math.abs(offset(index) - element.scrollLeft);
      if (gap < distance) {
        distance = gap;
        best = index;
      }
    });
    return best;
  }, [offset, slides]);

  // The project in focus is marked; the others dim, and their links leave the tab order.
  useEffect(() => {
    slides().forEach((slide, index) => {
      const active = index === current;
      slide.toggleAttribute("data-active", active);
      for (const link of slide.querySelectorAll("a")) {
        if (active || still) link.removeAttribute("tabindex");
        else link.setAttribute("tabindex", "-1");
      }
    });
  });

  const glideTo = (left: number) => {
    const element = track.current;
    if (!element) return;
    cancelAnimationFrame(glideFrame.current);
    if (reducedMotion()) {
      element.scrollLeft = left;
      return;
    }
    const from = element.scrollLeft;
    const start = performance.now();
    // Snapping would fight the glide; it comes back on arrival.
    element.dataset.free = "";
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      element.scrollLeft = from + (left - from) * easeOutCubic(t);
      if (t < 1) glideFrame.current = requestAnimationFrame(step);
      else delete element.dataset.free;
    };
    glideFrame.current = requestAnimationFrame(step);
  };

  const goTo = (index: number) => {
    const to = Math.max(0, Math.min(count - 1, index));
    setAt(to);
    glideTo(offset(to));
  };

  const onScroll = () => {
    const element = track.current;
    if (!element || scrollFrame.current || drag.current || "free" in element.dataset) return;
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = 0;
      setAt(nearest());
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const to =
      event.key === "ArrowRight"
        ? current + 1
        : event.key === "ArrowLeft"
          ? current - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? count - 1
              : null;
    if (to === null) return;
    event.preventDefault();
    goTo(to);
  };

  const onPointerMove = (event: PointerEvent) => {
    const element = track.current;
    const state = drag.current;
    if (!element || !state) return;
    const dx = event.clientX - state.x;
    state.moved = Math.max(state.moved, Math.abs(dx));
    if (state.moved > 5) {
      element.dataset.free = "";
      element.dataset.drag = "";
      element.scrollLeft = state.left - dx;
    }
  };

  const onPointerUp = (event: PointerEvent) => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    const element = track.current;
    const state = drag.current;
    drag.current = null;
    if (!element || !state) return;
    delete element.dataset.drag;
    if (state.moved <= 5) {
      delete element.dataset.free;
      return;
    }
    // A drag never opens a link.
    swallowClick.current = true;
    setTimeout(() => (swallowClick.current = false), 60);
    const dx = event.clientX - state.x;
    let to = nearest();
    if (to === state.from && Math.abs(dx) > 60) to += dx < 0 ? 1 : -1;
    goTo(to);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const element = track.current;
    if (still || !element || event.pointerType !== "mouse" || event.button !== 0) return;
    cancelAnimationFrame(glideFrame.current);
    drag.current = { x: event.clientX, left: element.scrollLeft, moved: 0, from: current };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (swallowClick.current) {
      event.preventDefault();
      event.stopPropagation();
      swallowClick.current = false;
      return;
    }
    if (still) return;
    // A click on a project at the edge brings it into focus instead of following its link.
    const slide = event.target instanceof Element ? event.target.closest(".fo-slide") : null;
    const index = slide ? slides().indexOf(slide as HTMLElement) : -1;
    if (index >= 0 && index !== current) {
      event.preventDefault();
      event.stopPropagation();
      goTo(index);
    }
  };

  const controls = (size: number) => (
    <>
      <span aria-live="polite" className="fo-counter">
        <span>{pad2(current + 1)}</span>
        <span className="fo-counter-of"> / {pad2(count)}</span>
      </span>
      <button
        type="button"
        className="fo-arrow"
        aria-label={previous}
        disabled={current <= 0}
        onClick={() => goTo(current - 1)}
      >
        <Arrow back size={size} />
      </button>
      <button
        type="button"
        className="fo-arrow fo-arrow-next"
        aria-label={next}
        disabled={current >= count - 1}
        onClick={() => goTo(current + 1)}
      >
        <Arrow size={size} />
      </button>
    </>
  );

  return (
    <>
      <div className="fo-work-head">
        {title}
        <div className="fo-ctl fo-ctl-top" data-on={ready || undefined}>
          {controls(20)}
        </div>
      </div>
      <div
        ref={track}
        data-rise=""
        className="fo-track"
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-labelledby={labelledBy}
        data-dim={(ready && !still) || undefined}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onClickCapture={onClickCapture}
        onDragStart={(event) => event.preventDefault()}
      >
        {children}
      </div>
      <div className="fo-work-foot" data-on={ready || undefined}>
        <div aria-hidden="true" className="fo-progress">
          <span style={{ width: `${(((current + 1) / Math.max(1, count)) * 100).toFixed(2)}%` }} />
        </div>
        <div className="fo-ctl fo-ctl-bottom">{controls(18)}</div>
      </div>
    </>
  );
}
