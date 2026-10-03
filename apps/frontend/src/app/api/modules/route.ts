// apps/frontend/src/app/api/modules/route.ts
// Serves the module catalogue to the canvas step.
// The catalogue is the seed file src/data/modules.seed.json, imported so the
// route works from a built output as well as from the source tree.
// A division sees its own modules and the shared ones, never the exclusive
// modules of another division.
// Without this route the canvas palette is empty.
import { NextResponse } from 'next/server';

import catalogueJson from '@/data/modules.seed.json';
import { failureReply } from '@/lib/cerulea-server';
import { asDivision } from '@/config/divisions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CatalogueModule = {
  moduleId: string;
  title: string;
  projectType: 'dapp' | 'blockchain';
  division?: 'dapp' | 'enterprise' | 'govt';
  category: string;
  tags?: string[];
  blurb?: string;
  longDescription?: string[];
  dependsOn?: string[];
  recommends?: string[];
  reasonByDepId?: Record<string, string>;
  configSchema?: unknown;
};

type Catalogue = { version: number; updatedAt: string; modules: CatalogueModule[] };

const CATALOGUE = catalogueJson as unknown as Catalogue;

// GET /api/modules?projectType=&division=&category=&ids=a,b&q=
export async function GET(request: Request) {
  try {
    const search = new URL(request.url).searchParams;
    const projectType = search.get('projectType');
    const division = asDivision(search.get('division'));
    const q = (search.get('q') ?? '').toLowerCase();
    const category = (search.get('category') ?? '').toLowerCase();
    const ids = (search.get('ids') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    let list = CATALOGUE.modules.slice();
    if (projectType === 'dapp' || projectType === 'blockchain') {
      list = list.filter((entry) => entry.projectType === projectType);
    }
    if (division) list = list.filter((entry) => !entry.division || entry.division === division);
    if (category) list = list.filter((entry) => entry.category.toLowerCase() === category);
    if (ids.length > 0) {
      const wanted = new Set(ids);
      list = list.filter((entry) => wanted.has(entry.moduleId));
    }
    if (q) {
      list = list.filter((entry) =>
        [
          entry.title,
          entry.blurb ?? '',
          (entry.tags ?? []).join(' '),
          ...(entry.longDescription ?? []),
          entry.category,
          entry.moduleId,
        ]
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
