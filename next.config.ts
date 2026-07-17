import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/reports/export": [
      "./node_modules/@fontsource/noto-sans-thai/files/*.woff",
      "./node_modules/pdfkit/js/data/*.afm"
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb"
    }
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }
    ];

    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        source: "/uploads/:path*",
        headers: [
          ...securityHeaders,
          { key: "Content-Security-Policy", value: "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" }
        ]
      }
    ];
  }
};

export default nextConfig;
