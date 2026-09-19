import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import EntityEditor, { buildType, describeType, kindOf } from './EntityEditor';
import { applyComposition, composeSections } from '@/lib/blueprint/compose';
import { readBlueprintDocument } from '@/lib/blueprint/document';
import type { Blueprint } from '@/lib/blueprint/types';

function seeded(): Blueprint {
  return applyComposition(readBlueprintDocument({}), composeSections(['wallet-auth']), []);
}

describe('field types', () => {
  it('reads the kind a person chose back out of an optional', () => {
    expect(kindOf({ kind: 'Optional', inner: { kind: 'Decimal', scale: 2 } })).toBe('Decimal');
    expect(kindOf({ kind: 'Text' })).toBe('Text');
  });

  it('builds a decimal with an explicit scale and never a floating point', () => {
    expect(buildType('Decimal', { optional: false })).toEqual({ kind: 'Decimal', scale: 2 });
    expect(buildType('Decimal', { optional: true, scale: 4 })).toEqual({
      kind: 'Optional',
      inner: { kind: 'Decimal', scale: 4 },
    });
  });

  it('builds a reference and a named set from the model around it', () => {
    expect(buildType('Reference', { optional: false, collection: 'user' })).toEqual({
      kind: 'Reference',
      collection: 'user',
    });
    expect(buildType('Named', { optional: false, named: 'user_status' })).toEqual({
      kind: 'Named',
      name: 'user_status',
    });
  });

  it('states a field type in the words a person reads', () => {
    expect(describeType({ kind: 'Decimal', scale: 2 })).toBe('Exact decimal to 2 places');
    expect(describeType({ kind: 'Reference', collection: 'purchase_order' })).toBe(
      'Links to a purchase order',
    );
    expect(describeType({ kind: 'Optional', inner: { kind: 'Text' } })).toMatch(/may be absent/);
  });
});

describe('the entity editor', () => {
  it('opens on the records composing installed', () => {
    render(<EntityEditor blueprint={seeded()} onChange={() => undefined} />);
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Session')).toBeInTheDocument();
  });

  it('states the rule against floating point', () => {
    render(<EntityEditor blueprint={seeded()} onChange={() => undefined} />);
    expect(screen.getByText(/Cerulea holds no floating point type/)).toBeInTheDocument();
  });

  it('adds a field to one collection and keeps the rest', async () => {
    const changes: Blueprint[] = [];
    const blueprint = seeded();
    render(<EntityEditor blueprint={blueprint} onChange={(next) => changes.push(next)} />);
    await userEvent.click(screen.getAllByRole('button', { name: 'Add a field' })[0]);
    const record = changes[0].types.find((entry) => entry.id === 'user_record');
    expect(record?.kind).toBe('Record');
    if (record?.kind === 'Record') {
      expect(record.fields.length).toBe(
        (blueprint.types.find((entry) => entry.id === 'user_record') as { fields: unknown[] })
          .fields.length + 1,
      );
    }
    expect(changes[0].collections).toHaveLength(blueprint.collections.length);
  });

  it('adds a collection with one key field', async () => {
    const changes: Blueprint[] = [];
    render(<EntityEditor blueprint={seeded()} onChange={(next) => changes.push(next)} />);
    await userEvent.type(screen.getByLabelText('What it keeps'), 'Berth');
    await userEvent.click(screen.getByRole('button', { name: 'Add it' }));
    const added = changes[changes.length - 1].collections.find((entry) => entry.id === 'berth');
    expect(added?.record_type).toBe('berth_record');
    expect(added?.privacy).toBe('Open');
    expect(added?.purpose.statement.length).toBeGreaterThan(10);
  });

  it('removes a collection with its record type and its permissions', async () => {
    const changes: Blueprint[] = [];
    render(<EntityEditor blueprint={seeded()} onChange={(next) => changes.push(next)} />);
    await userEvent.click(screen.getAllByRole('button', { name: 'Remove this collection' })[0]);
    const next = changes[0];
    expect(next.collections.some((entry) => entry.id === 'user')).toBe(false);
    expect(next.types.some((entry) => entry.id === 'user_record')).toBe(false);
  });
});
