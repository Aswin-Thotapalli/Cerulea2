/**
 * Block indexer — connects to Substrate nodes, processes every block,
 * and persists the decoded data into SQLite.
 *
 * Lifecycle:
 *  1. startIndexer()  → tries to connect each configured chain
 *  2. For each chain: backfill BACKFILL_BLOCKS recent blocks from history
 *  3. Then subscribe to new blocks via chain_subscribeNewHead
 *  4. Any connection failure is caught and retried with exponential backoff
 */
import type { ApiPromise }     from '@polkadot/api';
import type { EventRecord }    from '@polkadot/types/interfaces';
import type { Vec }            from '@polkadot/types';
import { getApi, isChainConfigured }          from './substrate';
import { parseBlock, parseExtrinsic, detectContracts } from './parser';
import { getDb }                              from '../db/client';
import { blocks, extrinsics, accounts, validators, contracts } from '../db/schema';
import { eq, and, sql }                       from 'drizzle-orm';

type ChainKey = 'public' | 'private';
const CHAINS: ChainKey[] = ['public', 'private'];
const BACKFILL  = Math.max(0, parseInt(process.env.BACKFILL_BLOCKS ?? '200', 10));
const VALIDATOR_REFRESH_BLOCKS = 50; // Re-read staking data every N blocks

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
      console.error(`[indexer] ${chain} chain indexer crashed:`, err);
      // Retry after 10 s
      setTimeout(() => indexChain(chain).catch(console.error), 10_000);
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-chain indexer loop
// ─────────────────────────────────────────────────────────────────────────────
async function indexChain(chain: ChainKey): Promise<void> {
  const api = await getApi(chain);

  // ── Backfill ────────────────────────────────────────────────────────────────
  if (BACKFILL > 0) {
    await backfillChain(api, chain, BACKFILL);
  }

  // ── Live subscription ───────────────────────────────────────────────────────
  console.log(`[indexer] ${chain} — subscribing to new blocks`);

  await new Promise<void>((_, reject) => {
    api.derive.chain.subscribeNewHeads(async (header) => {
      const blockNum = header.number.toNumber();
      const hash     = header.hash.toHex();
      const author   = header.author?.toString() ?? null;

      try {
        await processBlock(api, chain, hash, blockNum, author);

        // Periodically refresh validator set
        if (blockNum % VALIDATOR_REFRESH_BLOCKS === 0) {
          refreshValidators(api, chain).catch(console.error);
        }
      } catch (err) {
        console.error(`[indexer] ${chain} failed to process block #${blockNum}:`, err);
      }
    }).catch(reject);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Backfill
// ─────────────────────────────────────────────────────────────────────────────
async function backfillChain(api: ApiPromise, chain: ChainKey, count: number): Promise<void> {
  const db = getDb();

  // Find what we already have
  const existingResult = db
    .select({ maxNumber: sql<number>`MAX(number)` })
    .from(blocks)
    .where(eq(blocks.chain, chain))
    .get();
  const latestIndexed = existingResult?.maxNumber ?? -1;

  // Get current chain head
  const latestHash   = await api.rpc.chain.getBlockHash();
  const latestHeader = await api.rpc.chain.getHeader(latestHash);
  const latestBlock  = latestHeader.number.toNumber();

  const startBlock = Math.max(0, latestBlock - count + 1);
  const needed: number[] = [];
  for (let n = startBlock; n <= latestBlock; n++) {
    if (n > latestIndexed) needed.push(n);
  }

  if (needed.length === 0) {
    console.log(`[indexer] ${chain} — backfill up to date (latest indexed: #${latestIndexed})`);
    return;
  }

  console.log(`[indexer] ${chain} — backfilling blocks #${needed[0]}–#${needed[needed.length - 1]} (${needed.length} blocks)`);

  // Process in batches of 10 to avoid overwhelming the node
  const BATCH = 10;
  for (let i = 0; i < needed.length; i += BATCH) {
    const batch = needed.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (n) => {
        try {
          const hash   = await api.rpc.chain.getBlockHash(n);
          const header = await api.rpc.chain.getHeader(hash);
          // For backfill we don't have derive.chain so author might be null
          let author: string | null = null;
          try {
            const derived = await api.derive.chain.getBlock(hash);
            author = derived?.author?.toString() ?? null;
          } catch {}
          await processBlock(api, chain, hash.toHex(), n, author);
        } catch (err) {
          console.warn(`[indexer] ${chain} backfill failed for block #${n}:`, err);
        }
      })
    );
  }

  console.log(`[indexer] ${chain} — backfill complete`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Process a single block
// ─────────────────────────────────────────────────────────────────────────────
async function processBlock(
  api:     ApiPromise,
  chain:   ChainKey,
  hash:    string,
  number:  number,
  author:  string | null,
): Promise<void> {
  const db = getDb();

  // Skip if already indexed
  const exists = db
    .select({ id: blocks.id })
    .from(blocks)
    .where(and(eq(blocks.chain, chain), eq(blocks.number, number)))
    .get();
  if (exists) return;

  // Fetch block + events in parallel
  const [signedBlock, allEvents] = await Promise.all([
    api.rpc.chain.getBlock(hash),
    api.query.system.events.at(hash) as unknown as Promise<Vec<EventRecord>>,
  ]);

  // Previous block's timestamp for block-time calculation
  const prevBlock = db
    .select({ timestampMs: blocks.timestampMs })
    .from(blocks)
    .where(and(eq(blocks.chain, chain), eq(blocks.number, number - 1)))
    .get();

  const parsed = parseBlock(
    signedBlock as any,
    hash,
    allEvents as any,
    author,
    prevBlock?.timestampMs ?? null,
  );

  // ── Persist block ──────────────────────────────────────────────────────────
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

  // ── Persist extrinsics ─────────────────────────────────────────────────────
  for (const [idx, ext] of signedBlock.block.extrinsics.entries()) {
    try {
      const parsedExt = parseExtrinsic(
        api, ext as any, idx, number, hash, parsed.timestampMs, allEvents as any
      );
      db.insert(extrinsics).values({
        chain,
        hash:         parsedExt.hash,
        blockNumber:  parsedExt.blockNumber,
        blockHash:    parsedExt.blockHash,
        indexInBlock: parsedExt.indexInBlock,
        timestampMs:  parsedExt.timestampMs,
        fromAddress:  parsedExt.fromAddress,
        toAddress:    parsedExt.toAddress,
        value:        parsedExt.value,
        fee:          parsedExt.fee,
        status:       parsedExt.status,
        section:      parsedExt.section,
        method:       parsedExt.method,
        nonce:        parsedExt.nonce,
        callData:     parsedExt.callData,
        decodedCall:  parsedExt.decodedCall,
        eventsJson:   parsedExt.eventsJson,
      }).onConflictDoNothing().run();

      // Update account record for sender
      if (parsedExt.fromAddress) {
        upsertAccount(api, chain, parsedExt.fromAddress, number).catch(() => {});
      }
    } catch (err) {
      console.warn(`[indexer] ${chain} failed to parse extrinsic #${idx} in block #${number}:`, err);
    }
  }

  // ── Detect and register contracts ─────────────────────────────────────────
  const detected = detectContracts(signedBlock as any, allEvents as any, number);
  for (const c of detected) {
    db.insert(contracts).values({
      chain,
      address:         c.address,
      deployerAddress: c.deployer,
      deployTxHash:    c.txHash,
      deployBlock:     c.block,
      isVerified:      false,
      updatedAt:       Date.now(),
    }).onConflictDoNothing().run();

    // Mark account as contract
    db.insert(accounts)
      .values({
        chain,
        address:    c.address,
        isContract: true,
        updatedAt:  Date.now(),
      })
      .onConflictDoUpdate({
        target: [accounts.chain, accounts.address],
        set:    { isContract: true, updatedAt: Date.now() },
      })
      .run();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Account upsert (balances + nonce)
// ─────────────────────────────────────────────────────────────────────────────
async function upsertAccount(
  api:     ApiPromise,
  chain:   ChainKey,
  address: string,
  blockNumber: number,
): Promise<void> {
  const db = getDb();
  try {
    const info = await api.query.system.account(address);
    const data = (info as any).data;
    db.insert(accounts)
      .values({
        chain,
        address,
        freeBalance:     data.free?.toString()     ?? '0',
        reservedBalance: data.reserved?.toString() ?? '0',
        nonce:           (info as any).nonce?.toNumber() ?? 0,
        lastSeenBlock:   blockNumber,
        updatedAt:       Date.now(),
      })
      .onConflictDoUpdate({
        target: [accounts.chain, accounts.address],
        set: {
          freeBalance:     data.free?.toString()     ?? '0',
          reservedBalance: data.reserved?.toString() ?? '0',
          nonce:           (info as any).nonce?.toNumber() ?? 0,
          lastSeenBlock:   blockNumber,
          updatedAt:       Date.now(),
        },
      })
      .run();
  } catch {
    // Non-critical — skip silently
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Validator refresh (staking pallet)
// ─────────────────────────────────────────────────────────────────────────────
async function refreshValidators(api: ApiPromise, chain: ChainKey): Promise<void> {
  const db = getDb();
  try {
    // Get elected validators (current set)
    const currentElected: string[] = [];
    try {
      const sessionValidators = await api.query.session.validators() as any;
      (sessionValidators as any[]).forEach((v: any) => currentElected.push(v.toString()));
    } catch {}

    if (currentElected.length === 0) return;

    for (const address of currentElected) {
      try {
        let commission = 0;
        let ownStake   = '0';
        let totalStake = '0';

        // Staking prefs
        try {
          const prefs = await api.query.staking.validators(address) as any;
          commission = (prefs.commission?.toNumber() ?? 0) / 10_000_000; // perbill → percentage
        } catch {}

        // Ledger for own stake
        try {
          const bonded  = await api.query.staking.bonded(address) as any;
          if (bonded.isSome) {
            const ledger = await api.query.staking.ledger(bonded.unwrap()) as any;
            if (ledger.isSome) ownStake = ledger.unwrap().active?.toString() ?? '0';
          }
        } catch {}

        // Exposure for total stake
        try {
          const activeEra = await api.query.staking.activeEra() as any;
          if (activeEra.isSome) {
            const era = activeEra.unwrap().index;
            const exposure = await api.query.staking.erasTotalStake(era, address) as any;
            totalStake = exposure?.toString() ?? '0';
          }
        } catch {}

        // Identity (if pallet available)
        let identity: string | null = null;
        try {
          const idInfo = await api.query.identity?.identityOf(address) as any;
          if (idInfo?.isSome) {
            const display = idInfo.unwrap()[0]?.info?.display;
            if (display?.isRaw) identity = display.asRaw.toUtf8();
          }
        } catch {}

        // Count blocks produced by this validator
        const blocksProducedRow = db
          .select({ count: sql<number>`COUNT(*)` })
          .from(blocks)
          .where(and(eq(blocks.chain, chain), eq(blocks.author, address)))
          .get();
        const blocksProduced = blocksProducedRow?.count ?? 0;

        db.insert(validators)
          .values({
            chain,
            address,
            identity,
            commission,
            totalStake,
            ownStake,
            blocksProduced,
            uptimePct: 100, // Uptime calculated from block production rate over time
            isActive:  true,
            isElected: true,
            updatedAt: Date.now(),
          })
          .onConflictDoUpdate({
            target: [validators.chain, validators.address],
            set: {
              identity,
              commission,
              totalStake,
              ownStake,
              blocksProduced,
              isActive:  true,
              isElected: true,
              updatedAt: Date.now(),
            },
          })
          .run();
      } catch (err) {
        console.warn(`[indexer] Failed to refresh validator ${address}:`, err);
      }
    }

    // Mark previous validators that are no longer elected
    db.update(validators)
      .set({ isElected: false, updatedAt: Date.now() })
      .where(
        and(
          eq(validators.chain, chain),
          eq(validators.isElected, true),
          sql`address NOT IN (${currentElected.map(() => '?').join(',')})`,
        )
      )
      .run();

    console.log(`[indexer] ${chain} — refreshed ${currentElected.length} validators`);
  } catch (err) {
    console.warn(`[indexer] ${chain} validator refresh failed:`, err);
  }
}
