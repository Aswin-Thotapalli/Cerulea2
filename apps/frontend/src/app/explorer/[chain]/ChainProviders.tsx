'use client';

import type { ChainSlug } from '@cerulea/types';
import { ChainProvider } from '@/context/ChainContext';
import { WsProvider } from '@/context/WsContext';

interface ChainProvidersProps {
  chain: ChainSlug;
  children: React.ReactNode;
}

export default function ChainProviders({ chain, children }: ChainProvidersProps) {
  return (
    <ChainProvider chain={chain}>
      <WsProvider chain={chain}>
        {children}
      </WsProvider>
    </ChainProvider>
  );
}
