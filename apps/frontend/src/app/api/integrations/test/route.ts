// apps/frontend/src/app/api/integrations/test/route.ts
// The test button of the Integrations step.
// Each provider maps to a Cerulea kind. A kind Cerulea APIs serves through a
// driver answers with the real readiness of that driver, live or local, as
// the readiness route of Cerulea APIs reports it. The key custody kind
// answers with the key module reading. The oracle kind answers with the feed
// the Blueprint holds for the provider, since the chain oracle module serves
// it after deployment.
// Nothing here invents a result. Every sentence comes from Cerulea APIs or
// from the Blueprint document.
// Without this route the button would show a fixed tick.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { CeruleaApiError, ceruleaRequest, readBlueprint } from '@/lib/cerulea-api';
import { readBlueprintDocument } from '@/lib/blueprint/document';
import {
  callOptions,
  ceruleaActor,
  failureReply,
  failureResponse,
  signInRequired,
} from '@/lib/cerulea-server';
import {
  KINDS,
  type TestOutcome,
  entryId,
  providerById,
} from '@/components/studio/steps/step4-catalogue';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const body = z.object({
  projectId: z.string().min(1).max(160),
  integrationId: z.string().min(1).max(80),
  environment: z.enum(['test', 'live']).default('test'),
});

type Readiness = {
  mode: 'local' | 'live';
  checkedAt: string;
  integrations: { integration: string; kind: 'local' | 'live'; ready: boolean; detail: string }[];
};

type CustodyReading = {
  module: { kind: string; name: string; ready: boolean; detail: string; keyCount: number };
};

function outcome(input: Omit<TestOutcome, 'checkedAt'> & { checkedAt?: string }): NextResponse {
  return NextResponse.json({
    ok: input.ok,
    driver: input.driver,
    message: input.message,
    checkedAt: input.checkedAt ?? new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return failureResponse(
      {
        code: 'integrations.test_input_absent',
        message: 'Cerulea reads the project and the provider on this test.',
        fix: 'Choose a provider in the Integrations step, then press Test again.',
        details: {},
      },
      400,
    );
  }
  const { projectId, integrationId, environment } = parsed.data;
  const provider = providerById(integrationId);
  if (!provider) {
    return failureResponse(
      {
        code: 'integrations.provider_unknown',
        message: `The catalogue lists no provider named ${integrationId}.`,
        fix: 'Choose a provider from the Integrations step list.',
        details: { integrationId },
      },
      404,
    );
  }
  if (provider.kind === null) {
    return outcome({
      ok: false,
      driver: 'none',
      message: `${provider.name} is not available in this release. ${provider.unavailable ?? ''}`.trim(),
    });
  }
  const kind = KINDS[provider.kind];
  const options = callOptions(actor);

  try {
    if (kind.service === 'apis_driver') {
      const readiness = await ceruleaRequest<Readiness>('/health/ready', { method: 'GET' }, options);
      const entry = readiness.integrations.find((item) => item.integration === kind.health);
      if (!entry) {
        return outcome({
          ok: false,
          driver: 'none',
          message: `Cerulea APIs reports no driver for the ${kind.title} kind. Restart Cerulea APIs and test again.`,
          checkedAt: readiness.checkedAt,
        });
      }
      const modeLine =
        environment === 'live' && entry.kind === 'local'
          ? ` This deployment runs in local mode, so the live credentials of ${provider.name} wait in key custody until the service runs in live mode.`
          : '';
      return outcome({
        ok: entry.ready,
        driver: entry.kind,
        message: `Cerulea APIs serves the ${kind.title} kind for ${provider.name} through its ${entry.kind} driver. ${entry.detail}${modeLine}`,
        checkedAt: readiness.checkedAt,
      });
    }

    if (kind.service === 'key_custody') {
      try {
        const reading = await ceruleaRequest<CustodyReading>('/v1/security/custody', { method: 'GET' }, options);
        return outcome({
          ok: reading.module.ready,
          driver: reading.module.kind === 'live' ? 'live' : 'local',
          message: `Cerulea APIs key custody (${reading.module.name}) ${reading.module.ready ? 'is ready' : 'is not ready'}. ${reading.module.detail} It holds ${reading.module.keyCount} keys. ${provider.name} joins it as the live key module when the service runs in live mode.`,
        });
      } catch (cause) {
        if (cause instanceof CeruleaApiError && cause.status === 403) {
          return outcome({
            ok: false,
            driver: 'none',
            message: `${cause.message.replace(` ${cause.fix}`, '')} ${cause.fix}`,
          });
        }
        throw cause;
      }
    }

    // The oracle kind: the chain oracle module serves the feed the Blueprint holds.
    const version = await readBlueprint(projectId, {}, options);
    const document = readBlueprintDocument(version.document);
    const feed = document.integrations.feeds.find((entry) => entry.id === entryId(provider.id));
    if (!feed) {
      return outcome({
        ok: false,
        driver: 'none',
        message: `The Blueprint holds no oracle feed for ${provider.name} yet. Enable the provider, choose the record type its values arrive as, and let the step save.`,
      });
    }
    const typeHeld = document.types.some((entry) => entry.kind === 'Record' && entry.id === feed.payload_type);
    return outcome({
      ok: typeHeld,
      driver: 'none',
      message: typeHeld
        ? `The oracle feed ${feed.name} is written into the Blueprint at version ${version.version}. Values arrive as ${feed.payload_type} every ${feed.cadence_seconds} seconds with a signature attestation. The chain oracle module serves it after deployment.`
        : `The oracle feed ${feed.name} names the record type ${feed.payload_type}, which the Blueprint no longer holds. Choose a record type the Blueprint holds.`,
    });
  } catch (cause) {
    return failureReply(cause);
  }
}
