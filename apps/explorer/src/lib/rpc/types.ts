// ── Substrate JSON-RPC response envelope ─────────────────────────────────────

export interface RpcRequest {
  id: number;
  jsonrpc: '2.0';
  method: string;
  params: unknown[];
}

export interface RpcResponse<T = unknown> {
  id: number | null;
  jsonrpc: '2.0';
  result?: T;
  error?: { code: number; message: string };
}

export interface RpcSubscriptionMessage<T = unknown> {
  jsonrpc: '2.0';
  method: string;
  params: {
    subscription: string;
    result: T;
  };
}

// ── chain_subscribeNewHead result ─────────────────────────────────────────────
export interface RpcBlockHeader {
  number: string;         // hex
  hash?: string;          // injected by us after getBlockHash
  parentHash: string;
  stateRoot: string;
  extrinsicsRoot: string;
  digest: { logs: string[] };
}

// ── chain_getBlock result ─────────────────────────────────────────────────────
export interface RpcBlock {
  block: {
    header: RpcBlockHeader;
    extrinsics: string[];  // SCALE-encoded hex extrinsics
  };
  justifications: null | unknown[];
}

// ── system_health result ──────────────────────────────────────────────────────
export interface RpcSystemHealth {
  peers: number;
  isSyncing: boolean;
  shouldHavePeers: boolean;
}

// ── system_chain result ───────────────────────────────────────────────────────
export type RpcChainName = string;
