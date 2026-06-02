/**
 * Connection manager — one CeruleaNodeClient per chain, lazily created.
 * Reads RPC_WS_PUBLIC / RPC_WS_PRIVATE from environment.
 */
import { CeruleaNodeClient } from './rpc-client';

type ChainKey = 'public' | 'private';

const WS_ENV: Record<ChainKey, string> = {
  public:  'RPC_WS_PUBLIC',
  private: 'RPC_WS_PRIVATE',
};

const clientCache = new Map<ChainKey, CeruleaNodeClient>();
const connecting  = new Map<ChainKey, Promise<CeruleaNodeClient>>();

export async function getClient(chain: ChainKey): Promise<CeruleaNodeClient> {
  const cached = clientCache.get(chain);
  if (cached?.isConnected) return cached;

  const inflight = connecting.get(chain);
  if (inflight) return inflight;

  const wsUrl = process.env[WS_ENV[chain]];
  if (!wsUrl) throw new Error(`[node] ${WS_ENV[chain]} is not set`);

  console.log(`[node] Connecting to ${chain} chain at ${wsUrl}`);

  const promise = (async () => {
    const client = new CeruleaNodeClient(wsUrl);
    await client.connect();
    clientCache.set(chain, client);
    console.log(`[node] Connected to ${chain} chain`);
    return client;
  })();

  connecting.set(chain, promise);
  promise.finally(() => connecting.delete(chain));
  return promise;
}

export async function disconnectAll(): Promise<void> {
  for (const [chain, client] of clientCache) {
    console.log(`[node] Disconnecting ${chain} chain`);
    client.disconnect();
  }
  clientCache.clear();
}

export function isChainConfigured(chain: ChainKey): boolean {
  return !!process.env[WS_ENV[chain]];
}
