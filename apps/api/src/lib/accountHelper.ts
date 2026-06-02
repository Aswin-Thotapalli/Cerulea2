import { getDb }                      from '../db/client';
import { accounts }                   from '../db/schema';
import { systemAccountKey, decodeAccountInfo } from '../indexer/scale';
import type { CeruleaNodeClient }     from '../indexer/rpc-client';

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function ss58ToBytes(address: string): Buffer | null {
  try {
    let n = 0n;
    for (const c of address) {
      const idx = BASE58.indexOf(c);
      if (idx < 0) return null;
      n = n * 58n + BigInt(idx);
    }
    const bytes: number[] = [];
    while (n > 0n) { bytes.unshift(Number(n & 0xffn)); n >>= 8n; }
    const buf = Buffer.from(bytes);
    const prefixLen = buf[0] < 64 ? 1 : 2;
    return buf.slice(prefixLen, prefixLen + 32);
  } catch { return null; }
}

export async function upsertAccountFromClient(
  client:      CeruleaNodeClient,
  chain:       string,
  address:     string,
  blockNumber: number | null,
): Promise<void> {
  const db = getDb();
  try {
    const accountId = ss58ToBytes(address);
    if (!accountId) return;

    const raw = await client.getStorage(systemAccountKey(accountId));
    if (!raw) return;

    const { nonce, free, reserved } = decodeAccountInfo(raw);
    db.insert(accounts).values({
      chain, address,
      freeBalance:     free.toString(),
      reservedBalance: reserved.toString(),
      nonce,
      lastSeenBlock:   blockNumber,
      updatedAt:       Date.now(),
    }).onConflictDoUpdate({
      target: [accounts.chain, accounts.address],
      set: {
        freeBalance:     free.toString(),
        reservedBalance: reserved.toString(),
        nonce,
        lastSeenBlock:   blockNumber,
        updatedAt:       Date.now(),
      },
    }).run();
  } catch {
    // Silently skip
  }
}
