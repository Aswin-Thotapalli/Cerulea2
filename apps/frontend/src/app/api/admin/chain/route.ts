// apps/frontend/src/app/api/admin/chain/route.ts
// The Blockchain readings on the operator Blockchain Projects screen.
// Cerulea APIs reads the node, the newest block, the agreement state and every
// validator with its Trust Score parts. The throughput comes from the blocks
// themselves through the measurement read. Nothing here is estimated.
// Without this route the Blockchain project cards would carry no figure.
import { readChainMeasurement, readChainNetwork, readChainValidators } from '@/lib/cerulea-api';
import { callOptions, withActor } from '@/lib/cerulea-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return withActor(async (actor) => {
    const options = callOptions(actor);
    const [network, measurement, validators] = await Promise.all([
      readChainNetwork(options),
      readChainMeasurement(undefined, options),
      readChainValidators(options),
    ]);
    return { network, measurement, validators: validators.validators };
  });
}
