import { apiGet, type PaginatedResponse } from './client';
import type { ExtrinsicSummary, ExtrinsicDetail, ChainSlug, TxStatus } from '@cerulea/types';

export interface TxListParams {
  page?: number;
  limit?: number;
  address?: string;
  status?: TxStatus;
  method?: string;
  blockNumber?: number;
}

export async function fetchTxList(
  chain: ChainSlug,
  params: TxListParams = {}
): Promise<PaginatedResponse<ExtrinsicSummary>> {
  return apiGet<PaginatedResponse<ExtrinsicSummary>>(`/txs`, {
    chain,
    page: params.page ?? 1,
    limit: params.limit ?? 25,
    address: params.address,
    status: params.status,
    blockNumber: params.blockNumber,
  });
}

export async function fetchTxByHash(
  chain: ChainSlug,
  hash: string
): Promise<ExtrinsicDetail> {
  return apiGet<ExtrinsicDetail>(`/txs/${hash}`, { chain });
}
