/**
 * AgroTrace seed — shared contract used by every part file.
 * Field types allowed by Studio (step2-types.ts):
 *   uuid string text boolean int float datetime date json enum file address uint256 bytes32 ipfs-hash
 * Storage: database | on-chain | ipfs
 */
let _c = 0;
const sid = () => `a${String(++_c).padStart(5, '0')}`;

const E = {
  UserRole: ['PLATFORM_ADMIN','EXPORTER','FARMER','LABORATORY','PACKHOUSE','TREATMENT_FACILITY','NPPO_INSPECTOR','APEDA_OFFICER','CUSTOMS_BROKER','COLD_STORAGE','FREIGHT_FORWARDER','SHIPPING_LINE','PORT_ARRIVAL','IMPORT_CUSTOMS','BUYER','BOILING_UNIT','DRYING_YARD','POLISHING_MILL','COMMISSION_AGENT','PROCESSING_UNIT','SPICES_BOARD_OFFICER'],
  UserStatus: ['INVITED','ACTIVE','SUSPENDED','DEACTIVATED'],
  TenantStatus: ['PENDING_APPROVAL','ACTIVE','SUSPENDED','DEACTIVATED'],
  SubscriptionTier: ['STARTER','GROWTH','ENTERPRISE'],
  UnitType: ['CARTONS','CRATES','BAGS'],
  LotStatus: ['REGISTERED','RESIDUE_TEST_PASSED','RESIDUE_TEST_FAILED','RESIDUE_TEST_CONDITIONAL','IN_SHIPMENT'],
  ShipmentStatus: ['REGISTERED','RESIDUE_TESTED','PACKHOUSE_PROCESSED','TREATED','PHYTO_CLEARED','APEDA_CERTIFIED','CUSTOMS_CLEARED','IN_COLD_STORAGE','WITH_FORWARDER','VESSEL_LOADED','IN_TRANSIT','ARRIVED','DELIVERED','DISPUTED','DISPUTE_RESOLVED'],
  ChainStatus: ['PENDING','CONFIRMED','FAILED'],
  BlockStatus: ['PENDING_CONSENSUS','FINALISED'],
  NodeStatus: ['ONLINE','OFFLINE'],
  MrlStandard: ['FSSAI','EU','JAPAN','CODEX','CUSTOM'],
  ResidueTestResult: ['PASS','FAIL','CONDITIONAL_PASS','PENDING'],
  Incoterm: ['FOB','CIF','CFR','EXW'],
  CertificateType: ['PHYTOSANITARY','CERTIFICATE_OF_ORIGIN','EXPORT_INSPECTION','FUMIGATION','TREATMENT','BILL_OF_LADING','OTHER'],
  DisputeStatus: ['OPEN','EXPORTER_RESPONDED','CLOSED'],
  DisputeResolutionOutcome: ['EXPORTER_ACCEPTED','BUYER_ACCEPTED','PARTIAL_SETTLEMENT','REFERRED_TO_ARBITRATION'],
  ExportJobStatus: ['PENDING','PROCESSING','COMPLETE','FAILED'],
  MangoVariety: ['ALPHONSO','KESAR','BANGANAPALLI','DASHERI'],
  TurmericVariety: ['ARMOOR_NIZAMABAD','LAKADONG'],
  ChainTxType: ['LOT_REGISTERED','RESIDUE_TEST_RECORDED','SHIPMENT_CREATED','EVENT_RECORDED','CERTIFICATE_ANCHORED','CUSTODY_TRANSFERRED','BREACH_RECORDED','DISPUTE_INITIATED','DISPUTE_RESOLVED','COMPLIANCE_OVERRIDE'],
  Commodity: ['TURMERIC','MANGO'],
  LotCode: ['TURM','MANGO'],
  EventType: ['LOT_REGISTERED','RESIDUE_TEST_RECORDED','CURING_COMPLETED','DRYING_COMPLETED','POLISHING_COMPLETED','MANDI_FIRST_SALE','STERILISATION_GRINDING_COMPLETED','LAB_ASSAY_COMPLETED','SPICES_BOARD_REGISTRATION_ISSUED','EXPORT_BOOKED','FREIGHT_HANDOFF','CUSTOMS_CLEARED','VESSEL_LOADED','VESSEL_ARRIVED','IMPORT_CLEARED','BUYER_ACCEPTANCE','PACKHOUSE_PROCESSED','TREATMENT_COMPLETED','PHYTO_CERTIFICATE_ISSUED','COO_ISSUED','EXPORT_INSPECTION_ISSUED','COLD_STORAGE_ENTRY','CUSTODY_TRANSFER','BUYER_ARRIVAL','HANDOFF_ACCEPTED','HANDOFF_DISPUTED'],
  HandoffDecision: ['HANDOFF_ACCEPTED','HANDOFF_DISPUTED'],
  HandoffParty: ['FROM_PARTY','TO_PARTY'],
  NotificationChannel: ['IN_APP','PUSH','SMS','WHATSAPP','EMAIL'],
  DeviceType: ['TEMPERATURE','HUMIDITY','TEMPERATURE_HUMIDITY','GPS'],
  DeviceStatus: ['ACTIVE','INACTIVE','FAULT'],
  BreachType: ['TEMPERATURE_EXCURSION','HUMIDITY_EXCURSION','MOISTURE_EXCURSION'],
  Locale: ['en','hi','bn','gu','kn','mr','pa','ta','te'],
  ScreenArea: ['AUTH','FARMER_PORTAL','EXPORTER_DASHBOARD','ROLE_DASHBOARD','LOTS','SHIPMENTS','COMPLIANCE','DISPUTES','CHAIN_EXPLORER','IOT','TEAM','REPORTS','PUBLIC_VERIFY','ADMIN'],
  IndianState: ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'],
};

const ACCESS = {
  AUTH: { create: 'auth',  read: 'auth',   update: 'owner', delete: 'admin' },
  PUB:  { create: 'auth',  read: 'public', update: 'owner', delete: 'admin' },
  ADM:  { create: 'admin', read: 'admin',  update: 'admin', delete: 'admin' },
  SYS:  { create: 'admin', read: 'auth',   update: 'admin', delete: 'admin' },
};

const TYPES = new Set(['uuid','string','text','boolean','int','float','datetime','date','json','enum','file','address','uint256','bytes32','ipfs-hash']);
const STORAGES = new Set(['database','on-chain','ipfs']);

/** Field builder. o: {storage, req, uniq, idx, enc, label, unit, options, desc, def} */
function F(name, type, o = {}) {
  if (!TYPES.has(type)) throw new Error(`Field ${name}: bad type ${type}`);
  const storage = o.storage || 'database';
  if (!STORAGES.has(storage)) throw new Error(`Field ${name}: bad storage ${storage}`);
  if (type === 'enum' && !(Array.isArray(o.options) && o.options.length)) throw new Error(`Field ${name}: enum needs options`);
  const f = { id: sid(), name, type, storage, required: !!o.req, unique: !!o.uniq, indexed: !!o.idx, encrypted: !!o.enc };
  if (o.label) f.label = o.label;
  if (o.unit) f.unit = o.unit;
  if (o.options) f.options = o.options;
  if (o.desc) f.description = o.desc;
  if (o.def !== undefined && o.def !== null) f.defaultValue = String(o.def);
  return f;
}
const ID  = () => F('id', 'uuid', { req: 1, uniq: 1, idx: 1, label: 'ID' });
const REF = (name, label, desc) => F(name, 'uuid', { req: 1, idx: 1, label, desc });
/** On-chain proof fields present on every anchored record. */
const CHAIN = () => [
  F('chainTxHash',      'bytes32', { storage: 'on-chain', idx: 1, label: 'Chain tx hash',      desc: 'On-chain proof: sha256(txData)' }),
  F('chainBlockNumber', 'int',     { storage: 'on-chain',         label: 'Chain block number' }),
  F('chainStatus',      'enum',    { storage: 'on-chain', req: 1, label: 'Chain status', options: E.ChainStatus, def: 'PENDING', desc: 'ChainBadge: amber while PENDING, green on CONFIRMED' }),
];

/** Entity builder. o: {core, access, onChain, apiPublic} */
function ENT(moduleId, name, description, fields, o = {}) {
  return {
    id: sid(), moduleId, name, description,
    isCore: !!o.core, fields,
    access: o.access || ACCESS.AUTH,
    onChain: !!o.onChain,
    apiPublic: o.apiPublic !== false,
  };
}

/** Every moduleId that will be on the blueprint. Entities MUST be homed on one of these. */
const MODULE_HOMES = [
  // AgroChain core
  'consensus','validators','genesis','node-permissioning','mempool-policy','p2p','p2p-tls',
  'rpc','ws-subscriptions','graphql-gateway','api-gateway','explorer',
  'kms-signing','tx-access-policy','emergency-brake','chain-audit-export',
  'metrics-dashboards','log-shipping','backups-restore','health-probes','alerts-paging',
  // Identity & access
  'rbac','org-accounts','session-keys','rate-limit','wallet-auth','kyc','privacy-compliance',
  // Supply-chain domain
  'traceability-ledger','cold-chain-monitoring','port-customs-events','quality-recall-ledger',
  'evidence-chain','compliance-attestations','provenance-notary','produce-grades','trade-finance-docs',
  'ent-workflow','ent-document-registry','iot-device-registry','oracles',
  // Data & ops
  'onchain-data','subgraph-indexer','search-fulltext','scheduler','realtime-pubsub',
  'webhooks-outbound','webhooks-inbound','audit-logs','notifications','emails','twilio-adapter',
  'push-adapters','chat','document-signing','asset-storage','i18n','theme-branding',
];

module.exports = { sid, E, ACCESS, TYPES, STORAGES, F, ID, REF, CHAIN, ENT, MODULE_HOMES };
