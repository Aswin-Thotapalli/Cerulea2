// apps/frontend/src/lib/map/governs.ts
// The governs link.
// One part decides who may use another. The link draws as a dotted line.
//
// The link is derived from the permission matrix. A user draws none and deletes
// none. Changing the matrix changes the links.
//
// A project that has not reached the permission matrix yet still gets one.
// Cerulea derives the matrix from the catalogue, by this rule.
// 1. A part the relation catalogue records as governing another part holds a
//    role over that part.
// 2. A part that decides access, meaning its area or its labels name access,
//    permission, policy, identity or compliance, holds a role over every part
//    in this project that depends on it.
// Every role carries the plain name of the part that holds it.
//
// Without a governs link the governed part accepts every caller.

import type { CatalogueModule } from '@/lib/catalogue/types';
import { linkIdFor, type MapLink } from './links';
import { edgesWithin, relationReason, type RelationCatalogue } from './relations';

/** The words that mark a part as one that decides access. */
export const ACCESS_WORDS = [
  'access',
  'permission',
  'policy',
  'identity',
  'compliance',
  'rbac',
  'auth',
] as const;

export type PermissionRole = {
  roleId: string;
  /** The plain name a user reads. */
  name: string;
  /** The part that holds this role. */
  heldBy: string;
};

export type PermissionGrant = {
  roleId: string;
  /** The part this role decides access to. */
  moduleId: string;
  /** One sentence stating what the role decides. */
  statement: string;
};

export type PermissionMatrix = {
  roles: PermissionRole[];
  grants: PermissionGrant[];
};

function titlesFor(modules: CatalogueModule[]): Record<string, string> {
  return Object.fromEntries(modules.map((part) => [part.moduleId, part.title]));
}

/** Reports whether a part decides access. */
export function decidesAccess(part: CatalogueModule): boolean {
  const hay = `${part.category} ${(part.tags ?? []).join(' ')}`.toLowerCase();
  return ACCESS_WORDS.some((word) => hay.includes(word));
}

/**
 * Derives the permission matrix of a project from the catalogue.
 * A project that has built its own matrix supplies that one instead.
 */
export function derivePermissionMatrix(
  installOrder: string[],
  modules: CatalogueModule[],
  catalogue: RelationCatalogue,
): PermissionMatrix {
  const index = new Map(modules.map((part) => [part.moduleId, part]));
  const titleById = titlesFor(modules);
  const held = new Set(installOrder);

  const roleFor = new Map<string, PermissionRole>();
  const grants: PermissionGrant[] = [];
  const seen = new Set<string>();

  const addGrant = (holder: string, target: string, statement: string) => {
    if (holder === target) return;
    if (!held.has(holder) || !held.has(target)) return;
    const roleId = `role:${holder}`;
    if (!roleFor.has(roleId)) {
      roleFor.set(roleId, {
        roleId,
        name: `${titleById[holder] ?? holder} decides access`,
        heldBy: holder,
      });
    }
    const key = `${roleId}->${target}`;
    if (seen.has(key)) return;
    seen.add(key);
    grants.push({ roleId, moduleId: target, statement });
  };

  // 1. Every governing relation the catalogue records between parts we hold.
  for (const edge of edgesWithin(catalogue, 'governs', installOrder)) {
    addGrant(edge.from, edge.to, relationReason(edge, titleById));
  }

  // 2. Every part that decides access governs the parts that depend on it.
  for (const moduleId of installOrder) {
    const part = index.get(moduleId);
    if (!part) continue;
    for (const dependency of part.dependsOn ?? []) {
      const holder = index.get(dependency);
      if (!holder || !decidesAccess(holder)) continue;
      const reason =
        part.reasonByDepId?.[dependency] ??
        `${part.title} depends on ${holder.title} for access.`;
      addGrant(dependency, moduleId, reason);
    }
  }

  return {
    roles: Array.from(roleFor.values()).sort((left, right) => left.roleId.localeCompare(right.roleId)),
    grants: grants.sort((left, right) =>
      `${left.roleId}->${left.moduleId}`.localeCompare(`${right.roleId}->${right.moduleId}`),
    ),
  };
}

/**
 * Derives one governs link per grant in the matrix.
 * A user draws none and deletes none. Changing the matrix changes the links.
 */
export function deriveGovernsLinks(matrix: PermissionMatrix): MapLink[] {
  const holderByRole = new Map(matrix.roles.map((role) => [role.roleId, role.heldBy]));
  const links: MapLink[] = [];
  for (const grant of matrix.grants) {
    const holder = holderByRole.get(grant.roleId);
    if (!holder) continue;
    links.push({
      linkId: linkIdFor('governs', holder, grant.moduleId),
      from: holder,
      to: grant.moduleId,
      type: 'governs',
      origin: 'derived',
      reason: grant.statement,
      removable: false,
    });
  }
  return links.sort((left, right) => left.linkId.localeCompare(right.linkId));
}

/** Lists what one role decides access to, in plain names. */
export function grantsOfRole(
  matrix: PermissionMatrix,
  roleId: string,
  modules: CatalogueModule[],
): string[] {
  const titleById = titlesFor(modules);
  return matrix.grants
    .filter((grant) => grant.roleId === roleId)
    .map((grant) => titleById[grant.moduleId] ?? grant.moduleId)
    .sort();
}
