// apps/frontend/src/lib/manifest/reconcile.ts
// Intent reconciliation against the stated goal.
//
// A person stated a goal in plain language at the entry door. Cerulea checks
// the Deployment Manifest against that statement and reports what looks
// absent. An intent naming buyer verification with no public verification
// endpoint present produces a specific flag.
//
// The matcher is deterministic. The same statement against the same manifest
// always produces the same report, so a reviewer reads a stable list rather
// than a fresh opinion. Cerulea Intelligence enriches the report through the
// intelligence routes once those routes answer.
//
// Without this check a person would compare the manifest against their own
// memory of what they asked for.

import { stem, tokeniseWithSource, words } from '@/lib/intent/tokenise';
import { MANIFEST_GROUPS, allLines, type ManifestGroup } from './groups';
import type { DeploymentManifest } from './types';

/** One subject a statement of intent can name, with what the manifest must hold. */
export type IntentSubject = {
  id: string;
  /** The words that name this subject in plain language. */
  terms: string[];
  /** The words a reviewer reads for this subject. */
  label: string;
  /**
   * Reports whether the manifest answers this subject.
   * Every check reads the manifest alone, so the answer is deterministic.
   */
  answered: (manifest: DeploymentManifest) => boolean;
  /** One sentence stating what looks absent. */
  absent: string;
  /** One sentence naming what to do about it. */
  fix: string;
  /** The screen that closes the gap. */
  screen: string;
};

function hasPublicEndpoint(manifest: DeploymentManifest): boolean {
  return manifest.integration.some(
    (entry) =>
      entry.method === 'GET' &&
      (entry.visibility === 'every role' || entry.visibility.trim().length === 0),
  );
}

function fieldNamed(manifest: DeploymentManifest, terms: string[]): boolean {
  return manifest.data.some((item) => {
    const held = `${item.collection} ${item.field}`.toLowerCase();
    return terms.some((term) => held.includes(term));
  });
}

function actionNamed(manifest: DeploymentManifest, terms: string[]): boolean {
  return manifest.actions.some((item) => {
    const held = `${item.action} ${item.name}`.toLowerCase();
    return terms.some((term) => held.includes(term));
  });
}

function moduleNamed(manifest: DeploymentManifest, terms: string[]): boolean {
  return manifest.modules.some((item) =>
    terms.some((term) => item.module.toLowerCase().includes(term)),
  );
}

/**
 * The subjects Cerulea reconciles a stated goal against.
 * Each one names the words that raise it and the check that answers it.
 */
export const INTENT_SUBJECTS: IntentSubject[] = [
  {
    id: 'public_verification',
    terms: ['verif', 'verify', 'prove', 'proof', 'authentic', 'check'],
    label: 'Verification anyone can carry out',
    answered: (manifest) => hasPublicEndpoint(manifest),
    absent:
      'The statement asks for something anyone can verify, and this deployment publishes no endpoint a person reaches without signing in.',
    fix: 'Add a screen and an endpoint every role reaches, so a person outside the organisation checks a record for themselves.',
    screen: 'Blueprint, views',
  },
  {
    id: 'payment',
    terms: ['payment', 'pay', 'invoic', 'billing', 'charg', 'settl'],
    label: 'Money moving between parties',
    answered: (manifest) =>
      moduleNamed(manifest, ['tier', 'payment', 'billing']) ||
      fieldNamed(manifest, ['amount', 'price', 'payment', 'invoice']) ||
      actionNamed(manifest, ['pay', 'settle', 'invoice', 'charge']),
    absent:
      'The statement asks for money moving between parties, and this deployment holds no amount, no payment action and no unit of account.',
    fix: 'Add the records and the action that move value, so the deployment carries the money the statement names.',
    screen: 'Compose',
  },
  {
    id: 'approval',
    terms: ['approv', 'review', 'authoris', 'authoriz', 'sign', 'consent'],
    label: 'Work that waits for an approval',
    answered: (manifest) =>
      manifest.workflows.length > 0 ||
      actionNamed(manifest, ['approve', 'review', 'authorise', 'sign']),
    absent:
      'The statement asks for work that waits for an approval, and this deployment holds no workflow and no approval action.',
    fix: 'Add a workflow with an approval state, so work waits where the statement says it should.',
    screen: 'Model, workflows',
  },
  {
    id: 'audit',
    terms: ['audit', 'trail', 'histor', 'track', 'trace', 'record'],
    label: 'A history somebody audits',
    answered: (manifest) => manifest.security.some((item) => item.auditScope.length > 0),
    absent:
      'The statement asks for a history somebody audits, and this deployment states no audit scope for any collection.',
    fix: 'Set the audit scope on every collection, so each read and write reaches the audit log.',
    screen: 'Model, permissions',
  },
  {
    id: 'roles',
    terms: ['role', 'permiss', 'access', 'staff', 'officer', 'admin', 'member'],
    label: 'People in named roles',
    answered: (manifest) => manifest.permissions.length > 0,
    absent:
      'The statement names people in roles, and this deployment holds no permission entry, so nobody reaches a record.',
    fix: 'Open the permission matrix and set what each role reaches.',
    screen: 'Model, permissions',
  },
  {
    id: 'notification',
    terms: ['notif', 'alert', 'remind', 'email', 'messag', 'inform'],
    label: 'A message sent outward',
    answered: (manifest) =>
      manifest.actions.some((item) => item.emits.length > 0) ||
      manifest.integration.some((item) => item.method === 'POST'),
    absent:
      'The statement asks for a message sent outward, and this deployment sends no event and offers no endpoint another system posts to.',
    fix: 'Add an event to the action that should raise the message.',
    screen: 'Model, rules and actions',
  },
  {
    id: 'deadline',
    terms: ['deadlin', 'expir', 'lapse', 'timeout', 'overdue', 'renew'],
    label: 'Work that lapses after a period',
    answered: (manifest) => manifest.workflows.some((item) => item.timers.length > 0),
    absent:
      'The statement asks for work that lapses after a period, and no workflow in this deployment carries a timer.',
    fix: 'Add a timer to the workflow state the work waits in.',
    screen: 'Model, workflows',
  },
  {
    id: 'search',
    terms: ['search', 'find', 'lookup', 'query', 'filter'],
    label: 'Records people search through',
    answered: (manifest) => manifest.data.some((item) => item.indexes.length > 0),
    absent:
      'The statement asks for records people search through, and no collection in this deployment carries an index.',
    fix: 'Add an index over the field people search on.',
    screen: 'Model, records',
  },
];

export type IntentFlag = {
  subjectId: string;
  /** The words a reviewer reads for this subject. */
  label: string;
  /** The words from the statement that raised this subject. */
  raisedBy: string[];
  /** One sentence stating what looks absent. */
  absent: string;
  fix: string;
  screen: string;
};

export type IntentMatch = {
  subjectId: string;
  label: string;
  raisedBy: string[];
};

export type Reconciliation = {
  /** The statement the person made at the entry door. */
  statement: string;
  /** The subjects the statement raised that the manifest answers. */
  answered: IntentMatch[];
  /** The subjects the statement raised that the manifest leaves absent. */
  flags: IntentFlag[];
  /** The words of the statement no subject and no manifest line answers. */
  unmatchedWords: string[];
  /** One sentence stating the outcome. */
  headline: string;
};

/** The words of a statement, stemmed, beside the words a person wrote. */
function statementTerms(statement: string): { term: string; word: string }[] {
  return tokeniseWithSource(statement);
}

/** Reports whether one subject is raised by the statement. */
export function subjectRaised(
  subject: IntentSubject,
  terms: { term: string; word: string }[],
): string[] {
  const raised: string[] = [];
  for (const { term, word } of terms) {
    if (subject.terms.some((held) => term.startsWith(held) || held.startsWith(term))) {
      raised.push(word);
    }
  }
  return Array.from(new Set(raised));
}

/** Every word of the manifest, for the unmatched word pass. */
export function manifestVocabulary(manifest: DeploymentManifest): Set<string> {
  const held = new Set<string>();
  for (const line of allLines(manifest)) {
    for (const word of words(line.terms)) held.add(stem(word));
  }
  for (const group of MANIFEST_GROUPS as readonly ManifestGroup[]) {
    for (const word of words(group)) held.add(stem(word));
  }
  return held;
}

/**
 * Checks the manifest against the stated goal.
 * The answer lists what the manifest holds, what looks absent, and the words
 * of the statement nothing in the manifest answers.
 */
export function reconcileIntent(
  statement: string,
  manifest: DeploymentManifest,
  outcomeNames: string[] = [],
): Reconciliation {
  const terms = statementTerms(statement);
  const answered: IntentMatch[] = [];
  const flags: IntentFlag[] = [];

  for (const subject of INTENT_SUBJECTS) {
    const raisedBy = subjectRaised(subject, terms);
    if (raisedBy.length === 0) continue;
    if (subject.answered(manifest)) {
      answered.push({ subjectId: subject.id, label: subject.label, raisedBy });
    } else {
      flags.push({
        subjectId: subject.id,
        label: subject.label,
        raisedBy,
        absent: subject.absent,
        fix: subject.fix,
        screen: subject.screen,
      });
    }
  }

  const vocabulary = manifestVocabulary(manifest);
  for (const name of outcomeNames) {
    for (const word of words(name)) vocabulary.add(stem(word));
  }
  const raisedWords = new Set(
    [...answered, ...flags].flatMap((entry) => entry.raisedBy.map((word) => stem(word))),
  );
  const unmatchedWords = terms
    .filter((entry) => vocabulary.has(entry.term) === false && raisedWords.has(entry.term) === false)
    .map((entry) => entry.word);

  return {
    statement,
    answered,
    flags,
    unmatchedWords,
    headline: headlineFor(statement, answered.length, flags.length, unmatchedWords.length),
  };
}

function headlineFor(
  statement: string,
  answered: number,
  flagged: number,
  unmatched: number,
): string {
  if (statement.trim().length === 0) {
    return 'No goal was stated at the entry door, so Cerulea has nothing to check the manifest against.';
  }
  if (flagged === 0 && unmatched === 0) {
    return `Every subject the statement raised is present. Cerulea answered ${answered} of them.`;
  }
  if (flagged === 0) {
    return `Every subject the statement raised is present. ${unmatched} words of the statement reach nothing in the manifest.`;
  }
  return `${flagged} subjects the statement raised look absent, and ${answered} are present.`;
}
