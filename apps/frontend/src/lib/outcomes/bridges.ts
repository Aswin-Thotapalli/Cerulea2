// apps/frontend/src/lib/outcomes/bridges.ts
// Bridge selection as an outcome.
//
// A person picks the network the deployment exchanges records with. Cerulea
// installs the bridge module and every module the bridge module needs. The
// same choice writes one endpoint declaration into the Integrations section of
// the Blueprint.
//
// Seven target networks exist. Each one commits to a message in its own way,
// so each one carries its own evidence and its own statement. A person reads
// the statement. Cerulea installs the modules and writes the declaration.
//
// Without these statements a person reaches a bridge by naming runtime modules
// by hand, and a missing support module fails on the first arriving message.

import type { CatalogueModule } from '@/lib/catalogue/types';
import { deriveOutcomes, groupLabel, type Outcome } from './catalogue';
import { resolveOutcomeSelection, type OutcomeResolution } from './resolve';

/** The module identifier of the bridge module. A person never reads this. */
export const BRIDGE_MODULE_ID = 'bridge';

/** The position the bridge module holds in the runtime. */
export const BRIDGE_RUNTIME_INDEX = 21;

/** The area every bridge statement sits under. */
export const BRIDGE_GROUP = groupLabel('interop-bridges');

/** The runtime position of every module a bridge choice installs. */
export const BRIDGE_RUNTIME_INDEX_BY_MODULE_ID: Readonly<Record<string, number>> = Object.freeze({
  schema: 11,
  state: 12,
  identity: 14,
  permission: 15,
  logic: 16,
  governance: 19,
  bridge: BRIDGE_RUNTIME_INDEX,
  audit: 25,
});

/**
 * The bridge module and every module it needs.
 *
 * The dependency lists follow the runtime. A bridge message reads a record
 * shape, writes a record, records an entry in the audit trail, obeys the
 * governance decision that opened the endpoint and runs an action. Those five
 * modules bring their own support with them.
 */
export const BRIDGE_RUNTIME_MODULES: readonly CatalogueModule[] = Object.freeze([
  {
    moduleId: 'schema',
    title: 'Record Shapes',
    projectType: 'blockchain',
    category: 'interop-bridges',
    tags: ['schema', 'records'],
    blurb: 'Holds the shape of every record a deployment keeps.',
    longDescription: [
      'Every record the Blockchain holds names a shape. The shape states the fields, the field types and the fields a record must carry.',
      'Every other runtime module reads a shape from here before it reads or writes a record.',
    ],
    dependsOn: [],
    recommends: [],
    reasonByDepId: {},
  },
  {
    moduleId: 'state',
    title: 'Record Storage',
    projectType: 'blockchain',
    category: 'interop-bridges',
    tags: ['records', 'storage'],
    blurb: 'Keeps the records a deployment holds and the proof of each one.',
    longDescription: [
      'Records live here. Each write leaves a commitment a reader verifies later.',
      'A bridge message that carries a record writes it through this module.',
    ],
    dependsOn: ['schema'],
    recommends: [],
    reasonByDepId: {
      schema: 'Record storage reads the shape of a record before it writes the record.',
    },
  },
  {
    moduleId: 'identity',
    title: 'Identity Register',
    projectType: 'blockchain',
    category: 'interop-bridges',
    tags: ['identity', 'roles'],
    blurb: 'Holds the people, the organisations and the roles a deployment recognises.',
    longDescription: [
      'Every party the Blockchain recognises is registered here with the roles that party holds.',
      'An endpoint names the role that attests to an arriving message. The role comes from this register.',
    ],
    dependsOn: ['schema'],
    recommends: [],
    reasonByDepId: {
      schema: 'The identity register keeps its entries in the shapes the record shapes module declares.',
    },
  },
  {
    moduleId: 'permission',
    title: 'Permission Register',
    projectType: 'blockchain',
    category: 'interop-bridges',
    tags: ['permission', 'access'],
    blurb: 'States which role reaches which record and which action.',
    longDescription: [
      'A permission joins a role to a record collection and to an action. The runtime checks the permission before the work runs.',
      'A bridge message runs an action, so the permission decides whether the message proceeds.',
    ],
    dependsOn: ['schema', 'identity'],
    recommends: [],
    reasonByDepId: {
      schema: 'A permission names the record collection it covers, and the collection comes from a declared shape.',
      identity: 'A permission names the role it grants, and the role comes from the identity register.',
    },
  },
  {
    moduleId: 'audit',
    title: 'Audit Trail',
    projectType: 'blockchain',
    category: 'interop-bridges',
    tags: ['audit', 'history'],
    blurb: 'Records every piece of work the Blockchain performs.',
    longDescription: [
      'Each piece of work leaves an entry stating what ran, who asked for it and what changed.',
      'An arriving bridge message leaves an entry here, so an operator reads the full history of one endpoint.',
    ],
    dependsOn: ['schema'],
    recommends: [],
    reasonByDepId: {
      schema: 'An audit entry names the records the work touched, and those records carry declared shapes.',
    },
  },
  {
    moduleId: 'governance',
    title: 'Governance Decisions',
    projectType: 'blockchain',
    category: 'interop-bridges',
    tags: ['governance', 'approval'],
    blurb: 'Holds the decisions the deployment takes together.',
    longDescription: [
      'A decision collects the signatures the deployment requires and records the outcome.',
      'Opening an endpoint is a decision. Closing one is a decision. Both pass through this module.',
    ],
    dependsOn: ['schema', 'identity', 'audit'],
    recommends: [],
    reasonByDepId: {
      schema: 'A decision names the records it changes, and those records carry declared shapes.',
      identity: 'A decision counts signatures from named roles, and the roles come from the identity register.',
      audit: 'Every decision leaves an entry in the audit trail.',
    },
  },
  {
    moduleId: 'logic',
    title: 'Action Logic',
    projectType: 'blockchain',
    category: 'interop-bridges',
    tags: ['logic', 'actions'],
    blurb: 'Runs the actions a deployment declares.',
    longDescription: [
      'An action reads records, applies the rules the Blueprint states and writes the result.',
      'An arriving bridge message names the action it runs, so this module performs the work the message asks for.',
    ],
    dependsOn: ['schema', 'identity', 'state', 'permission'],
    recommends: [],
    reasonByDepId: {
      schema: 'An action binds its parameters to declared record shapes.',
      identity: 'An action runs on behalf of a registered party.',
      state: 'An action reads and writes records through record storage.',
      permission: 'An action runs once the permission register allows the caller to run it.',
    },
  },
  {
    moduleId: BRIDGE_MODULE_ID,
    title: 'Network Bridge',
    projectType: 'blockchain',
    category: 'interop-bridges',
    tags: ['bridge', 'interop', 'messages'],
    blurb: 'Exchanges records with a named outside network.',
    longDescription: [
      'An endpoint joins this deployment to one outside network. A message travels through the endpoint beside the evidence that network produces.',
      'The module checks the evidence, declines a repeat of a message it already accepted and runs the action the message names.',
    ],
    dependsOn: ['schema', 'state', 'audit', 'governance', 'logic'],
    recommends: [],
    reasonByDepId: {
      schema: 'An endpoint names the record shapes a message carries.',
      state: 'An accepted message writes its records through record storage.',
      audit: 'Every accepted message leaves an entry in the audit trail.',
      governance: 'Opening an endpoint takes a governance decision.',
      logic: 'An arriving message runs a declared action.',
    },
  },
] as CatalogueModule[]);

/** The target networks a bridge reaches, in the order the runtime declares them. */
export type BridgeNetworkKey =
  | 'ethereum-virtual-machine'
  | 'cosmos'
  | 'solana'
  | 'polkadot'
  | 'avalanche'
  | 'bitcoin'
  | 'rollup';

export type BridgeNetwork = {
  /** The key of the network. A person never reads this value. */
  key: BridgeNetworkKey;
  /** The name the endpoint declaration carries for the network. */
  networkName: string;
  /** The stem the endpoint name is built from. */
  endpointStem: string;
  /** The plain sentence a person selects. */
  statement: string;
  /** One paragraph stating what this choice contributes. */
  contribution: string;
  /** One sentence stating what an accepted message rests on. */
  trust: string;
  /** The words a search answers this statement with. */
  tags: string[];
};

/** The seven target networks the bridge module carries. */
export const BRIDGE_NETWORKS: readonly BridgeNetwork[] = Object.freeze([
  {
    key: 'ethereum-virtual-machine',
    networkName: 'Ethereum Virtual Machine network',
    endpointStem: 'ethereum_virtual_machine',
    statement: 'Exchange records with an Ethereum Virtual Machine network',
    contribution:
      'The deployment reads records that a contract on an Ethereum Virtual Machine network wrote. The deployment also sends records the other way. The endpoint walks the merkle structure of that network down to the block header it already trusts.',
    trust: 'A threshold of registered relayers signed the far network header.',
    tags: ['bridge', 'interop', 'ethereum', 'contract'],
  },
  {
    key: 'cosmos',
    networkName: 'Cosmos network',
    endpointStem: 'cosmos',
    statement: 'Exchange records with a Cosmos network',
    contribution:
      'The deployment reads records a Cosmos network committed to its application hash. The deployment also sends records the other way. The endpoint holds the validator set of that network and checks the signed commit over each block it accepts.',
    trust: 'A share of the far validator set signed the block the message sits in.',
    tags: ['bridge', 'interop', 'cosmos'],
  },
  {
    key: 'solana',
    networkName: 'Solana network',
    endpointStem: 'solana',
    statement: 'Exchange records with a Solana network',
    contribution:
      'The deployment reads account records a Solana network committed to its bank hash. The deployment also sends records the other way. The endpoint holds the relayer set that attests to each slot header it accepts.',
    trust: 'A threshold of registered relayers signed the far network header.',
    tags: ['bridge', 'interop', 'solana', 'account'],
  },
  {
    key: 'polkadot',
    networkName: 'Polkadot network',
    endpointStem: 'polkadot',
    statement: 'Exchange records with a Polkadot network',
    contribution:
      'The deployment reads records a Polkadot network committed to its state trie. The deployment also sends records the other way. The endpoint holds the authority set of that network and checks the finality evidence over each block it accepts.',
    trust: 'A share of the far validator set signed the block the message sits in.',
    tags: ['bridge', 'interop', 'polkadot'],
  },
  {
    key: 'avalanche',
    networkName: 'Avalanche network',
    endpointStem: 'avalanche',
    statement: 'Exchange records with an Avalanche network',
    contribution:
      'The deployment reads records an Avalanche validator set signed. The deployment also sends records the other way. The endpoint weighs the signatures over the message itself, so a message arrives as soon as the weight reaches the threshold.',
    trust: 'A share of the far validator set signed the block the message sits in.',
    tags: ['bridge', 'interop', 'avalanche'],
  },
  {
    key: 'bitcoin',
    networkName: 'Bitcoin network',
    endpointStem: 'bitcoin',
    statement: 'Exchange records with the Bitcoin network',
    contribution:
      'The deployment reads transaction records the Bitcoin network buried under accumulated work. The deployment also sends records the other way. The endpoint follows the header chain and counts the confirmations above the block the message sits in.',
    trust: 'The far header chain carries the work the endpoint requires.',
    tags: ['bridge', 'interop', 'bitcoin', 'transaction'],
  },
  {
    key: 'rollup',
    networkName: 'Layer 2 rollup',
    endpointStem: 'rollup',
    statement: 'Exchange records with a Layer 2 rollup',
    contribution:
      'The deployment reads records a Layer 2 rollup settled on its settlement layer. The deployment also sends records the other way. The endpoint waits for the challenge window of the settled commitment to pass before it accepts the message.',
    trust: 'The settlement layer commitment passed its challenge window.',
    tags: ['bridge', 'interop', 'rollup', 'layer 2'],
  },
] as BridgeNetwork[]);

/** The identifier of the statement that picks one network. */
export function bridgeOutcomeId(key: BridgeNetworkKey): string {
  return `outcome:${BRIDGE_MODULE_ID}-${key}`;
}

function bridgeOutcome(network: BridgeNetwork): Outcome {
  return {
    outcomeId: bridgeOutcomeId(network.key),
    statement: network.statement,
    anchorModuleId: BRIDGE_MODULE_ID,
    group: BRIDGE_GROUP,
    projectType: 'blockchain',
    contribution: `${network.contribution} ${network.trust}`,
    tags: network.tags,
    removalConsequence: `Removing this closes the endpoint to the ${network.networkName}. Records already carried across stay where they are.`,
  };
}

/** One statement per target network, in the order the runtime declares them. */
export const BRIDGE_OUTCOMES: readonly Outcome[] = Object.freeze(
  BRIDGE_NETWORKS.map((network) => bridgeOutcome(network)),
);

/** The network behind one bridge statement. */
export function bridgeNetworkForOutcome(outcomeId: string): BridgeNetwork | null {
  return BRIDGE_NETWORKS.find((network) => bridgeOutcomeId(network.key) === outcomeId) ?? null;
}

/** Reports whether a statement is one of the bridge statements. */
export function isBridgeOutcome(outcomeId: string): boolean {
  return bridgeNetworkForOutcome(outcomeId) !== null;
}

/** The module catalogue with the bridge module and its support added once. */
export function modulesWithBridgeRuntime(modules: CatalogueModule[]): CatalogueModule[] {
  const held = new Set(modules.map((part) => part.moduleId));
  const added = BRIDGE_RUNTIME_MODULES.filter((part) => held.has(part.moduleId) === false);
  return added.length === 0 ? modules : [...modules, ...added];
}

/** The outcome catalogue with the bridge statements added. */
export function outcomesWithBridges(outcomes: Outcome[]): Outcome[] {
  const held = new Set(outcomes.map((outcome) => outcome.outcomeId));
  const added = BRIDGE_OUTCOMES.filter((outcome) => held.has(outcome.outcomeId) === false);
  return added.length === 0 ? outcomes : [...outcomes, ...added];
}

/**
 * Resolves one bridge statement into the modules Cerulea installs.
 * The answer carries the bridge module and its full dependency closure, in an
 * order that is safe to follow.
 */
export function resolveBridgeOutcome(
  outcomeId: string,
  modules: CatalogueModule[],
): OutcomeResolution {
  return resolveOutcomeSelection(
    [outcomeId],
    BRIDGE_OUTCOMES.slice(),
    modulesWithBridgeRuntime(modules),
  );
}

/**
 * Resolves a whole chosen set, bridge statements included.
 * The catalogue statements and the bridge statements resolve together, so one
 * install order covers the whole choice.
 */
export function resolveFromModulesWithBridges(
  outcomeIds: string[],
  modules: CatalogueModule[],
): OutcomeResolution {
  return resolveOutcomeSelection(
    outcomeIds,
    outcomesWithBridges(deriveOutcomes(modules)),
    modulesWithBridgeRuntime(modules),
  );
}

/** The direction records move through one endpoint. */
export type BridgeDirection = 'Inbound' | 'Outbound' | 'BothWays';

/** The signatures an endpoint presents before the Blockchain accepts its work. */
export type AttestationRequirement = {
  /** The count of signatures the Blockchain requires. */
  signers: number;
  /** The roles that sign. */
  roles: string[];
  /** The credentials a signer holds. */
  credentials: string[];
};

/** One endpoint declaration of the Blueprint Integrations section. */
export type BridgeEndpointDeclaration = {
  /** The name of the endpoint. */
  id: string;
  /** The name the operator gave the network on the other side. */
  network: string;
  /** The direction records move. */
  direction: BridgeDirection;
  /** The collection the endpoint reads and writes. */
  collection: string;
  /** The attestation the endpoint presents. */
  attestation: AttestationRequirement;
  /** One plain sentence stating what the endpoint moves. */
  summary: string;
};

/** The role that signs for an endpoint when the caller names none. */
export const DEFAULT_BRIDGE_ROLE = 'bridge_signer';

export type BridgeEndpointOptions = {
  /** The direction records move. Records move both ways when the caller names none. */
  direction?: BridgeDirection;
  /** The count of signatures the endpoint presents. One signature is the default. */
  signers?: number;
  /** The roles that sign for the endpoint. */
  roles?: string[];
  /** The credentials a signer holds. */
  credentials?: string[];
};

/**
 * A Blueprint name holds lower case letters, digits and underscores.
 * The first character is a lower case letter. The length stays at 64 or below.
 */
export function isBlueprintName(text: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(text) && text.length <= 64;
}

function summaryFor(
  direction: BridgeDirection,
  collection: string,
  networkName: string,
): string {
  if (direction === 'Inbound') {
    return `The endpoint brings ${collection} records from the ${networkName} into this Blockchain.`;
  }
  if (direction === 'Outbound') {
    return `The endpoint sends ${collection} records from this Blockchain to the ${networkName}.`;
  }
  return `The endpoint moves ${collection} records both ways between this Blockchain and the ${networkName}.`;
}

/**
 * Turns one chosen bridge statement and one collection name into the endpoint
 * declaration the Blueprint Integrations section carries.
 * Two networks produce two declarations, since the name, the network and the
 * sentence each follow the network the statement picked.
 */
export function bridgeEndpointDeclaration(
  outcomeId: string,
  collection: string,
  options: BridgeEndpointOptions = {},
): BridgeEndpointDeclaration {
  const network = bridgeNetworkForOutcome(outcomeId);
  if (network === null) {
    const listed = BRIDGE_NETWORKS.map((entry) => entry.statement).join('. ');
    throw new Error(
      `Cerulea found no target network behind the statement that was chosen. Choose one of these statements: ${listed}.`,
    );
  }
  if (!isBlueprintName(collection)) {
    throw new Error(
      `The collection name \`${collection}\` suits no Blueprint. Write the collection name with lower case letters, digits and underscores, start it with a letter and keep it at 64 characters or fewer.`,
    );
  }

  const direction: BridgeDirection = options.direction ?? 'BothWays';
  const roles = options.roles && options.roles.length > 0 ? options.roles : [DEFAULT_BRIDGE_ROLE];
  const signers = options.signers ?? 1;
  if (signers < 1) {
    throw new Error(
      'The endpoint asks for zero signatures. Require at least one signature on the endpoint.',
    );
  }
  if (signers > roles.length) {
    throw new Error(
      `The endpoint asks for ${signers} signatures from ${roles.length} roles. Name at least ${signers} roles that sign for the endpoint.`,
    );
  }
  for (const role of roles) {
    if (!isBlueprintName(role)) {
      throw new Error(
        `The role name \`${role}\` suits no Blueprint. Write the role name with lower case letters, digits and underscores, start it with a letter and keep it at 64 characters or fewer.`,
      );
    }
  }

  const id = `${network.endpointStem}_${collection}_endpoint`;
  if (!isBlueprintName(id)) {
    throw new Error(
      `The endpoint name \`${id}\` runs past 64 characters. Shorten the collection name so the endpoint name stays at 64 characters or fewer.`,
    );
  }

  return {
    id,
    network: network.networkName,
    direction,
    collection,
    attestation: {
      signers,
      roles: [...roles],
      credentials: [...(options.credentials ?? [])],
    },
    summary: summaryFor(direction, collection, network.networkName),
  };
}

/**
 * The endpoint declarations for a whole chosen set.
 * The set keeps the order the statements were chosen in, and a statement that
 * names no bridge is passed over.
 */
export function bridgeEndpointDeclarations(
  outcomeIds: string[],
  collection: string,
  options: BridgeEndpointOptions = {},
): BridgeEndpointDeclaration[] {
  return outcomeIds
    .filter((outcomeId) => isBridgeOutcome(outcomeId))
    .map((outcomeId) => bridgeEndpointDeclaration(outcomeId, collection, options));
}
