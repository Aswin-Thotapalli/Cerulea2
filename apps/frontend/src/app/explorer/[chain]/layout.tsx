import { notFound } from 'next/navigation';
import type { ChainSlug } from '@cerulea/types';
import { CHAINS } from '@/lib/explorer/chains';
import ChainProviders from './ChainProviders';
import ExplorerNav from '@/components/explorer/ExplorerNav';

interface ChainLayoutProps {
  children: React.ReactNode;
  params: Promise<{ chain: string }>;
}

export async function generateStaticParams() {
  return [{ chain: 'public' }, { chain: 'private' }];
}

export default async function ChainLayout({ children, params }: ChainLayoutProps) {
  // Next.js 15 hands the route values over as a promise.
  const { chain } = await params;
  const chainConfig = CHAINS[chain as ChainSlug];
  if (!chainConfig) notFound();

  return (
    <ChainProviders chain={chain as ChainSlug}>
      <ExplorerNav />
      <main style={{ minHeight: 'calc(100vh - 64px)' }}>
        {children}
      </main>
    </ChainProviders>
  );
}
