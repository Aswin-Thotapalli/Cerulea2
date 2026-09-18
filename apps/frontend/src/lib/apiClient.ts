// apps/frontend/src/lib/apiClient.ts
// One fetch helper for every Cerulea route this app calls.
// The helper reads the error message the route returns, so a failure names the fix.
export async function api<T = any>(url: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    ...init,
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");
  if (!res.ok) {
    const msg =
      (payload && typeof payload === "object" && (payload.message || payload.error)) ||
      (typeof payload === "string" && payload) ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return payload as T;
}

export type DraftRecord<T = unknown> = {
  ok: boolean;
  data: T;
  updatedAt: number;
};

/**
 * Reads one saved draft bucket for a project.
 * The drafts route keys every bucket by project, so both values travel with the request.
 */
export const getDraft = <T = unknown>(projectId: string, bucket: string) =>
  api<DraftRecord<T>>(`/api/drafts?projectId=${encodeURIComponent(projectId)}&bucket=${encodeURIComponent(bucket)}`);

/**
 * Writes one draft bucket for a project.
 * Work in progress stays on the machine until this call succeeds.
 */
export const upsertDraft = <T = unknown>(input: { projectId: string; bucket: string; data: T }) =>
  api<{ ok: boolean; updatedAt: number }>('/api/drafts', {
    method: 'POST',
    body: JSON.stringify(input),
  });
