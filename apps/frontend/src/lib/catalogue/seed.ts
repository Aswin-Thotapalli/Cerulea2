// apps/frontend/src/lib/catalogue/seed.ts
// The Cerulea catalogue as it ships, typed once.
// TypeScript widens the shape it reads from a JSON file, so every reader that
// casts the seed writes the same cast. This module holds that cast in one place.
// The catalogue routes serve the same data to the browser.

import modulesSeed from '@/data/modules.seed.json';
import templatesSeed from '@/data/templates.seed.json';
import type { Catalogue, CatalogueModule, CatalogueTemplate } from './types';

/** The 225 module catalogue. */
export const SEED_MODULES = (modulesSeed as unknown as { modules: CatalogueModule[] }).modules;

/** The 100 template catalogue. */
export const SEED_TEMPLATES = (templatesSeed as unknown as { templates: CatalogueTemplate[] })
  .templates;

/** Both halves of the catalogue. */
export const SEED_CATALOGUE: Catalogue = {
  modules: SEED_MODULES,
  templates: SEED_TEMPLATES,
};
