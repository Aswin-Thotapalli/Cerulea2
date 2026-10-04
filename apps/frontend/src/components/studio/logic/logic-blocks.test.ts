import { describe, expect, it } from 'vitest';

import blocksSeed from '@/data/blocks.seed.json';
import { readBlueprintDocument } from '@/lib/blueprint/document';
import { readFormula } from '@/lib/blueprint/formula';
import { validateBlueprint } from '@/lib/blueprint/validate';
import type { Blueprint } from '@/lib/blueprint/types';
import type { Drawing } from '@/components/studio/steps/step2-types';
import {
  LOGIC_BLOCKS,
  LOGIC_BLOCK_COUNT,
  compileDrawing,
  eraseDrawing,
  findCycle,
  paletteFor,
  writeDrawing,
} from './logic-blocks';

const OUTSIDE_NAMES = /erc|evm|stripe|twilio|ipfs|amm|web3|wallet|nft|rpc|json|sms|http/i;

function base(): Blueprint {
  return readBlueprintDocument(
    {
      name: 'Berth register',
      types: [
        {
          id: 'berth_record',
          kind: 'Record',
          description: 'One berth.',
          fields: [
            { name: 'id', type: { kind: 'Text' }, required: true, validation: [], description: 'Key.' },
            {
              name: 'length',
              type: { kind: 'Integer' },
              required: true,
              validation: [],
              description: 'Length in metres.',
            },
          ],
        },
      ],
      collections: [
        {
          id: 'berth',
          record_type: 'berth_record',
          primary_key: 'id',
          indexes: [],
          privacy: 'Open',
          retention: { period_days: 3650, on_expiry: 'Archive' },
          purpose: { statement: 'We keep every berth so the register stays provable.', lawful_basis: 'Contract' },
          description: 'Every berth.',
        },
      ],
      identities: { roles: [{ id: 'harbour_master', name: 'Harbour master', credentials: [] }] },
    },
    'Berth register',
  );
}

function drawing(over: Partial<Drawing> = {}): Drawing {
  return {
    id: 'allocate',
    name: 'Allocate a berth',
    roles: ['harbour_master'],
    nodes: [
      { id: 'n_start', blockId: 'start', position: { x: 0, y: 0 }, props: {} },
      {
        id: 'n_check',
        blockId: 'condition',
        position: { x: 200, y: 0 },
        props: {
          collection: 'berth',
          formula: 'length > 10',
          expression: readFormula('length > 10').expression,
        },
      },
      { id: 'n_add', blockId: 'db-create', position: { x: 400, y: 0 }, props: { collection: 'berth' } },
      { id: 'n_end', blockId: 'end', position: { x: 600, y: 0 }, props: {} },
    ],
    edges: [
      { id: 'e1', source: 'n_start', sourcePort: 'next', target: 'n_check', targetPort: 'in' },
      { id: 'e2', source: 'n_check', sourcePort: 'true', target: 'n_add', targetPort: 'in' },
      { id: 'e3', source: 'n_add', sourcePort: 'next', target: 'n_end', targetPort: 'in' },
    ],
    ...over,
  };
}

describe('the palette of 52', () => {
  it('carries every block of the seed and nothing else', () => {
    const seedIds = (blocksSeed as { blocks: { id: string }[] }).blocks.map((entry) => entry.id);
    expect(LOGIC_BLOCK_COUNT).toBe(52);
    expect(LOGIC_BLOCKS.map((entry) => entry.id)).toEqual(seedIds);
  });

  it('names every block in Cerulea words', () => {
    for (const block of LOGIC_BLOCKS) {
      expect(block.title, block.id).not.toMatch(OUTSIDE_NAMES);
      expect(block.does, block.id).not.toMatch(OUTSIDE_NAMES);
      expect(block.does.endsWith('.'), block.id).toBe(true);
      expect(block.breaks.length, block.id).toBeGreaterThan(10);
    }
  });

  it('offers each track its own blocks grouped by family', () => {
    const dapp = paletteFor('dapp').flatMap((group) => group.blocks.map((entry) => entry.id));
    const chain = paletteFor('blockchain').flatMap((group) => group.blocks.map((entry) => entry.id));
    expect(dapp).toContain('market-create');
    expect(dapp).not.toContain('genesis-alloc');
    expect(chain).toContain('genesis-alloc');
    expect(chain).not.toContain('market-create');
    expect(paletteFor('dapp', 'record').every((group) => group.blocks.length > 0)).toBe(true);
  });
});

describe('compiling a drawing', () => {
  it('writes one action with its rule, its effect and its Access Manifest', () => {
    const compiled = compileDrawing(drawing(), base());
    expect(compiled.corrections).toEqual([]);
    expect(compiled.action?.id).toBe('allocate_a_berth');
    expect(compiled.action?.effects).toEqual([
      expect.objectContaining({ kind: 'Insert', collection: 'berth' }),
    ]);
    expect(compiled.rules).toHaveLength(1);
    expect(compiled.rules[0].kind).toBe('Precondition');
    expect(compiled.action?.preconditions).toEqual([compiled.rules[0].id]);
    expect(compiled.action?.class).toBe('Routine');
    expect(compiled.action?.roles).toEqual(['harbour_master']);
  });

  it('raises the class when a value block appears', () => {
    const held = drawing({
      nodes: [
        { id: 'n_start', blockId: 'start', position: { x: 0, y: 0 }, props: {} },
        { id: 'n_pay', blockId: 'erc20-transfer', position: { x: 200, y: 0 }, props: { collection: 'berth' } },
      ],
      edges: [{ id: 'e1', source: 'n_start', sourcePort: 'next', target: 'n_pay', targetPort: 'in' }],
    });
    expect(compileDrawing(held, base()).action?.class).toBe('Financial');
  });

  it('announces an event for a message block and lists it under emits', () => {
    const held = drawing({
      nodes: [
        { id: 'n_start', blockId: 'start', position: { x: 0, y: 0 }, props: {} },
        { id: 'n_add', blockId: 'db-create', position: { x: 200, y: 0 }, props: { collection: 'berth' } },
        { id: 'n_mail', blockId: 'email-send', position: { x: 400, y: 0 }, props: { event: 'Berth allocated' } },
      ],
      edges: [
        { id: 'e1', source: 'n_start', sourcePort: 'next', target: 'n_add', targetPort: 'in' },
        { id: 'e2', source: 'n_add', sourcePort: 'next', target: 'n_mail', targetPort: 'in' },
      ],
    });
    const compiled = compileDrawing(held, base());
    expect(compiled.events.map((entry) => entry.id)).toEqual(['berth_allocated']);
    expect(compiled.events[0].payload_type).toBe('berth_record');
    expect(compiled.action?.emits).toEqual(['berth_allocated']);
  });

  it('wraps the effects after a failure block in a compensation', () => {
    const held = drawing({
      nodes: [
        { id: 'n_start', blockId: 'start', position: { x: 0, y: 0 }, props: {} },
        { id: 'n_try', blockId: 'retry', position: { x: 200, y: 0 }, props: {} },
        { id: 'n_add', blockId: 'db-create', position: { x: 400, y: 0 }, props: { collection: 'berth' } },
        { id: 'n_undo', blockId: 'db-delete', position: { x: 400, y: 200 }, props: { collection: 'berth' } },
      ],
      edges: [
        { id: 'e1', source: 'n_start', sourcePort: 'next', target: 'n_try', targetPort: 'in' },
        { id: 'e2', source: 'n_try', sourcePort: 'success', target: 'n_add', targetPort: 'in' },
        { id: 'e3', source: 'n_try', sourcePort: 'failed', target: 'n_undo', targetPort: 'in' },
      ],
    });
    const compiled = compileDrawing(held, base());
    expect(compiled.action?.effects).toEqual([
      {
        kind: 'Compensate',
        effects: [expect.objectContaining({ kind: 'Insert' })],
        on_failure: [expect.objectContaining({ kind: 'Delete' })],
      },
    ]);
  });

  it('names the corrections a half drawn flow still needs', () => {
    const held = drawing({
      nodes: [
        { id: 'n_start', blockId: 'start', position: { x: 0, y: 0 }, props: {} },
        { id: 'n_check', blockId: 'condition', position: { x: 200, y: 0 }, props: { collection: 'berth' } },
        { id: 'n_add', blockId: 'db-create', position: { x: 400, y: 0 }, props: {} },
      ],
      edges: [],
    });
    const compiled = compileDrawing(held, base());
    expect(compiled.action).toBeUndefined();
    expect(compiled.corrections.map((entry) => entry.subject)).toEqual([
      'Check a condition carries no formula yet.',
      'Add a record names no collection the Blueprint holds.',
      'Allocate a berth reads and writes nothing yet.',
    ]);
  });

  it('finds a line that loops back', () => {
    const held = drawing({
      edges: [
        { id: 'e1', source: 'n_start', sourcePort: 'next', target: 'n_check', targetPort: 'in' },
        { id: 'e2', source: 'n_check', sourcePort: 'true', target: 'n_add', targetPort: 'in' },
        { id: 'e3', source: 'n_add', sourcePort: 'next', target: 'n_check', targetPort: 'in' },
      ],
    });
    expect(findCycle(held)).toEqual(['n_check', 'n_add', 'n_check']);
    expect(compileDrawing(held, base()).corrections[0].subject).toMatch(/loop|leads back/);
    expect(findCycle(drawing())).toBeNull();
  });

  it('turns a line condition into a rule of its own', () => {
    const held = drawing({
      edges: [
        { id: 'e1', source: 'n_start', sourcePort: 'next', target: 'n_check', targetPort: 'in' },
        { id: 'e2', source: 'n_check', sourcePort: 'true', target: 'n_add', targetPort: 'in', condition: 'length < 400' },
      ],
    });
    const compiled = compileDrawing(held, base());
    expect(compiled.rules.map((entry) => entry.id)).toEqual(['allocate_a_berth_n_check', 'allocate_a_berth_e2']);
  });
});

describe('writing a drawing into the Blueprint', () => {
  it('replaces its own entries and keeps the others, and the document passes the schema', () => {
    const start = base();
    const foreign = {
      ...start,
      actions: [
        {
          id: 'close_the_harbour',
          name: 'Close the harbour',
          params: [],
          preconditions: [],
          effects: [{ kind: 'Delete' as const, collection: 'berth', key: { kind: 'Full' as const } }],
          emits: [],
          class: 'Structural' as const,
          roles: ['harbour_master'],
          description: 'Closes it.',
        },
      ],
    };
    const first = writeDrawing(foreign, drawing());
    expect(first.blueprint.actions.map((entry) => entry.id)).toEqual(['close_the_harbour', 'allocate_a_berth']);
    expect(validateBlueprint(first.blueprint)).toEqual([]);

    const second = writeDrawing(first.blueprint, drawing({ edges: drawing().edges.slice(0, 2) }));
    expect(second.blueprint.actions).toHaveLength(2);
    expect(second.blueprint.rules).toHaveLength(1);

    const erased = eraseDrawing(second.blueprint, 'Allocate a berth');
    expect(erased.actions.map((entry) => entry.id)).toEqual(['close_the_harbour']);
    expect(erased.rules).toEqual([]);
  });
});
