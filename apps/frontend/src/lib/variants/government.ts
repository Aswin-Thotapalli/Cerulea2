// apps/frontend/src/lib/variants/government.ts
// The Government template and module set.
//
// The Government templates and modules are authored under content/government.
// Studio ships a seed built from them by scripts/build-government-seed.mjs, in
// the shapes the catalogue already carries, so the gallery and the outcome
// catalogue read one list whichever application a workspace serves.
//
// Every Government template also carries the posture section 11.9 states. The
// air-gapped installation, the residency lock, multi-organisation governance
// as standard and the extended retention defaults. Step 4 shows that posture
// and the Deployment Manifest records it.
//
// Without this module a public body would meet the commercial catalogue alone.

import governmentSeed from '@/data/government.seed.json';
import type { CatalogueModule, CatalogueTemplate } from '@/lib/catalogue/types';
import type { Application } from '@/lib/track/derive';

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
  /** One sentence naming what the template delivers. */
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
  answers: { question: string; answer: string; why: string }[];
};

type Seed = {
  modules: CatalogueModule[];
  templates: CatalogueTemplate[];
  postures: GovernmentPosture[];
};

const seed = governmentSeed as unknown as Seed;

/** The Government modules, as the content package authored them. */
export const GOVERNMENT_MODULES: CatalogueModule[] = seed.modules;

/** The Government templates, as the content package authored them. */
export const GOVERNMENT_TEMPLATES: CatalogueTemplate[] = seed.templates;

/** The posture each Government template carries. */
export const GOVERNMENT_POSTURES: GovernmentPosture[] = seed.postures;

/** Reports whether one part was authored for Cerulea for Government. */
export function authoredForGovernment(moduleId: string): boolean {
  return GOVERNMENT_MODULES.some((part) => part.moduleId === moduleId);
}

/** The modules one application reads, with the Government set joined for Government. */
export function modulesForApplication(
  application: Application,
  base: CatalogueModule[],
): CatalogueModule[] {
  if (application !== 'government') return base;
  const held = new Set(base.map((part) => part.moduleId));
  return [...base, ...GOVERNMENT_MODULES.filter((part) => held.has(part.moduleId) === false)];
}

/** The templates one application reads, with the Government set joined for Government. */
export function templatesForApplication(
  application: Application,
  base: CatalogueTemplate[],
): CatalogueTemplate[] {
  if (application !== 'government') return base;
  const held = new Set(base.map((template) => template.id));
  return [
    ...GOVERNMENT_TEMPLATES.filter((template) => held.has(template.id) === false),
    ...base,
  ];
}

/** The posture one template carries, or nothing where the template is not a Government one. */
export function postureFor(templateId: string): GovernmentPosture | undefined {
  return GOVERNMENT_POSTURES.find((entry) => entry.templateId === templateId);
}

/**
 * The posture a Government project carries where no Government template is
 * chosen. Section 11.9 makes every one of these standard rather than optional,
 * so the posture holds whatever template a person starts from.
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
  id: string;
  /** The heading a person reads. */
  heading: string;
  /** One sentence stating what the line holds. */
  states: string;
  /** True while the line is standard rather than optional. */
  standard: boolean;
};

/**
 * The posture of one Government project, stated in lines a person reads.
 * Step 4 shows these lines and the Deployment Manifest records them.
 */
export function postureLines(templateId: string): PostureLine[] {
  const held = postureFor(templateId);
  const deployment = held?.deployment ?? STANDARD_POSTURE;
  const governance = held?.governance;
  const organisations = governance?.organisations ?? [];
  const extended = deployment.retention.extended;

  const lines: PostureLine[] = [
    {
      id: 'air_gapped',
      heading: 'Air-gapped installation',
      states: deployment.air_gap_statement,
      standard: deployment.air_gapped,
    },
    {
      id: 'residency',
      heading: 'Residency lock',
      states: deployment.residency.statement,
      standard: true,
    },
    {
      id: 'governance',
      heading: 'Multi-organisation governance',
      states:
        organisations.length > 0
          ? `${governance?.statement} The named organisations are ${organisations
              .map((entry) => entry.title)
              .join(', ')}.`
          : 'Every structural change requires agreement across the named organisations. Name the organisations on the policies screen.',
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
  return lines;
}

/** The retention period in days a Government project starts from. */
export function retentionDaysFor(templateId: string): number {
  const held = postureFor(templateId);
  const years = held?.deployment.retention.default_years ?? STANDARD_POSTURE.retention.default_years;
  return years * 365;
}

/** The count of organisations a Government template names. */
export function organisationCountFor(templateId: string): number {
  return postureFor(templateId)?.governance.organisations.length ?? 3;
}

/** The threshold one transaction class carries under a Government template. */
export function thresholdFor(templateId: string, transactionClass: string): number | undefined {
  return postureFor(templateId)?.governance.quorum.find(
    (entry) => entry.class === transactionClass,
  )?.threshold_percent;
}
