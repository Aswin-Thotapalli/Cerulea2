/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile local monorepo packages (source packages, not compiled)
  transpilePackages: ['@cerulea/ui', '@cerulea/types', '@cerulea/utils'],

  // Allow images from cerulea.io domains
  images: {
    domains: ['cerulea.io'],
  },

  // Environment-variable type-safety reminder: all NEXT_PUBLIC_* vars must be
  // set before build time; server-only vars are fine at runtime.
  experimental: {
    // Required for packages/** symlink resolution in some npm workspace setups
    externalDir: true,
  },
};

module.exports = nextConfig;
