import type { ChainConfig, ChainSlug } from '@cerulea/types';

export const CHAINS: Record<ChainSlug, ChainConfig> = {
  public: {
    slug: 'public',
    name: 'Cerulea Public',
    chainId: 'cerulea-public-1',
    rpcWsEnvVar: 'NEXT_PUBLIC_RPC_WS_PUBLIC',
    rpcHttpEnvVar: 'NEXT_PUBLIC_RPC_HTTP_PUBLIC',
    color: '#3d5afe',
    permissioned: false,
  },
  private: {
    slug: 'private',
    name: 'Cerulea Private',
    chainId: 'cerulea-private-1',
    rpcWsEnvVar: 'NEXT_PUBLIC_RPC_WS_PRIVATE',
    rpcHttpEnvVar: 'NEXT_PUBLIC_RPC_HTTP_PRIVATE',
    color: '#9c27b0',
    permissioned: true,
  },
};

export const CHAIN_SLUGS: ChainSlug[] = ['public', 'private'];

export function isValidChain(slug: string): slug is ChainSlug {
  return slug === 'public' || slug === 'private';
}

export function getChainConfig(slug: ChainSlug): ChainConfig {
  return CHAINS[slug];
}

/** Resolve the WebSocket URL for a chain at runtime (NEXT_PUBLIC_* vars). */
export function getRpcWsUrl(slug: ChainSlug): string {
  const envKey = CHAINS[slug].rpcWsEnvVar as keyof NodeJS.ProcessEnv;
  const url = process.env[envKey];
  if (!url) {
    console.warn(
      `[chains] ${envKey} is not set. RPC connections to ${slug} chain will fail.`
    );
    return '';
  }
  return url;
}

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
}
