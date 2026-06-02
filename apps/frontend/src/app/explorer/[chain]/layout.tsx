import { notFound } from 'next/navigation';
import type { ChainSlug } from '@cerulea/types';
import { CHAINS } from '@/lib/explorer/chains';
import ChainProviders from './ChainProviders';
import ExplorerNav from '@/components/explorer/ExplorerNav';

interface ChainLayoutProps {
  children: React.ReactNode;
  params: { chain: string };
}

export async function generateStaticParams() {
  return [{ chain: 'public' }, { chain: 'private' }];
}

export default function ChainLayout({ children, params }: ChainLayoutProps) {
  const chainConfig = CHAINS[params.chain as ChainSlug];
  if (!chainConfig) notFound();

  return (
    <ChainProviders chain={params.chain as ChainSlug}>
      <ExplorerNav />
      <main style={{ minHeight: 'calc(100vh - 64px)' }}>
        {children}
      </main>
    </ChainProviders>
  );
}
