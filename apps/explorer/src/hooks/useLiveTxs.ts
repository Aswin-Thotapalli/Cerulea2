'use client';

import { useEffect, useRef, useState } from 'react';
import { useWs } from '@/context/WsContext';
import { useChainContext } from '@/context/ChainContext';
import { subscribeNewBlocks } from '@/lib/rpc/subscriptions';
import { fetchTxList } from '@/lib/api/txs';
import type { ExtrinsicSummary } from '@cerulea/types';

const MAX_LIVE_TXS = 50;

interface UseLiveTxsOptions {
  limit?: number;
}

interface UseLiveTxsResult {
  txs: ExtrinsicSummary[];
  newHashes: Set<string>;
  loading: boolean;
}

export function useLiveTxs({ limit = 10 }: UseLiveTxsOptions = {}): UseLiveTxsResult {
  const { client, status } = useWs();
  const { chain } = useChainContext();
  const [allTxs, setAllTxs] = useState<ExtrinsicSummary[]>([]);
  const [newHashes, setNewHashes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const unsubRef = useRef<(() => void) | null>(null);
  const newTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial seed from API
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTxList(chain, { page: 1, limit })
      .then((r) => { if (!cancelled) setAllTxs(r.items); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [chain, limit]);

  // Live subscription — extract extrinsics from new block data
  useEffect(() => {
    if (status !== 'connected' || !client) return;

    // We listen to new blocks and then fetch their extrinsics from the API.
    // A more advanced implementation could parse the raw block extrinsics via codec.
    unsubRef.current = subscribeNewBlocks(client, (block) => {
      if (!block.txCount || block.txCount === 0) return;
      fetchTxList(chain, { page: 1, limit: block.txCount, blockNumber: block.number })
        .then((r) => {
          if (!r.items.length) return;
          const hashes = r.items.map((t) => t.hash);
          setAllTxs((prev) => {
            const existing = new Set(prev.map((t) => t.hash));
            const newItems = r.items.filter((t) => !existing.has(t.hash));
            if (!newItems.length) return prev;
            return [...newItems, ...prev].slice(0, MAX_LIVE_TXS);
          });
          setNewHashes((prev) => new Set(Array.from(prev).concat(hashes)));
          if (newTimerRef.current) clearTimeout(newTimerRef.current);
          newTimerRef.current = setTimeout(() => setNewHashes(new Set()), 5000);
        })
        .catch(() => {});
    });

    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [client, status, chain]);

  const displayed = allTxs.slice(0, limit);

  return { txs: displayed, newHashes, loading };
}
