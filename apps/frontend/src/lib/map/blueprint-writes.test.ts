import { describe, expect, it } from 'vitest';

import { readBlueprintDocument } from '@/lib/blueprint/document';
import { ENTITY_PRESETS, toIdentifier } from '@/lib/blueprint/compose';
import type { CatalogueModule, CatalogueTemplate } from '@/lib/catalogue/types';
import { bridgeOutcomeId } from '@/lib/outcomes/bridges';
import { applyCanvas as applyCanvasFull, eventIdOf } from './blueprint-writes';
import { buildCanvasModel, outcomeIdOf, prepareCatalogue, withFeedsAnswer, withTrigger, type CanvasSelection } from './canvas';

// Two seed parts that keep records stand in for the source and the target.
const recordModules = Object.keys(ENTITY_PRESETS).filter((moduleId) => ENTITY_PRESETS[moduleId].length > 0);
const [sourceId, targetId] = recordModules;
const sourceCollection = toIdentifier(ENTITY_PRESETS[sourceId][0].name);

const modules: CatalogueModule[] = [
  { moduleId: sourceId, title: 'Source', projectType: 'blockchain', category: 'records', blurb: 'Writes records.', dependsOn: [] },
  { moduleId: targetId, title: 'Target', projectType: 'blockchain', category: 'records', blurb: 'Reads records.', dependsOn: [] },
  { moduleId: 'bell', title: 'Bell', projectType: 'blockchain', category: 'notify', blurb: 'Rings.', dependsOn: [] },
  { moduleId: 'clock', title: 'Clock', projectType: 'blockchain', category: 'time', blurb: 'Ticks.', dependsOn: [] },
];

const templates: CatalogueTemplate[] = [
  {
    id: 'pair',
    projectType: 'blockchain',
    title: 'Pair',
    modules: [sourceId, targetId, 'bell', 'clock'],
    edges: [
      { from: sourceId, to: targetId, rel: 'feeds' },
      { from: 'bell', to: targetId, rel: 'feeds' },
      { from: 'clock', to: 'bell', rel: 'triggers' },
    ],
  },
];

const prepared = prepareCatalogue({ modules, templates });

describe('applyCanvas', () => {
  it('composes the collections, writes one event per chosen link and names a link without a payload', () => {
    let selection: CanvasSelection = { outcomeIds: [sourceId, targetId, 'bell', 'clock'].map(outcomeIdOf), removedModuleIds: [], chosenLinks: [] };
    selection = withFeedsAnswer(selection, targetId, [sourceId]);
    selection = withTrigger(selection, { from: 'clock', to: 'bell' }, true);
    const model = buildCanvasModel(selection, prepared);
    const written = applyCanvasFull(readBlueprintDocument({}, 'Pair'), model, selection, [], { retentionDays: 90, titleById: prepared.titleById });

    expect(written.blueprint.collections.some((entry) => entry.id === sourceCollection)).toBe(true);
    expect(written.blueprint.collections.every((entry) => entry.retention.period_days === 90)).toBe(true);
    const feedsLink = model.links.find((link) => link.type === 'feeds' && link.origin === 'chosen');
    expect(feedsLink).toBeDefined();
    const event = written.blueprint.events.find((entry) => entry.id === eventIdOf(feedsLink!));
    expect(event).toBeDefined();
    expect(event?.payload_type).toBe(`${sourceCollection}_record`);
    expect(event?.name).toBe('Source feeds Target');
    expect(event?.audit).toBe(true);
    expect(written.linksWithoutEvent).toHaveLength(1);
    expect(written.linksWithoutEvent[0].linkId).toBe('triggers:clock->bell');
    expect(written.linksWithoutEvent[0].reason).toContain('Clock');
  });

  it('removes the event of a link that was removed and keeps events another step wrote', () => {
    let selection: CanvasSelection = { outcomeIds: [sourceId, targetId, 'bell'].map(outcomeIdOf), removedModuleIds: [], chosenLinks: [] };
    selection = withFeedsAnswer(selection, targetId, [sourceId]);
    const first = write(buildCanvasModel(selection, prepared), selection);
    const foreign = { id: 'inspector_signed', name: 'Inspector signed', payload_type: `${sourceCollection}_record`, audit: true, description: 'Written by the Data schema step.' };
    const withForeign = { ...first.blueprint, events: [...first.blueprint.events, foreign] };
    const cleared = withFeedsAnswer(selection, targetId, []);
    const second = write(buildCanvasModel(cleared, prepared), cleared, withForeign, first.composedCollectionIds);
    expect(second.blueprint.events.map((entry) => entry.id)).toEqual(['inspector_signed']);
  });

  it('writes one bridge endpoint per bridge statement over the first collection', () => {
    const outcomeId = bridgeOutcomeId('cosmos');
    const selection: CanvasSelection = { outcomeIds: [outcomeIdOf(sourceId), outcomeId], removedModuleIds: [], chosenLinks: [] };
    const model = buildCanvasModel(selection, prepared);
    const written = applyCanvasFull(readBlueprintDocument({}, 'Pair'), model, selection, [], { titleById: prepared.titleById });
    expect(written.blueprint.integrations.bridges).toHaveLength(1);
    expect(written.blueprint.integrations.bridges[0]).toMatchObject({ direction: 'Both', confirmations: 12 });
    expect(written.blueprint.integrations.bridges[0].collection).toBe(written.blueprint.collections[0].id);
    expect(written.bridgesWithoutEndpoint).toEqual([]);

    // The bridge runtime brings governance records with it, so even a bridge
    // statement alone keeps a collection for the endpoint to exchange.
    const bare: CanvasSelection = { outcomeIds: [outcomeId], removedModuleIds: [], chosenLinks: [] };
    const bareWritten = applyCanvasFull(readBlueprintDocument({}, 'Pair'), buildCanvasModel(bare, prepared), bare, [], { titleById: prepared.titleById });
    expect(bareWritten.blueprint.integrations.bridges).toHaveLength(1);
    expect(bareWritten.bridgesWithoutEndpoint).toEqual([]);
  });
});

/** A shorter call for the tests above. */
function write(
  model: ReturnType<typeof buildCanvasModel>,
  selection: CanvasSelection,
  document = readBlueprintDocument({}, 'Pair'),
  previouslyComposed: string[] = [],
) {
  return applyCanvasFull(document, model, selection, previouslyComposed, { titleById: prepared.titleById });
}
