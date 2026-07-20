import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { sources } = await req.json().catch(() => ({ sources: {} }));
  try {
    // solc must be installed in apps/frontend: npm i solc
    // @ts-ignore
    const solc = (await import('solc')).default || (await import('solc'));
    const input = {
      language: 'Solidity',
      sources,
      settings: { outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } } }
    };
    const out = JSON.parse(solc.compile(JSON.stringify(input)));
    const ok = !out.errors || out.errors.every((e: any) => e.severity !== 'error');
    return NextResponse.json({ ok, ...out });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'solc error' }, { status: 500 });
  }
}
