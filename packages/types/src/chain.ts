// ── Chain identifiers ────────────────────────────────────────────────────────
export type ChainSlug = 'public' | 'private';

export interface ChainConfig {
  slug: ChainSlug;
  name: string;
  chainId: string;
  rpcWsEnvVar: string;   // env var name (NEXT_PUBLIC_*)
  rpcHttpEnvVar: string;
  color: string;         // accent color for this chain in the UI
  permissioned: boolean;
}

// ── Block ────────────────────────────────────────────────────────────────────
export interface BlockHeader {
  number: number;
  hash: string;
  parentHash: string;
  stateRoot: string;
  extrinsicsRoot: string;
  timestamp: number;    // unix ms
  author: string | null;
}

export interface BlockSummary extends BlockHeader {
  txCount: number;
  blockTime: number | null; // ms since parent
}

export interface BlockDetail extends BlockSummary {
  weight: string | null;
  size: number | null;
  extrinsics: ExtrinsicSummary[];
  events: ChainEvent[];
}

// ── Transaction / Extrinsic ───────────────────────────────────────────────────
export type TxStatus = 'success' | 'failed' | 'pending';

export interface ExtrinsicSummary {
  index: number;
  hash: string;
  blockNumber: number;
  blockHash: string;
  timestamp: number;
  from: string | null;
  to: string | null;
  value: string;       // bigint as decimal string
  fee: string;
  status: TxStatus;
  section: string;     // pallet name
  method: string;
}

export interface ExtrinsicDetail extends ExtrinsicSummary {
  nonce: number | null;
  callData: string | null;
  decodedCall: DecodedCall | null;
  events: ChainEvent[];
  evmTrace: EvmTrace | null;
}

export interface DecodedCall {
  section: string;
  method: string;
  args: Record<string, unknown>;
}

export interface EvmTrace {
  type: string;
  from: string;
  to: string | null;
  value: string;
  gas: string;
  gasUsed: string;
  input: string;
  output: string | null;
  calls: EvmTrace[];
}

// ── Events ───────────────────────────────────────────────────────────────────
export interface ChainEvent {
  index: number;
  section: string;
  method: string;
  data: unknown[];
  phase: string;
}

// ── Account ──────────────────────────────────────────────────────────────────
export interface AccountInfo {
  address: string;            // SS58
  evmAddress: string | null;  // 0x equivalent
  balance: {
    free: string;
    reserved: string;
    total: string;
  };
  nonce: number;
  isContract: boolean;
  tokenBalances: TokenBalance[];
  stakingInfo: StakingInfo | null;
}

export interface TokenBalance {
  contractAddress: string;
  symbol: string;
  decimals: number;
  balance: string;
}

export interface StakingInfo {
  role: 'validator' | 'nominator' | 'none';
  staked: string;
  unbonding: string;
}

// ── Contract ─────────────────────────────────────────────────────────────────
export interface ContractInfo {
  address: string;
  deployerAddress: string | null;
  deployTxHash: string | null;
  deployBlock: number | null;
  bytecode: string;
  abi: AbiFragment[] | null;
  isVerified: boolean;
  sourceCode: string | null;
  compilerVersion: string | null;
  contractName: string | null;
}

export interface AbiFragment {
  type: 'function' | 'event' | 'constructor' | 'fallback' | 'receive';
  name?: string;
  inputs: AbiParam[];
  outputs?: AbiParam[];
  stateMutability?: 'pure' | 'view' | 'nonpayable' | 'payable';
}

export interface AbiParam {
  name: string;
  type: string;
  components?: AbiParam[];
}

// ── Validators ───────────────────────────────────────────────────────────────
export interface ValidatorInfo {
  address: string;
  identity: string | null;
  commission: number;   // 0-100 %
  totalStake: string;
  ownStake: string;
  blocksProduced: number;
  uptimePct: number;    // 0-100
  isActive: boolean;
  isElected: boolean;
}

// ── Network stats ─────────────────────────────────────────────────────────────
export interface NetworkStats {
  latestBlock: number;
  avgBlockTime: number;    // ms
  totalTransactions: number;
  activeValidators: number;
  tps: number;             // last 60 s
  chainStatus: 'healthy' | 'degraded' | 'down';
}

// ── WebSocket ─────────────────────────────────────────────────────────────────
export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
