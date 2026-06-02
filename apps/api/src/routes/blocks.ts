import type { FastifyPluginAsync } from 'fastify';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getDb }              from '../db/client';
import { blocks, extrinsics } from '../db/schema';
import { paginate, parsePagination } from '../lib/paginate';
import type { BlockSummary, BlockDetail, ChainEvent, ChainSlug } from '@cerulea/types';

const blocksRoute: FastifyPluginAsync = async (app) => {

  // GET /blocks?chain=public&page=1&limit=25
  app.get('/blocks', async (req, reply) => {
    const query = req.query as Record<string, string>;
    const chain = (query.chain ?? 'public') as ChainSlug;
    const { page, limit, offset } = parsePagination(query);
    const db = getDb();

    const [rows, totalRow] = await Promise.all([
      db.select().from(blocks)
        .where(eq(blocks.chain, chain))
        .orderBy(desc(blocks.number))
        .limit(limit)
        .offset(offset)
        .all(),
      db.select({ count: sql<number>`COUNT(*)` }).from(blocks)
        .where(eq(blocks.chain, chain))
        .get(),
    ]);

    const items: BlockSummary[] = rows.map(rowToSummary);
    return paginate(items, totalRow?.count ?? 0, page, limit);
  });

  // GET /blocks/:number?chain=public
  app.get<{ Params: { number: string } }>('/blocks/:number', async (req, reply) => {
    const query = req.query as Record<string, string>;
    const chain = (query.chain ?? 'public') as ChainSlug;
    const number = parseInt(req.params.number, 10);
    if (isNaN(number)) return reply.status(400).send({ message: 'Invalid block number' });

    const db = getDb();
    const block = db.select().from(blocks)
      .where(and(eq(blocks.chain, chain), eq(blocks.number, number)))
      .get();
    if (!block) return reply.status(404).send({ message: `Block #${number} not found` });

    const txRows = db.select().from(extrinsics)
      .where(and(eq(extrinsics.chain, chain), eq(extrinsics.blockNumber, number)))
      .orderBy(extrinsics.indexInBlock)
      .all();

    return rowToDetail(block, txRows);
  });

  // GET /blocks/hash/:hash?chain=public
  app.get<{ Params: { hash: string } }>('/blocks/hash/:hash', async (req, reply) => {
    const query = req.query as Record<string, string>;
    const chain = (query.chain ?? 'public') as ChainSlug;
    const hash  = req.params.hash;
    const db = getDb();

    const block = db.select().from(blocks)
      .where(and(eq(blocks.chain, chain), eq(blocks.hash, hash)))
      .get();
    if (!block) return reply.status(404).send({ message: `Block ${hash} not found` });

    const txRows = db.select().from(extrinsics)
      .where(and(eq(extrinsics.chain, chain), eq(extrinsics.blockNumber, block.number)))
      .orderBy(extrinsics.indexInBlock)
      .all();

    return rowToDetail(block, txRows);
  });
};

// ── Mappers ───────────────────────────────────────────────────────────────────
function rowToSummary(row: typeof blocks.$inferSelect): BlockSummary {
  return {
    number:         row.number,
    hash:           row.hash,
    parentHash:     row.parentHash,
    stateRoot:      row.stateRoot,
    extrinsicsRoot: row.extrinsicsRoot,
    timestamp:      row.timestampMs,
    author:         row.author,
    txCount:        row.txCount,
    blockTime:      row.blockTimeMs,
  };
}

function rowToDetail(
  row:    typeof blocks.$inferSelect,
  txRows: (typeof extrinsics.$inferSelect)[],
): BlockDetail & { eventsCount: number } {
  return {
    ...rowToSummary(row),
    weight:     row.weight,
    size:       row.sizeBytes,
    extrinsics: txRows.map((t) => ({
      index:       t.indexInBlock,
      hash:        t.hash,
      blockNumber: t.blockNumber,
      blockHash:   t.blockHash,
      timestamp:   t.timestampMs,
      from:        t.fromAddress,
      to:          t.toAddress,
      value:       t.value,
      fee:         t.fee,
      status:      t.status as 'success' | 'failed' | 'pending',
      section:     t.section,
      method:      t.method,
    })),
    // Individual events are not persisted in DB; return count as extra field
    events:      [] as ChainEvent[],
    eventsCount: row.eventsCount,
  };
}

export default blocksRoute;
