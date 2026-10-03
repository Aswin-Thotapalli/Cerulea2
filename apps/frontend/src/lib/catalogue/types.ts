// apps/frontend/src/lib/catalogue/types.ts
// The shapes of the Cerulea catalogue.
// The catalogue holds 225 modules, 100 templates and the reason behind every
// dependency. Every surface that proposes work reads these shapes.

export type ProjectTrack = 'dapp' | 'blockchain';

/** One module of the Cerulea catalogue, exactly as the seed carries it. */
export type CatalogueModule = {
  moduleId: string;
  title: string;
  projectType: ProjectTrack;
  category: string;
  tags?: string[];
  blurb?: string;
  longDescription?: string[];
  dependsOn?: string[];
  recommends?: string[];
  reasonByDepId?: Record<string, string>;
  configSchema?: unknown;
};

/** One link a template draws between two modules. */
export type CatalogueTemplateEdge = {
  from: string;
  to: string;
  rel: string;
};

/** One template of the Cerulea catalogue, exactly as the seed carries it. */
export type CatalogueTemplate = {
  id: string;
  projectType: ProjectTrack;
  title: string;
  description?: string;
  tags?: string[];
  preinstalledModules?: string[];
  modules?: string[];
  edges?: CatalogueTemplateEdge[];
  ui?: { pages?: string[] };
};

export type Catalogue = {
  modules: CatalogueModule[];
  templates: CatalogueTemplate[];
};
