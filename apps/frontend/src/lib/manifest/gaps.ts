// apps/frontend/src/lib/manifest/gaps.ts
// Gap detection from the recommendation lists.
//
// The catalogue records a recommendation list per module, together with the
// reason every dependant gives for reaching a module. The manifest reports
// every recommended part left uninstalled, with the reason each one is
// recommended.
//
// A gap is a real gap. A part already installed never appears, and a name the
// catalogue does not hold never appears.
//
// Without this check a person would deploy a system missing the part the
// catalogue has recommended for every project like it.

import modulesSeed from '@/data/modules.seed.json';
import type { CatalogueModule } from '@/lib/catalogue/types';
import type { DeploymentManifest } from './types';

/** The 225 module catalogue, as the production seed ships it. */
export const CATALOGUE_MODULES: CatalogueModule[] = (
  modulesSeed as unknown as { modules: CatalogueModule[] }
).modules;

export type RecommendationGap = {
  moduleId: string;
  /** The name a person reads. */
  title: string;
  /** One sentence stating what this part contributes. */
  contributes: string;
  /** The parts already installed that recommend this one. */
  recommendedBy: { moduleId: string; title: string; reason: string }[];
  /** One sentence stating why the catalogue recommends it here. */
  reason: string;
  /** The screen that installs it. */
  screen: string;
};

/** Reads an identifier as words. */
export function toReadable(identifier: string): string {
  const words = identifier.split('_').filter((part) => part.length > 0);
  if (words.length === 0) return identifier;
  return `${words[0].charAt(0).toUpperCase()}${words[0].slice(1)}${
    words.length > 1 ? ` ${words.slice(1).join(' ')}` : ''
  }`;
}

/** The first clause of a blurb, before the first full stop, semicolon or colon. */
export function firstClause(blurb: string): string {
  const text = blurb.trim();
  if (text.length === 0) return '';
  const cut = text.search(/[.;:]/);
  return (cut < 0 ? text : text.slice(0, cut)).trim();
}

/**
 * The reason one installed part gives for recommending another.
 * The catalogue records a reason per dependency. Where the recommending part
 * declares no reason for this name, Cerulea states what the recommended part
 * contributes instead, which is true and reads the same way.
 */
export function reasonFor(recommender: CatalogueModule, recommended: CatalogueModule): string {
  const held = recommender.reasonByDepId?.[recommended.moduleId];
  if (held && held.trim().length > 0) return held.trim();
  const clause = firstClause(recommended.blurb ?? '') || recommended.title;
  return `${recommender.title} works better beside it. ${clause}.`;
}

/**
 * Lists the modules a set recommends and does not yet hold.
 * The catalogue records a recommendation list per module. A gap is a real gap.
 */
export function recommendationGaps(
  installed: string[],
  index: Map<string, CatalogueModule>,
): { moduleId: string; recommendedBy: string[] }[] {
  const held = new Set(installed);
  const byModule = new Map<string, string[]>();
  for (const moduleId of installed) {
    for (const recommended of index.get(moduleId)?.recommends ?? []) {
      if (held.has(recommended)) continue;
      if (!index.has(recommended)) continue;
      const list = byModule.get(recommended) ?? [];
      if (!list.includes(moduleId)) list.push(moduleId);
      byModule.set(recommended, list);
    }
  }
  return Array.from(byModule.entries())
    .map(([moduleId, recommendedBy]) => ({ moduleId, recommendedBy: recommendedBy.sort() }))
    .sort((left, right) => left.moduleId.localeCompare(right.moduleId));
}

/** Every recommended part this manifest leaves uninstalled. */
export function gapsForManifest(
  manifest: DeploymentManifest,
  modules: CatalogueModule[] = CATALOGUE_MODULES,
): RecommendationGap[] {
  return gapsForModules(
    manifest.modules.map((entry) => entry.module),
    modules,
  );
}

/** Every recommended part one installed set leaves out. */
export function gapsForModules(
  installed: string[],
  modules: CatalogueModule[] = CATALOGUE_MODULES,
): RecommendationGap[] {
  const index = new Map(modules.map((entry) => [entry.moduleId, entry] as const));
  return recommendationGaps(installed, index).map((gap) => {
    const part = index.get(gap.moduleId) as CatalogueModule;
    const recommenders = gap.recommendedBy
      .map((moduleId) => index.get(moduleId))
      .filter((entry): entry is CatalogueModule => entry !== undefined)
      .map((entry) => ({
        moduleId: entry.moduleId,
        title: entry.title,
        reason: reasonFor(entry, part),
      }));
    return {
      moduleId: gap.moduleId,
      title: part.title || toReadable(gap.moduleId),
      contributes: part.longDescription?.[0] ?? part.blurb ?? part.title,
      recommendedBy: recommenders,
      reason:
        recommenders[0]?.reason ??
        'The catalogue recommends it beside the parts already installed.',
      screen: 'Step 2 Blueprint',
    };
  });
}

/** One sentence stating what the gap list holds. */
export function gapHeadline(gaps: RecommendationGap[]): string {
  if (gaps.length === 0) {
    return 'Every part the catalogue recommends beside these parts is already installed.';
  }
  if (gaps.length === 1) {
    return 'One part the catalogue recommends beside these parts is missing.';
  }
  return `${gaps.length} parts the catalogue recommends beside these parts are missing.`;
}
