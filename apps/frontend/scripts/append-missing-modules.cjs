/**
 * Appends 39 missing modules to modules.seed.json and back-patches
 * the most important existing parent modules with new downstream recommends.
 *
 * Run: node scripts/append-missing-modules.cjs
 */

const fs = require('fs');
const path = require('path');

const SEED_PATH = path.join(__dirname, '../src/data/modules.seed.json');
const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));

// ─── 1. NEW MODULES ───────────────────────────────────────────────────────────

const NEW_MODULES = [

  // ── Healthcare & Life Sciences ─────────────────────────────────────────────
  {
    moduleId: 'patient-consent',
    title: 'Patient Consent Manager',
    projectType: 'dapp',
    category: 'healthcare-life-sciences',
    tags: ['healthcare', 'consent', 'dpdp', 'abha'],
    blurb: 'Granular, revocable patient consent for health record access by provider type and purpose.',
    longDescription: [
      'Manages consent at the individual record category level — lab results, imaging, prescriptions, discharge summaries — with time-bound and purpose-limited grants. Satisfies India\'s DPDP Act obligations for healthcare data. Each grant records the issuing patient\'s DID, the requesting provider credential, the permitted purpose, and an expiry, all anchored on-chain.',
      'Pair with Health Record Anchor for the actual document side and with KYC / Identity Verification to validate that the requesting party is a credentialled provider. RBAC controls which provider types can request which record categories; Audit Logs capture every consent grant, revocation, and access event.'
    ],
    dependsOn: ['did-vc-ledger'],
    recommends: ['health-record-anchor', 'kyc', 'rbac', 'audit-logs'],
    reasonByDepId: {
      'did-vc-ledger': 'Patient and provider identities must be cryptographically verifiable before consent is granted or verified.'
    },
    configSchema: {
      type: 'object',
      properties: {
        recordCategories: { type: 'array', items: { type: 'string' }, default: ['lab', 'imaging', 'prescription', 'discharge'] },
        defaultGrantDays: { type: 'integer', minimum: 1, default: 90 },
        requireProviderCredential: { type: 'boolean', default: true }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'health-record-anchor',
    title: 'Health Record Anchor',
    projectType: 'dapp',
    category: 'healthcare-life-sciences',
    tags: ['healthcare', 'abha', 'ehr', 'anchoring'],
    blurb: 'Hash and timestamp clinical documents with issuing clinician credential and ABHA health ID linkage.',
    longDescription: [
      'Extends generic provenance anchoring with healthcare-specific structure: document type classification (lab report, prescription, discharge summary), encounter context, ABHA health ID binding, issuing clinician DID, and automatic expiry handling for time-sensitive records such as prescriptions.',
      'Designed for ABDM (Ayushman Bharat Digital Mission) compliance. Works alongside Patient Consent Manager so that documents are only addressable when valid patient consent exists. Connect to Clinical Trial Registry for trial-related records and to Audit Logs for a full access trail that hospitals can produce during inspections.'
    ],
    dependsOn: ['provenance-notary', 'patient-consent'],
    recommends: ['clinical-trial-registry', 'did-vc-ledger', 'audit-logs'],
    reasonByDepId: {
      'provenance-notary': 'Core hash/timestamp anchoring is inherited from the generic notary layer.',
      'patient-consent': 'Records must only be anchored and retrieved under valid patient consent.'
    },
    configSchema: {
      type: 'object',
      properties: {
        docTypes: { type: 'array', items: { type: 'string' }, default: ['lab-report', 'prescription', 'discharge-summary', 'imaging'] },
        abdmEnabled: { type: 'boolean', default: true },
        prescriptionExpiryDays: { type: 'integer', minimum: 1, default: 30 }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'drug-serial-ledger',
    title: 'Drug Serialization Ledger',
    projectType: 'dapp',
    category: 'healthcare-life-sciences',
    tags: ['pharma', 'serialization', 'cdsco', 'traceability'],
    blurb: 'Track pharmaceutical unit-level serial numbers from manufacturer to patient dispensing with DAVA/CDSCO format support.',
    longDescription: [
      'Records each serialised pharmaceutical unit\'s full custody chain: manufacturer licence, batch number, expiry date, unit serial number, and each scan event at packer, distributor, stockist, and retailer. Stores the CDSCO-mandated data fields and supports both 1D and 2D barcode scan flows at custody transfer points.',
      'Distinct from the generic Traceability Ledger because drug serialization requires regulatory data fields and verification scan flows specific to the Drugs and Cosmetics Act and Schedule M. Connect to Recall Coordination Hub so that a contaminated batch can trigger downstream retailer alerts automatically, and to Cold Chain Monitoring for temperature-sensitive biologics.'
    ],
    dependsOn: ['traceability-ledger'],
    recommends: ['recall-hub', 'cold-chain-monitoring', 'audit-logs', 'oracles'],
    reasonByDepId: {
      'traceability-ledger': 'Builds on the generic batch-and-custody model, adding pharma-specific fields and scan flows.'
    },
    configSchema: {
      type: 'object',
      properties: {
        barcodeFormat: { type: 'string', enum: ['gs1-128', 'datamatrix', 'qr'], default: 'gs1-128' },
        custodyLevels: { type: 'array', items: { type: 'string' }, default: ['manufacturer', 'cfa', 'stockist', 'retailer'] },
        cdscoBatchUpload: { type: 'boolean', default: true }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'clinical-trial-registry',
    title: 'Clinical Trial Registry',
    projectType: 'dapp',
    category: 'healthcare-life-sciences',
    tags: ['clinical-trial', 'ctri', 'cdsco', 'research'],
    blurb: 'Immutable trial protocol registration, participant enrollment records, and result data anchoring for regulatory submission.',
    longDescription: [
      'Provides protocol version control, site-level enrollment records, adverse event reporting, and CTRI-compatible data structures. Every protocol amendment is anchored with the previous version hash, creating an unbroken chain that CDSCO and sponsors require for regulatory submissions. Participant consent records reference Patient Consent Manager entries.',
      'Designed to satisfy the requirements of the Central Drugs Standard Control Organisation and the Indian Council of Medical Research. Adverse event reports are anchored with timestamps that cannot be backdated. Connect to Audit Logs for inspection-ready reports and to Health Record Anchor to link enrolled patient records.'
    ],
    dependsOn: ['audit-logs', 'evidence-chain'],
    recommends: ['health-record-anchor', 'patient-consent', 'did-vc-ledger'],
    reasonByDepId: {
      'audit-logs': 'Protocol amendments, enrollment events, and adverse reports need tamper-evident timestamps.',
      'evidence-chain': 'Trial documents — protocols, ICFs, lab reports — are anchored as evidence items.'
    },
    configSchema: {
      type: 'object',
      properties: {
        ctriCompatible: { type: 'boolean', default: true },
        phases: { type: 'array', items: { type: 'string' }, default: ['phase-1', 'phase-2', 'phase-3', 'phase-4'] },
        adverseEventSeverityLevels: { type: 'array', items: { type: 'string' }, default: ['mild', 'moderate', 'severe', 'fatal'] }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'vaccination-cert',
    title: 'Vaccination Certificate Issuer',
    projectType: 'dapp',
    category: 'healthcare-life-sciences',
    tags: ['vaccination', 'w3c-vc', 'ddcc', 'qr', 'cowin'],
    blurb: 'Issue WHO DDCC-compliant vaccination certificates with QR codes verifiable cross-border and offline.',
    longDescription: [
      'Issues verifiable credential vaccination certificates following the WHO Digital Documentation of COVID-19 Certificates (DDCC) schema. Supports dose-sequence management for multi-dose vaccines, batch lot number anchoring, and QR code generation that can be verified offline using the issuer\'s published verification key. Cross-border presentation is handled via the VC selective disclosure protocol.',
      'Designed for health ministries, ABDM-connected issuers, and private hospital chains. The module speaks CoWIN-compatible data structures. Connect to Patient Consent Manager to ensure records are only issued with patient authorisation and to DID/VC Ledger for the underlying credential infrastructure and key management.'
    ],
    dependsOn: ['did-vc-ledger'],
    recommends: ['patient-consent', 'kyc', 'audit-logs'],
    reasonByDepId: {
      'did-vc-ledger': 'Certificates are W3C Verifiable Credentials issued under a DID-anchored issuer key.'
    },
    configSchema: {
      type: 'object',
      properties: {
        schema: { type: 'string', enum: ['ddcc', 'cowin', 'custom'], default: 'ddcc' },
        offlineVerifiable: { type: 'boolean', default: true },
        maxDoses: { type: 'integer', minimum: 1, default: 4 }
      },
      additionalProperties: false
    }
  },

  // ── Government & Civic ─────────────────────────────────────────────────────
  {
    moduleId: 'cbdc-distribution',
    title: 'CBDC Distribution Engine',
    projectType: 'dapp',
    category: 'government-civic',
    tags: ['cbdc', 'rbi', 'digital-rupee', 'programmable-money'],
    blurb: 'Two-tier CBDC architecture with central bank issuance, commercial bank distribution, and programmable money policy enforcement.',
    longDescription: [
      'Implements the two-tier CBDC model: the central bank issues to authorised intermediaries (commercial banks) who distribute to end users. Supports tiered wallet limits, circulation caps, programmable spending restrictions (e.g. welfare CBDC restricted to approved merchant categories), and token freezing under regulatory order.',
      'Designed for the e-Rupee (Digital Rupee) programme and equivalent CBDC deployments. Pairs with Core Banking Accounts for intermediary ledger accounting and with RTGS Settlement for interbank netting. Welfare Scheme Disbursement module uses the programmable restriction feature to implement targeted benefit transfers with automatic category gating.'
    ],
    dependsOn: ['core-banking-accounts'],
    recommends: ['rtgs-settlement', 'kyc-utility-registry', 'wallet-auth', 'welfare-disbursement', 'audit-logs'],
    reasonByDepId: {
      'core-banking-accounts': 'Intermediary and end-user balances are maintained in the banking accounts layer.'
    },
    configSchema: {
      type: 'object',
      properties: {
        model: { type: 'string', enum: ['two-tier', 'direct'], default: 'two-tier' },
        maxRetailWalletInr: { type: 'number', minimum: 0, default: 200000 },
        programmableRestrictions: { type: 'boolean', default: false }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'eprocurement-workflow',
    title: 'e-Procurement Workflow',
    projectType: 'dapp',
    category: 'government-civic',
    tags: ['government', 'procurement', 'tender', 'gem'],
    blurb: 'End-to-end tender lifecycle: notice publication, bid submission, evaluation, award, and contract execution with full audit trail.',
    longDescription: [
      'Manages the full government procurement lifecycle from tender publication through bid submission (sealed envelope mechanics), technical and financial evaluation matrices, L1 determination, negotiation records, and work order issuance. All documents and decision records are anchored with timestamp proofs that prevent backdating or suppression.',
      'Designed to be GeM (Government e-Marketplace) compatible and aligned with GFR 2017 procurement rules. This is structurally different from the corporate Procurement Ledger module. Connect to KYB Registry for vendor credential verification, to Escrow and Conditional Settlement for earnest money deposits, and to Audit Logs for RTI-ready records.'
    ],
    dependsOn: ['audit-logs', 'evidence-chain'],
    recommends: ['kyb-registry', 'escrow-settlement', 'procurement-ledger', 'notifications'],
    reasonByDepId: {
      'audit-logs': 'Every bid, evaluation decision, and award must be tamper-evidently logged for accountability.',
      'evidence-chain': 'Tender documents, bids, and evaluation reports are anchored as evidence items.'
    },
    configSchema: {
      type: 'object',
      properties: {
        gemCompatible: { type: 'boolean', default: true },
        sealedBidding: { type: 'boolean', default: true },
        evaluationCriteria: { type: 'array', items: { type: 'string' }, default: ['technical', 'financial', 'l1-price'] }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'welfare-disbursement',
    title: 'Welfare Scheme Disbursement',
    projectType: 'dapp',
    category: 'government-civic',
    tags: ['dbt', 'welfare', 'aadhaar', 'inclusion'],
    blurb: 'Targeted benefit transfer with eligibility verification, duplicate detection, beneficiary identity linkage, and utilisation tracking.',
    longDescription: [
      'Implements Direct Benefit Transfer (DBT) with on-chain eligibility proofs to eliminate ghost beneficiaries. Supports configurable scheme-type parameters (food, fuel, education, healthcare), multi-tier eligibility checks, duplicate detection across beneficiary registers, and per-transaction utilisation tracking. Aadhaar/ABHA identity linkage is supported via adapters.',
      'Works with CBDC Distribution Engine so that welfare amounts are credited as programmable CBDC restricted to approved merchant categories. Connect to KYC/AML Utility Registry for beneficiary identity verification, to Audit Logs for fund utilisation audits, and to Notifications to inform beneficiaries of credit events.'
    ],
    dependsOn: ['kyc-utility-registry'],
    recommends: ['cbdc-distribution', 'audit-logs', 'notifications', 'analytics'],
    reasonByDepId: {
      'kyc-utility-registry': 'Beneficiary eligibility must be verified against a KYC-compliant identity registry before disbursement.'
    },
    configSchema: {
      type: 'object',
      properties: {
        schemeType: { type: 'string', enum: ['food', 'fuel', 'education', 'healthcare', 'general'], default: 'general' },
        duplicateCheckEnabled: { type: 'boolean', default: true },
        aadhaarLinkage: { type: 'boolean', default: false }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'court-filing-registry',
    title: 'Court Filing & Case Registry',
    projectType: 'dapp',
    category: 'government-civic',
    tags: ['judiciary', 'court', 'ecourts', 'legal'],
    blurb: 'Structured case record management with filing sequence, party credentials, document anchoring, and judgment versioning.',
    longDescription: [
      'Provides case number sequencing, party registration with credential binding, pleading-type classification, hearing schedule anchoring, and judgment/order versioning with retroactive access prevention. Every filing event is timestamped with an immutable receipt so parties can prove the order of submissions.',
      'Distinct from the generic Evidence Chain because judiciary use cases require procedural structure: filing phases, party standing records, hearing calendars, and judgment versions. Designed to be compatible with India\'s eCourts programme and the NJDG (National Judicial Data Grid). Connect to DID/VC Ledger for litigant and advocate credential verification and to Arbitration Evidence Vault for connected ADR proceedings.'
    ],
    dependsOn: ['evidence-chain', 'did-vc-ledger'],
    recommends: ['arbitration-vault', 'audit-logs', 'smart-legal-contract'],
    reasonByDepId: {
      'evidence-chain': 'Court documents, pleadings, and orders are anchored as procedurally sequenced evidence items.',
      'did-vc-ledger': 'Advocate enrolment credentials and litigant identity must be cryptographically verifiable.'
    },
    configSchema: {
      type: 'object',
      properties: {
        courtType: { type: 'string', enum: ['district', 'high', 'supreme', 'tribunal', 'consumer'], default: 'district' },
        caseNumberScheme: { type: 'string', default: 'YYYY-TYPE-NNN' },
        njdgCompatible: { type: 'boolean', default: true }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'electoral-roll-verifier',
    title: 'Electoral Roll Verifier',
    projectType: 'dapp',
    category: 'government-civic',
    tags: ['election', 'voter', 'zk', 'evm', 'eci'],
    blurb: 'Read-only voter eligibility verification with zero-knowledge proof presentation; no personal data exposed to verifying party.',
    longDescription: [
      'Verifies voter eligibility status using a zero-knowledge proof derived from the electoral roll hash. The verifying party learns only whether a voter is eligible at a specific constituency without learning any personal data. Deduplication across polling divisions is enforced at the proof level. The audit trail allows the Election Commission to verify system integrity without exposing individual voter records.',
      'Built on ZK Proof Verifier for the proof machinery and DID/VC Ledger for voter identity binding. Designed for ECI-compatible election management systems and State Election Commission deployments. Connect to Audit Logs for a verifier-side audit trail that satisfies RTI and judicial scrutiny requirements.'
    ],
    dependsOn: ['zk-proof-verifier', 'did-vc-ledger'],
    recommends: ['kyc-utility-registry', 'audit-logs'],
    reasonByDepId: {
      'zk-proof-verifier': 'Eligibility is proved via a ZK circuit over the electoral roll Merkle root without revealing personal data.',
      'did-vc-ledger': 'Voter identity must be bound to a cryptographically verifiable credential before proof generation.'
    },
    configSchema: {
      type: 'object',
      properties: {
        constituencyScope: { type: 'string', enum: ['parliamentary', 'assembly', 'local'], default: 'assembly' },
        offlineVerifiable: { type: 'boolean', default: false }
      },
      additionalProperties: false
    }
  },

  // ── Industrial & Supply Chain ──────────────────────────────────────────────
  {
    moduleId: 'industrial-iot-oracle',
    title: 'Industrial IoT Sensor Oracle',
    projectType: 'dapp',
    category: 'industrial-supply-chain',
    tags: ['iot', 'sensors', 'manufacturing', 'emissions'],
    blurb: 'Configurable sensor data anchor for industrial equipment with threshold alerting and calibration certificate anchoring.',
    longDescription: [
      'Anchors readings from industrial sensors — temperature, pressure, vibration, emissions, flow rate, power consumption — with unit-of-measure schema, device identity, calibration certificate hash, and anomaly thresholds. Each reading event is chained to the previous, making any gap or tampering visible. Calibration certificate renewal events are tracked as lifecycle records.',
      'Covers all industrial sensor use cases not addressed by Energy Meter Oracle (electricity) or Cold Chain Monitoring (food temperature): manufacturing process sensors, mining equipment telemetry, emissions monitors, pipeline flow meters, aerospace test rigs. Connect to Industrial IoT Device Registry for device identity and to Alerts and Paging for threshold breach notifications.'
    ],
    dependsOn: ['oracles'],
    recommends: ['iot-device-registry', 'traceability-ledger', 'bom-ledger', 'alerts-paging', 'audit-logs'],
    reasonByDepId: {
      'oracles': 'Sensor readings enter the system as attested oracle data with the same freshness and deviation controls as price feeds.'
    },
    configSchema: {
      type: 'object',
      properties: {
        sensorTypes: { type: 'array', items: { type: 'string' }, default: ['temperature', 'pressure', 'vibration', 'emissions'] },
        alertingEnabled: { type: 'boolean', default: true },
        calibrationExpiryAlertDays: { type: 'integer', minimum: 1, default: 30 }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'bom-ledger',
    title: 'Bill of Materials Ledger',
    projectType: 'dapp',
    category: 'industrial-supply-chain',
    tags: ['bom', 'manufacturing', 'aerospace', 'components'],
    blurb: 'Hierarchical component tree with version control, revision anchoring, and cross-reference to supplier and serial number records.',
    longDescription: [
      'Tracks the structural relationship between components within a product: which version of which sub-assembly was built into which finished unit. Supports multi-level BOM hierarchies, revision management with diff anchoring, supplier part number cross-referencing, and AS9100 / ISO 9001 part traceability requirements.',
      'Distinct from the Traceability Ledger which tracks batch custody movements. A BOM Ledger tracks structural composition — what is made of what — and is the data model aerospace, defense, and automotive clients will require for design authority records. Connect to Industrial IoT Sensor Oracle for production parameter anchoring against specific BOM revisions.'
    ],
    dependsOn: ['onchain-data'],
    recommends: ['traceability-ledger', 'industrial-iot-oracle', 'warehouse-receipt-mgr', 'audit-logs'],
    reasonByDepId: {
      'onchain-data': 'BOM hierarchies use the on-chain mapping and tree structures from the data models module.'
    },
    configSchema: {
      type: 'object',
      properties: {
        maxDepth: { type: 'integer', minimum: 1, default: 10 },
        revisionScheme: { type: 'string', enum: ['semver', 'letter', 'numeric'], default: 'letter' },
        partNumberFormat: { type: 'string', default: '' }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'hazmat-manifest',
    title: 'Hazardous Material Manifest',
    projectType: 'dapp',
    category: 'industrial-supply-chain',
    tags: ['hazmat', 'adr', 'iata', 'dangerous-goods', 'msds'],
    blurb: 'Digital MSDS and ADR/IATA dangerous goods manifest with carrier credential verification and incident reporting.',
    longDescription: [
      'Issues and anchors digital manifests for dangerous goods shipments covering UN number, hazard class, subsidiary risk, packing group, net quantity, emergency contact, and ERG guide reference. Carrier credential verification ensures only licenced operators can accept consignments. Incident reports are anchored at point of occurrence.',
      'Covers chemical, mining, oil and gas, and pharmaceutical cold-chain flows where no existing module provides the specific UN-number-level data fields required by ADR (road), IMDG (sea), and IATA (air) regulations. Connect to Port and Customs Events for declaration handoff and to Drug Serialization Ledger when hazardous pharmaceutical shipments overlap with drug serialization obligations.'
    ],
    dependsOn: ['did-vc-ledger'],
    recommends: ['traceability-ledger', 'port-customs-events', 'drug-serial-ledger', 'audit-logs'],
    reasonByDepId: {
      'did-vc-ledger': 'Carrier and shipper credentials must be cryptographically verifiable before manifests are issued or accepted.'
    },
    configSchema: {
      type: 'object',
      properties: {
        transportModes: { type: 'array', items: { type: 'string', enum: ['road', 'sea', 'air', 'rail'] }, default: ['road', 'sea'] },
        defaultRegulation: { type: 'string', enum: ['adr', 'imdg', 'iata', 'rid'], default: 'adr' }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'recall-hub',
    title: 'Recall Coordination Hub',
    projectType: 'dapp',
    category: 'industrial-supply-chain',
    tags: ['recall', 'coordination', 'fssai', 'cdsco', 'notifications'],
    blurb: 'Multi-party product recall orchestration with affected batch identification, downstream customer alerting, and regulator notification workflow.',
    longDescription: [
      'The operational coordination layer built on top of the Quality and Recall Ledger. When a recall event is initiated, the hub automatically traverses the traceability graph to identify all downstream customers and retailers who received affected batches, generates regulator notification packages in FSSAI/CDSCO-required formats, routes alerts to affected parties, and tracks acknowledgment and return confirmation.',
      'Food, pharmaceutical, and automotive clients need this distinct from the raw ledger because the coordination workflow — who to notify, in what order, with what information, by what deadline — requires a separate operational module. Connect to Notifications and Email for the outbound communication layer and to Audit Logs to generate the effectiveness verification report that regulators require after every recall.'
    ],
    dependsOn: ['quality-recall-ledger'],
    recommends: ['traceability-ledger', 'drug-serial-ledger', 'notifications', 'emails', 'audit-logs'],
    reasonByDepId: {
      'quality-recall-ledger': 'Recall identification starts from nonconformance events recorded in the quality ledger.'
    },
    configSchema: {
      type: 'object',
      properties: {
        regulatoryBodies: { type: 'array', items: { type: 'string' }, default: ['fssai', 'cdsco'] },
        acknowledgmentDeadlineHours: { type: 'integer', minimum: 1, default: 48 },
        autoNotifyOnRecall: { type: 'boolean', default: true }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'warehouse-receipt-mgr',
    title: 'Warehouse Receipt Manager',
    projectType: 'dapp',
    category: 'industrial-supply-chain',
    tags: ['warehouse', 'wdra', 'nabard', 'commodity', 'receipt'],
    blurb: 'Digitise, issue, transfer, and retire negotiable warehouse receipts with WDRA-compliant commodity grade, quantity, and custodian verification.',
    longDescription: [
      'Issues digital Negotiable Warehouse Receipts (NWRs) and Electronic Warehouse Receipts (eWRs) compliant with the Warehousing Development and Regulation Act (WDRA). Supports commodity grade classification, quantity assay records, pledge creation and partial release, transfer endorsement, and receipt retirement on delivery. NABARD-registered warehouses and commodity financing banks are the primary consumers.',
      'While an ERC-721 token could technically represent a warehouse receipt, commodity financing requires the WDRA-specific data structures, pledge mechanics, and partial release rules that banks and CERSAI require. Connect to KYB Registry for warehouse operator credential verification and to Escrow and Conditional Settlement for pledge mechanics under commodity-backed loans.'
    ],
    dependsOn: ['did-vc-ledger', 'erc721'],
    recommends: ['bom-ledger', 'kyb-registry', 'escrow-settlement', 'audit-logs'],
    reasonByDepId: {
      'did-vc-ledger': 'Warehouse operator and depositor identities must be verifiable before receipts are issued or transferred.',
      'erc721': 'Each negotiable warehouse receipt is a unique non-fungible token with the WDRA data payload in its metadata.'
    },
    configSchema: {
      type: 'object',
      properties: {
        commodityCategories: { type: 'array', items: { type: 'string' }, default: ['grains', 'oilseeds', 'pulses', 'metals'] },
        wdraCompliant: { type: 'boolean', default: true },
        partialReleaseEnabled: { type: 'boolean', default: true }
      },
      additionalProperties: false
    }
  },

  // ── Financial Services ──────────────────────────────────────────────────────
  {
    moduleId: 'insurance-policy-ledger',
    title: 'Insurance Policy Ledger',
    projectType: 'dapp',
    category: 'financial-services',
    tags: ['insurance', 'irdai', 'claims', 'tpa'],
    blurb: 'Full insurance policy lifecycle: issuance, endorsements, renewals, claims intake, TPA routing, and settlement with on-chain audit trail.',
    longDescription: [
      'Manages the complete lifecycle of traditional indemnity insurance policies: policy issuance with schedule of cover, endorsement history, renewal tracking, claims intake with document anchoring, Third Party Administrator (TPA) routing, claims adjudication workflow, and settlement recording. IRDAI-compatible data structures for both life and non-life products.',
      'Parametric Insurance handles oracle-triggered payouts for a single product type. This module handles the broader insurance workflow that all insurance platforms require. Connect to Reinsurance Treaty Ledger for cession flows, to KYC for policyholder verification, and to Regulatory Reporting Engine for IRDAI returns. Audit Logs captures every endorsement and claims decision for the ombudsman trail.'
    ],
    dependsOn: ['audit-logs', 'kyc'],
    recommends: ['reinsurance-treaty', 'parametric-insurance', 'oracles', 'regulatory-reporting', 'notifications'],
    reasonByDepId: {
      'audit-logs': 'Every policy endorsement, claims decision, and settlement must be tamper-evidently recorded.',
      'kyc': 'Policyholder identity must be verified at issuance per IRDAI KYC norms.'
    },
    configSchema: {
      type: 'object',
      properties: {
        productTypes: { type: 'array', items: { type: 'string' }, default: ['health', 'motor', 'property', 'life', 'marine'] },
        tpaEnabled: { type: 'boolean', default: true },
        irdaiDataStructure: { type: 'boolean', default: true }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'reinsurance-treaty',
    title: 'Reinsurance Treaty Ledger',
    projectType: 'dapp',
    category: 'financial-services',
    tags: ['reinsurance', 'gic-re', 'treaty', 'bordereau'],
    blurb: 'Treaty and facultative reinsurance agreement anchoring with bordereau submission, loss event data sharing, and settlement waterfall.',
    longDescription: [
      'Anchors reinsurance treaty and facultative agreements with full version history. Bordereau submissions (premium and loss bordereaux) are structured records with period-end hash proofs. Loss event data sharing between cedant and reinsurer is permissioned at the treaty level. Settlement waterfall calculations run against treaty parameters.',
      'Trade Finance Documents has been used as a workaround but reinsurance requires its own terminology: cession limits, retention, layer definitions, loss development factors, and bordereau formats that cedants and reinsurers like GIC Re recognise. Connect to Insurance Policy Ledger for the underlying policies being ceded and to Treasury for settlement accounting.'
    ],
    dependsOn: ['insurance-policy-ledger', 'treasury'],
    recommends: ['audit-logs', 'regulatory-reporting'],
    reasonByDepId: {
      'insurance-policy-ledger': 'Treaties cover portfolios of underlying direct policies; the policy ledger is the source of cession data.',
      'treasury': 'Reinsurance premiums and loss recoveries are accounted in the treasury ledger.'
    },
    configSchema: {
      type: 'object',
      properties: {
        treatyType: { type: 'string', enum: ['proportional', 'non-proportional', 'facultative'], default: 'proportional' },
        bordereauFrequency: { type: 'string', enum: ['monthly', 'quarterly'], default: 'quarterly' }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'cap-table-mgr',
    title: 'Cap Table Manager',
    projectType: 'dapp',
    category: 'financial-services',
    tags: ['cap-table', 'startup', 'esop', 'safe', 'equity'],
    blurb: 'Startup equity structure management: founders, investors, ESOPs, convertibles, and waterfall modelling with token-ready export.',
    longDescription: [
      'Manages the pre-IPO startup equity lifecycle: seed round recording, SAFE and convertible note tracking, ESOP pool creation and grant management, dilution modelling across funding rounds, liquidation preference waterfall simulation, and eventually tokenized equity issuance export. Every round and grant event is anchored with the supporting term sheet hash.',
      'Securities Lifecycle handles post-issuance management for established securities. Cap table management covers the pre-IPO lifecycle where instruments are often not yet formally issued. This is a natural entry-point module for startup founders. Connect to DID/VC Ledger for investor accreditation credentials and to Token Vesting for ESOP vesting schedule enforcement once tokens are issued.'
    ],
    dependsOn: ['erc20'],
    recommends: ['securities-lifecycle', 'token-vesting', 'did-vc-ledger', 'audit-logs'],
    reasonByDepId: {
      'erc20': 'Equity tokens, when issued, are ERC-20 fungible tokens with transfer restrictions layered on top.'
    },
    configSchema: {
      type: 'object',
      properties: {
        instrumentTypes: { type: 'array', items: { type: 'string' }, default: ['equity', 'safe', 'convertible', 'esop'] },
        waterfallEnabled: { type: 'boolean', default: true },
        tokenExportEnabled: { type: 'boolean', default: false }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'regulatory-reporting',
    title: 'Regulatory Reporting Engine',
    projectType: 'dapp',
    category: 'financial-services',
    tags: ['rbi', 'sebi', 'irdai', 'gstn', 'xbrl', 'reporting'],
    blurb: 'Generate structured regulatory filings (RBI, SEBI, IRDAI, GSTN) from on-chain data with submission receipt anchoring.',
    longDescription: [
      'Produces machine-readable regulatory submissions directly from on-chain data in the formats that specific Indian regulators require: XBRL for SEBI financial disclosures, JSON schemas for GSTN returns, XML for RBI prudential returns, and IRDAI data submission formats. Each generated report is hashed and anchored with a submission timestamp. Submission acknowledgement receipts from regulator portals are also anchored.',
      'Different from Audit Evidence Export which handles application-level log packaging. This module generates specific filing formats that regulatory systems ingest directly. It is the last-mile compliance module that transforms an on-chain financial system into a regulator-ready platform. Connect to Chain Audit Export for blockchain-layer data and to Compliance Attestations for the sign-off workflow.'
    ],
    dependsOn: ['audit-logs'],
    recommends: ['chain-audit-export', 'compliance-attestations', 'audit-export', 'analytics'],
    reasonByDepId: {
      'audit-logs': 'Regulatory reports are generated from the audit-logged event stream with completeness proofs.'
    },
    configSchema: {
      type: 'object',
      properties: {
        regulators: { type: 'array', items: { type: 'string' }, default: ['rbi', 'sebi'] },
        outputFormats: { type: 'array', items: { type: 'string' }, default: ['xbrl', 'json', 'xml'] },
        autoAnchorReceipt: { type: 'boolean', default: true }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'microfinance-group-ledger',
    title: 'Microfinance Group Ledger',
    projectType: 'dapp',
    category: 'financial-services',
    tags: ['microfinance', 'shg', 'jlg', 'mfi', 'pmjdy'],
    blurb: 'SHG and JLG group formation, member KYC linkage, joint liability records, repayment tracking, and credit history anchoring for PMJDY-aligned inclusion.',
    longDescription: [
      'Supports Self Help Group (SHG) and Joint Liability Group (JLG) formation with member-level KYC linkage, joint liability structure definition, meeting attendance records, saving and loan disbursement tracking, and repayment schedule management. Credit history anchoring generates CIBIL-compatible event records for member credit profile building.',
      'Designed for MFIs and NBFCs operating under PMJDY and RBI microfinance guidelines. Connects to KYC/AML Utility Registry for member identity verification, to Core Banking Accounts for fund accounting, and to Regulatory Reporting Engine for RBI NBFC-MFI returns. Audit Logs capture every disbursement and recovery event for SRO and regulatory review.'
    ],
    dependsOn: ['kyc-utility-registry'],
    recommends: ['core-banking-accounts', 'did-vc-ledger', 'audit-logs', 'welfare-disbursement'],
    reasonByDepId: {
      'kyc-utility-registry': 'Group member identity must be KYC-verified before they can participate in joint liability structures.'
    },
    configSchema: {
      type: 'object',
      properties: {
        groupTypes: { type: 'array', items: { type: 'string' }, default: ['shg', 'jlg'] },
        maxGroupSize: { type: 'integer', minimum: 2, default: 20 },
        creditHistoryEnabled: { type: 'boolean', default: true }
      },
      additionalProperties: false
    }
  },

  // ── Legal & Professional Services ──────────────────────────────────────────
  {
    moduleId: 'smart-legal-contract',
    title: 'Smart Legal Contract Engine',
    projectType: 'dapp',
    category: 'legal-professional',
    tags: ['legal', 'contract', 'clause', 'obligation', 'breach'],
    blurb: 'Clause-by-clause legal contract authoring with on-chain obligation tracking, event triggers, and breach notification.',
    longDescription: [
      'Maps contract clauses to executable conditions, tracks obligation fulfilment on-chain, triggers payment or notification on defined milestone events, and records breaches with timestamped evidence. Supports bilateral and multi-party agreements. Each contract version is anchored with the parties\' DID signatures and the preceding version hash.',
      'Document Signing captures a signature on a static document. This module goes further by making contractual obligations machine-trackable without removing legal enforceability. Pair with Escrow and Conditional Settlement for payment-on-fulfilment mechanics, with Arbitration Evidence Vault for dispute submission, and with Court Filing Registry when a breach escalates to judicial proceedings.'
    ],
    dependsOn: ['document-signing', 'audit-logs'],
    recommends: ['escrow-settlement', 'arbitration-vault', 'court-filing-registry', 'notifications'],
    reasonByDepId: {
      'document-signing': 'Legal validity requires a captured signature; this module adds the executable obligation layer on top.',
      'audit-logs': 'Every obligation event, trigger, and breach record must be tamper-evidently logged.'
    },
    configSchema: {
      type: 'object',
      properties: {
        clauseTypes: { type: 'array', items: { type: 'string' }, default: ['payment', 'delivery', 'penalty', 'termination'] },
        autoTriggerEnabled: { type: 'boolean', default: true },
        maxParties: { type: 'integer', minimum: 2, default: 10 }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'ip-rights-registry',
    title: 'IP Rights Registry',
    projectType: 'dapp',
    category: 'legal-professional',
    tags: ['ip', 'patent', 'trademark', 'copyright', 'ipindia'],
    blurb: 'Register patents, trademarks, copyrights, and trade secrets with ownership history, licensing terms, and royalty distribution rules.',
    longDescription: [
      'Manages IP asset registration across all types — patents, trademarks, copyrights, trade secrets — with multiple owners at defined split percentages, licensing tier definitions, sub-licensing permission chains, and jurisdiction-specific validity dates. Ownership history is immutable; transfers and licensing events are anchored with supporting deed hashes.',
      'Provenance Notary handles the timestamp. DID/VC Ledger issues the credential. But IP management requires this structured registry for the IP Office of India and corporate IP teams to interact with. Connect to Royalty Clearing for automated distribution of licensing royalties to multiple rights holders and to Music Rights Registry for music-specific IP management.'
    ],
    dependsOn: ['provenance-notary', 'did-vc-ledger'],
    recommends: ['royalty-clearing', 'smart-legal-contract', 'music-rights-registry', 'audit-logs'],
    reasonByDepId: {
      'provenance-notary': 'IP registration anchors the creation date and authorship proof that establishes priority.',
      'did-vc-ledger': 'Rights holder identity must be cryptographically verifiable for ownership records to be legally meaningful.'
    },
    configSchema: {
      type: 'object',
      properties: {
        ipTypes: { type: 'array', items: { type: 'string' }, default: ['patent', 'trademark', 'copyright', 'trade-secret'] },
        jurisdictions: { type: 'array', items: { type: 'string' }, default: ['IN'] },
        maxOwners: { type: 'integer', minimum: 1, default: 10 }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'arbitration-vault',
    title: 'Arbitration Evidence Vault',
    projectType: 'dapp',
    category: 'legal-professional',
    tags: ['arbitration', 'adr', 'evidence', 'diac', 'mcia'],
    blurb: 'Neutral, tamper-proof document submission and custody for arbitration and mediation proceedings with arbitrator-credentialed sign-off.',
    longDescription: [
      'Provides sequential submission phases with party-credentialed document locking: each party\'s submissions are sealed at the filing deadline so neither party can see the other\'s submissions before the deadline and neither can alter submissions after. The arbitrator panel\'s access credentials are defined at constitution and documents are accessible to them immediately after sealing.',
      'Evidence Chain records custody events for general use. ADR proceedings require the more specific model here: procedural timeline anchoring, party standing definition, arbitrator identity binding, and a final award anchoring that the enforcement court can independently verify. Designed for DIAC, MCIA (Mumbai Centre for International Arbitration), and corporate ADR clauses.'
    ],
    dependsOn: ['evidence-chain'],
    recommends: ['did-vc-ledger', 'smart-legal-contract', 'court-filing-registry', 'audit-logs'],
    reasonByDepId: {
      'evidence-chain': 'Arbitration documents are anchored as tamper-evident evidence items following the existing chain model.'
    },
    configSchema: {
      type: 'object',
      properties: {
        institution: { type: 'string', enum: ['diac', 'mcia', 'siac', 'icc', 'ad-hoc'], default: 'ad-hoc' },
        maxArbitrators: { type: 'integer', minimum: 1, default: 3 },
        sealedSubmissions: { type: 'boolean', default: true }
      },
      additionalProperties: false
    }
  },

  // ── Education & Credentials ─────────────────────────────────────────────────
  {
    moduleId: 'academic-credential-registry',
    title: 'Academic Credential Registry',
    projectType: 'dapp',
    category: 'education-credentials',
    tags: ['education', 'degree', 'open-badges', 'w3c-vc-edu', 'naac'],
    blurb: 'Open Badges 3.0 and W3C VC-EDU compliant credential registry for degrees, diplomas, transcripts, and micro-credentials with employer verification portal.',
    longDescription: [
      'Issues and indexes academic credentials using the Open Badges 3.0 and W3C VC-EDU specification: course codes, credit hours, grade classification, awarding body accreditation status, and NAAC accreditation linkage. An employer-facing verification portal allows HR systems to verify credentials by scanning a QR code without interacting with the student. ABc (Academic Bank of Credits) compatible.',
      'DID/VC Ledger is general-purpose VC infrastructure. This module adds the educational domain vocabulary that universities, autonomous institutions, and NAAC-accredited bodies need. Connect to Skill Passport so that academic credentials aggregate into a learner\'s portable profile, and to KYC for student identity verification during issuance.'
    ],
    dependsOn: ['did-vc-ledger'],
    recommends: ['skill-passport', 'soulbound-token', 'kyc', 'audit-logs'],
    reasonByDepId: {
      'did-vc-ledger': 'Credentials are W3C Verifiable Credentials issued under the institution\'s DID-anchored issuer key.'
    },
    configSchema: {
      type: 'object',
      properties: {
        credentialTypes: { type: 'array', items: { type: 'string' }, default: ['degree', 'diploma', 'transcript', 'micro-credential'] },
        openBadgesVersion: { type: 'string', enum: ['2.0', '3.0'], default: '3.0' },
        abcCompatible: { type: 'boolean', default: true }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'skill-passport',
    title: 'Skill Passport',
    projectType: 'dapp',
    category: 'education-credentials',
    tags: ['skills', 'nsdc', 'skill-india', 'learning', 'portfolio'],
    blurb: 'Portable, cumulative skill and certification profile aggregating credentials from multiple issuers into a single verified learner identity.',
    longDescription: [
      'Aggregates credentials from multiple issuing institutions — universities, employers, training providers, bootcamps — into a single verified skill portfolio tied to a learner\'s DID. Each credential addition event is anchored. The passport exposes a queryable API for HR systems and NSDC-compatible data export. Selective disclosure allows learners to share specific skills without revealing their full profile.',
      'Each soulbound token or VC credential is a point credential from a single issuer. Skill Passport is the aggregation layer that makes a learner\'s credentials portable and cumulatively verifiable. Designed for NSDC, Skill India, and corporate L&D platform integration. Connect to Academic Credential Registry for institutional degree inputs and to RBAC to assign platform roles based on verified skills.'
    ],
    dependsOn: ['did-vc-ledger'],
    recommends: ['academic-credential-registry', 'soulbound-token', 'rbac'],
    reasonByDepId: {
      'did-vc-ledger': 'The learner\'s passport is anchored to their DID; each credential addition is a VC presented to the passport issuer.'
    },
    configSchema: {
      type: 'object',
      properties: {
        nsdcCompatible: { type: 'boolean', default: true },
        maxIssuers: { type: 'integer', minimum: 1, default: 100 },
        selectiveDisclosure: { type: 'boolean', default: true }
      },
      additionalProperties: false
    }
  },

  // ── Media, Creative & Gaming ────────────────────────────────────────────────
  {
    moduleId: 'music-rights-registry',
    title: 'Music Rights Registry',
    projectType: 'dapp',
    category: 'media-gaming',
    tags: ['music', 'isrc', 'iprs', 'ppl', 'publishing'],
    blurb: 'Structured registry for song ownership splits with ISRC linkage, PRO reporting, and sample clearance chains.',
    longDescription: [
      'Manages music rights at the work level: master and publishing ownership splits between composers, lyricists, producers, and labels; ISRC code assignment; performing rights organisation (IPRS, PPL) affiliation records; sample clearance chains; and sync licence records. Every ownership change and licence grant is anchored.',
      'The Royalty Standard defines the technical split. Royalty Clearing distributes it. This module manages the registry that defines what the split is and why — the authorship records, the agreement terms, and the rights chain — which is what the Indian music industry, streaming platforms, and label legal teams need. Connect to IP Rights Registry for copyright registration linkage and to Royalty Clearing for automated PRO distribution.'
    ],
    dependsOn: ['royalty-clearing'],
    recommends: ['ip-rights-registry', 'smart-legal-contract', 'erc20', 'analytics'],
    reasonByDepId: {
      'royalty-clearing': 'Royalty distribution flows are defined by the ownership splits registered in this module.'
    },
    configSchema: {
      type: 'object',
      properties: {
        proAffiliations: { type: 'array', items: { type: 'string' }, default: ['iprs', 'ppl'] },
        isrcEnabled: { type: 'boolean', default: true },
        sampleClearanceTracking: { type: 'boolean', default: true }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'gaming-marketplace',
    title: 'Gaming Asset Marketplace',
    projectType: 'dapp',
    category: 'media-gaming',
    tags: ['gaming', 'marketplace', 'nft', 'in-game', 'esports'],
    blurb: 'In-game asset marketplace with listing, bidding, instant sale, cross-game asset transfer, and configurable platform fee and creator royalty.',
    longDescription: [
      'A purpose-built game asset marketplace with listing management, bid escrow, buy-now mechanics, rental duration enforcement, cross-game compatibility checks, and the game studio\'s fee collection. Supports ERC-721 and ERC-1155 assets. Transaction history is publicly queryable for provenance.',
      'NFT Rentals and Delegation handles lending. Royalty Clearing handles creator fees. But a gaming marketplace needs the full exchange mechanics as a single integrated module that game studios can embed or white-label. Connect to ERC-721 and ERC-1155 for the underlying asset standards, to Escrow and Conditional Settlement for bid escrow, and to Royalty Standard for automatic creator royalties on every secondary sale.'
    ],
    dependsOn: ['erc721'],
    recommends: ['erc1155', 'nft-rentals-delegation', 'royalties', 'escrow-settlement', 'analytics'],
    reasonByDepId: {
      'erc721': 'Game assets are ERC-721 tokens; the marketplace operates on their transfer and listing mechanics.'
    },
    configSchema: {
      type: 'object',
      properties: {
        platformFeeBps: { type: 'integer', minimum: 0, maximum: 1000, default: 250 },
        bidEscrowEnabled: { type: 'boolean', default: true },
        crossGameTransfer: { type: 'boolean', default: false }
      },
      additionalProperties: false
    }
  },

  // ── Telecom & IoT ──────────────────────────────────────────────────────────
  {
    moduleId: 'esim-sim-registry',
    title: 'eSIM & SIM Registry',
    projectType: 'dapp',
    category: 'telecom-iot',
    tags: ['esim', 'sim', 'trai', 'mnp', 'telecom'],
    blurb: 'Operator-permissioned registry for SIM/eSIM identity, subscriber binding, portability events, and fraud flag sharing.',
    longDescription: [
      'Records SIM and eSIM issuance events, subscriber binding, Mobile Number Portability (MNP) events, SIM swap requests, and fraud flag sharing across operators. Each event is anchored with the operator DID signature. SIM swap fraud flags are shared across the consortium as soon as a flag is raised, enabling any operator to apply extra verification before processing a portability request.',
      'TRAI\'s mobile number portability and SIM swap fraud requirements create a direct government-backed use case. This module covers the data layer that telecom operators (BSNL, Airtel, Jio, Vi) can share on a permissioned chain. Connect to KYB Registry for operator credential verification and to Node Permissioning to restrict which operator nodes can write to the registry.'
    ],
    dependsOn: ['did-vc-ledger', 'kyb-registry'],
    recommends: ['node-permissioning', 'iot-device-registry', 'audit-logs'],
    reasonByDepId: {
      'did-vc-ledger': 'SIM and subscriber identities are DID-anchored credentials to enable cross-operator verification.',
      'kyb-registry': 'Telecom operators must be credentialled KYB entities before they can write to the shared registry.'
    },
    configSchema: {
      type: 'object',
      properties: {
        mnpEnabled: { type: 'boolean', default: true },
        fraudFlagSharing: { type: 'boolean', default: true },
        esimProfiles: { type: 'boolean', default: true }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'iot-device-registry',
    title: 'IoT Device Registry',
    projectType: 'dapp',
    category: 'telecom-iot',
    tags: ['iot', 'device-management', 'fleet', 'provisioning'],
    blurb: 'Provisioning, identity, firmware versioning, and access credential lifecycle management for large IoT device fleets.',
    longDescription: [
      'Manages IoT device fleets at scale: bulk provisioning with group policy assignment, device identity anchoring using hardware attestation roots, firmware version tracking with update event records, access credential rotation, and decommissioning records. Each device\'s certificate chain is anchored at provisioning; rotation events are tracked against the previous credential hash.',
      'Device Attestation handles individual device identity verification in isolation. Fleet operators with thousands of devices need the group management, bulk update tracking, and decommission lifecycle that this module provides. Connect to Industrial IoT Sensor Oracle so that sensor readings are tied to a provisioned and verified device identity, and to Secrets Manager Adapter for fleet-wide credential distribution.'
    ],
    dependsOn: ['device-attestation'],
    recommends: ['industrial-iot-oracle', 'node-permissioning', 'secrets-manager-adapter', 'm2m-micropayment'],
    reasonByDepId: {
      'device-attestation': 'Each device in the fleet is individually attested; this module manages them as a group.'
    },
    configSchema: {
      type: 'object',
      properties: {
        maxFleetSize: { type: 'integer', minimum: 1, default: 100000 },
        firmwareUpdatePolicy: { type: 'string', enum: ['automatic', 'staged', 'manual'], default: 'staged' },
        credentialRotationDays: { type: 'integer', minimum: 1, default: 90 }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'm2m-micropayment',
    title: 'M2M Micropayment Channel',
    projectType: 'dapp',
    category: 'telecom-iot',
    tags: ['m2m', 'micropayment', 'ev-charging', 'iot', 'autonomous'],
    blurb: 'Trustless machine-to-machine payment channels for autonomous IoT transactions without human approval per transaction.',
    longDescription: [
      'Implements payment channels for device-to-device transactions: data marketplace sales, EV charging per kWh, bandwidth metering, and distributed compute microtransactions. Each device has a per-channel spending cap. Channels are opened on-chain and settled periodically without per-transaction on-chain costs. Automatic settlement is triggered at balance or time thresholds.',
      'State Channels handles the general off-chain channel mechanics. M2M micropayments have a specific pattern — no human in the loop, device-level spending caps, automatic settlement windows — that require a dedicated module. Connect to IoT Device Registry for device identity binding and to Industrial IoT Sensor Oracle when the payment is triggered by a sensor reading event.'
    ],
    dependsOn: ['state-channels'],
    recommends: ['iot-device-registry', 'industrial-iot-oracle', 'erc20', 'rate-limit'],
    reasonByDepId: {
      'state-channels': 'The underlying payment channel mechanics (open, update, close) are inherited from the state channel layer.'
    },
    configSchema: {
      type: 'object',
      properties: {
        maxSpendPerDevicePerDay: { type: 'number', minimum: 0, default: 10 },
        settlementTrigger: { type: 'string', enum: ['balance', 'time', 'both'], default: 'both' },
        settlementIntervalHours: { type: 'integer', minimum: 1, default: 24 }
      },
      additionalProperties: false
    }
  },

  // ── Real Estate ─────────────────────────────────────────────────────────────
  {
    moduleId: 'mortgage-lien-mgr',
    title: 'Mortgage & Lien Manager',
    projectType: 'dapp',
    category: 'real-estate',
    tags: ['mortgage', 'lien', 'cersai', 'housing-finance'],
    blurb: 'Mortgage creation, lien registration, partial release, and satisfaction with bank credential and property title linkage.',
    longDescription: [
      'Records mortgage charges against a Land Title Registry entry: charge creation with lender DID, principal amount, and equitable or registered mortgage type; partial release on EMI payment with principal balance tracking; and full satisfaction with automatic title clearance notification. CERSAI-compatible data structures for the Central Registry of Securitisation Asset Reconstruction and Security Interest.',
      'Land Title Registry records ownership. This module records encumbrances — the most commercially important function for banks and housing finance companies who need proof of charge before and after disbursement. Connect to KYB Registry for bank credential verification, to Escrow and Conditional Settlement for disbursement mechanics, and to Stamp Duty and Registration Oracle for associated registration costs.'
    ],
    dependsOn: ['land-title-registry'],
    recommends: ['kyb-registry', 'escrow-settlement', 'stamp-duty-oracle', 'audit-logs'],
    reasonByDepId: {
      'land-title-registry': 'A mortgage or lien is an encumbrance on a specific property title; the title record is the anchor.'
    },
    configSchema: {
      type: 'object',
      properties: {
        mortgageTypes: { type: 'array', items: { type: 'string' }, default: ['equitable', 'registered', 'english'] },
        cersaiCompatible: { type: 'boolean', default: true },
        partialReleaseEnabled: { type: 'boolean', default: true }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'stamp-duty-oracle',
    title: 'Stamp Duty & Registration Oracle',
    projectType: 'dapp',
    category: 'real-estate',
    tags: ['stamp-duty', 'igr', 'registration', 'real-estate', 'india'],
    blurb: 'State-specific stamp duty calculation with guidance value integration, online payment confirmation, and sub-registrar office handshake.',
    longDescription: [
      'Connects to state IGR (Inspector General of Registration) portals for guidance value data and calculates stamp duty based on property type, agreement value versus guidance value, buyer/seller categories, and applicable state concessions. Online stamp duty payment confirmation is anchored as a receipt and the sub-registrar acknowledgment document is also anchored.',
      'Every real estate transaction in India requires stamp duty payment and registration. This oracle bridges the gap between the on-chain property record and the state government registration system, turning a prototype into a production-ready platform. Connect to Land Title Registry for the property record, to Mortgage and Lien Manager for registration of charges, and to Audit Logs for the full transaction trail.'
    ],
    dependsOn: ['oracles', 'land-title-registry'],
    recommends: ['mortgage-lien-mgr', 'rental-agreement-engine', 'audit-logs'],
    reasonByDepId: {
      'oracles': 'State guidance values and IGR portal data are fetched as oracle feeds with freshness controls.',
      'land-title-registry': 'Stamp duty is calculated and anchored against a specific property title entry.'
    },
    configSchema: {
      type: 'object',
      properties: {
        states: { type: 'array', items: { type: 'string' }, default: ['MH', 'KA', 'TN', 'DL', 'TS'] },
        autoCalculation: { type: 'boolean', default: true },
        igrHandshake: { type: 'boolean', default: false }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'rental-agreement-engine',
    title: 'Rental Agreement Engine',
    projectType: 'dapp',
    category: 'real-estate',
    tags: ['rental', 'lease', 'deposit', 'tenant', 'landlord'],
    blurb: 'Lease creation, deposit escrow, rent collection scheduling, renewal options, and exit condition enforcement with landlord and tenant credential binding.',
    longDescription: [
      'Manages the full residential and commercial lease lifecycle: lease term and rent escalation clause definition, security deposit escrow, utility deposit split, notice period rule enforcement, rent collection scheduling with automatic reminders, renewal option tracking, and lease termination or renewal confirmation. Both landlord and tenant DIDs are bound to the agreement at creation.',
      'Escrow and Conditional Settlement handles the deposit mechanics in isolation. A rental agreement requires the complete lifecycle — from agreement drafting through renewal or exit — that no single existing module provides. High-volume urban rental market in India where a reliable, legally anchored digital lease is a genuine product. Connect to Stamp Duty and Registration Oracle for the mandatory lease registration requirement.'
    ],
    dependsOn: ['escrow-settlement'],
    recommends: ['stamp-duty-oracle', 'land-title-registry', 'did-vc-ledger', 'notifications', 'emails'],
    reasonByDepId: {
      'escrow-settlement': 'Security and utility deposits are held in conditional escrow and released on defined exit conditions.'
    },
    configSchema: {
      type: 'object',
      properties: {
        leaseTypes: { type: 'array', items: { type: 'string' }, default: ['residential', 'commercial', 'co-working'] },
        noticePeriodDays: { type: 'integer', minimum: 0, default: 30 },
        rentEscalationEnabled: { type: 'boolean', default: true }
      },
      additionalProperties: false
    }
  },

  // ── Sustainability & Carbon ─────────────────────────────────────────────────
  {
    moduleId: 'esg-reporting-ledger',
    title: 'ESG Reporting Ledger',
    projectType: 'dapp',
    category: 'sustainability-carbon',
    tags: ['esg', 'brsr', 'sebi', 'scope-1-2-3', 'sustainability'],
    blurb: 'Structured ESG data collection across Scope 1, 2, and 3 emissions with third-party verifier sign-off and BRSR-compatible report generation.',
    longDescription: [
      'Collects ESG data across all three emission scopes and other ESG dimensions (water, waste, social, governance) from connected operational sources, supports third-party verifier sign-off on each data category, and generates reports in SEBI\'s Business Responsibility and Sustainability Reporting (BRSR) format as well as GRI, SASB, and TCFD frameworks.',
      'Carbon Credits MRV covers the carbon market side. SEBI\'s BRSR mandate for listed companies creates a broader ESG data and reporting need that this module satisfies. Connect to Carbon Credits MRV Registry and Renewable Energy Certificates Registry to draw in environmental credit data, to Compliance Attestations for verifier sign-off workflow, and to Regulatory Reporting Engine for SEBI submission.'
    ],
    dependsOn: ['audit-logs'],
    recommends: ['carbon-credits-registry', 'recs-registry', 'compliance-attestations', 'regulatory-reporting', 'oracles'],
    reasonByDepId: {
      'audit-logs': 'ESG data inputs and verifier sign-off events must be tamper-evidently logged for audit trail integrity.'
    },
    configSchema: {
      type: 'object',
      properties: {
        frameworks: { type: 'array', items: { type: 'string' }, default: ['brsr', 'gri'] },
        emissionScopes: { type: 'array', items: { type: 'string' }, default: ['scope-1', 'scope-2', 'scope-3'] },
        thirdPartyVerification: { type: 'boolean', default: true }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'biodiversity-credits',
    title: 'Biodiversity Credit Registry',
    projectType: 'dapp',
    category: 'sustainability-carbon',
    tags: ['biodiversity', 'cop15', 'nbsap', 'conservation', 'offset'],
    blurb: 'Issue, transfer, and retire biodiversity credits for verified land conservation and ecosystem restoration with satellite evidence anchoring.',
    longDescription: [
      'Issues biodiversity credits representing verified conservation outcomes: species count verification, habitat area measurement, restoration activity records, and satellite image hash anchoring as evidence. Credits follow the Kunming-Montreal Global Biodiversity Framework (COP15) methodology. Retirement events are permanent and verifiable.',
      'Carbon credits have an existing module. Biodiversity credits are an emerging market following the COP15 framework adopted in 2022 and India\'s National Biodiversity Action Plan obligations. A dedicated module with the MRV methodology specific to biodiversity positions Cerulea ahead of the market before it matures. Connect to Carbon Credits MRV Registry for combined environmental credit portfolios and to ESG Reporting Ledger for inclusion in BRSR and TNFD disclosures.'
    ],
    dependsOn: ['oracles'],
    recommends: ['carbon-credits-registry', 'esg-reporting-ledger', 'audit-logs', 'provenance-notary'],
    reasonByDepId: {
      'oracles': 'Satellite imagery hashes, species count attestations, and habitat measurements enter as oracle-attested data.'
    },
    configSchema: {
      type: 'object',
      properties: {
        methodology: { type: 'string', enum: ['kunming-montreal', 'vcs-ccb', 'custom'], default: 'kunming-montreal' },
        retirementEnabled: { type: 'boolean', default: true },
        satelliteEvidenceRequired: { type: 'boolean', default: true }
      },
      additionalProperties: false
    }
  },

  // ── Blockchain: Access Control & Privacy ───────────────────────────────────
  {
    moduleId: 'tx-access-policy',
    title: 'Transaction Access Policy',
    projectType: 'blockchain',
    category: 'access-control',
    tags: ['permissioning', 'mempool', 'consortium', 'access-control'],
    blurb: 'Define which addresses or roles can submit which transaction types to the chain; enforce at the mempool level.',
    longDescription: [
      'Defines a policy table mapping address sets and on-chain roles to permitted transaction types, and enforces it at the mempool level before transactions are included in a block. Policy updates are governance-gated. An emergency override path exists for regulatory-ordered blocks that bypasses normal governance timing.',
      'Node Permissioning controls which nodes can join the network. Permissioned Private Transactions encrypts payload content. Neither controls which participants can submit which transaction types — the use case where a government-run private chain needs to allow a tax authority to query all transactions while restricting banks to only certain transaction types. Connect to KYB Registry for role-to-address binding and to Audit Logs for policy change records.'
    ],
    dependsOn: ['node-permissioning'],
    recommends: ['kyb-registry', 'private-tx', 'audit-logs', 'emergency-brake'],
    reasonByDepId: {
      'node-permissioning': 'Transaction access policy is applied after the node has already been admitted to the network.'
    },
    configSchema: {
      type: 'object',
      properties: {
        defaultPolicy: { type: 'string', enum: ['allowlist', 'denylist'], default: 'allowlist' },
        governanceRequired: { type: 'boolean', default: true },
        emergencyOverrideMultisig: { type: 'integer', minimum: 1, default: 3 }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'kyb-registry',
    title: 'On-chain KYB Registry',
    projectType: 'blockchain',
    category: 'access-control',
    tags: ['kyb', 'entity', 'cin', 'gstin', 'beneficial-ownership'],
    blurb: 'Know Your Business registry for entity onboarding: CIN, GSTIN, director credentials, and beneficial ownership with revocation and update workflows.',
    longDescription: [
      'Onboards legal entities onto the chain with structured verifications: CIN (Company Identification Number), GSTIN, MCA filing linkage, director DID credentials, and Ultimate Beneficial Owner (UBO) declaration. Each field update requires the submitting party\'s DID signature. Sanctions screening against entity identifiers is triggered on each update.',
      'KYC/AML Utility Registry covers individual identity. Business-to-business chains require entity verification before counterparties can transact. This module is the enterprise onboarding equivalent and is entirely absent from the current library. Connect to Transaction Access Policy to assign transaction permissions based on entity type and KYB status, and to AML Screening for entity-level sanctions checks.'
    ],
    dependsOn: ['did-vc-ledger'],
    recommends: ['kyc-utility-registry', 'aml-screening', 'tx-access-policy', 'audit-logs'],
    reasonByDepId: {
      'did-vc-ledger': 'Entity and director credentials are DID-anchored verifiable credentials that can be independently checked.'
    },
    configSchema: {
      type: 'object',
      properties: {
        requiredFields: { type: 'array', items: { type: 'string' }, default: ['cin', 'gstin', 'directors', 'ubo'] },
        sanctionsScreening: { type: 'boolean', default: true },
        updateApprovalRequired: { type: 'boolean', default: true }
      },
      additionalProperties: false
    }
  },

  // ── Blockchain: Operations & Compliance ────────────────────────────────────
  {
    moduleId: 'chain-audit-export',
    title: 'Chain Audit Export',
    projectType: 'blockchain',
    category: 'ops-compliance',
    tags: ['audit', 'regulatory', 'export', 'completeness-proof'],
    blurb: 'Scheduled or on-demand export of all chain transactions in regulator-specified formats with cryptographic completeness proof.',
    longDescription: [
      'Generates full transaction history exports in JSON, CSV, or XBRL format with a Merkle proof of completeness so the regulator can verify that no transactions were omitted between any two block heights. Supports scheduled automated exports for regular filing periods and on-demand exports for regulatory examination requests. Export packages are signed by the chain operator\'s KMS key.',
      'Audit Evidence Export on the dApp side handles application-level log packages. This blockchain-layer module exports the chain itself: every transaction in the specified range with a cryptographic proof that the export is complete and unaltered. RBI, SEBI, or CCI will request exactly this during a regulatory examination of a blockchain-based financial system.'
    ],
    dependsOn: ['audit-logs'],
    recommends: ['regulatory-reporting', 'log-shipping', 'backups-restore', 'kms-signing'],
    reasonByDepId: {
      'audit-logs': 'Chain-level audit exports are generated from the same event log that feeds the dApp-side audit trail.'
    },
    configSchema: {
      type: 'object',
      properties: {
        exportFormats: { type: 'array', items: { type: 'string' }, default: ['json', 'csv'] },
        scheduledExport: { type: 'boolean', default: true },
        exportIntervalDays: { type: 'integer', minimum: 1, default: 30 },
        completenessProof: { type: 'boolean', default: true }
      },
      additionalProperties: false
    }
  },
  {
    moduleId: 'emergency-brake',
    title: 'Governance Emergency Brake',
    projectType: 'blockchain',
    category: 'ops-compliance',
    tags: ['pause', 'circuit-breaker', 'multisig', 'exploit', 'emergency'],
    blurb: 'Consortium-controlled circuit breaker to pause specific contract functions or transaction types within minutes of an exploit or regulatory order.',
    longDescription: [
      'Provides a multisig-controlled pause function that can halt a specific contract, transaction type, or address within minutes without waiting for a full governance cycle. Pause actions require a configurable M-of-N threshold from the consortium\'s designated emergency responders. All pause and resume events are anchored and broadcast to all nodes immediately. A configurable auto-expiry forces a governance vote to resume after a defined window.',
      'Upgrade Manager handles planned protocol upgrades through the full governance cycle. Enterprise consortiums in banking and insurance will require a faster emergency mechanism as a hard requirement before going live. This module is a risk management non-negotiable for regulated institutions. Connect to Alerts and Paging for immediate notification to all consortium members when the brake is triggered.'
    ],
    dependsOn: ['upgrade-manager'],
    recommends: ['alerts-paging', 'kms-signing', 'audit-logs', 'tx-access-policy'],
    reasonByDepId: {
      'upgrade-manager': 'The emergency brake is a fast-path complement to the standard upgrade governance process.'
    },
    configSchema: {
      type: 'object',
      properties: {
        requiredSigners: { type: 'integer', minimum: 1, default: 3 },
        totalSigners: { type: 'integer', minimum: 2, default: 5 },
        autoExpiryHours: { type: 'integer', minimum: 1, default: 72 },
        pauseTargets: { type: 'array', items: { type: 'string' }, default: ['contract', 'tx-type', 'address'] }
      },
      additionalProperties: false
    }
  }
];

// ─── 2. BACK-PATCH EXISTING MODULES ──────────────────────────────────────────
// Add the most important new module IDs to the recommends of key parent modules.

const BACKPATCHES = {
  'land-title-registry':  ['mortgage-lien-mgr', 'stamp-duty-oracle', 'rental-agreement-engine'],
  'evidence-chain':       ['arbitration-vault', 'court-filing-registry'],
  'quality-recall-ledger':['recall-hub'],
  'traceability-ledger':  ['recall-hub', 'bom-ledger', 'drug-serial-ledger'],
  'did-vc-ledger':        ['academic-credential-registry', 'skill-passport', 'vaccination-cert', 'patient-consent'],
  'soulbound-token':      ['academic-credential-registry', 'skill-passport'],
  'carbon-credits-registry': ['esg-reporting-ledger', 'biodiversity-credits'],
  'recs-registry':        ['esg-reporting-ledger'],
  'state-channels':       ['m2m-micropayment'],
  'device-attestation':   ['iot-device-registry'],
  'royalty-clearing':     ['music-rights-registry'],
  'erc721':               ['gaming-marketplace'],
  'kyc-utility-registry': ['kyb-registry'],
  'provenance-notary':    ['health-record-anchor', 'ip-rights-registry'],
  'terms-consent':        ['patient-consent'],
  'node-permissioning':   ['tx-access-policy', 'kyb-registry'],
  'upgrade-manager':      ['emergency-brake'],
  'parametric-insurance': ['insurance-policy-ledger'],
  'securities-lifecycle': ['cap-table-mgr'],
  'audit-logs':           ['chain-audit-export'],
};

// Apply back-patches
for (const mod of seed.modules) {
  const additions = BACKPATCHES[mod.moduleId];
  if (!additions) continue;
  if (!Array.isArray(mod.recommends)) mod.recommends = [];
  for (const newId of additions) {
    if (!mod.recommends.includes(newId)) {
      mod.recommends.push(newId);
    }
  }
}

// ─── 3. APPEND NEW MODULES ────────────────────────────────────────────────────
// Avoid duplicates (in case the script is run more than once)
const existingIds = new Set(seed.modules.map(m => m.moduleId));
for (const m of NEW_MODULES) {
  if (!existingIds.has(m.moduleId)) {
    seed.modules.push(m);
    existingIds.add(m.moduleId);
  }
}

// ─── 4. WRITE BACK ───────────────────────────────────────────────────────────
seed.updatedAt = new Date().toISOString().slice(0, 10);
fs.writeFileSync(SEED_PATH, JSON.stringify(seed, null, 2), 'utf8');

console.log(`Done. Total modules: ${seed.modules.length}`);
console.log(`New: ${NEW_MODULES.length} | Back-patched: ${Object.keys(BACKPATCHES).length} existing modules`);
