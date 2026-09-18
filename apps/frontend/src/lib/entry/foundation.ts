// apps/frontend/src/lib/entry/foundation.ts
// The start fresh door still opens on a working project.
// Cerulea reads the catalogue, finds the smallest template that already works
// on the chosen track and installs that closure as the foundation.
// Without a foundation the canvas opens empty and nothing on it is valid.

import type { CatalogueModule, CatalogueTemplate, ProjectTrack } from '@/lib/catalogue/types';
import { indexModules, resolveDependencyClosure } from '@/lib/modules/resolve';

export type FoundationPart = {
  moduleId: string;
  title: string;
  /** One sentence stating what this part contributes. */
  contribution: string;
  /** The modules that asked for this part. Empty while the template named it directly. */
  requiredBy: string[];
  /** The reason the seed records for the dependency, when one exists. */
  reason: string | null;
};

export type Foundation = {
  track: ProjectTrack;
  /** The template the foundation came from. */
  sourceTemplate: CatalogueTemplate;
  parts: FoundationPart[];
  /** One sentence naming where the foundation came from. */
  provenance: string;
};

/**
 * Finds the smallest working project on a track.
 * Size is the number of parts Cerulea installs, dependencies included.
 * Equal sizes keep alphabetical order by template identifier, so the same
 * catalogue always produces the same foundation.
 */
export function smallestTemplateFor(
  track: ProjectTrack,
  templates: CatalogueTemplate[],
  modules: CatalogueModule[],
): CatalogueTemplate | null {
  const index = indexModules(modules);
  const onTrack = templates.filter((template) => template.projectType === track);
  if (onTrack.length === 0) return null;
  let best: { template: CatalogueTemplate; size: number } | null = null;
  for (const template of onTrack) {
    const closure = resolveDependencyClosure(template.modules ?? template.preinstalledModules ?? [], index);
    const size = closure.installed.length;
    if (
      !best ||
      size < best.size ||
      (size === best.size && template.id.localeCompare(best.template.id) < 0)
    ) {
      best = { template, size };
    }
  }
  return best?.template ?? null;
}

/** Builds the foundation a start fresh project opens on. */
export function buildFoundation(
  track: ProjectTrack,
  templates: CatalogueTemplate[],
  modules: CatalogueModule[],
): Foundation | null {
  const source = smallestTemplateFor(track, templates, modules);
  if (!source) return null;

  const index = indexModules(modules);
  const seeds = source.modules ?? source.preinstalledModules ?? [];
  const closure = resolveDependencyClosure(seeds, index);
  const chosen = new Set(closure.chosen);

  const parts: FoundationPart[] = closure.installed.map((moduleId) => {
    const part = index.get(moduleId) as CatalogueModule;
    return {
      moduleId,
      title: part.title,
      contribution: part.blurb ?? part.longDescription?.[0] ?? part.title,
      requiredBy: chosen.has(moduleId)
        ? []
        : (closure.requiredBy[moduleId] ?? []).map((asker) => index.get(asker)?.title ?? asker),
      reason: closure.reasonById[moduleId] ?? null,
    };
  });

  return {
    track,
    sourceTemplate: source,
    parts,
    provenance:
      `Cerulea starts from the smallest working project on this track, ${source.title}. ` +
      `That gives ${parts.length} parts, and every one of them works on its own.`,
  };
}
