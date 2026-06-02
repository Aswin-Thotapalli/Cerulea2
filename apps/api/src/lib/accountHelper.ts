import type { ApiPromise } from '@polkadot/api';
import { getDb }           from '../db/client';
import { accounts }        from '../db/schema';

export async function upsertAccountFromApi(
  api:         ApiPromise,
  chain:       string,
  address:     string,
  blockNumber: number | null,
): Promise<void> {
  const db = getDb();
  try {
    const info = await api.query.system.account(address) as any;
    const data = info.data;
    db.insert(accounts)
      .values({
        chain,
        address,
        freeBalance:     data.free?.toString()     ?? '0',
        reservedBalance: data.reserved?.toString() ?? '0',
        nonce:           info.nonce?.toNumber()     ?? 0,
        lastSeenBlock:   blockNumber,
        updatedAt:       Date.now(),
      })
      .onConflictDoUpdate({
        target: [accounts.chain, accounts.address],
        set: {
          freeBalance:     data.free?.toString()     ?? '0',
          reservedBalance: data.reserved?.toString() ?? '0',
          nonce:           info.nonce?.toNumber()     ?? 0,
          lastSeenBlock:   blockNumber,
          updatedAt:       Date.now(),
        },
      })
      .run();
  } catch {
    // Silently skip — node may not have this account
  }
}
