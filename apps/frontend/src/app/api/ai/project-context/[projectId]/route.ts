export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { projects, drafts, smartContracts } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

function tryParse(raw: string | null | undefined): any {
  if (!raw) return null;
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
}

export async function GET(
  _req: Request,
  { params }: { params: { projectId: string } }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const [row] = await db
    .select()
    .from(projects)
    .where(and(
      eq(projects.id as any, params.projectId),
      eq(projects.userId as any, session.user.id)
    ))
    .limit(1);

  if (!row) {
    return NextResponse.json({ ok: false, error: 'Project not found' }, { status: 404 });
  }

  const allDrafts = await db
    .select()
    .from(drafts)
    .where(eq(drafts.projectId as any, params.projectId))
    .orderBy(desc(drafts.updatedAt));

  const allContracts = await db
    .select()
    .from(smartContracts)
    .where(eq(smartContracts.projectId as any, params.projectId));

  const blueprint = tryParse((row as any).blueprint);
  const schemaJson = tryParse((row as any).schemaJson);
  const logicJson = tryParse((row as any).logicJson);
  const economics = tryParse((row as any).economics);

  // Parse all drafts and extract per-step data
  const draftsByStep: Record<number, any> = {};
  for (const d of allDrafts) {
    const parsed = tryParse(d.data as string);
    if (!parsed) continue;
    const step = parsed.step ?? parsed.stepIndex;
    if (typeof step === 'number' && !(step in draftsByStep)) {
      draftsByStep[step] = parsed.payload ?? parsed;
    }
  }

  // Extract integrations from step-4 draft
  const integrationsDraft = draftsByStep[4] ?? null;

  // Derive what's configured vs. not
  const moduleCount = blueprint?.nodes?.length ?? 0;
  const entityCount = Array.isArray(schemaJson?.entities) ? schemaJson.entities.length : 0;
  const hasEconomics = !!(economics?.tokenName || economics?.tokenSymbol);
  const hasIntegrations = !!(integrationsDraft?.configs && Object.keys(integrationsDraft.configs).length > 0);

  const configuredSteps = {
    foundation: !!(
      (row as any).name &&
      (row as any).projectType &&
      (row as any).selectedTemplateIds
    ),
    blueprint: moduleCount > 0,
    dataSchema: entityCount > 0,
    economics: hasEconomics,
    integrations: hasIntegrations,
    deploy: (row as any).status === 'deployed',
  };

  // Summarize schema for AI (avoid sending 400KB of raw JSON)
  const schemaSummary = Array.isArray(schemaJson?.entities)
    ? schemaJson.entities.map((e: any) => ({
        name: e.name,
        description: e.description,
        sourceModule: e.sourceModule,
        storage: e.storageStrategy ?? e.storage,
        fieldCount: Array.isArray(e.fields) ? e.fields.length : 0,
        fields: Array.isArray(e.fields)
          ? e.fields.map((f: any) => ({
              name: f.name,
              type: f.type,
              required: f.required,
              access: f.access,
            }))
          : [],
        access: e.access ?? e.accessControl,
      }))
    : [];

  // Summarize blueprint modules
  const modulesSummary = Array.isArray(blueprint?.nodes)
    ? blueprint.nodes
        .filter((n: any) => n.type === 'moduleNode' || n.data?.moduleId)
        .map((n: any) => ({
          moduleId: n.data?.moduleId ?? n.id,
          title: n.data?.title ?? n.data?.label,
          category: n.data?.category,
        }))
    : [];

  // Connections between modules
  const connectionsSummary = Array.isArray(blueprint?.edges)
    ? blueprint.edges.map((e: any) => ({
        from: e.source,
        to: e.target,
        relationship: e.data?.rel ?? e.label,
      }))
    : [];

  const contractsSummary = allContracts.map((c: any) => ({
    name: c.name,
    type: c.contractType,
    enabled: c.enabled !== 'false',
    description: c.description,
  }));

  return NextResponse.json({
    ok: true,
    context: {
      project: {
        id: (row as any).id,
        name: (row as any).name,
        slug: (row as any).slug,
        description: (row as any).description,
        projectType: (row as any).projectType,
        legacyMode: (row as any).legacyMode,
        status: (row as any).status,
        selectedTemplates: tryParse((row as any).selectedTemplateIds),
        createdAt: (row as any).createdAt,
        updatedAt: (row as any).updatedAt,
      },
      configuredSteps,
      blueprint: {
        moduleCount,
        modules: modulesSummary,
        connections: connectionsSummary,
      },
      schema: {
        entityCount,
        entities: schemaSummary,
      },
      economics: economics ?? {},
      integrations: integrationsDraft ?? {},
      smartContracts: contractsSummary,
      draftProgress: Object.keys(draftsByStep).map(Number).sort(),
    },
  });
}
