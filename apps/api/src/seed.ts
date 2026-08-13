/**
 * Dev/demo seed — populates the SQLite DB with realistic Cerulea chain data so
 * the REST API (and therefore the Explorer) has something to serve WITHOUT a
 * live chain node. Safe to re-run: every insert is idempotent on its unique key.
 *
 *   npm run seed            # seeds ./data/cerulea.db (default)
 *   DB_PATH=... npm run seed
 *
 * This is demo data, not production data — the indexer overwrites/extends it
 * once a real node is connected.
 */
import 'dotenv/config';
import { initDb, getDb } from './db/client';
import { blocks, extrinsics, accounts, validators, contracts } from './db/schema';
import type { ChainSlug } from '@cerulea/types';

// ── tiny deterministic-ish PRNG so repeated runs look stable ────────────────────
let _s = 0x2f6e2b1;
function rnd(): number {
  _s ^= _s << 13; _s ^= _s >>> 17; _s ^= _s << 5;
  return ((_s >>> 0) % 1_000_000) / 1_000_000;
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const int = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));

function hex(bytes: number): string {
  let out = '0x';
  const chars = '0123456789abcdef';
  for (let i = 0; i < bytes * 2; i++) out += chars[Math.floor(rnd() * 16)];
  return out;
}
const blockHash = () => hex(32);   // 0x + 64
const txHash    = () => hex(32);
const evmAddr   = () => hex(20);   // 0x + 40

const CHAINS: ChainSlug[] = ['public', 'private'];
const BLOCKS_PER_CHAIN = 220;
const BLOCK_TIME_MS = 6000;

const IDENTITIES = [
  'Cerulea Foundation', 'Aegis Node', 'Nimbus Labs', 'Helios Validator',
  'Meridian Stake', 'Orbital One', 'Quorum Collective', 'Sentinel Ops',
  'Vertex Systems', 'Lumen Network', 'Polaris Guard', 'Zenith Chain',
];
const SECTIONS = [
  { section: 'balances',  methods: ['transfer', 'transferKeepAlive'] },
  { section: 'contracts', methods: ['call', 'instantiate'] },
  { section: 'staking',   methods: ['bond', 'nominate', 'payoutStakers'] },
  { section: 'identity',  methods: ['setIdentity'] },
  { section: 'dcf',       methods: ['submitAttestation', 'rotateKeys'] }, // Cerulea DCF consensus
];
const CONTRACT_NAMES = [
  'CeruleaToken', 'GovernanceVault', 'IdentityRegistry', 'RecordsAnchor',
  'PaymentSplitter', 'MultiSigWallet', 'StakingPool', 'RTIRequestBoard',
];
const SAMPLE_ABI = JSON.stringify([
  { type: 'function', name: 'transfer', stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'event', name: 'Transfer', inputs: [
    { name: 'from', type: 'address', indexed: true },
    { name: 'to', type: 'address', indexed: true },
    { name: 'value', type: 'uint256', indexed: false } ] },
]);
const SAMPLE_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CeruleaToken — demo verified contract
contract CeruleaToken {
    string public name = "Cerulea";
    string public symbol = "CRL";
    uint8  public decimals = 18;
    mapping(address => uint256) public balanceOf;

    event Transfer(address indexed from, address indexed to, uint256 value);

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
}
`;

function plancks(whole: number, frac = 0): string {
  // 18-decimal token; return string in base units
  const f = frac.toString().padStart(6, '0').slice(0, 6);
  return `${whole}${f}000000000000`;
}

async function main() {
  initDb();
  const db = getDb();
  const now = Date.now();

  for (const chain of CHAINS) {
    // ── Accounts (pool of addresses reused across txs) ──────────────────────
    const addrPool: string[] = [];
    const accountRows = [];
    const nAccounts = chain === 'public' ? 40 : 22;
    for (let i = 0; i < nAccounts; i++) {
      const address = evmAddr();
      addrPool.push(address);
      accountRows.push({
        chain,
        address,
        evmAddress: address,
        freeBalance: plancks(int(0, 500_000), int(0, 999999)),
        reservedBalance: plancks(int(0, 5_000)),
        nonce: int(0, 800),
        isContract: false,
        lastSeenBlock: int(1, BLOCKS_PER_CHAIN),
        updatedAt: now,
      });
    }
    await db.insert(accounts).values(accountRows).onConflictDoNothing();

    // ── Validators ──────────────────────────────────────────────────────────
    const nVals = chain === 'public' ? 12 : 5;
    const valRows = [];
    const valAddrs: string[] = [];
    for (let i = 0; i < nVals; i++) {
      const address = evmAddr();
      valAddrs.push(address);
      const own = int(50_000, 200_000);
      valRows.push({
        chain,
        address,
        identity: IDENTITIES[i % IDENTITIES.length],
        commission: parseFloat((rnd() * 10).toFixed(2)),
        totalStake: plancks(own + int(100_000, 900_000)),
        ownStake: plancks(own),
        blocksProduced: int(500, 50_000),
        uptimePct: parseFloat((97 + rnd() * 3).toFixed(2)),
        isActive: true,
        isElected: i < Math.ceil(nVals * 0.8),
        updatedAt: now,
      });
    }
    await db.insert(validators).values(valRows).onConflictDoNothing();

    // ── Blocks + extrinsics ───────────────────────────────────────────────────
    const blockRows = [];
    const txRows = [];
    let totalTx = 0;
    for (let n = 1; n <= BLOCKS_PER_CHAIN; n++) {
      const ageBlocks = BLOCKS_PER_CHAIN - n; // 0 = latest
      const ts = now - ageBlocks * BLOCK_TIME_MS;
      const hash = blockHash();
      const txCount = int(0, 6);
      const author = pick(valAddrs);
      blockRows.push({
        chain,
        number: n,
        hash,
        parentHash: blockHash(),
        stateRoot: blockHash(),
        extrinsicsRoot: blockHash(),
        timestampMs: ts,
        author,
        txCount,
        blockTimeMs: BLOCK_TIME_MS + int(-400, 400),
        weight: `${int(20, 90)}%`,
        sizeBytes: int(800, 24_000),
        eventsCount: txCount * int(1, 3) + int(0, 2),
      });
      for (let i = 0; i < txCount; i++) {
        const sm = pick(SECTIONS);
        totalTx++;
        txRows.push({
          chain,
          hash: txHash(),
          blockNumber: n,
          blockHash: hash,
          indexInBlock: i,
          timestampMs: ts,
          fromAddress: pick(addrPool),
          toAddress: pick(addrPool),
          value: rnd() > 0.3 ? plancks(int(0, 25_000), int(0, 999999)) : '0',
          fee: plancks(0, int(100, 90_000)),
          status: rnd() > 0.06 ? 'success' : 'failed',
          section: sm.section,
          method: pick(sm.methods),
          nonce: int(0, 800),
          callData: hex(int(4, 40)),
          decodedCall: null,
          eventsJson: null,
        });
      }
    }
    await db.insert(blocks).values(blockRows).onConflictDoNothing();
    // insert extrinsics in chunks (SQLite variable limit)
    for (let i = 0; i < txRows.length; i += 200) {
      await db.insert(extrinsics).values(txRows.slice(i, i + 200)).onConflictDoNothing();
    }

    // ── Contracts (also registered as contract accounts) ──────────────────────
    const nContracts = chain === 'public' ? 8 : 4;
    const contractRows = [];
    const contractAcctRows = [];
    for (let i = 0; i < nContracts; i++) {
      const address = evmAddr();
      const verified = rnd() > 0.4;
      const deployBlock = int(1, BLOCKS_PER_CHAIN - 1);
      contractRows.push({
        chain,
        address,
        deployerAddress: pick(addrPool),
        deployTxHash: txHash(),
        deployBlock,
        bytecode: hex(int(200, 600)),
        abi: verified ? SAMPLE_ABI : null,
        isVerified: verified,
        sourceCode: verified ? SAMPLE_SOURCE : null,
        compilerVersion: verified ? 'v0.8.24+commit.e11b9ed9' : null,
        contractName: verified ? CONTRACT_NAMES[i % CONTRACT_NAMES.length] : null,
        updatedAt: now,
      });
      contractAcctRows.push({
        chain,
        address,
        evmAddress: address,
        freeBalance: plancks(int(0, 100_000)),
        reservedBalance: '0',
        nonce: int(1, 50),
        isContract: true,
        lastSeenBlock: int(deployBlock, BLOCKS_PER_CHAIN),
        updatedAt: now,
      });
    }
    await db.insert(contracts).values(contractRows).onConflictDoNothing();
    await db.insert(accounts).values(contractAcctRows).onConflictDoNothing();

    console.log(
      `[seed] ${chain}: ${blockRows.length} blocks, ${totalTx} txs, ` +
      `${accountRows.length + contractAcctRows.length} accounts, ${valRows.length} validators, ${contractRows.length} contracts`
    );
  }

  console.log('[seed] Done. Demo data ready.');
  process.exit(0);
}

main().catch((e) => { console.error('[seed] Error:', e); process.exit(1); });
