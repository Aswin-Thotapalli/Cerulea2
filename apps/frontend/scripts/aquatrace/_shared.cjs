/**
 * AquaTrace seed — shared contract used by every part file.
 * Field types allowed by Studio (step2-types.ts):
 *   uuid string text boolean int float datetime date json enum file address uint256 bytes32 ipfs-hash
 * Storage: database | on-chain | ipfs
 * Enum options are the spec's machine VALUES (snake_case keys); labels go in `desc`.
 */
let _c = 0;
const sid = () => `q${String(++_c).padStart(5, '0')}`;

const SpeciesFarmed = ['vannamei','monodon','scampi','seabass','tilapia'];
const SpeciesWild = ['squid','cuttlefish','octopus','indian_mackerel','oil_sardine','anchovy','threadfin_bream','ribbonfish','croaker','wild_shrimp'];
const ProductFormFarmed = ['hoso','hlso','pd','pud','cooked','value_added'];
const ProductFormWild = ['whole','headed','gutted','cleaned','fillet'];

const E = {
  // §1 Enumerations (27)
  ArrivalPort: ['rotterdam','ny_nj','shanghai','singapore','tokyo','jebel_ali','hamburg','busan','felixstowe'],
  BorderPost: ['fda_newark','bcp_rotterdam','gacc_shanghai','sfa_singapore','mhlw_tokyo','dm_dubai'],
  CarrierFlag: ['india','sri_lanka','oman','iran','thailand','myanmar','singapore','panama'],
  Carrier: ['bluewave','meridian','seabridge','coralstar','transindus'],
  CatchArea: ['fao51_arabian_sea','fao51_lakshadweep','fao57_bay_of_bengal','fao57_andaman','fao51_gulf_of_kutch','fao57_palk_bay'],
  CustomsBroker: ['harbourgate','trident','anchorline','sagarclear','portway'],
  Distributor: ['north_atlantic','harvesttable','freshline','coldcrest','bayfront','seasupply','oriental_dist','gulf_fresh'],
  FishingHarbour: ['visakhapatnam_fh','kochi_fh','chennai_fh','mangalore_fh','veraval_fh','sassoon_dock','paradip_fh','tuticorin_fh','digha_fh','ratnagiri_fh'],
  LoadingPort: ['visakhapatnam','jnpt','kochi','chennai','kolkata','tuticorin','krishnapatnam','pipavav','mangalore'],
  OverseasBuyer: ['north_atlantic','meridian_foods','ocean_harvest','bluecrest','pacific_gate','nordic_waters','sakura_marine','oriental_bay','gulf_pearl','everfresh','marbella'],
  ResidueSubstance: ['chloramphenicol','nitrofuran_aoz','nitrofuran_amoz','nitrofuran_ahd','nitrofuran_sem','malachite_green','oxytetracycline','tetracycline','enrofloxacin','metronidazole','sulphonamides'],
  Retailer: ['greenbasket','marlinmart','freshco','harbourfoods','metromart','valuecart','dailyfresh','seaside_market','orientmart','gulf_super'],
  ScreeningMethod: ['realtime_pcr','nested_pcr','conventional_pcr','histopathology','bioassay'],
  SeedScreeningResult: ['clear','detected','pending','not_tested'],
  SpfPanel: ['woah_penaeid_full','caa_core','wssv_ehp_ahpnd','wssv_ihhnv','mrnv_panel'],
  SpfStatus: ['spf','spr','spt','high_health','not_certified'],
  TestingLaboratory: ['eia_kochi','eia_visakhapatnam','mpeda_nellore','coastal_analytics','blueleaf_labs','meridian_labs'],
  WelfareStandard: ['sa8000','bap','brcgs','sedex_smeta','bsci','msc_coc','iso22000','none'],
  FarmingMethod: ['brackishwater_pond','freshwater_pond','cage'],          // crop_cycle.farming_method = harvest_event.farming_method
  PositionSource: ['voyage_report','satellite','harbour_register','skipper_entry'],
  HandlingOperation: ['deheading','grading','peeling','washing','cleaning'],
  PostLarvalStage: ['pl8','pl10','pl12','pl15','pl20'],
  InputType: ['feed','probiotic','mineral','therapeutant','health_product'],
  TransformOperation: ['split','merge'],
  TransformUnit: ['kg','tonne','count','carton'],
  ApprovalScope: ['eu_listed','us_fda','china_gacc','multi_market','domestic_only'],
  // §2 Data collections (registries) — keys usable as enum options for reference fields
  SpeciesFarmed, SpeciesWild, Species: [...SpeciesFarmed, ...SpeciesWild],
  ProductFormFarmed, ProductFormWild, ProductForm: [...ProductFormFarmed, ...ProductFormWild],
  CountGrade: ['u15','16_20','21_25','26_30','31_40','41_50','51_60'],
  Destination: ['united_states','european_union','china','south_east_asia','japan','middle_east'],
  VesselClass: ['mechanised','motorised','artisanal'],
  GearType: ['trawl_net','bag_net','seine','gill_net','ring_seine','hand_line'],
  // §3 AquaChain
  TxType: ['tx_register','tx_register_plant','tx_processing','tx_cold_storage','tx_lab_result','tx_handling','tx_transport','tx_ship_receive','tx_split','tx_merge','tx_consignment','tx_customs','tx_shipping','tx_import','tx_distribution','tx_retail','tx_certificate','tx_document_anchor','tx_broodstock','tx_hatchery','tx_stocking','tx_input_application','tx_growout','tx_sampling','tx_harvest','tx_fishing','tx_onvessel_processing','tx_transhipment','tx_landing','tx_auction'],
  TxCategory: ['register','event','handoff','split','merge','certificate','document_anchor','origin_create'],
  CertType: ['cert_establishment','cert_health','cert_origin','cert_caa_unit','cert_mpeda_enrolment','cert_coc_inputs','cert_shaphari','cert_fssai','cert_vessel_registration','cert_fishing_licence','cert_letter_authorisation','cert_catch','cert_msc','cert_fssai_wild'],
  Issuer: ['eia','eic','caa','mpeda','fssai','realcraft','state_fisheries','dof','msc'],
  IssuerKind: ['regulator'],
  ChainStatus: ['PENDING','CONFIRMED','FAILED'],
  BlockStatus: ['PENDING','FINALISED'],
  HandoffStatus: ['AWAITING_ACCEPTANCE','ACCEPTED','DISPUTED'],
  // §4 / §9 Roles & permissions
  Role: ['plant_quality_manager','exporter_administrator','customs_broker','transporter','importer','distributor','retailer','agent_dealer','regulator_auditor','broodstock_multiplication_centre','hatchery_operator','farmer','preprocessing_operator','dealer_trader','nucleus_breeding_centre','seed_agent','feed_manufacturer','input_dealer','aqua_technician','pond_lessor','harvest_contractor','commission_agent','buying_agent','skipper','auctioneer','assembler_supplier','wholesaler','cleaning_operator','boat_owner','financier','ice_fuel_supplier'],
  PlatformRole: ['platform_admin','platform_super_admin'],
  PermissionAction: ['create','read','update','accept_handoff','flag_discrepancy','issue_certificate','record_event','verify'],
  Scope: ['shared','farmed','wild'],
  // §5 Profiles
  ProfileKey: ['farmed_aquaculture','wild_capture'],
  StageKey: ['stage_broodstock','stage_hatchery','stage_stocking','stage_input_application','stage_growout','stage_sampling','stage_harvest','stage_farm_gate_receipt','stage_preprocessing','stage_fishing','stage_onvessel_processing','stage_transhipment','stage_landing','stage_auction','stage_assembly','stage_wholesale','stage_cleaning','stage_processing','stage_freezing_cold_storage','stage_export_documentation','stage_customs','stage_shipping','stage_import','stage_distribution','stage_retail'],
  // §7 Rules
  RuleKey: ['rule_dissolved_oxygen_low','rule_ammonia_high','rule_residue_breach','rule_input_not_certified','rule_transport_temperature'],
  RuleOp: ['lt','gt','eq'],
  QualityParamKey: ['qp_salinity','qp_dissolved_oxygen','qp_ph','qp_ammonia','qp_count_grade','qp_residue','qp_landed_weight'],
  SemanticRole: ['party_identifier','operating_licence','origin_attribute','geo_position','certification_status','batch_identifier','parent_lot_ref','child_lot_ref','species','product_form','weight','yield_factor','event_date','human_welfare_indicator','lot_identifier','residue_metric','compliance_limit','location_identifier','unit_of_measure','consignment_identifier','certificate_reference','document_digest','quantity','temperature_metric','origin_identifier','farming_method','monitoring_metric','harvest_date','quality_grade_metric','catch_area','capture_date','gear_type','position_source'],
  // §8 / §10 Surface
  ScreenAccess: ['PUBLIC','PUBLIC_TOKEN','AUTHENTICATED','PLATFORM_ADMIN'],
  Locale: ['en','te','ta','ml','or','bn','gu','mr','kn'],
  CoreTerm: ['origin_unit','lot','producer','facility','harvest','handoff'],
  InviteStatus: ['PENDING','ACCEPTED','EXPIRED'],
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
/** On-chain proof present on every anchored record (AquaChain: ed25519-signed, SHA-256 hashed). */
const CHAIN = () => [
  F('chainTxHash',      'bytes32', { storage: 'on-chain', idx: 1, label: 'Chain tx hash',   desc: 'SHA-256 over the canonical event payload' }),
  F('chainBlockNumber', 'int',     { storage: 'on-chain',         label: 'Chain block number' }),
  F('chainStatus',      'enum',    { storage: 'on-chain', req: 1, label: 'Chain status', options: E.ChainStatus, def: 'PENDING', desc: 'PENDING until the block finalises at 4-of-5 validator signatures, then CONFIRMED' }),
  F('actorSignature',   'bytes32', { storage: 'on-chain',         label: 'Actor signature',  desc: 'ed25519 signature by the acting party\'s own key (blockchain/keys.ts)' }),
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
  // AquaChain core
  'consensus','validators','genesis','node-permissioning','mempool-policy','p2p','p2p-tls',
  'rpc','ws-subscriptions','graphql-gateway','api-gateway','explorer',
  'kms-signing','tx-access-policy','emergency-brake','chain-audit-export',
  'metrics-dashboards','log-shipping','backups-restore','health-probes','alerts-paging',
  // Identity & access
  'rbac','org-accounts','session-keys','rate-limit','wallet-auth','kyc','privacy-compliance',
  // Seafood supply-chain domain
  'traceability-ledger','cold-chain-monitoring','port-customs-events','quality-recall-ledger',
  'evidence-chain','compliance-attestations','provenance-notary','produce-grades','trade-finance-docs',
  'ent-workflow','ent-document-registry','oracles',
  // Data & ops
  'onchain-data','subgraph-indexer','search-fulltext','scheduler','realtime-pubsub',
  'webhooks-outbound','audit-logs','notifications','emails','twilio-adapter',
  'push-adapters','document-signing','asset-storage','i18n','theme-branding',
];

module.exports = { sid, E, ACCESS, TYPES, STORAGES, F, ID, REF, CHAIN, ENT, MODULE_HOMES };
