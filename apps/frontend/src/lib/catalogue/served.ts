// apps/frontend/src/lib/catalogue/served.ts
// The catalogue one project sees, read on the server.
// The module and template routes narrow the seeds by project type and by
// division: a division sees its own entries and the shared ones. A route that
// resolves a canvas or reads a proposal on the server narrows the same way
// here, so the server and the browser agree on which parts exist.

import type { Division } from '@/config/divisions';
import { SEED_MODULES, SEED_TEMPLATES } from './seed';
import type { Catalogue, CatalogueModule, CatalogueTemplate, ProjectTrack } from './types';

type Narrowing = { projectType?: ProjectTrack | null; division?: Division | null };

type Divided = { division?: 'dapp' | 'enterprise' | 'govt' };

function onDivision<T extends Divided>(list: T[], division: Division | null | undefined): T[] {
  if (!division) return list;
  return list.filter((entry) => !entry.division || entry.division === division);
}

/** The modules a project may install. */
export function servedModules(narrowing: Narrowing): CatalogueModule[] {
  let list = SEED_MODULES as Array<CatalogueModule & Divided>;
  if (narrowing.projectType) list = list.filter((entry) => entry.projectType === narrowing.projectType);
  return onDivision(list, narrowing.division);
}

/** The templates a project may start from, the division's own first. */
export function servedTemplates(narrowing: Narrowing): CatalogueTemplate[] {
  let list = (SEED_TEMPLATES as Array<CatalogueTemplate & Divided>).slice();
  if (narrowing.projectType) list = list.filter((entry) => entry.projectType === narrowing.projectType);
  list = onDivision(list, narrowing.division);
  if (narrowing.division) {
    const division = narrowing.division;
    list.sort((left, right) => (left.division === division ? 0 : 1) - (right.division === division ? 0 : 1));
  }
  return list;
}

/** Both halves, narrowed the same way. */
export function servedCatalogue(narrowing: Narrowing): Catalogue {
  return { modules: servedModules(narrowing), templates: servedTemplates(narrowing) };
}

/** The modules one template installs, as the seed names them. */
export function templateModuleIds(templateId: string): string[] {
  const template = SEED_TEMPLATES.find((entry) => entry.id === templateId);
  return Array.from(new Set(template?.modules ?? template?.preinstalledModules ?? []));
}
