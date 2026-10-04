// apps/frontend/src/lib/blueprint/summary.ts
// The Blueprint stated in plain words.
//
// Every disclosure level writes the same Blueprint. A change made in the
// designer therefore has to appear at the outcome level, and a change made in
// the typed document has to appear at both. This module reads the document and
// states what it holds, with no internal identifier in the sentences.
//
// Without this module a change made deeper down would stay invisible higher up.

import type { Blueprint } from './types';
import { toReadable } from './compose';

export type SummaryLine = {
  /** The Blueprint section this line reads. */
  section: string;
  /** The plain heading a person reads. */
  heading: string;
  /** One sentence stating what the section holds. */
  sentence: string;
  /** The names a person reads, already in plain words. */
  names: string[];
  count: number;
};

function plainNames(values: string[]): string[] {
  return values.map((value) => toReadable(value));
}

/** States what one Blueprint holds, section by section. */
export function summariseBlueprint(blueprint: Blueprint): SummaryLine[] {
  const collections = blueprint.collections.map((entry) => entry.id);
  const roles = blueprint.identities.roles.map((entry) => entry.name || entry.id);
  const workflows = blueprint.workflows.map((entry) => entry.name || entry.id);
  const actions = blueprint.actions.map((entry) => entry.name || entry.id);
  const rules = blueprint.rules.map((entry) => entry.statement);
  const views = blueprint.views.map((entry) => entry.name || entry.id);

  return [
    {
      section: 'collections',
      heading: 'Records this system keeps',
      sentence:
        collections.length === 0
          ? 'This system keeps no record yet.'
          : `This system keeps ${collections.length} kinds of record.`,
      names: plainNames(collections),
      count: collections.length,
    },
    {
      section: 'identities',
      heading: 'People and roles',
      sentence:
        roles.length === 0
          ? 'This system names no role yet, so nobody reaches a record.'
          : `This system names ${roles.length} roles.`,
      names: roles,
      count: roles.length,
    },
    {
      section: 'workflows',
      heading: 'Work that moves through states',
      sentence:
        workflows.length === 0
          ? 'No work moves through states in this system.'
          : `${workflows.length} kinds of work move through states.`,
      names: workflows,
      count: workflows.length,
    },
    {
      section: 'actions',
      heading: 'What people do',
      sentence:
        actions.length === 0
          ? 'This system offers no action yet.'
          : `People take ${actions.length} actions.`,
      names: actions,
      count: actions.length,
    },
    {
      section: 'rules',
      heading: 'What the system refuses',
      sentence:
        rules.length === 0
          ? 'This system refuses nothing yet, so it accepts every value it is given.'
          : `This system holds ${rules.length} rules.`,
      names: rules,
      count: rules.length,
    },
    {
      section: 'views',
      heading: 'Screens people open',
      sentence:
        views.length === 0
          ? 'This system publishes no screen yet.'
          : `This system publishes ${views.length} screens.`,
      names: views,
      count: views.length,
    },
  ];
}

/** One sentence naming the whole system, for a heading. */
export function headlineFor(blueprint: Blueprint): string {
  const lines = summariseBlueprint(blueprint);
  const held = lines.filter((line) => line.count > 0);
  if (held.length === 0) {
    return 'This system holds nothing yet. Pick a statement and Cerulea installs the parts it needs.';
  }
  return `${blueprint.name || 'This system'} keeps ${lines[0].count} kinds of record and names ${lines[1].count} roles.`;
}
