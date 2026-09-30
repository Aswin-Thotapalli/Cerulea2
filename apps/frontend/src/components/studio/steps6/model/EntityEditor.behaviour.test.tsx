import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import EntityEditor, { buildType, describeType } from './EntityEditor';
import { applyComposition, composeSections } from '@/lib/blueprint/compose';
import { readBlueprintDocument } from '@/lib/blueprint/document';
import { PRIVACY_MEANING } from '@/lib/blueprint/edit';
import type { Blueprint, RecordField } from '@/lib/blueprint/types';

function seeded(): Blueprint {
  return applyComposition(readBlueprintDocument({}), composeSections(['wallet-auth']), []);
}

/** Holds the Blueprint in state so the editor redraws after each change. */
function Harness({ start, changes }: { start: Blueprint; changes: Blueprint[] }) {
  const [blueprint, setBlueprint] = useState(start);
  return (
    <EntityEditor
      blueprint={blueprint}
      onChange={(next) => {
        changes.push(next);
        setBlueprint(next);
      }}
    />
  );
}

function userFields(changes: Blueprint[]): RecordField[] {
  const record = changes[changes.length - 1].types.find((entry) => entry.id === 'user_record');
  return record?.kind === 'Record' ? record.fields : [];
}

async function pickIn(combobox: HTMLElement, option: string) {
  fireEvent.mouseDown(combobox);
  const listbox = await screen.findByRole('listbox');
  fireEvent.click(within(listbox).getByRole('option', { name: option }));
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
}

describe('the plain reading of the remaining field types', () => {
  it('states a named set, a list, a lookup table and a plain kind', () => {
    expect(describeType({ kind: 'Named', name: 'user_status' })).toBe('One of the user status set');
    expect(describeType({ kind: 'List', element: { kind: 'Text' } })).toBe('Several text');
    expect(
      describeType({ kind: 'Map', key: { kind: 'Text' }, value: { kind: 'Integer' } }),
    ).toBe('Lookup table');
    expect(describeType({ kind: 'Integer' })).toBe('Whole number');
    expect(describeType({ kind: 'Timestamp' })).toBe('Instant');
  });

  it('builds a list, a lookup table and a plain optional value', () => {
    expect(buildType('List', { optional: false })).toEqual({
      kind: 'List',
      element: { kind: 'Text' },
    });
    expect(buildType('Map', { optional: false })).toEqual({
      kind: 'Map',
      key: { kind: 'Text' },
      value: { kind: 'Text' },
    });
    expect(buildType('Optional', { optional: false })).toEqual({ kind: 'Text' });
    expect(buildType('Boolean', { optional: true })).toEqual({
      kind: 'Optional',
      inner: { kind: 'Boolean' },
    });
  });

  it('falls back to a plain reference and a plain named set when the model names none', () => {
    expect(buildType('Reference', { optional: false })).toEqual({
      kind: 'Reference',
      collection: 'record',
    });
    expect(buildType('Named', { optional: false })).toEqual({ kind: 'Named', name: 'value' });
  });
});

describe('the entity editor over the composed records', { timeout: 30000 }, () => {
  it('shows the field count, the privacy class and the plain type of each field', () => {
    render(<Harness start={seeded()} changes={[]} />);
    expect(screen.getByText('6 fields')).toBeInTheDocument();
    expect(screen.getByText('5 fields')).toBeInTheDocument();
    expect(screen.getAllByText('Text, and may be absent').length).toBeGreaterThan(0);
    expect(screen.getByText('One of the user status set')).toBeInTheDocument();
    expect(screen.getByText('Links to a user')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Always' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'May be absent' })).toBeInTheDocument();
  });

  it('writes a new sentence for what a collection keeps', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={seeded()} changes={changes} />);
    fireEvent.change(screen.getAllByLabelText('What this collection keeps')[0], {
      target: { value: 'Every person who signs in.' },
    });
    const user = changes[0].collections.find((entry) => entry.id === 'user');
    expect(user?.description).toBe('Every person who signs in.');
  });

  it('moves a collection to another privacy class and states what it means', async () => {
    const changes: Blueprint[] = [];
    render(<Harness start={seeded()} changes={changes} />);
    await pickIn(screen.getAllByRole('combobox', { name: /^Privacy/ })[0], 'Encrypted');
    const user = changes[0].collections.find((entry) => entry.id === 'user');
    expect(user?.privacy).toBe('Encrypted');
    expect(screen.getAllByText(PRIVACY_MEANING.Encrypted).length).toBeGreaterThan(0);
  });

  it('renames a field to a clean identifier', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={seeded()} changes={changes} />);
    fireEvent.change(screen.getAllByLabelText('Name of field 3')[0], {
      target: { value: 'Contact Email' },
    });
    expect(userFields(changes)[2].name).toBe('contact_email');
    expect(userFields(changes)[0].name).toBe('id');
  });

  it('turns a field into an exact decimal with two places', async () => {
    const changes: Blueprint[] = [];
    render(<Harness start={seeded()} changes={changes} />);
    await pickIn(screen.getAllByRole('combobox', { name: 'Kind of field 1' })[0], 'Exact decimal');
    expect(userFields(changes)[0].type).toEqual({ kind: 'Decimal', scale: 2 });
    expect(screen.getByText('Exact decimal to 2 places')).toBeInTheDocument();
  });

  it('keeps an optional field optional when its kind changes', async () => {
    const changes: Blueprint[] = [];
    render(<Harness start={seeded()} changes={changes} />);
    await pickIn(screen.getAllByRole('combobox', { name: 'Kind of field 3' })[0], 'Whole number');
    expect(userFields(changes)[2].type).toEqual({ kind: 'Optional', inner: { kind: 'Integer' } });
    expect(screen.getByText('Whole number, and may be absent')).toBeInTheDocument();
  });

  it('links a field to the first collection and a named set from the model', async () => {
    const changes: Blueprint[] = [];
    render(<Harness start={seeded()} changes={changes} />);
    await pickIn(
      screen.getAllByRole('combobox', { name: 'Kind of field 1' })[0],
      'Link to another record',
    );
    expect(userFields(changes)[0].type).toEqual({ kind: 'Reference', collection: 'user' });
    await pickIn(
      screen.getAllByRole('combobox', { name: 'Kind of field 2' })[0],
      'One of a named set',
    );
    expect(userFields(changes)[1].type).toEqual({ kind: 'Named', name: 'user_status' });
  });

  it('switches a field between always present and possibly absent', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={seeded()} changes={changes} />);
    fireEvent.click(screen.getByRole('button', { name: 'May be absent' }));
    expect(userFields(changes)[2].required).toBe(true);
    fireEvent.click(screen.getAllByRole('button', { name: 'Always' })[0]);
    expect(userFields(changes)[0].required).toBe(false);
  });

  it('writes what a field holds', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={seeded()} changes={changes} />);
    fireEvent.change(screen.getAllByLabelText('What field 2 holds')[0], {
      target: { value: 'The wallet this person signs with.' },
    });
    expect(userFields(changes)[1].description).toBe('The wallet this person signs with.');
  });

  it('removes one field and keeps the others', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={seeded()} changes={changes} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove field email' }));
    expect(userFields(changes).map((field) => field.name)).toEqual([
      'id',
      'address',
      'status',
      'created_at',
      'updated_at',
    ]);
    expect(screen.getAllByText('5 fields')).toHaveLength(2);
  });

  it('refuses a collection that carries the name of one already held', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={seeded()} changes={changes} />);
    fireEvent.change(screen.getByLabelText('What it keeps'), { target: { value: 'User' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add it' }));
    expect(changes).toHaveLength(0);
    expect(screen.getByLabelText('What it keeps')).toHaveValue('User');
  });
});

describe('the entity editor over an empty model', { timeout: 30000 }, () => {
  it('asks for the first collection, then holds its only field in place', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={readBlueprintDocument({})} changes={changes} />);
    expect(
      screen.getByText(
        'No records yet. Go back to Step 2 and pick a statement, or add the first collection below.',
      ),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('What it keeps'), { target: { value: 'Berth' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add it' }));
    const added = changes[0].types.find((entry) => entry.id === 'berth_record');
    expect(added?.kind === 'Record' ? added.fields.map((field) => field.name) : []).toEqual(['id']);
    expect(screen.getByText('Berth')).toBeInTheDocument();
    expect(screen.getByText('1 fields')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove field id' })).toBeDisabled();
    expect(screen.getByLabelText('What it keeps')).toHaveValue('');
  });

  it('adds a numbered field to a new collection', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={readBlueprintDocument({})} changes={changes} />);
    fireEvent.change(screen.getByLabelText('What it keeps'), { target: { value: 'Berth' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add it' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add a field' }));
    const record = changes[1].types.find((entry) => entry.id === 'berth_record');
    const fields = record?.kind === 'Record' ? record.fields : [];
    expect(fields[1]).toEqual({
      name: 'field_2',
      type: { kind: 'Text' },
      required: false,
      validation: [],
      description: 'State what this field holds.',
    });
    expect(screen.getByText('2 fields')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove field field_2' })).toBeEnabled();
  });
});
