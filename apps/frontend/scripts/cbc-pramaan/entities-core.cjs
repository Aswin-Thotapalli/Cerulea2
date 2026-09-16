/**
 * CBC-PRAMAAN seed - core entities and relationships.
 *
 * Cerulea Bytechains Compliance, Procurement Record And Make-in-India Assurance
 * Network: a PPP-MII compliance trust layer that sits behind GeM. Non-crypto,
 * permissioned, no tokens / wallets / mining.
 *
 * Transcribed from SPEC.md:
 *   Section 3 - data entities (TABLE 4 master data ENT-01..04, TABLE 5 inputs
 *               ENT-05..10, TABLE 6 chain payload records ENT-11..29)
 *   Section 4 - chain layer (CHN-01..27: storage, hashing, DCF consensus,
 *               reads and verification, Smart Evolution)
 *   Section 5 - rule registry (RUL-01..10 and the 7 seeded rows of TABLE 13)
 *   Section 6 - engines (ENG-01..66, for field semantics and thresholds)
 *   Section 7 - API surface (API-02 evaluation row, API-23 public verify,
 *               APX-04 evaluation TTL cache)
 *   Section 10 - seed data (TABLE 43 vendors, TABLE 44 tenders, TABLE 45 steps)
 *
 * Vendors and tenders are static GeM master data (no create endpoint).
 * Everything else is an on-chain transaction payload, read back by hydrating
 * txRef and blockHeight from the envelope (CHN-24).
 *
 * Every entity is homed on a moduleId that exists on the blueprint.
 * Relationships are declared by entity NAME and resolved to ids by the seeder.
 */
const { E, ACCESS, F, ID, REF, ONREF, CHAIN, ENT } = require('./_shared.cjs');

// ---------------------------------------------------------------------------
// 1. GeM master data (Section 3.1, Section 10.1)
// ---------------------------------------------------------------------------

const Vendor = ENT(
  'kyb-registry',
  'Vendor',
  'ENT-01 (TABLE 4). Static GeM vendor master data: "Vendors and tenders are static GeM master data (no create endpoint)". A RESELLER carries the authorising OEM so its bid ACL can list both ids (ROLE-12, ENG-41). TABLE 43 seeds seven vendors: bharat-precision-electronics (Bharat Precision Electronics, OEM, MSE, UDYAM-TN-03-0001234); deccan-systems (Deccan Systems Pvt Ltd, OEM); krishna-integrated-devices (Krishna Integrated Devices Ltd, OEM); godavari-components (Godavari Components, RESELLER, MSE, oemReference krishna-integrated-devices); indus-global-traders (Indus Global Traders, OEM); sabarmati-systems (Sabarmati Systems, OEM); chambal-devices (Chambal Devices, OEM).',
  [
    ID(),
    F('vendorId', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Vendor ID', options: E.VendorId, desc: 'ROLE-03: the seven preset vendor identities; also the value matched against acl.vendorIds (ROLE-12)' }),
    F('legalName', 'string', { req: 1, label: 'Legal name', desc: 'Registered legal name as printed in analytics vendor concentration rows (ENG-64)' }),
    F('type', 'enum', { req: 1, label: 'Vendor type', options: E.VendorType, desc: 'OEM or RESELLER' }),
    F('isMSE', 'boolean', { req: 1, label: 'Is MSE', desc: 'Micro / Small Enterprise, drives the MSE purchase preference matrix (ENG-53..56)' }),
    F('udyamRegistrationNumber', 'string', { label: 'Udyam registration number', desc: 'MSE registration, present only for MSE vendors (for example UDYAM-TN-03-0001234)' }),
    F('oemReference', 'enum', { label: 'OEM reference', options: E.VendorId, desc: 'RESELLER only: authorising OEM vendorId' }),
  ],
  { core: true, access: ACCESS.ADM }
);

const Tender = ENT(
  'eprocurement-workflow',
  'Tender',
  'ENT-02 (TABLE 4). Static GeM tender master data. Drives eligibility (ENG-30 non-local on domestic), Para 3A mandatory sourcing (ENG-31), CA certification necessity (ENG-21: estimatedValueRupees > 100,000,000) and the divisible / non-divisible preference paths (ENG-49..56). TABLE 44 seeds five tenders: T-001 Desktop computers, 1000 units (HSN 8471, Rs 85,00,000, DOMESTIC, DIVISIBLE, 1000 units, MSE preference on, GOODS); T-002 Telecom equipment supply (8517, Rs 15,00,00,000, DOMESTIC, DIVISIBLE, 200, MSE off, SI_EPC_TURNKEY_SERVICE); T-003 High-performance servers (8471, Rs 60,00,00,000, GLOBAL_TENDER_ENQUIRY, DIVISIBLE, 500, off, GOODS); T-004 Software licenses (8523, Rs 2,00,00,000, DOMESTIC, NON_DIVISIBLE, 500, off, GOODS); T-005 Cement supply for works (2523, Rs 40,00,00,000, DOMESTIC, NON_DIVISIBLE, 10000, off, GOODS).',
  [
    ID(),
    F('tenderId', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Tender ID', options: E.TenderId, desc: 'The value matched against acl.tenderIds (ROLE-14)' }),
    F('title', 'string', { req: 1, label: 'Title' }),
    F('hsnCode', 'enum', { req: 1, label: 'HSN code', options: E.HsnCode, desc: 'Resolves the applicable RuleConfig; any HSN without its own rule falls back to the wildcard row (RUL-01)' }),
    F('estimatedValueRupees', 'float', { req: 1, label: 'Estimated value', unit: 'INR', desc: 'ENG-21: CA certification is mandatory at execution above Rs 10,00,00,000 (100,000,000)' }),
    F('tenderType', 'enum', { req: 1, label: 'Tender type', options: E.TenderType, desc: 'ENG-30: a NON_LOCAL supplier may only bid on a GLOBAL_TENDER_ENQUIRY' }),
    F('divisibility', 'enum', { req: 1, label: 'Divisibility', options: E.ProcurementDivisibility, desc: 'Selects the split (50/50 or 75/25) versus winner-takes-all preference paths (ENG-51..56)' }),
    F('totalQuantity', 'int', { req: 1, label: 'Total quantity', unit: 'units' }),
    F('msePreferenceActive', 'boolean', { req: 1, label: 'MSE preference active', desc: 'When on, the MSE matrix (ENG-53..56) replaces the plain MII path (ENG-49..52)' }),
    F('procurementCategory', 'enum', { label: 'Procurement category', options: E.ProcurementCategory, desc: 'ENG-31: Para 3A is only enforced when this is SI_EPC_TURNKEY_SERVICE' }),
  ],
  { core: true, access: ACCESS.ADM }
);

// ---------------------------------------------------------------------------
// 2. Rule registry (Section 3.1 ENT-03/04, Section 5, TABLE 13)
// ---------------------------------------------------------------------------

const ComponentDefinition = ENT(
  'govt-records-registry',
  'ComponentDefinition',
  'ENT-03 (TABLE 4). One weighted component of a COMPONENT_LEVEL rule. "null threshold + mustBeLocal = 100% gate; null threshold without mustBeLocal = ungated" (ENG-04). TABLE 13 defines five components for HSN 8471 whose weights sum to 100: PCB/Motherboard 40% must be local; Power Supply 15% threshold 50%; Enclosure/Chassis 10% threshold 80%; Assembly & Testing 20% must be local; Software/OS 15% no gate.',
  [
    ID(),
    REF('ruleConfigId', 'Rule config', 'The COMPONENT_LEVEL RuleConfig this component belongs to (ENG-03 throws when the rule has no components)'),
    F('name', 'string', { req: 1, label: 'Component name', desc: 'One of the TABLE 13 component names; a missing declaration for this name counts as 0 (ENG-04)' }),
    F('weightPercent', 'float', { req: 1, label: 'Weight', unit: '%', desc: 'ENG-05: effectivePercent = round(sum(declared * weight) / 100); weights of a rule sum to 100' }),
    F('thresholdPercent', 'float', { label: 'Threshold', unit: '%', desc: 'Numeric gate: passes at declared >= threshold. Null threshold always passes unless mustBeLocal is set (ENG-04)' }),
    F('mustBeLocal', 'boolean', { req: 1, label: 'Must be local', desc: 'A 100% gate: passes only at declared >= 100 (ENG-04)' }),
  ],
  { access: ACCESS.ADM }
);

const RuleConfig = ENT(
  'govt-records-registry',
  'RuleConfig',
  'ENT-04 (TABLE 4) and Section 5. The resolved rule for one ministry + HSN: a fixed DPIIT layer plus a configurable layer stored as RULE_UPDATED transactions, where "the current rule for an HSN is the highest version on chain" (RUL-06). TABLE 13 seeds seven rows: * All other categories (DPIIT default), DPIIT, 50/20, STANDARD, effective 2017-06-15; 8471 Computers / IT hardware, MeitY, 50/20, COMPONENT_LEVEL, 2021-02-01; 8443 Printers, MeitY, 50/20, STANDARD, 2021-02-01; 8517 Telecom equipment, DoT, 60 (v1) then 65 (v2) / 20, STANDARD, Para 3A yes, 2020-08-01 then 2026-07-01; 2523 Cement, DPIIT, 50/20, STANDARD, Para 3A yes, 2019-05-01; 8523 Software / recorded media, MeitY, 50/20, CUSTOM, 2022-01-01; 8544 Cables, DPIIT, 50/20, STANDARD, PLI linked, 2021-11-01.',
  [
    ID(),
    F('ministry', 'enum', { req: 1, label: 'Ministry', options: E.Ministry, desc: 'Nodal ministry owning the row; matched against acl.ministries (ROLE-15, RUL-05)' }),
    F('hsnCode', 'enum', { req: 1, idx: 1, label: 'HSN code', options: E.HsnCode, desc: "RUL-01: '*' is the DPIIT default row that every unmapped HSN resolves to; requesting '*' when unseeded throws 'DPIIT default rule has not been seeded'" }),
    F('hsnLabel', 'string', { req: 1, label: 'HSN label', desc: 'Humanised label for the HSN, one of the TABLE 13 labels (E.HsnLabel)' }),
    F('classIThreshold', 'int', { req: 1, label: 'Class-I threshold', unit: '%', desc: 'DPIIT floor 50. RUL-02 isFloorRespected: classI >= 50 AND classII >= 20 AND classII < classI; skipped entirely when method is CUSTOM' }),
    F('classIIThreshold', 'int', { req: 1, label: 'Class-II threshold', unit: '%', desc: 'Floor 20 and < Class-I. RUL-03: a non-CUSTOM update failing the floor is rejected with HTTP 400 because nodal ministries can only raise thresholds, never lower them' }),
    F('method', 'enum', { req: 1, label: 'Calculation method', options: E.CalculationMethod, desc: 'STANDARD and WEIGHTED_MODULE use the declared percentage (ENG-07); COMPONENT_LEVEL uses weighted components (ENG-03..06); CUSTOM yields MANUAL_REQUIRED (ENG-02)' }),
    F('components', 'json', { label: 'Components', desc: 'COMPONENT_LEVEL only: [{name, weightPercent, thresholdPercent, mustBeLocal}] mirroring ComponentDefinition' }),
    F('customRuleText', 'text', { label: 'Custom rule text', desc: "CUSTOM only. HSN 8523 text: 'For software products, local content shall be assessed based on the proportion of Indian development team person-hours to total person-hours, verified through project management records and HR documentation. No automated formula exists; the Tender Committee must manually validate against this rule text.'" }),
    F('para3A', 'boolean', { req: 1, label: 'Para 3A', desc: 'ENG-31: mandatory local sourcing for SI/EPC/Turnkey/Service tenders on this HSN. Seeded true for 8517 and 2523' }),
    F('pliLinked', 'boolean', { req: 1, label: 'PLI linked', desc: 'ENG-01: a PLI manufacturer bidding on a PLI-linked HSN is deemed CLASS_II before any other branch. Seeded true for 8544' }),
    F('effectiveDate', 'date', { req: 1, label: 'Effective date' }),
    F('version', 'int', { req: 1, label: 'Version', desc: 'RUL-04: newVersion = (latest existing version for that HSN) + 1, else 1' }),
    F('supersedes', 'int', { label: 'Supersedes version', desc: 'RUL-04: newConfig.supersedes = the old version number, null for v1' }),
  ],
  { core: true, access: ACCESS.ADM }
);

const RuleUpdateInput = ENT(
  'govt-records-registry',
  'RuleUpdateInput',
  'ENT-08 (TABLE 5). Request body of Trigger 6 Rule Update. Validated against the floor check (RUL-02/RUL-03) before a RULE_UPDATED transaction is written, and a successful update clears every cache key prefixed "evaluation:" (RUL-10).',
  [
    ID(),
    F('ministry', 'enum', { req: 1, label: 'Ministry', options: E.Ministry }),
    F('hsnCode', 'enum', { req: 1, idx: 1, label: 'HSN code', options: E.HsnCode }),
    F('hsnLabel', 'string', { req: 1, label: 'HSN label' }),
    F('classIThreshold', 'int', { req: 1, label: 'Class-I threshold', unit: '%', desc: 'DPIIT floor 50' }),
    F('classIIThreshold', 'int', { req: 1, label: 'Class-II threshold', unit: '%', desc: 'Floor 20 and < Class-I' }),
    F('method', 'enum', { req: 1, label: 'Calculation method', options: E.CalculationMethod }),
    F('components', 'json', { label: 'Components', desc: '[{name, weightPercent, thresholdPercent, mustBeLocal}], COMPONENT_LEVEL only' }),
    F('customRuleText', 'text', { label: 'Custom rule text', desc: 'CUSTOM only; the text the Tender Committee validates against manually' }),
    F('para3A', 'boolean', { req: 1, label: 'Para 3A' }),
    F('pliLinked', 'boolean', { req: 1, label: 'PLI linked' }),
    F('effectiveDate', 'date', { req: 1, label: 'Effective date' }),
    F('adminIdentity', 'string', { req: 1, label: 'Admin identity', desc: "The ministry admin making the change, for example 'dot-admin-demo' in SEED-11" }),
  ],
  { access: ACCESS.ADM }
);

const RuleUpdateRecord = ENT(
  'govt-records-registry',
  'RuleUpdateRecord',
  'ENT-16 (TABLE 6) and RUL-05. The RULE_UPDATED chain payload: "oldConfig (full previous RuleConfig or null), newConfig, adminIdentity, timestamp. ACL: public = true, ministries = [ministry]". Seven of these are written by SEED-01 (blocks 0-6) and an eighth by SEED-11 when DoT raises 8517 from 60 to 65.',
  [
    ID(),
    F('ruleUpdateId', 'string', { req: 1, uniq: 1, idx: 1, label: 'Rule update ID', desc: "'rule_' + hsn + '_v' + n" }),
    F('ministry', 'enum', { req: 1, idx: 1, label: 'Ministry', options: E.Ministry, desc: 'Copied into acl.ministries so only this ministry admin plus AUDIT and DPIIT_ADMIN read the private view (ROLE-15)' }),
    F('hsnCode', 'enum', { req: 1, idx: 1, label: 'HSN code', options: E.HsnCode }),
    F('oldConfig', 'json', { label: 'Old config', desc: 'The full previous RuleConfig, or null for the first version of an HSN' }),
    F('newConfig', 'json', { req: 1, label: 'New config', desc: 'The full new RuleConfig including version and supersedes (RUL-04)' }),
    F('adminIdentity', 'string', { req: 1, label: 'Admin identity' }),
    F('timestamp', 'datetime', { req: 1, label: 'Timestamp' }),
    ...CHAIN(),
  ],
  { access: ACCESS.ADM, onChain: true }
);

// ---------------------------------------------------------------------------
// 3. Trigger inputs (Section 3.2)
// ---------------------------------------------------------------------------

const BidSubmissionInput = ENT(
  'eprocurement-workflow',
  'BidSubmissionInput',
  'ENT-05 (TABLE 5). Request body of Trigger 1 POST /bids (API-01). The orchestrator runs it through the pipeline order of ENG-28: debarment pre-check, classification, consistency over the vendor full history, then aggregation into a status.',
  [
    ID(),
    F('tenderId', 'enum', { req: 1, idx: 1, label: 'Tender ID', options: E.TenderId, desc: "ENG-27 throws 'Unknown tender' when absent from master data" }),
    F('vendorId', 'enum', { req: 1, idx: 1, label: 'Vendor ID', options: E.VendorId, desc: "ENG-27 throws 'Unknown vendor' when absent from master data" }),
    F('hsnCode', 'enum', { req: 1, label: 'HSN code', options: E.HsnCode, desc: 'ENG-27: the rule is resolved by input.hsnCode, falling back to the wildcard row' }),
    F('declaredLocalContentPercent', 'float', { label: 'Declared local content', unit: '%', desc: 'Required for STANDARD / WEIGHTED_MODULE / CUSTOM; ENG-07 throws when missing on a STANDARD or WEIGHTED_MODULE rule' }),
    F('componentDeclarations', 'json', { label: 'Component declarations', desc: 'COMPONENT_LEVEL only: [{name, declaredPercent}]. ENG-03 throws when the rule is COMPONENT_LEVEL and this is absent; a missing component counts as 0 (ENG-04)' }),
    F('claimedClass', 'enum', { req: 1, label: 'Claimed class', options: E.SupplierClass, desc: 'ENG-29 belowThresholdForClaim compares this against the computed class' }),
    F('quotedPricePerUnit', 'float', { req: 1, label: 'Quoted price per unit', unit: 'INR', desc: 'ENG-45 ranks eligible bidders ascending on this; ENG-61 bid value = quotedPricePerUnit * quantity' }),
    F('quantity', 'int', { req: 1, label: 'Quantity', unit: 'units' }),
    F('isMSE', 'boolean', { req: 1, label: 'Is MSE' }),
    F('vendorType', 'enum', { req: 1, label: 'Vendor type', options: E.VendorType }),
    F('oemReference', 'enum', { label: 'OEM reference', options: E.VendorId, desc: "RESELLER only: ENG-41 lists it alongside the bidder in acl.vendorIds so 'a reseller bid also lists the OEM id' (ROLE-12)" }),
    F('declarationPdfHash', 'bytes32', { req: 1, label: 'Declaration PDF hash', desc: 'Hash of the self-declaration document; resolvable on the public /verify screen (CHK-01) without exposing the declaration' }),
    F('manufacturingLocation', 'string', { req: 1, label: 'Manufacturing location', desc: 'ENG-14 GEOGRAPHIC_INCONSISTENCY compares the trimmed, lower-cased value against prior same-product locations; ENG-15 scans it for small-facility keywords' }),
    F('productName', 'string', { req: 1, idx: 1, label: 'Product name', desc: 'ENG-11: same product = trimmed, lower-cased productName equality across all tenders' }),
    F('claimMSEPreference', 'boolean', { label: 'Claim MSE preference' }),
    F('isPLIManufacturer', 'boolean', { label: 'Is PLI manufacturer', desc: 'ENG-01: with a PLI-linked rule this deems the bid CLASS_II before any other branch' }),
  ],
  { core: true, access: ACCESS.AUTH }
);

const CACertificationInput = ENT(
  'compliance-attestations',
  'CACertificationInput',
  'ENT-06 (TABLE 5). Request body of Trigger 4 CA Certification. The CA key is caFirmRegistrationNumber + "::" + caMembershipNumber (ROLE-08), and the record is written with a private ACL naming that key (ENG-23).',
  [
    ID(),
    F('bidId', 'string', { req: 1, idx: 1, label: 'Bid ID', desc: "The BidRecord being certified: 'bid_' + tenderId + '_' + vendorId + '_' + base36 time" }),
    F('certifiedLocalContentPercent', 'float', { req: 1, label: 'Certified local content', unit: '%', desc: 'ENG-22: delta = abs(certified - bid.effectivePercent or 0)' }),
    F('caFirmRegistrationNumber', 'string', { req: 1, label: 'CA firm registration number', desc: "Seeded identity uses firm FR-2201 (ROLE-08 key 'Sharma-and-Associates-FR-2201::ICAI-M-118824')" }),
    F('caMembershipNumber', 'string', { req: 1, label: 'CA membership number', desc: 'ICAI membership number; the second half of the CA key' }),
    F('certificatePdfHash', 'bytes32', { req: 1, label: 'Certificate PDF hash', desc: 'Hash of the signed certificate, resolvable on /verify without exposing the certificate' }),
  ],
  { access: ACCESS.AUTH }
);

const DebarmentInput = ENT(
  'govt-interdept',
  'DebarmentInput',
  'ENT-07 (TABLE 5). Request body of Trigger 5 Debarment. Guarded by ENG-16 before anything is written, then fans out to a public webhook (ENG-18) and, for false-declaration reasons, to the Auditor Accountability Ledger (ENG-19).',
  [
    ID(),
    F('vendorId', 'enum', { req: 1, idx: 1, label: 'Vendor ID', options: E.VendorId }),
    F('reason', 'text', { req: 1, label: 'Reason', desc: '/false declaration/i triggers the Auditor Accountability Ledger (ENG-19)' }),
    F('startDate', 'date', { req: 1, label: 'Start date' }),
    F('endDate', 'date', { req: 1, label: 'End date', desc: "ENG-16 throws 'Debarment end date exceeds the maximum 2-year limit under GFR Rule 151(iii)' when end > start + 2 years" }),
    F('debarringAuthority', 'string', { req: 1, label: 'Debarring authority', desc: "For example 'Ministry of Defence' (SEED-09) or 'DoT' (SEED-10)" }),
    F('linkedTenders', 'json', { req: 1, label: 'Linked tenders', desc: 'string[] of tender references the debarment arises from' }),
    F('penaltyAmountRupees', 'float', { label: 'Penalty amount', unit: 'INR' }),
  ],
  { access: ACCESS.AUTH }
);

const CommitteeActionInput = ENT(
  'eprocurement-workflow',
  'CommitteeActionInput',
  'ENT-09 (TABLE 5). Request body the Tender Committee posts after reading a preference outcome. ENG-59 writes it as a PREFERENCE_COMMITTEE_ACTION with ACL tenderIds [tender] and public true, remarks defaulting to an empty string.',
  [
    ID(),
    F('tenderId', 'enum', { req: 1, idx: 1, label: 'Tender ID', options: E.TenderId }),
    F('preferenceTxRef', 'string', { req: 1, idx: 1, label: 'Preference transaction ref', desc: 'The txRef of the PREFERENCE_CALCULATED transaction being acted on' }),
    F('action', 'enum', { req: 1, label: 'Action', options: E.CommitteeAction, desc: 'ACCEPTED, MODIFIED or OVERRIDDEN' }),
    F('remarks', 'text', { label: 'Remarks', desc: "ENG-59: defaults to ''" }),
    F('modifiedQuantitySplit', 'json', { label: 'Modified quantity split', desc: 'MODIFIED only: [{vendorId, quantity, price}] replacing the engine split' }),
    F('committeeIdentity', 'string', { req: 1, label: 'Committee identity', desc: "The acting identity, normally procuring-entity-1 (ROLE-04)" }),
  ],
  { access: ACCESS.AUTH }
);

const LogicUpgradeInput = ENT(
  'upgrade-manager',
  'LogicUpgradeInput',
  'ENT-10 (TABLE 5). Request body of POST /chain/upgrade-logic (API-25). CHN-26 rejects fewer than 2 approvers with "requires multi-signature approval" and rejects newVersion <= current, then hashes both payloads, writes a public LOGIC_UPGRADED transaction and inserts into logic_versions with that txRef.',
  [
    ID(),
    F('module', 'enum', { req: 1, idx: 1, label: 'Module', options: E.LogicModule, desc: 'The versioned logic module being upgraded; SEED-12 upgrades classification-engine v1 to v2' }),
    F('description', 'string', { req: 1, label: 'Description' }),
    F('approvers', 'json', { req: 1, label: 'Approvers', desc: 'string[], min 2 (CHN-26 multi-signature approval). SEED-12 uses cerulea-platform-admin and dpiit-domain-expert' }),
    F('newVersion', 'int', { req: 1, label: 'New version', desc: 'CHN-26 rejects when newVersion <= getCurrentLogicVersion(module) (CHN-25, default 1)' }),
    F('oldLogicPayload', 'json', { req: 1, label: 'Old logic payload', desc: 'The superseded parameter set, hashed into oldLogicHash' }),
    F('newLogicPayload', 'json', { req: 1, label: 'New logic payload', desc: 'The activated parameter set; SEED-12 changes nearThresholdBandPoints from 2 to 3' }),
  ],
  { access: ACCESS.ADM }
);

// ---------------------------------------------------------------------------
// 4. Classification, anomalies and the bid ledger (Section 3.3, Section 6)
// ---------------------------------------------------------------------------

const ClassificationResult = ENT(
  'procurement-ledger',
  'ClassificationResult',
  'ENT-11 (TABLE 6). Output of the pure Classification Engine (TABLE 14): "identical inputs and rule version always produce identical output". Branch order is PLI override (ENG-01), CUSTOM (ENG-02), COMPONENT_LEVEL (ENG-03..06), then STANDARD / WEIGHTED_MODULE (ENG-07).',
  [
    ID(),
    F('computedClass', 'enum', { req: 1, idx: 1, label: 'Computed class', options: E.ComputedClass, desc: 'ENG-08 classifyByPercent: >= classI gives CLASS_I; >= classII gives CLASS_II; else NON_LOCAL. CUSTOM yields MANUAL_REQUIRED' }),
    F('method', 'enum', { req: 1, label: 'Calculation method', options: E.CalculationMethod, desc: 'The method of the rule version actually applied' }),
    F('ruleVersion', 'int', { req: 1, label: 'Rule version', desc: 'The RuleConfig version used, so the result can be reproduced exactly' }),
    F('effectivePercent', 'float', { label: 'Effective local content', unit: '%', desc: 'Null when no percentage could be derived. ENG-05: for COMPONENT_LEVEL it is round(sum(declared * weight) / 100)' }),
    F('componentBreakdown', 'json', { label: 'Component breakdown', desc: 'COMPONENT_LEVEL only: [{name, declaredPercent, thresholdPercent, pass, weightPercent}]' }),
    F('pliDeemed', 'boolean', { req: 1, label: 'PLI deemed', desc: 'ENG-01: true when a PLI-linked rule met a PLI manufacturer, forcing CLASS_II with nearThreshold false' }),
    F('nearThreshold', 'boolean', { req: 1, label: 'Near threshold', desc: 'ENG-09 abs(effective - classI) <= 2 OR abs(effective - classII) <= 2; ENG-06 also sets it when any component failed its gate' }),
    F('reasons', 'json', { req: 1, label: 'Reasons', desc: 'string[] of human-readable reason lines citing both thresholds, rule version and ministry (ENG-07), plus the customRuleText on CUSTOM (ENG-02)' }),
  ],
  { access: ACCESS.AUTH }
);

const AnomalyFlag = ENT(
  'fraud-rules',
  'AnomalyFlag',
  'ENT-12 (TABLE 6). One flag raised by the Consistency Engine cross-tender memory (TABLE 15). Anomalies never exclude a bidder: ENG-43 lists flagged eligible bidders for committee attention only.',
  [
    ID(),
    REF('bidRecordId', 'Bid record', 'The BidRecord this flag was raised against'),
    F('type', 'enum', { req: 1, idx: 1, label: 'Anomaly type', options: E.AnomalyType, desc: 'SAME_PRODUCT_DIFFERENT_PERCENT (ENG-12, delta >= 10 points on a prior same-product bid), SUDDEN_CLASSIFICATION_JUMP (ENG-13), GEOGRAPHIC_INCONSISTENCY (ENG-14), VOLUME_CAPACITY_MISMATCH (ENG-15)' }),
    F('description', 'text', { req: 1, label: 'Description', desc: 'Names both tenders and the point delta (ENG-12) or the en-IN formatted cumulative quantity (ENG-15)' }),
    F('relatedTxRef', 'string', { label: 'Related transaction ref', desc: 'ENG-12: the txRef of the prior bid that triggered the flag' }),
  ],
  { access: ACCESS.AUTH }
);

const BidRecord = ENT(
  'procurement-ledger',
  'BidRecord',
  'ENT-13 (TABLE 6). The BID_SUBMITTED chain payload produced by the Trigger 1 orchestrator. ENG-41 ACL: vendorIds [vendor, oemReference if any], tenderIds [tender], ministries [rule.ministry]. Status follows the first-match precedence of ENG-32: RED debarred, RED below-threshold-for-claim, RED non-local-on-domestic, RED Para 3A, YELLOW manual (CUSTOM), YELLOW anomalies, YELLOW nearThreshold, YELLOW first declaration for this HSN, else GREEN. SEED-13 expects 9 bids: 1 GREEN, 7 YELLOW, 1 RED.',
  [
    ID(),
    F('bidId', 'string', { req: 1, uniq: 1, idx: 1, label: 'Bid ID', desc: "'bid_' + tenderId + '_' + vendorId + '_' + base36 time" }),
    F('tenderId', 'enum', { req: 1, idx: 1, label: 'Tender ID', options: E.TenderId }),
    F('vendorId', 'enum', { req: 1, idx: 1, label: 'Vendor ID', options: E.VendorId }),
    F('input', 'json', { req: 1, label: 'Input', desc: 'BidSubmissionInput, stored verbatim so the classification can be recomputed' }),
    F('classification', 'json', { req: 1, label: 'Classification', desc: 'ClassificationResult' }),
    F('anomalies', 'json', { req: 1, label: 'Anomalies', desc: 'AnomalyFlag[] from the Consistency Engine over the vendor full history (ENG-28 step 3)' }),
    F('debarred', 'boolean', { req: 1, label: 'Debarred', desc: 'ENG-20 preBidDebarmentCheck: true when the submission date falls inside an active debarment window for the vendor' }),
    F('status', 'enum', { req: 1, idx: 1, label: 'Compliance status', options: E.ComplianceStatus, desc: 'GREEN, YELLOW or RED by the ENG-32 precedence ladder' }),
    F('statusReasons', 'json', { req: 1, label: 'Status reasons', desc: 'string[] of the ENG-33..40 reason texts backing the status' }),
    F('createdAt', 'datetime', { req: 1, label: 'Created at' }),
    ...CHAIN(),
  ],
  { core: true, access: ACCESS.AUTH, onChain: true }
);

const EvaluationRow = ENT(
  'procurement-ledger',
  'EvaluationRow',
  'API-02 row shape. One line of GET /tenders/{tenderId}/evaluation, the Trigger 2 Bid Evaluation read model: "{tenderId, cachedAt, bids[{vendorId, bidId, status, computedClass, quotedPricePerUnit, anomalies, reasons, txRef}], fromCache?}". Filtered through canAccess (CHN-22/CHN-23) for the calling identity.',
  [
    ID(),
    F('tenderId', 'enum', { req: 1, idx: 1, label: 'Tender ID', options: E.TenderId }),
    F('vendorId', 'enum', { req: 1, idx: 1, label: 'Vendor ID', options: E.VendorId }),
    F('bidId', 'string', { req: 1, idx: 1, label: 'Bid ID', desc: "'bid_' + tenderId + '_' + vendorId + '_' + base36 time" }),
    F('status', 'enum', { req: 1, label: 'Compliance status', options: E.ComplianceStatus }),
    F('computedClass', 'enum', { req: 1, label: 'Computed class', options: E.ComputedClass }),
    F('quotedPricePerUnit', 'float', { req: 1, label: 'Quoted price per unit', unit: 'INR' }),
    F('anomalies', 'json', { req: 1, label: 'Anomalies', desc: 'AnomalyFlag[] carried through from the BidRecord' }),
    F('reasons', 'json', { req: 1, label: 'Reasons', desc: 'string[] of the status reason texts (ENG-33..40)' }),
    F('txRef', 'string', { req: 1, idx: 1, label: 'Transaction ref', desc: 'The BID_SUBMITTED txRef, resolvable on the public /verify screen (CHK-01)' }),
  ],
  { access: ACCESS.AUTH }
);

const EvaluationCacheEntry = ENT(
  'procurement-ledger',
  'EvaluationCacheEntry',
  'APX-04. The in-memory TTL cache used only by the evaluation endpoint: "get / set (default 5 min) / invalidate by prefix / clear". API-02 caches per tender + role + id; RUL-10 clears every key prefixed "evaluation:" after a successful rule update.',
  [
    ID(),
    F('cacheKey', 'string', { req: 1, uniq: 1, idx: 1, label: 'Cache key', desc: "'evaluation:' + tenderId + ':' + role + ':' + id" }),
    F('tenderId', 'enum', { req: 1, idx: 1, label: 'Tender ID', options: E.TenderId }),
    F('role', 'enum', { req: 1, label: 'Role', options: E.Role, desc: 'The caller role, because ACL filtering makes the payload identity-specific' }),
    F('identityId', 'string', { req: 1, label: 'Identity ID', desc: "The ?id= query parameter; ROLE-16 falls back to VENDOR '__anonymous__'" }),
    F('cachedAt', 'datetime', { req: 1, label: 'Cached at', desc: 'Returned to the client as cachedAt on the evaluation response' }),
    F('ttlSeconds', 'int', { req: 1, label: 'TTL', unit: 's', def: 300, desc: 'Default 5 minutes' }),
    F('payload', 'json', { req: 1, label: 'Payload', desc: 'The cached evaluation response: {tenderId, cachedAt, bids[EvaluationRow]}' }),
    F('fromCache', 'boolean', { req: 1, label: 'From cache', desc: 'Set on the response when it was served from this entry rather than recomputed' }),
  ],
  { access: ACCESS.AUTH }
);

// ---------------------------------------------------------------------------
// 5. Certification and the Auditor Accountability Ledger (Section 6.4)
// ---------------------------------------------------------------------------

const CACertificationRecord = ENT(
  'compliance-attestations',
  'CACertificationRecord',
  'ENT-14 (TABLE 6). The CA_CERTIFICATION chain payload. ENG-23 ACL: vendorIds [vendor], tenderIds [tender], caIds [caKey], public false, so only the vendor, the procuring entity, that CA, AUDIT and DPIIT_ADMIN can read it (ROLE-09..15). SEED-08 anchors three certifications by Sharma & Associates at the same percentages as the bids, so none of them mismatch.',
  [
    ID(),
    F('certId', 'string', { req: 1, uniq: 1, idx: 1, label: 'Certificate ID', desc: "'cert_' + bidId + '_' + base36" }),
    F('bidId', 'string', { req: 1, idx: 1, label: 'Bid ID', desc: "The certified BidRecord: 'bid_' + tenderId + '_' + vendorId + '_' + base36 time" }),
    F('vendorId', 'enum', { req: 1, idx: 1, label: 'Vendor ID', options: E.VendorId }),
    F('tenderId', 'enum', { req: 1, idx: 1, label: 'Tender ID', options: E.TenderId }),
    F('input', 'json', { req: 1, label: 'Input', desc: 'CACertificationInput, including the CA firm registration and membership numbers that form the CA key (ROLE-08)' }),
    F('declaredPercent', 'float', { req: 1, label: 'Declared local content', unit: '%', desc: 'The bid effectivePercent the certified figure was compared against (0 when null)' }),
    F('mismatch', 'boolean', { req: 1, idx: 1, label: 'Mismatch', desc: 'delta >= 5 points (ENG-22)' }),
    F('mismatchDeltaPercent', 'float', { req: 1, label: 'Mismatch delta', unit: 'pt', desc: 'ENG-22: abs(certified - bid.effectivePercent or 0)' }),
    F('createdAt', 'datetime', { req: 1, label: 'Created at' }),
    ...CHAIN(),
  ],
  { access: ACCESS.AUTH, onChain: true }
);

const AuditorFlaggedPayload = ENT(
  'compliance-attestations',
  'AuditorFlaggedPayload',
  'ENT-21 (TABLE 6) and ENG-24 flagAuditorForVendorDebarment. When a vendor is debarred for a false declaration, a public AUDITOR_FLAGGED transaction is written for every CA key that certified that vendor, "listing every OTHER cert by that CA (flaggedCertIds), totalCertsByCA, triggering vendor and debarment". SEED-10 raises one for Sharma & Associates with 2 other certificates.',
  [
    ID(),
    F('caKey', 'string', { req: 1, idx: 1, label: 'CA key', desc: "ROLE-08: firmRegistration + '::' + membershipNumber, for example Sharma-and-Associates-FR-2201::ICAI-M-118824" }),
    F('triggeringVendorId', 'enum', { req: 1, idx: 1, label: 'Triggering vendor', options: E.VendorId, desc: 'The debarred vendor whose certification pulled this CA into the ledger' }),
    F('triggeringDebarmentId', 'string', { req: 1, idx: 1, label: 'Triggering debarment ID', desc: "'debar_' + vendorId + '_' + base36" }),
    F('flaggedCertIds', 'json', { req: 1, label: 'Flagged certificate IDs', desc: 'string[] of every OTHER certId issued by this CA, now under review' }),
    F('totalCertsByCA', 'int', { req: 1, label: 'Total certificates by CA', desc: 'Denominator of the risk score (ENG-25)' }),
    F('flaggedAt', 'datetime', { req: 1, label: 'Flagged at' }),
    ...CHAIN(),
  ],
  { access: ACCESS.AUTH, onChain: true }
);

const AuditorRiskProfile = ENT(
  'compliance-attestations',
  'AuditorRiskProfile',
  'ENT-24 (TABLE 6), derived: "Never stored; recomputed on read". ENG-25 getAuditorRiskProfile: problematic = certificates whose vendorId appears in any debarment with a false-declaration reason; riskScore = problematic / total, 0 when the CA has no certificates; problematicVendorIds deduplicated. SCN-10: Sharma & Associates move from 0% to 33% once Krishna is debarred.',
  [
    ID(),
    F('caKey', 'string', { req: 1, uniq: 1, idx: 1, label: 'CA key', desc: "ROLE-08 firmRegistration + '::' + membershipNumber; ENG-26 listAllCAKeys returns the distinct keys across all certifications" }),
    F('totalCertifications', 'int', { req: 1, label: 'Total certifications' }),
    F('problematicCertifications', 'int', { req: 1, label: 'Problematic certifications', desc: 'Certificates issued to a vendor later debarred for a false declaration' }),
    F('riskScore', 'float', { req: 1, label: 'Risk score', desc: '0..1 = problematic / total' }),
    F('problematicVendorIds', 'json', { req: 1, label: 'Problematic vendor IDs', desc: 'Deduplicated string[] of the debarred vendors this CA certified' }),
  ],
  { access: ACCESS.AUTH }
);

// ---------------------------------------------------------------------------
// 6. Cross-ministry debarment registry (Section 6.3)
// ---------------------------------------------------------------------------

const DebarmentRecord = ENT(
  'govt-interdept',
  'DebarmentRecord',
  'ENT-15 (TABLE 6). The DEBARMENT_CREATED chain payload, written with a public ACL because ENG-17 states there is "no per-ministry silo": a debarment by any authority blocks the vendor everywhere (SCN-09). TABLE 45 seeds two: SEED-09 Chambal Devices, Ministry of Defence, "False declaration of local content", 2025-04-01 to 2027-03-31, linked MOD-2025-TENDER-0042, penalty Rs 500,000, no CA certificates to flag; SEED-10 Krishna Integrated Devices, DoT, same reason, 2026-01-15 to 2028-01-14, linked T-002, penalty Rs 300,000, which triggers AUDITOR_FLAGGED for Sharma & Associates.',
  [
    ID(),
    F('debarmentId', 'string', { req: 1, uniq: 1, idx: 1, label: 'Debarment ID', desc: "'debar_' + vendorId + '_' + base36" }),
    F('vendorId', 'enum', { req: 1, idx: 1, label: 'Vendor ID', options: E.VendorId }),
    F('reason', 'text', { req: 1, label: 'Reason', desc: '/false declaration/i triggers the Auditor Accountability Ledger (ENG-19)' }),
    F('startDate', 'date', { req: 1, label: 'Start date', desc: 'ENG-20: a bid is blocked when its date falls within [startDate, endDate]' }),
    F('endDate', 'date', { req: 1, label: 'End date', desc: 'max start + 2 years, GFR Rule 151(iii)' }),
    F('debarringAuthority', 'string', { req: 1, label: 'Debarring authority', desc: 'Quoted verbatim in the ENG-33 RED reason text on every blocked bid' }),
    F('linkedTenders', 'json', { req: 1, label: 'Linked tenders', desc: 'string[] of the tender references the debarment arises from' }),
    F('penaltyAmountRupees', 'float', { label: 'Penalty amount', unit: 'INR' }),
    F('createdAt', 'datetime', { req: 1, label: 'Created at' }),
    ...CHAIN(),
  ],
  { access: ACCESS.AUTH, onChain: true }
);

const DebarmentWebhookPayload = ENT(
  'govt-interdept',
  'DebarmentWebhookPayload',
  'ENT-22 (TABLE 6) and ENG-18: "Immediately after, write DEBARMENT_WEBHOOK_EMITTED (public) with recipients ALL_PROCURING_ENTITIES". The fan-out that makes a debarment cross-ministry in one block rather than by circular.',
  [
    ID(),
    F('debarmentId', 'string', { req: 1, idx: 1, label: 'Debarment ID', desc: "The DebarmentRecord just written: 'debar_' + vendorId + '_' + base36" }),
    F('recipients', 'enum', { req: 1, label: 'Recipients', options: E.WebhookRecipient, desc: "Always ALL_PROCURING_ENTITIES" }),
    F('notifiedAt', 'datetime', { req: 1, label: 'Notified at' }),
    ...CHAIN(),
  ],
  { access: ACCESS.AUTH, onChain: true }
);

// ---------------------------------------------------------------------------
// 7. Purchase Preference Decision Engine (Section 6.6)
// ---------------------------------------------------------------------------

const PreferenceOutcome = ENT(
  'ent-workflow',
  'PreferenceOutcome',
  'ENT-19 (TABLE 6). The PREFERENCE_CALCULATED chain payload of Trigger 3. ENG-57 ACL: tenderIds [tender], vendorIds = eligible bidder ids. ENG-42 excludes every RED bid at pre-filter, ENG-45 ranks the rest ascending by price to find L1, and the decision then runs either the MII paths (ENG-49..52, band 1.20) or the MSE matrix (ENG-53..56, bands 1.15 and 1.20). ENG-44: with no eligible bidders the path is NO_ELIGIBLE_BIDDERS, the split is empty and nothing is written to the chain.',
  [
    ID(),
    F('tenderId', 'enum', { req: 1, idx: 1, label: 'Tender ID', options: E.TenderId }),
    F('decisionPath', 'enum', { req: 1, idx: 1, label: 'Decision path', options: E.DecisionPath, desc: 'One of the 9 MII paths or the 11 MSE matrix paths, recorded so the award is explainable' }),
    F('l1VendorId', 'enum', { req: 1, label: 'L1 vendor', options: E.VendorId, desc: 'ENG-45: the lowest quotedPricePerUnit among eligible bidders' }),
    F('l1Price', 'float', { req: 1, label: 'L1 price', unit: 'INR', desc: 'Every award in the split is made at this price' }),
    F('eligibleBidders', 'json', { req: 1, label: 'Eligible bidders', desc: 'string[] of vendorIds that survived the RED pre-filter (ENG-42)' }),
    F('excludedBidders', 'json', { req: 1, label: 'Excluded bidders', desc: '[{vendorId, reason}]' }),
    F('classICandidates', 'json', { req: 1, label: 'Class-I candidates', desc: '[{vendorId, price, withinBand}]' }),
    F('priceMatchOffers', 'json', { req: 1, label: 'Price match offers', desc: 'PriceMatchOffer[] from the offer cascade (ENG-48)' }),
    F('msePreferenceApplied', 'boolean', { req: 1, label: 'MSE preference applied', desc: 'Spelled mseePreferenceApplied in TABLE 6; recorded here as msePreferenceApplied. True when the MSE matrix (ENG-53..56) drove the award rather than the plain MII path' }),
    F('para3AEnforced', 'boolean', { req: 1, label: 'Para 3A enforced', desc: 'SCN-06: a non-Class-I bid on a Para 3A SI/EPC tender is RED at submission and excluded at pre-filter' }),
    F('quantitySplit', 'json', { req: 1, label: 'Quantity split', desc: '[{vendorId, quantity, price}]' }),
    F('marginCalculations', 'json', { req: 1, label: 'Margin calculations', desc: '[{vendorId, l1Price, bandLimit, candidatePrice}]' }),
    F('anomaliesFlagged', 'json', { req: 1, label: 'Anomalies flagged', desc: "ENG-43: eligible bidders carrying consistency flags, formatted 'vendor: TYPE, TYPE'. Flagged for committee attention, never excluded" }),
    F('steps', 'json', { req: 1, label: 'Decision trace', desc: 'DecisionTraceStep[]' }),
    F('committeeAction', 'enum', { label: 'Committee action', options: E.CommitteeAction, desc: 'Folded in from the latest PREFERENCE_COMMITTEE_ACTION for this tender (ENG-59/60)' }),
    F('committeeRemarks', 'text', { label: 'Committee remarks' }),
    F('createdAt', 'datetime', { req: 1, label: 'Created at', desc: 'ENG-58 getLatestPreferenceOutcome picks the most recent by createdAt, hydrated' }),
    ...CHAIN(),
  ],
  { core: true, access: ACCESS.AUTH, onChain: true }
);

const PriceMatchOffer = ENT(
  'ent-workflow',
  'PriceMatchOffer',
  'ENT-17 (TABLE 6). One rung of the offer cascade (ENG-48): "bandLimit = round(l1 * multiplier, 2). Candidates within band, ascending price, are each offered a match; first acceptance wins. Out-of-band candidates are listed as offered = false." Multiplier is 1.20 on the MII and Class-I bands and 1.15 on the MSE band.',
  [
    ID(),
    REF('preferenceOutcomeId', 'Preference outcome', 'The PREFERENCE_CALCULATED outcome this offer belongs to'),
    F('candidateVendorId', 'enum', { req: 1, idx: 1, label: 'Candidate vendor', options: E.VendorId }),
    F('candidatePrice', 'float', { req: 1, label: 'Candidate price', unit: 'INR', desc: 'The candidate own quoted price per unit, before matching down to the L1 price' }),
    F('withinBand', 'boolean', { req: 1, label: 'Within band', desc: 'candidatePrice <= bandLimit (ENG-46 uses L1 * 1.2 for the Class-I band)' }),
    F('bandLimit', 'float', { req: 1, label: 'Band limit', unit: 'INR', desc: 'round(l1Price * multiplier, 2)' }),
    F('offered', 'boolean', { req: 1, label: 'Offered', desc: 'False for out-of-band candidates, which are still listed for transparency' }),
    F('accepted', 'boolean', { label: 'Accepted', desc: 'PoC always accepts (SIM-04)' }),
  ],
  { access: ACCESS.AUTH }
);

const DecisionTraceStep = ENT(
  'ent-workflow',
  'DecisionTraceStep',
  'ENT-18 (TABLE 6). One ordered line of the preference decision trace, so an award can be replayed and defended. Steps run Pre-filter (ENG-42), Consistency flags (ENG-43), Rank by price (ENG-45), Class-I candidates (ENG-46), Classify L1 (ENG-47), Offer cascade (one step per offer, ENG-48) and Award.',
  [
    ID(),
    REF('preferenceOutcomeId', 'Preference outcome', 'The PREFERENCE_CALCULATED outcome this step belongs to'),
    F('order', 'int', { req: 1, idx: 1, label: 'Order', desc: 'Position in the steps[] array, ascending' }),
    F('step', 'enum', { req: 1, label: 'Step', options: E.PreferenceTraceStep }),
    F('detail', 'text', { req: 1, label: 'Detail', desc: "Human-readable line, for example the ENG-47 combined status '{MSE|Non-MSE} + {Class-I|Non-Class-I}' or the ENG-55 'extended pattern' label on the divisible case" }),
    F('data', 'json', { label: 'Data', desc: 'Structured counts or rows backing the step, when the detail alone is not enough' }),
  ],
  { access: ACCESS.AUTH }
);

const CommitteeActionPayload = ENT(
  'eprocurement-workflow',
  'CommitteeActionPayload',
  'ENT-20 (TABLE 6). The PREFERENCE_COMMITTEE_ACTION chain payload written by ENG-59 with ACL tenderIds [tender] and public true, so the human override of an engine recommendation is itself on the ledger. ENG-60 returns every payload for a tender in chain order.',
  [
    ID(),
    F('tenderId', 'enum', { req: 1, idx: 1, label: 'Tender ID', options: E.TenderId }),
    F('preferenceTxRef', 'string', { req: 1, idx: 1, label: 'Preference transaction ref', desc: 'The PREFERENCE_CALCULATED txRef being acted on' }),
    F('action', 'enum', { req: 1, label: 'Action', options: E.CommitteeAction }),
    F('remarks', 'text', { req: 1, label: 'Remarks', desc: "ENG-59: defaults to ''" }),
    F('modifiedQuantitySplit', 'json', { label: 'Modified quantity split', desc: 'MODIFIED only: [{vendorId, quantity, price}] replacing the engine split, null otherwise' }),
    F('committeeIdentity', 'string', { req: 1, label: 'Committee identity', desc: 'Normally procuring-entity-1 (ROLE-04)' }),
    F('timestamp', 'datetime', { req: 1, label: 'Timestamp' }),
    ...CHAIN(),
  ],
  { access: ACCESS.AUTH, onChain: true }
);

// ---------------------------------------------------------------------------
// 8. Smart Evolution: versioned logic (Section 4.5)
// ---------------------------------------------------------------------------

const LogicUpgradedPayload = ENT(
  'upgrade-manager',
  'LogicUpgradedPayload',
  'ENT-23 (TABLE 6) and CHN-26. The public LOGIC_UPGRADED transaction written before the logic_versions row, so a change to the rules of the engine itself is anchored on the same ledger as the decisions it produces. SEED-12 upgrades classification-engine v1 to v2 with approvers cerulea-platform-admin and dpiit-domain-expert.',
  [
    ID(),
    F('module', 'enum', { req: 1, idx: 1, label: 'Module', options: E.LogicModule }),
    F('oldVersion', 'int', { req: 1, label: 'Old version', desc: 'CHN-25 getCurrentLogicVersion: MAX(version) from logic_versions, default 1' }),
    F('newVersion', 'int', { req: 1, label: 'New version', desc: 'CHN-26 rejects newVersion <= current' }),
    F('description', 'string', { req: 1, label: 'Description' }),
    F('approvers', 'json', { req: 1, label: 'Approvers', desc: "string[], min 2; fewer throws 'requires multi-signature approval' (CHN-26)" }),
    F('oldLogicHash', 'bytes32', { label: 'Old logic hash', desc: 'sha256Json of the superseded payload; null for the first activation' }),
    F('newLogicHash', 'bytes32', { req: 1, label: 'New logic hash', desc: 'sha256Json of the activated payload (CHN-07)' }),
    F('activatedAt', 'datetime', { req: 1, label: 'Activated at' }),
    ...CHAIN(),
  ],
  { access: ACCESS.AUTH, onChain: true }
);

const LogicVersion = ENT(
  'upgrade-manager',
  'LogicVersion',
  'CHN-04 table logic_versions: "id AUTOINCREMENT, module, version, description, old_version, approvers_json, old_logic_hash, new_logic_hash, activated_at, tx_ref". Inserted only after the LOGIC_UPGRADED transaction is finalized, so every row points at a block. CHN-25 reads MAX(version) per module; CHN-27 getLogicHistory returns rows ascending by version with approvers parsed.',
  [
    ID(),
    F('module', 'enum', { req: 1, idx: 1, label: 'Module', options: E.LogicModule }),
    F('version', 'int', { req: 1, idx: 1, label: 'Version' }),
    F('description', 'string', { req: 1, label: 'Description' }),
    F('oldVersion', 'int', { label: 'Old version', desc: 'Null for the first recorded version of a module' }),
    F('approvers', 'json', { req: 1, label: 'Approvers', desc: 'string[] parsed back out of approvers_json (CHN-27)' }),
    F('oldLogicHash', 'bytes32', { label: 'Old logic hash' }),
    F('newLogicHash', 'bytes32', { req: 1, label: 'New logic hash' }),
    F('activatedAt', 'datetime', { req: 1, label: 'Activated at' }),
    F('txRef', 'string', { req: 1, idx: 1, label: 'Transaction ref', desc: 'The LOGIC_UPGRADED transaction this row was written with (CHN-26)' }),
  ],
  { access: ACCESS.ADM }
);

// ---------------------------------------------------------------------------
// 9. The chain itself (Section 4.1 - 4.4)
// ---------------------------------------------------------------------------

const FinalizedBlock = ENT(
  'consensus',
  'FinalizedBlock',
  'ENT-26 (TABLE 6) and CHN-02 table blocks: "height INTEGER PK, prev_hash, merkle_root, hash, timestamp, quorum, signatures_json. All NOT NULL". CHN-11 wraps each action in its own block, so the seed produces exactly 26 finalized blocks (SEED-13). CHN-15 synchronous finality: hashing, Merkle root, consensus and both inserts complete inside the call that returns the domain result.',
  [
    ID(),
    F('height', 'int', { storage: 'on-chain', req: 1, uniq: 1, idx: 1, label: 'Height', desc: 'CHN-11: previous height + 1, or 0 on an empty chain' }),
    F('prevHash', 'bytes32', { storage: 'on-chain', req: 1, label: 'Previous hash', desc: 'CHN-05: the genesis hash for block 0, otherwise the previous block hash. CHN-20 walks this chain to detect tampering' }),
    F('merkleRoot', 'bytes32', { storage: 'on-chain', req: 1, label: 'Merkle root', desc: "CHN-08: empty list returns sha256(''); pairwise sha256(left + right) with an odd leaf paired with itself, repeated to one root, over the block payload hashes" }),
    F('timestamp', 'datetime', { storage: 'on-chain', req: 1, label: 'Timestamp' }),
    F('txRefs', 'json', { storage: 'on-chain', req: 1, label: 'Transaction refs', desc: 'string[]; CHN-09 deliberately excludes them from the header hash and CHN-19 looks them up per block' }),
    F('hash', 'bytes32', { storage: 'on-chain', req: 1, uniq: 1, label: 'Block hash', desc: 'CHN-09 computeBlockHash: sha256 of JSON {height, prevHash, merkleRoot, timestamp} in that key order' }),
    F('signatures', 'json', { storage: 'on-chain', req: 1, label: 'Signatures', desc: 'ValidatorSignature[] stored as signatures_json' }),
    F('quorum', 'enum', { storage: 'on-chain', req: 1, label: 'Quorum', options: E.Quorum, desc: "CHN-14: finalized at signatures >= ceil(3 * 2 / 3) = 2, recorded as 'n/3'. Failure throws 'DCF consensus quorum not reached; block rejected' and nothing is written" }),
  ],
  { core: true, access: ACCESS.SYS, onChain: true }
);

const ValidatorSignature = ENT(
  'consensus',
  'ValidatorSignature',
  'ENT-27 (TABLE 6) and CHN-13 consensus round: "Each validator independently recomputes the candidate block hash. A match yields a signature with confirmedAt". Two of the three validators must agree before a block is written (CHN-14).',
  [
    ID(),
    F('blockHeight', 'int', { storage: 'on-chain', req: 1, idx: 1, label: 'Block height', desc: 'The candidate block this validator confirmed' }),
    F('nodeId', 'enum', { storage: 'on-chain', req: 1, idx: 1, label: 'Node ID', options: E.ValidatorNodeId }),
    F('organization', 'enum', { req: 1, label: 'Organisation', options: E.ValidatorOrganisation, desc: 'CHN-12: the institution behind the node, which is what makes the quorum a cross-institutional one' }),
    F('confirmedHash', 'bytes32', { storage: 'on-chain', req: 1, label: 'Confirmed hash', desc: 'The block hash this validator independently recomputed; it must match the candidate for a signature to be produced' }),
    F('signature', 'bytes32', { storage: 'on-chain', req: 1, label: 'Signature', desc: 'sha256(nodeId + ":" + blockHash + ":cerulea-dcf-v1") (SIM-02)' }),
    F('confirmedAt', 'datetime', { req: 1, label: 'Confirmed at' }),
  ],
  { access: ACCESS.SYS, onChain: true }
);

const ChainTransaction = ENT(
  'private-tx',
  'ChainTransaction',
  'ENT-25 (TABLE 6) and CHN-03 table transactions: "tx_ref PK, block_height, type, payload_json, acl_json, timestamp, payload_hash. Index on type". The envelope every domain record is carried in. CHN-24 hydrate returns {...payload, txRef, blockHeight} so the stored placeholders ("" and -1) are always overwritten by the envelope.',
  [
    ID(),
    F('txRef', 'string', { storage: 'on-chain', req: 1, uniq: 1, idx: 1, label: 'Transaction ref', desc: "CHN-10: 'tx_' + base36(now) + '_' + base36(counter) + '_' + first 10 hex of sha256Json({type, payload, timestamp})" }),
    F('type', 'enum', { storage: 'on-chain', req: 1, idx: 1, label: 'Type', options: E.TxType, desc: 'CHN-17 queryTransactionsByType returns rows ascending by block height' }),
    F('payload', 'json', { storage: 'on-chain', req: 1, label: 'Payload', desc: 'The domain record, stored as payload_json. CHN-21 never returns it on the public verify endpoint' }),
    F('timestamp', 'datetime', { storage: 'on-chain', req: 1, label: 'Timestamp' }),
    F('blockHeight', 'int', { storage: 'on-chain', req: 1, idx: 1, label: 'Block height', desc: 'CHN-16 getTransaction joins on blocks to return blockHash; null when absent' }),
    F('blockHash', 'bytes32', { storage: 'on-chain', req: 1, label: 'Block hash', desc: 'CHN-09 header hash of the containing block' }),
    F('payloadHash', 'bytes32', { storage: 'on-chain', req: 1, idx: 1, label: 'Payload hash', desc: 'CHN-07 sha256Json(payload); also the Merkle leaf CHN-20 recomputes when checking integrity' }),
    F('acl', 'json', { storage: 'on-chain', req: 1, label: 'Access control list', desc: '{vendorIds?, ministries?, tenderIds?, caIds?, public?}' }),
  ],
  { core: true, access: ACCESS.SYS, onChain: true }
);

const ChainAcl = ENT(
  'private-tx',
  'ChainAcl',
  'The acl shape carried by every ChainTransaction (ENT-25), enforced by CHN-22 canAccess and applied to reads by CHN-23. ROLE-09 public: any transaction with acl.public = true is readable by every identity. ROLE-10 AUDIT and ROLE-11 DPIIT_ADMIN read every transaction on the ledger. ROLE-12 VENDOR reads only when acl.vendorIds contains its id, and a reseller bid also lists the OEM id. ROLE-13 CA reads only when acl.caIds contains its CA key. ROLE-14 PROCURING_ENTITY reads any transaction with at least one tenderId in its ACL. ROLE-15 MINISTRY_ADMIN reads only when acl.ministries contains its ministry name. ROLE-16: a missing or invalid role/id resolves to VENDOR __anonymous__, which sees public records only.',
  [
    ID(),
    ONREF('chainTransactionId', 'Chain transaction', 'The envelope this ACL belongs to'),
    F('vendorIds', 'json', { storage: 'on-chain', req: 1, label: 'Vendor IDs', desc: 'string[]; ENG-41 lists [vendor, oemReference if any] on a bid and ENG-57 lists every eligible bidder on a preference outcome' }),
    F('ministries', 'json', { storage: 'on-chain', req: 1, label: 'Ministries', desc: 'string[]; RUL-05 sets [ministry] on a rule update and ENG-41 sets [rule.ministry] on a bid' }),
    F('tenderIds', 'json', { storage: 'on-chain', req: 1, label: 'Tender IDs', desc: 'string[]; presence of any tenderId is what grants the procuring entity its read (ROLE-14)' }),
    F('caIds', 'json', { storage: 'on-chain', req: 1, label: 'CA IDs', desc: 'string[] of CA keys; ENG-23 sets [caKey] on a certification' }),
    F('public', 'boolean', { storage: 'on-chain', req: 1, label: 'Public', desc: 'True on rule updates (RUL-05), debarments and their webhooks (ENG-17/18), auditor flags (ENG-24), committee actions (ENG-59) and logic upgrades (CHN-26)' }),
  ],
  { access: ACCESS.SYS }
);

const ValidatorNode = ENT(
  'validators',
  'ValidatorNode',
  'CHN-12 validator set (3): validator-gem-gateway "GeM API Gateway (CBC-PRAMAAN Integration)"; validator-dpiit "DPIIT National Node"; validator-nodal-ministry "Nodal Ministry Rotating Seat". The three institutions that must agree before a compliance decision is finalized (CHN-13/14).',
  [
    ID(),
    F('nodeId', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Node ID', options: E.ValidatorNodeId }),
    F('organization', 'enum', { req: 1, label: 'Organisation', options: E.ValidatorOrganisation }),
    F('status', 'enum', { req: 1, label: 'Status', options: ['ONLINE', 'OFFLINE'], desc: 'A node must be ONLINE to contribute a signature to the quorum' }),
    F('lastConfirmedHeight', 'int', { req: 1, label: 'Last confirmed height', desc: 'The highest block this node signed' }),
    F('lastConfirmedAt', 'datetime', { req: 1, label: 'Last confirmed at' }),
  ],
  { access: ACCESS.ADM }
);

const IntegrityCheckResult = ENT(
  'chain-audit-export',
  'IntegrityCheckResult',
  'ENT-28 (TABLE 6) and CHN-20 verifyChainIntegrity: "Walk blocks ascending: prev_hash must equal previous hash (genesis for block 0); recomputed Merkle root of the block payload_hashes must equal merkle_root; recomputed header hash must equal hash. First failure returns {valid: false, brokenAtHeight, reason}". CHK-02: the Run Integrity Check action re-hashes every block and reports valid.',
  [
    ID(),
    F('ranAt', 'datetime', { req: 1, idx: 1, label: 'Ran at' }),
    F('valid', 'boolean', { req: 1, idx: 1, label: 'Valid' }),
    F('blocksChecked', 'int', { req: 1, label: 'Blocks checked', desc: 'The seeded chain has 26 finalized blocks (SEED-13)' }),
    F('brokenAtHeight', 'int', { label: 'Broken at height', desc: 'Height of the first failing block, absent when valid' }),
    F('reason', 'enum', { label: 'Reason', options: E.IntegrityReason, desc: 'prevHash mismatch, merkleRoot mismatch or block hash mismatch' }),
    F('ranByIdentity', 'string', { req: 1, label: 'Ran by identity', desc: 'The identity that triggered the check, normally cvc (ROLE-07) or dpiit-national (ROLE-06)' }),
  ],
  { access: ACCESS.AUTH }
);

const VerificationLookup = ENT(
  'chain-audit-export',
  'VerificationLookup',
  'CHN-21 verifyRecordByHashOrTxRef and API-23 GET /chain/verify. Backs the public /verify screen with no gate: it proves that a record exists on the ledger, in which block, without disclosing anything commercial. CHN-21 never returns payload, price or percentage. API-23 errors with "Provide a transaction reference or declaration hash via ?ref=" when the ref is missing, and CHK-01 requires that any txRef from any response resolves here.',
  [
    ID(),
    F('ref', 'string', { req: 1, idx: 1, label: 'Reference', desc: 'txRef first, then payload_hash' }),
    F('found', 'boolean', { req: 1, label: 'Found' }),
    F('txRef', 'string', { label: 'Transaction ref' }),
    F('blockHeight', 'int', { label: 'Block height' }),
    F('blockHash', 'bytes32', { label: 'Block hash' }),
    F('type', 'enum', { label: 'Type', options: E.TxType }),
    F('timestamp', 'datetime', { label: 'Timestamp' }),
    F('chainIntegrityValid', 'boolean', { req: 1, label: 'Chain integrity valid', desc: 'API-23 adds the CHN-20 verdict alongside the lookup result' }),
  ],
  { access: ACCESS.PUB }
);

const ChainSettings = ENT(
  'genesis',
  'ChainSettings',
  'CHN-01..05 storage and genesis plus CHN-12..15 consensus parameters, as one configuration record for the Cerulea private permissioned chain. A single facade (CeruleaClient) is the only thing engines and routes import, so swapping the simulator for production nodes touches only these values.',
  [
    ID(),
    F('chainName', 'string', { req: 1, label: 'Chain name', def: 'CBC-PRAMAAN Cerulea Private Permissioned Chain' }),
    F('genesisSeed', 'string', { req: 1, label: 'Genesis seed', def: 'CBC-PRAMAAN / Cerulea Private Permissioned Chain / genesis', desc: 'CHN-05: the string hashed to produce the genesis hash' }),
    F('genesisHash', 'bytes32', { req: 1, label: 'Genesis hash', desc: "CHN-05: sha256('CBC-PRAMAAN / Cerulea Private Permissioned Chain / genesis'), used as prevHash of block 0" }),
    F('dbPathLocal', 'string', { req: 1, label: 'Local database path', def: 'data/chain.db', desc: 'CHN-01: <project>/data/chain.db' }),
    F('dbPathVercel', 'string', { req: 1, label: 'Vercel database path', def: '/tmp/cbc-pramaan-data/chain.db', desc: 'CHN-01: the only writable location on Vercel' }),
    F('journalMode', 'string', { req: 1, label: 'Journal mode', def: 'WAL', desc: 'CHN-01: WAL journal mode' }),
    F('validatorCount', 'int', { req: 1, label: 'Validator count', def: 3, desc: 'CHN-12: three validators, one per institution' }),
    F('quorumSignatures', 'int', { req: 1, label: 'Quorum signatures', def: 2, desc: 'CHN-14: ceil(3 * 2 / 3) = 2' }),
    F('signatureSalt', 'string', { req: 1, label: 'Signature salt', def: 'cerulea-dcf-v1', desc: 'CHN-13: sha256(nodeId + ":" + blockHash + ":" + salt)' }),
    F('oneTransactionPerBlock', 'boolean', { req: 1, label: 'One transaction per block', def: true, desc: 'CHN-11: submitTransaction wraps each action in its own block' }),
    F('synchronousFinality', 'boolean', { req: 1, label: 'Synchronous finality', def: true, desc: 'CHN-15: consensus and both inserts complete inside the same call that returns the domain result' }),
  ],
  { access: ACCESS.ADM }
);

// ---------------------------------------------------------------------------
// 10. Analytics read model (Section 6.7)
// ---------------------------------------------------------------------------

const Analytics = ENT(
  'regulatory-reporting',
  'Analytics',
  'ENT-29 (TABLE 6), derived. The national compliance picture recomputed from the ledger: ENG-61 bid value = quotedPricePerUnit * quantity; ENG-62 attributes each bid to the ministry of the rule for its HSN, else the wildcard rule, else "Unknown"; ENG-63 buckets by computedClass per ministry; ENG-64 sums value and count per vendor sorted descending; ENG-65 measures Para 3A impact per rule. ENG-66 determinism: "Two consecutive computations over the same chain must be JSON-identical", asserted by the rebuild script (CHK-03).',
  [
    ID(),
    F('computedAt', 'datetime', { req: 1, idx: 1, label: 'Computed at' }),
    F('totalBids', 'int', { req: 1, label: 'Total bids', desc: 'SEED-13 baseline: 9 bids (1 GREEN, 7 YELLOW, 1 RED)' }),
    F('classShareByMinistry', 'json', { req: 1, label: 'Class share by ministry', desc: '[{ministry, classI, classII, nonLocal, manual, totalValue}]' }),
    F('vendorConcentration', 'json', { req: 1, label: 'Vendor concentration', desc: '[{vendorId, legalName, totalValue, bidCount}] sorted desc by totalValue' }),
    F('anomalyCount', 'int', { req: 1, label: 'Anomaly count', desc: 'SEED-13 baseline: 1 anomaly' }),
    F('debarmentCount', 'int', { req: 1, label: 'Debarment count', desc: 'SEED-13 baseline: 2 debarments' }),
    F('para3AImpact', 'json', { req: 1, label: 'Para 3A impact', desc: '[{hsnCode, ministry, totalBids, classIBids, classIShare}] for each rule with para3A' }),
  ],
  { access: ACCESS.AUTH }
);

const MinistryClassShare = ENT(
  'regulatory-reporting',
  'MinistryClassShare',
  'One classShareByMinistry row of ENT-29. ENG-62 ministry attribution: the rule for the bid HSN, else the wildcard rule, else Unknown. ENG-63 class buckets: classI / classII / nonLocal / manual by computedClass, plus totalValue, per ministry.',
  [
    ID(),
    F('ministry', 'enum', { req: 1, idx: 1, label: 'Ministry', options: E.Ministry }),
    F('classI', 'int', { req: 1, label: 'Class-I bids' }),
    F('classII', 'int', { req: 1, label: 'Class-II bids' }),
    F('nonLocal', 'int', { req: 1, label: 'Non-local bids' }),
    F('manual', 'int', { req: 1, label: 'Manual bids', desc: 'computedClass MANUAL_REQUIRED, from CUSTOM rules (ENG-02)' }),
    F('totalValue', 'float', { req: 1, label: 'Total value', unit: 'INR', desc: 'ENG-61: sum of quotedPricePerUnit * quantity' }),
  ],
  { access: ACCESS.AUTH }
);

const VendorConcentration = ENT(
  'regulatory-reporting',
  'VendorConcentration',
  'One vendorConcentration row of ENT-29. ENG-64: sum of value and count per vendor, with legalName, sorted by value descending. The concentration view that makes a single dominant supplier visible at national level.',
  [
    ID(),
    F('vendorId', 'enum', { req: 1, idx: 1, label: 'Vendor ID', options: E.VendorId }),
    F('legalName', 'string', { req: 1, label: 'Legal name' }),
    F('totalValue', 'float', { req: 1, label: 'Total value', unit: 'INR', desc: 'ENG-61: sum of quotedPricePerUnit * quantity across the vendor bids' }),
    F('bidCount', 'int', { req: 1, label: 'Bid count' }),
  ],
  { access: ACCESS.AUTH }
);

const Para3AImpact = ENT(
  'regulatory-reporting',
  'Para3AImpact',
  'One para3AImpact row of ENT-29. ENG-65: for each rule with para3A, the bids on that HSN, the Class-I count and the share, which is 0 when there are no bids. Seeded Para 3A rules are HSN 8517 (DoT) and 2523 (DPIIT).',
  [
    ID(),
    F('hsnCode', 'enum', { req: 1, idx: 1, label: 'HSN code', options: E.HsnCode }),
    F('ministry', 'enum', { req: 1, label: 'Ministry', options: E.Ministry }),
    F('totalBids', 'int', { req: 1, label: 'Total bids' }),
    F('classIBids', 'int', { req: 1, label: 'Class-I bids' }),
    F('classIShare', 'float', { req: 1, label: 'Class-I share', unit: '%', desc: 'ENG-65: 0 when no bids exist on the HSN' }),
  ],
  { access: ACCESS.AUTH }
);

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

const ENTITIES = [
  // GeM master data
  Vendor,
  Tender,

  // Rule registry
  ComponentDefinition,
  RuleConfig,
  RuleUpdateInput,
  RuleUpdateRecord,

  // Trigger inputs
  BidSubmissionInput,
  CACertificationInput,
  DebarmentInput,
  CommitteeActionInput,
  LogicUpgradeInput,

  // Classification, anomalies, bid ledger
  ClassificationResult,
  AnomalyFlag,
  BidRecord,
  EvaluationRow,
  EvaluationCacheEntry,

  // Certification and the Auditor Accountability Ledger
  CACertificationRecord,
  AuditorFlaggedPayload,
  AuditorRiskProfile,

  // Cross-ministry debarment registry
  DebarmentRecord,
  DebarmentWebhookPayload,

  // Purchase Preference Decision Engine
  PreferenceOutcome,
  PriceMatchOffer,
  DecisionTraceStep,
  CommitteeActionPayload,

  // Smart Evolution
  LogicUpgradedPayload,
  LogicVersion,

  // The chain itself
  FinalizedBlock,
  ValidatorSignature,
  ChainTransaction,
  ChainAcl,
  ValidatorNode,
  IntegrityCheckResult,
  VerificationLookup,
  ChainSettings,

  // Analytics read model
  Analytics,
  MinistryClassShare,
  VendorConcentration,
  Para3AImpact,
];

const RELS = [
  // Vendor master data is the spine of every ledger record about a supplier
  ['Vendor', 'BidRecord', 'oneToMany'],
  ['Vendor', 'CACertificationRecord', 'oneToMany'],
  ['Vendor', 'DebarmentRecord', 'oneToMany'],
  ['Vendor', 'VendorConcentration', 'oneToMany'],
  ['Vendor', 'Vendor', 'relatedTo'], // oemReference: a RESELLER points at its authorising OEM (ENT-01)

  // Tender master data
  ['Tender', 'BidRecord', 'oneToMany'],
  ['Tender', 'PreferenceOutcome', 'oneToMany'],
  ['Tender', 'EvaluationRow', 'oneToMany'],
  ['Tender', 'EvaluationCacheEntry', 'oneToMany'],
  ['Tender', 'CommitteeActionPayload', 'oneToMany'],

  // Rule registry (Section 5)
  ['RuleConfig', 'ComponentDefinition', 'oneToMany'],
  ['RuleConfig', 'RuleUpdateRecord', 'oneToMany'],
  ['RuleConfig', 'Tender', 'relatedTo'], // resolved by hsnCode, falling back to the wildcard row (RUL-01/RUL-06)

  // The bid and everything computed from it
  ['BidRecord', 'AnomalyFlag', 'oneToMany'],
  ['BidRecord', 'CACertificationRecord', 'oneToMany'],
  ['BidRecord', 'ClassificationResult', 'oneToOne'],
  ['BidRecord', 'EvaluationRow', 'oneToOne'],

  // Preference decision (Section 6.6)
  ['PreferenceOutcome', 'PriceMatchOffer', 'oneToMany'],
  ['PreferenceOutcome', 'DecisionTraceStep', 'oneToMany'],
  ['PreferenceOutcome', 'CommitteeActionPayload', 'oneToMany'],

  // Debarment fan-out (ENG-18, ENG-19/24)
  ['DebarmentRecord', 'DebarmentWebhookPayload', 'oneToOne'],
  ['DebarmentRecord', 'AuditorFlaggedPayload', 'oneToMany'],
  ['CACertificationRecord', 'AuditorRiskProfile', 'relatedTo'],

  // Consensus and the ledger (Section 4)
  ['FinalizedBlock', 'ChainTransaction', 'oneToMany'],
  ['FinalizedBlock', 'ValidatorSignature', 'oneToMany'],
  ['ValidatorNode', 'ValidatorSignature', 'oneToMany'],
  ['ChainTransaction', 'ChainAcl', 'oneToOne'],

  // Every domain record travels inside a ChainTransaction envelope (ENT-25, CHN-24)
  ['ChainTransaction', 'BidRecord', 'relatedTo'],
  ['ChainTransaction', 'CACertificationRecord', 'relatedTo'],
  ['ChainTransaction', 'DebarmentRecord', 'relatedTo'],
  ['ChainTransaction', 'RuleUpdateRecord', 'relatedTo'],
  ['ChainTransaction', 'PreferenceOutcome', 'relatedTo'],
  ['ChainTransaction', 'CommitteeActionPayload', 'relatedTo'],
  ['ChainTransaction', 'AuditorFlaggedPayload', 'relatedTo'],
  ['ChainTransaction', 'DebarmentWebhookPayload', 'relatedTo'],
  ['ChainTransaction', 'LogicUpgradedPayload', 'relatedTo'],

  // Smart Evolution (CHN-26)
  ['LogicUpgradedPayload', 'LogicVersion', 'oneToOne'],

  // Analytics read model (Section 6.7)
  ['Analytics', 'MinistryClassShare', 'oneToMany'],
  ['Analytics', 'VendorConcentration', 'oneToMany'],
  ['Analytics', 'Para3AImpact', 'oneToMany'],

  // Audit and public verification
  ['IntegrityCheckResult', 'FinalizedBlock', 'relatedTo'],
  ['VerificationLookup', 'ChainTransaction', 'relatedTo'],

  // Each trigger input becomes exactly one chain record
  ['BidSubmissionInput', 'BidRecord', 'relatedTo'],
  ['CACertificationInput', 'CACertificationRecord', 'relatedTo'],
  ['DebarmentInput', 'DebarmentRecord', 'relatedTo'],
  ['RuleUpdateInput', 'RuleUpdateRecord', 'relatedTo'],
  ['CommitteeActionInput', 'CommitteeActionPayload', 'relatedTo'],
  ['LogicUpgradeInput', 'LogicUpgradedPayload', 'relatedTo'],
];

module.exports = { ENTITIES, RELS };
