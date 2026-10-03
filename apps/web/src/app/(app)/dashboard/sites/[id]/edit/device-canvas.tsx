"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AddressBar, Blueprint } from "@/components/ui";
import { DEVICES, type Device } from "./devices";

/** Tallest the device screens get; on shorter canvases the outline gets shorter instead. */
const SCREEN_HEIGHT = { tablet: 1180, phone: 844 } as const;
/** Device outlines: padding around the screen, and the outer and screen corner radii. */
const BEZEL = {
  tablet: { pad: 14, radius: 34, screen: 20 },
  phone: { pad: 12, radius: 48, screen: 36 },
} as const;
const MIN_SCREEN = 420;
/** How long the selection ring stays before fading. */
const RING_MS = 2500;
const TOOLBAR = 56;
const GUTTER = 24;
const BOTTOM = 28;

const ICONS: Record<Device, string[]> = {
  desktop: [
    "M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
    "M8 21h8M12 17v4",
  ],
  tablet: ["M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z", "M12 18h.01"],
  phone: ["M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z", "M12 18h.01"],
};

interface Ring {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * The editor's canvas: a Desktop, Tablet and Phone switch, and the page drawn at the real width
 * of the chosen device. Templates lay out by container width, so a 390px box shows the phone
 * layout. The page only scales down when the canvas is too narrow, and says by how much.
 *
 * The selected section is ringed briefly and scrolled into view on every switch; clicking anywhere on
 * the page selects the section under the pointer.
 */
export function DeviceCanvas({
  device,
  onDevice,
  address,
  selectedLabel,
  findSection,
  sectionAt,
  onSelect,
  scrollKey,
  children,
}: {
  device: Device;
  onDevice: (device: Device) => void;
  address: string;
  /** Name of the selected section, for the ring's label; null hides the ring. */
  selectedLabel: string | null;
  /** The selected section's element inside the page. */
  findSection: (root: HTMLElement) => HTMLElement | null;
  /** The section containing an element, by id. */
  sectionAt: (root: HTMLElement, target: Element) => string | null;
  onSelect: (sectionId: string) => void;
  /** Changes when the selection should be scrolled into view (a pick in the sidebar). */
  scrollKey: unknown;
  children: ReactNode;
}) {
  const canvas = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [ring, setRing] = useState<Ring | null>(null);
  const pendingScroll = useRef(true);

  // The ring shows when the selection or the size changes, then fades so it doesn't sit over
  // the page while the owner reads or edits it.
  const flashKey = `${selectedLabel}|${device}|${String(scrollKey)}`;
  const [flash, setFlash] = useState({ key: flashKey, on: true });
  if (flash.key !== flashKey) setFlash({ key: flashKey, on: true });
  useEffect(() => {
    if (!flash.on) return;
    const timer = setTimeout(() => setFlash((current) => ({ ...current, on: false })), RING_MS);
    return () => clearTimeout(timer);
  }, [flash]);

  useLayoutEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const update = () =>
      setSize((current) =>
        Math.abs(current.width - element.clientWidth) > 1 ||
        Math.abs(current.height - element.clientHeight) > 1
          ? { width: element.clientWidth, height: element.clientHeight }
          : current,
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const width = DEVICES[device].width;
  const bezel = device === "desktop" ? 0 : (BEZEL[device].pad + 1) * 2;
  const available = (size.width || 1280) - GUTTER * 2;
  const scale = Math.min(1, available / (width + bezel));
  const screenHeight =
    device === "desktop"
      ? 0
      : Math.round(
          Math.min(
            SCREEN_HEIGHT[device],
            Math.max(MIN_SCREEN, ((size.height || 900) - TOOLBAR - BOTTOM - bezel) / scale),
          ),
        );

  const measure = useCallback(() => {
    const root = page.current;
    const target = root && selectedLabel ? findSection(root) : null;
    if (!root || !target) {
      setRing(null);
      return;
    }
    const a = target.getBoundingClientRect();
    const b = root.getBoundingClientRect();
    const next = {
      top: Math.round((a.top - b.top) / scale),
      left: Math.round((a.left - b.left) / scale),
      width: Math.round(a.width / scale),
      height: Math.round(a.height / scale),
    };
    setRing((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
    if (pendingScroll.current) {
      pendingScroll.current = false;
      if (device === "desktop") {
        const scroller = canvas.current;
        if (scroller) {
          const top = a.top - scroller.getBoundingClientRect().top + scroller.scrollTop - 72;
          scroller.scrollTop = Math.max(0, top);
        }
      } else if (screen.current) {
        const scroller = screen.current;
        const top =
          (a.top - scroller.getBoundingClientRect().top) / scale + scroller.scrollTop - 12;
        scroller.scrollTop = Math.max(0, top);
      }
    }
  }, [device, findSection, scale, selectedLabel]);

  // Scroll to the selection on a size switch or a pick in the sidebar, not on page clicks.
  useEffect(() => {
    pendingScroll.current = true;
  }, [device, scrollKey]);

  // Templates settle over a few frames (fonts, images), so measure again shortly after.
  useLayoutEffect(() => {
    measure();
    const timers = [80, 300, 900].map((ms) => setTimeout(measure, ms));
    const root = page.current;
    const observer = root ? new ResizeObserver(() => measure()) : null;
    if (root && observer) observer.observe(root);
    return () => {
      timers.forEach(clearTimeout);
      observer?.disconnect();
    };
  }, [measure, children]);

  const onClickCapture = (event: React.MouseEvent) => {
    const root = page.current;
    if (!root || !(event.target instanceof Element)) return;
    if (event.target.closest("a")) event.preventDefault();
    const id = sectionAt(root, event.target);
    if (id) onSelect(id);
  };

  const ringBox =
    ring && selectedLabel ? (
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: ring.top,
          left: ring.left,
          width: ring.width,
          height: ring.height,
          boxSizing: "border-box",
          border: `${2 / scale}px solid var(--color-accent)`,
          pointerEvents: "none",
          zIndex: 30,
          opacity: flash.on ? 1 : 0,
          transition: "opacity 400ms ease",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            padding: `${4 / scale}px ${10 / scale}px`,
            background: "var(--color-accent-700)",
            color: "var(--color-neutral-100)",
            fontFamily: "var(--font-body)",
            fontSize: 13 / scale,
            lineHeight: 1.3,
            whiteSpace: "nowrap",
          }}
        >
          {selectedLabel} · Click any text to edit
        </span>
      </div>
    ) : null;

  const pageBox = (
    <div
      ref={page}
      onClickCapture={onClickCapture}
      style={{ position: "relative", width, cursor: "text" }}
    >
      {children}
      {ringBox}
    </div>
  );

  return (
    <div
      ref={canvas}
      className="flex min-h-0 flex-col overflow-auto bg-surface"
      style={{ scrollbarWidth: "none" }}
    >
      <div
        className="sticky top-0 z-40 flex flex-none items-center justify-center gap-4 bg-surface"
        style={{ height: TOOLBAR, padding: `0 ${GUTTER}px` }}
      >
        <div className="seg bg-neutral-100" role="radiogroup" aria-label="Preview size">
          {(Object.keys(DEVICES) as Device[]).map((key) => (
            <label
              key={key}
              className="seg-opt"
              title={`${DEVICES[key].width} px wide`}
              style={{ gap: 8, paddingInline: 14 }}
            >
              <input
                type="radio"
                name="preview-size"
                checked={device === key}
                onChange={() => onDevice(key)}
              />
              <svg
                aria-hidden
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {ICONS[key].map((d) => (
                  <path key={d} d={d} />
                ))}
              </svg>
              <span className="hidden sm:inline">{DEVICES[key].label}</span>
            </label>
          ))}
        </div>
        <span
          className="hidden text-[13px] whitespace-nowrap text-neutral-700 tabular-nums sm:inline"
          style={{ minWidth: 150 }}
        >
          <span className="font-medium text-text">{width} px</span>
          {scale < 0.995 ? ` · shown at ${Math.round(scale * 100)}%` : " · actual size"}
        </span>
      </div>
      <div
        className="flex flex-none justify-center"
        style={{ padding: `0 ${GUTTER}px ${BOTTOM}px` }}
      >
        {device === "desktop" ? (
          <Blueprint
            className="flex-none bg-neutral-100 shadow-md"
            style={{ width: Math.round(1280 * scale) }}
          >
            <AddressBar address={address} />
            <div style={{ overflow: "hidden", contain: "paint" }}>
              <div style={{ zoom: scale }}>{pageBox}</div>
            </div>
          </Blueprint>
        ) : (
          <div className="flex-none" style={{ zoom: scale }}>
            <div
              className="shadow-md"
              style={{
                padding: BEZEL[device].pad,
                borderRadius: BEZEL[device].radius,
                background: "var(--color-neutral-100)",
                border: "1px solid var(--color-neutral-300)",
              }}
            >
              <div
                ref={screen}
                style={{
                  width,
                  height: screenHeight,
                  overflow: "auto",
                  contain: "paint",
                  borderRadius: BEZEL[device].screen,
                  background: "#fff",
                  boxShadow: "0 0 0 1px var(--color-divider)",
                  scrollbarWidth: "none",
                }}
              >
                {pageBox}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
