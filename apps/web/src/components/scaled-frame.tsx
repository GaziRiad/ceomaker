"use client";

import { DESIGN_WIDTH } from "@ceomaker/templates";
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Lays its content out at the 1280px design width and scales it to fit the frame with CSS zoom,
 * so previews look exactly like the live site at any size. Contents are inert: a preview is a
 * picture, not something to tab into or click through.
 */
export function ScaledFrame({
  children,
  initialZoom = 0.5,
  maxZoom = 1,
  className,
  style,
}: {
  children: ReactNode;
  /** Used for the server render, before the frame can be measured. */
  initialZoom?: number;
  maxZoom?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(initialZoom);

  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    const update = () => {
      const next = Math.min(maxZoom, element.clientWidth / DESIGN_WIDTH);
      if (next > 0) setZoom((current) => (Math.abs(current - next) > 0.002 ? next : current));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [maxZoom]);

  return (
    <div ref={frame} className={className} style={{ overflow: "hidden", ...style }}>
      <div inert style={{ width: DESIGN_WIDTH, zoom, pointerEvents: "none" }}>
        {children}
      </div>
    </div>
  );
}
