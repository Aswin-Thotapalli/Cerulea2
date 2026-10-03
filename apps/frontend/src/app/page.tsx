// apps/frontend/src/app/page.tsx
// The home route serves three surfaces.
// A division path, rewritten by the gate to /?studio=1, opens Studio for that
// division. The studio host root shows the division chooser. Every other host
// shows the landing page.
import { headers } from 'next/headers';

// Studio and the chooser load in the browser only, so landing visitors never
// download Studio code.
import { DivisionChooserLazy, StudioEntryLazy } from '@/app/_studio/StudioEntryLazy';
import Landing from '@/components/landing/Hero';
import { asDivision } from '@/config/divisions';

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function Home({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const headerBag = await headers();
  const asked = (await searchParams) ?? {};
  const host = headerBag.get('host') ?? '';
  const isStudioHost =
    host.startsWith('studio.') ||
    host.includes('studio.localhost') ||
    host.includes('studio.lvh.me');

  // The gate rewrites /dapps, /enterprise and /govt to /?studio=1. The same
  // value opens Studio on any host during development.
  const forceStudio = 'studio' in asked;

  if (forceStudio) {
    const projectId = asked.project ? String(asked.project) : null;
    // The gate names the division in this header from the path, so the server
    // decides it before any client code runs.
    const division = asDivision(headerBag.get('x-cerulea-division'));
    return <StudioEntryLazy projectId={projectId} division={division} />;
  }

  // The studio host root offers the three divisions.
  if (isStudioHost) {
    return <DivisionChooserLazy />;
  }

  return <Landing />;
}
