// apps/frontend/src/components/studio/steps/step4-catalogue.test.ts
// The provider catalogue and the rules of the Integrations step, read without a screen.

import { describe, expect, it } from 'vitest';

import { readBlueprintDocument } from '@/lib/blueprint/document';
import {
  CATALOGUE,
  CATEGORIES,
  KINDS,
  KIND_ORDER,
  applyIntegrationsToBlueprint,
  emptyConfig,
  entryId,
  providerById,
  providersIn,
  readIntegrationsDocument,
  settingFaults,
  unavailableProviders,
  withoutSecrets,
} from './step4-catalogue';

function blueprint() {
  return readBlueprintDocument(
    {
      name: 'Export registry',
      types: [
        { id: 'inspection_result', kind: 'Record', fields: [], description: '' },
        { id: 'grade', kind: 'Enumeration', variants: ['a', 'b'], description: '' },
      ],
      collections: [
        {
          id: 'shipment',
          record_type: 'inspection_result',
          primary_key: 'id',
          indexes: [],
          privacy: 'Open',
          retention: { period_days: 365, on_expiry: 'Delete' },
          purpose: { statement: 'Holds shipments.', lawful_basis: 'Contract' },
          description: '',
        },
      ],
      events: [{ id: 'shipment_released', name: 'Shipment released', payload_type: 'inspection_result', audit: true, description: '' }],
      integrations: {
        feeds: [{ id: 'feed_weather', name: 'Weather', provider: 'weather', payload_type: 'inspection_result', cadence_seconds: 60, attestation: 'Signature' }],
        bridges: [{ id: 'bridge_outcome_ethereum', target_network: 'ethereum', direction: 'Both', collection: 'shipment', confirmations: 12 }],
        triggers: [],
      },
    },
    'Export registry',
  );
}

describe('the provider catalogue', () => {
  it('lists the 45 production providers in the seven categories', () => {
    expect(CATALOGUE).toHaveLength(45);
    expect(CATEGORIES).toHaveLength(7);
    const total = CATEGORIES.reduce((sum, category) => sum + providersIn(category).length, 0);
    expect(total).toBe(45);
    expect(new Set(CATALOGUE.map((entry) => entry.id)).size).toBe(45);
  });

  it('maps every available provider to one of the eleven kinds', () => {
    expect(KIND_ORDER).toHaveLength(11);
    for (const entry of CATALOGUE) {
      if (entry.kind === null) {
        expect(entry.unavailable).toBeTruthy();
      } else {
        expect(KINDS[entry.kind]).toBeDefined();
      }
    }
  });

  it('lists the wallet, token and outside sign in providers as not available', () => {
    expect(unavailableProviders().map((entry) => entry.id).sort()).toEqual(
      ['arweave', 'auth0', 'clerk', 'coinbase', 'dynamic', 'firebase', 'privy', 'push', 'xmtp'].sort(),
    );
  });

  it('marks every key, token, secret and password as a secret', () => {
    for (const entry of CATALOGUE) {
      for (const field of entry.fields) {
        if (/secret|token|password|privatekey|jwt|writekey|apikey|authtoken|appsecret|apisecret|clientsecret|servicekey|keysecret|elkapikey|awssecretkey|grafanaapikey|integrationkey|apitoken|apptoken|bottoken|projecttoken/i.test(field.key)) {
          expect(field.secret, `${entry.id}.${field.key}`).toBe(true);
        }
      }
    }
    expect(providerById('stripe')?.fields.find((field) => field.key === 'publishableKey')?.secret).toBe(false);
  });

  it('checks a plain value against its rule', () => {
    const stripe = providerById('stripe')!;
    expect(settingFaults(stripe, { publishableKey: 'sk_live_1' })).toEqual({
      publishableKey: 'A publishable key begins with pk_',
    });
    expect(settingFaults(stripe, { publishableKey: 'pk_test_1' })).toEqual({});
    const slack = providerById('slack_webhook')!;
    expect(settingFaults(slack, { webhookUrl: 'https://example.com' })).toHaveProperty('webhookUrl');
  });
});

describe('the document', () => {
  it('reads a version two document back and drops a secret that found its way in', () => {
    const stripe = providerById('stripe')!;
    const held = {
      version: 2,
      configs: {
        stripe: {
          ...emptyConfig(stripe),
          enabled: true,
          environment: 'live',
          settings: { publishableKey: 'pk_live_1', secretKey: 'sk_live_1' },
          held: { test: [], live: ['secretKey'] },
        },
        unknown_provider: { enabled: true },
      },
    };
    const read = readIntegrationsDocument(held);
    expect(Object.keys(read.configs)).toEqual(['stripe']);
    expect(read.configs.stripe.environment).toBe('live');
    expect(read.configs.stripe.settings).toEqual({ publishableKey: 'pk_live_1' });
    expect(read.configs.stripe.held.live).toEqual(['secretKey']);
    expect(JSON.stringify(withoutSecrets(read))).not.toContain('sk_live_1');
  });

  it('reads a production draft with the environment in each key and leaves every secret behind', () => {
    const read = readIntegrationsDocument({
      configs: {
        sendgrid: {
          enabled: true,
          environment: 'prod',
          credentials: { prod_apiKey: 'SG.secret', prod_fromEmail: 'mail@example.com', dev_fromEmail: 'test@example.com' },
        },
        slack_webhook: true,
      },
    });
    expect(read.configs.sendgrid).toMatchObject({
      enabled: true,
      environment: 'live',
      kind: 'email',
      settings: { fromEmail: 'mail@example.com' },
    });
    expect(JSON.stringify(read)).not.toContain('SG.secret');
    expect(read.configs.slack_webhook.enabled).toBe(true);
  });
});

describe('writing the Blueprint', () => {
  it('writes a feed, a bridge and a trigger for enabled providers and keeps entries of other steps', () => {
    const document = readIntegrationsDocument({
      version: 2,
      configs: {
        chainlink: { ...emptyConfig(providerById('chainlink')!), enabled: true, blueprint: { payloadType: 'inspection_result', cadenceSeconds: 120 } },
        alchemy: { ...emptyConfig(providerById('alchemy')!), enabled: true, blueprint: { targetNetwork: 'polygon', collection: 'shipment', direction: 'Outbound' } },
        slack_webhook: {
          ...emptyConfig(providerById('slack_webhook')!),
          enabled: true,
          settings: { webhookUrl: 'https://hooks.slack.com/services/T/B/x' },
          blueprint: { event: 'shipment_released' },
        },
        stripe: { ...emptyConfig(providerById('stripe')!), enabled: true },
      },
    });
    const { blueprint: next, gaps } = applyIntegrationsToBlueprint(blueprint(), document);
    expect(gaps).toEqual([]);
    expect(next.integrations.feeds.map((entry) => entry.id)).toEqual(['feed_weather', entryId('chainlink')]);
    expect(next.integrations.feeds[1]).toEqual({
      id: 'integration_chainlink',
      name: 'Chainlink',
      provider: 'chainlink',
      payload_type: 'inspection_result',
      cadence_seconds: 120,
      attestation: 'Signature',
    });
    expect(next.integrations.bridges.map((entry) => entry.id)).toEqual(['bridge_outcome_ethereum', entryId('alchemy')]);
    expect(next.integrations.bridges[1]).toMatchObject({ target_network: 'polygon', direction: 'Outbound', collection: 'shipment', confirmations: 12 });
    expect(next.integrations.triggers).toEqual([
      { id: 'integration_slack_webhook', event: 'shipment_released', endpoint: 'https://hooks.slack.com/services/T/B/x', signing: 'Signature', retries: 5 },
    ]);
    // The other sections stay untouched.
    expect(next.collections).toEqual(blueprint().collections);
    expect(next.governance).toEqual(blueprint().governance);
  });

  it('reports a gap and writes nothing for an entry whose references are absent', () => {
    const document = readIntegrationsDocument({
      version: 2,
      configs: {
        pyth: { ...emptyConfig(providerById('pyth')!), enabled: true, blueprint: { payloadType: 'grade' } },
        custom_webhook: { ...emptyConfig(providerById('custom_webhook')!), enabled: true, settings: { url: 'http://plain.example' }, blueprint: { event: 'shipment_released' } },
        moralis: { ...emptyConfig(providerById('moralis')!), enabled: true },
      },
    });
    const { blueprint: next, gaps } = applyIntegrationsToBlueprint(blueprint(), document);
    expect(gaps.map((gap) => gap.providerId).sort()).toEqual(['custom_webhook', 'moralis', 'pyth']);
    expect(next.integrations.feeds).toHaveLength(1);
    expect(next.integrations.bridges).toHaveLength(1);
    expect(next.integrations.triggers).toHaveLength(0);
  });

  it('removes this step entries when a provider is disabled', () => {
    const held = blueprint();
    held.integrations.feeds.push({ id: entryId('chainlink'), name: 'Chainlink', provider: 'chainlink', payload_type: 'inspection_result', cadence_seconds: 60, attestation: 'Signature' });
    const document = readIntegrationsDocument({ version: 2, configs: { chainlink: { ...emptyConfig(providerById('chainlink')!), enabled: false } } });
    const { blueprint: next } = applyIntegrationsToBlueprint(held, document);
    expect(next.integrations.feeds.map((entry) => entry.id)).toEqual(['feed_weather']);
  });
});
