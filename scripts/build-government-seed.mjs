// studio/scripts/build-government-seed.mjs
// Turns the Government content package into the Studio seed.
//
// The Government templates and modules are authored under content/government.
// Studio ships a seed built from them, in the shapes the catalogue already
// carries, so the gallery and the outcome catalogue read one list whichever
// application a workspace serves.
//
// Run it from the Studio repository root:
//   node scripts/build-government-seed.mjs
//
// The script reads ../content/government and writes
// apps/frontend/src/data/government.seed.json.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const studioRoot = resolve(here, '..');
const contentRoot = resolve(studioRoot, '..', 'content', 'government');
const target = join(studioRoot, 'apps', 'frontend', 'src', 'data', 'government.seed.json');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Turns one module fragment into the catalogue shape Studio reads. */
function moduleOf(fragment) {
  const held = fragment.module;
  const dependencies = fragment.dependencies ?? [];
  const reasonByDepId = {};
  for (const entry of dependencies) {
    if (entry.reason) reasonByDepId[entry.module] = entry.reason;
  }
  return {
    moduleId: held.id,
    title: held.title,
    projectType: 'blockchain',
    category: held.category,
    tags: ['government', held.category.toLowerCase()],
    blurb: held.contributes,
    longDescription: [fragment.meta?.summary, held.removal].filter(Boolean),
    dependsOn: dependencies.filter((entry) => entry.kind === 'requires').map((entry) => entry.module),
    recommends: dependencies
      .filter((entry) => entry.kind === 'recommends')
      .map((entry) => entry.module),
    reasonByDepId,
  };
}

/** Turns one template file into the catalogue shape Studio reads. */
function templateOf(file) {
  const held = file.template;
  const modules = file.modules ?? [];
  return {
    id: held.id,
    projectType: 'blockchain',
    title: held.title,
    description: held.summary,
    tags: ['government', held.area],
    preinstalledModules: modules
      .filter((entry) => entry.kind === 'preinstalled')
      .map((entry) => entry.module),
    modules: modules.map((entry) => entry.module),
    edges: [],
    ui: { pages: [] },
  };
}

/** The Government posture one template carries. */
function postureOf(file) {
  return {
    templateId: file.template.id,
    outcome: file.template.outcome,
    deployment: file.deployment,
    governance: file.governance,
    answers: file.answers,
  };
}

const moduleFiles = readdirSync(join(contentRoot, 'modules'))
  .filter((name) => name.endsWith('.json'))
  .sort();
const templateFiles = readdirSync(contentRoot)
  .filter((name) => name.startsWith('gov-') && name.endsWith('.json'))
  .sort();

const modules = moduleFiles.map((name) => moduleOf(readJson(join(contentRoot, 'modules', name))));
const templateSources = templateFiles.map((name) => readJson(join(contentRoot, name)));
const templates = templateSources.map(templateOf);
const postures = templateSources.map(postureOf);

writeFileSync(
  target,
  `${JSON.stringify({ modules, templates, postures }, null, 2)}\n`,
  'utf8',
);

console.info(
  `Cerulea wrote ${modules.length} Government modules and ${templates.length} Government templates to ${target}.`,
);
