import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import PermissionMatrix, {
  describeCell,
  governsMatrixFromBlueprint,
  ownerFieldOf,
} from './PermissionMatrix';
import { applyComposition, composeSections } from '@/lib/blueprint/compose';
import { readBlueprintDocument } from '@/lib/blueprint/document';
import { deriveGovernsLinks } from '@/lib/map/governs';
import { putRole } from '@/lib/blueprint/edit';
import type { Blueprint } from '@/lib/blueprint/types';

function seeded(): Blueprint {
  const composed = applyComposition(readBlueprintDocument({}), composeSections(['wallet-auth']), []);
  return putRole(composed, { id: 'clerk', name: 'Clerk', credentials: [] });
}

describe('the plain reading of one cell', () => {
  it('states that an empty cell reaches nothing', () => {
    expect(describeCell('Clerk', 'User', [], [])).toBe('Clerk reaches no user record.');
  });

  it('names the actions and the fields a cell allows', () => {
    expect(describeCell('Clerk', 'User', ['Read', 'Update'], ['email'])).toBe(
      'Clerk may read, update a user record. Only these fields: email.',
    );
    expect(describeCell('Clerk', 'User', ['Read'], [])).toMatch(/Every field/);
  });
});

describe('the owner field a row condition uses', () => {
  it('finds the identity field when the record carries one', () => {
    expect(ownerFieldOf(seeded(), 'user')).toBe('address');
  });

  it('falls back to the key when no identity field exists', () => {
    expect(ownerFieldOf(seeded(), 'session')).toBe('id');
  });
});

describe('the permission matrix', () => {
  it('opens with one row per role and one column per collection', () => {
    render(<PermissionMatrix blueprint={seeded()} onChange={() => undefined} />);
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Clerk')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Session')).toBeInTheDocument();
  });

  it('states that a role reaches nothing until the matrix says so', () => {
    render(<PermissionMatrix blueprint={seeded()} onChange={() => undefined} />);
    expect(
      screen.getByText('A role reaches nothing until this matrix says so'),
    ).toBeInTheDocument();
    expect(screen.getByText('Clerk reaches no user record.')).toBeInTheDocument();
  });

  it('writes a permission entry when a capability is set', async () => {
    const changes: Blueprint[] = [];
    render(<PermissionMatrix blueprint={seeded()} onChange={(next) => changes.push(next)} />);
    await userEvent.click(screen.getByLabelText('Read for Clerk on User'));
    const entry = changes[0].permissions.find(
      (candidate) => candidate.role === 'clerk' && candidate.collection === 'user',
    );
    expect(entry?.capabilities).toEqual(['Read']);
    expect(entry?.id).toBe('clerk_on_user');
  });

  it('derives the governs link on the map from the same entries', async () => {
    const changes: Blueprint[] = [];
    render(<PermissionMatrix blueprint={seeded()} onChange={(next) => changes.push(next)} />);
    await userEvent.click(screen.getByLabelText('Update for Clerk on User'));
    const written = changes[0];
    const links = deriveGovernsLinks(
      governsMatrixFromBlueprint(written, {
        roleModule: 'rbac',
        collectionModule: { user: 'wallet-auth' },
      }),
    );
    expect(links.length).toBeGreaterThan(0);
    expect(links[0].type).toBe('governs');
  });

  it('removes a role and every entry naming it', async () => {
    const changes: Blueprint[] = [];
    render(<PermissionMatrix blueprint={seeded()} onChange={(next) => changes.push(next)} />);
    await userEvent.click(screen.getAllByRole('button', { name: 'Remove' })[1]);
    expect(changes[0].identities.roles.some((entry) => entry.id === 'clerk')).toBe(false);
  });
});
