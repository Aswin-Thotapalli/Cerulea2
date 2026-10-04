// apps/frontend/src/components/studio/steps/step3-posture.ts
// The Government posture one project carries.
// Section 11.9 of the specification makes four things standard rather than
// optional for Cerulea for Government. The air-gapped installation, the
// residency lock, multi-organisation governance and the extended retention
// defaults. Every Government template in the seed carries its posture, and a
// project started from no Government template carries the standard one.
// Without this module the Economics step would state no posture at all.

import governmentSeed from '@/data/government.seed.json';

export type GovernmentOrganisation = { id: string; title: string; summary: string };

export type GovernmentQuorum = {
  class: string;
  threshold_percent: number;
  minimum_organisations: number;
  delay_days: number;
  summary: string;
};

export type GovernmentRetentionEntry = {
  collection: string;
  years: number;
  statement: string;
};

export type GovernmentPosture = {
  templateId: string;
  outcome: string;
  deployment: {
    air_gapped: boolean;
    air_gap_statement: string;
    residency: { jurisdiction: string; statement: string };
    retention: {
      default_years: number;
      statement: string;
      extended: GovernmentRetentionEntry[];
    };
  };
  governance: {
    organisations: GovernmentOrganisation[];
    statement: string;
    quorum: GovernmentQuorum[];
    stages: { id: string; summary: string }[];
  };
};

type Seed = { postures?: GovernmentPosture[] };

const seed = governmentSeed as unknown as Seed;

/** The posture each Government template carries. */
export const GOVERNMENT_POSTURES: GovernmentPosture[] = Array.isArray(seed.postures)
  ? seed.postures
  : [];

/** The posture one template carries, or nothing where the template is not a Government one. */
export function postureFor(templateId: string): GovernmentPosture | undefined {
  return GOVERNMENT_POSTURES.find((entry) => entry.templateId === templateId);
}

/**
 * The posture a Government project carries where no Government template is
 * chosen. Every line is standard rather than optional, so the posture holds
 * whatever template a person starts from.
 */
export const STANDARD_POSTURE: GovernmentPosture['deployment'] = {
  air_gapped: true,
  air_gap_statement:
    'The deployment package installs with no outbound network access and carries every dependency it needs.',
  residency: {
    jurisdiction: 'the declared national jurisdiction',
    statement:
      'Storage and processing stay inside the declared national jurisdiction. The infrastructure layer enforces the lock and the Deployment Manifest records it.',
  },
  retention: {
    default_years: 30,
    statement:
      'Every collection keeps its records for thirty years unless the template states a longer span. Government retention defaults run longer than the commercial defaults.',
    extended: [],
  },
};

export type PostureLine = {
  id: 'air_gapped' | 'residency' | 'governance' | 'retention';
  /** The heading a person reads. */
  heading: string;
  /** One sentence stating what the line holds. */
  states: string;
  /** True while the line is standard rather than optional. */
  standard: boolean;
};

/**
 * The posture of one Government project, stated in lines a person reads.
 * The organisations and the jurisdiction the person typed take precedence
 * over the template's words.
 */
export function postureLines(input: {
  templateId: string;
  organisations: string[];
  jurisdiction: string;
}): PostureLine[] {
  const held = postureFor(input.templateId);
  const deployment = held?.deployment ?? STANDARD_POSTURE;
  const organisations =
    input.organisations.length > 0
      ? input.organisations
      : (held?.governance.organisations ?? []).map((entry) => entry.title);
  const jurisdiction = input.jurisdiction.trim() || deployment.residency.jurisdiction;
  const extended = deployment.retention.extended;
  return [
    {
      id: 'air_gapped',
      heading: 'Air-gapped installation',
      states: deployment.air_gap_statement,
      standard: deployment.air_gapped,
    },
    {
      id: 'residency',
      heading: 'Residency lock',
      states: `Storage and processing stay inside ${jurisdiction}. The infrastructure layer enforces the lock and the Deployment Manifest records it.`,
      standard: true,
    },
    {
      id: 'governance',
      heading: 'Multi-organisation governance',
      states:
        organisations.length > 0
          ? `Every structural change requires agreement across the named organisations. The named organisations are ${organisations.join(', ')}.`
          : 'Every structural change requires agreement across the named organisations. Name the organisations below.',
      standard: true,
    },
    {
      id: 'retention',
      heading: 'Extended retention',
      states:
        extended.length > 0
          ? `${deployment.retention.statement} ${extended.length} collections carry a stated span of their own.`
          : deployment.retention.statement,
      standard: true,
    },
  ];
}

/** The organisations a Government template names, as titles. */
export function organisationTitlesFor(templateId: string): string[] {
  return (postureFor(templateId)?.governance.organisations ?? []).map((entry) => entry.title);
}

/** The retention period in days a Government project starts from. */
export function retentionDaysFor(templateId: string): number {
  const years =
    postureFor(templateId)?.deployment.retention.default_years ??
    STANDARD_POSTURE.retention.default_years;
  return years * 365;
}

/** The threshold one transaction class carries under a Government template. */
export function thresholdFor(templateId: string, transactionClass: string): number | undefined {
  return postureFor(templateId)?.governance.quorum.find(
    (entry) => entry.class === transactionClass,
  )?.threshold_percent;
}
