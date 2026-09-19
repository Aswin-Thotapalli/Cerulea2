import { describe, expect, it } from 'vitest';

import {
  SCREEN_TARGETS,
  screenNames,
  screenReachable,
  screenTarget,
} from './screens';
import { levelOpens, type DisclosureArea, type DisclosureLevel } from './disclosure';
import {
  GROUP_WORDING,
  MANIFEST_GROUPS,
  allLines,
  linesOfGroup,
  summaryLines,
} from '@/lib/manifest/groups';
import { SCREEN_BY_KIND, screenForComparisonLine } from '@/lib/manifest/comparison';
import { INTENT_SUBJECTS } from '@/lib/manifest/reconcile';
import { SECTION_SCREEN } from '@/lib/blueprint/guidance';
import { EXAMPLE_MANIFEST } from '@/lib/manifest/example';

describe('every screen a line names', () => {
  it('opens an area the workspace holds at a level that shows it', () => {
    for (const name of screenNames()) {
      const target = screenTarget(name);
      expect(target, name).toBeDefined();
      expect(target!.does.endsWith('.'), name).toBe(true);
      expect(
        levelOpens(target!.level as DisclosureLevel, target!.area as DisclosureArea),
        name,
      ).toBe(true);
    }
  });

  it('answers with nothing for a name Cerulea never prints', () => {
    expect(screenTarget('No such screen')).toBeUndefined();
    expect(screenReachable('No such screen')).toBe(false);
  });

  it('names a model surface wherever the area holds more than one', () => {
    for (const [name, target] of Object.entries(SCREEN_TARGETS)) {
      if (target.area === 'model') {
        expect(target.surface, name).toBeDefined();
      }
    }
  });
});

describe('every manifest group links to its screen', () => {
  it('names a reachable screen for each of the twelve groups', () => {
    for (const group of MANIFEST_GROUPS) {
      expect(screenReachable(GROUP_WORDING[group].screen), group).toBe(true);
    }
  });

  it('names a reachable screen on every expanded line', () => {
    const lines = allLines(EXAMPLE_MANIFEST);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(screenReachable(line.screen), `${line.group} ${line.subject}`).toBe(true);
    }
  });

  it('holds at least one line per group, each naming its own screen', () => {
    for (const group of MANIFEST_GROUPS) {
      const lines = linesOfGroup(EXAMPLE_MANIFEST, group);
      expect(lines.length, group).toBeGreaterThan(0);
      for (const line of lines) {
        expect(line.screen, group).toBe(GROUP_WORDING[group].screen);
      }
    }
  });

  it('names a reachable screen on every summary figure', () => {
    for (const line of summaryLines(EXAMPLE_MANIFEST.summary)) {
      expect(screenReachable(line.screen), line.heading).toBe(true);
    }
  });
});

describe('every other line links to its screen', () => {
  it('names a reachable screen for each kind of comparison line', () => {
    for (const [kind, screen] of Object.entries(SCREEN_BY_KIND)) {
      expect(screenReachable(screen), kind).toBe(true);
      expect(screenForComparisonLine(`${kind} something`)).toBe(screen);
    }
  });

  it('falls back to the Blueprint for a kind Cerulea has not met', () => {
    expect(screenForComparisonLine('Newthing something')).toBe('Blueprint');
    expect(screenReachable('Blueprint')).toBe(true);
  });

  it('names a reachable screen for every Blueprint section a correction sits in', () => {
    for (const [section, screen] of Object.entries(SECTION_SCREEN)) {
      expect(screenReachable(screen), section).toBe(true);
    }
  });

  it('names a reachable screen for every intent subject', () => {
    for (const subject of INTENT_SUBJECTS) {
      expect(screenReachable(subject.screen), subject.id).toBe(true);
    }
  });
});
