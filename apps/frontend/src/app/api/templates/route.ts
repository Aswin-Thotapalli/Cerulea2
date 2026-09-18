// apps/frontend/src/app/api/templates/route.ts
// Serves the 100 template catalogue.
// The seed is imported, so the route works from a built output as well as from
// the source tree. A disk read fails once the build ships without src.

import { NextResponse } from 'next/server';
import catalogueJson from '@/data/templates.seed.json';
import type { CatalogueTemplate, ProjectTrack } from '@/lib/catalogue/types';

export const dynamic = 'force-dynamic';

type Catalogue = { version: number; updatedAt: string; templates: CatalogueTemplate[] };

const CATALOGUE = catalogueJson as unknown as Catalogue;

// GET /api/templates?projectType=&q=&ids=a,b,c
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const projectType = url.searchParams.get('projectType') as ProjectTrack | null;
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const ids = (url.searchParams.get('ids') || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    let list = CATALOGUE.templates.slice();

    if (projectType) list = list.filter((template) => template.projectType === projectType);
    if (ids.length) list = list.filter((template) => ids.includes(template.id));
    if (q) {
      list = list.filter((template) => {
        const hay = [
          template.title,
          template.description || '',
          ...(template.tags || []),
          ...(template.ui?.pages || []),
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }

    return NextResponse.json(list, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Cerulea could not read the template catalogue. ' +
          'Check that src/data/templates.seed.json is present, then restart Studio.',
      },
      { status: 500 },
    );
  }
}
