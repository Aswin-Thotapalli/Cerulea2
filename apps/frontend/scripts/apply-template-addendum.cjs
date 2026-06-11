/**
 * Applies the template addendum:
 *  1. Removes the duplicate chain-cbdc-controls entry
 *  2. Marks 6 rollup/advanced templates as gated (selfServe: false)
 *  3. Adds 11 new templates with full metadata
 *  4. Back-patches module recommends for the new domain areas
 *
 * Run: node scripts/apply-template-addendum.cjs
 */

const fs   = require('fs');
const path = require('path');

const TMPL_PATH   = path.join(__dirname, '../src/data/templates.seed.json');
const MODULE_PATH = path.join(__dirname, '../src/data/modules.seed.json');

// ─── load ─────────────────────────────────────────────────────────────────────
const tmplSeed   = JSON.parse(fs.readFileSync(TMPL_PATH,   'utf8'));
const moduleSeed = JSON.parse(fs.readFileSync(MODULE_PATH, 'utf8'));

let templates = Array.isArray(tmplSeed) ? tmplSeed : tmplSeed.templates;

// ─── 1. REMOVE DUPLICATE chain-cbdc-controls ─────────────────────────────────
// It appears twice; keep the FIRST occurrence (Government & Civic context) and
// remove the second.
const cbdcIdx = [];
templates.forEach((t, i) => {
  if ((t.templateId || t.id) === 'chain-cbdc-controls') cbdcIdx.push(i);
});
if (cbdcIdx.length > 1) {
  // remove last duplicate (preserve first occurrence)
  templates.splice(cbdcIdx[cbdcIdx.length - 1], 1);
  console.log(`Removed duplicate chain-cbdc-controls (was at index ${cbdcIdx[cbdcIdx.length-1]})`);
} else {
  console.log(`chain-cbdc-controls: ${cbdcIdx.length} occurrence(s) — no duplicate to remove`);
}

// ─── 2. GATE 6 ROLLUP / ADVANCED TEMPLATES ───────────────────────────────────
const GATED_IDS = new Set([
  'chain-zk-rollup-l2',
  'chain-optimistic-rollup-l2',
  'chain-app-rollup-l3',
  'chain-shared-sequencer',
  'chain-pbs-mev',
  'chain-fhe-first',
]);
let gatedCount = 0;
for (const t of templates) {
  const tid = t.templateId || t.id;
  if (GATED_IDS.has(tid)) {
    t.selfServe = false;
    t.gated     = true;
    gatedCount++;
  }
}
console.log(`Marked ${gatedCount} templates as gated`);

// ─── 3. NEW TEMPLATES ─────────────────────────────────────────────────────────
const NEW_TEMPLATES = [

  // ── HIGH PRIORITY ──────────────────────────────────────────────────────────

  {
    templateId:  'chain-tax-compliance',
    title:       'Tax Compliance & GST Reconciliation Ledger',
    projectType: 'blockchain',
    category:    'government-civic',
    priority:    'high',
    selfServe:   true,
    gated:       false,
    blurb:       'Immutable GST return anchoring, TDS certificate issuance, inter-party invoice reconciliation, and tax audit trail for GSTN and income tax authority integration.',
    description: 'Pre-configures the anchoring of GST returns and TDS certificates so any transaction party can independently verify the other\'s filed returns without direct GSTN access. compliance-attestations handles periodic return submissions, evidence-chain handles dispute evidence, and provenance-notary anchors original filing timestamps. Directly applicable to the Income Tax Department\'s blockchain audit trail programme and GSTN invoice-matching dispute resolution.',
    modules: [
      'consensus', 'evm-config', 'rpc', 'explorer',
      'compliance-attestations', 'evidence-chain', 'provenance-notary',
      'kyc-utility-registry', 'api-gateway',
    ],
  },

  {
    templateId:  'chain-lab-diagnostics',
    title:       'Diagnostics & Lab Result Integrity Chain',
    projectType: 'blockchain',
    category:    'healthcare',
    priority:    'high',
    selfServe:   true,
    gated:       false,
    blurb:       'NABL-accredited lab result anchoring with instrument calibration certification, analyst credential binding, medicolegal chain of custody, and insurance claim evidence trail.',
    description: 'Distinct from the Healthcare Records Anchor template which anchors patient-level records from a care provider perspective. This template covers the diagnostic lab\'s perspective: each result anchors the analyst\'s DID credential, the instrument\'s calibration certificate hash, the sample ID, and the result hash at sign-off. The unbroken custody chain satisfies NABL accreditation audit requirements and provides evidence-grade records for insurance claims and legal proceedings.',
    modules: [
      'consensus', 'evm-config', 'stf', 'rpc', 'explorer',
      'evidence-chain', 'provenance-notary', 'did-vc-ledger',
      'compliance-attestations', 'api-gateway',
    ],
  },

  {
    templateId:  'chain-emissions-compliance',
    title:       'Industrial Emissions Permit & Compliance Monitor',
    projectType: 'blockchain',
    category:    'energy-environment',
    priority:    'high',
    selfServe:   true,
    gated:       false,
    blurb:       'Emission permit issuance, IoT sensor-based real-time reporting, monitoring lab certification, operator compliance attestations, and regulator oversight layer for CPCB/SPCB alignment.',
    description: 'Covers the CPCB/SPCB regulatory workflow: a factory holds a permit with emission limits, IoT sensors continuously monitor actual emissions, and the regulator receives a tamper-proof record without requiring monthly on-site inspections. Distinct from carbon credits (market side) and REC (energy certificates). device-attestation handles sensor identity, oracles handles the live sensor data feed, and compliance-attestations handles periodic operator declarations. Directly applicable to industrial operators under NGT consent-to-operate conditions.',
    modules: [
      'consensus', 'evm-config', 'stf', 'rpc', 'explorer',
      'compliance-attestations', 'provenance-notary',
      'device-attestation', 'oracles', 'api-gateway',
    ],
  },

  {
    templateId:  'chain-food-safety-recall',
    title:       'Food Safety Recall Coordination Network',
    projectType: 'blockchain',
    category:    'manufacturing',
    priority:    'high',
    selfServe:   true,
    gated:       false,
    blurb:       'Ingredient lot-to-product-batch linkage, allergen management, contamination alert propagation across retailers, and regulator notification workflow for FSSAI compliance.',
    description: 'Pre-configures the food safety recall pattern: ingredient lots are linked to finished product batches, batches are linked to specific retail store deliveries, and when a contamination event occurs the system automatically identifies and notifies only the stores that received the affected batch. Satisfies FSSAI recall procedure requirements. Distinct from supply-provenance (generic batch tracking) and agri-traceability (farm origin). The buyer is large food manufacturers and grocery chains, not farms or logistics companies.',
    modules: [
      'consensus', 'evm-config', 'stf', 'rpc', 'explorer',
      'traceability-ledger', 'quality-recalls',
      'compliance-attestations', 'indexer-sink', 'api-gateway',
    ],
  },

  // ── MEDIUM PRIORITY ────────────────────────────────────────────────────────

  {
    templateId:  'chain-ip-adr',
    title:       'IP Registry, Licensing & ADR Evidence Vault',
    projectType: 'blockchain',
    category:    'legal-professional',
    priority:    'medium',
    selfServe:   true,
    gated:       false,
    blurb:       'IP registration with ownership splits and territory definitions, licensing agreement anchoring with royalty terms, and arbitration/mediation evidence submission with procedural timeline anchoring.',
    description: 'Combined template for IP management and ADR because both share the same core modules and buyer persona (IP offices, law firms, ADR bodies). evidence-chain and provenance-notary provide the anchoring infrastructure. did-vc-ledger binds rights-holder and arbitrator credentials. royalty-clearing handles licensing royalty distribution. compliance-attestations tracks licensing compliance declarations. Distinct from identity-ssi (generic credentials) and court-evidence (judicial proceedings). Primary prospects: IP Office of India and DIAC (Delhi International Arbitration Centre).',
    modules: [
      'consensus', 'evm-config', 'rpc', 'explorer',
      'evidence-chain', 'provenance-notary', 'did-vc-ledger',
      'royalty-clearing', 'compliance-attestations', 'api-gateway',
    ],
  },

  {
    templateId:  'chain-travel-document',
    title:       'Digital Travel Document & Border Verification',
    projectType: 'blockchain',
    category:    'government-civic',
    priority:    'medium',
    selfServe:   true,
    gated:       false,
    blurb:       'ICAO-compliant digital passport and visa anchoring, biometric hash certification, cross-border verification with minimal data disclosure, and immigration event logging.',
    description: 'Handles the identity document side of border crossing (distinct from the health credential side). ICAO 9303 compliance for machine-readable travel documents, biometric hash anchoring, arrival/departure event logging, and minimal data disclosure for border control verification (the verifier confirms document validity without accessing the full data payload). privacy-compliance handles the selective disclosure layer. civil-registry anchors the foundational identity record. Primary buyers: Bureau of Immigration and state Passport Seva Kendras.',
    modules: [
      'consensus', 'evm-config', 'rpc', 'explorer',
      'did-vc-ledger', 'civil-registry', 'privacy-compliance',
      'provenance-notary', 'api-gateway',
    ],
  },

  {
    templateId:  'chain-gambling-exclusion',
    title:       'Responsible Gambling Self-Exclusion Registry',
    projectType: 'blockchain',
    category:    'gambling-gaming',
    priority:    'medium',
    selfServe:   true,
    gated:       false,
    blurb:       'Cross-operator self-exclusion registry with zero-knowledge proof verification: excluded individuals are blocked at every licensed operator without any operator accessing another\'s customer data.',
    description: 'The clearest real-world application of the ZK-proof-for-eligibility-checking pattern. An individual self-excludes from one operator, the credential is issued on-chain anonymously, and every other licensed operator verifies exclusion status (yes/no only) without learning anything about individuals who are not excluded and without seeing any other operator\'s customer data. Regulatory compliance requirement in every licensed gambling jurisdiction. In India: Goa, Sikkim, and Daman licensed casinos, plus online gaming platforms under IT Rules 2021 amendments. compliance-attestations handles operator daily confirmation that new accounts passed the exclusion check.',
    modules: [
      'consensus', 'evm-config', 'rpc', 'explorer',
      'did-vc-ledger', 'kyc-utility-registry', 'privacy-compliance',
      'compliance-attestations', 'api-gateway',
    ],
  },

  {
    templateId:  'chain-satellite-ops',
    title:       'Satellite Operations & Spectrum Coordination Registry',
    projectType: 'blockchain',
    category:    'space',
    priority:    'medium',
    selfServe:   true,
    gated:       false,
    blurb:       'Orbital slot and spectrum filing registry with ITU-anchored priority dates, satellite network coordination records, space debris tracking data contribution, and launch compliance attestation.',
    description: 'Distinct from chain-spectrum-number which handles terrestrial mobile network spectrum and TRAI numbering. Satellite operations are governed by the ITU Radiocommunication Bureau where orbital slot priority is determined by ITU filing date — exactly what provenance-notary anchors immutably. node-permissioning controls data sovereignty for multi-agency debris tracking (ISRO, NASA, ESA). compliance-attestations handles ITU coordination obligation filings. Primary buyers: ISRO, NewSpace India Limited, and commercial satellite operators emerging from India\'s space privatisation policy.',
    modules: [
      'consensus', 'evm-config', 'rpc', 'explorer',
      'spectrum-registry', 'evidence-chain', 'provenance-notary',
      'compliance-attestations', 'node-permissioning', 'api-gateway',
    ],
  },

  // ── LOWER PRIORITY ─────────────────────────────────────────────────────────

  {
    templateId:  'chain-customs-clearance',
    title:       'Customs Clearance & Trade Document Chain',
    projectType: 'blockchain',
    category:    'government-civic',
    priority:    'lower',
    selfServe:   true,
    gated:       false,
    blurb:       'Digital customs filing, port entry and exit event anchoring, duty calculation audit trail, and customs authority verification integration for ICEGATE alignment.',
    description: 'Distinct from chain-trade-finance which handles the private-sector trade flow (LCs, eBL, invoices between buyers and sellers). Customs clearance is the government workflow: the importer or CHA files a Bill of Entry, customs valuation is assessed, duty is paid, and goods are released. Each event is anchored with the filing agent\'s DID credential and timestamp. India\'s ICEGATE portal handles electronic filing but has no blockchain layer. Buyer: CBIC and major Customs House Agents. Lower priority because the sales cycle involves government procurement, but a direct extension of the trade finance use case.',
    modules: [
      'consensus', 'evm-config', 'rpc', 'explorer',
      'trade-finance-docs', 'provenance-notary',
      'compliance-attestations', 'kyc-utility-registry', 'api-gateway',
    ],
  },

  {
    templateId:  'chain-aviation-mro',
    title:       'Aircraft Parts MRO Provenance & Airworthiness',
    projectType: 'blockchain',
    category:    'manufacturing',
    priority:    'lower',
    selfServe:   false,   // contact-us gated: multi-year aviation procurement cycle
    gated:       true,
    blurb:       'Aircraft part serial number registration, full custody transfer history, AME-credentialed maintenance action anchoring, airworthiness release certificates, and DGCA-compliant audit trail.',
    description: 'Categorically different from chain-fleet-maintenance (general vehicle service records). DGCA and FAA require an unbroken chain of custody and airworthiness documentation for every life-limited aircraft part. device-attestation handles part serial number identity anchoring from OEM. evidence-chain handles AME (Aircraft Maintenance Engineer) sign-off records. did-vc-ledger verifies AME licence credentials. quality-recalls handles the airworthiness directive response workflow. node-permissioning controls access across airlines, MROs, and regulators. Buyers: Air India, IndiGo, DGCA. Gated (contact-us) due to multi-year aviation procurement cycles.',
    modules: [
      'consensus', 'evm-config', 'stf', 'rpc', 'explorer',
      'traceability-ledger', 'device-attestation', 'evidence-chain',
      'did-vc-ledger', 'quality-recalls', 'node-permissioning', 'api-gateway',
    ],
  },

  {
    templateId:  'chain-trade-compliance',
    title:       'International Trade Compliance & Dispute Evidence',
    projectType: 'blockchain',
    category:    'government-civic',
    priority:    'lower',
    selfServe:   false,   // contact-us gated: ministry-level procurement
    gated:       true,
    blurb:       'WTO and bilateral trade dispute evidence submission, government delegation credential anchoring, procedural timeline with immutable filing dates, and third-party arbitration access layer.',
    description: 'Handles the government side of international trade (distinct from chain-trade-finance which covers the private sector buyer-seller flow). WTO dispute settlement, anti-dumping investigation evidence, rules of origin certification, and preferential trade agreement compliance verification. Each participating government needs a credentialed evidence submission layer with immutable timestamps. node-permissioning controls which government delegations can access which case records. Buyers: Ministry of Commerce and Industry, DGFT, CII, and FICCI. Gated (contact-us) due to government ministry procurement cycles.',
    modules: [
      'consensus', 'evm-config', 'rpc', 'explorer',
      'evidence-chain', 'provenance-notary', 'did-vc-ledger',
      'compliance-attestations', 'node-permissioning', 'api-gateway',
    ],
  },
];

// Append (skip if already present)
const existingIds = new Set(templates.map(t => t.templateId || t.id));
let addedCount = 0;
for (const t of NEW_TEMPLATES) {
  if (!existingIds.has(t.templateId)) {
    templates.push(t);
    existingIds.add(t.templateId);
    addedCount++;
  }
}
console.log(`Added ${addedCount} new templates`);

// ─── 4. MODULE BACK-PATCHES ────────────────────────────────────────────────────
// Update module recommends to reflect the new domain groupings.

const MODULE_BACKPATCHES = {
  // Tax compliance — these modules now appear together frequently
  'compliance-attestations': ['evidence-chain', 'provenance-notary', 'regulatory-reporting'],
  'evidence-chain':          ['compliance-attestations', 'provenance-notary'],

  // Diagnostics / lab integrity
  'did-vc-ledger':           ['civil-registry', 'vaccination-cert', 'provenance-notary'],
  'provenance-notary':       ['compliance-attestations', 'evidence-chain', 'civil-registry'],

  // Emissions compliance
  'device-attestation':      ['compliance-attestations', 'industrial-iot-oracle', 'oracles'],
  'oracles':                 ['compliance-attestations', 'device-attestation'],

  // Food safety recall
  'traceability-ledger':     ['compliance-attestations'],

  // IP & ADR
  'royalty-clearing':        ['provenance-notary', 'evidence-chain'],

  // Travel documents
  'civil-registry':          ['privacy-compliance', 'provenance-notary', 'did-vc-ledger'],
  'privacy-compliance':      ['did-vc-ledger', 'civil-registry', 'compliance-attestations'],

  // Gambling exclusion
  'kyc-utility-registry':    ['privacy-compliance'],

  // Satellite ops
  'spectrum-registry':       ['provenance-notary', 'node-permissioning', 'compliance-attestations'],
  'node-permissioning':      ['compliance-attestations', 'privacy-compliance'],

  // Customs
  'trade-finance-docs':      ['provenance-notary', 'compliance-attestations', 'kyc-utility-registry'],

  // Aviation MRO
  'quality-recalls':         ['device-attestation', 'traceability-ledger', 'did-vc-ledger'],
};

const moduleMap = Object.fromEntries(moduleSeed.modules.map(m => [m.moduleId, m]));
let patchedModules = 0;

for (const [moduleId, additions] of Object.entries(MODULE_BACKPATCHES)) {
  const mod = moduleMap[moduleId];
  if (!mod) { console.warn(`  Module not found for backpatch: ${moduleId}`); continue; }
  if (!Array.isArray(mod.recommends)) mod.recommends = [];
  let changed = false;
  for (const newId of additions) {
    if (!mod.recommends.includes(newId)) {
      mod.recommends.push(newId);
      changed = true;
    }
  }
  if (changed) patchedModules++;
}
console.log(`Back-patched ${patchedModules} modules`);

// ─── 5. WRITE BACK ────────────────────────────────────────────────────────────
// Write back preserving root structure
if (Array.isArray(tmplSeed)) {
  fs.writeFileSync(TMPL_PATH, JSON.stringify(templates, null, 2), 'utf8');
} else {
  tmplSeed.templates = templates;
  tmplSeed.updatedAt = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(TMPL_PATH, JSON.stringify(tmplSeed, null, 2), 'utf8');
}

moduleSeed.updatedAt = new Date().toISOString().slice(0, 10);
fs.writeFileSync(MODULE_PATH, JSON.stringify(moduleSeed, null, 2), 'utf8');

const selfServeCount  = templates.filter(t => t.selfServe !== false).length;
const gatedFinalCount = templates.filter(t => t.gated === true).length;
console.log(`\nTemplate summary:`);
console.log(`  Total:      ${templates.length}`);
console.log(`  Self-serve: ${selfServeCount}`);
console.log(`  Gated:      ${gatedFinalCount}`);
