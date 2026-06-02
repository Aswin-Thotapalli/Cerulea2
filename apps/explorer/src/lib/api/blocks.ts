import { apiGet, type PaginatedResponse } from './client';
import type { BlockSummary, BlockDetail, ChainSlug } from '@cerulea/types';

export interface BlockListParams {
  page?: number;
  limit?: number;
}

export async function fetchBlockList(
  chain: ChainSlug,
  params: BlockListParams = {}
): Promise<PaginatedResponse<BlockSummary>> {
  return apiGet<PaginatedResponse<BlockSummary>>(`/blocks`, {
    chain,
    page: params.page ?? 1,
    limit: params.limit ?? 25,
  });
}

export async function fetchBlockByNumber(
  chain: ChainSlug,
  number: number
): Promise<BlockDetail> {
  return apiGet<BlockDetail>(`/blocks/${number}`, { chain });
}

export async function fetchBlockByHash(
  chain: ChainSlug,
  hash: string
): Promise<BlockDetail> {
  return apiGet<BlockDetail>(`/blocks/hash/${hash}`, { chain });
}
