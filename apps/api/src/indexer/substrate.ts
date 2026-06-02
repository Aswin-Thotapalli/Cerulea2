/**
 * Manages one Polkadot/Substrate ApiPromise connection per chain.
 * Connections are created lazily and cached. If a connection drops,
 * WsProvider handles reconnection automatically.
 */
import { ApiPromise, WsProvider } from '@polkadot/api';

type ChainKey = 'public' | 'private';

const WS_ENV: Record<ChainKey, string> = {
  public:  'RPC_WS_PUBLIC',
  private: 'RPC_WS_PRIVATE',
};

const apiCache: Map<ChainKey, ApiPromise> = new Map();
const pendingConnect: Map<ChainKey, Promise<ApiPromise>> = new Map();

export async function getApi(chain: ChainKey): Promise<ApiPromise> {
  // Return cached and connected API
  const cached = apiCache.get(chain);
  if (cached?.isConnected) return cached;

  // Deduplicate concurrent connection attempts
  const pending = pendingConnect.get(chain);
  if (pending) return pending;

  const envKey = WS_ENV[chain];
  const wsUrl = process.env[envKey];
  if (!wsUrl) {
    throw new Error(
      `[substrate] ${envKey} is not set in environment. Cannot connect to the ${chain} chain.`
    );
  }

  console.log(`[substrate] Connecting to ${chain} chain at ${wsUrl}`);

  const promise = (async () => {
    const provider = new WsProvider(wsUrl, 5_000); // 5 s reconnect interval
    const api = await ApiPromise.create({
      provider,
      noInitWarn: true,
    });
    await api.isReady;
    console.log(`[substrate] Connected to ${chain} chain — runtime ${api.runtimeVersion.specName}/${api.runtimeVersion.specVersion}`);
    apiCache.set(chain, api);

    // Clean up cache on fatal disconnect
    api.on('disconnected', () => {
      console.warn(`[substrate] ${chain} chain disconnected — will reconnect`);
      apiCache.delete(chain);
    });

    return api;
  })();

  pendingConnect.set(chain, promise);
  promise.finally(() => pendingConnect.delete(chain));

  return promise;
}

export async function disconnectAll(): Promise<void> {
  for (const [chain, api] of apiCache) {
    console.log(`[substrate] Disconnecting ${chain} chain`);
    await api.disconnect();
  }
  apiCache.clear();
}

/** Returns true if a WS URL is configured for this chain. */
export function isChainConfigured(chain: ChainKey): boolean {
  return !!process.env[WS_ENV[chain]];
}
