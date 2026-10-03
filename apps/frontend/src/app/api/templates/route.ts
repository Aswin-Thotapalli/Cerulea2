// apps/frontend/src/app/api/templates/route.ts
// Serves the template catalogue to the Foundation step.
// The catalogue is the seed file src/data/templates.seed.json, imported so the
// route works from a built output as well as from the source tree.
// A division sees its own templates first, then the shared ones, never the
// templates of another division.
// Without this route the template gallery is empty.
import { NextResponse } from 'next/server';

import catalogueJson from '@/data/templates.seed.json';
import { failureReply } from '@/lib/cerulea-server';
import { asDivision } from '@/config/divisions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type TemplateEdge = { from: string; to: string; rel: string };

type CatalogueTemplate = {
  id: string;
  projectType: 'dapp' | 'blockchain';
  division?: 'dapp' | 'enterprise' | 'govt';
  title: string;
  description?: string;
  tags?: string[];
  preinstalledModules?: string[];
  modules?: string[];
  edges?: TemplateEdge[];
  ui?: { pages?: string[] };
};

type Catalogue = { version: number; updatedAt: string; templates: CatalogueTemplate[] };

const CATALOGUE = catalogueJson as unknown as Catalogue;

// GET /api/templates?projectType=&division=&q=&ids=a,b,c
export async function GET(request: Request) {
  try {
    const search = new URL(request.url).searchParams;
    const projectType = search.get('projectType');
    const division = asDivision(search.get('division'));
    const q = (search.get('q') ?? '').toLowerCase();
    const ids = (search.get('ids') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    let list = CATALOGUE.templates.slice();
    if (projectType === 'dapp' || projectType === 'blockchain') {
      list = list.filter((entry) => entry.projectType === projectType);
    }
    if (division) {
      list = list.filter((entry) => !entry.division || entry.division === division);
      list.sort(
        (left, right) =>
          (left.division === division ? 0 : 1) - (right.division === division ? 0 : 1),
      );
    }
    if (ids.length > 0) list = list.filter((entry) => ids.includes(entry.id));
    if (q) {
      list = list.filter((entry) =>
        [entry.title, entry.description ?? '', ...(entry.tags ?? []), ...(entry.ui?.pages ?? [])]
          .join(' ')
          .toLowerCase()
          .includes(q),
      );
    }
    return NextResponse.json(list, { status: 200 });
  } catch (cause) {
    return failureReply(cause);
  }
}
