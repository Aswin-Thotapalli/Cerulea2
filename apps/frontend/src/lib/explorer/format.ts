import { formatDistanceToNowStrict, format as fnsFormat } from 'date-fns';

export function formatTimestamp(tsMs: number): { relative: string; absolute: string } {
  const date = new Date(tsMs);
  return {
    relative: formatDistanceToNowStrict(date, { addSuffix: true }),
    absolute: fnsFormat(date, "yyyy-MM-dd HH:mm:ss 'UTC'"),
  };
}

export function truncateHash(hash: string, head = 8, tail = 6): string {
  if (!hash) return '';
  if (hash.length <= head + tail + 2) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

export function shortAddress(addr: string): string {
  return truncateHash(addr, 6, 4);
}

export function formatUnits(value: bigint | string, decimals: number): string {
  const n = BigInt(value);
  if (decimals === 0) return n.toString();
  let divisor = BigInt(1);
  for (let i = 0; i < decimals; i++) divisor *= BigInt(10);
  const whole = n / divisor;
  const frac = n % divisor;
  if (frac === BigInt(0)) return whole.toString();
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole}.${fracStr}`;
}

export function formatNumber(n: number | string): string {
  return Number(n).toLocaleString('en-US');
}

/** Cerulea native token defaults. */
export const NATIVE_TOKEN = { symbol: 'CRL', decimals: 18 } as const;

/**
 * Format a base-unit (planck) token amount with thousands separators + symbol.
 * e.g. formatToken("954063000000000000000000") → "954,063 CRL"
 */
export function formatToken(
  value: bigint | string | null | undefined,
  decimals: number = NATIVE_TOKEN.decimals,
  symbol: string = NATIVE_TOKEN.symbol,
): string {
  if (value === null || value === undefined || value === '') return `0 ${symbol}`;
  let s: string;
  try {
    s = formatUnits(value, decimals);
  } catch {
    return `${value} ${symbol}`;
  }
  const [whole, frac] = s.split('.');
  const wholeFmt = Number(whole).toLocaleString('en-US');
  return `${frac ? `${wholeFmt}.${frac}` : wholeFmt} ${symbol}`;
}

export function hexToNumber(hex: string): number {
  return parseInt(hex.startsWith('0x') ? hex : `0x${hex}`, 16);
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const arr = new Uint8Array(clean.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}
