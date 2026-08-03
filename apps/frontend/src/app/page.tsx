// apps/frontend/src/app/page.tsx
import { headers } from 'next/headers';
import dynamic from 'next/dynamic';

// Lazy-load the Studio entry so landing users don't download studio code
const StudioEntry = dynamic(() => import('@/app/_studio/StudioEntry'), { ssr: false });
const DivisionChooser = dynamic(() => import('@/components/studio/DivisionChooser'), { ssr: false });

// Your existing landing component:
import Landing from '@/components/landing/Hero'; // <- adjust if your landing uses a different entry

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function Home({ searchParams }: { searchParams?: SearchParams }) {
  const host = headers().get('host') ?? '';
  const isStudioHost =
    host.startsWith('studio.') ||
    host.includes('studio.localhost') ||
    host.includes('studio.lvh.me');

  // Division routes (studio.cerulea.io/dapps etc.) are rewritten by middleware
  // to /?studio=1 — that (or the dev override) means "render the studio".
  const forceStudio = !!(searchParams && ('studio' in searchParams));

  if (forceStudio) {
    const projectId = searchParams?.project ? String(searchParams.project) : null;
    // Division comes from the x-cerulea-division header the middleware sets from
    // the /dapps|/enterprise|/govt path — deterministic, no client timing.
    const division = headers().get('x-cerulea-division');
    return <StudioEntry projectId={projectId} division={division} />;
  }

  // Studio host root ("/") — the 3-option chooser (Dapps / Enterprise / Govt).
  if (isStudioHost) {
    return <DivisionChooser />;
  }

  // Regular marketing / landing page for everything else
  return <Landing />;
}
