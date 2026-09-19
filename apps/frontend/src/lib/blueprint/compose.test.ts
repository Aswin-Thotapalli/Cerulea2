import { describe, expect, it } from 'vitest';

import {
  DEFAULT_DECIMAL_SCALE,
  ENTITY_PRESETS,
  applyComposition,
  composeSections,
  describeField,
  mapFieldType,
  toIdentifier,
  toReadable,
} from './compose';
import { readBlueprintDocument } from './document';
import type { TypeExpression } from './types';

function kindsIn(expression: TypeExpression): TypeExpression['kind'][] {
  const held: TypeExpression['kind'][] = [expression.kind];
  if (expression.kind === 'Optional') held.push(...kindsIn(expression.inner));
  if (expression.kind === 'List') held.push(...kindsIn(expression.element));
  return held;
}

describe('identifiers', () => {
  it('turns a catalogue name into a Blueprint identifier', () => {
    expect(toIdentifier('User')).toBe('user');
    expect(toIdentifier('createdAt')).toBe('created_at');
    expect(toIdentifier('Purchase Order')).toBe('purchase_order');
    expect(toIdentifier('2024Report')).toBe('c_2024_report');
  });

  it('turns an identifier back into words', () => {
    expect(toReadable('purchase_order')).toBe('Purchase order');
  });
});

describe('the Blueprint primitive set', () => {
  it('maps every catalogue type onto a primitive, and never onto floating point', () => {
    const mapped = [
      mapFieldType({ name: 'id', type: 'uuid' }),
      mapFieldType({ name: 'title', type: 'string' }),
      mapFieldType({ name: 'body', type: 'text' }),
      mapFieldType({ name: 'payload', type: 'json' }),
      mapFieldType({ name: 'count', type: 'integer' }),
      mapFieldType({ name: 'size', type: 'number' }),
      mapFieldType({ name: 'amount', type: 'decimal' }),
      mapFieldType({ name: 'at', type: 'datetime' }),
    ];
    expect(mapped.map((entry) => entry.kind)).toEqual([
      'Text',
      'Text',
      'Text',
      'Text',
      'Integer',
      'Integer',
      'Decimal',
      'Timestamp',
    ]);
    expect(JSON.stringify(mapped)).not.toContain('Float');
  });

  it('gives a decimal an explicit scale', () => {
    const decimal = mapFieldType({ name: 'amount', type: 'decimal' });
    expect(decimal).toEqual({ kind: 'Decimal', scale: DEFAULT_DECIMAL_SCALE });
  });

  it('turns an address into an identity and a relation into a reference', () => {
    expect(mapFieldType({ name: 'address', type: 'string', format: 'eth-address' })).toEqual({
      kind: 'Identity',
    });
    expect(mapFieldType({ name: 'userId', type: 'uuid', relation: 'User' })).toEqual({
      kind: 'Reference',
      collection: 'user',
    });
  });

  it('wraps a nullable field in an optional', () => {
    const optional = mapFieldType({ name: 'email', type: 'string', nullable: true });
    expect(kindsIn(optional)).toEqual(['Optional', 'Text']);
  });

  it('names an enumeration rather than repeating its values inline', () => {
    expect(mapFieldType({ name: 'status', type: 'string', enum: ['active'] }, 'user_status')).toEqual(
      { kind: 'Named', name: 'user_status' },
    );
  });

  it('states what each field holds in plain words', () => {
    expect(describeField({ name: 'userId', type: 'uuid', relation: 'User' })).toMatch(/belongs to/);
    expect(describeField({ name: 'amount', type: 'decimal' })).toMatch(/exact amount/);
    expect(describeField({ name: 'status', type: 'string', enum: ['active', 'closed'] })).toBe(
      'One of active, closed.',
    );
  });
});

describe('composing a selection', () => {
  it('ships an entity preset for a large part of the catalogue', () => {
    expect(Object.keys(ENTITY_PRESETS).length).toBeGreaterThan(100);
  });

  it('installs the types and the collections one module keeps records in', () => {
    const composed = composeSections(['wallet-auth']);
    expect(composed.collections.map((entry) => entry.id)).toContain('user');
    expect(composed.collections.map((entry) => entry.id)).toContain('session');
    const user = composed.collections.find((entry) => entry.id === 'user');
    expect(user?.record_type).toBe('user_record');
    expect(user?.privacy).toBe('Open');
    expect(user?.retention.period_days).toBe(3650);
    expect(user?.purpose.statement.length).toBeGreaterThan(10);
    const record = composed.types.find((entry) => entry.id === 'user_record');
    expect(record?.kind).toBe('Record');
  });

  it('names the modules holding no records of their own', () => {
    const composed = composeSections(['wallet-auth', 'a-module-with-no-preset']);
    expect(composed.withoutRecords).toEqual(['a-module-with-no-preset']);
  });

  it('honours the retention the foundation set', () => {
    const composed = composeSections(['wallet-auth'], { retentionDays: 30, privacy: 'Encrypted' });
    expect(composed.collections[0]?.retention.period_days).toBe(30);
    expect(composed.collections[0]?.privacy).toBe('Encrypted');
  });

  it('adds a collection once however many modules ask for it', () => {
    const composed = composeSections(['wallet-auth', 'wallet-auth']);
    const ids = composed.collections.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('merging a composition into a Blueprint', () => {
  it('keeps a collection a person already changed', () => {
    const blueprint = readBlueprintDocument({});
    const first = applyComposition(blueprint, composeSections(['wallet-auth']), []);
    const changed = {
      ...first,
      collections: first.collections.map((entry) =>
        entry.id === 'user' ? { ...entry, privacy: 'Encrypted' as const } : entry,
      ),
    };
    const second = applyComposition(
      changed,
      composeSections(['wallet-auth']),
      first.collections.map((entry) => entry.id),
    );
    expect(second.collections.find((entry) => entry.id === 'user')?.privacy).toBe('Encrypted');
  });

  it('removes a collection the selection no longer installs', () => {
    const blueprint = readBlueprintDocument({});
    const first = applyComposition(blueprint, composeSections(['wallet-auth']), []);
    const installed = first.collections.map((entry) => entry.id);
    const second = applyComposition(first, composeSections([]), installed);
    expect(second.collections).toHaveLength(0);
  });

  it('leaves a collection a person added by hand in place', () => {
    const blueprint = readBlueprintDocument({});
    const first = applyComposition(blueprint, composeSections(['wallet-auth']), []);
    const byHand = {
      ...first,
      collections: [
        ...first.collections,
        {
          id: 'berth',
          record_type: 'berth_record',
          primary_key: 'id',
          indexes: [],
          privacy: 'Open' as const,
          retention: { period_days: 100, on_expiry: 'Archive' as const },
          purpose: { statement: 'We keep every berth.', lawful_basis: 'PublicTask' as const },
          description: '',
        },
      ],
    };
    const second = applyComposition(
      byHand,
      composeSections([]),
      first.collections.map((entry) => entry.id),
    );
    expect(second.collections.map((entry) => entry.id)).toEqual(['berth']);
  });
});
