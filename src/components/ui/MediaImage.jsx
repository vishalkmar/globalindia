import Image from "next/image";

import { cropUrl } from "@/lib/media/imageLoader";
import { cn } from "@/lib/utils";

/**
 * Image from the media library. Alt text always comes from the asset (required on upload use).
 * - `aspect` crops to a ratio around the saved focal point (Cloudinary gravity; CSS object-position fallback).
 * - `priority` for the LCP image (hero). Everything else lazy-loads.
 * @param {{ asset: { url: string, alt: string, width?: number, height?: number, focalX?: number|null, focalY?: number|null },
 *           aspect?: string, sizes?: string, priority?: boolean, className?: string, fill?: boolean }} props
 */
export function MediaImage({ asset, aspect, sizes = "100vw", priority = false, className, fill = false, alt }) {
  if (!asset?.url) return null;
  const src = cropUrl(asset, aspect);
  const objectPosition = asset.focalX != null && asset.focalY != null ? `${asset.focalX * 100}% ${asset.focalY * 100}%` : "50% 50%";
  const [aw, ah] = (aspect ?? "").split(":").map(Number);
  const width = asset.width ?? 1600;
  const height = aw && ah ? Math.round((width * ah) / aw) : (asset.height ?? 1000);
  const common = { src, alt: alt ?? asset.alt ?? "", sizes, priority, className: cn("object-cover", className), style: { objectPosition } };
  return fill ? <Image {...common} fill alt={common.alt} /> : <Image {...common} width={width} height={height} alt={common.alt} />;
}
