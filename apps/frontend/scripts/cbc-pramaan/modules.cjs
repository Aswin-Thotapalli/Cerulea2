/**
 * CBC-PRAMAAN - Studio Step 1 (Blueprint): modules, edges and graph.
 * Cerulea Bytechains Compliance, Procurement Record And Make-in-India Assurance Network.
 * A PPP-MII compliance trust layer behind GeM, running on a Cerulea private permissioned chain.
 * Non-crypto: no tokens, no wallets, no gas, no staking, no payments, no mining.
 * Exports: { MODULES, EDGES, BLUEPRINT }
 */

const { MODULE_HOMES, E } = require('./_shared.cjs');

/* ─────────────────────────── Shared spec constants ─────────────────────────── */

/* Section 2 - roles and the 14 preset identities (ROLE-01 .. ROLE-08, ROLE-18). */
const ROLES = E.Role;

const PRESET_IDENTITIES = [
  { role: 'VENDOR',           id: 'bharat-precision-electronics',                    label: 'Bharat Precision Electronics' },
  { role: 'VENDOR',           id: 'deccan-systems',                                  label: 'Deccan Systems Pvt Ltd' },
  { role: 'VENDOR',           id: 'krishna-integrated-devices',                      label: 'Krishna Integrated Devices Ltd' },
  { role: 'VENDOR',           id: 'godavari-components',                             label: 'Godavari Components (Reseller)' },
  { role: 'VENDOR',           id: 'indus-global-traders',                            label: 'Indus Global Traders' },
  { role: 'VENDOR',           id: 'sabarmati-systems',                               label: 'Sabarmati Systems' },
  { role: 'VENDOR',           id: 'chambal-devices',                                 label: 'Chambal Devices' },
  { role: 'PROCURING_ENTITY', id: 'procuring-entity-1',                              label: 'Procuring Entity: Tender Committee' },
  { role: 'MINISTRY_ADMIN',   id: 'MeitY',                                           label: 'Nodal Ministry Admin: MeitY' },
  { role: 'MINISTRY_ADMIN',   id: 'DoT',                                             label: 'Nodal Ministry Admin: DoT' },
  { role: 'MINISTRY_ADMIN',   id: 'DPIIT',                                           label: 'Nodal Ministry Admin: DPIIT' },
  { role: 'DPIIT_ADMIN',      id: 'dpiit-national',                                  label: 'DPIIT Admin: National View' },
  { role: 'AUDIT',            id: 'cvc',                                             label: 'CVC / Audit' },
  { role: 'CA',               id: 'Sharma-and-Associates-FR-2201::ICAI-M-118824',    label: 'CA: Sharma and Associates' },
];

const ROLE_COLOUR_TOKENS = {
  VENDOR: 'series-1',
  PROCURING_ENTITY: 'series-2',
  MINISTRY_ADMIN: 'series-5',
  DPIIT_ADMIN: 'brand',
  AUDIT: 'series-6',
  CA: 'series-3',
};

/* ROLE-09 .. ROLE-16 - the complete read matrix enforced by canAccess (CHN-22). */
const ACCESS_RULES = [
  { id: 'ROLE-09', role: 'ANY',              rule: 'Any transaction with acl.public = true is readable by every identity.' },
  { id: 'ROLE-10', role: 'AUDIT',            rule: 'Reads every transaction on the ledger.' },
  { id: 'ROLE-11', role: 'DPIIT_ADMIN',      rule: 'Reads every transaction on the ledger.' },
  { id: 'ROLE-12', role: 'VENDOR',           rule: "Reads only when acl.vendorIds contains its id. A reseller's bid also lists the authorising OEM id." },
  { id: 'ROLE-13', role: 'CA',               rule: 'Reads only when acl.caIds contains its CA key.' },
  { id: 'ROLE-14', role: 'PROCURING_ENTITY', rule: 'Reads any transaction that has at least one tenderId in its ACL.' },
  { id: 'ROLE-15', role: 'MINISTRY_ADMIN',   rule: 'Reads only when acl.ministries contains its ministry name.' },
  { id: 'ROLE-16', role: 'ANONYMOUS',        rule: "Missing or invalid role/id resolves to VENDOR '__anonymous__', which sees public records only." },
];

/* Section 4.3 - DCF validator set (CHN-12). Zero stake, no token, no gas. */
const VALIDATORS = [
  { nodeId: 'validator-gem-gateway',    organisation: 'GeM API Gateway (CBC-PRAMAAN Integration)' },
  { nodeId: 'validator-dpiit',          organisation: 'DPIIT National Node' },
  { nodeId: 'validator-nodal-ministry', organisation: 'Nodal Ministry Rotating Seat' },
];

const VALIDATOR_NODE_IDS = VALIDATORS.map(v => v.nodeId);

/* Section 5.1 - the seven seeded rule rows. */
const SEEDED_RULES = [
  { hsnCode: '*',    hsnLabel: 'All other categories (DPIIT default)', ministry: 'DPIIT', classIThreshold: 50, classIIThreshold: 20, method: 'STANDARD',        para3A: false, pliLinked: false, effectiveDate: '2017-06-15', version: 1 },
  { hsnCode: '8471', hsnLabel: 'Computers / IT hardware',              ministry: 'MeitY', classIThreshold: 50, classIIThreshold: 20, method: 'COMPONENT_LEVEL', para3A: false, pliLinked: false, effectiveDate: '2021-02-01', version: 1 },
  { hsnCode: '8443', hsnLabel: 'Printers',                             ministry: 'MeitY', classIThreshold: 50, classIIThreshold: 20, method: 'STANDARD',        para3A: false, pliLinked: false, effectiveDate: '2021-02-01', version: 1 },
  { hsnCode: '8517', hsnLabel: 'Telecom equipment',                    ministry: 'DoT',   classIThreshold: 60, classIIThreshold: 20, method: 'STANDARD',        para3A: true,  pliLinked: false, effectiveDate: '2020-08-01', version: 1, raisedTo: { classIThreshold: 65, effectiveDate: '2026-07-01', version: 2 } },
  { hsnCode: '2523', hsnLabel: 'Cement',                               ministry: 'DPIIT', classIThreshold: 50, classIIThreshold: 20, method: 'STANDARD',        para3A: true,  pliLinked: false, effectiveDate: '2019-05-01', version: 1 },
  { hsnCode: '8523', hsnLabel: 'Software / recorded media',            ministry: 'MeitY', classIThreshold: 50, classIIThreshold: 20, method: 'CUSTOM',          para3A: false, pliLinked: false, effectiveDate: '2022-01-01', version: 1 },
  { hsnCode: '8544', hsnLabel: 'Cables',                               ministry: 'DPIIT', classIThreshold: 50, classIIThreshold: 20, method: 'STANDARD',        para3A: false, pliLinked: true,  effectiveDate: '2021-11-01', version: 1 },
];

/* ENT-03 - HSN 8471 component definitions (weights sum to 100). */
const HSN_8471_COMPONENTS = [
  { name: 'PCB/Motherboard',    weightPercent: 40, thresholdPercent: null, mustBeLocal: true },
  { name: 'Power Supply',       weightPercent: 15, thresholdPercent: 50,   mustBeLocal: false },
  { name: 'Enclosure/Chassis',  weightPercent: 10, thresholdPercent: 80,   mustBeLocal: false },
  { name: 'Assembly & Testing', weightPercent: 20, thresholdPercent: null, mustBeLocal: true },
  { name: 'Software/OS',        weightPercent: 15, thresholdPercent: null, mustBeLocal: false },
];

const HSN_8523_CUSTOM_RULE_TEXT =
  'For software products, local content shall be assessed based on the proportion of Indian development team person-hours to total person-hours, verified through project management records and HR documentation. No automated formula exists; the Tender Committee must manually validate against this rule text.';

/* Section 10.1 - master data (SIM-09: static, referenced by id in production). */
const SEED_VENDORS = [
  { vendorId: 'bharat-precision-electronics', legalName: 'Bharat Precision Electronics', type: 'OEM',      isMSE: true,  udyamRegistrationNumber: 'UDYAM-TN-03-0001234' },
  { vendorId: 'deccan-systems',               legalName: 'Deccan Systems Pvt Ltd',       type: 'OEM',      isMSE: false },
  { vendorId: 'krishna-integrated-devices',   legalName: 'Krishna Integrated Devices Ltd', type: 'OEM',    isMSE: false },
  { vendorId: 'godavari-components',          legalName: 'Godavari Components',          type: 'RESELLER', isMSE: true,  oemReference: 'krishna-integrated-devices' },
  { vendorId: 'indus-global-traders',         legalName: 'Indus Global Traders',         type: 'OEM',      isMSE: false },
  { vendorId: 'sabarmati-systems',            legalName: 'Sabarmati Systems',            type: 'OEM',      isMSE: false },
  { vendorId: 'chambal-devices',              legalName: 'Chambal Devices',              type: 'OEM',      isMSE: false },
];

const SEED_TENDERS = [
  { tenderId: 'T-001', title: 'Desktop computers, 1000 units', hsnCode: '8471', estimatedValueRupees: 8500000,   tenderType: 'DOMESTIC',               divisibility: 'DIVISIBLE',     totalQuantity: 1000,  msePreferenceActive: true,  procurementCategory: 'GOODS' },
  { tenderId: 'T-002', title: 'Telecom equipment supply',      hsnCode: '8517', estimatedValueRupees: 150000000, tenderType: 'DOMESTIC',               divisibility: 'DIVISIBLE',     totalQuantity: 200,   msePreferenceActive: false, procurementCategory: 'SI_EPC_TURNKEY_SERVICE' },
  { tenderId: 'T-003', title: 'High-performance servers',      hsnCode: '8471', estimatedValueRupees: 600000000, tenderType: 'GLOBAL_TENDER_ENQUIRY',  divisibility: 'DIVISIBLE',     totalQuantity: 500,   msePreferenceActive: false, procurementCategory: 'GOODS' },
  { tenderId: 'T-004', title: 'Software licenses',             hsnCode: '8523', estimatedValueRupees: 20000000,  tenderType: 'DOMESTIC',               divisibility: 'NON_DIVISIBLE', totalQuantity: 500,   msePreferenceActive: false, procurementCategory: 'GOODS' },
  { tenderId: 'T-005', title: 'Cement supply for works',       hsnCode: '2523', estimatedValueRupees: 400000000, tenderType: 'DOMESTIC',               divisibility: 'NON_DIVISIBLE', totalQuantity: 10000, msePreferenceActive: false, procurementCategory: 'GOODS' },
];

/* Section 10.2 - the 13-step deterministic seed producing 26 finalized blocks. */
const SEED_STEPS = [
  { id: 'SEED-01', title: 'Rules',                    detail: 'Seven RULE_UPDATED records from the rule set in 5.1 (blocks 0 to 6).' },
  { id: 'SEED-02', title: 'Deccan on T-003',          detail: "COMPONENT_LEVEL 100/70/85/100/20, Class-I, Rs 95,000 x 100, OEM, Chennai, 'Rack Server Chassis Assembly'. Expected YELLOW (first-time on 8471)." },
  { id: 'SEED-03', title: 'Godavari on T-001',        detail: "60/55/70/100/0, Class-I, Rs 27,000 x 150, MSE reseller of Krishna, Vijayawada, 'Desktop PC Model Q (Krishna OEM)'. YELLOW." },
  { id: 'SEED-04', title: 'Sabarmati on T-003',       detail: "Baseline 100/90/90/100/20, Class-I, Rs 112,000 x 80, Ahmedabad, 'Server Motherboard Assembly'. About 86 percent." },
  { id: 'SEED-05', title: 'Sabarmati on T-001',       detail: 'Anomaly: 30 on every component, Class-II, Rs 41,000 x 80, same product and location. YELLOW with SAME_PRODUCT_DIFFERENT_PERCENT.' },
  { id: 'SEED-06', title: 'Deccan on T-001',          detail: "GREEN control: 100/90/95/100/50, Class-I, Rs 48,000 x 200, Chennai, 'Desktop PC Model D'." },
  { id: 'SEED-07', title: 'Indus on T-002',           detail: "RED control: declared 15 percent, claims Class-I, Rs 780,000 x 40, Manesar, 'Telecom Base Station Unit'." },
  { id: 'SEED-08', title: 'Three T-002 bids + certs', detail: 'Deccan 70 percent Rs 850,000; Krishna 65 percent Rs 820,000; Bharat 62 percent Rs 870,000 (MSE); each qty 60, Noida, then a CA_CERTIFICATION by Sharma and Associates at the same percentage (no mismatch).' },
  { id: 'SEED-09', title: 'Chambal debarment',        detail: "Ministry of Defence, 'False declaration of local content', 2025-04-01 to 2027-03-31, linked MOD-2025-TENDER-0042, penalty Rs 500,000. Emits the webhook event; no CA certs to flag." },
  { id: 'SEED-10', title: 'Krishna debarment',        detail: 'DoT, same reason, 2026-01-15 to 2028-01-14, linked T-002, penalty Rs 300,000. Triggers AUDITOR_FLAGGED for Sharma and Associates (2 other certs).' },
  { id: 'SEED-11', title: 'Rule 8517 v2',             detail: "DoT raises Class-I 60 to 65, effective 2026-07-01, admin 'dot-admin-demo'." },
  { id: 'SEED-12', title: 'Logic upgrade',            detail: 'classification-engine v1 to v2, approvers cerulea-platform-admin and dpiit-domain-expert, payload nearThresholdBandPoints 2 to 3.' },
  { id: 'SEED-13', title: 'Expected baseline',        detail: '9 bids (1 GREEN, 7 YELLOW, 1 RED), 3 certifications, 2 debarments, 1 anomaly, 26 blocks, integrity valid, CA risk score 33 percent.' },
];

const SEED_EXPECTED_BASELINE = {
  bids: 9, green: 1, yellow: 7, red: 1,
  certifications: 3, debarments: 2, anomalies: 1,
  finalizedBlocks: 26, integrityValid: true, caRiskScorePercent: 33,
};

/* Section 10.3 - the 12 acceptance scenarios. */
const ACCEPTANCE_SCENARIOS = [
  { id: 'SCN-01', title: 'Classification GREEN / YELLOW / RED', detail: 'T-001 Deccan 100/70/85/100/20 gives GREEN Class-I 82 percent. Declaring 48 against a 50 threshold while claiming Class-I gives RED. Declaring 51 gives YELLOW (near threshold).' },
  { id: 'SCN-02', title: 'Eligibility',                         detail: 'Indus claiming Non-Local on T-001 (domestic) is RED and blocked; the same on T-003 (GTE) is allowed.' },
  { id: 'SCN-03', title: 'Divisible preference, 20 percent band', detail: 'T-001: Deccan Class-II at 500, Bharat Class-I at 550, Krishna Class-I at 620, all non-MSE. Result 50 percent Deccan at 500, 50 percent Bharat matched at 500; Krishna outside the 600 band.' },
  { id: 'SCN-04', title: 'MSE and MII combined',                detail: 'T-001: L1 non-MSE Class-I at 500, MSE Class-I at 560. Result 75 percent to L1, 25 percent to the MSE bidder at 500.' },
  { id: 'SCN-05', title: 'Non-divisible preference',            detail: 'T-005: Deccan Class-II at 400, Bharat Class-I at 440 (within 480). Bharat takes all 10,000 units at 400 (NON_DIVISIBLE_L1_NOT_CLASS_I_MATCHED).' },
  { id: 'SCN-06', title: 'Para 3A mandatory sourcing',          detail: 'T-002 non-Class-I bid is RED at submission and excluded at pre-filter.' },
  { id: 'SCN-07', title: 'Certificate at execution',            detail: "T-002 (Rs 15 crore) shows 'mandatory at execution'; submitting anchors the certificate and checks mismatch." },
  { id: 'SCN-08', title: 'Cross-tender anomaly',                detail: 'Sabarmati flagged SAME_PRODUCT_DIFFERENT_PERCENT (about 86 percent against 30 percent) in T-001 evaluation and in its vendor view.' },
  { id: 'SCN-09', title: 'Cross-ministry debarment',            detail: 'Any bid by Chambal Devices is RED citing Ministry of Defence, on any tender.' },
  { id: 'SCN-10', title: 'Auditor accountability',              detail: "Sharma and Associates risk 0 percent before and 33 percent after debarring Krishna for false declaration; Krishna's certificate row shows Flagged; AUDITOR_FLAGGED visible in the explorer." },
  { id: 'SCN-11', title: 'CUSTOM method',                       detail: "T-004 (8523) shows MeitY's rule text, records the percentage, returns YELLOW 'manual Tender Committee validation required'." },
  { id: 'SCN-12', title: 'Rule update and Smart Evolution',     detail: 'Raising 8517 to 65 returns oldConfig v1 and newConfig v2 with admin and timestamp; Ministry Admin shows v2; explorer shows RULE_UPDATED and the seeded LOGIC_UPGRADED.' },
];

/* Section 10.4 - cross-cutting checks. */
const CROSS_CUTTING_CHECKS = [
  { id: 'CHK-01', title: 'Public verification',        detail: 'Any txRef from a response resolves on /verify with block height, hash and integrity, and no price or percentage.' },
  { id: 'CHK-02', title: 'Chain integrity',            detail: "'Run Integrity Check' re-hashes every block and reports valid." },
  { id: 'CHK-03', title: 'Read-model rebuild',         detail: 'Recomputing analytics twice yields identical JSON.' },
  { id: 'CHK-04', title: 'Private collection isolation', detail: 'Switching between two vendor identities on /vendor shows disjoint declaration lists.' },
];

/* Section 12 - the 10 explicit PoC simplifications. */
const SIMPLIFICATIONS = [
  { id: 'SIM-01', title: 'Validators in-process',           detail: 'Three DCF validators run in one process; production uses separate Cerulea nodes.' },
  { id: 'SIM-02', title: 'Deterministic signatures',        detail: "Validator 'signature' is a salted sha256, not a digital signature scheme." },
  { id: 'SIM-03', title: 'Identity via query string',       detail: "role/id query parameters stand in for GeM's identity and DSC infrastructure." },
  { id: 'SIM-04', title: 'Price-match auto-accept',         detail: 'Every offered candidate accepts; production needs a vendor negotiation channel.' },
  { id: 'SIM-05', title: 'Webhook as chain event',          detail: 'Debarment fan-out is recorded on-chain instead of calling external procuring-entity endpoints.' },
  { id: 'SIM-06', title: 'Evaluation cache invalidation',   detail: 'A rule update clears all evaluation cache entries, not only the affected HSN.' },
  { id: 'SIM-07', title: 'WEIGHTED_MODULE',                 detail: 'Falls through to STANDARD; no module weights are modelled.' },
  { id: 'SIM-08', title: 'Divisible MSE cascades',          detail: "The two divisible MSE and non-MSE non-Class-I branches extend the documented non-divisible pattern; trace steps say 'extended pattern'." },
  { id: 'SIM-09', title: 'Master data static',              detail: 'Vendors and tenders are hardcoded; production references GeM records by id.' },
  { id: 'SIM-10', title: 'Storage',                         detail: 'SQLite file, ephemeral on the hosting platform, reseeded on cold start.' },
];

/* Section 7 - the 25 routes under /api/v1. */
const API_ROUTES = [
  { id: 'API-01', method: 'POST', path: '/bids',                                  group: 'GEM_TRIGGER',     trigger: '1_BID_SUBMISSION',        returns: '{status, computedClass, ruleVersion, reasons[], anomalies[], txRef, blockHeight, bid}' },
  { id: 'API-02', method: 'GET',  path: '/tenders/{tenderId}/evaluation',         group: 'GEM_TRIGGER',     trigger: '2_BID_EVALUATION',        returns: '{tenderId, cachedAt, bids[], fromCache?} cached 5 minutes per tender+role+id' },
  { id: 'API-03', method: 'POST', path: '/tenders/{tenderId}/preference',         group: 'GEM_TRIGGER',     trigger: '3_PREFERENCE_CALCULATION', returns: 'PreferenceOutcome' },
  { id: 'API-04', method: 'POST', path: '/certifications',                        group: 'GEM_TRIGGER',     trigger: '4_CA_CERTIFICATION',      returns: "{certId, mismatch, mismatchDeltaPercent, wasRequired, txRef, blockHeight, certification}; 'Unknown bid' on a bad bidId" },
  { id: 'API-05', method: 'POST', path: '/debarments',                            group: 'GEM_TRIGGER',     trigger: '5_DEBARMENT',             returns: 'DebarmentRecord' },
  { id: 'API-06', method: 'POST', path: '/rules',                                 group: 'GEM_TRIGGER',     trigger: '6_RULE_UPDATE',           returns: 'RuleUpdateRecord; 400 below the DPIIT floor; invalidates the evaluation cache' },
  { id: 'API-07', method: 'GET',  path: '/bids',                                  group: 'READ',            returns: 'BidRecord[] visible to the caller (private collections)' },
  { id: 'API-08', method: 'GET',  path: '/tenders/{tenderId}/preference',         group: 'READ',            returns: 'Latest PreferenceOutcome or null' },
  { id: 'API-09', method: 'POST', path: '/tenders/{tenderId}/preference/action',  group: 'READ',            returns: '{txRef, blockHeight}' },
  { id: 'API-10', method: 'GET',  path: '/tenders/{tenderId}/preference/action',  group: 'READ',            returns: 'Committee action payloads for the tender' },
  { id: 'API-11', method: 'GET',  path: '/certifications',                        group: 'READ',            returns: 'Visible CACertificationRecord[]' },
  { id: 'API-12', method: 'GET',  path: '/debarments',                            group: 'READ',            returns: 'Full public registry' },
  { id: 'API-13', method: 'GET',  path: '/rules',                                 group: 'READ',            returns: 'Current RuleConfig per HSN' },
  { id: 'API-14', method: 'GET',  path: '/rules/history',                         group: 'READ',            returns: 'History for one HSN, or all RULE_UPDATED records' },
  { id: 'API-15', method: 'GET',  path: '/auditors',                              group: 'READ',            returns: 'AuditorRiskProfile[] for every CA key' },
  { id: 'API-16', method: 'GET',  path: '/auditors/{caKey}',                      group: 'READ',            returns: '{profile, certifications[]}; caKey is URL-encoded' },
  { id: 'API-17', method: 'GET',  path: '/analytics',                             group: 'READ',            returns: 'Analytics object (ENT-29)' },
  { id: 'API-18', method: 'GET',  path: '/meta',                                  group: 'READ',            returns: '{vendors[], tenders[], rules[]} reference data for form dropdowns' },
  { id: 'API-19', method: 'GET',  path: '/openapi',                               group: 'READ',            returns: 'docs/openapi.yaml as text/yaml' },
  { id: 'API-20', method: 'GET',  path: '/chain/blocks',                          group: 'CHAIN_EXPLORER',  returns: 'FinalizedBlock[] with txRefs, descending height' },
  { id: 'API-21', method: 'GET',  path: '/chain/transactions',                    group: 'CHAIN_EXPLORER',  returns: 'ChainTransaction[] descending height, optional type filter, not ACL-filtered' },
  { id: 'API-22', method: 'GET',  path: '/chain/integrity',                       group: 'CHAIN_EXPLORER',  returns: 'IntegrityCheckResult' },
  { id: 'API-23', method: 'GET',  path: '/chain/verify',                          group: 'CHAIN_EXPLORER',  returns: "verifyRecordByHashOrTxRef result plus chainIntegrityValid; error 'Provide a transaction reference or declaration hash via ?ref=' when missing" },
  { id: 'API-24', method: 'GET',  path: '/chain/logic-history',                   group: 'CHAIN_EXPLORER',  returns: "LogicUpgradeRecord[]; module defaults to 'rule-registry'" },
  { id: 'API-25', method: 'POST', path: '/chain/upgrade-logic',                   group: 'CHAIN_EXPLORER',  returns: 'LogicUpgradeRecord; 400 when fewer than 2 approvers' },
];

/* Section 9 - the nine gated screens plus home. */
const SCREENS = [
  { route: '/',                 title: 'Home',                                gate: 'NONE',             detail: 'Hero with Proof of Concept pill and the three chips Non-crypto, Permissioned, No tokens wallets or mining; three how-to steps; three pillars; a grid of nine screen cards.' },
  { route: '/simulator',        title: 'GeM Simulator Console',               gate: 'NONE',             detail: 'Six pill tabs (Bid Submission, Bid Evaluation, Preference Calculation, CA Certification, Debarment, Rule Update), reference data from /meta, and a request/response panel.' },
  { route: '/vendor',           title: 'Vendor View',                         gate: 'VENDOR',           detail: 'Debarment banner, four stat tiles, compliance history timeline newest first, empty state.' },
  { route: '/procuring-entity', title: 'Procuring Entity Compliance Panel',   gate: 'PROCURING_ENTITY', detail: 'Bid evaluation card, compute preference card, committee decision card with prior decisions.' },
  { route: '/ministry-admin',   title: 'Nodal Ministry Admin',                gate: 'MINISTRY_ADMIN',   detail: 'Category rules table filtered to the own ministry by default, plus the rule update form.' },
  { route: '/dpiit-admin',      title: 'DPIIT Admin: National View',          gate: 'DPIIT_ADMIN',      detail: 'Four stat tiles and the cross-ministry debarment registry table with ACTIVE / EXPIRED status.' },
  { route: '/audit',            title: 'CVC / Audit Explorer',                gate: 'AUDIT',            detail: 'Three stat tiles, chain integrity check card, ledger search and ledger table (first 100 rows).' },
  { route: '/ca',               title: 'CA / Auditor Portal',                 gate: 'CA',               detail: 'Three stat tiles including the auditor risk score, and the certification history table.' },
  { route: '/analytics',        title: 'Compliance Analytics Dashboard',      gate: 'NONE',             detail: 'Four stat tiles, stacked bar chart of procurement value by classification per ministry, vendor concentration chart, Para 3A impact table.' },
  { route: '/verify',           title: 'Public Verification',                 gate: 'NONE',             detail: 'Reference input, result card (type, block height, block hash, recorded date) and chain integrity line. Never exposes the payload, price or percentage.' },
];

/* Section 8.3 - design tokens (TABLE 26). */
const DESIGN_TOKENS = {
  surface: { page: '#F4F6F9', surface: '#FFFFFF', 'surface-sunken': '#EEF1F5', overlay: 'rgba(18,32,58,0.5)' },
  ink: { 'ink-primary': '#11274A', 'ink-secondary': '#475A7D', 'ink-muted': '#8695AC' },
  border: { border: '#E2E8F0', 'border-strong': '#CBD5E1' },
  brand: { brand: '#004AAD', 'brand-hover': '#003C8F', 'brand-active': '#002D6B', 'brand-tint': '#EAF1FC', 'brand-tint-strong': '#D3E3F9', 'brand-navy': '#12305C', 'brand-gold': '#EEC000', 'brand-green': '#30B700' },
  semantic: { good: '#0CA30C', 'good-tint': '#E7F7E7', warning: '#B8790A', 'warning-tint': '#FDF1DC', critical: '#D03B3B', 'critical-tint': '#FBE9E9' },
  series: { 'series-1': '#2A78D6', 'series-2': '#1BAF7A', 'series-3': '#C98500', 'series-4': '#008300', 'series-5': '#4A3AA7', 'series-6': '#E34948', 'series-7': '#E87BA4', 'series-8': '#EB6834' },
  chart: { 'chart-grid': '#E7E9EE', 'chart-axis': '#CBD1DB' },
  radius: { sm: 6, md: 10, lg: 14, xl: 20 },
  shadow: ['xs', 'sm', 'md', 'lg'],
};

const CHART_COLOUR_MAPPING = { 'Class-I': 'series-1', 'Class-II': 'series-2', Manual: 'series-3', 'Non-Local': 'series-6' };

const SIDEBAR_GROUPS = [
  { group: 'Simulate',              items: ['GeM Simulator'] },
  { group: 'Dashboards',            items: ['Vendor', 'Procuring Entity', 'Ministry Admin', 'DPIIT Admin'] },
  { group: 'Trust & Transparency',  items: ['Audit Explorer', 'CA Portal', 'Analytics', 'Verify'] },
];

const FOOTER_TEXT = [
  'CBC-PRAMAAN Proof of Concept: non-crypto, permissioned Cerulea private chain. Demonstration data only.',
  'Caerulean Bytechains Private Limited - Blockchain for Good',
];

/* ═══════════════════════════════════════════════════════════════════ */
/*  STEP 1 - BLUEPRINT (63 modules)                                    */
/* ═══════════════════════════════════════════════════════════════════ */

const MODULES = [
  /* ── Cerulea private permissioned chain ── */
  {
    moduleId: 'consensus', title: 'Consensus Engine', group: 'core-protocol',
    config: { type: 'poa', blockTimeMs: 200 },
  },
  {
    moduleId: 'validators', title: 'Validators and Staking', group: 'economics-staking',
    config: { validatorSetType: 'static', minStakeAmount: 0, unbondingDays: 0 },
  },
  {
    moduleId: 'genesis', title: 'Genesis Configurator', group: 'state-genesis',
    config: { prefundedAccounts: [], allocations: [] },
  },
  {
    moduleId: 'node-permissioning', title: 'Node Permissioning', group: 'networking-security',
    config: { allowedNodeKeys: VALIDATOR_NODE_IDS },
  },
  {
    moduleId: 'p2p', title: 'P2P Networking', group: 'core-protocol',
    config: { maxPeers: 3, gossipMaxSizeKb: 512 },
  },
  {
    moduleId: 'p2p-tls', title: 'P2P TLS', group: 'networking-security',
    config: { caBundleSecret: 'CBC_PRAMAAN_P2P_CA_BUNDLE', certificateSecret: 'CBC_PRAMAAN_P2P_CERT', privateKeySecret: 'CBC_PRAMAAN_P2P_KEY' },
  },
  {
    moduleId: 'mempool-policy', title: 'Mempool Policy', group: 'Core Architecture',
    config: {
      replaceByFee: false,
      oneTransactionPerBlock: true,
      blockHeightRule: 'previous height + 1, or 0 on an empty chain (CHN-11)',
      entryPoint: 'CeruleaClient.submitTransaction wraps each action in its own block',
      finality: 'synchronous: hashing, Merkle root, consensus and both inserts complete inside the call that returns the domain result (CHN-15)',
      feeModel: 'none',
      ordering: 'submission order',
      noToken: true, noGas: true, noMining: true,
    },
  },
  {
    moduleId: 'private-tx', title: 'Permissioned Private Transactions', group: 'security-compliance',
    config: { policyMode: 'allowlist', auditTrail: true },
  },
  {
    moduleId: 'tx-access-policy', title: 'Transaction Access Policy', group: 'access-control',
    config: { defaultPolicy: 'allowlist', governanceRequired: false, emergencyOverrideMultisig: 2 },
  },
  {
    moduleId: 'kms-signing', title: 'KMS / HSM Signing', group: 'security-compliance',
    config: { provider: 'pkcs11', keyAlias: 'cbc-pramaan/dcf-validator' },
  },
  {
    moduleId: 'upgrade-manager', title: 'Upgrade Manager', group: 'core-protocol',
    config: { strategy: 'vote', noticePeriodDays: 0 },
  },
  {
    moduleId: 'chain-params-governance', title: 'Chain Parameters & Governance', group: 'Governance',
    config: {
      changeTimelockSeconds: 0,
      minApprovalQuorumPct: 0.67,
      smartEvolution: {
        name: 'Smart Evolution (versioned logic)',
        minApprovers: 2,
        rejectWhenBelowMinimumApprovers: 'requires multi-signature approval',
        rejectWhenNotNewer: 'newVersion must be greater than the current version',
        currentVersionQuery: 'MAX(version) from logic_versions, default 1 (CHN-25)',
        hashOldAndNewPayloads: true,
        txType: 'LOGIC_UPGRADED',
        txAcl: 'public',
        table: 'logic_versions',
        historyOrder: 'ascending by version, approvers parsed (CHN-27)',
        upgradableModules: E.LogicModule,
      },
      constants: {
        dpiitClassIFloorPercent: 50,
        classIIFloorPercent: 20,
        nearThresholdBandPoints: 2,
        caCertificateMandatoryAboveRupees: 100000000,
        caMismatchTolerancePoints: 5,
        sameProductDeltaThresholdPoints: 10,
        volumeMismatchThresholdUnits: 10000,
        smallFacilityKeywords: ['small workshop', 'small unit', 'small facility'],
        miiBandMultiplier: 1.2,
        mseBandMultiplier: 1.15,
        debarmentMaximumYears: 2,
        debarmentStatute: 'GFR Rule 151(iii)',
        evaluationCacheTtlMinutes: 5,
        smartEvolutionMinimumApprovers: 2,
        dcfQuorum: '2 of 3',
      },
      thresholdDirection: 'A nodal ministry can only raise thresholds, never lower them.',
    },
  },
  {
    moduleId: 'rpc', title: 'RPC API', group: 'apis-devex',
    config: {
      publicMethods: ['cbc_getBlocks', 'cbc_getBlockTxRefs', 'cbc_getTransaction', 'cbc_queryTransactionsByType', 'cbc_verifyChainIntegrity', 'cbc_verifyRecordByHashOrTxRef', 'cbc_getLogicHistory', 'cbc_getCurrentRules', 'cbc_getDebarments', 'cbc_getAnalytics'],
      privateMethods: ['cbc_submitBid', 'cbc_calculatePreference', 'cbc_recordCommitteeAction', 'cbc_submitCACertification', 'cbc_createDebarment', 'cbc_updateRule', 'cbc_upgradeLogic', 'cbc_getVisibleTransactions'],
      rateLimitRps: 50,
    },
  },
  {
    moduleId: 'api-gateway', title: 'API Gateway', group: 'Networking & APIs',
    config: {
      requireApiKey: false,
      burst: 100,
      ratePerSecond: 20,
      basePath: '/api/v1',
      appUrl: 'https://cbc-pramaan.cerulea.io',
      platformUrl: 'https://cerulea.io',
      vendorUrl: 'https://cbytechains.com',
      routes: API_ROUTES,
      errorEnvelope: 'APX-01: any exception in a handler returns HTTP 400 with {error: string}.',
      identityParsing: "APX-02: identity is read from ?role= and ?id=; role must be one of the six roles and id must be non-empty, otherwise VENDOR '__anonymous__'.",
      clientHelper: "APX-03: apiGet / apiPost append role and id to the query string when an identity is supplied; fetch with cache 'no-store'; throw the error string on a non-OK response.",
      ttlCache: "APX-04: in-memory TTL cache with get / set (default 5 minutes) / invalidate by prefix / clear. Used only by the evaluation endpoint; a successful rule update clears every key prefixed 'evaluation:' (RUL-10, SIM-06).",
      publicRoutes: ['/verify', '/analytics', '/api/v1/chain/verify', '/api/v1/chain/integrity'],
      noLogin: true,
    },
  },
  {
    moduleId: 'explorer', title: 'Block Explorer', group: 'exploration-ui',
    config: { enableAddressLabels: false },
  },
  {
    moduleId: 'explorer-widgets', title: 'Explorer Widgets (UI)', group: 'UI Kits',
    config: {
      pageSize: 100,
      auditExplorer: {
        route: '/audit', gate: 'AUDIT',
        header: 'CVC / Audit Explorer - read-only access across the entire immutable ledger.',
        statTiles: ['Finalized blocks', 'Total transactions', 'Chain integrity (Not checked / Valid / Tampered)'],
        integrityCheck: "Button 'Run Integrity Check'; badge VALID or TAMPERED with '{n} blocks independently re-hashed and verified' and, on failure, ', broken at height {h} ({reason})'.",
        search: "Placeholder 'Search by tx ref, event type, vendor id, hash...'; filters on txRef, type or any substring of the JSON payload, case-insensitive.",
        tableColumns: ['Block (#h)', 'Type (badge)', 'Tx Ref (mono)', 'Timestamp'],
        rowLimitNote: "Newest first, first 100 rows, then 'Showing first 100 of {n} matches.'",
      },
      designTokens: DESIGN_TOKENS,
      chartColourMapping: CHART_COLOUR_MAPPING,
      chartSeriesOrder: E.ChartSeries,
      tricolourAccentBar: '3px gradient: gold 0-20 percent, brand 35-65 percent, green 80-100 percent, at the top of the sidebar and the content column (SHL-04).',
      sidebarGroups: SIDEBAR_GROUPS,
      sidebarFooterChip: 'Non-crypto - permissioned - demonstration data only.',
      footerText: FOOTER_TEXT,
      shell: {
        title: 'CBC-PRAMAAN: Make in India Compliance Trust Layer',
        sidebarDesktopWidth: '16rem',
        sidebarMobileDrawerWidth: '18rem',
        contentMaxWidth: '72rem',
        pagePadding: { mobile: '1rem', desktop: '2rem' },
        topBar: "Sticky and translucent; 'Viewing as' label plus the identity switcher on the right; full logo on desktop, mark on mobile.",
        brandAssets: ['/brand/cerulea-icon.svg', '/brand/cerulea-logo.png', '/brand/cerulea-logo-source.svg'],
      },
      primitives: E.UiPrimitive,
      badgeTones: E.BadgeTone,
      buttonVariants: E.ButtonVariant,
      statusBadgeValues: E.ComplianceStatus,
      roleColourTokens: ROLE_COLOUR_TOKENS,
    },
  },
  {
    moduleId: 'chain-audit-export', title: 'Chain Audit Export', group: 'ops-compliance',
    config: { exportFormats: ['json', 'csv'], scheduledExport: false, exportIntervalDays: 30, completenessProof: true },
  },
  {
    moduleId: 'emergency-brake', title: 'Governance Emergency Brake', group: 'ops-compliance',
    config: { requiredSigners: 2, totalSigners: 3, autoExpiryHours: 72, pauseTargets: ['tx-type', 'rule-update', 'debarment-fan-out'] },
  },

  /* ── Observability and operations ── */
  {
    moduleId: 'metrics-dashboards', title: 'Metrics & Dashboards', group: 'observability-ops',
    config: { scrapeIntervalSec: 15 },
  },
  {
    moduleId: 'log-shipping', title: 'Log Shipping', group: 'observability-ops',
    config: { endpoint: 'https://logs.cbc-pramaan.cerulea.io/ingest', retentionDays: 2555 },
  },
  {
    moduleId: 'backups-restore', title: 'Backups & Restore', group: 'observability-ops',
    config: { backupIntervalHours: 24, maxGenerations: 30 },
  },
  {
    moduleId: 'health-probes', title: 'Health & Readiness Probes', group: 'observability-ops',
    config: { livenessIntervalSec: 10, readinessIntervalSec: 10 },
  },
  {
    moduleId: 'alerts-paging', title: 'Alerts & Paging', group: 'observability-ops',
    config: { defaultChannel: 'cbc-pramaan-ops-oncall', quietHours: '' },
  },
  {
    moduleId: 'error-tracking', title: 'Error Tracking (SaaS Adapter)', group: 'DevEx',
    config: {
      provider: 'sentry',
      measuredLatency: {
        source: 'OPS-08, measured on the dev server',
        bidSubmissionMinMs: 120, bidSubmissionMaxMs: 139,
        preferenceCalculationMinMs: 136, preferenceCalculationMaxMs: 175,
        finality: 'synchronous, no asynchronous confirmation wait',
      },
      capturedEnvelope: '400 {error: message} from every API handler (APX-01)',
    },
  },

  /* ── Identity and access (no login: preset identities, role gate, ACL-scoped reads) ── */
  {
    moduleId: 'rbac', title: 'Role-Based Access Control', group: 'identity-access',
    config: { defaultRoles: ROLES, policyMode: 'allowlist' },
  },
  {
    moduleId: 'org-accounts', title: 'Organization Accounts', group: 'identity-access',
    config: { maxMembersDefault: 14, inviteOnly: true, billingRequired: false },
  },
  {
    moduleId: 'kyb-registry', title: 'On-chain KYB Registry', group: 'access-control',
    config: {
      requiredFields: ['vendorId', 'legalName', 'vendorType', 'isMSE', 'udyamRegistrationNumber', 'oemReference'],
      sanctionsScreening: true,
      updateApprovalRequired: true,
    },
  },
  {
    moduleId: 'govt-identity', title: 'Citizen Identity (Aadhaar/DigiLocker)', group: 'identity',
    config: {
      noLogin: true,
      identityShape: '{ role: Role; id: string; label: string } (ROLE-01)',
      transport: 'The UI carries the selected identity on every request as ?role= and ?id= query parameters; the server enforces visibility.',
      persistence: "localStorage key 'cbc-pramaan-identity', re-resolved against the preset list on load",
      roles: ROLES,
      presetIdentities: PRESET_IDENTITIES,
      presetIdentityCount: 14,
      defaultIdentity: { role: 'PROCURING_ENTITY', id: 'procuring-entity-1', label: 'Procuring Entity: Tender Committee' },
      ministryIdentityRule: 'The Ministry Admin id is the ministry name and is matched against rule ACLs (ROLE-05).',
      caKeyRule: "The CA key is firmRegistration + '::' + membershipNumber (ROLE-08).",
      anonymousFallback: { role: 'VENDOR', id: '__anonymous__', sees: 'public records only (ROLE-16)' },
      roleGateUi: "A screen scoped to role X, viewed as any other role, renders a 'sign in as' card listing that role's preset identities; clicking one switches identity in place (ROLE-17).",
      identitySwitcher: 'Dropdown grouped by role label with a role colour dot, current identity ticked, click-outside closes, selection persists (SHL-06).',
      roleColourTokens: ROLE_COLOUR_TOKENS,
    },
  },
  {
    moduleId: 'govt-esign', title: 'eSign / Digital Signature', group: 'integration',
    config: {
      dscStandIn: 'SIM-03: role/id query parameters stand in for the GeM identity and DSC infrastructure. No real digital signature scheme is used in the PoC.',
      adminIdentityField: "RuleUpdateInput.adminIdentity, default 'dot-admin-demo' (SCR-S6-06)",
      committeeIdentityField: "CommitteeActionInput.committeeIdentity, default 'tender-committee-demo' (SCR-P-06)",
      caCredentials: { firmRegistrationDefault: 'Sharma-and-Associates-FR-2201', membershipNumberDefault: 'ICAI-M-118824', keyJoin: '::' },
      declarationHashPattern: "'sha256-demo-' + base36(now)",
      certificateHashPattern: "'sha256-cert-demo-' + base36(now)",
      validatorSignature: "SIM-02: the validator signature is sha256(nodeId + ':' + blockHash + ':cerulea-dcf-v1'), a salted digest and not a digital signature scheme.",
    },
  },
  {
    moduleId: 'privacy-compliance', title: 'Privacy & Compliance Guard', group: 'Security & Compliance',
    config: {
      redactFields: ['quotedPricePerUnit', 'declaredLocalContentPercent', 'certifiedLocalContentPercent', 'effectivePercent', 'penaltyAmountRupees'],
      denyPatterns: [],
      aclShape: '{ vendorIds?: string[], ministries?: string[], tenderIds?: string[], caIds?: string[], public?: boolean } on every ChainTransaction (ENT-25)',
      accessRules: ACCESS_RULES,
      enforcedBy: 'canAccess(tx, identity) (CHN-22), applied by getVisibleTransactionsByType and getAllVisibleTransactions (CHN-23)',
      publicVerificationRule: 'CHN-21 / SCR-Z-01: verifyRecordByHashOrTxRef returns only {found, txRef, blockHeight, blockHash, type, timestamp} and never returns the payload, a price or a percentage.',
      explorerException: 'API-21 is deliberately not ACL-filtered; the chain explorer is the AUDIT role tool.',
      isolationCheck: 'CHK-04: switching between two vendor identities on /vendor shows disjoint declaration lists.',
    },
  },
  {
    moduleId: 'rate-limit', title: 'Rate Limit', group: 'compliance-safety',
    config: { defaultRps: 20, burst: 60 },
  },

  /* ── GeM / PPP-MII domain ── */
  {
    moduleId: 'eprocurement-workflow', title: 'e-Procurement Workflow', group: 'government-civic',
    config: {
      gemCompatible: true,
      sealedBidding: true,
      evaluationCriteria: ['debarment-pre-check', 'local-content-classification', 'cross-tender-consistency', 'para-3a-mandatory-sourcing', 'l1-price-ranking', 'mii-purchase-preference', 'mse-purchase-preference', 'committee-decision'],
    },
  },
  {
    moduleId: 'procurement-ledger', title: 'Procurement Ledger', group: 'Trade & Commerce',
    config: {
      bidIdPattern: "'bid_' + tenderId + '_' + vendorId + '_' + base36(time) (ENT-13)",
      lookups: "ENG-27: throw 'Unknown tender' / 'Unknown vendor' if absent; resolve the rule by input.hsnCode.",
      pipelineOrder: ['1 debarment pre-check', '2 classification', '3 consistency over the vendor full history', '4 aggregation'],
      classificationEngine: {
        pliOverride: 'ENG-01: rule.pliLinked AND input.isPLIManufacturer gives CLASS_II, pliDeemed true, nearThreshold false, evaluated before any other branch.',
        customBranch: 'ENG-02: MANUAL_REQUIRED, reasons include the rule customRuleText.',
        componentValidation: 'ENG-03: throw when the rule has no components or the input has no componentDeclarations.',
        componentGating: 'ENG-04: mustBeLocal passes only at declared >= 100; a numeric threshold passes at declared >= threshold; a null threshold always passes; a missing declaration counts as 0.',
        componentWeighted: 'ENG-05: effectivePercent = round(sum(declared * weight) / 100).',
        componentNearThreshold: 'ENG-06: true within 2 points of either threshold OR when any component failed its gate.',
        standardBranch: 'ENG-07: STANDARD and WEIGHTED_MODULE throw when declaredLocalContentPercent is missing; effectivePercent = declared; the reason cites both thresholds, the rule version and the ministry, plus a claim-mismatch reason when computed differs from claimed.',
        classifyByPercent: 'ENG-08: >= classI gives CLASS_I; >= classII gives CLASS_II; else NON_LOCAL.',
        isNearThreshold: 'ENG-09: abs(effective - classI) <= 2 OR abs(effective - classII) <= 2.',
        computedClasses: E.ComputedClass,
        methods: E.CalculationMethod,
      },
      consistencyEngine: {
        name: 'Consistency Engine (cross-tender memory)',
        relocatedFrom: 'fraud-rules, whose library schema exposes only rulePreset',
        inputs: 'ENG-10: the new input, its effectivePercent, its class rank (NON_LOCAL 0, CLASS_II 1, CLASS_I 2, MANUAL_REQUIRED -1) and the vendor full bid history across all tenders.',
        classRanks: { NON_LOCAL: 0, CLASS_II: 1, CLASS_I: 2, MANUAL_REQUIRED: -1 },
        productMatching: 'ENG-11: same product = trimmed, lower-cased productName equality.',
        anomalyTypes: [
          { id: 'ENG-12', type: 'SAME_PRODUCT_DIFFERENT_PERCENT', threshold: 'abs(new - prior) >= 10 points', detail: 'For each prior same-product bid with a non-null percent. The description names both tenders and the point delta; relatedTxRef = the prior txRef.' },
          { id: 'ENG-13', type: 'SUDDEN_CLASSIFICATION_JUMP',     threshold: 'every prior rank strictly lower than the new rank', detail: 'Flagged when the vendor has same-product history and every prior class rank is strictly lower than the new rank.' },
          { id: 'ENG-14', type: 'GEOGRAPHIC_INCONSISTENCY',       threshold: 'new location not in the set of prior locations', detail: 'Flagged when same-product history exists and the new manufacturingLocation (trimmed, lower-cased) is not among the prior locations.' },
          { id: 'ENG-15', type: 'VOLUME_CAPACITY_MISMATCH',       threshold: 'cumulative quantity >= 10,000 units with a small-facility keyword in a prior location', detail: "Small-facility keywords: 'small workshop', 'small unit', 'small facility'. Flagged with the en-IN formatted cumulative total (all prior plus new)." },
        ],
        anomalyTypeList: E.AnomalyType,
        flagShape: 'ENT-12: type, description, relatedTxRef?',
        effect: 'Anomalies never exclude a bidder; they push the bid to YELLOW (ENG-32) and are surfaced for committee attention (ENG-43).',
      },
      eligibilityTests: {
        belowThresholdForClaim: 'ENG-29: computed != MANUAL_REQUIRED AND ((claimed CLASS_I AND computed != CLASS_I) OR (claimed CLASS_II AND computed == NON_LOCAL)).',
        nonLocalOnDomestic: 'ENG-30: computed == NON_LOCAL AND tender.tenderType == DOMESTIC.',
        para3AViolation: 'ENG-31: rule.para3A AND tender.procurementCategory == SI_EPC_TURNKEY_SERVICE AND computed not in {CLASS_I, MANUAL_REQUIRED}.',
      },
      statusPrecedence: [
        'RED debarred', 'RED below-threshold-for-claim', 'RED non-local-on-domestic', 'RED Para 3A',
        'YELLOW manual (CUSTOM)', 'YELLOW anomalies', 'YELLOW nearThreshold', 'YELLOW first declaration for this HSN', 'GREEN',
      ],
      statusPrecedenceRule: 'ENG-32: first match wins; exactly one ComplianceStatus is aggregated per bid.',
      statusReasonKeys: E.StatusReasonKey,
      reasonTexts: {
        DEBARRED: 'Vendor is on the cross-ministry debarment registry (debarred by {authority}, reason: {reason}). Bid is blocked.',
        BELOW_THRESHOLD_FOR_CLAIM: 'Vendor claimed {claimed} but computed classification is {computed} - declared percentage is below the applicable threshold for the claimed class.',
        NON_LOCAL_ON_DOMESTIC: 'Vendor is a Non-Local supplier bidding on a domestic tender - not permitted (only Global Tender Enquiries allow Non-Local bidders).',
        PARA_3A: 'HSN {hsn} is a Para 3A mandatory-sourcing item for this SI/EPC/Turnkey/Service tender, and the vendor is not Class-I.',
        MANUAL_CUSTOM: 'CUSTOM calculation method - manual Tender Committee validation required.',
        NEAR_THRESHOLD_COMPONENT: 'Component(s) failed their individual threshold despite the weighted average passing: {names} - flagged for closer examination.',
        NEAR_THRESHOLD: 'Declared percentage is close to the classification threshold boundary - flagged for closer examination.',
        FIRST_DECLARATION: 'First-time declaration by this vendor for HSN {hsn} - no historical baseline exists for comparison.',
        GREEN: 'Declaration meets the applicable threshold; no anomalies; not debarred.',
      },
      recordAcl: 'ENG-41: BID_SUBMITTED with vendorIds [vendor, oemReference if any], tenderIds [tender], ministries [rule.ministry].',
      txType: 'BID_SUBMITTED',
    },
  },
  {
    moduleId: 'govt-records-registry', title: 'Public Records Registry', group: 'registry',
    config: {
      registryName: 'Rule Registry',
      layers: ['fixed DPIIT defaults (hardcoded)', 'configurable per ministry per HSN, stored as RULE_UPDATED transactions'],
      currentRuleRule: 'The current rule for an HSN is the highest version on chain (RUL-06).',
      wildcard: "RUL-01: '*' is the DPIIT default row; any HSN without its own rule resolves to '*'. Requesting '*' when unseeded throws 'DPIIT default rule has not been seeded'.",
      floorCheck: 'RUL-02: isFloorRespected = classI >= 50 AND classII >= 20 AND classII < classI. Skipped entirely when the method is CUSTOM.',
      floorRejection: 'RUL-03: a non-CUSTOM update failing the floor throws "Rejected: Class-I threshold must be >= 50 and Class-II threshold must be >= 20 and less than Class-I threshold. Nodal ministries can only raise thresholds, never lower them." The API returns HTTP 400.',
      versioning: 'RUL-04: newVersion = (latest existing version for that HSN) + 1, else 1; newConfig.supersedes = the old version.',
      recordWritten: 'RUL-05: RULE_UPDATED with oldConfig (full previous RuleConfig or null), newConfig, adminIdentity, timestamp. ACL public = true, ministries = [ministry].',
      reads: { getRuleConfig: 'RUL-06', getRuleHistory: 'RUL-07 all versions ascending', listAllCurrentRules: 'RUL-08 one row per HSN sorted by hsnCode', listAllRuleHistory: 'RUL-09 all RULE_UPDATED ascending by timestamp' },
      cacheInvalidation: "RUL-10: a successful rule update clears every cache key prefixed 'evaluation:'.",
      seededRules: SEEDED_RULES,
      componentDefinitions: { '8471': HSN_8471_COMPONENTS },
      customRuleText: { '8523': HSN_8523_CUSTOM_RULE_TEXT },
      componentGates: E.ComponentGate,
      ruleConfigShape: 'ENT-04: ministry, hsnCode, hsnLabel, classIThreshold, classIIThreshold, method, components?, customRuleText?, para3A, pliLinked, effectiveDate, version, supersedes?',
    },
  },
  {
    moduleId: 'compliance-attestations', title: 'Compliance Attestations', group: 'Compliance',
    config: {
      certIdPattern: "'cert_' + bidId + '_' + base36 (ENT-14)",
      required: 'ENG-21: isCACertificationRequired(tender) = estimatedValueRupees > 100,000,000 (Rs 10 crore).',
      mismatch: 'ENG-22: delta = abs(certified - bid.effectivePercent or 0); mismatch = delta >= 5.',
      record: 'ENG-23: CA_CERTIFICATION with ACL vendorIds [vendor], tenderIds [tender], caIds [caKey], public false.',
      inputFields: 'ENT-06: bidId, certifiedLocalContentPercent, caFirmRegistrationNumber, caMembershipNumber, certificatePdfHash.',
      auditorAccountabilityLedger: {
        flagRoutine: 'ENG-24: for each CA key that certified the debarred vendor, write a public AUDITOR_FLAGGED transaction listing every OTHER certificate by that CA (flaggedCertIds), totalCertsByCA, the triggering vendor and the triggering debarment.',
        riskProfile: 'ENG-25: problematic = certificates whose vendorId appears in any debarment with a false-declaration reason; riskScore = problematic / total (0 when there are no certificates); problematicVendorIds deduplicated.',
        listAllCAKeys: 'ENG-26: distinct CA keys across all certifications.',
        derivedOnly: 'ENT-24: AuditorRiskProfile is never stored and is recomputed on read.',
        portalTones: 'SCR-C-03: risk score tone good at 0, warning below 50 percent, critical at or above 50 percent.',
      },
      mandatoryNotice: 'SCR-S4-06: above Rs 10 crore a warning badge and "CA/auditor certificate is mandatory at execution"; below, a neutral badge and "Self-certification remains sufficient; this CA certificate is optional here."',
    },
  },
  {
    moduleId: 'fraud-rules', title: 'Fraud Rules', group: 'compliance-safety',
    config: { rulePreset: 'balanced' },
  },
  {
    moduleId: 'govt-interdept', title: 'Inter-Department Connector', group: 'integration',
    config: {
      registry: 'Cross-ministry debarment registry: one national list, no per-ministry silo (ENG-17).',
      debarmentIdPattern: "'debar_' + vendorId + '_' + base36 (ENT-15)",
      durationGuard: "ENG-16: throw 'Debarment end date exceeds the maximum 2-year limit under GFR Rule 151(iii)' if end > start + 2 years.",
      record: 'ENG-17: DEBARMENT_CREATED written with a public ACL.',
      fanOut: "ENG-18: immediately after, write DEBARMENT_WEBHOOK_EMITTED (public) with recipients 'ALL_PROCURING_ENTITIES'.",
      auditorTrigger: 'ENG-19: when the reason matches /false declaration/i, call the Auditor Accountability flag routine (ENG-24).',
      preBidCheck: 'ENG-20: preBidDebarmentCheck(vendorId, at) is active when at falls within [startDate, endDate] of any record for that vendor, and returns the matching record.',
      inputFields: 'ENT-07: vendorId, reason, startDate, endDate, debarringAuthority, linkedTenders[], penaltyAmountRupees?',
      statusDerivation: 'SCR-D-03: ACTIVE when endDate >= today, else EXPIRED.',
      statuses: E.DebarmentStatus,
    },
  },
  {
    moduleId: 'ent-workflow', title: 'Workflow Engine', group: 'workflow',
    config: {
      gemTriggerPoints: [
        { id: '1_BID_SUBMISSION',        route: 'POST /api/v1/bids',                          writes: 'BID_SUBMITTED' },
        { id: '2_BID_EVALUATION',        route: 'GET /api/v1/tenders/{tenderId}/evaluation',  writes: 'read only, cached 5 minutes' },
        { id: '3_PREFERENCE_CALCULATION', route: 'POST /api/v1/tenders/{tenderId}/preference', writes: 'PREFERENCE_CALCULATED' },
        { id: '4_CA_CERTIFICATION',      route: 'POST /api/v1/certifications',                writes: 'CA_CERTIFICATION' },
        { id: '5_DEBARMENT',             route: 'POST /api/v1/debarments',                    writes: 'DEBARMENT_CREATED then DEBARMENT_WEBHOOK_EMITTED' },
        { id: '6_RULE_UPDATE',           route: 'POST /api/v1/rules',                         writes: 'RULE_UPDATED' },
      ],
      preferenceEngine: {
        preFilter: 'ENG-42: exclude every RED bid, recording {vendorId, reason}; trace step Pre-filter with counts.',
        consistencyStep: "ENG-43: list eligible bidders with anomalies as 'vendor: TYPE, TYPE'; flagged for committee attention, not excluded.",
        noEligibleBidders: 'ENG-44: decisionPath NO_ELIGIBLE_BIDDERS, empty split, no chain write.',
        ranking: 'ENG-45: sort eligible bids by quotedPricePerUnit ascending; L1 = first.',
        candidatesAndMargins: 'ENG-46: for every non-L1 Class-I bidder record price, withinBand (price <= L1 * 1.2) and a margin row with bandLimit rounded to 2 decimals.',
        classifyL1: "ENG-47: trace the combined status '{MSE|Non-MSE} + {Class-I|Non-Class-I}' and whether MSE preference is active.",
        offerCascade: 'ENG-48: bandLimit = round(l1 * multiplier, 2); candidates within band ascending by price are each offered a match and the first acceptance wins; out-of-band candidates are listed with offered = false; each offer is a trace step.',
        miiPaths: {
          'ENG-49': 'L1 Class-I: full quantity to L1 at the L1 price.',
          'ENG-50': 'No Class-I candidate: full quantity to L1.',
          'ENG-51': 'Divisible, L1 not Class-I: cascade at 1.20; winner takes round(qty/2) to L1 and the remainder to the winner, both at the L1 price; no winner gives full to L1.',
          'ENG-52': 'Non-divisible, L1 not Class-I: cascade at 1.20; the winner takes the entire quantity at the L1 price; no winner gives full to L1.',
        },
        msePaths: {
          'ENG-53': 'MSE and Class-I L1: full award to L1.',
          'ENG-54': 'Non-MSE and Class-I L1: round(qty * 0.75) to L1, cascade MSE candidates at 1.15 for the remainder at the L1 price; no winner gives full to L1.',
          'ENG-55': "MSE and Non-Class-I L1: tier 1 MSE+Class-I candidates at 1.20, then tier 2 Non-MSE+Class-I at 1.20; divisible 50/50 with the winner, non-divisible winner takes all, no winner gives full to L1; divisible trace labels say 'extended pattern'.",
          'ENG-56': 'Non-MSE and Non-Class-I L1: tier 1 MSE candidates at 1.15, then tier 2 Class-I candidates at 1.20; divisible 50/50 or non-divisible full; no winner gives full to L1.',
        },
        decisionPathsNoMse: E.DecisionPathMII,
        decisionPathsMseActive: E.DecisionPathMSE,
        decisionPathCount: 20,
        traceSteps: E.PreferenceTraceStep,
        cascadeMultipliers: { mii: 1.2, mse: 1.15 },
        record: 'ENG-57: PREFERENCE_CALCULATED with ACL tenderIds [tender] and vendorIds = the eligible bidder ids.',
        latestOutcome: 'ENG-58: getLatestPreferenceOutcome(tenderId) returns the most recent by createdAt, hydrated, or null.',
      },
      committeeAction: {
        actions: E.CommitteeAction,
        record: "ENG-59: PREFERENCE_COMMITTEE_ACTION with ACL tenderIds [tender] and public true; remarks default to ''.",
        reads: 'ENG-60: getCommitteeActionsForTender returns all committee payloads for the tender in chain order.',
        inputFields: 'ENT-09: tenderId, preferenceTxRef, action, remarks?, modifiedQuantitySplit?, committeeIdentity.',
        uiRule: 'SCR-P-06: Action select Accept / Modify / Override; remarks required for modify and override.',
      },
      determinism: 'Every engine is deterministic: identical inputs and rule version always produce identical output.',
    },
  },
  {
    moduleId: 'evidence-chain', title: 'Evidence Chain', group: 'Identity & Registry',
    config: {
      chainName: 'Cerulea Private Permissioned Chain',
      facade: 'CeruleaClient is the only chain entry point that engines and routes import; swapping the simulator for the production Cerulea platform touches only this facade.',
      consensus: {
        algorithm: 'DCF',
        validatorCount: 3,
        validators: VALIDATORS,
        round: "CHN-13: each validator independently recomputes the candidate block hash; a match yields signature = sha256(nodeId + ':' + blockHash + ':cerulea-dcf-v1') with confirmedAt.",
        signatureFormula: "sha256(nodeId + ':' + blockHash + ':cerulea-dcf-v1')",
        quorumFormula: 'ceil(3 * 2 / 3) = 2',
        quorumRequired: 2,
        quorumString: 'n/3',
        quorumFailure: "throws 'DCF consensus quorum not reached; block rejected' and nothing is written",
        finality: 'CHN-15: synchronous. Hashing, Merkle root, consensus and both inserts complete inside the same call that returns the domain result.',
        stakeAmount: 0,
        noToken: true, noGas: true, noStaking: true, noMining: true,
      },
      hashing: {
        sha256: 'CHN-06: hex digest of the UTF-8 input.',
        sha256Json: 'CHN-07: sha256 of JSON.stringify(value).',
        merkleRoot: "CHN-08: an empty list returns sha256(''); pairwise sha256(left + right) with an odd leaf paired with itself, repeated to one root.",
        blockHash: 'CHN-09: computeBlockHash = sha256 of JSON {height, prevHash, merkleRoot, timestamp} in that key order; txRefs are deliberately excluded.',
        genesisPrevHash: "CHN-05: sha256('CBC-PRAMAAN / Cerulea Private Permissioned Chain / genesis'), used as the prevHash of block 0.",
        txRefFormat: "CHN-10: 'tx_' + base36(now) + '_' + base36(counter) + '_' + the first 10 hex characters of sha256Json({type, payload, timestamp}).",
        payloadHash: 'CHN-07 applied to the payload; resolvable on /verify without exposing the payload.',
      },
      blocks: {
        oneTransactionPerBlock: true,
        heightRule: 'CHN-11: block height = previous height + 1, or 0 on an empty chain.',
        finalizedBlockShape: 'ENT-26: height, prevHash, merkleRoot, timestamp, txRefs[], hash, signatures[ValidatorSignature], quorum.',
        validatorSignatureShape: 'ENT-27: nodeId, organization, confirmedHash, signature, confirmedAt.',
        transactionShape: 'ENT-25: txRef, type, payload, timestamp, blockHeight, blockHash, acl.',
      },
      reads: {
        getTransaction: 'CHN-16: joined with blocks to return blockHash; null when absent.',
        queryTransactionsByType: 'CHN-17: ascending block height.',
        queryAllTransactions: 'CHN-18: ascending block height.',
        getAllBlocks: 'CHN-19: blocks ascending, txRefs looked up per block.',
        hydrate: "CHN-24: returns {...payload, txRef, blockHeight} so stored placeholders ('' and -1) are always overwritten by the envelope.",
      },
      txTypes: E.TxType,
      transactionStatuses: E.ChainStatus,
    },
  },
  {
    moduleId: 'ent-document-registry', title: 'Document & Asset Registry', group: 'registry',
    config: {
      hashAlgorithm: 'SHA-256',
      hashOnlyAnchoring: true,
      documents: [
        { kind: 'Local content declaration', field: 'declarationPdfHash', writtenBy: 'BID_SUBMITTED' },
        { kind: 'CA certificate',            field: 'certificatePdfHash', writtenBy: 'CA_CERTIFICATION' },
      ],
      noDocumentBodyOnChain: 'Only the hash is recorded; the document body is never written to the ledger and is never returned by /verify.',
      verification: 'A document hash resolves through verifyRecordByHashOrTxRef (CHN-21) by matching payload_hash.',
      retentionYears: 7,
    },
  },
  {
    moduleId: 'smart-legal-contract', title: 'Smart Legal Contract Engine', group: 'legal-professional',
    config: {
      clauseTypes: ['dpiit-threshold-floor', 'mii-purchase-preference', 'mse-purchase-preference', 'para-3a-mandatory-sourcing', 'ca-certification-above-10-crore', 'debarment-gfr-151-iii', 'committee-decision'],
      autoTriggerEnabled: true,
      maxParties: 7,
    },
  },
  {
    moduleId: 'regulatory-reporting', title: 'Regulatory Reporting Engine', group: 'financial-services',
    config: {
      regulators: ['dpiit', 'gem', 'nodal-ministries', 'cvc'],
      outputFormats: ['json', 'csv'],
      autoAnchorReceipt: true,
    },
  },
  {
    moduleId: 'govt-legal-audit', title: 'Legal-Grade Audit Trail', group: 'security',
    config: {
      integrityWalk: 'CHN-20: walk blocks ascending. prev_hash must equal the previous hash (the genesis hash for block 0); the recomputed Merkle root of the block payload_hashes must equal merkle_root; the recomputed header hash must equal hash. The first failure returns {valid: false, brokenAtHeight, reason}.',
      resultShape: 'ENT-28: valid, blocksChecked, brokenAtHeight?, reason?',
      reasons: E.IntegrityReason,
      publicVerify: 'CHN-21: verifyRecordByHashOrTxRef(ref) matches tx_ref first, then payload_hash, and returns only {found, txRef, blockHeight, blockHash, type, timestamp}. It never returns the payload.',
      auditRoleReadsAll: 'ROLE-10: the AUDIT identity reads every transaction on the ledger; the chain explorer endpoints are not ACL-filtered.',
      immutability: 'Every action is one transaction in one hash-linked, quorum-finalized block; nothing is ever updated in place.',
      auditorFlaggedTrail: 'AUDITOR_FLAGGED transactions are public and permanently visible in the explorer.',
    },
  },
  {
    moduleId: 'govt-transparency-portal', title: 'Public Transparency Portal', group: 'exploration-ui',
    config: {
      screens: SCREENS,
      screenCount: 9,
      gates: E.ScreenGate,
      publicVerification: {
        route: '/verify',
        gate: 'NONE',
        promise: 'No commercial value is ever exposed.',
        input: "Placeholder 'tx_... or a SHA-256 hash'; Enter submits; the Verify button is disabled when empty.",
        resultCard: "Green header 'Record found' or red 'Not found'. When found: Type, Block height, Block hash (mono, full), Recorded date.",
        integrityLine: "'Chain integrity' plus a badge 'Valid, no tampering detected' or 'Tampered'.",
        errorCard: 'Red card carrying the API error message.',
      },
      analyticsReadModel: {
        bidValue: 'ENG-61: quotedPricePerUnit * quantity.',
        ministryAttribution: "ENG-62: the rule for the bid HSN, else the wildcard rule, else 'Unknown'.",
        classBuckets: 'ENG-63: classI / classII / nonLocal / manual by computedClass, plus totalValue, per ministry.',
        vendorConcentration: 'ENG-64: sum of value and count per vendor with legalName, sorted by value descending.',
        para3AImpact: 'ENG-65: for each rule with para3A, bids on that HSN, the Class-I count and the share (0 when there are no bids).',
        determinism: 'ENG-66: two consecutive computations over the same chain must be JSON-identical, asserted by the rebuild script.',
        shape: 'ENT-29: totalBids, classShareByMinistry[], vendorConcentration[], anomalyCount, debarmentCount, para3AImpact[].',
      },
      analyticsCharts: {
        stackedBar: "SCR-N-03: 'Procurement Value by Classification, per Ministry'; X = ministry, Y = Rs in lakhs, stacked Class-I, Class-II, Non-Local, Manual in that order.",
        vendorConcentration: 'SCR-N-04: horizontal bars, top 5 vendors by cumulative bid value, opacity fading 12 percent per rank.',
        para3ATable: 'SCR-N-05: columns HSN, Ministry, Total Bids, Class-I Share with a progress bar.',
      },
    },
  },

  /* ── Data, logic and ops ── */
  {
    moduleId: 'logic-editor', title: 'Logic and Actions Editor', group: 'data-logic',
    config: { maxStepsPerFlow: 100, allowCustomCode: true },
  },
  {
    moduleId: 'onchain-data', title: 'On-chain Data Models', group: 'data-logic',
    config: {
      structures: [
        'blocks', 'transactions', 'logic_versions',
        'BidRecord', 'ClassificationResult', 'AnomalyFlag', 'CACertificationRecord', 'DebarmentRecord',
        'RuleUpdateRecord', 'RuleConfig', 'ComponentDefinition', 'PreferenceOutcome', 'PriceMatchOffer',
        'DecisionTraceStep', 'CommitteeActionPayload', 'AuditorFlaggedPayload', 'DebarmentWebhookPayload',
        'LogicUpgradedPayload', 'ChainTransaction', 'FinalizedBlock', 'ValidatorSignature', 'IntegrityCheckResult',
      ],
    },
  },
  {
    moduleId: 'event-bus', title: 'Event Bus', group: 'data-logic',
    config: { ordering: 'at-least-once' },
  },
  {
    moduleId: 'cache', title: 'Cache', group: 'data-logic',
    config: { ttlSeconds: 300 },
  },
  {
    moduleId: 'search-fulltext', title: 'Full-text Search', group: 'data-logic',
    config: { engine: 'meilisearch' },
  },
  {
    moduleId: 'analytics', title: 'Analytics', group: 'analytics-obs',
    config: { retentionDays: 2555 },
  },
  {
    moduleId: 'audit-logs', title: 'Audit Logs', group: 'compliance-safety',
    config: { retentionDays: 2555 },
  },
  {
    moduleId: 'audit-export', title: 'Audit Evidence Export', group: 'analytics-obs',
    config: { bundleFormat: 'zip' },
  },
  {
    moduleId: 'webhooks-outbound', title: 'Outbound Webhooks', group: 'Integrations',
    config: {
      maxRetries: 10,
      simulationNote: 'SIM-05: the debarment fan-out is recorded on-chain as a transaction instead of calling external procuring-entity endpoints.',
      events: [
        { txType: 'DEBARMENT_WEBHOOK_EMITTED', recipients: 'ALL_PROCURING_ENTITIES', acl: 'public', payload: 'ENT-22: debarmentId, recipients, notifiedAt', emittedBy: 'the debarment engine immediately after DEBARMENT_CREATED (ENG-18)' },
      ],
      recipientSets: E.WebhookRecipient,
    },
  },
  {
    moduleId: 'webhooks-inbound', title: 'Inbound Webhooks', group: 'Integrations',
    config: {
      hmacSecret: 'CBC_PRAMAAN_GEM_INBOUND_SECRET',
      basePath: '/api/v1',
      sources: [
        { source: 'GeM bid submission',        trigger: '1_BID_SUBMISSION',         route: 'POST /bids' },
        { source: 'GeM bid evaluation',        trigger: '2_BID_EVALUATION',         route: 'GET /tenders/{tenderId}/evaluation' },
        { source: 'GeM preference calculation', trigger: '3_PREFERENCE_CALCULATION', route: 'POST /tenders/{tenderId}/preference' },
        { source: 'CA certification portal',   trigger: '4_CA_CERTIFICATION',       route: 'POST /certifications' },
        { source: 'Debarring authority',       trigger: '5_DEBARMENT',              route: 'POST /debarments' },
        { source: 'Nodal ministry rule desk',  trigger: '6_RULE_UPDATE',            route: 'POST /rules' },
      ],
      identityOnEveryCall: 'Query parameters ?role= and ?id= (APX-02).',
      errorEnvelope: '400 {error: message} (APX-01).',
    },
  },
  {
    moduleId: 'notifications', title: 'Notifications', group: 'comms-engagement',
    config: { inApp: true, push: false },
  },
  {
    moduleId: 'emails', title: 'Transactional Emails', group: 'comms-engagement',
    config: { fromAddress: 'no-reply@cbc-pramaan.cerulea.io', templateEngine: 'react' },
  },
  {
    moduleId: 'scheduler', title: 'Scheduler (Cron/Delayed Jobs)', group: 'DevEx',
    config: {
      tz: 'Asia/Kolkata',
      jobs: ['evaluation-cache-sweep', 'debarment-status-recompute', 'chain-integrity-sweep', 'analytics-read-model-rebuild', 'audit-evidence-export'],
    },
  },
  {
    moduleId: 'asset-storage', title: 'Asset Storage (S3/Local)', group: 'Storage',
    config: {
      provider: 'local',
      storesDocumentBodies: false,
      note: 'Only SHA-256 hashes of declarations and CA certificates are retained; no document body is stored or served.',
    },
  },
  {
    moduleId: 'cms-pages', title: 'CMS Pages', group: 'content-ui',
    config: { allowCustomBlocks: true },
  },
  {
    moduleId: 'theme-branding', title: 'Theme and Branding', group: 'content-ui',
    config: { brandName: 'CBC-PRAMAAN' },
  },
  {
    moduleId: 'dev-sandbox', title: 'Developer Sandbox', group: 'DevEx',
    config: {
      acceptanceScenarios: ACCEPTANCE_SCENARIOS,
      acceptanceScenarioCount: 12,
      crossCuttingChecks: CROSS_CUTTING_CHECKS,
      opsScripts: [
        { id: 'OPS-01', name: 'reset-chain',        detail: 'Delete data/chain.db, chain.db-wal and chain.db-shm if present, then print a hint to reseed.' },
        { id: 'OPS-02', name: 'seed',               detail: 'Run the 13-step seed sequence with per-step logging, then print the integrity result and the total block count.' },
        { id: 'OPS-03', name: 'rebuild-readmodel',  detail: 'Compute analytics twice and assert equality (exit 1 on mismatch), then print totals and integrity.' },
        { id: 'OPS-04', name: 'auto-seed',          detail: 'Server instrumentation hook: on the Node runtime, if no RULE_UPDATED exists, run the seed so a cold ledger self-populates.' },
        { id: 'OPS-05', name: 'ensureSeeded',       detail: 'Idempotent: seeds only when the Rule Registry is empty and returns whether it did.' },
      ],
      hosting: 'OPS-06: live at https://cbc-pramaan.cerulea.io (also cbc-pramaan.vercel.app), auto-deployed from main of github.com/CAERULEAN-BYTECHAINS-PRIVATE-LIMITED/CBC-PRAMAAN.',
      stack: 'OPS-07: Next.js 16 App Router, React 19, TypeScript, Tailwind 4, Recharts 3, better-sqlite3, zod, Radix primitives, lucide icons, date-fns.',
      measuredLatency: 'OPS-08: bid submission about 120-139 ms; preference about 136-175 ms; finality synchronous.',
      simplifications: SIMPLIFICATIONS,
      simplificationCount: 10,
    },
  },
  {
    moduleId: 'test-data-factory', title: 'Test Data Factory', group: 'DevEx',
    config: {
      preset: 'cbc-pramaan-baseline',
      deterministic: true,
      vendors: SEED_VENDORS,
      vendorCount: 7,
      tenders: SEED_TENDERS,
      tenderCount: 5,
      seedSteps: SEED_STEPS,
      seedStepCount: 13,
      expectedBaseline: SEED_EXPECTED_BASELINE,
      masterDataNote: 'SIM-09: vendors and tenders are static GeM master data with no create endpoint; production references GeM records by id.',
    },
  },
  {
    moduleId: 'local-chain-devnet', title: 'Local Chain Devnet', group: 'DevEx',
    config: {
      simulator: 'SQLite chain simulator standing in for the production Cerulea nodes.',
      fileLocationLocal: 'CHN-01: <project>/data/chain.db',
      fileLocationHosted: 'CHN-01: /tmp/cbc-pramaan-data/chain.db',
      journalMode: 'WAL',
      tables: {
        blocks: 'CHN-02: height INTEGER PK, prev_hash, merkle_root, hash, timestamp, quorum, signatures_json. All NOT NULL.',
        transactions: 'CHN-03: tx_ref PK, block_height, type, payload_json, acl_json, timestamp, payload_hash. Index on type.',
        logic_versions: 'CHN-04: id AUTOINCREMENT, module, version, description, old_version, approvers_json, old_logic_hash, new_logic_hash, activated_at, tx_ref.',
      },
      tableList: E.ChainTable,
      ephemeral: 'SIM-10: the SQLite file is ephemeral on the hosting platform and is reseeded on cold start.',
      inProcessValidators: 'SIM-01: the three DCF validators run in one process; production uses separate Cerulea nodes.',
    },
  },
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
  ['p2p-tls', 'p2p', 'calls'],
  ['node-permissioning', 'p2p', 'calls'],
  ['p2p', 'consensus', 'feeds'],
  ['consensus', 'validators', 'reads'],
  ['genesis', 'consensus', 'feeds'],
  ['mempool-policy', 'consensus', 'feeds'],
  ['consensus', 'evidence-chain', 'writes'],
  ['evidence-chain', 'onchain-data', 'writes'],
  ['kms-signing', 'consensus', 'calls'],
  ['kms-signing', 'govt-esign', 'calls'],
  ['validators', 'evidence-chain', 'feeds'],
  ['chain-params-governance', 'consensus', 'feeds'],
  ['chain-params-governance', 'govt-records-registry', 'feeds'],
  ['upgrade-manager', 'logic-editor', 'triggers'],
  ['upgrade-manager', 'chain-params-governance', 'reads'],
  ['upgrade-manager', 'evidence-chain', 'writes'],
  ['emergency-brake', 'tx-access-policy', 'triggers'],
  ['emergency-brake', 'mempool-policy', 'triggers'],
  ['emergency-brake', 'alerts-paging', 'triggers'],

  /* Private transactions, identity and access */
  ['private-tx', 'consensus', 'feeds'],
  ['private-tx', 'evidence-chain', 'writes'],
  ['tx-access-policy', 'private-tx', 'feeds'],
  ['privacy-compliance', 'tx-access-policy', 'feeds'],
  ['privacy-compliance', 'audit-logs', 'reads'],
  ['rbac', 'tx-access-policy', 'feeds'],
  ['rbac', 'api-gateway', 'feeds'],
  ['govt-identity', 'rbac', 'feeds'],
  ['govt-identity', 'api-gateway', 'feeds'],
  ['org-accounts', 'govt-identity', 'reads'],
  ['kyb-registry', 'org-accounts', 'feeds'],
  ['govt-esign', 'govt-identity', 'feeds'],
  ['rate-limit', 'api-gateway', 'feeds'],

  /* GeM trigger points and the domain engines */
  ['webhooks-inbound', 'api-gateway', 'calls'],
  ['api-gateway', 'eprocurement-workflow', 'calls'],
  ['eprocurement-workflow', 'logic-editor', 'calls'],
  ['logic-editor', 'private-tx', 'writes'],
  ['eprocurement-workflow', 'procurement-ledger', 'triggers'],
  ['procurement-ledger', 'govt-records-registry', 'reads'],
  ['govt-records-registry', 'logic-editor', 'feeds'],
  ['fraud-rules', 'procurement-ledger', 'feeds'],
  ['procurement-ledger', 'evidence-chain', 'writes'],
  ['procurement-ledger', 'ent-workflow', 'feeds'],
  ['ent-workflow', 'smart-legal-contract', 'calls'],
  ['smart-legal-contract', 'logic-editor', 'reads'],
  ['ent-workflow', 'evidence-chain', 'writes'],
  ['ent-workflow', 'notifications', 'triggers'],
  ['compliance-attestations', 'procurement-ledger', 'reads'],
  ['compliance-attestations', 'evidence-chain', 'writes'],
  ['compliance-attestations', 'ent-document-registry', 'writes'],
  ['govt-interdept', 'procurement-ledger', 'feeds'],
  ['govt-interdept', 'compliance-attestations', 'triggers'],
  ['govt-interdept', 'webhooks-outbound', 'triggers'],
  ['govt-interdept', 'evidence-chain', 'writes'],
  ['webhooks-outbound', 'notifications', 'calls'],
  ['govt-records-registry', 'evidence-chain', 'writes'],
  ['govt-records-registry', 'cache', 'triggers'],
  ['cache', 'api-gateway', 'feeds'],
  ['ent-document-registry', 'asset-storage', 'writes'],
  ['ent-document-registry', 'evidence-chain', 'feeds'],

  /* Audit, reporting and read models */
  ['evidence-chain', 'govt-legal-audit', 'feeds'],
  ['govt-legal-audit', 'audit-logs', 'feeds'],
  ['audit-logs', 'audit-export', 'feeds'],
  ['audit-export', 'chain-audit-export', 'feeds'],
  ['chain-audit-export', 'regulatory-reporting', 'feeds'],
  ['regulatory-reporting', 'govt-transparency-portal', 'feeds'],
  ['onchain-data', 'analytics', 'feeds'],
  ['analytics', 'govt-transparency-portal', 'feeds'],
  ['analytics', 'explorer-widgets', 'feeds'],
  ['onchain-data', 'search-fulltext', 'feeds'],
  ['search-fulltext', 'explorer', 'feeds'],
  ['explorer', 'explorer-widgets', 'feeds'],
  ['explorer-widgets', 'govt-transparency-portal', 'feeds'],
  ['govt-transparency-portal', 'cms-pages', 'reads'],
  ['theme-branding', 'explorer-widgets', 'feeds'],
  ['theme-branding', 'cms-pages', 'feeds'],

  /* APIs, events and communications */
  ['rpc', 'explorer', 'feeds'],
  ['api-gateway', 'rpc', 'calls'],
  ['evidence-chain', 'rpc', 'feeds'],
  ['evidence-chain', 'event-bus', 'feeds'],
  ['event-bus', 'webhooks-outbound', 'feeds'],
  ['event-bus', 'notifications', 'feeds'],
  ['notifications', 'emails', 'calls'],

  /* Operations */
  ['scheduler', 'chain-audit-export', 'triggers'],
  ['scheduler', 'backups-restore', 'triggers'],
  ['metrics-dashboards', 'alerts-paging', 'triggers'],
  ['health-probes', 'alerts-paging', 'triggers'],
  ['log-shipping', 'metrics-dashboards', 'feeds'],
  ['error-tracking', 'alerts-paging', 'triggers'],
  ['api-gateway', 'log-shipping', 'feeds'],
  ['api-gateway', 'error-tracking', 'feeds'],
  ['backups-restore', 'local-chain-devnet', 'writes'],

  /* Seed, sandbox and devnet */
  ['test-data-factory', 'local-chain-devnet', 'writes'],
  ['test-data-factory', 'govt-records-registry', 'writes'],
  ['test-data-factory', 'procurement-ledger', 'writes'],
  ['test-data-factory', 'govt-interdept', 'writes'],
  ['dev-sandbox', 'test-data-factory', 'triggers'],
  ['dev-sandbox', 'local-chain-devnet', 'calls'],
  ['dev-sandbox', 'api-gateway', 'calls'],
  ['local-chain-devnet', 'evidence-chain', 'feeds'],
];

const EDGES = EDGE_DEFS.map(([s, t, rel], i) => ({
  id: `e${i}_${s.replace(/-/g, '_')}_${t.replace(/-/g, '_')}`,
  source: `n_${s}`,
  target: `n_${t}`,
  type: 'relation',
  markerEnd: { type: 'arrowclosed' },
  data: { rel },
}));

/* ── Self-validation: the module list can never drift from MODULE_HOMES. ── */
(function validate() {
  const ids = MODULES.map(m => m.moduleId);
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`modules.cjs: duplicate moduleId ${id}`);
    seen.add(id);
  }
  const missing = MODULE_HOMES.filter(h => !seen.has(h));
  const extra = ids.filter(i => !MODULE_HOMES.includes(i));
  if (missing.length) throw new Error(`modules.cjs: missing modules ${missing.join(', ')}`);
  if (extra.length) throw new Error(`modules.cjs: unknown modules ${extra.join(', ')}`);

  const pairs = new Set();
  const touched = new Set();
  for (const [s, t] of EDGE_DEFS) {
    if (!seen.has(s) || !seen.has(t)) throw new Error(`modules.cjs: edge references unknown module ${s} -> ${t}`);
    if (s === t) throw new Error(`modules.cjs: self edge on ${s}`);
    const key = `${s}->${t}`;
    if (pairs.has(key)) throw new Error(`modules.cjs: duplicate edge ${key}`);
    pairs.add(key);
    touched.add(s); touched.add(t);
  }
  const orphans = ids.filter(i => !touched.has(i));
  if (orphans.length) throw new Error(`modules.cjs: modules with no edge: ${orphans.join(', ')}`);
})();

const BLUEPRINT = {
  modules: MODULES.map(m => ({ moduleId: m.moduleId, label: m.title, group: m.group, config: m.config })),
  graph: { nodes: NODES, edges: EDGES },
};

module.exports = { MODULES, EDGES, BLUEPRINT };
