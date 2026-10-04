// apps/frontend/src/lib/blueprint/foundation.ts
// What the Foundation step writes into the typed Blueprint.
//
// Foundation names the system, states what it does, picks the network and sets
// the two network properties. Those answers land in three places of the
// Blueprint: the name and the summary at the top, the Types and Collections
// the chosen template installs, and the Governance section, whose
// constitutional delay follows the block interval and whose change process
// states the network and the history window in plain words.
// Without this module a Foundation answer would change nothing that deploys.

import { applyComposition, composeSections } from './compose';
import { CLASS_THRESHOLDS, type Blueprint, type Governance } from './types';

export type FoundationAnswers = {
  name: string;
  summary: string;
  /** The modules the chosen template installs. Empty for a blank canvas. */
  templateModuleIds: string[];
  /** The network the project runs on. */
  network: 'public-access' | 'private';
  /** True while chosen records may publish to the public-access chain. */
  publishSelectedRecords: boolean;
  blockSeconds: number;
  historyRetentionDays: number;
};

/** The hours a constitutional change waits before it applies. */
export const CONSTITUTIONAL_DELAY_HOURS = 24;

/** The blocks a constitutional change waits, at the chosen block interval. */
export function constitutionalDelayBlocks(blockSeconds: number): number {
  const seconds = Math.max(1, Math.round(blockSeconds));
  return Math.max(1, Math.round((CONSTITUTIONAL_DELAY_HOURS * 3600) / seconds));
}

/** The plain sentence the governance section carries about how change happens. */
export function changeProcessSentence(answers: FoundationAnswers): string {
  const network =
    answers.network === 'private' ? 'a private Blockchain network' : 'the public-access chain';
  const publish = answers.publishSelectedRecords
    ? ' Chosen records may publish to the public-access chain once we name them.'
    : '';
  return (
    `This system runs on ${network}. Routine changes pass at ${CLASS_THRESHOLDS.Routine} percent, ` +
    `financial at ${CLASS_THRESHOLDS.Financial}, structural at ${CLASS_THRESHOLDS.Structural} and ` +
    `constitutional at ${CLASS_THRESHOLDS.Constitutional} percent after a delay of ` +
    `${CONSTITUTIONAL_DELAY_HOURS} hours. Blocks commit every ${answers.blockSeconds} seconds and ` +
    `every node keeps ${answers.historyRetentionDays} days of provable history.${publish}`
  );
}

/** The governance section Foundation writes. The owner role holds authority. */
export function foundationGovernance(answers: FoundationAnswers, held: Governance): Governance {
  return {
    authority: held.authority.length > 0 ? held.authority : ['owner'],
    quorum: {
      routine: CLASS_THRESHOLDS.Routine,
      financial: CLASS_THRESHOLDS.Financial,
      structural: CLASS_THRESHOLDS.Structural,
      constitutional: CLASS_THRESHOLDS.Constitutional,
    },
    constitutional_delay_blocks: constitutionalDelayBlocks(answers.blockSeconds),
    change_process: changeProcessSentence(answers),
  };
}

/**
 * Applies the Foundation answers to a Blueprint.
 * The template's record types and collections join the document through the
 * same composition the Blueprint step uses, so a collection a person already
 * changed stays as it stands. `previouslyComposed` names the collections an
 * earlier composition installed, so a template change removes what the old
 * template brought and nothing else.
 */
export function applyFoundation(
  blueprint: Blueprint,
  answers: FoundationAnswers,
  previouslyComposed: string[],
): { blueprint: Blueprint; composedCollectionIds: string[] } {
  const composed = composeSections(answers.templateModuleIds, {
    retentionDays: answers.historyRetentionDays,
  });
  // A collection added now takes the retention window Foundation set. A
  // collection the document already held keeps whatever a person gave it.
  const withSections = applyComposition(blueprint, composed, previouslyComposed);
  return {
    blueprint: {
      ...withSections,
      name: answers.name,
      summary: answers.summary,
      governance: foundationGovernance(answers, blueprint.governance),
    },
    composedCollectionIds: composed.collections.map((entry) => entry.id),
  };
}
