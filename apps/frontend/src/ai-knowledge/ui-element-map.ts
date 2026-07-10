// apps/frontend/src/ai-knowledge/ui-element-map.ts
//
// ╔══════════════════════════════════════════════════════════════════════╗
// ║  MASTER UI ELEMENT LOCATION MAP — maintained by developers           ║
// ║                                                                      ║
// ║  ENFORCEMENT: This file is typed as Record<StudioStepId, ...>.       ║
// ║  Adding a new step ID to STUDIO_STEP_IDS in StepRegistry.tsx will    ║
// ║  cause a TypeScript error here until you document the new step.      ║
// ║  "next build" fails → Vercel rejects the deploy → you cannot ship    ║
// ║  a new step without documenting its UI elements.                     ║
// ║                                                                      ║
// ║  WHEN UPDATING UI: Find the relevant step/page entry below and       ║
// ║  update the element description in the same PR as the UI change.     ║
// ╚══════════════════════════════════════════════════════════════════════╝

import type { StudioStepId } from '@/app/_studio/shell/StepRegistry';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UIElement = {
  name: string;
  location: string;
  what: string;
};

export type StepUIEntry = {
  stepName: string;
  overview: string;
  phases?: Record<string, {
    label: string;
    overview: string;
    elements: UIElement[];
  }>;
  elements?: UIElement[];
};

export type PageUIEntry = {
  pageName: string;
  route: string;
  overview: string;
  elements: UIElement[];
};

// ─── Step UI Map (type-enforced) ──────────────────────────────────────────────
// TypeScript requires ALL StudioStepId values (0–5) to have entries here.
// Add step 6 to StepRegistry without adding it here → build fails.

export const STEP_UI_MAP: Record<StudioStepId, StepUIEntry> = {

  // ── STEP 0: FOUNDATION ────────────────────────────────────────────────────
  0: {
    stepName: 'Foundation',
    overview: 'The first step. Choose your project type, select a template, and configure your app identity and goals. Has 4 phases shown as sub-steps in the left sidebar.',
    phases: {
      'choose-type': {
        label: 'Choose Type',
        overview: 'Pick whether you are building a dApp (public blockchain) or a Private Blockchain (enterprise chain).',
        elements: [
          { name: 'dApp card', location: 'Center of screen, LEFT of the two large selection cards', what: 'Click to select the dApp path. Shows AutoAwesomeMosaic icon, title "dApp", subtitle about building on a public blockchain.' },
          { name: 'Private Blockchain card', location: 'Center of screen, RIGHT of the two large selection cards', what: 'Click to select the Private Blockchain path. Shows a LAN/network icon.' },
          { name: 'Continue button', location: 'Bottom center of screen inside a floating pill dock', what: 'Appears after you click a type card. Advances to the next phase.' },
        ],
      },
      'dapp-type': {
        label: 'dApp Type (dApp path only)',
        overview: 'Choose Public dApp (open to all) or Private dApp (gated/invite-only). Only shown when dApp was selected in the previous phase.',
        elements: [
          { name: 'Public dApp card', location: 'Center of screen, LEFT card', what: 'Select for a publicly accessible dApp.' },
          { name: 'Private dApp card', location: 'Center of screen, RIGHT card', what: 'Select for a gated/invite-only dApp.' },
          { name: 'Continue button', location: 'Bottom center floating pill', what: 'Advances to the template gallery.' },
          { name: 'Back button', location: 'Bottom center floating pill, left of Continue', what: 'Returns to the Choose Type phase.' },
        ],
      },
      'legacy-question': {
        label: 'Legacy Check (Private Blockchain path only)',
        overview: 'Asked only for Private Blockchain projects. Are you migrating from an existing blockchain or starting fresh?',
        elements: [
          { name: 'Starting fresh card', location: 'Center of screen, first card', what: 'Greenfield project, no migration needed. Most common choice.' },
          { name: 'Connect to existing chain card', location: 'Center of screen, second card', what: 'You have a running blockchain and want to add Cerulea capabilities.' },
          { name: 'Port from another platform card', location: 'Center of screen, third card', what: 'Migrating from Hyperledger, Substrate, or another platform.' },
          { name: 'Continue button', location: 'Bottom center floating pill', what: 'Advances to the template gallery.' },
        ],
      },
      'gallery': {
        label: 'Template Gallery',
        overview: 'Browse and select a starting template that pre-installs relevant modules. You can always add or remove modules later in Step 2.',
        elements: [
          { name: 'Search box', location: 'Top center of the template gallery area', what: 'Type to filter templates by name or keyword.' },
          { name: 'Template cards', location: 'Center of screen in a responsive grid (2-3 columns)', what: 'Each card shows: colored icon, template name, short description, category badge, and module tags. Click to select.' },
          { name: 'Selected template indicator', location: 'On the chosen template card', what: 'Selected card gets a purple border and a purple ring glow.' },
          { name: 'Continue button', location: 'Bottom center floating pill', what: 'Advances to the Configure phase. Only active after selecting a template.' },
          { name: 'Back button', location: 'Bottom center floating pill, left of Continue', what: 'Returns to previous phase.' },
        ],
      },
      'details': {
        label: 'Configure',
        overview: 'Fill in your app identity, goals, and (for Private Blockchain) network config. Split panel: tabs on the left, form on the right.',
        elements: [
          { name: 'App Identity tab', location: 'Left vertical tab list, FIRST item', what: 'Click to show the App Identity form: App Name, Description, Logo URL, Favicon URL, Social Image URL, Primary Color.' },
          { name: 'App Goal tab', location: 'Left vertical tab list, SECOND item', what: 'Click to show goal/audience/monetization form.' },
          { name: 'Network Config tab', location: 'Left vertical tab list, THIRD item (Private Blockchain only)', what: 'Consensus mechanism (PoA/PoS) and deployment region selection.' },
          { name: 'Review tab', location: 'Left vertical tab list, LAST item', what: 'Summary of all selections before moving to Step 2.' },
          { name: 'App Name field', location: 'Configure form, App Identity tab, FIRST field', what: 'Required text input. The name of your application.' },
          { name: 'Description field', location: 'Configure form, App Identity tab, SECOND field', what: 'Multiline text area. 2-3 sentence description of your app.' },
          { name: 'Logo URL field', location: 'Configure form, App Identity tab, THIRD field', what: 'Paste a public URL to your app logo image.' },
          { name: 'Favicon URL field', location: 'Configure form, App Identity tab, FOURTH field', what: 'URL to a 32×32 favicon image.' },
          { name: 'Social Image URL field', location: 'Configure form, App Identity tab, FIFTH field', what: 'Open Graph image URL for social sharing previews.' },
          { name: 'Primary Color input', location: 'Configure form, App Identity tab, SIXTH field', what: 'Color picker / hex input for your brand color.' },
          { name: 'App Category dropdown', location: 'Configure form, App Goal tab, FIRST field', what: 'Choose your app category: DeFi, NFT, Gaming, Identity, Social, etc.' },
          { name: 'Primary Objective field', location: 'Configure form, App Goal tab, SECOND field', what: 'Text input: What is the #1 thing users do in your app?' },
          { name: 'Target Audience field', location: 'Configure form, App Goal tab, THIRD field', what: 'Text input describing your users.' },
          { name: 'Monetization Model chips', location: 'Configure form, App Goal tab, after Target Audience', what: 'Multi-select chips: Transaction fees, Subscription, Token inflation, NFT sales, SaaS.' },
          { name: 'Launch Blueprint button', location: 'Bottom right of the Review tab', what: 'Final action to complete Step 1 and move to Step 2 Blueprint.' },
          { name: 'Next button', location: 'Bottom right of each form tab', what: 'Advances to the next Configure tab.' },
        ],
      },
    },
  },

  // ── STEP 1: BLUEPRINT ─────────────────────────────────────────────────────
  1: {
    stepName: 'Blueprint',
    overview: 'Visual drag-and-drop canvas where you build your app architecture by placing and connecting feature modules. Uses a ReactFlow infinite canvas.',
    elements: [
      { name: '+ Add Module button', location: 'TOP-RIGHT of the blueprint toolbar strip above the canvas', what: 'PRIMARY ACTION. Click to open the Module Library Drawer from the right side. Blue/purple button with a + icon and "Add Module" label.' },
      { name: 'Smart Contracts button', location: 'TOP-RIGHT toolbar, to the right of the + Add Module button', what: 'Opens the Smart Contracts panel showing all auto-generated contracts derived from your modules.' },
      { name: 'Canvas area', location: 'Full center of the screen, takes up most of the viewport', what: 'The main work area. Infinite panning + zooming. Module cards appear here. Drag cards to reposition. Draw lines between cards to create connections.' },
      { name: 'Module cards on canvas', location: 'Anywhere on the canvas where you have placed them', what: 'Rounded cards showing module name and icon. Drag to reposition. Click to open the Module Detail Panel on the right. Right-click for context menu (Delete, Duplicate, View Details).' },
      { name: 'Connection handles', location: 'On the edge of each module card (small dots on left/right/top/bottom)', what: 'Drag from a handle on one card to a handle on another to create a directed connection/edge between modules.' },
      { name: 'Edge label', location: 'On the connecting line between two modules', what: 'Shows the relationship type: reads / writes / triggers / feeds / calls / pays / custom. Click to change.' },
      { name: 'MiniMap', location: 'Bottom-RIGHT corner of the canvas area', what: 'Shows a zoomed-out overview of the entire canvas. Click to navigate to a position.' },
      { name: 'Canvas Controls panel', location: 'Bottom-LEFT corner of the canvas area', what: 'Four small buttons: zoom in (+), zoom out (−), fit all nodes into view, and lock/unlock canvas panning.' },
      { name: 'Module Library Drawer', location: 'Slides in from the RIGHT EDGE of the screen when you click + Add Module', what: 'Contains a search box at top, then scrollable list of modules organized by category. Click any module card to add it to the canvas.' },
      { name: 'Module Library search box', location: 'TOP of the Module Library Drawer', what: 'Type to filter modules by name, category, or tag.' },
      { name: 'Module Library close (×) button', location: 'TOP-RIGHT corner of the Module Library Drawer', what: 'Click to close the drawer without adding a module.' },
      { name: 'Module Detail Panel', location: 'RIGHT side panel, opens when you click a module on the canvas', what: 'Shows: module name, description, entities generated, dependencies, recommended modules, and a Remove button at the bottom.' },
      { name: 'Back button', location: 'Bottom center floating pill, LEFT button', what: 'Returns to Step 1 Foundation.' },
      { name: 'Next button', location: 'Bottom center floating pill, RIGHT button', what: 'Advances to Step 3 Data Schema.' },
      { name: 'Floating pill dock', location: 'Centered at the BOTTOM of the canvas, floating above the canvas', what: 'Contains Back, step indicator ("Step 2 of 6"), and Next buttons.' },
    ],
  },

  // ── STEP 2: DATA SCHEMA ───────────────────────────────────────────────────
  2: {
    stepName: 'Data Schema',
    overview: 'Define your data model: entities, fields, storage strategies, access control rules, logic/triggers, and API visibility. Three-column layout.',
    elements: [
      { name: 'Entity List panel', location: 'LEFT panel (~240px wide)', what: 'Lists all entities grouped by the module they came from. Click an entity to edit it in the center panel.' },
      { name: '+ Add Entity button', location: 'TOP of the LEFT Entity List panel', what: 'Click to create a new custom entity not from any module.' },
      { name: 'Entity cards in list', location: 'LEFT panel, below the Add Entity button', what: 'Each card shows entity name and a module badge. Active entity has a purple left border. Click to select.' },
      { name: 'Entity name field', location: 'CENTER panel, very TOP, large editable text', what: 'Click to edit the entity name inline.' },
      { name: 'Entity description field', location: 'CENTER panel, below the entity name', what: 'Short description of what this entity represents.' },
      { name: 'Fields list', location: 'CENTER panel, below the entity description', what: 'Lists all fields for the selected entity. Each row shows field name, type chip, and settings icon.' },
      { name: '+ Add Field button', location: 'CENTER panel, at the BOTTOM of the fields list', what: 'Click to add a new field to the current entity.' },
      { name: 'Field row', location: 'CENTER panel, inside the fields list', what: 'Click to expand field settings: name, type, required toggle, default value, validation rules.' },
      { name: 'Field type dropdown', location: 'CENTER panel, inside an expanded field row', what: 'Choose the data type: String, Integer, Float, Boolean, Address, Bytes32, IPFS Hash, Timestamp, UUID, Reference, JSON, Enum.' },
      { name: 'Storage Strategy section', location: 'RIGHT panel, TOP section', what: 'Radio buttons: Database (fast, off-chain), On-chain (immutable, costs gas), IPFS (decentralized files). Sets storage for the entire entity.' },
      { name: 'API Endpoints section', location: 'RIGHT panel, MIDDLE section', what: 'Shows auto-generated REST endpoints for this entity (GET, POST, PUT, DELETE). Each endpoint has an access dropdown.' },
      { name: 'Access Control dropdown (per endpoint)', location: 'RIGHT panel, next to each API endpoint', what: 'Options: Public (anyone can call), Auth (must be logged in), Owner (only the resource owner), Admin (admin role only).' },
      { name: 'API Visibility toggle', location: 'RIGHT panel, in the API Endpoints section', what: 'Toggle to make this entity\'s endpoints publicly documented or internal-only.' },
      { name: 'Data Model tab', location: 'TOP tab bar of the center+right area, FIRST tab', what: 'Shows the 3-column entity/field/storage editor.' },
      { name: 'Logic & Triggers tab', location: 'TOP tab bar, SECOND tab', what: 'Opens a visual flow builder or TypeScript code editor to define automated logic when entity events occur.' },
      { name: 'Access Control tab', location: 'TOP tab bar, THIRD tab', what: 'Matrix view: rows are entities, columns are roles (Public/Auth/Owner/Admin). Set access at the entity level in bulk.' },
      { name: 'API Overview tab', location: 'TOP tab bar, FOURTH tab', what: 'Generated API reference showing all endpoints, request/response schemas using your actual field names.' },
      { name: 'Back button', location: 'Bottom center floating pill, LEFT', what: 'Returns to Step 2 Blueprint.' },
      { name: 'Next button', location: 'Bottom center floating pill, RIGHT', what: 'Advances to Step 4 Economics.' },
    ],
  },

  // ── STEP 3: ECONOMICS ─────────────────────────────────────────────────────
  3: {
    stepName: 'Economics',
    overview: 'Configure tokenomics for your project\'s native token: supply, distribution, staking, and governance parameters.',
    elements: [
      { name: 'Token Name field', location: 'TOP of the economics form, FIRST field', what: 'Full name of your token, e.g. "Cerulea Token".' },
      { name: 'Token Symbol field', location: 'Economics form, SECOND field', what: 'Short ticker symbol, max 6 characters, e.g. "CRL".' },
      { name: 'Total Supply field', location: 'Economics form, THIRD field', what: 'Total number of tokens at genesis (before any minting).' },
      { name: 'Decimals field', location: 'Economics form, FOURTH field', what: 'Token precision. Default 18 (like ETH). 6 is common for stablecoins.' },
      { name: 'Token Properties checkboxes', location: 'Economics form, below Decimals', what: 'Three checkboxes: Mintable (allow creating new tokens), Burnable (allow destroying tokens), Pausable (allow pausing all transfers).' },
      { name: 'Initial Distribution table', location: 'Economics form, middle section', what: 'Table with rows for each allocation: Recipient label, Percentage, Vesting Period. Common rows: Team, Advisors, Treasury, Public Sale, Ecosystem Rewards, Liquidity.' },
      { name: '+ Add Allocation button', location: 'Bottom of the Initial Distribution table', what: 'Adds a new row to the distribution table.' },
      { name: 'Staking Configuration section', location: 'Economics form, lower section (only visible if Staking module is in Blueprint)', what: 'Fields: Staking APY (%), Lock-up Period (days), Slashing Percentage (%).' },
      { name: 'Governance Configuration section', location: 'Economics form, lower section (only visible if Governance module is in Blueprint)', what: 'Fields: Quorum Percentage (%), Voting Period (days), Proposal Threshold (minimum tokens to submit a proposal).' },
      { name: 'Treasury Allocation field', location: 'Economics form, after Governance section', what: 'Percentage of tokens held in the DAO treasury.' },
      { name: 'Back button', location: 'Bottom center floating pill, LEFT', what: 'Returns to Step 3 Data Schema.' },
      { name: 'Next button', location: 'Bottom center floating pill, RIGHT', what: 'Advances to Step 5 Integrations.' },
    ],
  },

  // ── STEP 4: INTEGRATIONS ──────────────────────────────────────────────────
  4: {
    stepName: 'Integrations',
    overview: 'Connect external services to your application. Each integration card shows the service status and expands to accept API credentials.',
    elements: [
      { name: 'Integration cards grid', location: 'Center of screen in a 2-3 column grid', what: 'Each card shows: service logo/icon, service name, description, and a status badge (Not configured / Connected / Needs attention).' },
      { name: 'Stripe card', location: 'Integration grid, typically first card', what: 'Payments integration. Click to expand and enter: Publishable Key, Secret Key, Webhook Secret.' },
      { name: 'Sumsub card', location: 'Integration grid', what: 'KYC/AML verification. Fields: App Token, Secret Key, Webhook Secret.' },
      { name: 'Chainlink card', location: 'Integration grid', what: 'Oracle / price feed. Fields: Network, Oracle Contract Address, Job ID.' },
      { name: 'Alchemy card', location: 'Integration grid', what: 'Enhanced RPC endpoint. Fields: API Key, Network.' },
      { name: 'IPFS / Filecoin card', location: 'Integration grid', what: 'Decentralized storage. Fields: API Key, Gateway URL, Pinning Service.' },
      { name: 'Telegram card', location: 'Integration grid', what: 'Bot notifications. Fields: Bot Token, Chat ID.' },
      { name: 'SendGrid card', location: 'Integration grid', what: 'Email delivery. Fields: API Key, From Email, From Name.' },
      { name: 'Plaid card', location: 'Integration grid', what: 'Banking / fiat connectivity. Fields: Client ID, Secret, Environment (Sandbox / Production).' },
      { name: 'Configure panel', location: 'Below the clicked integration card (expands inline or opens modal)', what: 'Shows API key input fields specific to that integration. Has a Save button.' },
      { name: 'Save button', location: 'Bottom of the expanded integration configure panel', what: 'Saves and validates the entered credentials.' },
      { name: 'Status badge — Not configured', location: 'Top-right of each integration card', what: 'Gray badge. No credentials entered yet.' },
      { name: 'Status badge — Connected', location: 'Top-right of each integration card', what: 'Green badge. Credentials saved and verified successfully.' },
      { name: 'Status badge — Needs attention', location: 'Top-right of each integration card', what: 'Yellow badge. Partial config or validation failed.' },
      { name: 'Back button', location: 'Bottom center floating pill, LEFT', what: 'Returns to Step 4 Economics.' },
      { name: 'Next button', location: 'Bottom center floating pill, RIGHT', what: 'Advances to Step 6 Deploy & UI.' },
    ],
  },

  // ── STEP 5: DEPLOY & UI ───────────────────────────────────────────────────
  5: {
    stepName: 'Deploy & UI',
    overview: 'Build your application\'s frontend UI and deploy everything. Two main sub-sections: UI Builder and Review & Deploy.',
    elements: [
      { name: 'UI Builder tab', location: 'TOP tab bar, FIRST tab', what: 'Opens the visual page designer.' },
      { name: 'Review & Deploy tab', location: 'TOP tab bar, SECOND tab', what: 'Pre-flight validation checklist and the final Deploy Now button.' },
      { name: 'Page List panel', location: 'LEFT panel of the UI Builder tab', what: 'Lists all pages in your app. Click a page to edit it on the canvas.' },
      { name: '+ Add Page button', location: 'TOP of the LEFT Page List panel', what: 'Creates a new page in your app.' },
      { name: 'UI Canvas', location: 'CENTER of the UI Builder tab', what: 'Drag-drop area for placing UI components. Shows a live preview of the page.' },
      { name: 'Component Properties panel', location: 'RIGHT panel of the UI Builder tab', what: 'Shows settings for the currently selected component: data source, styling, visibility rules.' },
      { name: 'Add Component button', location: 'TOP toolbar of the UI Builder canvas', what: 'Opens the component library: Tables, Charts, Cards, Forms, Buttons, Modals, Navigation, Hero sections.' },
      { name: 'Template picker', location: 'TOP of the UI Builder, before the canvas', what: 'Choose a starting page template: Dashboard, Marketplace, Portfolio, Governance, DEX, Blank.' },
      { name: 'Validation checklist', location: 'Review & Deploy tab, center of screen', what: 'List of pre-deployment checks. Green checkmark = pass, red X = fail, yellow = warning. Common checks: token symbol set, modules added, schema configured, smart contracts generated.' },
      { name: 'Deploy Now button', location: 'Review & Deploy tab, BOTTOM CENTER of the checklist area, large primary button', what: 'Starts deployment. Only active when all required checks pass. Shows a progress sequence: Compiling → Deploying → Indexing → Frontend → Done.' },
      { name: 'Deployment result panel', location: 'Appears after successful deployment in Review & Deploy tab', what: 'Shows: dApp URL, contract addresses, RPC endpoint, subgraph URL. Has "View Live App" and "Go to Dashboard →" buttons.' },
      { name: 'View Live App button', location: 'Deployment result panel, LEFT button', what: 'Opens your deployed dApp in a new tab.' },
      { name: 'Go to Dashboard button', location: 'Deployment result panel, RIGHT button', what: 'Navigates to your Cerulea Dashboard to manage the live deployment.' },
      { name: 'Back button', location: 'Bottom center floating pill, LEFT', what: 'Returns to Step 5 Integrations.' },
    ],
  },
};

// ─── Non-Studio Pages ─────────────────────────────────────────────────────────
// Update this when adding new pages to the dashboard or changing navigation.

export const PAGE_UI_MAP: Record<string, PageUIEntry> = {
  landing: {
    pageName: 'Studio Landing',
    route: '/ (root)',
    overview: 'The home page of Cerulea Studio showing existing projects and options to create new ones.',
    elements: [
      { name: 'New dApp card', location: 'Center of screen, LEFT of the two main action cards', what: 'Large card with a gradient icon. Click to start a new dApp project — goes to Step 1.' },
      { name: 'New Private Blockchain card', location: 'Center of screen, RIGHT of the two main action cards', what: 'Large card with a network icon. Click to start a Private Blockchain project.' },
      { name: 'Projects grid', location: 'Below the two main cards', what: 'Grid of existing project cards. Each shows project name, type badge, status, last updated date.' },
      { name: '+ New Project tile', location: 'LAST card in the projects grid (after all existing projects)', what: 'Dashed border card with a + icon. Click to start a new project. Has an animated gradient border on hover.' },
      { name: 'Project card', location: 'In the projects grid', what: 'Click to open that project in the Studio (goes to the step where you left off). Shows: name, type, status chip, last updated.' },
    ],
  },
  dashboard: {
    pageName: 'Dashboard',
    route: '/dashboard',
    overview: 'Post-deployment management hub. Shows metrics, manages infrastructure and governance.',
    elements: [
      { name: 'Dashboard sidebar', location: 'Left side of screen, full height, fixed', what: 'Navigation sidebar with grouped nav items. Contains a "New Project" button at the top.' },
      { name: 'New Project button', location: 'Near the TOP of the dashboard left sidebar', what: 'Click to go back to Cerulea Studio to create a new project.' },
      { name: 'Collapse toggle button', location: 'TOP-RIGHT of the dashboard sidebar', what: 'Chevron left icon. Click to collapse the sidebar to icon-only mode. Chevron right to expand.' },
      { name: 'PLATFORM section — Overview', location: 'Dashboard sidebar, first nav group, first item', what: 'Link to /dashboard — project stats, active deployments, quick actions.' },
      { name: 'PLATFORM section — Projects', location: 'Dashboard sidebar, first nav group, second item', what: 'Link to /dashboard/projects — list of all your projects.' },
      { name: 'INFRASTRUCTURE section — Networks', location: 'Dashboard sidebar, second nav group', what: 'Link to /dashboard/networks — live blockchain telemetry.' },
      { name: 'INFRASTRUCTURE section — Nodes', location: 'Dashboard sidebar, second nav group', what: 'Link to /dashboard/nodes — provision and manage validator/RPC nodes.' },
      { name: 'DEVELOP section — Keys & Access', location: 'Dashboard sidebar, third nav group', what: 'Link to /dashboard/keys — API key management and RBAC roles.' },
      { name: 'DEVELOP section — Governance', location: 'Dashboard sidebar, third nav group', what: 'Link to /dashboard/governance — proposals, voting, multisig queue.' },
      { name: 'DEVELOP section — Smart Contracts', location: 'Dashboard sidebar, third nav group', what: 'Link to /dashboard/contracts — deployed contract addresses and ABIs.' },
      { name: 'MANAGE section — Audit Logs', location: 'Dashboard sidebar, fourth nav group', what: 'Link to /dashboard/audit — tamper-proof event log.' },
      { name: 'MANAGE section — State Snapshots', location: 'Dashboard sidebar, fourth nav group', what: 'Link to /dashboard/state — point-in-time chain backups.' },
      { name: 'MANAGE section — Integrations', location: 'Dashboard sidebar, fourth nav group', what: 'Link to /dashboard/integrations — manage connected external services.' },
      { name: 'ACCOUNT section — Billing', location: 'Dashboard sidebar, fifth nav group', what: 'Link to /dashboard/billing — subscription plan, usage meters, invoices.' },
      { name: 'ACCOUNT section — Settings', location: 'Dashboard sidebar, fifth nav group', what: 'Link to /dashboard/settings — project settings, team members, domain.' },
      { name: 'User footer', location: 'Very BOTTOM of the dashboard sidebar', what: 'Shows user avatar, name, and plan chip. Click to go to /settings/profile.' },
    ],
  },
};

// ─── Serializer for AI injection ──────────────────────────────────────────────

export function buildUILocationKnowledge(): string {
  const stepSections = (Object.entries(STEP_UI_MAP) as [string, StepUIEntry][])
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([id, entry]) => {
      const phaseText = entry.phases
        ? Object.entries(entry.phases)
            .map(([, phase]) => {
              const elementLines = phase.elements
                .map((el) => `    - **${el.name}**: ${el.location} → ${el.what}`)
                .join('\n');
              return `  ### Phase: ${phase.label}\n  ${phase.overview}\n  Elements:\n${elementLines}`;
            })
            .join('\n\n')
        : '';

      const elementText = entry.elements
        ? entry.elements
            .map((el) => `  - **${el.name}**: ${el.location} → ${el.what}`)
            .join('\n')
        : '';

      return `## Step ${id}: ${entry.stepName}\n${entry.overview}\n\n${phaseText}${elementText}`;
    })
    .join('\n\n---\n\n');

  const pageSections = Object.values(PAGE_UI_MAP)
    .map((page) => {
      const elementLines = page.elements
        .map((el) => `  - **${el.name}**: ${el.location} → ${el.what}`)
        .join('\n');
      return `## Page: ${page.pageName} (route: ${page.route})\n${page.overview}\n\nElements:\n${elementLines}`;
    })
    .join('\n\n---\n\n');

  return `# UI ELEMENT LOCATION MAP\n\nUse this map to answer questions like "where is the Add Module button?" with exact, accurate descriptions.\n\n${stepSections}\n\n---\n\n${pageSections}`;
}
