/**
 * AgroTrace — Step 4 integrations.
 * Keys are Studio step-4 catalog ids; credential keys are exactly the catalog
 * field keys, prefixed with the environment ("prod_"). Secret values are
 * unmistakable placeholders — paste the real keys in Studio (Step 4).
 * Non-secret endpoints / regions / buckets are set to their real values.
 */
const P = (k) => `REPLACE_WITH_REAL_${k}`;

const INTEGRATIONS = {
  configs: {
    // ── Documents & storage ────────────────────────────────────────────────
    s3: {
      enabled: true, environment: 'prod',
      credentials: { prod_bucket: 'agrotrace-docs-prod', prod_region: 'ap-south-1', prod_accessKey: P('AWS_S3_ACCESS_KEY'), prod_secretKey: P('AWS_S3_SECRET_KEY') },
      settings: { encryption: 'SSE-KMS', purpose: 'documentS3Key storage for lab reports, certificates (phyto, COO, treatment, B/L), dispute evidence and audit-trail PDFs; every file is SHA-256 hashed and anchored on AgroChain' },
    },
    aws_kms: {
      enabled: true, environment: 'prod',
      credentials: { prod_keyArn: P('AWS_KMS_KEY_ARN'), prod_accessKey: P('AWS_KMS_ACCESS_KEY'), prod_secretKey: P('AWS_KMS_SECRET_KEY'), prod_region: 'ap-south-1' },
      settings: { keyAlias: 'agrotrace/platform-signing', keyRotationDays: 365, purpose: 'Platform signing key for audit-trail PDF exports and document-integrity attestations' },
    },
    // ── Compliance authorities (India) ─────────────────────────────────────
    apeda_agriexchange: {
      enabled: true, environment: 'prod',
      credentials: { prod_apiKey: P('APEDA_AGRIEXCHANGE_API_KEY'), prod_endpoint: 'https://agriexchange.apeda.gov.in/api/v1' },
      settings: { purpose: 'Validate APEDA registration numbers (Tenant.apedaRegistrationNumber, Lot.apedaRegNumber) and Certificate of Origin / export-inspection references issued by APEDA officers' },
    },
    icegate_api: {
      enabled: true, environment: 'prod',
      credentials: { prod_userId: P('ICEGATE_CBIC_USER_ID'), prod_password: P('ICEGATE_CBIC_PASSWORD'), prod_endpoint: 'https://www.icegate.gov.in/Webservice' },
      settings: { purpose: 'Validate shipping bill numbers and retrieve Let Export Order (LEO) status for CUSTOMS_CLEARED events (turmeric and mango customs forms)' },
    },
    nppo_dppq: {
      enabled: true, environment: 'prod',
      credentials: { prod_apiKey: P('NPPO_DPPQ_API_KEY'), prod_endpoint: 'https://ppqs.gov.in/api/phytocert/verify' },
      settings: { manualFallback: true, purpose: 'Validate phytosanitary certificate numbers (PHYTO_CERTIFICATE_ISSUED) against the DPPQ official registry' },
    },
    // ── Identity / signatures ──────────────────────────────────────────────
    sumsub: {
      enabled: true, environment: 'prod',
      credentials: { prod_appToken: P('SUMSUB_APP_TOKEN'), prod_secretKey: P('SUMSUB_SECRET_KEY'), prod_baseUrl: 'https://api.sumsub.com' },
      settings: { level: 'basic', livenessCheck: true, purpose: 'KYC for non-APEDA participants (overseas BUYER accounts) before they can accept shipments or open disputes' },
    },
    docusign: {
      enabled: true, environment: 'prod',
      credentials: { prod_integrationKey: P('DOCUSIGN_INTEGRATION_KEY'), prod_userId: P('DOCUSIGN_USER_ID'), prod_accountId: P('DOCUSIGN_ACCOUNT_ID'), prod_privateKey: P('DOCUSIGN_RSA_PRIVATE_KEY') },
      settings: { signerAuth: 'email', auditTrail: true, purpose: 'eSign for certificates and two-party custody handoffs where a participant cannot wallet-sign; signed document hash is anchored on chain' },
    },
    // ── Messaging ──────────────────────────────────────────────────────────
    resend: {
      enabled: true, environment: 'prod',
      credentials: { prod_apiKey: P('RESEND_API_KEY'), prod_domain: 'agrotrace.cerulea.io' },
      settings: { fromEmail: 'alerts@agrotrace.cerulea.io', purpose: 'Transactional email: stage events, handoff requests, breach alerts, dispute updates, invite codes' },
    },
    twilio: {
      enabled: true, environment: 'prod',
      credentials: { prod_accountSid: P('TWILIO_ACCOUNT_SID'), prod_authToken: P('TWILIO_AUTH_TOKEN'), prod_messagingServiceSid: P('TWILIO_MESSAGING_SERVICE_SID') },
      settings: { whatsAppEnabled: true, languages: ['en','hi','bn','gu','kn','mr','pa','ta','te'], purpose: 'SMS / WhatsApp alerts for farmers and field roles (mobile-first PWA users, nine Indian languages)' },
    },
    custom_webhook: {
      enabled: true, environment: 'prod',
      credentials: { prod_url: P('TENANT_WEBHOOK_URL'), prod_secret: P('TENANT_WEBHOOK_HMAC_SECRET'), prod_headers: '{"X-AgroTrace-Source":"agrochain"}' },
      settings: { signing: 'HMAC-SHA256', retryPolicy: 'exponential, 3 attempts', events: ['LOT_REGISTERED','RESIDUE_TEST_RECORDED','SHIPMENT_CREATED','EVENT_RECORDED','CERTIFICATE_ANCHORED','CUSTODY_TRANSFERRED','BREACH_RECORDED','DISPUTE_INITIATED','DISPUTE_RESOLVED','COMPLIANCE_OVERRIDE'], purpose: 'Outbound WebhookConfig deliveries to exporter / buyer systems for every chain transaction type' },
    },
    // ── Observability & on-call ────────────────────────────────────────────
    cloudwatch_elk: {
      enabled: true, environment: 'prod',
      credentials: { prod_awsAccessKey: P('CLOUDWATCH_ACCESS_KEY'), prod_awsSecretKey: P('CLOUDWATCH_SECRET_KEY'), prod_awsRegion: 'ap-south-1', prod_elkEndpoint: 'https://elk.agrotrace.internal:9200', prod_elkApiKey: P('ELK_API_KEY') },
      settings: { retentionYears: 2, alertsEnabled: true, purpose: 'Centralised chain, API and audit logs (regulatory retention)' },
    },
    prometheus_grafana: {
      enabled: true, environment: 'prod',
      credentials: { prod_prometheusEndpoint: 'https://prometheus.agrotrace.internal:9090', prod_grafanaEndpoint: 'https://grafana.agrotrace.internal:3000', prod_grafanaApiKey: P('GRAFANA_API_KEY'), prod_alertmanagerUrl: 'https://alertmanager.agrotrace.internal:9093' },
      settings: { alertManagerEnabled: true, purpose: 'Validator health, consensus latency, block time, mempool depth, IoT ingestion rate' },
    },
    pagerduty: {
      enabled: true, environment: 'prod',
      credentials: { prod_integrationKey: P('PAGERDUTY_INTEGRATION_KEY'), prod_apiToken: P('PAGERDUTY_API_TOKEN'), prod_serviceId: P('PAGERDUTY_SERVICE_ID') },
      settings: { escalationPolicy: '24/7 on-call rotation', purpose: 'Critical alerts: reefer temperature breach (BREACH_RECORDED), validator OFFLINE, block finalisation stalled' },
    },
  },
};

module.exports = { INTEGRATIONS };
