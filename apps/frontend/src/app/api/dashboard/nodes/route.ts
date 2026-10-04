// apps/frontend/src/app/api/dashboard/nodes/route.ts
// The Nodes screen reads this route.
// The node identity, the running version, the peer count and every validator
// come from the node Studio is joined to. The nodes each deployment runs come
// from the Nodes read of every workspace, with the memory, the processor time
// and the uptime the hosting process measured. The region of each node comes
// from the deployment it serves.
// Without this route an operator cannot see who is authoring blocks.
import {
  type CeruleaApiOptions,
  type CeruleaWorkspace,
  ceruleaRequest,
  listWorkspaces,
  readChainNetwork,
  readChainValidators,
} from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';
import { divisionForApplication } from '@/config/divisions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** One node as the Cerulea APIs Nodes read reports it. */
type NodeReading = {
  nodeId: string;
  deploymentId: string;
  projectName: string;
  account: string;
  kind: 'process' | 'in_process';
  state: 'running' | 'stopped';
  processId: number | null;
  answerPort: number | null;
  systemName: string | null;
  systemVersion: string | null;
  chainName: string | null;
  height: number | null;
  peers: number | null;
  expectedPeers: number;
  isSyncing: boolean | null;
  resources: {
    source: 'hosting_service' | 'node_process';
    residentBytes: number | null;
    heapUsedBytes: number | null;
    processorSeconds: number | null;
    uptimeSeconds: number | null;
    dataDirectoryBytes: number | null;
  };
  startedAt: string | null;
};

/** The part of the Networks read this route joins for the region. */
type NetworkReading = { deploymentId: string; projectId: string; region: string };

/** One deployment node as the screen reads it. */
export type DeploymentNode = NodeReading & {
  workspaceId: string;
  workspaceName: string;
  division: string;
  projectId: string | null;
  region: string | null;
};

async function readWorkspaceNodes(
  workspace: CeruleaWorkspace,
  options: CeruleaApiOptions,
): Promise<{ nodes: DeploymentNode[]; observedAt: string }> {
  const id = encodeURIComponent(workspace.workspaceId);
  const [nodes, networks] = await Promise.all([
    ceruleaRequest<{ nodes: NodeReading[]; observedAt: string }>(
      `/dashboard/workspaces/${id}/nodes`,
      { method: 'GET' },
      options,
    ),
    ceruleaRequest<{ networks: NetworkReading[] }>(
      `/dashboard/workspaces/${id}/networks`,
      { method: 'GET' },
      options,
    ),
  ]);
  const division = divisionForApplication(workspace.application) ?? 'enterprise';
  return {
    observedAt: nodes.observedAt,
    nodes: nodes.nodes.map((node) => {
      const deployment = networks.networks.find((entry) => entry.deploymentId === node.deploymentId);
      return {
        ...node,
        workspaceId: workspace.workspaceId,
        workspaceName: workspace.name,
        division,
        projectId: deployment?.projectId ?? null,
        region: deployment?.region ?? null,
      };
    }),
  };
}

export async function GET() {
  return withActor(async (actor) => {
    const options = callOptions(actor);
    const [network, validators, { workspaces }] = await Promise.all([
      readChainNetwork(options),
      readChainValidators(options),
      listWorkspaces(options),
    ]);
    const held = await Promise.all(
      workspaces.map((workspace) => readWorkspaceNodes(workspace, options)),
    );
    return {
      network,
      validators: validators.validators,
      nodes: held.flatMap((entry) => entry.nodes),
      observedAt: held.map((entry) => entry.observedAt).sort().at(-1) ?? network.node.observedAt,
    };
  });
}
