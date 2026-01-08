export async function api<T = any>(url: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    ...init,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Request failed');
  return (await res.json()) as T;
}

export const getApps = () => api('/api/apps');
export const createApp = (name: string) =>
  api('/api/apps', { method: 'POST', body: JSON.stringify({ name }) });

export const getDrafts = () => api('/api/drafts');
export const upsertDraft = (input: { id?: string; appId?: string|null; step: string; payload?: any }) =>
  api('/api/drafts/upsert', { method: 'POST', body: JSON.stringify(input) });

export const getDeployments = () => api('/api/deployments');
