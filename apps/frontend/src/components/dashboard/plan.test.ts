import { describe, expect, it } from 'vitest';

import { planLabel } from './plan';

describe('the plan chip label', () => {
  it('names a catalogue tier by its name', () => {
    expect(planLabel('public_dapps')).toBe('Public Dapps');
    expect(planLabel('ent_sme')).toBe('SME');
  });

  it('shows a retired tier id as itself', () => {
    expect(planLabel('plan_starter')).toBe('plan_starter');
  });

  it('reads No plan for a free account and for an absent value', () => {
    expect(planLabel('free')).toBe('No plan');
    expect(planLabel(undefined)).toBe('No plan');
    expect(planLabel(null)).toBe('No plan');
    expect(planLabel('')).toBe('No plan');
  });
});
