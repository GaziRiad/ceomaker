import {
  FAVICON_MIN,
  FAVICON_SIZE,
  SHARE_IMAGE,
  SHARE_RATIO,
  SHARING_UPLOAD_MAX_BYTES,
} from "@ceomaker/schema";

// Share image and favicon uploads: checked and loaded in the browser, cropped to the exact size
// they are saved at, then sent to /api/media, which checks the size again.

export type ShareUploadKind = "image" | "favicon";

export interface PickedImage {
  kind: ShareUploadKind;
  name: string;
  /** Object URL of the original file, revoked when the crop closes. */
  src: string;
  width: number;
  height: number;
}

/** Where the crop sits: 0 to 1 across the slack on each axis, and a zoom from 1 to 3. */
export interface CropState {
  x: number;
  y: number;
  zoom: number;
}

export const OUTPUT = {
  image: { width: SHARE_IMAGE.width, height: SHARE_IMAGE.height, type: "image/jpeg" },
  favicon: { width: FAVICON_SIZE, height: FAVICON_SIZE, type: "image/png" },
} as const;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("unreadable"));
    image.src = src;
  });
}

/** Checks a picked file; returns the image to crop, or the message to show. */
export async function pickImage(
  file: File,
  kind: ShareUploadKind,
): Promise<{ ok: true; image: PickedImage } | { ok: false; error: string }> {
  if (file.size > SHARING_UPLOAD_MAX_BYTES) {
    return { ok: false, error: `${file.name} is over 8 MB. Try a smaller version.` };
  }
  const src = URL.createObjectURL(file);
  try {
    const image = await loadImage(src);
    const { naturalWidth: width, naturalHeight: height } = image;
    if (kind === "image" && (width < SHARE_IMAGE.width || height < SHARE_IMAGE.height)) {
      URL.revokeObjectURL(src);
      return {
        ok: false,
        error: `${file.name} is ${width} × ${height}. Share images need to be at least 1200 × 630 to look sharp. Try a larger version.`,
      };
    }
    if (kind === "favicon" && (width < FAVICON_MIN || height < FAVICON_MIN)) {
      URL.revokeObjectURL(src);
      return {
        ok: false,
        error: `${file.name} is ${width} × ${height}. Use a square image of at least 192 × 192.`,
      };
    }
    return { ok: true, image: { kind, name: file.name, src, width, height } };
  } catch {
    URL.revokeObjectURL(src);
    return { ok: false, error: "Use a JPG, PNG or WebP image." };
  }
}

/** A note on what the crop will trim, or null when the image is already the right shape. */
export function cropNote(image: PickedImage): string | null {
  const ratio = image.width / image.height;
  if (image.kind === "favicon") {
    return Math.abs(ratio - 1) > 0.08
      ? "This image isn't square, so the edges will be trimmed. Drag it to choose which part shows."
      : null;
  }
  if (ratio < SHARE_RATIO.min) {
    return "This image is taller than a share image, so only a band across it fits. Drag it up or down to choose which part shows.";
  }
  if (ratio > SHARE_RATIO.max) {
    return "This image is wider than a share image, so the sides will be trimmed. Drag it to choose which part shows.";
  }
  return null;
}

/** The image's box inside a frame of the given size: it covers the frame, then zooms. */
export function cropBox(
  image: PickedImage,
  crop: CropState,
  frame: { width: number; height: number },
) {
  const base = Math.max(frame.width / image.width, frame.height / image.height);
  const width = image.width * base * crop.zoom;
  const height = image.height * base * crop.zoom;
  return {
    width,
    height,
    left: (frame.width - width) * crop.x,
    top: (frame.height - height) * crop.y,
  };
}

/** Draws the crop at its saved size and uploads it; returns the stored image's path. */
export async function uploadCrop(
  image: PickedImage,
  crop: CropState,
): Promise<{ ok: true; src: string } | { ok: false; error: string }> {
  const output = OUTPUT[image.kind];
  const canvas = document.createElement("canvas");
  canvas.width = output.width;
  canvas.height = output.height;
  const context = canvas.getContext("2d");
  if (!context) return { ok: false, error: "This browser can't crop images." };
  const element = await loadImage(image.src);
  const box = cropBox(image, crop, output);
  context.imageSmoothingQuality = "high";
  context.drawImage(element, box.left, box.top, box.width, box.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, output.type, 0.88),
  );
  if (!blob) return { ok: false, error: "This browser can't crop images." };

  const form = new FormData();
  form.set("purpose", image.kind === "image" ? "share" : "favicon");
  form.set("file", new File([blob], image.kind === "image" ? "share.jpg" : "favicon.png"));
  const response = await fetch("/api/media", { method: "POST", body: form }).catch(() => null);
  if (!response) return { ok: false, error: "We couldn't reach the server. Try again." };
  const body = (await response.json().catch(() => ({}))) as { src?: string; error?: string };
  if (!response.ok || !body.src) {
    return { ok: false, error: body.error ?? "The upload didn't work. Try again." };
  }
  return { ok: true, src: body.src };
}
