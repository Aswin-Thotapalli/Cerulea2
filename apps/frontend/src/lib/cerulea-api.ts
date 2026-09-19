// apps/frontend/src/lib/cerulea-api.ts
// One client module for Cerulea APIs.
// Studio holds no database connection. Every account, session, workspace,
// project and Blueprint read or write passes through this module.
// Without this module Studio shows nothing and saves nothing.

/** The address Cerulea APIs listens on when the environment names no other. */
export const CERULEA_API_FALLBACK_URL = 'http://localhost:4000';

/** The device value Studio presents on every call, so a session binding holds. */
export const CERULEA_STUDIO_DEVICE = 'Cerulea Studio';

/**
 * Resolves the address of Cerulea APIs.
 * CERULEA_API_URL names the address on the server.
 * NEXT_PUBLIC_CERULEA_API_URL names the address in the browser.
 * The fallback serves a local run.
 */
export function ceruleaApiBaseUrl(override?: string): string {
  const named = (
    override ??
    process.env.CERULEA_API_URL ??
    process.env.NEXT_PUBLIC_CERULEA_API_URL ??
    ''
  ).trim();
  return (named || CERULEA_API_FALLBACK_URL).replace(/\/+$/, '');
}

export type CeruleaApiOptions = {
  /** Overrides the resolved address. Tests and a second environment use this. */
  baseUrl?: string;
  /** Overrides the fetch used for the call. Tests use this. */
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  /** The access token Cerulea APIs issued at sign in. */
  accessToken?: string;
  /** The device value the session was bound to. */
  device?: string;
  /**
   * Answer codes the caller reads as a result rather than a failure.
   * The compiler answers 422 with a full report, which Studio renders.
   */
  acceptStatuses?: number[];
};

/** The shape every Cerulea APIs failure carries. */
export type CeruleaApiFailure = {
  code: string;
  message: string;
  fix: string;
  details: Record<string, unknown>;
};

/** A failure Cerulea APIs reported, with the code and the fix it named. */
export class CeruleaApiError extends Error {
  readonly code: string;
  readonly fix: string;
  readonly status: number;
  readonly details: Record<string, unknown>;

  constructor(failure: CeruleaApiFailure, status: number) {
    super(`${failure.message} ${failure.fix}`.trim());
    this.name = 'CeruleaApiError';
    this.code = failure.code;
    this.fix = failure.fix;
    this.status = status;
    this.details = failure.details;
  }
}

function readFailure(payload: unknown, status: number, base: string, path: string): CeruleaApiError {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const carrier = (payload as { error: unknown }).error;
    if (carrier && typeof carrier === 'object') {
      const record = carrier as Record<string, unknown>;
      if (typeof record.message === 'string') {
        return new CeruleaApiError(
          {
            code: typeof record.code === 'string' ? record.code : 'service.unnamed',
            message: record.message,
            fix:
              typeof record.fix === 'string'
                ? record.fix
                : 'Correct the request and send it again.',
            details:
              record.details && typeof record.details === 'object'
                ? (record.details as Record<string, unknown>)
                : {},
          },
          status,
        );
      }
    }
  }
  return new CeruleaApiError(
    {
      code: 'service.unnamed',
      message: `Cerulea APIs at ${base} answered ${status} for ${path}.`,
      fix: 'Read the Cerulea APIs log for the reason, then send the request again.',
      details: {},
    },
    status,
  );
}

/** Sends one call to Cerulea APIs and reads the answer. */
export async function ceruleaRequest<T>(
  path: string,
  init: RequestInit,
  options: CeruleaApiOptions = {},
): Promise<T> {
  const base = ceruleaApiBaseUrl(options.baseUrl);
  const call = options.fetchImpl ?? fetch;
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-cerulea-device': options.device ?? CERULEA_STUDIO_DEVICE,
    ...((init.headers as Record<string, string> | undefined) ?? {}),
  };
  if (options.accessToken) {
    headers.authorization = `Bearer ${options.accessToken}`;
  }

  let response: Response;
  try {
    response = await call(`${base}${path}`, { ...init, signal: options.signal, headers });
  } catch {
    throw new CeruleaApiError(
      {
        code: 'service.unreachable',
        message: `Cerulea APIs at ${base} did not answer.`,
        fix: 'Start Cerulea APIs, or set CERULEA_API_URL to the address it runs on.',
        details: { base, path },
      },
      503,
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok && !(options.acceptStatuses ?? []).includes(response.status)) {
    throw readFailure(payload, response.status, base, path);
  }
  return payload as T;
}

function query(values: Record<string, string | number | boolean | undefined>): string {
  const parts = Object.entries(values)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

/* Accounts ---------------------------------------------------------- */

export type CeruleaAccount = {
  accountId: string;
  email: string;
  displayName: string;
  state: string;
  multiFactorActive: boolean;
  lastSignInAt?: string;
  createdAt: string;
};

export type MultiFactorEnrolment = {
  secret: string;
  uri: string;
  recoveryCodes: string[];
};

/** Opens an account and issues the second factor at the same moment. */
export function registerAccount(
  input: { email: string; displayName: string; password: string },
  options: CeruleaApiOptions = {},
): Promise<{ account: CeruleaAccount; enrolment: MultiFactorEnrolment; guidance: string }> {
  return ceruleaRequest('/accounts', { method: 'POST', body: JSON.stringify(input) }, options);
}

/** Opens the account once the person confirms a code from the authenticator. */
export function activateMultiFactor(
  input: { email: string; password: string; code: string },
  options: CeruleaApiOptions = {},
): Promise<{ account: CeruleaAccount }> {
  return ceruleaRequest(
    '/accounts/multi-factor/activation',
    { method: 'POST', body: JSON.stringify(input) },
    options,
  );
}

/* Sessions ---------------------------------------------------------- */

export type CeruleaSession = {
  sessionId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  refreshExpiresAt: string;
  rotationCount: number;
};

export type CeruleaSessionSummary = {
  sessionId: string;
  device: string;
  networkAddress: string;
  issuedAt: string;
  expiresAt: string;
  rotationCount: number;
  current: boolean;
};

/** Signs in with the password and the second factor. */
export function signIn(
  input: { email: string; password: string; multiFactorCode: string },
  options: CeruleaApiOptions = {},
): Promise<{ account: CeruleaAccount; session: CeruleaSession }> {
  return ceruleaRequest('/sessions', { method: 'POST', body: JSON.stringify(input) }, options);
}

/** Rotates both tokens and retires the earlier session. */
export function refreshSession(
  refreshToken: string,
  options: CeruleaApiOptions = {},
): Promise<{ account: CeruleaAccount; session: CeruleaSession }> {
  return ceruleaRequest(
    '/sessions/refresh',
    { method: 'POST', body: JSON.stringify({ refreshToken }) },
    options,
  );
}

/** Lists the sessions open on the account. */
export function listSessions(
  options: CeruleaApiOptions = {},
): Promise<{ sessions: CeruleaSessionSummary[] }> {
  return ceruleaRequest('/sessions', { method: 'GET' }, options);
}

/** Closes the session the request carries. */
export function closeCurrentSession(
  options: CeruleaApiOptions = {},
): Promise<{ session: CeruleaSessionSummary }> {
  return ceruleaRequest('/sessions/current', { method: 'DELETE' }, options);
}

/** Closes one named session. */
export function closeSession(
  sessionId: string,
  options: CeruleaApiOptions = {},
): Promise<{ session: CeruleaSessionSummary }> {
  return ceruleaRequest(
    `/sessions/${encodeURIComponent(sessionId)}`,
    { method: 'DELETE' },
    options,
  );
}

/** Reads the account the access token belongs to. */
export function readAccount(options: CeruleaApiOptions = {}): Promise<{ account: CeruleaAccount }> {
  return ceruleaRequest('/accounts/me', { method: 'GET' }, options);
}

/* Recovery ---------------------------------------------------------- */

/** Starts password recovery. Cerulea APIs sends the link to the address. */
export function startRecovery(
  email: string,
  options: CeruleaApiOptions = {},
): Promise<{ guidance: string }> {
  return ceruleaRequest(
    '/accounts/recovery',
    { method: 'POST', body: JSON.stringify({ email }) },
    options,
  );
}

/** Completes password recovery with the token from the link. */
export function completeRecovery(
  input: { token: string; password: string },
  options: CeruleaApiOptions = {},
): Promise<{ guidance: string }> {
  return ceruleaRequest(
    '/accounts/recovery/completion',
    { method: 'POST', body: JSON.stringify(input) },
    options,
  );
}

/* Workspaces -------------------------------------------------------- */

export type CeruleaApplication = 'dapps' | 'enterprise' | 'government';

export type CeruleaWorkspace = {
  workspaceId: string;
  name: string;
  slug: string;
  application: string;
  tier: string;
  state: string;
  ownerAccountId: string;
  role?: string;
  createdAt: string;
};

export type CeruleaMember = {
  memberId: string;
  workspaceId: string;
  accountId?: string;
  email: string;
  displayName: string;
  role: string;
  state: string;
  joinedAt?: string;
  invitationExpiresAt?: string;
};

/** Lists every workspace the account belongs to. */
export function listWorkspaces(
  options: CeruleaApiOptions = {},
): Promise<{ workspaces: CeruleaWorkspace[] }> {
  return ceruleaRequest('/workspaces', { method: 'GET' }, options);
}

/** Opens a workspace and makes the caller its owner. */
export function createWorkspace(
  input: { name: string; application?: CeruleaApplication },
  options: CeruleaApiOptions = {},
): Promise<{ workspace: CeruleaWorkspace }> {
  return ceruleaRequest('/workspaces', { method: 'POST', body: JSON.stringify(input) }, options);
}

/** Reads one workspace. */
export function readWorkspace(
  workspaceId: string,
  options: CeruleaApiOptions = {},
): Promise<{ workspace: CeruleaWorkspace }> {
  return ceruleaRequest(
    `/workspaces/${encodeURIComponent(workspaceId)}`,
    { method: 'GET' },
    options,
  );
}

/** Lists the members of one workspace. */
export function listMembers(
  workspaceId: string,
  options: CeruleaApiOptions = {},
): Promise<{ members: CeruleaMember[] }> {
  return ceruleaRequest(
    `/workspaces/${encodeURIComponent(workspaceId)}/members`,
    { method: 'GET' },
    options,
  );
}

/** Invites one person into a workspace with a role. */
export function inviteMember(
  workspaceId: string,
  input: { email: string; role: string },
  options: CeruleaApiOptions = {},
): Promise<{ member: CeruleaMember; guidance: string }> {
  return ceruleaRequest(
    `/workspaces/${encodeURIComponent(workspaceId)}/invitations`,
    { method: 'POST', body: JSON.stringify(input) },
    options,
  );
}

/** Reads the role list and the capability each role carries. */
export function listWorkspaceRoles(
  options: CeruleaApiOptions = {},
): Promise<{ roles: { role: string; capabilities: string[] }[] }> {
  return ceruleaRequest('/workspaces/roles', { method: 'GET' }, options);
}

/* Projects ---------------------------------------------------------- */

export type CeruleaProject = {
  projectId: string;
  workspaceId: string;
  name: string;
  slug: string;
  summary: string;
  state: string;
  headVersion: number;
  headBlueprintId?: string;
  headBlueprintHash?: string;
  createdAt: string;
  updatedAt: string;
};

export type CeruleaBlueprintVersion = {
  blueprintId: string;
  projectId: string;
  version: number;
  blueprintHash: string;
  schemaVersion: string;
  note: string;
  createdByAccountId: string;
  createdAt: string;
};

/** Lists every project inside one workspace. */
export function listProjects(
  workspaceId: string,
  options: CeruleaApiOptions = {},
): Promise<{ projects: CeruleaProject[] }> {
  return ceruleaRequest(
    `/workspaces/${encodeURIComponent(workspaceId)}/projects`,
    { method: 'GET' },
    options,
  );
}

/** Opens a project with its first Blueprint version. */
export function createProject(
  workspaceId: string,
  input: { name: string; summary?: string },
  options: CeruleaApiOptions = {},
): Promise<{ project: CeruleaProject; blueprint: CeruleaBlueprintVersion }> {
  return ceruleaRequest(
    `/workspaces/${encodeURIComponent(workspaceId)}/projects`,
    { method: 'POST', body: JSON.stringify(input) },
    options,
  );
}

/** Reads one project. */
export function readProject(
  projectId: string,
  options: CeruleaApiOptions = {},
): Promise<{ project: CeruleaProject }> {
  return ceruleaRequest(`/projects/${encodeURIComponent(projectId)}`, { method: 'GET' }, options);
}

/** Changes the name, the summary or the state of one project. */
export function updateProject(
  projectId: string,
  input: { name?: string; summary?: string; state?: string },
  options: CeruleaApiOptions = {},
): Promise<{ project: CeruleaProject }> {
  return ceruleaRequest(
    `/projects/${encodeURIComponent(projectId)}`,
    { method: 'PATCH', body: JSON.stringify(input) },
    options,
  );
}

/** Reads one Blueprint version with its document. */
export function readBlueprint(
  projectId: string,
  selector: { version?: number; blueprintHash?: string } = {},
  options: CeruleaApiOptions = {},
): Promise<CeruleaBlueprintVersion & { document: unknown }> {
  return ceruleaRequest(
    `/projects/${encodeURIComponent(projectId)}/blueprint${query(selector)}`,
    { method: 'GET' },
    options,
  );
}

/** Saves a Blueprint. The head version moves forward when the content changes. */
export function saveBlueprint(
  projectId: string,
  input: { document: unknown; note?: string; expectedVersion?: number },
  options: CeruleaApiOptions = {},
): Promise<{ blueprint: CeruleaBlueprintVersion; created: boolean }> {
  return ceruleaRequest(
    `/projects/${encodeURIComponent(projectId)}/blueprint`,
    { method: 'PUT', body: JSON.stringify(input) },
    options,
  );
}

/** Lists the Blueprint versions of one project, newest first. */
export function listBlueprintVersions(
  projectId: string,
  limit?: number,
  options: CeruleaApiOptions = {},
): Promise<{ versions: CeruleaBlueprintVersion[] }> {
  return ceruleaRequest(
    `/projects/${encodeURIComponent(projectId)}/blueprint/versions${query({ limit })}`,
    { method: 'GET' },
    options,
  );
}

/** Compares two Blueprint versions and names the sections that changed. */
export function compareBlueprintVersions(
  projectId: string,
  from: number,
  to: number,
  options: CeruleaApiOptions = {},
): Promise<{ from: number; to: number; changedSections: string[]; identical: boolean }> {
  return ceruleaRequest(
    `/projects/${encodeURIComponent(projectId)}/blueprint/comparison${query({ from, to })}`,
    { method: 'GET' },
    options,
  );
}

/* Checkpoints ------------------------------------------------------- */

export type CeruleaCheckpoint = {
  checkpointId: string;
  projectId: string;
  blueprintId: string;
  blueprintHash: string;
  version: number;
  label: string;
  note: string;
  restoredFromCheckpointId?: string;
  createdByAccountId: string;
  createdAt: string;
};

/** Lists the checkpoints of one project. */
export function listCheckpoints(
  projectId: string,
  options: CeruleaApiOptions = {},
): Promise<{ checkpoints: CeruleaCheckpoint[] }> {
  return ceruleaRequest(
    `/projects/${encodeURIComponent(projectId)}/checkpoints`,
    { method: 'GET' },
    options,
  );
}

/** Takes a checkpoint of the current Blueprint. */
export function createCheckpoint(
  projectId: string,
  input: { label: string; note?: string; version?: number },
  options: CeruleaApiOptions = {},
): Promise<{ checkpoint: CeruleaCheckpoint }> {
  return ceruleaRequest(
    `/projects/${encodeURIComponent(projectId)}/checkpoints`,
    { method: 'POST', body: JSON.stringify(input) },
    options,
  );
}

/* The Blockchain ---------------------------------------------------- */

export type ChainHeader = {
  number: number;
  hash: string;
  parentHash: string;
  stateRoot: string;
  extrinsicsRoot: string;
  author?: string;
  producedAt: string;
};

export type ChainStatus = {
  chainName: string;
  kind: 'local' | 'live';
  status: {
    currentEpoch: number;
    activeValidators: number;
    totalValidators: number;
    lastFinalizedBlock: number;
    consensusHealth: 'Healthy' | 'Degraded' | 'Critical';
  };
  health: { isHealthy: boolean; issues: string[] };
};

export type ChainValidator = {
  profile: {
    account: string;
    stake: string;
    standingScore: number;
    trustScore: number;
    state: 'Active' | 'Inactive' | 'Slashed';
    authoredBlocks: number;
    missedBlocks: number;
  };
  trust: {
    total: number;
    standing: number;
    performance: number;
    custody: number;
    verification: number;
  };
};

/** Reads the agreement state of the Blockchain. */
export function readChainStatus(options: CeruleaApiOptions = {}): Promise<ChainStatus> {
  return ceruleaRequest('/chain/status', { method: 'GET' }, options);
}

/** Reads the newest block header and the height that is irreversible. */
export function readChainHead(
  options: CeruleaApiOptions = {},
): Promise<{ header: ChainHeader; finalizedBlock: number }> {
  return ceruleaRequest('/chain/head', { method: 'GET' }, options);
}

/** Reads one block by height. */
export function readChainBlock(
  blockNumber: number,
  options: CeruleaApiOptions = {},
): Promise<{ header: ChainHeader; extrinsics: unknown[]; finalized: boolean }> {
  return ceruleaRequest(`/chain/blocks/${blockNumber}`, { method: 'GET' }, options);
}

/** Reads every validator with its standing breakdown. */
export function readChainValidators(
  options: CeruleaApiOptions = {},
): Promise<{ validators: ChainValidator[] }> {
  return ceruleaRequest('/chain/validators', { method: 'GET' }, options);
}

/** Reads the method list the node publishes. */
export function readChainMethods(
  options: CeruleaApiOptions = {},
): Promise<{
  methods: { name: string; description: string; params: string[]; returns: string }[];
}> {
  return ceruleaRequest('/chain/methods', { method: 'GET' }, options);
}

/** Reads one record from a collection on the Blockchain with its inclusion proof. */
export function readChainRecord(
  collection: string,
  key: string,
  options: CeruleaApiOptions = {},
): Promise<{ record: unknown; proof: unknown }> {
  return ceruleaRequest(
    `/chain/records/${encodeURIComponent(collection)}/${encodeURIComponent(key)}`,
    { method: 'GET' },
    options,
  );
}

export type ChainNetwork = {
  node: {
    systemName: string;
    systemVersion: string;
    chainName: string;
    kind: 'local' | 'live';
    peers: number;
    isSyncing: boolean;
    shouldHavePeers: boolean;
    observedAt: string;
  };
  head: ChainHeader;
  finalizedBlock: number;
  finalityLag: number;
  epoch: number;
  round: number;
  validatorSetId: number;
  activeValidators: number;
  totalValidators: number;
  consensusHealth: 'Healthy' | 'Degraded' | 'Critical';
  healthy: boolean;
  issues: string[];
};

export type ChainMeasurement = {
  sampledBlocks: number;
  meanBlockSeconds: number;
  transactions: number;
  transactionsPerSecond: number;
  firstBlock: number;
  lastBlock: number;
  measuredAt: string;
};

/** Reads the node, the head and the agreement state in one call. */
export function readChainNetwork(options: CeruleaApiOptions = {}): Promise<ChainNetwork> {
  return ceruleaRequest('/studio/chain/network', { method: 'GET' }, options);
}

/** Measures the recent behaviour of the Blockchain from the blocks themselves. */
export function readChainMeasurement(
  blocks?: number,
  options: CeruleaApiOptions = {},
): Promise<ChainMeasurement> {
  return ceruleaRequest(
    `/studio/chain/measurement${query({ blocks })}`,
    { method: 'GET' },
    options,
  );
}

/* The compiler ------------------------------------------------------ */

export type CompilerEntry = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  fix: string;
  section: string;
  path: string;
  elementId?: string;
  elementName?: string;
  screen: string;
};

export type CompilerReport = {
  blueprintHash: string;
  ok: boolean;
  reachedStage: string;
  errorCount: number;
  warningCount: number;
  headline: string;
  sections: {
    section: string;
    heading: string;
    errors: number;
    warnings: number;
    entries: CompilerEntry[];
  }[];
  firstFix?: CompilerEntry;
};

export type CompilerRun = {
  ok: boolean;
  reachedStage: string;
  report: CompilerReport;
  artefacts?: unknown;
  version?: number;
};

/** Checks one Blueprint document Studio holds. */
export function compileDocument(
  document: unknown,
  options: CeruleaApiOptions = {},
): Promise<CompilerRun> {
  return ceruleaRequest(
    '/compiler/runs',
    { method: 'POST', body: JSON.stringify({ document }) },
    { ...options, acceptStatuses: [422, ...(options.acceptStatuses ?? [])] },
  );
}

/** Checks the Blueprint version stored against one project. */
export function compileProject(
  projectId: string,
  version?: number,
  options: CeruleaApiOptions = {},
): Promise<CompilerRun> {
  return ceruleaRequest(
    `/projects/${encodeURIComponent(projectId)}/compiler/runs${query({ version })}`,
    { method: 'POST', body: JSON.stringify({}) },
    { ...options, acceptStatuses: [422, ...(options.acceptStatuses ?? [])] },
  );
}

/** Reads the Deployment Manifest in one of its three views. */
export function readDeploymentManifest(
  projectId: string,
  selector: { version?: number; view?: 'summary' | 'atomic' | 'comparison'; against?: number } = {},
  options: CeruleaApiOptions = {},
): Promise<Record<string, unknown>> {
  return ceruleaRequest(
    `/projects/${encodeURIComponent(projectId)}/deployment-manifest${query(selector)}`,
    { method: 'GET' },
    options,
  );
}

/** Reads the published description of the generated surface. */
export function readInterfaceDescription(
  projectId: string,
  version?: number,
  options: CeruleaApiOptions = {},
): Promise<{ version: number; description: unknown }> {
  return ceruleaRequest(
    `/projects/${encodeURIComponent(projectId)}/interface-description${query({ version })}`,
    { method: 'GET' },
    options,
  );
}

/* Deployments ------------------------------------------------------- */

export type DeploymentStageStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped';

export type DeploymentStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'rolled_back';

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

const SETTLED_STATUSES: DeploymentStatus[] = ['succeeded', 'failed', 'rolled_back'];

/** Reports whether a deployment has stopped moving. */
export function isDeploymentSettled(status: DeploymentStatus): boolean {
  return SETTLED_STATUSES.includes(status);
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

/** Starts a deployment of one project. */
export async function createDeployment(
  input: CreateDeploymentInput,
  options: CeruleaApiOptions = {},
): Promise<{ deploymentId: string }> {
  const payload = await ceruleaRequest<unknown>(
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
  const payload = await ceruleaRequest<unknown>(
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
  reason?: string,
  options: CeruleaApiOptions = {},
): Promise<Deployment | null> {
  const payload = await ceruleaRequest<unknown>(
    `/v1/deployments/${encodeURIComponent(deploymentId)}/rollback`,
    { method: 'POST', body: JSON.stringify(reason ? { reason } : {}) },
    options,
  );
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.id !== 'string') return null;
  return readDeployment(payload);
}

/** Lists every deployment of one project, newest first. */
export async function listDeployments(
  projectId: string,
  options: CeruleaApiOptions = {},
): Promise<Deployment[]> {
  const payload = await ceruleaRequest<{ deployments: unknown[] }>(
    `/v1/projects/${encodeURIComponent(projectId)}/deployments`,
    { method: 'GET' },
    options,
  );
  return (payload.deployments ?? []).map(readDeployment);
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

/* The Blueprint address --------------------------------------------- */

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
