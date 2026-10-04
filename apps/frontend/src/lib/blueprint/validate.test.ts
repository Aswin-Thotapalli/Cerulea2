import { describe, expect, it } from 'vitest';

import {
  DECIMAL_SCALE_LIMIT,
  IDENTIFIER_LIMIT,
  IDENTIFIER_PATTERN,
  SCHEMA_NAMES,
  SORT_DIRECTION_NAMES,
  TRANSACTION_CLASS_NAMES,
  blueprintPasses,
  faultsBySection,
  readBlueprintText,
  validateBlueprint,
  writeBlueprintText,
} from './validate';
import { readBlueprintDocument } from './document';
import { putCollection, putRole, setCapabilities } from './edit';
import { ENTITY_PRESETS, composeSections, applyComposition } from './compose';
import { summariseBlueprint } from './summary';
import type { Blueprint, Collection } from './types';

function starting(): Blueprint {
  // The modules a berth register template installs, named by their presets.
  const moduleIds = Object.keys(ENTITY_PRESETS).slice(0, 8);
  const composed = composeSections(moduleIds, { retentionDays: 900 });
  const base = applyComposition(readBlueprintDocument({}, 'Berth register'), composed, []);
  return putRole(base, { id: 'clerk', name: 'Clerk', credentials: [] });
}

describe('the schema vocabulary', () => {
  it('reads the identifier rule out of the schema file', () => {
    expect(IDENTIFIER_PATTERN.test('berth_booking')).toBe(true);
    expect(IDENTIFIER_PATTERN.test('BerthBooking')).toBe(false);
    expect(IDENTIFIER_LIMIT).toBeGreaterThan(0);
  });

  it('reads the enumerations out of the schema file', () => {
    expect(TRANSACTION_CLASS_NAMES).toEqual([
      'Routine',
      'Financial',
      'Structural',
      'Constitutional',
    ]);
    expect(SORT_DIRECTION_NAMES).toEqual(['Ascending', 'Descending']);
    expect(DECIMAL_SCALE_LIMIT).toBe(30);
  });

  it('names every assembled word against the schema word', () => {
    expect(SCHEMA_NAMES.capability.Create).toBe('Insert');
    expect(SCHEMA_NAMES.bridgeDirection.Both).toBe('BothWays');
  });
});

describe('checking a Blueprint', () => {
  it('passes a Blueprint Cerulea composed', () => {
    expect(validateBlueprint(starting())).toEqual([]);
    expect(blueprintPasses(starting())).toBe(true);
  });

  it('names the fix on a document that is not an object', () => {
    const faults = validateBlueprint('nonsense');
    expect(faults[0].fix).toContain('twelve sections');
  });

  it('names an absent section and the fix', () => {
    const broken = { ...starting() } as unknown as Record<string, unknown>;
    delete broken.rules;
    const faults = validateBlueprint(broken);
    expect(faults.some((fault) => fault.path === 'rules')).toBe(true);
    expect(faults.find((fault) => fault.path === 'rules')?.fix).toContain('empty where');
  });

  it('refuses a name the Blueprint pattern rejects', () => {
    const held = starting();
    const broken: Blueprint = {
      ...held,
      collections: [{ ...held.collections[0], id: 'Berth Booking' } as Collection, ...held.collections.slice(1)],
    };
    const faults = validateBlueprint(broken);
    expect(faults.some((fault) => fault.message.includes('Berth Booking'))).toBe(true);
    expect(faults[0].fix).toContain('lower case');
  });

  it('names a collection pointing at an absent record type', () => {
    const held = starting();
    const broken: Blueprint = {
      ...held,
      collections: [
        { ...held.collections[0], record_type: 'absent_record' } as Collection,
        ...held.collections.slice(1),
      ],
    };
    const faults = validateBlueprint(broken);
    const named = faults.find((fault) => fault.path.endsWith('record_type'));
    expect(named?.message).toContain('absent_record');
    expect(named?.fix).toContain('absent_record');
  });

  it('names a permission pointing at an absent role', () => {
    const held = setCapabilities(starting(), {
      roleId: 'clerk',
      collectionId: starting().collections[0].id,
      capabilities: ['Read', 'Create'],
    });
    const broken: Blueprint = {
      ...held,
      identities: { ...held.identities, roles: [] },
    };
    const faults = validateBlueprint(broken);
    expect(faults.some((fault) => fault.message.includes('clerk'))).toBe(true);
  });

  it('refuses a decimal beyond the schema limit', () => {
    const held = starting();
    const record = held.types.find((entry) => entry.kind === 'Record');
    const broken: Blueprint = {
      ...held,
      types: held.types.map((entry) =>
        entry.id === record?.id && entry.kind === 'Record'
          ? {
              ...entry,
              fields: [
                {
                  name: 'price',
                  type: { kind: 'Decimal', scale: DECIMAL_SCALE_LIMIT + 1 },
                  required: true,
                  validation: [],
                  description: 'The price.',
                },
              ],
            }
          : entry,
      ),
    };
    const faults = validateBlueprint(broken);
    expect(faults.some((fault) => fault.path.endsWith('.scale'))).toBe(true);
  });

  it('refuses a quorum outside the share a threshold takes', () => {
    const held = starting();
    const broken: Blueprint = {
      ...held,
      governance: { ...held.governance, quorum: { ...held.governance.quorum, routine: 0 } },
    };
    const faults = validateBlueprint(broken);
    expect(faults.some((fault) => fault.path === 'governance.quorum.routine')).toBe(true);
  });

  it('groups the corrections by the section they sit in', () => {
    const broken = { ...starting(), governance: {} } as unknown as Blueprint;
    const grouped = faultsBySection(validateBlueprint(broken));
    expect(grouped.some((group) => group.section === 'governance')).toBe(true);
  });
});

describe('reading and writing the document', () => {
  it('round-trips a Blueprint through its text exactly', () => {
    const held = starting();
    const reading = readBlueprintText(writeBlueprintText(held));
    expect(reading.faults).toEqual([]);
    expect(reading.document).toEqual(held);
    expect(writeBlueprintText(reading.document!)).toBe(writeBlueprintText(held));
  });

  it('names the fix on text Cerulea cannot read', () => {
    const reading = readBlueprintText('{ "name": ');
    expect(reading.document).toBeUndefined();
    expect(reading.faults[0].fix).toContain('punctuation');
  });

  it('holds back a document while a correction stands', () => {
    const broken = writeBlueprintText({ ...starting(), name: '' });
    const reading = readBlueprintText(broken);
    expect(reading.document).toBeUndefined();
    expect(reading.faults.some((fault) => fault.path === 'name')).toBe(true);
  });
});

describe('a change at level three appears at level two', () => {
  it('names a collection added in the designer', () => {
    const held = starting();
    const before = summariseBlueprint(held);
    const added = putCollection(held, {
      id: 'berth_inspection',
      record_type: held.collections[0].record_type,
      primary_key: held.collections[0].primary_key,
      indexes: [],
      privacy: 'Open',
      retention: { period_days: 900, on_expiry: 'Archive' },
      purpose: {
        statement: 'We keep every berth inspection so the register stays provable.',
        lawful_basis: 'Contract',
      },
      description: 'Every berth inspection the system keeps.',
    });
    const after = summariseBlueprint(added);
    expect(after[0].count).toBe(before[0].count + 1);
    expect(after[0].names).toContain('Berth inspection');
    expect(validateBlueprint(added)).toEqual([]);
  });

  it('names a role added in the designer', () => {
    const held = putRole(starting(), { id: 'inspector', name: 'Inspector', credentials: [] });
    const before = summariseBlueprint(starting())[1].count;
    const summary = summariseBlueprint(held);
    expect(summary[1].names).toContain('Inspector');
    expect(summary[1].count).toBe(before + 1);
    expect(summary[1].sentence).toContain(`${before + 1} roles`);
  });

  it('carries a change made at level four back to the same summary', () => {
    const held = putRole(starting(), { id: 'inspector', name: 'Inspector', credentials: [] });
    const text = writeBlueprintText(held);
    const reading = readBlueprintText(text);
    expect(summariseBlueprint(reading.document!)).toEqual(summariseBlueprint(held));
  });

  it('states every section in plain words with no internal name', () => {
    for (const line of summariseBlueprint(starting())) {
      expect(line.sentence.includes('_')).toBe(false);
      expect(line.heading.endsWith('.')).toBe(false);
    }
  });
});
