/**
 * AquaTrace - Studio Step 1 (Blueprint) data
 * 55 modules / 90 relations, transcribed from scripts/aquatrace/SPEC.md
 *
 * Shape matches scripts/seed-agrotrace.cjs exactly:
 *   MODULES -> NODES (n_<moduleId>) -> EDGES (e<i>_<src>_<tgt>) -> BLUEPRINT
 *
 * HARD RULE observed below: modules whose library configSchema declares
 * "additionalProperties": false carry ONLY the keys that schema defines.
 * Spec detail that did not fit such a schema is carried by the nearest
 * free-form module (noted inline).
 *
 * module.exports = { MODULES, EDGES, BLUEPRINT }
 */

/* ─────────────────────────── shared spec constants ─────────────────────────── */

const CHAIN_NAME = 'AquaChain';
const CHAIN_ID = 'aquatrace-1';
const BLOCK_INTERVAL_MS = 5000;
const VALIDATOR_COUNT = 5;
const FINALITY_THRESHOLD = 4;

const VALIDATOR_NODE_KEYS = [
  'aquachain-validator-1',
  'aquachain-validator-2',
  'aquachain-validator-3',
  'aquachain-validator-4',
  'aquachain-validator-5',
];

/* §3.1 - entities flagged anchoredOnChain (28) */
const ANCHORED_ENTITIES = [
  'organisation',
  'processing_plant',
  'processing_batch',
  'lab_report',
  'handling_event',
  'transport_event',
  'ship_receive_event',
  'lot_transform_event',
  'consignment',
  'certificate',
  'document_anchor',
  'customs_event',
  'shipping_event',
  'import_event',
  'distribution_event',
  'retail_event',
  'crop_cycle',
  'broodstock_event',
  'hatchery_event',
  'input_application_event',
  'growout_reading',
  'sampling_event',
  'harvest_event',
  'fishing_trip',
  'onvessel_processing_event',
  'transhipment_event',
  'landing_event',
  'auction_event',
];

/* §3.2 - 30 transaction types (on-chain event kinds) */
const TRANSACTION_TYPES = [
  { key: 'tx_register', label: 'Register organisation', scope: 'shared', category: 'register', anchors: 'organisation' },
  { key: 'tx_register_plant', label: 'Register processing plant', scope: 'shared', category: 'register', anchors: 'processing_plant' },
  { key: 'tx_processing', label: 'Record processing batch', scope: 'shared', category: 'event', anchors: 'processing_batch' },
  { key: 'tx_cold_storage', label: 'Record freezing and cold storage', scope: 'shared', category: 'event', anchors: 'processing_batch' },
  { key: 'tx_lab_result', label: 'Record laboratory result', scope: 'shared', category: 'event', anchors: 'lab_report' },
  { key: 'tx_handling', label: 'Record handling site event', scope: 'shared', category: 'event', anchors: 'handling_event' },
  { key: 'tx_transport', label: 'Record transport leg', scope: 'shared', category: 'event', anchors: 'transport_event' },
  { key: 'tx_ship_receive', label: 'Ship and receive', scope: 'shared', category: 'handoff', anchors: 'ship_receive_event' },
  { key: 'tx_split', label: 'Split lot', scope: 'shared', category: 'split', anchors: 'lot_transform_event' },
  { key: 'tx_merge', label: 'Merge lots', scope: 'shared', category: 'merge', anchors: 'lot_transform_event' },
  { key: 'tx_consignment', label: 'Assemble consignment', scope: 'shared', category: 'event', anchors: 'consignment' },
  { key: 'tx_customs', label: 'Record customs clearance', scope: 'shared', category: 'event', anchors: 'customs_event' },
  { key: 'tx_shipping', label: 'Record ocean freight leg', scope: 'shared', category: 'event', anchors: 'shipping_event' },
  { key: 'tx_import', label: 'Record import clearance', scope: 'shared', category: 'event', anchors: 'import_event' },
  { key: 'tx_distribution', label: 'Record distribution', scope: 'shared', category: 'event', anchors: 'distribution_event' },
  { key: 'tx_retail', label: 'Record retail delivery', scope: 'shared', category: 'event', anchors: 'retail_event' },
  { key: 'tx_certificate', label: 'Issue certificate', scope: 'shared', category: 'certificate', anchors: 'certificate' },
  { key: 'tx_document_anchor', label: 'Anchor document', scope: 'shared', category: 'document_anchor', anchors: 'document_anchor' },
  { key: 'tx_broodstock', label: 'Create broodstock lot', scope: 'farmed', category: 'origin_create', anchors: 'broodstock_event' },
  { key: 'tx_hatchery', label: 'Record hatchery seed production', scope: 'farmed', category: 'event', anchors: 'hatchery_event' },
  { key: 'tx_stocking', label: 'Record pond stocking', scope: 'farmed', category: 'event', anchors: 'crop_cycle' },
  { key: 'tx_input_application', label: 'Record input application', scope: 'farmed', category: 'event', anchors: 'input_application_event' },
  { key: 'tx_growout', label: 'Record grow-out reading', scope: 'farmed', category: 'event', anchors: 'growout_reading' },
  { key: 'tx_sampling', label: 'Record pre-harvest sample', scope: 'farmed', category: 'event', anchors: 'sampling_event' },
  { key: 'tx_harvest', label: 'Record harvest', scope: 'farmed', category: 'event', anchors: 'harvest_event' },
  { key: 'tx_fishing', label: 'Record fishing event', scope: 'wild', category: 'origin_create', anchors: 'fishing_trip' },
  { key: 'tx_onvessel_processing', label: 'Record on-vessel processing', scope: 'wild', category: 'event', anchors: 'onvessel_processing_event' },
  { key: 'tx_transhipment', label: 'Record transhipment', scope: 'wild', category: 'event', anchors: 'transhipment_event' },
  { key: 'tx_landing', label: 'Record landing', scope: 'wild', category: 'event', anchors: 'landing_event' },
  { key: 'tx_auction', label: 'Record auction and first sale', scope: 'wild', category: 'merge', anchors: 'auction_event' },
];

/* §3.3 - 14 certificate types */
const CERTIFICATE_TYPES = [
  { key: 'cert_establishment', label: 'Establishment approval', scope: 'shared', anchors: 'processing_plant', issuerKind: 'regulator', issuer: 'eia', mandatory: true },
  { key: 'cert_health', label: 'Health certificate', scope: 'shared', anchors: 'consignment', issuerKind: 'regulator', issuer: 'eia', mandatory: true },
  { key: 'cert_origin', label: 'Certificate of origin', scope: 'shared', anchors: 'consignment', issuerKind: 'regulator', issuer: 'eic', mandatory: true },
  { key: 'cert_caa_unit', label: 'Coastal aquaculture unit registration', scope: 'farmed', anchors: 'crop_cycle', issuerKind: 'regulator', issuer: 'caa', mandatory: true },
  { key: 'cert_mpeda_enrolment', label: 'MPEDA farm enrolment', scope: 'farmed', anchors: 'crop_cycle', issuerKind: 'regulator', issuer: 'mpeda', mandatory: false, appliesTo: 'dest: european_union' },
  { key: 'cert_coc_inputs', label: 'Certificate of Compliance for antibiotic free inputs', scope: 'farmed', anchors: 'input_application_event', issuerKind: 'regulator', issuer: 'caa', mandatory: true },
  { key: 'cert_shaphari', label: 'SHAPHARI certification', scope: 'farmed', anchors: 'crop_cycle', issuerKind: 'regulator', issuer: 'mpeda', mandatory: false },
  { key: 'cert_fssai', label: 'FSSAI licence', scope: 'farmed', anchors: 'processing_plant', issuerKind: 'regulator', issuer: 'fssai', mandatory: true },
  { key: 'cert_vessel_registration', label: 'Vessel Registration Certificate', scope: 'wild', anchors: 'fishing_trip', issuerKind: 'regulator', issuer: 'realcraft', mandatory: true },
  { key: 'cert_fishing_licence', label: 'Fishing Licence Certificate', scope: 'wild', anchors: 'fishing_trip', issuerKind: 'regulator', issuer: 'state_fisheries', mandatory: true },
  { key: 'cert_letter_authorisation', label: 'Letter of Authorisation (high seas)', scope: 'wild', anchors: 'fishing_trip', issuerKind: 'regulator', issuer: 'dof', mandatory: false },
  { key: 'cert_catch', label: 'Catch certificate', scope: 'wild', anchors: 'consignment', issuerKind: 'regulator', issuer: 'dof', mandatory: true, appliesTo: 'dest: european_union' },
  { key: 'cert_msc', label: 'Marine Stewardship Council certification', scope: 'wild', anchors: 'fishing_trip', issuerKind: 'regulator', issuer: 'msc', mandatory: false },
  { key: 'cert_fssai_wild', label: 'FSSAI licence', scope: 'wild', anchors: 'processing_plant', issuerKind: 'regulator', issuer: 'fssai', mandatory: true },
];

/* §4 - 31 workflow role keys (+ the 2 platform roles from §9.2) */
const WORKFLOW_ROLES = [
  'plant_quality_manager',
  'exporter_administrator',
  'customs_broker',
  'transporter',
  'importer',
  'distributor',
  'retailer',
  'agent_dealer',
  'regulator_auditor',
  'broodstock_multiplication_centre',
  'hatchery_operator',
  'farmer',
  'preprocessing_operator',
  'dealer_trader',
  'nucleus_breeding_centre',
  'seed_agent',
  'feed_manufacturer',
  'input_dealer',
  'aqua_technician',
  'pond_lessor',
  'harvest_contractor',
  'commission_agent',
  'buying_agent',
  'skipper',
  'auctioneer',
  'assembler_supplier',
  'wholesaler',
  'cleaning_operator',
  'boat_owner',
  'financier',
  'ice_fuel_supplier',
];

const PLATFORM_ROLES = ['platform_admin', 'platform_super_admin'];

const ALL_ROLES = WORKFLOW_ROLES.concat(PLATFORM_ROLES);

/* §5 - farmed_aquaculture, 17 stages */
const FARMED_STAGES = [
  { order: 10, key: 'stage_broodstock', label: 'Broodstock lot supply', role: 'broodstock_multiplication_centre', emits: 'tx_broodstock', requires: null, formEntity: 'broodstock_event', handoffTo: 'hatchery_operator', handoffFields: ['broodstock_lot', 'species'], repeatable: false },
  { order: 20, key: 'stage_hatchery', label: 'Hatchery seed production', role: 'hatchery_operator', emits: 'tx_hatchery', requires: 'tx_broodstock', formEntity: 'hatchery_event', handoffTo: 'farmer', handoffFields: ['seed_lot', 'seed_quantity'], repeatable: false },
  { order: 30, key: 'stage_stocking', label: 'Pond stocking', role: 'farmer', emits: 'tx_stocking', requires: 'tx_hatchery', formEntity: 'crop_cycle', handoffTo: null, handoffFields: [], repeatable: false },
  { order: 40, key: 'stage_input_application', label: 'Feed and input application', role: 'farmer', emits: 'tx_input_application', requires: 'tx_stocking', formEntity: 'input_application_event', handoffTo: null, handoffFields: [], repeatable: true },
  { order: 50, key: 'stage_growout', label: 'Grow-out', role: 'farmer', emits: 'tx_growout', requires: 'tx_stocking', formEntity: 'growout_reading', handoffTo: null, handoffFields: [], repeatable: true },
  { order: 60, key: 'stage_sampling', label: 'Pre-harvest sampling', role: 'farmer', emits: 'tx_sampling', requires: 'tx_stocking', formEntity: 'sampling_event', handoffTo: null, handoffFields: [], repeatable: true },
  { order: 70, key: 'stage_harvest', label: 'Harvest and farm-gate sale', role: 'farmer', emits: 'tx_harvest', requires: 'tx_stocking', formEntity: 'harvest_event', handoffTo: 'dealer_trader', handoffFields: ['harvest_weight', 'count_grade'], repeatable: false },
  { order: 75, key: 'stage_farm_gate_receipt', label: 'Dealer receipt and dispatch', role: 'dealer_trader', emits: 'tx_ship_receive', requires: 'tx_harvest', formEntity: 'ship_receive_event', handoffTo: 'preprocessing_operator', handoffFields: ['quantity'], repeatable: false },
  { order: 80, key: 'stage_preprocessing', label: 'Pre-processing', role: 'preprocessing_operator', emits: 'tx_handling', requires: 'tx_ship_receive', formEntity: 'handling_event', handoffTo: 'plant_quality_manager', handoffFields: ['output_lot_ref'], repeatable: false },
  { order: 100, key: 'stage_processing', label: 'Processing plant', role: 'plant_quality_manager', emits: 'tx_processing', requires: null, formEntity: 'processing_batch', handoffTo: null, handoffFields: [], repeatable: false },
  { order: 110, key: 'stage_freezing_cold_storage', label: 'Freezing and cold storage', role: 'plant_quality_manager', emits: 'tx_cold_storage', requires: 'tx_processing', formEntity: 'processing_batch', handoffTo: 'exporter_administrator', handoffFields: ['finished_weight'], repeatable: false },
  { order: 120, key: 'stage_export_documentation', label: 'Export documentation', role: 'exporter_administrator', emits: 'tx_consignment', requires: 'tx_cold_storage', formEntity: 'consignment', handoffTo: 'customs_broker', handoffFields: ['total_weight'], repeatable: false },
  { order: 130, key: 'stage_customs', label: 'Customs clearance', role: 'customs_broker', emits: 'tx_customs', requires: 'tx_consignment', formEntity: 'customs_event', handoffTo: 'transporter', handoffFields: ['shipping_bill_number'], repeatable: false },
  { order: 140, key: 'stage_shipping', label: 'Ocean freight', role: 'transporter', emits: 'tx_shipping', requires: 'tx_customs', formEntity: 'shipping_event', handoffTo: 'importer', handoffFields: ['container_number'], repeatable: false },
  { order: 150, key: 'stage_import', label: 'Import clearance', role: 'importer', emits: 'tx_import', requires: 'tx_shipping', formEntity: 'import_event', handoffTo: 'distributor', handoffFields: ['import_entry_number'], repeatable: false },
  { order: 160, key: 'stage_distribution', label: 'Distribution', role: 'distributor', emits: 'tx_distribution', requires: 'tx_import', formEntity: 'distribution_event', handoffTo: 'retailer', handoffFields: ['quantity'], repeatable: false },
  { order: 170, key: 'stage_retail', label: 'Retail delivery', role: 'retailer', emits: 'tx_retail', requires: 'tx_distribution', formEntity: 'retail_event', handoffTo: null, handoffFields: [], repeatable: false },
];

/* §5 - wild_capture, 16 stages */
const WILD_STAGES = [
  { order: 10, key: 'stage_fishing', label: 'Fishing trip', role: 'skipper', emits: 'tx_fishing', requires: null, formEntity: 'fishing_trip', handoffTo: null, handoffFields: [], repeatable: false },
  { order: 20, key: 'stage_onvessel_processing', label: 'On-vessel processing', role: 'skipper', emits: 'tx_onvessel_processing', requires: 'tx_fishing', formEntity: 'onvessel_processing_event', handoffTo: null, handoffFields: [], repeatable: true },
  { order: 30, key: 'stage_transhipment', label: 'Transhipment', role: 'skipper', emits: 'tx_transhipment', requires: 'tx_fishing', formEntity: 'transhipment_event', handoffTo: null, handoffFields: [], repeatable: true },
  { order: 40, key: 'stage_landing', label: 'Landing', role: 'skipper', emits: 'tx_landing', requires: 'tx_fishing', formEntity: 'landing_event', handoffTo: 'auctioneer', handoffFields: ['landed_weight'], repeatable: false },
  { order: 50, key: 'stage_auction', label: 'Auction and first sale', role: 'auctioneer', emits: 'tx_auction', requires: 'tx_landing', formEntity: 'auction_event', handoffTo: 'assembler_supplier', handoffFields: ['weight'], repeatable: false },
  { order: 60, key: 'stage_assembly', label: 'Assembly and consolidation', role: 'assembler_supplier', emits: 'tx_ship_receive', requires: 'tx_auction', formEntity: 'ship_receive_event', handoffTo: 'wholesaler', handoffFields: ['quantity'], repeatable: false },
  { order: 70, key: 'stage_wholesale', label: 'Wholesale holding', role: 'wholesaler', emits: 'tx_ship_receive', requires: null, formEntity: 'ship_receive_event', handoffTo: 'cleaning_operator', handoffFields: ['quantity'], repeatable: false },
  { order: 80, key: 'stage_cleaning', label: 'Cleaning and pre-processing', role: 'cleaning_operator', emits: 'tx_handling', requires: 'tx_ship_receive', formEntity: 'handling_event', handoffTo: 'plant_quality_manager', handoffFields: ['output_lot_ref'], repeatable: false },
  { order: 100, key: 'stage_processing', label: 'Processing plant', role: 'plant_quality_manager', emits: 'tx_processing', requires: null, formEntity: 'processing_batch', handoffTo: null, handoffFields: [], repeatable: false },
  { order: 110, key: 'stage_freezing_cold_storage', label: 'Freezing and cold storage', role: 'plant_quality_manager', emits: 'tx_cold_storage', requires: 'tx_processing', formEntity: 'processing_batch', handoffTo: 'exporter_administrator', handoffFields: ['finished_weight'], repeatable: false },
  { order: 120, key: 'stage_export_documentation', label: 'Export documentation', role: 'exporter_administrator', emits: 'tx_consignment', requires: 'tx_cold_storage', formEntity: 'consignment', handoffTo: 'customs_broker', handoffFields: ['total_weight'], repeatable: false },
  { order: 130, key: 'stage_customs', label: 'Customs clearance', role: 'customs_broker', emits: 'tx_customs', requires: 'tx_consignment', formEntity: 'customs_event', handoffTo: 'transporter', handoffFields: ['shipping_bill_number'], repeatable: false },
  { order: 140, key: 'stage_shipping', label: 'Ocean freight', role: 'transporter', emits: 'tx_shipping', requires: 'tx_customs', formEntity: 'shipping_event', handoffTo: 'importer', handoffFields: ['container_number'], repeatable: false },
  { order: 150, key: 'stage_import', label: 'Import clearance', role: 'importer', emits: 'tx_import', requires: 'tx_shipping', formEntity: 'import_event', handoffTo: 'distributor', handoffFields: ['import_entry_number'], repeatable: false },
  { order: 160, key: 'stage_distribution', label: 'Distribution', role: 'distributor', emits: 'tx_distribution', requires: 'tx_import', formEntity: 'distribution_event', handoffTo: 'retailer', handoffFields: ['quantity'], repeatable: false },
  { order: 170, key: 'stage_retail', label: 'Retail delivery', role: 'retailer', emits: 'tx_retail', requires: 'tx_distribution', formEntity: 'retail_event', handoffTo: null, handoffFields: [], repeatable: false },
];

/* §7.1 - monitoring rules */
const MONITORING_RULES = [
  { key: 'rule_dissolved_oxygen_low', scope: 'farmed', label: 'Dissolved oxygen below safe level', entity: 'growout_reading', field: 'dissolved_oxygen', op: 'lt', threshold: 4, unit: 'mg/L', message: 'Dissolved oxygen has fallen below 4 mg/L, a stress threshold for the crop.' },
  { key: 'rule_ammonia_high', scope: 'farmed', label: 'Ammonia above safe level', entity: 'growout_reading', field: 'ammonia', op: 'gt', threshold: 0.1, unit: 'mg/L', message: 'Ammonia has risen above 0.1 mg/L, indicating a water quality problem.' },
  { key: 'rule_residue_breach', scope: 'farmed', label: 'Residue above maximum residue limit', entity: 'lab_report', field: 'residue_value', op: 'gt', limitField: 'residue_limit', unit: 'ug/kg', message: 'A residue reading has exceeded its maximum residue limit. The affected lot must be held.' },
  { key: 'rule_input_not_certified', scope: 'farmed', label: 'Input not on the certified list', entity: 'input_application_event', field: 'caa_certified', op: 'eq', threshold: 0, message: 'An input was applied that is not on the Coastal Aquaculture Authority certified list.' },
  { key: 'rule_transport_temperature', scope: 'farmed', label: 'First-mile temperature excursion', entity: 'transport_event', field: 'temperature_max', op: 'gt', threshold: 4, unit: 'C', message: 'The transport leg exceeded 4 C, outside the chilled range for iced product.' },
  { key: 'rule_residue_breach_wild', scope: 'wild', ruleKey: 'rule_residue_breach', label: 'Residue above maximum residue limit', entity: 'lab_report', field: 'residue_value', op: 'gt', limitField: 'residue_limit', unit: 'ug/kg', message: 'A residue reading has exceeded its maximum residue limit. The affected lot must be held.' },
  { key: 'rule_transport_temperature_wild', scope: 'wild', ruleKey: 'rule_transport_temperature', label: 'Transport temperature excursion', entity: 'transport_event', field: 'temperature_max', op: 'gt', threshold: 4, unit: 'C', message: 'The transport leg exceeded 4 C, outside the chilled range for iced product.' },
];

/* ═══════════════════════════════════════════════════════════════════ */
/*  STEP 1 - BLUEPRINT (55 modules, 90 edges)                         */
/* ═══════════════════════════════════════════════════════════════════ */

const MODULES = [
  /* ── Chain core (11) ── */
  {
    moduleId: 'consensus', title: 'Consensus Engine', group: 'core-protocol',
    /* constrained schema: type, blockTimeMs only */
    config: { type: 'ibft', blockTimeMs: BLOCK_INTERVAL_MS },
  },
  {
    moduleId: 'validators', title: 'Validators and Staking', group: 'economics-staking',
    /* constrained schema: AquaChain validators are a fixed permissioned set, no stake, no unbonding */
    config: { validatorSetType: 'static', minStakeAmount: 0, unbondingDays: 0 },
  },
  {
    moduleId: 'genesis', title: 'Genesis Configurator', group: 'state-genesis',
    /* constrained schema: no native token, so nothing is prefunded or allocated */
    config: { prefundedAccounts: [], allocations: [] },
  },
  {
    moduleId: 'node-permissioning', title: 'Node Permissioning', group: 'networking-security',
    /* constrained schema: allowedNodeKeys only - the 5 co-signing validator nodes */
    config: { allowedNodeKeys: VALIDATOR_NODE_KEYS.slice() },
  },
  {
    moduleId: 'mempool-policy', title: 'Mempool Policy', group: 'Core Architecture',
    /* free-form: also carries the §3.1 chain mechanics that constrained schemas cannot hold */
    config: {
      minGasPriceGwei: 0,
      replaceByFee: false,
      blockIntervalMs: BLOCK_INTERVAL_MS,
      sealWhenPending: true,
      chainName: CHAIN_NAME,
      chainId: CHAIN_ID,
      feeModel: 'none - permissioned chain, no gas and no native token',
      signatureAlgorithm: 'ed25519, one keypair per acting party',
      hashAlgorithm: 'SHA-256 over the canonical event payload',
      blockStructure: 'transactions batched with a Merkle root; previousHash -> blockHash',
      blockProduction: 'a producer node seals a block every 5000 ms when transactions are pending',
      validatorCount: VALIDATOR_COUNT,
      finalityThreshold: FINALITY_THRESHOLD,
      finalityNote: 'a block finalises at 4 of 5 validator signatures',
      admissionOrder: 'first-seen, no replacement and no fee-based reordering',
      admittedTransactionTypes: TRANSACTION_TYPES.map((t) => t.key),
    },
  },
  {
    moduleId: 'p2p', title: 'P2P Networking', group: 'core-protocol',
    /* constrained schema: maxPeers, gossipMaxSizeKb only */
    config: { maxPeers: 8, gossipMaxSizeKb: 512 },
  },
  {
    moduleId: 'p2p-tls', title: 'P2P TLS', group: 'networking-security',
    /* constrained schema: secret names only */
    config: {
      caBundleSecret: 'AQUACHAIN_P2P_CA_BUNDLE',
      certificateSecret: 'AQUACHAIN_P2P_CERT',
      privateKeySecret: 'AQUACHAIN_P2P_KEY',
    },
  },
  {
    moduleId: 'rpc', title: 'RPC API', group: 'apis-devex',
    /* constrained schema: publicMethods, privateMethods, rateLimitRps only */
    config: {
      publicMethods: [
        'chain_getHeadBlock',
        'chain_getBlockByNumber',
        'chain_getRecentBlocks',
        'chain_getTransaction',
        'chain_verifyChain',
        'chain_verifyShipment',
      ],
      privateMethods: [
        'chain_submitTransaction',
        'chain_signEvent',
        'chain_acceptHandoff',
        'chain_flagDiscrepancy',
        'chain_issueCertificate',
        'chain_anchorDocument',
      ],
      rateLimitRps: 2,
    },
  },
  {
    moduleId: 'ws-subscriptions', title: 'WebSocket Subscriptions', group: 'apis-devex',
    /* constrained schema: maxSubscribers only */
    config: { maxSubscribers: 2000 },
  },
  {
    moduleId: 'graphql-gateway', title: 'GraphQL Gateway', group: 'apis-devex',
    /* constrained schema: playground only */
    config: { playground: false },
  },
  {
    moduleId: 'api-gateway', title: 'API Gateway', group: 'Networking & APIs',
    /* free-form: also carries §9.3 token/MFA settings and the §9.3 rate-limit window */
    config: {
      requireApiKey: true,
      burst: 120,
      ratePerSecond: 2,
      rateLimitRequests: 120,
      rateLimitWindowSeconds: 60,
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 1209600,
      mfaMethod: 'totp',
      mfaIssuer: 'AquaTrace',
      tenantIsolation: 'every organisation and record is scoped to a tenant; a normal user is bound to exactly one profile',
      productUrl: 'aquatrace.cerulea.io',
      companyUrl: 'cerulea.io',
      publicRoutes: ['/login', '/accept-invite', '/verify', '/verify/:code'],
      authenticatedRoutes: ['/dashboard', '/records', '/records/:id', '/explorer'],
      adminRoutes: ['/admin'],
      adminRoutePolicy: 'platform_admin or platform_super_admin only',
    },
  },
  {
    moduleId: 'explorer', title: 'Block Explorer', group: 'exploration-ui',
    /* constrained schema: enableAddressLabels only - the explorer behaviour lives in §3.1 and is
       carried by mempool-policy and provenance-notary */
    config: { enableAddressLabels: true },
  },

  /* ── Chain security and governance (4) ── */
  {
    moduleId: 'kms-signing', title: 'KMS / HSM Signing', group: 'security-compliance',
    /* constrained schema: provider, keyAlias only */
    config: { provider: 'aws-kms', keyAlias: 'aquatrace/chain-master-key' },
  },
  {
    moduleId: 'tx-access-policy', title: 'Transaction Access Policy', group: 'access-control',
    config: { defaultPolicy: 'allowlist', governanceRequired: false, emergencyOverrideMultisig: FINALITY_THRESHOLD },
  },
  {
    moduleId: 'emergency-brake', title: 'Governance Emergency Brake', group: 'ops-compliance',
    /* constrained schema: signer counts mirror the 4-of-5 validator quorum */
    config: {
      requiredSigners: FINALITY_THRESHOLD,
      totalSigners: VALIDATOR_COUNT,
      autoExpiryHours: 72,
      pauseTargets: ['tx-type', 'actor', 'profile', 'lot'],
    },
  },
  {
    moduleId: 'chain-audit-export', title: 'Chain Audit Export', group: 'ops-compliance',
    config: {
      exportFormats: ['json', 'csv', 'pdf'],
      scheduledExport: true,
      exportIntervalDays: 30,
      completenessProof: true,
    },
  },

  /* ── Observability and ops (6) ── */
  {
    moduleId: 'metrics-dashboards', title: 'Metrics & Dashboards', group: 'observability-ops',
    config: { scrapeIntervalSec: 15 },
  },
  {
    moduleId: 'log-shipping', title: 'Log Shipping', group: 'observability-ops',
    /* retention matches the 7-year audit retention in §9 */
    config: { endpoint: '', retentionDays: 2555 },
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
    /* constrained schema: defaultChannel, quietHours only - the rule set lives on
       cold-chain-monitoring and quality-recall-ledger */
    config: { defaultChannel: 'aquatrace-ops-oncall', quietHours: '' },
  },
  {
    moduleId: 'scheduler', title: 'Scheduler (Cron/Delayed Jobs)', group: 'DevEx',
    /* free-form */
    config: {
      tz: 'Asia/Kolkata',
      jobs: [
        { key: 'job_pending_handoffs', schedule: '0 */4 * * *', description: 'Remind receivers of custody transfers still AWAITING_ACCEPTANCE.' },
        { key: 'job_repeatable_stage_reminder', schedule: '0 7 * * *', description: 'Remind farmers of due grow-out readings and pre-harvest sampling.' },
        { key: 'job_certificate_expiry', schedule: '0 6 * * *', description: 'Flag certificates whose valid_until date is close.' },
        { key: 'job_chain_reverify', schedule: '*/30 * * * *', description: 'Re-verify the chain end to end and publish the result to the explorer.' },
        { key: 'job_audit_export', schedule: '0 2 1 * *', description: 'Produce the monthly signed chain audit export.' },
      ],
    },
  },

  /* ── Identity and access (7) ── */
  {
    moduleId: 'rbac', title: 'Role-Based Access Control', group: 'identity-access',
    /* constrained schema: defaultRoles, adminWallets, policyMode only.
       The per-role {action, entity} grant matrix from §4 / §9.1 is carried by ent-workflow. */
    config: { defaultRoles: ALL_ROLES.slice(), adminWallets: [], policyMode: 'allowlist' },
  },
  {
    moduleId: 'org-accounts', title: 'Organization Accounts', group: 'identity-access',
    config: { maxMembersDefault: 50, inviteOnly: true, billingRequired: false },
  },
  {
    moduleId: 'session-keys', title: 'Session Keys', group: 'identity-access',
    /* constrained schema: defaultTtlMins is capped at 1440, so the 1,209,600 s refresh token
       and the TOTP issuer "AquaTrace" are carried by api-gateway. 900 s access token = 15 min. */
    config: {
      defaultTtlMins: 15,
      scopes: ['read', 'record_event', 'accept_handoff', 'flag_discrepancy', 'issue_certificate', 'verify'],
      maxActivePerUser: 5,
    },
  },
  {
    moduleId: 'rate-limit', title: 'Rate Limit', group: 'compliance-safety',
    /* constrained schema: 120 requests per 60 s window = 2 rps sustained, burst 120.
       The literal window is restated on api-gateway. */
    config: { defaultRps: 2, burst: 120 },
  },
  {
    moduleId: 'wallet-auth', title: 'Wallet Authentication', group: 'identity-access',
    /* constrained schema: mode, sessionTtlMins, allowedWalletsPattern only.
       Per-actor ed25519 key custody under CHAIN_MASTER_KEY is carried by evidence-chain. */
    config: {
      mode: 'wallet+session',
      sessionTtlMins: 15,
      allowedWalletsPattern: '^ed25519:[0-9a-f]{64}$',
    },
  },
  {
    moduleId: 'kyc', title: 'KYC / Identity Verification', group: 'identity-access',
    /* constrained schema: provider, level, recheckIntervalDays only. Verification is against the
       operating licences captured in §6 (establishment number, CAA registration, vessel licence). */
    config: { provider: 'custom', level: 'enhanced', recheckIntervalDays: 365 },
  },
  {
    moduleId: 'privacy-compliance', title: 'Privacy & Compliance Guard', group: 'Security & Compliance',
    /* free-form */
    config: {
      redactFields: [
        'organisation.address',
        'sampling_event.drawn_by',
        'harvest_event.agreed_rate',
        'harvest_event.deductions',
        'auction_event.buyer',
        'ship_receive_event.source_party',
        'ship_receive_event.destination_party',
      ],
      denyPatterns: ['private_key', 'CHAIN_MASTER_KEY', 'totp_secret', 'refresh_token'],
      publicVerifyExposes: [
        'chain of custody timeline',
        'compliance scorecard',
        'certificates',
        'lab results',
      ],
      publicVerifyWithholds: ['commercial rates and deductions', 'party contact details', 'internal notes'],
      readOnlyRole: 'regulator_auditor',
      tenantIsolation: 'records never cross a tenant boundary; a normal user is bound to one profile',
    },
  },

  /* ── Traceability domain (9) ── */
  {
    moduleId: 'traceability-ledger', title: 'Traceability Ledger', group: 'Supply Chain',
    /* free-form */
    config: {
      chainName: CHAIN_NAME,
      chainId: CHAIN_ID,
      profiles: ['farmed_aquaculture', 'wild_capture'],
      originUnitEntities: { farmed_aquaculture: 'broodstock_event', wild_capture: 'fishing_trip' },
      lotIdentifiers: {
        farmed_aquaculture: ['broodstock_lot', 'seed_lot', 'crop_code', 'harvest_lot'],
        wild_capture: ['trip_code', 'catch_lot', 'merchant_lot'],
      },
      transactionTypes: TRANSACTION_TYPES,
      anchoredEntities: ANCHORED_ENTITIES.slice(),
      handoffStates: ['AWAITING_ACCEPTANCE', 'ACCEPTED', 'DISPUTED'],
      handoffRule: 'a stage with a handoff routes the unit to the next role incoming queue; the receiver co-signs the declared fields (ACCEPTED) or flags a discrepancy (DISPUTED)',
      transformOperations: ['split', 'merge'],
      transformUnits: ['kg', 'tonne', 'count', 'carton'],
      signingRule: 'each event is signed with the acting party ed25519 key before it enters the mempool',
    },
  },
  {
    moduleId: 'cold-chain-monitoring', title: 'Cold-Chain Monitoring', group: 'Supply Chain',
    /* free-form. Readings are operator-recorded form values, not device telemetry. */
    config: {
      chilledMaxCelsius: 4,
      breachRule: 'transport_event.temperature_max greater than 4 C raises rule_transport_temperature',
      breachMessage: 'The transport leg exceeded 4 C, outside the chilled range for iced product.',
      monitoredFields: [
        'transport_event.temperature_max',
        'transport_event.logger_fitted',
        'shipping_event.reefer_setpoint',
      ],
      appliesToProfiles: ['farmed_aquaculture', 'wild_capture'],
      appliesToStages: ['stage_farm_gate_receipt', 'stage_preprocessing', 'stage_cleaning', 'stage_freezing_cold_storage', 'stage_shipping'],
      loggerRequired: true,
      readingSource: 'recorded by the acting party on the transport leg and ocean freight forms',
      onBreach: ['raise alert', 'notify the controlling party and the plant quality manager', 'annotate the lot timeline'],
    },
  },
  {
    moduleId: 'port-customs-events', title: 'Port & Customs Events', group: 'Supply Chain',
    /* free-form */
    config: {
      stages: ['stage_customs', 'stage_shipping', 'stage_import'],
      entities: ['customs_event', 'shipping_event', 'import_event'],
      transactionTypes: ['tx_customs', 'tx_shipping', 'tx_import'],
      exportDocuments: ['shipping_bill_number', 'bill_of_lading', 'container_number', 'seal_number', 'import_entry_number'],
      loadingPorts: ['visakhapatnam', 'jnpt', 'kochi', 'chennai', 'kolkata', 'tuticorin', 'krishnapatnam', 'pipavav', 'mangalore'],
      arrivalPorts: ['rotterdam', 'ny_nj', 'shanghai', 'singapore', 'tokyo', 'jebel_ali', 'hamburg', 'busan', 'felixstowe'],
      borderControlPosts: ['fda_newark', 'bcp_rotterdam', 'gacc_shanghai', 'sfa_singapore', 'mhlw_tokyo', 'dm_dubai'],
      destinationMarkets: ['united_states', 'european_union', 'china', 'south_east_asia', 'japan', 'middle_east'],
      customsBrokers: ['harbourgate', 'trident', 'anchorline', 'sagarclear', 'portway'],
      carriers: ['bluewave', 'meridian', 'seabridge', 'coralstar', 'transindus'],
      carrierFlags: ['india', 'sri_lanka', 'oman', 'iran', 'thailand', 'myanmar', 'singapore', 'panama'],
      certificateChecksAtBorder: ['cert_health', 'cert_origin', 'cert_catch'],
    },
  },
  {
    moduleId: 'quality-recall-ledger', title: 'Quality & Recall Ledger', group: 'Supply Chain',
    /* free-form */
    config: {
      monitoringRules: MONITORING_RULES,
      labPassRule: 'lab_report.result_pass is derived from residue_value less than or equal to residue_limit',
      residueUnit: 'ug/kg',
      residueSubstances: [
        'chloramphenicol', 'nitrofuran_aoz', 'nitrofuran_amoz', 'nitrofuran_ahd', 'nitrofuran_sem',
        'malachite_green', 'oxytetracycline', 'tetracycline', 'enrofloxacin', 'metronidazole', 'sulphonamides',
      ],
      testingLaboratories: ['eia_kochi', 'eia_visakhapatnam', 'mpeda_nellore', 'coastal_analytics', 'blueleaf_labs', 'meridian_labs'],
      onResidueBreach: 'hold the affected lot and every downstream lot derived from it',
      onUncertifiedInput: 'flag the crop cycle where input_application_event.caa_certified is false',
      qualityParameters: [
        { key: 'qp_salinity', scope: 'farmed', entity: 'growout_reading', field: 'salinity', unit: 'ppt' },
        { key: 'qp_dissolved_oxygen', scope: 'farmed', entity: 'growout_reading', field: 'dissolved_oxygen', unit: 'mg/L' },
        { key: 'qp_ph', scope: 'farmed', entity: 'growout_reading', field: 'ph', unit: '' },
        { key: 'qp_ammonia', scope: 'farmed', entity: 'growout_reading', field: 'ammonia', unit: 'mg/L' },
        { key: 'qp_count_grade', scope: 'farmed', entity: 'harvest_event', field: 'count_grade', unit: '' },
        { key: 'qp_residue', scope: 'farmed', entity: 'lab_report', field: 'residue_value', unit: 'ug/kg' },
        { key: 'qp_landed_weight', scope: 'wild', entity: 'landing_event', field: 'landed_weight', unit: 'kg' },
        { key: 'qp_residue_wild', scope: 'wild', entity: 'lab_report', field: 'residue_value', unit: 'ug/kg' },
      ],
      recallTraversal: 'walk parent_lot_ref and child_lot_ref across split and merge transformations in both directions',
    },
  },
  {
    moduleId: 'evidence-chain', title: 'Evidence Chain', group: 'Identity & Registry',
    /* free-form. Also carries the §3.1 / §9.3 key custody detail that wallet-auth and
       kms-signing cannot express under their constrained schemas. */
    config: {
      hashAlgorithm: 'SHA-256',
      hashInput: 'canonical event payload',
      signatureAlgorithm: 'ed25519',
      signedBy: 'the acting party for the stage',
      keyCustody: 'each actor holds an ed25519 keypair; the private key is encrypted at rest with CHAIN_MASTER_KEY',
      masterKeyFormat: '32-byte / 64-hex',
      masterKeyEnv: 'CHAIN_MASTER_KEY',
      blockLinkage: 'Merkle root over the block transactions, plus previousHash -> blockHash',
      validatorCount: VALIDATOR_COUNT,
      finalityThreshold: FINALITY_THRESHOLD,
      verification: 'the explorer re-verifies the chain end to end, recomputing every hash and Merkle root',
      evidenceKinds: ['certificate', 'document_anchor', 'lab_report', 'handoff co-signature', 'dispute'],
      digestFields: ['certificate.document_digest', 'document_anchor.document_digest'],
    },
  },
  {
    moduleId: 'compliance-attestations', title: 'Compliance Attestations', group: 'Compliance',
    /* free-form */
    config: {
      certificateTypes: CERTIFICATE_TYPES,
      issuers: ['eia', 'eic', 'caa', 'mpeda', 'fssai', 'realcraft', 'state_fisheries', 'dof', 'msc'],
      mandatoryShared: ['cert_establishment', 'cert_health', 'cert_origin'],
      mandatoryFarmed: ['cert_caa_unit', 'cert_coc_inputs', 'cert_fssai'],
      mandatoryWild: ['cert_vessel_registration', 'cert_fishing_licence', 'cert_catch', 'cert_fssai_wild'],
      destinationConditional: [
        { certificate: 'cert_mpeda_enrolment', destination: 'european_union' },
        { certificate: 'cert_catch', destination: 'european_union' },
      ],
      mandateRule: 'mandatory certificate types must be anchored for a shipment to score fully compliant on the public verify scorecard',
      welfareStandards: ['sa8000', 'bap', 'brcgs', 'sedex_smeta', 'bsci', 'msc_coc', 'iso22000', 'none'],
      plantApprovalScopes: ['eu_listed', 'us_fda', 'china_gacc', 'multi_market', 'domestic_only'],
    },
  },
  {
    moduleId: 'provenance-notary', title: 'Provenance Notary', group: 'Identity & Registry',
    /* free-form */
    config: {
      digestAlgorithm: 'SHA-256 over the canonical payload',
      anchorOnChain: true,
      anchorTransactionTypes: ['tx_document_anchor', 'tx_certificate'],
      publicVerifyUrl: 'aquatrace.cerulea.io/verify/<shipment-code>',
      verifyRouteAuthenticated: false,
      qrCodeOnEveryRecord: true,
      qrTarget: 'aquatrace.cerulea.io/verify/<shipment-code>',
      scorecardInputs: ['mandatory certificates anchored', 'lab results within limit', 'unbroken custody chain', 'chain re-verification result'],
      reverification: 'the public verify page re-runs the end to end chain check before rendering',
    },
  },
  {
    moduleId: 'produce-grades', title: 'Produce Grades & Certificates', group: 'Agriculture',
    /* free-form */
    config: {
      countGrades: ['u15', '16_20', '21_25', '26_30', '31_40', '41_50', '51_60'],
      countGradeField: 'harvest_event.count_grade',
      productFormsFarmed: ['hoso', 'hlso', 'pd', 'pud', 'cooked', 'value_added'],
      productFormsWild: ['whole', 'headed', 'gutted', 'cleaned', 'fillet'],
      speciesFarmed: ['vannamei', 'monodon', 'scampi', 'seabass', 'tilapia'],
      speciesWild: ['squid', 'cuttlefish', 'octopus', 'indian_mackerel', 'oil_sardine', 'anchovy', 'threadfin_bream', 'ribbonfish', 'croaker', 'wild_shrimp'],
      farmingMethods: ['brackishwater_pond', 'freshwater_pond', 'cage'],
      gearTypes: ['trawl_net', 'bag_net', 'seine', 'gill_net', 'ring_seine', 'hand_line'],
      vesselClasses: ['mechanised', 'motorised', 'artisanal'],
      handlingOperations: ['deheading', 'grading', 'peeling', 'washing', 'cleaning'],
      yieldFactorRange: { min: 0, max: 1 },
    },
  },
  {
    moduleId: 'trade-finance-docs', title: 'Trade Finance Documents', group: 'Trade & Commerce',
    /* free-form */
    config: {
      documents: [
        'health_certificate',
        'certificate_of_origin',
        'catch_certificate',
        'shipping_bill',
        'bill_of_lading',
        'commercial_invoice',
        'packing_list',
        'import_entry',
        'establishment_approval',
        'fssai_licence',
      ],
      anchoredAs: 'document_anchor',
      requiredFields: ['document_number', 'document_digest', 'issuer', 'valid_until'],
      raisedAtStages: ['stage_export_documentation', 'stage_customs', 'stage_shipping', 'stage_import'],
      raisedByRole: 'exporter_administrator',
      noPaymentRails: true,
    },
  },

  /* ── Workflow and registry (2) ── */
  {
    moduleId: 'ent-workflow', title: 'Workflow Engine', group: 'workflow',
    /* free-form. Carries the §5 stage pipelines and the §4 / §9.1 permission grants. */
    config: {
      profiles: [
        { key: 'farmed_aquaculture', label: 'Farmed Aquaculture', category: 'farmed', version: 1, originUnitEntity: 'broodstock_event', stageCount: FARMED_STAGES.length, stages: FARMED_STAGES },
        { key: 'wild_capture', label: 'Wild Capture', category: 'wild', version: 1, originUnitEntity: 'fishing_trip', stageCount: WILD_STAGES.length, stages: WILD_STAGES },
      ],
      permissionActions: ['create', 'read', 'update', 'accept_handoff', 'flag_discrepancy', 'issue_certificate', 'record_event', 'verify'],
      readOnlyRoles: ['regulator_auditor'],
      platformRoles: PLATFORM_ROLES.slice(),
      workflowRoleCount: WORKFLOW_ROLES.length,
      prerequisiteRule: 'a stage with a requires value becomes actionable only once that transaction exists on the unit',
      repeatableRule: 'a repeatable stage can be recorded many times and never advances the pipeline pointer',
      repeatableStages: ['stage_input_application', 'stage_growout', 'stage_sampling', 'stage_onvessel_processing', 'stage_transhipment'],
      handoffStates: ['AWAITING_ACCEPTANCE', 'ACCEPTED', 'DISPUTED'],
      workQueue: 'the dashboard shows incoming custody handoffs to accept or dispute plus the next step to record',
    },
  },
  {
    moduleId: 'ent-document-registry', title: 'Document & Asset Registry', group: 'registry',
    /* free-form */
    config: {
      registries: ['certificate', 'document_anchor', 'lab_report'],
      certificateFields: ['certificate_number', 'anchored_lot_ref', 'issuer', 'issued_on', 'valid_until', 'document_digest'],
      documentFields: ['document_number', 'document_digest', 'issuer', 'valid_until'],
      digestAlgorithm: 'SHA-256',
      issueAction: 'issue_certificate',
      issueRole: 'exporter_administrator',
      expiryWarningDays: 30,
      certificateTypeCount: CERTIFICATE_TYPES.length,
      immutable: true,
    },
  },

  /* ── Data and indexing (5) ── */
  {
    moduleId: 'oracles', title: 'Oracle Feeds', group: 'Oracles',
    /* free-form. Feeds are party-recorded readings and regulator lookups, not devices. */
    config: {
      feeds: [
        { key: 'feed_growout_reading', source: 'farmer recorded grow-out reading', entity: 'growout_reading', fields: ['salinity', 'dissolved_oxygen', 'ph', 'ammonia', 'estimated_body_weight', 'mortality_observed'], cadence: 'per reading, repeatable stage' },
        { key: 'feed_transport_temperature', source: 'transport leg record', entity: 'transport_event', fields: ['temperature_max', 'logger_fitted'], cadence: 'per leg' },
        { key: 'feed_reefer_setpoint', source: 'ocean freight record', entity: 'shipping_event', fields: ['reefer_setpoint'], cadence: 'per voyage' },
        { key: 'feed_lab_result', source: 'accredited testing laboratory', entity: 'lab_report', fields: ['residue_value', 'residue_limit', 'result_pass'], cadence: 'per sealed sample' },
        { key: 'feed_certificate_status', source: 'issuing regulator', entity: 'certificate', fields: ['certificate_number', 'valid_until'], cadence: 'on issue and on renewal' },
      ],
      thresholds: {
        dissolvedOxygenMinMgL: 4,
        ammoniaMaxMgL: 0.1,
        phRange: { min: 0, max: 14 },
        transportTemperatureMaxCelsius: 4,
      },
      onThresholdBreach: 'raise the matching monitoring rule and page the operations channel',
      noDeviceTelemetry: true,
    },
  },
  {
    moduleId: 'onchain-data', title: 'On-chain Data Models', group: 'data-logic',
    /* constrained schema: structures only - the anchored entity list from §3.1 */
    config: { structures: ANCHORED_ENTITIES.slice() },
  },
  {
    moduleId: 'subgraph-indexer', title: 'Subgraph Indexer', group: 'data-logic',
    /* constrained schema: endpoint, entities only */
    config: { endpoint: '', entities: ANCHORED_ENTITIES.slice() },
  },
  {
    moduleId: 'search-fulltext', title: 'Full-text Search', group: 'data-logic',
    /* constrained schema: engine only */
    config: { engine: 'meilisearch' },
  },
  {
    moduleId: 'realtime-pubsub', title: 'Realtime Pub/Sub', group: 'Messaging & Realtime',
    /* free-form */
    config: {
      transport: 'ws',
      channels: [
        'chain.head_block',
        'chain.pending_transactions',
        'chain.finalized_blocks',
        'workflow.incoming_handoffs',
        'workflow.stage_advanced',
        'alerts.monitoring_rule',
        'records.status_changed',
      ],
      scopeByTenant: true,
      scopeByRole: true,
    },
  },

  /* ── Integrations and comms (8) ── */
  {
    moduleId: 'webhooks-outbound', title: 'Outbound Webhooks', group: 'Integrations',
    /* free-form */
    config: {
      maxRetries: 10,
      retryPolicy: 'exponential backoff',
      signPayloads: true,
      signatureAlgorithm: 'ed25519',
      events: [
        'origin_unit.created',
        'stage.recorded',
        'handoff.awaiting_acceptance',
        'handoff.accepted',
        'handoff.disputed',
        'lab_report.failed',
        'monitoring_rule.raised',
        'certificate.issued',
        'consignment.assembled',
        'customs.cleared',
        'import.cleared',
        'block.finalized',
      ],
    },
  },
  {
    moduleId: 'audit-logs', title: 'Audit Logs', group: 'compliance-safety',
    /* constrained schema: retentionDays only - 2555 days is 7 years */
    config: { retentionDays: 2555 },
  },
  {
    moduleId: 'notifications', title: 'Notifications', group: 'comms-engagement',
    /* constrained schema: inApp, push only */
    config: { inApp: true, push: true },
  },
  {
    moduleId: 'emails', title: 'Transactional Emails', group: 'comms-engagement',
    /* constrained schema: fromAddress, templateEngine only */
    config: { fromAddress: 'no-reply@aquatrace.cerulea.io', templateEngine: 'mjml' },
  },
  {
    moduleId: 'twilio-adapter', title: 'Twilio Adapter', group: 'integrations',
    /* constrained schema: secret names and fromNumber only */
    config: {
      accountSidSecret: 'AQUATRACE_TWILIO_ACCOUNT_SID',
      authTokenSecret: 'AQUATRACE_TWILIO_AUTH_TOKEN',
      fromNumber: '',
    },
  },
  {
    moduleId: 'push-adapters', title: 'Push Notifications (FCM/APNs)', group: 'Messaging & Realtime',
    /* free-form */
    config: {
      provider: 'fcm',
      topicsByRole: true,
      topics: [
        'handoff_awaiting_acceptance',
        'handoff_disputed',
        'monitoring_alert',
        'lab_result_ready',
        'certificate_expiring',
        'stage_due',
      ],
      locales: ['en', 'te', 'ta', 'ml', 'or', 'bn', 'gu', 'mr', 'kn'],
    },
  },
  {
    moduleId: 'document-signing', title: 'Document Signing', group: 'Integrations',
    /* free-form */
    config: {
      provider: 'docusign',
      hashBeforeSign: true,
      hashAlgorithm: 'SHA-256',
      anchorDigestOnChain: true,
      signedDocuments: ['health_certificate', 'certificate_of_origin', 'catch_certificate', 'establishment_approval', 'chain_audit_export'],
      counterSignature: 'the acting party ed25519 signature is recorded alongside the provider envelope',
    },
  },
  {
    moduleId: 'asset-storage', title: 'Asset Storage (S3/Local)', group: 'Storage',
    /* free-form */
    config: {
      provider: 's3',
      bucket: 'aquatrace-assets',
      prefixes: {
        certificates: 'certificates/',
        labReports: 'lab-reports/',
        tradeDocuments: 'trade-documents/',
        qrCodes: 'qr/',
        brand: 'brand/',
        auditExports: 'audit-exports/',
      },
      brandAssets: { farmed_aquaculture: 'brand/farmed-logo.svg', wild_capture: 'brand/wild-logo.svg' },
      storeDigestWithObject: true,
      digestAlgorithm: 'SHA-256',
      immutableObjects: true,
    },
  },

  /* ── Localisation and brand (2) ── */
  {
    moduleId: 'i18n', title: 'Internationalization (i18n)', group: 'DevEx',
    /* free-form. Also carries the §10.2 per-profile terminology and the §10.3 palettes,
       because theme-branding is constrained to brandName alone. */
    config: {
      defaultLocale: 'en',
      supportedLocales: ['en', 'te', 'ta', 'ml', 'or', 'bn', 'gu', 'mr', 'kn'],
      fallbackLocale: 'en',
      localeLabels: {
        en: 'English', te: 'Telugu', ta: 'Tamil', ml: 'Malayalam', or: 'Odia',
        bn: 'Bengali', gu: 'Gujarati', mr: 'Marathi', kn: 'Kannada',
      },
      baseLocaleComplete: 'en',
      fallbackRule: 'any missing key falls back to English',
      profileNameLocales: {
        farmed_aquaculture: { en: 'Farmed Aquaculture', te: 'saagaru saagu' },
        wild_capture: { en: 'Wild Capture', ta: 'kaadu meen pidippu' },
      },
      terminology: {
        farmed_aquaculture: {
          origin_unit: 'Broodstock lot',
          lot: 'Harvest lot',
          producer: 'Farmer',
          facility: 'Pond',
          harvest: 'Harvest',
          handoff: 'Custody handover',
        },
        wild_capture: {
          origin_unit: 'Fishing trip',
          lot: 'Catch lot',
          producer: 'Skipper',
          facility: 'Vessel',
          harvest: 'Capture',
          handoff: 'Auction handover',
        },
      },
      palettes: {
        farmed_aquaculture: { primary: '#0f766e', secondary: '#065f46', accent: '#10b981', surface: '#f0fdfa', onSurface: '#0f172a', logo: 'brand/farmed-logo.svg' },
        wild_capture: { primary: '#0369a1', secondary: '#075985', accent: '#0ea5e9', surface: '#f0f9ff', onSurface: '#0f172a', logo: 'brand/wild-logo.svg' },
      },
      links: {
        product: 'aquatrace.cerulea.io',
        publicVerify: 'aquatrace.cerulea.io/verify/<shipment-code>',
        company: 'cerulea.io',
      },
    },
  },
  {
    moduleId: 'theme-branding', title: 'Theme and Branding', group: 'content-ui',
    /* constrained schema: brandName only - per-profile palettes, logos and terminology are
       carried by i18n */
    config: { brandName: 'AquaTrace' },
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
  /* Identity -> access (15) */
  ['wallet-auth', 'rbac', 'triggers'],
  ['wallet-auth', 'session-keys', 'feeds'],
  ['wallet-auth', 'kms-signing', 'calls'],
  ['session-keys', 'rbac', 'reads'],
  ['session-keys', 'api-gateway', 'feeds'],
  ['rbac', 'org-accounts', 'reads'],
  ['rbac', 'tx-access-policy', 'feeds'],
  ['rbac', 'audit-logs', 'feeds'],
  ['rbac', 'ent-workflow', 'feeds'],
  ['org-accounts', 'kyc', 'reads'],
  ['kyc', 'rbac', 'feeds'],
  ['kyc', 'compliance-attestations', 'feeds'],
  ['privacy-compliance', 'audit-logs', 'reads'],
  ['privacy-compliance', 'api-gateway', 'calls'],
  ['rate-limit', 'api-gateway', 'calls'],

  /* Origin and lot ledgers -> chain data, audit, evidence, comms (31) */
  ['traceability-ledger', 'onchain-data', 'writes'],
  ['traceability-ledger', 'audit-logs', 'feeds'],
  ['traceability-ledger', 'evidence-chain', 'feeds'],
  ['traceability-ledger', 'notifications', 'triggers'],
  ['traceability-ledger', 'webhooks-outbound', 'triggers'],
  ['traceability-ledger', 'subgraph-indexer', 'feeds'],
  ['traceability-ledger', 'compliance-attestations', 'reads'],
  ['traceability-ledger', 'produce-grades', 'reads'],
  ['traceability-ledger', 'ent-workflow', 'feeds'],
  ['ent-workflow', 'traceability-ledger', 'writes'],
  ['ent-workflow', 'notifications', 'triggers'],
  ['ent-workflow', 'realtime-pubsub', 'feeds'],
  ['ent-workflow', 'scheduler', 'calls'],
  ['quality-recall-ledger', 'traceability-ledger', 'feeds'],
  ['quality-recall-ledger', 'evidence-chain', 'feeds'],
  ['quality-recall-ledger', 'notifications', 'triggers'],
  ['quality-recall-ledger', 'webhooks-outbound', 'triggers'],
  ['evidence-chain', 'onchain-data', 'writes'],
  ['evidence-chain', 'audit-logs', 'feeds'],
  ['evidence-chain', 'chain-audit-export', 'feeds'],
  ['provenance-notary', 'onchain-data', 'writes'],
  ['provenance-notary', 'evidence-chain', 'feeds'],
  ['provenance-notary', 'document-signing', 'calls'],
  ['provenance-notary', 'asset-storage', 'writes'],
  ['ent-document-registry', 'provenance-notary', 'calls'],
  ['ent-document-registry', 'asset-storage', 'writes'],
  ['document-signing', 'onchain-data', 'writes'],
  ['compliance-attestations', 'ent-document-registry', 'feeds'],
  ['compliance-attestations', 'quality-recall-ledger', 'reads'],
  ['produce-grades', 'quality-recall-ledger', 'feeds'],
  ['trade-finance-docs', 'provenance-notary', 'calls'],

  /* Oracles (grow-out readings, transport temperature) -> alerts and cold chain (7) */
  ['oracles', 'cold-chain-monitoring', 'feeds'],
  ['oracles', 'onchain-data', 'writes'],
  ['oracles', 'alerts-paging', 'triggers'],
  ['cold-chain-monitoring', 'alerts-paging', 'triggers'],
  ['cold-chain-monitoring', 'notifications', 'triggers'],
  ['cold-chain-monitoring', 'traceability-ledger', 'writes'],
  ['quality-recall-ledger', 'alerts-paging', 'triggers'],

  /* Customs, shipping and import -> compliance and evidence (3) */
  ['port-customs-events', 'compliance-attestations', 'reads'],
  ['port-customs-events', 'evidence-chain', 'feeds'],
  ['port-customs-events', 'traceability-ledger', 'feeds'],

  /* Chain core (21) */
  ['p2p-tls', 'p2p', 'calls'],
  ['p2p', 'consensus', 'feeds'],
  ['node-permissioning', 'p2p', 'calls'],
  ['consensus', 'validators', 'reads'],
  ['consensus', 'genesis', 'reads'],
  ['mempool-policy', 'consensus', 'feeds'],
  ['tx-access-policy', 'mempool-policy', 'calls'],
  ['emergency-brake', 'tx-access-policy', 'triggers'],
  ['emergency-brake', 'alerts-paging', 'triggers'],
  ['kms-signing', 'consensus', 'calls'],
  ['rpc', 'explorer', 'feeds'],
  ['graphql-gateway', 'explorer', 'feeds'],
  ['ws-subscriptions', 'explorer', 'feeds'],
  ['api-gateway', 'explorer', 'feeds'],
  ['api-gateway', 'rpc', 'calls'],
  ['graphql-gateway', 'api-gateway', 'feeds'],
  ['subgraph-indexer', 'graphql-gateway', 'feeds'],
  ['onchain-data', 'subgraph-indexer', 'feeds'],
  ['subgraph-indexer', 'search-fulltext', 'feeds'],
  ['ws-subscriptions', 'realtime-pubsub', 'feeds'],
  ['realtime-pubsub', 'notifications', 'feeds'],

  /* Operations (10) */
  ['metrics-dashboards', 'alerts-paging', 'triggers'],
  ['health-probes', 'metrics-dashboards', 'feeds'],
  ['log-shipping', 'metrics-dashboards', 'feeds'],
  ['backups-restore', 'log-shipping', 'feeds'],
  ['alerts-paging', 'notifications', 'calls'],
  ['audit-logs', 'chain-audit-export', 'feeds'],
  ['chain-audit-export', 'asset-storage', 'writes'],
  ['notifications', 'emails', 'calls'],
  ['notifications', 'push-adapters', 'calls'],
  ['notifications', 'twilio-adapter', 'calls'],
  ['webhooks-outbound', 'notifications', 'calls'],

  /* Localisation and brand (2) */
  ['i18n', 'api-gateway', 'feeds'],
  ['theme-branding', 'api-gateway', 'feeds'],
];

const EDGES = EDGE_DEFS.map(([s, t, rel], i) => ({
  id: `e${i}_${s.replace(/-/g, '_')}_${t.replace(/-/g, '_')}`,
  source: `n_${s}`,
  target: `n_${t}`,
  type: 'relation',
  markerEnd: { type: 'arrowclosed' },
  data: { rel },
}));

const BLUEPRINT = {
  modules: MODULES.map((m) => ({ moduleId: m.moduleId, label: m.title, group: m.group, config: m.config })),
  graph: { nodes: NODES, edges: EDGES },
};

module.exports = { MODULES, EDGES, BLUEPRINT };
