import { describe, expect, it } from 'vitest';

import { EXAMPLE_MANIFEST } from './example';
import { planFor, planFollowsRules } from './document';
import { GROUP_WORDING, MANIFEST_GROUPS, NO_FIGURE_YET, costPriced, linesOfGroup } from './groups';

describe('the cost group', () => {
  it('shows no figure when Cerulea APIs names no priced source', () => {
    const manifest = { ...EXAMPLE_MANIFEST, cost: { ...EXAMPLE_MANIFEST.cost, source: undefined } };
    expect(costPriced(manifest)).toBe(false);
    const [line] = linesOfGroup(manifest, 'cost');
    expect(line.subject).toBe('Monthly cost');
    expect(line.details.find((detail) => detail.label === 'Monthly')?.value).toBe(NO_FIGURE_YET);
    expect(line.details.find((detail) => detail.label === 'Add-ons')?.value).toBe(NO_FIGURE_YET);
    expect(line.details.find((detail) => detail.label === 'Storage')?.value).toBe(NO_FIGURE_YET);
    expect(line.details.find((detail) => detail.label === 'Nodes')?.value).toBe(String(manifest.cost.nodeCount));
    expect(JSON.stringify(line)).not.toContain('each month');
  });

  it('shows the priced figures when the manifest names its source', () => {
    const manifest = { ...EXAMPLE_MANIFEST, cost: { ...EXAMPLE_MANIFEST.cost, monthlyMinor: 1500000, currency: 'INR', source: 'workspace subscription ent_growth' } };
    expect(costPriced(manifest)).toBe(true);
    const [line] = linesOfGroup(manifest, 'cost');
    expect(line.details.find((detail) => detail.label === 'Monthly')?.value).toBe('INR 15,000 each month');
    expect(line.details.find((detail) => detail.label === 'Source')?.value).toBe('workspace subscription ent_growth');
  });

  it('shows the storage figure of the infrastructure group only from a measured source', () => {
    const unmeasured = linesOfGroup({ ...EXAMPLE_MANIFEST, infrastructure: { ...EXAMPLE_MANIFEST.infrastructure, source: undefined } }, 'infrastructure')[0];
    expect(unmeasured.details.find((detail) => detail.label === 'Storage')?.value).toBe(NO_FIGURE_YET);
    const measured = linesOfGroup({ ...EXAMPLE_MANIFEST, infrastructure: { ...EXAMPLE_MANIFEST.infrastructure, storageGigabytes: 250, source: 'deployment target' } }, 'infrastructure')[0];
    expect(measured.details.find((detail) => detail.label === 'Storage')?.value).toBe('250 gigabytes');
  });
});

describe('the screens the groups name', () => {
  it('names the production steps', () => {
    for (const group of MANIFEST_GROUPS) {
      expect(GROUP_WORDING[group].screen).toMatch(/^Step [1-6] /);
    }
    expect(GROUP_WORDING.interfaces.screen).toBe('Step 6 Deploy & UI, Interface');
    expect(GROUP_WORDING.chain.screen).toBe('Step 4 Economics');
    expect(GROUP_WORDING.modules.screen).toBe('Step 2 Blueprint');
  });
});

describe('the document plan', () => {
  it('follows the writing rules and carries the compliance sentence', () => {
    const plan = planFor({ manifest: EXAMPLE_MANIFEST, version: 3, statement: 'Let buyers verify a shipment.' });
    expect(planFollowsRules(plan)).toEqual([]);
    const text = JSON.stringify(plan.blocks);
    expect(text).toContain('Controls implemented, certification not held.');
    expect(text).toContain('The goal stated at the start');
    expect(plan.fileName).toBe('berth-register-manifest-version-3');
  });
});
