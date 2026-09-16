/**
 * AquaTrace seed - core entities and relationships.
 *
 * Transcribed from SPEC.md: Section 2 (data collections), Section 3 (AquaChain
 * settings TABLE 38, transaction types TABLE 39, certificate types TABLE 40),
 * Section 4 (roles TABLE 41), Section 5 (profiles TABLES 42-43), Section 7
 * (rules TABLES 72-75), Section 8 (screens TABLE 76), Section 9 (access,
 * TABLES 77-78) and Section 10 (locales, terminology TABLES 79-80, branding,
 * links TABLE 81).
 *
 * Form entities (crop_cycle, fishing_trip, harvest_event and the rest of
 * Section 6) live in forms.cjs - this file never references them as entities,
 * only as string pointers (formEntity / anchorsEntity / originEntity).
 *
 * Every entity is homed on a moduleId that exists on the blueprint.
 * Relationships are declared by entity NAME and resolved to ids by the seeder.
 */
const { E, ACCESS, F, ID, REF, CHAIN, ENT } = require('./_shared.cjs');

/** A foreign key that lives on the ledger itself (chain collections store everything on-chain). */
const ONREF = (name, label, desc) =>
  F(name, 'uuid', { storage: 'on-chain', req: 1, idx: 1, label, desc });

/** A scalar that lives on the ledger itself. */
const ONF = (name, type, o = {}) => F(name, type, Object.assign({}, o, { storage: 'on-chain' }));

// ---------------------------------------------------------------------------
// 1. Organisations, identity and access (Section 4, Section 9)
// ---------------------------------------------------------------------------

const Tenant = ENT(
  'org-accounts',
  'Tenant',
  'TABLE 78 tenant isolation: "every organisation and its records are scoped to a tenant; a normal user is bound to exactly one category (profile)". The isolation boundary every other collection hangs off, and the reason a tenant carries exactly one profileKey.',
  [
    ID(),
    F('name', 'string', { req: 1, idx: 1, label: 'Organisation name' }),
    F('status', 'enum', { req: 1, label: 'Status', options: ['ACTIVE', 'SUSPENDED'], def: 'ACTIVE' }),
    F('profileKey', 'enum', { req: 1, label: 'Profile', options: E.ProfileKey, desc: 'A normal tenant is bound to exactly one profile (farmed_aquaculture or wild_capture); only a platform_admin switches profiles (TABLE 77)' }),
    F('createdAt', 'datetime', { label: 'Created at' }),
  ],
  { core: true, access: ACCESS.AUTH }
);

const Invitation = ENT(
  'org-accounts',
  'Invitation',
  'Backs the /accept-invite screen (TABLE 76): "an invited user sets their password and joins their organisation and role". The token is public only in the emailed link; only its hash is stored.',
  [
    ID(),
    REF('tenantId', 'Tenant', 'The organisation the invitee joins'),
    F('email', 'string', { req: 1, idx: 1, label: 'Invitee email' }),
    F('role', 'enum', { req: 1, label: 'Role', options: E.Role, desc: 'The role from TABLE 41 the invitee takes on acceptance' }),
    F('tokenHash', 'bytes32', { req: 1, enc: 1, label: 'Invite token hash', desc: 'SHA-256 of the single-use token carried by the /accept-invite link' }),
    F('status', 'enum', { req: 1, label: 'Status', options: E.InviteStatus, def: 'PENDING' }),
    F('expiresAt', 'datetime', { label: 'Expires at' }),
    F('acceptedAt', 'datetime', { label: 'Accepted at' }),
  ],
  { access: ACCESS.AUTH }
);

const User = ENT(
  'rbac',
  'User',
  'A participant login. TABLE 78: scoped to one tenant, bound to exactly one profile, authenticated with email + password and a TOTP code when MFA is enabled (the /login screen, TABLE 76). Carries exactly one role from TABLE 41.',
  [
    ID(),
    REF('tenantId', 'Tenant', 'The organisation this login belongs to'),
    F('email', 'string', { req: 1, uniq: 1, idx: 1, label: 'Email' }),
    F('passwordHash', 'string', { req: 1, enc: 1, label: 'Password hash', desc: 'Never stored or returned in clear text' }),
    F('fullName', 'string', { label: 'Full name' }),
    F('role', 'enum', { req: 1, label: 'Role', options: E.Role, desc: 'One of the 31 role keys in TABLE 41; the role decides the permissions and the stages this user performs' }),
    F('platformRole', 'enum', { label: 'Platform role', options: E.PlatformRole, desc: 'TABLE 77: platform_admin switches profiles and administers within a tenant, platform_super_admin adds user management and system settings. Empty for ordinary participants.' }),
    F('profileKey', 'enum', { req: 1, label: 'Profile', options: E.ProfileKey, desc: 'A normal user is bound to exactly one category (TABLE 78)' }),
    F('mfaEnabled', 'boolean', { label: 'MFA enabled', desc: 'TOTP, issuer label "AquaTrace" (MFA_ISSUER)' }),
    F('status', 'enum', { req: 1, label: 'Status', options: ['ACTIVE', 'DISABLED'], def: 'ACTIVE' }),
    F('createdAt', 'datetime', { label: 'Created at' }),
  ],
  { core: true, access: ACCESS.AUTH }
);

const Role = ENT(
  'rbac',
  'Role',
  'Definition table for the actors. TABLE 41 lists 33 rows across the shared, farmed and wild scopes, resolving to 31 distinct role keys (commission_agent and buying_agent appear under both farmed and wild). Read-only roles never advance the workflow: regulator_auditor holds verify + read on every entity (TABLE 78).',
  [
    ID(),
    F('key', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Role key', options: E.Role }),
    F('label', 'string', { req: 1, label: 'Label', desc: 'Human label from TABLE 41, for example "Plant quality manager"' }),
    F('scope', 'enum', { req: 1, label: 'Scope', options: E.Scope, desc: 'shared, farmed or wild - which profile pipelines use this role' }),
    F('readOnly', 'boolean', { label: 'Read only', desc: 'TABLE 41 R/O column; a read-only role never advances the pipeline' }),
    F('stagesPerformed', 'json', { label: 'Stages performed', desc: 'Stage keys from TABLES 42-43 this role records, for example ["stage_processing","stage_freezing_cold_storage"]. Empty for roles listed with "-".' }),
    F('notes', 'text', { label: 'Notes' }),
  ],
  { core: true, access: ACCESS.ADM }
);

const RolePermission = ENT(
  'rbac',
  'RolePermission',
  'Section 9.1: "each role (Section 4) holds a list of {action . entity} grants". One row per grant in the permissions column of TABLE 41. Actions are the eight in TABLE 41 / Section 9.1: create, read, update, accept_handoff, flag_discrepancy, issue_certificate, record_event, verify.',
  [
    ID(),
    F('roleKey', 'enum', { req: 1, idx: 1, label: 'Role key', options: E.Role }),
    F('action', 'enum', { req: 1, label: 'Action', options: E.PermissionAction }),
    F('entity', 'string', { req: 1, label: 'Entity', desc: '"*" = any entity' }),
  ],
  { access: ACCESS.ADM }
);

// ---------------------------------------------------------------------------
// 2. Sessions, MFA and abuse controls (TABLE 78)
// ---------------------------------------------------------------------------

const AuthSession = ENT(
  'session-keys',
  'AuthSession',
  'TABLE 78: a short-lived access token (JWT) paired with a long-lived refresh token. Only the refresh token hash is kept, so a stolen database row cannot be replayed as a session.',
  [
    ID(),
    REF('userId', 'User', 'The signed-in user'),
    F('accessTokenJti', 'string', { req: 1, idx: 1, label: 'Access token JTI', desc: 'JWT id of the issued access token' }),
    F('refreshTokenHash', 'bytes32', { req: 1, enc: 1, label: 'Refresh token hash' }),
    F('issuedAt', 'datetime', { label: 'Issued at' }),
    F('accessExpiresAt', 'datetime', { label: 'Access token expires at', desc: 'TABLE 78: short-lived, default 900 s (15 min) after issuedAt' }),
    F('refreshExpiresAt', 'datetime', { label: 'Refresh token expires at', desc: 'TABLE 78: default 1,209,600 s (14 days) after issuedAt' }),
    F('revokedAt', 'datetime', { label: 'Revoked at' }),
  ],
  { access: ACCESS.AUTH }
);

const MfaEnrolment = ENT(
  'session-keys',
  'MfaEnrolment',
  'TABLE 78 multi-factor auth: "TOTP; issuer label \'AquaTrace\' (MFA_ISSUER)". The /login screen prompts for the TOTP code once a user is enrolled and verified.',
  [
    ID(),
    REF('userId', 'User', 'The enrolled user'),
    F('issuer', 'string', { req: 1, label: 'Issuer label', def: 'AquaTrace', desc: 'MFA_ISSUER, shown in the authenticator app' }),
    F('secret', 'string', { req: 1, enc: 1, label: 'TOTP secret', desc: 'Base32 shared secret, encrypted at rest' }),
    F('enrolledAt', 'datetime', { label: 'Enrolled at' }),
    F('verifiedAt', 'datetime', { label: 'Verified at', desc: 'Set once the first code is accepted; MFA is only enforced after this' }),
  ],
  { access: ACCESS.AUTH }
);

const RateLimitBucket = ENT(
  'rate-limit',
  'RateLimitBucket',
  'TABLE 78 rate limiting: "default 120 requests per 60 s window". One rolling counter per subject (an IP address, a user id or an API caller).',
  [
    ID(),
    F('subject', 'string', { req: 1, idx: 1, label: 'Subject', desc: 'IP address, user id or API caller the window is counted against' }),
    F('windowStart', 'datetime', { req: 1, label: 'Window start' }),
    F('requestCount', 'int', { req: 1, label: 'Requests in window', unit: 'requests', def: 0 }),
    F('limit', 'int', { req: 1, label: 'Request limit', unit: 'requests', def: 120 }),
    F('windowSeconds', 'int', { req: 1, label: 'Window length', unit: 's', def: 60 }),
  ],
  { access: ACCESS.SYS }
);

const LoginAttempt = ENT(
  'rate-limit',
  'LoginAttempt',
  'Audit trail behind the rate limiter (TABLE 78) and the /login screen: every sign-in attempt, successful or not, so brute force against an email can be detected and throttled.',
  [
    ID(),
    F('email', 'string', { req: 1, idx: 1, label: 'Email attempted' }),
    F('ipAddress', 'string', { label: 'IP address' }),
    F('succeeded', 'boolean', { label: 'Succeeded' }),
    F('attemptedAt', 'datetime', { req: 1, label: 'Attempted at' }),
  ],
  { access: ACCESS.SYS }
);

// ---------------------------------------------------------------------------
// 3. Chain key custody (TABLE 38 key custody, TABLE 78 chain key custody)
// ---------------------------------------------------------------------------

const ChainKeypair = ENT(
  'wallet-auth',
  'ChainKeypair',
  'TABLE 38 key custody: "each actor holds an ed25519 keypair; the private key is encrypted at rest with CHAIN_MASTER_KEY (32-byte / 64-hex master key)". This is the key that signs every event the actor records (blockchain/keys.ts).',
  [
    ID(),
    F('userId', 'uuid', { req: 1, uniq: 1, idx: 1, label: 'User', desc: 'The actor holding the keypair - exactly one keypair per user' }),
    F('algorithm', 'enum', { req: 1, label: 'Algorithm', options: ['ed25519'], def: 'ed25519' }),
    F('publicKey', 'string', { req: 1, idx: 1, label: 'Public key', desc: 'Published with every signature so any verifier can re-check the chain' }),
    F('encryptedPrivateKey', 'string', { req: 1, enc: 1, label: 'Encrypted private key', desc: 'encrypted at rest with CHAIN_MASTER_KEY' }),
    F('createdAt', 'datetime', { label: 'Created at' }),
  ],
  { access: ACCESS.SYS }
);

const MasterKey = ENT(
  'kms-signing',
  'MasterKey',
  'Settings record for the single custody secret named in TABLE 38 and TABLE 78: the 32-byte / 64-hex CHAIN_MASTER_KEY that wraps every actor ed25519 private key. The key material itself lives in KMS; only its alias, ARN and rotation state are held here.',
  [
    ID(),
    F('alias', 'string', { req: 1, uniq: 1, label: 'Key alias', def: 'CHAIN_MASTER_KEY' }),
    F('keyArn', 'string', { enc: 1, label: 'KMS key ARN' }),
    F('keyBytes', 'int', { req: 1, label: 'Key length', unit: 'bytes', def: 32, desc: '32-byte / 64-hex master key (TABLE 38)' }),
    F('rotatedAt', 'datetime', { label: 'Last rotated at' }),
  ],
  { access: ACCESS.ADM }
);

// ---------------------------------------------------------------------------
// 4. AquaChain: blocks, transactions, consensus (Section 3.1 TABLE 38)
// ---------------------------------------------------------------------------

const ChainBlock = ENT(
  'consensus',
  'ChainBlock',
  'TABLE 38 block structure and production: "transactions batched into a block with a Merkle root; each block carries previousHash -> blockHash (hash-linked chain)" and "a producer node seals a block every BLOCK_INTERVAL_MS (default 5000 ms) when transactions are pending". Finalises at CONSENSUS_THRESHOLD signatures (default 4 of 5). Surfaced by the /explorer screen (TABLE 76).',
  [
    ID(),
    ONF('blockNumber', 'int', { req: 1, uniq: 1, idx: 1, label: 'Block number' }),
    ONF('blockHash', 'bytes32', { req: 1, uniq: 1, label: 'Block hash', desc: 'SHA-256 over the block header' }),
    ONF('previousHash', 'bytes32', { label: 'Previous block hash', desc: 'previousHash -> blockHash makes the chain hash-linked' }),
    ONF('merkleRoot', 'bytes32', { label: 'Merkle root', desc: 'Merkle root over the batched transactions' }),
    ONREF('producerNodeId', 'Producer node', 'The validator node that sealed this block (blockchain/producer.ts)'),
    ONF('status', 'enum', { req: 1, label: 'Status', options: E.BlockStatus, def: 'PENDING', desc: 'PENDING until CONSENSUS_THRESHOLD (4) validator signatures arrive, then FINALISED' }),
    ONF('txCount', 'int', { label: 'Transaction count', unit: 'transactions' }),
    ONF('sealedAt', 'datetime', { label: 'Sealed at' }),
    ONF('finalisedAt', 'datetime', { label: 'Finalised at' }),
  ],
  { core: true, access: ACCESS.SYS, onChain: true }
);

const ChainTransaction = ENT(
  'consensus',
  'ChainTransaction',
  'One anchored event on AquaChain. TABLE 38: "each event is signed with the acting party\'s own ed25519 key" and hashed with "SHA-256 over the canonical event payload". Its txType is one of the 30 kinds in TABLE 39 and its anchorsEntity is one of the 28 on-chain entities listed in TABLE 38.',
  [
    ID(),
    ONF('txHash', 'bytes32', { req: 1, uniq: 1, idx: 1, label: 'Transaction hash' }),
    ONF('blockNumber', 'int', { idx: 1, label: 'Block number', desc: 'Empty while the transaction is still pending in the mempool' }),
    ONF('txType', 'enum', { req: 1, label: 'Transaction type', options: E.TxType, desc: 'One of the 30 transaction types in TABLE 39' }),
    ONF('category', 'enum', { req: 1, label: 'Category', options: E.TxCategory, desc: 'register, event, handoff, split, merge, certificate, document_anchor or origin_create (TABLE 39)' }),
    ONF('anchorsEntity', 'string', { label: 'Anchors entity', desc: 'The form entity this transaction anchors, for example crop_cycle or fishing_trip (TABLE 38 on-chain entities)' }),
    ONF('actorPublicKey', 'string', { label: 'Actor public key', desc: 'ed25519 public key of the party that recorded the event' }),
    ONF('actorSignature', 'bytes32', { label: 'Actor signature', desc: 'ed25519 signature over the payload hash' }),
    ONF('payloadHash', 'bytes32', { label: 'Payload hash', desc: 'SHA-256 over canonical payload' }),
    ONF('payload', 'json', { label: 'Payload', desc: 'The canonical event body that was hashed and signed' }),
    ONF('status', 'enum', { req: 1, label: 'Status', options: E.ChainStatus, def: 'PENDING', desc: 'PENDING until the containing block finalises, then CONFIRMED' }),
    ONF('submittedAt', 'datetime', { label: 'Submitted at' }),
  ],
  { core: true, access: ACCESS.SYS, onChain: true }
);

const ValidatorSignature = ENT(
  'consensus',
  'ValidatorSignature',
  'TABLE 38 validator set and finality: "CONSENSUS_VALIDATOR_COUNT validator nodes (default 5) co-sign each block" and "a block finalises at CONSENSUS_THRESHOLD signatures (default 4 of 5)". One row per validator vote; the /explorer screen shows recent blocks with their validator votes (TABLE 76).',
  [
    ID(),
    ONF('blockNumber', 'int', { req: 1, idx: 1, label: 'Block number' }),
    ONREF('validatorNodeId', 'Validator node', 'The co-signing validator node (blockchain/nodes.ts)'),
    ONF('signature', 'bytes32', { req: 1, label: 'Signature', desc: 'ed25519 signature by the validator node over the block hash' }),
    ONF('signedAt', 'datetime', { label: 'Signed at' }),
  ],
  { access: ACCESS.SYS, onChain: true }
);

const ValidatorNode = ENT(
  'validators',
  'ValidatorNode',
  'Registry of the permissioned validator set named in TABLE 38: CONSENSUS_VALIDATOR_COUNT nodes, default 5, that co-sign every block (blockchain/nodes.ts). The set is static and permissioned - there is no staking and no open validator entry.',
  [
    ID(),
    F('nodeId', 'string', { req: 1, uniq: 1, idx: 1, label: 'Node id', desc: 'For example aquachain-validator-1' }),
    F('name', 'string', { req: 1, label: 'Name' }),
    F('status', 'enum', { req: 1, label: 'Status', options: ['ONLINE', 'OFFLINE'], def: 'ONLINE' }),
    F('lastSealedBlock', 'int', { label: 'Last sealed block', desc: 'Highest block this node produced as the sealing node' }),
    F('lastSignedAt', 'datetime', { label: 'Last signed at' }),
  ],
  { access: ACCESS.ADM }
);

const PlatformSettings = ENT(
  'genesis',
  'PlatformSettings',
  'The genesis / settings singleton. Holds every value in TABLE 38 (chain settings and mechanics) plus the security defaults in TABLE 78, so the running network can be checked against the spec without reading code.',
  [
    ID(),
    F('chainName', 'string', { req: 1, label: 'Chain name', def: 'AquaChain' }),
    F('chainId', 'string', { req: 1, label: 'Chain id', def: 'aquatrace-1' }),
    F('signing', 'string', { req: 1, label: 'Signing scheme', def: 'ed25519', desc: 'TABLE 38: each event is signed with the acting party\'s own ed25519 key (blockchain/keys.ts)' }),
    F('hashing', 'string', { req: 1, label: 'Hashing scheme', def: 'SHA-256', desc: 'TABLE 38: SHA-256 over the canonical event payload' }),
    F('BLOCK_INTERVAL_MS', 'int', { req: 1, label: 'Block interval', unit: 'ms', def: 5000, desc: 'TABLE 38: a producer node seals a block every BLOCK_INTERVAL_MS when transactions are pending' }),
    F('CONSENSUS_VALIDATOR_COUNT', 'int', { req: 1, label: 'Validator count', unit: 'nodes', def: 5 }),
    F('CONSENSUS_THRESHOLD', 'int', { req: 1, label: 'Finality threshold', unit: 'signatures', def: 4, desc: 'TABLE 38: a block finalises at 4 of 5 signatures' }),
    F('MFA_ISSUER', 'string', { req: 1, label: 'MFA issuer label', def: 'AquaTrace' }),
    F('accessTokenSeconds', 'int', { req: 1, label: 'Access token lifetime', unit: 's', def: 900, desc: 'TABLE 78: short-lived, default 900 s (15 min)' }),
    F('refreshTokenSeconds', 'int', { req: 1, label: 'Refresh token lifetime', unit: 's', def: 1209600, desc: 'TABLE 78: default 1,209,600 s (14 days)' }),
    F('rateLimitRequests', 'int', { req: 1, label: 'Rate limit requests', unit: 'requests', def: 120 }),
    F('rateLimitWindowSeconds', 'int', { req: 1, label: 'Rate limit window', unit: 's', def: 60 }),
  ],
  { core: true, access: ACCESS.ADM }
);

// ---------------------------------------------------------------------------
// 5. Profiles and the traceability pipeline (Section 5, TABLES 42-43)
// ---------------------------------------------------------------------------

const Profile = ENT(
  'traceability-ledger',
  'Profile',
  'Section 5: "each profile is a category with an ordered stage pipeline, composed from shared + profile-specific blocks". Two profiles: farmed_aquaculture (origin unit broodstock_event, TABLE 42) and wild_capture (origin unit fishing_trip, TABLE 43).',
  [
    ID(),
    F('key', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Profile key', options: E.ProfileKey }),
    F('name', 'string', { req: 1, label: 'Name', desc: 'Farmed Aquaculture or Wild Capture' }),
    F('version', 'int', { req: 1, label: 'Version', def: 1 }),
    F('originUnitEntity', 'string', { req: 1, label: 'Origin unit entity', desc: 'broodstock_event for farmed, fishing_trip for wild - the form entity that creates a trace unit' }),
    F('nameLocales', 'json', { label: 'Name locales', desc: 'Farmed: en=Farmed Aquaculture, te=saagaru saagu. Wild: en=Wild Capture, ta=kaadu meen pidippu.' }),
    F('description', 'text', { label: 'Description' }),
  ],
  { core: true, access: ACCESS.ADM }
);

const ProfileStage = ENT(
  'traceability-ledger',
  'ProfileStage',
  'Definition table for the ordered stage pipelines. TABLES 42-43 together list 33 rows (17 farmed + 16 wild): order, stage key, label, role, the transaction it emits, its prerequisite, the form entity and the handoff to the next role. TABLE 75: a stage with "requires" becomes actionable only once that transaction exists on the unit, and a repeatable stage never advances the pipeline pointer.',
  [
    ID(),
    F('profileKey', 'enum', { req: 1, idx: 1, label: 'Profile key', options: E.ProfileKey }),
    F('order', 'int', { req: 1, label: 'Order', desc: 'Pipeline order, 10 to 170 in TABLES 42-43' }),
    F('stageKey', 'enum', { req: 1, label: 'Stage key', options: E.StageKey }),
    F('label', 'string', { req: 1, label: 'Label', desc: 'For example "Pre-harvest sampling" or "Auction and first sale"' }),
    F('role', 'enum', { req: 1, label: 'Performed by role', options: E.Role }),
    F('emits', 'enum', { req: 1, label: 'Emits transaction', options: E.TxType }),
    F('requires', 'enum', { label: 'Requires transaction', options: E.TxType, desc: 'Prerequisite transaction; empty for the first stage of a pipeline (TABLE 75 stage prerequisite)' }),
    F('formEntity', 'string', { req: 1, label: 'Form entity', desc: 'The Section 6 form recorded at this stage, for example growout_reading or landing_event' }),
    F('handoffToRole', 'enum', { label: 'Handoff to role', options: E.Role, desc: 'Empty where TABLES 42-43 say "no handoff"' }),
    F('handoffDeclaredFields', 'json', { label: 'Declared handoff fields', desc: 'The fields the receiver co-signs, for example ["harvest_weight","count_grade"]' }),
    F('repeatable', 'boolean', { label: 'Repeatable', desc: 'TABLE 75: grow-out reading, input application, sampling, on-vessel processing and transhipment can be recorded many times and never advance the pipeline pointer' }),
  ],
  { core: true, access: ACCESS.ADM }
);

const TraceUnit = ENT(
  'traceability-ledger',
  'TraceUnit',
  'The traceable unit that walks a profile pipeline from its origin-unit form to retail. Created by an origin_create transaction (tx_broodstock for farmed, tx_fishing for wild) and carried through every stage in TABLES 42-43. Its publicVerifyCode is what the /verify screen (TABLE 76) and the QR on each record resolve (TABLE 81).',
  [
    ID(),
    REF('tenantId', 'Tenant', 'The organisation that owns this unit'),
    F('profileKey', 'enum', { req: 1, idx: 1, label: 'Profile key', options: E.ProfileKey }),
    F('originEntity', 'string', { req: 1, label: 'Origin entity', desc: 'broodstock_event or fishing_trip' }),
    F('originRecordId', 'uuid', { req: 1, idx: 1, label: 'Origin record', desc: 'The origin-unit form record that created this trace unit' }),
    F('currentStageKey', 'enum', { req: 1, label: 'Current stage', options: E.StageKey }),
    F('pipelinePointer', 'int', { req: 1, label: 'Pipeline pointer', def: 0, desc: 'Index into the ordered stage list; repeatable stages never move it (TABLE 75)' }),
    F('handoffStatus', 'enum', { label: 'Handoff status', options: E.HandoffStatus, desc: 'Set while a custody transfer is open: AWAITING_ACCEPTANCE, ACCEPTED or DISPUTED (TABLE 38 two-party handoff)' }),
    F('publicVerifyCode', 'string', { req: 1, uniq: 1, idx: 1, label: 'Public verify code', desc: 'aquatrace.cerulea.io/verify/<code>, also a QR on each record' }),
    F('createdAt', 'datetime', { label: 'Created at' }),
  ],
  { core: true, access: ACCESS.AUTH }
);

// ---------------------------------------------------------------------------
// 6. Two-party handoff and the stage ledger (TABLE 38, TABLE 75)
// ---------------------------------------------------------------------------

const HandoffAgreement = ENT(
  'ent-workflow',
  'HandoffAgreement',
  'TABLE 38 two-party handoff: "on a custody transfer the unit enters AWAITING_ACCEPTANCE; the receiver co-signs (ACCEPTED) or opens a dispute (DISPUTED)". TABLE 75: the stage routes the unit to the next role\'s incoming queue and the receiver co-signs the declared fields. Surfaced as incoming custody handoffs on /dashboard (TABLE 76).',
  [
    ID(),
    REF('traceUnitId', 'TraceUnit', 'The unit changing custody'),
    F('stageKey', 'enum', { req: 1, label: 'Stage key', options: E.StageKey }),
    F('fromRole', 'enum', { req: 1, label: 'From role', options: E.Role }),
    F('toRole', 'enum', { req: 1, label: 'To role', options: E.Role }),
    F('declaredFields', 'json', { label: 'Declared fields', desc: 'The values the receiver co-signs, taken from the handoff column of TABLES 42-43' }),
    F('status', 'enum', { req: 1, label: 'Status', options: E.HandoffStatus, def: 'AWAITING_ACCEPTANCE' }),
    F('senderSignature', 'bytes32', { storage: 'on-chain', label: 'Sender signature', desc: 'ed25519 signature by the party releasing custody' }),
    F('receiverSignature', 'bytes32', { storage: 'on-chain', label: 'Receiver signature', desc: 'ed25519 co-signature; present only once the handoff is ACCEPTED' }),
    F('acceptedAt', 'datetime', { label: 'Accepted at' }),
    F('disputedAt', 'datetime', { label: 'Disputed at' }),
    ...CHAIN(),
  ],
  { core: true, access: ACCESS.AUTH, onChain: true }
);

const StageTransition = ENT(
  'ent-workflow',
  'StageTransition',
  'The chain-of-custody timeline behind /records/:id (TABLE 76): one row for every on-chain event recorded against a unit, in pipeline order. Each row points at the AquaChain transaction that anchored it.',
  [
    ID(),
    REF('traceUnitId', 'TraceUnit', 'The unit this transition belongs to'),
    F('stageKey', 'enum', { req: 1, label: 'Stage key', options: E.StageKey }),
    F('txType', 'enum', { req: 1, label: 'Transaction type', options: E.TxType }),
    F('txHash', 'bytes32', { storage: 'on-chain', idx: 1, label: 'Transaction hash', desc: 'The AquaChain transaction that anchored this stage' }),
    F('recordedByRole', 'enum', { req: 1, label: 'Recorded by role', options: E.Role }),
    F('recordedAt', 'datetime', { req: 1, label: 'Recorded at' }),
  ],
  { access: ACCESS.AUTH }
);

// ---------------------------------------------------------------------------
// 7. Disputes and lot holds (TABLE 38, TABLE 72)
// ---------------------------------------------------------------------------

const Dispute = ENT(
  'quality-recall-ledger',
  'Dispute',
  'The DISPUTED branch of the two-party handoff (TABLE 38): the receiver flags a discrepancy instead of co-signing. Only roles holding flag_discrepancy on ship_receive_event (TABLE 41) can raise one. Anchored on chain so the disagreement is part of the record.',
  [
    ID(),
    REF('handoffAgreementId', 'HandoffAgreement', 'The custody transfer being disputed'),
    REF('traceUnitId', 'TraceUnit', 'The unit under dispute'),
    F('raisedByRole', 'enum', { req: 1, label: 'Raised by role', options: E.Role }),
    F('discrepancyNote', 'text', { label: 'Discrepancy note', desc: 'What the receiver found different from the declared fields' }),
    F('status', 'enum', { req: 1, label: 'Status', options: ['OPEN', 'RESOLVED'], def: 'OPEN' }),
    F('resolvedAt', 'datetime', { label: 'Resolved at' }),
    ...CHAIN(),
  ],
  { access: ACCESS.AUTH, onChain: true }
);

const LotHold = ENT(
  'quality-recall-ledger',
  'LotHold',
  'The consequence of a breached monitoring rule (TABLE 72): "a residue reading has exceeded its maximum residue limit. The affected lot must be held." Also raised when an input is not on the Coastal Aquaculture Authority certified list, or manually by a quality manager.',
  [
    ID(),
    REF('traceUnitId', 'TraceUnit', 'The unit whose lot is held'),
    F('lotRef', 'string', { req: 1, idx: 1, label: 'Lot reference' }),
    F('reason', 'enum', { req: 1, label: 'Reason', options: ['RESIDUE_BREACH', 'INPUT_NOT_CERTIFIED', 'MANUAL'] }),
    F('heldAt', 'datetime', { req: 1, label: 'Held at' }),
    F('releasedAt', 'datetime', { label: 'Released at' }),
  ],
  { access: ACCESS.AUTH }
);

// ---------------------------------------------------------------------------
// 8. Chain definition tables, compliance and rules (Sections 3.2, 3.3, 7)
// ---------------------------------------------------------------------------

const TransactionTypeDef = ENT(
  'compliance-attestations',
  'TransactionTypeDef',
  'Definition table for the on-chain event kinds. TABLE 39 lists 30 transaction types across shared (18), farmed (7) and wild (5), each with a category and the entity it anchors.',
  [
    ID(),
    F('key', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Transaction type key', options: E.TxType }),
    F('label', 'string', { req: 1, label: 'Label', desc: 'For example "Record pre-harvest sample"' }),
    F('scope', 'enum', { req: 1, label: 'Scope', options: E.Scope }),
    F('category', 'enum', { req: 1, label: 'Category', options: E.TxCategory }),
    F('anchorsEntity', 'string', { label: 'Anchors entity', desc: 'The Section 6 form entity written to the ledger; blank for tx_certificate and tx_document_anchor' }),
  ],
  { core: true, access: ACCESS.ADM }
);

const CertificateTypeDef = ENT(
  'compliance-attestations',
  'CertificateTypeDef',
  'Definition table for the regulatory attestations. TABLE 40 lists 14 certificate types (3 shared, 5 farmed, 6 wild), every one issued by a regulator (eia, eic, caa, mpeda, fssai, realcraft, state_fisheries, dof or msc), with what it anchors, whether it is mandatory, and any destination it applies to.',
  [
    ID(),
    F('key', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Certificate type key', options: E.CertType }),
    F('label', 'string', { req: 1, label: 'Label', desc: 'For example "Coastal aquaculture unit registration"' }),
    F('scope', 'enum', { req: 1, label: 'Scope', options: E.Scope }),
    F('anchors', 'string', { req: 1, label: 'Anchors', desc: 'The entity the certificate attaches to, for example crop_cycle, consignment or processing_plant' }),
    F('issuerKind', 'enum', { req: 1, label: 'Issuer kind', options: E.IssuerKind, def: 'regulator', desc: 'Every one of the 14 types is regulator-issued' }),
    F('issuer', 'enum', { req: 1, label: 'Issuer', options: E.Issuer }),
    F('mandatory', 'boolean', { label: 'Mandatory' }),
    F('appliesDestination', 'enum', { label: 'Applies to destination', options: E.Destination, desc: 'Set only where TABLE 40 narrows the type, for example cert_catch and cert_mpeda_enrolment apply to european_union' }),
  ],
  { core: true, access: ACCESS.ADM }
);

const CertificateMandate = ENT(
  'compliance-attestations',
  'CertificateMandate',
  'Per-profile view of the mandatory column of TABLE 40. TABLE 75 certificate mandate: mandatory certificate types must be anchored for a shipment to score fully compliant on the public verify scorecard.',
  [
    ID(),
    F('profileKey', 'enum', { req: 1, idx: 1, label: 'Profile key', options: E.ProfileKey }),
    F('certType', 'enum', { req: 1, label: 'Certificate type', options: E.CertType }),
    F('mandatory', 'boolean', { label: 'Mandatory' }),
    F('note', 'text', { label: 'Note', desc: 'mandatory types must be anchored for a fully compliant scorecard' }),
  ],
  { access: ACCESS.ADM }
);

const ComplianceScorecard = ENT(
  'compliance-attestations',
  'ComplianceScorecard',
  'The compliance scorecard the /verify screen shows without an account (TABLE 76). TABLE 75: every mandatory certificate type must be anchored, and the lab pass is derived from residue reading <= maximum residue limit.',
  [
    ID(),
    REF('traceUnitId', 'TraceUnit', 'The unit being scored'),
    F('mandatoryCertsRequired', 'int', { req: 1, label: 'Mandatory certificates required', unit: 'certificates' }),
    F('mandatoryCertsAnchored', 'int', { req: 1, label: 'Mandatory certificates anchored', unit: 'certificates' }),
    F('labPass', 'boolean', { label: 'Lab pass', desc: 'Derived from residue reading <= maximum residue limit (TABLE 75 lab pass)' }),
    F('fullyCompliant', 'boolean', { label: 'Fully compliant', desc: 'True only when every mandatory certificate is anchored and the lab result passes' }),
    F('computedAt', 'datetime', { label: 'Computed at' }),
  ],
  { access: ACCESS.AUTH }
);

const MonitoringRule = ENT(
  'compliance-attestations',
  'MonitoringRule',
  'Definition table for the alerting thresholds. TABLE 72 lists 7 monitoring rules (5 farmed, 2 wild) over 5 distinct rule keys: dissolved oxygen low, ammonia high, residue breach, input not certified and transport temperature excursion.',
  [
    ID(),
    F('key', 'enum', { req: 1, idx: 1, label: 'Rule key', options: E.RuleKey, desc: 'Not unique - rule_residue_breach and rule_transport_temperature are declared for both the farmed and the wild scope' }),
    F('scope', 'enum', { req: 1, label: 'Scope', options: E.Scope }),
    F('label', 'string', { req: 1, label: 'Label', desc: 'For example "Dissolved oxygen below safe level"' }),
    F('entity', 'string', { req: 1, label: 'Entity', desc: 'The form entity watched, for example growout_reading or lab_report' }),
    F('field', 'string', { req: 1, label: 'Field', desc: 'The field watched, for example dissolved_oxygen' }),
    F('op', 'enum', { req: 1, label: 'Operator', options: E.RuleOp, desc: 'lt, gt or eq' }),
    F('threshold', 'float', { label: 'Threshold', desc: 'Fixed threshold, for example 4 mg/L dissolved oxygen or 0.1 mg/L ammonia' }),
    F('limitField', 'string', { label: 'Limit field', desc: 'Used instead of a fixed threshold when the limit is a sibling field, for example lab_report.residue_limit' }),
    F('message', 'text', { req: 1, label: 'Message', desc: 'The alert text shown to the operator, verbatim from TABLE 72' }),
  ],
  { core: true, access: ACCESS.ADM }
);

const QualityParameter = ENT(
  'compliance-attestations',
  'QualityParameter',
  'Definition table for the tracked readings. TABLE 73 lists 8 quality parameters (6 farmed, 2 wild) over 7 distinct keys: salinity, dissolved oxygen, pH, ammonia, count grade, residue reading and landed weight.',
  [
    ID(),
    F('key', 'enum', { req: 1, idx: 1, label: 'Parameter key', options: E.QualityParamKey, desc: 'Not unique - qp_residue is declared for both the farmed and the wild scope' }),
    F('scope', 'enum', { req: 1, label: 'Scope', options: E.Scope }),
    F('label', 'string', { req: 1, label: 'Label', desc: 'For example "Acidity (pH)"' }),
    F('entity', 'string', { req: 1, label: 'Entity', desc: 'The form entity the reading is captured on' }),
    F('field', 'string', { req: 1, label: 'Field' }),
    F('unit', 'string', { label: 'Unit', desc: 'ppt, mg/L, ug/kg or kg; blank for pH and count grade' }),
  ],
  { access: ACCESS.ADM }
);

const FieldValidationRule = ENT(
  'compliance-attestations',
  'FieldValidationRule',
  'Definition table for the constraints declared on form fields beyond required/typed. TABLE 74 lists 22 field validation rules (10 shared, 8 farmed, 4 wild), for example organisation.legal_name minLen 2 maxLen 200, processing_batch.yield_factor min 0 max 1 and growout_reading.ph min 0 max 14.',
  [
    ID(),
    F('scope', 'enum', { req: 1, label: 'Scope', options: E.Scope }),
    F('entity', 'string', { req: 1, label: 'Entity' }),
    F('field', 'string', { req: 1, label: 'Field' }),
    F('valueType', 'string', { req: 1, label: 'Value type', desc: 'text, quantity or number, as declared in TABLE 74' }),
    F('constraint', 'string', { req: 1, label: 'Constraint', desc: 'Verbatim from TABLE 74, for example "min 0, max 1"' }),
  ],
  { access: ACCESS.ADM }
);

// ---------------------------------------------------------------------------
// 9. Data collections (Section 2) - the lookup registries reference fields use
// ---------------------------------------------------------------------------

const SpeciesRegistry = ENT(
  'produce-grades',
  'SpeciesRegistry',
  'Section 2 species collection. TABLES 29-30 list 15 species: 5 farmed (vannamei, monodon, scampi, seabass, tilapia, each with a scientific name) and 10 wild (grouped as cephalopod, small_pelagic, demersal or shrimp).',
  [
    ID(),
    F('key', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Species key', options: E.Species }),
    F('label', 'string', { req: 1, label: 'Label', desc: 'For example "Pacific white shrimp (Penaeus vannamei)"' }),
    F('scope', 'enum', { req: 1, label: 'Scope', options: E.Scope }),
    F('scientificName', 'string', { label: 'Scientific name', desc: 'Carried on the 5 farmed species, for example Macrobrachium rosenbergii' }),
    F('speciesGroup', 'string', { label: 'Species group', desc: 'Carried on the 10 wild species: cephalopod, small_pelagic, demersal or shrimp' }),
  ],
  { access: ACCESS.ADM }
);

const ProductFormRegistry = ENT(
  'produce-grades',
  'ProductFormRegistry',
  'Section 2 product_forms collection. TABLES 31-32 list 11 product forms: 6 farmed (hoso, hlso, pd, pud, cooked, value_added) and 5 wild (whole, headed, gutted, cleaned, fillet).',
  [
    ID(),
    F('key', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Product form key', options: E.ProductForm }),
    F('label', 'string', { req: 1, label: 'Label', desc: 'For example "Head-on shell-on (HOSO)"' }),
    F('scope', 'enum', { req: 1, label: 'Scope', options: E.Scope }),
  ],
  { access: ACCESS.ADM }
);

const CountGradeRegistry = ENT(
  'produce-grades',
  'CountGradeRegistry',
  'Section 2 count_grades collection, farmed scope. TABLE 33 lists 7 count grades from u15 (under 15) to 51_60, used by harvest_event.count_grade and tracked as quality parameter qp_count_grade (TABLE 73).',
  [
    ID(),
    F('key', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Count grade key', options: E.CountGrade }),
    F('label', 'string', { req: 1, label: 'Label', desc: 'For example "16 to 20"' }),
  ],
  { access: ACCESS.ADM }
);

const DestinationRegistry = ENT(
  'produce-grades',
  'DestinationRegistry',
  'Section 2 destinations collection, shared by both profiles. TABLES 34-35 list the same 6 export destinations: united_states, european_union, china, south_east_asia, japan and middle_east. TABLE 40 narrows cert_catch and cert_mpeda_enrolment to european_union.',
  [
    ID(),
    F('key', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Destination key', options: E.Destination }),
    F('label', 'string', { req: 1, label: 'Label', desc: 'For example "European Union"' }),
  ],
  { access: ACCESS.ADM }
);

const VesselClassRegistry = ENT(
  'produce-grades',
  'VesselClassRegistry',
  'Section 2 vessel_classes collection, wild scope. TABLE 36 lists 3 vessel classes with their share of landings: mechanised 82, motorised 17, artisanal 1.',
  [
    ID(),
    F('key', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Vessel class key', options: E.VesselClass }),
    F('label', 'string', { req: 1, label: 'Label', desc: 'Mechanised, Motorised or Artisanal' }),
    F('landingsShare', 'int', { label: 'Share of landings', unit: '%', desc: 'landings_share attribute from TABLE 36' }),
  ],
  { access: ACCESS.ADM }
);

const GearTypeRegistry = ENT(
  'produce-grades',
  'GearTypeRegistry',
  'Section 2 gear_types collection, wild scope. TABLE 37 lists 6 gear types: trawl net, bag net, seine, gill net, ring seine and hand line.',
  [
    ID(),
    F('key', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Gear type key', options: E.GearType }),
    F('label', 'string', { req: 1, label: 'Label', desc: 'For example "Ring seine"' }),
  ],
  { access: ACCESS.ADM }
);

// ---------------------------------------------------------------------------
// 10. Alerts, audit and notifications
// ---------------------------------------------------------------------------

const Alert = ENT(
  'alerts-paging',
  'Alert',
  'A fired instance of a monitoring rule (TABLE 72), shown as live alerts on /dashboard (TABLE 76). Carries the observed value against the threshold that tripped it and the verbatim rule message.',
  [
    ID(),
    F('ruleKey', 'enum', { req: 1, idx: 1, label: 'Rule key', options: E.RuleKey }),
    REF('traceUnitId', 'TraceUnit', 'The unit the reading belongs to'),
    F('entity', 'string', { req: 1, label: 'Entity', desc: 'The form entity the reading was captured on' }),
    F('field', 'string', { req: 1, label: 'Field' }),
    F('observedValue', 'float', { label: 'Observed value' }),
    F('threshold', 'float', { label: 'Threshold', desc: 'The fixed threshold or the resolved limit field value' }),
    F('message', 'text', { label: 'Message', desc: 'The rule message from TABLE 72' }),
    F('raisedAt', 'datetime', { req: 1, label: 'Raised at' }),
    F('acknowledgedAt', 'datetime', { label: 'Acknowledged at' }),
    F('acknowledgedByRole', 'enum', { label: 'Acknowledged by role', options: E.Role }),
  ],
  { access: ACCESS.AUTH }
);

const AuditLog = ENT(
  'audit-logs',
  'AuditLog',
  'Tenant-scoped audit trail of every permissioned action. Actions are the eight in Section 9.1 (create, read, update, accept_handoff, flag_discrepancy, issue_certificate, record_event, verify) and entity "*" means any entity, matching the grants in TABLE 41.',
  [
    ID(),
    REF('tenantId', 'Tenant', 'The organisation the action happened in'),
    REF('actorUserId', 'User', 'The user who performed the action'),
    F('action', 'enum', { req: 1, label: 'Action', options: E.PermissionAction }),
    F('entity', 'string', { req: 1, label: 'Entity' }),
    F('recordId', 'string', { idx: 1, label: 'Record id' }),
    F('details', 'json', { label: 'Details' }),
    F('at', 'datetime', { req: 1, label: 'At' }),
  ],
  { access: ACCESS.SYS }
);

const Notification = ENT(
  'notifications',
  'Notification',
  'What drives the /dashboard queues (TABLE 76): incoming custody handoffs to accept or dispute, live alerts, dispute updates, invitations and confirmations that a stage was recorded. Delivered in the user\'s locale (Section 10.1).',
  [
    ID(),
    REF('tenantId', 'Tenant', 'The organisation the notification belongs to'),
    REF('userId', 'User', 'The recipient'),
    F('kind', 'enum', { req: 1, label: 'Kind', options: ['HANDOFF_INCOMING', 'ALERT', 'DISPUTE', 'INVITE', 'STAGE_RECORDED'] }),
    F('title', 'string', { req: 1, label: 'Title' }),
    F('body', 'text', { label: 'Body' }),
    F('traceUnitId', 'uuid', { idx: 1, label: 'Trace unit', desc: 'The unit the notification is about, where there is one' }),
    F('read', 'boolean', { label: 'Read', def: false }),
    F('createdAt', 'datetime', { label: 'Created at' }),
  ],
  { access: ACCESS.AUTH }
);

// ---------------------------------------------------------------------------
// 11. Localisation, branding and the surface (Sections 8 and 10)
// ---------------------------------------------------------------------------

const Locale = ENT(
  'i18n',
  'Locale',
  'Section 10.1: 9 supported locales - en (English), te (Telugu), ta (Tamil), ml (Malayalam), or (Odia), bn (Bengali), gu (Gujarati), mr (Marathi), kn (Kannada). en is the complete base, missing keys fall back to English.',
  [
    ID(),
    F('code', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Locale code', options: E.Locale }),
    F('label', 'string', { req: 1, label: 'Label', desc: 'For example "Malayalam"' }),
    F('isBase', 'boolean', { label: 'Is base locale', desc: 'True only for en - the complete base' }),
    F('fallback', 'enum', { req: 1, label: 'Fallback locale', options: E.Locale, def: 'en', desc: 'Any missing key falls back to English' }),
  ],
  { access: ACCESS.ADM }
);

const TerminologyOverride = ENT(
  'i18n',
  'TerminologyOverride',
  'Definition table for the per-profile renaming in Section 10.2. TABLES 79-80 list 12 overrides, 6 per profile, over the same 6 core terms: origin_unit, lot, producer, facility, harvest and handoff. Farmed renames origin_unit to "Broodstock lot"; wild renames it to "Fishing trip".',
  [
    ID(),
    F('profileKey', 'enum', { req: 1, idx: 1, label: 'Profile key', options: E.ProfileKey }),
    F('coreTerm', 'enum', { req: 1, label: 'Core term', options: E.CoreTerm }),
    F('renamedTo', 'string', { req: 1, label: 'Renamed to', desc: 'For example "Custody handover" (farmed) or "Auction handover" (wild)' }),
  ],
  { access: ACCESS.ADM }
);

const BrandProfile = ENT(
  'theme-branding',
  'BrandProfile',
  'Section 10.3 branding, one palette per profile. Farmed - logo brand/farmed-logo.svg, primary #0f766e, secondary #065f46, accent #10b981, surface #f0fdfa, on-surface #0f172a. Wild - logo brand/wild-logo.svg, primary #0369a1, secondary #075985, accent #0ea5e9, surface #f0f9ff, on-surface #0f172a.',
  [
    ID(),
    F('profileKey', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Profile key', options: E.ProfileKey }),
    F('logoPath', 'string', { req: 1, label: 'Logo path', desc: 'brand/farmed-logo.svg or brand/wild-logo.svg' }),
    F('primary', 'string', { req: 1, label: 'Primary colour', desc: '#0f766e farmed, #0369a1 wild' }),
    F('secondary', 'string', { req: 1, label: 'Secondary colour', desc: '#065f46 farmed, #075985 wild' }),
    F('accent', 'string', { req: 1, label: 'Accent colour', desc: '#10b981 farmed, #0ea5e9 wild' }),
    F('surface', 'string', { req: 1, label: 'Surface colour', desc: '#f0fdfa farmed, #f0f9ff wild' }),
    F('onSurface', 'string', { req: 1, label: 'On-surface colour', desc: '#0f172a for both profiles' }),
  ],
  { access: ACCESS.ADM }
);

const AppScreen = ENT(
  'tx-access-policy',
  'AppScreen',
  'Definition table for the application pages. TABLE 76 lists 8 React routes: /login, /accept-invite, /verify (and /verify/:code), /dashboard, /records, /records/:id, /explorer and /admin. Section 8: public pages need no account, the rest require an authenticated session, and admin pages require a platform admin.',
  [
    ID(),
    F('route', 'string', { req: 1, uniq: 1, idx: 1, label: 'Route', desc: 'For example "/verify, /verify/:code"' }),
    F('name', 'string', { req: 1, label: 'Screen name', desc: 'For example "AquaChain explorer"' }),
    F('access', 'enum', { req: 1, label: 'Access', options: E.ScreenAccess, desc: 'PUBLIC, PUBLIC_TOKEN (/accept-invite), AUTHENTICATED or PLATFORM_ADMIN' }),
    F('purpose', 'text', { req: 1, label: 'Purpose', desc: 'The purpose column of TABLE 76, verbatim' }),
  ],
  { access: ACCESS.ADM }
);

const ChainVerificationRun = ENT(
  'chain-audit-export',
  'ChainVerificationRun',
  'TABLE 38 explorer: the chain is "re-verified end to end" (blockchain/explorer.ts). One row per verification pass, recording the head block reached, how many blocks were re-hashed and the first block where the hash link broke, if any.',
  [
    ID(),
    F('startedAt', 'datetime', { req: 1, label: 'Started at' }),
    F('headBlockNumber', 'int', { label: 'Head block number' }),
    F('blocksVerified', 'int', { label: 'Blocks verified', unit: 'blocks' }),
    F('verified', 'boolean', { label: 'Verified', desc: 'True when every previousHash -> blockHash link and Merkle root re-computed cleanly' }),
    F('brokenAtBlock', 'int', { label: 'Broken at block', desc: 'The first block whose hash link failed; empty on a clean run' }),
    F('ranBy', 'string', { label: 'Ran by', desc: 'The explorer session or scheduled job that ran the pass' }),
  ],
  { access: ACCESS.SYS }
);

// ---------------------------------------------------------------------------
// 12. Document custody and signing
// ---------------------------------------------------------------------------

const StoredDocument = ENT(
  'asset-storage',
  'StoredDocument',
  'Every file behind a document_anchor transaction (TABLE 39 tx_document_anchor): certificates, lab reports and export paperwork. The bytes live in object storage; the SHA-256 digest is what goes on chain, so the file can be proved unchanged from the /verify screen.',
  [
    ID(),
    REF('tenantId', 'Tenant', 'The organisation that owns the file'),
    F('s3Key', 'file', { req: 1, uniq: 1, label: 'Object storage key' }),
    F('sha256Digest', 'bytes32', { storage: 'on-chain', req: 1, idx: 1, label: 'SHA-256 digest', desc: 'The digest anchored by tx_document_anchor' }),
    F('fileSize', 'int', { label: 'File size', unit: 'bytes' }),
    F('originalFilename', 'string', { label: 'Original filename' }),
    F('mimeType', 'string', { label: 'MIME type' }),
    REF('uploadedById', 'Uploaded by', 'The user who uploaded the file'),
    F('uploadedAt', 'datetime', { label: 'Uploaded at' }),
  ],
  { access: ACCESS.AUTH }
);

const ESignRequest = ENT(
  'document-signing',
  'ESignRequest',
  'A signature request against a stored document. The default provider is the actor\'s own ed25519 key (TABLE 38 signing); DocuSign is the fallback where a party cannot use its chain key. Either way the resulting signature digest is anchored on AquaChain.',
  [
    ID(),
    REF('documentId', 'StoredDocument', 'The document to be signed'),
    REF('signerUserId', 'Signer', 'The user asked to sign'),
    F('provider', 'enum', { req: 1, label: 'Provider', options: ['ED25519', 'DOCUSIGN'], def: 'ED25519' }),
    F('status', 'enum', { req: 1, label: 'Status', options: ['PENDING', 'SIGNED', 'DECLINED'], def: 'PENDING' }),
    F('signedAt', 'datetime', { label: 'Signed at' }),
    F('signatureDigest', 'bytes32', { storage: 'on-chain', label: 'Signature digest', desc: 'Anchored on AquaChain once the document is signed' }),
  ],
  { access: ACCESS.AUTH }
);

// ---------------------------------------------------------------------------

const ENTITIES = [
  // Organisations, identity and access
  Tenant,
  Invitation,
  User,
  Role,
  RolePermission,
  // Sessions, MFA, abuse controls
  AuthSession,
  MfaEnrolment,
  RateLimitBucket,
  LoginAttempt,
  // Chain key custody
  ChainKeypair,
  MasterKey,
  // AquaChain
  ChainBlock,
  ChainTransaction,
  ValidatorSignature,
  ValidatorNode,
  PlatformSettings,
  // Profiles and the pipeline
  Profile,
  ProfileStage,
  TraceUnit,
  // Handoff and stage ledger
  HandoffAgreement,
  StageTransition,
  // Disputes and holds
  Dispute,
  LotHold,
  // Chain definition tables, compliance and rules
  TransactionTypeDef,
  CertificateTypeDef,
  CertificateMandate,
  ComplianceScorecard,
  MonitoringRule,
  QualityParameter,
  FieldValidationRule,
  // Data collections
  SpeciesRegistry,
  ProductFormRegistry,
  CountGradeRegistry,
  DestinationRegistry,
  VesselClassRegistry,
  GearTypeRegistry,
  // Alerts, audit, notifications
  Alert,
  AuditLog,
  Notification,
  // Localisation, branding, surface
  Locale,
  TerminologyOverride,
  BrandProfile,
  AppScreen,
  ChainVerificationRun,
  // Documents
  StoredDocument,
  ESignRequest,
];

/** [fromEntityName, toEntityName, type] - names are resolved to ids by the seeder. */
const RELS = [
  // The tenant is the isolation boundary (TABLE 78)
  ['Tenant', 'User', 'oneToMany'],
  ['Tenant', 'Invitation', 'oneToMany'],
  ['Tenant', 'TraceUnit', 'oneToMany'],
  ['Tenant', 'AuditLog', 'oneToMany'],
  ['Tenant', 'Notification', 'oneToMany'],
  ['Tenant', 'StoredDocument', 'oneToMany'],

  // Roles and permissions (TABLE 41, Section 9.1)
  ['Role', 'RolePermission', 'oneToMany'],
  ['Role', 'User', 'relatedTo'],
  ['Role', 'ProfileStage', 'relatedTo'],
  ['Role', 'StageTransition', 'relatedTo'],
  ['Role', 'HandoffAgreement', 'relatedTo'],
  ['Role', 'Alert', 'relatedTo'],

  // Sessions, MFA and chain key custody (TABLE 78)
  ['User', 'AuthSession', 'oneToMany'],
  ['User', 'MfaEnrolment', 'oneToMany'],
  ['User', 'LoginAttempt', 'oneToMany'],
  ['User', 'ChainKeypair', 'oneToOne'],
  ['User', 'Notification', 'oneToMany'],
  ['User', 'AuditLog', 'relatedTo'],
  ['User', 'StoredDocument', 'relatedTo'],
  ['User', 'ESignRequest', 'relatedTo'],

  // Profiles drive the pipeline, the terminology and the compliance mandates
  ['Profile', 'ProfileStage', 'oneToMany'],
  ['Profile', 'TerminologyOverride', 'oneToMany'],
  ['Profile', 'CertificateMandate', 'oneToMany'],
  ['Profile', 'BrandProfile', 'oneToOne'],
  ['Profile', 'TraceUnit', 'relatedTo'],
  ['ProfileStage', 'TransactionTypeDef', 'relatedTo'],

  // Everything that happens to a traceable unit
  ['TraceUnit', 'HandoffAgreement', 'oneToMany'],
  ['TraceUnit', 'StageTransition', 'oneToMany'],
  ['TraceUnit', 'Dispute', 'oneToMany'],
  ['TraceUnit', 'LotHold', 'oneToMany'],
  ['TraceUnit', 'Alert', 'oneToMany'],
  ['TraceUnit', 'ComplianceScorecard', 'oneToMany'],
  ['TraceUnit', 'Notification', 'relatedTo'],
  ['HandoffAgreement', 'Dispute', 'oneToMany'],

  // The ledger (TABLE 38)
  ['ChainBlock', 'ChainTransaction', 'oneToMany'],
  ['ChainBlock', 'ValidatorSignature', 'oneToMany'],
  ['ValidatorNode', 'ChainBlock', 'oneToMany'],
  ['ValidatorNode', 'ValidatorSignature', 'oneToMany'],
  ['TransactionTypeDef', 'ChainTransaction', 'relatedTo'],

  // Rules and certificate mandates
  ['MonitoringRule', 'Alert', 'oneToMany'],
  ['CertificateTypeDef', 'CertificateMandate', 'oneToMany'],

  // Documents
  ['StoredDocument', 'ESignRequest', 'oneToMany'],

  // Anchoring: the workflow records point at their chain transaction
  ['StageTransition', 'ChainTransaction', 'relatedTo'],
  ['HandoffAgreement', 'ChainTransaction', 'relatedTo'],
];

module.exports = { ENTITIES, RELS };
