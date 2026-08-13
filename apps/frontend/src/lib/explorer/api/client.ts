import { getApiBaseUrl } from '@/lib/explorer/chains';
import { demoApi } from '@/lib/explorer/demo-data';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const base = getApiBaseUrl();
  // No external API configured → serve self-contained demo data so the explorer
  // works with zero backend. Set NEXT_PUBLIC_API_BASE_URL to switch to a real API.
  if (!base) {
    try {
      return demoApi(path, params) as T;
    } catch (e) {
      const err = e as { status?: number; message?: string };
      throw new ApiError(err.status ?? 404, err.message ?? 'Not found');
    }
  }

  const url = new URL(`${base}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json' },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText })) as { message?: string };
    throw new ApiError(res.status, body.message ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}
