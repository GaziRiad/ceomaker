import { describe, expect, it } from "vitest";
import { imageInfo } from "./image-info";

function png(width: number, height: number) {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
}

function jpeg(width: number, height: number) {
  // SOI, APP0 (length 16), SOF0 with height and width.
  const bytes = new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xe0,
    0,
    16,
    ...new Array(14).fill(0),
    0xff,
    0xc0,
    0,
    17,
    8,
    height >> 8,
    height & 255,
    width >> 8,
    width & 255,
    3,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
  ]);
  return bytes;
}

function webpLossless(width: number, height: number) {
  const bytes = new Uint8Array(30);
  bytes.set(new TextEncoder().encode("RIFF"), 0);
  bytes.set(new TextEncoder().encode("WEBPVP8L"), 8);
  const w = width - 1;
  const h = height - 1;
  bytes[20] = 0x2f;
  bytes[21] = w & 0xff;
  bytes[22] = ((w >> 8) & 0x3f) | ((h & 0x3) << 6);
  bytes[23] = (h >> 2) & 0xff;
  bytes[24] = (h >> 10) & 0xf;
  return bytes;
}

describe("imageInfo", () => {
  it("reads PNG, JPEG and WebP sizes from the bytes", () => {
    expect(imageInfo(png(800, 1000))).toEqual({
      contentType: "image/png",
      width: 800,
      height: 1000,
    });
    expect(imageInfo(jpeg(1200, 1500))).toEqual({
      contentType: "image/jpeg",
      width: 1200,
      height: 1500,
    });
    expect(imageInfo(webpLossless(640, 800))).toEqual({
      contentType: "image/webp",
      width: 640,
      height: 800,
    });
  });

  it("rejects other files, including SVG and HTML posing as images", () => {
    expect(imageInfo(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(imageInfo(new TextEncoder().encode("GIF89a......"))).toBeNull();
    expect(imageInfo(png(0, 10))).toBeNull();
    expect(imageInfo(png(20_000, 10))).toBeNull();
  });
});
