// apps/frontend/src/app/api/deployed/[slug]/route.ts
// The read behind the page a deployed system opens on.
// Cerulea finds the project the address names, reads its deployment record and
// states what the deployed Blueprint holds.
// Without this route the deployed page would have nothing to show.
import { NextResponse } from 'next/server';

import { countSections, readActions, readCollections, readViews } from '@/lib/blueprint/document';
import { listDeployments } from '@/lib/cerulea-api';
import { callOptions, ceruleaActor, failureReply, signInRequired } from '@/lib/cerulea-server';
import { projectsWithBlueprints } from '@/lib/project-blueprints';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  try {
    const options = callOptions(actor);
    const { entries } = await projectsWithBlueprints(actor.displayName, options);
    const entry = entries.find(
      (candidate) =>
        candidate.project.slug === params.slug || candidate.project.projectId === params.slug,
    );
    if (!entry) {
      return NextResponse.json(
        {
          error: {
            code: 'deployed.project_absent',
            message: 'Cerulea holds no project at that address for this account.',
            fix: 'Open the project list and choose a project it names.',
            details: {},
          },
        },
        { status: 404 },
      );
    }

    const deployments = await listDeployments(entry.project.projectId, options);
    const newest = deployments[0] ?? null;

    return NextResponse.json({
      project: {
        projectId: entry.project.projectId,
        name: entry.project.name,
        summary: entry.project.summary,
        state: entry.project.state,
        headVersion: entry.version,
      },
      workspace: { workspaceId: entry.workspace.workspaceId, name: entry.workspace.name },
      deployment:
        newest === null
          ? null
          : { deploymentId: newest.id, status: newest.status, stages: newest.stages },
      counts: countSections(entry.document),
      collections: readCollections(entry.document).map((collection) => ({
        id: collection.id,
        description: collection.description,
        privacy: collection.privacy,
      })),
      actions: readActions(entry.document).map((action) => ({
        id: action.id,
        name: action.name,
        description: action.description,
      })),
      views: readViews(entry.document).map((view) => ({
        id: view.id,
        name: view.name,
        collection: view.collection,
      })),
    });
  } catch (cause) {
    return failureReply(cause);
  }
}
