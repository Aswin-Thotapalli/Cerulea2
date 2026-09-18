// apps/frontend/src/lib/templates/gallery.ts
// Describes every template for the gallery door.
//
// The template seed carries no area and no difficulty. Cerulea derives both
// from the modules each template installs.
//
// Area. The plain-words category of every module in the template closure,
// ordered by how many modules sit in it. A template belongs to every area it
// touches, so one filter finds every template that covers that area.
//
// Difficulty. A count of the decisions a template brings. The count adds the
// number of parts installed, the number of areas those parts sit in, and the
// number of parts that need another part. Fewer than fourteen reads as a
// starter template. Fewer than eighteen reads as a standard one. The rest read
// as advanced.

import type { CatalogueModule, CatalogueTemplate, ProjectTrack } from '@/lib/catalogue/types';
import { groupLabel } from '@/lib/outcomes/catalogue';
import { indexModules, resolveDependencyClosure, type ModuleIndex } from '@/lib/modules/resolve';
import { termSet, tokenise } from '@/lib/intent/tokenise';
import { TRACK_LABEL } from '@/lib/track/derive';

export type TemplateDifficulty = 'Starter' | 'Standard' | 'Advanced';

/** The highest decision count that still reads as a starter template. */
export const STARTER_LIMIT = 13;
/** The highest decision count that still reads as a standard template. */
export const STANDARD_LIMIT = 17;

export type TemplateCard = {
  template: CatalogueTemplate;
  /** The plain name of the track this template runs on. */
  trackLabel: string;
  /** Every area this template touches, most covered first. */
  areas: string[];
  /** Every part Cerulea installs for this template, dependencies included. */
  partCount: number;
  difficulty: TemplateDifficulty;
  /** One sentence stating why the badge reads as it does. */
  difficultyReason: string;
  /** Parts the template names that the catalogue does not hold. */
  missingParts: string[];
  /** The terms this card answers a search with. */
  searchTerms: Set<string>;
};

export { TRACK_LABEL } from '@/lib/track/derive';

/** Reads the difficulty band from the decision count. */
export function difficultyFor(decisionCount: number): TemplateDifficulty {
  if (decisionCount <= STARTER_LIMIT) return 'Starter';
  if (decisionCount <= STANDARD_LIMIT) return 'Standard';
  return 'Advanced';
}

/** Describes one template for the gallery. */
export function describeTemplate(template: CatalogueTemplate, index: ModuleIndex): TemplateCard {
  const seeds = template.modules ?? template.preinstalledModules ?? [];
  const closure = resolveDependencyClosure(seeds, index);
  const held = closure.installed.map((moduleId) => index.get(moduleId)).filter(Boolean) as CatalogueModule[];

  const countByArea = new Map<string, number>();
  for (const part of held) {
    const area = groupLabel(part.category);
    countByArea.set(area, (countByArea.get(area) ?? 0) + 1);
  }
  const areas = Array.from(countByArea.entries())
    .sort((left, right) => (right[1] - left[1]) || left[0].localeCompare(right[0]))
    .map(([area]) => area);

  const linked = held.filter((part) => (part.dependsOn ?? []).length > 0).length;
  const decisionCount = closure.installed.length + areas.length + linked;
  const difficulty = difficultyFor(decisionCount);

  return {
    template,
    trackLabel: TRACK_LABEL[template.projectType],
    areas,
    partCount: closure.installed.length,
    difficulty,
    difficultyReason:
      `Cerulea installs ${closure.installed.length} parts across ${areas.length} areas. ` +
      `${linked} of those parts need another part.`,
    missingParts: closure.missing,
    searchTerms: termSet([
      template.title,
      template.description,
      ...(template.tags ?? []),
      ...(template.ui?.pages ?? []),
      ...areas,
      ...held.map((part) => part.title),
    ]),
  };
}

/** Describes every template in the catalogue. */
export function describeTemplates(
  templates: CatalogueTemplate[],
  modules: CatalogueModule[],
): TemplateCard[] {
  const index = indexModules(modules);
  return templates.map((template) => describeTemplate(template, index));
}

export type GalleryFilter = {
  query?: string;
  areas?: string[];
  track?: ProjectTrack | 'any';
  difficulty?: TemplateDifficulty | 'any';
};

/**
 * Narrows the gallery.
 * A search matches when the card answers every word we typed.
 * An area filter matches when the template touches that area.
 */
export function filterTemplates(cards: TemplateCard[], filter: GalleryFilter): TemplateCard[] {
  const terms = tokenise(filter.query ?? '');
  const areas = filter.areas ?? [];
  return cards.filter((card) => {
    if (filter.track && filter.track !== 'any' && card.template.projectType !== filter.track) return false;
    if (filter.difficulty && filter.difficulty !== 'any' && card.difficulty !== filter.difficulty) return false;
    if (areas.length > 0 && !areas.every((area) => card.areas.includes(area))) return false;
    return terms.every((term) => card.searchTerms.has(term));
  });
}

/** Lists every area the gallery can filter by, ordered by how many templates touch it. */
export function galleryAreas(cards: TemplateCard[]): Array<{ area: string; count: number }> {
  const counts = new Map<string, number>();
  for (const card of cards) {
    for (const area of card.areas) counts.set(area, (counts.get(area) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([area, count]) => ({ area, count }))
    .sort((left, right) => (right.count - left.count) || left.area.localeCompare(right.area));
}
