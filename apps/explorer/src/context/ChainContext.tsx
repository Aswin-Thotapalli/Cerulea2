'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { ChainSlug, ChainConfig } from '@cerulea/types';
import { getChainConfig } from '@/lib/chains';

interface ChainContextValue {
  chain: ChainSlug;
  config: ChainConfig;
}

const ChainContext = createContext<ChainContextValue>({
  chain: 'public',
  config: getChainConfig('public'),
});

export function ChainProvider({
  chain,
  children,
}: {
  chain: ChainSlug;
  children: ReactNode;
}) {
  return (
    <ChainContext.Provider value={{ chain, config: getChainConfig(chain) }}>
      {children}
    </ChainContext.Provider>
  );
}

export function useChainContext(): ChainContextValue {
  return useContext(ChainContext);
}
