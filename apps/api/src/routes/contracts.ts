import type { FastifyPluginAsync } from 'fastify';
import { eq, and }             from 'drizzle-orm';
import { getDb }               from '../db/client';
import { contracts, accounts } from '../db/schema';
import type { ContractInfo, ChainSlug } from '@cerulea/types';

const contractsRoute: FastifyPluginAsync = async (app) => {

  // GET /contracts/:address?chain=public
  app.get<{ Params: { address: string } }>('/contracts/:address', async (req, reply) => {
    const query   = req.query as Record<string, string>;
    const chain   = (query.chain ?? 'public') as ChainSlug;
    const { address } = req.params;
    const db = getDb();

    const row = db.select().from(contracts)
      .where(and(eq(contracts.chain, chain), eq(contracts.address, address)))
      .get();
    if (!row) return reply.status(404).send({ message: `Contract ${address} not found` });
    return rowToInfo(row);
  });

  // GET /contracts/:address/events — returns empty for now (future: EVM/ink! event indexing)
  app.get<{ Params: { address: string } }>('/contracts/:address/events', async (req) => {
    return { items: [], total: 0, page: 1, pageSize: 25, hasNextPage: false };
  });

  // POST /contracts/verify
  app.post<{
    Body: {
      chain:           string;
      address:         string;
      sourceCode:      string;
      compilerVersion: string;
      contractName:    string;
      optimization?:   string;
      abi?:            unknown;
    }
  }>('/contracts/verify', async (req, reply) => {
    const { chain, address, sourceCode, compilerVersion, contractName, optimization, abi } = req.body;
    if (!address || !sourceCode || !compilerVersion || !contractName) {
      return reply.status(400).send({ message: 'address, sourceCode, compilerVersion, and contractName are required' });
    }

    const db = getDb();
    const abiJson = abi ? JSON.stringify(abi) : null;
    const now = Date.now();

    // Upsert contract record with verified source
    db.insert(contracts)
      .values({
        chain: chain as ChainSlug,
        address,
        sourceCode,
        compilerVersion,
        contractName,
        abi: abiJson,
        isVerified: true,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [contracts.chain, contracts.address],
        set: {
          sourceCode,
          compilerVersion,
          contractName,
          abi: abiJson,
          isVerified: true,
          updatedAt: now,
        },
      })
      .run();

    // Mark account as contract
    db.insert(accounts)
      .values({ chain: chain as ChainSlug, address, isContract: true, updatedAt: now })
      .onConflictDoUpdate({
        target: [accounts.chain, accounts.address],
        set: { isContract: true, updatedAt: now },
      })
      .run();

    return { verified: true, message: 'Contract verified and source code saved' };
  });
};

function rowToInfo(row: typeof contracts.$inferSelect): ContractInfo {
  let parsedAbi = null;
  if (row.abi) { try { parsedAbi = JSON.parse(row.abi); } catch {} }
  return {
    address:         row.address,
    deployerAddress: row.deployerAddress,
    deployTxHash:    row.deployTxHash,
    deployBlock:     row.deployBlock,
    bytecode:        row.bytecode ?? '',
    abi:             parsedAbi,
    isVerified:      row.isVerified,
    sourceCode:      row.sourceCode,
    compilerVersion: row.compilerVersion,
    contractName:    row.contractName,
  };
}

export default contractsRoute;
