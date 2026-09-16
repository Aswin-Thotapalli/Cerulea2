/**
 * CBC-PRAMAAN seed - shared contract used by every part file.
 * Cerulea Bytechains Compliance, Procurement Record And Make-in-India Assurance Network.
 * A PPP-MII compliance trust layer behind GeM: non-crypto, permissioned, no tokens / wallets / mining.
 *
 * Field types allowed by Studio (step2-types.ts):
 *   uuid string text boolean int float datetime date json enum file address uint256 bytes32 ipfs-hash
 * Storage: database | on-chain | ipfs
 */
let _c = 0;
const sid = () => `p${String(++_c).padStart(5, '0')}`;

const DECISION_PATH_MII = ['DIVISIBLE_L1_CLASS_I','NON_DIVISIBLE_L1_CLASS_I','DIVISIBLE_NO_CLASS_I_CANDIDATE','NON_DIVISIBLE_NO_CLASS_I_CANDIDATE','DIVISIBLE_L1_NOT_CLASS_I_SPLIT_50_50','DIVISIBLE_L1_NOT_CLASS_I_NO_MATCH_FULL_TO_L1','NON_DIVISIBLE_L1_NOT_CLASS_I_MATCHED','NON_DIVISIBLE_L1_NOT_CLASS_I_NO_MATCH_FULL_TO_L1','NO_ELIGIBLE_BIDDERS'];
const DECISION_PATH_MSE = ['MSE_CLASS_I_L1_FULL_AWARD','NON_MSE_CLASS_I_L1_75_25_MSE','NON_MSE_CLASS_I_L1_75_25_NO_MSE_MATCH_FULL_TO_L1','MSE_NON_CLASS_I_L1_DIVISIBLE_50_50_CASCADE','MSE_NON_CLASS_I_L1_DIVISIBLE_NO_MATCH_FULL_TO_L1','MSE_NON_CLASS_I_L1_NON_DIVISIBLE_MATCHED','MSE_NON_CLASS_I_L1_NON_DIVISIBLE_NO_MATCH_FULL_TO_L1','NON_MSE_NON_CLASS_I_L1_DIVISIBLE_50_50_CASCADE','NON_MSE_NON_CLASS_I_L1_DIVISIBLE_NO_MATCH_FULL_TO_L1','NON_MSE_NON_CLASS_I_L1_NON_DIVISIBLE_MATCHED','NON_MSE_NON_CLASS_I_L1_NON_DIVISIBLE_NO_MATCH_FULL_TO_L1'];

const E = {
  // Section 1 - vocabulary (ENUM-01 .. ENUM-13)
  Role: ['VENDOR','PROCURING_ENTITY','MINISTRY_ADMIN','DPIIT_ADMIN','AUDIT','CA'],
  SupplierClass: ['CLASS_I','CLASS_II','NON_LOCAL'],
  ComputedClass: ['CLASS_I','CLASS_II','NON_LOCAL','MANUAL_REQUIRED'],
  ComplianceStatus: ['GREEN','YELLOW','RED'],
  CalculationMethod: ['STANDARD','COMPONENT_LEVEL','WEIGHTED_MODULE','CUSTOM'],
  ProcurementDivisibility: ['DIVISIBLE','NON_DIVISIBLE'],
  TenderType: ['DOMESTIC','GLOBAL_TENDER_ENQUIRY'],
  VendorType: ['OEM','RESELLER'],
  ProcurementCategory: ['GOODS','SI_EPC_TURNKEY_SERVICE'],
  AnomalyType: ['SAME_PRODUCT_DIFFERENT_PERCENT','SUDDEN_CLASSIFICATION_JUMP','GEOGRAPHIC_INCONSISTENCY','VOLUME_CAPACITY_MISMATCH'],
  CommitteeAction: ['ACCEPTED','MODIFIED','OVERRIDDEN'],
  TxType: ['RULE_UPDATED','BID_SUBMITTED','PREFERENCE_CALCULATED','PREFERENCE_COMMITTEE_ACTION','CA_CERTIFICATION','DEBARMENT_CREATED','DEBARMENT_WEBHOOK_EMITTED','AUDITOR_FLAGGED','LOGIC_UPGRADED'],
  DecisionPathMII: DECISION_PATH_MII,
  DecisionPathMSE: DECISION_PATH_MSE,
  DecisionPath: [...DECISION_PATH_MII, ...DECISION_PATH_MSE],
  ClassRank: ['-1','0','1','2'],

  // Section 2 - roles and identities
  Ministry: ['DPIIT','MeitY','DoT'],
  VendorId: ['bharat-precision-electronics','deccan-systems','krishna-integrated-devices','godavari-components','indus-global-traders','sabarmati-systems','chambal-devices'],
  TenderId: ['T-001','T-002','T-003','T-004','T-005'],
  IdentityId: ['bharat-precision-electronics','deccan-systems','krishna-integrated-devices','godavari-components','indus-global-traders','sabarmati-systems','chambal-devices','procuring-entity-1','MeitY','DoT','DPIIT','dpiit-national','cvc','Sharma-and-Associates-FR-2201::ICAI-M-118824','__anonymous__'],
  RoleColourToken: ['series-1','series-2','series-5','brand','series-6','series-3'],

  // Section 3/4 - chain
  ValidatorNodeId: ['validator-gem-gateway','validator-dpiit','validator-nodal-ministry'],
  ValidatorOrganisation: ['GeM API Gateway (CBC-PRAMAAN Integration)','DPIIT National Node','Nodal Ministry Rotating Seat'],
  IntegrityReason: ['prevHash mismatch','merkleRoot mismatch','block hash mismatch'],
  Quorum: ['2/3','3/3'],
  LogicModule: ['rule-registry','classification-engine','consistency-engine','debarment-engine','certification-engine','preference-engine'],
  WebhookRecipient: ['ALL_PROCURING_ENTITIES'],
  ChainTable: ['blocks','transactions','logic_versions'],

  // Section 5 - rule registry
  HsnCode: ['*','8471','8443','8517','2523','8523','8544'],
  HsnLabel: ['All other categories (DPIIT default)','Computers / IT hardware','Printers','Telecom equipment','Cement','Software / recorded media','Cables'],
  ComponentName: ['PCB/Motherboard','Power Supply','Enclosure/Chassis','Assembly & Testing','Software/OS'],
  ComponentGate: ['MUST_BE_LOCAL','THRESHOLD','NO_GATE'],

  // Section 6 - engines
  Engine: ['CLASSIFICATION','CONSISTENCY','DEBARMENT','CERTIFICATION','PREFERENCE','ANALYTICS'],
  StatusReasonKey: ['DEBARRED','BELOW_THRESHOLD_FOR_CLAIM','NON_LOCAL_ON_DOMESTIC','PARA_3A','MANUAL_CUSTOM','ANOMALIES','NEAR_THRESHOLD','FIRST_DECLARATION','GREEN'],
  PreferenceTraceStep: ['Pre-filter','Consistency flags','Rank by price','Class-I candidates','Classify L1','Offer cascade','Award'],
  CascadeMultiplier: ['1.20','1.15'],
  DebarmentStatus: ['ACTIVE','EXPIRED'],

  // Section 7 - API
  HttpMethod: ['GET','POST'],
  TriggerPoint: ['1_BID_SUBMISSION','2_BID_EVALUATION','3_PREFERENCE_CALCULATION','4_CA_CERTIFICATION','5_DEBARMENT','6_RULE_UPDATE'],
  ApiGroup: ['GEM_TRIGGER','READ','CHAIN_EXPLORER'],

  // Section 8/9 - shell and screens
  ScreenRoute: ['/','/simulator','/vendor','/procuring-entity','/ministry-admin','/dpiit-admin','/audit','/ca','/analytics','/verify'],
  ScreenGate: ['NONE','VENDOR','PROCURING_ENTITY','MINISTRY_ADMIN','DPIIT_ADMIN','AUDIT','CA'],
  SidebarGroup: ['Simulate','Dashboards','Trust & Transparency'],
  SimulatorTab: ['Bid Submission','Bid Evaluation','Preference Calculation','CA Certification','Debarment','Rule Update'],
  BadgeTone: ['brand','neutral','good','warning','critical'],
  ButtonVariant: ['default','outline','ghost','destructive'],
  UiPrimitive: ['Card','CardHeader','CardTitle','CardDescription','CardContent','PageHeader','SectionLabel','Button','Badge','StatusBadge','Input','Label','Select','Textarea','Checkbox','Table','Th','Td','Tr','Mono','Divider','EmptyState','Skeleton','StatTile','PillTabs'],
  DesignTokenGroup: ['surface','ink','border','brand','semantic','series','chart','radius','shadow'],
  ChartSeries: ['Class-I','Class-II','Manual','Non-Local'],

  // Section 10-12 - seed, scenarios, ops, simplifications
  SeedStepId: ['SEED-01','SEED-02','SEED-03','SEED-04','SEED-05','SEED-06','SEED-07','SEED-08','SEED-09','SEED-10','SEED-11','SEED-12','SEED-13'],
  ScenarioId: ['SCN-01','SCN-02','SCN-03','SCN-04','SCN-05','SCN-06','SCN-07','SCN-08','SCN-09','SCN-10','SCN-11','SCN-12'],
  CheckId: ['CHK-01','CHK-02','CHK-03','CHK-04'],
  OpsScript: ['reset-chain','seed','rebuild-readmodel','auto-seed','ensureSeeded'],
  SimplificationId: ['SIM-01','SIM-02','SIM-03','SIM-04','SIM-05','SIM-06','SIM-07','SIM-08','SIM-09','SIM-10'],
  RunStatus: ['PENDING','RUNNING','PASSED','FAILED'],
  ChainStatus: ['PENDING','CONFIRMED','FAILED'],
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
/** On-chain reference (uuid stored on-chain), for fields inside chain collections. */
const ONREF = (name, label, desc) => F(name, 'uuid', { storage: 'on-chain', req: 1, idx: 1, label, desc });
/**
 * Chain envelope fields present on every record that is an on-chain transaction payload (spec 3.3 / ENT-25):
 * read back by hydrating txRef and blockHeight from the envelope (CHN-24).
 */
const CHAIN = () => [
  F('txRef',       'string',  { storage: 'on-chain', idx: 1, uniq: 1, label: 'Transaction ref', desc: "CHN-10: 'tx_' + base36(now) + '_' + base36(counter) + '_' + first 10 hex of sha256Json({type, payload, timestamp})" }),
  F('blockHeight', 'int',     { storage: 'on-chain', idx: 1, label: 'Block height', desc: 'CHN-11: one transaction per block; height = previous + 1 (0 on an empty chain). Stored placeholder -1 is overwritten by the envelope on hydrate' }),
  F('blockHash',   'bytes32', { storage: 'on-chain', label: 'Block hash', desc: 'CHN-09: sha256 of JSON {height, prevHash, merkleRoot, timestamp}' }),
  F('payloadHash', 'bytes32', { storage: 'on-chain', idx: 1, label: 'Payload hash', desc: 'CHN-07: sha256Json(payload); resolvable on /verify (CHN-21) without exposing the payload' }),
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
  // Cerulea private permissioned chain (simulator facade -> production nodes)
  'consensus','validators','genesis','node-permissioning','p2p','p2p-tls','mempool-policy',
  'private-tx','tx-access-policy','kms-signing','upgrade-manager','chain-params-governance',
  'rpc','api-gateway','explorer','explorer-widgets','chain-audit-export','emergency-brake',
  'metrics-dashboards','log-shipping','backups-restore','health-probes','alerts-paging','error-tracking',
  // Identity and access (no login: preset identities, role gate, ACL-scoped reads)
  'rbac','org-accounts','kyb-registry','govt-identity','govt-esign','privacy-compliance','rate-limit',
  // GeM / PPP-MII domain
  'eprocurement-workflow','procurement-ledger','govt-records-registry','compliance-attestations',
  'fraud-rules','govt-interdept','ent-workflow','evidence-chain','ent-document-registry',
  'smart-legal-contract','regulatory-reporting','govt-legal-audit','govt-transparency-portal',
  // Data, logic and ops
  'logic-editor','onchain-data','event-bus','cache','search-fulltext','analytics','audit-logs','audit-export',
  'webhooks-outbound','webhooks-inbound','notifications','emails','scheduler','asset-storage',
  'cms-pages','theme-branding','dev-sandbox','test-data-factory','local-chain-devnet',
];

module.exports = { sid, E, ACCESS, TYPES, STORAGES, F, ID, REF, ONREF, CHAIN, ENT, MODULE_HOMES };
