/**
 * Block indexer — connects to chain nodes, processes every block,
 * and persists decoded data into SQLite.
 *
 * Lifecycle per chain:
 *  1. startIndexer()  → attempt to connect each configured chain
 *  2. Backfill the last BACKFILL_BLOCKS blocks from history
 *  3. Poll for new blocks every POLL_INTERVAL ms
 *  4. Connection errors are caught and retried with exponential back-off
 */
import { getClient, isChainConfigured } from './substrate';
import { parseBlock, parseExtrinsic }   from './parser';
import { getDb }                        from '../db/client';
import { blocks, extrinsics, accounts, validators, contracts } from '../db/schema';
import { systemAccountKey, sessionValidatorsKey, decodeAccountInfo, decodeVecAccountId32, ss58Encode } from './scale';
import { eq, and, sql }                 from 'drizzle-orm';
import type { CeruleaNodeClient }       from './rpc-client';

type ChainKey = 'public' | 'private';
const CHAINS: ChainKey[] = ['public', 'private'];
const BACKFILL  = Math.max(0, parseInt(process.env.BACKFILL_BLOCKS ?? '200', 10));
const POLL_MS   = parseInt(process.env.POLL_INTERVAL_MS ?? '3000', 10);
const VAL_EVERY = 50; // refresh validators every N blocks

function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────
export async function startIndexer(): Promise<void> {
  for (const chain of CHAINS) {
    if (!isChainConfigured(chain)) {
      console.log(`[indexer] ${chain} chain not configured — skipping`);
      continue;
    }
    indexChain(chain).catch((err) => {
      console.error(`[indexer] ${chain} fatal error:`, err);
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-chain indexer loop (polls for new blocks)
// ─────────────────────────────────────────────────────────────────────────────
async function indexChain(chain: ChainKey): Promise<void> {
  let backfillDone = false;

  while (true) {
    try {
      const client = await getClient(chain);

      if (!backfillDone && BACKFILL > 0) {
        await backfillChain(client, chain, BACKFILL);
        backfillDone = true;
      }

      let lastBlock = -1;
      console.log(`[indexer] ${chain} — polling for new blocks every ${POLL_MS} ms`);

      while (true) {
        await sleep(POLL_MS);
        if (!client.isConnected) break; // reconnecting; exit inner loop

        try {
          const headHash   = await client.getBlockHash();
          const headHeader = await client.getHeader(headHash);
          const headNum    = parseInt(headHeader.number, 16);

          if (headNum > lastBlock) {
            const from = lastBlock < 0 ? headNum : lastBlock + 1;
            for (let n = from; n <= headNum; n++) {
              const hash = await client.getBlockHash(n);
              await processBlock(client, chain, hash, n);
            }
            lastBlock = headNum;

            if (headNum % VAL_EVERY === 0) {
              refreshValidators(client, chain).catch(console.error);
            }
          }
        } catch (err) {
          console.warn(`[indexer] ${chain} poll error:`, err);
          break;
        }
      }
    } catch (err) {
      console.warn(`[indexer] ${chain} connection error:`, err);
    }

    await sleep(10_000);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Backfill
// ─────────────────────────────────────────────────────────────────────────────
async function backfillChain(
  client: CeruleaNodeClient,
  chain:  ChainKey,
  count:  number,
): Promise<void> {
  const db = getDb();

  const existingRow = db.select({ max: sql<number>`MAX(number)` })
    .from(blocks).where(eq(blocks.chain, chain)).get();
  const latestIndexed = existingRow?.max ?? -1;

  const headHash   = await client.getBlockHash();
  const headHeader = await client.getHeader(headHash);
  const headNum    = parseInt(headHeader.number, 16);

  const startBlock = Math.max(0, headNum - count + 1);
  const needed: number[] = [];
  for (let n = startBlock; n <= headNum; n++) {
    if (n > latestIndexed) needed.push(n);
  }

  if (needed.length === 0) {
    console.log(`[indexer] ${chain} — backfill up to date (latest: #${latestIndexed})`);
    return;
  }

  console.log(`[indexer] ${chain} — backfilling #${needed[0]}–#${needed[needed.length - 1]} (${needed.length} blocks)`);

  const BATCH = 10;
  for (let i = 0; i < needed.length; i += BATCH) {
    await Promise.all(
      needed.slice(i, i + BATCH).map(async (n) => {
        try {
          const hash = await client.getBlockHash(n);
          await processBlock(client, chain, hash, n);
        } catch (err) {
          console.warn(`[indexer] ${chain} backfill failed for #${n}:`, err);
        }
      })
    );
  }

  console.log(`[indexer] ${chain} — backfill complete`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Process one block
// ─────────────────────────────────────────────────────────────────────────────
async function processBlock(
  client: CeruleaNodeClient,
  chain:  ChainKey,
  hash:   string,
  number: number,
): Promise<void> {
  const db = getDb();

  // Skip if already indexed
  if (db.select({ id: blocks.id }).from(blocks)
    .where(and(eq(blocks.chain, chain), eq(blocks.number, number))).get()) return;

  const raw = await client.getBlock(hash);

  const prevRow = db.select({ timestampMs: blocks.timestampMs })
    .from(blocks)
    .where(and(eq(blocks.chain, chain), eq(blocks.number, number - 1)))
    .get();

  const parsed = parseBlock(hash, raw, null, prevRow?.timestampMs ?? null);

  db.insert(blocks).values({
    chain,
    number:         parsed.number,
    hash:           parsed.hash,
    parentHash:     parsed.parentHash,
    stateRoot:      parsed.stateRoot,
    extrinsicsRoot: parsed.extrinsicsRoot,
    timestampMs:    parsed.timestampMs,
    author:         parsed.author,
    txCount:        parsed.txCount,
    blockTimeMs:    parsed.blockTimeMs,
    weight:         parsed.weight,
    sizeBytes:      parsed.sizeBytes,
    eventsCount:    parsed.eventsCount,
  }).onConflictDoNothing().run();

  for (const [idx, extHex] of raw.block.extrinsics.entries()) {
    try {
      const p = parseExtrinsic(extHex, idx, number, hash, parsed.timestampMs);
      db.insert(extrinsics).values({
        chain,
        hash:         p.hash,
        blockNumber:  p.blockNumber,
        blockHash:    p.blockHash,
        indexInBlock: p.indexInBlock,
        timestampMs:  p.timestampMs,
        fromAddress:  p.fromAddress,
        toAddress:    p.toAddress,
        value:        p.value,
        fee:          p.fee,
        status:       p.status,
        section:      p.section,
        method:       p.method,
        nonce:        p.nonce,
        callData:     p.callData,
        decodedCall:  p.decodedCall,
        eventsJson:   p.eventsJson,
      }).onConflictDoNothing().run();

      if (p.fromAddress) {
        upsertAccountFromChain(client, chain, p.fromAddress, number).catch(() => {});
      }
    } catch (err) {
      console.warn(`[indexer] ${chain} failed to parse ext #${idx} in block #${number}:`, err);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Account balance upsert
// ─────────────────────────────────────────────────────────────────────────────
async function upsertAccountFromChain(
  client:      CeruleaNodeClient,
  chain:       ChainKey,
  address:     string,
  blockNumber: number,
): Promise<void> {
  const db = getDb();
  try {
    // Decode SS58 address back to raw AccountId32
    const accountId = ss58ToBytes(address);
    if (!accountId) return;

    const storageKey = systemAccountKey(accountId);
    const raw = await client.getStorage(storageKey);
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
    // Non-critical — skip
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Validator refresh
// ─────────────────────────────────────────────────────────────────────────────
async function refreshValidators(client: CeruleaNodeClient, chain: ChainKey): Promise<void> {
  const db = getDb();
  try {
    const raw = await client.getStorage(sessionValidatorsKey());
    if (!raw) return;

    const accountIds = decodeVecAccountId32(raw);
    const elected = accountIds.map(id => ss58Encode(id));

    for (const address of elected) {
      const blocksRow = db.select({ count: sql<number>`COUNT(*)` })
        .from(blocks)
        .where(and(eq(blocks.chain, chain), eq(blocks.author, address)))
        .get();

      db.insert(validators).values({
        chain, address,
        identity:       null,
        commission:     0,
        totalStake:     '0',
        ownStake:       '0',
        blocksProduced: blocksRow?.count ?? 0,
        uptimePct:      100,
        isActive:       true,
        isElected:      true,
        updatedAt:      Date.now(),
      }).onConflictDoUpdate({
        target: [validators.chain, validators.address],
        set: {
          blocksProduced: blocksRow?.count ?? 0,
          isActive:       true,
          isElected:      true,
          updatedAt:      Date.now(),
        },
      }).run();
    }

    // Mark previously-elected validators no longer in the set
    if (elected.length > 0) {
      db.update(validators)
        .set({ isElected: false, updatedAt: Date.now() })
        .where(
          and(
            eq(validators.chain, chain),
            eq(validators.isElected, true),
            sql`address NOT IN (${sql.raw(elected.map(() => '?').join(','))})`,
          )
        )
        .run();
    }

    console.log(`[indexer] ${chain} — refreshed ${elected.length} validators`);
  } catch (err) {
    console.warn(`[indexer] ${chain} validator refresh error:`, err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: decode SS58 → raw 32-byte AccountId
// ─────────────────────────────────────────────────────────────────────────────
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
    // Prefix length: 1 byte if first byte < 64, else 2 bytes
    const prefixLen = buf[0] < 64 ? 1 : 2;
    return buf.slice(prefixLen, prefixLen + 32);
  } catch { return null; }
}
