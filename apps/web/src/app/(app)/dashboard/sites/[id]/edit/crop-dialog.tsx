"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Modal } from "@/components/confirm-dialog";
import { CircleAlert } from "@/components/icons";
import { cropBox, cropNote, OUTPUT, type CropState, type PickedImage } from "./share-uploads";

const PAD = 24;

/**
 * Crops a share image to 1200 x 630 or a favicon to a square: drag to place it, zoom to tighten.
 * Keyed on the image by its parent, so each image starts centred.
 */
export function CropDialog({
  image,
  pending,
  error,
  onApply,
  onCancel,
}: {
  image: PickedImage | null;
  pending: boolean;
  error: string | null;
  onApply: (crop: CropState) => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const [crop, setCrop] = useState<CropState>({ x: 0.5, y: 0.5, zoom: 1 });
  const [stageWidth, setStageWidth] = useState(572);
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; start: CropState } | null>(null);

  useEffect(() => {
    const element = stage.current?.parentElement;
    if (!element) return;
    const update = () =>
      setStageWidth(Math.min(image?.kind === "favicon" ? 400 : 572, element.clientWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [image]);

  const kind = image?.kind ?? "image";
  const output = OUTPUT[kind];
  const frame = {
    width: stageWidth - PAD * 2,
    height: Math.round(((stageWidth - PAD * 2) * output.height) / output.width),
  };
  const box = image ? cropBox(image, crop, frame) : null;
  const note = image ? cropNote(image) : null;

  const onPointerMove = (event: React.PointerEvent) => {
    const start = drag.current;
    if (!start || !box) return;
    const slackX = box.width - frame.width;
    const slackY = box.height - frame.height;
    const clamp = (value: number) => Math.min(1, Math.max(0, value));
    setCrop({
      ...start.start,
      x: slackX > 0 ? clamp(start.start.x - (event.clientX - start.x) / slackX) : 0.5,
      y: slackY > 0 ? clamp(start.start.y - (event.clientY - start.y) / slackY) : 0.5,
    });
  };

  return (
    <Modal
      open={image !== null}
      labelledBy={titleId}
      locked={pending}
      width={kind === "favicon" ? 448 : 620}
      onClose={onCancel}
      onSubmit={() => {
        if (!pending) onApply(crop);
      }}
    >
      <div className="flex flex-col gap-1">
        <h2
          id={titleId}
          className="m-0 font-heading text-[30px] leading-none font-semibold uppercase"
        >
          {kind === "image" ? "Crop your share image" : "Crop your favicon"}
        </h2>
        <span className="text-sm text-neutral-700">
          {kind === "image"
            ? "Drag to choose what shows. It will be saved at 1200 × 630."
            : "Drag to choose what shows. It will be saved as a 512 × 512 square."}
        </span>
      </div>
      {note ? (
        <span className="flex gap-2 bg-warning-soft px-3 py-2.5 text-[13px] leading-[1.45] text-warning">
          <CircleAlert size={16} className="mt-px flex-none" />
          {note}
        </span>
      ) : null}
      <div>
        <div
          ref={stage}
          className="relative cursor-grab touch-none overflow-hidden bg-neutral-900 select-none active:cursor-grabbing"
          style={{ width: stageWidth, height: frame.height + PAD * 2 }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { x: event.clientX, y: event.clientY, start: crop };
          }}
          onPointerMove={onPointerMove}
          onPointerUp={() => {
            drag.current = null;
          }}
          onKeyDown={(event) => {
            const step = 0.05;
            const moves: Record<string, Partial<CropState>> = {
              ArrowLeft: { x: Math.max(0, crop.x - step) },
              ArrowRight: { x: Math.min(1, crop.x + step) },
              ArrowUp: { y: Math.max(0, crop.y - step) },
              ArrowDown: { y: Math.min(1, crop.y + step) },
            };
            const move = moves[event.key];
            if (move) {
              event.preventDefault();
              setCrop({ ...crop, ...move });
            }
          }}
          tabIndex={0}
          role="application"
          aria-label="Image position. Drag, or use the arrow keys."
        >
          {image && box ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local file being cropped
            <img
              src={image.src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none"
              style={{
                left: PAD + box.left,
                top: PAD + box.top,
                width: box.width,
                height: box.height,
              }}
            />
          ) : null}
          <div
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              left: PAD,
              top: PAD,
              width: frame.width,
              height: frame.height,
              boxShadow:
                "0 0 0 2000px color-mix(in srgb, var(--color-neutral-900) 62%, transparent)",
              outline: "1px solid #fff",
            }}
          />
        </div>
      </div>
      <label className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-[13px] text-neutral-700">
        <span>Zoom</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={crop.zoom}
          onChange={(event) => setCrop({ ...crop, zoom: Number(event.target.value) })}
          style={{ width: "100%", accentColor: "var(--color-accent)" }}
        />
        <span className="tabular-nums">
          {output.width} × {output.height}
        </span>
      </label>
      {error ? (
        <span role="alert" className="text-[13px] text-danger">
          {error}
        </span>
      ) : null}
      <div className="flex flex-wrap gap-2.5">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Use this crop"}
        </button>
        <button type="button" className="btn btn-secondary" disabled={pending} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
