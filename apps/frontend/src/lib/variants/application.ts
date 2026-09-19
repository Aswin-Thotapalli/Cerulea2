// apps/frontend/src/lib/variants/application.ts
// The three applications one Studio codebase serves.
//
// Section 2.4 names Dapps, Enterprise and Government. Each one carries its own
// part subset, its own language and its own commercial gates. The table below
// holds that, and every surface reads it rather than testing the application
// name in place.
//
// The application is chosen when a workspace opens. Every project inside a
// workspace carries the application that workspace holds, so a project never
// meets a part its audience never uses.
//
// Without this module each surface would carry its own idea of what an
// application offers.

import type { CatalogueModule, ProjectTrack } from '@/lib/catalogue/types';
import { APPLICATION_LABEL, type Application } from '@/lib/track/derive';
import { groupLabel } from '@/lib/outcomes/catalogue';

export type CommercialTier = {
  id: string;
  /** The name a buyer reads. */
  label: string;
  /** One sentence stating what the tier admits. */
  admits: string;
  /** The networks this tier deploys to. */
  tracks: ProjectTrack[];
  /** The greatest number of projects this tier admits. */
  projectLimit: number;
  /** The greatest number of organisations that hold a validator seat. */
  organisationLimit: number;
  /** True while this tier admits an air-gapped deployment. */
  airGapped: boolean;
  /** True while this tier locks storage and processing to a declared jurisdiction. */
  residencyLock: boolean;
};

export type ApplicationVariant = {
  application: Application;
  /** The name a person reads. */
  label: string;
  /** The people this application was written for. */
  audience: string;
  /** The network a project starts on. */
  defaultTrack: ProjectTrack;
  /** True while the application admits the other network at all. */
  bothTracks: boolean;
  /** The areas of the catalogue this application offers. */
  areas: 'every' | string[];
  /** Part identifiers this application never offers, whatever area they sit in. */
  withheld: string[];
  /** The commercial tiers this application sells. */
  tiers: CommercialTier[];
  /** The words this application uses for a project. */
  words: {
    project: string;
    projects: string;
    organisation: string;
    member: string;
  };
  /** One sentence stating what this application is for. */
  serves: string;
};

/** The areas Cerulea for Government offers. Every other area sits outside its remit. */
export const GOVERNMENT_AREAS = [
  'Identity',
  'Governance',
  'Compliance',
  'Data',
  'Storage',
  'Records',
  'Workflow',
  'Payments',
  'Integrations',
  'Operations',
  'Security',
  'Analytics',
  'Public Services',
  'Land',
  'Health',
  'Welfare',
  'Licensing',
  'Procurement',
];

/** Parts Cerulea for Government never offers. */
export const GOVERNMENT_WITHHELD = ['bridge', 'dex', 'nft', 'token', 'airdrop', 'staking'];

export const APPLICATION_VARIANTS: Record<Application, ApplicationVariant> = {
  dapps: {
    application: 'dapps',
    label: APPLICATION_LABEL.dapps,
    audience: 'Independent builders and small teams',
    defaultTrack: 'dapp',
    bothTracks: true,
    areas: 'every',
    withheld: [],
    tiers: [
      {
        id: 'public',
        label: 'Public',
        admits: 'One project on the public-access chain, where anyone verifies a record.',
        tracks: ['dapp'],
        projectLimit: 1,
        organisationLimit: 1,
        airGapped: false,
        residencyLock: false,
      },
      {
        id: 'private',
        label: 'Private',
        admits: 'Up to five projects, on the public-access chain or on a private Blockchain network.',
        tracks: ['dapp', 'blockchain'],
        projectLimit: 5,
        organisationLimit: 3,
        airGapped: false,
        residencyLock: false,
      },
      {
        id: 'private_pro',
        label: 'Private Pro',
        admits: 'Up to twenty projects, with more organisations holding a validator seat.',
        tracks: ['dapp', 'blockchain'],
        projectLimit: 20,
        organisationLimit: 10,
        airGapped: false,
        residencyLock: false,
      },
    ],
    words: {
      project: 'project',
      projects: 'projects',
      organisation: 'team',
      member: 'teammate',
    },
    serves:
      'Cerulea for Dapps starts on the public-access chain, so anyone verifies a record without an invitation.',
  },
  enterprise: {
    application: 'enterprise',
    label: APPLICATION_LABEL.enterprise,
    audience: 'Companies with compliance duties',
    defaultTrack: 'blockchain',
    bothTracks: true,
    areas: 'every',
    withheld: [],
    tiers: [
      {
        id: 'enterprise_one',
        label: 'Enterprise, first tier',
        admits: 'Up to ten systems on a private Blockchain network, with three organisations.',
        tracks: ['blockchain', 'dapp'],
        projectLimit: 10,
        organisationLimit: 3,
        airGapped: false,
        residencyLock: true,
      },
      {
        id: 'enterprise_two',
        label: 'Enterprise, second tier',
        admits: 'Up to fifty systems, with ten organisations holding a validator seat.',
        tracks: ['blockchain', 'dapp'],
        projectLimit: 50,
        organisationLimit: 10,
        airGapped: false,
        residencyLock: true,
      },
      {
        id: 'enterprise_three',
        label: 'Enterprise, third tier',
        admits: 'Systems without a count limit, with fifty organisations and an air-gapped option.',
        tracks: ['blockchain', 'dapp'],
        projectLimit: 1000,
        organisationLimit: 50,
        airGapped: true,
        residencyLock: true,
      },
    ],
    words: {
      project: 'system',
      projects: 'systems',
      organisation: 'organisation',
      member: 'colleague',
    },
    serves:
      'Cerulea for Enterprise keeps records inside the organisations we name, and publishes a record only after we name it.',
  },
  government: {
    application: 'government',
    label: APPLICATION_LABEL.government,
    audience: 'Public bodies and agencies',
    defaultTrack: 'blockchain',
    bothTracks: false,
    areas: GOVERNMENT_AREAS,
    withheld: GOVERNMENT_WITHHELD,
    tiers: [
      {
        id: 'government',
        label: 'Government',
        admits:
          'Systems without a count limit, air-gapped installation, residency lock and multi-organisation governance as standard.',
        tracks: ['blockchain'],
        projectLimit: 1000,
        organisationLimit: 200,
        airGapped: true,
        residencyLock: true,
      },
    ],
    words: {
      project: 'system',
      projects: 'systems',
      organisation: 'department',
      member: 'officer',
    },
    serves:
      'Cerulea for Government runs every system on a private Blockchain network inside the declared jurisdiction.',
  },
};

/** The variant one application holds. */
export function variantFor(application: Application): ApplicationVariant {
  return APPLICATION_VARIANTS[application] ?? APPLICATION_VARIANTS.dapps;
}

/** Reports whether one application offers one part. */
export function partOffered(application: Application, part: CatalogueModule): boolean {
  const variant = variantFor(application);
  const held = part.moduleId.toLowerCase();
  if (variant.withheld.some((word) => held.includes(word))) return false;
  if (variant.areas === 'every') return true;
  return variant.areas.includes(groupLabel(part.category));
}

/** The parts one application offers, in catalogue order. */
export function partsFor(application: Application, modules: CatalogueModule[]): CatalogueModule[] {
  return modules.filter((part) => partOffered(application, part));
}

/** One sentence stating why a part is withheld. */
export function withheldReason(application: Application, part: CatalogueModule): string | null {
  if (partOffered(application, part)) return null;
  const variant = variantFor(application);
  const held = part.moduleId.toLowerCase();
  if (variant.withheld.some((word) => held.includes(word))) {
    return `${variant.label} offers no part of this kind. The audience holds no remit for it.`;
  }
  return `${variant.label} offers the areas its audience works in, and ${groupLabel(part.category)} sits outside them.`;
}

export type GateAnswer = {
  admitted: boolean;
  /** One sentence stating the answer. */
  because: string;
  /** One sentence naming what to do next, where the gate refuses. */
  fix?: string;
};

/** Reports whether a tier admits one more project. */
export function projectGate(tier: CommercialTier, held: number): GateAnswer {
  if (held < tier.projectLimit) {
    return {
      admitted: true,
      because: `${tier.label} admits ${tier.projectLimit} in all, and ${held} are open.`,
    };
  }
  return {
    admitted: false,
    because: `${tier.label} admits ${tier.projectLimit} in all, and ${held} are open.`,
    fix: 'Close one, or move to the next tier.',
  };
}

/** Reports whether a tier admits one network. */
export function trackGate(tier: CommercialTier, track: ProjectTrack): GateAnswer {
  if (tier.tracks.includes(track)) {
    return { admitted: true, because: `${tier.label} deploys to this network.` };
  }
  return {
    admitted: false,
    because: `${tier.label} deploys to the other network alone.`,
    fix: 'Move to a tier that deploys here, or change the network on the foundation screen.',
  };
}

/** Reports whether a tier admits the number of organisations named. */
export function organisationGate(tier: CommercialTier, held: number): GateAnswer {
  if (held <= tier.organisationLimit) {
    return {
      admitted: true,
      because: `${tier.label} admits ${tier.organisationLimit} organisations, and ${held} hold a seat.`,
    };
  }
  return {
    admitted: false,
    because: `${tier.label} admits ${tier.organisationLimit} organisations, and ${held} hold a seat.`,
    fix: 'Lower the count on the policies screen, or move to a tier that admits more.',
  };
}

/** Reports whether a tier admits an air-gapped installation. */
export function airGapGate(tier: CommercialTier): GateAnswer {
  if (tier.airGapped) {
    return {
      admitted: true,
      because: `${tier.label} installs with no outbound network access, carrying every dependency.`,
    };
  }
  return {
    admitted: false,
    because: `${tier.label} installs with outbound network access.`,
    fix: 'Move to a tier that installs air-gapped.',
  };
}

/** The tier one identifier names inside one application. */
export function tierFor(application: Application, tierId: string): CommercialTier | undefined {
  return variantFor(application).tiers.find((entry) => entry.id === tierId);
}
