import { apiGet, type PaginatedResponse } from './client';
import type { ContractInfo, ChainSlug } from '@cerulea/types';

export async function fetchContract(
  chain: ChainSlug,
  address: string
): Promise<ContractInfo> {
  return apiGet<ContractInfo>(`/contracts/${address}`, { chain });
}

export async function fetchContractEvents(
  chain: ChainSlug,
  address: string,
  params: { page?: number; limit?: number } = {}
): Promise<PaginatedResponse<Record<string, unknown>>> {
  return apiGet<PaginatedResponse<Record<string, unknown>>>(
    `/contracts/${address}/events`,
    { chain, page: params.page ?? 1, limit: params.limit ?? 25 }
  );
}

export interface VerifyContractPayload {
  address: string;
  sourceCode: string;
  compilerVersion: string;
  contractName: string;
  optimization?: string;
  abi?: unknown;
}

export interface VerifyContractResult {
  verified: boolean;
  message: string;
}

export async function verifyContract(
  chain: ChainSlug,
  payload: VerifyContractPayload
): Promise<VerifyContractResult> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  const res = await fetch(`${base}/contracts/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chain, ...payload }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Verification failed' })) as { message?: string };
    throw new Error(err.message ?? 'Verification failed');
  }
  return res.json() as Promise<VerifyContractResult>;
}
