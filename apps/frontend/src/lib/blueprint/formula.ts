// apps/frontend/src/lib/blueprint/formula.ts
// The Blueprint expression language, as the formula bar reads and writes it.
//
// The authority for the type rules is the Rust crate at
// chain/cerulea-blueprint/src/expression.rs. Studio and the chain live in
// separate repositories, so the rules are mirrored rather than imported. Every
// rule below states the rule it mirrors.
//
// Addition, subtraction and division take two whole numbers, or two decimals
// sharing one scale. Multiplication of two decimals adds the two scales, and
// a product above thirty places is refused. The remainder takes two whole
// numbers. Equality takes two values of one type. Ordering takes two values of
// one type that carry a total order. Conjunction and disjunction take two
// truth values. A condition carries a truth value and both branches of a
// conditional carry one type.
//
// Floating point never appears. A decimal carries an explicit scale, since
// agreement across nodes needs exact arithmetic.
//
// Without this module a person would write a rule with no check until the
// compiler refused the whole Blueprint.

import type {
  Blueprint,
  Expression,
  LiteralValue,
  Operator,
  RecordTypeDefinition,
  TypeExpression,
} from './types';

/** The greatest number of decimal places a value carries. */
export const MAX_DECIMAL_SCALE = 30;

/** One name a formula may read, with the type it carries. */
export type ScopeName = {
  name: string;
  type: TypeExpression;
  /** One sentence stating what this name holds. */
  plain: string;
};

export type FormulaScope = {
  names: ScopeName[];
  /** Every record type the Blueprint declares, by identifier. */
  records: Map<string, RecordTypeDefinition>;
  /** Every collection, with the record type it keeps. */
  collections: Map<string, string>;
};

export type FormulaFault = {
  /** The character the fault starts at. */
  at: number;
  /** The character the fault ends at. */
  to: number;
  message: string;
  fix: string;
};

export type FormulaReading = {
  /** The expression the text parsed to, absent while a fault stands. */
  expression?: Expression;
  /** The type the expression carries, absent while a fault stands. */
  type?: TypeExpression;
  /** The value, where every part of the expression is a literal. */
  value?: LiteralValue;
  fault?: FormulaFault;
};

/* Types in plain words ------------------------------------------------ */

/** States one type in the words a person reads. Mirrors TypeExpr::describe. */
export function describeType(type: TypeExpression): string {
  switch (type.kind) {
    case 'Text':
      return 'text';
    case 'Integer':
      return 'a whole number';
    case 'Boolean':
      return 'a truth value';
    case 'Bytes':
      return 'a run of bytes';
    case 'Timestamp':
      return 'a moment in time';
    case 'Identity':
      return 'an identity';
    case 'Hash':
      return 'a hash';
    case 'Decimal':
      return `a decimal with ${type.scale} places`;
    case 'List':
      return `a list of ${describeType(type.element)}`;
    case 'Map':
      return `a map from ${describeType(type.key)} to ${describeType(type.value)}`;
    case 'Optional':
      return `${describeType(type.inner)} that may be absent`;
    case 'Reference':
      return `a reference to ${type.collection}`;
    case 'Named':
      return `the type ${type.name}`;
    default:
      return 'a value';
  }
}

/** Reports whether two types match exactly. */
export function sameType(left: TypeExpression, right: TypeExpression): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === 'Decimal' && right.kind === 'Decimal') return left.scale === right.scale;
  if (left.kind === 'List' && right.kind === 'List') return sameType(left.element, right.element);
  if (left.kind === 'Map' && right.kind === 'Map') {
    return sameType(left.key, right.key) && sameType(left.value, right.value);
  }
  if (left.kind === 'Optional' && right.kind === 'Optional') {
    return sameType(left.inner, right.inner);
  }
  if (left.kind === 'Reference' && right.kind === 'Reference') {
    return left.collection === right.collection;
  }
  if (left.kind === 'Named' && right.kind === 'Named') return left.name === right.name;
  return true;
}

/**
 * Reports whether a type carries a total order.
 * Mirrors TypeExpr::is_key_safe. Ordering reaches whole numbers, decimals,
 * text, bytes, timestamps, identities and hashes.
 */
export function carriesOrder(type: TypeExpression): boolean {
  return ['Integer', 'Decimal', 'Text', 'Bytes', 'Timestamp', 'Identity', 'Hash'].includes(
    type.kind,
  );
}

/* The function set ---------------------------------------------------- */

export type FormulaFunction = {
  name: string;
  operator: Operator;
  arity: number;
  /** One sentence stating what this function does. */
  plain: string;
  /** The shape a person types, for the completion list. */
  shape: string;
};

/**
 * Every function the formula bar offers.
 * The set mirrors the Blueprint operator list. now and caller mirror
 * Builtin::Now and Builtin::Caller, hash mirrors Builtin::HashOf, add_seconds
 * mirrors Builtin::TimestampPlus and difference_seconds mirrors
 * Builtin::TimestampSince.
 */
export const FORMULA_FUNCTIONS: FormulaFunction[] = [
  {
    name: 'now',
    operator: 'coalesce',
    arity: 0,
    plain: 'The moment the Blockchain stamped on this transaction.',
    shape: 'now()',
  },
  {
    name: 'caller',
    operator: 'coalesce',
    arity: 0,
    plain: 'The identity that submitted this transaction.',
    shape: 'caller()',
  },
  {
    name: 'length',
    operator: 'length',
    arity: 1,
    plain: 'The number of characters in a run of text.',
    shape: 'length(text)',
  },
  {
    name: 'contains',
    operator: 'contains',
    arity: 2,
    plain: 'Whether the first run of text holds the second run inside it.',
    shape: 'contains(text, part)',
  },
  {
    name: 'starts_with',
    operator: 'starts_with',
    arity: 2,
    plain: 'Whether the first run of text opens with the second run.',
    shape: 'starts_with(text, opening)',
  },
  {
    name: 'concat',
    operator: 'concat',
    arity: 2,
    plain: 'Joins two runs of text into one.',
    shape: 'concat(left, right)',
  },
  {
    name: 'is_present',
    operator: 'is_present',
    arity: 1,
    plain: 'Whether a value that may be absent carries something.',
    shape: 'is_present(value)',
  },
  {
    name: 'coalesce',
    operator: 'coalesce',
    arity: 2,
    plain: 'The first value, or the second where the first is absent.',
    shape: 'coalesce(value, fallback)',
  },
  {
    name: 'hash',
    operator: 'hash',
    arity: 1,
    plain: 'The Blueprint hash of a run of text or a run of bytes.',
    shape: 'hash(value)',
  },
  {
    name: 'to_text',
    operator: 'to_text',
    arity: 1,
    plain: 'Writes a whole number, a decimal or a truth value as text.',
    shape: 'to_text(value)',
  },
  {
    name: 'to_integer',
    operator: 'to_integer',
    arity: 1,
    plain: 'Reads a whole number out of text.',
    shape: 'to_integer(text)',
  },
  {
    name: 'to_decimal',
    operator: 'to_decimal',
    arity: 2,
    plain: 'Reads a decimal out of text at the number of places given.',
    shape: 'to_decimal(text, places)',
  },
  {
    name: 'add_seconds',
    operator: 'add_seconds',
    arity: 2,
    plain: 'A moment moved forward by a number of seconds.',
    shape: 'add_seconds(moment, seconds)',
  },
  {
    name: 'difference_seconds',
    operator: 'difference_seconds',
    arity: 2,
    plain: 'The seconds between an earlier moment and a later moment.',
    shape: 'difference_seconds(later, earlier)',
  },
];

const FUNCTION_BY_NAME = new Map(FORMULA_FUNCTIONS.map((entry) => [entry.name, entry]));

/* The reader ---------------------------------------------------------- */

type TokenKind =
  | 'name'
  | 'integer'
  | 'decimal'
  | 'text'
  | 'symbol'
  | 'end';

type Token = { kind: TokenKind; text: string; at: number; to: number; scale?: number };

const SYMBOLS = ['<=', '>=', '<>', '(', ')', ',', '+', '-', '*', '/', '%', '=', '<', '>', '.'];

/** Splits the formula text into tokens. */
export function tokenise(text: string): Token[] {
  const tokens: Token[] = [];
  let at = 0;
  while (at < text.length) {
    const character = text[at];
    if (/\s/.test(character)) {
      at += 1;
      continue;
    }
    if (character === '"') {
      let to = at + 1;
      while (to < text.length && text[to] !== '"') to += 1;
      tokens.push({ kind: 'text', text: text.slice(at + 1, to), at, to: Math.min(to + 1, text.length) });
      at = to + 1;
      continue;
    }
    if (/[0-9]/.test(character)) {
      let to = at;
      while (to < text.length && /[0-9]/.test(text[to])) to += 1;
      if (text[to] === '.' && /[0-9]/.test(text[to + 1] ?? '')) {
        const point = to;
        to += 1;
        while (to < text.length && /[0-9]/.test(text[to])) to += 1;
        tokens.push({
          kind: 'decimal',
          text: text.slice(at, to),
          at,
          to,
          scale: to - point - 1,
        });
      } else {
        tokens.push({ kind: 'integer', text: text.slice(at, to), at, to });
      }
      at = to;
      continue;
    }
    if (/[A-Za-z_]/.test(character)) {
      let to = at;
      while (to < text.length && /[A-Za-z0-9_]/.test(text[to])) to += 1;
      tokens.push({ kind: 'name', text: text.slice(at, to), at, to });
      at = to;
      continue;
    }
    const symbol = SYMBOLS.find((entry) => text.startsWith(entry, at));
    if (symbol) {
      tokens.push({ kind: 'symbol', text: symbol, at, to: at + symbol.length });
      at += symbol.length;
      continue;
    }
    tokens.push({ kind: 'symbol', text: character, at, to: at + 1 });
    at += 1;
  }
  tokens.push({ kind: 'end', text: '', at: text.length, to: text.length });
  return tokens;
}

class ReadFailure extends Error {
  readonly fault: FormulaFault;
  constructor(fault: FormulaFault) {
    super(fault.message);
    this.fault = fault;
  }
}

const BINARY_BY_SYMBOL: Record<string, { operator: Operator; strength: number }> = {
  or: { operator: 'or', strength: 1 },
  and: { operator: 'and', strength: 2 },
  '=': { operator: 'equal', strength: 3 },
  '<>': { operator: 'not_equal', strength: 3 },
  '<': { operator: 'less_than', strength: 4 },
  '<=': { operator: 'less_or_equal', strength: 4 },
  '>': { operator: 'greater_than', strength: 4 },
  '>=': { operator: 'greater_or_equal', strength: 4 },
  '+': { operator: 'add', strength: 5 },
  '-': { operator: 'subtract', strength: 5 },
  '*': { operator: 'multiply', strength: 6 },
  '/': { operator: 'divide', strength: 6 },
  '%': { operator: 'modulo', strength: 6 },
};

class Reader {
  private index = 0;

  constructor(private readonly tokens: Token[]) {}

  private peek(): Token {
    return this.tokens[this.index];
  }

  private take(): Token {
    const held = this.tokens[this.index];
    this.index += 1;
    return held;
  }

  private expect(text: string): Token {
    const held = this.peek();
    if (held.text !== text) {
      throw new ReadFailure({
        at: held.at,
        to: held.to,
        message: `Cerulea reads ${held.kind === 'end' ? 'the end of the formula' : `"${held.text}"`} where ${text} belongs.`,
        fix: `Type ${text} here.`,
      });
    }
    return this.take();
  }

  read(strength = 0): Expression {
    let left = this.readUnit();
    for (;;) {
      const held = this.peek();
      const rule = BINARY_BY_SYMBOL[held.text];
      if (!rule || rule.strength <= strength) break;
      this.take();
      const right = this.read(rule.strength);
      left = { kind: 'Call', operator: rule.operator, arguments: [left, right] };
    }
    return left;
  }

  private readUnit(): Expression {
    const held = this.peek();

    if (held.kind === 'end') {
      throw new ReadFailure({
        at: held.at,
        to: held.to,
        message: 'The formula stops early.',
        fix: 'Complete the formula, for example amount > 0.',
      });
    }

    if (held.text === 'not') {
      this.take();
      return { kind: 'Call', operator: 'not', arguments: [this.read(7)] };
    }

    if (held.text === '-') {
      this.take();
      return {
        kind: 'Call',
        operator: 'subtract',
        arguments: [
          { kind: 'Literal', value: { kind: 'Integer', value: 0 } },
          this.read(7),
        ],
      };
    }

    if (held.text === 'if') {
      this.take();
      const condition = this.read(0);
      this.expect('then');
      const whenTrue = this.read(0);
      this.expect('else');
      const whenFalse = this.read(0);
      return { kind: 'If', condition, when_true: whenTrue, when_false: whenFalse };
    }

    if (held.text === '(') {
      this.take();
      const inner = this.read(0);
      this.expect(')');
      return inner;
    }

    if (held.kind === 'integer') {
      this.take();
      return { kind: 'Literal', value: { kind: 'Integer', value: Number(held.text) } };
    }

    if (held.kind === 'decimal') {
      this.take();
      return {
        kind: 'Literal',
        value: {
          kind: 'Decimal',
          value: held.text.replace('.', ''),
          scale: held.scale ?? 0,
        },
      };
    }

    if (held.kind === 'text') {
      this.take();
      return { kind: 'Literal', value: { kind: 'Text', value: held.text } };
    }

    if (held.kind === 'name') {
      this.take();
      if (held.text === 'true' || held.text === 'false') {
        return { kind: 'Literal', value: { kind: 'Boolean', value: held.text === 'true' } };
      }
      if (this.peek().text === '(') {
        return this.readCall(held);
      }
      let base: Expression = { kind: 'Param', name: held.text };
      while (this.peek().text === '.') {
        this.take();
        const field = this.peek();
        if (field.kind !== 'name') {
          throw new ReadFailure({
            at: field.at,
            to: field.to,
            message: 'A field name belongs after the stop.',
            fix: 'Type the name of a field, for example record.amount.',
          });
        }
        this.take();
        base = { kind: 'Field', target: base, field: field.text };
      }
      return base;
    }

    throw new ReadFailure({
      at: held.at,
      to: held.to,
      message: `Cerulea does not read "${held.text}" here.`,
      fix: 'Remove it, or replace it with a name, a number or a run of text in quotation marks.',
    });
  }

  private readCall(name: Token): Expression {
    const held = FUNCTION_BY_NAME.get(name.text);
    this.expect('(');
    const args: Expression[] = [];
    if (this.peek().text !== ')') {
      args.push(this.read(0));
      while (this.peek().text === ',') {
        this.take();
        args.push(this.read(0));
      }
    }
    const close = this.expect(')');
    if (held === undefined) {
      throw new ReadFailure({
        at: name.at,
        to: close.to,
        message: `Cerulea holds no function named ${name.text}.`,
        fix: `Use one of ${FORMULA_FUNCTIONS.map((entry) => entry.name).join(', ')}.`,
      });
    }
    if (args.length !== held.arity) {
      throw new ReadFailure({
        at: name.at,
        to: close.to,
        message: `${held.name} takes ${held.arity} ${held.arity === 1 ? 'value' : 'values'} and reads ${args.length}.`,
        fix: `Write it as ${held.shape}.`,
      });
    }
    if (name.text === 'now') return { kind: 'Now' };
    if (name.text === 'caller') return { kind: 'Caller' };
    return { kind: 'Call', operator: held.operator, arguments: args };
  }

  atEnd(): Token {
    return this.peek();
  }
}

/** Reads the formula text into a Blueprint expression. */
export function readFormula(text: string): { expression?: Expression; fault?: FormulaFault } {
  if (text.trim().length === 0) {
    return {
      fault: {
        at: 0,
        to: 0,
        message: 'The formula is empty.',
        fix: 'Write a formula, for example amount > 0.',
      },
    };
  }
  const reader = new Reader(tokenise(text));
  try {
    const expression = reader.read(0);
    const rest = reader.atEnd();
    if (rest.kind !== 'end') {
      return {
        fault: {
          at: rest.at,
          to: rest.to,
          message: `Cerulea reads "${rest.text}" after the formula ends.`,
          fix: 'Remove the extra text, or join it with and, or, or an arithmetic sign.',
        },
      };
    }
    return { expression };
  } catch (cause) {
    if (cause instanceof ReadFailure) return { fault: cause.fault };
    throw cause;
  }
}

/* The type checker ---------------------------------------------------- */

function typeOfLiteral(value: LiteralValue): TypeExpression {
  switch (value.kind) {
    case 'Text':
      return { kind: 'Text' };
    case 'Integer':
      return { kind: 'Integer' };
    case 'Boolean':
      return { kind: 'Boolean' };
    case 'Decimal':
      return { kind: 'Decimal', scale: value.scale };
    case 'Timestamp':
      return { kind: 'Timestamp' };
    case 'Identity':
      return { kind: 'Identity' };
    case 'Hash':
      return { kind: 'Hash' };
    default:
      return { kind: 'Optional', inner: { kind: 'Text' } };
  }
}

function fault(message: string, fix: string): FormulaFault {
  return { at: 0, to: 0, message, fix };
}

class TypeFailure extends Error {
  readonly fault: FormulaFault;
  constructor(held: FormulaFault) {
    super(held.message);
    this.fault = held;
  }
}

function recordOf(scope: FormulaScope, type: TypeExpression): RecordTypeDefinition {
  if (type.kind === 'Named') {
    const held = scope.records.get(type.name);
    if (held) return held;
  }
  if (type.kind === 'Reference') {
    const recordId = scope.collections.get(type.collection);
    const held = recordId === undefined ? undefined : scope.records.get(recordId);
    if (held) return held;
  }
  throw new TypeFailure(
    fault(
      `The field read sits on ${describeType(type)}.`,
      'Read a field out of a record value.',
    ),
  );
}

function checkBinary(
  operator: Operator,
  left: TypeExpression,
  right: TypeExpression,
): TypeExpression {
  switch (operator) {
    case 'add':
    case 'subtract':
    case 'divide': {
      if (left.kind === 'Integer' && right.kind === 'Integer') return { kind: 'Integer' };
      if (left.kind === 'Decimal' && right.kind === 'Decimal' && left.scale === right.scale) {
        return { kind: 'Decimal', scale: left.scale };
      }
      throw new TypeFailure(
        fault(
          `The ${operator} holds ${describeType(left)} on the left and ${describeType(right)} on the right.`,
          'Give both sides a whole number, or two decimals with the same number of places.',
        ),
      );
    }
    case 'multiply': {
      if (left.kind === 'Integer' && right.kind === 'Integer') return { kind: 'Integer' };
      if (left.kind === 'Decimal' && right.kind === 'Decimal') {
        const scale = left.scale + right.scale;
        if (scale > MAX_DECIMAL_SCALE) {
          throw new TypeFailure(
            fault(
              `The product carries ${scale} places, above the maximum of ${MAX_DECIMAL_SCALE}.`,
              'Lower the places on one side before the multiplication.',
            ),
          );
        }
        return { kind: 'Decimal', scale };
      }
      throw new TypeFailure(
        fault(
          `The multiplication holds ${describeType(left)} on the left and ${describeType(right)} on the right.`,
          'Give both sides a whole number, or give both sides a decimal.',
        ),
      );
    }
    case 'modulo': {
      if (left.kind === 'Integer' && right.kind === 'Integer') return { kind: 'Integer' };
      throw new TypeFailure(
        fault(
          `The remainder holds ${describeType(left)} on the left and ${describeType(right)} on the right.`,
          'Give both sides a whole number.',
        ),
      );
    }
    case 'equal':
    case 'not_equal': {
      if (sameType(left, right)) return { kind: 'Boolean' };
      throw new TypeFailure(
        fault(
          `The comparison holds ${describeType(left)} on the left and ${describeType(right)} on the right.`,
          'Compare two values sharing one type.',
        ),
      );
    }
    case 'less_than':
    case 'less_or_equal':
    case 'greater_than':
    case 'greater_or_equal': {
      if (sameType(left, right) === false) {
        throw new TypeFailure(
          fault(
            `The ordering holds ${describeType(left)} on the left and ${describeType(right)} on the right.`,
            'Order two values sharing one type.',
          ),
        );
      }
      if (carriesOrder(left) === false) {
        throw new TypeFailure(
          fault(
            `The ordering sits on ${describeType(left)}, which carries no order.`,
            'Order whole numbers, decimals, text, bytes, moments, identities or hashes.',
          ),
        );
      }
      return { kind: 'Boolean' };
    }
    case 'and':
    case 'or': {
      if (left.kind === 'Boolean' && right.kind === 'Boolean') return { kind: 'Boolean' };
      throw new TypeFailure(
        fault(
          `The ${operator} holds ${describeType(left)} on the left and ${describeType(right)} on the right.`,
          'Give both sides a truth value.',
        ),
      );
    }
    default:
      throw new TypeFailure(
        fault(`Cerulea holds no rule for ${operator}.`, 'Use another operation.'),
      );
  }
}

function checkFunction(operator: Operator, args: TypeExpression[]): TypeExpression {
  const wants = (position: number, wanted: TypeExpression, name: string): void => {
    if (sameType(args[position], wanted) === false) {
      throw new TypeFailure(
        fault(
          `The value carries ${describeType(args[position])} and ${name} takes ${describeType(wanted)}.`,
          `Give ${name} ${describeType(wanted)} here.`,
        ),
      );
    }
  };
  switch (operator) {
    case 'not': {
      wants(0, { kind: 'Boolean' }, 'not');
      return { kind: 'Boolean' };
    }
    case 'length': {
      wants(0, { kind: 'Text' }, 'length');
      return { kind: 'Integer' };
    }
    case 'contains':
    case 'starts_with': {
      wants(0, { kind: 'Text' }, operator);
      wants(1, { kind: 'Text' }, operator);
      return { kind: 'Boolean' };
    }
    case 'concat': {
      wants(0, { kind: 'Text' }, 'concat');
      wants(1, { kind: 'Text' }, 'concat');
      return { kind: 'Text' };
    }
    case 'is_present': {
      if (args[0].kind !== 'Optional') {
        throw new TypeFailure(
          fault(
            `is_present reads ${describeType(args[0])}, which is always present.`,
            'Give is_present a value that may be absent.',
          ),
        );
      }
      return { kind: 'Boolean' };
    }
    case 'coalesce': {
      const inner = args[0].kind === 'Optional' ? args[0].inner : args[0];
      if (sameType(inner, args[1]) === false) {
        throw new TypeFailure(
          fault(
            `coalesce holds ${describeType(args[0])} first and ${describeType(args[1])} second.`,
            'Give the fallback the same type as the value.',
          ),
        );
      }
      return args[1];
    }
    case 'hash': {
      if (args[0].kind !== 'Text' && args[0].kind !== 'Bytes') {
        throw new TypeFailure(
          fault(
            `The hash reads ${describeType(args[0])}.`,
            'Hash a run of text or a run of bytes.',
          ),
        );
      }
      return { kind: 'Hash' };
    }
    case 'to_text': {
      if (['Integer', 'Decimal', 'Boolean', 'Identity', 'Hash'].includes(args[0].kind) === false) {
        throw new TypeFailure(
          fault(
            `to_text reads ${describeType(args[0])}.`,
            'Write a whole number, a decimal, a truth value, an identity or a hash as text.',
          ),
        );
      }
      return { kind: 'Text' };
    }
    case 'to_integer': {
      wants(0, { kind: 'Text' }, 'to_integer');
      return { kind: 'Integer' };
    }
    case 'to_decimal': {
      wants(0, { kind: 'Text' }, 'to_decimal');
      wants(1, { kind: 'Integer' }, 'to_decimal');
      return { kind: 'Decimal', scale: 2 };
    }
    case 'add_seconds': {
      wants(0, { kind: 'Timestamp' }, 'add_seconds');
      wants(1, { kind: 'Integer' }, 'add_seconds');
      return { kind: 'Timestamp' };
    }
    case 'difference_seconds': {
      wants(0, { kind: 'Timestamp' }, 'difference_seconds');
      wants(1, { kind: 'Timestamp' }, 'difference_seconds');
      return { kind: 'Integer' };
    }
    default:
      throw new TypeFailure(
        fault(`Cerulea holds no rule for ${operator}.`, 'Use another operation.'),
      );
  }
}

const BINARY_OPERATORS: Operator[] = [
  'add',
  'subtract',
  'multiply',
  'divide',
  'modulo',
  'equal',
  'not_equal',
  'less_than',
  'less_or_equal',
  'greater_than',
  'greater_or_equal',
  'and',
  'or',
];

function checkExpression(expression: Expression, scope: FormulaScope): TypeExpression {
  switch (expression.kind) {
    case 'Literal':
      return typeOfLiteral(expression.value);
    case 'Now':
      return { kind: 'Timestamp' };
    case 'Caller':
      return { kind: 'Identity' };
    case 'Param': {
      const held = scope.names.find((entry) => entry.name === expression.name);
      if (held === undefined) {
        throw new TypeFailure(
          fault(
            `Cerulea holds no value named ${expression.name} here.`,
            `Use one of ${scope.names.map((entry) => entry.name).join(', ') || 'the names this screen offers'}.`,
          ),
        );
      }
      return held.type;
    }
    case 'Field': {
      const base = checkExpression(expression.target, scope);
      const record = recordOf(scope, base);
      const field = record.fields.find((entry) => entry.name === expression.field);
      if (field === undefined) {
        throw new TypeFailure(
          fault(
            `That record holds no field named ${expression.field}.`,
            `Read one of ${record.fields.map((entry) => entry.name).join(', ')}.`,
          ),
        );
      }
      return field.required ? field.type : { kind: 'Optional', inner: field.type };
    }
    case 'If': {
      const condition = checkExpression(expression.condition, scope);
      if (condition.kind !== 'Boolean') {
        throw new TypeFailure(
          fault(
            `The condition carries ${describeType(condition)}.`,
            'Give the condition a truth value.',
          ),
        );
      }
      const whenTrue = checkExpression(expression.when_true, scope);
      const whenFalse = checkExpression(expression.when_false, scope);
      if (sameType(whenTrue, whenFalse) === false) {
        throw new TypeFailure(
          fault(
            `One branch carries ${describeType(whenTrue)} and the other carries ${describeType(whenFalse)}.`,
            'Give both branches one type.',
          ),
        );
      }
      return whenTrue;
    }
    case 'Call': {
      const args = expression.arguments.map((entry) => checkExpression(entry, scope));
      if (BINARY_OPERATORS.includes(expression.operator)) {
        return checkBinary(expression.operator, args[0], args[1]);
      }
      return checkFunction(expression.operator, args);
    }
    default:
      throw new TypeFailure(
        fault(
          'The formula bar holds no rule for that part of the Blueprint language.',
          'Write the part in the record editor instead.',
        ),
      );
  }
}

/* Literal evaluation --------------------------------------------------- */

/**
 * Works out the value where every part of the formula is a literal.
 * A formula reading a field waits for a record, so it carries no value here.
 */
export function evaluateLiteral(expression: Expression): LiteralValue | undefined {
  if (expression.kind === 'Literal') return expression.value;
  if (expression.kind === 'If') {
    const condition = evaluateLiteral(expression.condition);
    if (condition?.kind !== 'Boolean') return undefined;
    return evaluateLiteral(condition.value ? expression.when_true : expression.when_false);
  }
  if (expression.kind !== 'Call') return undefined;
  const args = expression.arguments.map(evaluateLiteral);
  if (args.some((entry) => entry === undefined)) return undefined;
  const held = args as LiteralValue[];

  const asInteger = (value: LiteralValue): number | undefined =>
    value.kind === 'Integer' ? value.value : undefined;

  switch (expression.operator) {
    case 'add':
    case 'subtract':
    case 'multiply':
    case 'divide':
    case 'modulo': {
      const left = asInteger(held[0]);
      const right = asInteger(held[1]);
      if (left === undefined || right === undefined) return undefined;
      if ((expression.operator === 'divide' || expression.operator === 'modulo') && right === 0) {
        return undefined;
      }
      const outcome =
        expression.operator === 'add'
          ? left + right
          : expression.operator === 'subtract'
            ? left - right
            : expression.operator === 'multiply'
              ? left * right
              : expression.operator === 'divide'
                ? Math.trunc(left / right)
                : left % right;
      return { kind: 'Integer', value: outcome };
    }
    case 'equal':
    case 'not_equal': {
      const match = JSON.stringify(held[0]) === JSON.stringify(held[1]);
      return { kind: 'Boolean', value: expression.operator === 'equal' ? match : !match };
    }
    case 'less_than':
    case 'less_or_equal':
    case 'greater_than':
    case 'greater_or_equal': {
      const left = held[0];
      const right = held[1];
      if (left.kind !== right.kind) return undefined;
      const a = left.kind === 'Integer' ? left.value : String((left as { value: unknown }).value);
      const b = right.kind === 'Integer' ? right.value : String((right as { value: unknown }).value);
      const outcome =
        expression.operator === 'less_than'
          ? a < b
          : expression.operator === 'less_or_equal'
            ? a <= b
            : expression.operator === 'greater_than'
              ? a > b
              : a >= b;
      return { kind: 'Boolean', value: outcome };
    }
    case 'and':
    case 'or': {
      if (held[0].kind !== 'Boolean' || held[1].kind !== 'Boolean') return undefined;
      return {
        kind: 'Boolean',
        value:
          expression.operator === 'and'
            ? held[0].value && held[1].value
            : held[0].value || held[1].value,
      };
    }
    case 'not': {
      if (held[0].kind !== 'Boolean') return undefined;
      return { kind: 'Boolean', value: held[0].value === false };
    }
    case 'concat': {
      if (held[0].kind !== 'Text' || held[1].kind !== 'Text') return undefined;
      return { kind: 'Text', value: `${held[0].value}${held[1].value}` };
    }
    case 'length': {
      if (held[0].kind !== 'Text') return undefined;
      return { kind: 'Integer', value: held[0].value.length };
    }
    case 'contains': {
      if (held[0].kind !== 'Text' || held[1].kind !== 'Text') return undefined;
      return { kind: 'Boolean', value: held[0].value.includes(held[1].value) };
    }
    case 'starts_with': {
      if (held[0].kind !== 'Text' || held[1].kind !== 'Text') return undefined;
      return { kind: 'Boolean', value: held[0].value.startsWith(held[1].value) };
    }
    case 'to_text': {
      return { kind: 'Text', value: String((held[0] as { value?: unknown }).value ?? '') };
    }
    case 'to_integer': {
      if (held[0].kind !== 'Text') return undefined;
      const parsed = Number.parseInt(held[0].value, 10);
      return Number.isNaN(parsed) ? undefined : { kind: 'Integer', value: parsed };
    }
    default:
      return undefined;
  }
}

/** States one value in the words a person reads. */
export function describeValue(value: LiteralValue): string {
  switch (value.kind) {
    case 'Text':
      return `"${value.value}"`;
    case 'Integer':
      return String(value.value);
    case 'Boolean':
      return value.value ? 'true' : 'false';
    case 'Decimal': {
      const digits = value.value.padStart(value.scale + 1, '0');
      return value.scale === 0
        ? digits
        : `${digits.slice(0, digits.length - value.scale)}.${digits.slice(digits.length - value.scale)}`;
    }
    default:
      return 'no value';
  }
}

/* The whole reading ---------------------------------------------------- */

/** Reads the formula, checks its types and works out any literal value. */
export function readAndCheck(text: string, scope: FormulaScope): FormulaReading {
  const read = readFormula(text);
  if (read.fault || read.expression === undefined) return { fault: read.fault };
  try {
    const type = checkExpression(read.expression, scope);
    return {
      expression: read.expression,
      type,
      value: evaluateLiteral(read.expression),
    };
  } catch (cause) {
    if (cause instanceof TypeFailure) {
      return { fault: { ...cause.fault, at: 0, to: text.length } };
    }
    throw cause;
  }
}

/* Autocomplete --------------------------------------------------------- */

export type Completion = {
  /** The text to insert. */
  insert: string;
  /** The name a person reads in the list. */
  label: string;
  /** One sentence stating what this completion holds. */
  plain: string;
  kind: 'name' | 'field' | 'function' | 'word';
};

/** The words the language reserves, offered beside the names and functions. */
export const FORMULA_WORDS: Completion[] = [
  { insert: 'and', label: 'and', plain: 'Both sides hold.', kind: 'word' },
  { insert: 'or', label: 'or', plain: 'Either side holds.', kind: 'word' },
  { insert: 'not', label: 'not', plain: 'The reverse of a truth value.', kind: 'word' },
  { insert: 'if', label: 'if', plain: 'One value while a condition holds, another otherwise.', kind: 'word' },
  { insert: 'true', label: 'true', plain: 'The truth value that holds.', kind: 'word' },
  { insert: 'false', label: 'false', plain: 'The truth value that fails.', kind: 'word' },
];

/**
 * The completions that suit the caret position.
 * A caret after a stop offers the fields of the record on the left. Any other
 * caret offers the names in scope, the functions and the reserved words.
 */
export function completionsAt(text: string, caret: number, scope: FormulaScope): Completion[] {
  const before = text.slice(0, caret);
  const fieldRun = /([A-Za-z_][A-Za-z0-9_.]*)\.([A-Za-z0-9_]*)$/.exec(before);
  if (fieldRun) {
    const path = fieldRun[1];
    const partial = fieldRun[2];
    const read = readFormula(path);
    if (read.expression) {
      try {
        const base = checkExpression(read.expression, scope);
        const record = recordOf(scope, base);
        return record.fields
          .filter((field) => field.name.startsWith(partial))
          .map((field) => ({
            insert: field.name,
            label: field.name,
            plain: field.description || `The ${field.name} of this record.`,
            kind: 'field' as const,
          }));
      } catch {
        return [];
      }
    }
    return [];
  }

  const wordRun = /([A-Za-z_][A-Za-z0-9_]*)$/.exec(before);
  const partial = wordRun ? wordRun[1] : '';
  const offered: Completion[] = [
    ...scope.names.map((entry) => ({
      insert: entry.name,
      label: entry.name,
      plain: entry.plain,
      kind: 'name' as const,
    })),
    ...FORMULA_FUNCTIONS.map((entry) => ({
      insert: entry.name,
      label: entry.shape,
      plain: entry.plain,
      kind: 'function' as const,
    })),
    ...FORMULA_WORDS,
  ];
  return offered.filter((entry) => entry.insert.startsWith(partial));
}

/* The scope one screen offers ------------------------------------------ */

/**
 * The names a formula reads while a person edits one collection.
 * The record under edit answers to the name record. The caller and the moment
 * are always available.
 */
export function scopeForCollection(blueprint: Blueprint, collectionId: string): FormulaScope {
  const records = new Map<string, RecordTypeDefinition>();
  for (const type of blueprint.types) {
    if (type.kind === 'Record') records.set(type.id, type);
  }
  const collections = new Map(
    blueprint.collections.map((entry) => [entry.id, entry.record_type]),
  );
  const held = blueprint.collections.find((entry) => entry.id === collectionId);
  const names: ScopeName[] = [];
  if (held) {
    names.push({
      name: 'record',
      type: { kind: 'Named', name: held.record_type },
      plain: `The ${collectionId} record this formula runs against.`,
    });
  }
  return { names, records, collections };
}

/* Writing an expression back as text ----------------------------------- */

const SYMBOL_BY_OPERATOR: Partial<Record<Operator, string>> = {
  add: '+',
  subtract: '-',
  multiply: '*',
  divide: '/',
  modulo: '%',
  equal: '=',
  not_equal: '<>',
  less_than: '<',
  less_or_equal: '<=',
  greater_than: '>',
  greater_or_equal: '>=',
  and: 'and',
  or: 'or',
};

/**
 * Writes one expression back as formula text.
 * Reading that text answers with the same expression, so the bar round-trips.
 */
export function writeFormula(expression: Expression): string {
  switch (expression.kind) {
    case 'Literal':
      return expression.value.kind === 'Text'
        ? `"${expression.value.value}"`
        : describeValue(expression.value);
    case 'Param':
      return expression.name;
    case 'Field':
      return `${writeFormula(expression.target)}.${expression.field}`;
    case 'Now':
      return 'now()';
    case 'Caller':
      return 'caller()';
    case 'If':
      return `if ${writeFormula(expression.condition)} then ${writeFormula(expression.when_true)} else ${writeFormula(expression.when_false)}`;
    case 'Call': {
      const symbol = SYMBOL_BY_OPERATOR[expression.operator];
      if (symbol && expression.arguments.length === 2) {
        return `(${writeFormula(expression.arguments[0])} ${symbol} ${writeFormula(expression.arguments[1])})`;
      }
      if (expression.operator === 'not') {
        return `not ${writeFormula(expression.arguments[0])}`;
      }
      const named = FORMULA_FUNCTIONS.find(
        (entry) =>
          entry.operator === expression.operator && entry.arity === expression.arguments.length,
      );
      const name = named?.name ?? expression.operator;
      return `${name}(${expression.arguments.map(writeFormula).join(', ')})`;
    }
    default:
      return '';
  }
}
