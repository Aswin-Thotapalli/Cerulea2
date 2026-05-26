/**
 * Seed script: AgroTrace (Mango Module) — Production-grade blockchain project
 * Populates all 5 Studio steps (Blueprint, Schema, Logic, Economics, Integrations)
 * Run with: node scripts/seed-agrotrace.cjs
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { Client } = require('pg');
const crypto = require('crypto');

const EMAIL        = 'bharat@cerulea.io';
const PROJECT_SLUG = 'agrotrace-mango';
const PROJECT_NAME = 'AgroTrace (Mango Module)';
const WORKSPACE_NAME = 'Caerulean Bytechains';

/* ─────────────────────────── ID helpers ─────────────────────────── */
let _c = 0;
function sid() { return `s${String(++_c).padStart(5, '0')}`; }

/* Field builder  [name, type, storage, req?, uniq?, idx?, enc?, desc?, def?] */
function fld(name, type, storage, req, uniq, idx, enc, desc, def) {
  return {
    id: sid(), name, type, storage,
    required: !!req, unique: !!uniq, indexed: !!idx, encrypted: !!enc,
    description: desc || undefined, defaultValue: def || undefined,
  };
}

/* Entity builder (legacy) */
function ent(name, description, isCore, fields) {
  return { id: sid(), name, description, isCore: !!isCore, fields };
}

/* Access presets */
const PUB  = { create: 'auth',  read: 'public', update: 'owner', delete: 'admin' };
const AUTH = { create: 'auth',  read: 'auth',   update: 'owner', delete: 'admin' };
const OWN  = { create: 'owner', read: 'owner',  update: 'owner', delete: 'admin' };
const ADM  = { create: 'admin', read: 'admin',  update: 'admin', delete: 'admin' };
const SYS  = { create: 'admin', read: 'auth',   update: 'admin', delete: 'admin' };

/* Entity builder with moduleId, access, and visibility */
function me(moduleId, name, description, isCore, fields, acc, onChain, apiPublic) {
  return {
    id: sid(), moduleId, name, description: description || undefined,
    isCore: !!isCore, fields,
    access: acc || AUTH,
    onChain: onChain !== undefined ? !!onChain : false,
    apiPublic: apiPublic !== undefined ? !!apiPublic : true,
  };
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  STEP 1 — BLUEPRINT (52 modules, 100 edges)                       */
/* ═══════════════════════════════════════════════════════════════════ */

const MODULES = [
  /* ── Blockchain Infrastructure (16) ── */
  { moduleId:'consensus',         title:'Consensus Engine',           group:'blockchain-infra', config:{ mechanism:'DCF', blockTime:'3s', finalityRounds:2 } },
  { moduleId:'evm-config',        title:'EVM Configuration',          group:'blockchain-infra', config:{ chainId:'agrotrace-1', londonFork:true, maxCodeSize:49152 } },
  { moduleId:'genesis',           title:'Genesis Block',              group:'blockchain-infra', config:{ initialValidators:7 } },
  { moduleId:'p2p',               title:'P2P Networking',             group:'blockchain-infra', config:{ maxPeers:50 } },
  { moduleId:'p2p-tls',           title:'P2P TLS Encryption',         group:'blockchain-infra', config:{ mtls:true, certRotationDays:90 } },
  { moduleId:'node-permissioning',title:'Node Permissioning',         group:'blockchain-infra', config:{ mode:'allowlist' } },
  { moduleId:'validators',        title:'Validator Set Management',   group:'blockchain-infra', config:{ maxValidators:21, minStake:10000 } },
  { moduleId:'tokenomics',        title:'Native Token Economics',     group:'blockchain-infra', config:{ symbol:'AGT', supply:100000000 } },
  { moduleId:'fees',              title:'Gas Fee Policy',             group:'blockchain-infra', config:{ baseFee:0.001, dynamic:true } },
  { moduleId:'rpc',               title:'EVM RPC Endpoint',           group:'blockchain-infra', config:{ http:true, wss:true, rateLimited:true } },
  { moduleId:'graphql-gateway',   title:'GraphQL Gateway',            group:'blockchain-infra', config:{ introspection:false, depth:8 } },
  { moduleId:'ws-subscriptions',  title:'WebSocket Subscriptions',    group:'blockchain-infra', config:{ eventTypes:['lot-stage','iot-breach'] } },
  { moduleId:'api-gateway',       title:'API Gateway',                group:'blockchain-infra', config:{ auth:'JWT+wallet', rateLimiting:true } },
  { moduleId:'metrics-dashboards',title:'Metrics & Dashboards',       group:'blockchain-infra', config:{ provider:'Prometheus+Grafana' } },
  { moduleId:'log-shipping',      title:'Log Shipping',               group:'blockchain-infra', config:{ destination:'CloudWatch+ELK', retentionYears:2 } },
  { moduleId:'backups-restore',   title:'Backups & Restore',          group:'blockchain-infra', config:{ schedule:'daily', storage:'S3' } },
  /* ── Identity & Access (9) ── */
  { moduleId:'wallet-auth',       title:'Wallet Authentication',      group:'identity', config:{ mode:'wallet+session', sessionTtlMins:480 } },
  { moduleId:'session-keys',      title:'Session Keys',               group:'identity', config:{ defaultTtlMins:60, maxActivePerUser:5 } },
  { moduleId:'rbac',              title:'Role-Based Access Control',  group:'identity', config:{ policyMode:'allowlist', roles:13 } },
  { moduleId:'org-accounts',      title:'Organization Accounts',      group:'identity', config:{ inviteOnly:true, maxMembersDefault:50 } },
  { moduleId:'kyc',               title:'KYC / Identity Verification',group:'identity', config:{ provider:'APEDA+NABL', recheckDays:365 } },
  { moduleId:'device-trust',      title:'Device & Session Trust',     group:'identity', config:{ maxDevicesPerUser:20, deviceBinding:true } },
  { moduleId:'gasless-relayer',   title:'Gasless Relayer',            group:'identity', config:{ sponsoredRoles:['FARMER','LABORATORY','NPPO_INSPECTOR','APEDA_OFFICER'] } },
  { moduleId:'did-vc-ledger',     title:'DID & Verifiable Credentials',group:'identity', config:{ anchor:'on-chain' } },
  { moduleId:'aml-screening',     title:'AML Screening',              group:'identity', config:{ provider:'Chainalysis', screenOnboarding:true } },
  /* ── Supply Chain Domain (8) ── */
  { moduleId:'traceability-ledger',   title:'Traceability Ledger',       group:'supply-chain', config:{ lotPattern:'AT-{VAR}-{YYYY}-{SEQ5}', varieties:['ALPHONSO','KESAR','BANGANAPALLI','DASHERI'] } },
  { moduleId:'cold-chain-monitoring', title:'Cold Chain Monitoring',      group:'supply-chain', config:{ breachThresholdCelsius:12, samplingIntervalSecs:300 } },
  { moduleId:'port-customs-events',   title:'Port & Customs Events',      group:'supply-chain', config:{ icegateIntegration:true } },
  { moduleId:'quality-recall-ledger', title:'Quality & Recall Ledger',    group:'supply-chain', config:{ gradeStandard:'APEDA' } },
  { moduleId:'evidence-chain',        title:'Evidence Chain',             group:'supply-chain', config:{ hashAlgorithm:'SHA-256', signedByPlatform:true } },
  { moduleId:'trade-finance-docs',    title:'Trade Finance Documents',    group:'supply-chain', config:{ supportedDocs:['CoO','EIC','PhytoCert','BL','CI','PackingList'] } },
  { moduleId:'compliance-attestations',title:'Compliance Attestations',   group:'supply-chain', config:{ authorities:['APEDA','NPPO-India','DPPQ','FSSAI','ICEGATE'] } },
  { moduleId:'provenance-notary',     title:'Provenance Notary',          group:'supply-chain', config:{ hashOnChain:true, ipfsPin:true } },
  /* ── Data & IoT (5) ── */
  { moduleId:'onchain-data',      title:'On-Chain Data Storage',      group:'data-iot', config:{ storageModel:'event-log', immutable:true } },
  { moduleId:'oracles',           title:'Oracle / Data Feeds',        group:'data-iot', config:{ providers:['IoT-direct','APEDA-API','ICEGATE-API'] } },
  { moduleId:'webhooks-inbound',  title:'Inbound Webhooks',           group:'data-iot', config:{ secretValidation:'HMAC-SHA256', batchSize:500 } },
  { moduleId:'webhooks-outbound', title:'Outbound Webhooks',          group:'data-iot', config:{ retryPolicy:'exponential-3', signPayloads:true } },
  { moduleId:'subgraph-indexer',  title:'Subgraph Indexer',           group:'data-iot', config:{ startBlock:'genesis' } },
  /* ── Operations (4) ── */
  { moduleId:'notifications',     title:'Notifications',              group:'operations', config:{ channels:['push','in-app'], targetByRole:true } },
  { moduleId:'emails',            title:'Email Service',              group:'operations', config:{ provider:'Resend', fromDomain:'agrotrace.in' } },
  { moduleId:'audit-logs',        title:'Audit Logs',                 group:'operations', config:{ retentionYears:7, tamperEvident:true } },
  { moduleId:'audit-export',      title:'Audit Trail Export',         group:'operations', config:{ format:'signed-PDF', signedByChain:true } },
  /* ── Compliance & Legal (4) ── */
  { moduleId:'produce-grades',    title:'Produce Grades',             group:'compliance', config:{ standard:'APEDA', gradesPerVariety:['Super-Extra','Extra','A','B'] } },
  { moduleId:'document-signing',  title:'Document Signing',           group:'compliance', config:{ provider:'wallet-signature+DocuSign', hashBeforeSign:true } },
  { moduleId:'fraud-rules',       title:'Fraud Rules Engine',         group:'compliance', config:{ rules:['duplicate-lot','backdated-events','role-mismatch'] } },
  { moduleId:'privacy-compliance',title:'Privacy Compliance',         group:'compliance', config:{ framework:'PDPB-India', dataMinimization:true } },
  /* ── Financial (4) ── */
  { moduleId:'treasury',          title:'Treasury',                   group:'financial', config:{ accounts:['platformFee','validatorRewards','ecosystemFund','reserve'] } },
  { moduleId:'escrow-settlement', title:'Escrow Settlement',          group:'financial', config:{ triggerOn:'BuyerReceipt.ACCEPTED', holdPeriodHours:48 } },
  { moduleId:'invoices-billing',  title:'Invoices & Billing',         group:'financial', config:{ invoicePrefix:'AGT-INV', currency:'INR', taxPercent:18 } },
  { moduleId:'razorpay-adapter',  title:'Razorpay Adapter',           group:'financial', config:{ upi:true, netBanking:true, currency:'INR' } },
  /* ── Credentials & Tokens (2) ── */
  { moduleId:'soulbound-token',   title:'Soulbound Token',            group:'credentials', config:{ issuerRole:'APEDA_OFFICER', revocable:true } },
  { moduleId:'erc721',            title:'ERC-721 NFT',                group:'credentials', config:{ name:'AgroTrace Certificate', symbol:'AGCERT', baseUri:'ipfs://agrotrace-certs/' } },
];

function gridPos(i) {
  const cols = 8;
  return { x: (i % cols) * 320, y: Math.floor(i / cols) * 220 };
}

const NODES = MODULES.map((m, i) => ({
  id: `n_${m.moduleId}`,
  type: 'module',
  position: gridPos(i),
  data: { moduleId: m.moduleId, title: m.title, group: m.group, config: m.config },
}));

const EDGE_DEFS = [
  /* Identity Layer (19) */
  ['wallet-auth','rbac','triggers'],
  ['wallet-auth','session-keys','feeds'],
  ['wallet-auth','gasless-relayer','reads'],
  ['wallet-auth','did-vc-ledger','reads'],
  ['rbac','org-accounts','reads'],
  ['rbac','onchain-data','reads'],
  ['rbac','compliance-attestations','feeds'],
  ['session-keys','device-trust','reads'],
  ['session-keys','rbac','reads'],
  ['org-accounts','kyc','reads'],
  ['kyc','rbac','feeds'],
  ['kyc','did-vc-ledger','feeds'],
  ['kyc','aml-screening','reads'],
  ['device-trust','oracles','calls'],
  ['device-trust','session-keys','feeds'],
  ['gasless-relayer','rbac','reads'],
  ['gasless-relayer','fees','calls'],
  ['did-vc-ledger','soulbound-token','feeds'],
  ['did-vc-ledger','compliance-attestations','feeds'],
  /* Supply Chain Core (24) */
  ['traceability-ledger','onchain-data','writes'],
  ['traceability-ledger','audit-logs','feeds'],
  ['traceability-ledger','evidence-chain','feeds'],
  ['traceability-ledger','notifications','triggers'],
  ['traceability-ledger','subgraph-indexer','feeds'],
  ['traceability-ledger','compliance-attestations','reads'],
  ['traceability-ledger','produce-grades','reads'],
  ['cold-chain-monitoring','traceability-ledger','writes'],
  ['cold-chain-monitoring','oracles','reads'],
  ['cold-chain-monitoring','notifications','triggers'],
  ['cold-chain-monitoring','metrics-dashboards','triggers'],
  ['port-customs-events','traceability-ledger','feeds'],
  ['port-customs-events','trade-finance-docs','reads'],
  ['port-customs-events','compliance-attestations','reads'],
  ['quality-recall-ledger','traceability-ledger','feeds'],
  ['quality-recall-ledger','evidence-chain','feeds'],
  ['quality-recall-ledger','notifications','triggers'],
  ['evidence-chain','audit-logs','feeds'],
  ['trade-finance-docs','onchain-data','writes'],
  ['trade-finance-docs','provenance-notary','calls'],
  ['provenance-notary','onchain-data','writes'],
  ['provenance-notary','document-signing','calls'],
  ['compliance-attestations','traceability-ledger','writes'],
  ['produce-grades','traceability-ledger','reads'],
  /* Credentials (5) */
  ['soulbound-token','erc721','reads'],
  ['erc721','onchain-data','feeds'],
  ['erc721','provenance-notary','calls'],
  ['did-vc-ledger','kyc','reads'],
  ['compliance-attestations','did-vc-ledger','reads'],
  /* Data & IoT Infrastructure (16) */
  ['onchain-data','audit-logs','feeds'],
  ['onchain-data','subgraph-indexer','feeds'],
  ['oracles','onchain-data','writes'],
  ['oracles','cold-chain-monitoring','feeds'],
  ['webhooks-inbound','oracles','feeds'],
  ['webhooks-inbound','api-gateway','calls'],
  ['webhooks-outbound','emails','calls'],
  ['webhooks-outbound','notifications','calls'],
  ['subgraph-indexer','graphql-gateway','feeds'],
  ['graphql-gateway','api-gateway','feeds'],
  ['api-gateway','rpc','feeds'],
  ['api-gateway','ws-subscriptions','feeds'],
  ['ws-subscriptions','notifications','feeds'],
  ['audit-logs','audit-export','feeds'],
  ['audit-export','document-signing','calls'],
  ['audit-export','emails','calls'],
  /* Operations & Alerting (12) */
  ['notifications','emails','calls'],
  ['notifications','webhooks-outbound','calls'],
  ['metrics-dashboards','notifications','triggers'],
  ['metrics-dashboards','log-shipping','feeds'],
  ['log-shipping','backups-restore','feeds'],
  ['audit-logs','metrics-dashboards','feeds'],
  ['evidence-chain','audit-export','feeds'],
  ['traceability-ledger','webhooks-outbound','triggers'],
  ['cold-chain-monitoring','webhooks-outbound','triggers'],
  ['quality-recall-ledger','webhooks-outbound','triggers'],
  ['port-customs-events','webhooks-outbound','triggers'],
  ['metrics-dashboards','backups-restore','feeds'],
  /* Financial (8) */
  ['treasury','onchain-data','feeds'],
  ['treasury','audit-logs','feeds'],
  ['escrow-settlement','traceability-ledger','triggers'],
  ['escrow-settlement','treasury','feeds'],
  ['escrow-settlement','emails','calls'],
  ['invoices-billing','treasury','feeds'],
  ['invoices-billing','emails','calls'],
  ['razorpay-adapter','treasury','feeds'],
  /* Compliance & Legal (6) */
  ['compliance-attestations','quality-recall-ledger','reads'],
  ['document-signing','onchain-data','writes'],
  ['document-signing','provenance-notary','calls'],
  ['fraud-rules','api-gateway','calls'],
  ['fraud-rules','notifications','triggers'],
  ['privacy-compliance','audit-logs','reads'],
  /* Blockchain Infrastructure (10) */
  ['consensus','validators','reads'],
  ['validators','tokenomics','reads'],
  ['tokenomics','fees','feeds'],
  ['fees','treasury','feeds'],
  ['p2p-tls','p2p','calls'],
  ['p2p','consensus','feeds'],
  ['evm-config','rpc','feeds'],
  ['node-permissioning','p2p','calls'],
  ['gasless-relayer','fees','calls'],
  ['rpc','graphql-gateway','feeds'],
];

const EDGES = EDGE_DEFS.map(([s, t, rel], i) => ({
  id: `e${i}_${s.replace(/-/g,'_')}_${t.replace(/-/g,'_')}`,
  source: `n_${s}`,
  target: `n_${t}`,
  type: 'relation',
  markerEnd: { type: 'arrowclosed' },
  data: { rel },
}));

const BLUEPRINT = {
  modules: MODULES.map(m => ({ moduleId: m.moduleId, label: m.title, group: m.group, config: m.config })),
  graph: { nodes: NODES, edges: EDGES },
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  STEP 2 — SCHEMA (312 entities across 52 modules)                  */
/* ═══════════════════════════════════════════════════════════════════ */

const ENTITIES = [
  ...require('./ep1.cjs'),
  ...require('./ep2.cjs'),
  ...require('./ep3.cjs'),
  ...require('./ep4.cjs'),
  ...require('./ep5.cjs'),
];
const SCHEMA = {
  entities: ENTITIES,
  relationships: [],
  track: 'blockchain',
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  STEP 2 BEHAVIOR — LOGIC (35 flows)                               */
/* ═══════════════════════════════════════════════════════════════════ */

const FLOWS = [
  { id:'flow01', name:'Lot Number Assignment', trigger:'FarmRegistration created', description:'Generate lotNumber (AT-{VAR3}-{YYYY}-{SEQ5}) → Set MangoLot.currentStage = RESIDUE_TESTING → Emit stage-transition event.', steps:['Generate sequential lot number with variety prefix','Write MangoLot record on-chain','Emit LotStageTransition: FARM_REGISTRATION → RESIDUE_TESTING','Notify assigned laboratory'] },
  { id:'flow02', name:'MRL Threshold Validation', trigger:'ResidueTestResult created', description:'For each PesticideResidueDetail, fetch MRLThreshold by (compound, destinationCountry). If any detectedPPM > maxPPM → Set outcome = FAIL.', steps:['Load all PesticideResidueDetail records for this test','For each compound: query MRLThreshold by countryIso + compound','Compare detectedPPM vs maxPPM','Auto-set outcome = FAIL if any compound exceeds limit'] },
  { id:'flow03', name:'Residue FAIL Gate', trigger:'ResidueTestResult.outcome = FAIL', description:'Set MangoLot.status = REJECTED → Record ComplianceViolation on-chain → Email FARMER + APEDA_OFFICER → Push notification → Halt all further stage events.', steps:['Set MangoLot.status = REJECTED on-chain','Create ComplianceViolation record on-chain (CRITICAL)','Send email to FARMER and APEDA_OFFICER','Send push notification to farmer','Block any subsequent stage event for this lot'] },
  { id:'flow04', name:'Residue PASS Advance', trigger:'ResidueTestResult.outcome = PASS', description:'Set MangoLot.currentStage = PACKHOUSE → Notify farmer and assigned packhouse.', steps:['Set MangoLot.currentStage = PACKHOUSE','Emit LotStageTransition on-chain','Notify FARMER: lot cleared for packhouse','Notify PACKHOUSE operator: lot assigned'] },
  { id:'flow05', name:'Packhouse Precondition Gate', trigger:'PackhouseRecord creation attempted', description:'Check: ResidueTestResult exists with PASS. If missing: return PRECONDITION_FAILED → Log ComplianceCheck.', steps:['Query ResidueTestResult for this lot','Verify outcome = PASS and record is not expired','If missing or FAIL: reject with PRECONDITION_FAILED error','Log ComplianceCheck result (FAIL if blocked)'] },
  { id:'flow06', name:'Grade-Weight Balance Check', trigger:'GradingRecord created', description:'Sum all grade quantities → Must equal PackhouseRecord.acceptedQuantityKg ± 5%. If not: return validation error.', steps:['Sum quantityKg across all GradingRecord for this packhouse session','Compare sum to PackhouseRecord.acceptedQuantityKg','Allow ± 5% tolerance','Return validation error if balance fails'] },
  { id:'flow07', name:'Packhouse Stage Advance', trigger:'PackhouseRecord created and valid', description:'Update MangoLot.currentQuantityKg = acceptedQuantityKg → Set currentStage = TREATMENT → Notify treatment facility.', steps:['Update MangoLot.currentQuantityKg on-chain','Set MangoLot.currentStage = TREATMENT','Emit LotStageTransition','Notify assigned TREATMENT_FACILITY'] },
  { id:'flow08', name:'Treatment Requirement Check', trigger:'TreatmentRecord creation attempted', description:'Read ExportDestinationRule for lot.destinationCountry. If requiresVHT or requiresHWT → TreatmentRecord must exist before PhytoCert.', steps:['Load ExportDestinationRule by lot.destinationCountry','Check requiresVHT or requiresHWT flags','If treatment required: set compliance gate flag for phyto cert','Log ComplianceCheck record'] },
  { id:'flow09', name:'Treatment Stage Advance', trigger:'TreatmentRecord created', description:'Validate temp + duration against facility cert → Set MangoLot.currentStage = PHYTOSANITARY → Notify NPPO inspector.', steps:['Validate actualTempCelsius vs targetTempCelsius tolerance','Validate durationMinutes meets protocol minimum','Set MangoLot.currentStage = PHYTOSANITARY on-chain','Emit LotStageTransition','Notify NPPO_INSPECTOR'] },
  { id:'flow10', name:'VHT/HWT Compliance Gate for Phyto', trigger:'PhytosanitaryCertificate creation attempted', description:'Check destination country ExportDestinationRule. If treatment required but TreatmentRecord missing → Block with TREATMENT_REQUIRED error.', steps:['Load ExportDestinationRule for lot.destinationCountry','Check if TreatmentRecord exists for this lot','If treatment required but absent: return TREATMENT_REQUIRED error','Log ComplianceCheck result (FAIL)'] },
  { id:'flow11', name:'Phyto Certificate Stage Advance + NFT', trigger:'PhytosanitaryCertificate created with PASS', description:'Mint soulbound CertificateNFT (PHYTO_CERT) → Anchor cert hash on-chain → Set currentStage = APEDA_CERT.', steps:['Anchor certPdfHash to DocumentHash on-chain','Pin PDF to IPFS via Pinata','Mint soulbound ERC-721 (type: PHYTO_CERT) for NPPO_INSPECTOR wallet','Set MangoLot.currentStage = APEDA_CERT','Emit LotStageTransition'] },
  { id:'flow12', name:'APEDA Certification Stage Advance + NFTs', trigger:'ApedaCertification created', description:'Validate CoO + EIC doc hashes present → Mint two CertificateNFTs (COO + EIC) → Set currentStage = CUSTOMS.', steps:['Validate docHashOrigin and docHashInspection present','Anchor both hashes to DocumentHash on-chain','Mint soulbound ERC-721 (type: COO) for exporter','Mint soulbound ERC-721 (type: EIC) for exporter','Set MangoLot.currentStage = CUSTOMS'] },
  { id:'flow13', name:'Customs Filing Record', trigger:'CustomsClearance created', description:'Validate shippingBillNumber ICEGATE pattern → Set currentStage = CUSTOMS_PENDING_LEO.', steps:['Validate shippingBillNumber format (ICEGATE pattern)','Check exporterIEC is valid','Set MangoLot.currentStage = CUSTOMS_PENDING_LEO','Notify freight forwarder of pending LEO'] },
  { id:'flow14', name:'LEO Received — Cold Storage Advance', trigger:'CustomsClearance.leoDate updated (non-null)', description:'Set MangoLot.currentStage = COLD_STORAGE → Notify cold storage operator and freight forwarder.', steps:['Validate leoDate is valid and after shippingBillDate','Set MangoLot.currentStage = COLD_STORAGE on-chain','Emit LotStageTransition','Notify COLD_STORAGE_OPERATOR and FREIGHT_FORWARDER'] },
  { id:'flow15', name:'Cold Storage IoT Device Pairing', trigger:'ColdStorageRecord created', description:'Look up IoTDevice assigned to facility → Create IoTDeviceSession for this lot + COLD_STORAGE stage → Begin temperature monitoring loop.', steps:['Query IoTDevices assigned to facilityActorId','Create IoTDeviceSession record (stage: COLD_STORAGE)','Generate session key for device HMAC authentication','Begin accepting HMAC-validated temperature batch ingestion'] },
  { id:'flow16', name:'IoT Temperature Breach (Cold Storage)', trigger:'TemperatureReading.isBreach = true', description:'Create IoTBreachAlert on-chain → Push notification to COLD_STORAGE + FREIGHT_FORWARDER → Email FARMER + APEDA_OFFICER → PagerDuty if > threshold + 5°C.', steps:['Create IoTBreachAlert record on-chain','Send push notification to COLD_STORAGE_OPERATOR and FREIGHT_FORWARDER','Send email to FARMER and APEDA_OFFICER with breach detail','If temp > threshold + 5°C: trigger PagerDuty critical alert','Log to metrics dashboard'] },
  { id:'flow17', name:'Custody Transfer Initiation', trigger:'CustodyTransfer created by COLD_STORAGE', description:'Create CustodySignature record (FROM_PARTY) → Status = PENDING_COUNTERSIGN → Notify FREIGHT_FORWARDER with signing link.', steps:['Validate CustodyTransfer fields (fromActorId, toActorId, condition)','Create CustodySignature record for FROM_PARTY on-chain','Set CustodyTransfer.status = PENDING_COUNTERSIGN','Send notification to FREIGHT_FORWARDER with signing deep-link'] },
  { id:'flow18', name:'Custody Transfer Completion', trigger:'FREIGHT_FORWARDER signs CustodyTransfer', description:'Create CustodySignature record (TO_PARTY) → Set status = COMPLETED → Set currentStage = VESSEL_LOADING → Notify shipping line.', steps:['Create CustodySignature record for TO_PARTY on-chain','Set CustodyTransfer.status = COMPLETED on-chain','Set MangoLot.currentStage = VESSEL_LOADING','Emit LotStageTransition','Notify SHIPPING_LINE'] },
  { id:'flow19', name:'Custody Transfer Timeout', trigger:'Scheduler at 48h after PENDING_COUNTERSIGN', description:'If CustodyTransfer.status = PENDING_COUNTERSIGN → Set status = TIMED_OUT → Alert both parties + PLATFORM_ADMIN.', steps:['Scheduled job queries CustodyTransfer records older than 48h with PENDING_COUNTERSIGN status','Set status = TIMED_OUT on-chain','Send alert to COLD_STORAGE_OPERATOR (FROM_PARTY)','Send alert to FREIGHT_FORWARDER (TO_PARTY)','Alert PLATFORM_ADMIN'] },
  { id:'flow20', name:'Bill of Lading Issue', trigger:'BillOfLading created', description:'Validate containerNumber format + seal number → Create InTransitLog header → Set currentStage = IN_TRANSIT → Notify FOREIGN_BUYER.', steps:['Validate containerNumber format (ISO 6346)','Validate sealNumber is present','Create InTransitLog header record','Set MangoLot.currentStage = IN_TRANSIT on-chain','Send tracking link to FOREIGN_BUYER via email'] },
  { id:'flow21', name:'Container IoT Device Pairing', trigger:'InTransitLog created', description:'Pair IoTDevices assigned to container → Create IoTDeviceSession for IN_TRANSIT stage.', steps:['Query IoTDevices registered to containerNumber','Create IoTDeviceSession records (stage: IN_TRANSIT)','Enable container sensor batch ingestion endpoint','Set up breach monitoring for transit thresholds'] },
  { id:'flow22', name:'In-Transit Temperature Breach', trigger:'ContainerSensorReading.isBreach = true', description:'Create ContainerBreachAlert on-chain → Push notification to SHIPPING_LINE + FREIGHT_FORWARDER + FOREIGN_BUYER → Email with GPS + breach detail.', steps:['Create ContainerBreachAlert on-chain','Push notification to SHIPPING_LINE, FREIGHT_FORWARDER, FOREIGN_BUYER','Send email with GPS coordinates, temp reading, and breach detail','Update InTransitLog.totalBreaches count','Log to metrics dashboard'] },
  { id:'flow23', name:'In-Transit Shock Event', trigger:'ShockEventRecord created with accelerationG > threshold', description:'Create ContainerBreachAlert (type: SHOCK) on-chain → Notify SHIPPING_LINE + FOREIGN_BUYER.', steps:['Validate accelerationG > shock threshold (typically > 2G)','Create ContainerBreachAlert on-chain (alertType: SHOCK)','Notify SHIPPING_LINE and FOREIGN_BUYER','Log incident in InTransitLog'] },
  { id:'flow24', name:'Destination Arrival Recording', trigger:'DestinationArrival created', description:'Close IoTDeviceSession for IN_TRANSIT → Set currentStage = DESTINATION_ARRIVAL → Notify FOREIGN_BUYER for inspection.', steps:['Close IoTDeviceSession records for IN_TRANSIT stage','Finalize InTransitLog (arrivalTimestamp, totalReadings, maxTemp, minTemp)','Set MangoLot.currentStage = DESTINATION_ARRIVAL','Notify FOREIGN_BUYER: shipment arrived, inspection pending'] },
  { id:'flow25', name:'Quarantine Trigger', trigger:'DestinationArrival.quarantineOrdered = true', description:'Set MangoLot.status = QUARANTINED → Alert APEDA_OFFICER + FREIGHT_FORWARDER → Create ComplianceViolation on-chain.', steps:['Set MangoLot.status = QUARANTINED on-chain','Create ComplianceViolation (CRITICAL) on-chain','Alert APEDA_OFFICER and FREIGHT_FORWARDER immediately','Notify FARMER','Hold any pending escrow release'] },
  { id:'flow26', name:'Buyer Acceptance + Escrow Release', trigger:'BuyerReceipt.acceptanceStatus = ACCEPTED', description:'Set MangoLot.status = COMPLETED → Trigger EscrowRecord release → Send payment notification to exporter → Confirm to all parties.', steps:['Set MangoLot.status = COMPLETED on-chain','Set MangoLot.currentStage = COMPLETED','Trigger EscrowRecord.status = RELEASED','Send payment release notification to FARMER/exporter','Send completion confirmation to all stakeholders'] },
  { id:'flow27', name:'Buyer Partial Acceptance', trigger:'BuyerReceipt.acceptanceStatus = PARTIAL_ACCEPTED', description:'Calculate accepted/rejected quantities → Set MangoLot.status = PARTIALLY_COMPLETED → Trigger partial escrow release.', steps:['Calculate partial acceptance ratio','Set MangoLot.currentQuantityKg = acceptedQuantityKg on-chain','Set MangoLot.status = PARTIALLY_COMPLETED','Trigger partial EscrowRecord release proportional to acceptance','Notify all parties with accepted/rejected split'] },
  { id:'flow28', name:'Buyer Rejection — Auto Dispute Creation', trigger:'BuyerReceipt.acceptanceStatus = REJECTED', description:'Set MangoLot.status = DISPUTED → Auto-create DisputeRecord → Auto-populate DisputeEvidenceItem for every LotStageTransition → Notify FARMER + APEDA_OFFICER + FREIGHT_FORWARDER + PLATFORM_ADMIN → Hold escrow.', steps:['Set MangoLot.status = DISPUTED on-chain','Create DisputeRecord on-chain (status: OPEN)','Auto-run dispute evidence assembly flow (Flow 29)','Notify FARMER, APEDA_OFFICER, FREIGHT_FORWARDER, PLATFORM_ADMIN','Hold EscrowRecord (status remains HELD)'] },
  { id:'flow29', name:'Dispute Evidence Assembly', trigger:'DisputeRecord created', description:'Query all LotStageTransitions for lot → For each: create DisputeEvidenceItem with eventType, eventId, txHash, timestamp → Set totalEvidenceItems count.', steps:['Query all LotStageTransition records for this lot','For each transition: create DisputeEvidenceItem on-chain (eventType, eventId, txHash, timestamp)','Attach RejectionDetail records','Attach all IoTBreachAlert records','Set DisputeRecord.totalEvidenceItems count'] },
  { id:'flow30', name:'Dispute Settlement Recording', trigger:'DisputeSettlement created', description:'Update DisputeRecord.status → If FULL_REFUND: release escrow to buyer → If PARTIAL_REFUND: split escrow → If NO_CLAIM: release to exporter → Notify all.', steps:['Set DisputeRecord.status = RESOLVED or ARBITRATED','If FULL_REFUND: set EscrowRecord.status = REFUNDED to buyer','If PARTIAL_REFUND: split escrow proportionally','If NO_CLAIM: set EscrowRecord.status = RELEASED to exporter','Notify FARMER, FOREIGN_BUYER, ARBITRATOR, PLATFORM_ADMIN'] },
  { id:'flow31', name:'Certificate Validity Check (Scheduled)', trigger:'Daily scheduler job', description:'For all lots in CUSTOMS/IN_TRANSIT stages → Check PhytosanitaryCertificate.validUntil → If within 7 days: alert → If expired: create ComplianceViolation.', steps:['Query lots with currentStage IN (CUSTOMS, IN_TRANSIT, DESTINATION_ARRIVAL)','For each: load PhytosanitaryCertificate.validUntil','If validUntil within 7 days: alert APEDA_OFFICER and NPPO_INSPECTOR','If validUntil past: create ComplianceViolation (CRITICAL) on-chain','Log ComplianceCheck result'] },
  { id:'flow32', name:'Periodic Actor Credential Check (Scheduled)', trigger:'Weekly scheduler job', description:'For each VERIFIED Actor → Check ActorCredential.expiryDate → Within 30 days: alert → If expired: set verificationStatus = SUSPENDED.', steps:['Query all Actor records with verificationStatus = VERIFIED','For each: check ActorCredential.expiryDate','If within 30 days: alert PLATFORM_ADMIN and the actor','If already expired: set Actor.verificationStatus = SUSPENDED on-chain','Create ActorVerificationEvent record'] },
  { id:'flow33', name:'Audit Trail PDF Generation', trigger:'AuditTrailExport requested', description:'Assemble all LotStageTransitions + DocumentHashes chronologically → Generate signed PDF with chain signature → Upload to S3 → Send download link.', steps:['Query all LotStageTransition records for the lot in order','Query all DocumentHash records for the lot','Assemble chronological event timeline','Generate signed PDF (signed with AWS KMS platform key)','Upload to S3, create AuditTrailExport record','Email download link to requestor'] },
  { id:'flow34', name:'Certificate NFT Revocation', trigger:'PhytoCert or APEDA cert invalidated by authority', description:'Set CertificateNFT.revoked = true on-chain → Alert all downstream actors → Create ComplianceViolation.', steps:['Set CertificateNFT.revoked = true on-chain','Create ComplianceViolation (CRITICAL) on-chain','Alert CUSTOMS_BROKER (if lot in CUSTOMS or beyond)','Alert FOREIGN_BUYER','Alert FREIGHT_FORWARDER','PLATFORM_ADMIN notification'] },
  { id:'flow35', name:'Fraud Detection — Duplicate Lot Prevention', trigger:'FarmRegistration created', description:'Check if same (farmerId + harvestDate + variety + apedaRegNo) combination already exists in an ACTIVE lot. If yes: block + fraud alert + notify PLATFORM_ADMIN.', steps:['Query MangoLot records by farmerId + variety + apedaRegistrationNo','Check if harvestDate within ±7 days of existing active lot','If duplicate detected: block FarmRegistration creation','Create fraud alert notification to PLATFORM_ADMIN','Log ComplianceViolation (WARNING)'] },
];

const LOGIC = { flows: FLOWS, track: 'blockchain' };

/* ═══════════════════════════════════════════════════════════════════ */
/*  STEP 3 — ECONOMICS (full private blockchain configuration)        */
/* ═══════════════════════════════════════════════════════════════════ */

const ECONOMICS = {
  track: 'blockchain',
  tokenomics: {
    symbol: 'AGT',
    name: 'AgroTrace Token',
    decimals: 18,
    totalSupply: 100000000,
    distribution: {
      validators:        { percent: 20, amount: 20000000, vesting: '4yr-linear-1yr-cliff', purpose: 'Block validation rewards' },
      platformTreasury:  { percent: 25, amount: 25000000, vesting: '3yr-linear', purpose: 'Platform operations and development' },
      ecosystemFarmerFund:{ percent: 20, amount: 20000000, vesting: 'none', purpose: 'Farmer onboarding incentives, FPO grants, first-lot subsidies' },
      operationsTeam:    { percent: 15, amount: 15000000, vesting: '3yr-linear-6mo-cliff', purpose: 'Team compensation' },
      reserve:           { percent: 10, amount: 10000000, vesting: 'governance-locked', purpose: 'Emergency, regulatory, protocol upgrades' },
      publicSale:        { percent: 10, amount: 10000000, releaseSchedule: 'TGE-25pct-9mo-linear', purpose: 'Initial liquidity' },
    },
    inflationRate: 5,
    inflationRecipient: 'validators',
    maxSupplyCapEnabled: false,
    model: 'inflationary',
    vestingCliff: 12,
    vestingDuration: 48,
  },
  gasPolicy: {
    baseFee: 0.001,
    unit: 'AGT-per-gas',
    baseFeeAdjustmentDenominator: 8,
    blockGasLimit: 30000000,
    targetGasPerBlock: 15000000,
    elasticityMultiplier: 1.125,
    burnPercent: 50,
    validatorTipPercent: 50,
    minimumPriorityFee: 0.0001,
    maxFeePerGas: 0.1,
    dynamic: true,
    priorityTip: true,
    feeRecipient: 'validator',
  },
  gasSponsorshipPolicy: {
    sponsoredRoles: ['FARMER', 'LABORATORY', 'NPPO_INSPECTOR', 'APEDA_OFFICER'],
    selfPayRoles: ['PACKHOUSE', 'CUSTOMS_BROKER', 'SHIPPING_LINE', 'FREIGHT_FORWARDER', 'COLD_STORAGE', 'FOREIGN_BUYER'],
    iotDataSponsorPolicy: 'All IoT batch ingestion sponsored regardless of role',
    dailyCap: {
      FARMER:          '50 transactions',
      LABORATORY:      '20 transactions',
      NPPO_INSPECTOR:  '30 transactions',
      APEDA_OFFICER:   '30 transactions',
    },
    sponsorshipFundedFrom: 'ecosystemFarmerFund',
    maxTxPerUserPerDay: 50,
  },
  staking: {
    minValidatorStake: 10000,
    maxValidatorCount: 21,
    delegationEnabled: true,
    minDelegationAmount: 100,
    unbondingPeriodDays: 21,
    rewardsCycle: 24,
    slashingConditions: {
      doubleSigning: { slashPercent: 5, jailForever: true },
      downtime: { threshold: 'missing 1000 of last 10000 blocks', slashPercent: 0.01, jailDurationHours: 24 },
    },
    validatorCommissionMax: 20,
    validatorCommissionDefault: 10,
    rewardDistribution: 'every block proportional to stake',
    validatorEligibilityRequirement: 'node-permissioning clearance (APEDA supply chain participant)',
    minStake: 10000,
    unbondTime: 21,
    slashing: true,
    jailTime: 24,
    maxValidators: 21,
    minDelegation: 100,
    doubleSignSlash: 5,
    downtimeSlash: 0.01,
  },
  governance: {
    model: 'token-weighted-voting',
    quorumPercent: 10,
    passThresholdPercent: 51,
    vetoThresholdPercent: 33,
    votingPeriodDays: 7,
    depositPeriodDays: 3,
    minDepositAGT: 1000,
    timelockDelayHours: 48,
    proposalTypes: [
      'ComplianceRuleChange — update MRL threshold for a new market',
      'GasParameterChange — adjust baseFee or block gas limit',
      'ValidatorSetExpansion — add new authorized node operators',
      'ChainUpgrade — protocol upgrade (software version)',
      'TreasurySpend — ecosystem fund disbursement',
      'EmergencyHalt — emergency pause (2/3 validator supermajority)',
    ],
    specialRules: {
      apedaVetoRight: 'APEDA_OFFICER role holders have veto over ComplianceRuleChange proposals',
      emergencyCouncil: '5 of 7 platform admin multisig can halt chain immediately',
    },
    quorum: 10,
    passThreshold: 51,
    votingPeriod: 7,
    vetoEnabled: true,
    timelockDelay: 48,
    proposalThreshold: 1000,
    cancelThreshold: 33333,
    emergencyDao: '5-of-7-multisig',
  },
  perLotFee: {
    amountINR: 250,
    gstPercent: 18,
    totalINR: 295,
    paymentMethods: ['UPI', 'NEFT', 'CRYPTO-AGT'],
    feeBreakdown: {
      platformOperations: '60%',
      validatorRewardPool: '20%',
      ecosystemFarmerFund: '10%',
      reserve: '10%',
    },
    bulkDiscounts: {
      '10-50 lots/month':   '5% discount',
      '51-200 lots/month':  '10% discount',
      '200+ lots/month':    '15% discount',
      'FPO members':        'additional 5% discount',
    },
  },
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  STEP 4 — INTEGRATIONS (20 integrations)                          */
/* ═══════════════════════════════════════════════════════════════════ */

const INTEGRATIONS = {
  configs: {
    /* 1 */ s3: {
      enabled: true, environment: 'prod',
      credentials: {},
      settings: { bucket:'agrotrace-docs-prod', region:'ap-south-1', encryption:'SSE-KMS', purpose:'Primary document storage for all PDFs (lab reports, certs, B/L)' },
    },
    /* 2 */ pinata: {
      enabled: true, environment: 'prod',
      credentials: {},
      settings: { gateway:'gateway.pinata.cloud', redundancyPins:3, purpose:'Pin document hashes on IPFS for permanent public reference' },
    },
    /* 3 */ resend: {
      enabled: true, environment: 'prod',
      credentials: {},
      settings: { fromEmail:'alerts@agrotrace.in', domain:'agrotrace.in', purpose:'Primary transactional email — stage alerts, breach notifications' },
    },
    /* 4 */ sendgrid: {
      enabled: true, environment: 'prod',
      credentials: {},
      settings: { fromEmail:'noreply@agrotrace.in', purpose:'Backup email provider for high-volume or Resend failure' },
    },
    /* 5 */ twilio: {
      enabled: true, environment: 'prod',
      credentials: {},
      settings: { whatsAppEnabled:true, purpose:'SMS and WhatsApp alerts for farmers (many without email)' },
    },
    /* 6 */ razorpay: {
      enabled: true, environment: 'prod',
      credentials: {},
      settings: { currency:'INR', upiEnabled:true, netBankingEnabled:true, purpose:'Platform fee collection from Indian exporters' },
    },
    /* 7 */ stripe: {
      enabled: true, environment: 'prod',
      credentials: {},
      settings: { currency:'USD', webhookEnabled:true, purpose:'Platform fee from foreign buyers (USD/EUR)' },
    },
    /* 8 */ mixpanel: {
      enabled: true, environment: 'prod',
      credentials: {},
      settings: { trackAnonymous:false, serverSideOnly:true, purpose:'Supply chain funnel analytics — stage conversion, rejection rates, avg time per stage' },
    },
    /* 9 */ segment: {
      enabled: true, environment: 'prod',
      credentials: {},
      settings: { destinations:['Mixpanel','BigQuery'], purpose:'Event tracking for platform usage, actor onboarding funnel, API usage analytics' },
    },
    /* 10 */ alchemy: {
      enabled: true, environment: 'prod',
      credentials: {},
      settings: { network:'agrotrace-supply-chain-1', retryPolicy:'exponential', purpose:'Real-time on-chain event delivery to downstream systems (buyer ERP, APEDA dashboard)' },
    },
    /* 11 — custom: Chainalysis AML */ chainalysis: {
      enabled: true, environment: 'prod',
      credentials: {},
      settings: { provider:'chainalysis-kyt', screenOnTransact:true, recheckIntervalDays:180, purpose:'AML/sanctions screening of new actor wallets on registration' },
    },
    /* 12 — custom: APEDA AgriExchange API */ apeda_agriexchange: {
      enabled: true, environment: 'prod',
      credentials: {},
      settings: { authType:'API-KEY', purpose:'Validate APEDA registration numbers, fetch exporter data from AgriExchange' },
    },
    /* 13 — custom: ICEGATE API */ icegate_api: {
      enabled: true, environment: 'prod',
      credentials: {},
      settings: { authType:'CBIC-credentials', purpose:'Validate Shipping Bill numbers, retrieve LEO status from ICEGATE' },
    },
    /* 14 — custom: NPPO India / DPPQ */ nppo_dppq: {
      enabled: true, environment: 'prod',
      credentials: {},
      settings: { manualFallback:true, purpose:'Validate phytosanitary certificate numbers against DPPQ official registry' },
    },
    /* 15 — custom: CloudWatch + ELK */ cloudwatch_elk: {
      enabled: true, environment: 'prod',
      credentials: {},
      settings: { retentionYears:2, alertsEnabled:true, purpose:'Centralized log aggregation, chain event logs, API access logs (regulatory requirement)' },
    },
    /* 16 — custom: Prometheus + Grafana */ prometheus_grafana: {
      enabled: true, environment: 'prod',
      credentials: {},
      settings: { alertManagerEnabled:true, sla:'99.9% uptime', purpose:'Real-time validator health, block time, tx throughput, IoT ingestion rates' },
    },
    /* 17 — custom: PagerDuty */ pagerduty: {
      enabled: true, environment: 'prod',
      credentials: {},
      settings: { escalationPolicy:'24/7-on-call-rotation', purpose:'Critical alerts — temperature breach >5°C, chain halt, validator down' },
    },
    /* 18 — custom: DocuSign */ docusign: {
      enabled: true, environment: 'prod',
      credentials: {},
      settings: { signerAuth:'email', auditTrail:true, purpose:'Fallback document signing for actors who cannot use wallet signatures (small farmers via PoA)' },
    },
    /* 19 — custom: Sumsub KYC */ sumsub: {
      enabled: true, environment: 'prod',
      credentials: {},
      settings: { level:'basic', livenessCheck:true, purpose:'KYC/identity verification for non-APEDA actors (foreign buyers, arbitrators)' },
    },
    /* 20 — custom: AWS KMS */ aws_kms: {
      enabled: true, environment: 'prod',
      credentials: {},
      settings: { keyRotationDays:365, multiRegion:true, purpose:'Platform signing keys for audit trail PDFs, certificate NFT metadata, chain signing' },
    },
  },
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  SEED MAIN                                                         */
/* ═══════════════════════════════════════════════════════════════════ */

async function seed() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) throw new Error('DATABASE_URL not set in .env.local');
  const dbUrl = rawUrl.replace(/[&?]channel_binding=[^&]*/g, '').replace(/\?&/, '?');

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Connected to database.');

  /* ── 1. Get or create bharat@cerulea.io user ── */
  let userId;
  const userRes = await client.query('SELECT id FROM users WHERE email = $1', [EMAIL]);
  if (userRes.rows.length) {
    userId = userRes.rows[0].id;
    console.log(`User found: ${userId}`);
  } else {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('bharat1234', 10);
    userId = crypto.randomUUID();
    const profileId = crypto.randomUUID();
    const subId = crypto.randomUUID();
    const nowUser = new Date().toISOString().split('.')[0] + 'Z';
    await client.query(
      `INSERT INTO users (id, email, "hashedPassword", name, "isTestAccount", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 'true', $5, $5)`,
      [userId, EMAIL, hashedPassword, 'Bharat Agrotrace', nowUser]
    );
    await client.query(
      `INSERT INTO profiles (id, "userId", "displayName", "createdAt") VALUES ($1, $2, $3, $4)`,
      [profileId, userId, 'Bharat Agrotrace', nowUser]
    );
    await client.query(
      `INSERT INTO subscriptions (id, "userId", plan, status, "createdAt", "updatedAt")
       VALUES ($1, $2, 'pro', 'active', $3, $3)`,
      [subId, userId, nowUser]
    );
    console.log(`User created: ${userId} (password: bharat1234, plan: pro)`);
  }

  /* ── 2. Get or create workspace ── */
  let workspaceId;
  const wsRes = await client.query('SELECT id FROM workspaces WHERE name = $1', [WORKSPACE_NAME]);
  if (wsRes.rows.length) {
    workspaceId = wsRes.rows[0].id;
    console.log(`Workspace found: ${workspaceId}`);
  } else {
    workspaceId = crypto.randomUUID();
    await client.query(
      `INSERT INTO workspaces (id, name) VALUES ($1, $2)`,
      [workspaceId, WORKSPACE_NAME]
    );
    console.log(`Workspace created: ${workspaceId}`);
  }

  /* ── 3. Delete existing project (idempotency) ── */
  const existingRes = await client.query('SELECT id FROM projects WHERE slug = $1 AND "userId" = $2', [PROJECT_SLUG, userId]);
  if (existingRes.rows.length) {
    const existingId = existingRes.rows[0].id;
    await client.query('DELETE FROM drafts WHERE "projectId" = $1', [existingId]);
    await client.query('DELETE FROM projects WHERE id = $1', [existingId]);
    console.log(`Existing project deleted (id: ${existingId})`);
  }

  /* ── 4. Create project with all step data ── */
  const projectId = crypto.randomUUID();
  const now = new Date().toISOString().replace('T', 'T').split('.')[0] + 'Z';

  await client.query(
    `INSERT INTO projects (
       id, name, slug, description, "projectType", "workspaceId", "userId",
       "selectedTemplateIds", blueprint, "schemaJson", "logicJson", economics,
       "legacyMode", status, "createdAt", "updatedAt"
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15)`,
    [
      projectId,
      PROJECT_NAME,
      PROJECT_SLUG,
      'Production-grade permissioned blockchain for Indian mango export supply chain. Covers 4 GI-tagged varieties across 14 stages from farm registration to foreign buyer acceptance, with full APEDA, NPPO India, ICEGATE, and destination-country compliance.',
      'blockchain',
      workspaceId,
      userId,
      JSON.stringify([]),
      JSON.stringify(BLUEPRINT),
      JSON.stringify(SCHEMA),
      JSON.stringify(LOGIC),
      JSON.stringify(ECONOMICS),
      'none',
      'draft',
      now,
    ]
  );
  console.log(`Project created: ${projectId}`);

  /* ── 5. Create step4 integrations draft ── */
  const draftId = `${projectId}::step4`;
  await client.query(
    `INSERT INTO drafts (id, "projectId", data, "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$4)`,
    [draftId, projectId, JSON.stringify({ step: 4, payload: INTEGRATIONS }), now]
  );
  console.log(`Step4 integrations draft created: ${draftId}`);

  await client.end();

  console.log('\n✅ AgroTrace (Mango Module) seeded successfully!\n');
  console.log('  Project Name :', PROJECT_NAME);
  console.log('  Project Slug :', PROJECT_SLUG);
  console.log('  Project ID   :', projectId);
  console.log('  Workspace    :', WORKSPACE_NAME, `(${workspaceId})`);
  console.log('  Owner        :', EMAIL);
  console.log('\n  Studio Steps pre-populated:');
  console.log(`  Step 1 Blueprint  : ${MODULES.length} modules, ${EDGES.length} graph edges`);
  console.log(`  Step 2 Schema     : ${ENTITIES.length} entities`);
  console.log(`  Step 2 Behavior   : ${FLOWS.length} automation flows`);
  console.log('  Step 3 Economics  : AGT token 100M supply · EIP-1559 gas · 21-validator staking · token-weighted governance');
  console.log(`  Step 4 Integrations: ${Object.keys(INTEGRATIONS.configs).length} integrations configured`);
  console.log('\n  Open Studio → look for "AgroTrace (Mango Module)" in your projects.');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
