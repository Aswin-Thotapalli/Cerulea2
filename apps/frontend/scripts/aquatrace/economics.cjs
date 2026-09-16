/**
 * AquaTrace — Step 3 economics.
 * AquaChain is a permissioned ledger: NO cryptocurrency, NO gas. Step 3 reads
 * the step3-compatible keys and honours nativeToken:false + gasPolicy.gasless.
 * The `chain` block is the authoritative AquaChain configuration (spec §3.1, §9.3).
 */
const VALIDATORS = [
  { nodeId: 'aquachain-validator-1', name: 'Validator 1', status: 'ONLINE' },
  { nodeId: 'aquachain-validator-2', name: 'Validator 2', status: 'ONLINE' },
  { nodeId: 'aquachain-validator-3', name: 'Validator 3', status: 'ONLINE' },
  { nodeId: 'aquachain-validator-4', name: 'Validator 4', status: 'ONLINE' },
  { nodeId: 'aquachain-validator-5', name: 'Validator 5', status: 'ONLINE' },
];

const ECONOMICS = {
  track: 'blockchain',
  model: 'permissioned-no-token',
  nativeToken: false,

  chain: {
    name: 'AquaChain',
    chainId: 'aquatrace-1',
    kind: 'permissioned ledger every record anchors to',
    cryptocurrency: 'none',
    gas: 'none',
    signing: 'each event is signed with the acting party\'s own ed25519 key (blockchain/keys.ts)',
    hashing: 'SHA-256 over the canonical event payload',
    blocks: 'transactions batched into a block with a Merkle root; each block carries previousHash -> blockHash (hash-linked chain)',
    blockProduction: 'a producer node seals a block every BLOCK_INTERVAL_MS (default 5000 ms) when transactions are pending (blockchain/producer.ts)',
    BLOCK_INTERVAL_MS: 5000,
    validatorSet: 'CONSENSUS_VALIDATOR_COUNT validator nodes (default 5) co-sign each block (blockchain/nodes.ts)',
    CONSENSUS_VALIDATOR_COUNT: 5,
    finality: 'a block finalises at CONSENSUS_THRESHOLD signatures (default 4 of 5)',
    CONSENSUS_THRESHOLD: 4,
    validators: VALIDATORS,
    keyCustody: 'each actor holds an ed25519 keypair; the private key is encrypted at rest with CHAIN_MASTER_KEY (32-byte / 64-hex master key)',
    twoPartyHandoff: 'on a custody transfer the unit enters AWAITING_ACCEPTANCE; the receiver co-signs (ACCEPTED) or opens a dispute (DISPUTED)',
    explorer: 'public/authenticated explorer shows finalized blocks, confirmed & pending transactions, the head block, and re-verifies the chain end to end (blockchain/explorer.ts)',
    txTypes: 30,
    certificateTypes: 14,
    anchoredEntities: ['organisation','processing_plant','processing_batch','lab_report','handling_event','transport_event','ship_receive_event','lot_transform_event','consignment','certificate','document_anchor','customs_event','shipping_event','import_event','distribution_event','retail_event','crop_cycle','broodstock_event','hatchery_event','input_application_event','growout_reading','sampling_event','harvest_event','fishing_trip','onvessel_processing_event','transhipment_event','landing_event','auction_event'],
  },

  tokenomics: {
    enabled: false,
    name: 'No native token (permissioned network)',
    symbol: '—',
    totalSupply: 0,
    inflationRate: 0,
    model: 'none',
    distribution: { validators: { percent: 0 }, platformTreasury: { percent: 0 } },
  },
  gasPolicy: {
    gasless: true, baseFee: 0, burnPercent: 0, blockGasLimit: 0, elasticityMultiplier: 1, dynamic: false, priorityTip: false,
    note: 'No gas. Block cadence is BLOCK_INTERVAL_MS (5 s), not a fee market.',
  },
  staking: {
    minValidatorStake: 0, unbondingPeriodDays: 0, maxValidatorCount: 5, delegationEnabled: false, minDelegationAmount: 0, slashingConditions: {},
    validatorSet: 'static, permissioned (5 co-signing validator nodes)',
  },
  governance: {
    model: 'validator-set', quorumPercent: 80, passThresholdPercent: 80, votingPeriodDays: 0, timelockDelayHours: 0, vetoThresholdPercent: 0,
    description: '4-of-5 validator signatures finalise blocks. platform_admin switches profiles and administers within a tenant; platform_super_admin adds user management and system settings.',
  },
  security: {
    accessTokenSeconds: 900, refreshTokenSeconds: 1209600, mfa: 'TOTP, issuer label "AquaTrace" (MFA_ISSUER)',
    rateLimit: '120 requests per 60 s window', tenantIsolation: 'every organisation and its records scoped to a tenant; a normal user is bound to exactly one profile',
    readOnlyOversight: 'regulator_auditor holds verify + read* and never advances the workflow',
  },
};

module.exports = { ECONOMICS, VALIDATORS };
