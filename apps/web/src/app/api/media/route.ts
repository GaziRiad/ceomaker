import { countMediaSince, getDb, insertMedia, MEDIA_MAX_BYTES } from "@ceomaker/db";
import { FAVICON_SIZE, mediaPath, SHARE_IMAGE } from "@ceomaker/schema";
import { createHash, randomUUID } from "node:crypto";
import { getAuth } from "@/lib/auth";
import { DAY_MS } from "@/lib/ai/client";
import { imageInfo } from "@/lib/image-info";
import { mediaStore } from "@/lib/media-store";
import { isSameOrigin } from "@/lib/same-origin";

/**
 * Image uploads per user per rolling day. Room for a full Salon site in one sitting: portrait,
 * twelve gallery photos, an About photo, twelve work images and ten quote photos, with retries.
 */
const DAILY_UPLOADS = 60;

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status });
}

/**
 * Stores an image uploaded from the editor. The editor resizes and re-encodes photos before
 * upload (which also strips EXIF data such as GPS position); here the bytes are checked again:
 * size, real file type and dimensions.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json(403, { error: "Cross-site request refused" });
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return json(401, { error: "Sign in to upload" });
  const store = mediaStore();
  if (!store) return json(503, { error: "Image uploads aren't available right now." });
  if (Number(request.headers.get("content-length") ?? 0) > MEDIA_MAX_BYTES + 64 * 1024) {
    return json(413, { error: "That image is too large." });
  }

  const db = getDb();
  if (
    (await countMediaSince(db, session.user.id, new Date(Date.now() - DAY_MS))) >= DAILY_UPLOADS
  ) {
    return json(429, { error: "You've uploaded a lot of images today. Try again tomorrow." });
  }

  const form = await request.formData();
  const purpose = form.get("purpose") ?? "photo";
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return json(400, { error: "No image received." });
  if (file.size > MEDIA_MAX_BYTES) return json(413, { error: "That image is too large." });

  const data = new Uint8Array(await file.arrayBuffer());
  const info = imageInfo(data);
  if (!info) return json(415, { error: "Use a JPG, PNG or WebP image." });
  // Share images and favicons are cropped in the browser to the exact size they are saved at.
  if (
    purpose === "share" &&
    (info.contentType !== "image/jpeg" ||
      info.width !== SHARE_IMAGE.width ||
      info.height !== SHARE_IMAGE.height)
  ) {
    return json(422, { error: "Share images are saved at 1200 × 630." });
  }
  if (
    purpose === "favicon" &&
    (info.contentType !== "image/png" ||
      info.width !== FAVICON_SIZE ||
      info.height !== FAVICON_SIZE)
  ) {
    return json(422, { error: "Favicons are saved at 512 × 512." });
  }

  // The file goes to storage first, so a row always has its file. If the row can't be saved,
  // the file is removed again.
  const id = randomUUID();
  try {
    await store.put(id, data, info.contentType);
  } catch (error) {
    console.error("Image upload to storage failed", error);
    return json(502, { error: "The image couldn't be saved. Try again." });
  }
  try {
    await insertMedia(db, {
      id,
      userId: session.user.id,
      contentType: info.contentType,
      byteSize: data.byteLength,
      width: info.width,
      height: info.height,
      sha256: createHash("sha256").update(data).digest("hex"),
    });
  } catch (error) {
    await store.remove([id]).catch(() => undefined);
    throw error;
  }
  return json(201, { id, src: mediaPath(id), width: info.width, height: info.height });
}
