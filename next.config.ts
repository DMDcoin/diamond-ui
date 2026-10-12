import type { NextConfig } from "next";

const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://ui2.bit.diamonds").replace(
    /\/$/,
    ""
  );

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  // Enable source maps for debugging in production
  productionBrowserSourceMaps: true,
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding", "accounts", /^@x402\//);
    return config;
  },
  env: {
    NEXT_PUBLIC_WC_PROJECT_ID: process.env.NEXT_PUBLIC_WC_PROJECT_ID || '2cceb4f25f1cb889b967ea3c40bfd7cd',
  },
  experimental: {
    esmExternals: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: "/",
        headers: [
          {
            key: "Link",
            value: [
              `<${SITE_URL}/.well-known/api-catalog>; rel="api-catalog"`,
              `<${SITE_URL}/sitemap.xml>; rel="sitemap"`,
              `<${SITE_URL}/.well-known/agent-skills/index.json>; rel="describedby"`,
            ].join(", "),
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/wiki",
        destination: "https://overview.bit.diamonds",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/.well-known/api-catalog",
        destination: "/api/well-known/api-catalog",
      },
      {
        source: "/mcp",
        destination: "/api/mcp",
      },
    ];
  },
};

export default nextConfig;
