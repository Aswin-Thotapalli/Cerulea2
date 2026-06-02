// Format a 0x hash or SS58 address: show first N + last M chars
export function truncateHash(hash: string, head = 8, tail = 6): string {
  if (!hash) return '';
  if (hash.length <= head + tail + 2) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

// Format a number with commas
export function formatNumber(n: number | string | bigint): string {
  return Number(n).toLocaleString('en-US');
}

// Format a bigint token amount to a decimal string given decimals
export function formatUnits(value: bigint | string, decimals: number): string {
  const n = BigInt(value);
  const divisor = BigInt(10 ** decimals);
  const whole = n / divisor;
  const remainder = n % divisor;
  if (remainder === 0n) return whole.toString();
  const fracStr = remainder.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole}.${fracStr}`;
}

// Shorten address to 0x1234…5678 form
export function shortAddress(addr: string): string {
  return truncateHash(addr, 6, 4);
}

// Parse a hex-encoded block number
export function hexToNumber(hex: string): number {
  return parseInt(hex, 16);
}
