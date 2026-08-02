// apps/frontend/src/config/divisions-content.ts
//
// Marketing copy for the four division front doors. Keyed by MarketingSite
// (dapps / sme / enterprise / gov) — note sme + enterprise are both the
// `enterprise` division but are separate marketing pages with distinct copy.
//
// The landing pages render straight from here. Pricing is NOT duplicated here —
// it is derived from billing-catalog.ts via getTiersForDivision / getAddonsForDivision.

import type { MarketingSite } from './divisions';
import type { Division } from './divisions';

export interface FeatureContent {
  title: string;
  blurb: string;
  /** One line describing what the feature's visual/illustration should show. */
  visual: string;
}

export interface DivisionPageContent {
  site: MarketingSite;
  division: Division;
  eyebrow: string;
  headlineLine1: string;
  headlineLine2: string;
  description: string;
  featuresTitle: string;
  features: FeatureContent[];
  /** Where "Go to Studio" points for this segment (option C: same host serves studio). */
  studioLink: string;
  /** Short line introducing the pricing section for this segment. */
  pricingHeadline: string;
}

export const DIVISION_CONTENT: Record<MarketingSite, DivisionPageContent> = {
  // ══════════════════════════════════════════════════════════════════════════
  dapps: {
    site: 'dapps',
    division: 'dapp',
    eyebrow: 'For dApp Builders',
    headlineLine1: 'Build the dApp.',
    headlineLine2: "We'll run the chain.",
    description:
      "Design your contracts, data, and token economics in a visual studio — then deploy to Cerulea's public L1 or your own sovereign chain. No node ops, no DevOps, no Solidity boilerplate.",
    featuresTitle: 'What dApp builders get from Cerulea Studio',
    features: [
      { title: 'Visual Blueprint canvas', blurb: 'Drag modules onto a canvas, wire them together, and Cerulea generates the smart contracts for you.', visual: 'Blueprint canvas with connected module nodes (ERC-20 → staking → governance)' },
      { title: 'Prebuilt module library', blurb: 'Token, NFT, staking, DAO governance, bridge, oracle — audited building blocks you compose instead of code.', visual: 'Grid of module cards with category icons' },
      { title: 'One-click deploy', blurb: 'Push to the Cerulea Public L1 or a private sovereign chain in a single click — provisioning is handled for you.', visual: 'Deploy button → terminal streaming `cerulea deploy` with block confirmations' },
      { title: 'CeruleAI copilot', blurb: 'An agentic AI that builds your blueprint, explains any contract, and turns deploy errors into plain-English fixes.', visual: 'Chat panel emitting a <cerulean-action> that adds a module to the canvas' },
      { title: 'Data schema designer', blurb: 'Define entities and relationships visually; get typed data APIs generated automatically.', visual: 'Entity-relationship editor with linked tables' },
      { title: 'Token economics with guardrails', blurb: 'Configure supply, distribution, fees, and governance parameters — with warnings that stop you shipping a broken model.', visual: 'Tokenomics sliders + distribution pie that must sum to 100%' },
      { title: 'Integrations in minutes', blurb: 'Stripe, webhooks, oracles, and IPFS wired up with live test buttons before you deploy.', visual: 'Integrations grid with connection toggles and a "Test" button' },
      { title: 'Branded explorer & analytics', blurb: 'A block explorer and live dashboards for your chain, branded to your dApp.', visual: 'Block explorer with blocks streaming in real time' },
    ],
    studioLink: 'https://dapps.cerulea.io/studio',
    pricingHeadline: 'Simple monthly pricing — pick a chain, scale with add-ons.',
  },

  // ══════════════════════════════════════════════════════════════════════════
  sme: {
    site: 'sme',
    division: 'enterprise',
    eyebrow: 'For Growing Businesses',
    headlineLine1: 'Blockchain for your business —',
    headlineLine2: 'without a blockchain team.',
    description:
      'Launch a private, compliant chain for your products, records, and payments. Cerulea Studio does the engineering; you run the business.',
    featuresTitle: 'What SMEs get from Cerulea Studio',
    features: [
      { title: 'Your own private chain, managed', blurb: 'A sovereign chain provisioned and run for you on shared cloud — no infrastructure to manage.', visual: 'Single-tenant chain card reading "Your chain • Live"' },
      { title: 'No-code studio', blurb: 'Build with visual modules and templates. No Solidity, no node ops, no jargon.', visual: 'Simplified blueprint canvas with plain-language module labels' },
      { title: 'Roles & access', blurb: 'Give each staff member the right level of access with straightforward roles.', visual: 'Roles table mapping people to permissions' },
      { title: 'Built-in audit trail', blurb: 'Every action recorded automatically, with 30-day retention out of the box.', visual: 'Chronological audit-log list with actor + action' },
      { title: 'Payments & integrations', blurb: 'Stripe, invoicing, and webhooks connected without engineering help.', visual: 'Payments integration panel with a connected Stripe badge' },
      { title: 'Templates for common use cases', blurb: 'Supply-chain traceability, loyalty, and record-keeping templates get you live fast.', visual: 'Template gallery with 2-column cards' },
      { title: 'Grow when you are ready', blurb: 'Add validators, seats, and storage as you scale — or upgrade to Growth or Enterprise anytime.', visual: 'Add-on toggle list with running monthly total' },
      { title: 'Email support', blurb: 'Real help when you need it, with a 48-hour response.', visual: 'Support inbox with a ticket thread' },
    ],
    studioLink: 'https://sme.cerulea.io/studio',
    pricingHeadline: 'One-time license, then scale monthly with add-ons.',
  },

  // ══════════════════════════════════════════════════════════════════════════
  enterprise: {
    site: 'enterprise',
    division: 'enterprise',
    eyebrow: 'For Enterprises',
    headlineLine1: 'Enterprise blockchain infrastructure,',
    headlineLine2: 'governed the way you already work.',
    description:
      'Deploy sovereign chains with SSO, RBAC, audit-grade logging, and on-prem options — backed by a dedicated team and a 99.9% SLA.',
    featuresTitle: 'What enterprises get from Cerulea Studio',
    features: [
      { title: 'Deploy anywhere', blurb: 'Dedicated cloud, your private cloud, or fully on-prem / air-gapped — your compliance posture, your choice.', visual: 'Deployment target selector: Cloud / Private cloud / On-prem / Air-gap' },
      { title: 'SSO & SCIM provisioning', blurb: 'SAML single sign-on with automated user provisioning and de-provisioning.', visual: 'SSO login screen + SCIM provisioning flow diagram' },
      { title: 'RBAC & approval workflows', blurb: 'Granular roles, custom permissions, and multi-step approvals for sensitive actions.', visual: 'RBAC policy matrix of roles × permissions' },
      { title: 'Audit-grade logging', blurb: 'Legal-grade, exportable, long-retention audit trails for every action on the chain.', visual: 'Audit export panel with date-range + CSV/PDF export' },
      { title: 'Compliance certification pack', blurb: 'SOC2 / ISO27001 evidence auto-collected and report-ready — unblock your own enterprise sales.', visual: 'Compliance dashboard with green control checks' },
      { title: 'Private CeruleAI', blurb: 'Isolated or on-prem AI inference, so sensitive data never leaves your environment.', visual: 'AI assistant panel with a "Private / isolated" lock badge' },
      { title: 'Chain analytics & BI', blurb: 'Executive dashboards and BI over your chain data, no external tooling required.', visual: 'BI dashboard with KPI tiles and trend charts' },
      { title: 'Smart-contract audit credits', blurb: 'Automated and manual security passes on your contracts before every deploy.', visual: 'Audit report with pass/fail findings list' },
      { title: 'Enterprise module pack', blurb: 'KYC/AML, a workflow engine, and ERP connectors built for regulated operations.', visual: 'Module grid highlighting the enterprise pack' },
      { title: 'White-label', blurb: 'Full branding across the studio and the block explorer — it looks like yours.', visual: 'Studio UI reskinned with a customer logo and theme' },
      { title: 'Staging / UAT environments', blurb: 'Separate test chains so changes are validated before they touch production.', visual: 'Environment switcher: Dev / UAT / Prod' },
      { title: 'Dedicated team & SLA', blurb: 'A dedicated CSM and a 99.9% SLA, upgradable to 99.99%.', visual: 'SLA badge (99.9% → 99.99%) with a support contact card' },
    ],
    studioLink: 'https://enterprise.cerulea.io/studio',
    pricingHeadline: 'One-time license by scale, then monthly add-ons as you grow.',
  },

  // ══════════════════════════════════════════════════════════════════════════
  gov: {
    site: 'gov',
    division: 'govt',
    eyebrow: 'For Government',
    headlineLine1: 'Sovereign digital infrastructure',
    headlineLine2: 'citizens can trust.',
    description:
      'Run tamper-proof public records, citizen identity, and transparent services on a chain hosted entirely on national soil — with legal-grade audit built in.',
    featuresTitle: 'What government bodies get from Cerulea Studio',
    features: [
      { title: 'Sovereign on-soil deployment', blurb: 'Data never leaves the country, with air-gap-capable hosting — on-soil residency is included, never optional.', visual: 'Map pin "Data on national soil" + air-gap shield badge' },
      { title: 'Aadhaar / DigiLocker identity', blurb: 'Citizen identity linked to national ID, so records and services map to verified people.', visual: 'Identity verification step showing Aadhaar/DigiLocker linkage' },
      { title: 'Public transparency portal', blurb: 'A citizen-facing explorer for public records and spending — trust through visibility.', visual: 'Public portal with a searchable records list' },
      { title: 'Tamper-proof records registry', blurb: 'Land, certificates, and licenses recorded immutably and independently verifiable.', visual: 'Records registry with hash-locked, verifiable entries' },
      { title: 'RTI / grievance redressal', blurb: 'Track citizen requests and grievances end-to-end, with accountability at each step.', visual: 'Grievance workflow board: Filed → In review → Resolved' },
      { title: 'Legal-grade audit trail', blurb: 'An immutable, evidence-admissible record of every action for oversight and courts.', visual: 'Audit trail entries stamped with a legal/verification seal' },
      { title: 'Multi-department access', blurb: 'Hierarchical, permissioned data sharing across departments — right access, right people.', visual: 'Org-hierarchy access tree with permission scopes' },
      { title: 'eSign integration', blurb: 'Legally-binding digital signatures on on-chain records and approvals.', visual: 'eSign flow: document → sign → notarized on chain' },
      { title: 'Regulatory reporting automation', blurb: 'Auto-generate the compliance reports oversight bodies require, on schedule.', visual: 'Report generator producing a scheduled compliance PDF' },
      { title: 'Inter-department connectors', blurb: 'Permissioned data exchange between departments without exposing everything.', visual: 'Connector graph linking departments with scoped access' },
    ],
    studioLink: 'https://gov.cerulea.io/studio',
    pricingHeadline: 'A single sovereign license, extended with monthly add-ons.',
  },
};

export function getPageContent(site: MarketingSite): DivisionPageContent {
  return DIVISION_CONTENT[site];
}
