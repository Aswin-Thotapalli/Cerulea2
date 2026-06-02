/**
 * Convert raw @polkadot/api types into the shapes stored in our SQLite DB.
 * This is the heart of the indexer — it decodes SCALE-encoded block data
 * into human-readable records.
 */
import type { ApiPromise } from '@polkadot/api';
import type { SignedBlock, EventRecord } from '@polkadot/types/interfaces';
import type { Vec } from '@polkadot/types';

// ─────────────────────────────────────────────────────────────────────────────
// Block
// ─────────────────────────────────────────────────────────────────────────────
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
  signedBlock: SignedBlock,
  hash: string,
  allEvents: Vec<EventRecord>,
  author: string | null,
  prevTimestampMs: number | null,
): ParsedBlock {
  const header = signedBlock.block.header;
  const number = header.number.toNumber();

  // Timestamp is always the first inherent: timestamp.set(moment)
  let timestampMs = Date.now();
  for (const ext of signedBlock.block.extrinsics) {
    if (ext.method.section === 'timestamp' && ext.method.method === 'set') {
      timestampMs = Number(ext.method.args[0].toString());
      break;
    }
  }

  // Count signed extrinsics (inherents are unsigned)
  const txCount = signedBlock.block.extrinsics.filter(e => e.isSigned).length;

  // Block time: difference from previous block
  const blockTimeMs = prevTimestampMs != null
    ? Math.max(0, timestampMs - prevTimestampMs)
    : null;

  // Encode size (approximate)
  let sizeBytes: number | null = null;
  try {
    sizeBytes = signedBlock.encodedLength;
  } catch {}

  // Block weight from System.BlockWeight storage event if present
  let weight: string | null = null;
  try {
    const weightEvent = allEvents.find(({ event }) =>
      event.section === 'system' && event.method === 'ExtrinsicSuccess'
    );
    if (weightEvent) {
      weight = (weightEvent.event.data[0] as any)?.weight?.toString() ?? null;
    }
  } catch {}

  return {
    number,
    hash,
    parentHash:     header.parentHash.toHex(),
    stateRoot:      header.stateRoot.toHex(),
    extrinsicsRoot: header.extrinsicsRoot.toHex(),
    timestampMs,
    author,
    txCount,
    blockTimeMs,
    weight,
    sizeBytes,
    eventsCount: allEvents.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Extrinsic
// ─────────────────────────────────────────────────────────────────────────────
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
  api: ApiPromise,
  extrinsic: SignedBlock['block']['extrinsics'][number],
  idx: number,
  blockNumber: number,
  blockHash: string,
  timestampMs: number,
  allEvents: Vec<EventRecord>,
): ParsedExtrinsic {
  const section = extrinsic.method.section;
  const method  = extrinsic.method.method;

  // Filter events belonging to this extrinsic
  const txEvents = allEvents.filter(({ phase }) =>
    phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(idx)
  );

  // Status
  let status: 'success' | 'failed' | 'pending' = 'pending';
  for (const { event } of txEvents) {
    if (api.events.system.ExtrinsicSuccess.is(event)) { status = 'success'; break; }
    if (api.events.system.ExtrinsicFailed.is(event))  { status = 'failed';  break; }
  }

  // Fee from TransactionPayment.TransactionFeePaid
  let fee = '0';
  try {
    const feeEv = txEvents.find(({ event }) =>
      event.section === 'transactionPayment' && event.method === 'TransactionFeePaid'
    );
    if (feeEv) fee = feeEv.event.data[1]?.toString() ?? '0';
  } catch {}

  // From / nonce
  let fromAddress: string | null = null;
  let nonce: number | null = null;
  if (extrinsic.isSigned) {
    fromAddress = extrinsic.signer.toString();
    nonce = extrinsic.nonce.toNumber();
  }

  // To / value — depends on the call
  let toAddress: string | null = null;
  let value = '0';
  extractTransferFields(section, method, extrinsic.method.args, (to, val) => {
    toAddress = to;
    value = val;
  });

  // Detect contract instantiation
  if (section === 'contracts' && method === 'instantiate') {
    // No specific "to", but the contract address comes from an event
    const instantiateEv = txEvents.find(({ event }) =>
      event.section === 'contracts' && event.method === 'Instantiated'
    );
    if (instantiateEv) {
      toAddress = instantiateEv.event.data[1]?.toString() ?? null; // contract address
    }
  }

  // Decoded call as JSON
  let decodedCall: string | null = null;
  try {
    decodedCall = JSON.stringify({
      section,
      method,
      args: extrinsic.method.toJSON(),
    });
  } catch {}

  // Events as JSON
  let eventsJson: string | null = null;
  try {
    eventsJson = JSON.stringify(
      txEvents.map(({ event, phase }) => ({
        index:   txEvents.indexOf({ event, phase } as any),
        section: event.section,
        method:  event.method,
        data:    event.data.toJSON(),
        phase:   phase.toString(),
      }))
    );
  } catch {}

  // Raw call data (hex)
  let callData: string | null = null;
  try {
    callData = extrinsic.method.toHex();
  } catch {}

  return {
    hash:         extrinsic.hash.toHex(),
    blockNumber,
    blockHash,
    indexInBlock: idx,
    timestampMs,
    fromAddress,
    toAddress,
    value,
    fee,
    status,
    section,
    method,
    nonce,
    callData,
    decodedCall,
    eventsJson,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Transfer field extraction (handles common transfer calls)
// ─────────────────────────────────────────────────────────────────────────────
function extractTransferFields(
  section: string,
  method: string,
  args: any,
  cb: (to: string, value: string) => void
): void {
  try {
    // balances.transfer / balances.transferKeepAlive / balances.transferAll
    if (section === 'balances' && (method === 'transfer' || method === 'transferKeepAlive')) {
      cb(args[0].toString(), args[1].toString());
      return;
    }
    // balances.transferAll
    if (section === 'balances' && method === 'transferAll') {
      cb(args[0].toString(), '0');
      return;
    }
    // evm.call / evm.create
    if (section === 'evm' && method === 'call') {
      cb(args[1].toString(), args[3].toString());
      return;
    }
  } catch {
    // Ignore parse errors — fields stay as defaults
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Contract detection from events
// ─────────────────────────────────────────────────────────────────────────────
export interface DetectedContract {
  address:  string;
  deployer: string | null;
  txHash:   string;
  block:    number;
}

export function detectContracts(
  signedBlock: SignedBlock,
  allEvents: Vec<EventRecord>,
  blockNumber: number,
): DetectedContract[] {
  const contracts: DetectedContract[] = [];

  for (const [idx, ext] of signedBlock.block.extrinsics.entries()) {
    const txEvents = allEvents.filter(({ phase }) =>
      phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(idx)
    );

    // ink! / pallet-contracts
    for (const { event } of txEvents) {
      if (event.section === 'contracts' && event.method === 'Instantiated') {
        contracts.push({
          address:  event.data[1].toString(),
          deployer: event.data[0].toString(),
          txHash:   ext.hash.toHex(),
          block:    blockNumber,
        });
      }
      // EVM / Frontier
      if (event.section === 'evm' && event.method === 'Created') {
        contracts.push({
          address:  event.data[0].toString(),
          deployer: ext.isSigned ? ext.signer.toString() : null,
          txHash:   ext.hash.toHex(),
          block:    blockNumber,
        });
      }
    }
  }

  return contracts;
}
