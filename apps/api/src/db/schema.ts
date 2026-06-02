import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

// ── Blocks ────────────────────────────────────────────────────────────────────
export const blocks = sqliteTable(
  'blocks',
  {
    id:             integer('id').primaryKey({ autoIncrement: true }),
    chain:          text('chain').notNull(),
    number:         integer('number').notNull(),
    hash:           text('hash').notNull(),
    parentHash:     text('parent_hash').notNull().default(''),
    stateRoot:      text('state_root').notNull().default(''),
    extrinsicsRoot: text('extrinsics_root').notNull().default(''),
    timestampMs:    integer('timestamp_ms').notNull().default(0),
    author:         text('author'),
    txCount:        integer('tx_count').notNull().default(0),
    blockTimeMs:    integer('block_time_ms'),
    weight:         text('weight'),
    sizeBytes:      integer('size_bytes'),
    eventsCount:    integer('events_count').notNull().default(0),
  },
  (t) => ({
    uniqChainNumber: uniqueIndex('blocks_chain_number_uniq').on(t.chain, t.number),
    uniqChainHash:   uniqueIndex('blocks_chain_hash_uniq').on(t.chain, t.hash),
  })
);

// ── Extrinsics ────────────────────────────────────────────────────────────────
export const extrinsics = sqliteTable(
  'extrinsics',
  {
    id:           integer('id').primaryKey({ autoIncrement: true }),
    chain:        text('chain').notNull(),
    hash:         text('hash').notNull(),
    blockNumber:  integer('block_number').notNull(),
    blockHash:    text('block_hash').notNull(),
    indexInBlock: integer('index_in_block').notNull().default(0),
    timestampMs:  integer('timestamp_ms').notNull().default(0),
    fromAddress:  text('from_address'),
    toAddress:    text('to_address'),
    value:        text('value').notNull().default('0'),
    fee:          text('fee').notNull().default('0'),
    status:       text('status').notNull().default('pending'), // success | failed | pending
    section:      text('section').notNull().default(''),
    method:       text('method').notNull().default(''),
    nonce:        integer('nonce'),
    callData:     text('call_data'),
    decodedCall:  text('decoded_call'),  // JSON string
    eventsJson:   text('events_json'),   // JSON string
  },
  (t) => ({
    uniqChainHash:   uniqueIndex('extrinsics_chain_hash_uniq').on(t.chain, t.hash),
    idxChainBlock:   index('extrinsics_chain_block_idx').on(t.chain, t.blockNumber),
    idxChainFrom:    index('extrinsics_chain_from_idx').on(t.chain, t.fromAddress),
    idxChainTo:      index('extrinsics_chain_to_idx').on(t.chain, t.toAddress),
    idxChainStatus:  index('extrinsics_chain_status_idx').on(t.chain, t.status),
  })
);

// ── Accounts ──────────────────────────────────────────────────────────────────
export const accounts = sqliteTable(
  'accounts',
  {
    id:              integer('id').primaryKey({ autoIncrement: true }),
    chain:           text('chain').notNull(),
    address:         text('address').notNull(),
    evmAddress:      text('evm_address'),
    freeBalance:     text('free_balance').notNull().default('0'),
    reservedBalance: text('reserved_balance').notNull().default('0'),
    nonce:           integer('nonce').notNull().default(0),
    isContract:      integer('is_contract', { mode: 'boolean' }).notNull().default(false),
    lastSeenBlock:   integer('last_seen_block'),
    updatedAt:       integer('updated_at'),
  },
  (t) => ({
    uniqChainAddr: uniqueIndex('accounts_chain_address_uniq').on(t.chain, t.address),
  })
);

// ── Validators ────────────────────────────────────────────────────────────────
export const validators = sqliteTable(
  'validators',
  {
    id:             integer('id').primaryKey({ autoIncrement: true }),
    chain:          text('chain').notNull(),
    address:        text('address').notNull(),
    identity:       text('identity'),
    commission:     real('commission').notNull().default(0),
    totalStake:     text('total_stake').notNull().default('0'),
    ownStake:       text('own_stake').notNull().default('0'),
    blocksProduced: integer('blocks_produced').notNull().default(0),
    uptimePct:      real('uptime_pct').notNull().default(100),
    isActive:       integer('is_active', { mode: 'boolean' }).notNull().default(false),
    isElected:      integer('is_elected', { mode: 'boolean' }).notNull().default(false),
    updatedAt:      integer('updated_at'),
  },
  (t) => ({
    uniqChainAddr: uniqueIndex('validators_chain_address_uniq').on(t.chain, t.address),
  })
);

// ── Contracts ─────────────────────────────────────────────────────────────────
export const contracts = sqliteTable(
  'contracts',
  {
    id:              integer('id').primaryKey({ autoIncrement: true }),
    chain:           text('chain').notNull(),
    address:         text('address').notNull(),
    deployerAddress: text('deployer_address'),
    deployTxHash:    text('deploy_tx_hash'),
    deployBlock:     integer('deploy_block'),
    bytecode:        text('bytecode'),
    abi:             text('abi'),           // JSON string
    isVerified:      integer('is_verified', { mode: 'boolean' }).notNull().default(false),
    sourceCode:      text('source_code'),
    compilerVersion: text('compiler_version'),
    contractName:    text('contract_name'),
    updatedAt:       integer('updated_at'),
  },
  (t) => ({
    uniqChainAddr: uniqueIndex('contracts_chain_address_uniq').on(t.chain, t.address),
  })
);

export type Block      = typeof blocks.$inferSelect;
export type Extrinsic  = typeof extrinsics.$inferSelect;
export type Account    = typeof accounts.$inferSelect;
export type Validator  = typeof validators.$inferSelect;
export type Contract   = typeof contracts.$inferSelect;
