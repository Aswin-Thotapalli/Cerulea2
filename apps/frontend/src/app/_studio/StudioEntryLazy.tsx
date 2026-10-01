'use client';

// apps/frontend/src/app/_studio/StudioEntryLazy.tsx
// Loads the Studio entry in the browser only, after the first paint.
// A visitor on the landing page never downloads Studio code.
// The home page renders on the server, so the browser-only loading lives here.

import dynamic from 'next/dynamic';

const StudioEntry = dynamic(() => import('@/app/_studio/StudioEntry'), { ssr: false });

export default function StudioEntryLazy({ projectId }: { projectId: string | null }) {
  return <StudioEntry projectId={projectId} />;
}
