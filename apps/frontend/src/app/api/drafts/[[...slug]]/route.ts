import { NextResponse } from 'next/server';

type DraftPayload = {
  projectId: string;
  bucket: string;
  data: unknown;
};

type Stored = { data: unknown; updatedAt: number };

// In-memory store (dev only). For prod, back this with DB or KV.
const store = new Map<string, Stored>();
const k = (projectId?: string | null, bucket?: string | null) =>
  `${projectId || 'local'}::${bucket || 'default'}`;

export async function POST(req: Request) {
  let body: DraftPayload | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { projectId, bucket, data } = body || ({} as DraftPayload);
  if (!projectId || !bucket) {
    return NextResponse.json(
      { ok: false, error: 'projectId and bucket are required' },
      { status: 400 }
    );
  }

  const value: Stored = { data, updatedAt: Date.now() };
  store.set(k(projectId, bucket), value);
  return NextResponse.json({ ok: true, ...value }, { status: 200 });
}

// PUT behaves like POST (upsert)
export async function PUT(req: Request) {
  return POST(req);
}

// Read a draft (?projectId=...&bucket=...)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  const bucket = url.searchParams.get('bucket');
  const value = store.get(k(projectId, bucket));
  if (!value) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, ...value }, { status: 200 });
}
