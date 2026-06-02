import { formatDistanceToNowStrict, format as fnsFormat } from 'date-fns';

/**
 * Format a unix-ms timestamp as a relative string ("3 seconds ago")
 * and an absolute UTC string for tooltip use.
 */
export function formatTimestamp(tsMs: number): { relative: string; absolute: string } {
  const date = new Date(tsMs);
  return {
    relative: formatDistanceToNowStrict(date, { addSuffix: true }),
    absolute: fnsFormat(date, "yyyy-MM-dd HH:mm:ss 'UTC'"),
  };
}

/** Truncate a hex hash or SS58 address: keep first N and last M chars. */
export function truncateHash(hash: string, head = 8, tail = 6): string {
  if (!hash) return '';
  if (hash.length <= head + tail + 2) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

/** Shorten to 0x1234…abcd form for inline table display. */
export function shortAddress(addr: string): string {
  return truncateHash(addr, 6, 4);
}

/**
 * Format a bigint token balance given decimals into a human-readable string.
 * e.g. formatUnits(1_000_000_000_000_000_000n, 18) → "1.0"
 */
export function formatUnits(value: bigint | string, decimals: number): string {
  const n = BigInt(value);
  if (decimals === 0) return n.toString();
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = n / divisor;
  const frac = n % divisor;
  if (frac === BigInt(0)) return whole.toString();
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole}.${fracStr}`;
}

/** Format a large number with commas: 1_234_567 → "1,234,567" */
export function formatNumber(n: number | string): string {
  return Number(n).toLocaleString('en-US');
}

/** Parse "0x1a2b" hex block number from Substrate rpc response */
export function hexToNumber(hex: string): number {
  return parseInt(hex.startsWith('0x') ? hex : `0x${hex}`, 16);
}

/** Convert a 0x hex string to Uint8Array */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const arr = new Uint8Array(clean.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}
