import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { code } = await req.json().catch(() => ({ code: '' }));
  try {
    const ts = await import('typescript'); // lazy load
    const result = ts.transpileModule(code || '', {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, strict: true },
      reportDiagnostics: true,
    });
    const diags = (result.diagnostics || []).map(d =>
      ({
        code: d.code,
        category: ts.DiagnosticCategory[d.category],
        message: ts.flattenDiagnosticMessageText(d.messageText, '\n')
      })
    );
    return NextResponse.json({ ok: diags.length === 0, diagnostics: diags });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'TypeScript error' }, { status: 500 });
  }
}
