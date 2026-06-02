'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useWs } from '@/context/WsContext';
import { useChainContext } from '@/context/ChainContext';
import { subscribeNewBlocks } from '@/lib/explorer/rpc/subscriptions';
import { fetchBlockList } from '@/lib/explorer/api/blocks';
import type { BlockSummary } from '@cerulea/types';

const MAX_LIVE_BLOCKS = 50;

interface UseLiveBlocksOptions {
  limit?: number;
}

interface UseLiveBlocksResult {
  blocks: BlockSummary[];
  newNumbers: Set<number>;
  latestBlock: BlockSummary | null;
  loading: boolean;
}

export function useLiveBlocks({ limit = 10 }: UseLiveBlocksOptions = {}): UseLiveBlocksResult {
  const { client, status } = useWs();
  const { chain } = useChainContext();
  const [allBlocks, setAllBlocks] = useState<BlockSummary[]>([]);
  const [newNumbers, setNewNumbers] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const unsubRef = useRef<(() => void) | null>(null);
  const newTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchBlockList(chain, { page: 1, limit })
      .then((r) => { if (!cancelled) setAllBlocks(r.items); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [chain, limit]);

  useEffect(() => {
    if (status !== 'connected' || !client) return;

    unsubRef.current = subscribeNewBlocks(client, (block) => {
      setAllBlocks((prev) => {
        if (prev.some((b) => b.number === block.number)) return prev;
        return [block, ...prev].slice(0, MAX_LIVE_BLOCKS);
      });
      setNewNumbers((prev) => new Set(Array.from(prev).concat(block.number)));
      if (newTimerRef.current) clearTimeout(newTimerRef.current);
      newTimerRef.current = setTimeout(() => setNewNumbers(new Set()), 5000);
    });

    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [client, status]);

  const sorted = allBlocks
    .filter((b, i, arr) => arr.findIndex((x) => x.number === b.number) === i)
    .sort((a, b) => b.number - a.number)
    .slice(0, limit);

  return {
    blocks: sorted,
    newNumbers,
    latestBlock: sorted[0] ?? null,
    loading,
  };
}
