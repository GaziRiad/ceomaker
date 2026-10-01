"use client";

import type { ImageRef } from "@ceomaker/schema";
import { useRef, useState, type DragEvent } from "react";

const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const MAX_EDGE = 1400;

/**
 * Re-encodes a photo in the browser before upload: at most 1400px on the long edge, and the
 * re-encode drops EXIF metadata (camera details, GPS position) from the published image.
 */
async function prepareImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const encode = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  // Browsers that can't encode WebP return PNG; JPEG is smaller for photos then.
  const webp = await encode("image/webp", 0.86);
  if (webp?.type === "image/webp") return webp;
  const jpeg = await encode("image/jpeg", 0.88);
  if (!jpeg) throw new Error("Could not encode the image");
  return jpeg;
}

export function PortraitField({
  image,
  initials,
  name,
  onChange,
}: {
  image: ImageRef | undefined;
  initials: string;
  name: string;
  onChange: (image: ImageRef | undefined) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function use(file: File | undefined) {
    setDragOver(false);
    if (!file) return;
    setError(null);
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      setError("Use a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError("That image is over 8 MB. Try a smaller one.");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", await prepareImage(file), "portrait");
      const response = await fetch("/api/media", { method: "POST", body });
      const result = (await response.json().catch(() => ({}))) as { src?: string; error?: string };
      if (!response.ok || !result.src) throw new Error(result.error ?? "Upload failed");
      onChange({ src: result.src, alt: name });
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message !== "Upload failed"
          ? cause.message
          : "The upload didn't work. Try again.",
      );
    } finally {
      setUploading(false);
    }
  }

  const hint =
    error ??
    (uploading
      ? "Uploading…"
      : dragOver
        ? "Drop to use this photo"
        : image
          ? "Shown wherever the template has a portrait."
          : "Drag a headshot here. JPG, PNG or WebP, up to 8 MB.");

  return (
    <div className="field">
      <span className="field-label">Portrait</span>
      <div
        className="flex items-center gap-3.5 p-3 transition-[border-color,background] duration-200"
        style={{
          border: `1px dashed ${dragOver ? "var(--color-accent)" : "var(--color-divider)"}`,
          background: dragOver ? "var(--color-accent-100)" : "var(--color-bg)",
        }}
        onDragOver={(event: DragEvent) => {
          event.preventDefault();
          if (!dragOver) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event: DragEvent) => {
          event.preventDefault();
          void use(event.dataTransfer.files?.[0]);
        }}
      >
        <span className="relative flex h-20 w-16 flex-none items-center justify-center overflow-hidden bg-accent-200 font-heading text-[22px] font-semibold text-accent-800">
          {initials}
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- user upload, already resized
            <img src={image.src} alt="" className="absolute inset-0 size-full object-cover" />
          ) : null}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span
            role={error ? "alert" : undefined}
            className="text-[13px]"
            style={{ color: error ? "var(--color-danger)" : "var(--color-neutral-700)" }}
          >
            {hint}
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 13, padding: "5px 10px", background: "var(--color-neutral-100)" }}
              disabled={uploading}
              onClick={() => input.current?.click()}
            >
              {image ? "Replace photo" : "Upload photo"}
            </button>
            {image ? (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 13, padding: "5px 8px" }}
                onClick={() => onChange(undefined)}
              >
                Remove
              </button>
            ) : null}
          </div>
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              void use(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}
