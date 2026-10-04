import { describe, expect, it } from 'vitest';

import type { CatalogueModule, CatalogueTemplate } from '@/lib/catalogue/types';
import { SEED_MODULES, SEED_TEMPLATES } from '@/lib/catalogue/seed';
import {
  EMPTY_SELECTION,
  buildCanvasModel,
  drawableKinds,
  layoutPositions,
  openingSelection,
  outcomeIdOf,
  prepareCatalogue,
  readSavedGraph,
  removalQuestion,
  savedGraphOf,
  withFeedsAnswer,
  withModule,
  withModuleRemoved,
  withTrigger,
  withoutLink,
  type CanvasSelection,
} from './canvas';

/** A small catalogue with every relation the four link types need. */
const modules: CatalogueModule[] = [
  { moduleId: 'ledger', title: 'Ledger', projectType: 'blockchain', category: 'records', blurb: 'Keeps every entry; nothing is lost.', tags: ['records'], dependsOn: [] },
  { moduleId: 'intake', title: 'Intake', projectType: 'blockchain', category: 'records', blurb: 'Records each arriving shipment at the gate.', tags: ['shipment'], dependsOn: ['ledger'], reasonByDepId: { ledger: 'Intake writes every arrival into the ledger.' } },
  { moduleId: 'inspection', title: 'Inspection', projectType: 'blockchain', category: 'quality', blurb: 'Lets an inspector sign before release.', tags: ['inspector'], dependsOn: ['ledger'] },
  { moduleId: 'alerts', title: 'Alerts', projectType: 'blockchain', category: 'notify', blurb: 'Sends a message when a limit is breached.', tags: ['alert'], dependsOn: [] },
  { moduleId: 'access', title: 'Access Control', projectType: 'blockchain', category: 'access-control', blurb: 'Decides who may change a record.', tags: ['permission'], dependsOn: [] },
  { moduleId: 'release', title: 'Release', projectType: 'blockchain', category: 'records', blurb: 'Releases a shipment once it passes.', tags: ['shipment'], dependsOn: ['access'] },
];

const templates: CatalogueTemplate[] = [
  {
    id: 'yard',
    projectType: 'blockchain',
    title: 'Yard',
    modules: ['ledger', 'intake', 'inspection', 'alerts', 'access', 'release'],
    edges: [
      { from: 'intake', to: 'release', rel: 'feeds' },
      { from: 'inspection', to: 'release', rel: 'feeds' },
      { from: 'inspection', to: 'alerts', rel: 'notifies' },
      { from: 'access', to: 'release', rel: 'gates' },
    ],
  },
];

const prepared = prepareCatalogue({ modules, templates });

function select(...moduleIds: string[]): CanvasSelection {
  return { outcomeIds: moduleIds.map(outcomeIdOf), removedModuleIds: [], chosenLinks: [] };
}

describe('buildCanvasModel', () => {
  it('installs the dependency closure and draws the requires links', () => {
    const model = buildCanvasModel(select('intake'), prepared);
    expect(model.installed).toEqual(['ledger', 'intake']);
    const requires = model.links.filter((link) => link.type === 'requires');
    expect(requires).toHaveLength(1);
    expect(requires[0]).toMatchObject({ from: 'intake', to: 'ledger', origin: 'derived', removable: false });
    expect(requires[0].reason).toBe('Intake writes every arrival into the ledger.');
  });

  it('names the outcome that caused each card and what stops after removal', () => {
    const model = buildCanvasModel(select('intake'), prepared);
    const ledger = model.cards.find((card) => card.moduleId === 'ledger');
    expect(ledger?.chosenDirectly).toBe(false);
    expect(ledger?.causedBy).toEqual(['Records each arriving shipment at the gate']);
    expect(ledger?.removalConsequence).toContain('Intake');
  });

  it('asks a feeds question when two sources exist and draws governs from the matrix', () => {
    const model = buildCanvasModel(select('intake', 'inspection', 'release', 'alerts'), prepared);
    expect(model.feedsQuestions).toHaveLength(1);
    expect(model.feedsQuestions[0].to).toBe('release');
    expect(model.feedsQuestions[0].options.map((option) => option.from).sort()).toEqual(['inspection', 'intake']);
    expect(model.links.filter((link) => link.type === 'feeds')).toHaveLength(0);
    const governs = model.links.filter((link) => link.type === 'governs');
    expect(governs.map((link) => `${link.from}->${link.to}`)).toEqual(['access->release']);
    expect(model.triggerPairs.map((pair) => `${pair.from}->${pair.to}`)).toEqual(['inspection->alerts']);
  });

  it('draws the chosen feeds and triggers links and leaves an invalid pair out', () => {
    let selection = select('intake', 'inspection', 'release', 'alerts');
    selection = withFeedsAnswer(selection, 'release', ['intake']);
    selection = withTrigger(selection, { from: 'inspection', to: 'alerts' }, true);
    selection = withTrigger(selection, { from: 'ledger', to: 'alerts' }, true);
    const model = buildCanvasModel(selection, prepared);
    const chosen = model.links.filter((link) => link.origin === 'chosen');
    expect(chosen.map((link) => link.linkId).sort()).toEqual(['feeds:intake->release', 'triggers:inspection->alerts']);
    expect(chosen.every((link) => link.removable)).toBe(true);
    expect(drawableKinds('intake', 'release', model)).toEqual(['feeds']);
    expect(drawableKinds('inspection', 'alerts', model)).toEqual(['triggers']);
    expect(drawableKinds('ledger', 'alerts', model)).toEqual([]);
    const without = withoutLink(selection, 'triggers:inspection->alerts');
    expect(buildCanvasModel(without, prepared).links.filter((link) => link.type === 'triggers')).toHaveLength(0);
  });
});

describe('adding and removing parts', () => {
  it('adds a part through its own statement and brings a removed part back', () => {
    const added = withModule(EMPTY_SELECTION, 'inspection');
    expect(added.outcomeIds).toEqual([outcomeIdOf('inspection')]);
    expect(buildCanvasModel(added, prepared).installed).toEqual(['ledger', 'inspection']);
    const removed: CanvasSelection = { ...added, removedModuleIds: ['inspection'] };
    expect(withModule(removed, 'inspection').removedModuleIds).toEqual([]);
  });

  it('asks before removal and names the dependants and the statements that stop', () => {
    const selection = select('intake', 'inspection');
    const model = buildCanvasModel(selection, prepared);
    const question = removalQuestion('ledger', model, prepared);
    expect(question.safe).toBe(false);
    expect(question.dependants.map((entry) => entry.title).sort()).toEqual(['Inspection', 'Intake']);
    expect(question.summary).toContain('Removing Ledger stops');
    const own = removalQuestion('intake', model, prepared);
    expect(own.outcomesLost).toEqual(['Records each arriving shipment at the gate']);
    const after = withModuleRemoved(selection, 'intake', own);
    expect(after.outcomeIds).toEqual([outcomeIdOf('inspection')]);
    expect(after.removedModuleIds).toEqual(['intake']);
    expect(buildCanvasModel(after, prepared).installed).toEqual(['ledger', 'inspection']);
  });
});

describe('the saved graph', () => {
  it('keeps positions and settings through a save and a read', () => {
    const selection = select('intake');
    const model = buildCanvasModel(selection, prepared);
    const positions = layoutPositions(model.installed, { intake: { x: 400, y: 120 } });
    const settings = { intake: { group: 'Gate', config: { lanes: 2 } } };
    const saved = savedGraphOf(model, selection, positions, settings);
    expect(saved.modules.map((entry) => entry.moduleId)).toEqual(['ledger', 'intake']);
    expect(saved.graph.edges[0]).toMatchObject({ type: 'link', data: { linkType: 'requires' } });
    const loaded = readSavedGraph(saved);
    expect(loaded.selection).toEqual(selection);
    expect(loaded.positions.intake).toEqual({ x: 400, y: 120 });
    expect(loaded.settings.intake).toEqual({ group: 'Gate', config: { lanes: 2 } });
    expect(loaded.legacyEdges).toEqual([]);
  });

  it('reads a production graph and maps its wires onto the four link types', () => {
    const production = {
      modules: [{ moduleId: 'intake' }, { moduleId: 'release' }, { moduleId: 'inspection' }, { moduleId: 'alerts' }],
      graph: {
        nodes: [
          { id: 'n_intake', type: 'module', position: { x: 10, y: 20 }, data: { moduleId: 'intake', title: 'Intake', group: 'Gate' } },
          { id: 'n_release', type: 'module', position: { x: 300, y: 20 }, data: { moduleId: 'release', title: 'Release' } },
          { id: 'n_inspection', type: 'module', position: { x: 10, y: 200 }, data: { moduleId: 'inspection', title: 'Inspection' } },
          { id: 'n_alerts', type: 'module', position: { x: 300, y: 200 }, data: { moduleId: 'alerts', title: 'Alerts' } },
        ],
        edges: [
          { id: 'e1', source: 'n_intake', target: 'n_release', type: 'relation', data: { rel: 'writes' } },
          { id: 'e2', source: 'n_inspection', target: 'n_alerts', type: 'relation', data: { rel: 'calls' } },
          { id: 'e3', source: 'n_alerts', target: 'n_intake', type: 'relation', data: { rel: 'custom' } },
        ],
      },
    };
    const loaded = readSavedGraph(production);
    expect(loaded.selection).toBeNull();
    expect(loaded.moduleIds).toEqual(['intake', 'release', 'inspection', 'alerts']);
    expect(loaded.settings.intake).toEqual({ group: 'Gate' });
    expect(loaded.legacyEdges).toHaveLength(3);
    const opening = openingSelection(loaded, { outcomeIds: [], moduleIds: [], removedModuleIds: [], chosenLinks: [] }, [], prepared);
    expect(opening.outcomeIds.sort()).toEqual([outcomeIdOf('alerts'), outcomeIdOf('inspection'), outcomeIdOf('intake'), outcomeIdOf('release')]);
    expect(opening.chosenLinks).toEqual([
      { kind: 'feeds', from: 'intake', to: 'release' },
      { kind: 'triggers', from: 'inspection', to: 'alerts' },
    ]);
  });

  it('joins the Foundation statements with the template parts on first opening', () => {
    const loaded = readSavedGraph(null);
    const opening = openingSelection(
      loaded,
      { outcomeIds: [outcomeIdOf('alerts')], moduleIds: [], removedModuleIds: [], chosenLinks: [] },
      ['intake', 'ledger'],
      prepared,
    );
    expect(opening.outcomeIds).toEqual([outcomeIdOf('alerts'), outcomeIdOf('intake')]);
  });
});

describe('against the Cerulea catalogue', () => {
  it('resolves a seed statement with its dependencies', () => {
    const real = prepareCatalogue({ modules: SEED_MODULES, templates: SEED_TEMPLATES });
    const part = SEED_MODULES.find((entry) => (entry.dependsOn ?? []).length > 0 && entry.dependsOn?.every((id) => real.index.has(id)));
    expect(part).toBeDefined();
    const model = buildCanvasModel(select(part?.moduleId ?? ''), real);
    for (const dependency of part?.dependsOn ?? []) expect(model.installed).toContain(dependency);
    expect(model.links.filter((link) => link.type === 'requires').length).toBeGreaterThanOrEqual(part?.dependsOn?.length ?? 0);
  });
});
