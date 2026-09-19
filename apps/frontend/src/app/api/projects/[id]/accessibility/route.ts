// apps/frontend/src/app/api/projects/[id]/accessibility/route.ts
// The accessibility report of the generated application.
// The frontend engine inside Cerulea APIs generates the application from the
// Blueprint and checks it against the Web Content Accessibility Guidelines
// version 2.2 level AA. A failure blocks publication.
// This route reads the Blueprint of one project, asks the engine for the
// interface it generates, and asks the engine to check it.
// Without this route Studio could not hold publication on a failure.
import { ceruleaRequest, readBlueprint } from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type InterfaceReply = { section: unknown };

type AccessibilityReply = {
  passes: boolean;
  headline: string;
  findings: {
    area: string;
    severity: string;
    guideline: string;
    screen: string;
    component: string;
    problem: string;
    fix: string;
  }[];
  publication?: { blocked: true; message: string; fix: string };
};

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const asked = new URL(request.url).searchParams.get('version');
  const version = asked && Number.isInteger(Number(asked)) ? Number(asked) : undefined;
  return withActor(async (actor) => {
    const options = callOptions(actor);
    const held = await readBlueprint(params.id, { version }, options);
    const generated = await ceruleaRequest<InterfaceReply>(
      '/engine/interface',
      { method: 'POST', body: JSON.stringify({ document: held.document }) },
      options,
    );
    const report = await ceruleaRequest<AccessibilityReply>(
      '/engine/accessibility',
      {
        method: 'POST',
        body: JSON.stringify({ document: held.document, section: generated.section }),
      },
      options,
    );
    return { version: held.version, ...report };
  });
}
