/**
 * AgroTrace - Studio Step 1 (Blueprint): modules, edges and graph.
 * Chain: AgroChain (agrotrace-1) - internal permissioned ledger.
 * No cryptocurrency, no gas, no external wallet.
 * Exports: { MODULES, EDGES, BLUEPRINT }
 */

/* ─────────────────────────── Shared spec constants ─────────────────────────── */

const USER_ROLES = [
  'PLATFORM_ADMIN', 'EXPORTER', 'FARMER', 'LABORATORY', 'PACKHOUSE', 'TREATMENT_FACILITY',
  'NPPO_INSPECTOR', 'APEDA_OFFICER', 'CUSTOMS_BROKER', 'COLD_STORAGE', 'FREIGHT_FORWARDER',
  'SHIPPING_LINE', 'PORT_ARRIVAL', 'IMPORT_CUSTOMS', 'BUYER', 'BOILING_UNIT', 'DRYING_YARD',
  'POLISHING_MILL', 'COMMISSION_AGENT', 'PROCESSING_UNIT', 'SPICES_BOARD_OFFICER',
];

const CHAIN_TX_TYPES = [
  'LOT_REGISTERED', 'RESIDUE_TEST_RECORDED', 'SHIPMENT_CREATED', 'EVENT_RECORDED',
  'CERTIFICATE_ANCHORED', 'CUSTODY_TRANSFERRED', 'BREACH_RECORDED', 'DISPUTE_INITIATED',
  'DISPUTE_RESOLVED', 'COMPLIANCE_OVERRIDE',
];

const SHIPMENT_STATUSES = [
  'REGISTERED', 'RESIDUE_TESTED', 'PACKHOUSE_PROCESSED', 'TREATED', 'PHYTO_CLEARED',
  'APEDA_CERTIFIED', 'CUSTOMS_CLEARED', 'IN_COLD_STORAGE', 'WITH_FORWARDER', 'VESSEL_LOADED',
  'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'DISPUTED', 'DISPUTE_RESOLVED',
];

const LOT_STATUSES = [
  'REGISTERED', 'RESIDUE_TEST_PASSED', 'RESIDUE_TEST_FAILED', 'RESIDUE_TEST_CONDITIONAL', 'IN_SHIPMENT',
];

const CERTIFICATE_TYPES = [
  'PHYTOSANITARY', 'CERTIFICATE_OF_ORIGIN', 'EXPORT_INSPECTION', 'FUMIGATION',
  'TREATMENT', 'BILL_OF_LADING', 'OTHER',
];

const MRL_STANDARDS = ['FSSAI', 'EU', 'JAPAN', 'CODEX', 'CUSTOM'];

const LOCALES = ['en', 'hi', 'bn', 'gu', 'kn', 'mr', 'pa', 'ta', 'te'];

const VALIDATOR_NODES = [
  { nodeKey: 'agrochain-mumbai-1', location: 'Mumbai' },
  { nodeKey: 'agrochain-singapore-1', location: 'Singapore' },
  { nodeKey: 'agrochain-node-3', location: 'Chennai' },
  { nodeKey: 'agrochain-node-4', location: 'Kochi' },
  { nodeKey: 'agrochain-node-5', location: 'Rotterdam' },
];

const NODE_KEYS = VALIDATOR_NODES.map(n => n.nodeKey);

/* Turmeric profile - 16 stages, dry spice, no cold chain. */
const TURMERIC_STAGES = [
  { n: 1,  role: 'FARMER',               stage: 'Register lot',            event: 'LOT_REGISTERED' },
  { n: 2,  role: 'LABORATORY',           stage: 'Residue test',            event: 'RESIDUE_TEST_RECORDED', status: 'RESIDUE_TESTED' },
  { n: 3,  role: 'BOILING_UNIT',         stage: 'Boiling and curing',      event: 'CURING_COMPLETED' },
  { n: 4,  role: 'DRYING_YARD',          stage: 'Drying',                  event: 'DRYING_COMPLETED' },
  { n: 5,  role: 'POLISHING_MILL',       stage: 'Polishing',               event: 'POLISHING_COMPLETED' },
  { n: 6,  role: 'COMMISSION_AGENT',     stage: 'Mandi first sale',        event: 'MANDI_FIRST_SALE' },
  { n: 7,  role: 'PROCESSING_UNIT',      stage: 'Sterilise and grind',     event: 'STERILISATION_GRINDING_COMPLETED' },
  { n: 8,  role: 'LABORATORY',           stage: 'Quality assay',           event: 'LAB_ASSAY_COMPLETED' },
  { n: 9,  role: 'SPICES_BOARD_OFFICER', stage: 'Export certification',    event: 'SPICES_BOARD_REGISTRATION_ISSUED' },
  { n: 10, role: 'EXPORTER',             stage: 'Book export',             event: 'EXPORT_BOOKED' },
  { n: 11, role: 'FREIGHT_FORWARDER',    stage: 'Forwarder handoff',       event: 'FREIGHT_HANDOFF', status: 'WITH_FORWARDER' },
  { n: 12, role: 'CUSTOMS_BROKER',       stage: 'Export clearance',        event: 'CUSTOMS_CLEARED', status: 'CUSTOMS_CLEARED' },
  { n: 13, role: 'SHIPPING_LINE',        stage: 'Vessel loading',          event: 'VESSEL_LOADED', status: 'VESSEL_LOADED' },
  { n: 14, role: 'PORT_ARRIVAL',         stage: 'Arrival',                 event: 'VESSEL_ARRIVED', status: 'ARRIVED' },
  { n: 15, role: 'IMPORT_CUSTOMS',       stage: 'Import clearance',        event: 'IMPORT_CLEARED' },
  { n: 16, role: 'BUYER',                stage: 'Receipt and acceptance',  event: 'BUYER_ACCEPTANCE', status: 'DELIVERED' },
];

/* Mango profile - 12 stages, cold chain (reefer), vapour heat treatment. */
const MANGO_STAGES = [
  { n: 1,  role: 'FARMER',             stage: 'Register lot',               event: 'LOT_REGISTERED' },
  { n: 2,  role: 'LABORATORY',         stage: 'Residue test',               event: 'RESIDUE_TEST_RECORDED', status: 'RESIDUE_TESTED' },
  { n: 3,  role: 'PACKHOUSE',          stage: 'Grading and packing',        event: 'PACKHOUSE_PROCESSED', status: 'PACKHOUSE_PROCESSED' },
  { n: 4,  role: 'TREATMENT_FACILITY', stage: 'Vapour heat treatment',      event: 'TREATMENT_COMPLETED', status: 'TREATED' },
  { n: 5,  role: 'NPPO_INSPECTOR',     stage: 'Phytosanitary certificate',  event: 'PHYTO_CERTIFICATE_ISSUED', status: 'PHYTO_CLEARED' },
  { n: 6,  role: 'APEDA_OFFICER',      stage: 'Certificate of Origin and export inspection', events: ['COO_ISSUED', 'EXPORT_INSPECTION_ISSUED'], status: 'APEDA_CERTIFIED' },
  { n: 7,  role: 'CUSTOMS_BROKER',     stage: 'Export clearance',           event: 'CUSTOMS_CLEARED', status: 'CUSTOMS_CLEARED' },
  { n: 8,  role: 'COLD_STORAGE',       stage: 'Reefer custody',             event: 'COLD_STORAGE_ENTRY', status: 'IN_COLD_STORAGE' },
  { n: 9,  role: 'FREIGHT_FORWARDER',  stage: 'Custody transfer',           event: 'CUSTODY_TRANSFER', status: 'WITH_FORWARDER' },
  { n: 10, role: 'SHIPPING_LINE',      stage: 'Vessel loading',             event: 'VESSEL_LOADED', status: 'VESSEL_LOADED' },
  { n: 11, role: 'BUYER',              stage: 'Arrival',                    event: 'BUYER_ARRIVAL', status: 'ARRIVED' },
  { n: 12, role: 'BUYER',              stage: 'Acceptance',                 event: 'BUYER_ACCEPTANCE', status: 'DELIVERED' },
];

const GENESIS_PREVIOUS_BLOCK_HASH = '0'.repeat(64);

/* ═══════════════════════════════════════════════════════════════════ */
/*  STEP 1 - BLUEPRINT (58 modules)                                    */
/* ═══════════════════════════════════════════════════════════════════ */

const MODULES = [
  /* ── Chain core ── */
  { moduleId:'consensus',          title:'Consensus Engine',            group:'core-protocol',        config:{ type:'ibft', blockTimeMs:5000 } },
  { moduleId:'validators',         title:'Validators and Staking',      group:'economics-staking',    config:{ validatorSetType:'static', minStakeAmount:0, unbondingDays:0 } },
  { moduleId:'genesis',            title:'Genesis Configurator',        group:'state-genesis',        config:{ prefundedAccounts:[], allocations:[] } },
  { moduleId:'node-permissioning', title:'Node Permissioning',          group:'networking-security',  config:{ allowedNodeKeys: NODE_KEYS } },
  { moduleId:'mempool-policy',     title:'Mempool Policy',              group:'Core Architecture',    config:{ minGasPriceGwei:0, replaceByFee:false, minDelaySeconds:5, maxDelaySeconds:20, selection:'randomised', gasless:true, badge:{ pending:'amber', finalised:'green' } } },
  { moduleId:'p2p',                title:'P2P Networking',              group:'core-protocol',        config:{ maxPeers:24, gossipMaxSizeKb:512 } },
  { moduleId:'p2p-tls',            title:'P2P TLS',                     group:'networking-security',  config:{ caBundleSecret:'AGROCHAIN_P2P_CA_BUNDLE', certificateSecret:'AGROCHAIN_P2P_CERT', privateKeySecret:'AGROCHAIN_P2P_KEY' } },
  { moduleId:'rpc',                title:'RPC API',                     group:'apis-devex',           config:{ publicMethods:['agrochain_getBlockByNumber','agrochain_getBlockByHash','agrochain_getTransaction','agrochain_getLotTrace','agrochain_verifyDocumentHash','agrochain_getValidators'], privateMethods:['agrochain_submitTransaction','agrochain_anchorCertificate','agrochain_recordBreach','agrochain_transferCustody'], rateLimitRps:50 } },
  { moduleId:'ws-subscriptions',   title:'WebSocket Subscriptions',     group:'apis-devex',           config:{ maxSubscribers:2000 } },
  { moduleId:'graphql-gateway',    title:'GraphQL Gateway',             group:'apis-devex',           config:{ playground:false } },
  { moduleId:'api-gateway',        title:'API Gateway',                 group:'Networking & APIs',    config:{ requireApiKey:true, burst:100, ratePerSecond:20, auth:'jwt-access+refresh', tenantIsolation:true, appUrl:'https://agrotrace.cerulea.io', platformUrl:'https://cerulea.io', vendorUrl:'https://cbytechains.com', publicRoutes:['/verify/:lotId','/verify/:shipmentId'] } },
  { moduleId:'explorer',           title:'Block Explorer',              group:'exploration-ui',       config:{ enableAddressLabels:true } },
  { moduleId:'kms-signing',        title:'KMS / HSM Signing',           group:'security-compliance',  config:{ provider:'aws-kms', keyAlias:'agrotrace/platform-signing' } },
  { moduleId:'tx-access-policy',   title:'Transaction Access Policy',   group:'access-control',       config:{ defaultPolicy:'allowlist', governanceRequired:false, emergencyOverrideMultisig:4 } },
  { moduleId:'emergency-brake',    title:'Governance Emergency Brake',  group:'ops-compliance',       config:{ requiredSigners:4, totalSigners:5, autoExpiryHours:72, pauseTargets:['tx-type','tenant','address'] } },
  { moduleId:'chain-audit-export', title:'Chain Audit Export',          group:'ops-compliance',       config:{ exportFormats:['json','csv','pdf'], scheduledExport:true, exportIntervalDays:30, completenessProof:true } },

  /* ── Observability and operations ── */
  { moduleId:'metrics-dashboards', title:'Metrics & Dashboards',        group:'observability-ops',    config:{ scrapeIntervalSec:15 } },
  { moduleId:'log-shipping',       title:'Log Shipping',                group:'observability-ops',    config:{ endpoint:'https://logs.agrotrace.cerulea.io/ingest', retentionDays:2555 } },
  { moduleId:'backups-restore',    title:'Backups & Restore',           group:'observability-ops',    config:{ backupIntervalHours:6, maxGenerations:120 } },
  { moduleId:'health-probes',      title:'Health & Readiness Probes',   group:'observability-ops',    config:{ livenessIntervalSec:10, readinessIntervalSec:10 } },
  { moduleId:'alerts-paging',      title:'Alerts & Paging',             group:'observability-ops',    config:{ defaultChannel:'agrotrace-ops-oncall', quietHours:'' } },

  /* ── Identity and access ── */
  { moduleId:'rbac',               title:'Role-Based Access Control',   group:'identity-access',      config:{ defaultRoles: USER_ROLES, adminWallets:[], policyMode:'allowlist' } },
  { moduleId:'org-accounts',       title:'Organization Accounts',       group:'identity-access',      config:{ maxMembersDefault:50, inviteOnly:true, billingRequired:false } },
  { moduleId:'session-keys',       title:'Session Keys',                group:'identity-access',      config:{ defaultTtlMins:480, scopes:['record-event','upload-certificate','accept-handoff','read-queue'], maxActivePerUser:5 } },
  { moduleId:'rate-limit',         title:'Rate Limit',                  group:'compliance-safety',    config:{ defaultRps:20, burst:60 } },
  { moduleId:'wallet-auth',        title:'Wallet Authentication',       group:'identity-access',      config:{ mode:'wallet+session', sessionTtlMins:60, allowedWalletsPattern:'^0x[0-9a-fA-F]{40}$' } },
  { moduleId:'kyc',                title:'KYC / Identity Verification', group:'identity-access',      config:{ provider:'custom', level:'enhanced', recheckIntervalDays:365 } },
  { moduleId:'privacy-compliance', title:'Privacy & Compliance Guard',  group:'Security & Compliance',config:{ redactFields:['passwordHash','primaryContactPhone','primaryContactEmail','farmerName','gstin'], denyPatterns:['\\b\\d{12}\\b','\\b[A-Z]{5}\\d{4}[A-Z]\\b'], authTokens:'jwt-access+refresh', passwordHistoryDepth:5, loginThrottle:{ maxAttempts:5, lockoutMinutes:15 }, tenantIsolation:true, dataRetentionYears:7, encryption:{ atRest:true, inTransit:true } } },

  /* ── Supply chain domain ── */
  { moduleId:'traceability-ledger',    title:'Traceability Ledger',        group:'Supply Chain',       config:{ chainName:'AgroChain', chainId:'agrotrace-1', lotIdPattern:'LOT-<CODE>-YYYY-NNNN', commodityCodes:{ turmeric:'TURM', mango:'MANGO' }, profiles:[{ key:'turmeric', code:'TURM', stageCount:16, coldChain:false, stages: TURMERIC_STAGES }, { key:'mango', code:'MANGO', stageCount:12, coldChain:true, stages: MANGO_STAGES }], lotStatuses: LOT_STATUSES, shipmentStatuses: SHIPMENT_STATUSES, chainTxTypes: CHAIN_TX_TYPES, anchorEveryAction:true, autoConsignmentOnTurmericLot:true, twoPartyHandoff:{ enabled:true, acceptEvent:'HANDOFF_ACCEPTED', disputeEvent:'HANDOFF_DISPUTED', gateNextStage:true }, recordPermission:{ nonAdminRolesOnly:true, blockedStatuses:['DELIVERED','DISPUTE_RESOLVED'] }, tenantScoped:true } },
  { moduleId:'cold-chain-monitoring',  title:'Cold-Chain Monitoring',      group:'Supply Chain',       config:{ appliesToProfiles:['mango'], assetType:'reefer', temperatureCelsius:{ min:8, max:13, target:11 }, humidityPercent:{ min:85, max:95 }, samplingIntervalSecs:300, breachDetection:{ consecutiveSamples:2, setsHasBreach:true, chainTxType:'BREACH_RECORDED', notifyRoles:['EXPORTER','COLD_STORAGE','FREIGHT_FORWARDER','SHIPPING_LINE','BUYER'] }, telemetryTab:true, complianceScoreImpact:true } },
  { moduleId:'port-customs-events',    title:'Port & Customs Events',      group:'Supply Chain',       config:{ originEvents:['CUSTOMS_CLEARED','VESSEL_LOADED'], destinationEvents:['VESSEL_ARRIVED','BUYER_ARRIVAL','IMPORT_CLEARED'], letExportOrderBeforeLoading:true, roles:['CUSTOMS_BROKER','SHIPPING_LINE','PORT_ARRIVAL','IMPORT_CUSTOMS'], anchorAs:'EVENT_RECORDED', incoterms:['FOB','CIF','CFR','EXW'] } },
  { moduleId:'quality-recall-ledger',  title:'Quality & Recall Ledger',    group:'Supply Chain',       config:{ residueGating:{ mrlStandards: MRL_STANDARDS, results:['PASS','FAIL','CONDITIONAL_PASS','PENDING'], failBlocksExport:true, conditionalRequiresRetest:true }, complianceScore:{ enabled:true, min:0, max:100 }, breachFlag:'hasBreach', disputes:{ statuses:['OPEN','EXPORTER_RESPONDED','CLOSED'], outcomes:['EXPORTER_ACCEPTED','BUYER_ACCEPTED','PARTIAL_SETTLEMENT','REFERRED_TO_ARBITRATION'], initiateTx:'DISPUTE_INITIATED', resolveTx:'DISPUTE_RESOLVED', evidenceAttachments:true } } },
  { moduleId:'evidence-chain',         title:'Evidence Chain',             group:'Identity & Registry',config:{ chainName:'AgroChain', chainId:'agrotrace-1', hashAlgorithm:'SHA-256', txHash:'sha256(txData)', payloadHash:'sha256(payload)', blocks:{ hashLinked:true, storesPreviousBlockHash:true, merkleRootOfTransactions:true, producerNode:true, genesisPreviousBlockHash: GENESIS_PREVIOUS_BLOCK_HASH }, producerSelection:'round-robin', validatorCount:5, validators: VALIDATOR_NODES, consensusThreshold:4, blockStatuses:['PENDING_CONSENSUS','FINALISED'], finalisationRule:'PENDING_CONSENSUS -> FINALISED at 4 of 5 attestations', transactionStatuses:['PENDING','CONFIRMED','FAILED'], signedActions:true, walletAddressFormat:'0x + 40 hex (deterministic per participant)', noCryptocurrency:true, noGas:true, noExternalWallet:true } },
  { moduleId:'compliance-attestations',title:'Compliance Attestations',    group:'Compliance',         config:{ authorities:['NPPO-India','APEDA','Spices Board of India','FSSAI','Indian Customs'], attestationStages:{ mango:['PHYTO_CERTIFICATE_ISSUED','COO_ISSUED','EXPORT_INSPECTION_ISSUED'], turmeric:['SPICES_BOARD_REGISTRATION_ISSUED','LAB_ASSAY_COMPLETED'] }, complianceMatrixEditor:true, perCommodityChecklist:true, blocksExportOnMissing:true, anchorAs:'CERTIFICATE_ANCHORED' } },
  { moduleId:'provenance-notary',      title:'Provenance Notary',          group:'Identity & Registry',config:{ hashAlgorithm:'SHA-256', anchorOnChain:true, anchorTxType:'CERTIFICATE_ANCHORED', verifyFileAgainstLedger:true, publicVerifyPage:{ enabled:true, qrCode:true, requiresLogin:false, shows:['journey','certificates','compliance scorecard'] } } },
  { moduleId:'produce-grades',         title:'Produce Grades & Certificates',group:'Agriculture',      config:{ commodities:{ mango:{ varieties:['ALPHONSO','KESAR','BANGANAPALLI','DASHERI'], unitTypes:['CARTONS','CRATES'] }, turmeric:{ unitTypes:['BAGS'] } }, unitTypes:['CARTONS','CRATES','BAGS'], certificateTypes: CERTIFICATE_TYPES, gradingStage:{ mango:'PACKHOUSE_PROCESSED', turmeric:'LAB_ASSAY_COMPLETED' } } },
  { moduleId:'trade-finance-docs',     title:'Trade Finance Documents',    group:'Trade & Commerce',   config:{ documents:['PHYTOSANITARY','CERTIFICATE_OF_ORIGIN','EXPORT_INSPECTION','TREATMENT','FUMIGATION','BILL_OF_LADING'], incoterms:['FOB','CIF','CFR','EXW'], hashBeforeAnchor:'SHA-256', anchorAs:'CERTIFICATE_ANCHORED', noPaymentRails:true } },
  { moduleId:'ent-workflow',           title:'Workflow Engine',            group:'workflow',           config:{ statusMachine:{ shipmentStatuses: SHIPMENT_STATUSES, eventToStatus:'per commodity profile (Section 5)' }, queuesDrivenByStatus:true, recordFlow:'queue -> record modal -> submit and anchor', gates:['residue-test-passed','two-party-handoff-accepted','compliance-checklist-complete'], twoPartyHandoff:{ acceptEvent:'HANDOFF_ACCEPTED', disputeEvent:'HANDOFF_DISPUTED', coSignOnChain:true }, profileScoped:true, perRoleDashboards:true } },
  { moduleId:'ent-document-registry',  title:'Document & Asset Registry',  group:'registry',           config:{ hashAlgorithm:'SHA-256', storesHashOnChain:true, documentKeyField:'documentS3Key', documentHashField:'documentHash', types: CERTIFICATE_TYPES, disputeEvidence:true, auditTrailPdfPerShipment:true, retentionYears:7 } },

  /* ── Data, IoT and indexing ── */
  { moduleId:'iot-device-registry',    title:'IoT Device Registry',        group:'telecom-iot',        config:{ maxFleetSize:5000, firmwareUpdatePolicy:'manual', credentialRotationDays:90 } },
  { moduleId:'oracles',                title:'Oracle Feeds',               group:'Oracles',            config:{ feeds:[{ key:'reefer-telemetry', source:'iot-device-registry', fields:['temperatureCelsius','humidityPercent','recordedAt'], intervalSecs:300 }, { key:'customs-events', source:'port-customs-events', fields:['eventType','portCode','clearedAt'] }], signedByPlatform:true, writesTo:'onchain-data' } },
  { moduleId:'onchain-data',           title:'On-chain Data Models',       group:'data-logic',         config:{ structures:['lot','residue-test','shipment','chain-event','certificate','custody-handoff','breach','dispute','block','transaction'] } },
  { moduleId:'subgraph-indexer',       title:'Subgraph Indexer',           group:'data-logic',         config:{ endpoint:'https://index.agrotrace.cerulea.io/agrochain', entities:['Block','Transaction','Lot','ResidueTest','Shipment','ChainEvent','Certificate','Breach','Dispute','ValidatorNode'] } },
  { moduleId:'search-fulltext',        title:'Full-text Search',           group:'data-logic',         config:{ engine:'meilisearch' } },
  { moduleId:'scheduler',              title:'Scheduler (Cron/Delayed Jobs)',group:'DevEx',            config:{ tz:'Asia/Kolkata', jobs:['mempool-drain-5-to-20s','cold-chain-breach-sweep','compliance-score-recompute','audit-trail-export','certificate-expiry-reminder'] } },
  { moduleId:'realtime-pubsub',        title:'Realtime Pub/Sub',           group:'Messaging & Realtime',config:{ transport:'ws', channels:['chain.block.finalised','chain.tx.confirmed','shipment.status','coldchain.telemetry','coldchain.breach','handoff.pending'] } },
  { moduleId:'webhooks-outbound',      title:'Outbound Webhooks',          group:'Integrations',       config:{ maxRetries:10, backoff:'exponential', signPayloads:true, signatureAlgorithm:'HMAC-SHA256', events:['lot.registered','residue.test.recorded','shipment.status.changed','certificate.anchored','custody.transferred','breach.recorded','dispute.initiated','dispute.resolved'] } },
  { moduleId:'webhooks-inbound',       title:'Inbound Webhooks',           group:'Integrations',       config:{ hmacSecret:'AGROTRACE_INBOUND_WEBHOOK_SECRET', signatureAlgorithm:'HMAC-SHA256', sources:['reefer-telemetry','customs-clearance','lab-report'], maxBatchSize:500 } },

  /* ── Compliance, comms and content ── */
  { moduleId:'audit-logs',             title:'Audit Logs',                 group:'compliance-safety',  config:{ retentionDays:2555 } },
  { moduleId:'notifications',          title:'Notifications',              group:'comms-engagement',   config:{ inApp:true, push:true } },
  { moduleId:'emails',                 title:'Transactional Emails',       group:'comms-engagement',   config:{ fromAddress:'no-reply@agrotrace.cerulea.io', templateEngine:'mjml' } },
  { moduleId:'twilio-adapter',         title:'Twilio Adapter',             group:'integrations',       config:{ accountSidSecret:'AGROTRACE_TWILIO_ACCOUNT_SID', authTokenSecret:'AGROTRACE_TWILIO_AUTH_TOKEN', fromNumber:'' } },
  { moduleId:'push-adapters',          title:'Push Notifications (FCM/APNs)',group:'Messaging & Realtime',config:{ provider:'fcm', pwa:true, topics:['queue.assigned','handoff.pending','coldchain.breach','dispute.opened'] } },
  { moduleId:'chat',                   title:'Chat and Messaging',         group:'comms-engagement',   config:{ maxMembersPerChannel:25, moderationLevel:'strict' } },
  { moduleId:'document-signing',       title:'Document Signing',           group:'Integrations',       config:{ provider:'docusign', hashBeforeSign:'SHA-256', coSignHandoff:true, anchorSignedHash:true } },
  { moduleId:'asset-storage',          title:'Asset Storage (S3/Local)',   group:'Storage',            config:{ provider:'s3', bucket:'agrotrace-documents', keyPattern:'<tenantId>/<commodityKey>/<recordType>/<recordId>', hashOnUpload:'SHA-256', encryptionAtRest:true, retentionYears:7 } },
  { moduleId:'i18n',                   title:'Internationalization (i18n)',group:'DevEx',              config:{ defaultLocale:'en', supportedLocales: LOCALES, localeNames:{ en:'English', hi:'Hindi', bn:'Bengali', gu:'Gujarati', kn:'Kannada', mr:'Marathi', pa:'Punjabi', ta:'Tamil', te:'Telugu' }, pwa:true, mobileFirst:true } },
  { moduleId:'theme-branding',         title:'Theme and Branding',         group:'content-ui',         config:{ brandName:'AgroTrace - a product of Caerulean Bytechains Private Limited, built on Cerulea' } },
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
  /* Chain core */
  ['p2p-tls','p2p','calls'],
  ['node-permissioning','p2p','calls'],
  ['p2p','consensus','feeds'],
  ['consensus','validators','reads'],
  ['genesis','consensus','feeds'],
  ['mempool-policy','consensus','feeds'],
  ['consensus','onchain-data','writes'],
  ['kms-signing','consensus','calls'],
  ['kms-signing','provenance-notary','calls'],
  ['rpc','explorer','feeds'],
  ['graphql-gateway','explorer','feeds'],
  ['ws-subscriptions','explorer','feeds'],
  ['api-gateway','explorer','feeds'],
  /* Identity and access */
  ['wallet-auth','rbac','triggers'],
  ['wallet-auth','session-keys','feeds'],
  ['session-keys','api-gateway','feeds'],
  ['rbac','api-gateway','feeds'],
  ['rbac','org-accounts','reads'],
  ['org-accounts','kyc','reads'],
  ['kyc','rbac','feeds'],
  ['rbac','tx-access-policy','feeds'],
  ['tx-access-policy','mempool-policy','feeds'],
  ['tx-access-policy','api-gateway','feeds'],
  ['rate-limit','api-gateway','feeds'],
  ['privacy-compliance','audit-logs','reads'],
  /* Supply chain domain */
  ['traceability-ledger','onchain-data','writes'],
  ['traceability-ledger','audit-logs','feeds'],
  ['traceability-ledger','evidence-chain','feeds'],
  ['traceability-ledger','notifications','triggers'],
  ['traceability-ledger','subgraph-indexer','feeds'],
  ['traceability-ledger','webhooks-outbound','triggers'],
  ['traceability-ledger','ent-workflow','feeds'],
  ['ent-workflow','traceability-ledger','triggers'],
  ['produce-grades','traceability-ledger','reads'],
  ['quality-recall-ledger','traceability-ledger','feeds'],
  ['quality-recall-ledger','evidence-chain','feeds'],
  ['quality-recall-ledger','notifications','triggers'],
  ['port-customs-events','traceability-ledger','feeds'],
  ['port-customs-events','trade-finance-docs','reads'],
  ['port-customs-events','compliance-attestations','feeds'],
  ['trade-finance-docs','ent-document-registry','writes'],
  ['trade-finance-docs','provenance-notary','calls'],
  ['provenance-notary','onchain-data','writes'],
  ['provenance-notary','document-signing','calls'],
  ['compliance-attestations','evidence-chain','feeds'],
  ['compliance-attestations','traceability-ledger','writes'],
  ['evidence-chain','onchain-data','writes'],
  ['evidence-chain','audit-logs','feeds'],
  ['evidence-chain','chain-audit-export','feeds'],
  /* IoT and cold chain */
  ['iot-device-registry','oracles','feeds'],
  ['iot-device-registry','metrics-dashboards','feeds'],
  ['oracles','cold-chain-monitoring','feeds'],
  ['cold-chain-monitoring','traceability-ledger','writes'],
  ['cold-chain-monitoring','onchain-data','writes'],
  ['cold-chain-monitoring','alerts-paging','triggers'],
  ['cold-chain-monitoring','notifications','triggers'],
  ['cold-chain-monitoring','realtime-pubsub','feeds'],
  /* Documents and storage */
  ['ent-document-registry','asset-storage','writes'],
  ['ent-document-registry','provenance-notary','calls'],
  ['ent-document-registry','search-fulltext','feeds'],
  ['document-signing','evidence-chain','feeds'],
  /* Data, indexing and APIs */
  ['onchain-data','subgraph-indexer','feeds'],
  ['subgraph-indexer','graphql-gateway','feeds'],
  ['subgraph-indexer','search-fulltext','feeds'],
  ['graphql-gateway','api-gateway','feeds'],
  ['api-gateway','rpc','calls'],
  ['api-gateway','ws-subscriptions','feeds'],
  ['ws-subscriptions','realtime-pubsub','feeds'],
  ['realtime-pubsub','notifications','feeds'],
  /* Communications */
  ['notifications','emails','calls'],
  ['notifications','push-adapters','calls'],
  ['notifications','twilio-adapter','calls'],
  ['notifications','webhooks-outbound','calls'],
  ['webhooks-inbound','oracles','feeds'],
  ['webhooks-inbound','api-gateway','calls'],
  ['chat','notifications','triggers'],
  /* Operations */
  ['metrics-dashboards','alerts-paging','triggers'],
  ['health-probes','alerts-paging','triggers'],
  ['log-shipping','metrics-dashboards','feeds'],
  ['log-shipping','backups-restore','feeds'],
  ['audit-logs','chain-audit-export','feeds'],
  ['alerts-paging','notifications','triggers'],
  ['scheduler','chain-audit-export','triggers'],
  /* Localisation, branding and governance */
  ['i18n','api-gateway','feeds'],
  ['theme-branding','api-gateway','feeds'],
  ['theme-branding','explorer','feeds'],
  ['emergency-brake','tx-access-policy','triggers'],
  ['emergency-brake','mempool-policy','triggers'],
  ['emergency-brake','alerts-paging','triggers'],
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

module.exports = { MODULES, EDGES, BLUEPRINT };
