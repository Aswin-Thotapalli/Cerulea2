// apps/frontend/src/app/api/drafts/[[...slug]]/route.ts
// Saves and reads one Studio draft by project and bucket.
// Each draft lives in the draft area of the Studio build state, keyed by the
// bucket name the screen sends. The key matches the production draft key with
// the project prefix removed, since the build state already belongs to one
// project.
// Without this route an autosaved step is lost when the project reopens.
import { NextResponse } from 'next/server';

import {
  callOptions,
  ceruleaActor,
  failureReply,
  failureResponse,
  signInRequired,
} from '@/lib/cerulea-server';
import {
  DRAFT_KEY_LIMIT,
  objectBody,
  readHeldBuildState,
  writeDraft,
} from '@/app/api/projects/_shared/project-record';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function unnamed(): NextResponse {
  return failureResponse(
    {
      code: 'draft.bucket_unnamed',
      message: 'A draft names its project and its bucket.',
      fix: `Send projectId and a bucket of at most ${DRAFT_KEY_LIMIT} characters, then save again.`,
      details: {},
    },
    400,
  );
}

function validBucket(bucket: unknown): bucket is string {
  return typeof bucket === 'string' && bucket.length > 0 && bucket.length <= DRAFT_KEY_LIMIT;
}

// POST /api/drafts  body: { projectId, bucket, data }  saves or replaces one draft
export async function POST(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const body = await objectBody(request);
  const projectId = body?.projectId;
  const bucket = body?.bucket;
  if (typeof projectId !== 'string' || !projectId || !validBucket(bucket)) return unnamed();
  try {
    await writeDraft(projectId, bucket, body?.data ?? null, callOptions(actor));
    return NextResponse.json({ ok: true, updatedAt: Date.now() });
  } catch (cause) {
    return failureReply(cause);
  }
}

export const PUT = POST;

// GET /api/drafts?projectId=&bucket=
export async function GET(request: Request) {
  const actor = await ceruleaActor();
  if (!actor) return signInRequired();
  const search = new URL(request.url).searchParams;
  const projectId = search.get('projectId');
  const bucket = search.get('bucket');
  if (!projectId || !validBucket(bucket)) return unnamed();
  try {
    const held = await readHeldBuildState(projectId, callOptions(actor));
    if (!Object.prototype.hasOwnProperty.call(held.drafts, bucket)) {
      return failureResponse(
        {
          code: 'draft.absent',
          message: `The project holds no draft in the bucket ${bucket}.`,
          fix: 'Save the step once, then open it again.',
          details: { projectId, bucket },
        },
        404,
      );
    }
    return NextResponse.json({ ok: true, data: held.drafts[bucket] });
  } catch (cause) {
    return failureReply(cause);
  }
}
