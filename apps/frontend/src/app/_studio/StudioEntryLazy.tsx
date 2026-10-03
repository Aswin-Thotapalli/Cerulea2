'use client';

// apps/frontend/src/app/_studio/StudioEntryLazy.tsx
// Loads the Studio entry and the division chooser in the browser only, after
// the first paint. A visitor on the landing page never downloads Studio code.
// The home page renders on the server, and Next.js 15 keeps browser-only
// loading inside a client module, so the loading lives here.

import dynamic from 'next/dynamic';

import type { Division } from '@/config/divisions';

const StudioEntry = dynamic(() => import('@/app/_studio/StudioEntry'), { ssr: false });
const DivisionChooser = dynamic(() => import('@/components/studio/DivisionChooser'), { ssr: false });

export function StudioEntryLazy({
  projectId,
  division,
}: {
  projectId: string | null;
  division: Division | null;
}) {
  return <StudioEntry projectId={projectId} division={division} />;
}

export function DivisionChooserLazy() {
  return <DivisionChooser />;
}
