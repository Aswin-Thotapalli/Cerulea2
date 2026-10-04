import { describe, expect, it } from 'vitest';

import {
  completionsAt,
  describeType,
  describeValue,
  evaluateLiteral,
  readAndCheck,
  readFormula,
  sameType,
  tokenise,
  writeFormula,
  type FormulaScope,
} from './formula';
import type { Expression, LiteralValue, RecordTypeDefinition, TypeExpression } from './types';

const berth: RecordTypeDefinition = {
  id: 'berth',
  kind: 'Record',
  description: 'One berth.',
  fields: [
    { name: 'amount', type: { kind: 'Integer' }, required: true, validation: [], description: '' },
    { name: 'label', type: { kind: 'Text' }, required: true, validation: [], description: 'The label.' },
  ],
};

const scope: FormulaScope = {
  names: [
    { name: 'amount', type: { kind: 'Integer' }, plain: 'A whole number.' },
    { name: 'price', type: { kind: 'Decimal', scale: 2 }, plain: 'A price.' },
    { name: 'label', type: { kind: 'Text' }, plain: 'A label.' },
    { name: 'flag', type: { kind: 'Boolean' }, plain: 'A flag.' },
    { name: 'blob', type: { kind: 'Bytes' }, plain: 'Some bytes.' },
    { name: 'who', type: { kind: 'Identity' }, plain: 'An identity.' },
    { name: 'maybe', type: { kind: 'Optional', inner: { kind: 'Text' } }, plain: 'Maybe text.' },
    {
      name: 'ledger',
      type: { kind: 'Map', key: { kind: 'Text' }, value: { kind: 'Integer' } },
      plain: 'A ledger.',
    },
    { name: 'ref', type: { kind: 'Reference', collection: 'berths' }, plain: 'A berth reference.' },
    { name: 'other_ref', type: { kind: 'Reference', collection: 'archive' }, plain: 'An archive reference.' },
    { name: 'ghost', type: { kind: 'Reference', collection: 'ghosts' }, plain: 'A missing reference.' },
  ],
  records: new Map([['berth', berth]]),
  collections: new Map([
    ['berths', 'berth'],
    ['archive', 'absent_record'],
  ]),
};

const empty: FormulaScope = { names: [], records: new Map(), collections: new Map() };

function literal(value: LiteralValue): Expression {
  return { kind: 'Literal', value };
}

function call(operator: string, ...args: Expression[]): Expression {
  return { kind: 'Call', operator, arguments: args } as Expression;
}

describe('describing types', () => {
  it('states every kind in plain words', () => {
    const cases: Array<[TypeExpression, string]> = [
      [{ kind: 'Bytes' }, 'a run of bytes'],
      [{ kind: 'Timestamp' }, 'a moment in time'],
      [{ kind: 'Identity' }, 'an identity'],
      [{ kind: 'Hash' }, 'a hash'],
      [{ kind: 'Map', key: { kind: 'Text' }, value: { kind: 'Integer' } }, 'a map from text to a whole number'],
      [{ kind: 'Reference', collection: 'berths' }, 'a reference to berths'],
      [{ kind: 'Named', name: 'berth' }, 'the type berth'],
      [{ kind: 'Something' } as unknown as TypeExpression, 'a value'],
    ];
    for (const [type, words] of cases) {
      expect(describeType(type)).toBe(words);
    }
  });
});

describe('matching types', () => {
  it('compares maps, optionals and references by their parts', () => {
    const map = (value: TypeExpression): TypeExpression => ({ kind: 'Map', key: { kind: 'Text' }, value });
    expect(sameType(map({ kind: 'Integer' }), map({ kind: 'Integer' }))).toBe(true);
    expect(sameType(map({ kind: 'Integer' }), map({ kind: 'Text' }))).toBe(false);
    expect(
      sameType({ kind: 'Optional', inner: { kind: 'Text' } }, { kind: 'Optional', inner: { kind: 'Text' } }),
    ).toBe(true);
    expect(
      sameType({ kind: 'Optional', inner: { kind: 'Text' } }, { kind: 'Optional', inner: { kind: 'Hash' } }),
    ).toBe(false);
    expect(
      sameType({ kind: 'Reference', collection: 'a' }, { kind: 'Reference', collection: 'b' }),
    ).toBe(false);
    expect(
      sameType({ kind: 'Reference', collection: 'a' }, { kind: 'Reference', collection: 'a' }),
    ).toBe(true);
  });
});

describe('splitting text into tokens', () => {
  it('keeps a character outside the symbol list as its own token', () => {
    const tokens = tokenise('a # b');
    expect(tokens.map((token) => [token.kind, token.text, token.at, token.to])).toEqual([
      ['name', 'a', 0, 1],
      ['symbol', '#', 2, 3],
      ['name', 'b', 4, 5],
      ['end', '', 5, 5],
    ]);
  });
});

describe('reading faults', () => {
  it('names the end of the formula where a closing bracket belongs', () => {
    expect(readFormula('(1 + 2').fault).toEqual({
      at: 6,
      to: 6,
      message: 'Cerulea reads the end of the formula where ) belongs.',
      fix: 'Type ) here.',
    });
  });

  it('names the token that stands where then belongs', () => {
    expect(readFormula('if true 1 else 2').fault).toEqual({
      at: 8,
      to: 9,
      message: 'Cerulea reads "1" where then belongs.',
      fix: 'Type then here.',
    });
  });

  it('names a formula that stops early', () => {
    expect(readFormula('1 +').fault).toEqual({
      at: 3,
      to: 3,
      message: 'The formula stops early.',
      fix: 'Complete the formula, for example amount > 0.',
    });
  });

  it('asks for a field name after the stop', () => {
    expect(readFormula('record.1').fault).toEqual({
      at: 7,
      to: 8,
      message: 'A field name belongs after the stop.',
      fix: 'Type the name of a field, for example record.amount.',
    });
  });

  it('names a token that cannot open a value', () => {
    expect(readFormula(')').fault).toEqual({
      at: 0,
      to: 1,
      message: 'Cerulea does not read ")" here.',
      fix: 'Remove it, or replace it with a name, a number or a run of text in quotation marks.',
    });
  });

  it('names text left over after the formula ends', () => {
    expect(readFormula('amount # 2').fault).toEqual({
      at: 7,
      to: 8,
      message: 'Cerulea reads "#" after the formula ends.',
      fix: 'Remove the extra text, or join it with and, or, or an arithmetic sign.',
    });
  });

  it('reads a leading minus as zero minus the value', () => {
    expect(readFormula('-amount').expression).toEqual(
      call('subtract', literal({ kind: 'Integer', value: 0 }), { kind: 'Param', name: 'amount' }),
    );
  });
});

describe('type faults span the whole formula', () => {
  const cases: Array<[string, string, string]> = [
    [
      'amount * price',
      'The multiplication holds a whole number on the left and a decimal with 2 places on the right.',
      'Give both sides a whole number, or give both sides a decimal.',
    ],
    [
      'amount < label',
      'The ordering holds a whole number on the left and text on the right.',
      'Order two values sharing one type.',
    ],
    [
      'coalesce(maybe, 5)',
      'coalesce holds text that may be absent first and a whole number second.',
      'Give the fallback the same type as the value.',
    ],
    ['hash(amount)', 'The hash reads a whole number.', 'Hash a run of text or a run of bytes.'],
    [
      'to_text(label)',
      'to_text reads text.',
      'Write a whole number, a decimal, a truth value, an identity or a hash as text.',
    ],
    [
      'to_integer(amount)',
      'The value carries a whole number and to_integer takes text.',
      'Give to_integer text here.',
    ],
    [
      'to_decimal(label, label)',
      'The value carries text and to_decimal takes a whole number.',
      'Give to_decimal a whole number here.',
    ],
    ['ghost.amount', 'The field read sits on a reference to ghosts.', 'Read a field out of a record value.'],
    ['other_ref.amount', 'The field read sits on a reference to archive.', 'Read a field out of a record value.'],
    [
      'ref = other_ref',
      'The comparison holds a reference to berths on the left and a reference to archive on the right.',
      'Compare two values sharing one type.',
    ],
  ];

  it.each(cases)('%s', (text, message, fix) => {
    expect(readAndCheck(text, scope).fault).toEqual({ at: 0, to: text.length, message, fix });
  });

  it('suggests the names this screen offers when the scope holds none', () => {
    expect(readAndCheck('amount', empty).fault?.fix).toBe('Use one of the names this screen offers.');
  });
});

describe('type rules that pass', () => {
  const cases: Array<[string, TypeExpression]> = [
    ['coalesce(maybe, "none")', { kind: 'Text' }],
    ['coalesce(label, "none")', { kind: 'Text' }],
    ['hash(blob)', { kind: 'Hash' }],
    ['hash("words")', { kind: 'Hash' }],
    ['to_text(who)', { kind: 'Text' }],
    ['to_integer(label)', { kind: 'Integer' }],
    ['to_decimal(label, 2)', { kind: 'Decimal', scale: 2 }],
    ['ref.amount', { kind: 'Integer' }],
    ['ledger = ledger', { kind: 'Boolean' }],
    ['maybe = maybe', { kind: 'Boolean' }],
    ['ref = ref', { kind: 'Boolean' }],
    ['1.5 + 2.5', { kind: 'Decimal', scale: 1 }],
  ];

  it.each(cases)('%s', (text, type) => {
    const reading = readAndCheck(text, scope);
    expect(reading.fault).toBeUndefined();
    expect(reading.type).toEqual(type);
  });
});

describe('working out literal values', () => {
  const cases: Array<[string, LiteralValue | undefined]> = [
    ['7 - 10', { kind: 'Integer', value: -3 }],
    ['7 / 2', { kind: 'Integer', value: 3 }],
    ['-7 / 2', { kind: 'Integer', value: -3 }],
    ['7 % 3', { kind: 'Integer', value: 1 }],
    ['7 / 0', undefined],
    ['7 % 0', undefined],
    ['- 3', { kind: 'Integer', value: -3 }],
    ['"a" = "a"', { kind: 'Boolean', value: true }],
    ['1 <> 2', { kind: 'Boolean', value: true }],
    ['1 = 2', { kind: 'Boolean', value: false }],
    ['3 <= 3', { kind: 'Boolean', value: true }],
    ['4 > 3', { kind: 'Boolean', value: true }],
    ['2 >= 3', { kind: 'Boolean', value: false }],
    ['"b" < "a"', { kind: 'Boolean', value: false }],
    ['true and false', { kind: 'Boolean', value: false }],
    ['true or false', { kind: 'Boolean', value: true }],
    ['not true', { kind: 'Boolean', value: false }],
    ['starts_with("harbour", "har")', { kind: 'Boolean', value: true }],
    ['starts_with("harbour", "bour")', { kind: 'Boolean', value: false }],
    ['to_text(12)', { kind: 'Text', value: '12' }],
    ['to_text(true)', { kind: 'Text', value: 'true' }],
    ['to_integer("42")', { kind: 'Integer', value: 42 }],
    ['to_integer("x")', undefined],
    ['hash("a")', undefined],
    ['1.5 + 2.5', undefined],
    ['amount + 1', undefined],
  ];

  it.each(cases)('%s', (text, value) => {
    const reading = readAndCheck(text, scope);
    expect(reading.fault).toBeUndefined();
    expect(reading.value).toEqual(value);
  });

  it('answers with no value where the literal kinds do not suit the operation', () => {
    const one = literal({ kind: 'Integer', value: 1 });
    const text = literal({ kind: 'Text', value: '1' });
    const yes = literal({ kind: 'Boolean', value: true });
    expect(evaluateLiteral(call('less_than', one, text))).toBeUndefined();
    expect(evaluateLiteral(call('and', one, yes))).toBeUndefined();
    expect(evaluateLiteral(call('or', yes, text))).toBeUndefined();
    expect(evaluateLiteral(call('not', one))).toBeUndefined();
    expect(evaluateLiteral(call('concat', one, text))).toBeUndefined();
    expect(evaluateLiteral(call('length', one))).toBeUndefined();
    expect(evaluateLiteral(call('contains', text, one))).toBeUndefined();
    expect(evaluateLiteral(call('starts_with', one, text))).toBeUndefined();
    expect(evaluateLiteral(call('to_integer', one))).toBeUndefined();
    expect(evaluateLiteral({ kind: 'If', condition: one, when_true: one, when_false: text } as Expression)).toBeUndefined();
    expect(evaluateLiteral(call('to_text', literal({ kind: 'Empty' })))).toEqual({ kind: 'Text', value: '' });
  });
});

describe('describing values', () => {
  it('writes a decimal with no places as its digits', () => {
    expect(describeValue({ kind: 'Decimal', value: '5', scale: 0 })).toBe('5');
  });

  it('pads a decimal smaller than one with zeros', () => {
    expect(describeValue({ kind: 'Decimal', value: '5', scale: 2 })).toBe('0.05');
  });

  it('states no value for kinds with no plain spelling', () => {
    expect(describeValue({ kind: 'Empty' })).toBe('no value');
    expect(describeValue({ kind: 'Timestamp', value: '2026-09-30T00:00:00Z' })).toBe('no value');
  });
});

describe('completions', () => {
  it('offers nothing after a stop that follows a broken path', () => {
    expect(completionsAt('record..', 8, scope)).toEqual([]);
  });

  it('offers the fields of the record a reference points at', () => {
    expect(completionsAt('ref.', 4, scope)).toEqual([
      { insert: 'amount', label: 'amount', plain: 'The amount of this record.', kind: 'field' },
      { insert: 'label', label: 'label', plain: 'The label.', kind: 'field' },
    ]);
  });
});

describe('writing an expression back', () => {
  it('writes an unknown part as empty text', () => {
    expect(writeFormula({ kind: 'Mystery' } as unknown as Expression)).toBe('');
  });

  it('writes a leading minus as a bracketed subtraction from zero', () => {
    expect(writeFormula(readFormula('-amount').expression!)).toBe('(0 - amount)');
  });

  it('writes a two value function with its name', () => {
    const expression = readFormula('to_decimal(label, 2)').expression!;
    expect(writeFormula(expression)).toBe('to_decimal(label, 2)');
  });
});
