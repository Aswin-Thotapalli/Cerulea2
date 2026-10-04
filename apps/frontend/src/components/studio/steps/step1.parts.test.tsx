import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { CanvasCard } from '@/lib/map/canvas';
import type { MapLink } from '@/lib/map/links';
import { CardInspector, LinkInspector, RemovalDialog } from './step1-Inspector';
import { dashOf } from './step1-canvas-parts';

const card: CanvasCard = {
  moduleId: 'ledger',
  title: 'Ledger',
  area: 'Records',
  category: 'records',
  tags: ['records', 'proof'],
  blurb: 'Keeps every entry.',
  configSchema: { properties: { retention_note: { type: 'string', title: 'Retention note', description: 'A note for the auditor.' }, strict: { type: 'boolean', title: 'Strict mode' } } },
  contribution: 'Keeps every entry; nothing is lost.',
  causedBy: ['Records each arriving shipment at the gate'],
  causedByOutcomeIds: ['outcome:intake'],
  chosenDirectly: false,
  requiredBy: ['Intake'],
  reason: 'Intake writes every arrival into the ledger.',
  removalConsequence: 'Removing this stops Intake.',
};

describe('the card inspector', () => {
  it('shows the three sentences, the parameters and the parts it needs', async () => {
    const onConfig = vi.fn();
    const onRemove = vi.fn();
    render(
      <CardInspector
        card={card}
        group=""
        config={{}}
        needs={[{ moduleId: 'store', title: 'Store', reason: 'Ledger keeps its entries in the store.' }]}
        onGroupChange={() => undefined}
        onConfigChange={onConfig}
        onRemove={onRemove}
        onFocus={() => undefined}
      />,
    );
    expect(screen.getByTestId('inspector-cause')).toHaveTextContent('Cerulea added it for: Records each arriving shipment at the gate.');
    expect(screen.getByTestId('inspector-contribution')).toHaveTextContent('Keeps every entry; nothing is lost.');
    expect(screen.getByTestId('inspector-removal')).toHaveTextContent('Removing this stops Intake.');
    expect(screen.getByTestId('inspector-need')).toHaveTextContent('Ledger keeps its entries in the store.');
    await userEvent.click(screen.getByRole('button', { name: 'Off' }));
    expect(onConfig).toHaveBeenCalledWith({ strict: true });
    await userEvent.click(screen.getByTestId('inspector-remove'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

describe('the link inspector', () => {
  const derived: MapLink = { linkId: 'requires:intake->ledger', from: 'intake', to: 'ledger', type: 'requires', origin: 'derived', reason: 'Intake writes every arrival into the ledger.', removable: false };
  const chosen: MapLink = { linkId: 'triggers:inspection->alerts', from: 'inspection', to: 'alerts', type: 'triggers', origin: 'chosen', reason: 'Inspection notifies Alerts.', removable: true };
  const titleById = { intake: 'Intake', ledger: 'Ledger', inspection: 'Inspection', alerts: 'Alerts' };

  it('offers no delete on a derived link and names what changes it', () => {
    render(<LinkInspector link={derived} titleById={titleById} onDelete={() => undefined} />);
    expect(screen.getByText('Intake requires Ledger')).toBeInTheDocument();
    expect(screen.queryByTestId('link-delete')).toBeNull();
    expect(screen.getByText(/Add or remove an outcome to change it/)).toBeInTheDocument();
  });

  it('deletes a chosen link', async () => {
    const onDelete = vi.fn();
    render(<LinkInspector link={chosen} titleById={titleById} onDelete={onDelete} />);
    expect(screen.getByText('We drew this')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('link-delete'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

describe('the removal question', () => {
  it('names the dependants and the outcomes that stop, and waits for the answer', async () => {
    const onRemove = vi.fn();
    const onKeep = vi.fn();
    render(
      <RemovalDialog
        impact={{
          moduleId: 'ledger',
          title: 'Ledger',
          dependants: [{ moduleId: 'intake', title: 'Intake', reason: 'Intake writes every arrival into the ledger.' }],
          outcomesLost: ['Keep every entry'],
          safe: false,
          summary: 'Removing Ledger stops Intake. These outcomes stop being delivered: Keep every entry.',
        }}
        onKeep={onKeep}
        onRemove={onRemove}
      />,
    );
    expect(screen.getByTestId('removal-summary')).toHaveTextContent('Removing Ledger stops Intake');
    expect(screen.getByText('Intake writes every arrival into the ledger.')).toBeInTheDocument();
    expect(screen.getByText('Keep every entry')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(onKeep).toHaveBeenCalledTimes(1);
    expect(onRemove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId('removal-confirm'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

describe('the four strokes', () => {
  it('draws requires and feeds solid, triggers dashed and governs dotted', () => {
    expect(dashOf('requires')).toBeUndefined();
    expect(dashOf('feeds')).toBeUndefined();
    expect(dashOf('triggers')).toBe('8 5');
    expect(dashOf('governs')).toBe('2 5');
  });
});
