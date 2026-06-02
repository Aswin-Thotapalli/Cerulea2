import { apiGet } from './client';
import type { NetworkStats, ChainSlug } from '@cerulea/types';

export async function fetchNetworkStats(
  chain: ChainSlug
): Promise<NetworkStats> {
  return apiGet<NetworkStats>(`/network/stats`, { chain });
}
