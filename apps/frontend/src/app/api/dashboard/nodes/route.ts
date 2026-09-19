// apps/frontend/src/app/api/dashboard/nodes/route.ts
// The Nodes panel reads this route.
// The node identity, the running version, the peer count and every validator
// come from the node through Cerulea APIs.
// Without this route an operator cannot see who is authoring blocks.
import { readChainNetwork, readChainValidators } from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return withActor(async (actor) => {
    const options = callOptions(actor);
    const [network, validators] = await Promise.all([
      readChainNetwork(options),
      readChainValidators(options),
    ]);
    return { network, validators: validators.validators };
  });
}
