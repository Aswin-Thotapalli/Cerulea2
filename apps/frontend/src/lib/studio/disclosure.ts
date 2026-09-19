// apps/frontend/src/lib/studio/disclosure.ts
// The four disclosure levels, and what each one shows.
//
// The Blueprint stays invisible. Four levels sit above it and every level
// writes the same Blueprint. A person starts at level one and drops to level
// three for the screens that need attention. Both edit the same artefact and
// both round-trip perfectly.
//
// Without this module a person would meet the whole designer on the first
// visit, whatever the work needed.

import type { Application } from '@/lib/track/derive';

export type DisclosureLevel = 1 | 2 | 3 | 4;

/** The areas a project opens, named once so every level reads the same list. */
export type DisclosureArea =
  | 'questions'
  | 'foundation'
  | 'compose'
  | 'model'
  | 'policies'
  | 'verify'
  | 'blueprint';

export type LevelDescription = {
  level: DisclosureLevel;
  /** The name a person reads on the switch. */
  label: string;
  /** The people this level was written for. */
  audience: string;
  /** What this level shows, in one sentence. */
  shows: string;
  /** What a person gives up by staying here. */
  holdsBack: string;
  /** The areas this level opens. */
  areas: DisclosureArea[];
};

export const DISCLOSURE_LEVELS: LevelDescription[] = [
  {
    level: 1,
    label: 'Questions',
    audience: 'Most Dapps and small businesses',
    shows: 'Plain questions, then deployment. We show no structure at all.',
    holdsBack:
      'The parts, the records and the rules stay out of sight. Move up a level to change any of them.',
    areas: ['questions', 'verify'],
  },
  {
    level: 2,
    label: 'Outcomes',
    audience: 'Business owners and analysts',
    shows: 'The statements this system delivers, and the map of the parts we assembled.',
    holdsBack:
      'Fields, roles and workflow states stay out of sight. Move up a level to change any of them.',
    areas: ['foundation', 'compose', 'policies', 'verify'],
  },
  {
    level: 3,
    label: 'Designer',
    audience: 'Enterprise and Government architects',
    shows: 'The record editor, the permission matrix, the workflow canvas and the formula bar.',
    holdsBack:
      'The typed document itself stays out of sight. Move up a level to read and edit it directly.',
    areas: ['foundation', 'compose', 'model', 'policies', 'verify'],
  },
  {
    level: 4,
    label: 'Blueprint',
    audience: 'Power users, support and audit',
    shows: 'The typed document itself, read and edited against the Blueprint schema.',
    holdsBack: 'Nothing stays out of sight at this level.',
    areas: ['foundation', 'compose', 'model', 'policies', 'verify', 'blueprint'],
  },
];

/** Reads one level description by its number. */
export function describeLevel(level: DisclosureLevel): LevelDescription {
  return DISCLOSURE_LEVELS.find((entry) => entry.level === level) ?? DISCLOSURE_LEVELS[1];
}

/** Reports whether a level opens one area. */
export function levelOpens(level: DisclosureLevel, area: DisclosureArea): boolean {
  return describeLevel(level).areas.includes(area);
}

/** Holds a stored number inside the four levels. */
export function readLevel(value: unknown): DisclosureLevel {
  const held = typeof value === 'number' ? Math.round(value) : Number.NaN;
  if (held === 1 || held === 2 || held === 3 || held === 4) return held;
  return 2;
}

/**
 * The level a project opens at before anybody changes it.
 *
 * A Dapps project starting from a template meets the questions alone. Every
 * other Dapps project meets the outcome selection. Enterprise and Government
 * carry compliance duties that live in the record editor and the permission
 * matrix, so both open at the designer.
 */
export function defaultLevel(input: {
  application: Application;
  templateId: string;
}): DisclosureLevel {
  if (input.application === 'government' || input.application === 'enterprise') return 3;
  return input.templateId.length > 0 ? 1 : 2;
}

/** One sentence stating what changes when a person moves between two levels. */
export function describeMove(from: DisclosureLevel, to: DisclosureLevel): string {
  if (from === to) return `We stay at ${describeLevel(to).label}.`;
  const target = describeLevel(to);
  if (to > from) {
    return `${target.label} shows more of the same system. ${target.shows}`;
  }
  return `${target.label} shows less of the same system. ${target.holdsBack}`;
}
