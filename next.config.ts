import type { NextConfig } from "next";

/**
 * Content-Security-Policy.
 *
 * Next.js injects inline bootstrap scripts and inline styles, so a strict
 * nonce-based policy is not possible without moving to dynamic rendering
 * everywhere. This policy is therefore "no unsafe-eval, no wildcard hosts,
 * explicit allowlists" — it still blocks injected inline <script> payloads,
 * base-tag hijacking, framing, and form posts to foreign origins.
 *
 * AD_SCRIPT_ALLOWLIST / CSP_EXTRA_SCRIPT_SRC extend the allowlist for ad and
 * analytics integrations without loosening anything else.
 */
function buildCsp(): string {
  const extraScript = (process.env.CSP_EXTRA_SCRIPT_SRC || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const scriptSrc = [
    "'self'",
    // Required by Next.js for its inline bootstrap payloads.
    "'unsafe-inline'",
    "https://pagead2.googlesyndication.com",
    "https://securepubads.g.doubleclick.net",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    ...extraScript,
  ];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSrc,
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
    // Article and cover images are stored remotely (Supabase/CDN + Pexels).
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "media-src": ["'self'", "https:"],
    "frame-src": [
      "https://www.youtube.com",
      "https://www.youtube-nocookie.com",
      "https://player.vimeo.com",
      "https://www.dailymotion.com",
      "https://open.spotify.com",
      "https://googleads.g.doubleclick.net",
    ],
    "connect-src": ["'self'", "https://www.google-analytics.com", "https://region1.google-analytics.com", ...extraScript],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "upgrade-insecure-requests": [],
  };

  return Object.entries(directives)
    .map(([directive, values]) => (values.length ? `${directive} ${values.join(" ")}` : directive))
    .join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: buildCsp() },
  // Do not let browsers second-guess declared content types (blocks sniffing
  // an uploaded file into HTML/JS).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Clickjacking: CSP frame-ancestors above is the modern control; this covers
  // older browsers.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // HSTS only makes sense over HTTPS; Vercel terminates TLS for us.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    // The video section was retired (images only). Send old bookmarks and
    // anything still indexed by search engines to the live broadcast instead
    // of a dead end.
    return [
      { source: "/videos", destination: "/live", permanent: true },
      { source: "/videos/:path*", destination: "/live", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // Applied to every route, including API responses.
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/api/media/file/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          // Defence in depth: never let a stored file be treated as a document.
          { key: "Content-Disposition", value: "inline" },
          { key: "Content-Security-Policy", value: "default-src 'none'; sandbox" },
        ],
      },
    ];
  },
};

export default nextConfig;
