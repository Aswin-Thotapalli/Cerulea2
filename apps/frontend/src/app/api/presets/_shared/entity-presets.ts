// apps/frontend/src/app/api/presets/_shared/entity-presets.ts
// Reads entity presets from the seed catalogue for the preset routes.
// A module preset is the entity list the seed names for that module. A
// template preset joins the presets of every module the template installs.
// Without this module each preset route would read the seed its own way.

import presetsJson from '@/data/module-entity-presets.json';
import templatesJson from '@/data/templates.seed.json';

type PresetEntity = { name: string; fields?: unknown[] } & Record<string, unknown>;

type PresetCatalogue = { presets?: Record<string, PresetEntity[]> };

type TemplateCatalogue = {
  templates: { id: string; preinstalledModules?: string[]; modules?: string[] }[];
};

const PRESETS = presetsJson as unknown as PresetCatalogue;
const TEMPLATES = templatesJson as unknown as TemplateCatalogue;

/** The entity presets the seed names for one module, or an empty list. */
export function modulePresets(moduleId: string): PresetEntity[] {
  const listed = PRESETS.presets?.[moduleId];
  return Array.isArray(listed) ? listed : [];
}

/** The entity presets of every module one template installs, once per entity name. */
export function templatePresets(templateId: string): PresetEntity[] {
  const template = TEMPLATES.templates.find((entry) => entry.id === templateId);
  if (!template) return [];
  const moduleIds = template.preinstalledModules ?? template.modules ?? [];
  const joined: PresetEntity[] = [];
  const seen = new Set<string>();
  for (const moduleId of moduleIds) {
    for (const entity of modulePresets(moduleId)) {
      if (seen.has(entity.name)) continue;
      seen.add(entity.name);
      joined.push(entity);
    }
  }
  return joined;
}
