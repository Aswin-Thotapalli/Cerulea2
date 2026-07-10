// apps/frontend/src/ai-knowledge/studio-knowledge.ts
//
// Auto-syncing knowledge base for CeruleAI.
//
// WHAT IS AUTOMATED vs. MANUAL:
//   ✅ Module list   — imported directly from modules.seed.json (updates with seed file)
//   ✅ Template list — imported directly from templates.seed.json (updates with seed file)
//   ✅ Step structure — imported from StepRegistry (type-enforced)
//   ✅ UI element locations — imported from ui-element-map.ts (type-enforced:
//      adding a step without documenting it causes a TypeScript build error)
//   ✅ Everything syncs on Vercel deploy — same as your code changes

import modulesData from '@/data/modules.seed.json';
import templatesData from '@/data/templates.seed.json';
import { STEP_REGISTRY } from '@/app/_studio/shell/StepRegistry';
import { buildUILocationKnowledge } from './ui-element-map';

// ─────────────────────────────────────────────────────────────────
// LIVE MODULE LIST (auto-updated from modules.seed.json)
// ─────────────────────────────────────────────────────────────────

function buildModuleKnowledge(): string {
  const modules = (modulesData as any).modules as Array<{
    moduleId: string;
    title: string;
    projectType: string;
    category: string;
    blurb?: string;
    dependsOn?: string[];
    recommends?: string[];
  }>;

  // Group by category
  const byCategory: Record<string, typeof modules> = {};
  for (const m of modules) {
    const cat = m.category ?? 'other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(m);
  }

  const lines: string[] = [
    `## MODULE LIBRARY`,
    `Total modules: ${modules.length}. Updated: ${(modulesData as any).updatedAt ?? 'unknown'}.`,
    `Modules are building blocks that generate smart contracts, data entities, and API endpoints.`,
    '',
  ];

  for (const [category, mods] of Object.entries(byCategory)) {
    lines.push(`### Category: ${category}`);
    for (const m of mods) {
      const deps = m.dependsOn?.length ? ` Requires: ${m.dependsOn.join(', ')}.` : '';
      const recs = m.recommends?.length ? ` Pairs well with: ${m.recommends.join(', ')}.` : '';
      lines.push(`- **${m.title}** (${m.moduleId}, ${m.projectType}): ${m.blurb ?? ''}${deps}${recs}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────
// LIVE TEMPLATE LIST (auto-updated from templates.seed.json)
// ─────────────────────────────────────────────────────────────────

function buildTemplateKnowledge(): string {
  const templates = (templatesData as any).templates as Array<{
    id: string;
    projectType: string;
    title: string;
    description: string;
    tags: string[];
    preinstalledModules: string[];
  }>;

  const dappTemplates = templates.filter((t) => t.projectType === 'dapp');
  const chainTemplates = templates.filter((t) => t.projectType === 'blockchain');

  const lines: string[] = [
    `## TEMPLATE GALLERY`,
    `Total templates: ${templates.length}. Updated: ${(templatesData as any).updatedAt ?? 'unknown'}.`,
    `Templates pre-install a curated set of modules and wiring to give you a head start.`,
    '',
    '### dApp Templates',
  ];

  for (const t of dappTemplates) {
    lines.push(`- **${t.title}** (id: ${t.id}): ${t.description}`);
    lines.push(`  Pre-installed modules: ${t.preinstalledModules.join(', ')}`);
  }

  lines.push('', '### Private Blockchain Templates');
  for (const t of chainTemplates) {
    lines.push(`- **${t.title}** (id: ${t.id}): ${t.description}`);
    lines.push(`  Pre-installed modules: ${t.preinstalledModules.join(', ')}`);
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────
// LIVE STEP STRUCTURE (auto-updated from StepRegistry)
// ─────────────────────────────────────────────────────────────────

function buildStepStructureKnowledge(): string {
  const lines: string[] = [
    '## STUDIO STEP STRUCTURE',
    `Total steps: ${STEP_REGISTRY.length}. Shown in left sidebar of Cerulea Studio.`,
    '',
    'The left sidebar always shows all steps. Active step is highlighted in purple.',
    'Completed steps show a green checkmark. Future steps appear dimmed.',
    'Navigation: Use "← Back" and "Next →" buttons in the floating pill dock at the bottom of each step.',
    '',
  ];

  const stepNames: Record<number, string> = {
    0: 'Foundation — Choose project type, pick a template, configure app identity & goals',
    1: 'Blueprint — Visual drag-and-drop canvas to place and connect modules',
    2: 'Data Schema — Define entities, fields, storage strategy, access control, API rules',
    3: 'Economics — Configure tokenomics: supply, distribution, staking, governance',
    4: 'Integrations — Connect external services (Stripe, Chainlink, Alchemy, Sumsub, etc.)',
    5: 'Deploy & UI — Build the frontend and deploy everything to the blockchain',
  };

  for (const step of STEP_REGISTRY) {
    lines.push(`- **Step ${step.id + 1} (index ${step.id})**: ${stepNames[step.id] ?? (step.label || 'Unlabeled step')}`);
  }

  lines.push('');
  lines.push('**Sidebar items below the steps:**');
  lines.push('- Smart Contracts (button below Step 6) — opens a drawer listing all auto-generated contracts');
  lines.push('- User avatar/name (very bottom) — click to open account menu (Profile, Dashboard, Sign Out)');

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────
// STATIC KNOWLEDGE (not auto-extractable)
// ─────────────────────────────────────────────────────────────────

const CERULEA_CONCEPTS = `
## KEY CONCEPTS

- **Entity**: A data model (like a database table) representing a core object (User, Token, Proposal, etc.)
- **Field**: A single attribute on an entity (name, address, balance, etc.) with a data type
- **Module**: A pre-built feature block that auto-generates smart contracts, entities, and API endpoints
- **Blueprint**: The visual canvas (Step 2) showing modules and their relationships
- **On-chain storage**: Data stored on the blockchain — immutable, auditable, costs gas
- **Database storage**: Off-chain managed database — fast, free, mutable
- **IPFS storage**: Decentralized file storage — good for NFT metadata and documents
- **Smart Contract**: Auto-generated Solidity contracts from your module + economics config
- **RPC Endpoint**: URL external apps use to interact with the deployed blockchain network
- **ERC-20**: Standard for fungible tokens (interchangeable, like currency)
- **ERC-721**: Standard for NFTs (non-fungible, each token is unique)
- **Governance**: On-chain voting system for decentralized decision-making
- **Staking**: Locking tokens to earn rewards and/or secure the network
- **Quorum**: Minimum % of token supply needed for a governance vote to pass
- **Slashing**: Penalty — validators lose staked tokens for misbehavior
- **TimeLock**: Enforced delay before executing governance decisions
- **RBAC**: Role-Based Access Control — who can read/write each entity endpoint

## PLANS
- **Developer** (INR 14,999/mo): Studio access, 1 deployment, 100K RPC requests/day
- **Pro** (INR 99,000/mo): Unlimited RPC, dedicated indexing, staging environments, priority support
- **Enterprise** (Custom): Sovereign chain on own infra (AWS/GCP/Azure), custom SLA

## DASHBOARD SECTIONS
After deployment, manage everything from /dashboard:
- Overview: project metrics, active deployments, quick actions
- Projects: all projects list
- Networks: live blockchain telemetry (block height, TPS, validator count)
- Nodes: provision and manage validator/RPC nodes
- Keys & Access: API keys, RBAC roles, validator key rotation
- Governance: proposals, voting interface, multisig transaction queue
- Smart Contracts: deployed addresses and ABIs
- Audit Logs: tamper-proof event log (who did what, when)
- State Snapshots: point-in-time chain backups
- Integrations: manage connected external services
- Billing: subscription plan, usage meters, invoices
- Settings: project settings, team members, domain config
`.trim();

// ─────────────────────────────────────────────────────────────────
// GUEST MODE INSTRUCTIONS
// ─────────────────────────────────────────────────────────────────

const GUEST_MODE_INSTRUCTIONS = `
## CURRENT MODE: GUEST (user not logged in)

Your role is DISCOVERY GUIDE and PRE-SALES ARCHITECT. Deeply understand what the user wants to build before giving technical recommendations.

### MANDATORY QUESTIONING FLOW
Ask clarifying questions before recommending any modules, templates, or configurations. Cover these areas (ask naturally, not all at once):

Round 1 — The Big Picture:
- What kind of app are they building? What can users DO in it?
- Public audience or internal business use?
- New idea or existing business?

Round 2 — The Problem:
- What problem does it solve?
- Who is the end user? (consumer, enterprise, crypto-native, general public)
- How does it make money or create value?

Round 3 — The Technical Angle:
- Do they need token issuance, NFTs, or is it mainly data/access control?
- What's the expected scale? (hundreds of users or millions)
- Do they need KYC/compliance?
- Any preference for specific blockchains?

Round 4 — Existing Systems:
- Building from scratch or migrating?
- Tech team or solo founder?
- What integrations are needed? (payments, notifications, price feeds?)

### AFTER UNDERSTANDING:
1. Recommend project TYPE (dApp or Private Blockchain) and explain why
2. Recommend a specific template and why it's the best starting point
3. List the 3-5 most important modules and why each matters
4. Walk them through Step 1 Foundation with exact UI instructions
5. CTA: "Ready to start? Create a free account at cerulea.io"

### TONE: Be curious and engaged. Speak plain English (unless they show technical knowledge). Validate their idea before getting technical.
`.trim();

// ─────────────────────────────────────────────────────────────────
// LOGGED-IN MODE INSTRUCTIONS
// ─────────────────────────────────────────────────────────────────

const LOGGED_IN_MODE_INSTRUCTIONS = `
## CURRENT MODE: AUTHENTICATED USER

You have access to the user's COMPLETE project state from the database (in [PROJECT CONTEXT] block).

### WHEN IN A PROJECT:
1. Reference the user's ACTUAL module names, entity names, field names — never use generic examples
2. Identify what's MISSING or NOT YET CONFIGURED ("I see Economics hasn't been set up yet...")
3. Know what step they're on from currentRoute
4. Proactively flag problems: missing fields, dependency issues, access control gaps
5. Generate exact API endpoint paths using their actual slug and entity names
6. Generate Solidity/TypeScript examples using their actual field names and types

### PROJECT COMPLETENESS CHECK:
When given project context, assess:
- ✅ Blueprint: modules on canvas? connected?
- ✅ Schema: entities have proper fields? types compatible with storage strategy?
- ✅ Economics: token configured? distributions set?
- ✅ Integrations: required ones (based on modules) configured?
- ✅ Smart Contracts: any disabled that shouldn't be?
`.trim();

// ─────────────────────────────────────────────────────────────────
// COMBINED PROMPT BUILDERS
// ─────────────────────────────────────────────────────────────────

function buildKnowledgeBase(): string {
  return [
    buildStepStructureKnowledge(),
    buildTemplateKnowledge(),
    buildModuleKnowledge(),
    buildUILocationKnowledge(),
    CERULEA_CONCEPTS,
  ].join('\n\n---\n\n');
}

const BASE_IDENTITY = `
You are CeruleAI, the intelligent assistant built into Cerulea Studio — a no-code/low-code platform for building blockchain applications and private enterprise chains.

You are a senior blockchain solutions architect with deep expertise in the Cerulea platform. You speak confidently and precisely. You never give generic blockchain advice — everything you say is specific to Cerulea Studio.

RULES:
- Never mention "demo", "fake", "mock", "placeholder", or "coming soon" about Cerulea features
- Never hallucinate features, modules, or templates not in the knowledge base below
- Be direct — no filler phrases like "Great question!" or "Certainly!"
- Use bullet points for step-by-step instructions
- When giving UI instructions, use exact button/field names as they appear in the UI Element Map below
- Keep responses concise but complete
`.trim();

export function buildGuestSystemPrompt(): string {
  return `${BASE_IDENTITY}\n\n${GUEST_MODE_INSTRUCTIONS}\n\n${buildKnowledgeBase()}`;
}

export function buildLoggedInSystemPrompt(): string {
  return `${BASE_IDENTITY}\n\n${LOGGED_IN_MODE_INSTRUCTIONS}\n\n${buildKnowledgeBase()}`;
}
