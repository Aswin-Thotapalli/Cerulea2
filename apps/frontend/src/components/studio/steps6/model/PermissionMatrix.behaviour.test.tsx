import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import PermissionMatrix, { governsMatrixFromBlueprint, ownerFieldOf } from './PermissionMatrix';
import { applyComposition, composeSections } from '@/lib/blueprint/compose';
import { readBlueprintDocument } from '@/lib/blueprint/document';
import { permissionFor, putFields, putRole, setCapabilities } from '@/lib/blueprint/edit';
import type { Blueprint } from '@/lib/blueprint/types';

function seeded(): Blueprint {
  const composed = applyComposition(readBlueprintDocument({}), composeSections(['wallet-auth']), []);
  return putRole(composed, { id: 'clerk', name: 'Clerk', credentials: [] });
}

/** The seeded model with the clerk allowed to read and update users. */
function granted(): Blueprint {
  return setCapabilities(seeded(), {
    roleId: 'clerk',
    collectionId: 'user',
    capabilities: ['Read', 'Update'],
  });
}

/** Holds the Blueprint in state so the matrix redraws after each change. */
function Harness({ start, changes }: { start: Blueprint; changes: Blueprint[] }) {
  const [blueprint, setBlueprint] = useState(start);
  return (
    <PermissionMatrix
      blueprint={blueprint}
      onChange={(next) => {
        changes.push(next);
        setBlueprint(next);
      }}
    />
  );
}

function clerkOnUser(changes: Blueprint[]) {
  return permissionFor(changes[changes.length - 1], 'clerk', 'user');
}

function openNarrow() {
  const enabled = screen
    .getAllByRole('button', { name: 'Narrow' })
    .filter((button) => !(button as HTMLButtonElement).disabled);
  expect(enabled).toHaveLength(1);
  fireEvent.click(enabled[0]);
  return screen.getByRole('dialog');
}

describe('the permission matrix cells', { timeout: 30000 }, () => {
  it('adds a capability in the fixed order of the four actions', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={granted()} changes={changes} />);
    fireEvent.click(screen.getByLabelText('Create for Clerk on User'));
    expect(clerkOnUser(changes)?.capabilities).toEqual(['Read', 'Create', 'Update']);
    expect(
      screen.getByText('Clerk may read, create, update a user record. Every field.'),
    ).toBeInTheDocument();
  });

  it('drops a capability that a cell already holds', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={granted()} changes={changes} />);
    fireEvent.click(screen.getByLabelText('Read for Clerk on User'));
    expect(clerkOnUser(changes)?.capabilities).toEqual(['Update']);
  });

  it('drops the whole entry when the last capability goes', () => {
    const changes: Blueprint[] = [];
    const start = setCapabilities(seeded(), {
      roleId: 'clerk',
      collectionId: 'user',
      capabilities: ['Delete'],
    });
    render(<Harness start={start} changes={changes} />);
    fireEvent.click(screen.getByLabelText('Delete for Clerk on User'));
    expect(clerkOnUser(changes)).toBeNull();
    expect(screen.getByText('Clerk reaches no user record.')).toBeInTheDocument();
  });

  it('holds narrowing shut on every cell with no capability', () => {
    render(<Harness start={seeded()} changes={[]} />);
    const buttons = screen.getAllByRole('button', { name: 'Narrow' });
    expect(buttons).toHaveLength(4);
    for (const button of buttons) expect(button).toBeDisabled();
  });
});

describe('narrowing one cell', { timeout: 30000 }, () => {
  it('lists the fields of the collection and narrows the cell to a ticked field', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={granted()} changes={changes} />);
    const dialog = openNarrow();
    expect(within(dialog).getByText('Narrow what this role reaches')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Created at')).not.toBeChecked();
    fireEvent.click(within(dialog).getByLabelText('Email'));
    expect(clerkOnUser(changes)?.fields).toEqual(['email']);
    expect(clerkOnUser(changes)?.capabilities).toEqual(['Read', 'Update']);
    expect(within(screen.getByRole('dialog')).getByLabelText('Email')).toBeChecked();
    expect(
      screen.getByText('Clerk may read, update a user record. Only these fields: email.'),
    ).toBeInTheDocument();
  });

  it('widens the cell again when the field is unticked', () => {
    const changes: Blueprint[] = [];
    const start = setCapabilities(granted(), {
      roleId: 'clerk',
      collectionId: 'user',
      capabilities: ['Read', 'Update'],
      fields: ['email', 'status'],
    });
    render(<Harness start={start} changes={changes} />);
    const dialog = openNarrow();
    fireEvent.click(within(dialog).getByLabelText('Email'));
    expect(clerkOnUser(changes)?.fields).toEqual(['status']);
  });

  it('limits the rows to those the person owns', async () => {
    const changes: Blueprint[] = [];
    render(<Harness start={granted()} changes={changes} />);
    const dialog = openNarrow();
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: /^Which rows/ }));
    fireEvent.click(
      within(await screen.findByRole('listbox')).getByRole('option', {
        name: 'Only the rows this person owns',
      }),
    );
    expect(clerkOnUser(changes)?.row_filter).toEqual({
      kind: 'Call',
      operator: 'equal',
      arguments: [
        { kind: 'Field', target: { kind: 'Param', name: 'record' }, field: 'address' },
        { kind: 'Caller' },
      ],
    });
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(within(screen.getByRole('dialog')).getByRole('combobox', { name: /^Which rows/ })).toHaveTextContent(
      'Only the rows this person owns',
    );
  });

  it('keeps the ticked fields and the capabilities when the rows change', async () => {
    const changes: Blueprint[] = [];
    const start = setCapabilities(granted(), {
      roleId: 'clerk',
      collectionId: 'user',
      capabilities: ['Read', 'Update'],
      fields: ['email'],
    });
    render(<Harness start={start} changes={changes} />);
    const dialog = openNarrow();
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: /^Which rows/ }));
    fireEvent.click(
      within(await screen.findByRole('listbox')).getByRole('option', {
        name: 'Only the rows this person owns',
      }),
    );
    expect(clerkOnUser(changes)?.fields).toEqual(['email']);
    expect(clerkOnUser(changes)?.capabilities).toEqual(['Read', 'Update']);
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    fireEvent.mouseDown(
      within(screen.getByRole('dialog')).getByRole('combobox', { name: /^Which rows/ }),
    );
    fireEvent.click(
      within(await screen.findByRole('listbox')).getByRole('option', {
        name: 'Every row in the collection',
      }),
    );
    expect(changes).toHaveLength(2);
    expect(clerkOnUser(changes)?.fields).toEqual(['email']);
    expect(clerkOnUser(changes)?.capabilities).toEqual(['Read', 'Update']);
  });

  it('closes when a person presses Done', async () => {
    render(<Harness start={granted()} changes={[]} />);
    const dialog = openNarrow();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('the roles of the matrix', { timeout: 30000 }, () => {
  it('adds a role that reaches nothing yet', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={seeded()} changes={changes} />);
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'Harbour master' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add it' }));
    const roles = changes[0].identities.roles;
    expect(roles[roles.length - 1]).toEqual({
      id: 'harbour_master',
      name: 'Harbour master',
      credentials: [],
    });
    expect(screen.getByText('Harbour master reaches no user record.')).toBeInTheDocument();
    expect(screen.getByLabelText('Role')).toHaveValue('');
  });

  it('refuses a role that carries the name of one already held', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={seeded()} changes={changes} />);
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'Clerk' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add it' }));
    expect(changes).toHaveLength(0);
  });

  it('keeps the last role in place', () => {
    const lone = applyComposition(readBlueprintDocument({}), composeSections(['wallet-auth']), []);
    render(<Harness start={lone} changes={[]} />);
    expect(screen.getByRole('button', { name: 'Remove' })).toBeDisabled();
  });

  it('asks for a collection first when the model holds none', () => {
    render(<Harness start={readBlueprintDocument({})} changes={[]} />);
    expect(
      screen.getByText(/No collection yet\. Open the Records surface and add what the system keeps/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('the governs matrix and the owner field', () => {
  it('leaves out a grant whose collection no part keeps and names an unknown role by its key', () => {
    const blueprint = setCapabilities(granted(), {
      roleId: 'owner',
      collectionId: 'session',
      capabilities: ['Read'],
    });
    const orphan = {
      ...blueprint,
      permissions: [
        ...blueprint.permissions,
        {
          ...blueprint.permissions[0],
          id: 'ghost_on_user',
          role: 'ghost',
          capabilities: ['Read' as const],
          fields: [],
        },
      ],
    };
    const matrix = governsMatrixFromBlueprint(orphan, {
      roleModule: 'rbac',
      collectionModule: { user: 'wallet-auth' },
    });
    expect(matrix.roles.map((role) => role.heldBy)).toEqual(['rbac', 'rbac']);
    expect(matrix.grants.map((grant) => grant.roleId)).toEqual(['clerk', 'ghost']);
    expect(matrix.grants[1].statement).toBe('ghost may read a user record. Every field.');
  });

  it('answers the key for a collection the model does not hold', () => {
    expect(ownerFieldOf(seeded(), 'berth')).toBe('id');
  });

  it('finds an identity field that may be absent', () => {
    const blueprint = seeded();
    const record = blueprint.types.find((entry) => entry.id === 'session_record');
    const fields = record?.kind === 'Record' ? record.fields : [];
    const widened = putFields(blueprint, 'session_record', [
      ...fields,
      {
        name: 'holder',
        type: { kind: 'Optional', inner: { kind: 'Identity' } },
        required: false,
        validation: [],
        description: 'The identity that may hold this session.',
      },
    ]);
    expect(ownerFieldOf(widened, 'session')).toBe('holder');
  });
});
