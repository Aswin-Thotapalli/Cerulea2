import { describe, expect, it } from 'vitest';

import {
  deploymentState,
  plainOutcome,
  projectState,
  sentenceWords,
  stageName,
  stageState,
} from './plain';

// The deployed system page shows the deployment record to a person with no
// technical background. The sentences below are the outcomes Cerulea APIs
// wrote for the seven stages of a real deployment in the demonstration run.
describe('the plain words of a deployment record', () => {
  it('names every stage and every state in plain words', () => {
    expect(stageName('verify')).toBe('Checks');
    expect(stageName('health')).toBe('Health checks');
    expect(stageName('Install the Blueprint')).toBe('Install the Blueprint');
    expect(stageState('succeeded')).toBe('Done');
    expect(stageState('rolled_back')).toBe('Rolled back');
    expect(deploymentState('succeeded')).toBe('Finished');
    expect(projectState('draft')).toBe('Draft');
    expect(sentenceWords('some_new_state')).toBe('Some new state');
  });

  it('keeps the deployment identifier out of the health sentence', () => {
    const outcome = plainOutcome(
      'The health suite passed the write, the read, the proof and the permission denial for dep_01m3sgjc9r8d4dn16fgbygxzh0.',
    );
    expect(outcome).not.toMatch(/dep_/);
    expect(outcome).toContain('for this deployment.');
  });

  it('keeps the Blueprint hash and the account address out of the record sentence', () => {
    const outcome = plainOutcome(
      'Cerulea recorded the deployment of Blueprint 4940aaca3113 by demo@cerulea.local at 2026-09-30T15:57:45.803Z.',
    );
    expect(outcome).not.toMatch(/4940aaca3113/);
    expect(outcome).not.toMatch(/@/);
    expect(outcome).not.toMatch(/T15:57/);
    expect(outcome).toContain('the Blueprint version');
    expect(outcome).toContain('2026');
  });

  it('counts one peer in the singular', () => {
    expect(
      plainOutcome(
        'The in-process Cerulea chain runs 2 validator seats, reports 1 peers and finalised block 1.',
      ),
    ).toContain('reports 1 peer and');
  });
});
