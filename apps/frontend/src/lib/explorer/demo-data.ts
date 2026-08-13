/**
 * Self-contained explorer data — served entirely from the frontend when no
 * external API (NEXT_PUBLIC_API_BASE_URL) is configured. This makes
 * studio.cerulea.io/explorer work with zero backend infrastructure.
 *
 * Data is generated deterministically (seeded PRNG) so hashes/addresses are
 * stable within a session; only timestamps rebase to "now" so ages read fresh.
 * When a real API/chain exists, set NEXT_PUBLIC_API_BASE_URL and apiGet() uses
 * it instead — this module is never touched.
 */
import type {
  ChainSlug, BlockSummary, BlockDetail, ExtrinsicSummary, ExtrinsicDetail,
  AccountInfo, ValidatorInfo, ContractInfo, NetworkStats,
} from '@cerulea/types';

// ── deterministic PRNG (mulberry32) ────────────────────────────────────────────
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const BLOCKS_PER_CHAIN = 220;
const BLOCK_TIME_MS = 1000;          // 1.0s blocks (high-throughput chain)
const BASE_HEIGHT = 2_847_100;       // mature chain height, so #s look real
const IDENTITIES = [
  'Cerulea Foundation', 'Aegis Node', 'Nimbus Labs', 'Helios Validator',
  'Meridian Stake', 'Orbital One', 'Quorum Collective', 'Sentinel Ops',
  'Vertex Systems', 'Lumen Network', 'Polaris Guard', 'Zenith Chain',
];
const SECTIONS: { section: string; methods: string[] }[] = [
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
const SAMPLE_ABI = [
  { type: 'function' as const, name: 'transfer', stateMutability: 'nonpayable' as const,
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }] },
  { type: 'function' as const, name: 'balanceOf', stateMutability: 'view' as const,
    inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'event' as const, name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address' }, { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
    ] },
];
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
  const f = frac.toString().padStart(6, '0').slice(0, 6);
  return `${whole}${f}000000000000`;
}

interface ChainData {
  blocks: BlockSummary[];               // index 0 = block #1 … last = latest
  blocksByNumber: Map<number, BlockSummary>;
  blocksByHash: Map<string, BlockSummary>;
  txs: ExtrinsicSummary[];
  txsByHash: Map<string, ExtrinsicSummary>;
  accounts: Map<string, AccountInfo>;
  validators: ValidatorInfo[];
  validatorsByAddr: Map<string, ValidatorInfo>;
  contracts: Map<string, ContractInfo>;
}

const _cache = new Map<ChainSlug, ChainData>();

function buildChain(chain: ChainSlug): ChainData {
  const rng = makeRng(hashStr(`cerulea:${chain}`));
  const now = Date.now();
  const hex = (bytes: number) => {
    let out = '0x'; const c = '0123456789abcdef';
    for (let i = 0; i < bytes * 2; i++) out += c[Math.floor(rng() * 16)];
    return out;
  };
  const pick = <T,>(a: T[]): T => a[Math.floor(rng() * a.length)];
  const int = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

  // Accounts (address pool)
  const accounts = new Map<string, AccountInfo>();
  const addrPool: string[] = [];
  const nAccounts = chain === 'public' ? 40 : 22;
  for (let i = 0; i < nAccounts; i++) {
    const address = hex(20);
    addrPool.push(address);
    accounts.set(address, {
      address, evmAddress: address,
      balance: { free: plancks(int(0, 500_000), int(0, 999999)), reserved: plancks(int(0, 5_000)), total: '0' },
      nonce: int(0, 800), isContract: false, tokenBalances: [], stakingInfo: null,
    });
  }
  Array.from(accounts.values()).forEach((a) => {
    a.balance.total = (BigInt(a.balance.free) + BigInt(a.balance.reserved)).toString();
  });

  // Validators
  const validators: ValidatorInfo[] = [];
  const validatorsByAddr = new Map<string, ValidatorInfo>();
  const nVals = chain === 'public' ? 12 : 5;
  for (let i = 0; i < nVals; i++) {
    const address = hex(20);
    const own = int(50_000, 200_000);
    const v: ValidatorInfo = {
      address, identity: IDENTITIES[i % IDENTITIES.length],
      commission: parseFloat((rng() * 10).toFixed(2)),
      totalStake: plancks(own + int(100_000, 900_000)), ownStake: plancks(own),
      blocksProduced: int(500, 50_000), uptimePct: parseFloat((97 + rng() * 3).toFixed(2)),
      isActive: true, isElected: i < Math.ceil(nVals * 0.8),
    };
    validators.push(v); validatorsByAddr.set(address, v);
    // give the validator a staking account entry
    if (!accounts.has(address)) {
      accounts.set(address, {
        address, evmAddress: address,
        balance: { free: plancks(int(1000, 50_000)), reserved: v.ownStake, total: '0' },
        nonce: int(0, 200), isContract: false,
        tokenBalances: [],
        stakingInfo: { role: 'validator', staked: v.ownStake, unbonding: '0' },
      });
      const a = accounts.get(address)!;
      a.balance.total = (BigInt(a.balance.free) + BigInt(a.balance.reserved)).toString();
    }
  }
  const valAddrs = validators.map((v) => v.address);

  // Blocks + txs
  const blocks: BlockSummary[] = [];
  const blocksByNumber = new Map<number, BlockSummary>();
  const blocksByHash = new Map<string, BlockSummary>();
  const txs: ExtrinsicSummary[] = [];
  const txsByHash = new Map<string, ExtrinsicSummary>();
  const txsByBlock = new Map<number, ExtrinsicSummary[]>();

  for (let n = 1; n <= BLOCKS_PER_CHAIN; n++) {
    const ageBlocks = BLOCKS_PER_CHAIN - n;
    const ts = now - ageBlocks * BLOCK_TIME_MS;
    const height = BASE_HEIGHT + n;
    const hash = hex(32);
    const txCount = int(0, 6);
    const b: BlockSummary = {
      number: height, hash, parentHash: hex(32), stateRoot: hex(32), extrinsicsRoot: hex(32),
      timestamp: ts, author: pick(valAddrs), txCount, blockTime: BLOCK_TIME_MS + int(-180, 180),
    };
    blocks.push(b); blocksByNumber.set(height, b); blocksByHash.set(hash, b);
    const blockTxs: ExtrinsicSummary[] = [];
    for (let i = 0; i < txCount; i++) {
      const sm = pick(SECTIONS);
      const tx: ExtrinsicSummary = {
        index: i, hash: hex(32), blockNumber: height, blockHash: hash, timestamp: ts,
        from: pick(addrPool), to: pick(addrPool),
        value: rng() > 0.3 ? plancks(int(0, 25_000), int(0, 999999)) : '0',
        fee: plancks(0, int(100, 90_000)),
        status: rng() > 0.06 ? 'success' : 'failed',
        section: sm.section, method: pick(sm.methods),
      };
      txs.push(tx); txsByHash.set(tx.hash, tx); blockTxs.push(tx);
    }
    txsByBlock.set(height, blockTxs);
  }

  // Contracts
  const contracts = new Map<string, ContractInfo>();
  const nContracts = chain === 'public' ? 8 : 4;
  for (let i = 0; i < nContracts; i++) {
    const address = hex(20);
    const verified = rng() > 0.4;
    const deployBlock = int(BASE_HEIGHT + 1, BASE_HEIGHT + BLOCKS_PER_CHAIN - 1);
    contracts.set(address, {
      address, deployerAddress: pick(addrPool), deployTxHash: hex(32), deployBlock,
      bytecode: hex(int(200, 600)), abi: verified ? SAMPLE_ABI : null, isVerified: verified,
      sourceCode: verified ? SAMPLE_SOURCE : null,
      compilerVersion: verified ? 'v0.8.24+commit.e11b9ed9' : null,
      contractName: verified ? CONTRACT_NAMES[i % CONTRACT_NAMES.length] : null,
    });
    accounts.set(address, {
      address, evmAddress: address,
      balance: { free: plancks(int(0, 100_000)), reserved: '0', total: '0' },
      nonce: int(1, 50), isContract: true, tokenBalances: [], stakingInfo: null,
    });
    accounts.get(address)!.balance.total = accounts.get(address)!.balance.free;
  }

  const data: ChainData & { txsByBlock: Map<number, ExtrinsicSummary[]> } = {
    blocks, blocksByNumber, blocksByHash, txs, txsByHash,
    accounts, validators, validatorsByAddr, contracts, txsByBlock,
  };
  return data;
}

function getChain(chain: ChainSlug): ChainData & { txsByBlock: Map<number, ExtrinsicSummary[]> } {
  if (!_cache.has(chain)) _cache.set(chain, buildChain(chain));
  return _cache.get(chain) as ChainData & { txsByBlock: Map<number, ExtrinsicSummary[]> };
}

// ── on-the-fly synthesis for addresses/blocks not in the base set ──────────────
function synthAccount(chain: ChainSlug, address: string): AccountInfo {
  const rng = makeRng(hashStr(`${chain}:acct:${address}`));
  const int = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
  const free = plancks(int(0, 250_000), int(0, 999999));
  const reserved = plancks(int(0, 2_000));
  return {
    address, evmAddress: address,
    balance: { free, reserved, total: (BigInt(free) + BigInt(reserved)).toString() },
    nonce: int(0, 400), isContract: false, tokenBalances: [], stakingInfo: null,
  };
}

function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const start = (page - 1) * limit;
  return { items: items.slice(start, start + limit), total, page, pageSize: limit, hasNextPage: start + limit < total };
}

function num(v: unknown, d: number): number {
  const n = typeof v === 'string' ? parseInt(v, 10) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : d;
}

/**
 * Local router mirroring the REST API. `path` is the request path (leading '/'),
 * `params` the query params. Returns the same shapes apiGet would receive.
 */
export function demoApi(path: string, params: Record<string, string | number | undefined> = {}): unknown {
  const chain = ((params.chain as string) || 'public') as ChainSlug;
  const d = getChain(chain);
  const page = num(params.page, 1);
  const limit = num(params.limit, 25);
  // strip a leading /api/explorer or similar just in case
  const p = path.replace(/^\/+/, '/');

  // /network/stats
  if (p === '/network/stats') {
    const latest = d.blocks[d.blocks.length - 1];
    const stats: NetworkStats = {
      latestBlock: latest.number,               // ~2.85M (high-throughput chain)
      avgBlockTime: BLOCK_TIME_MS,              // 1000ms → "1.0s"
      totalTransactions: 20_000 + d.txs.length, // ~20,681
      activeValidators: d.validators.filter((v) => v.isElected).length,
      tps: 1200,
      chainStatus: 'healthy',
    };
    return stats;
  }

  // /blocks , /blocks/:number , /blocks/hash/:hash
  if (p === '/blocks') {
    const items = [...d.blocks].reverse();
    return paginate<BlockSummary>(items, page, limit);
  }
  let m = p.match(/^\/blocks\/hash\/(.+)$/);
  if (m) {
    const b = d.blocksByHash.get(m[1]);
    if (!b) throw notFound(`Block ${m[1]} not found`);
    return toBlockDetail(d, b);
  }
  m = p.match(/^\/blocks\/(\d+)$/);
  if (m) {
    const n = parseInt(m[1], 10);
    const b = d.blocksByNumber.get(n);
    if (!b) throw notFound(`Block #${n} not found`);
    return toBlockDetail(d, b);
  }

  // /txs , /txs/:hash
  if (p === '/txs') {
    let items = [...d.txs].sort((a, b) => b.blockNumber - a.blockNumber || b.index - a.index);
    if (params.status) items = items.filter((t) => t.status === params.status);
    if (params.method) {
      items = items.filter((t) => `${t.section}.${t.method}` === params.method || t.method === params.method);
    }
    return paginate<ExtrinsicSummary>(items, page, limit);
  }
  m = p.match(/^\/txs\/(.+)$/);
  if (m) {
    const t = d.txsByHash.get(m[1]);
    if (!t) throw notFound(`Transaction ${m[1]} not found`);
    const detail: ExtrinsicDetail = {
      ...t, nonce: hashStr(t.hash) % 800, callData: '0x' + m[1].slice(2, 18),
      decodedCall: { section: t.section, method: t.method, args: {} },
      events: [], evmTrace: null,
    };
    return detail;
  }

  // /accounts/:address/txs , /accounts/:address
  m = p.match(/^\/accounts\/([^/]+)\/txs$/);
  if (m) {
    const addr = m[1];
    const items = d.txs
      .filter((t) => t.from === addr || t.to === addr)
      .sort((a, b) => b.blockNumber - a.blockNumber || b.index - a.index);
    return paginate<ExtrinsicSummary>(items, page, limit);
  }
  m = p.match(/^\/accounts\/([^/]+)$/);
  if (m) {
    const addr = m[1];
    return d.accounts.get(addr) ?? synthAccount(chain, addr);
  }

  // /validators , /validators/:address
  if (p === '/validators') {
    const items = [...d.validators].sort((a, b) => Number(BigInt(b.totalStake) - BigInt(a.totalStake)));
    return paginate<ValidatorInfo>(items, page, limit);
  }
  m = p.match(/^\/validators\/([^/]+)$/);
  if (m) {
    const v = d.validatorsByAddr.get(m[1]);
    if (!v) throw notFound(`Validator ${m[1]} not found`);
    return v;
  }

  // /contracts/:address/events , /contracts/:address
  m = p.match(/^\/contracts\/([^/]+)\/events$/);
  if (m) {
    return paginate<Record<string, unknown>>([], page, limit);
  }
  m = p.match(/^\/contracts\/([^/]+)$/);
  if (m) {
    const c = d.contracts.get(m[1]);
    if (!c) throw notFound(`Contract ${m[1]} not found`);
    return c;
  }

  throw notFound(`No demo route for ${p}`);
}

function toBlockDetail(
  d: ChainData & { txsByBlock: Map<number, ExtrinsicSummary[]> },
  b: BlockSummary,
): BlockDetail {
  return {
    ...b,
    weight: `${40 + (b.number % 55)}%`,
    size: 800 + ((b.number * 137) % 23_000),
    extrinsics: d.txsByBlock.get(b.number) ?? [],
    events: [],
  };
}

class DemoApiError extends Error {
  status = 404;
  constructor(message: string) { super(message); this.name = 'DemoApiError'; }
}
function notFound(msg: string) { return new DemoApiError(msg); }

/** True when no external API is configured, so the explorer should self-serve. */
export function isDemoMode(): boolean {
  return !(process.env.NEXT_PUBLIC_API_BASE_URL ?? '').trim();
}
