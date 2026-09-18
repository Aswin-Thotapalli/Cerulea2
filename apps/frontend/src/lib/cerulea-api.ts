// apps/frontend/src/lib/cerulea-api.ts
// One client module for Cerulea APIs.
// Studio starts a deployment here, reads its progress here and rolls it back here.
// Studio reports nothing about a deployment that Cerulea APIs did not send.
// Without this module Studio captures a project and installs nothing.

/** The address Cerulea APIs listens on when the environment names no other. */
export const CERULEA_API_FALLBACK_URL = 'http://localhost:4000';

/**
 * Resolves the address of Cerulea APIs.
 * NEXT_PUBLIC_CERULEA_API_URL names the address. The fallback serves a local run.
 */
export function ceruleaApiBaseUrl(override?: string): string {
  const named = (override ?? process.env.NEXT_PUBLIC_CERULEA_API_URL ?? '').trim();
  return (named || CERULEA_API_FALLBACK_URL).replace(/\/+$/, '');
}

export type DeploymentStageStatus =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'skipped';

export type DeploymentStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'rolled_back';

/** One stage of a deployment, exactly as Cerulea APIs reported it. */
export type DeploymentStage = {
  name: string;
  status: DeploymentStageStatus;
  startedAt: string | null;
  endedAt: string | null;
  outcome: string | null;
};

/** One deployment, exactly as Cerulea APIs reported it. */
export type Deployment = {
  id: string;
  status: DeploymentStatus;
  stages: DeploymentStage[];
  record: unknown;
};

export type CreateDeploymentInput = {
  projectId: string;
  blueprintHash: string;
};

export type CeruleaApiOptions = {
  /** Overrides the resolved address. Tests and a second environment use this. */
  baseUrl?: string;
  /** Overrides the fetch used for the call. Tests use this. */
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
};

const SETTLED_STATUSES: DeploymentStatus[] = ['succeeded', 'failed', 'rolled_back'];

/** Reports whether a deployment has stopped moving. */
export function isDeploymentSettled(status: DeploymentStatus): boolean {
  return SETTLED_STATUSES.includes(status);
}

function messageFromPayload(payload: unknown): string | null {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['message', 'error', 'detail']) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  }
  return null;
}

async function request<T>(path: string, init: RequestInit, options: CeruleaApiOptions): Promise<T> {
  const base = ceruleaApiBaseUrl(options.baseUrl);
  const call = options.fetchImpl ?? fetch;

  let response: Response;
  try {
    response = await call(`${base}${path}`, {
      ...init,
      signal: options.signal,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
  } catch (cause) {
    throw new Error(
      `Cerulea APIs at ${base} did not answer. Start Cerulea APIs, ` +
        'or set NEXT_PUBLIC_CERULEA_API_URL to the address it runs on.',
      { cause },
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) {
    const named = messageFromPayload(payload) ?? (typeof payload === 'string' ? payload.trim() : '');
    throw new Error(
      named ||
        `Cerulea APIs at ${base} answered ${response.status} for ${path}. ` +
          'Read the Cerulea APIs log for the reason, then start the deployment again.',
    );
  }

  return payload as T;
}

function readStage(value: unknown, index: number): DeploymentStage {
  if (!value || typeof value !== 'object') {
    throw new Error(
      `Cerulea APIs sent a stage at position ${index + 1} with no content. ` +
        'Upgrade Cerulea APIs to a version that sends name, status, startedAt, endedAt and outcome.',
    );
  }
  const record = value as Record<string, unknown>;
  if (typeof record.name !== 'string' || typeof record.status !== 'string') {
    throw new Error(
      `Cerulea APIs sent a stage at position ${index + 1} with no name or no status. ` +
        'Upgrade Cerulea APIs to a version that sends both values.',
    );
  }
  return {
    name: record.name,
    status: record.status as DeploymentStageStatus,
    startedAt: typeof record.startedAt === 'string' ? record.startedAt : null,
    endedAt: typeof record.endedAt === 'string' ? record.endedAt : null,
    outcome: typeof record.outcome === 'string' ? record.outcome : null,
  };
}

/** Reads the deployment shape Cerulea APIs sends, and names the fix when a value is absent. */
export function readDeployment(value: unknown): Deployment {
  if (!value || typeof value !== 'object') {
    throw new Error(
      'Cerulea APIs sent an empty deployment. ' +
        'Check that the Cerulea APIs deployment route is running, then read the deployment again.',
    );
  }
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || typeof record.status !== 'string') {
    throw new Error(
      'Cerulea APIs sent a deployment with no identifier or no status. ' +
        'Upgrade Cerulea APIs to a version that sends both values.',
    );
  }
  const stages = Array.isArray(record.stages) ? record.stages.map(readStage) : [];
  return {
    id: record.id,
    status: record.status as DeploymentStatus,
    stages,
    record: record.record ?? null,
  };
}

/**
 * Starts a deployment of one project.
 * Cerulea APIs answers with the identifier Studio then follows.
 */
export async function createDeployment(
  input: CreateDeploymentInput,
  options: CeruleaApiOptions = {},
): Promise<{ deploymentId: string }> {
  const payload = await request<unknown>(
    '/v1/deployments',
    { method: 'POST', body: JSON.stringify(input) },
    options,
  );
  const record = (payload ?? {}) as Record<string, unknown>;
  const deploymentId = record.deploymentId;
  if (typeof deploymentId !== 'string' || !deploymentId) {
    throw new Error(
      'Cerulea APIs accepted the deployment and sent no identifier. ' +
        'Upgrade Cerulea APIs to a version that answers with deploymentId.',
    );
  }
  return { deploymentId };
}

/** Reads the current state of one deployment. */
export async function fetchDeployment(
  deploymentId: string,
  options: CeruleaApiOptions = {},
): Promise<Deployment> {
  const payload = await request<unknown>(
    `/v1/deployments/${encodeURIComponent(deploymentId)}`,
    { method: 'GET' },
    options,
  );
  return readDeployment(payload);
}

/**
 * Rolls one deployment back.
 * Cerulea deployment is atomic, so a rollback returns the project to its previous state.
 */
export async function rollbackDeployment(
  deploymentId: string,
  options: CeruleaApiOptions = {},
): Promise<Deployment | null> {
  const payload = await request<unknown>(
    `/v1/deployments/${encodeURIComponent(deploymentId)}/rollback`,
    { method: 'POST' },
    options,
  );
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.id !== 'string') return null;
  return readDeployment(payload);
}

export type WatchDeploymentHandlers = {
  onUpdate: (deployment: Deployment) => void;
  onError: (error: Error) => void;
  intervalMs?: number;
};

/**
 * Follows one deployment until it settles.
 * The caller receives every state Cerulea APIs reports and nothing else.
 * The returned function stops the watch.
 */
export function watchDeployment(
  deploymentId: string,
  handlers: WatchDeploymentHandlers,
  options: CeruleaApiOptions = {},
): () => void {
  const intervalMs = handlers.intervalMs ?? 2000;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const stop = () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const tick = async () => {
    if (stopped) return;
    try {
      const deployment = await fetchDeployment(deploymentId, options);
      if (stopped) return;
      handlers.onUpdate(deployment);
      if (isDeploymentSettled(deployment.status)) {
        stop();
        return;
      }
    } catch (error) {
      if (stopped) return;
      handlers.onError(error instanceof Error ? error : new Error(String(error)));
      stop();
      return;
    }
    timer = setTimeout(tick, intervalMs);
  };

  void tick();
  return stop;
}

/**
 * Orders every key in a value, so the same Blueprint always produces the same text.
 * A stable text is what makes the Blueprint hash stable.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  const parts = Object.keys(record)
    .sort()
    .filter((key) => record[key] !== undefined)
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`);
  return `{${parts.join(',')}}`;
}

/**
 * Produces the content address of a Blueprint.
 * Cerulea APIs compares this value against the Blueprint it holds.
 * A deployment starts only when both sides agree on the same Blueprint.
 */
export async function blueprintHash(blueprint: unknown): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error(
      'This browser exposes no digest service, so Cerulea cannot address the Blueprint. ' +
        'Open Studio over https, or open it on localhost.',
    );
  }
  const bytes = new TextEncoder().encode(canonicalJson(blueprint));
  const digest = await subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
