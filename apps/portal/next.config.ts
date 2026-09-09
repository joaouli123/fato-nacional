import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";
import { withSentryConfig } from "@sentry/nextjs";
import path from "node:path";

const nextConfig: NextConfig = {
  async headers() {
    const noStoreHeaders = [
      {
        key: "Cache-Control",
        value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
      { key: "Pragma", value: "no-cache" },
      { key: "Expires", value: "0" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ];

    const securityHeaders = [
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
      },
    ];

    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://*.ingest.us.sentry.io https://static.cloudflareinsights.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://partner.googleadservices.com https://tpc.googlesyndication.com https://adservice.google.com",
      "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://*.ingest.us.sentry.io https://cloudflareinsights.com https://static.cloudflareinsights.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.g.doubleclick.net https://*.google.com",
      "frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.googlesyndication.com https://www.google.com",
    ].join("; ");

    return [
      { source: "/cms/:path*", headers: noStoreHeaders },
      { source: "/api/payload/:path*", headers: noStoreHeaders },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      // Safe security headers everywhere (incl. the CMS admin).
      { source: "/:path*", headers: securityHeaders },
      // CSP everywhere EXCEPT the Payload admin (its own inline scripts/styles).
      { source: "/((?!cms).*)", headers: [{ key: "Content-Security-Policy", value: csp }] },
    ];
  },
  async redirects() {
    return [{ source: "/favicon.ico", destination: "/icon.svg", permanent: true }];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Transformações ficam no cache de disco por 31 dias (padrão é 60s — cada
    // visita re-comprimia a imagem e o carregamento ficava lento).
    minimumCacheTTL: 2_678_400,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "img.fatonacional.com" },
    ],
  },
  transpilePackages: ["@nexo/shared"],
  serverExternalPackages: [
    "payload",
    "@payloadcms/db-postgres",
    "pg",
    "sanitize-html",
    "@aws-sdk/client-s3",
    "sharp",
  ],
  turbopack: {
    root: path.resolve(process.cwd(), "../.."),
  },
};

const withPayloadConfig = withPayload(nextConfig);

// Sentry only wraps the build when a DSN is present, so it's a no-op until configured.
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(withPayloadConfig, {
      org: "portal-noticias",
      project: "javascript-nextjs",
      silent: !process.env.CI,
      widenClientFileUpload: true,
      disableLogger: true,
    })
  : withPayloadConfig;
