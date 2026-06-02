import 'dotenv/config';
import Fastify           from 'fastify';
import cors              from '@fastify/cors';
import { initDb }        from './db/client';
import { startIndexer }  from './indexer/index';
import { disconnectAll } from './indexer/substrate';
import blocksRoute       from './routes/blocks';
import txsRoute          from './routes/txs';
import accountsRoute     from './routes/accounts';
import validatorsRoute   from './routes/validators';
import contractsRoute    from './routes/contracts';
import networkRoute      from './routes/network';

const PORT   = parseInt(process.env.PORT  ?? '4000', 10);
const HOST   = process.env.HOST           ?? '0.0.0.0';
const ORIGIN = process.env.CORS_ORIGIN    ?? '*';

const app = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
    },
  },
});

async function main(): Promise<void> {
  // ── Database ──────────────────────────────────────────────────────────────
  initDb();

  // ── CORS ──────────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: ORIGIN === '*' ? true : ORIGIN.split(',').map(s => s.trim()),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // ── Health ────────────────────────────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok', ts: Date.now() }));

  // ── Routes ────────────────────────────────────────────────────────────────
  await app.register(blocksRoute);
  await app.register(txsRoute);
  await app.register(accountsRoute);
  await app.register(validatorsRoute);
  await app.register(contractsRoute);
  await app.register(networkRoute);

  // ── Start ─────────────────────────────────────────────────────────────────
  await app.listen({ port: PORT, host: HOST });
  console.log(`[api] Server listening on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);

  // ── Indexer (non-blocking) ─────────────────────────────────────────────────
  startIndexer().catch((err) => {
    console.error('[indexer] Startup error:', err);
  });
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(): Promise<void> {
  console.log('[api] Shutting down…');
  await disconnectAll();
  await app.close();
  process.exit(0);
}

process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);

main().catch((err) => {
  console.error('[api] Fatal error:', err);
  process.exit(1);
});
