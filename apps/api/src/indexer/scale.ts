/**
 * Minimal SCALE codec and cryptographic utilities needed by the indexer.
 * Pure TypeScript — no third-party blockchain libraries.
 */
import { createHash } from 'crypto';

// ── Blake2b ───────────────────────────────────────────────────────────────────

export function blake2b256(data: Buffer): Buffer {
  try {
    // Node.js 20+ supports outputLength option for blake2b
    return (createHash as any)('blake2b', { outputLength: 32 }).update(data).digest();
  } catch {
    // Older Node: truncate 512-bit output to 256 bits
    return createHash('blake2b512').update(data).digest().slice(0, 32);
  }
}

function blake2b128(data: Buffer): Buffer {
  return createHash('blake2b512').update(data).digest().slice(0, 16);
}

// ── xxHash-64 (pure TypeScript) ───────────────────────────────────────────────
// Used by Substrate to build storage keys (twox128).

const P1 = 11400714785074694791n;
const P2 = 14029467366897019727n;
const P3 =  1609587929392839161n;
const P4 =  9650029242287828579n;
const P5 =  2870177450012600261n;

const u64   = (v: bigint) => BigInt.asUintN(64, v);
const rotl  = (v: bigint, r: bigint) => u64((v << r) | (v >> (64n - r)));
const xRnd  = (acc: bigint, inp: bigint) => u64(rotl(u64(acc + u64(inp * P2)), 31n) * P1);
const xMrg  = (h: bigint, a: bigint)    => u64(u64(h ^ xRnd(0n, a)) * P1 + P4);

function xxhash64(buf: Buffer, seed: bigint): Buffer {
  const len = buf.length;
  let h64: bigint;
  let pos = 0;

  if (len >= 32) {
    let v1 = u64(seed + P1 + P2), v2 = u64(seed + P2);
    let v3 = u64(seed),           v4 = u64(seed - P1);
    const limit = len - 32;
    do {
      v1 = xRnd(v1, buf.readBigUInt64LE(pos)); pos += 8;
      v2 = xRnd(v2, buf.readBigUInt64LE(pos)); pos += 8;
      v3 = xRnd(v3, buf.readBigUInt64LE(pos)); pos += 8;
      v4 = xRnd(v4, buf.readBigUInt64LE(pos)); pos += 8;
    } while (pos <= limit);
    h64 = u64(rotl(v1, 1n) + rotl(v2, 7n) + rotl(v3, 12n) + rotl(v4, 18n));
    h64 = xMrg(xMrg(xMrg(xMrg(h64, v1), v2), v3), v4);
  } else {
    h64 = u64(seed + P5);
  }

  h64 = u64(h64 + BigInt(len));
  while (pos + 8 <= len) {
    const k1 = u64(xRnd(0n, buf.readBigUInt64LE(pos)));
    h64 = u64(u64(rotl(h64 ^ k1, 27n)) * P1 + P4); pos += 8;
  }
  if (pos + 4 <= len) {
    h64 = u64(u64(rotl(h64 ^ u64(BigInt(buf.readUInt32LE(pos)) * P1), 23n)) * P2 + P3);
    pos += 4;
  }
  while (pos < len) {
    h64 = u64(u64(rotl(h64 ^ u64(BigInt(buf[pos]) * P5), 11n)) * P1);
    pos++;
  }
  h64 = u64(u64(h64 ^ (h64 >> 33n)) * P2);
  h64 = u64(u64(h64 ^ (h64 >> 29n)) * P3);
  h64 = u64(h64 ^ (h64 >> 32n));

  const out = Buffer.alloc(8);
  out.writeBigUInt64LE(h64);
  return out;
}

/** twox128(data) = xxhash64(data, seed=0) ++ xxhash64(data, seed=1) */
export function twox128(data: string | Buffer): Buffer {
  const buf = typeof data === 'string' ? Buffer.from(data) : data;
  return Buffer.concat([xxhash64(buf, 0n), xxhash64(buf, 1n)]);
}

/** blake2_128_concat(data) = blake2b_128(data) ++ data */
function blake2128Concat(data: Buffer): Buffer {
  return Buffer.concat([blake2b128(data), data]);
}

/** Storage key for System.Account(accountId32) */
export function systemAccountKey(accountId: Buffer): string {
  const key = Buffer.concat([
    twox128('System'),
    twox128('Account'),
    blake2128Concat(accountId),
  ]);
  return '0x' + key.toString('hex');
}

/** Storage key for Session.Validators (no map key) */
export function sessionValidatorsKey(): string {
  return '0x' + Buffer.concat([twox128('Session'), twox128('Validators')]).toString('hex');
}

// ── SCALE decoders ────────────────────────────────────────────────────────────

export function decodeCompact(buf: Buffer, offset: number): { value: bigint; bytesRead: number } {
  const b = buf[offset];
  const m = b & 0x03;
  if (m === 0) return { value: BigInt(b >> 2), bytesRead: 1 };
  if (m === 1) return { value: BigInt(((buf[offset + 1] << 8) | b) >> 2), bytesRead: 2 };
  if (m === 2) return { value: BigInt(buf.readUInt32LE(offset) >>> 2), bytesRead: 4 };
  // Big-integer mode
  const n = (b >> 2) + 4;
  let v = 0n;
  for (let i = 0; i < n; i++) v += BigInt(buf[offset + 1 + i]) << BigInt(8 * i);
  return { value: v, bytesRead: 1 + n };
}

export function decodeU32(buf: Buffer, offset: number): number {
  return buf.readUInt32LE(offset);
}

export function decodeU128(buf: Buffer, offset: number): bigint {
  let v = 0n;
  for (let i = 0; i < 16; i++) v += BigInt(buf[offset + i]) << BigInt(8 * i);
  return v;
}

/**
 * Decode System.Account storage value.
 * Layout: nonce(u32) + consumers(u32) + providers(u32) + sufficients(u32) + AccountData
 * AccountData: free(u128) + reserved(u128) + misc_frozen(u128) + fee_frozen(u128)
 */
export function decodeAccountInfo(hex: string): { nonce: number; free: bigint; reserved: bigint } {
  const buf = Buffer.from(hex.startsWith('0x') ? hex.slice(2) : hex, 'hex');
  if (buf.length < 80) return { nonce: 0, free: 0n, reserved: 0n };
  return {
    nonce:    decodeU32(buf, 0),
    free:     decodeU128(buf, 16),  // offset 4+4+4+4 = 16
    reserved: decodeU128(buf, 32),
  };
}

/**
 * Decode Vec<AccountId32> from storage (used for session.validators).
 * Returns array of raw 32-byte buffers.
 */
export function decodeVecAccountId32(hex: string): Buffer[] {
  const buf = Buffer.from(hex.startsWith('0x') ? hex.slice(2) : hex, 'hex');
  const { value: count, bytesRead } = decodeCompact(buf, 0);
  const n = Number(count);
  const result: Buffer[] = [];
  let pos = bytesRead;
  for (let i = 0; i < n && pos + 32 <= buf.length; i++) {
    result.push(buf.slice(pos, pos + 32));
    pos += 32;
  }
  return result;
}

// ── SS58 address encoding ─────────────────────────────────────────────────────
// Reference: https://docs.substrate.io/reference/address-formats/

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(buf: Buffer): string {
  let n = 0n;
  for (const b of buf) n = (n << 8n) + BigInt(b);
  let s = '';
  while (n > 0n) { s = BASE58[Number(n % 58n)] + s; n /= 58n; }
  for (const b of buf) { if (b !== 0) break; s = '1' + s; }
  return s;
}

/**
 * Encode a 32-byte account ID to SS58 format.
 * SS58_FORMAT env var sets the network prefix (default 42 = generic Substrate).
 */
export function ss58Encode(accountId: Buffer): string {
  const prefix = parseInt(process.env.SS58_FORMAT ?? '42', 10);
  let pBytes: Buffer;
  if (prefix < 64) {
    pBytes = Buffer.from([prefix]);
  } else {
    pBytes = Buffer.from([
      ((prefix & 0xfc) >> 2) | 0x40,
      (prefix >> 8) | ((prefix & 0x03) << 6),
    ]);
  }
  const payload = Buffer.concat([pBytes, accountId]);
  const checksum = createHash('blake2b512')
    .update(Buffer.from('SS58PRE'))
    .update(payload)
    .digest()
    .slice(0, 2);
  return base58Encode(Buffer.concat([payload, checksum]));
}

/** Convert a 0x-prefixed hex AccountId32 to SS58 address. */
export function hexToSS58(hex: string): string {
  const buf = Buffer.from(hex.startsWith('0x') ? hex.slice(2) : hex, 'hex');
  return buf.length === 32 ? ss58Encode(buf) : hex;
}
