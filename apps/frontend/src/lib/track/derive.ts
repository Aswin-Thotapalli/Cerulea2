// apps/frontend/src/lib/track/derive.ts
// Derives the network a project runs on.
//
// One Studio codebase serves three applications. The derivation differs per
// application.
//
// 1. Government. Always a private Blockchain network. The question never
//    appears, so a government architect never chooses wrongly.
// 2. Enterprise. A private Blockchain network by default, with a visible option
//    to publish selected records to the public-access chain.
// 3. Dapps. The public-access chain by default, with a private Blockchain
//    network available.
//
// Every derivation states its reason. Every derivation outside Government is
// overridable at any time.

import type { ProjectTrack } from '@/lib/catalogue/types';

export type Application = 'dapps' | 'enterprise' | 'government';

export const APPLICATION_LABEL: Record<Application, string> = {
  dapps: 'Cerulea for Dapps',
  enterprise: 'Cerulea for Enterprise',
  government: 'Cerulea for Government',
};

export const TRACK_LABEL: Record<ProjectTrack, string> = {
  blockchain: 'Private Blockchain network',
  dapp: 'Public-access chain',
};

export const TRACK_MEANING: Record<ProjectTrack, string> = {
  blockchain:
    'Every record stays inside the organisations we name. Nobody outside reads a record ' +
    'without an invitation.',
  dapp:
    'Anyone can verify a record on the public-access chain. Cerulea publishes no private ' +
    'field there.',
};

export type TrackOption = {
  track: ProjectTrack;
  label: string;
  meaning: string;
};

export type TrackDerivation = {
  application: Application;
  track: ProjectTrack;
  label: string;
  meaning: string;
  /** One sentence stating why this network was derived. */
  reason: string;
  /** True while the user may change the network. */
  overridable: boolean;
  /** True while Studio shows the network question at all. */
  questionShown: boolean;
  /** The networks the user may pick from. Empty while the question stays hidden. */
  options: TrackOption[];
  /** True while a project may publish chosen records to the public-access chain. */
  publishSelectedRecords: boolean;
  /** One sentence describing the publishing option, when the application offers one. */
  publishNote: string | null;
  /** True once a user has set the network by hand. */
  overridden: boolean;
};

export type DeriveHints = {
  /** The network the intent proposal reached, when a description was written. */
  proposedTrack?: ProjectTrack;
  /** The template the user started from, when the door supplied one. */
  templateTrack?: ProjectTrack;
};

const BOTH_OPTIONS: TrackOption[] = [
  { track: 'blockchain', label: TRACK_LABEL.blockchain, meaning: TRACK_MEANING.blockchain },
  { track: 'dapp', label: TRACK_LABEL.dapp, meaning: TRACK_MEANING.dapp },
];

/** Reads which application this Studio serves. */
export function resolveApplication(override?: string): Application {
  const named = (override ?? process.env.NEXT_PUBLIC_CERULEA_APPLICATION ?? '').trim().toLowerCase();
  if (named === 'government' || named === 'enterprise' || named === 'dapps') return named;
  return 'dapps';
}

/** Derives the network for one application, with the reason stated. */
export function deriveTrack(application: Application, hints: DeriveHints = {}): TrackDerivation {
  if (application === 'government') {
    return {
      application,
      track: 'blockchain',
      label: TRACK_LABEL.blockchain,
      meaning: TRACK_MEANING.blockchain,
      reason:
        'Cerulea for Government runs every project on a private Blockchain network. ' +
        'Residency and custody stay inside the declared jurisdiction.',
      overridable: false,
      questionShown: false,
      options: [],
      publishSelectedRecords: false,
      publishNote: null,
      overridden: false,
    };
  }

  const hinted = hints.templateTrack ?? hints.proposedTrack ?? null;

  if (application === 'enterprise') {
    const track = hinted ?? 'blockchain';
    return {
      application,
      track,
      label: TRACK_LABEL[track],
      meaning: TRACK_MEANING[track],
      reason: hinted
        ? `The starting point we picked runs on the ${TRACK_LABEL[hinted].toLowerCase()}.`
        : 'Cerulea for Enterprise keeps records private by default.',
      overridable: true,
      questionShown: true,
      options: BOTH_OPTIONS,
      publishSelectedRecords: true,
      publishNote:
        'We may publish chosen records to the public-access chain later. ' +
        'Cerulea publishes a record only after we name it.',
      overridden: false,
    };
  }

  const track = hinted ?? 'dapp';
  return {
    application,
    track,
    label: TRACK_LABEL[track],
    meaning: TRACK_MEANING[track],
    reason: hinted
      ? `The starting point we picked runs on the ${TRACK_LABEL[hinted].toLowerCase()}.`
      : 'Cerulea for Dapps starts on the public-access chain, so anyone can verify a record.',
    overridable: true,
    questionShown: true,
    options: BOTH_OPTIONS,
    publishSelectedRecords: false,
    publishNote: null,
    overridden: false,
  };
}

/**
 * Applies a network the user chose.
 * Cerulea for Government holds its network, so an override there changes nothing.
 */
export function applyTrackOverride(derivation: TrackDerivation, track: ProjectTrack): TrackDerivation {
  if (!derivation.overridable || track === derivation.track) return derivation;
  return {
    ...derivation,
    track,
    label: TRACK_LABEL[track],
    meaning: TRACK_MEANING[track],
    reason: `We set this network by hand. Cerulea proposed the ${derivation.label.toLowerCase()}.`,
    overridden: true,
  };
}
