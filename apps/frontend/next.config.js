/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cerulea/types', '@cerulea/ui', '@cerulea/utils'],

  // Prevent webpack from bundling these server packages that use package-export
  // wildcard patterns webpack 5 can't resolve at build time.
  serverExternalPackages: ['@modelcontextprotocol/sdk', 'mcp-handler'],

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
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
