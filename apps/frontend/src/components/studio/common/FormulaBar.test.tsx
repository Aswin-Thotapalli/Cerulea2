import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import FormulaBar from './FormulaBar';
import { scopeForCollection } from '@/lib/blueprint/formula';
import type { Blueprint } from '@/lib/blueprint/types';

const blueprint = {
  schema_version: '1.0.0',
  name: 'Berth register',
  summary: '',
  types: [
    {
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
          name: 'status',
          type: { kind: 'Text' },
          required: true,
          validation: [],
          description: 'The state the booking sits in.',
        },
      ],
      description: 'One booking record.',
    },
  ],
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

const scope = scopeForCollection(blueprint, 'booking');

function Host({ start }: { start: string }) {
  const [text, setText] = useState(start);
  return (
    <FormulaBar
      label="The formula behind this rule"
      plain="Cerulea checks this formula while you type."
      scope={scope}
      value={text}
      onChange={setText}
    />
  );
}

describe('the formula bar', () => {
  it('states the type a clean formula reads', () => {
    render(<Host start="record.amount > 1" />);
    expect(screen.getByText('This formula reads a truth value')).toBeInTheDocument();
  });

  it('works out the value of a formula over numbers alone', () => {
    render(<Host start="2 + 3" />);
    expect(screen.getByText('Right now it works out to 5')).toBeInTheDocument();
  });

  it('names the type fault and its fix inline', () => {
    render(<Host start='record.amount + "one"' />);
    const fault = screen.getByTestId('formula-fault');
    expect(fault).toHaveTextContent('a whole number on the left');
    expect(fault).toHaveTextContent('Give both sides a whole number');
  });

  it('offers the fields of the record after a stop', async () => {
    render(<Host start="" />);
    const field = screen.getByLabelText('The formula behind this rule');
    await userEvent.type(field, 'record.');
    expect(screen.getByText('amount')).toBeInTheDocument();
    expect(screen.getByText('The amount the booking carries.')).toBeInTheDocument();
  });

  it('writes the chosen completion into the formula', async () => {
    render(<Host start="" />);
    const field = screen.getByLabelText('The formula behind this rule');
    await userEvent.type(field, 'record.am');
    await userEvent.click(screen.getByText('amount'));
    expect((field as HTMLInputElement).value).toBe('record.amount');
    expect(screen.getByText('This formula reads a whole number')).toBeInTheDocument();
  });

  it('offers the functions before any name is typed', () => {
    render(<Host start="" />);
    expect(screen.getByText('now()')).toBeInTheDocument();
    expect(screen.getByText('The moment the Blockchain stamped on this transaction.')).toBeInTheDocument();
  });
});
