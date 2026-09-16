/**
 * AgroTrace seed - core entities and relationships.
 *
 * Transcribed from SPEC.md: Section 1 (pick-lists), Section 2 (collections),
 * Section 3 (AgroChain), Section 4 (roles), Section 8 (screens),
 * Section 9 (access) and Section 10 (localisation).
 *
 * Every entity is homed on a moduleId that exists on the blueprint.
 * Relationships are declared by entity NAME and resolved to ids by the seeder.
 */
const { E, ACCESS, F, ID, REF, CHAIN, ENT } = require('./_shared.cjs');

/** A foreign key that lives on the ledger itself (chain collections store everything on-chain). */
const ONREF = (name, label, desc) =>
  F(name, 'uuid', { storage: 'on-chain', req: 1, idx: 1, label, desc });

/** Group buckets used by the documentary Role table (Section 4). */
const ROLE_GROUPS = [
  'Platform',
  'Exporter',
  'Farm',
  'Laboratory',
  'Turmeric chain',
  'Mango chain',
  'Shared logistics',
  'Buyer',
];

// ---------------------------------------------------------------------------
// 1. Organisation, identity and access (Sections 2, 4, 9)
// ---------------------------------------------------------------------------

const Tenant = ENT(
  'org-accounts',
  'Tenant',
  'One per exporter organisation. The isolation boundary: every other collection is scoped to a tenant and a user only ever sees their own (Section 9, tenant isolation).',
  [
    ID(),
    F('legalName', 'string', { req: 1, idx: 1, label: 'Legal name' }),
    F('apedaRegistrationNumber', 'string', { label: 'APEDA registration number' }),
    F('gstin', 'string', { label: 'GSTIN' }),
    F('primaryContactName', 'string', { label: 'Primary contact name' }),
    F('primaryContactEmail', 'string', { label: 'Primary contact email' }),
    F('primaryContactPhone', 'string', { label: 'Primary contact phone' }),
    F('status', 'enum', { req: 1, label: 'Status', options: E.TenantStatus, def: 'PENDING_APPROVAL' }),
    F('subscriptionTier', 'enum', { req: 1, label: 'Subscription tier', options: E.SubscriptionTier, def: 'STARTER' }),
    F('maxActiveShipments', 'int', { label: 'Max active shipments', unit: 'shipments' }),
    F('maxParticipantAccounts', 'int', { label: 'Max participant accounts', unit: 'accounts' }),
    F('createdAt', 'datetime', { label: 'Created at' }),
  ],
  { core: true, access: ACCESS.ADM }
);

const User = ENT(
  'rbac',
  'User',
  'A participant login. Belongs to one tenant, carries exactly one role and one deterministic wallet, and is scoped to one commodity profile (Section 9, profile scoping).',
  [
    ID(),
    REF('tenantId', 'Tenant', 'The organisation this login belongs to'),
    F('role', 'enum', { req: 1, idx: 1, label: 'Role', options: E.UserRole, desc: 'One role per login - roles are the actors in the chain' }),
    F('email', 'string', { req: 1, uniq: 1, idx: 1, label: 'Email' }),
    F('passwordHash', 'string', { req: 1, enc: 1, label: 'Password hash' }),
    F('fullName', 'string', { req: 1, label: 'Full name' }),
    F('organisationName', 'string', { label: 'Organisation name' }),
    F('walletAddress', 'address', { idx: 1, label: 'Wallet address', desc: 'Deterministic 0x + 40 hex address; every event is attributed to it' }),
    F('status', 'enum', { req: 1, label: 'Status', options: E.UserStatus, def: 'INVITED' }),
    F('commodityKey', 'enum', { label: 'Commodity profile', options: E.Commodity, desc: 'Profile scope: the chain this user works on' }),
    F('isSuperAdmin', 'boolean', { label: 'Super admin', desc: 'A platform admin flagged isSuperAdmin adds user management on top' }),
    F('lastLoginAt', 'datetime', { label: 'Last login at' }),
    F('createdAt', 'datetime', { label: 'Created at' }),
  ],
  { core: true, access: ACCESS.AUTH }
);

const Role = ENT(
  'rbac',
  'Role',
  'The documentary role table of Section 4: each participant logs in with one role, and roles are the actors in the chain. Twenty-one roles across eight groups.',
  [
    ID(),
    F('code', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Role code', options: E.UserRole }),
    F('name', 'string', { req: 1, label: 'Display name' }),
    F('group', 'enum', { req: 1, label: 'Group', options: ROLE_GROUPS, desc: 'Platform, Exporter, Farm, Laboratory, Turmeric chain, Mango chain, Shared logistics or Buyer' }),
    F('duty', 'text', { label: 'Duty', desc: 'What this role does in the chain (Section 4)' }),
    F('isChainActor', 'boolean', { label: 'Chain actor', desc: 'True when actions by this role are signed with the actor wallet and anchored' }),
    F('recordsEvents', 'boolean', { label: 'Records events', desc: 'True when this role has a work queue and records a stage event' }),
  ],
  { access: ACCESS.ADM }
);

const Wallet = ENT(
  'wallet-auth',
  'Wallet',
  'The deterministic wallet issued to every participant. No crypto, no gas, no external wallet: users never touch a key (Section 3).',
  [
    ID(),
    F('userId', 'uuid', { req: 1, uniq: 1, idx: 1, label: 'User', desc: 'Exactly one wallet per user' }),
    F('address', 'address', { req: 1, uniq: 1, idx: 1, label: 'Wallet address', desc: '0x + 40 hex' }),
    F('derivation', 'enum', { req: 1, label: 'Derivation', options: ['DETERMINISTIC'], def: 'DETERMINISTIC' }),
    F('createdAt', 'datetime', { label: 'Created at' }),
  ],
  { access: ACCESS.AUTH }
);

const AuthSession = ENT(
  'session-keys',
  'AuthSession',
  'A live JWT session: access token plus refresh token (Section 9, auth). Revoking the row kills the refresh chain.',
  [
    ID(),
    REF('userId', 'User', 'The signed-in participant'),
    F('refreshTokenHash', 'bytes32', { req: 1, idx: 1, enc: 1, label: 'Refresh token hash' }),
    F('accessTokenJti', 'string', { idx: 1, label: 'Access token JTI' }),
    F('issuedAt', 'datetime', { req: 1, label: 'Issued at' }),
    F('expiresAt', 'datetime', { req: 1, label: 'Expires at' }),
    F('revokedAt', 'datetime', { label: 'Revoked at' }),
    F('deviceInfo', 'string', { label: 'Device info' }),
  ],
  { access: ACCESS.AUTH }
);

const LoginAttempt = ENT(
  'rate-limit',
  'LoginAttempt',
  'Login-attempt throttling (Section 9): repeated failures for an email lock the account until lockedUntil.',
  [
    ID(),
    F('email', 'string', { req: 1, idx: 1, label: 'Email' }),
    F('ipAddress', 'string', { label: 'IP address' }),
    F('succeeded', 'boolean', { label: 'Succeeded' }),
    F('attemptedAt', 'datetime', { req: 1, label: 'Attempted at' }),
    F('lockedUntil', 'datetime', { label: 'Locked until' }),
  ],
  { access: ACCESS.SYS }
);

const PasswordHistory = ENT(
  'rate-limit',
  'PasswordHistory',
  'Password history (Section 9): previous hashes kept so a participant cannot re-use a recent password.',
  [
    ID(),
    REF('userId', 'User', 'The participant whose password changed'),
    F('passwordHash', 'string', { req: 1, enc: 1, label: 'Password hash' }),
    F('changedAt', 'datetime', { req: 1, label: 'Changed at' }),
  ],
  { access: ACCESS.SYS }
);

// ---------------------------------------------------------------------------
// 2. Traceability core (Sections 2, 5, 7)
// ---------------------------------------------------------------------------

const Lot = ENT(
  'traceability-ledger',
  'Lot',
  'The harvest batch. Origin of the chain. Lot ids are LOT-<CODE>-YYYY-NNNN (TURM, MANGO). Read is tenant-scoped here: the no-login public journey is served by a separate QR-scoped verify endpoint (Section 8, Public Verify).',
  [
    ID(),
    REF('tenantId', 'Tenant', 'Owning exporter organisation'),
    F('lotId', 'string', { req: 1, uniq: 1, idx: 1, label: 'Lot ID', desc: 'LOT-<COMMODITY>-YYYY-NNNN, code derived from the lot commodity' }),
    F('commodityKey', 'enum', { req: 1, idx: 1, label: 'Commodity', options: E.Commodity }),
    F('variety', 'string', { req: 1, label: 'Variety / cultivar', desc: 'Commodity-specific: ALPHONSO, KESAR, BANGANAPALLI, DASHERI for mango; ARMOOR_NIZAMABAD, LAKADONG for turmeric' }),
    F('attributes', 'json', { label: 'Profile attributes', desc: 'Profile-specific extras, e.g. turmeric initial moisture, raw batch value, soil type' }),
    F('farmName', 'string', { req: 1, label: 'Farm / orchard name' }),
    F('farmerName', 'string', { req: 1, label: 'Farmer legal name' }),
    F('village', 'string', { req: 1, label: 'Village' }),
    F('district', 'string', { req: 1, label: 'District' }),
    F('state', 'enum', { req: 1, label: 'State', options: E.IndianState }),
    F('harvestDate', 'date', { req: 1, label: 'Harvest date' }),
    F('quantityKg', 'float', { req: 1, label: 'Total quantity', unit: 'kg' }),
    F('numUnits', 'int', { req: 1, label: 'Number of units' }),
    F('unitType', 'enum', { req: 1, label: 'Unit type', options: E.UnitType }),
    F('apedaRegNumber', 'string', { req: 1, label: 'APEDA registration number' }),
    F('fssaiLicense', 'string', { req: 1, label: 'FSSAI licence number' }),
    F('gpsCoordinates', 'string', { label: 'GPS coordinates', desc: 'Optional lat/long captured in the field' }),
    F('status', 'enum', { req: 1, idx: 1, label: 'Status', options: E.LotStatus, def: 'REGISTERED' }),
    ...CHAIN(),
    REF('registeredById', 'Registered by', 'The farmer or exporter account that registered the lot'),
    F('registeredAt', 'datetime', { label: 'Registered at' }),
  ],
  { core: true, access: ACCESS.AUTH, onChain: true }
);

const Shipment = ENT(
  'traceability-ledger',
  'Shipment',
  'The export consignment. Carries the chain of custody events and the compliance score. Read is tenant-scoped; the public journey is served by the separate QR-scoped verify endpoint (Section 8).',
  [
    ID(),
    REF('tenantId', 'Tenant', 'Owning exporter organisation'),
    F('shipmentId', 'string', { req: 1, uniq: 1, idx: 1, label: 'Shipment ID' }),
    REF('lotId', 'Lot', 'The harvest batch being exported'),
    F('originPortCode', 'string', { label: 'Origin port code' }),
    F('destinationPortCode', 'string', { label: 'Destination port code' }),
    F('destinationCountry', 'string', { label: 'Destination country' }),
    F('incoterm', 'enum', { label: 'Incoterm', options: E.Incoterm }),
    F('declaredFobValueUsd', 'float', { label: 'Declared FOB value', unit: 'USD' }),
    F('hsCode', 'string', { label: 'HS code' }),
    F('vesselName', 'string', { label: 'Vessel name' }),
    F('voyageNumber', 'string', { label: 'Voyage number' }),
    F('expectedLoadingDate', 'date', { label: 'Expected loading date' }),
    F('actualLoadingDate', 'date', { label: 'Actual loading date' }),
    F('etaDestination', 'date', { label: 'ETA at destination' }),
    F('currentStatus', 'enum', { req: 1, idx: 1, label: 'Current status', options: E.ShipmentStatus, def: 'REGISTERED', desc: 'Queues are driven by status: a role sees the shipments sitting at the status it acts on' }),
    F('complianceScore', 'float', { label: 'Compliance score', unit: '%' }),
    F('hasBreach', 'boolean', { label: 'Has breach', desc: 'Set by a cold-chain excursion, which also records a BREACH_RECORDED transaction' }),
    F('breachType', 'enum', { label: 'Breach type', options: E.BreachType }),
    ...CHAIN(),
    REF('createdById', 'Created by', 'The exporter account that booked the consignment'),
    F('createdAt', 'datetime', { label: 'Created at' }),
  ],
  { core: true, access: ACCESS.AUTH, onChain: true }
);

const ShipmentEvent = ENT(
  'traceability-ledger',
  'ShipmentEvent',
  'One recorded step in the chain of custody. The atomic on-chain event: each event type maps to a resulting ShipmentStatus (Section 5) and its form fields become the anchored metadata (Section 6). Read is tenant-scoped; the QR-scoped verify endpoint exposes the timeline publicly.',
  [
    ID(),
    REF('shipmentId', 'Shipment', 'The consignment this step belongs to'),
    F('eventType', 'enum', { req: 1, idx: 1, label: 'Event type', options: E.EventType }),
    F('eventLabel', 'string', { label: 'Event label' }),
    REF('actorUserId', 'Actor', 'The participant who recorded the step'),
    F('actorWalletAddress', 'address', { label: 'Actor wallet address', desc: 'Signed action: every event is attributed to its actor wallet' }),
    F('actorOrganisation', 'string', { label: 'Actor organisation' }),
    F('actorRole', 'enum', { label: 'Actor role', options: E.UserRole }),
    F('metadata', 'json', { label: 'Metadata', desc: 'The stage form fields of Section 6, anchored on chain' }),
    F('recordedAt', 'datetime', { req: 1, label: 'Recorded at' }),
    ...CHAIN(),
  ],
  { core: true, access: ACCESS.AUTH, onChain: true }
);

const CommodityProfile = ENT(
  'traceability-ledger',
  'CommodityProfile',
  'A commodity chain as a product: two profiles ship today, Turmeric and Mango, on one engine (Section 5).',
  [
    ID(),
    F('commodityKey', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Commodity', options: E.Commodity }),
    F('name', 'string', { req: 1, label: 'Profile name' }),
    F('lotCode', 'enum', { req: 1, label: 'Lot code', options: E.LotCode, desc: 'The code in LOT-<CODE>-YYYY-NNNN' }),
    F('hasColdChain', 'boolean', { label: 'Has cold chain', desc: 'Mango runs on a reefer cold chain; turmeric is a dry spice with no cold-chain stage' }),
    F('stageCount', 'int', { label: 'Stage count', unit: 'stages' }),
    F('description', 'text', { label: 'Description' }),
  ],
  { core: true, access: ACCESS.AUTH }
);

const ProfileStage = ENT(
  'traceability-ledger',
  'ProfileStage',
  'One ordered stage of a commodity profile: a role records one event type, which advances the shipment to a new status. Order matters (Section 5).',
  [
    ID(),
    REF('profileId', 'Commodity profile', 'The chain this stage belongs to'),
    F('sequence', 'int', { req: 1, idx: 1, label: 'Sequence' }),
    F('role', 'enum', { req: 1, label: 'Role', options: E.UserRole }),
    F('stageName', 'string', { req: 1, label: 'Stage' }),
    F('eventType', 'enum', { req: 1, label: 'Event type', options: E.EventType }),
    F('resultingStatus', 'enum', { label: 'Resulting status', options: E.ShipmentStatus, desc: 'Blank where the stage advances the batch without changing shipment status' }),
    F('formEntity', 'string', { label: 'Form entity', desc: 'The Section 6 form recorded at this stage' }),
    F('requiresHandoff', 'boolean', { label: 'Requires handoff', desc: 'True at a change of custody: the receiver co-signs or flags a discrepancy' }),
  ],
  { access: ACCESS.AUTH }
);

// ---------------------------------------------------------------------------
// 3. Compliance, evidence and custody (Sections 2, 6, 7)
// ---------------------------------------------------------------------------

const ResidueTest = ENT(
  'compliance-attestations',
  'ResidueTest',
  'Lab pesticide-residue test on a lot. Gates export: a lot must pass the panel against the chosen MRL standard before it can move; a fail blocks it and a conditional flags a retest (Section 7).',
  [
    ID(),
    REF('lotId', 'Lot', 'The harvest batch under test'),
    F('mrlStandard', 'enum', { req: 1, label: 'MRL standard', options: E.MrlStandard }),
    F('result', 'enum', { req: 1, idx: 1, label: 'Result', options: E.ResidueTestResult, def: 'PENDING' }),
    F('labName', 'string', { req: 1, label: 'Laboratory' }),
    F('nablAccreditationNumber', 'string', { label: 'NABL accreditation number' }),
    F('reportReference', 'string', { req: 1, label: 'Report reference' }),
    F('reportDate', 'date', { req: 1, label: 'Report date' }),
    F('testedBy', 'string', { req: 1, label: 'Tested by' }),
    F('pesticideResults', 'json', { req: 1, label: 'Pesticide panel', desc: 'Rows of {name, detectedPpm, mrlLimitPpm, result}' }),
    F('documentS3Key', 'file', { label: 'Report document' }),
    F('documentHash', 'bytes32', { storage: 'on-chain', idx: 1, label: 'Report document hash', desc: 'SHA-256 of the report, anchored so the file verifies against the ledger' }),
    ...CHAIN(),
  ],
  { core: true, access: ACCESS.AUTH, onChain: true }
);

const ComplianceMatrix = ENT(
  'compliance-attestations',
  'ComplianceMatrix',
  'Per-commodity compliance rules: the checks and certificates required before export, editable by admin (Section 8, Admin).',
  [
    ID(),
    F('commodityKey', 'enum', { req: 1, idx: 1, label: 'Commodity', options: E.Commodity }),
    F('requiredChecks', 'json', { req: 1, label: 'Required checks' }),
    F('requiredCertificates', 'json', { req: 1, label: 'Required certificates' }),
    F('destinationMarket', 'string', { label: 'Destination market' }),
    F('mrlStandard', 'enum', { label: 'MRL standard', options: E.MrlStandard }),
    F('version', 'int', { req: 1, label: 'Version', def: 1 }),
    F('effectiveFrom', 'date', { label: 'Effective from' }),
    REF('updatedById', 'Updated by', 'The admin who last edited the matrix'),
  ],
  { access: ACCESS.ADM }
);

const Certificate = ENT(
  'evidence-chain',
  'Certificate',
  'A document anchored by its hash (phyto, COO, treatment, bill of lading). Uploaded, hashed with SHA-256 and anchored as CERTIFICATE_ANCHORED so the file verifies against the ledger. Read is tenant-scoped; the QR-scoped verify endpoint exposes certificates publicly.',
  [
    ID(),
    REF('shipmentId', 'Shipment', 'The consignment this document belongs to'),
    F('certType', 'enum', { req: 1, idx: 1, label: 'Certificate type', options: E.CertificateType }),
    F('certificateNumber', 'string', { req: 1, label: 'Certificate number' }),
    F('issueDate', 'date', { req: 1, label: 'Issue date' }),
    F('validityDate', 'date', { label: 'Validity date' }),
    F('issuingAuthority', 'string', { label: 'Issuing authority' }),
    F('documentS3Key', 'file', { label: 'Document' }),
    F('documentHash', 'bytes32', { storage: 'on-chain', idx: 1, label: 'Document hash', desc: 'SHA-256 of the uploaded file' }),
    F('fileSize', 'int', { label: 'File size', unit: 'bytes' }),
    F('originalFilename', 'string', { label: 'Original filename' }),
    ...CHAIN(),
  ],
  { core: true, access: ACCESS.AUTH, onChain: true }
);

const CustodyTransfer = ENT(
  'port-customs-events',
  'CustodyTransfer',
  'A two-party transfer of custody. The receiving role reviews the declared quantity and either co-signs or flags a discrepancy (Section 7).',
  [
    ID(),
    REF('shipmentId', 'Shipment', 'The consignment changing hands'),
    F('fromOrganisation', 'string', { req: 1, label: 'Transferring organisation' }),
    F('toOrganisation', 'string', { req: 1, label: 'Receiving organisation' }),
    F('transferTimestamp', 'datetime', { req: 1, label: 'Transfer timestamp' }),
    F('location', 'string', { req: 1, label: 'Location / port' }),
    F('conditionNotes', 'text', { label: 'Condition notes' }),
    F('quantityKg', 'float', { req: 1, label: 'Quantity', unit: 'kg' }),
    ...CHAIN(),
  ],
  { access: ACCESS.AUTH, onChain: true }
);

const HandoffSignature = ENT(
  'ent-workflow',
  'HandoffSignature',
  'Two-party consensus handoff (Section 4): at each change of custody the receiving role reviews the declared quantity and either accepts (co-signs on chain) or flags a discrepancy. Both signatures sit on one record, and the next step is gated on acceptance.',
  [
    ID(),
    REF('shipmentId', 'Shipment', 'The consignment changing hands'),
    REF('eventId', 'Shipment event', 'The custody event being co-signed'),
    F('party', 'enum', { req: 1, label: 'Party', options: E.HandoffParty, desc: 'FROM_PARTY declares, TO_PARTY reviews' }),
    F('role', 'enum', { req: 1, label: 'Role', options: E.UserRole }),
    F('walletAddress', 'address', { req: 1, label: 'Signer wallet address' }),
    F('declaredQuantityKg', 'float', { label: 'Declared quantity', unit: 'kg' }),
    F('reviewedQuantityKg', 'float', { label: 'Reviewed quantity', unit: 'kg' }),
    F('decision', 'enum', { req: 1, label: 'Decision', options: E.HandoffDecision }),
    F('discrepancyNote', 'text', { label: 'Discrepancy note' }),
    F('signedAt', 'datetime', { req: 1, label: 'Signed at' }),
    ...CHAIN(),
  ],
  { access: ACCESS.AUTH, onChain: true }
);

// ---------------------------------------------------------------------------
// 4. Cold chain (Section 2, table 10 and Section 7 breach rule)
// ---------------------------------------------------------------------------

const IotDevice = ENT(
  'iot-device-registry',
  'IotDevice',
  'A reefer sensor bound to a consignment. Listed with its telemetry on the IoT devices screen (Section 8).',
  [
    ID(),
    F('deviceId', 'string', { req: 1, uniq: 1, idx: 1, label: 'Device ID' }),
    REF('shipmentId', 'Shipment', 'The consignment this sensor rides with'),
    F('type', 'enum', { req: 1, label: 'Device type', options: E.DeviceType }),
    F('status', 'enum', { req: 1, label: 'Status', options: E.DeviceStatus, def: 'ACTIVE' }),
    F('lastSeenAt', 'datetime', { label: 'Last seen at' }),
  ],
  { access: ACCESS.AUTH }
);

const TelemetryReading = ENT(
  'cold-chain-monitoring',
  'TelemetryReading',
  'Cold-chain sensor stream for reefer breach detection. An excursion sets hasBreach on the shipment and records a BREACH_RECORDED transaction (Section 7).',
  [
    ID(),
    REF('shipmentId', 'Shipment', 'The consignment being monitored'),
    REF('deviceId', 'IoT device', 'The sensor that produced the reading'),
    F('readingTimestamp', 'datetime', { req: 1, idx: 1, label: 'Reading timestamp' }),
    F('temperatureCelsius', 'float', { label: 'Temperature', unit: 'C' }),
    F('humidityPct', 'float', { label: 'Humidity', unit: '%' }),
    F('breachFlag', 'boolean', { idx: 1, label: 'Breach' }),
    F('breachType', 'enum', { label: 'Breach type', options: E.BreachType }),
  ],
  { access: ACCESS.AUTH }
);

// ---------------------------------------------------------------------------
// 5. Disputes (Section 2, table 11 and Section 7)
// ---------------------------------------------------------------------------

const Dispute = ENT(
  'quality-recall-ledger',
  'Dispute',
  'Buyer rejection or discrepancy handling: the buyer opens a dispute (DISPUTE_INITIATED), the exporter responds, and resolution (DISPUTE_RESOLVED) carries an outcome.',
  [
    ID(),
    REF('shipmentId', 'Shipment', 'The consignment in dispute'),
    REF('initiatedById', 'Initiated by', 'The buyer account that raised it'),
    F('rejectionType', 'string', { req: 1, label: 'Rejection type' }),
    F('reasonCategory', 'string', { label: 'Reason category' }),
    F('description', 'text', { req: 1, label: 'Description' }),
    F('rejectedQuantityKg', 'float', { label: 'Rejected quantity', unit: 'kg' }),
    F('claimedValueUsd', 'float', { label: 'Claimed value', unit: 'USD' }),
    F('status', 'enum', { req: 1, idx: 1, label: 'Status', options: E.DisputeStatus, def: 'OPEN' }),
    F('exporterResponse', 'text', { label: 'Exporter response' }),
    F('resolutionOutcome', 'enum', { label: 'Resolution outcome', options: E.DisputeResolutionOutcome }),
    F('resolutionNotes', 'text', { label: 'Resolution notes' }),
    F('openedAt', 'datetime', { label: 'Opened at' }),
    F('resolvedAt', 'datetime', { label: 'Resolved at' }),
    ...CHAIN(),
  ],
  { access: ACCESS.AUTH, onChain: true }
);

const DisputeEvidence = ENT(
  'quality-recall-ledger',
  'DisputeEvidence',
  'Evidence documents attached to a dispute, hashed with SHA-256 like every other anchored file (Section 7).',
  [
    ID(),
    REF('disputeId', 'Dispute', 'The dispute this evidence supports'),
    F('documentS3Key', 'file', { req: 1, label: 'Document' }),
    F('documentHash', 'bytes32', { storage: 'on-chain', idx: 1, label: 'Document hash', desc: 'SHA-256 of the uploaded file' }),
    F('originalFilename', 'string', { label: 'Original filename' }),
    F('fileSize', 'int', { label: 'File size', unit: 'bytes' }),
    F('description', 'text', { label: 'Description' }),
    REF('uploadedById', 'Uploaded by', 'The participant who attached it'),
    F('uploadedAt', 'datetime', { label: 'Uploaded at' }),
  ],
  { access: ACCESS.AUTH }
);

// ---------------------------------------------------------------------------
// 6. AgroChain: the ledger itself (Section 3). Every field lives on-chain.
// ---------------------------------------------------------------------------

const ChainBlock = ENT(
  'consensus',
  'ChainBlock',
  'A hash-linked block. Stores previousBlockHash, a Merkle root of its transactions and a producer node; genesis previousBlockHash is 64 zeros. Moves PENDING_CONSENSUS to FINALISED at the four-of-five threshold.',
  [
    ID(),
    F('blockNumber', 'int', { storage: 'on-chain', req: 1, uniq: 1, idx: 1, label: 'Block number' }),
    F('blockHash', 'bytes32', { storage: 'on-chain', req: 1, uniq: 1, idx: 1, label: 'Block hash', desc: 'SHA-256' }),
    F('previousBlockHash', 'bytes32', { storage: 'on-chain', req: 1, label: 'Previous block hash', desc: 'Genesis is 64 zeros' }),
    F('merkleRoot', 'bytes32', { storage: 'on-chain', req: 1, label: 'Merkle root' }),
    F('status', 'enum', { storage: 'on-chain', req: 1, idx: 1, label: 'Status', options: E.BlockStatus, def: 'PENDING_CONSENSUS' }),
    ONREF('producerNodeId', 'Producer node', 'Round-robin selected validator that produced the block'),
    F('transactionCount', 'int', { storage: 'on-chain', label: 'Transaction count', unit: 'txs' }),
    F('voteCount', 'int', { storage: 'on-chain', label: 'Vote count', unit: 'votes' }),
    F('producedAt', 'datetime', { storage: 'on-chain', label: 'Produced at' }),
    F('finalisedAt', 'datetime', { storage: 'on-chain', label: 'Finalised at' }),
  ],
  { core: true, access: ACCESS.SYS, onChain: true }
);

const ChainTransaction = ENT(
  'consensus',
  'ChainTransaction',
  'One anchored action. txHash = sha256(txData), payloadHash = sha256(payload). Waits a randomised 5 to 20 seconds in the mempool before it is mined, which is why the ChainBadge shows amber then green.',
  [
    ID(),
    F('txHash', 'bytes32', { storage: 'on-chain', req: 1, uniq: 1, idx: 1, label: 'Transaction hash', desc: 'sha256(txData)' }),
    ONREF('blockId', 'Block', 'The block that mined this transaction'),
    F('blockNumber', 'int', { storage: 'on-chain', idx: 1, label: 'Block number' }),
    F('blockPosition', 'int', { storage: 'on-chain', label: 'Position in block' }),
    F('fromWallet', 'address', { storage: 'on-chain', req: 1, idx: 1, label: 'From wallet', desc: 'The actor wallet that signed the action' }),
    F('txType', 'enum', { storage: 'on-chain', req: 1, idx: 1, label: 'Transaction type', options: E.ChainTxType }),
    F('payloadHash', 'bytes32', { storage: 'on-chain', req: 1, label: 'Payload hash', desc: 'sha256(payload)' }),
    F('payload', 'json', { storage: 'on-chain', label: 'Payload' }),
    F('status', 'enum', { storage: 'on-chain', req: 1, idx: 1, label: 'Status', options: E.ChainStatus, def: 'PENDING' }),
    F('submittedAt', 'datetime', { storage: 'on-chain', label: 'Submitted at' }),
    F('minedAt', 'datetime', { storage: 'on-chain', label: 'Mined at' }),
  ],
  { core: true, access: ACCESS.SYS, onChain: true }
);

const ChainConsensusVote = ENT(
  'consensus',
  'ChainConsensusVote',
  'One validator node vote on one block. Four of five finalises it; otherwise the block does not finalise. Shown in the consensus panel of the Chain Explorer.',
  [
    ID(),
    ONREF('blockId', 'Block', 'The block being voted on'),
    ONREF('nodeId', 'Validator node', 'The validator casting the vote'),
    F('vote', 'boolean', { storage: 'on-chain', req: 1, label: 'Vote' }),
    F('signature', 'bytes32', { storage: 'on-chain', label: 'Vote signature' }),
    F('votedAt', 'datetime', { storage: 'on-chain', label: 'Voted at' }),
  ],
  { access: ACCESS.SYS, onChain: true }
);

const ChainNode = ENT(
  'validators',
  'ChainNode',
  'One of the five validator nodes (Mumbai, Singapore and three more). Block production is round-robin across the eligible producers; the validator map on the Chain Explorer renders this collection.',
  [
    ID(),
    F('nodeId', 'string', { req: 1, uniq: 1, idx: 1, label: 'Node ID' }),
    F('name', 'string', { req: 1, label: 'Node name' }),
    F('location', 'string', { label: 'Location' }),
    F('status', 'enum', { req: 1, label: 'Status', options: E.NodeStatus, def: 'ONLINE' }),
    F('latencyMs', 'int', { label: 'Latency', unit: 'ms' }),
    F('isProducerEligible', 'boolean', { label: 'Producer eligible' }),
    F('lastHeartbeatAt', 'datetime', { label: 'Last heartbeat at' }),
  ],
  { access: ACCESS.SYS, onChain: true }
);

const PlatformSettings = ENT(
  'genesis',
  'PlatformSettings',
  'Genesis configuration of AgroChain: chain identity, consensus threshold, validator count, mempool delay window, hashing and producer selection (Section 3).',
  [
    ID(),
    F('chainName', 'string', { req: 1, label: 'Chain name', def: 'AgroChain' }),
    F('chainId', 'string', { req: 1, label: 'Chain ID', def: 'agrotrace-1' }),
    F('consensusThreshold', 'int', { req: 1, label: 'Consensus threshold', unit: 'votes', def: 4, desc: 'Four of five finalises a block' }),
    F('validatorCount', 'int', { req: 1, label: 'Validator count', unit: 'nodes', def: 5 }),
    F('mempoolMinDelaySeconds', 'int', { req: 1, label: 'Mempool min delay', unit: 's', def: 5 }),
    F('mempoolMaxDelaySeconds', 'int', { req: 1, label: 'Mempool max delay', unit: 's', def: 20 }),
    F('hashAlgorithm', 'string', { req: 1, label: 'Hash algorithm', def: 'SHA-256' }),
    F('producerSelection', 'string', { req: 1, label: 'Producer selection', def: 'round-robin' }),
  ],
  { access: ACCESS.ADM }
);

// ---------------------------------------------------------------------------
// 7. Platform services (Sections 2, 8, 9)
// ---------------------------------------------------------------------------

const AuditLog = ENT(
  'audit-logs',
  'AuditLog',
  'Who did what, when (Section 9). Append-only trail behind every tenant-scoped action.',
  [
    ID(),
    REF('tenantId', 'Tenant', 'Owning organisation'),
    REF('actorUserId', 'Actor', 'The participant who performed the action'),
    F('actorRole', 'enum', { label: 'Actor role', options: E.UserRole }),
    F('action', 'string', { req: 1, idx: 1, label: 'Action' }),
    F('entityType', 'string', { idx: 1, label: 'Entity type' }),
    F('entityId', 'string', { idx: 1, label: 'Entity ID' }),
    F('beforeState', 'json', { label: 'Before' }),
    F('afterState', 'json', { label: 'After' }),
    F('ipAddress', 'string', { label: 'IP address' }),
    F('userAgent', 'string', { label: 'User agent' }),
    F('occurredAt', 'datetime', { req: 1, idx: 1, label: 'Occurred at' }),
  ],
  { access: ACCESS.SYS }
);

const Notification = ENT(
  'notifications',
  'Notification',
  'An alert to a participant across the channels AgroTrace supports in the field: in-app, push, SMS, WhatsApp and email.',
  [
    ID(),
    REF('tenantId', 'Tenant', 'Owning organisation'),
    REF('userId', 'Recipient', 'The participant being notified'),
    F('channel', 'enum', { req: 1, label: 'Channel', options: E.NotificationChannel, def: 'IN_APP' }),
    F('title', 'string', { req: 1, label: 'Title' }),
    F('body', 'text', { label: 'Body' }),
    F('relatedShipmentId', 'uuid', { idx: 1, label: 'Related shipment', desc: 'Optional deep link to the consignment that triggered the alert' }),
    F('read', 'boolean', { label: 'Read' }),
    F('createdAt', 'datetime', { req: 1, label: 'Created at' }),
  ],
  { access: ACCESS.AUTH }
);

const WebhookConfig = ENT(
  'webhooks-outbound',
  'WebhookConfig',
  'Outbound integration: a tenant subscribes an endpoint to chain transaction types.',
  [
    ID(),
    REF('tenantId', 'Tenant', 'Owning organisation'),
    F('name', 'string', { req: 1, label: 'Name' }),
    F('url', 'string', { req: 1, label: 'Endpoint URL' }),
    F('secret', 'string', { enc: 1, label: 'Signing secret' }),
    F('events', 'json', { req: 1, label: 'Subscribed events' }),
    F('active', 'boolean', { label: 'Active', def: 'true' }),
    F('createdAt', 'datetime', { label: 'Created at' }),
  ],
  { access: ACCESS.AUTH }
);

const WebhookDelivery = ENT(
  'webhooks-outbound',
  'WebhookDelivery',
  'One delivery attempt against a webhook endpoint, retained for replay and debugging.',
  [
    ID(),
    REF('webhookConfigId', 'Webhook', 'The subscription being delivered to'),
    F('eventType', 'enum', { req: 1, idx: 1, label: 'Event type', options: E.ChainTxType }),
    F('payload', 'json', { label: 'Payload' }),
    F('responseStatus', 'int', { label: 'Response status' }),
    F('attempt', 'int', { label: 'Attempt', def: 1 }),
    F('deliveredAt', 'datetime', { label: 'Delivered at' }),
    F('status', 'enum', { req: 1, label: 'Status', options: ['PENDING', 'DELIVERED', 'FAILED'], def: 'PENDING' }),
  ],
  { access: ACCESS.SYS }
);

const ChatMessage = ENT(
  'chat',
  'ChatMessage',
  'Messaging between participants on a consignment, so a discrepancy can be settled next to the record it concerns.',
  [
    ID(),
    REF('tenantId', 'Tenant', 'Owning organisation'),
    REF('shipmentId', 'Shipment', 'The consignment being discussed'),
    REF('senderUserId', 'Sender', 'The participant who wrote the message'),
    F('body', 'text', { req: 1, label: 'Message' }),
    F('sentAt', 'datetime', { req: 1, label: 'Sent at' }),
    F('readAt', 'datetime', { label: 'Read at' }),
  ],
  { access: ACCESS.AUTH }
);

const ExportJob = ENT(
  'chain-audit-export',
  'ExportJob',
  'Audit-trail PDF export per shipment (Section 8, Reports). The finished document is hashed and signed with a KMS key so the report itself verifies.',
  [
    ID(),
    REF('tenantId', 'Tenant', 'Owning organisation'),
    REF('shipmentId', 'Shipment', 'The consignment being exported'),
    REF('requestedById', 'Requested by', 'The participant who asked for the report'),
    F('format', 'enum', { req: 1, label: 'Format', options: ['PDF'], def: 'PDF' }),
    F('status', 'enum', { req: 1, idx: 1, label: 'Status', options: E.ExportJobStatus, def: 'PENDING' }),
    F('documentS3Key', 'file', { label: 'Document' }),
    F('documentHash', 'bytes32', { storage: 'on-chain', label: 'Document hash', desc: 'SHA-256 of the generated PDF' }),
    F('signedByKeyAlias', 'string', { label: 'Signed by key alias' }),
    F('completedAt', 'datetime', { label: 'Completed at' }),
  ],
  { access: ACCESS.AUTH }
);

const StoredDocument = ENT(
  'asset-storage',
  'StoredDocument',
  'Document integrity (Section 9): files are hashed with SHA-256 and anchored so they verify against the ledger. The single registry behind certificates, lab reports and dispute evidence.',
  [
    ID(),
    REF('tenantId', 'Tenant', 'Owning organisation'),
    F('s3Key', 'file', { req: 1, uniq: 1, label: 'Object key' }),
    F('sha256', 'bytes32', { storage: 'on-chain', req: 1, idx: 1, label: 'SHA-256 hash' }),
    F('fileSize', 'int', { label: 'File size', unit: 'bytes' }),
    F('originalFilename', 'string', { label: 'Original filename' }),
    F('mimeType', 'string', { label: 'MIME type' }),
    REF('uploadedById', 'Uploaded by', 'The participant who uploaded the file'),
    F('uploadedAt', 'datetime', { label: 'Uploaded at' }),
    F('anchoredTxHash', 'bytes32', { storage: 'on-chain', idx: 1, label: 'Anchored tx hash' }),
  ],
  { access: ACCESS.AUTH }
);

const ESignRequest = ENT(
  'document-signing',
  'ESignRequest',
  'A signature requested on a stored document. The default provider is the participant wallet: a signed action, consistent with on-chain attribution (Section 9).',
  [
    ID(),
    REF('documentId', 'Document', 'The stored document to be signed'),
    REF('signerUserId', 'Signer', 'The participant asked to sign'),
    F('provider', 'enum', { req: 1, label: 'Provider', options: ['WALLET_SIGNATURE', 'DOCUSIGN'], def: 'WALLET_SIGNATURE' }),
    F('status', 'enum', { req: 1, label: 'Status', options: ['PENDING', 'SIGNED', 'DECLINED'], def: 'PENDING' }),
    F('signedAt', 'datetime', { label: 'Signed at' }),
    F('signatureHash', 'bytes32', { storage: 'on-chain', label: 'Signature hash' }),
  ],
  { access: ACCESS.AUTH }
);

const SigningKey = ENT(
  'kms-signing',
  'SigningKey',
  'A managed signing key: one for audit PDF signing, one for chain signing. Key material never leaves the KMS; only the ARN is held, encrypted.',
  [
    ID(),
    F('alias', 'string', { req: 1, uniq: 1, idx: 1, label: 'Key alias' }),
    F('provider', 'enum', { req: 1, label: 'Provider', options: ['AWS_KMS'], def: 'AWS_KMS' }),
    F('keyArn', 'string', { req: 1, enc: 1, label: 'Key ARN' }),
    F('purpose', 'enum', { req: 1, label: 'Purpose', options: ['AUDIT_PDF', 'CHAIN_SIGNING'] }),
    F('rotationDays', 'int', { label: 'Rotation period', unit: 'days' }),
    F('createdAt', 'datetime', { label: 'Created at' }),
  ],
  { access: ACCESS.ADM }
);

const LocaleEntity = ENT(
  'i18n',
  'Locale',
  'The nine languages AgroTrace ships in (Section 10): English, Hindi, Bengali, Gujarati, Kannada, Marathi, Punjabi, Tamil and Telugu.',
  [
    ID(),
    F('code', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Locale code', options: E.Locale }),
    F('name', 'string', { req: 1, label: 'Name' }),
    F('nativeName', 'string', { req: 1, label: 'Native name' }),
    F('isDefault', 'boolean', { label: 'Default locale' }),
    F('rtl', 'boolean', { label: 'Right to left' }),
  ],
  { access: ACCESS.ADM }
);

const AppScreen = ENT(
  'tx-access-policy',
  'AppScreen',
  'The fourteen screens of Section 8: Auth (login, refresh, invite-code farmer signup); Farmer portal (phone-friendly batch registration and tracking); Exporter dashboard (metric tiles, chain-verified strip, the full book); Per-role dashboards (queue, record modal, submit and anchor); Lots (list, detail, registration form); Shipments (list, kanban, detail with the on-chain event timeline, Record event, Upload certificate and a telemetry tab); Compliance (checks and certificates required before export, per commodity); Disputes (open, respond, resolve); Chain Explorer (blocks, transactions, transaction detail, validator map, consensus panel); IoT devices (reefer sensors and telemetry); Team / Users (participant management, super admin); Reports (audit-trail PDF export per shipment); Public Verify (QR opens the full journey, certificates and compliance scorecard, no login); Admin (tenants, platform settings, compliance matrix editor).',
  [
    ID(),
    F('key', 'string', { req: 1, uniq: 1, idx: 1, label: 'Screen key' }),
    F('name', 'string', { req: 1, label: 'Screen name' }),
    F('route', 'string', { label: 'Route' }),
    F('area', 'enum', { req: 1, label: 'Area', options: E.ScreenArea }),
    F('description', 'text', { label: 'Description' }),
    F('requiresLogin', 'boolean', { label: 'Requires login', desc: 'False only for Public Verify, which a QR code opens without a login' }),
    F('mobileFirst', 'boolean', { label: 'Mobile first', desc: 'True for the field-capture screens of the installable PWA' }),
  ],
  { access: ACCESS.ADM }
);

const RoleScreenAccess = ENT(
  'tx-access-policy',
  'RoleScreenAccess',
  'Role-based navigation (Section 9): each role has a minimal allow-list of screens. One row per role and screen.',
  [
    ID(),
    F('role', 'enum', { req: 1, idx: 1, label: 'Role', options: E.UserRole }),
    REF('screenKey', 'Screen', 'The screen being allowed or denied'),
    F('allowed', 'boolean', { req: 1, label: 'Allowed' }),
  ],
  { access: ACCESS.ADM }
);

const CommodityGrade = ENT(
  'produce-grades',
  'CommodityGrade',
  'The grade vocabulary each commodity is sold against: turmeric finger sizes and Spices Board quality grades, mango pack grades.',
  [
    ID(),
    F('commodityKey', 'enum', { req: 1, idx: 1, label: 'Commodity', options: E.Commodity }),
    F('gradeCode', 'string', { req: 1, label: 'Grade code' }),
    F('label', 'string', { req: 1, label: 'Label' }),
    F('description', 'text', { label: 'Description' }),
  ],
  { access: ACCESS.ADM }
);

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

const ENTITIES = [
  // Organisation, identity and access
  Tenant,
  User,
  Role,
  Wallet,
  AuthSession,
  LoginAttempt,
  PasswordHistory,
  // Traceability core
  Lot,
  Shipment,
  ShipmentEvent,
  CommodityProfile,
  ProfileStage,
  // Compliance, evidence and custody
  ResidueTest,
  ComplianceMatrix,
  Certificate,
  CustodyTransfer,
  HandoffSignature,
  // Cold chain
  IotDevice,
  TelemetryReading,
  // Disputes
  Dispute,
  DisputeEvidence,
  // AgroChain
  ChainBlock,
  ChainTransaction,
  ChainConsensusVote,
  ChainNode,
  PlatformSettings,
  // Platform services
  AuditLog,
  Notification,
  WebhookConfig,
  WebhookDelivery,
  ChatMessage,
  ExportJob,
  StoredDocument,
  ESignRequest,
  SigningKey,
  LocaleEntity,
  AppScreen,
  RoleScreenAccess,
  CommodityGrade,
];

/**
 * [fromEntityName, toEntityName, type] - names resolved to ids by the seeder.
 * type: relatedTo | oneToMany | manyToMany | oneToOne
 */
const RELS = [
  // Tenant scoping: every collection is scoped to a tenant (Section 9)
  ['Tenant', 'User', 'oneToMany'],
  ['Tenant', 'Lot', 'oneToMany'],
  ['Tenant', 'Shipment', 'oneToMany'],
  ['Tenant', 'AuditLog', 'oneToMany'],
  ['Tenant', 'Notification', 'oneToMany'],
  ['Tenant', 'WebhookConfig', 'oneToMany'],
  ['Tenant', 'ChatMessage', 'oneToMany'],
  ['Tenant', 'ExportJob', 'oneToMany'],
  ['Tenant', 'StoredDocument', 'oneToMany'],

  // Identity
  ['User', 'Wallet', 'oneToOne'],
  ['User', 'AuthSession', 'oneToMany'],
  ['User', 'PasswordHistory', 'oneToMany'],
  ['User', 'Notification', 'oneToMany'],
  ['Role', 'User', 'relatedTo'],

  // Lot and shipment spine
  ['Lot', 'ResidueTest', 'oneToMany'],
  ['Lot', 'Shipment', 'oneToMany'],
  ['Shipment', 'ShipmentEvent', 'oneToMany'],
  ['Shipment', 'Certificate', 'oneToMany'],
  ['Shipment', 'CustodyTransfer', 'oneToMany'],
  ['Shipment', 'HandoffSignature', 'oneToMany'],
  ['Shipment', 'IotDevice', 'oneToMany'],
  ['Shipment', 'TelemetryReading', 'oneToMany'],
  ['Shipment', 'Dispute', 'oneToMany'],
  ['Shipment', 'ChatMessage', 'oneToMany'],
  ['Shipment', 'ExportJob', 'oneToMany'],
  ['Shipment', 'Notification', 'relatedTo'],
  ['ShipmentEvent', 'HandoffSignature', 'oneToMany'],
  ['IotDevice', 'TelemetryReading', 'oneToMany'],
  ['Dispute', 'DisputeEvidence', 'oneToMany'],

  // Profiles drive the stages and the compliance rules
  ['CommodityProfile', 'ProfileStage', 'oneToMany'],
  ['CommodityProfile', 'ComplianceMatrix', 'oneToMany'],
  ['CommodityProfile', 'Lot', 'relatedTo'],
  ['CommodityProfile', 'CommodityGrade', 'relatedTo'],

  // The ledger
  ['ChainBlock', 'ChainTransaction', 'oneToMany'],
  ['ChainBlock', 'ChainConsensusVote', 'oneToMany'],
  ['ChainNode', 'ChainBlock', 'oneToMany'],
  ['ChainNode', 'ChainConsensusVote', 'oneToMany'],

  // Platform services
  ['WebhookConfig', 'WebhookDelivery', 'oneToMany'],
  ['StoredDocument', 'ESignRequest', 'oneToMany'],
  ['AppScreen', 'RoleScreenAccess', 'oneToMany'],
  ['Role', 'RoleScreenAccess', 'oneToMany'],
  ['SigningKey', 'ExportJob', 'relatedTo'],

  // Actor references
  ['User', 'Lot', 'relatedTo'],
  ['User', 'Shipment', 'relatedTo'],
  ['User', 'ShipmentEvent', 'relatedTo'],
  ['User', 'Dispute', 'relatedTo'],
  ['User', 'AuditLog', 'relatedTo'],
  ['User', 'ChatMessage', 'relatedTo'],
  ['User', 'ExportJob', 'relatedTo'],
  ['User', 'StoredDocument', 'relatedTo'],
  ['User', 'ESignRequest', 'relatedTo'],
  ['User', 'ComplianceMatrix', 'relatedTo'],
  ['User', 'DisputeEvidence', 'relatedTo'],

  // Document registry backs every hashed file
  ['StoredDocument', 'Certificate', 'relatedTo'],
  ['StoredDocument', 'ResidueTest', 'relatedTo'],
  ['StoredDocument', 'DisputeEvidence', 'relatedTo'],

  // Anchoring: every anchored record points at its chain transaction
  ['Lot', 'ChainTransaction', 'relatedTo'],
  ['Shipment', 'ChainTransaction', 'relatedTo'],
  ['ShipmentEvent', 'ChainTransaction', 'relatedTo'],
  ['Certificate', 'ChainTransaction', 'relatedTo'],
  ['CustodyTransfer', 'ChainTransaction', 'relatedTo'],
  ['Dispute', 'ChainTransaction', 'relatedTo'],
  ['HandoffSignature', 'ChainTransaction', 'relatedTo'],
];

module.exports = { ENTITIES, RELS };
