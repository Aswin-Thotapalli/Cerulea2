import type { FastifyPluginAsync } from 'fastify';
import { eq, and, desc, sql, like, or } from 'drizzle-orm';
import { getDb }              from '../db/client';
import { extrinsics }         from '../db/schema';
import { paginate, parsePagination } from '../lib/paginate';
import type { ExtrinsicSummary, ExtrinsicDetail, ChainSlug } from '@cerulea/types';

const txsRoute: FastifyPluginAsync = async (app) => {

  // GET /txs?chain=public&page=1&limit=25&status=&method=&blockNumber=&address=
  app.get('/txs', async (req, reply) => {
    const query = req.query as Record<string, string>;
    const chain  = (query.chain ?? 'public') as ChainSlug;
    const { page, limit, offset } = parsePagination(query);
    const db = getDb();

    // Build WHERE conditions
    const conditions = [eq(extrinsics.chain, chain)];

    if (query.status) {
      conditions.push(eq(extrinsics.status, query.status));
    }
    if (query.blockNumber) {
      const bn = parseInt(query.blockNumber, 10);
      if (!isNaN(bn)) conditions.push(eq(extrinsics.blockNumber, bn));
    }
    if (query.address) {
      conditions.push(
        or(
          eq(extrinsics.fromAddress, query.address),
          eq(extrinsics.toAddress, query.address),
        )!
      );
    }
    if (query.method) {
      // method can be "section.method" or just "method"
      const parts = query.method.split('.');
      if (parts.length === 2) {
        conditions.push(eq(extrinsics.section, parts[0]));
        conditions.push(eq(extrinsics.method, parts[1]));
      } else {
        conditions.push(eq(extrinsics.method, query.method));
      }
    }

    const where = and(...conditions)!;

    const [rows, totalRow] = await Promise.all([
      db.select().from(extrinsics)
        .where(where)
        .orderBy(desc(extrinsics.blockNumber), desc(extrinsics.indexInBlock))
        .limit(limit)
        .offset(offset)
        .all(),
      db.select({ count: sql<number>`COUNT(*)` }).from(extrinsics)
        .where(where)
        .get(),
    ]);

    const items: ExtrinsicSummary[] = rows.map(rowToSummary);
    return paginate(items, totalRow?.count ?? 0, page, limit);
  });

  // GET /txs/:hash?chain=public
  app.get<{ Params: { hash: string } }>('/txs/:hash', async (req, reply) => {
    const query = req.query as Record<string, string>;
    const chain = (query.chain ?? 'public') as ChainSlug;
    const { hash } = req.params;
    const db = getDb();

    const row = db.select().from(extrinsics)
      .where(and(eq(extrinsics.chain, chain), eq(extrinsics.hash, hash)))
      .get();
    if (!row) return reply.status(404).send({ message: `Transaction ${hash} not found` });

    return rowToDetail(row);
  });
};

// ── Mappers ───────────────────────────────────────────────────────────────────
function rowToSummary(row: typeof extrinsics.$inferSelect): ExtrinsicSummary {
  return {
    index:       row.indexInBlock,
    hash:        row.hash,
    blockNumber: row.blockNumber,
    blockHash:   row.blockHash,
    timestamp:   row.timestampMs,
    from:        row.fromAddress,
    to:          row.toAddress,
    value:       row.value,
    fee:         row.fee,
    status:      row.status as 'success' | 'failed' | 'pending',
    section:     row.section,
    method:      row.method,
  };
}

function rowToDetail(row: typeof extrinsics.$inferSelect): ExtrinsicDetail {
  let decodedCall = null;
  if (row.decodedCall) {
    try { decodedCall = JSON.parse(row.decodedCall); } catch {}
  }

  let eventsArray: any[] = [];
  if (row.eventsJson) {
    try { eventsArray = JSON.parse(row.eventsJson); } catch {}
  }

  return {
    ...rowToSummary(row),
    nonce:       row.nonce,
    callData:    row.callData,
    decodedCall,
    events:      eventsArray,
    evmTrace:    null,
  };
}

export default txsRoute;
