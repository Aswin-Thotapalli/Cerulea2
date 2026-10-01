// apps/frontend/src/app/page.tsx
import { headers } from 'next/headers';

// The Studio entry loads in the browser only, so landing visitors never download Studio code.
import StudioEntryLazy from '@/app/_studio/StudioEntryLazy';

// Your existing landing component:
import Landing from '@/components/landing/Hero'; // <- adjust if your landing uses a different entry

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function Home({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const host = (await headers()).get('host') ?? '';
  const asked = (await searchParams) ?? {};
  const isStudioHost =
    host.startsWith('studio.') ||
    host.includes('studio.localhost') ||
    host.includes('studio.lvh.me');

  // Dev override: http://localhost:3000/?studio=1
  const forceStudio = 'studio' in asked;

  if (isStudioHost || forceStudio) {
    const projectId = asked.project ? String(asked.project) : null;
    return <StudioEntryLazy projectId={projectId} />;
  }

  // Regular marketing / landing page for everything else
  return <Landing />;
}
