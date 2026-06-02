/** Build a PaginatedResponse from a DB result. */
export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  return {
    items,
    total,
    page,
    pageSize: limit,
    hasNextPage: page * limit < total,
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

/** Parse and clamp pagination query params. */
export function parsePagination(query: Record<string, any>): { page: number; limit: number; offset: number } {
  const page  = Math.max(1, parseInt(query.page  ?? '1',  10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '25', 10) || 25));
  return { page, limit, offset: (page - 1) * limit };
}
