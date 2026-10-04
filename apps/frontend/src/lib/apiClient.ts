// apps/frontend/src/lib/apiClient.ts
// One fetch helper for every Studio route the browser calls.
// Every Studio route forwards to Cerulea APIs, so the failure shape is the same
// everywhere. The helper reads the message and the fix Cerulea named.
// Without this helper a failed screen would show a bare status code.

export type RouteFailure = {
  code: string;
  message: string;
  fix: string;
  details: Record<string, unknown>;
};

/** A failure one Studio route reported, carrying the fix Cerulea named. */
export class StudioRouteError extends Error {
  readonly code: string;
  readonly fix: string;
  readonly status: number;
  /** The details the route named beside the fix, such as the faults of a refused Blueprint. */
  readonly details: Record<string, unknown>;

  constructor(failure: RouteFailure, status: number) {
    super(`${failure.message} ${failure.fix}`.trim());
    this.name = 'StudioRouteError';
    this.code = failure.code;
    this.fix = failure.fix;
    this.status = status;
    this.details = failure.details;
  }
}

function failureOf(payload: unknown, status: number, url: string): StudioRouteError {
  const outer =
    payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
  // A Studio route writes the failure fields beside a one sentence `error`.
  // An older answer nests them inside `error`.
  const carrier =
    outer && typeof outer.error === 'string' && typeof outer.message === 'string'
      ? outer
      : outer && 'error' in outer
        ? outer.error
        : null;
  if (carrier && typeof carrier === 'object') {
    const record = carrier as Record<string, unknown>;
    if (typeof record.message === 'string') {
      return new StudioRouteError(
        {
          code: typeof record.code === 'string' ? record.code : 'studio.unnamed',
          message: record.message,
          fix:
            typeof record.fix === 'string'
              ? record.fix
              : 'Open the screen again, then repeat the action.',
          details:
            record.details && typeof record.details === 'object'
              ? (record.details as Record<string, unknown>)
              : {},
        },
        status,
      );
    }
  }
  return new StudioRouteError(
    {
      code: 'studio.unnamed',
      message: `Studio answered ${status} for ${url}.`,
      fix: 'Open the screen again. Report the problem to the Cerulea operator when it repeats.',
      details: {},
    },
    status,
  );
}

/** Calls one Studio route and reads the answer. */
export async function api<T = unknown>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    ...init,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) throw failureOf(payload, response.status, url);
  return payload as T;
}

export type BlueprintRecord = {
  blueprintId: string;
  projectId: string;
  version: number;
  blueprintHash: string;
  schemaVersion: string;
  note: string;
  createdAt: string;
  document: unknown;
};

/** Reads the typed Blueprint document of one project. */
export function readProjectBlueprint(projectId: string, version?: number) {
  const suffix = version === undefined ? '' : `?version=${version}`;
  return api<BlueprintRecord>(
    `/api/projects/${encodeURIComponent(projectId)}/blueprint/document${suffix}`,
  );
}

/** Saves the Blueprint of one project and answers with the new version. */
export function writeProjectBlueprint(input: {
  projectId: string;
  document: unknown;
  note?: string;
  expectedVersion?: number;
}) {
  const { projectId, ...body } = input;
  return api<{ blueprint: Omit<BlueprintRecord, 'document'>; created: boolean }>(
    `/api/projects/${encodeURIComponent(projectId)}/blueprint/document`,
    { method: 'PUT', body: JSON.stringify(body) },
  );
}
