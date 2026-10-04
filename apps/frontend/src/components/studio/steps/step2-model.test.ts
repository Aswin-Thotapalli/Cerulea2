import { describe, expect, it } from 'vitest';

import { ENTITY_PRESETS, composeSections, applyComposition } from '@/lib/blueprint/compose';
import { readBlueprintDocument } from '@/lib/blueprint/document';
import { recordTypeOf } from '@/lib/blueprint/edit';
import { validateBlueprint } from '@/lib/blueprint/validate';
import type { Blueprint } from '@/lib/blueprint/types';
import {
  CUSTOM_MODULE,
  defaultText,
  groupCollections,
  isPublished,
  isUnique,
  literalFor,
  newCollection,
  optionsOf,
  presetCollectionIds,
  recommendedTriggers,
  renameCollection,
  setOptions,
  setPublished,
  setUnique,
  triggerOfAction,
  writeTrigger,
} from './step2-model';

const MODULE_IDS = Object.keys(ENTITY_PRESETS).slice(0, 2);

function starting(): Blueprint {
  const composed = composeSections(MODULE_IDS, { retentionDays: 900 });
  return applyComposition(readBlueprintDocument({}, 'Berth register'), composed, []);
}

describe('grouping collections under modules', () => {
  it('places each preset collection under the module that brought it', () => {
    const blueprint = starting();
    const grouping = groupCollections(blueprint, MODULE_IDS, {});
    expect(grouping.modules.map((entry) => entry.id)).toEqual(MODULE_IDS);
    for (const moduleId of MODULE_IDS) {
      const expected = presetCollectionIds(moduleId).filter(
        (id, index, all) => all.indexOf(id) === index,
      );
      const held = grouping.byModule[moduleId].map((entry) => entry.id);
      for (const id of held) expect(expected).toContain(id);
    }
  });

  it('places a collection added by hand under the custom group, or where the person put it', () => {
    const added = newCollection(starting(), 'Mooring fee', 900);
    expect(added.collection?.id).toBe('mooring_fee');
    const free = groupCollections(added.blueprint, MODULE_IDS, {});
    expect(free.byModule[CUSTOM_MODULE.id].map((entry) => entry.id)).toEqual(['mooring_fee']);
    const placed = groupCollections(added.blueprint, MODULE_IDS, { mooring_fee: MODULE_IDS[0] });
    expect(placed.byModule[MODULE_IDS[0]].some((entry) => entry.id === 'mooring_fee')).toBe(true);
    expect(placed.modules.some((entry) => entry.id === CUSTOM_MODULE.id)).toBe(false);
  });
});

describe('the field grid in Blueprint terms', () => {
  it('keeps a unique field as a unique index', () => {
    const blueprint = starting();
    const collection = blueprint.collections[0];
    const field = recordTypeOf(blueprint, collection)!.fields[1];
    expect(isUnique(collection, field.name)).toBe(false);
    const next = setUnique(blueprint, collection, field.name, true);
    expect(isUnique(next.collections[0], field.name)).toBe(true);
    const back = setUnique(next, next.collections[0], field.name, false);
    expect(isUnique(back.collections[0], field.name)).toBe(false);
  });

  it('turns typed text into the literal the kind takes', () => {
    expect(literalFor({ kind: 'Integer' }, '42')).toEqual({ kind: 'Integer', value: 42 });
    expect(literalFor({ kind: 'Integer' }, '4.2')).toBeUndefined();
    expect(literalFor({ kind: 'Decimal', scale: 2 }, '10.50')).toEqual({ kind: 'Decimal', value: '10.50', scale: 2 });
    expect(literalFor({ kind: 'Boolean' }, 'yes')).toEqual({ kind: 'Boolean', value: true });
    expect(literalFor({ kind: 'Optional', inner: { kind: 'Text' } }, 'open')).toEqual({ kind: 'Text', value: 'open' });
    expect(literalFor({ kind: 'List', element: { kind: 'Text' } }, 'a')).toBeUndefined();
    expect(defaultText({ name: 'n', type: { kind: 'Integer' }, required: true, validation: [], description: '', default: { kind: 'Integer', value: 7 } })).toBe('7');
  });

  it('writes an option list as a named enumeration', () => {
    const blueprint = starting();
    const collection = blueprint.collections[0];
    const next = setOptions(blueprint, collection, 1, ['Open', 'Closed', 'On hold']);
    const field = recordTypeOf(next, next.collections[0])!.fields[1];
    expect(field.type).toEqual({ kind: 'Named', name: `${collection.id}_${field.name}` });
    expect(optionsOf(next, field)).toEqual(['open', 'closed', 'on_hold']);
    expect(validateBlueprint(next)).toEqual([]);
  });

  it('renames a collection and carries every reference', () => {
    const blueprint = starting();
    const target = blueprint.collections[0];
    const other = blueprint.collections.find((entry) =>
      recordTypeOf(blueprint, entry)!.fields.some(
        (field) => field.type.kind === 'Reference' && field.type.collection === target.id,
      ),
    );
    const withPermission: Blueprint = {
      ...blueprint,
      permissions: [{ id: `owner_on_${target.id}`, role: 'owner', collection: target.id, capabilities: ['Read'], fields: [] }],
      workflows: [
        {
          id: 'life',
          name: 'Life',
          collection: target.id,
          state_field: 'id',
          initial_state: 'open',
          states: [{ id: 'open', name: 'Open', terminal: true }],
          transitions: [],
          timers: [],
        },
      ],
    };
    const renamed = renameCollection(withPermission, target.id, 'Harbour visitor');
    expect(renamed.collections.some((entry) => entry.id === 'harbour_visitor')).toBe(true);
    expect(renamed.collections.some((entry) => entry.id === target.id)).toBe(false);
    expect(renamed.permissions[0]).toEqual(expect.objectContaining({ id: 'owner_on_harbour_visitor', collection: 'harbour_visitor' }));
    expect(renamed.workflows[0].collection).toBe('harbour_visitor');
    if (other) {
      const fields = recordTypeOf(renamed, renamed.collections.find((entry) => entry.id === other.id)!)!.fields;
      expect(fields.some((field) => field.type.kind === 'Reference' && field.type.collection === 'harbour_visitor')).toBe(true);
    }
    expect(validateBlueprint(renamed)).toEqual([]);
  });
});

describe('publishing a collection', () => {
  it('gives the Anyone role Read and takes it back', () => {
    const blueprint = starting();
    const id = blueprint.collections[0].id;
    expect(isPublished(blueprint, id)).toBe(false);
    const open = setPublished(blueprint, id, true);
    expect(isPublished(open, id)).toBe(true);
    expect(open.identities.roles.some((role) => role.id === 'public')).toBe(true);
    const closed = setPublished(open, id, false);
    expect(isPublished(closed, id)).toBe(false);
    expect(validateBlueprint(open)).toEqual([]);
  });
});

describe('recommended triggers', () => {
  it('writes an event and an action with an Access Manifest, and reads them back', () => {
    const blueprint = starting();
    const collection = blueprint.collections[0];
    const seeds = recommendedTriggers([collection]);
    expect(seeds).toHaveLength(2);
    const next = writeTrigger(blueprint, { ...seeds[0], collectionId: collection.id });
    const action = next.actions[next.actions.length - 1];
    expect(action.effects.map((effect) => effect.kind)).toEqual(['Read', 'Emit']);
    expect(action.emits).toHaveLength(1);
    expect(next.events.map((event) => event.id)).toContain(action.emits[0]);
    expect(triggerOfAction(next, action.id)).toEqual({ ...seeds[0], collectionId: collection.id });
    expect(validateBlueprint(next)).toEqual([]);
  });
});
