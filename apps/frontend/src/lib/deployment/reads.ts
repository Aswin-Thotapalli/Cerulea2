// apps/frontend/src/lib/deployment/reads.ts
// The deployment reads the Deploy & UI step makes on the server.
// Cerulea APIs runs the seven stage deployment and keeps one row per stage.
// These calls start a deployment with the content address of the head
// Blueprint, read one deployment with every stage, and list the deployments of
// a project. Every value the console shows comes from these reads. Nothing is
// produced in the browser.
// Without this module the console would have no real stages to show.

import {
  type CeruleaApiOptions,
  type Deployment,
  type DeploymentStage,
  CeruleaApiError,
  ceruleaRequest,
  createDeployment,
  readBlueprint,
  readDeployment,
} from '@/lib/cerulea-api';
import type { AccessibilityOutcome } from '@/lib/interface/types';
import { storedSection } from '@/lib/interface/server';

/** One stage with the detail Cerulea APIs recorded for it. */
export type DeploymentStageView = DeploymentStage & {
  number: number;
  detail: Record<string, unknown> | null;
};

/** One deployment as the console reads it. */
export type DeploymentView = Omit<Deployment, 'stages'> & {
  stages: DeploymentStageView[];
  projectId: string;
  blueprintHash: string;
  target: string;
  startedAt: string | null;
  endedAt: string | null;
  rolledBackAt: string | null;
  failureReason: string | null;
};

/** The seven stage names in the order Cerulea runs them. */
export const STAGE_ORDER = ['verify', 'provision', 'start', 'install', 'publish', 'health', 'record'] as const;

/** Reads the deployment shape Cerulea APIs sends, keeping the stage detail and the failure reason. */
export function readDeploymentView(payload: unknown): DeploymentView {
  const core = readDeployment(payload);
  const record = payload as Record<string, unknown>;
  const rawStages = Array.isArray(record.stages) ? (record.stages as Record<string, unknown>[]) : [];
  const stages: DeploymentStageView[] = core.stages.map((stage, index) => {
    const raw = rawStages[index] ?? {};
    const number = typeof raw.number === 'number' ? raw.number : index + 1;
    const detail = raw.detail && typeof raw.detail === 'object' ? (raw.detail as Record<string, unknown>) : null;
    return { ...stage, number, detail };
  });
  stages.sort((left, right) => left.number - right.number);
  const text = (key: string): string | null => (typeof record[key] === 'string' ? (record[key] as string) : null);
  return {
    id: core.id,
    status: core.status,
    record: core.record,
    stages,
    projectId: text('projectId') ?? '',
    blueprintHash: text('blueprintHash') ?? '',
    target: text('target') ?? 'local',
    startedAt: text('startedAt'),
    endedAt: text('endedAt'),
    rolledBackAt: text('rolledBackAt'),
    failureReason: text('failureReason'),
  };
}

/** Reads one deployment with every stage row. */
export async function readProjectDeployment(
  deploymentId: string,
  options: CeruleaApiOptions,
): Promise<DeploymentView> {
  const payload = await ceruleaRequest<unknown>(
    `/v1/deployments/${encodeURIComponent(deploymentId)}`,
    { method: 'GET' },
    options,
  );
  return readDeploymentView(payload);
}

/** Lists every deployment of one project, newest first. */
export async function listProjectDeployments(
  projectId: string,
  options: CeruleaApiOptions,
): Promise<DeploymentView[]> {
  const payload = await ceruleaRequest<{ deployments: unknown[] }>(
    `/v1/projects/${encodeURIComponent(projectId)}/deployments`,
    { method: 'GET' },
    options,
  );
  return (payload.deployments ?? []).map(readDeploymentView);
}

/**
 * Starts a deployment of the head Blueprint of one project.
 *
 * The accessibility gate runs first over the screens the Blueprint holds. A
 * failure stops the deployment here with the fix the engine named, since the
 * generated application must pass before it publishes. The content address
 * of the head version then names what Cerulea installs.
 */
export async function startProjectDeployment(
  projectId: string,
  options: CeruleaApiOptions,
): Promise<DeploymentView> {
  const held = await readBlueprint(projectId, {}, options);
  const stored = storedSection(held.document);
  const section =
    stored ??
    (
      await ceruleaRequest<{ section: unknown }>(
        '/engine/interface',
        { method: 'POST', body: JSON.stringify({ document: held.document }) },
        options,
      )
    ).section;
  const gate = await ceruleaRequest<AccessibilityOutcome>(
    '/engine/accessibility',
    { method: 'POST', body: JSON.stringify({ document: held.document, section }) },
    options,
  );
  if (gate.publication?.blocked) {
    throw new CeruleaApiError(
      {
        code: 'deployment.publication_blocked',
        message: gate.publication.message,
        fix: gate.publication.fix,
        details: { findings: gate.findings.length, version: held.version },
      },
      409,
    );
  }
  const started = await createDeployment(
    { projectId, blueprintHash: held.blueprintHash },
    options,
  );
  return readProjectDeployment(started.deploymentId, options);
}

/** Rolls one deployment back. */
export async function rollbackProjectDeployment(
  deploymentId: string,
  reason: string | undefined,
  options: CeruleaApiOptions,
): Promise<DeploymentView> {
  const payload = await ceruleaRequest<unknown>(
    `/v1/deployments/${encodeURIComponent(deploymentId)}/rollback`,
    { method: 'POST', body: JSON.stringify(reason ? { reason } : {}) },
    options,
  );
  return readDeploymentView(payload);
}
