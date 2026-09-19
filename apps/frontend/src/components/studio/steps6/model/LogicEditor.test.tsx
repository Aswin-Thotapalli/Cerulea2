import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LogicEditor, {
  CLASS_MEANING,
  accessManifestOf,
  buildEffect,
  describeAction,
} from './LogicEditor';
import { applyComposition, composeSections } from '@/lib/blueprint/compose';
import { readBlueprintDocument } from '@/lib/blueprint/document';
import { TRANSACTION_CLASSES, type Blueprint } from '@/lib/blueprint/types';

function seeded(): Blueprint {
  return applyComposition(readBlueprintDocument({}), composeSections(['wallet-auth']), []);
}

describe('the Access Manifest', () => {
  it('derives what an action reads and writes from its effects', () => {
    const manifest = accessManifestOf([
      buildEffect('Read', 'user'),
      buildEffect('Insert', 'session'),
      buildEffect('Update', 'session'),
    ]);
    expect(manifest.reads).toEqual(['user']);
    expect(manifest.writes).toEqual(['session']);
  });

  it('reaches inside a compensating effect', () => {
    const manifest = accessManifestOf([
      {
        kind: 'Compensate',
        effects: [buildEffect('Insert', 'user')],
        on_failure: [buildEffect('Delete', 'user')],
      },
    ]);
    expect(manifest.writes).toEqual(['user']);
  });

  it('states what an action touches in plain words', () => {
    expect(
      describeAction('Record a scan', { reads: ['user'], writes: ['session'] }, 'Routine'),
    ).toBe('Record a scan reads user and writes session. Cerulea commits it as routine work.');
    expect(describeAction('Do nothing', { reads: [], writes: [] }, 'Financial')).toMatch(
      /reads nothing and writes nothing/,
    );
  });

  it('carries a sentence for every transaction class', () => {
    for (const entry of TRANSACTION_CLASSES) {
      expect(CLASS_MEANING[entry].length).toBeGreaterThan(20);
    }
  });
});

describe('the logic editor', () => {
  it('states that Cerulea derives the declaration from the effects', () => {
    render(<LogicEditor blueprint={seeded()} onChange={() => undefined} />);
    expect(screen.getByText('Every action declares what it touches')).toBeInTheDocument();
  });

  it('states what a system with no rule accepts', () => {
    render(<LogicEditor blueprint={seeded()} onChange={() => undefined} />);
    expect(
      screen.getByText('No rule yet. A system with no rule accepts every value it is given.'),
    ).toBeInTheDocument();
  });

  it('writes a rule into the Blueprint Rules section', async () => {
    const changes: Blueprint[] = [];
    render(<LogicEditor blueprint={seeded()} onChange={(next) => changes.push(next)} />);
    await userEvent.type(screen.getByLabelText('Add a rule'), 'An amount above zero');
    await userEvent.click(screen.getAllByRole('button', { name: 'Add it' })[0]);
    const rule = changes[changes.length - 1].rules[0];
    expect(rule.id).toBe('an_amount_above_zero');
    expect(rule.kind).toBe('Precondition');
    expect(rule.collections).toEqual(['user']);
  });

  it('writes an action with its effects and its class', async () => {
    const changes: Blueprint[] = [];
    render(<LogicEditor blueprint={seeded()} onChange={(next) => changes.push(next)} />);
    await userEvent.type(screen.getByLabelText('Add an action'), 'Open an account');
    await userEvent.click(screen.getAllByRole('button', { name: 'Add it' })[1]);
    const action = changes[changes.length - 1].actions[0];
    expect(action.id).toBe('open_an_account');
    expect(action.class).toBe('Routine');
    expect(accessManifestOf(action.effects).writes).toEqual(['user']);
    expect(action.roles).toEqual(['owner']);
  });

  it('offers no trigger pair while the project holds no parts', () => {
    render(
      <LogicEditor
        blueprint={seeded()}
        onChange={() => undefined}
        moduleIds={[]}
        chosenTriggers={[]}
        onChosenTriggersChange={() => undefined}
      />,
    );
    expect(
      screen.getByText('No pair in this project can trigger another yet'),
    ).toBeInTheDocument();
  });
});
