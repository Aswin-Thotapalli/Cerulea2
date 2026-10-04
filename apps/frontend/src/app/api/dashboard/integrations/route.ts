// apps/frontend/src/app/api/dashboard/integrations/route.ts
// The Integrations screen reads this route.
// Three kinds of connection appear. The platform drivers Cerulea APIs runs,
// the feeds, bridges and outbound triggers each Blueprint declares, and the
// surface the live deployment of one project publishes: its record, action,
// proof and stream endpoints and the events it delivers outward.
// Without this route nobody can see what a deployment reaches outside itself.
import { readIntegrations } from '@/lib/blueprint/document';
import {
  type Deployment,
  fetchDeployment,
  listBlueprintVersions,
  listDeployments,
  readInterfaceDescription,
  readPlatformHealth,
} from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';
import { projectsWithBlueprints } from '@/lib/project-blueprints';
import { divisionForApplication } from '@/config/divisions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type DescribedEndpoint = {
  method?: string;
  path?: string;
  purpose?: string;
  roles?: string[];
  transactionClass?: string;
  threshold?: number;
};

type DescribedWebhook = {
  event?: string;
  purpose?: string;
  endpoint?: string;
  signing?: string;
  retries?: number;
};

type DescribedStream = { path?: string; purpose?: string };

type Described = {
  endpoints?: DescribedEndpoint[];
  proofEndpoints?: DescribedEndpoint[];
  webhooks?: DescribedWebhook[];
  streams?: DescribedStream[];
  descriptionHash?: string;
};

type SurfaceEndpoint = {
  kind: 'record' | 'action' | 'proof' | 'stream';
  method: string;
  path: string;
  address: string;
  purpose: string;
  roles: string[];
  transactionClass: string | null;
  threshold: number | null;
};

/** The surface one live deployment publishes. */
type PublishedSurface = {
  projectId: string;
  deploymentId: string;
  status: string;
  host: string | null;
  basePath: string | null;
  certificateNotAfter: string | null;
  blueprintHash: string | null;
  descriptionHash: string | null;
  descriptionVersion: number | null;
  descriptionMatchesDeployment: boolean;
  endpoints: SurfaceEndpoint[];
  webhooks: { event: string; purpose: string; endpoint: string; signing: string; retries: number }[];
};

function readArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Reads the host, the base path and the certificate out of the deployment record. */
function readTarget(deployment: Deployment): {
  host: string | null;
  basePath: string | null;
  certificateNotAfter: string | null;
  blueprintHash: string | null;
  descriptionHash: string | null;
} {
  const record = (deployment.record ?? {}) as Record<string, unknown>;
  const target = (record.target ?? {}) as Record<string, unknown>;
  const certificate = (target.certificate ?? {}) as Record<string, unknown>;
  return {
    host: text(target.host),
    basePath: text(target.basePath),
    certificateNotAfter: text(certificate.notAfter),
    blueprintHash: text(record.blueprintHash),
    descriptionHash: text(record.descriptionHash),
  };
}

/** Builds the address a caller types for one published path. */
function addressOf(host: string | null, basePath: string | null, path: string): string {
  const base = `${basePath ?? ''}${path}`;
  return host ? `https://${host}${base}` : base;
}

/**
 * Reads the surface the latest successful deployment of one project publishes.
 * The answer is absent when the project holds no successful deployment.
 */
async function readSurface(
  projectId: string,
  options: ReturnType<typeof callOptions>,
): Promise<PublishedSurface | null> {
  const deployments = await listDeployments(projectId, options);
  const live = deployments.find((entry) => entry.status === 'succeeded');
  if (!live) return null;
  const deployment = await fetchDeployment(live.id, options);
  const target = readTarget(deployment);

  // The description is read at the Blueprint version the deployment installed.
  const versions = await listBlueprintVersions(projectId, 50, options);
  const installed = target.blueprintHash
    ? versions.versions.find((entry) => entry.blueprintHash === target.blueprintHash)
    : undefined;
  const described = await readInterfaceDescription(projectId, installed?.version, options);
  const description = (described.description ?? {}) as Described;

  const endpoints: SurfaceEndpoint[] = [];
  for (const entry of readArray<DescribedEndpoint>(description.endpoints)) {
    const method = entry.method ?? 'GET';
    const path = entry.path ?? '';
    endpoints.push({
      kind: method === 'GET' ? 'record' : 'action',
      method,
      path,
      address: addressOf(target.host, target.basePath, path),
      purpose: entry.purpose ?? '',
      roles: entry.roles ?? [],
      transactionClass: entry.transactionClass ?? null,
      threshold: entry.threshold ?? null,
    });
  }
  for (const entry of readArray<DescribedEndpoint>(description.proofEndpoints)) {
    const path = entry.path ?? '';
    endpoints.push({
      kind: 'proof',
      method: entry.method ?? 'GET',
      path,
      address: addressOf(target.host, target.basePath, path),
      purpose: entry.purpose ?? '',
      roles: entry.roles ?? [],
      transactionClass: null,
      threshold: null,
    });
  }
  for (const entry of readArray<DescribedStream>(description.streams)) {
    const path = entry.path ?? '';
    endpoints.push({
      kind: 'stream',
      method: 'GET',
      path,
      address: addressOf(target.host, target.basePath, path),
      purpose: entry.purpose ?? '',
      roles: [],
      transactionClass: null,
      threshold: null,
    });
  }

  return {
    projectId,
    deploymentId: deployment.id,
    status: deployment.status,
    host: target.host,
    basePath: target.basePath,
    certificateNotAfter: target.certificateNotAfter,
    blueprintHash: target.blueprintHash,
    descriptionHash: text(description.descriptionHash) ?? target.descriptionHash,
    descriptionVersion: described.version,
    descriptionMatchesDeployment: installed !== undefined,
    endpoints,
    webhooks: readArray<DescribedWebhook>(description.webhooks).map((entry) => ({
      event: entry.event ?? '',
      purpose: entry.purpose ?? '',
      endpoint: entry.endpoint ?? '',
      signing: entry.signing ?? 'None',
      retries: entry.retries ?? 0,
    })),
  };
}

export async function GET(request: Request) {
  const named = new URL(request.url).searchParams.get('projectId');
  return withActor(async (actor) => {
    const options = callOptions(actor);
    const [health, { entries }] = await Promise.all([
      readPlatformHealth(options),
      projectsWithBlueprints(actor.displayName, options),
    ]);
    const projects = entries.map((entry) => {
      const integrations = readIntegrations(entry.document);
      return {
        projectId: entry.project.projectId,
        projectName: entry.project.name,
        workspaceId: entry.workspace.workspaceId,
        workspaceName: entry.workspace.name,
        division: divisionForApplication(entry.workspace.application),
        state: entry.project.state,
        version: entry.version,
        feeds: integrations.feeds,
        bridges: integrations.bridges,
        triggers: integrations.triggers,
      };
    });
    const selected =
      (named ? projects.find((entry) => entry.projectId === named) : undefined) ?? projects[0];
    const surface = selected ? await readSurface(selected.projectId, options) : null;
    return {
      platform: {
        mode: health.mode,
        ready: health.ready,
        checkedAt: health.checkedAt,
        drivers: health.integrations,
      },
      projects,
      selectedProjectId: selected?.projectId ?? null,
      surface,
    };
  });
}
