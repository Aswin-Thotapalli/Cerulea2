// apps/frontend/src/app/api/projects/[id]/readiness/route.ts
// What remains before deployment, for one project.
// The list comes from the Blueprint validation report the Cerulea APIs
// compiler produces, and from the steps the person has finished. Every line
// names the screen that closes it.
// Without this route the project list could not report readiness.
import { compileProject, readBuildState } from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';
import { buildReadiness } from '@/lib/studio/readiness';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return withActor(async (actor) => {
    const options = callOptions(actor);
    const [run, held] = await Promise.all([
      compileProject(params.id, undefined, options),
      readBuildState(params.id, options),
    ]);
    const readiness = buildReadiness({
      report: run.report,
      buildState: held.buildState,
      simulationRun: held.buildState.steps.verify,
    });
    return {
      projectId: params.id,
      version: run.version ?? null,
      blueprintHash: run.report.blueprintHash,
      compilerOk: run.ok,
      ...readiness,
    };
  });
}
