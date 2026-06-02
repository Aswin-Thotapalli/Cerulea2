import type { FastifyPluginAsync } from 'fastify';
import { eq, and, desc, sql }  from 'drizzle-orm';
import { getDb }               from '../db/client';
import { validators }          from '../db/schema';
import { paginate, parsePagination } from '../lib/paginate';
import type { ValidatorInfo, ChainSlug } from '@cerulea/types';

const validatorsRoute: FastifyPluginAsync = async (app) => {

  // GET /validators?chain=public&page=1&limit=25
  app.get('/validators', async (req, reply) => {
    const query = req.query as Record<string, string>;
    const chain = (query.chain ?? 'public') as ChainSlug;
    const { page, limit, offset } = parsePagination(query);
    const db = getDb();

    const [rows, totalRow] = await Promise.all([
      db.select().from(validators)
        .where(eq(validators.chain, chain))
        .orderBy(desc(validators.isElected), desc(validators.totalStake))
        .limit(limit)
        .offset(offset)
        .all(),
      db.select({ count: sql<number>`COUNT(*)` }).from(validators)
        .where(eq(validators.chain, chain))
        .get(),
    ]);

    const items: ValidatorInfo[] = rows.map(rowToInfo);
    return paginate(items, totalRow?.count ?? 0, page, limit);
  });

  // GET /validators/:address?chain=public
  app.get<{ Params: { address: string } }>('/validators/:address', async (req, reply) => {
    const query   = req.query as Record<string, string>;
    const chain   = (query.chain ?? 'public') as ChainSlug;
    const { address } = req.params;
    const db = getDb();

    const row = db.select().from(validators)
      .where(and(eq(validators.chain, chain), eq(validators.address, address)))
      .get();
    if (!row) return reply.status(404).send({ message: `Validator ${address} not found` });
    return rowToInfo(row);
  });
};

function rowToInfo(row: typeof validators.$inferSelect): ValidatorInfo {
  return {
    address:        row.address,
    identity:       row.identity,
    commission:     row.commission,
    totalStake:     row.totalStake,
    ownStake:       row.ownStake,
    blocksProduced: row.blocksProduced,
    uptimePct:      row.uptimePct,
    isActive:       row.isActive,
    isElected:      row.isElected,
  };
}

export default validatorsRoute;
