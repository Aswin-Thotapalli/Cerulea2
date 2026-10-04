// apps/frontend/src/app/api/dashboard/_shared/fake-cerulea.test-support.ts
// A fake Cerulea APIs for the Dashboard route tests.
// Each test tells the fake how to answer one call. The fake records every call
// it receives, so a test checks the path, the method and the access token a
// route sent as well as the body the route returned.
// Without this helper every route test would carry the same fetch stub.
import { vi } from 'vitest';

export type Call = { method: string; path: string; body: unknown; authorization: string | null };
type Answer = { method: string; path: string; status: number; body: unknown; unreachable: boolean };

export const BASE = 'http://cerulea-apis.test';

/** The fake, with the calls it saw and the answers it holds. */
export class FakeCerulea {
  calls: Call[] = [];
  private answers: Answer[] = [];

  /** Tells the fake how to answer one call. */
  answer(method: string, path: string, body: unknown, status = 200): void {
    this.answers.push({ method, path, status, body, unreachable: false });
  }

  /** Makes one call fail at the network. */
  unreachable(method: string, path: string): void {
    this.answers.push({ method, path, status: 0, body: null, unreachable: true });
  }

  /** Installs the fake as the global fetch. */
  install(): void {
    process.env.CERULEA_API_URL = BASE;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
        const url = new URL(String(input instanceof Request ? input.url : input));
        const path = `${url.pathname}${url.search}`;
        const method = init.method ?? 'GET';
        const headers = (init.headers ?? {}) as Record<string, string>;
        this.calls.push({
          method,
          path,
          body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
          authorization: headers.authorization ?? headers.Authorization ?? null,
        });
        const match = this.answers.find((entry) => entry.method === method && entry.path === path);
        if (!match) {
          return Response.json(
            refusal('suite.unanswered', `The suite holds no answer for ${method} ${path}.`, 'Add one.'),
            { status: 404 },
          );
        }
        if (match.unreachable) throw new TypeError('fetch failed');
        return Response.json(match.body, { status: match.status });
      }),
    );
  }

  /** The paths the fake saw, in order. */
  paths(): string[] {
    return this.calls.map((call) => `${call.method} ${call.path}`);
  }
}

/** The failure body Cerulea APIs writes. */
export function refusal(code: string, message: string, fix: string) {
  return { error: { code, message, fix, details: {} } };
}

export const registry = {
  workspaceId: 'wsp_registry',
  name: 'Registry office',
  slug: 'registry-office',
  application: 'government',
  tier: 'starter',
  state: 'active',
  ownerAccountId: 'act_dashboard_suite',
  createdAt: '2026-01-04T09:00:00.000Z',
};

export const market = {
  ...registry,
  workspaceId: 'wsp_market',
  name: 'Market dApps',
  slug: 'market-dapps',
  application: 'dapps',
};

export function project(
  projectId: string,
  name: string,
  workspaceId: string,
  state: string,
  updatedAt: string,
) {
  return {
    projectId,
    workspaceId,
    name,
    slug: projectId.replace('prj_', '').split('_').join('-'),
    summary: `${name} summary`,
    state,
    headVersion: 3,
    createdAt: '2026-01-05T09:00:00.000Z',
    updatedAt,
  };
}

export const chainNetwork = {
  node: {
    systemName: 'cerulea-node',
    systemVersion: '0.1.0-local',
    chainName: 'Cerulea',
    kind: 'local',
    peers: 3,
    isSyncing: false,
    shouldHavePeers: true,
    observedAt: '2026-10-04T03:13:54.000Z',
  },
  head: {
    number: 24,
    hash: '0xabc',
    parentHash: '0xaba',
    stateRoot: '0x1',
    extrinsicsRoot: '0x2',
    producedAt: '2026-10-04T03:13:50.000Z',
  },
  finalizedBlock: 22,
  finalityLag: 2,
  epoch: 0,
  round: 13,
  validatorSetId: 1,
  activeValidators: 4,
  totalValidators: 4,
  consensusHealth: 'Healthy',
  healthy: true,
  issues: [],
};

export const chainMeasurement = {
  sampledBlocks: 24,
  meanBlockSeconds: 0.6,
  transactions: 48,
  transactionsPerSecond: 1.74,
  firstBlock: 1,
  lastBlock: 24,
  measuredAt: '2026-10-04T03:13:54.000Z',
};

/** One deployment reading as the Cerulea APIs Networks read reports it. */
export function networkReading(
  deploymentId: string,
  projectId: string,
  projectName: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    deploymentId,
    projectId,
    projectName,
    blueprintHash: '00'.repeat(32),
    target: 'local',
    region: 'local',
    state: 'succeeded',
    publicationState: 'live',
    host: `${projectName.toLowerCase().split(' ').join('-')}.cerulea.test`,
    basePath: `/v1/deployments/${deploymentId}`,
    publishedAt: '2026-10-01T04:09:58.825Z',
    startedAt: '2026-10-01T04:09:56.832Z',
    finishedAt: '2026-10-01T04:09:59.074Z',
    rolledBackAt: null,
    failureReason: null,
    reachable: true,
    unreachableReason: null,
    chainName: 'Cerulea',
    nodeVersion: '0.1.0-local',
    height: 35,
    finalizedBlock: 33,
    finalityLag: 2,
    peers: 1,
    isSyncing: false,
    activeValidators: 2,
    totalValidators: 2,
    consensusHealth: 'Healthy',
    healthy: true,
    issues: [],
    ...overrides,
  };
}
