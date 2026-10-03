// apps/frontend/src/app/api/dashboard/networks/route.ts
// The Networks panel reads the Blockchain of every project through this route.
// Cerulea APIs opens the Blockchain each deployment runs and reads its height,
// its validators and its region from the node. The throughput comes from the
// blocks the workspace overview measures. Nothing here is estimated.
// Without this route the panel would show nothing about the running networks.
import { NextResponse } from 'next/server';

import {
  type CeruleaApiOptions,
  type CeruleaProject,
  type CeruleaWorkspace,
  ceruleaRequest,
  listProjects,
  listWorkspaces,
} from '@/lib/cerulea-api';
import { callOptions, ceruleaActor, failureReply, signInRequired } from '@/lib/cerulea-server';
import { divisionForApplication, lockedProjectType } from '@/config/divisions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** One deployment as the Cerulea APIs Networks read reports it. */
type NetworkReading = {
  deploymentId: string;
  projectId: string;
  region: string;
  state: string;
  publicationState: string | null;
  rolledBackAt: string | null;
  failureReason: string | null;
  reachable: boolean;
  unreachableReason: string | null;
  chainName: string | null;
  height: number | null;
  finalizedBlock: number | null;
  peers: number | null;
  activeValidators: number | null;
  totalValidators: number | null;
  consensusHealth: 'Healthy' | 'Degraded' | 'Critical' | null;
  healthy: boolean | null;
};

/** The part of the workspace overview read this route uses. */
type WorkspaceOverview = {
  health: { deploymentId: string | null };
  throughput: { transactionsPerSecond: number; sampledBlocks: number; measuredAt: string };
};

/**
 * Names the state the production screen shows.
 * A reachable Blockchain is live. A deployment in progress is deploying.
 * A deployment Cerulea removed, or one whose Blockchain answers nothing, is paused.
 * A project with no deployment is still in build.
 */
function screenStatus(reading: NetworkReading | undefined): string {
  if (!reading) return 'building';
  if (reading.state === 'pending' || reading.state === 'queued' || reading.state === 'running') {
    return 'deploying';
  }
  if (reading.state === 'failed') return 'failed';
  if (reading.reachable) return 'live';
  return 'paused';
}

/** The share of validators taking part in agreement, as a percentage. */
function activeShare(reading: NetworkReading | undefined): number | null {
  if (!reading || !reading.reachable) return null;
  if (reading.activeValidators === null || !reading.totalValidators) return null;
  return Math.round((reading.activeValidators / reading.totalValidators) * 1000) / 10;
}

async function readWorkspace(workspace: CeruleaWorkspace, options: CeruleaApiOptions) {
  const id = encodeURIComponent(workspace.workspaceId);
  const [projects, networks] = await Promise.all([
    listProjects(workspace.workspaceId, options),
    ceruleaRequest<{ networks: NetworkReading[]; observedAt: string }>(
      `/dashboard/workspaces/${id}/networks`,
      { method: 'GET' },
      options,
    ),
  ]);
  // The overview read measures the Blockchain of the first live deployment.
  // Cerulea reads it only when a deployment answers, so an idle workspace costs one call less.
  const measured = networks.networks.some((reading) => reading.reachable)
    ? await ceruleaRequest<WorkspaceOverview>(
        `/dashboard/workspaces/${id}/overview`,
        { method: 'GET' },
        options,
      )
    : null;
  return { projects: projects.projects, networks: networks.networks, measured };
}

function networkRow(
  workspace: CeruleaWorkspace,
  project: CeruleaProject,
  readings: NetworkReading[],
  measured: WorkspaceOverview | null,
) {
  // The Networks read lists deployments newest first.
  const newest = readings.find((reading) => reading.projectId === project.projectId);
  // The workspace application fixes the division, and the division fixes the project type.
  const division = divisionForApplication(workspace.application);
  const projectType = division ? lockedProjectType(division) : null;
  const throughput =
    newest && measured && measured.health.deploymentId === newest.deploymentId
      ? measured.throughput
      : null;
  return {
    id: project.projectId,
    name: project.name,
    type: projectType === 'blockchain' ? 'L1' : projectType === 'dapp' ? 'dApp' : null,
    projectType,
    status: screenStatus(newest),
    blockHeight: newest?.height ?? null,
    finalizedBlock: newest?.finalizedBlock ?? null,
    tps: throughput ? throughput.transactionsPerSecond : null,
    sampledBlocks: throughput ? throughput.sampledBlocks : null,
    consensusHealth: activeShare(newest),
    consensusState: newest?.consensusHealth ?? null,
    activeValidators: newest?.activeValidators ?? null,
    totalValidators: newest?.totalValidators ?? null,
    peers: newest?.peers ?? null,
    chainName: newest?.chainName ?? null,
    region: newest?.region ?? null,
    deploymentId: newest?.deploymentId ?? null,
    deploymentState: newest?.state ?? null,
    failureReason: newest?.failureReason ?? null,
    unreachableReason: newest?.unreachableReason ?? null,
    workspaceId: workspace.workspaceId,
    workspaceName: workspace.name,
    lastUpdated: project.updatedAt,
    createdAt: project.createdAt,
  };
}

export async function GET() {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  try {
    const options = callOptions(actor);
    const { workspaces } = await listWorkspaces(options);
    const networks = [];
    for (const workspace of workspaces) {
      const held = await readWorkspace(workspace, options);
      for (const project of held.projects) {
        networks.push(networkRow(workspace, project, held.networks, held.measured));
      }
    }
    return NextResponse.json({ networks });
  } catch (cause) {
    return failureReply(cause);
  }
}
