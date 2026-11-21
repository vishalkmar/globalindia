/**
 * Next.js configuration — Global India website.
 * Security-relevant defaults live here; the per-request CSP (nonce) is added in src/proxy.js (Phase 20).
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

  // Native / server-only packages that must not be bundled
  serverExternalPackages: ["@node-rs/argon2", "@prisma/client", "prisma"],

  images: {
    // Only Cloudinary may be used as a remote image source (SSRF / abuse guard, Phase 26)
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" }],
    formats: ["image/avif", "image/webp"],
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
    // Static baseline headers for every route. CSP with nonce is set per request in proxy.js.
    const base = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "X-Frame-Options", value: "DENY" },
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
