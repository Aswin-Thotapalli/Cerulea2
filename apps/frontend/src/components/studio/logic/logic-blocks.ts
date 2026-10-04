// apps/frontend/src/components/studio/logic/logic-blocks.ts
// The 52 blocks of the logic canvas and what each one writes into the Blueprint.
// A block is one step of a flow a person draws. Every block stands for one
// Blueprint primitive: an effect an action carries out (add, read, change or
// remove a record, announce an event), a rule the action checks first, a
// compensation that undoes work on failure, or a step that only shapes the
// order. A drawing compiles into one action with its rules and its events, and
// the Access Manifest of the action follows from the effects.
// The block ids come from the seed file, so the palette holds exactly the 52
// blocks the catalogue names. The words a person reads are Cerulea words.
// Without this table a drawing would be a picture with no meaning behind it.

import blocksSeed from '@/data/blocks.seed.json';

import { readFormula, writeFormula } from '@/lib/blueprint/formula';
import { toIdentifier, toReadable } from '@/lib/blueprint/compose';
import type {
  Action,
  Blueprint,
  Effect,
  EventDefinition,
  Expression,
  KeyExpression,
  Rule,
  TransactionClass,
} from '@/lib/blueprint/types';
import type { Drawing, DrawingEdge, DrawingNode } from '@/components/studio/steps/step2-types';

/** The seed shape, as src/data/blocks.seed.json carries it. */
type SeedBlock = {
  id: string;
  title: string;
  track: 'any' | 'dapp' | 'blockchain';
  category: string;
  description: string;
  ports: { in: string[]; out: string[] };
};

const SEED_BLOCKS = (blocksSeed as unknown as { blocks: SeedBlock[] }).blocks;

/** The Blueprint primitive one block writes. */
export type Primitive =
  | 'start'
  | 'end'
  | 'rule'
  | 'insert'
  | 'read'
  | 'update'
  | 'delete'
  | 'emit'
  | 'compensate'
  | 'event'
  | 'order';

/** The families the palette groups blocks under, in Cerulea words. */
export type BlockFamily = 'Order' | 'Records' | 'Checks' | 'Messages' | 'Value' | 'Network';

export const FAMILY_ORDER: BlockFamily[] = [
  'Order',
  'Records',
  'Checks',
  'Messages',
  'Value',
  'Network',
];

export const FAMILY_COLORS: Record<BlockFamily, string> = {
  Order: '#3B82F6',
  Records: '#10B981',
  Checks: '#F59E0B',
  Messages: '#8B5CF6',
  Value: '#EEC000',
  Network: '#004AAD',
};

export const FAMILY_MEANING: Record<BlockFamily, string> = {
  Order: 'Blocks that shape the order of the work and write nothing on their own.',
  Records: 'Blocks that add, read, change or remove a record. Each one enters the Access Manifest.',
  Checks: 'Blocks that hold the action until a condition holds. Each one becomes a rule.',
  Messages: 'Blocks that announce an event. The Integrations step decides where the event goes.',
  Value: 'Blocks that move value. Each one raises the action to the financial class.',
  Network: 'Blocks that change the network itself. Each one raises the action to a higher class.',
};

/** What one block means in Cerulea terms. */
export type BlockMeaning = {
  /** The name a person reads on the palette and on the canvas. */
  title: string;
  family: BlockFamily;
  primitive: Primitive;
  /** One sentence stating what the block does. */
  does: string;
  /** One sentence stating what breaks without it. */
  breaks: string;
  /** The class the block raises the action to, when it moves value or changes the network. */
  raises?: TransactionClass;
  /** The settings a person gives this block. */
  settings: BlockSetting[];
  /** The ports, in the order the canvas draws them. */
  ports: { in: string[]; out: string[] };
};

export type BlockSetting = 'collection' | 'formula' | 'event' | 'note';

/** The ports every block takes from the seed, with the port names in plain words. */
export const PORT_WORDS: Record<string, string> = {
  next: 'next',
  in: 'in',
  true: 'holds',
  false: 'fails',
  case1: 'first case',
  case2: 'second case',
  default: 'otherwise',
  item: 'each item',
  done: 'done',
  branch1: 'first branch',
  branch2: 'second branch',
  joined: 'joined',
  error: 'failed',
  in1: 'first',
  in2: 'second',
  in3: 'third',
  success: 'succeeded',
  failed: 'failed',
  recovered: 'recovered',
  valid: 'passes',
  invalid: 'fails',
  rows: 'records',
  hit: 'held',
  miss: 'absent',
  ok: 'done',
  connected: 'identified',
  cancel: 'declined',
  signed: 'signed',
  result: 'value',
  txHash: 'recorded',
  listed: 'listed',
  filled: 'bought',
  opened: 'opened',
  bid: 'placed',
  swap: 'exchanged',
  price: 'price',
};

const MEANINGS: Record<string, Omit<BlockMeaning, 'ports'>> = {
  /* Order ---------------------------------------------------------------- */
  start: {
    title: 'Start',
    family: 'Order',
    primitive: 'start',
    does: 'Marks where the action begins when a person or a program asks for it.',
    breaks: 'Without a start Cerulea has no first block to run.',
    settings: [],
  },
  end: {
    title: 'End',
    family: 'Order',
    primitive: 'end',
    does: 'Marks where the action finishes and commits.',
    breaks: 'Without an end the flow has no agreed finish.',
    settings: [],
  },
  foreach: {
    title: 'For each item',
    family: 'Order',
    primitive: 'order',
    does: 'Runs the blocks that follow once per item of a list, bounded by the length of the list.',
    breaks: 'Without it the following blocks run once for the whole list.',
    settings: ['note'],
  },
  parallel: {
    title: 'Side by side',
    family: 'Order',
    primitive: 'order',
    does: 'Names two branches that touch different records. The Execution Engine already runs independent domains in parallel from the Access Manifest.',
    breaks: 'Without it the branches still run in parallel when their records differ. The block makes the intent visible.',
    settings: ['note'],
  },
  join: {
    title: 'Wait for branches',
    family: 'Order',
    primitive: 'order',
    does: 'Waits for every incoming branch before the flow goes on.',
    breaks: 'Without it the flow goes on as soon as one branch finishes.',
    settings: ['note'],
  },
  delay: {
    title: 'Wait',
    family: 'Order',
    primitive: 'order',
    does: 'Holds the flow for a period. A wait that outlives the action belongs to a workflow deadline on the Workflows tab.',
    breaks: 'Without it the next block runs at once.',
    settings: ['note'],
  },
  retry: {
    title: 'Try again on failure',
    family: 'Order',
    primitive: 'compensate',
    does: 'Runs the blocks that follow, and on failure runs the blocks on the failed line to undo the work.',
    breaks: 'Without it a failed step leaves half the work in place.',
    settings: ['note'],
  },
  throttle: {
    title: 'Limit the rate',
    family: 'Order',
    primitive: 'order',
    does: 'States how often this action may run. The public endpoint carries the limit.',
    breaks: 'Without it the action runs as often as it is asked.',
    settings: ['note'],
  },
  debounce: {
    title: 'Settle bursts',
    family: 'Order',
    primitive: 'order',
    does: 'Runs the action once for a burst of asks that arrive together.',
    breaks: 'Without it every ask in the burst runs the action.',
    settings: ['note'],
  },
  'error-handler': {
    title: 'On failure',
    family: 'Order',
    primitive: 'compensate',
    does: 'Catches a failure in the blocks that follow and runs the blocks on the failed line instead.',
    breaks: 'Without it a failure stops the action with nothing undone.',
    settings: ['note'],
  },
  /* Checks ---------------------------------------------------------------- */
  condition: {
    title: 'Check a condition',
    family: 'Checks',
    primitive: 'rule',
    does: 'Holds the action until the formula holds. The formula becomes a rule the action checks first.',
    breaks: 'Without it the action accepts every value it is given.',
    settings: ['collection', 'formula'],
  },
  switch: {
    title: 'Choose a path',
    family: 'Checks',
    primitive: 'rule',
    does: 'Sends the flow down one path by a formula. Each path carries its own condition as a rule.',
    breaks: 'Without it every path runs.',
    settings: ['collection', 'formula'],
  },
  validate: {
    title: 'Check the record',
    family: 'Checks',
    primitive: 'rule',
    does: 'Checks the record against a formula before anything is written.',
    breaks: 'Without it a record with a wrong value reaches the chain.',
    settings: ['collection', 'formula'],
  },
  transform: {
    title: 'Compute a value',
    family: 'Checks',
    primitive: 'order',
    does: 'Works out a value from the record. The next block that writes a record writes this value.',
    breaks: 'Without it the next block writes the record as it arrived.',
    settings: ['collection', 'formula'],
  },
  /* Records --------------------------------------------------------------- */
  'db-create': {
    title: 'Add a record',
    family: 'Records',
    primitive: 'insert',
    does: 'Adds one record to a collection. The action writes that collection.',
    breaks: 'Without it nothing new is kept.',
    settings: ['collection'],
  },
  'db-read': {
    title: 'Read records',
    family: 'Records',
    primitive: 'read',
    does: 'Reads records from a collection. The action reads that collection.',
    breaks: 'Without it the action works without the records it needs.',
    settings: ['collection'],
  },
  'db-update': {
    title: 'Change a record',
    family: 'Records',
    primitive: 'update',
    does: 'Changes one record in a collection. The action writes that collection.',
    breaks: 'Without it a record stays as it was.',
    settings: ['collection'],
  },
  'db-delete': {
    title: 'Remove a record',
    family: 'Records',
    primitive: 'delete',
    does: 'Removes one record, subject to the retention period of the collection.',
    breaks: 'Without it a record stays for its whole retention period.',
    settings: ['collection'],
  },
  'cache-get': {
    title: 'Read a held value',
    family: 'Records',
    primitive: 'read',
    does: 'Reads a value Cerulea holds for quick reach. The action reads that collection.',
    breaks: 'Without it the value is read from the full record every time.',
    settings: ['collection'],
  },
  'cache-set': {
    title: 'Hold a value',
    family: 'Records',
    primitive: 'update',
    does: 'Keeps a value for quick reach. The action writes that collection.',
    breaks: 'Without it every reader goes back to the full record.',
    settings: ['collection'],
  },
  'secrets-get': {
    title: 'Read a sealed value',
    family: 'Records',
    primitive: 'read',
    does: 'Reads a value from a sealed collection. A reader needs the key as well as the permission.',
    breaks: 'Without it the action cannot reach a sealed value.',
    settings: ['collection'],
  },
  'explorer-index': {
    title: 'Read a block for the Explorer',
    family: 'Records',
    primitive: 'read',
    does: 'Reads the records of a block so the Cerulea Explorer lists them.',
    breaks: 'Without it the Explorer shows the block without its records.',
    settings: ['collection'],
  },
  'ipfs-upload': {
    title: 'Keep a file outside',
    family: 'Records',
    primitive: 'insert',
    does: 'Keeps a file in a system Cerulea names and holds the reference on the chain.',
    breaks: 'Without it the file has no place and the chain holds no reference to it.',
    settings: ['collection'],
  },
  'contract-read': {
    title: 'Read through a contract',
    family: 'Records',
    primitive: 'read',
    does: 'Reads a value a contract on the contract substrate holds.',
    breaks: 'Without it the action works without the value the contract holds.',
    settings: ['collection'],
  },
  'contract-write': {
    title: 'Write through a contract',
    family: 'Value',
    primitive: 'update',
    does: 'Changes a value through a contract on the contract substrate.',
    breaks: 'Without it the contract keeps its value.',
    raises: 'Financial',
    settings: ['collection'],
  },
  'poi-submit': {
    title: 'Record a Cerulea Intelligence result',
    family: 'Records',
    primitive: 'insert',
    does: 'Keeps the result Cerulea Intelligence produced, with its fingerprint.',
    breaks: 'Without it the result is lost once the answer is shown.',
    settings: ['collection'],
  },
  /* Messages -------------------------------------------------------------- */
  'webhook-receive': {
    title: 'Start from an outside message',
    family: 'Messages',
    primitive: 'event',
    does: 'Names the event an outside system raises to start this action.',
    breaks: 'Without it an outside system has no way to start the action.',
    settings: ['event'],
  },
  'http-request': {
    title: 'Call an outside service',
    family: 'Messages',
    primitive: 'emit',
    does: 'Announces an event the Integrations step carries to an outside service.',
    breaks: 'Without it the outside service never hears of the change.',
    settings: ['event'],
  },
  'email-send': {
    title: 'Send an email',
    family: 'Messages',
    primitive: 'emit',
    does: 'Announces an event the email integration carries to a person.',
    breaks: 'Without it nobody is told by email.',
    settings: ['event'],
  },
  'sms-send': {
    title: 'Send a text message',
    family: 'Messages',
    primitive: 'emit',
    does: 'Announces an event the text message integration carries to a person.',
    breaks: 'Without it nobody is told by text message.',
    settings: ['event'],
  },
  'sign-message': {
    title: 'Record a signature',
    family: 'Messages',
    primitive: 'emit',
    does: 'Announces that the caller signed the record, so the signature is kept with the event.',
    breaks: 'Without it nothing proves who agreed.',
    settings: ['event'],
  },
  'wallet-connect': {
    title: 'Identify the person',
    family: 'Messages',
    primitive: 'order',
    does: 'Reads who is asking. Every action already knows its caller, so this block makes the step visible.',
    breaks: 'Without it the flow still knows the caller. Nothing breaks.',
    settings: ['note'],
  },
  'bridge-transfer': {
    title: 'Carry a record to another network',
    family: 'Value',
    primitive: 'emit',
    does: 'Announces an event the bridge integration carries to the other network. No record moves on its own.',
    breaks: 'Without it the other network never hears of the record.',
    raises: 'Financial',
    settings: ['event'],
  },
  /* Value ----------------------------------------------------------------- */
  'stripe-charge': {
    title: 'Take a payment',
    family: 'Value',
    primitive: 'emit',
    does: 'Announces a payment the payment integration collects in fiat.',
    breaks: 'Without it no payment is asked for.',
    raises: 'Financial',
    settings: ['event'],
  },
  'erc20-transfer': {
    title: 'Transfer value',
    family: 'Value',
    primitive: 'update',
    does: 'Moves value from one account record to another.',
    breaks: 'Without it value stays where it is.',
    raises: 'Financial',
    settings: ['collection'],
  },
  'erc20-approve': {
    title: 'Allow spending',
    family: 'Value',
    primitive: 'update',
    does: 'Records that one account may spend on behalf of another.',
    breaks: 'Without it nobody spends for another account.',
    raises: 'Financial',
    settings: ['collection'],
  },
  'erc721-mint': {
    title: 'Issue a certificate',
    family: 'Value',
    primitive: 'insert',
    does: 'Adds one certificate record that names its holder.',
    breaks: 'Without it nothing proves the holder owns the item.',
    raises: 'Financial',
    settings: ['collection'],
  },
  'erc1155-mint': {
    title: 'Issue items',
    family: 'Value',
    primitive: 'insert',
    does: 'Adds a batch of item records that name their holder.',
    breaks: 'Without it the items have no holder on record.',
    raises: 'Financial',
    settings: ['collection'],
  },
  'market-create': {
    title: 'Create a listing',
    family: 'Value',
    primitive: 'insert',
    does: 'Adds a listing record offering an item at a price.',
    breaks: 'Without it nothing is offered for sale.',
    raises: 'Financial',
    settings: ['collection'],
  },
  'market-fill': {
    title: 'Buy a listing',
    family: 'Value',
    primitive: 'update',
    does: 'Marks a listing as bought and moves the item to the buyer.',
    breaks: 'Without it a listing stays open for ever.',
    raises: 'Financial',
    settings: ['collection'],
  },
  'auction-open': {
    title: 'Open an auction',
    family: 'Value',
    primitive: 'insert',
    does: 'Adds an auction record with its reserve and its closing time.',
    breaks: 'Without it nobody may bid.',
    raises: 'Financial',
    settings: ['collection'],
  },
  'auction-bid': {
    title: 'Place a bid',
    family: 'Value',
    primitive: 'insert',
    does: 'Adds a bid record against an open auction.',
    breaks: 'Without it an auction closes with no bid.',
    raises: 'Financial',
    settings: ['collection'],
  },
  'amm-swap': {
    title: 'Exchange value',
    family: 'Value',
    primitive: 'update',
    does: 'Exchanges one kind of value for another against a pool record.',
    breaks: 'Without it value stays in its first kind.',
    raises: 'Financial',
    settings: ['collection'],
  },
  'oracle-get-price': {
    title: 'Read a price feed',
    family: 'Records',
    primitive: 'read',
    does: 'Reads the latest price a feed delivered. The Integrations step names the feed.',
    breaks: 'Without it the action works with no price.',
    settings: ['collection'],
  },
  'staking-reward': {
    title: 'Settle a validator payment',
    family: 'Value',
    primitive: 'update',
    does: 'Records a fiat settlement owed to a validator under the subscription arrangement.',
    breaks: 'Without it the validator is owed and never paid.',
    raises: 'Financial',
    settings: ['collection'],
  },
  /* Network --------------------------------------------------------------- */
  'runtime-set-param': {
    title: 'Change a network value',
    family: 'Network',
    primitive: 'update',
    does: 'Changes one value the network runs under.',
    breaks: 'Without it the network keeps the value it started with.',
    raises: 'Structural',
    settings: ['collection'],
  },
  'validator-score': {
    title: 'Record a validator score',
    family: 'Network',
    primitive: 'update',
    does: 'Records a measurement the Standing Engine folds into the Trust Score.',
    breaks: 'Without it the Trust Score misses the measurement.',
    raises: 'Structural',
    settings: ['collection'],
  },
  'fee-set-model': {
    title: 'Set the subscription terms',
    family: 'Network',
    primitive: 'update',
    does: 'Changes the terms validators settle under. End users meet no fee.',
    breaks: 'Without it the terms stay as they were.',
    raises: 'Structural',
    settings: ['collection'],
  },
  'evm-param': {
    title: 'Change a contract substrate value',
    family: 'Network',
    primitive: 'update',
    does: 'Changes one value the contract substrate runs under.',
    breaks: 'Without it the substrate keeps its value.',
    raises: 'Structural',
    settings: ['collection'],
  },
  'genesis-alloc': {
    title: 'Set a starting balance',
    family: 'Network',
    primitive: 'insert',
    does: 'Adds a starting balance record for the first block of a network.',
    breaks: 'Without it the network starts with no balances.',
    raises: 'Constitutional',
    settings: ['collection'],
  },
  'rpc-throttle': {
    title: 'Limit a public endpoint',
    family: 'Network',
    primitive: 'update',
    does: 'Changes how often one public endpoint answers.',
    breaks: 'Without it the endpoint answers as often as it is asked.',
    raises: 'Structural',
    settings: ['collection'],
  },
  'govern-proposal': {
    title: 'Open a governance proposal',
    family: 'Network',
    primitive: 'insert',
    does: 'Adds a proposal record the authority roles vote on under the Amendment Engine.',
    breaks: 'Without it nothing changes the rules that govern the rules.',
    raises: 'Constitutional',
    settings: ['collection'],
  },
};

/** Every block of the palette with its meaning and its ports. */
export const LOGIC_BLOCKS: (BlockMeaning & { id: string; track: SeedBlock['track'] })[] =
  SEED_BLOCKS.map((block) => {
    const meaning = MEANINGS[block.id];
    if (!meaning) {
      throw new Error(`The logic palette holds no Cerulea meaning for the block ${block.id}.`);
    }
    return { id: block.id, track: block.track, ...meaning, ports: block.ports };
  });

export const LOGIC_BLOCK_COUNT = LOGIC_BLOCKS.length;

const BY_ID = new Map(LOGIC_BLOCKS.map((block) => [block.id, block]));

export function blockById(id: string): (typeof LOGIC_BLOCKS)[number] | undefined {
  return BY_ID.get(id);
}

/** The blocks one track offers, grouped by family in palette order. */
export function paletteFor(
  track: 'dapp' | 'blockchain',
  search = '',
): { family: BlockFamily; blocks: typeof LOGIC_BLOCKS }[] {
  const query = search.trim().toLowerCase();
  return FAMILY_ORDER.map((family) => ({
    family,
    blocks: LOGIC_BLOCKS.filter(
      (block) =>
        block.family === family &&
        (block.track === 'any' || block.track === track) &&
        (query.length === 0 ||
          block.title.toLowerCase().includes(query) ||
          block.does.toLowerCase().includes(query) ||
          family.toLowerCase().includes(query)),
    ),
  })).filter((group) => group.blocks.length > 0);
}

/* Compiling a drawing ------------------------------------------------------ */

const CLASS_RANK: Record<TransactionClass, number> = {
  Routine: 0,
  Financial: 1,
  Structural: 2,
  Constitutional: 3,
};

/** The higher of two classes. */
export function higherClass(left: TransactionClass, right: TransactionClass): TransactionClass {
  return CLASS_RANK[left] >= CLASS_RANK[right] ? left : right;
}

export type Correction = { subject: string; fix: string };

export type Compiled = {
  action?: Action;
  rules: Rule[];
  events: EventDefinition[];
  corrections: Correction[];
};

function propText(node: DrawingNode, key: string): string {
  const held = node.props[key];
  return typeof held === 'string' ? held : '';
}

function propExpression(node: DrawingNode): Expression | undefined {
  const held = node.props.expression;
  return held && typeof held === 'object' ? (held as Expression) : undefined;
}

/** Orders the nodes along the lines from the start block, then the rest. */
export function orderedNodes(drawing: Drawing): DrawingNode[] {
  const byId = new Map(drawing.nodes.map((node) => [node.id, node]));
  const start = drawing.nodes.find((node) => node.blockId === 'start') ?? drawing.nodes[0];
  const seen = new Set<string>();
  const ordered: DrawingNode[] = [];
  const queue: string[] = start ? [start.id] : [];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    if (seen.has(id)) continue;
    const node = byId.get(id);
    if (!node) continue;
    seen.add(id);
    ordered.push(node);
    for (const edge of drawing.edges) {
      if (edge.source === id && seen.has(edge.target) === false) queue.push(edge.target);
    }
  }
  for (const node of drawing.nodes) if (seen.has(node.id) === false) ordered.push(node);
  return ordered;
}

/** The nodes reachable from one port of one node, not counting the node itself. */
function downstream(drawing: Drawing, nodeId: string, port?: string): Set<string> {
  const reached = new Set<string>();
  const queue = drawing.edges
    .filter((edge) => edge.source === nodeId && (port === undefined || edge.sourcePort === port))
    .map((edge) => edge.target);
  while (queue.length > 0) {
    const id = queue.shift() as string;
    if (reached.has(id)) continue;
    reached.add(id);
    for (const edge of drawing.edges) if (edge.source === id) queue.push(edge.target);
  }
  return reached;
}

/** Finds a line that leads back to an earlier block, which would loop for ever. */
export function findCycle(drawing: Drawing): string[] | null {
  const outgoing = new Map<string, string[]>();
  for (const edge of drawing.edges) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
  }
  const state = new Map<string, 'open' | 'done'>();
  const path: string[] = [];
  const visit = (id: string): string[] | null => {
    const held = state.get(id);
    if (held === 'open') return [...path.slice(path.indexOf(id)), id];
    if (held === 'done') return null;
    state.set(id, 'open');
    path.push(id);
    for (const next of outgoing.get(id) ?? []) {
      const found = visit(next);
      if (found) return found;
    }
    path.pop();
    state.set(id, 'done');
    return null;
  };
  for (const node of drawing.nodes) {
    const found = visit(node.id);
    if (found) return found;
  }
  return null;
}

function keyParam(): KeyExpression {
  return { kind: 'Exact', value: { kind: 'Param', name: 'key' } };
}

/** The effect one record block produces. */
export function effectFor(
  node: DrawingNode,
  value: Expression,
): Effect | null {
  const block = blockById(node.blockId);
  const collection = propText(node, 'collection');
  if (!block) return null;
  switch (block.primitive) {
    case 'insert':
      if (collection.length === 0) return null;
      return { kind: 'Insert', collection, key: keyParam(), value };
    case 'update':
      if (collection.length === 0) return null;
      return { kind: 'Update', collection, key: keyParam(), value };
    case 'delete':
      if (collection.length === 0) return null;
      return { kind: 'Delete', collection, key: keyParam() };
    case 'read':
      if (collection.length === 0) return null;
      return { kind: 'Read', collection, key: { kind: 'Full' }, bind: `held_${collection}` };
    case 'emit': {
      const event = toIdentifier(propText(node, 'event') || block.title);
      return { kind: 'Emit', event, payload: { kind: 'Param', name: 'record' } };
    }
    default:
      return null;
  }
}

/** The plain sentence one block reads on the canvas, with its setting. */
export function describeNode(node: DrawingNode): string {
  const block = blockById(node.blockId);
  if (!block) return 'An unknown block.';
  const collection = propText(node, 'collection');
  const event = propText(node, 'event');
  const formula = propText(node, 'formula');
  if (block.settings.includes('collection') && collection) {
    return `${block.title} in ${toReadable(collection).toLowerCase()}.`;
  }
  if (block.settings.includes('event') && event) return `${block.title}: ${toReadable(toIdentifier(event))}.`;
  if (block.settings.includes('formula') && formula) return `${block.title}: ${formula}`;
  return `${block.title}.`;
}

/**
 * Compiles one drawing into an action with its rules and its events.
 * The effects follow the lines from the start block. A check block becomes a
 * precondition rule. A line carrying a condition becomes a rule as well. A
 * failure block wraps the effects downstream of it in a compensation. Every
 * value block raises the class. Every correction still needed is named.
 */
export function compileDrawing(drawing: Drawing, blueprint: Blueprint): Compiled {
  const corrections: Correction[] = [];
  const rules: Rule[] = [];
  const events: EventDefinition[] = [];
  const actionId = toIdentifier(drawing.name);
  const collectionIds = new Set(blueprint.collections.map((entry) => entry.id));

  const cycle = findCycle(drawing);
  if (cycle) {
    corrections.push({
      subject: 'A line leads back to an earlier block, so the flow would never finish.',
      fix: 'Remove one line of the loop, or point it at a later block.',
    });
  }

  const ordered = orderedNodes(drawing);
  let transactionClass: TransactionClass = 'Routine';
  const wrapped = new Set<string>();
  const compensations: { node: DrawingNode; effects: Effect[]; onFailure: Effect[] }[] = [];

  // The value the next writing block carries, from a compute block before it.
  const valueFor = (node: DrawingNode): Expression => {
    const upstream = drawing.edges
      .filter((edge) => edge.target === node.id)
      .map((edge) => drawing.nodes.find((entry) => entry.id === edge.source))
      .find((entry) => entry?.blockId === 'transform');
    const expression = upstream ? propExpression(upstream) : undefined;
    return expression ?? { kind: 'Param', name: 'record' };
  };

  const effectOf = (node: DrawingNode): Effect | null => {
    const block = blockById(node.blockId);
    if (!block) {
      corrections.push({
        subject: `The block ${node.blockId} is outside the palette.`,
        fix: 'Remove the block and place one from the palette.',
      });
      return null;
    }
    if (block.raises) transactionClass = higherClass(transactionClass, block.raises);
    if (block.settings.includes('collection')) {
      const collection = propText(node, 'collection');
      if (collection.length === 0 || collectionIds.has(collection) === false) {
        corrections.push({
          subject: `${block.title} names no collection the Blueprint holds.`,
          fix: 'Open the block and choose the collection it works on.',
        });
        if (block.primitive !== 'rule' && block.primitive !== 'order') return null;
      }
    }
    if (block.primitive === 'emit') {
      const effect = effectFor(node, valueFor(node));
      if (effect && effect.kind === 'Emit') {
        const held = events.some((entry) => entry.id === effect.event);
        if (!held) {
          events.push({
            id: effect.event,
            name: propText(node, 'event') || block.title,
            payload_type: payloadTypeFor(drawing, node, blueprint),
            audit: true,
            description: `${block.title}. ${block.does}`,
          });
        }
      }
      return effect;
    }
    if (block.primitive === 'event') {
      const eventId = toIdentifier(propText(node, 'event') || `${actionId}_asked`);
      if (events.some((entry) => entry.id === eventId) === false) {
        events.push({
          id: eventId,
          name: propText(node, 'event') || `${drawing.name} asked`,
          payload_type: payloadTypeFor(drawing, node, blueprint),
          audit: true,
          description: `${block.does}`,
        });
      }
      return null;
    }
    if (block.primitive === 'rule') {
      const rule = ruleFor(drawing, node, actionId, corrections);
      if (rule) rules.push(rule);
      return null;
    }
    return effectFor(node, valueFor(node));
  };

  // Compensations first, so the effects they wrap are kept out of the main run.
  for (const node of ordered) {
    const block = blockById(node.blockId);
    if (block?.primitive !== 'compensate') continue;
    const [goodPort, badPort] =
      node.blockId === 'retry' ? ['success', 'failed'] : ['recovered', 'failed'];
    const good = downstream(drawing, node.id, goodPort);
    const bad = downstream(drawing, node.id, badPort);
    const effects: Effect[] = [];
    const onFailure: Effect[] = [];
    for (const inner of ordered) {
      if (good.has(inner.id) && bad.has(inner.id) === false) {
        const effect = effectOf(inner);
        if (effect) effects.push(effect);
        wrapped.add(inner.id);
      } else if (bad.has(inner.id)) {
        const effect = effectOf(inner);
        if (effect) onFailure.push(effect);
        wrapped.add(inner.id);
      }
    }
    wrapped.add(node.id);
    compensations.push({ node, effects, onFailure });
  }

  const effects: Effect[] = [];
  for (const node of ordered) {
    if (wrapped.has(node.id)) {
      const held = compensations.find((entry) => entry.node.id === node.id);
      if (held && held.effects.length > 0) {
        effects.push({ kind: 'Compensate', effects: held.effects, on_failure: held.onFailure });
      }
      continue;
    }
    const effect = effectOf(node);
    if (effect) effects.push(effect);
  }

  // A line carrying a condition becomes a rule of its own.
  for (const edge of drawing.edges) {
    if (!edge.condition || edge.condition.trim().length === 0) continue;
    const source = drawing.nodes.find((entry) => entry.id === edge.source);
    const reading = readFormula(edge.condition);
    if (reading.expression === undefined || reading.fault) {
      corrections.push({
        subject: `The condition on a line out of ${source ? blockById(source.blockId)?.title ?? 'a block' : 'a block'} does not read.`,
        fix: reading.fault?.fix ?? 'Correct the formula on the line.',
      });
      continue;
    }
    rules.push({
      id: `${actionId}_${toIdentifier(edge.id)}`,
      kind: 'Precondition',
      statement: `${edge.condition} holds before the flow follows this line.`,
      expression: reading.expression,
      collections: source ? [propText(source, 'collection')].filter((entry) => entry.length > 0) : [],
    });
  }

  if (effects.length === 0) {
    corrections.push({
      subject: `${drawing.name} reads and writes nothing yet.`,
      fix: 'Place a block from the Records family and choose its collection, so the action touches a record.',
    });
    return { rules, events, corrections };
  }

  const roles = drawing.roles.length > 0 ? drawing.roles : blueprint.identities.roles.slice(0, 1).map((r) => r.id);
  if (roles.length === 0) {
    corrections.push({
      subject: `${drawing.name} names no role that may run it.`,
      fix: 'Add a role on the Access & Roles tab, then choose it for this flow.',
    });
  }

  const action: Action = {
    id: actionId,
    name: drawing.name,
    params: [],
    preconditions: rules.map((rule) => rule.id),
    effects,
    emits: events
      .filter((event) => effects.some((e) => e.kind === 'Emit' && e.event === event.id))
      .map((event) => event.id),
    class: transactionClass,
    roles,
    description: ordered.map(describeNode).join(' '),
  };
  return { action, rules, events, corrections };
}

function payloadTypeFor(drawing: Drawing, node: DrawingNode, blueprint: Blueprint): string {
  const collection =
    propText(node, 'collection') ||
    drawing.nodes.map((entry) => propText(entry, 'collection')).find((entry) => entry.length > 0) ||
    '';
  const held = blueprint.collections.find((entry) => entry.id === collection);
  return held?.record_type ?? blueprint.types[0]?.id ?? 'record';
}

function ruleFor(
  drawing: Drawing,
  node: DrawingNode,
  actionId: string,
  corrections: Correction[],
): Rule | null {
  const block = blockById(node.blockId);
  const formula = propText(node, 'formula');
  const expression = propExpression(node);
  if (!block) return null;
  if (formula.trim().length === 0 || expression === undefined) {
    corrections.push({
      subject: `${block.title} carries no formula yet.`,
      fix: 'Open the block and type the condition in the formula bar.',
    });
    return null;
  }
  const collection = propText(node, 'collection');
  return {
    id: `${actionId}_${toIdentifier(node.id)}`,
    kind: 'Precondition',
    statement: `${formula} holds before ${drawing.name.toLowerCase()} runs.`,
    expression,
    collections: collection ? [collection] : [],
  };
}

/* Writing a drawing into the Blueprint -------------------------------------- */

export type DrawingWrite = {
  blueprint: Blueprint;
  compiled: Compiled;
};

/**
 * Writes one drawing into the Blueprint, replacing what an earlier compile of
 * the same drawing wrote. Entries other screens wrote stay as they stand.
 */
export function writeDrawing(blueprint: Blueprint, drawing: Drawing): DrawingWrite {
  const compiled = compileDrawing(drawing, blueprint);
  const actionId = toIdentifier(drawing.name);
  const owned = (id: string) => id === actionId || id.startsWith(`${actionId}_`);
  const rules = [...blueprint.rules.filter((rule) => owned(rule.id) === false), ...compiled.rules];
  const actions = blueprint.actions.filter((action) => action.id !== actionId);
  if (compiled.action) actions.push(compiled.action);
  const eventIds = new Set(blueprint.events.map((event) => event.id));
  const events = [
    ...blueprint.events,
    ...compiled.events.filter((event) => eventIds.has(event.id) === false),
  ];
  return { blueprint: { ...blueprint, rules, actions, events }, compiled };
}

/** Removes what one drawing wrote. */
export function eraseDrawing(blueprint: Blueprint, drawingName: string): Blueprint {
  const actionId = toIdentifier(drawingName);
  const owned = (id: string) => id === actionId || id.startsWith(`${actionId}_`);
  return {
    ...blueprint,
    rules: blueprint.rules.filter((rule) => owned(rule.id) === false),
    actions: blueprint.actions.filter((action) => action.id !== actionId),
  };
}

/** The formula text a block holds, written back from its expression when the text is absent. */
export function formulaTextOf(node: DrawingNode): string {
  const text = propText(node, 'formula');
  if (text.length > 0) return text;
  const expression = propExpression(node);
  return expression ? writeFormula(expression) : '';
}
