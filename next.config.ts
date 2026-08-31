import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin-allow-popups",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.140", "192.168.25.134", "localhost"],
  async headers() {
    const productionOnly: { key: string; value: string }[] =
      process.env.NODE_ENV === "production"
        ? [
            {
              key: "Strict-Transport-Security",
              value: "max-age=63072000; includeSubDomains; preload",
            },
          ]
        : [];

    return [
      {
        source: "/:path*",
        headers: [...securityHeaders, ...productionOnly],
      },
      {
        source: "/",
        headers: [...securityHeaders, ...productionOnly],
      },
    ];
  },
};

export default nextConfig;
