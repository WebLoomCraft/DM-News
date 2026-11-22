import type { NextConfig } from "next";

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
        source: "/api/media/file/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
