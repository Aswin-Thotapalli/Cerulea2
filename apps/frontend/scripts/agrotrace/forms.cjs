/**
 * AgroTrace seed - stage data-entry forms (SPEC.md section 6, TABLES 17-43).
 *
 * Every form is a Studio entity homed on the 'ent-workflow' module. When a role
 * submits one, the field values become the ShipmentEvent.metadata payload that
 * gets anchored on AgroChain, which is why each form carries the CHAIN() proof
 * fields and is marked onChain.
 *
 * Exports: FORMS (27 entities), FORM_RELS, STAGE_FORM_MAP.
 */
const { E, ACCESS, F, ID, REF, CHAIN, ENT } = require('./_shared.cjs');

const HOME = 'ent-workflow';
const META = 'Fields become ShipmentEvent.metadata anchored on chain.';

/** The consignment reference carried by every logistics / processing stage form. */
const SHIP = () => REF('shipmentId', 'Shipment', 'The consignment this stage event belongs to');
/** The lot reference carried by the two pre-consignment forms. */
const LOT = () => REF('lotId', 'Lot', 'The lot this stage event belongs to');

/**
 * Small builder so the 27 form entities read as a table.
 * ref = SHIP() or LOT(); fields = the spec rows, in spec order.
 */
function FORM(name, role, eventType, status, ref, fields) {
  return ENT(
    HOME,
    name,
    `Stage form - ${role} · ${eventType} → ${status}. ${META}`,
    [ID(), ref, ...fields, ...CHAIN()],
    { onChain: true, access: ACCESS.AUTH }
  );
}

/* Reusable pick-lists transcribed from the spec. */
const PORTS_OF_LOADING = ['Nhava Sheva', 'Chennai', 'Visakhapatnam'];

/* ------------------------------------------------------------------ *
 * 6.0 Lot registration (shared)                            [TABLE 17] *
 * ------------------------------------------------------------------ */
const LotRegistrationForm = FORM(
  'LotRegistrationForm', 'Farmer', 'LOT_REGISTERED', 'lot created', LOT(), [
  F('variety', 'enum', { req: 1, label: 'Variety / cultivar', options: [...E.TurmericVariety, ...E.MangoVariety], desc: 'commodity-specific' }),
  F('farmName', 'string', { req: 1, label: 'Farm / orchard name' }),
  F('farmerName', 'string', { req: 1, label: 'Farmer legal name' }),
  F('village', 'string', { req: 1, label: 'Village' }),
  F('district', 'string', { req: 1, label: 'District' }),
  F('state', 'enum', { req: 1, label: 'State', options: E.IndianState, desc: 'Indian states' }),
  F('harvestDate', 'date', { req: 1, label: 'Harvest date' }),
  F('quantityKg', 'float', { req: 1, label: 'Total quantity', unit: 'kg' }),
  F('numUnits', 'int', { req: 1, label: 'Number of units' }),
  F('unitType', 'enum', { req: 1, label: 'Unit type', options: E.UnitType }),
  F('apedaRegNumber', 'string', { req: 1, label: 'APEDA registration number' }),
  F('fssaiLicense', 'string', { req: 1, label: 'FSSAI licence number' }),
  F('gpsCoordinates', 'string', { label: 'GPS coordinates', desc: 'optional lat/long' }),
  F('initialMoisturePct', 'float', { label: 'Initial moisture', unit: '%', desc: 'profile attribute (turmeric)' }),
  F('rawBatchValueInr', 'float', { label: 'Raw batch value', unit: 'INR', desc: 'profile attribute (turmeric)' }),
  F('soilType', 'string', { label: 'Soil type', desc: 'profile attribute (turmeric)' }),
]);

/* ------------------------------------------------------------------ *
 * 6.1 Residue test (shared)                                [TABLE 18] *
 * ------------------------------------------------------------------ */
const ResidueTestForm = FORM(
  'ResidueTestForm', 'Laboratory', 'RESIDUE_TEST_RECORDED', 'RESIDUE_TESTED', LOT(), [
  F('mrlStandard', 'enum', { req: 1, label: 'MRL standard', options: E.MrlStandard }),
  F('result', 'enum', { req: 1, label: 'Result', options: E.ResidueTestResult, desc: 'Form offers PASS / FAIL / CONDITIONAL_PASS; PENDING is the pre-submission state' }),
  F('labName', 'string', { req: 1, label: 'Laboratory' }),
  F('nablAccreditationNumber', 'string', { label: 'NABL accreditation number' }),
  F('reportReference', 'string', { req: 1, label: 'Report reference' }),
  F('reportDate', 'date', { req: 1, label: 'Report date' }),
  F('testedBy', 'string', { req: 1, label: 'Tested by' }),
  F('pesticideResults', 'json', { req: 1, label: 'Pesticide panel', desc: 'Table rows of {name, detectedPpm, mrlLimitPpm, result}' }),
  F('document', 'file', { label: 'Report document', desc: 'anchored by SHA-256 hash' }),
]);

/* ================================================================== *
 * 6.2 Turmeric stage forms                                            *
 * ================================================================== */

/* Boiling Unit                                             [TABLE 19] */
const TurmericCuringForm = FORM(
  'TurmericCuringForm', 'Boiling Unit', 'CURING_COMPLETED', 'advances the batch', SHIP(), [
  F('boilingLotId', 'string', { req: 1, label: 'Boiling lot ID' }),
  F('rawInputWeight', 'float', { req: 1, label: 'Raw rhizomes loaded', unit: 'kg' }),
  F('boilingDate', 'date', { req: 1, label: 'Boiling date' }),
  F('curingMethod', 'enum', { req: 1, label: 'Curing method', options: ['Open pan', 'Steam', 'Perforated drum boiling'] }),
  F('boilingDuration', 'int', { req: 1, label: 'Boiling duration', unit: 'min' }),
  F('alkalineAid', 'enum', { label: 'Alkaline aid added', options: ['None', 'Sodium bicarbonate', 'Slaked lime'] }),
  F('donenessIndicator', 'enum', { req: 1, label: 'Doneness check', options: ['froth+aroma', 'soft', 'underdone'] }),
  F('curedOutputWeight', 'float', { req: 1, label: 'Cured output weight', unit: 'kg' }),
  F('operatorNotes', 'text', { label: 'Operator notes' }),
]);

/* Drying Yard                                              [TABLE 20] */
const TurmericDryingForm = FORM(
  'TurmericDryingForm', 'Drying Yard', 'DRYING_COMPLETED', 'advances the batch', SHIP(), [
  F('dryingMethod', 'enum', { req: 1, label: 'Drying method', options: ['sun', 'raised platform', 'solar tunnel', 'mechanical'] }),
  F('dryingStartDate', 'date', { label: 'Drying start date' }),
  F('completionDate', 'date', { req: 1, label: 'Completion date' }),
  F('dryingDays', 'int', { req: 1, label: 'Number of drying days', unit: 'days' }),
  F('startMoisture', 'float', { label: 'Moisture at start', unit: '%' }),
  F('finalMoisture', 'float', { req: 1, label: 'Final moisture content', unit: '%' }),
  F('driedWeight', 'float', { req: 1, label: 'Weight after drying', unit: 'kg' }),
  F('turningFrequency', 'enum', { label: 'Turning frequency', options: ['Daily', 'Twice daily', 'Every 2 days', 'Not turned'], desc: 'Spec lists no options for this select; minimal sensible list supplied' }),
  F('remarks', 'text', { label: 'Remarks' }),
]);

/* Polishing Mill                                           [TABLE 21] */
const TurmericPolishingForm = FORM(
  'TurmericPolishingForm', 'Polishing Mill', 'POLISHING_COMPLETED', 'advances the batch', SHIP(), [
  F('polishingDate', 'date', { req: 1, label: 'Polishing date' }),
  F('polishingType', 'enum', { req: 1, label: 'Polishing type', options: ['manual', 'mechanical', 'water', 'colour-coated'] }),
  F('inputDriedKg', 'float', { req: 1, label: 'Input dried fingers', unit: 'kg' }),
  F('outputPolishedKg', 'float', { req: 1, label: 'Output polished fingers', unit: 'kg' }),
  F('polishingLossPct', 'float', { label: 'Polishing loss', unit: '%' }),
  F('numberOfDrumCycles', 'int', { label: 'Drum cycles' }),
  F('grade', 'enum', { req: 1, label: 'Grade / finger size', options: ['bulb', 'finger bold', 'medium', 'small', 'broken'] }),
  F('appearance', 'enum', { label: 'Appearance & colour', options: ['Bright yellow', 'Dull yellow', 'Orange-yellow', 'Uneven'], desc: 'Spec lists no options for this select; minimal sensible list supplied' }),
  F('remarks', 'text', { label: 'Remarks' }),
]);

/* Commission Agent                                         [TABLE 22] */
const TurmericMandiSaleForm = FORM(
  'TurmericMandiSaleForm', 'Commission Agent', 'MANDI_FIRST_SALE', 'advances the batch', SHIP(), [
  F('apmcMarketYard', 'enum', { req: 1, label: 'APMC market yard', options: ['Nizamabad', 'Armoor', 'Jagtial', 'Warangal', 'Bodhan'] }),
  F('mandiLotNumber', 'string', { req: 1, label: 'Mandi lot number' }),
  F('quantitySold', 'float', { req: 1, label: 'Quantity sold', unit: 'quintal' }),
  F('modalSalePrice', 'float', { req: 1, label: 'Modal sale price', unit: 'INR/quintal' }),
  F('buyerTraderName', 'string', { req: 1, label: 'Buyer / licensed trader' }),
  F('pattedReceiptNumber', 'string', { req: 1, label: 'APMC sale receipt (patti) no.' }),
  F('marketFeePercent', 'float', { req: 1, label: 'Market fee / commission', unit: '%' }),
  F('saleDate', 'date', { req: 1, label: 'Sale date' }),
]);

/* Processing Unit                                          [TABLE 23] */
const TurmericProcessingForm = FORM(
  'TurmericProcessingForm', 'Processing Unit', 'STERILISATION_GRINDING_COMPLETED', 'advances the batch', SHIP(), [
  F('batchCode', 'string', { req: 1, label: 'Processing batch code' }),
  F('processingDate', 'date', { req: 1, label: 'Sterilise & grind date' }),
  F('sterilisationMethod', 'enum', { req: 1, label: 'Sterilisation method', options: ['Steam (ETO-free)', 'ETO', 'Steam+microwave', 'Untreated'] }),
  F('grindMesh', 'int', { req: 1, label: 'Grind mesh', unit: 'mesh' }),
  F('curcuminContent', 'float', { req: 1, label: 'Curcumin content', unit: '%' }),
  F('outputPowderWeight', 'float', { req: 1, label: 'Output powder weight', unit: 'kg' }),
  F('packingType', 'enum', { req: 1, label: 'Packing type', options: ['LDPE-lined PP', 'HDPE drum', 'kraft', 'FIBC'] }),
  F('packSize', 'float', { req: 1, label: 'Pack size', unit: 'kg' }),
  F('processingNotes', 'text', { label: 'Processing notes' }),
]);

/* Laboratory quality assay                                 [TABLE 24] */
const TurmericLabAssayForm = FORM(
  'TurmericLabAssayForm', 'Laboratory', 'LAB_ASSAY_COMPLETED', 'advances the batch', SHIP(), [
  F('curcuminContent', 'float', { req: 1, label: 'Curcumin content', unit: '%' }),
  F('leadChromate', 'enum', { req: 1, label: 'Lead chromate', options: ['Negative', 'Detected'] }),
  F('ethyleneOxide', 'float', { req: 1, label: 'Ethylene oxide', unit: 'mg/kg' }),
  F('aflatoxinB1', 'float', { req: 1, label: 'Aflatoxin B1', unit: 'ppb' }),
  F('moisturePostProcess', 'float', { req: 1, label: 'Moisture (post-process)', unit: '%' }),
  F('mrlStandard', 'enum', { req: 1, label: 'MRL standard', options: ['EU', 'CODEX', 'FSSAI'], desc: 'Restricted subset of MrlStandard listed by the spec for this assay' }),
  F('labName', 'string', { req: 1, label: 'Laboratory' }),
  F('nablAccreditationNumber', 'string', { label: 'NABL number' }),
  F('reportReference', 'string', { label: 'Report reference' }),
  F('reportDate', 'date', { req: 1, label: 'Report date' }),
  F('testedBy', 'string', { label: 'Tested by' }),
]);

/* Spices Board Officer                                     [TABLE 25] */
const TurmericSpicesBoardForm = FORM(
  'TurmericSpicesBoardForm', 'Spices Board Officer', 'SPICES_BOARD_REGISTRATION_ISSUED', 'advances the batch', SHIP(), [
  F('spicesBoardCertNo', 'string', { req: 1, label: 'Spices Board certificate number' }),
  F('cresRegistrationNo', 'string', { req: 1, label: 'Exporter CRES / RCMC number' }),
  F('inspectionDate', 'date', { req: 1, label: 'Inspection date' }),
  F('issueDate', 'date', { req: 1, label: 'Issue date' }),
  F('validUpto', 'date', { req: 1, label: 'Valid upto' }),
  F('qualityGrade', 'enum', { req: 1, label: 'Quality grade', options: ['Nizamabad Bulb/Finger', 'Rajapore', 'Salem', 'Erode', 'NS'], desc: 'Spec lists these grades comma-separated rather than slash-separated' }),
  F('curcuminVerified', 'float', { req: 1, label: 'Curcumin verified', unit: '%' }),
  F('mrlComplianceStatus', 'enum', { req: 1, label: 'EU MRL / aflatoxin / ETO compliance', options: ['Compliant', 'Non-compliant'] }),
  F('officerRemarks', 'text', { label: 'Officer name, designation & remarks' }),
]);

/* Exporter                                                 [TABLE 26] */
const TurmericExportBookingForm = FORM(
  'TurmericExportBookingForm', 'Exporter', 'EXPORT_BOOKED', 'advances the batch', SHIP(), [
  F('exportContractNo', 'string', { req: 1, label: 'Export contract number' }),
  F('buyerName', 'string', { req: 1, label: 'Overseas buyer' }),
  F('destinationCountry', 'string', { req: 1, label: 'Destination country' }),
  F('incoterm', 'enum', { req: 1, label: 'Incoterm', options: E.Incoterm }),
  F('portOfLoading', 'enum', { req: 1, label: 'Port of loading', options: PORTS_OF_LOADING }),
  F('declaredFobValueUsd', 'float', { req: 1, label: 'Declared FOB value', unit: 'USD' }),
  F('bookingDate', 'date', { req: 1, label: 'Booking date' }),
]);

/* ================================================================== *
 * 6.3 Turmeric logistics forms                                        *
 * ================================================================== */

/* Freight Forwarder                                        [TABLE 27] */
const TurmericFreightHandoffForm = FORM(
  'TurmericFreightHandoffForm', 'Freight Forwarder', 'FREIGHT_HANDOFF', 'WITH_FORWARDER', SHIP(), [
  F('bookingNumber', 'string', { req: 1, label: 'Booking number' }),
  F('forwarderName', 'string', { req: 1, label: 'Freight forwarder' }),
  F('containerNumber', 'string', { req: 1, label: 'Container number' }),
  F('containerType', 'enum', { req: 1, label: 'Container type', options: ['20ft GP', '40ft GP', '40ft HC', '20ft Reefer'] }),
  F('sealNumber', 'string', { label: 'Seal number' }),
  F('handoffDate', 'date', { req: 1, label: 'Handoff date' }),
]);

/* Customs Broker                                           [TABLE 28] */
const TurmericCustomsClearanceForm = FORM(
  'TurmericCustomsClearanceForm', 'Customs Broker', 'CUSTOMS_CLEARED', 'CUSTOMS_CLEARED', SHIP(), [
  F('shippingBillNo', 'string', { req: 1, label: 'Shipping bill number' }),
  F('shippingBillDate', 'date', { req: 1, label: 'Shipping bill date' }),
  F('portOfLoading', 'enum', { req: 1, label: 'Port of loading', options: PORTS_OF_LOADING, desc: 'Spec lists no options for this select; reuses the Exporter port list (TABLE 26)' }),
  F('letExportOrderDate', 'date', { req: 1, label: 'Let Export Order (LEO) date' }),
  F('chaLicenseNo', 'string', { label: 'CHA licence number' }),
  F('remarks', 'text', { label: 'Remarks' }),
]);

/* Shipping Line                                            [TABLE 29] */
const TurmericVesselLoadingForm = FORM(
  'TurmericVesselLoadingForm', 'Shipping Line', 'VESSEL_LOADED', 'VESSEL_LOADED', SHIP(), [
  F('vesselName', 'string', { req: 1, label: 'Vessel name' }),
  F('voyageNumber', 'string', { req: 1, label: 'Voyage number' }),
  F('billOfLadingNo', 'string', { req: 1, label: 'Bill of lading number' }),
  F('loadingDate', 'date', { req: 1, label: 'Loading date' }),
  F('etaDestination', 'date', { label: 'ETA at destination' }),
  F('remarks', 'text', { label: 'Remarks' }),
]);

/* Destination Port                                         [TABLE 30] */
const TurmericVesselArrivalForm = FORM(
  'TurmericVesselArrivalForm', 'Destination Port', 'VESSEL_ARRIVED', 'ARRIVED', SHIP(), [
  F('arrivalDate', 'date', { req: 1, label: 'Arrival date' }),
  F('dischargePort', 'string', { req: 1, label: 'Discharge port' }),
  F('vesselName', 'string', { label: 'Vessel' }),
  F('outturnQuantityKg', 'float', { req: 1, label: 'Outturn quantity', unit: 'kg' }),
  F('containerCondition', 'enum', { req: 1, label: 'Container condition', options: ['Intact', 'minor damage', 'reefer alarm', 'seal broken'] }),
  F('remarks', 'text', { label: 'Remarks' }),
]);

/* Import Customs                                           [TABLE 31] */
const TurmericImportClearanceForm = FORM(
  'TurmericImportClearanceForm', 'Import Customs', 'IMPORT_CLEARED', 'advances the batch', SHIP(), [
  F('billOfEntryNo', 'string', { req: 1, label: 'Bill of Entry number' }),
  F('clearanceDate', 'date', { req: 1, label: 'Import clearance date' }),
  F('dutyVatPaidEur', 'float', { label: 'Duty and VAT paid', unit: 'EUR' }),
  F('examinationStatus', 'enum', { req: 1, label: 'Examination status', options: ['released', 'examined+released', 'documents verified'] }),
  F('importBrokerLicence', 'string', { label: 'Import broker / CHA licence' }),
  F('remarks', 'text', { label: 'Remarks' }),
]);

/* Overseas Buyer                                           [TABLE 32] */
const TurmericBuyerAcceptanceForm = FORM(
  'TurmericBuyerAcceptanceForm', 'Overseas Buyer', 'BUYER_ACCEPTANCE', 'DELIVERED', SHIP(), [
  F('grnNumber', 'string', { req: 1, label: 'Goods receipt (GRN) number' }),
  F('receivedCondition', 'enum', { req: 1, label: 'Received condition', options: ['Good', 'minor damage', 'major damage', 'short'] }),
  F('acceptanceDate', 'date', { req: 1, label: 'Acceptance date' }),
  F('remarks', 'text', { label: 'Remarks' }),
]);

/* ================================================================== *
 * 6.4 Mango stage forms                                               *
 * ================================================================== */

/* Packhouse                                                [TABLE 33] */
const MangoPackhouseForm = FORM(
  'MangoPackhouseForm', 'Packhouse', 'PACKHOUSE_PROCESSED', 'PACKHOUSE_PROCESSED', SHIP(), [
  F('acceptedKg', 'float', { req: 1, label: 'Accepted quantity', unit: 'kg' }),
  F('rejectedKg', 'float', { req: 1, label: 'Rejected quantity', unit: 'kg' }),
  F('gradeBreakdown', 'string', { req: 1, label: 'Grade A/B/C breakdown', unit: '%' }),
  F('boxCount', 'int', { req: 1, label: 'Total box count' }),
  F('packhouseRegNumber', 'string', { req: 1, label: 'Packhouse registration number' }),
]);

/* Treatment Facility                                       [TABLE 34] */
const MangoTreatmentForm = FORM(
  'MangoTreatmentForm', 'Treatment Facility', 'TREATMENT_COMPLETED', 'TREATED', SHIP(), [
  F('treatmentType', 'enum', { req: 1, label: 'Treatment type', options: ['VHT', 'HWT'] }),
  F('temperatureCelsius', 'float', { req: 1, label: 'Temperature', unit: '°C' }),
  F('durationMinutes', 'int', { req: 1, label: 'Duration', unit: 'min' }),
  F('coreTemperatureAchieved', 'float', { req: 1, label: 'Core temperature achieved', unit: '°C' }),
  F('certificateReference', 'string', { req: 1, label: 'Treatment certificate reference' }),
]);

/* NPPO Inspector                                           [TABLE 35] */
const MangoPhytoCertificateForm = FORM(
  'MangoPhytoCertificateForm', 'NPPO Inspector', 'PHYTO_CERTIFICATE_ISSUED', 'PHYTO_CLEARED', SHIP(), [
  F('certificateNumber', 'string', { req: 1, label: 'Certificate number' }),
  F('issueDate', 'date', { req: 1, label: 'Issue date' }),
  F('validityDate', 'date', { label: 'Validity date' }),
  F('pestFindings', 'string', { req: 1, label: 'Pest findings', desc: 'e.g. Nil' }),
]);

/* APEDA Officer - Certificate of Origin                    [TABLE 36] */
const MangoCOOForm = FORM(
  'MangoCOOForm', 'APEDA Officer', 'COO_ISSUED', 'APEDA_CERTIFIED', SHIP(), [
  F('certificateNumber', 'string', { req: 1, label: 'COO number' }),
  F('issueDate', 'date', { req: 1, label: 'Issue date' }),
  F('hsCode', 'string', { req: 1, label: 'HS code' }),
]);

/* APEDA Officer - Export inspection                        [TABLE 37] */
const MangoExportInspectionForm = FORM(
  'MangoExportInspectionForm', 'APEDA Officer', 'EXPORT_INSPECTION_ISSUED', 'advances the batch', SHIP(), [
  F('certificateNumber', 'string', { req: 1, label: 'EIC number' }),
  F('inspectionDate', 'date', { req: 1, label: 'Inspection date' }),
  F('sampleSize', 'float', { label: 'Sample size', unit: 'kg' }),
  F('resultsSummary', 'string', { label: 'Results summary' }),
]);

/* Customs                                                  [TABLE 38] */
const MangoCustomsClearanceForm = FORM(
  'MangoCustomsClearanceForm', 'Customs', 'CUSTOMS_CLEARED', 'CUSTOMS_CLEARED', SHIP(), [
  F('shippingBillNumber', 'string', { req: 1, label: 'Shipping bill number' }),
  F('shippingBillDate', 'date', { req: 1, label: 'Shipping bill date' }),
  F('leoDate', 'date', { req: 1, label: 'LEO date' }),
  F('leoNumber', 'string', { req: 1, label: 'LEO number' }),
  F('icegateReference', 'string', { label: 'ICEGATE reference' }),
]);

/* Cold Storage                                             [TABLE 39] */
const MangoColdStorageEntryForm = FORM(
  'MangoColdStorageEntryForm', 'Cold Storage', 'COLD_STORAGE_ENTRY', 'IN_COLD_STORAGE', SHIP(), [
  F('facilityName', 'string', { req: 1, label: 'Cold storage facility' }),
  F('targetTempMinCelsius', 'float', { req: 1, label: 'Min target temperature', unit: '°C' }),
  F('targetTempMaxCelsius', 'float', { req: 1, label: 'Max target temperature', unit: '°C' }),
  F('actualTempAtEntry', 'float', { req: 1, label: 'Actual temperature at entry', unit: '°C' }),
  F('palletCount', 'int', { req: 1, label: 'Pallet count' }),
]);

/* Freight Forwarder                                        [TABLE 40] */
const MangoCustodyTransferForm = FORM(
  'MangoCustodyTransferForm', 'Freight Forwarder', 'CUSTODY_TRANSFER', 'WITH_FORWARDER', SHIP(), [
  F('fromOrganisation', 'string', { req: 1, label: 'Transferring organisation' }),
  F('toOrganisation', 'string', { req: 1, label: 'Receiving organisation' }),
  F('location', 'string', { req: 1, label: 'Location / port' }),
  F('quantityKg', 'float', { req: 1, label: 'Quantity', unit: 'kg' }),
  F('conditionNotes', 'string', { label: 'Condition notes' }),
]);

/* Shipping Line                                            [TABLE 41] */
const MangoVesselLoadingForm = FORM(
  'MangoVesselLoadingForm', 'Shipping Line', 'VESSEL_LOADED', 'VESSEL_LOADED', SHIP(), [
  F('vesselName', 'string', { req: 1, label: 'Vessel name' }),
  F('voyageNumber', 'string', { req: 1, label: 'Voyage number' }),
  F('blNumber', 'string', { req: 1, label: 'Bill of lading number' }),
  F('blDate', 'date', { label: 'B/L date' }),
  F('portOfLoading', 'string', { req: 1, label: 'Port of loading' }),
  F('portOfDischarge', 'string', { req: 1, label: 'Port of discharge' }),
  F('eta', 'date', { label: 'ETA' }),
]);

/* Overseas Buyer - Arrival                                 [TABLE 42] */
const MangoBuyerArrivalForm = FORM(
  'MangoBuyerArrivalForm', 'Overseas Buyer', 'BUYER_ARRIVAL', 'ARRIVED', SHIP(), [
  F('arrivalDate', 'date', { req: 1, label: 'Arrival date' }),
  F('portOfDischarge', 'string', { req: 1, label: 'Port of discharge' }),
  F('importInspectionFindings', 'string', { label: 'Import inspection findings' }),
]);

/* Overseas Buyer - Acceptance                              [TABLE 43] */
const MangoBuyerAcceptanceForm = FORM(
  'MangoBuyerAcceptanceForm', 'Overseas Buyer', 'BUYER_ACCEPTANCE', 'DELIVERED', SHIP(), [
  F('acceptanceDate', 'date', { req: 1, label: 'Acceptance date' }),
  F('conditionNotes', 'string', { label: 'Condition notes' }),
]);

/* ------------------------------------------------------------------ */

const FORMS = [
  // shared
  LotRegistrationForm,
  ResidueTestForm,
  // turmeric
  TurmericCuringForm,
  TurmericDryingForm,
  TurmericPolishingForm,
  TurmericMandiSaleForm,
  TurmericProcessingForm,
  TurmericLabAssayForm,
  TurmericSpicesBoardForm,
  TurmericExportBookingForm,
  TurmericFreightHandoffForm,
  TurmericCustomsClearanceForm,
  TurmericVesselLoadingForm,
  TurmericVesselArrivalForm,
  TurmericImportClearanceForm,
  TurmericBuyerAcceptanceForm,
  // mango
  MangoPackhouseForm,
  MangoTreatmentForm,
  MangoPhytoCertificateForm,
  MangoCOOForm,
  MangoExportInspectionForm,
  MangoCustomsClearanceForm,
  MangoColdStorageEntryForm,
  MangoCustodyTransferForm,
  MangoVesselLoadingForm,
  MangoBuyerArrivalForm,
  MangoBuyerAcceptanceForm,
];

/** [formEntityName, targetEntityName, relationKind] */
const FORM_RELS = [
  ['LotRegistrationForm', 'Lot', 'relatedTo'],
  ['ResidueTestForm', 'ResidueTest', 'relatedTo'],
  ['TurmericCuringForm', 'Shipment', 'relatedTo'],
  ['TurmericDryingForm', 'Shipment', 'relatedTo'],
  ['TurmericPolishingForm', 'Shipment', 'relatedTo'],
  ['TurmericMandiSaleForm', 'Shipment', 'relatedTo'],
  ['TurmericProcessingForm', 'Shipment', 'relatedTo'],
  ['TurmericLabAssayForm', 'Shipment', 'relatedTo'],
  ['TurmericSpicesBoardForm', 'Shipment', 'relatedTo'],
  ['TurmericExportBookingForm', 'Shipment', 'relatedTo'],
  ['TurmericFreightHandoffForm', 'Shipment', 'relatedTo'],
  ['TurmericCustomsClearanceForm', 'Shipment', 'relatedTo'],
  ['TurmericVesselLoadingForm', 'Shipment', 'relatedTo'],
  ['TurmericVesselArrivalForm', 'Shipment', 'relatedTo'],
  ['TurmericImportClearanceForm', 'Shipment', 'relatedTo'],
  ['TurmericBuyerAcceptanceForm', 'Shipment', 'relatedTo'],
  ['MangoPackhouseForm', 'Shipment', 'relatedTo'],
  ['MangoTreatmentForm', 'Shipment', 'relatedTo'],
  ['MangoPhytoCertificateForm', 'Shipment', 'relatedTo'],
  ['MangoCOOForm', 'Shipment', 'relatedTo'],
  ['MangoExportInspectionForm', 'Shipment', 'relatedTo'],
  ['MangoCustomsClearanceForm', 'Shipment', 'relatedTo'],
  ['MangoColdStorageEntryForm', 'Shipment', 'relatedTo'],
  ['MangoCustodyTransferForm', 'Shipment', 'relatedTo'],
  ['MangoVesselLoadingForm', 'Shipment', 'relatedTo'],
  ['MangoBuyerArrivalForm', 'Shipment', 'relatedTo'],
  ['MangoBuyerAcceptanceForm', 'Shipment', 'relatedTo'],
];

/**
 * EVENT_TYPE -> form entity name.
 *
 * Three event types are recorded by both commodity chains with different field
 * sets (CUSTOMS_CLEARED, VESSEL_LOADED, BUYER_ACCEPTANCE), so those keys are
 * qualified with the commodity - 'TURMERIC.CUSTOMS_CLEARED' etc. - to keep all
 * 27 forms addressable. Every other key is the bare EVENT_TYPE.
 */
const STAGE_FORM_MAP = {
  // shared
  LOT_REGISTERED: 'LotRegistrationForm',
  RESIDUE_TEST_RECORDED: 'ResidueTestForm',
  // turmeric
  CURING_COMPLETED: 'TurmericCuringForm',
  DRYING_COMPLETED: 'TurmericDryingForm',
  POLISHING_COMPLETED: 'TurmericPolishingForm',
  MANDI_FIRST_SALE: 'TurmericMandiSaleForm',
  STERILISATION_GRINDING_COMPLETED: 'TurmericProcessingForm',
  LAB_ASSAY_COMPLETED: 'TurmericLabAssayForm',
  SPICES_BOARD_REGISTRATION_ISSUED: 'TurmericSpicesBoardForm',
  EXPORT_BOOKED: 'TurmericExportBookingForm',
  FREIGHT_HANDOFF: 'TurmericFreightHandoffForm',
  'TURMERIC.CUSTOMS_CLEARED': 'TurmericCustomsClearanceForm',
  'TURMERIC.VESSEL_LOADED': 'TurmericVesselLoadingForm',
  VESSEL_ARRIVED: 'TurmericVesselArrivalForm',
  IMPORT_CLEARED: 'TurmericImportClearanceForm',
  'TURMERIC.BUYER_ACCEPTANCE': 'TurmericBuyerAcceptanceForm',
  // mango
  PACKHOUSE_PROCESSED: 'MangoPackhouseForm',
  TREATMENT_COMPLETED: 'MangoTreatmentForm',
  PHYTO_CERTIFICATE_ISSUED: 'MangoPhytoCertificateForm',
  COO_ISSUED: 'MangoCOOForm',
  EXPORT_INSPECTION_ISSUED: 'MangoExportInspectionForm',
  'MANGO.CUSTOMS_CLEARED': 'MangoCustomsClearanceForm',
  COLD_STORAGE_ENTRY: 'MangoColdStorageEntryForm',
  CUSTODY_TRANSFER: 'MangoCustodyTransferForm',
  'MANGO.VESSEL_LOADED': 'MangoVesselLoadingForm',
  BUYER_ARRIVAL: 'MangoBuyerArrivalForm',
  'MANGO.BUYER_ACCEPTANCE': 'MangoBuyerAcceptanceForm',
};

module.exports = { FORMS, FORM_RELS, STAGE_FORM_MAP };
