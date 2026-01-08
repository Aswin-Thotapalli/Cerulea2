// apps/frontend/src/app/api/projects/[id]/logic/route.ts
import { NextRequest, NextResponse } from 'next/server';

const g = globalThis as any;
g.__CERULEA_STORE = g.__CERULEA_STORE || { logic: new Map<string, any>() };

async function readLogic(projectId: string) {
  const mem = g.__CERULEA_STORE.logic as Map<string, any>;
  return mem.get(projectId) || { flows: [], track: 'dapp' };
}

async function writeLogic(projectId: string, data: any) {
  const mem = g.__CERULEA_STORE.logic as Map<string, any>;
  mem.set(projectId, data);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const data = await readLogic(params.id);
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const clean = {
    flows: Array.isArray(body.flows) ? body.flows : [],
    track: body.track === 'blockchain' ? 'blockchain' : 'dapp',
  };
  await writeLogic(params.id, clean);
  return NextResponse.json({ ok: true });
}

export const PATCH = PUT;
