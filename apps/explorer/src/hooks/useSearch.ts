'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ChainSlug } from '@cerulea/types';

type SearchResultType = 'block' | 'tx' | 'account' | 'contract' | 'unknown';

interface SearchResult {
  type: SearchResultType;
  href: string;
  label: string;
}

function classifyQuery(q: string): SearchResultType {
  const trimmed = q.trim();
  // Block number
  if (/^\d+$/.test(trimmed)) return 'block';
  // 0x prefixed: 32-byte (64 hex chars after 0x) → tx hash or block hash
  if (/^0x[0-9a-fA-F]{64}$/.test(trimmed)) return 'tx';
  // 0x address (EVM 20 bytes = 40 hex)
  if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return 'account';
  // SS58 address (47–48 chars, starts with 5 or other base58 prefix)
  if (/^[1-9A-HJ-NP-Za-km-z]{47,50}$/.test(trimmed)) return 'account';
  return 'unknown';
}

export function useSearch(chain: ChainSlug) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const submit = useCallback(
    (q: string): SearchResult | null => {
      const trimmed = q.trim();
      if (!trimmed) return null;

      const type = classifyQuery(trimmed);
      let href = '';

      switch (type) {
        case 'block':
          href = `/${chain}/blocks/${trimmed}`;
          break;
        case 'tx':
          // Could be a block hash or tx hash — try tx first
          href = `/${chain}/txs/${trimmed}`;
          break;
        case 'account':
          href = `/${chain}/accounts/${trimmed}`;
          break;
        default:
          return null;
      }

      router.push(href);
      setQuery('');
      return { type, href, label: trimmed };
    },
    [chain, router]
  );

  return { query, setQuery, submit };
}
