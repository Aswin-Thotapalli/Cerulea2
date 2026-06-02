import type { FastifyPluginAsync } from 'fastify';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { getDb }              from '../db/client';
import { accounts, extrinsics, contracts } from '../db/schema';
import { getApi, isChainConfigured }        from '../indexer/substrate';
import { upsertAccountFromApi }             from '../lib/accountHelper';
import { paginate, parsePagination }        from '../lib/paginate';
import type { AccountInfo, ChainSlug }      from '@cerulea/types';

const accountsRoute: FastifyPluginAsync = async (app) => {

  // GET /accounts/:address?chain=public
  app.get<{ Params: { address: string } }>('/accounts/:address', async (req, reply) => {
    const query   = req.query as Record<string, string>;
    const chain   = (query.chain ?? 'public') as ChainSlug;
    const { address } = req.params;
    const db = getDb();

    // Always try to fetch fresh data from the node if available
    if (isChainConfigured(chain)) {
      try {
        const api = await getApi(chain);
        await upsertAccountFromApi(api, chain, address, null);
      } catch {}
    }

    let row = db.select().from(accounts)
      .where(and(eq(accounts.chain, chain), eq(accounts.address, address)))
      .get();

    // If not in DB at all, return a minimal "not found" object rather than 404
    // (the address might exist on-chain but not transacted yet)
    if (!row) {
      row = {
        id:              0,
        chain,
        address,
        evmAddress:      null,
        freeBalance:     '0',
        reservedBalance: '0',
        nonce:           0,
        isContract:      false,
        lastSeenBlock:   null,
        updatedAt:       null,
      } as typeof accounts.$inferSelect;
    }

    // Check contract table
    const contract = db.select().from(contracts)
      .where(and(eq(contracts.chain, chain), eq(contracts.address, address)))
      .get();

    const info: AccountInfo = {
      address:     row.address,
      evmAddress:  row.evmAddress,
      balance: {
        free:     row.freeBalance,
        reserved: row.reservedBalance,
        total:    addStrBigInts(row.freeBalance, row.reservedBalance),
      },
      nonce:         row.nonce,
      isContract:    !!contract || row.isContract,
      tokenBalances: [],  // Token balances require ERC-20 / PSP-22 tracking; added in future
      stakingInfo:   null,
    };

    return info;
  });

  // GET /accounts/:address/txs?chain=public&page=1&limit=25
  app.get<{ Params: { address: string } }>('/accounts/:address/txs', async (req, reply) => {
    const query   = req.query as Record<string, string>;
    const chain   = (query.chain ?? 'public') as ChainSlug;
    const { address } = req.params;
    const { page, limit, offset } = parsePagination(query);
    const db = getDb();

    const where = and(
      eq(extrinsics.chain, chain),
      or(
        eq(extrinsics.fromAddress, address),
        eq(extrinsics.toAddress, address),
      )!,
    )!;

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

    const items = rows.map((row) => ({
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
    }));

    return paginate(items, totalRow?.count ?? 0, page, limit);
  });
};

function addStrBigInts(a: string, b: string): string {
  try { return (BigInt(a) + BigInt(b)).toString(); } catch { return a; }
}

export default accountsRoute;
