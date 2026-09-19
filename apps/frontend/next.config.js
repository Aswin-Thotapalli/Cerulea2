/**
 * The Cerulea security header set.
 *
 * The list matches apis/src/security/headers.ts exactly. A test in the APIs
 * repository reads this file and holds it to that list, so one change never
 * lands in one surface alone.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'content-security-policy', value: contentSecurityPolicy },
  { key: 'strict-transport-security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'x-content-type-options', value: 'nosniff' },
  { key: 'x-frame-options', value: 'DENY' },
  { key: 'referrer-policy', value: 'no-referrer' },
  {
    key: 'permissions-policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  { key: 'cross-origin-opener-policy', value: 'same-origin' },
  { key: 'cross-origin-resource-policy', value: 'same-origin' },
  { key: 'origin-agent-cluster', value: '?1' },
  { key: 'x-dns-prefetch-control', value: 'off' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  experimental: {
    // (bcryptjs is pure-JS and doesn't need to be excluded from webpack bundling)
  },

  output: 'standalone',
  compress: true,
  productionBrowserSourceMaps: false,

  // Only proxy /api if you explicitly enable it.
  async rewrites() {
    if (process.env.NEXT_PUBLIC_API_PROXY === '1') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:4000/api/:path*',
        },
      ];
    }
    return [];
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cerulea-backend.onrender.com' },
    ],
  },

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

module.exports = nextConfig;
