import { describe, expect, it } from 'vitest';
import modulesSeed from '@/data/modules.seed.json';
import templatesSeed from '@/data/templates.seed.json';
import type { CatalogueModule, CatalogueTemplate } from '@/lib/catalogue/types';
import { buildRelationCatalogue } from './relations';
import { LINK_STYLE, LinkNotEditable, createUserLink, deleteUserLink, userMayCreate } from './links';
import {
  decidesAccess,
  derivePermissionMatrix,
  deriveGovernsLinks,
  grantsOfRole,
} from './governs';

const modules = (modulesSeed as { modules: CatalogueModule[] }).modules;
const templates = (templatesSeed as { templates: CatalogueTemplate[] }).templates;
const catalogue = buildRelationCatalogue(templates);
const index = new Map(modules.map((part) => [part.moduleId, part]));
const everything = modules.map((part) => part.moduleId);
const matrix = derivePermissionMatrix(everything, modules, catalogue);
const links = deriveGovernsLinks(matrix);

describe('decidesAccess', () => {
  it('marks a part whose area or labels name access', () => {
    expect(decidesAccess(index.get('rbac') as CatalogueModule)).toBe(true);
    expect(decidesAccess(index.get('kyc') as CatalogueModule)).toBe(true);
  });

  it('leaves a part that decides nothing about access', () => {
    expect(decidesAccess(index.get('analytics') as CatalogueModule)).toBe(false);
  });
});

describe('the derived permission matrix', () => {
  it('holds a role per part that decides access', () => {
    expect(matrix.roles.length).toBeGreaterThan(0);
    for (const role of matrix.roles) {
      expect(role.name).toContain('decides access');
      expect(index.has(role.heldBy)).toBe(true);
    }
  });

  it('records a grant for every governing relation the catalogue holds', () => {
    const gates = matrix.grants.find(
      (grant) => grant.roleId === 'role:kyc' && grant.moduleId === 'erc20',
    );
    expect(gates).toBeTruthy();
    expect(gates?.statement).toContain('gates');
  });

  it('records a grant where a part depends on a part that decides access', () => {
    const grant = matrix.grants.find(
      (candidate) => candidate.roleId === 'role:wallet-auth' && candidate.moduleId === 'rbac',
    );
    expect(grant?.statement).toBe(
      'RBAC needs a verified identity to attach roles and evaluate permissions.',
    );
  });

  it('never lets a part govern itself', () => {
    for (const grant of matrix.grants) {
      const role = matrix.roles.find((candidate) => candidate.roleId === grant.roleId);
      expect(role?.heldBy).not.toBe(grant.moduleId);
    }
  });

  it('records one grant per pair', () => {
    const keys = matrix.grants.map((grant) => `${grant.roleId}->${grant.moduleId}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('holds only parts the project holds', () => {
    const small = derivePermissionMatrix(['wallet-auth', 'rbac'], modules, catalogue);
    for (const grant of small.grants) {
      expect(['wallet-auth', 'rbac']).toContain(grant.moduleId);
    }
  });

  it('derives the same matrix every time', () => {
    expect(derivePermissionMatrix(everything, modules, catalogue)).toEqual(matrix);
  });
});

describe('the governs links', () => {
  it('draws as a dotted line with no arrow', () => {
    expect(LINK_STYLE.governs.stroke).toBe('dotted');
    expect(LINK_STYLE.governs.arrow).toBe(false);
  });

  it('draws one link per grant', () => {
    expect(links).toHaveLength(matrix.grants.length);
    for (const link of links) {
      expect(link.type).toBe('governs');
      expect(link.origin).toBe('derived');
      expect(link.removable).toBe(false);
    }
  });

  it('points from the part that decides to the part it decides about', () => {
    const link = links.find((candidate) => candidate.linkId === 'governs:kyc->erc20');
    expect(link?.from).toBe('kyc');
    expect(link?.to).toBe('erc20');
  });

  it('carries the sentence the matrix records', () => {
    for (const link of links) {
      expect(link.reason.trim().length).toBeGreaterThan(0);
    }
  });

  it('follows the matrix, so a smaller matrix draws fewer lines', () => {
    const small = derivePermissionMatrix(['wallet-auth', 'rbac'], modules, catalogue);
    expect(deriveGovernsLinks(small).length).toBeLessThan(links.length);
  });
});

describe('a user neither creates nor deletes a governs link', () => {
  it('refuses to create one and names the action that works', () => {
    expect(userMayCreate('governs')).toBe(false);
    expect(() => createUserLink('governs', 'kyc', 'erc20', 'because')).toThrowError(LinkNotEditable);
  });

  it('refuses to delete one and names the action that works', () => {
    expect(() => deleteUserLink(links, links[0].linkId)).toThrowError(
      /Remove the outcome that installed these parts/,
    );
  });
});

describe('what one role decides access to', () => {
  it('lists the parts in plain names, ordered', () => {
    const names = grantsOfRole(matrix, 'role:kyc', modules);
    expect(names.length).toBeGreaterThan(0);
    expect([...names].sort()).toEqual(names);
    const identifiers = new Set(modules.map((part) => part.moduleId));
    for (const name of names) {
      expect(identifiers.has(name)).toBe(false);
    }
  });
});
