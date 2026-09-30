// apps/frontend/src/app/api/projects/[id]/interface/route.ts
// Step 5 Interface, the generated application of one project.
// The handler reads the Blueprint on the server, asks the frontend engine
// inside Cerulea APIs for the screens, the component set and the roles, and
// reads the endpoints out of the Deployment Manifest.
// The access token stays on the server. The browser receives the answer alone.
// Without this route Step 5 would hold the token in the browser.
import { readInterfaceWorkspace } from '@/lib/interface/server';
import { callOptions, withActor } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const asked = new URL(request.url).searchParams.get('version');
  const held = asked === null ? Number.NaN : Number(asked);
  const version = Number.isInteger(held) && held > 0 ? held : undefined;
  return withActor(async (actor) =>
    readInterfaceWorkspace(params.id, { version }, callOptions(actor)),
  );
}
