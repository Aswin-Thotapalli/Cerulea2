// apps/frontend/src/lib/catalogue/load.ts
// Reads the Cerulea catalogue from the routes that serve it.
// Every entry door works from this one read.
// Without the catalogue Studio proposes nothing.

import type { Catalogue, CatalogueModule, CatalogueTemplate } from './types';

async function readList<T>(url: string, subject: string): Promise<T[]> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw new Error(
      `Cerulea could not read the ${subject}. Check that Studio is running, then open this screen again.`,
      { cause },
    );
  }
  if (!response.ok) {
    throw new Error(
      `Cerulea could not read the ${subject}. The catalogue route answered ${response.status}. ` +
        'Restart Studio, then open this screen again.',
    );
  }
  const payload = await response.json().catch(() => null);
  if (!Array.isArray(payload)) {
    throw new Error(
      `Cerulea read the ${subject} and found no list. Restart Studio, then open this screen again.`,
    );
  }
  return payload as T[];
}

/** Reads the 225 module catalogue. */
export function loadModules(): Promise<CatalogueModule[]> {
  return readList<CatalogueModule>('/api/modules', 'module catalogue');
}

/** Reads the 100 template catalogue. */
export function loadTemplates(): Promise<CatalogueTemplate[]> {
  return readList<CatalogueTemplate>('/api/templates', 'template catalogue');
}

/** Reads both halves of the catalogue in one pass. */
export async function loadCatalogue(): Promise<Catalogue> {
  const [modules, templates] = await Promise.all([loadModules(), loadTemplates()]);
  return { modules, templates };
}
