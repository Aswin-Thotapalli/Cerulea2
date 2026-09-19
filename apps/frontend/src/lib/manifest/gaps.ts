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

import type { CatalogueModule } from '@/lib/catalogue/types';
import { firstClause } from '@/lib/outcomes/catalogue';
import { indexModules, recommendationGaps } from '@/lib/modules/resolve';
import { toReadable } from '@/lib/blueprint/compose';
import type { DeploymentManifest } from './types';

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

/**
 * The reason one installed part gives for recommending another.
 * The catalogue records a reason per dependency. Where the recommending part
 * declares no reason for this name, Cerulea states what the recommended part
 * contributes instead, which is true and reads the same way.
 */
export function reasonFor(
  recommender: CatalogueModule,
  recommended: CatalogueModule,
): string {
  const held = recommender.reasonByDepId?.[recommended.moduleId];
  if (held && held.trim().length > 0) return held.trim();
  const clause = firstClause(recommended.blurb ?? '') || recommended.title;
  return `${recommender.title} works better beside it. ${clause}.`;
}

/** Every recommended part this manifest leaves uninstalled. */
export function gapsForManifest(
  manifest: DeploymentManifest,
  modules: CatalogueModule[],
): RecommendationGap[] {
  return gapsForModules(
    manifest.modules.map((entry) => entry.module),
    modules,
  );
}

/** Every recommended part one installed set leaves out. */
export function gapsForModules(
  installed: string[],
  modules: CatalogueModule[],
): RecommendationGap[] {
  const index = indexModules(modules);
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
        `The catalogue recommends it beside the parts already installed.`,
      screen: 'Compose',
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
