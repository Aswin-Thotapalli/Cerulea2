import { describe, expect, it } from 'vitest';

import { ENTITY_PRESETS, toIdentifier } from './compose';
import { readBlueprintDocument } from './document';
import {
  CONSTITUTIONAL_DELAY_HOURS,
  applyFoundation,
  changeProcessSentence,
  constitutionalDelayBlocks,
  type FoundationAnswers,
} from './foundation';

const presetModule = Object.keys(ENTITY_PRESETS).find((moduleId) => ENTITY_PRESETS[moduleId].length > 0) as string;
const presetCollection = toIdentifier(ENTITY_PRESETS[presetModule][0].name);

const answers: FoundationAnswers = {
  name: 'Yard ledger',
  summary: 'We track every shipment at the gate.',
  templateModuleIds: [presetModule],
  network: 'private',
  publishSelectedRecords: true,
  blockSeconds: 3,
  historyRetentionDays: 730,
};

describe('constitutionalDelayBlocks', () => {
  it('follows the block interval over the fixed delay', () => {
    expect(constitutionalDelayBlocks(3)).toBe((CONSTITUTIONAL_DELAY_HOURS * 3600) / 3);
    expect(constitutionalDelayBlocks(60)).toBe(CONSTITUTIONAL_DELAY_HOURS * 60);
    expect(constitutionalDelayBlocks(0)).toBe(CONSTITUTIONAL_DELAY_HOURS * 3600);
  });
});

describe('changeProcessSentence', () => {
  it('states the network, the four thresholds, the interval and the history window', () => {
    const sentence = changeProcessSentence(answers);
    expect(sentence).toContain('private Blockchain network');
    expect(sentence).toContain('51 percent');
    expect(sentence).toContain('90 percent');
    expect(sentence).toContain('every 3 seconds');
    expect(sentence).toContain('730 days');
    expect(sentence).toContain('Chosen records may publish');
    expect(changeProcessSentence({ ...answers, network: 'public-access', publishSelectedRecords: false })).toContain('public-access chain');
  });
});

describe('applyFoundation', () => {
  it('writes the name, the summary, the template sections and the governance', () => {
    const empty = readBlueprintDocument({}, 'New system');
    const { blueprint, composedCollectionIds } = applyFoundation(empty, answers, []);
    expect(blueprint.name).toBe('Yard ledger');
    expect(blueprint.summary).toBe(answers.summary);
    expect(composedCollectionIds).toContain(presetCollection);
    const collection = blueprint.collections.find((entry) => entry.id === presetCollection);
    expect(collection?.retention.period_days).toBe(730);
    expect(blueprint.types.some((entry) => entry.id === collection?.record_type)).toBe(true);
    expect(blueprint.governance.quorum).toEqual({ routine: 51, financial: 67, structural: 80, constitutional: 90 });
    expect(blueprint.governance.constitutional_delay_blocks).toBe(constitutionalDelayBlocks(3));
    expect(blueprint.governance.authority).toEqual(['owner']);
  });

  it('keeps a collection a person changed and replaces what the old template brought', () => {
    const empty = readBlueprintDocument({}, 'New system');
    const first = applyFoundation(empty, answers, []);
    const edited = {
      ...first.blueprint,
      collections: first.blueprint.collections.map((entry) =>
        entry.id === presetCollection ? { ...entry, description: 'Edited by hand.' } : entry,
      ),
    };
    const second = applyFoundation(edited, { ...answers, name: 'Renamed' }, first.composedCollectionIds);
    expect(second.blueprint.name).toBe('Renamed');
    expect(second.blueprint.collections.find((entry) => entry.id === presetCollection)?.description).toBe('Edited by hand.');
    const blank = applyFoundation(second.blueprint, { ...answers, templateModuleIds: [] }, second.composedCollectionIds);
    expect(blank.blueprint.collections.find((entry) => entry.id === presetCollection)).toBeUndefined();
    expect(blank.composedCollectionIds).toEqual([]);
  });
});
