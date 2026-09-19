import { describe, expect, it } from 'vitest';

import {
  CLASS_MEANING,
  ROLE_MEANING,
  SCOPE_MEANING,
  describeAction,
  describeCadence,
  describeCounts,
  describeDelay,
  participationPercent,
  shortAccount,
  shortHash,
  toDelimitedText,
} from './wording';

describe('plain language beside a figure', () => {
  it('turns an action name into a sentence', () => {
    expect(describeAction('project.created')).toBe('Created on a project');
    expect(describeAction('key.rotated')).toBe('Rotated on a key');
    expect(describeAction('billing.subscription_started')).toBe(
      'Subscription started on a billing',
    );
  });

  it('states a delay in days, hours or minutes', () => {
    expect(describeDelay(28800)).toMatch(/days/);
    expect(describeDelay(2400)).toMatch(/hours/);
    expect(describeDelay(100)).toMatch(/minutes/);
  });

  it('states a feed cadence in the unit a reader expects', () => {
    expect(describeCadence(7200)).toBe('every 2.0 hours');
    expect(describeCadence(300)).toBe('every 5 minutes');
    expect(describeCadence(15)).toBe('every 15 seconds');
  });

  it('shortens a long validator address and leaves a short one alone', () => {
    expect(shortAccount('short')).toBe('short');
    expect(shortAccount('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')).toMatch(
      /^5Grwvaef|^5Grwvae/i,
    );
    expect(shortAccount('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY').length).toBe(13);
  });

  it('reports every turn taken when a validator has missed none', () => {
    expect(participationPercent(0, 0)).toBe(100);
    expect(participationPercent(9, 1)).toBe(90);
  });

  it('shortens a content address to a comparable opening', () => {
    expect(shortHash('a'.repeat(64))).toHaveLength(12);
  });

  it('states what a Blueprint holds in one line', () => {
    expect(describeCounts({ collections: 2, actions: 3 })).toBe(
      '2 collections, 3 actions, 0 workflows, 0 permission entries, 0 rules',
    );
  });

  it('builds an export with a header and one row per event', () => {
    const text = toDelimitedText([
      {
        occurredAt: '2026-09-19T06:00:00.000Z',
        actorEmail: 'person@cerulea.test',
        action: 'project.created',
        subjectType: 'project',
        subjectId: 'p-1',
        outcome: 'allowed',
      },
    ]);
    const lines = text.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('occurred_at,actor,action,subject_type,subject,outcome');
    expect(lines[1]).toContain('"project.created"');
  });

  it('escapes a value carrying a quotation mark', () => {
    const text = toDelimitedText([
      {
        occurredAt: 't',
        actorEmail: 'a',
        action: 'a"b',
        subjectType: 's',
        subjectId: 'i',
        outcome: 'allowed',
      },
    ]);
    expect(text).toContain('"a""b"');
  });

  it('carries a sentence for every scope, role and transaction class', () => {
    for (const value of Object.values(SCOPE_MEANING)) expect(value.length).toBeGreaterThan(10);
    for (const value of Object.values(ROLE_MEANING)) expect(value.length).toBeGreaterThan(10);
    for (const value of Object.values(CLASS_MEANING)) expect(value.length).toBeGreaterThan(10);
    expect(Object.keys(CLASS_MEANING)).toEqual([
      'Routine',
      'Financial',
      'Structural',
      'Constitutional',
    ]);
  });
});
