/**
 * CBC-PRAMAAN - Step 4 integrations.
 * Keys are Studio step-4 catalog ids; credential keys are exactly the catalog
 * field keys prefixed with the environment ("prod_"). Every credential
 * follows the provider's real key structure (deterministic per project).
 */
const { K } = require('../_secrets.cjs');
const P = K('CBC-PRAMAAN'); // deterministic, provider-format credential values (no placeholders)

const INTEGRATIONS = {
  configs: {
    custom_webhook: {
      enabled: true, environment: 'prod',
      credentials: { prod_url: P('GEM_GATEWAY_CALLBACK_URL', 'https://gateway.gem.gov.in/cbc-pramaan/v1/callbacks'), prod_secret: P('GEM_GATEWAY_HMAC_SECRET'), prod_headers: '{"X-CBC-PRAMAAN-Source":"cerulea-private-chain"}' },
      settings: {
        signing: 'HMAC-SHA256', retryPolicy: 'exponential, 3 attempts',
        inbound: 'the six GeM trigger points: POST /bids, GET /tenders/{id}/evaluation, POST /tenders/{id}/preference, POST /certifications, POST /debarments, POST /rules (API-01 .. API-06)',
        outbound: 'DEBARMENT_WEBHOOK_EMITTED fan-out to ALL_PROCURING_ENTITIES (ENG-18; SIM-05 replaces the on-chain stand-in with real procuring-entity endpoints)',
        purpose: 'GeM API Gateway integration (validator-gem-gateway) - triggers in, debarment notices out',
      },
    },
    s3: {
      enabled: true, environment: 'prod',
      credentials: { prod_bucket: 'cbc-pramaan-declarations-prod', prod_region: 'ap-south-1', prod_accessKey: P('AWS_S3_ACCESS_KEY'), prod_secretKey: P('AWS_S3_SECRET_KEY') },
      settings: { encryption: 'SSE-KMS', purpose: 'Local-content declaration PDFs (declarationPdfHash) and CA certificate PDFs (certificatePdfHash); only the SHA-256 hash is written on chain and resolvable on /verify' },
    },
    aws_kms: {
      enabled: true, environment: 'prod',
      credentials: { prod_keyArn: P('AWS_KMS_KEY_ARN'), prod_accessKey: P('AWS_KMS_ACCESS_KEY'), prod_secretKey: P('AWS_KMS_SECRET_KEY'), prod_region: 'ap-south-1' },
      settings: { keyAlias: 'cbc-pramaan/validator-signing', purpose: 'Production replacement for SIM-02: validator block signatures become real digital signatures held in KMS/HSM for validator-gem-gateway, validator-dpiit and validator-nodal-ministry' },
    },
    docusign: {
      enabled: true, environment: 'prod',
      credentials: { prod_integrationKey: P('DOCUSIGN_INTEGRATION_KEY'), prod_userId: P('DOCUSIGN_USER_ID'), prod_accountId: P('DOCUSIGN_ACCOUNT_ID'), prod_privateKey: P('DOCUSIGN_RSA_PRIVATE_KEY') },
      settings: { signerAuth: 'email', auditTrail: true, purpose: 'DSC stand-in (SIM-03) for adminIdentity on rule updates, committeeIdentity on committee decisions and CA firm/membership attestation on certifications' },
    },
    resend: {
      enabled: true, environment: 'prod',
      credentials: { prod_apiKey: P('RESEND_API_KEY'), prod_domain: 'cbc-pramaan.cerulea.io' },
      settings: { fromEmail: 'notices@cbc-pramaan.cerulea.io', purpose: 'Debarment notices to procuring entities, AUDITOR_FLAGGED notices to CA firms, RULE_UPDATED notices to ministry admins, LOGIC_UPGRADED notices to approvers' },
    },
    cloudwatch_elk: {
      enabled: true, environment: 'prod',
      credentials: { prod_awsAccessKey: P('CLOUDWATCH_ACCESS_KEY'), prod_awsSecretKey: P('CLOUDWATCH_SECRET_KEY'), prod_awsRegion: 'ap-south-1', prod_elkEndpoint: 'https://elk.cbc-pramaan.internal:9200', prod_elkApiKey: P('ELK_API_KEY') },
      settings: { retentionYears: 7, alertsEnabled: true, purpose: 'Chain, API (/api/v1) and engine logs; per-step seed logging (OPS-02); read-model rebuild assertions (OPS-03)' },
    },
    prometheus_grafana: {
      enabled: true, environment: 'prod',
      credentials: { prod_prometheusEndpoint: 'https://prometheus.cbc-pramaan.internal:9090', prod_grafanaEndpoint: 'https://grafana.cbc-pramaan.internal:3000', prod_grafanaApiKey: P('GRAFANA_API_KEY'), prod_alertmanagerUrl: 'https://alertmanager.cbc-pramaan.internal:9093' },
      settings: { alertManagerEnabled: true, purpose: 'Bid submission latency (about 120-139 ms), preference latency (about 136-175 ms), DCF quorum rejections, integrity check results, evaluation cache hit rate (OPS-08)' },
    },
    pagerduty: {
      enabled: true, environment: 'prod',
      credentials: { prod_integrationKey: P('PAGERDUTY_INTEGRATION_KEY'), prod_apiToken: P('PAGERDUTY_API_TOKEN'), prod_serviceId: P('PAGERDUTY_SERVICE_ID') },
      settings: { escalationPolicy: '24/7 on-call rotation', purpose: 'Critical: chain integrity TAMPERED (prevHash / merkleRoot / block hash mismatch), DCF quorum not reached, validator offline, auto-seed failure on cold start' },
    },
    posthog: {
      enabled: true, environment: 'prod',
      credentials: { prod_apiKey: P('POSTHOG_API_KEY'), prod_host: 'https://app.posthog.com' },
      settings: { purpose: 'Screen usage across the nine routes and identity switcher, simulator tab usage, acceptance-scenario walkthrough funnels (SCN-01 .. SCN-12)' },
    },
  },
};

module.exports = { INTEGRATIONS };
