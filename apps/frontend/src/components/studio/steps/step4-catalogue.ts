// apps/frontend/src/components/studio/steps/step4-catalogue.ts
// The provider catalogue of the Integrations step and the rules behind it.
// Production listed 45 providers in seven categories. Each one now maps to a
// Cerulea integration kind, served by Cerulea APIs through a live driver and
// a local driver behind one interface, or to the chain oracle module, or to
// Cerulea APIs key custody. A provider centred on a wallet, a token or an
// outside sign in has no Cerulea kind and is listed as not available in this
// release.
// Secret values go to Cerulea APIs key custody and never into the draft.
// Plain values stay in the draft. The Blueprint Integrations section takes
// an oracle feed, a bridge endpoint or an external trigger per provider where
// the kind calls for one.
// Without this module each screen would keep its own copy of the mapping.

import type { Blueprint, Integrations } from '@/lib/blueprint/types';

/* ------------------------------------------------------------------ */
/* Kinds                                                               */
/* ------------------------------------------------------------------ */

export type IntegrationKind =
  | 'payments'
  | 'email'
  | 'certificates'
  | 'domains'
  | 'objects'
  | 'delivery'
  | 'bridge'
  | 'notifications'
  | 'queue'
  | 'key_custody'
  | 'oracle';

/** Where Cerulea serves one kind. */
export type KindService = 'apis_driver' | 'key_custody' | 'chain_module';

export const KINDS: Record<
  IntegrationKind,
  { title: string; serves: string; service: KindService; health: string | null }
> = {
  payments: {
    title: 'payments',
    serves: 'Charges, subscriptions and invoices in fiat.',
    service: 'apis_driver',
    health: 'payments',
  },
  email: {
    title: 'email',
    serves: 'Mail the deployment sends to people.',
    service: 'apis_driver',
    health: 'email',
  },
  certificates: {
    title: 'certificates',
    serves: 'Transport certificates for every address the deployment answers on.',
    service: 'apis_driver',
    health: 'certificates',
  },
  domains: {
    title: 'domains',
    serves: 'The names the deployment answers on.',
    service: 'apis_driver',
    health: 'domains',
  },
  objects: {
    title: 'objects',
    serves: 'Files and attachments held outside the chain with a commitment on it.',
    service: 'apis_driver',
    health: 'objects',
  },
  delivery: {
    title: 'delivery',
    serves: 'The generated application and its assets, served near the people who open them.',
    service: 'apis_driver',
    health: 'delivery',
  },
  bridge: {
    title: 'bridge',
    serves: 'Messages to and from an outside network, each with a verified proof.',
    service: 'apis_driver',
    health: 'bridge',
  },
  notifications: {
    title: 'notifications',
    serves: 'Alerts and event deliveries to people and to outside endpoints.',
    service: 'apis_driver',
    health: 'notifications',
  },
  queue: {
    title: 'queue',
    serves: 'Durable background jobs with retries.',
    service: 'apis_driver',
    health: 'queue',
  },
  key_custody: {
    title: 'key custody',
    serves: 'Signing keys sealed at rest and never read in the clear outside Cerulea APIs.',
    service: 'key_custody',
    health: null,
  },
  oracle: {
    title: 'oracle',
    serves: 'Outside data brought onto the chain with an attestation and a dispute window.',
    service: 'chain_module',
    health: null,
  },
};

export const KIND_ORDER: IntegrationKind[] = [
  'payments',
  'email',
  'certificates',
  'domains',
  'objects',
  'delivery',
  'bridge',
  'notifications',
  'queue',
  'key_custody',
  'oracle',
];

/* ------------------------------------------------------------------ */
/* Providers                                                           */
/* ------------------------------------------------------------------ */

export type IntegrationCategory =
  | 'Payments'
  | 'Auth'
  | 'Communication'
  | 'Storage'
  | 'Data'
  | 'Analytics'
  | 'Webhooks';

export const CATEGORIES: IntegrationCategory[] = [
  'Payments',
  'Auth',
  'Communication',
  'Storage',
  'Data',
  'Analytics',
  'Webhooks',
];

export type CredentialField = {
  key: string;
  label: string;
  /** A secret goes to Cerulea APIs key custody and never into the draft. */
  secret: boolean;
  placeholder?: string;
  hint?: string;
  validate?: (value: string) => string | null;
};

/** What the Blueprint Integrations section takes from one provider. */
export type BlueprintPart =
  | { kind: 'feed'; cadenceSeconds: number }
  | { kind: 'bridge' }
  | { kind: 'trigger'; endpointField: string };

export type ProviderDef = {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  docsUrl?: string;
  /** The Cerulea kind, or null where this release offers none. */
  kind: IntegrationKind | null;
  /** The reason a provider has no kind in this release. */
  unavailable?: string;
  blueprint?: BlueprintPart;
  fields: CredentialField[];
};

const startsWith = (prefix: string, label: string) => (value: string) =>
  value.startsWith(prefix) ? null : `${label} begins with ${prefix}`;

const https = (value: string) =>
  value.startsWith('https://') ? null : 'The address begins with https://';

const WALLET =
  'This provider centres on a wallet or a token. Cerulea runs with no token and an end user meets no wallet, so it has no Cerulea kind in this release.';
const SIGN_IN =
  'Cerulea holds its own accounts with a second factor. An outside sign in provider has no Cerulea kind in this release.';

export const CATALOGUE: ProviderDef[] = [
  // Payments
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'Payments',
    description: 'Card payments and subscriptions in fiat.',
    docsUrl: 'https://stripe.com/docs',
    kind: 'payments',
    fields: [
      { key: 'publishableKey', label: 'Publishable key', secret: false, placeholder: 'pk_test_...', validate: startsWith('pk_', 'A publishable key') },
      { key: 'secretKey', label: 'Secret key', secret: true, placeholder: 'sk_test_...', validate: startsWith('sk_', 'A secret key') },
      { key: 'webhookSecret', label: 'Webhook secret', secret: true, placeholder: 'whsec_...' },
    ],
  },
  {
    id: 'paypal',
    name: 'PayPal',
    category: 'Payments',
    description: 'PayPal and pay later options in fiat.',
    kind: 'payments',
    fields: [
      { key: 'clientId', label: 'Client identifier', secret: false },
      { key: 'clientSecret', label: 'Client secret', secret: true },
      { key: 'webhookId', label: 'Webhook identifier', secret: false },
    ],
  },
  {
    id: 'coinbase',
    name: 'Coinbase Commerce',
    category: 'Payments',
    description: 'Payments in cryptocurrency to a wallet.',
    kind: null,
    unavailable: WALLET,
    fields: [
      { key: 'apiKey', label: 'Key', secret: true },
      { key: 'webhookSecret', label: 'Webhook shared secret', secret: true },
    ],
  },
  {
    id: 'lemonsqueezy',
    name: 'Lemon Squeezy',
    category: 'Payments',
    description: 'Merchant of record for subscription tax handling.',
    kind: 'payments',
    fields: [
      { key: 'apiKey', label: 'Key', secret: true },
      { key: 'storeId', label: 'Store identifier', secret: false },
      { key: 'webhookSecret', label: 'Signing secret', secret: true },
    ],
  },
  {
    id: 'razorpay',
    name: 'Razorpay',
    category: 'Payments',
    description: 'Payment gateway for India.',
    kind: 'payments',
    fields: [
      { key: 'keyId', label: 'Key identifier', secret: false, placeholder: 'rzp_test_...' },
      { key: 'keySecret', label: 'Key secret', secret: true },
    ],
  },

  // Auth
  {
    id: 'clerk',
    name: 'Clerk',
    category: 'Auth',
    description: 'Hosted user management and sign in.',
    kind: null,
    unavailable: SIGN_IN,
    fields: [
      { key: 'publishableKey', label: 'Publishable key', secret: false, placeholder: 'pk_...' },
      { key: 'secretKey', label: 'Secret key', secret: true, placeholder: 'sk_...' },
    ],
  },
  {
    id: 'privy',
    name: 'Privy',
    category: 'Auth',
    description: 'Embedded wallets for sign in.',
    docsUrl: 'https://docs.privy.io',
    kind: null,
    unavailable: WALLET,
    fields: [
      { key: 'appId', label: 'Application identifier', secret: false },
      { key: 'appSecret', label: 'Application secret', secret: true },
      { key: 'verificationKey', label: 'Verification key', secret: false, hint: 'The public key that verifies a token.' },
    ],
  },
  {
    id: 'dynamic',
    name: 'Dynamic',
    category: 'Auth',
    description: 'Wallet based sign in across networks.',
    kind: null,
    unavailable: WALLET,
    fields: [
      { key: 'environmentId', label: 'Environment identifier', secret: false },
      { key: 'apiSecret', label: 'Secret', secret: true },
    ],
  },
  {
    id: 'auth0',
    name: 'Auth0',
    category: 'Auth',
    description: 'Hosted identity management.',
    kind: null,
    unavailable: SIGN_IN,
    fields: [
      { key: 'domain', label: 'Domain', secret: false, placeholder: 'tenant.auth0.com' },
      { key: 'clientId', label: 'Client identifier', secret: false },
      { key: 'clientSecret', label: 'Client secret', secret: true },
    ],
  },
  {
    id: 'firebase',
    name: 'Firebase Auth',
    category: 'Auth',
    description: 'Hosted sign in for applications.',
    kind: null,
    unavailable: SIGN_IN,
    fields: [
      { key: 'apiKey', label: 'Key', secret: true },
      { key: 'authDomain', label: 'Sign in domain', secret: false },
      { key: 'projectId', label: 'Project identifier', secret: false },
    ],
  },
  {
    id: 'sumsub',
    name: 'Sumsub',
    category: 'Auth',
    description: 'Identity verification. The result arrives as an attested record.',
    docsUrl: 'https://developers.sumsub.com',
    kind: 'oracle',
    blueprint: { kind: 'feed', cadenceSeconds: 300 },
    fields: [
      { key: 'appToken', label: 'Application token', secret: true, placeholder: 'sbx:...' },
      { key: 'secretKey', label: 'Secret key', secret: true },
      { key: 'baseUrl', label: 'Service address', secret: false, placeholder: 'https://api.sumsub.com', validate: https },
    ],
  },
  {
    id: 'chainalysis',
    name: 'Chainalysis',
    category: 'Auth',
    description: 'Sanctions screening of a counterparty. The result arrives as an attested record.',
    docsUrl: 'https://docs.chainalysis.com',
    kind: 'oracle',
    blueprint: { kind: 'feed', cadenceSeconds: 3600 },
    fields: [
      { key: 'apiKey', label: 'Key', secret: true },
      { key: 'endpoint', label: 'Service address', secret: false, placeholder: 'https://api.chainalysis.com/api/kyt/v2', validate: https },
    ],
  },
  {
    id: 'docusign',
    name: 'DocuSign',
    category: 'Auth',
    description: 'Electronic signature for a person who signs on paper. The signed envelope arrives as an attested record.',
    docsUrl: 'https://developers.docusign.com',
    kind: 'oracle',
    blueprint: { kind: 'feed', cadenceSeconds: 600 },
    fields: [
      { key: 'integrationKey', label: 'Integration key', secret: false },
      { key: 'userId', label: 'User identifier', secret: false },
      { key: 'accountId', label: 'Account identifier', secret: false },
      { key: 'privateKey', label: 'Private key', secret: true, hint: 'Signs the access tokens the service asks for.' },
    ],
  },

  // Communication
  {
    id: 'sendgrid',
    name: 'SendGrid',
    category: 'Communication',
    description: 'Transactional mail delivery.',
    kind: 'email',
    fields: [
      { key: 'apiKey', label: 'Key', secret: true, placeholder: 'SG....', validate: startsWith('SG.', 'A SendGrid key') },
      { key: 'fromEmail', label: 'Sender address', secret: false },
    ],
  },
  {
    id: 'resend',
    name: 'Resend',
    category: 'Communication',
    description: 'Mail delivery through one interface.',
    kind: 'email',
    fields: [
      { key: 'apiKey', label: 'Key', secret: true, placeholder: 're_...' },
      { key: 'domain', label: 'Sending domain', secret: false },
    ],
  },
  {
    id: 'twilio',
    name: 'Twilio',
    category: 'Communication',
    description: 'Text messages, WhatsApp and voice.',
    kind: 'notifications',
    fields: [
      { key: 'accountSid', label: 'Account identifier', secret: false, placeholder: 'AC...' },
      { key: 'authToken', label: 'Token', secret: true },
      { key: 'messagingServiceSid', label: 'Messaging service identifier', secret: false, placeholder: 'MG...' },
    ],
  },
  {
    id: 'xmtp',
    name: 'XMTP',
    category: 'Communication',
    description: 'Wallet to wallet messaging.',
    kind: null,
    unavailable: WALLET,
    fields: [
      { key: 'privateKey', label: 'Client private key', secret: true },
      { key: 'env', label: 'Environment', secret: false, placeholder: 'production' },
    ],
  },
  {
    id: 'push',
    name: 'Push Protocol',
    category: 'Communication',
    description: 'Wallet addressed notifications.',
    kind: null,
    unavailable: WALLET,
    fields: [
      { key: 'channelAddress', label: 'Channel address', secret: false, placeholder: '0x...' },
      { key: 'privateKey', label: 'Channel private key', secret: true },
    ],
  },

  // Storage
  {
    id: 's3',
    name: 'AWS S3',
    category: 'Storage',
    description: 'Object storage.',
    kind: 'objects',
    fields: [
      { key: 'bucket', label: 'Bucket name', secret: false },
      { key: 'region', label: 'Region', secret: false, placeholder: 'ap-south-1' },
      { key: 'accessKey', label: 'Access key identifier', secret: false },
      { key: 'secretKey', label: 'Secret access key', secret: true },
    ],
  },
  {
    id: 'pinata',
    name: 'Pinata',
    category: 'Storage',
    description: 'Content addressed object pinning.',
    kind: 'objects',
    fields: [
      { key: 'jwt', label: 'Token', secret: true },
      { key: 'gateway', label: 'Gateway address', secret: false, placeholder: 'https://gateway.pinata.cloud', validate: https },
    ],
  },
  {
    id: 'arweave',
    name: 'Irys (Arweave)',
    category: 'Storage',
    description: 'Permanent storage paid from a wallet.',
    kind: null,
    unavailable: WALLET,
    fields: [
      { key: 'rpcUrl', label: 'Node address', secret: false },
      { key: 'privateKey', label: 'Wallet private key', secret: true },
    ],
  },
  {
    id: 'filecoin',
    name: 'Lighthouse (Filecoin)',
    category: 'Storage',
    description: 'Perpetual file storage.',
    kind: 'objects',
    fields: [{ key: 'apiKey', label: 'Key', secret: true }],
  },
  {
    id: 'supabase_storage',
    name: 'Supabase Storage',
    category: 'Storage',
    description: 'Object storage beside a hosted database.',
    kind: 'objects',
    fields: [
      { key: 'projectUrl', label: 'Project address', secret: false, validate: https },
      { key: 'serviceKey', label: 'Service role key', secret: true },
      { key: 'bucket', label: 'Bucket', secret: false },
    ],
  },
  {
    id: 'aws_kms',
    name: 'AWS KMS',
    category: 'Storage',
    description: 'A hardware backed signing key for platform signatures.',
    docsUrl: 'https://docs.aws.amazon.com/kms',
    kind: 'key_custody',
    fields: [
      { key: 'keyArn', label: 'Key name', secret: false, placeholder: 'arn:aws:kms:ap-south-1:...' },
      { key: 'accessKey', label: 'Access key identifier', secret: false, placeholder: 'AKIA...' },
      { key: 'secretKey', label: 'Secret access key', secret: true },
      { key: 'region', label: 'Region', secret: false, placeholder: 'ap-south-1' },
    ],
  },

  // Data
  {
    id: 'chainlink',
    name: 'Chainlink',
    category: 'Data',
    description: 'Price and data feeds with signed values.',
    kind: 'oracle',
    blueprint: { kind: 'feed', cadenceSeconds: 60 },
    fields: [
      { key: 'subId', label: 'Subscription identifier', secret: false },
      { key: 'rpcUrl', label: 'Node address', secret: false, validate: https },
    ],
  },
  {
    id: 'graph',
    name: 'The Graph',
    category: 'Data',
    description: 'Indexed data from an outside network, read as a feed.',
    kind: 'oracle',
    blueprint: { kind: 'feed', cadenceSeconds: 300 },
    fields: [
      { key: 'apiKey', label: 'Query key', secret: true },
      { key: 'subgraphId', label: 'Index identifier', secret: false },
    ],
  },
  {
    id: 'alchemy',
    name: 'Alchemy',
    category: 'Data',
    description: 'Node access to an outside network, used by the bridge.',
    kind: 'bridge',
    blueprint: { kind: 'bridge' },
    fields: [
      { key: 'apiKey', label: 'Key', secret: true },
      { key: 'appId', label: 'Application identifier', secret: false },
    ],
  },
  {
    id: 'moralis',
    name: 'Moralis',
    category: 'Data',
    description: 'Node and data access to outside networks, used by the bridge.',
    kind: 'bridge',
    blueprint: { kind: 'bridge' },
    fields: [{ key: 'apiKey', label: 'Key', secret: true }],
  },
  {
    id: 'pyth',
    name: 'Pyth Network',
    category: 'Data',
    description: 'Market data feeds with signed values.',
    kind: 'oracle',
    blueprint: { kind: 'feed', cadenceSeconds: 30 },
    fields: [{ key: 'hermesUrl', label: 'Service address', secret: false, placeholder: 'https://hermes.pyth.network', validate: https }],
  },
  {
    id: 'apeda_agriexchange',
    name: 'APEDA AgriExchange',
    category: 'Data',
    description: 'Exporter registration lookups from the APEDA registry.',
    kind: 'oracle',
    blueprint: { kind: 'feed', cadenceSeconds: 3600 },
    fields: [
      { key: 'apiKey', label: 'Key', secret: true, hint: 'Issued by APEDA to a registered platform integrator.' },
      { key: 'endpoint', label: 'Service address', secret: false, placeholder: 'https://agriexchange.apeda.gov.in/api/v1', validate: https },
    ],
  },
  {
    id: 'icegate_api',
    name: 'ICEGATE (CBIC)',
    category: 'Data',
    description: 'Shipping bill and clearance status from the customs portal.',
    kind: 'oracle',
    blueprint: { kind: 'feed', cadenceSeconds: 1800 },
    fields: [
      { key: 'userId', label: 'User identifier', secret: false },
      { key: 'password', label: 'Password', secret: true },
      { key: 'endpoint', label: 'Service address', secret: false, placeholder: 'https://www.icegate.gov.in/Webservice', validate: https },
    ],
  },
  {
    id: 'nppo_dppq',
    name: 'NPPO India / DPPQ',
    category: 'Data',
    description: 'Phytosanitary certificate checks against the official registry.',
    kind: 'oracle',
    blueprint: { kind: 'feed', cadenceSeconds: 3600 },
    fields: [
      { key: 'apiKey', label: 'Key', secret: true, hint: 'Issued by the Directorate of Plant Protection.' },
      { key: 'endpoint', label: 'Verification address', secret: false, placeholder: 'https://ppqs.gov.in/api/phytocert/verify', validate: https },
    ],
  },

  // Analytics
  {
    id: 'posthog',
    name: 'PostHog',
    category: 'Analytics',
    description: 'Product analytics fed by deployment events.',
    kind: 'notifications',
    fields: [
      { key: 'apiKey', label: 'Project key', secret: true, placeholder: 'phc_...' },
      { key: 'host', label: 'Instance address', secret: false, placeholder: 'https://app.posthog.com', validate: https },
    ],
  },
  {
    id: 'segment',
    name: 'Segment',
    category: 'Analytics',
    description: 'Customer data platform fed by deployment events.',
    kind: 'notifications',
    fields: [{ key: 'writeKey', label: 'Write key', secret: true }],
  },
  {
    id: 'dune',
    name: 'Dune',
    category: 'Analytics',
    description: 'Query results from outside networks, read as a feed.',
    kind: 'oracle',
    blueprint: { kind: 'feed', cadenceSeconds: 3600 },
    fields: [{ key: 'apiKey', label: 'Key', secret: true }],
  },
  {
    id: 'ga4',
    name: 'Google Analytics 4',
    category: 'Analytics',
    description: 'Web traffic measurement fed by deployment events.',
    kind: 'notifications',
    fields: [
      { key: 'measurementId', label: 'Measurement identifier', secret: false, placeholder: 'G-...' },
      { key: 'apiSecret', label: 'Secret', secret: true },
    ],
  },
  {
    id: 'mixpanel',
    name: 'Mixpanel',
    category: 'Analytics',
    description: 'Event analytics fed by deployment events.',
    kind: 'notifications',
    fields: [{ key: 'projectToken', label: 'Project token', secret: true }],
  },
  {
    id: 'cloudwatch_elk',
    name: 'CloudWatch and ELK',
    category: 'Analytics',
    description: 'Log aggregation for chain events, access logs and the audit trail.',
    kind: 'notifications',
    fields: [
      { key: 'awsAccessKey', label: 'AWS access key identifier', secret: false, placeholder: 'AKIA...' },
      { key: 'awsSecretKey', label: 'AWS secret access key', secret: true },
      { key: 'awsRegion', label: 'AWS region', secret: false, placeholder: 'ap-south-1' },
      { key: 'elkEndpoint', label: 'ELK address', secret: false, placeholder: 'https://logs.example.internal:9200', validate: https },
      { key: 'elkApiKey', label: 'ELK key', secret: true },
    ],
  },
  {
    id: 'prometheus_grafana',
    name: 'Prometheus and Grafana',
    category: 'Analytics',
    description: 'Metrics for validator health, block time and throughput.',
    kind: 'notifications',
    fields: [
      { key: 'prometheusEndpoint', label: 'Prometheus address', secret: false, placeholder: 'https://prometheus.example.internal:9090', validate: https },
      { key: 'grafanaEndpoint', label: 'Grafana address', secret: false, placeholder: 'https://grafana.example.internal:3000', validate: https },
      { key: 'grafanaApiKey', label: 'Grafana service key', secret: true, hint: 'A service account key with the editor role.' },
      { key: 'alertmanagerUrl', label: 'Alertmanager address', secret: false, placeholder: 'https://alertmanager.example.internal:9093', validate: https },
    ],
  },

  // Webhooks
  {
    id: 'slack_webhook',
    name: 'Slack',
    category: 'Webhooks',
    description: 'Posts an event to a Slack channel.',
    kind: 'notifications',
    blueprint: { kind: 'trigger', endpointField: 'webhookUrl' },
    fields: [
      { key: 'webhookUrl', label: 'Webhook address', secret: false, placeholder: 'https://hooks.slack.com/services/...', validate: (value) => (value.startsWith('https://hooks.slack.com') ? null : 'A Slack webhook address begins with https://hooks.slack.com') },
    ],
  },
  {
    id: 'discord_webhook',
    name: 'Discord',
    category: 'Webhooks',
    description: 'Posts an event to a Discord channel.',
    kind: 'notifications',
    blueprint: { kind: 'trigger', endpointField: 'webhookUrl' },
    fields: [
      { key: 'webhookUrl', label: 'Webhook address', secret: false, placeholder: 'https://discord.com/api/webhooks/...', validate: (value) => (value.includes('discord.com/api') ? null : 'A Discord webhook address holds discord.com/api') },
    ],
  },
  {
    id: 'telegram_bot',
    name: 'Telegram Bot',
    category: 'Webhooks',
    description: 'Sends an event through a Telegram bot.',
    kind: 'notifications',
    fields: [
      { key: 'botToken', label: 'Bot token', secret: true },
      { key: 'chatId', label: 'Chat identifier', secret: false },
    ],
  },
  {
    id: 'zapier',
    name: 'Zapier',
    category: 'Webhooks',
    description: 'Starts a Zapier workflow from an event.',
    kind: 'notifications',
    blueprint: { kind: 'trigger', endpointField: 'webhookUrl' },
    fields: [{ key: 'webhookUrl', label: 'Catch hook address', secret: false, placeholder: 'https://hooks.zapier.com/...', validate: https }],
  },
  {
    id: 'custom_webhook',
    name: 'Custom endpoint',
    category: 'Webhooks',
    description: 'Sends a signed JSON payload to an address of ours.',
    kind: 'notifications',
    blueprint: { kind: 'trigger', endpointField: 'url' },
    fields: [
      { key: 'url', label: 'Endpoint address', secret: false, placeholder: 'https://api.example.com/events', validate: https },
      { key: 'secret', label: 'Signing secret', secret: true, hint: 'The receiver verifies the signature header with it.' },
      { key: 'headers', label: 'Extra headers', secret: false, placeholder: '{"Authorization": "Bearer ..."}' },
    ],
  },
  {
    id: 'pagerduty',
    name: 'PagerDuty',
    category: 'Webhooks',
    description: 'Incident alerts: a limit breached, a chain halt, a validator down.',
    docsUrl: 'https://developer.pagerduty.com',
    kind: 'notifications',
    fields: [
      { key: 'integrationKey', label: 'Events integration key', secret: true, hint: 'From the integrations tab of the service.' },
      { key: 'apiToken', label: 'Token', secret: true, hint: 'Manages incidents and escalation policies.' },
      { key: 'serviceId', label: 'Service identifier', secret: false, placeholder: 'PXXXXXXX' },
    ],
  },
];

/** The providers one category lists. */
export function providersIn(category: IntegrationCategory): ProviderDef[] {
  return CATALOGUE.filter((entry) => entry.category === category);
}

export function providerById(id: string): ProviderDef | undefined {
  return CATALOGUE.find((entry) => entry.id === id);
}

/** The outside networks a bridge endpoint may name. */
export const BRIDGE_TARGETS = [
  'ethereum',
  'polygon',
  'arbitrum',
  'avalanche',
  'cosmos',
  'solana',
  'polkadot',
  'bitcoin',
] as const;

/* ------------------------------------------------------------------ */
/* The draft the step keeps                                            */
/* ------------------------------------------------------------------ */

export type IntegrationEnvironment = 'test' | 'live';

export type TestOutcome = {
  ok: boolean;
  message: string;
  driver: 'local' | 'live' | 'none';
  checkedAt: string;
};

export type IntegrationConfig = {
  enabled: boolean;
  environment: IntegrationEnvironment;
  kind: IntegrationKind | null;
  /** Plain values, keyed by field. A secret never appears here. */
  settings: Record<string, string>;
  /** The secret field names Cerulea APIs key custody holds, per environment. */
  held: Record<IntegrationEnvironment, string[]>;
  /** The Blueprint choices for a feed, a bridge or a trigger. */
  blueprint: {
    payloadType?: string;
    cadenceSeconds?: number;
    targetNetwork?: string;
    collection?: string;
    direction?: 'Outbound' | 'Inbound' | 'Both';
    event?: string;
  };
  lastTest: TestOutcome | null;
};

/** The answer every key custody call carries back. A value never appears in it. */
export type CustodyAnswer = {
  ok: true;
  integrationId: string;
  environment: IntegrationEnvironment;
  /** The secret field names Cerulea APIs holds. The values stay inside Cerulea APIs. */
  held: string[];
  storedAt: string | null;
};

export type IntegrationsDocument = {
  version: 2;
  configs: Record<string, IntegrationConfig>;
};

export function emptyConfig(provider: ProviderDef): IntegrationConfig {
  return {
    enabled: false,
    environment: 'test',
    kind: provider.kind,
    settings: {},
    held: { test: [], live: [] },
    blueprint:
      provider.blueprint?.kind === 'feed'
        ? { cadenceSeconds: provider.blueprint.cadenceSeconds }
        : provider.blueprint?.kind === 'bridge'
          ? { direction: 'Both' }
          : {},
    lastTest: null,
  };
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

/**
 * Reads the integrations draft a project holds.
 * The current draft carries version 2. A production draft kept one credentials
 * map per provider with the environment in each key, such as `dev_secretKey`,
 * and the Dashboard wrote a map of provider id to true. Both read back with
 * every secret value left behind.
 */
export function readIntegrationsDocument(held: unknown): IntegrationsDocument {
  const draft = record(held);
  const configs: Record<string, IntegrationConfig> = {};
  const source = record(draft.configs);
  for (const [id, value] of Object.entries(source)) {
    const provider = providerById(id);
    if (!provider) continue;
    const base = emptyConfig(provider);
    if (value === true) {
      configs[id] = { ...base, enabled: true };
      continue;
    }
    const entry = record(value);
    if (draft.version === 2) {
      const heldMap = record(entry.held);
      const settings: Record<string, string> = {};
      for (const [key, raw] of Object.entries(record(entry.settings))) {
        if (typeof raw === 'string' && provider.fields.some((field) => field.key === key && !field.secret)) {
          settings[key] = raw;
        }
      }
      const blueprint = record(entry.blueprint);
      const lastTest = record(entry.lastTest);
      configs[id] = {
        enabled: entry.enabled === true,
        environment: entry.environment === 'live' ? 'live' : 'test',
        kind: provider.kind,
        settings,
        held: { test: strings(heldMap.test), live: strings(heldMap.live) },
        blueprint: {
          ...base.blueprint,
          ...(typeof blueprint.payloadType === 'string' ? { payloadType: blueprint.payloadType } : {}),
          ...(typeof blueprint.cadenceSeconds === 'number' ? { cadenceSeconds: blueprint.cadenceSeconds } : {}),
          ...(typeof blueprint.targetNetwork === 'string' ? { targetNetwork: blueprint.targetNetwork } : {}),
          ...(typeof blueprint.collection === 'string' ? { collection: blueprint.collection } : {}),
          ...(blueprint.direction === 'Outbound' || blueprint.direction === 'Inbound' || blueprint.direction === 'Both'
            ? { direction: blueprint.direction }
            : {}),
          ...(typeof blueprint.event === 'string' ? { event: blueprint.event } : {}),
        },
        lastTest:
          typeof lastTest.ok === 'boolean' && typeof lastTest.message === 'string'
            ? {
                ok: lastTest.ok,
                message: lastTest.message,
                driver: lastTest.driver === 'live' ? 'live' : lastTest.driver === 'none' ? 'none' : 'local',
                checkedAt: typeof lastTest.checkedAt === 'string' ? lastTest.checkedAt : '',
              }
            : null,
      };
      continue;
    }
    // A production draft.
    const settings: Record<string, string> = {};
    const environment: IntegrationEnvironment = entry.environment === 'prod' ? 'live' : 'test';
    const credentials = record(entry.credentials);
    for (const field of provider.fields) {
      if (field.secret) continue;
      const raw = credentials[`${environment === 'live' ? 'prod' : 'dev'}_${field.key}`] ?? credentials[field.key];
      if (typeof raw === 'string' && raw.length > 0) settings[field.key] = raw;
    }
    configs[id] = { ...base, enabled: entry.enabled === true, environment, settings };
  }
  return { version: 2, configs };
}

/** Strips every secret value out of a document before it is held or answered. */
export function withoutSecrets(document: IntegrationsDocument): IntegrationsDocument {
  const configs: IntegrationsDocument['configs'] = {};
  for (const [id, config] of Object.entries(document.configs)) {
    const provider = providerById(id);
    if (!provider) continue;
    const settings: Record<string, string> = {};
    for (const [key, value] of Object.entries(config.settings)) {
      if (provider.fields.some((field) => field.key === key && !field.secret)) settings[key] = value;
    }
    configs[id] = { ...config, settings };
  }
  return { version: 2, configs };
}

/* ------------------------------------------------------------------ */
/* Writing the Blueprint                                               */
/* ------------------------------------------------------------------ */

/** The identifier prefix of every entry this step writes, so other entries stay untouched. */
export const ENTRY_PREFIX = 'integration_';

export function entryId(providerId: string): string {
  return `${ENTRY_PREFIX}${providerId}`;
}

export type BlueprintGap = { providerId: string; reason: string };

/**
 * The Integrations section with this step's entries replaced.
 * An enabled oracle provider writes a feed, an enabled bridge provider writes
 * a bridge endpoint and an enabled trigger provider writes an external
 * trigger. An entry whose references are absent is left out and reported.
 */
export function integrationsSectionFor(
  blueprint: Blueprint,
  document: IntegrationsDocument,
): { integrations: Integrations; gaps: BlueprintGap[] } {
  const kept = {
    feeds: blueprint.integrations.feeds.filter((entry) => !entry.id.startsWith(ENTRY_PREFIX)),
    bridges: blueprint.integrations.bridges.filter((entry) => !entry.id.startsWith(ENTRY_PREFIX)),
    triggers: blueprint.integrations.triggers.filter((entry) => !entry.id.startsWith(ENTRY_PREFIX)),
  };
  const gaps: BlueprintGap[] = [];
  const recordTypes = new Set(
    blueprint.types.filter((entry) => entry.kind === 'Record').map((entry) => entry.id),
  );
  const collections = new Set(blueprint.collections.map((entry) => entry.id));
  const events = new Set(blueprint.events.map((entry) => entry.id));

  for (const [providerId, config] of Object.entries(document.configs)) {
    const provider = providerById(providerId);
    if (!provider || !provider.blueprint || !config.enabled) continue;
    const part = provider.blueprint;
    if (part.kind === 'feed') {
      const payloadType = config.blueprint.payloadType ?? '';
      if (!recordTypes.has(payloadType)) {
        gaps.push({
          providerId,
          reason: 'The feed names no record type the Blueprint holds. Choose the record type the values arrive as.',
        });
        continue;
      }
      kept.feeds.push({
        id: entryId(providerId),
        name: provider.name,
        provider: providerId,
        payload_type: payloadType,
        cadence_seconds: Math.max(1, Math.min(86400, Math.round(config.blueprint.cadenceSeconds ?? part.cadenceSeconds))),
        attestation: 'Signature',
      });
    } else if (part.kind === 'bridge') {
      const collection = config.blueprint.collection ?? '';
      const target = config.blueprint.targetNetwork ?? '';
      if (!collections.has(collection) || target.length === 0) {
        gaps.push({
          providerId,
          reason: 'The bridge names no collection or no outside network. Choose both.',
        });
        continue;
      }
      kept.bridges.push({
        id: entryId(providerId),
        target_network: target,
        direction: config.blueprint.direction ?? 'Both',
        collection,
        confirmations: 12,
      });
    } else {
      const event = config.blueprint.event ?? '';
      const endpoint = config.settings[part.endpointField] ?? '';
      if (!events.has(event)) {
        gaps.push({
          providerId,
          reason: 'The trigger watches no event the Blueprint holds. Choose the event that sends.',
        });
        continue;
      }
      if (!endpoint.startsWith('https://')) {
        gaps.push({ providerId, reason: 'The trigger has no https address to send to. Enter one.' });
        continue;
      }
      kept.triggers.push({
        id: entryId(providerId),
        event,
        endpoint,
        signing: 'Signature',
        retries: 5,
      });
    }
  }
  return { integrations: kept, gaps };
}

/** Applies the document to a Blueprint, touching the Integrations section alone. */
export function applyIntegrationsToBlueprint(
  blueprint: Blueprint,
  document: IntegrationsDocument,
): { blueprint: Blueprint; gaps: BlueprintGap[] } {
  const { integrations, gaps } = integrationsSectionFor(blueprint, document);
  return { blueprint: { ...blueprint, integrations }, gaps };
}

/** The providers with no kind in this release, with the reason. */
export function unavailableProviders(): { id: string; name: string; reason: string }[] {
  return CATALOGUE.filter((entry) => entry.kind === null).map((entry) => ({
    id: entry.id,
    name: entry.name,
    reason: entry.unavailable ?? '',
  }));
}

/** Checks the plain values of one provider against its field rules. */
export function settingFaults(provider: ProviderDef, settings: Record<string, string>): Record<string, string> {
  const faults: Record<string, string> = {};
  for (const field of provider.fields) {
    if (field.secret) continue;
    const value = settings[field.key] ?? '';
    if (value.length > 0 && field.validate) {
      const fault = field.validate(value);
      if (fault) faults[field.key] = fault;
    }
  }
  return faults;
}
