import type { FastifyPluginAsync } from 'fastify';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { getDb }               from '../db/client';
import { blocks, extrinsics, validators } from '../db/schema';
import { getClient, isChainConfigured } from '../indexer/substrate';
import type { NetworkStats, ChainSlug } from '@cerulea/types';

const networkRoute: FastifyPluginAsync = async (app) => {

  // GET /network/stats?chain=public
  app.get('/network/stats', async (req) => {
    const query = req.query as Record<string, string>;
    const chain = (query.chain ?? 'public') as ChainSlug;
    const db = getDb();

    // Latest block
    const latestBlockRow = db.select({ number: blocks.number, timestampMs: blocks.timestampMs })
      .from(blocks)
      .where(eq(blocks.chain, chain))
      .orderBy(desc(blocks.number))
      .limit(1)
      .get();

    const latestBlock = latestBlockRow?.number ?? 0;

    // Avg block time over last 50 blocks
    const recentBlocks = db.select({ blockTimeMs: blocks.blockTimeMs })
      .from(blocks)
      .where(and(eq(blocks.chain, chain), sql`block_time_ms IS NOT NULL`))
      .orderBy(desc(blocks.number))
      .limit(50)
      .all();

    let avgBlockTime = 6000; // default 6 s
    if (recentBlocks.length > 0) {
      const sum = recentBlocks.reduce((s, b) => s + (b.blockTimeMs ?? 0), 0);
      avgBlockTime = Math.round(sum / recentBlocks.length);
    }

    // Total transactions
    const totalTxRow = db.select({ count: sql<number>`COUNT(*)` })
      .from(extrinsics)
      .where(eq(extrinsics.chain, chain))
      .get();
    const totalTransactions = totalTxRow?.count ?? 0;

    // Active validators
    const validatorCountRow = db.select({ count: sql<number>`COUNT(*)` })
      .from(validators)
      .where(and(eq(validators.chain, chain), eq(validators.isElected, true)))
      .get();
    const activeValidators = validatorCountRow?.count ?? 0;

    // TPS: transactions in the last 60 seconds (use last 10 blocks as proxy)
    let tps = 0;
    const nowMs = Date.now();
    const cutoffMs = nowMs - 60_000;
    const recentTxRow = db.select({ count: sql<number>`COUNT(*)` })
      .from(extrinsics)
      .where(and(
        eq(extrinsics.chain, chain),
        gte(extrinsics.timestampMs, cutoffMs),
      ))
      .get();
    if (recentTxRow?.count) {
      tps = parseFloat((recentTxRow.count / 60).toFixed(2));
    }

    // Chain status: check if indexer is keeping up
    let chainStatus: 'healthy' | 'degraded' | 'down' = 'down';
    if (isChainConfigured(chain)) {
      try {
        const client = await getClient(chain);
        if (client.isConnected) {
          const headHash   = await client.getBlockHash();
          const headHeader = await client.getHeader(headHash);
          const chainHead  = parseInt(headHeader.number, 16);
          const lag = chainHead - latestBlock;
          chainStatus = lag <= 10 ? 'healthy' : lag <= 50 ? 'degraded' : 'down';
        }
      } catch {
        chainStatus = latestBlock > 0 ? 'degraded' : 'down';
      }
    } else if (latestBlock > 0) {
      chainStatus = 'degraded';
    }

    const stats: NetworkStats = {
      latestBlock,
      avgBlockTime,
      totalTransactions,
      activeValidators,
      tps,
      chainStatus,
    };
    return stats;
  });
};

export default networkRoute;
