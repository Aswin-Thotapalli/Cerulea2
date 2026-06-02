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

export interface RpcBlockHeader {
  number: string;
  hash?: string;
  parentHash: string;
  stateRoot: string;
  extrinsicsRoot: string;
  digest: { logs: string[] };
}

export interface RpcBlock {
  block: {
    header: RpcBlockHeader;
    extrinsics: string[];
  };
  justifications: null | unknown[];
}

export interface RpcSystemHealth {
  peers: number;
  isSyncing: boolean;
  shouldHavePeers: boolean;
}

export type RpcChainName = string;
