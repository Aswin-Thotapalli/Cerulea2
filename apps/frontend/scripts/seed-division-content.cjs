/**
 * Idempotent seed: adds division-specific (govt / enterprise) modules and
 * templates to modules.seed.json and templates.seed.json. Re-runnable — skips
 * anything already present by id.
 *
 * Run: node scripts/seed-division-content.cjs
 */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'src', 'data');
const modPath = path.join(dir, 'modules.seed.json');
const tplPath = path.join(dir, 'templates.seed.json');

const M = (moduleId, title, division, category, tags, blurb, longDescription, dependsOn = [], recommends = []) => ({
  moduleId, title, projectType: 'blockchain', division, category, tags, blurb, longDescription,
  dependsOn, recommends, reasonByDepId: {}, configSchema: { type: 'object', properties: {}, additionalProperties: true },
});

// ─── GOVT modules ─────────────────────────────────────────────────────────────
const govtModules = [
  M('govt-identity', 'Citizen Identity (Aadhaar/DigiLocker)', 'govt', 'identity', ['identity','aadhaar','digilocker','kyc'],
    'Verify citizens against national ID (Aadhaar / DigiLocker) and bind records to real people.',
    ['Links on-chain actors to a verified national identity so records, benefits, and services map to real citizens.',
     'Runs verification off-chain and anchors only proofs on-chain — raw identity data never leaves sovereign storage.'],
    ['genesis'], ['govt-records-registry','govt-esign']),
  M('govt-records-registry', 'Public Records Registry', 'govt', 'registry', ['records','land','certificates','licenses'],
    'Tamper-proof registry for land, certificates, and licences — independently verifiable.',
    ['Stores hashes and lifecycle events for public records so any entry can be verified without trusting a single authority.',
     'Supports issuance, transfer, and revocation with a full immutable history per record.'],
    ['genesis'], ['govt-legal-audit','govt-transparency-portal']),
  M('govt-transparency-portal', 'Public Transparency Portal', 'govt', 'exploration-ui', ['transparency','citizen','portal','public'],
    'A citizen-facing explorer for public records and spending — trust through visibility.',
    ['A read-only public portal where citizens can search and verify public records and transactions.',
     'Configurable disclosure controls decide what is public vs. restricted per department.'],
    ['rpc'], ['govt-records-registry']),
  M('govt-grievance', 'Grievance & RTI Workflow', 'govt', 'workflow', ['grievance','rti','citizen','workflow'],
    'Track citizen grievances and RTI requests end-to-end with accountability at each step.',
    ['Models the full lifecycle of a citizen request — filed, assigned, reviewed, resolved — on an auditable ledger.',
     'SLA timers and escalation rules keep departments accountable and give citizens verifiable status.'],
    ['genesis'], ['govt-identity']),
  M('govt-esign', 'eSign / Digital Signature', 'govt', 'integration', ['esign','signature','legal'],
    'Legally-binding digital signatures on on-chain records and approvals.',
    ['Integrates an eSign provider so official approvals and documents are signed and notarised on chain.',
     'Signature proofs are anchored immutably for legal admissibility.'],
    ['genesis'], ['govt-records-registry']),
  M('govt-legal-audit', 'Legal-Grade Audit Trail', 'govt', 'security', ['audit','legal','immutable','evidence'],
    'An immutable, evidence-admissible record of every action for oversight and courts.',
    ['Captures a cryptographically-verifiable trail of every state change with actor, time, and context.',
     'Designed for regulatory oversight and legal proceedings — exportable and independently checkable.'],
    ['genesis'], []),
  M('govt-interdept', 'Inter-Department Connector', 'govt', 'integration', ['interdepartment','data-sharing','permissioned'],
    'Permissioned data exchange between departments without exposing everything.',
    ['Lets departments share specific records under scoped, revocable permissions.',
     'Every cross-department access is logged for accountability.'],
    ['genesis'], ['govt-legal-audit']),
];

// ─── ENTERPRISE modules ───────────────────────────────────────────────────────
const entModules = [
  M('ent-rbac', 'RBAC & Approval Workflows', 'enterprise', 'security', ['rbac','roles','approvals','permissions'],
    'Granular roles, custom permissions, and multi-step approvals for sensitive actions.',
    ['Define roles and fine-grained permissions, and require multi-party approval for high-risk operations.',
     'Every permission change and approval is recorded for audit.'],
    ['genesis'], ['ent-audit']),
  M('ent-sso', 'SSO / SCIM Gateway', 'enterprise', 'security', ['sso','saml','scim','provisioning'],
    'SAML single sign-on with automated user provisioning and de-provisioning.',
    ['Connects your identity provider (Okta, Azure AD, Google) for SSO across the studio and apps.',
     'SCIM keeps users and groups in sync automatically as your directory changes.'],
    ['genesis'], ['ent-rbac']),
  M('ent-kyc-aml', 'KYC/AML Compliance', 'enterprise', 'compliance', ['kyc','aml','compliance','onboarding'],
    'Regulated onboarding with identity checks and sanctions screening.',
    ['Screens counterparties against KYC/AML providers and records compliant onboarding on chain.',
     'Produces an auditable compliance trail for regulators.'],
    ['genesis'], ['ent-audit']),
  M('ent-erp-connector', 'ERP Connector', 'enterprise', 'integration', ['erp','sap','oracle','netsuite'],
    'Sync data with SAP, Oracle, or NetSuite so the chain fits your existing stack.',
    ['Bi-directional connectors map ERP objects (orders, invoices, assets) to on-chain records.',
     'Configurable field mapping and scheduled reconciliation keep both systems consistent.'],
    ['genesis'], ['ent-workflow']),
  M('ent-workflow', 'Workflow Engine', 'enterprise', 'workflow', ['workflow','bpm','automation'],
    'Automate multi-step business processes with on-chain state and approvals.',
    ['Model business processes as auditable state machines with roles, conditions, and SLAs.',
     'Integrates with RBAC for approvals and with ERP connectors for data.'],
    ['genesis'], ['ent-rbac']),
  M('ent-document-registry', 'Document & Asset Registry', 'enterprise', 'registry', ['documents','assets','registry'],
    'A tamper-proof registry for enterprise documents and assets.',
    ['Anchors document/asset hashes and lifecycle events for verifiable provenance.',
     'Access is governed by RBAC; every access is logged.'],
    ['genesis'], ['ent-rbac']),
  M('ent-audit', 'Audit-Grade Logging', 'enterprise', 'security', ['audit','logging','compliance','soc2'],
    'Legal-grade, exportable, long-retention audit trails for every action.',
    ['Captures a verifiable record of all activity, retained per your compliance policy.',
     'Exports evidence packs for SOC2 / ISO27001 audits.'],
    ['genesis'], []),
];

const T = (id, division, title, description, tags, modules, pages) => ({
  id, projectType: 'blockchain', division, title, description, tags,
  preinstalledModules: modules,
  modules: modules,
  edges: [
    { from: 'consensus', to: 'genesis', rel: 'drives' },
    { from: 'rpc', to: 'explorer', rel: 'feeds' },
  ],
  ui: { pages },
});
const CORE = ['consensus', 'evm-config', 'genesis', 'rpc', 'explorer'];

// ─── GOVT templates ───────────────────────────────────────────────────────────
const govtTemplates = [
  T('govt-land-records', 'govt', 'Land Records Registry',
    'Tamper-proof land and property records with citizen identity and legal-grade audit.',
    ['land','records','registry','property'],
    [...CORE, 'govt-records-registry', 'govt-identity', 'govt-legal-audit', 'govt-transparency-portal'],
    ['Records Registry','Transparency Portal','Explorer']),
  T('govt-grievance-portal', 'govt', 'Citizen Grievance & RTI Portal',
    'End-to-end grievance and RTI request tracking with accountability and public transparency.',
    ['grievance','rti','citizen','portal'],
    [...CORE, 'govt-grievance', 'govt-identity', 'govt-transparency-portal', 'govt-legal-audit'],
    ['Grievance Board','Transparency Portal']),
  T('govt-procurement', 'govt', 'Public Procurement Ledger',
    'Transparent, tamper-proof public procurement and tender records.',
    ['procurement','tender','transparency'],
    [...CORE, 'govt-records-registry', 'govt-legal-audit', 'govt-transparency-portal'],
    ['Procurement Ledger','Transparency Portal']),
  T('govt-certificates', 'govt', 'Digital Identity & Certificates',
    'Issue and verify citizen certificates and credentials, signed and anchored on chain.',
    ['identity','certificates','credentials','esign'],
    [...CORE, 'govt-identity', 'govt-esign', 'govt-records-registry'],
    ['Certificate Issuer','Records Registry']),
];

// ─── ENTERPRISE templates ─────────────────────────────────────────────────────
const entTemplates = [
  T('ent-supply-chain', 'enterprise', 'Supply Chain Provenance',
    'Track-and-trace across your supply chain with RBAC and audit-grade logging.',
    ['supply-chain','provenance','traceability'],
    [...CORE, 'ent-document-registry', 'ent-rbac', 'ent-audit'],
    ['Provenance Explorer','Audit Log']),
  T('ent-trade-finance', 'enterprise', 'Trade Finance & Invoice Ledger',
    'A permissioned invoice and trade-finance ledger integrated with your ERP.',
    ['trade-finance','invoice','erp'],
    [...CORE, 'ent-workflow', 'ent-rbac', 'ent-erp-connector', 'ent-audit'],
    ['Invoice Ledger','Approvals']),
  T('ent-kyc-chain', 'enterprise', 'KYC/AML Compliance Chain',
    'Regulated counterparty onboarding with KYC/AML screening and an auditable trail.',
    ['kyc','aml','compliance','onboarding'],
    [...CORE, 'ent-kyc-aml', 'ent-rbac', 'ent-audit'],
    ['Onboarding','Compliance Audit']),
  T('ent-document-vault', 'enterprise', 'Enterprise Document & Asset Registry',
    'A tamper-proof registry for enterprise documents and assets with SSO and RBAC.',
    ['documents','assets','registry','sso'],
    [...CORE, 'ent-document-registry', 'ent-rbac', 'ent-sso'],
    ['Document Registry','Access Control']),
];

function mergeById(arr, additions, key) {
  const have = new Set(arr.map((x) => x[key]));
  let added = 0;
  for (const item of additions) if (!have.has(item[key])) { arr.push(item); added++; }
  return added;
}

const modCat = JSON.parse(fs.readFileSync(modPath, 'utf8'));
const tplCat = JSON.parse(fs.readFileSync(tplPath, 'utf8'));
const modArr = modCat.modules || modCat;
const tplArr = tplCat.templates || tplCat;

const addedMods = mergeById(modArr, [...govtModules, ...entModules], 'moduleId');
const addedTpls = mergeById(tplArr, [...govtTemplates, ...entTemplates], 'id');

if (modCat.updatedAt !== undefined) modCat.updatedAt = new Date().toISOString();
if (tplCat.updatedAt !== undefined) tplCat.updatedAt = new Date().toISOString();

fs.writeFileSync(modPath, JSON.stringify(modCat, null, 2));
fs.writeFileSync(tplPath, JSON.stringify(tplCat, null, 2));
console.log(`Added ${addedMods} modules (now ${modArr.length}), ${addedTpls} templates (now ${tplArr.length}).`);
