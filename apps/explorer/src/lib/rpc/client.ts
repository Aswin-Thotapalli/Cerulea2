'use client';

import type { WsStatus } from '@cerulea/types';
import type {
  RpcRequest, RpcResponse, RpcSubscriptionMessage,
} from './types';

type MessageHandler = (msg: RpcSubscriptionMessage) => void;
type PendingCall = {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
};

const INITIAL_RETRY_MS = 1_000;
const MAX_RETRY_MS = 30_000;

/**
 * Lightweight Substrate JSON-RPC WebSocket client.
 * Handles reconnection with exponential back-off, multiplexes
 * in-flight calls, and routes subscription notifications.
 */
export class SubstrateRpcClient {
  private ws: WebSocket | null = null;
  private url: string;
  private idCounter = 1;
  private pending = new Map<number, PendingCall>();
  private subscriptionHandlers = new Map<string, MessageHandler>();
  private retryMs = INITIAL_RETRY_MS;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private _status: WsStatus = 'disconnected';
  private onStatusChange?: (s: WsStatus) => void;

  constructor(url: string, onStatusChange?: (s: WsStatus) => void) {
    this.url = url;
    this.onStatusChange = onStatusChange;
  }

  get status(): WsStatus {
    return this._status;
  }

  connect(): void {
    if (!this.url) {
      this.setStatus('error');
      return;
    }
    this.setStatus('connecting');
    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.scheduleRetry();
      return;
    }
    this.ws.onopen = () => {
      this.retryMs = INITIAL_RETRY_MS;
      this.setStatus('connected');
    };
    this.ws.onmessage = (evt: MessageEvent<string>) => {
      let msg: RpcResponse | RpcSubscriptionMessage;
      try {
        msg = JSON.parse(evt.data) as RpcResponse | RpcSubscriptionMessage;
      } catch {
        return;
      }
      // Subscription notification (no id, has params.subscription)
      if (!('id' in msg) || msg.id === null) {
        const sub = msg as RpcSubscriptionMessage;
        const handler = this.subscriptionHandlers.get(sub.params?.subscription ?? '');
        handler?.(sub);
        return;
      }
      // Response to a call
      const res = msg as RpcResponse;
      const pending = this.pending.get(res.id ?? -1);
      if (pending) {
        this.pending.delete(res.id ?? -1);
        if (res.error) {
          pending.reject(new Error(`RPC ${res.error.code}: ${res.error.message}`));
        } else {
          pending.resolve(res.result);
        }
      }
    };
    this.ws.onerror = () => {
      this.setStatus('error');
      this.ws?.close();
    };
    this.ws.onclose = () => {
      this.rejectAll(new Error('WebSocket closed'));
      this.setStatus('disconnected');
      this.scheduleRetry();
    };
  }

  disconnect(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.ws?.close();
    this.ws = null;
    this.setStatus('disconnected');
  }

  /** Send a JSON-RPC call and return a typed promise. */
  call<T>(method: string, params: unknown[] = []): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (this._status !== 'connected' || !this.ws) {
        reject(new Error(`Not connected (status: ${this._status})`));
        return;
      }
      const id = this.idCounter++;
      this.pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
      });
      const req: RpcRequest = { id, jsonrpc: '2.0', method, params };
      this.ws.send(JSON.stringify(req));
    });
  }

  /**
   * Subscribe to a Substrate subscription endpoint.
   * Returns an unsubscribe function.
   */
  subscribe(
    subscribeMethod: string,
    unsubscribeMethod: string,
    params: unknown[],
    handler: MessageHandler
  ): () => void {
    let subscriptionId: string | null = null;

    this.call<string>(subscribeMethod, params).then((subId) => {
      subscriptionId = subId;
      this.subscriptionHandlers.set(subId, handler);
    }).catch((err: Error) => {
      console.error(`[rpc] subscribe ${subscribeMethod} failed:`, err.message);
    });

    return () => {
      if (subscriptionId) {
        this.subscriptionHandlers.delete(subscriptionId);
        this.call(unsubscribeMethod, [subscriptionId]).catch(() => {});
      }
    };
  }

  private setStatus(s: WsStatus): void {
    this._status = s;
    this.onStatusChange?.(s);
  }

  private scheduleRetry(): void {
    if (this.retryTimer) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, this.retryMs);
    this.retryMs = Math.min(this.retryMs * 2, MAX_RETRY_MS);
  }

  private rejectAll(err: Error): void {
    for (const pending of Array.from(this.pending.values())) {
      pending.reject(err);
    }
    this.pending.clear();
  }
}
