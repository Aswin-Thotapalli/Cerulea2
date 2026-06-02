'use client';

import {
  createContext, useContext, useEffect, useState, ReactNode,
} from 'react';
import { SubstrateRpcClient } from '@/lib/explorer/rpc/client';
import { getRpcWsUrl } from '@/lib/explorer/chains';
import type { ChainSlug, WsStatus } from '@cerulea/types';

interface WsContextValue {
  client: SubstrateRpcClient | null;
  status: WsStatus;
}

const WsContext = createContext<WsContextValue>({ client: null, status: 'disconnected' });

export function WsProvider({
  chain,
  children,
}: {
  chain: ChainSlug;
  children: ReactNode;
}) {
  const [status, setStatus] = useState<WsStatus>('connecting');
  const [client, setClient] = useState<SubstrateRpcClient | null>(null);

  useEffect(() => {
    const url = getRpcWsUrl(chain);
    const rpc = new SubstrateRpcClient(url, setStatus);
    setClient(rpc);
    rpc.connect();
    return () => {
      rpc.disconnect();
      setClient(null);
    };
  }, [chain]);

  return (
    <WsContext.Provider value={{ client, status }}>
      {children}
    </WsContext.Provider>
  );
}

export function useWs(): WsContextValue {
  return useContext(WsContext);
}
