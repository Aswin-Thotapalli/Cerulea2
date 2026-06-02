import { apiGet, type PaginatedResponse } from './client';
import type { ValidatorInfo, ChainSlug } from '@cerulea/types';

export interface ValidatorListParams {
  page?: number;
  limit?: number;
}

export async function fetchValidatorList(
  chain: ChainSlug,
  params: ValidatorListParams = {}
): Promise<PaginatedResponse<ValidatorInfo>> {
  return apiGet<PaginatedResponse<ValidatorInfo>>(`/validators`, {
    chain,
    page: params.page ?? 1,
    limit: params.limit ?? 25,
  });
}

export async function fetchValidator(
  chain: ChainSlug,
  address: string
): Promise<ValidatorInfo> {
  return apiGet<ValidatorInfo>(`/validators/${address}`, { chain });
}
