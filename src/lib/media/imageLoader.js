/**
 * next/image custom loader (Phase 7 todo 16).
 * Cloudinary URLs get f_auto (AVIF/WebP when the browser supports it), q_auto and a width limit,
 * inserted right after "/upload/". Existing transformations (focal crop) are kept.
 * Local development URLs are returned unchanged.
 * @param {{ src: string, width: number, quality?: number }} p
 */
export default function cloudinaryLoader({ src, width, quality }) {
  if (src.startsWith("https://res.cloudinary.com/") && src.includes("/image/upload/")) {
    const q = quality ? `q_${quality}` : "q_auto";
    return src.replace("/image/upload/", `/image/upload/f_auto,${q},c_limit,w_${width}/`);
  }
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}w=${width}`;
}

/**
 * Cloudinary crop with focal point (Phase 7 todo 13): c_fill to an aspect ratio, centred on the
 * saved focal point (g_xy_center), or Cloudinary's automatic subject detection (g_auto) if none is set.
 * For non-Cloudinary URLs the caller uses CSS object-position with the same focal point.
 * @param {{ url: string, width?: number|null, height?: number|null, focalX?: number|null, focalY?: number|null }} asset
 * @param {string} aspect e.g. "16:9", "4:3", "1:1"
 */
export function cropUrl(asset, aspect) {
  const { url } = asset;
  if (!aspect || !url.startsWith("https://res.cloudinary.com/") || !url.includes("/image/upload/")) return url;
  const gravity =
    asset.focalX != null && asset.focalY != null && asset.width && asset.height
      ? `g_xy_center,x_${Math.round(asset.focalX * asset.width)},y_${Math.round(asset.focalY * asset.height)}`
      : "g_auto";
  return url.replace("/image/upload/", `/image/upload/c_fill,ar_${aspect},${gravity}/`);
}
