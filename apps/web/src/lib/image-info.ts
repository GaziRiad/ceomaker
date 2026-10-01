import type { MediaContentType } from "@ceomaker/db";

export interface ImageInfo {
  contentType: MediaContentType;
  width: number;
  height: number;
}

function u16be(bytes: Uint8Array, offset: number) {
  return (bytes[offset]! << 8) | bytes[offset + 1]!;
}

function u32be(bytes: Uint8Array, offset: number) {
  return (
    ((bytes[offset]! << 24) >>> 0) +
    (bytes[offset + 1]! << 16) +
    (bytes[offset + 2]! << 8) +
    bytes[offset + 3]!
  );
}

function u24le(bytes: Uint8Array, offset: number) {
  return bytes[offset]! | (bytes[offset + 1]! << 8) | (bytes[offset + 2]! << 16);
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function jpegSize(bytes: Uint8Array): { width: number; height: number } | null {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1]!;
    const length = u16be(bytes, offset + 2);
    // SOF0..SOF15, excluding DHT (C4), JPG (C8) and DAC (CC), carry the frame size.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: u16be(bytes, offset + 5), width: u16be(bytes, offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

function webpSize(bytes: Uint8Array): { width: number; height: number } | null {
  const chunk = ascii(bytes, 12, 4);
  if (chunk === "VP8 " && bytes.length >= 30) {
    return {
      width: (bytes[26]! | (bytes[27]! << 8)) & 0x3fff,
      height: (bytes[28]! | (bytes[29]! << 8)) & 0x3fff,
    };
  }
  if (chunk === "VP8L" && bytes.length >= 25) {
    const b = bytes.subarray(21, 25);
    return {
      width: 1 + (((b[1]! & 0x3f) << 8) | b[0]!),
      height: 1 + (((b[3]! & 0xf) << 10) | (b[2]! << 2) | ((b[1]! & 0xc0) >> 6)),
    };
  }
  if (chunk === "VP8X" && bytes.length >= 30) {
    return { width: 1 + u24le(bytes, 24), height: 1 + u24le(bytes, 27) };
  }
  return null;
}

/**
 * Identifies an uploaded image from its bytes (never from the claimed type or file name) and
 * reads its dimensions. Only JPEG, PNG and WebP are accepted.
 */
export function imageInfo(bytes: Uint8Array): ImageInfo | null {
  let size: { width: number; height: number } | null = null;
  let contentType: MediaContentType;
  if (bytes.length > 24 && bytes[0] === 0x89 && ascii(bytes, 1, 3) === "PNG") {
    contentType = "image/png";
    size = { width: u32be(bytes, 16), height: u32be(bytes, 20) };
  } else if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    contentType = "image/jpeg";
    size = jpegSize(bytes);
  } else if (bytes.length > 16 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    contentType = "image/webp";
    size = webpSize(bytes);
  } else {
    return null;
  }
  if (!size || size.width < 1 || size.height < 1 || size.width > 10_000 || size.height > 10_000) {
    return null;
  }
  return { contentType, ...size };
}
