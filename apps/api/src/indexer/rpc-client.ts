/**
 * Raw WebSocket JSON-RPC client for Substrate-compatible nodes.
 * No third-party blockchain libraries — plain WebSocket + JSON-RPC 2.0.
 */
import WebSocket from 'ws';

// ── Response types ────────────────────────────────────────────────────────────

export interface SubstrateHeader {
  parentHash:     string;
  number:         string; // hex-encoded block number, e.g. "0x1a2b"
  stateRoot:      string;
  extrinsicsRoot: string;
  digest:         { logs: string[] };
}

export interface SubstrateBlock {
  block: {
    header:      SubstrateHeader;
    extrinsics:  string[]; // raw SCALE-encoded hex per extrinsic
  };
  justifications: null | unknown;
}

// ── Client ────────────────────────────────────────────────────────────────────

export class CeruleaNodeClient {
  readonly url: string;

  private ws:     WebSocket | null = null;
  private nextId  = 1;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  private subs    = new Map<string, (result: any) => void>();
  private retryHandle: ReturnType<typeof setTimeout> | null = null;

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url, { handshakeTimeout: 10_000 });

      const onOpen = () => {
        this.ws!.removeListener('error', onErr);
        resolve();
      };
      const onErr = (err: Error) => {
        this.ws!.removeListener('open', onOpen);
        reject(err);
      };

      this.ws.once('open',  onOpen);
      this.ws.once('error', onErr);
      this.ws.on('message', (data) => {
        try { this.onMessage(data.toString()); } catch {}
      });
      this.ws.on('close', () => {
        console.warn(`[node] ${this.url} disconnected — reconnecting in 5 s`);
        this.scheduleReconnect();
      });
      this.ws.on('error', (err) => {
        console.warn(`[node] WebSocket error (${this.url}):`, err.message);
      });
    });
  }

  private scheduleReconnect() {
    if (this.retryHandle) return;
    this.retryHandle = setTimeout(async () => {
      this.retryHandle = null;
      try {
        await this.connect();
      } catch (err: any) {
        console.warn(`[node] Reconnect failed (${this.url}):`, err.message);
        this.scheduleReconnect();
      }
    }, 5_000);
  }

  private onMessage(raw: string) {
    const msg = JSON.parse(raw);

    if (msg.id !== undefined && msg.id !== null) {
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      if (msg.error) p.reject(new Error(`RPC ${msg.error.code}: ${msg.error.message}`));
      else           p.resolve(msg.result);
    } else if (msg.params?.subscription !== undefined) {
      this.subs.get(msg.params.subscription)?.(msg.params.result);
    }
  }

  call<T = any>(method: string, params: unknown[] = []): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        return reject(new Error(`[node] Not connected to ${this.url}`));
      }
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
    });
  }

  // ── Typed helpers ───────────────────────────────────────────────────────────

  getHeader(hash?: string): Promise<SubstrateHeader> {
    return this.call('chain_getHeader', hash ? [hash] : []);
  }

  getBlock(hash?: string): Promise<SubstrateBlock> {
    return this.call('chain_getBlock', hash ? [hash] : []);
  }

  getBlockHash(blockNumber?: number): Promise<string> {
    return this.call('chain_getBlockHash', blockNumber !== undefined ? [blockNumber] : []);
  }

  getFinalizedHead(): Promise<string> {
    return this.call('chain_getFinalizedHead');
  }

  getStorage(storageKey: string, blockHash?: string): Promise<string | null> {
    return this.call('state_getStorage', blockHash ? [storageKey, blockHash] : [storageKey]);
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    if (this.retryHandle) { clearTimeout(this.retryHandle); this.retryHandle = null; }
    this.ws?.removeAllListeners();
    this.ws?.close();
    this.ws = null;
    for (const p of this.pending.values()) p.reject(new Error('Disconnected'));
    this.pending.clear();
    this.subs.clear();
  }
}
