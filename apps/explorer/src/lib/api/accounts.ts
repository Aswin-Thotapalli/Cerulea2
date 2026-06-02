import { apiGet, type PaginatedResponse } from './client';
import type { AccountInfo, ExtrinsicSummary, ChainSlug } from '@cerulea/types';

export async function fetchAccount(
  chain: ChainSlug,
  address: string
): Promise<AccountInfo> {
  return apiGet<AccountInfo>(`/accounts/${address}`, { chain });
}

export interface AccountTxsParams {
  page?: number;
  limit?: number;
}

export async function fetchAccountTxs(
  chain: ChainSlug,
  address: string,
  params: AccountTxsParams = {}
): Promise<PaginatedResponse<ExtrinsicSummary>> {
  return apiGet<PaginatedResponse<ExtrinsicSummary>>(
    `/accounts/${address}/txs`,
    { chain, page: params.page ?? 1, limit: params.limit ?? 25 }
  );
}
