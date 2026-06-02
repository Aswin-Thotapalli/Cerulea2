import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'cerulea.db');

let _db: ReturnType<typeof drizzle<typeof schema>>;

export function initDb(): void {
  // Ensure data directory exists
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  const sqlite = new Database(DB_PATH);

  // Optimise for write-heavy indexing workload
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('cache_size = -32000');  // 32 MB page cache
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('temp_store = MEMORY');

  // ── Create tables ──────────────────────────────────────────────────────────
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS blocks (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      chain           TEXT    NOT NULL,
      number          INTEGER NOT NULL,
      hash            TEXT    NOT NULL,
      parent_hash     TEXT    NOT NULL DEFAULT '',
      state_root      TEXT    NOT NULL DEFAULT '',
      extrinsics_root TEXT    NOT NULL DEFAULT '',
      timestamp_ms    INTEGER NOT NULL DEFAULT 0,
      author          TEXT,
      tx_count        INTEGER NOT NULL DEFAULT 0,
      block_time_ms   INTEGER,
      weight          TEXT,
      size_bytes      INTEGER,
      events_count    INTEGER NOT NULL DEFAULT 0,
      UNIQUE(chain, number),
      UNIQUE(chain, hash)
    );

    CREATE TABLE IF NOT EXISTS extrinsics (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      chain          TEXT    NOT NULL,
      hash           TEXT    NOT NULL,
      block_number   INTEGER NOT NULL,
      block_hash     TEXT    NOT NULL,
      index_in_block INTEGER NOT NULL DEFAULT 0,
      timestamp_ms   INTEGER NOT NULL DEFAULT 0,
      from_address   TEXT,
      to_address     TEXT,
      value          TEXT    NOT NULL DEFAULT '0',
      fee            TEXT    NOT NULL DEFAULT '0',
      status         TEXT    NOT NULL DEFAULT 'pending',
      section        TEXT    NOT NULL DEFAULT '',
      method         TEXT    NOT NULL DEFAULT '',
      nonce          INTEGER,
      call_data      TEXT,
      decoded_call   TEXT,
      events_json    TEXT,
      UNIQUE(chain, hash)
    );
    CREATE INDEX IF NOT EXISTS extrinsics_chain_block_idx  ON extrinsics(chain, block_number);
    CREATE INDEX IF NOT EXISTS extrinsics_chain_from_idx   ON extrinsics(chain, from_address);
    CREATE INDEX IF NOT EXISTS extrinsics_chain_to_idx     ON extrinsics(chain, to_address);
    CREATE INDEX IF NOT EXISTS extrinsics_chain_status_idx ON extrinsics(chain, status);

    CREATE TABLE IF NOT EXISTS accounts (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      chain            TEXT    NOT NULL,
      address          TEXT    NOT NULL,
      evm_address      TEXT,
      free_balance     TEXT    NOT NULL DEFAULT '0',
      reserved_balance TEXT    NOT NULL DEFAULT '0',
      nonce            INTEGER NOT NULL DEFAULT 0,
      is_contract      INTEGER NOT NULL DEFAULT 0,
      last_seen_block  INTEGER,
      updated_at       INTEGER,
      UNIQUE(chain, address)
    );

    CREATE TABLE IF NOT EXISTS validators (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      chain           TEXT    NOT NULL,
      address         TEXT    NOT NULL,
      identity        TEXT,
      commission      REAL    NOT NULL DEFAULT 0,
      total_stake     TEXT    NOT NULL DEFAULT '0',
      own_stake       TEXT    NOT NULL DEFAULT '0',
      blocks_produced INTEGER NOT NULL DEFAULT 0,
      uptime_pct      REAL    NOT NULL DEFAULT 100,
      is_active       INTEGER NOT NULL DEFAULT 0,
      is_elected      INTEGER NOT NULL DEFAULT 0,
      updated_at      INTEGER,
      UNIQUE(chain, address)
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      chain            TEXT    NOT NULL,
      address          TEXT    NOT NULL,
      deployer_address TEXT,
      deploy_tx_hash   TEXT,
      deploy_block     INTEGER,
      bytecode         TEXT,
      abi              TEXT,
      is_verified      INTEGER NOT NULL DEFAULT 0,
      source_code      TEXT,
      compiler_version TEXT,
      contract_name    TEXT,
      updated_at       INTEGER,
      UNIQUE(chain, address)
    );
  `);

  _db = drizzle(sqlite, { schema });
  console.log(`[db] SQLite database ready at ${DB_PATH}`);
}

export function getDb() {
  if (!_db) throw new Error('Database not initialised — call initDb() first');
  return _db;
}
