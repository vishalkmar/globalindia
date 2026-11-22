/**
 * Reads width/height from image headers without decoding pixels (no image library = no
 * ImageTragick-style risk). Supports JPEG, PNG, WebP (VP8/VP8L/VP8X) and AVIF (ispe box).
 * @param {Uint8Array} buf
 * @param {string} ext jpg|png|webp|avif
 * @returns {{ width: number, height: number } | null}
 */
export function imageSize(buf, ext) {
  try {
    const b = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
    if (ext === "png") return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
    if (ext === "jpg") return jpegSize(b);
    if (ext === "webp") return webpSize(b);
    if (ext === "avif") return avifSize(b);
  } catch {
    return null;
  }
  return null;
}

function jpegSize(b) {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = b[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = b.readUInt16BE(i + 2);
    // SOF0..SOF15 except DHT(C4), JPG(C8), DAC(CC)
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

function webpSize(b) {
  const chunk = b.toString("latin1", 12, 16);
  if (chunk === "VP8 ") return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L") {
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") return { width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1 };
  return null;
}

function avifSize(b) {
  const idx = b.indexOf("ispe", 0, "latin1");
  if (idx < 0 || idx + 16 > b.length) return null;
  return { width: b.readUInt32BE(idx + 8), height: b.readUInt32BE(idx + 12) };
}

/** Refuse absurd dimensions (decompression bombs) — 12k px per side, 50 megapixels. */
export function dimensionsAcceptable(size) {
  return Boolean(
    size &&
    size.width > 0 &&
    size.height > 0 &&
    size.width <= 12000 &&
    size.height <= 12000 &&
    size.width * size.height <= 50_000_000,
  );
}
