import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { recordTypeOf } from '@/lib/blueprint/edit';
import { validateBlueprint } from '@/lib/blueprint/validate';
import type { Blueprint } from '@/lib/blueprint/types';
import EntityFieldEditor from './step2-EntityFieldEditor';
import EntitySidebar from './step2-EntitySidebar';
import GovernancePanel from './step2-GovernancePanel';
import ExposurePanel from './step2-ExposurePanel';
import { groupCollections, isPublished } from './step2-model';
import { harbourRegister } from './step2-fixture';
import { controlsWithoutMirror } from '@/lib/studio/mirror';

/** Holds one Blueprint in state and hands every change to the test. */
function Harness({
  start,
  onEach,
  children,
}: {
  start: Blueprint;
  onEach: (next: Blueprint) => void;
  children: (blueprint: Blueprint, change: (next: Blueprint) => void) => React.ReactNode;
}) {
  const [blueprint, setBlueprint] = useState(start);
  return (
    <>
      {children(blueprint, (next) => {
        onEach(next);
        setBlueprint(next);
      })}
    </>
  );
}

function last<T>(mock: { mock: { calls: T[][] } }): T {
  const calls = mock.mock.calls;
  return calls[calls.length - 1][0];
}

describe('the field editor', () => {
  it('renders the production grid over the record type and adds a field', async () => {
    const user = userEvent.setup();
    const seen = vi.fn();
    render(
      <Harness start={harbourRegister()} onEach={seen}>
        {(blueprint, change) => (
          <EntityFieldEditor blueprint={blueprint} collection={blueprint.collections[1]} isCore onChange={change} />
        )}
      </Harness>,
    );
    expect(screen.getByLabelText('Entity name')).toHaveValue('Berth');
    expect(screen.getByLabelText('Name of field 2')).toHaveValue('length');
    await user.click(screen.getByRole('button', { name: 'Add Field' }));
    const next: Blueprint = last(seen);
    const fields = recordTypeOf(next, next.collections[1])!.fields;
    expect(fields.map((entry) => entry.name)).toEqual(['id', 'length', 'status', 'field_4']);
  });

  it('writes required, unique and the default into the Blueprint', async () => {
    const user = userEvent.setup();
    const seen = vi.fn();
    render(
      <Harness start={harbourRegister()} onEach={seen}>
        {(blueprint, change) => (
          <EntityFieldEditor blueprint={blueprint} collection={blueprint.collections[1]} isCore onChange={change} />
        )}
      </Harness>,
    );
    await user.click(screen.getByRole('switch', { name: 'Required for field 2' }));
    let next: Blueprint = last(seen);
    expect(recordTypeOf(next, next.collections[1])!.fields[1].type).toEqual({ kind: 'Optional', inner: { kind: 'Integer' } });

    await user.click(screen.getByRole('switch', { name: 'Unique for field 3' }));
    next = last(seen);
    expect(next.collections[1].indexes).toEqual([{ id: 'berth_by_status', fields: ['status'], unique: true }]);

    fireEvent.change(screen.getByLabelText('Default of field 3'), { target: { value: 'free' } });
    next = last(seen);
    expect(recordTypeOf(next, next.collections[1])!.fields[2].default).toEqual({ kind: 'Text', value: 'free' });
    expect(validateBlueprint(next)).toEqual([]);
  });

  it('renames the collection and carries the permission and the action with it', async () => {
    const seen = vi.fn();
    render(
      <Harness start={harbourRegister()} onEach={seen}>
        {(blueprint, change) => (
          <EntityFieldEditor blueprint={blueprint} collection={blueprint.collections[1]} isCore onChange={change} />
        )}
      </Harness>,
    );
    const name = screen.getByLabelText('Entity name');
    fireEvent.change(name, { target: { value: 'Mooring' } });
    fireEvent.blur(name);
    const next: Blueprint = last(seen);
    expect(next.collections.map((entry) => entry.id)).toEqual(['harbour', 'mooring']);
    expect(next.permissions[0].collection).toBe('mooring');
    expect(next.actions[0].effects[0]).toEqual(expect.objectContaining({ collection: 'mooring' }));
  });

  it('changes the privacy class and every control carries a plain sentence', async () => {
    const user = userEvent.setup();
    const seen = vi.fn();
    const { container } = render(
      <Harness start={harbourRegister()} onEach={seen}>
        {(blueprint, change) => (
          <EntityFieldEditor blueprint={blueprint} collection={blueprint.collections[1]} isCore onChange={change} />
        )}
      </Harness>,
    );
    await user.click(screen.getByLabelText('Privacy class'));
    await user.click(await screen.findByRole('option', { name: 'Encrypted' }));
    const next: Blueprint = last(seen);
    expect(next.collections[1].privacy).toBe('Encrypted');
    expect(controlsWithoutMirror(container)).toEqual([]);
  });
});

describe('the entity sidebar', () => {
  it('groups the entities under their modules and protects a core entity', async () => {
    const user = userEvent.setup();
    const blueprint = harbourRegister();
    const grouping = groupCollections(blueprint, [], {});
    const remove = vi.fn();
    const select = vi.fn();
    render(
      <EntitySidebar
        grouping={grouping}
        selectedModuleId="_custom"
        selectedCollectionId="harbour"
        isCore={(collection) => collection.id === 'harbour'}
        onSelectModule={() => undefined}
        onSelectCollection={select}
        onRemoveCollection={remove}
        onOpenCatalogue={() => undefined}
        onAddBlank={() => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: 'Entity Harbour' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Harbour' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Remove Berth' }));
    expect(remove).toHaveBeenCalledWith('berth');
    await user.click(screen.getByRole('button', { name: 'Entity Berth' }));
    expect(select).toHaveBeenCalledWith('_custom', 'berth');
  });
});

describe('the access pills', () => {
  it('gives a role a capability on a collection and adds a role', async () => {
    const user = userEvent.setup();
    const seen = vi.fn();
    render(
      <Harness start={harbourRegister()} onEach={seen}>
        {(blueprint, change) => (
          <GovernancePanel blueprint={blueprint} grouping={groupCollections(blueprint, [], {})} onChange={change} />
        )}
      </Harness>,
    );
    const pill = screen.getByRole('switch', { name: 'Create for Harbour master on Berth' });
    expect(pill).toHaveAttribute('aria-checked', 'false');
    await user.click(pill);
    let next: Blueprint = last(seen);
    expect(next.permissions).toContainEqual(
      expect.objectContaining({ role: 'harbour_master', collection: 'berth', capabilities: ['Create'] }),
    );
    expect(screen.getByRole('switch', { name: 'Create for Harbour master on Berth' })).toHaveAttribute('aria-checked', 'true');

    await user.type(screen.getByLabelText('Add a role'), 'Inspector{Enter}');
    next = last(seen);
    expect(next.identities.roles.map((role) => role.id)).toEqual(['clerk', 'harbour_master', 'inspector']);
    expect(validateBlueprint(next)).toEqual([]);
  });

  it('narrows a role to named fields', async () => {
    const user = userEvent.setup();
    const seen = vi.fn();
    render(
      <Harness start={harbourRegister()} onEach={seen}>
        {(blueprint, change) => (
          <GovernancePanel blueprint={blueprint} grouping={groupCollections(blueprint, [], {})} onChange={change} />
        )}
      </Harness>,
    );
    const berthRow = screen.getByText('Berth').closest('div')!.parentElement!;
    await user.click(within(berthRow).getByRole('button', { name: 'Narrow' }));
    await user.click(await screen.findByLabelText('Allow field length'));
    const next: Blueprint = last(seen);
    expect(next.permissions[0]).toEqual(expect.objectContaining({ role: 'clerk', fields: ['length'] }));
  });
});

describe('the exposure table', () => {
  it('publishes a collection as Read for the Anyone role', async () => {
    const user = userEvent.setup();
    const seen = vi.fn();
    render(
      <Harness start={harbourRegister()} onEach={seen}>
        {(blueprint, change) => (
          <ExposurePanel blueprint={blueprint} grouping={groupCollections(blueprint, [], {})} onChange={change} />
        )}
      </Harness>,
    );
    await user.click(screen.getByLabelText('Published read of Harbour'));
    const next: Blueprint = last(seen);
    expect(isPublished(next, 'harbour')).toBe(true);
    expect(next.identities.roles.some((role) => role.id === 'public')).toBe(true);
  });
});
