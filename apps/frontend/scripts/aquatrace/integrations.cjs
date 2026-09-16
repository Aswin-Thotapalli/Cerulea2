/**
 * AquaTrace — Step 4 integrations.
 * Keys are Studio step-4 catalog ids; credential keys are exactly the catalog
 * field keys prefixed with the environment ("prod_"). Secret values are
 * unmistakable placeholders — paste the real keys in Studio (Step 4).
 */
const P = (k) => `REPLACE_WITH_REAL_${k}`;

const INTEGRATIONS = {
  configs: {
    s3: {
      enabled: true, environment: 'prod',
      credentials: { prod_bucket: 'aquatrace-docs-prod', prod_region: 'ap-south-1', prod_accessKey: P('AWS_S3_ACCESS_KEY'), prod_secretKey: P('AWS_S3_SECRET_KEY') },
      settings: { encryption: 'SSE-KMS', purpose: 'Storage for anchored documents (document_anchor), certificates, lab reports and public-verify exports; each file is SHA-256 digested and anchored on AquaChain' },
    },
    aws_kms: {
      enabled: true, environment: 'prod',
      credentials: { prod_keyArn: P('AWS_KMS_KEY_ARN'), prod_accessKey: P('AWS_KMS_ACCESS_KEY'), prod_secretKey: P('AWS_KMS_SECRET_KEY'), prod_region: 'ap-south-1' },
      settings: { keyAlias: 'aquatrace/chain-master-key', purpose: 'Custody of CHAIN_MASTER_KEY (32-byte) that encrypts every actor\'s ed25519 private key at rest' },
    },
    sumsub: {
      enabled: true, environment: 'prod',
      credentials: { prod_appToken: P('SUMSUB_APP_TOKEN'), prod_secretKey: P('SUMSUB_SECRET_KEY'), prod_baseUrl: 'https://api.sumsub.com' },
      settings: { level: 'basic', livenessCheck: true, purpose: 'Identity verification for overseas importer / distributor / retailer accounts before they accept custody handoffs' },
    },
    docusign: {
      enabled: true, environment: 'prod',
      credentials: { prod_integrationKey: P('DOCUSIGN_INTEGRATION_KEY'), prod_userId: P('DOCUSIGN_USER_ID'), prod_accountId: P('DOCUSIGN_ACCOUNT_ID'), prod_privateKey: P('DOCUSIGN_RSA_PRIVATE_KEY') },
      settings: { signerAuth: 'email', auditTrail: true, purpose: 'Fallback signature for certificates and custody co-sign where a party cannot use its ed25519 key; signed digest is anchored' },
    },
    resend: {
      enabled: true, environment: 'prod',
      credentials: { prod_apiKey: P('RESEND_API_KEY'), prod_domain: 'aquatrace.cerulea.io' },
      settings: { fromEmail: 'alerts@aquatrace.cerulea.io', purpose: 'Invitations (/accept-invite), incoming handoff notices, monitoring alerts, dispute updates' },
    },
    twilio: {
      enabled: true, environment: 'prod',
      credentials: { prod_accountSid: P('TWILIO_ACCOUNT_SID'), prod_authToken: P('TWILIO_AUTH_TOKEN'), prod_messagingServiceSid: P('TWILIO_MESSAGING_SERVICE_SID') },
      settings: { whatsAppEnabled: true, languages: ['en','te','ta','ml','or','bn','gu','mr','kn'], purpose: 'SMS / WhatsApp for farmers, skippers and auctioneers in the nine supported locales' },
    },
    custom_webhook: {
      enabled: true, environment: 'prod',
      credentials: { prod_url: P('TENANT_WEBHOOK_URL'), prod_secret: P('TENANT_WEBHOOK_HMAC_SECRET'), prod_headers: '{"X-AquaTrace-Source":"aquachain"}' },
      settings: { signing: 'HMAC-SHA256', retryPolicy: 'exponential, 3 attempts', events: 'all 30 tx_* transaction types', purpose: 'Outbound deliveries to importer / retailer systems and regulator verification endpoints' },
    },
    cloudwatch_elk: {
      enabled: true, environment: 'prod',
      credentials: { prod_awsAccessKey: P('CLOUDWATCH_ACCESS_KEY'), prod_awsSecretKey: P('CLOUDWATCH_SECRET_KEY'), prod_awsRegion: 'ap-south-1', prod_elkEndpoint: 'https://elk.aquatrace.internal:9200', prod_elkApiKey: P('ELK_API_KEY') },
      settings: { retentionYears: 2, alertsEnabled: true, purpose: 'Centralised chain, API and audit logs' },
    },
    prometheus_grafana: {
      enabled: true, environment: 'prod',
      credentials: { prod_prometheusEndpoint: 'https://prometheus.aquatrace.internal:9090', prod_grafanaEndpoint: 'https://grafana.aquatrace.internal:3000', prod_grafanaApiKey: P('GRAFANA_API_KEY'), prod_alertmanagerUrl: 'https://alertmanager.aquatrace.internal:9093' },
      settings: { alertManagerEnabled: true, purpose: 'Producer cadence (5 s), validator signatures, pending vs confirmed transactions, explorer re-verification results' },
    },
    pagerduty: {
      enabled: true, environment: 'prod',
      credentials: { prod_integrationKey: P('PAGERDUTY_INTEGRATION_KEY'), prod_apiToken: P('PAGERDUTY_API_TOKEN'), prod_serviceId: P('PAGERDUTY_SERVICE_ID') },
      settings: { escalationPolicy: '24/7 on-call rotation', purpose: 'Critical monitoring rules: residue above MRL (lot held), transport temperature > 4 C, validator offline, finality stalled' },
    },
  },
};

module.exports = { INTEGRATIONS };
