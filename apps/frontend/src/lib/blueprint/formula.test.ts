import { describe, expect, it } from 'vitest';

import {
  FORMULA_FUNCTIONS,
  MAX_DECIMAL_SCALE,
  carriesOrder,
  completionsAt,
  describeType,
  describeValue,
  evaluateLiteral,
  readAndCheck,
  readFormula,
  sameType,
  scopeForCollection,
  tokenise,
  writeFormula,
  type FormulaScope,
} from './formula';
import type { Blueprint, RecordTypeDefinition } from './types';

const bookingRecord: RecordTypeDefinition = {
  id: 'booking_record',
  kind: 'Record',
  fields: [
    {
      name: 'amount',
      type: { kind: 'Integer' },
      required: true,
      validation: [],
      description: 'The amount the booking carries.',
    },
    {
      name: 'price',
      type: { kind: 'Decimal', scale: 2 },
      required: true,
      validation: [],
      description: 'The price of the booking.',
    },
    {
      name: 'status',
      type: { kind: 'Text' },
      required: true,
      validation: [],
      description: 'The state the booking sits in.',
    },
    {
      name: 'note',
      type: { kind: 'Text' },
      required: false,
      validation: [],
      description: 'A note somebody left on the booking.',
    },
    {
      name: 'opened',
      type: { kind: 'Timestamp' },
      required: true,
      validation: [],
      description: 'The moment the booking opened.',
    },
  ],
  description: 'One booking record.',
};

const blueprint = {
  schema_version: '1.0.0',
  name: 'Berth register',
  summary: '',
  types: [bookingRecord],
  collections: [
    {
      id: 'booking',
      record_type: 'booking_record',
      primary_key: 'amount',
      indexes: [],
      privacy: 'Open',
      retention: { period_days: 900, on_expiry: 'Archive' },
      purpose: { statement: 'We keep every booking.', lawful_basis: 'Contract' },
      description: 'Every booking the system keeps.',
    },
  ],
  identities: { units: [], roles: [], credentials: [], delegations: [] },
  permissions: [],
  rules: [],
  actions: [],
  workflows: [],
  events: [],
  views: [],
  integrations: { feeds: [], bridges: [], triggers: [] },
  governance: {
    authority: [],
    quorum: { routine: 51, financial: 67, structural: 80, constitutional: 90 },
    constitutional_delay_blocks: 100,
    change_process: '',
  },
  economics: null,
} as unknown as Blueprint;

const scope: FormulaScope = scopeForCollection(blueprint, 'booking');

function check(text: string) {
  return readAndCheck(text, scope);
}

describe('reading a formula', () => {
  it('splits text into names, numbers, runs of text and signs', () => {
    const tokens = tokenise('record.amount >= 12.50');
    expect(tokens.map((token) => token.kind)).toEqual([
      'name',
      'symbol',
      'name',
      'symbol',
      'decimal',
      'end',
    ]);
    expect(tokens[4].scale).toBe(2);
  });

  it('names the fix on an empty formula', () => {
    expect(readFormula('   ').fault?.fix).toContain('amount > 0');
  });

  it('names the fix on text after the formula ends', () => {
    const fault = readFormula('1 2').fault;
    expect(fault?.message).toContain('after the formula ends');
    expect(fault?.fix.length).toBeGreaterThan(0);
  });

  it('names the fix on an unknown function', () => {
    const fault = readFormula('rubbish(1)').fault;
    expect(fault?.message).toContain('no function named rubbish');
    expect(fault?.fix).toContain('length');
  });

  it('names the fix on the wrong number of values', () => {
    const fault = readFormula('length(1, 2)').fault;
    expect(fault?.message).toContain('takes 1 value and reads 2');
    expect(fault?.fix).toContain('length(text)');
  });

  it('holds the usual order of operations', () => {
    const reading = readFormula('1 + 2 * 3');
    expect(evaluateLiteral(reading.expression!)).toEqual({ kind: 'Integer', value: 7 });
    expect(evaluateLiteral(readFormula('(1 + 2) * 3').expression!)).toEqual({
      kind: 'Integer',
      value: 9,
    });
  });
});

describe('the type rules mirrored from the Blueprint crate', () => {
  it('adds two whole numbers and refuses a mixed addition', () => {
    expect(check('record.amount + 1').type).toEqual({ kind: 'Integer' });
    const fault = check('record.amount + "one"').fault;
    expect(fault?.message).toContain('a whole number on the left');
    expect(fault?.fix).toContain('same number of places');
  });

  it('adds two decimals sharing one scale and refuses two scales', () => {
    expect(check('record.price + 1.50').type).toEqual({ kind: 'Decimal', scale: 2 });
    expect(check('record.price + 1.5').fault?.message).toContain('a decimal with 1 places');
  });

  it('adds the two scales on a decimal multiplication', () => {
    expect(check('record.price * 1.500').type).toEqual({ kind: 'Decimal', scale: 5 });
  });

  it('refuses a product above the maximum number of places', () => {
    const wide = `0.${'0'.repeat(MAX_DECIMAL_SCALE - 1)}1`;
    const fault = check(`${wide} * ${wide}`).fault;
    expect(fault?.message).toContain(`above the maximum of ${MAX_DECIMAL_SCALE}`);
    expect(fault?.fix).toContain('Lower the places');
  });

  it('takes a remainder between two whole numbers alone', () => {
    expect(check('record.amount % 2').type).toEqual({ kind: 'Integer' });
    expect(check('record.price % 2').fault?.message).toContain('remainder');
  });

  it('compares two values of one type alone', () => {
    expect(check('record.status = "paid"').type).toEqual({ kind: 'Boolean' });
    expect(check('record.status = 1').fault?.fix).toContain('sharing one type');
  });

  it('orders only a type that carries an order', () => {
    expect(carriesOrder({ kind: 'Integer' })).toBe(true);
    expect(carriesOrder({ kind: 'Boolean' })).toBe(false);
    expect(check('true > false').fault?.message).toContain('carries no order');
  });

  it('joins two truth values alone', () => {
    expect(check('record.amount > 1 and record.status = "paid"').type).toEqual({
      kind: 'Boolean',
    });
    expect(check('record.amount and true').fault?.fix).toContain('truth value');
  });

  it('gives a conditional one type across both branches', () => {
    expect(check('if record.amount > 1 then 1 else 2').type).toEqual({ kind: 'Integer' });
    expect(check('if record.amount > 1 then 1 else "two"').fault?.fix).toContain(
      'both branches one type',
    );
    expect(check('if record.amount then 1 else 2').fault?.message).toContain('The condition');
  });

  it('names an absent value and lists the names in scope', () => {
    const fault = check('rubbish > 1').fault;
    expect(fault?.message).toContain('no value named rubbish');
    expect(fault?.fix).toContain('record');
  });

  it('names an absent field and lists the fields the record holds', () => {
    const fault = check('record.rubbish > 1').fault;
    expect(fault?.message).toContain('no field named rubbish');
    expect(fault?.fix).toContain('amount');
  });

  it('marks a field that may be absent as optional', () => {
    expect(check('record.note').type).toEqual({ kind: 'Optional', inner: { kind: 'Text' } });
    expect(check('is_present(record.note)').type).toEqual({ kind: 'Boolean' });
    expect(check('is_present(record.status)').fault?.message).toContain('always present');
  });

  it('reads the moment and the caller', () => {
    expect(check('now()').type).toEqual({ kind: 'Timestamp' });
    expect(check('caller()').type).toEqual({ kind: 'Identity' });
    expect(check('difference_seconds(now(), record.opened)').type).toEqual({ kind: 'Integer' });
    expect(check('add_seconds(record.opened, 60)').type).toEqual({ kind: 'Timestamp' });
    expect(check('add_seconds(record.opened, "60")').fault?.fix).toContain('whole number');
  });

  it('hashes text and bytes alone', () => {
    expect(check('hash(record.status)').type).toEqual({ kind: 'Hash' });
    expect(check('hash(record.amount)').fault?.fix).toContain('run of text');
  });
});

describe('the live value', () => {
  it('works out a formula over literals alone', () => {
    expect(check('2 + 3 * 4').value).toEqual({ kind: 'Integer', value: 14 });
    expect(check('length("berth")').value).toEqual({ kind: 'Integer', value: 5 });
    expect(check('contains("berth", "err")').value).toEqual({ kind: 'Boolean', value: false });
    expect(check('concat("a", "b")').value).toEqual({ kind: 'Text', value: 'ab' });
    expect(check('if 1 > 2 then 10 else 20').value).toEqual({ kind: 'Integer', value: 20 });
  });

  it('holds back a value where the formula reads a record', () => {
    expect(check('record.amount + 1').value).toBeUndefined();
  });

  it('holds back a value on a division by nothing', () => {
    expect(check('1 / 0').value).toBeUndefined();
  });

  it('writes a value in the words a person reads', () => {
    expect(describeValue({ kind: 'Decimal', value: '1250', scale: 2 })).toBe('12.50');
    expect(describeValue({ kind: 'Text', value: 'paid' })).toBe('"paid"');
    expect(describeValue({ kind: 'Boolean', value: true })).toBe('true');
  });
});

describe('writing a formula back', () => {
  it('round-trips every formula the bar accepts', () => {
    const formulas = [
      'record.amount > 1',
      '(record.amount + 1)',
      'not (record.amount = 1)',
      'if (record.amount > 1) then 1 else 2',
      'length(record.status)',
      'now()',
      'caller()',
      'coalesce(record.note, "none")',
    ];
    for (const formula of formulas) {
      const first = check(formula);
      expect(first.fault, formula).toBeUndefined();
      const written = writeFormula(first.expression!);
      const second = check(written);
      expect(second.fault, written).toBeUndefined();
      expect(second.expression).toEqual(first.expression);
    }
  });
});

describe('the completion list', () => {
  it('offers the fields of the record after a stop', () => {
    const offered = completionsAt('record.', 7, scope);
    expect(offered.map((entry) => entry.insert)).toEqual([
      'amount',
      'price',
      'status',
      'note',
      'opened',
    ]);
    expect(offered[0].plain).toBe('The amount the booking carries.');
  });

  it('narrows the fields as a person types', () => {
    expect(completionsAt('record.am', 9, scope).map((entry) => entry.insert)).toEqual(['amount']);
  });

  it('offers the names, the functions and the reserved words elsewhere', () => {
    const offered = completionsAt('', 0, scope);
    expect(offered.some((entry) => entry.insert === 'record')).toBe(true);
    for (const held of FORMULA_FUNCTIONS) {
      expect(offered.some((entry) => entry.insert === held.name)).toBe(true);
    }
    expect(offered.some((entry) => entry.insert === 'and')).toBe(true);
    expect(offered.every((entry) => entry.plain.length > 0)).toBe(true);
  });

  it('offers nothing after a stop on a value that holds no field', () => {
    expect(completionsAt('record.amount.', 14, scope)).toEqual([]);
  });
});

describe('types in plain words', () => {
  it('states every type without an internal name', () => {
    expect(describeType({ kind: 'Integer' })).toBe('a whole number');
    expect(describeType({ kind: 'Decimal', scale: 2 })).toBe('a decimal with 2 places');
    expect(describeType({ kind: 'List', element: { kind: 'Text' } })).toBe('a list of text');
    expect(describeType({ kind: 'Optional', inner: { kind: 'Text' } })).toBe(
      'text that may be absent',
    );
  });

  it('matches two types exactly', () => {
    expect(sameType({ kind: 'Decimal', scale: 2 }, { kind: 'Decimal', scale: 2 })).toBe(true);
    expect(sameType({ kind: 'Decimal', scale: 2 }, { kind: 'Decimal', scale: 3 })).toBe(false);
  });
});
