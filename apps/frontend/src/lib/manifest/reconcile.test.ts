import { describe, expect, it } from 'vitest';

import {
  INTENT_SUBJECTS,
  manifestVocabulary,
  reconcileIntent,
  subjectRaised,
} from './reconcile';
import { EXAMPLE_MANIFEST } from './example';
import { screenReachable } from '@/lib/studio/screens';
import { stem, tokeniseWithSource } from '@/lib/intent/tokenise';
import type { DeploymentManifest } from './types';

/** The seeded project of a marketplace whose buyers verify a record themselves. */
const BUYER_STATEMENT =
  'We run a marketplace where a buyer verifies that a listing is authentic before paying the seller.';

function withoutPublicEndpoint(): DeploymentManifest {
  return {
    ...EXAMPLE_MANIFEST,
    integration: EXAMPLE_MANIFEST.integration.map((entry) => ({ ...entry, visibility: 'clerk' })),
  };
}

function withPublicEndpoint(): DeploymentManifest {
  return {
    ...EXAMPLE_MANIFEST,
    integration: [
      ...EXAMPLE_MANIFEST.integration,
      {
        method: 'GET',
        path: '/verify/{record}',
        parameters: ['record in path'],
        response: 'The proof of one record',
        visibility: 'every role',
      },
    ],
  };
}

describe('the subjects a statement raises', () => {
  it('names the words that raise every subject and the screen that closes it', () => {
    for (const subject of INTENT_SUBJECTS) {
      expect(subject.terms.length, subject.id).toBeGreaterThan(0);
      expect(subject.label.endsWith('.'), subject.id).toBe(false);
      expect(subject.absent.endsWith('.'), subject.id).toBe(true);
      expect(subject.fix.endsWith('.'), subject.id).toBe(true);
      expect(screenReachable(subject.screen), subject.id).toBe(true);
    }
  });

  it('raises a subject from the words a person wrote', () => {
    const terms = tokeniseWithSource(BUYER_STATEMENT);
    const verification = INTENT_SUBJECTS.find((entry) => entry.id === 'public_verification')!;
    expect(subjectRaised(verification, terms)).toContain('verifies');
    const payment = INTENT_SUBJECTS.find((entry) => entry.id === 'payment')!;
    expect(subjectRaised(payment, terms)).toContain('paying');
  });

  it('raises no subject from a statement naming none of its words', () => {
    const terms = tokeniseWithSource('We keep a list of harbour berths.');
    for (const subject of INTENT_SUBJECTS) {
      if (subject.id === 'audit') continue;
      expect(subjectRaised(subject, terms), subject.id).toEqual([]);
    }
  });
});

describe('reconciling a seeded project', () => {
  it('flags buyer verification where no public endpoint is present', () => {
    const held = reconcileIntent(BUYER_STATEMENT, withoutPublicEndpoint());
    const flag = held.flags.find((entry) => entry.subjectId === 'public_verification');
    expect(flag).toBeDefined();
    expect(flag!.raisedBy).toContain('verifies');
    expect(flag!.absent).toContain('publishes no endpoint');
    expect(flag!.fix).toContain('every role reaches');
    expect(flag!.screen).toBe('Blueprint, views');
    expect(held.headline).toContain('look absent');
  });

  it('stops flagging once the public endpoint is present', () => {
    const held = reconcileIntent(BUYER_STATEMENT, withPublicEndpoint());
    expect(held.flags.some((entry) => entry.subjectId === 'public_verification')).toBe(false);
    expect(held.answered.some((entry) => entry.subjectId === 'public_verification')).toBe(true);
  });

  it('answers the payment subject from the amount field the manifest holds', () => {
    const held = reconcileIntent(BUYER_STATEMENT, EXAMPLE_MANIFEST);
    expect(held.answered.some((entry) => entry.subjectId === 'payment')).toBe(true);
  });

  it('flags an approval the deployment never waits for', () => {
    const without: DeploymentManifest = { ...EXAMPLE_MANIFEST, workflows: [], actions: [] };
    const held = reconcileIntent(
      'Every grant application waits for an approval from the officer.',
      without,
    );
    const flag = held.flags.find((entry) => entry.subjectId === 'approval');
    expect(flag).toBeDefined();
    expect(flag!.screen).toBe('Model, workflows');
  });

  it('flags a deadline nothing in the deployment enforces', () => {
    const without: DeploymentManifest = {
      ...EXAMPLE_MANIFEST,
      workflows: EXAMPLE_MANIFEST.workflows.map((entry) => ({ ...entry, timers: [] })),
    };
    const held = reconcileIntent('A licence expires after one year.', without);
    expect(held.flags.some((entry) => entry.subjectId === 'deadline')).toBe(true);
  });

  it('flags a search with no index behind it', () => {
    const without: DeploymentManifest = {
      ...EXAMPLE_MANIFEST,
      data: EXAMPLE_MANIFEST.data.map((entry) => ({ ...entry, indexes: [] })),
    };
    const held = reconcileIntent('Staff search the register by berth.', without);
    expect(held.flags.some((entry) => entry.subjectId === 'search')).toBe(true);
  });

  it('produces the same report every time it runs', () => {
    const first = reconcileIntent(BUYER_STATEMENT, withoutPublicEndpoint());
    const second = reconcileIntent(BUYER_STATEMENT, withoutPublicEndpoint());
    expect(second).toEqual(first);
  });

  it('says so where the entry door held no statement', () => {
    const held = reconcileIntent('   ', EXAMPLE_MANIFEST);
    expect(held.flags).toEqual([]);
    expect(held.headline).toContain('No goal was stated');
  });
});

describe('the words nothing answers', () => {
  it('reads every word of the manifest into one vocabulary', () => {
    const held = manifestVocabulary(EXAMPLE_MANIFEST);
    expect(held.has(stem('booking'))).toBe(true);
    expect(held.has(stem('berth'))).toBe(true);
    expect(held.has(stem('almanac'))).toBe(false);
  });

  it('names a word of the statement the manifest never mentions', () => {
    const held = reconcileIntent(
      'We register every mooring against the harbour almanac.',
      EXAMPLE_MANIFEST,
    );
    expect(held.unmatchedWords).toContain('almanac');
  });

  it('counts an outcome name as an answer to a word', () => {
    const withName = reconcileIntent(
      'We register every mooring against the harbour almanac.',
      EXAMPLE_MANIFEST,
      ['Keep an almanac of every mooring'],
    );
    expect(withName.unmatchedWords).not.toContain('almanac');
  });
});
