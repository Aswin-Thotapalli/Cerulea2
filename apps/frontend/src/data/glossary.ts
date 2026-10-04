// Centralised glossary for Studio step tooltips and help text.
// Every step reads it, so each term carries one plain explanation.
// The 26 keys are the production keys. The copy follows the writing rules.

export interface GlossaryEntry {
  term: string;
  definition: string;
  example?: string;
  learnMore?: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  // ── Project types ─────────────────────────────────────────────────────────
  dapp: {
    term: 'Decentralised Application (dApp)',
    definition:
      'An application that runs on a Blockchain network in place of one central server. The people who use it own their data and their assets.',
    example: 'An NFT marketplace, a DeFi lending platform, or a DAO voting app.',
  },
  blockchain: {
    term: 'Private / Sovereign Blockchain',
    definition:
      'A Blockchain network the organisation owns and controls in full. Enterprises and governments use one for compliance, privacy, and high-throughput operations.',
    example: 'A supply chain ledger for a manufacturer, or a central bank digital currency network.',
  },

  // ── Step 0 Project Foundation ───────────────────────────────────────────
  template: {
    term: 'Template',
    definition:
      'A pre-built starting point that comes with a curated set of modules and connections. Choosing a template is the fastest way to start. Modules can be added or removed at any later point.',
  },
  consensus: {
    term: 'Consensus Profile',
    definition:
      'The Dynamic Consensus Framework is how a Cerulea network agrees on new transactions and blocks. The profile sets its parts: the Commit Engine thresholds, the Authoring Engine committee and the Admission Engine rules.',
    example:
      'A private chain runs a small named committee with fast finality. A public network runs a wider committee weighted by Trust Score.',
  },
  region: {
    term: 'Deployment Region',
    definition:
      'The geographic area where the Blockchain nodes will be hosted. The region closest to the people who use the application gives the lowest latency.',
  },
  nativeToken: {
    term: 'Native Unit',
    definition:
      'The unit of account inside the network, used by the Economics step to meter transactions and to keep the ledger consistent. The people who use a Cerulea application meet no gas, no wallet and no fee. Validators settle in fiat through the subscription.',
    example: 'A supply chain network may name its unit "CREDIT" for internal metering alone.',
  },

  // ── Step 1 Blueprint Builder ────────────────────────────────────────────
  module: {
    term: 'Module',
    definition:
      'A self-contained building block that adds one feature to the application, such as wallets, tokens, governance voting, or payments.',
    example: 'The "ERC-20" module adds a fungible token. The "RBAC" module adds role-based access control.',
  },
  blueprint: {
    term: 'Blueprint',
    definition:
      'The single typed document that carries everything a project builds. The visual map of modules and their connections edits it, the chain interprets it and deployment installs it.',
  },
  edge: {
    term: 'Connection (Edge)',
    definition:
      'A line between two modules showing how they interact. The type of interaction is named on the line (for example READS, WRITES, TRIGGERS).',
  },

  // ── Step 2 Data & Logic ─────────────────────────────────────────────────
  entity: {
    term: 'Entity',
    definition:
      'A data model representing one core object in the application, like a User, a Token, or a Transaction. Think of it as a database table.',
    example: 'A "User" entity might have fields: id, email, wallet_address, role.',
  },
  field: {
    term: 'Field',
    definition:
      'A single piece of data stored on an entity. Every field has a name, a type (text, number, etc.), and a storage location (database or Blockchain).',
    example: 'The "email" field on a User entity is of type "string" and stored in the database.',
  },
  storageOnChain: {
    term: 'On-Chain Storage',
    definition:
      'Data stored permanently on the Blockchain. It is public and immutable, so it stays as written. Use it for data that must be auditable.',
    example: 'Token balances, ownership records, governance votes.',
  },
  storageDatabase: {
    term: 'Database Storage',
    definition:
      'Data stored in a regular (off-chain) database. It is fast, cheap, and private. Use it for most application data.',
    example: 'User profiles, email addresses, session tokens.',
  },
  storageIPFS: {
    term: 'IPFS Storage',
    definition:
      'Data stored on IPFS, a decentralised file system. Good for large files like NFT metadata, images, or documents that stay off the chain and must remain permanently reachable.',
  },
  relationship: {
    term: 'Relationship',
    definition:
      'A link between two entities. For example, a "User" has many "Orders". Relationships define the structure of the data.',
  },
  accessControl: {
    term: 'Access Control Rule',
    definition: 'A rule that defines who can read or write a piece of data. For example: "Only admins can delete users".',
  },
  logicFlow: {
    term: 'Logic Flow',
    definition:
      'A visual representation of business logic, like "when a user places an order, notify the seller". It shows what happens step by step when an event occurs.',
  },

  // ── Step 3 Economics ────────────────────────────────────────────────────
  gasPolicy: {
    term: 'Metering Policy',
    definition:
      'Rules for how the network meters each transaction class and holds back spam. The people who use the application pay no fee. Validators settle through the subscription.',
  },
  staking: {
    term: 'Staking',
    definition:
      'In a Dapp, users lock up (stake) tokens to take part in a programme or in governance and earn rewards in return. Unstaking has a time delay (unbonding period). Validators on a Cerulea network hold no stake. Their standing is the Trust Score.',
  },
  slashing: {
    term: 'Penalty',
    definition:
      'A validator that misbehaves or goes offline loses Trust Score through the Standing Engine, and the Admission Engine removes a validator whose score falls under the floor. This keeps validators honest.',
  },
  quorum: {
    term: 'Quorum',
    definition:
      'The minimum percentage of votes required for a governance proposal to pass. For example: 10% quorum means at least 10% of all voters must take part.',
  },
  inflation: {
    term: 'Issuance Rate',
    definition:
      'In a Dapp with its own token, the rate at which new tokens are created and distributed as rewards. Higher issuance means more rewards and dilutes existing holders.',
  },

  // ── Step 4 Integrations ─────────────────────────────────────────────────
  webhook: {
    term: 'Webhook',
    definition:
      'An automated message sent from the application to an outside service when something happens. For example, send a Slack message when a new user registers.',
  },
  oracle: {
    term: 'Oracle',
    definition:
      'A service that brings real-world data onto the Blockchain. For example, a price oracle tells a smart contract the current price of ETH/USD.',
  },

  // ── Step 6 Deploy ───────────────────────────────────────────────────────
  deployment: {
    term: 'Deployment',
    definition:
      'The process of publishing the application to the Cerulea network. Deployment installs the Blueprint, provisions infrastructure, and makes the application live. Deployment is atomic: the system is either fully operational or absent.',
  },
  rpc: {
    term: 'RPC Endpoint',
    definition:
      'A URL that outside applications use to read the Blockchain and to submit actions through Cerulea APIs. Think of it as the public API of the network.',
  },
};

// Helper: look up a term and return its definition
export function glossaryLookup(key: string): string {
  return GLOSSARY[key]?.definition ?? '';
}

// Helper: get tooltip title (term + definition)
export function glossaryTooltip(key: string): string {
  const entry = GLOSSARY[key];
  if (!entry) return '';
  return `${entry.term}: ${entry.definition}`;
}
