import { describe, expect, it } from 'vitest';

import {
  GROUP_WORDING,
  MANIFEST_GROUPS,
  allLines,
  groupCounts,
  linesOfGroup,
  plainMoney,
  searchLines,
  summaryHeadline,
  summaryLines,
} from './groups';
import { EXAMPLE_MANIFEST as manifest } from './example';

describe('the twelve groups', () => {
  it('names the twelve groups section 11.8.2 lists', () => {
    expect(MANIFEST_GROUPS).toEqual([
      'data',
      'actions',
      'workflows',
      'rules',
      'permissions',
      'interfaces',
      'integration',
      'chain',
      'infrastructure',
      'security',
      'modules',
      'cost',
    ]);
  });

  it('states what every group lists and the screen that produces it', () => {
    for (const group of MANIFEST_GROUPS) {
      const held = GROUP_WORDING[group];
      expect(held.heading.length, group).toBeGreaterThan(0);
      expect(held.states.length, group).toBeGreaterThan(20);
      expect(held.screen.length, group).toBeGreaterThan(0);
      expect(held.heading.endsWith('.'), group).toBe(false);
    }
  });

  it('expands at least one line for every group', () => {
    const counts = groupCounts(manifest);
    for (const group of MANIFEST_GROUPS) {
      expect(counts[group], group).toBeGreaterThan(0);
    }
  });

  it('names the screen on every line', () => {
    for (const line of allLines(manifest)) {
      expect(line.screen).toBe(GROUP_WORDING[line.group].screen);
    }
  });
});

describe('the data group', () => {
  it('lists every item section 11.8.2 names', () => {
    const [first] = linesOfGroup(manifest, 'data');
    expect(first.subject).toBe('booking.berth');
    expect(first.details.map((entry) => entry.label)).toEqual([
      'Type',
      'Required',
      'Default',
      'Checks',
      'Storage',
      'Privacy',
      'Indexes',
      'Relationships',
    ]);
    expect(first.details.find((entry) => entry.label === 'Required')?.value).toBe('Yes');
    expect(first.details.find((entry) => entry.label === 'Default')?.value).toBe('None');
  });
});

describe('the other groups', () => {
  it('states every value an action takes, checks, changes, sends and admits', () => {
    const [first] = linesOfGroup(manifest, 'actions');
    expect(first.subject).toBe('Record booking');
    const labels = first.details.map((entry) => entry.label);
    expect(labels).toContain('Values it takes');
    expect(labels).toContain('Rules checked first');
    expect(labels).toContain('What it changes');
    expect(labels).toContain('Events it sends');
    expect(labels).toContain('Roles that may run it');
  });

  it('states the states, the moves, the conditions and the timers of a workflow', () => {
    const [first] = linesOfGroup(manifest, 'workflows');
    expect(first.details.find((entry) => entry.label === 'Moves')?.value).toContain(
      'while amount is settled',
    );
    expect(first.details.find((entry) => entry.label === 'Timers')?.value).toContain(
      '86400 seconds',
    );
    expect(first.details.find((entry) => entry.label === 'Ends at')?.value).toBe('Closed');
  });

  it('sets a rule in plain words beside its formal form', () => {
    const [first] = linesOfGroup(manifest, 'rules');
    expect(first.subject).toBe('A berth takes one booking at a time.');
    expect(first.details.find((entry) => entry.label === 'Formal form')?.value).toContain('count');
  });

  it('qualifies a permission by field and by row', () => {
    const [first] = linesOfGroup(manifest, 'permissions');
    expect(first.subject).toBe('clerk on booking');
    expect(first.details.find((entry) => entry.label === 'Rows')?.value).toBe('every row');
  });

  it('states the class table beside the agreement profile', () => {
    const [first] = linesOfGroup(manifest, 'chain');
    expect(first.subject).toBe('Balanced');
    expect(first.details.find((entry) => entry.label === 'Class table')?.value).toContain(
      'Constitutional needs 90 percent and waits out a delay',
    );
  });

  it('writes money in the words a person reads', () => {
    expect(plainMoney(900000, 'INR')).toBe('INR 9,000 each month');
    const [first] = linesOfGroup(manifest, 'cost');
    expect(first.details.find((entry) => entry.label === 'Monthly')?.value).toBe(
      'INR 9,000 each month',
    );
    expect(first.details.find((entry) => entry.label === 'Add-ons')?.value).toContain(
      'Extra storage',
    );
  });
});

describe('searching the manifest', () => {
  it('reaches every line on an empty search', () => {
    const lines = allLines(manifest);
    expect(searchLines(lines, '   ')).toHaveLength(lines.length);
  });

  it('narrows to the lines that hold every word', () => {
    const lines = allLines(manifest);
    const held = searchLines(lines, 'booking amount');
    expect(held.length).toBeGreaterThan(0);
    for (const line of held) {
      expect(line.terms).toContain('booking');
      expect(line.terms).toContain('amount');
    }
  });

  it('answers with nothing where no line holds the words', () => {
    expect(searchLines(allLines(manifest), 'no such thing anywhere')).toEqual([]);
  });
});

describe('the summary view', () => {
  it('states thirteen figures with a sentence and a screen each', () => {
    const lines = summaryLines(manifest.summary);
    expect(lines).toHaveLength(13);
    for (const line of lines) {
      expect(line.heading.length).toBeGreaterThan(0);
      expect(line.states.endsWith('.')).toBe(true);
      expect(line.screen.length).toBeGreaterThan(0);
      expect(Number.isInteger(line.count)).toBe(true);
    }
  });

  it('reads every figure straight off the manifest', () => {
    const lines = summaryLines(manifest.summary);
    expect(lines.find((line) => line.heading === 'Fields')?.count).toBe(5);
    expect(lines.find((line) => line.heading === 'Parts installed')?.count).toBe(6);
  });

  it('names the size of the whole system in one sentence', () => {
    const headline = summaryHeadline(manifest.summary);
    expect(headline).toContain('6 parts');
    expect(headline).toContain('2 kinds of record');
    expect(headline).toContain('5 fields');
  });
});
