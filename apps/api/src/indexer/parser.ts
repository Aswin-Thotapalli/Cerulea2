/**
 * Parse raw block and extrinsic data from Substrate JSON-RPC responses
 * into flat records suitable for database storage.
 * No third-party blockchain libraries.
 */
import { createHash } from 'crypto';
import { decodeCompact, hexToSS58, blake2b256 } from './scale';
import type { SubstrateBlock } from './rpc-client';

// ── Block ─────────────────────────────────────────────────────────────────────

export interface ParsedBlock {
  number:         number;
  hash:           string;
  parentHash:     string;
  stateRoot:      string;
  extrinsicsRoot: string;
  timestampMs:    number;
  author:         string | null;
  txCount:        number;
  blockTimeMs:    number | null;
  weight:         string | null;
  sizeBytes:      number | null;
  eventsCount:    number;
}

export function parseBlock(
  hash:            string,
  raw:             SubstrateBlock,
  author:          string | null,
  prevTimestampMs: number | null,
): ParsedBlock {
  const header = raw.block.header;
  const number = parseInt(header.number, 16);
  const extrinsics = raw.block.extrinsics;

  // Timestamp is always in the first unsigned (inherent) extrinsic
  let timestampMs = Date.now();
  for (const hex of extrinsics) {
    const ts = tryExtractTimestamp(hex);
    if (ts !== null) { timestampMs = ts; break; }
  }

  const txCount = extrinsics.filter(isSignedExtrinsic).length;
  const blockTimeMs = prevTimestampMs != null ? Math.max(0, timestampMs - prevTimestampMs) : null;

  let sizeBytes: number | null = null;
  try { sizeBytes = extrinsics.reduce((s, h) => s + Math.floor((h.length - 2) / 2), 0); } catch {}

  return {
    number, hash,
    parentHash:     header.parentHash,
    stateRoot:      header.stateRoot,
    extrinsicsRoot: header.extrinsicsRoot,
    timestampMs, author, txCount, blockTimeMs,
    weight:      null,
    sizeBytes,
    eventsCount: 0,
  };
}

// ── Extrinsic ─────────────────────────────────────────────────────────────────

export interface ParsedExtrinsic {
  hash:         string;
  blockNumber:  number;
  blockHash:    string;
  indexInBlock: number;
  timestampMs:  number;
  fromAddress:  string | null;
  toAddress:    string | null;
  value:        string;
  fee:          string;
  status:       'success' | 'failed' | 'pending';
  section:      string;
  method:       string;
  nonce:        number | null;
  callData:     string | null;
  decodedCall:  string | null;
  eventsJson:   string | null;
}

export function parseExtrinsic(
  extHex:      string,
  idx:         number,
  blockNumber: number,
  blockHash:   string,
  timestampMs: number,
): ParsedExtrinsic {
  const bytes = Buffer.from(extHex.startsWith('0x') ? extHex.slice(2) : extHex, 'hex');
  const hash = '0x' + blake2b256(bytes).toString('hex');

  const blank = (): ParsedExtrinsic => ({
    hash, blockNumber, blockHash, indexInBlock: idx, timestampMs,
    fromAddress: null, toAddress: null, value: '0', fee: '0',
    status: 'pending', section: 'unknown', method: 'unknown',
    nonce: null, callData: extHex, decodedCall: null, eventsJson: null,
  });

  try {
    let pos = 0;

    // Skip compact length prefix
    const { bytesRead: lenB } = decodeCompact(bytes, pos);
    pos += lenB;
    if (pos >= bytes.length) return blank();

    const version  = bytes[pos++];
    const isSigned = (version & 0x80) !== 0;

    let fromAddress: string | null = null;
    let nonce: number | null = null;

    if (isSigned) {
      // MultiAddress: 0x00 = AccountId32, 0x01 = AccountIndex, 0xff = raw
      const addrType = bytes[pos++];
      if (addrType === 0x00) {
        fromAddress = hexToSS58(bytes.slice(pos, pos + 32).toString('hex'));
        pos += 32;
      } else {
        pos += 32; // best-effort skip
      }

      // Signature: ed25519/sr25519 = 64 bytes, ecdsa = 65 bytes
      const sigType = bytes[pos++];
      pos += sigType === 0x02 ? 65 : 64;

      // Era: 0x00 = immortal, else 2 bytes
      const era = bytes[pos++];
      if (era !== 0x00) pos++;

      // Nonce (compact u64)
      const nr = decodeCompact(bytes, pos);
      nonce = Number(nr.value);
      pos += nr.bytesRead;

      // Tip (compact u128) — skip
      pos += decodeCompact(bytes, pos).bytesRead;
    }

    if (pos + 2 > bytes.length) return blank();

    const moduleIdx = bytes[pos++];
    const callIdx   = bytes[pos++];

    // Extract recipient/value for transfer-like calls
    let toAddress: string | null = null;
    let value = '0';
    try {
      const r = tryExtractRecipientAmount(bytes, pos);
      if (r.to)     toAddress = r.to;
      if (r.amount) value     = r.amount;
    } catch {}

    return {
      hash, blockNumber, blockHash, indexInBlock: idx, timestampMs,
      fromAddress, toAddress, value, fee: '0',
      status: 'pending',
      section: `pallet_${moduleIdx}`,
      method:  `call_${callIdx}`,
      nonce,
      callData:    extHex,
      decodedCall: JSON.stringify({ moduleIndex: moduleIdx, callIndex: callIdx }),
      eventsJson:  null,
    };
  } catch {
    return blank();
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isSignedExtrinsic(hex: string): boolean {
  try {
    const buf = Buffer.from(hex.startsWith('0x') ? hex.slice(2) : hex, 'hex');
    const { bytesRead } = decodeCompact(buf, 0);
    return buf.length > bytesRead && (buf[bytesRead] & 0x80) !== 0;
  } catch { return false; }
}

/** Extract timestamp from timestamp.set inherent (unsigned, module 3 call 0 by default). */
function tryExtractTimestamp(hex: string): number | null {
  try {
    const buf = Buffer.from(hex.startsWith('0x') ? hex.slice(2) : hex, 'hex');
    let pos = decodeCompact(buf, 0).bytesRead;
    const version = buf[pos++];
    if (version & 0x80) return null; // signed extrinsic — skip
    pos += 2; // skip module + call index
    const { value } = decodeCompact(buf, pos);
    const ts = Number(value);
    // Sanity: reasonable UTC ms timestamp (2020–2100)
    if (ts > 1_577_836_800_000 && ts < 4_102_444_800_000) return ts;
    return null;
  } catch { return null; }
}

/** Try to extract a recipient address and amount from the call args. */
function tryExtractRecipientAmount(
  bytes: Buffer, argsOffset: number,
): { to: string | null; amount: string | null } {
  // Heuristic: check for MultiAddress::Id (0x00 prefix + 32-byte AccountId) followed by compact amount.
  // This matches balances.transfer / balances.transferKeepAlive args on most Substrate runtimes.
  const pos = argsOffset;
  if (pos < bytes.length && bytes[pos] === 0x00 && pos + 33 <= bytes.length) {
    const to = hexToSS58(bytes.slice(pos + 1, pos + 33).toString('hex'));
    const amtPos = pos + 33;
    if (amtPos < bytes.length) {
      const { value } = decodeCompact(bytes, amtPos);
      return { to, amount: value.toString() };
    }
    return { to, amount: null };
  }
  return { to: null, amount: null };
}
