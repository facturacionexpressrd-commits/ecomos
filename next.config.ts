import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pins the workspace root explicitly — otherwise Turbopack walks up looking for a
  // lockfile and finds an unrelated one in the user's home directory.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Allow HMR through the Cloudflare tunnel for local dev
  allowedDevOrigins: ["speaking-atlantic-blowing-techrepublic.trycloudflare.com"],
  // Page banners (Unsplash, free license) and Shopify product thumbnails, served resized as AVIF/WebP.
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.shopify.com" },
    ],
  },
  // ponytail: no script-src CSP yet; Next's inline scripts need nonces. Add one via proxy.ts if an
  // audit demands it. frame-ancestors assumes EcomOS is never embedded in Shopify admin.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
