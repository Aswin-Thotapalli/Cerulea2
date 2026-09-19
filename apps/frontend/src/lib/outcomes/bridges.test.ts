import { describe, expect, it } from 'vitest';
import { SEED_MODULES } from '@/lib/catalogue/seed';

import { describeOutcomes } from './browse';
import {
  BRIDGE_MODULE_ID,
  BRIDGE_NETWORKS,
  BRIDGE_OUTCOMES,
  BRIDGE_RUNTIME_INDEX,
  BRIDGE_RUNTIME_INDEX_BY_MODULE_ID,
  BRIDGE_RUNTIME_MODULES,
  bridgeEndpointDeclaration,
  bridgeEndpointDeclarations,
  bridgeNetworkForOutcome,
  bridgeOutcomeId,
  isBlueprintName,
  isBridgeOutcome,
  modulesWithBridgeRuntime,
  outcomesWithBridges,
  resolveBridgeOutcome,
  resolveFromModulesWithBridges,
  type BridgeNetworkKey,
} from './bridges';
import { deriveOutcomes } from './catalogue';

const modules = SEED_MODULES;

/** The seven target networks the bridge module carries. */
const TARGET_KEYS: BridgeNetworkKey[] = [
  'ethereum-virtual-machine',
  'cosmos',
  'solana',
  'polkadot',
  'avalanche',
  'bitcoin',
  'rollup',
];

/** The modules a bridge choice installs, taken from the runtime. */
const CLOSURE = ['schema', 'state', 'identity', 'permission', 'audit', 'governance', 'logic'];

describe('one statement per target network', () => {
  it('carries a statement for each of the seven networks', () => {
    expect(BRIDGE_NETWORKS.map((network) => network.key)).toEqual(TARGET_KEYS);
    expect(BRIDGE_OUTCOMES).toHaveLength(7);
  });

  it('names each network in a sentence a person reads', () => {
    const statements = BRIDGE_OUTCOMES.map((outcome) => outcome.statement);
    expect(statements).toContain('Exchange records with a Cosmos network');
    expect(statements).toContain('Exchange records with a Solana network');
    expect(statements).toContain('Exchange records with a Polkadot network');
    expect(statements).toContain('Exchange records with an Avalanche network');
    expect(statements).toContain('Exchange records with the Bitcoin network');
    expect(statements).toContain('Exchange records with a Layer 2 rollup');
    expect(statements).toContain('Exchange records with an Ethereum Virtual Machine network');
  });

  it('gives every statement its own identifier', () => {
    const ids = BRIDGE_OUTCOMES.map((outcome) => outcome.outcomeId);
    expect(new Set(ids).size).toBe(7);
    for (const key of TARGET_KEYS) {
      expect(ids).toContain(bridgeOutcomeId(key));
      expect(isBridgeOutcome(bridgeOutcomeId(key))).toBe(true);
    }
    expect(isBridgeOutcome('outcome:rbac')).toBe(false);
    expect(bridgeNetworkForOutcome('outcome:rbac')).toBeNull();
  });

  it('places every statement in one area on the blockchain track', () => {
    for (const outcome of BRIDGE_OUTCOMES) {
      expect(outcome.group).toBe('Interop Bridges');
      expect(outcome.projectType).toBe('blockchain');
      expect(outcome.anchorModuleId).toBe(BRIDGE_MODULE_ID);
    }
  });
});

describe('each statement resolves to the bridge module', () => {
  it('installs the bridge module for every network', () => {
    for (const outcome of BRIDGE_OUTCOMES) {
      const resolution = resolveBridgeOutcome(outcome.outcomeId, modules);
      expect(resolution.installOrder).toContain(BRIDGE_MODULE_ID);
      const entry = resolution.modules.find((part) => part.moduleId === BRIDGE_MODULE_ID);
      expect(entry?.chosenDirectly).toBe(true);
      expect(entry?.causedBy).toEqual([outcome.statement]);
    }
  });

  it('installs the whole dependency closure of the bridge module', () => {
    const resolution = resolveBridgeOutcome(bridgeOutcomeId('cosmos'), modules);
    for (const moduleId of CLOSURE) {
      expect(resolution.installOrder).toContain(moduleId);
    }
    expect(resolution.installOrder).toHaveLength(CLOSURE.length + 1);
    expect(resolution.missing).toEqual([]);
  });

  it('places every dependency before the module that needs it', () => {
    const resolution = resolveBridgeOutcome(bridgeOutcomeId('bitcoin'), modules);
    const index = new Map(
      modulesWithBridgeRuntime(modules).map((part) => [part.moduleId, part] as const),
    );
    for (const moduleId of resolution.installOrder) {
      for (const dependency of index.get(moduleId)?.dependsOn ?? []) {
        expect(resolution.installOrder.indexOf(dependency)).toBeLessThan(
          resolution.installOrder.indexOf(moduleId),
        );
      }
    }
  });

  it('states the reason every support module joined', () => {
    const resolution = resolveBridgeOutcome(bridgeOutcomeId('polkadot'), modules);
    const audit = resolution.modules.find((part) => part.moduleId === 'audit');
    expect(audit?.reason).toBe('Every accepted message leaves an entry in the audit trail.');
    expect(audit?.chosenDirectly).toBe(false);
  });

  it('holds the runtime position of every module it installs', () => {
    expect(BRIDGE_RUNTIME_INDEX).toBe(21);
    expect(BRIDGE_RUNTIME_INDEX_BY_MODULE_ID[BRIDGE_MODULE_ID]).toBe(21);
    for (const part of BRIDGE_RUNTIME_MODULES) {
      expect(BRIDGE_RUNTIME_INDEX_BY_MODULE_ID[part.moduleId]).toBeGreaterThan(0);
    }
  });

  it('resolves a bridge statement beside a catalogue statement', () => {
    const wallet = deriveOutcomes(modules).find(
      (outcome) => outcome.anchorModuleId === 'wallet-auth',
    );
    const resolution = resolveFromModulesWithBridges(
      [wallet?.outcomeId as string, bridgeOutcomeId('solana')],
      modules,
    );
    expect(resolution.installOrder).toContain('wallet-auth');
    expect(resolution.installOrder).toContain(BRIDGE_MODULE_ID);
    expect(resolution.missing).toEqual([]);
  });

  it('adds the runtime modules once', () => {
    const once = modulesWithBridgeRuntime(modules);
    const twice = modulesWithBridgeRuntime(once);
    expect(twice).toHaveLength(once.length);
    expect(once).toHaveLength(modules.length + BRIDGE_RUNTIME_MODULES.length);
    expect(outcomesWithBridges(outcomesWithBridges(deriveOutcomes(modules)))).toHaveLength(
      modules.length + BRIDGE_OUTCOMES.length,
    );
  });
});

describe('the outcome listing carries the bridge statements', () => {
  const cards = describeOutcomes(modules);

  it('offers every bridge statement beside the catalogue statements', () => {
    for (const outcome of BRIDGE_OUTCOMES) {
      const card = cards.find((entry) => entry.outcome.outcomeId === outcome.outcomeId);
      expect(card).toBeDefined();
      expect(card?.missingParts).toEqual([]);
      expect(card?.bundle.map((part) => part.moduleId)).toContain(BRIDGE_MODULE_ID);
      expect(card?.bundle.filter((part) => part.anchor)).toHaveLength(1);
    }
  });

  it('leaves the catalogue statements as they were', () => {
    expect(cards).toHaveLength(modules.length + BRIDGE_OUTCOMES.length);
    const rbac = cards.find((card) => card.outcome.outcomeId === 'outcome:rbac');
    expect(rbac?.bundle.map((part) => part.moduleId)).toContain('wallet-auth');
  });
});

describe('the endpoint declaration a statement produces', () => {
  it('produces a valid declaration for every network', () => {
    for (const network of BRIDGE_NETWORKS) {
      const declaration = bridgeEndpointDeclaration(bridgeOutcomeId(network.key), 'shipment');
      expect(isBlueprintName(declaration.id)).toBe(true);
      expect(declaration.network).toBe(network.networkName);
      expect(declaration.direction).toBe('BothWays');
      expect(declaration.collection).toBe('shipment');
      expect(declaration.attestation.signers).toBe(1);
      expect(declaration.attestation.roles).toEqual(['bridge_signer']);
      expect(declaration.attestation.credentials).toEqual([]);
      expect(declaration.summary.endsWith('.')).toBe(true);
    }
  });

  it('gives two networks two declarations', () => {
    const cosmos = bridgeEndpointDeclaration(bridgeOutcomeId('cosmos'), 'shipment');
    const solana = bridgeEndpointDeclaration(bridgeOutcomeId('solana'), 'shipment');
    expect(cosmos).not.toEqual(solana);
    expect(cosmos.id).not.toBe(solana.id);
    expect(cosmos.network).not.toBe(solana.network);
    expect(cosmos.summary).not.toBe(solana.summary);
  });

  it('writes the sentence the direction calls for', () => {
    const key = bridgeOutcomeId('cosmos');
    expect(bridgeEndpointDeclaration(key, 'rate', { direction: 'Inbound' }).summary).toBe(
      'The endpoint brings rate records from the Cosmos network into this Blockchain.',
    );
    expect(bridgeEndpointDeclaration(key, 'rate', { direction: 'Outbound' }).summary).toBe(
      'The endpoint sends rate records from this Blockchain to the Cosmos network.',
    );
    expect(bridgeEndpointDeclaration(key, 'rate', { direction: 'BothWays' }).summary).toBe(
      'The endpoint moves rate records both ways between this Blockchain and the Cosmos network.',
    );
  });

  it('carries the roles and the credentials the caller names', () => {
    const declaration = bridgeEndpointDeclaration(bridgeOutcomeId('avalanche'), 'parcel', {
      signers: 2,
      roles: ['bridge_signer', 'port_officer'],
      credentials: ['signing_key'],
    });
    expect(declaration.attestation).toEqual({
      signers: 2,
      roles: ['bridge_signer', 'port_officer'],
      credentials: ['signing_key'],
    });
  });

  it('produces one declaration per chosen bridge statement', () => {
    const declarations = bridgeEndpointDeclarations(
      ['outcome:rbac', bridgeOutcomeId('bitcoin'), bridgeOutcomeId('rollup')],
      'parcel',
    );
    expect(declarations).toHaveLength(2);
    expect(declarations[0].network).toBe('Bitcoin network');
    expect(declarations[1].network).toBe('Layer 2 rollup');
    expect(declarations[0].id).not.toBe(declarations[1].id);
  });

  it('names the fix when the statement picks no network', () => {
    expect(() => bridgeEndpointDeclaration('outcome:rbac', 'parcel')).toThrow(
      /Choose one of these statements/,
    );
  });

  it('names the fix when the collection name suits no Blueprint', () => {
    expect(() => bridgeEndpointDeclaration(bridgeOutcomeId('cosmos'), 'Parcel Records')).toThrow(
      /lower case letters, digits and underscores/,
    );
  });

  it('names the fix when the endpoint asks for more signatures than roles', () => {
    expect(() =>
      bridgeEndpointDeclaration(bridgeOutcomeId('cosmos'), 'parcel', { signers: 3 }),
    ).toThrow(/Name at least 3 roles/);
  });

  it('names the fix when the endpoint asks for zero signatures', () => {
    expect(() =>
      bridgeEndpointDeclaration(bridgeOutcomeId('cosmos'), 'parcel', { signers: 0 }),
    ).toThrow(/Require at least one signature/);
  });

  it('names the fix when the endpoint name runs past the limit', () => {
    const long = 'a'.repeat(60);
    expect(() => bridgeEndpointDeclaration(bridgeOutcomeId('cosmos'), long)).toThrow(
      /Shorten the collection name/,
    );
  });
});

describe('the writing rules hold for every statement and every summary', () => {
  const written = [
    ...BRIDGE_OUTCOMES.map((outcome) => outcome.statement),
    ...BRIDGE_OUTCOMES.map((outcome) => outcome.contribution),
    ...BRIDGE_OUTCOMES.map((outcome) => outcome.removalConsequence),
    ...BRIDGE_NETWORKS.map(
      (network) => bridgeEndpointDeclaration(bridgeOutcomeId(network.key), 'parcel').summary,
    ),
    ...BRIDGE_RUNTIME_MODULES.map((part) => part.blurb as string),
    ...BRIDGE_RUNTIME_MODULES.flatMap((part) => part.longDescription ?? []),
  ];

  it('holds no em dash', () => {
    for (const text of written) expect(text).not.toContain('—');
  });

  it('capitalises the word Blockchain every time it appears', () => {
    for (const text of written) expect(text).not.toMatch(/blockchain/);
  });

  it('holds no settings vocabulary and no retired branding', () => {
    for (const text of written) {
      expect(text).not.toMatch(/\bconfigur/i);
      expect(text).not.toMatch(/\bsdk\b/i);
      expect(text).not.toMatch(/\bcli\b/i);
    }
  });

  it('writes an X, not Y construction nowhere', () => {
    for (const text of written) expect(text).not.toMatch(/,\s*not\s/i);
  });

  it('keeps every sentence short', () => {
    for (const text of written) {
      for (const sentence of text.split(/(?<=\.)\s+/)) {
        const words = sentence.trim().split(/\s+/).filter(Boolean);
        expect(words.length).toBeLessThanOrEqual(30);
      }
    }
  });

  it('leaves a statement without a trailing stop', () => {
    for (const outcome of BRIDGE_OUTCOMES) {
      expect(outcome.statement.endsWith('.')).toBe(false);
      expect(outcome.statement[0]).toBe(outcome.statement[0].toUpperCase());
    }
  });
});
