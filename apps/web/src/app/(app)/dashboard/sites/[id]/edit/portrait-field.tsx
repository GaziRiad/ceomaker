"use client";

import {
  FOCAL_DEFAULT,
  GALLERY_CAPTION_LIMIT,
  MAX_GALLERY_PHOTOS,
  type FocalPoint,
  type ImageRef,
} from "@ceomaker/schema";
import { useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from "react";

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

class UploadError extends Error {}

/** Checks, shrinks and uploads one photo. Throws an UploadError with a message to show. */
async function uploadPhoto(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
    throw new UploadError("Use a JPG, PNG or WebP image.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new UploadError("That image is over 8 MB. Try a smaller one.");
  }
  try {
    const body = new FormData();
    body.set("file", await prepareImage(file), "photo");
    const response = await fetch("/api/media", { method: "POST", body });
    const result = (await response.json().catch(() => ({}))) as { src?: string; error?: string };
    if (!response.ok || !result.src) throw new UploadError(result.error ?? "");
    return result.src;
  } catch (cause) {
    throw new UploadError(
      cause instanceof UploadError && cause.message
        ? cause.message
        : "The upload didn't work. Try again.",
    );
  }
}

const smallButton = {
  fontSize: 13,
  padding: "5px 10px",
  background: "var(--color-neutral-100)",
} as const;

/**
 * Where the photo's subject is, set by clicking it (or with the arrow keys). Templates that
 * crop the photo to different shapes keep this point in view.
 */
function FocalPicker({
  src,
  focal,
  onChange,
}: {
  src: string;
  focal: FocalPoint | undefined;
  onChange: (focal: FocalPoint) => void;
}) {
  const point = focal ?? FOCAL_DEFAULT;
  const round = (value: number) => Math.round(Math.min(1, Math.max(0, value)) * 100) / 100;
  const set = (x: number, y: number) => onChange({ x: round(x), y: round(y) });
  const onKeyDown = (event: KeyboardEvent) => {
    const step = event.shiftKey ? 0.1 : 0.02;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    set(point.x + move[0], point.y + move[1]);
  };
  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="slider"
        tabIndex={0}
        aria-label="Focus point"
        aria-valuetext={`${Math.round(point.x * 100)}% across, ${Math.round(point.y * 100)}% down`}
        aria-valuenow={Math.round(point.x * 100)}
        className="relative self-start cursor-crosshair touch-none select-none"
        onKeyDown={onKeyDown}
        onPointerDown={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          set((event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- user upload, already resized */}
        <img
          src={src}
          alt=""
          draggable={false}
          className="block max-h-[220px] max-w-full border border-divider"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
          style={{
            left: `${point.x * 100}%`,
            top: `${point.y * 100}%`,
            boxShadow: "0 0 0 1px rgb(0 0 0 / 0.55), 0 1px 4px rgb(0 0 0 / 0.4)",
          }}
        />
      </div>
      <span className="text-xs text-neutral-700">
        Click the face or subject. Crops keep that point in view.
      </span>
    </div>
  );
}

/**
 * One photo: upload, replace, remove, and (where templates crop it) its focus point. Drop a
 * file on it, or use the button.
 */
export function ImageField({
  label,
  image,
  alt,
  placeholder,
  emptyHint = "Drag a photo here. JPG, PNG or WebP, up to 8 MB.",
  filledHint,
  focus = false,
  onChange,
}: {
  label: string;
  image: ImageRef | undefined;
  /** Stored as the photo's alt text when it's uploaded. */
  alt: string;
  /** Shown in the thumbnail while there's no photo. */
  placeholder?: ReactNode;
  emptyHint?: string;
  filledHint?: string;
  /** Offer the focus point. */
  focus?: boolean;
  onChange: (image: ImageRef | undefined) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusing, setFocusing] = useState(false);

  async function use(file: File | undefined) {
    setDragOver(false);
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      onChange({ src: await uploadPhoto(file), alt });
      setFocusing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The upload didn't work. Try again.");
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
          ? (filledHint ?? "Drop another photo here to replace it.")
          : emptyHint);

  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div
        className="flex flex-col gap-3 p-3 transition-[border-color,background] duration-200"
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
        <div className="flex items-center gap-3.5">
          <span className="relative flex h-20 w-16 flex-none items-center justify-center overflow-hidden bg-accent-200 font-heading text-[22px] font-semibold text-accent-800">
            {placeholder}
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element -- user upload, already resized
              <img
                src={image.src}
                alt=""
                className="absolute inset-0 size-full object-cover"
                style={{
                  objectPosition: `${(image.focal ?? FOCAL_DEFAULT).x * 100}% ${(image.focal ?? FOCAL_DEFAULT).y * 100}%`,
                }}
              />
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
                style={smallButton}
                disabled={uploading}
                onClick={() => input.current?.click()}
              >
                {image ? "Replace" : "Upload photo"}
              </button>
              {image && focus ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: 13, padding: "5px 8px" }}
                  aria-expanded={focusing}
                  onClick={() => setFocusing(!focusing)}
                >
                  {focusing ? "Done" : "Set focus"}
                </button>
              ) : null}
              {image ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: 13, padding: "5px 8px" }}
                  onClick={() => {
                    setFocusing(false);
                    onChange(undefined);
                  }}
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
        {image && focus && focusing ? (
          <FocalPicker
            src={image.src}
            focal={image.focal}
            onChange={(focal) => onChange({ ...image, focal })}
          />
        ) : null}
      </div>
    </div>
  );
}

export function PortraitField({
  image,
  initials,
  name,
  focus,
  onChange,
}: {
  image: ImageRef | undefined;
  initials: string;
  name: string;
  focus: boolean;
  onChange: (image: ImageRef | undefined) => void;
}) {
  return (
    <ImageField
      label="Portrait"
      image={image}
      alt={name}
      placeholder={initials}
      emptyHint="Drag a headshot here. JPG, PNG or WebP, up to 8 MB."
      filledHint="Shown wherever the template has a portrait."
      focus={focus}
      onChange={onChange}
    />
  );
}

type Photo = ImageRef;

/**
 * More photos for templates that hang several (Salon): a tray to add, order, caption and
 * remove them. The first is the most prominent.
 */
export function PhotosField({
  photos,
  onChange,
}: {
  photos: Photo[];
  /** Receives a function, since uploads finish one by one while the owner keeps editing. */
  onChange: (change: (current: Photo[]) => Photo[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const room = MAX_GALLERY_PHOTOS - photos.length;

  async function add(files: File[]) {
    setDragOver(false);
    setError(null);
    const batch = files.slice(0, room);
    if (files.length > room) {
      setError(`Up to ${MAX_GALLERY_PHOTOS} photos. The first ${room} were added.`);
    }
    for (const [index, file] of batch.entries()) {
      setProgress(batch.length > 1 ? `Uploading ${index + 1} of ${batch.length}…` : "Uploading…");
      try {
        const src = await uploadPhoto(file);
        onChange((current) =>
          current.length < MAX_GALLERY_PHOTOS ? [...current, { src, alt: "" }] : current,
        );
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "The upload didn't work. Try again.");
        break;
      }
    }
    setProgress(null);
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= photos.length) return;
    onChange((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      return next;
    });
    if (open === from) setOpen(to);
  };
  const set = (index: number, photo: Photo | undefined) =>
    onChange((current) =>
      photo
        ? current.map((item, i) => (i === index ? photo : item))
        : current.filter((_, i) => i !== index),
    );

  const hint =
    error ??
    progress ??
    (dragOver
      ? "Drop to add these photos"
      : photos.length
        ? `${photos.length} of ${MAX_GALLERY_PHOTOS}. They hang around your name in this order, after the portrait, and float beside your call to action newest first.`
        : "Event, product and press photos. With your portrait, three or more form a collage around your name.");

  return (
    <div className="field">
      <span className="field-label">Photos</span>
      <div
        className="flex flex-col gap-2.5 p-3 transition-[border-color,background] duration-200"
        style={{
          border: `1px dashed ${dragOver ? "var(--color-accent)" : "var(--color-divider)"}`,
          background: dragOver ? "var(--color-accent-100)" : "var(--color-bg)",
        }}
        onDragOver={(event: DragEvent) => {
          event.preventDefault();
          if (!dragOver && room > 0) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event: DragEvent) => {
          event.preventDefault();
          if (!progress) void add([...(event.dataTransfer.files ?? [])]);
        }}
      >
        {photos.length ? (
          <ol className="grid grid-cols-4 gap-1.5" aria-label="Photos in order">
            {photos.map((photo, index) => (
              <li key={`${photo.src}-${index}`} className="relative">
                <button
                  type="button"
                  className="relative block aspect-[4/5] w-full overflow-hidden bg-neutral-200"
                  style={{
                    outline: open === index ? "2px solid var(--color-accent)" : undefined,
                    outlineOffset: 1,
                  }}
                  aria-label={`Photo ${index + 1}${photo.alt ? `: ${photo.alt}` : ""}. Edit`}
                  aria-expanded={open === index}
                  onClick={() => setOpen(open === index ? null : index)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- user upload */}
                  <img
                    src={photo.src}
                    alt=""
                    className="absolute inset-0 size-full object-cover"
                    style={{
                      objectPosition: `${(photo.focal ?? FOCAL_DEFAULT).x * 100}% ${(photo.focal ?? FOCAL_DEFAULT).y * 100}%`,
                    }}
                  />
                  <span className="absolute top-1 left-1 bg-bg/90 px-1 text-[11px] leading-4">
                    {index + 1}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        ) : null}
        {open !== null && photos[open] ? (
          <div className="flex flex-col gap-2.5 border-t border-divider pt-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-auto text-[13px]">Photo {open + 1}</span>
              <button
                type="button"
                className="btn btn-secondary"
                style={smallButton}
                disabled={open === 0}
                aria-label="Move earlier"
                onClick={() => move(open, open - 1)}
              >
                ←
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={smallButton}
                disabled={open === photos.length - 1}
                aria-label="Move later"
                onClick={() => move(open, open + 1)}
              >
                →
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: 13, padding: "5px 8px", color: "var(--color-danger)" }}
                onClick={() => {
                  set(open, undefined);
                  setOpen(null);
                }}
              >
                Remove
              </button>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-neutral-700">Caption</span>
              <input
                className="input"
                maxLength={GALLERY_CAPTION_LIMIT}
                placeholder="Opening night at the Lisbon house"
                value={photos[open].alt}
                onChange={(event) => set(open, { ...photos[open]!, alt: event.target.value })}
              />
              <span className="text-xs text-neutral-700">
                Read aloud to people using screen readers. Never shown on the page.
              </span>
            </label>
            <FocalPicker
              src={photos[open].src}
              focal={photos[open].focal}
              onChange={(focal) => set(open, { ...photos[open]!, focal })}
            />
          </div>
        ) : null}
        <span
          role={error ? "alert" : undefined}
          className="text-[13px]"
          style={{ color: error ? "var(--color-danger)" : "var(--color-neutral-700)" }}
        >
          {hint}
        </span>
        {room > 0 ? (
          <button
            type="button"
            className="btn btn-secondary self-start"
            style={smallButton}
            disabled={Boolean(progress)}
            onClick={() => input.current?.click()}
          >
            + Add photos
          </button>
        ) : null}
        <input
          ref={input}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            void add([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
