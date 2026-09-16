/**
 * AquaTrace seed - §6 Forms (TABLES 44-71).
 *
 * 28 anchored capture forms, transcribed row-for-row from SPEC.md §6.
 *   - `name`        = spec "Field key" verbatim
 *   - `label`       = spec "Label" verbatim
 *   - `required`    = spec "Req"
 *   - `description` = "semantic: <spec Semantic role>" plus any §7.3 TABLE 74 constraint,
 *                     plus the binding note for geo_point / collection references.
 *
 * Every form carries ID() first and ...CHAIN() last, is on-chain, and uses ACCESS.AUTH.
 * STAGE_FORM_MAP covers all 25 distinct stage keys of §5 (TABLES 42-43).
 */
const { E, ACCESS, F, ID, REF, CHAIN, ENT } = require('./_shared.cjs');

const GEO = 'geo_point {lat, lng}';

/* ------------------------------------------------------------------ *
 * TABLE 44 - Organisation (organisation) - Shared
 * ------------------------------------------------------------------ */
const Organisation = ENT(
  'org-accounts',
  'Organisation',
  'Organisation (spec key: organisation) · Shared · on-chain · Used at stage(s): not a stage form · plural: Organisations',
  [
    ID(),
    F('legal_name', 'string', { req: 1, label: 'Legal name', desc: 'semantic: party_identifier; minLen 2, maxLen 200' }),
    F('party_gln', 'string', { label: 'Party global location number', desc: 'semantic: party_identifier' }),
    F('iec_code', 'string', { label: 'Importer Exporter Code', desc: 'semantic: operating_licence' }),
    F('address', 'text', { label: 'Registered address', desc: 'semantic: origin_attribute' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 45 - Processing plant (processing_plant) - Shared
 * ------------------------------------------------------------------ */
const ProcessingPlant = ENT(
  'org-accounts',
  'ProcessingPlant',
  'Processing plant (spec key: processing_plant) · Shared · on-chain · Used at stage(s): not a stage form · plural: Processing plants',
  [
    ID(),
    F('plant_name', 'string', { req: 1, label: 'Plant name', desc: 'semantic: party_identifier' }),
    F('establishment_number', 'string', { req: 1, label: 'Establishment approval number', desc: 'semantic: operating_licence' }),
    F('location', 'json', { label: 'Plant location', desc: `semantic: geo_position; ${GEO}` }),
    F('approval_scope', 'enum', { label: 'Approval market scope', options: E.ApprovalScope, desc: 'semantic: certification_status' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 46 - Processing batch (processing_batch) - Shared
 * ------------------------------------------------------------------ */
const ProcessingBatch = ENT(
  'traceability-ledger',
  'ProcessingBatch',
  'Processing batch (spec key: processing_batch) · Shared · on-chain · Used at stage(s): stage_processing, stage_freezing_cold_storage · plural: Processing batches',
  [
    ID(),
    F('batch_number', 'string', { req: 1, label: 'Production batch number', desc: 'semantic: batch_identifier' }),
    F('input_lot_ref', 'string', { req: 1, label: 'Input lot', desc: 'semantic: parent_lot_ref' }),
    F('species', 'enum', { req: 1, label: 'Species', options: E.Species, desc: 'semantic: species; reference -> species registry' }),
    F('product_form', 'enum', { req: 1, label: 'Product form', options: E.ProductForm, desc: 'semantic: product_form; reference -> product_forms registry' }),
    F('raw_weight', 'float', { req: 1, label: 'Raw weight', unit: 'kg', desc: 'semantic: weight; min 0' }),
    F('finished_weight', 'float', { req: 1, label: 'Finished weight', unit: 'kg', desc: 'semantic: weight; min 0' }),
    F('yield_factor', 'float', { label: 'Yield factor', desc: 'semantic: yield_factor; min 0, max 1' }),
    F('production_date', 'date', { req: 1, label: 'Production date', desc: 'semantic: event_date' }),
    F('operating_licence', 'string', { label: 'Operating licence', desc: 'semantic: operating_licence' }),
    F('human_welfare_policy', 'boolean', { req: 1, label: 'Human welfare policy in force', desc: 'semantic: human_welfare_indicator' }),
    F('human_welfare_standard', 'enum', { label: 'Human welfare standard claimed', options: E.WelfareStandard, desc: 'semantic: human_welfare_indicator' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 47 - Laboratory report (lab_report) - Shared
 * ------------------------------------------------------------------ */
const LabReport = ENT(
  'compliance-attestations',
  'LabReport',
  'Laboratory report (spec key: lab_report) · Shared · on-chain · Used at stage(s): not a stage form · plural: Laboratory reports',
  [
    ID(),
    F('sample_id', 'string', { req: 1, label: 'Sealed sample identifier', desc: 'semantic: lot_identifier' }),
    F('source_lot_ref', 'string', { req: 1, label: 'Source lot', desc: 'semantic: parent_lot_ref' }),
    F('substance', 'enum', { req: 1, label: 'Substance tested', options: E.ResidueSubstance, desc: 'semantic: origin_attribute' }),
    F('residue_value', 'float', { req: 1, label: 'Residue reading', unit: 'ug/kg', desc: 'semantic: residue_metric; min 0' }),
    F('residue_limit', 'float', { req: 1, label: 'Maximum residue limit', unit: 'ug/kg', desc: 'semantic: compliance_limit; min 0' }),
    F('result_pass', 'boolean', { req: 1, label: 'Within limit', desc: 'semantic: certification_status' }),
    F('tested_on', 'date', { req: 1, label: 'Test date', desc: 'semantic: event_date' }),
    F('laboratory', 'enum', { req: 1, label: 'Testing laboratory', options: E.TestingLaboratory, desc: 'semantic: party_identifier' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 48 - Handling site event (handling_event) - Shared
 * ------------------------------------------------------------------ */
const HandlingEvent = ENT(
  'ent-workflow',
  'HandlingEvent',
  'Handling site event (spec key: handling_event) · Shared · on-chain · Used at stage(s): stage_preprocessing, stage_cleaning · plural: Handling site events',
  [
    ID(),
    F('site_id', 'string', { req: 1, label: 'Site identifier', desc: 'semantic: location_identifier' }),
    F('site_position', 'json', { req: 1, label: 'Site position', desc: `semantic: geo_position; ${GEO}` }),
    F('approval_number', 'string', { req: 1, label: 'Government approval number', desc: 'semantic: operating_licence' }),
    F('controlling_party', 'string', { req: 1, label: 'Controlling party', desc: 'semantic: party_identifier' }),
    F('in_audit_scope', 'boolean', { req: 1, label: 'Within current audit scope', desc: 'semantic: certification_status' }),
    F('operation', 'enum', { req: 1, label: 'Operation performed', options: E.HandlingOperation, desc: 'semantic: origin_attribute' }),
    F('input_lot_ref', 'string', { req: 1, label: 'Input lot', desc: 'semantic: parent_lot_ref' }),
    F('output_lot_ref', 'string', { req: 1, label: 'Output lot', desc: 'semantic: child_lot_ref' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 49 - Transport leg (transport_event) - Shared
 * ------------------------------------------------------------------ */
const TransportEvent = ENT(
  'cold-chain-monitoring',
  'TransportEvent',
  'Transport leg (spec key: transport_event) · Shared · on-chain · Used at stage(s): not a stage form · plural: Transport legs',
  [
    ID(),
    F('lot_ref', 'string', { req: 1, label: 'Lot moved', desc: 'semantic: lot_identifier' }),
    F('from_location', 'string', { req: 1, label: 'Departure location', desc: 'semantic: location_identifier' }),
    F('to_location', 'string', { req: 1, label: 'Arrival location', desc: 'semantic: location_identifier' }),
    F('departure_time', 'datetime', { req: 1, label: 'Departure time', desc: 'semantic: event_date' }),
    F('arrival_time', 'datetime', { req: 1, label: 'Arrival time', desc: 'semantic: event_date' }),
    F('logger_fitted', 'boolean', { req: 1, label: 'Temperature logger fitted', desc: 'semantic: origin_attribute' }),
    F('temperature_max', 'float', { label: 'Highest temperature on the leg', unit: '°C', desc: 'semantic: temperature_metric' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 50 - Custody transfer (ship_receive_event) - Shared
 * ------------------------------------------------------------------ */
const ShipReceiveEvent = ENT(
  'ent-workflow',
  'ShipReceiveEvent',
  'Custody transfer (spec key: ship_receive_event) · Shared · on-chain · Used at stage(s): stage_farm_gate_receipt, stage_assembly, stage_wholesale · plural: Custody transfers',
  [
    ID(),
    F('lot_ref', 'string', { req: 1, label: 'Lot transferred', desc: 'semantic: lot_identifier' }),
    F('source_party', 'string', { req: 1, label: 'Source party', desc: 'semantic: party_identifier' }),
    F('destination_party', 'string', { req: 1, label: 'Destination party', desc: 'semantic: party_identifier' }),
    F('quantity', 'float', { req: 1, label: 'Quantity transferred', unit: 'kg', desc: 'semantic: quantity; min 0' }),
    F('event_time', 'datetime', { req: 1, label: 'Transfer time', desc: 'semantic: event_date' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 51 - Lot transformation (lot_transform_event) - Shared
 * ------------------------------------------------------------------ */
const LotTransformEvent = ENT(
  'ent-workflow',
  'LotTransformEvent',
  'Lot transformation (spec key: lot_transform_event) · Shared · on-chain · Used at stage(s): not a stage form · plural: Lot transformations',
  [
    ID(),
    F('operation', 'enum', { req: 1, label: 'Transformation', options: E.TransformOperation, desc: 'semantic: origin_attribute' }),
    F('input_lots', 'text', { req: 1, label: 'Input lots', desc: 'semantic: parent_lot_ref' }),
    F('output_lots', 'text', { req: 1, label: 'Output lots', desc: 'semantic: child_lot_ref' }),
    F('unit', 'enum', { req: 1, label: 'Unit of measure', options: E.TransformUnit, desc: 'semantic: unit_of_measure' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 52 - Export consignment (consignment) - Shared
 * ------------------------------------------------------------------ */
const Consignment = ENT(
  'traceability-ledger',
  'Consignment',
  'Export consignment (spec key: consignment) · Shared · on-chain · Used at stage(s): stage_export_documentation · plural: Export consignments',
  [
    ID(),
    F('consignment_number', 'string', { req: 1, label: 'Consignment number', desc: 'semantic: consignment_identifier' }),
    F('destination', 'enum', { req: 1, label: 'Destination market', options: E.Destination, desc: 'semantic: origin_attribute; reference -> destinations registry' }),
    F('buyer', 'enum', { req: 1, label: 'Buyer', options: E.OverseasBuyer, desc: 'semantic: party_identifier' }),
    F('input_lots', 'text', { req: 1, label: 'Contained lots', desc: 'semantic: parent_lot_ref' }),
    F('total_weight', 'float', { req: 1, label: 'Total net weight', unit: 'kg', desc: 'semantic: weight; min 0' }),
    F('export_date', 'date', { req: 1, label: 'Export date', desc: 'semantic: event_date' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 53 - Certificate (certificate) - Shared
 * ------------------------------------------------------------------ */
const Certificate = ENT(
  'evidence-chain',
  'Certificate',
  'Certificate (spec key: certificate) · Shared · on-chain · Used at stage(s): not a stage form · plural: Certificates',
  [
    ID(),
    F('certificate_number', 'string', { req: 1, label: 'Certificate number', desc: 'semantic: certificate_reference' }),
    F('anchored_lot_ref', 'string', { req: 1, label: 'Subject lot or entity', desc: 'semantic: lot_identifier' }),
    F('issuer', 'string', { req: 1, label: 'Issuing authority', desc: 'semantic: party_identifier' }),
    F('issued_on', 'date', { req: 1, label: 'Issue date', desc: 'semantic: event_date' }),
    F('valid_until', 'date', { label: 'Valid until', desc: 'semantic: event_date' }),
    F('document_digest', 'string', { req: 1, label: 'Document digest', desc: 'semantic: document_digest' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 54 - Anchored document (document_anchor) - Shared
 * ------------------------------------------------------------------ */
const DocumentAnchor = ENT(
  'evidence-chain',
  'DocumentAnchor',
  'Anchored document (spec key: document_anchor) · Shared · on-chain · Used at stage(s): not a stage form · plural: Anchored documents',
  [
    ID(),
    F('document_number', 'string', { req: 1, label: 'Document number', desc: 'semantic: certificate_reference' }),
    F('document_digest', 'string', { req: 1, label: 'Document digest', desc: 'semantic: document_digest' }),
    F('issuer', 'string', { req: 1, label: 'Issuer', desc: 'semantic: party_identifier' }),
    F('valid_until', 'date', { label: 'Valid until', desc: 'semantic: event_date' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 55 - Customs clearance (customs_event) - Shared
 * ------------------------------------------------------------------ */
const CustomsEvent = ENT(
  'port-customs-events',
  'CustomsEvent',
  'Customs clearance (spec key: customs_event) · Shared · on-chain · Used at stage(s): stage_customs · plural: Customs clearances',
  [
    ID(),
    F('consignment_ref', 'string', { req: 1, label: 'Consignment', desc: 'semantic: consignment_identifier' }),
    F('shipping_bill_number', 'string', { req: 1, label: 'Shipping bill number', desc: 'semantic: certificate_reference' }),
    F('port_of_loading', 'enum', { req: 1, label: 'Port of loading', options: E.LoadingPort, desc: 'semantic: location_identifier' }),
    F('customs_broker', 'enum', { req: 1, label: 'Customs broker', options: E.CustomsBroker, desc: 'semantic: party_identifier' }),
    F('cleared_date', 'date', { req: 1, label: 'Customs cleared date', desc: 'semantic: event_date' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 56 - Ocean freight leg (shipping_event) - Shared
 * ------------------------------------------------------------------ */
const ShippingEvent = ENT(
  'port-customs-events',
  'ShippingEvent',
  'Ocean freight leg (spec key: shipping_event) · Shared · on-chain · Used at stage(s): stage_shipping · plural: Ocean freight legs',
  [
    ID(),
    F('consignment_ref', 'string', { req: 1, label: 'Consignment', desc: 'semantic: consignment_identifier' }),
    F('container_number', 'string', { req: 1, label: 'Reefer container number', desc: 'semantic: origin_attribute' }),
    F('seal_number', 'string', { req: 1, label: 'Container seal number', desc: 'semantic: origin_attribute' }),
    F('vessel_name', 'enum', { req: 1, label: 'Carrier line', options: E.Carrier, desc: 'semantic: party_identifier' }),
    F('bill_of_lading', 'string', { req: 1, label: 'Bill of lading', desc: 'semantic: certificate_reference' }),
    F('departure_port', 'enum', { req: 1, label: 'Departure port', options: E.LoadingPort, desc: 'semantic: location_identifier' }),
    F('arrival_port', 'enum', { req: 1, label: 'Arrival port', options: E.ArrivalPort, desc: 'semantic: location_identifier' }),
    F('sail_date', 'date', { req: 1, label: 'Sail date', desc: 'semantic: event_date' }),
    F('reefer_setpoint', 'float', { label: 'Reefer set point', unit: '°C', desc: 'semantic: temperature_metric' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 57 - Import clearance (import_event) - Shared
 * ------------------------------------------------------------------ */
const ImportEvent = ENT(
  'port-customs-events',
  'ImportEvent',
  'Import clearance (spec key: import_event) · Shared · on-chain · Used at stage(s): stage_import · plural: Import clearances',
  [
    ID(),
    F('consignment_ref', 'string', { req: 1, label: 'Consignment', desc: 'semantic: consignment_identifier' }),
    F('border_control_post', 'enum', { req: 1, label: 'Border control post', options: E.BorderPost, desc: 'semantic: location_identifier' }),
    F('import_entry_number', 'string', { req: 1, label: 'Import entry number', desc: 'semantic: certificate_reference' }),
    F('importer_name', 'enum', { req: 1, label: 'Importer', options: E.OverseasBuyer, desc: 'semantic: party_identifier' }),
    F('cleared_date', 'date', { req: 1, label: 'Import cleared date', desc: 'semantic: event_date' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 58 - Distribution (distribution_event) - Shared
 * ------------------------------------------------------------------ */
const DistributionEvent = ENT(
  'traceability-ledger',
  'DistributionEvent',
  'Distribution (spec key: distribution_event) · Shared · on-chain · Used at stage(s): stage_distribution · plural: Distributions',
  [
    ID(),
    F('input_lot_ref', 'string', { req: 1, label: 'Received lot', desc: 'semantic: parent_lot_ref' }),
    F('output_lot_ref', 'string', { req: 1, label: 'Repacked lot', desc: 'semantic: child_lot_ref' }),
    F('distributor_name', 'enum', { req: 1, label: 'Distributor', options: E.Distributor, desc: 'semantic: party_identifier' }),
    F('quantity', 'float', { req: 1, label: 'Quantity', unit: 'kg', desc: 'semantic: quantity; min 0' }),
    F('relabel_date', 'date', { req: 1, label: 'Repack date', desc: 'semantic: event_date' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 59 - Retail delivery (retail_event) - Shared
 * ------------------------------------------------------------------ */
const RetailEvent = ENT(
  'traceability-ledger',
  'RetailEvent',
  'Retail delivery (spec key: retail_event) · Shared · on-chain · Used at stage(s): stage_retail · plural: Retail deliveries',
  [
    ID(),
    F('input_lot_ref', 'string', { req: 1, label: 'Received lot', desc: 'semantic: parent_lot_ref' }),
    F('retailer_name', 'enum', { req: 1, label: 'Retailer or food service buyer', options: E.Retailer, desc: 'semantic: party_identifier' }),
    F('destination_market', 'enum', { req: 1, label: 'Destination market', options: E.Destination, desc: 'semantic: origin_attribute; reference -> destinations registry' }),
    F('quantity', 'float', { req: 1, label: 'Quantity delivered', unit: 'kg', desc: 'semantic: quantity; min 0' }),
    F('sale_date', 'date', { req: 1, label: 'Delivery date', desc: 'semantic: event_date' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 60 - Pond stocking (crop_cycle) - Farmed - parent: broodstock_event
 * ------------------------------------------------------------------ */
const CropCycle = ENT(
  'traceability-ledger',
  'CropCycle',
  'Pond stocking (spec key: crop_cycle) · Farmed · on-chain · parent: broodstock_event · Used at stage(s): stage_stocking · plural: Pond stockings',
  [
    ID(),
    F('crop_code', 'string', { req: 1, label: 'Crop cycle code', desc: 'semantic: lot_identifier' }),
    F('pond_id', 'string', { req: 1, label: 'Pond identifier', desc: 'semantic: location_identifier' }),
    F('farm_registration', 'string', { req: 1, label: 'Coastal aquaculture unit registration', desc: 'semantic: operating_licence' }),
    F('mpeda_enrolment', 'string', { label: 'MPEDA farm enrolment number', desc: 'semantic: operating_licence' }),
    F('species', 'enum', { req: 1, label: 'Species stocked', options: E.SpeciesFarmed, desc: 'semantic: species; reference -> species registry' }),
    F('farming_method', 'enum', { req: 1, label: 'Farming method', options: E.FarmingMethod, desc: 'semantic: farming_method' }),
    F('pond_position', 'json', { req: 1, label: 'Pond position', desc: `semantic: geo_position; ${GEO}` }),
    F('seed_source_lot', 'string', { req: 1, label: 'Seed source lot', desc: 'semantic: parent_lot_ref' }),
    F('stocking_date', 'date', { req: 1, label: 'Stocking date', desc: 'semantic: event_date' }),
    F('seed_quantity', 'int', { req: 1, label: 'Seed quantity released', unit: 'count', desc: 'semantic: quantity; min 0' }),
    F('stocking_density', 'float', { req: 1, label: 'Stocking density', unit: 'per m2', desc: 'semantic: origin_attribute; min 0' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 61 - Broodstock lot (broodstock_event) - Farmed - ORIGIN UNIT
 * ------------------------------------------------------------------ */
const BroodstockEvent = ENT(
  'traceability-ledger',
  'BroodstockEvent',
  'Broodstock lot (spec key: broodstock_event) · Farmed · on-chain · ORIGIN UNIT · Used at stage(s): stage_broodstock · plural: Broodstock lots',
  [
    ID(),
    F('broodstock_lot', 'string', { req: 1, label: 'Broodstock lot code', desc: 'semantic: origin_identifier' }),
    F('source_centre', 'string', { req: 1, label: 'Broodstock multiplication centre', desc: 'semantic: party_identifier' }),
    F('centre_registration', 'string', { req: 1, label: 'Broodstock multiplication centre registration', desc: 'semantic: operating_licence' }),
    F('species', 'enum', { req: 1, label: 'Species', options: E.SpeciesFarmed, desc: 'semantic: species; reference -> species registry' }),
    F('spf_status', 'enum', { req: 1, label: 'Broodstock health status (certified by breeding centre)', options: E.SpfStatus, desc: 'semantic: certification_status' }),
    F('spf_panel', 'enum', { req: 1, label: 'Pathogen panel screened', options: E.SpfPanel, desc: 'semantic: certification_status' }),
    F('screening_method', 'enum', { req: 1, label: 'Screening method', options: E.ScreeningMethod, desc: 'semantic: origin_attribute' }),
    F('screening_laboratory', 'enum', { req: 1, label: 'Screening laboratory', options: E.TestingLaboratory, desc: 'semantic: party_identifier' }),
    F('health_certificate_number', 'string', { req: 1, label: 'Health certificate number', desc: 'semantic: certificate_reference' }),
    F('screened_on', 'date', { req: 1, label: 'Screening date', desc: 'semantic: event_date' }),
    F('broodstock_count', 'int', { req: 1, label: 'Number of broodstock', unit: 'count', desc: 'semantic: quantity; min 0' }),
    F('supply_date', 'date', { req: 1, label: 'Supply date', desc: 'semantic: event_date' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 62 - Hatchery dispatch (hatchery_event) - Farmed
 * ------------------------------------------------------------------ */
const HatcheryEvent = ENT(
  'traceability-ledger',
  'HatcheryEvent',
  'Hatchery dispatch (spec key: hatchery_event) · Farmed · on-chain · Used at stage(s): stage_hatchery · plural: Hatchery dispatches',
  [
    ID(),
    F('seed_lot', 'string', { req: 1, label: 'Post-larvae seed lot', desc: 'semantic: lot_identifier' }),
    F('broodstock_source', 'string', { req: 1, label: 'Broodstock source lot', desc: 'semantic: parent_lot_ref' }),
    F('tank_harvest_date', 'date', { req: 1, label: 'Tank harvest date', desc: 'semantic: event_date' }),
    F('hatchery_registration', 'string', { req: 1, label: 'Hatchery unit registration (CAA)', desc: 'semantic: operating_licence' }),
    F('post_larval_stage', 'enum', { req: 1, label: 'Post-larval stage at dispatch', options: E.PostLarvalStage, desc: 'semantic: origin_attribute' }),
    F('seed_quantity', 'int', { req: 1, label: 'Seed quantity', unit: 'count', desc: 'semantic: quantity; min 0' }),
    F('broodstock_health_status', 'enum', { req: 1, label: 'Source broodstock health status', options: E.SpfStatus, desc: 'semantic: certification_status' }),
    F('seed_screening_result', 'enum', { req: 1, label: 'Seed PCR screening result', options: E.SeedScreeningResult, desc: 'semantic: certification_status' }),
    F('pathogen_panel', 'enum', { req: 1, label: 'Pathogen panel tested', options: E.SpfPanel, desc: 'semantic: origin_attribute' }),
    F('screening_method', 'enum', { req: 1, label: 'Screening method', options: E.ScreeningMethod, desc: 'semantic: origin_attribute' }),
    F('screening_laboratory', 'enum', { req: 1, label: 'Testing laboratory', options: E.TestingLaboratory, desc: 'semantic: party_identifier' }),
    F('seed_health_certificate_number', 'string', { req: 1, label: 'Seed health certificate number issued', desc: 'semantic: certificate_reference' }),
    F('screened_on', 'date', { req: 1, label: 'Seed test date', desc: 'semantic: event_date' }),
    F('destination_farm', 'string', { req: 1, label: 'Destination farm', desc: 'semantic: party_identifier' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 63 - Feed and input application (input_application_event) - Farmed - parent: crop_cycle
 * ------------------------------------------------------------------ */
const InputApplicationEvent = ENT(
  'compliance-attestations',
  'InputApplicationEvent',
  'Feed and input application (spec key: input_application_event) · Farmed · on-chain · parent: crop_cycle · Used at stage(s): stage_input_application · plural: Feed and input applications',
  [
    ID(),
    F('input_type', 'enum', { req: 1, label: 'Input type', options: E.InputType, desc: 'semantic: origin_attribute' }),
    F('product_name', 'string', { req: 1, label: 'Product name', desc: 'semantic: origin_attribute' }),
    F('product_batch', 'string', { req: 1, label: 'Product batch', desc: 'semantic: origin_attribute' }),
    F('caa_certified', 'boolean', { req: 1, label: 'On the Coastal Aquaculture Authority certified list', desc: 'semantic: certification_status' }),
    F('quantity', 'float', { req: 1, label: 'Quantity applied', unit: 'kg', desc: 'semantic: quantity; min 0' }),
    F('applied_on', 'date', { req: 1, label: 'Application date', desc: 'semantic: event_date' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 64 - Grow-out reading (growout_reading) - Farmed - parent: crop_cycle
 * ------------------------------------------------------------------ */
const GrowoutReading = ENT(
  'oracles',
  'GrowoutReading',
  'Grow-out reading (spec key: growout_reading) · Farmed · on-chain · parent: crop_cycle · Used at stage(s): stage_growout · plural: Grow-out readings',
  [
    ID(),
    F('reading_date', 'date', { req: 1, label: 'Reading date', desc: 'semantic: event_date' }),
    F('salinity', 'float', { label: 'Salinity', unit: 'ppt', desc: 'semantic: monitoring_metric' }),
    F('dissolved_oxygen', 'float', { label: 'Dissolved oxygen', unit: 'mg/L', desc: 'semantic: monitoring_metric' }),
    F('ph', 'float', { label: 'Acidity (pH)', desc: 'semantic: monitoring_metric; min 0, max 14' }),
    F('ammonia', 'float', { label: 'Ammonia', unit: 'mg/L', desc: 'semantic: monitoring_metric' }),
    F('estimated_body_weight', 'float', { label: 'Estimated average body weight', unit: 'g', desc: 'semantic: monitoring_metric' }),
    F('mortality_observed', 'boolean', { req: 1, label: 'Stress or mortality observed', desc: 'semantic: origin_attribute' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 65 - Pre-harvest sampling (sampling_event) - Farmed - parent: crop_cycle
 * ------------------------------------------------------------------ */
const SamplingEvent = ENT(
  'oracles',
  'SamplingEvent',
  'Pre-harvest sampling (spec key: sampling_event) · Farmed · on-chain · parent: crop_cycle · Used at stage(s): stage_sampling · plural: Pre-harvest samplings',
  [
    ID(),
    F('sample_id', 'string', { req: 1, label: 'Sealed sample identifier', desc: 'semantic: lot_identifier' }),
    F('sample_position', 'json', { req: 1, label: 'Position sample drawn', desc: `semantic: geo_position; ${GEO}` }),
    F('drawn_at', 'datetime', { req: 1, label: 'Time drawn', desc: 'semantic: event_date' }),
    F('drawn_by', 'string', { req: 1, label: 'Person drawing the sample', desc: 'semantic: party_identifier' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 66 - Harvest (harvest_event) - Farmed - parent: crop_cycle
 * ------------------------------------------------------------------ */
const HarvestEvent = ENT(
  'traceability-ledger',
  'HarvestEvent',
  'Harvest (spec key: harvest_event) · Farmed · on-chain · parent: crop_cycle · Used at stage(s): stage_harvest · plural: Harvests',
  [
    ID(),
    F('harvest_lot', 'string', { req: 1, label: 'Harvest lot (crate code)', desc: 'semantic: lot_identifier' }),
    F('farming_method', 'enum', { req: 1, label: 'Farming method', options: E.FarmingMethod, desc: 'semantic: farming_method' }),
    F('harvest_date', 'date', { req: 1, label: 'Harvest date', desc: 'semantic: harvest_date' }),
    F('harvest_weight', 'float', { req: 1, label: 'Harvest weight', unit: 'kg', desc: 'semantic: weight; min 0' }),
    F('count_grade', 'enum', { req: 1, label: 'Predominant count grade', options: E.CountGrade, desc: 'semantic: quality_grade_metric; reference -> count_grades registry' }),
    F('agreed_rate', 'float', { req: 1, label: 'Agreed rate', unit: 'INR/kg', desc: 'semantic: origin_attribute; min 0' }),
    F('deductions', 'float', { label: 'Deductions', unit: 'INR', desc: 'semantic: origin_attribute' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 67 - Fishing trip (fishing_trip) - Wild - ORIGIN UNIT
 * ------------------------------------------------------------------ */
const FishingTrip = ENT(
  'traceability-ledger',
  'FishingTrip',
  'Fishing trip (spec key: fishing_trip) · Wild · on-chain · ORIGIN UNIT · Used at stage(s): stage_fishing · plural: Fishing trips',
  [
    ID(),
    F('trip_code', 'string', { req: 1, label: 'Trip code', desc: 'semantic: origin_identifier' }),
    F('vessel_registration', 'string', { req: 1, label: 'Vessel Registration Certificate number', desc: 'semantic: operating_licence' }),
    F('fishing_licence', 'string', { req: 1, label: 'Fishing Licence Certificate number', desc: 'semantic: operating_licence' }),
    F('letter_of_authorisation', 'string', { label: 'Letter of Authorisation (high seas)', desc: 'semantic: operating_licence' }),
    F('vessel_class', 'enum', { req: 1, label: 'Vessel class', options: E.VesselClass, desc: 'semantic: origin_attribute; reference -> vessel_classes registry' }),
    F('catch_lot', 'string', { req: 1, label: 'Catch lot', desc: 'semantic: lot_identifier' }),
    F('catch_area', 'enum', { req: 1, label: 'Catch area', options: E.CatchArea, desc: 'semantic: catch_area' }),
    F('trip_start', 'date', { req: 1, label: 'Trip start date', desc: 'semantic: event_date' }),
    F('trip_end', 'date', { req: 1, label: 'Trip end date', desc: 'semantic: event_date' }),
    F('capture_date', 'date', { req: 1, label: 'Capture date', desc: 'semantic: capture_date' }),
    F('gear_type', 'enum', { req: 1, label: 'Gear type', options: E.GearType, desc: 'semantic: gear_type; reference -> gear_types registry' }),
    F('species', 'enum', { req: 1, label: 'Species', options: E.SpeciesWild, desc: 'semantic: species; reference -> species registry' }),
    F('weight', 'float', { req: 1, label: 'Catch weight', unit: 'kg', desc: 'semantic: weight; min 0' }),
    F('position_source', 'enum', { req: 1, label: 'Position and trip-date source', options: E.PositionSource, desc: 'semantic: position_source' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 68 - On-vessel processing (onvessel_processing_event) - Wild - parent: fishing_trip
 * ------------------------------------------------------------------ */
const OnvesselProcessingEvent = ENT(
  'traceability-ledger',
  'OnvesselProcessingEvent',
  'On-vessel processing (spec key: onvessel_processing_event) · Wild · on-chain · parent: fishing_trip · Used at stage(s): stage_onvessel_processing · plural: On-vessel processing events',
  [
    ID(),
    F('lot_ref', 'string', { req: 1, label: 'Catch lot', desc: 'semantic: lot_identifier' }),
    F('product_form', 'enum', { req: 1, label: 'Product form after processing', options: E.ProductFormWild, desc: 'semantic: product_form; reference -> product_forms registry' }),
    F('processed_weight', 'float', { req: 1, label: 'Weight after processing', unit: 'kg', desc: 'semantic: weight; min 0' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 69 - Transhipment (transhipment_event) - Wild - parent: fishing_trip
 * ------------------------------------------------------------------ */
const TranshipmentEvent = ENT(
  'traceability-ledger',
  'TranshipmentEvent',
  'Transhipment (spec key: transhipment_event) · Wild · on-chain · parent: fishing_trip · Used at stage(s): stage_transhipment · plural: Transhipments',
  [
    ID(),
    F('lot_ref', 'string', { req: 1, label: 'Catch lot', desc: 'semantic: lot_identifier' }),
    F('carrier_vessel_name', 'string', { req: 1, label: 'Carrier vessel name', desc: 'semantic: party_identifier' }),
    F('carrier_vessel_id', 'string', { req: 1, label: 'Carrier vessel identification', desc: 'semantic: party_identifier' }),
    F('carrier_flag', 'enum', { req: 1, label: 'Carrier flag', options: E.CarrierFlag, desc: 'semantic: origin_attribute' }),
    F('location', 'json', { req: 1, label: 'Transhipment location', desc: `semantic: geo_position; ${GEO}` }),
    F('tranship_date', 'date', { req: 1, label: 'Transhipment date', desc: 'semantic: event_date' }),
    F('authorisation', 'string', { req: 1, label: 'Transhipment authorisation', desc: 'semantic: operating_licence' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 70 - Landing (landing_event) - Wild - parent: fishing_trip
 * ------------------------------------------------------------------ */
const LandingEvent = ENT(
  'traceability-ledger',
  'LandingEvent',
  'Landing (spec key: landing_event) · Wild · on-chain · parent: fishing_trip · Used at stage(s): stage_landing · plural: Landings',
  [
    ID(),
    F('lot_ref', 'string', { req: 1, label: 'Catch lot', desc: 'semantic: lot_identifier' }),
    F('landing_location', 'enum', { req: 1, label: 'Landing location', options: E.FishingHarbour, desc: 'semantic: location_identifier' }),
    F('landing_date', 'date', { req: 1, label: 'Landing date', desc: 'semantic: event_date' }),
    F('landing_authorisation', 'string', { label: 'Landing authorisation', desc: 'semantic: operating_licence' }),
    F('landed_weight', 'float', { req: 1, label: 'Landed weight', unit: 'kg', desc: 'semantic: weight; min 0' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * TABLE 71 - Auction and first sale (auction_event) - Wild - parent: fishing_trip
 * ------------------------------------------------------------------ */
const AuctionEvent = ENT(
  'traceability-ledger',
  'AuctionEvent',
  'Auction and first sale (spec key: auction_event) · Wild · on-chain · parent: fishing_trip · Used at stage(s): stage_auction · plural: Auctions and first sales',
  [
    ID(),
    F('merchant_lot', 'string', { req: 1, label: 'Merchant lot', desc: 'semantic: child_lot_ref' }),
    F('contributing_lots', 'text', { req: 1, label: 'Contributing catch lots', desc: 'semantic: parent_lot_ref' }),
    F('buyer', 'string', { req: 1, label: 'Buyer (merchant or agent)', desc: 'semantic: party_identifier' }),
    F('weight', 'float', { req: 1, label: 'Lot weight', unit: 'kg', desc: 'semantic: quantity; min 0' }),
    F('sale_date', 'date', { req: 1, label: 'Sale date', desc: 'semantic: event_date' }),
    ...CHAIN(),
  ],
  { onChain: true, access: ACCESS.AUTH },
);

/* ------------------------------------------------------------------ *
 * The 28 forms, in spec order (TABLES 44-71)
 * ------------------------------------------------------------------ */
const FORMS = [
  Organisation,             // 44
  ProcessingPlant,          // 45
  ProcessingBatch,          // 46
  LabReport,                // 47
  HandlingEvent,            // 48
  TransportEvent,           // 49
  ShipReceiveEvent,         // 50
  LotTransformEvent,        // 51
  Consignment,              // 52
  Certificate,              // 53
  DocumentAnchor,           // 54
  CustomsEvent,             // 55
  ShippingEvent,            // 56
  ImportEvent,              // 57
  DistributionEvent,        // 58
  RetailEvent,              // 59
  CropCycle,                // 60
  BroodstockEvent,          // 61
  HatcheryEvent,            // 62
  InputApplicationEvent,    // 63
  GrowoutReading,           // 64
  SamplingEvent,            // 65
  HarvestEvent,             // 66
  FishingTrip,              // 67
  OnvesselProcessingEvent,  // 68
  TranshipmentEvent,        // 69
  LandingEvent,             // 70
  AuctionEvent,             // 71
];

/* ------------------------------------------------------------------ *
 * Relationships
 *   - every form is anchored (ChainTransaction) and belongs to a TraceUnit
 *     (both entities are declared in the chain part file)
 *   - parent links follow §6 "parent:" and the §5 pipelines
 * ------------------------------------------------------------------ */
const FORM_RELS = [
  // Anchoring: every form -> ChainTransaction
  ['Organisation', 'ChainTransaction', 'relatedTo'],
  ['ProcessingPlant', 'ChainTransaction', 'relatedTo'],
  ['ProcessingBatch', 'ChainTransaction', 'relatedTo'],
  ['LabReport', 'ChainTransaction', 'relatedTo'],
  ['HandlingEvent', 'ChainTransaction', 'relatedTo'],
  ['TransportEvent', 'ChainTransaction', 'relatedTo'],
  ['ShipReceiveEvent', 'ChainTransaction', 'relatedTo'],
  ['LotTransformEvent', 'ChainTransaction', 'relatedTo'],
  ['Consignment', 'ChainTransaction', 'relatedTo'],
  ['Certificate', 'ChainTransaction', 'relatedTo'],
  ['DocumentAnchor', 'ChainTransaction', 'relatedTo'],
  ['CustomsEvent', 'ChainTransaction', 'relatedTo'],
  ['ShippingEvent', 'ChainTransaction', 'relatedTo'],
  ['ImportEvent', 'ChainTransaction', 'relatedTo'],
  ['DistributionEvent', 'ChainTransaction', 'relatedTo'],
  ['RetailEvent', 'ChainTransaction', 'relatedTo'],
  ['CropCycle', 'ChainTransaction', 'relatedTo'],
  ['BroodstockEvent', 'ChainTransaction', 'relatedTo'],
  ['HatcheryEvent', 'ChainTransaction', 'relatedTo'],
  ['InputApplicationEvent', 'ChainTransaction', 'relatedTo'],
  ['GrowoutReading', 'ChainTransaction', 'relatedTo'],
  ['SamplingEvent', 'ChainTransaction', 'relatedTo'],
  ['HarvestEvent', 'ChainTransaction', 'relatedTo'],
  ['FishingTrip', 'ChainTransaction', 'relatedTo'],
  ['OnvesselProcessingEvent', 'ChainTransaction', 'relatedTo'],
  ['TranshipmentEvent', 'ChainTransaction', 'relatedTo'],
  ['LandingEvent', 'ChainTransaction', 'relatedTo'],
  ['AuctionEvent', 'ChainTransaction', 'relatedTo'],

  // Traceability: every form -> TraceUnit
  ['Organisation', 'TraceUnit', 'relatedTo'],
  ['ProcessingPlant', 'TraceUnit', 'relatedTo'],
  ['ProcessingBatch', 'TraceUnit', 'relatedTo'],
  ['LabReport', 'TraceUnit', 'relatedTo'],
  ['HandlingEvent', 'TraceUnit', 'relatedTo'],
  ['TransportEvent', 'TraceUnit', 'relatedTo'],
  ['ShipReceiveEvent', 'TraceUnit', 'relatedTo'],
  ['LotTransformEvent', 'TraceUnit', 'relatedTo'],
  ['Consignment', 'TraceUnit', 'relatedTo'],
  ['Certificate', 'TraceUnit', 'relatedTo'],
  ['DocumentAnchor', 'TraceUnit', 'relatedTo'],
  ['CustomsEvent', 'TraceUnit', 'relatedTo'],
  ['ShippingEvent', 'TraceUnit', 'relatedTo'],
  ['ImportEvent', 'TraceUnit', 'relatedTo'],
  ['DistributionEvent', 'TraceUnit', 'relatedTo'],
  ['RetailEvent', 'TraceUnit', 'relatedTo'],
  ['CropCycle', 'TraceUnit', 'relatedTo'],
  ['BroodstockEvent', 'TraceUnit', 'relatedTo'],
  ['HatcheryEvent', 'TraceUnit', 'relatedTo'],
  ['InputApplicationEvent', 'TraceUnit', 'relatedTo'],
  ['GrowoutReading', 'TraceUnit', 'relatedTo'],
  ['SamplingEvent', 'TraceUnit', 'relatedTo'],
  ['HarvestEvent', 'TraceUnit', 'relatedTo'],
  ['FishingTrip', 'TraceUnit', 'relatedTo'],
  ['OnvesselProcessingEvent', 'TraceUnit', 'relatedTo'],
  ['TranshipmentEvent', 'TraceUnit', 'relatedTo'],
  ['LandingEvent', 'TraceUnit', 'relatedTo'],
  ['AuctionEvent', 'TraceUnit', 'relatedTo'],

  // Farmed origin chain
  ['BroodstockEvent', 'CropCycle', 'oneToMany'],
  ['CropCycle', 'InputApplicationEvent', 'oneToMany'],
  ['CropCycle', 'GrowoutReading', 'oneToMany'],
  ['CropCycle', 'SamplingEvent', 'oneToMany'],
  ['CropCycle', 'HarvestEvent', 'oneToMany'],

  // Wild origin chain
  ['FishingTrip', 'OnvesselProcessingEvent', 'oneToMany'],
  ['FishingTrip', 'TranshipmentEvent', 'oneToMany'],
  ['FishingTrip', 'LandingEvent', 'oneToMany'],
  ['FishingTrip', 'AuctionEvent', 'oneToMany'],

  // Shared party / plant / batch chain
  ['Organisation', 'ProcessingPlant', 'oneToMany'],
  ['ProcessingPlant', 'ProcessingBatch', 'oneToMany'],

  // Export documentation chain
  ['Consignment', 'CustomsEvent', 'oneToMany'],
  ['Consignment', 'ShippingEvent', 'oneToMany'],
  ['Consignment', 'ImportEvent', 'oneToMany'],

  // Compliance
  ['ProcessingBatch', 'LabReport', 'relatedTo'],
];

/* ------------------------------------------------------------------ *
 * §5 stage key -> form entity (TABLES 42-43; 25 distinct keys)
 * ------------------------------------------------------------------ */
const STAGE_FORM_MAP = {
  // Farmed Aquaculture (TABLE 42)
  stage_broodstock: 'BroodstockEvent',
  stage_hatchery: 'HatcheryEvent',
  stage_stocking: 'CropCycle',
  stage_input_application: 'InputApplicationEvent',
  stage_growout: 'GrowoutReading',
  stage_sampling: 'SamplingEvent',
  stage_harvest: 'HarvestEvent',
  stage_farm_gate_receipt: 'ShipReceiveEvent',
  stage_preprocessing: 'HandlingEvent',
  // Wild Capture (TABLE 43)
  stage_fishing: 'FishingTrip',
  stage_onvessel_processing: 'OnvesselProcessingEvent',
  stage_transhipment: 'TranshipmentEvent',
  stage_landing: 'LandingEvent',
  stage_auction: 'AuctionEvent',
  stage_assembly: 'ShipReceiveEvent',
  stage_wholesale: 'ShipReceiveEvent',
  stage_cleaning: 'HandlingEvent',
  // Shared tail (both profiles)
  stage_processing: 'ProcessingBatch',
  stage_freezing_cold_storage: 'ProcessingBatch',
  stage_export_documentation: 'Consignment',
  stage_customs: 'CustomsEvent',
  stage_shipping: 'ShippingEvent',
  stage_import: 'ImportEvent',
  stage_distribution: 'DistributionEvent',
  stage_retail: 'RetailEvent',
};

module.exports = { FORMS, FORM_RELS, STAGE_FORM_MAP };
