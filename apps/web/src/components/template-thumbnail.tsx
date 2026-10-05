"use client";

import {
  resolvePhotoGrade,
  resolveSiteColors,
  type PhotoGrade,
  type RenderableSiteContent,
  type SiteColors,
  type TemplateKey,
  type ThemeSettings,
} from "@ceomaker/schema";
import { buildSiteModel, TemplateView } from "@ceomaker/templates";
import { memo, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { ScaledFrame } from "./scaled-frame";

// A template card's picture, drawn from the owner's own content. Lists of templates grow, so a
// card costs as little as possible: it draws only the top of the page (all it shows), only
// while it's on screen or about to be, and not again for edits further down the page.

/** Thumbnails show no footer, so no date appears; any fixed one keeps renders identical. */
const THUMBNAIL_DATE = new Date("2026-01-01T00:00:00Z");

/** The nearest ancestor that scrolls, such as the editor's side panel; null for the page. */
function scrollParent(element: HTMLElement): HTMLElement | null {
  for (
    let node = element.parentElement;
    node && node !== document.body;
    node = node.parentElement
  ) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
  }
  return null;
}

/** True while the element is on screen, or within half a screen of it, in whatever scrolls it. */
function useNearScreen(ref: RefObject<HTMLElement | null>, initial: boolean): boolean {
  const [near, setNear] = useState(initial);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => setNear(entries.at(-1)?.isIntersecting ?? false),
      { root: scrollParent(element), rootMargin: "50% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return near;
}

interface DrawnProps {
  templateKey: TemplateKey;
  templateVersion: number;
  colors: SiteColors;
  photoGrade: PhotoGrade;
  content: RenderableSiteContent;
  /** What the thumbnail draws from: equal fingerprints draw the same picture. */
  fingerprint: string;
}

const Drawn = memo(
  function Drawn({ templateKey, templateVersion, colors, photoGrade, content }: DrawnProps) {
    return (
      <TemplateView
        templateKey={templateKey}
        templateVersion={templateVersion}
        colors={colors}
        photoGrade={photoGrade}
        content={content}
        publishedAt={THUMBNAIL_DATE}
        preview
        still
        top
      />
    );
  },
  (before, after) =>
    before.fingerprint === after.fingerprint &&
    before.templateKey === after.templateKey &&
    before.templateVersion === after.templateVersion &&
    before.photoGrade === after.photoGrade &&
    JSON.stringify(before.colors) === JSON.stringify(after.colors),
);

export function TemplateThumbnail({
  templateKey,
  templateVersion,
  theme,
  content,
  height,
  initialZoom,
  eager = false,
}: {
  templateKey: TemplateKey;
  templateVersion: number;
  theme: ThemeSettings;
  content: RenderableSiteContent;
  height: number;
  /** The zoom of the server render, before the card can be measured. */
  initialZoom: number;
  /** Drawn from the first render, server included: for cards that start on screen. */
  eager?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const near = useNearScreen(box, eager);
  const colors = resolveSiteColors(theme, templateKey, templateVersion);
  // The model of the top of the page: edits below the hero leave it, and the picture, unchanged.
  const fingerprint = useMemo(
    () => JSON.stringify(buildSiteModel(content, { top: true })),
    [content],
  );
  return (
    <div ref={box}>
      <ScaledFrame
        initialZoom={initialZoom}
        className="w-full border-b border-divider"
        // Until it's drawn, the card shows the template's own background.
        style={{ height, background: colors.bg }}
      >
        {near ? (
          <Drawn
            templateKey={templateKey}
            templateVersion={templateVersion}
            colors={colors}
            photoGrade={resolvePhotoGrade(theme)}
            content={content}
            fingerprint={fingerprint}
          />
        ) : null}
      </ScaledFrame>
    </div>
  );
}
