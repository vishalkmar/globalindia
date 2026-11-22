import { buildCsp, buildReportOnlyCsp } from "./src/lib/security/csp.js";

const isDev = process.env.NODE_ENV === "development";

/**
 * Next.js configuration — Global India website.
 * Security-relevant defaults live here, including the Content-Security-Policy (Phase 20). Pages are
 * prerendered, so the CSP is static (no per-request nonce); script files carry SRI hashes instead.
 * See docs/security/20.md.
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Cache Components + Partial Prefetching (Next 16 defaults)
  cacheComponents: true,
  partialPrefetching: true,

  // Do not advertise the framework, never ship browser source maps (Security.md, Phase 24)
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  reactStrictMode: true,

  // One URL per page (Phase 31 todo 10): no trailing slash; /about/ answers 308 -> /about.
  trailingSlash: false,

  // Stray console.log / console.debug never reach production (Phase 24 todo 15). The structured
  // logger (src/lib/logger.js) writes through error / warn / info, which are kept.
  compiler: isDev ? {} : { removeConsole: { exclude: ["error", "warn", "info"] } },

  // The site uses no Server Actions; if one is ever added, Next's origin check only accepts our host
  // (Phase 18 todo 06).
  experimental: {
    // Subresource Integrity: every Next script tag gets an integrity hash (Phase 20 todo 03).
    sri: { algorithm: "sha256" },
    serverActions: {
      allowedOrigins: [new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").host],
      bodySizeLimit: "1mb",
    },
  },

  // Native / server-only packages that must not be bundled
  serverExternalPackages: ["@node-rs/argon2", "@prisma/client", "prisma"],

  images: {
    // Images are resized and converted by Cloudinary (f_auto, q_auto) through a custom loader,
    // so Next's own optimiser is not used and cannot be abused as an open image proxy (Phase 27).
    loader: "custom",
    loaderFile: "./src/lib/media/imageLoader.js",
    // Fixed size lists; the loader snaps to these (Phase 27 todo 15).
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [64, 128, 256, 384],
  },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  async headers() {
    // Static baseline headers for every route.
    const base = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      // Full policy incl. clickjacking (frame-ancestors), Phase 18 todo 13 and Phase 20.
      { key: "Content-Security-Policy", value: buildCsp({ dev: isDev }) },
      // Trusted Types reported, not enforced yet (Phase 20 todo 06).
      { key: "Content-Security-Policy-Report-Only", value: buildReportOnlyCsp() },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    ];
    return [
      { source: "/:path*", headers: base },
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
