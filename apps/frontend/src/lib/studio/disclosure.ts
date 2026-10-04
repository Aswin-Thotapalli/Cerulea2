// apps/frontend/src/lib/studio/disclosure.ts
// The four disclosure levels of specification 11.6, and what each one shows
// over the six production steps.
//
// The Blueprint stays invisible. Four levels sit above it and every level
// writes the same Blueprint. A person starts at level one and drops to level
// three for the screens that need attention. Both edit the same artefact and
// both round-trip.
//
// Without this module a person would meet the whole designer on the first
// visit, whatever the work needed.

export type DisclosureLevel = 1 | 2 | 3 | 4;

/**
 * The six production steps by their shell index, plus the document view that
 * level four opens beside them.
 */
export const STEP_FOUNDATION = 0 as const;
export const STEP_BLUEPRINT = 1 as const;
export const STEP_DATA_SCHEMA = 2 as const;
export const STEP_ECONOMICS = 3 as const;
export const STEP_INTEGRATIONS = 4 as const;
export const STEP_DEPLOY = 5 as const;

export type StepArea = 0 | 1 | 2 | 3 | 4 | 5;
export type DisclosureArea = StepArea | 'document';

const ALL_STEPS: StepArea[] = [
  STEP_FOUNDATION,
  STEP_BLUEPRINT,
  STEP_DATA_SCHEMA,
  STEP_ECONOMICS,
  STEP_INTEGRATIONS,
  STEP_DEPLOY,
];

/** Reads a shell step index as a step area, or null outside the six steps. */
function asStepArea(index: number): StepArea | null {
  return (ALL_STEPS as number[]).includes(index) ? (index as StepArea) : null;
}

export type LevelDescription = {
  level: DisclosureLevel;
  /** The name a person reads on the switch. Production and the specification name them so. */
  label: string;
  /** The people this level was written for. */
  audience: string;
  /** What this level shows, in one sentence. */
  shows: string;
  /** What a person gives up by staying here. */
  holdsBack: string;
  /** The steps this level opens, by shell index, and the document view at level four. */
  areas: DisclosureArea[];
};

export const DISCLOSURE_LEVELS: LevelDescription[] = [
  {
    level: 1,
    label: 'Template',
    audience: 'Most Dapps and small businesses',
    shows: 'Plain questions, then deployment. We show no structure at all.',
    holdsBack:
      'The parts, the records and the rules stay out of sight. Move up a level to change any of them.',
    areas: [STEP_FOUNDATION, STEP_DEPLOY],
  },
  {
    level: 2,
    label: 'Outcomes',
    audience: 'Business owners and analysts',
    shows: 'The outcomes this system delivers and the map of the parts we assembled.',
    holdsBack:
      'Fields, roles and workflow states stay out of sight. Move up a level to change any of them.',
    areas: [STEP_FOUNDATION, STEP_BLUEPRINT, STEP_ECONOMICS, STEP_INTEGRATIONS, STEP_DEPLOY],
  },
  {
    level: 3,
    label: 'Designer',
    audience: 'Enterprise and Government architects',
    shows: 'The entity editor, the permission matrix, the workflow canvas and the formula bar.',
    holdsBack:
      'The typed document itself stays out of sight. Move up a level to read and edit it directly.',
    areas: [
      STEP_FOUNDATION,
      STEP_BLUEPRINT,
      STEP_DATA_SCHEMA,
      STEP_ECONOMICS,
      STEP_INTEGRATIONS,
      STEP_DEPLOY,
    ],
  },
  {
    level: 4,
    label: 'Blueprint',
    audience: 'Power users, support and audit',
    shows: 'The typed document itself, read and edited against the Blueprint schema.',
    holdsBack: 'Nothing stays out of sight at this level.',
    areas: [
      STEP_FOUNDATION,
      STEP_BLUEPRINT,
      STEP_DATA_SCHEMA,
      STEP_ECONOMICS,
      STEP_INTEGRATIONS,
      STEP_DEPLOY,
      'document',
    ],
  },
];

/** Reads one level description by its number. */
export function describeLevel(level: DisclosureLevel): LevelDescription {
  return DISCLOSURE_LEVELS.find((entry) => entry.level === level) ?? DISCLOSURE_LEVELS[1];
}

/** Reports whether a level opens one step or the document view. */
export function levelOpens(level: DisclosureLevel, area: DisclosureArea): boolean {
  return describeLevel(level).areas.includes(area);
}

/** The shell step indexes a level withholds, for the sidebar. */
export function hiddenSteps(level: DisclosureLevel): number[] {
  const open = new Set<DisclosureArea>(describeLevel(level).areas);
  return ALL_STEPS.filter((index) => !open.has(index));
}

/**
 * The step a level opens when the person stands on one it withholds.
 * The nearest open step after the current one, else the nearest before it.
 */
export function nearestOpenStep(level: DisclosureLevel, stepIndex: number): number {
  const area = asStepArea(stepIndex);
  if (area !== null && levelOpens(level, area)) return stepIndex;
  const open: number[] = describeLevel(level)
    .areas.filter((entry): entry is StepArea => typeof entry === 'number')
    .sort((left, right) => left - right);
  const after = open.find((index) => index > stepIndex);
  if (after !== undefined) return after;
  return open[open.length - 1] ?? STEP_FOUNDATION;
}

/** Holds a stored value inside the four levels. */
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
 * carry compliance duties that live in the entity editor and the permission
 * matrix, so both open at the designer.
 */
export function defaultLevel(input: {
  division: 'dapp' | 'enterprise' | 'govt' | null | undefined;
  templateId: string | null | undefined;
}): DisclosureLevel {
  if (input.division === 'govt' || input.division === 'enterprise') return 3;
  return input.templateId && input.templateId.length > 0 ? 1 : 2;
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
