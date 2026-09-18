import { describe, expect, it } from 'vitest';
import { applyTrackOverride, deriveTrack, resolveApplication } from './derive';

describe('resolveApplication', () => {
  it('serves Dapps when the environment names no application', () => {
    expect(resolveApplication('')).toBe('dapps');
    expect(resolveApplication('nothing-known')).toBe('dapps');
  });

  it('reads the three applications by name', () => {
    expect(resolveApplication('government')).toBe('government');
    expect(resolveApplication('Enterprise')).toBe('enterprise');
    expect(resolveApplication('DAPPS')).toBe('dapps');
  });
});

describe('deriveTrack for Government', () => {
  const derivation = deriveTrack('government');

  it('always runs on a private Blockchain network', () => {
    expect(derivation.track).toBe('blockchain');
  });

  it('never shows the network question', () => {
    expect(derivation.questionShown).toBe(false);
    expect(derivation.options).toEqual([]);
  });

  it('holds the network against an override', () => {
    expect(derivation.overridable).toBe(false);
    expect(applyTrackOverride(derivation, 'dapp').track).toBe('blockchain');
  });

  it('holds the network even when the proposal pointed elsewhere', () => {
    expect(deriveTrack('government', { proposedTrack: 'dapp' }).track).toBe('blockchain');
    expect(deriveTrack('government', { templateTrack: 'dapp' }).track).toBe('blockchain');
  });

  it('states the reason in plain words', () => {
    expect(derivation.reason).toContain('private Blockchain network');
  });
});

describe('deriveTrack for Enterprise', () => {
  const derivation = deriveTrack('enterprise');

  it('keeps records private by default', () => {
    expect(derivation.track).toBe('blockchain');
    expect(derivation.reason).toContain('private by default');
  });

  it('offers a visible option to publish chosen records', () => {
    expect(derivation.publishSelectedRecords).toBe(true);
    expect(derivation.publishNote).toContain('public-access chain');
  });

  it('shows the question and both networks', () => {
    expect(derivation.questionShown).toBe(true);
    expect(derivation.options.map((option) => option.track)).toEqual(['blockchain', 'dapp']);
  });

  it('follows the starting point when one was chosen', () => {
    expect(deriveTrack('enterprise', { templateTrack: 'dapp' }).track).toBe('dapp');
  });
});

describe('deriveTrack for Dapps', () => {
  const derivation = deriveTrack('dapps');

  it('starts on the public-access chain', () => {
    expect(derivation.track).toBe('dapp');
    expect(derivation.reason).toContain('public-access chain');
  });

  it('offers a private Blockchain network as well', () => {
    expect(derivation.options.map((option) => option.track)).toContain('blockchain');
  });

  it('offers no record publishing option, because every record is already public', () => {
    expect(derivation.publishSelectedRecords).toBe(false);
  });

  it('follows the proposal when the description pointed at a private network', () => {
    expect(deriveTrack('dapps', { proposedTrack: 'blockchain' }).track).toBe('blockchain');
  });
});

describe('applyTrackOverride', () => {
  it('records that the user set the network by hand', () => {
    const overridden = applyTrackOverride(deriveTrack('dapps'), 'blockchain');
    expect(overridden.track).toBe('blockchain');
    expect(overridden.overridden).toBe(true);
    expect(overridden.reason).toContain('by hand');
  });

  it('names the network Cerulea proposed', () => {
    const overridden = applyTrackOverride(deriveTrack('dapps'), 'blockchain');
    expect(overridden.reason).toContain('public-access chain');
  });

  it('keeps Blockchain capitalised inside the sentence', () => {
    const overridden = applyTrackOverride(deriveTrack('enterprise'), 'dapp');
    expect(overridden.reason).toContain('private Blockchain network');
    expect(overridden.reason).not.toContain('blockchain network');
  });

  it('changes nothing when the network already matches', () => {
    const derivation = deriveTrack('dapps');
    expect(applyTrackOverride(derivation, 'dapp')).toBe(derivation);
  });

  it('carries the meaning of the network the user picked', () => {
    const overridden = applyTrackOverride(deriveTrack('dapps'), 'blockchain');
    expect(overridden.meaning).toContain('inside the organisations we name');
  });
});

describe('every derivation carries a plain sentence', () => {
  it('states what the network does', () => {
    for (const application of ['dapps', 'enterprise', 'government'] as const) {
      const derivation = deriveTrack(application);
      expect(derivation.meaning.length).toBeGreaterThan(20);
      expect(derivation.reason.length).toBeGreaterThan(20);
    }
  });
});
