// apps/frontend/src/app/api/projects/[id]/schema/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Ephemeral in-memory fallback so dev works even if DB isn’t wired.
const g = globalThis as any;
g.__CERULEA_STORE = g.__CERULEA_STORE || { schema: new Map<string, any>() };

async function readSchema(projectId: string) {
  const mem = g.__CERULEA_STORE.schema as Map<string, any>;
  return mem.get(projectId) || { entities: [], relationships: [], track: 'dapp' };
}

async function writeSchema(projectId: string, data: any) {
  const mem = g.__CERULEA_STORE.schema as Map<string, any>;
  mem.set(projectId, data);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const data = await readSchema(params.id);
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const clean = {
    entities: Array.isArray(body.entities) ? body.entities : [],
    relationships: Array.isArray(body.relationships) ? body.relationships : [],
    track: body.track === 'blockchain' ? 'blockchain' : 'dapp',
  };
  await writeSchema(params.id, clean);
  return NextResponse.json({ ok: true });
}

export const PATCH = PUT;
