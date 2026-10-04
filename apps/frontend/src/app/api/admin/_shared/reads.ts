// apps/frontend/src/app/api/admin/_shared/reads.ts
// The shapes the Cerulea operator reads answer, and the small derivations the
// administration screens share.
// Every figure here comes from Cerulea APIs. Nothing is estimated.
// Without this module each operator route would redeclare the same shapes.

/** One integration driver as the administration summary reports it. */
export type DriverReading = {
  integration: string;
  kind: 'local' | 'live';
  ready: boolean;
  detail: string;
};

/** The platform part of GET /studio/administration/summary. */
export type SummaryPlatform = {
  mode: 'local' | 'live';
  chainName: string;
  chainKind: 'local' | 'live';
  head: number;
  finalizedBlock: number;
  activeValidators: number;
  totalValidators: number;
  consensusHealth: 'Healthy' | 'Degraded' | 'Critical';
  healthy: boolean;
  issues: string[];
  drivers: DriverReading[];
  readAt: string;
};

/** The counts part of GET /studio/administration/summary. */
export type SummaryCounts = {
  accounts: number;
  accountsWithSecondFactor: number;
  openSessions: number;
  workspaces: number;
  projects: number;
  blueprintVersions: number;
  checkpoints: number;
  deployments: number;
  openKeys: number;
  openSubscriptions: number;
  auditEvents: number;
  refusedActions: number;
  /** Arrives once Cerulea APIs counts Cerulea Intelligence threads. */
  intelligenceThreads?: number;
  /** Arrives once Cerulea APIs counts the operator accounts. */
  operators?: number;
};

export type Summary = { platform: SummaryPlatform; counts: SummaryCounts };

/** One row of GET /studio/administration/accounts. */
export type AccountRow = {
  accountId: string;
  email: string;
  displayName: string;
  state: string;
  multiFactorActive: boolean;
  openSessions: number;
  workspaces: number;
  lastSignInAt: string | null;
  createdAt: string;
  /** Arrive once Cerulea APIs carries the plan on each account row. */
  planId?: string | null;
  subscriptionState?: string | null;
  projects?: number;
};

/** One row of GET /studio/administration/workspaces. */
export type WorkspaceRow = {
  workspaceId: string;
  name: string;
  application: string;
  tier: string;
  state: string;
  members: number;
  projects: number;
  createdAt: string;
};

/** One row of GET /studio/administration/projects. */
export type ProjectRow = {
  projectId: string;
  workspaceId: string;
  workspaceName: string;
  name: string;
  state: string;
  headVersion: number;
  deployments: number;
  createdAt: string;
  updatedAt: string;
  /** Arrive once Cerulea APIs carries the owner on each project row. */
  ownerAccountId?: string;
  ownerEmail?: string;
  ownerName?: string;
};

/** One event of GET /studio/administration/security. */
export type SecurityEvent = {
  eventId: string;
  action: string;
  subjectType: string;
  outcome: string;
  networkAddress: string;
  accountEmail: string;
  occurredAt: string;
};

/** One session of GET /studio/administration/security. */
export type SecuritySession = {
  sessionId: string;
  accountId: string;
  device: string;
  networkAddress: string;
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  rotationCount: number;
};

export type SecurityRead = { events: SecurityEvent[]; sessions: SecuritySession[] };

/** One open item the operator overview and the alerts bell list. */
export type OpenItem = {
  id: string;
  source: 'chain' | 'driver';
  message: string;
};

/**
 * Lists every open item the platform summary carries.
 * A chain issue the node reports and a driver that answers as not ready each count once.
 */
export function openItems(platform: SummaryPlatform): OpenItem[] {
  const chain = platform.issues.map((issue, index) => ({
    id: `chain-${index}`,
    source: 'chain' as const,
    message: `${platform.chainName}: ${issue}`,
  }));
  const drivers = platform.drivers
    .filter((driver) => driver.ready === false)
    .map((driver) => ({
      id: `driver-${driver.integration}`,
      source: 'driver' as const,
      message: `${driver.integration} driver (${driver.kind}): ${driver.detail}`,
    }));
  return [...chain, ...drivers];
}
