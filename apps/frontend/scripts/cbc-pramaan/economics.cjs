/**
 * CBC-PRAMAAN - Step 3 economics.
 * The Cerulea private permissioned chain behind GeM is non-crypto: NO tokens, NO wallets, NO mining, NO gas.
 * Step 3 reads the step3-compatible keys and honours nativeToken:false + gasPolicy.gasless.
 * The `chain` block is the authoritative chain configuration (spec section 4, CHN-01 .. CHN-27, ENUM-14).
 */
const VALIDATORS = [
  { nodeId: 'validator-gem-gateway',   organization: 'GeM API Gateway (CBC-PRAMAAN Integration)', status: 'ONLINE' },
  { nodeId: 'validator-dpiit',         organization: 'DPIIT National Node',                       status: 'ONLINE' },
  { nodeId: 'validator-nodal-ministry', organization: 'Nodal Ministry Rotating Seat',              status: 'ONLINE' },
];

const CONSTANTS = {
  dpiitClassIFloorPercent: 50,
  dpiitClassIIFloorPercent: 20,
  nearThresholdBandPoints: 2,
  caCertificateMandatoryAboveRupees: 100000000,
  caMismatchTolerancePoints: 5,
  sameProductDeltaThresholdPoints: 10,
  volumeMismatchThresholdUnits: 10000,
  smallFacilityKeywords: ['small workshop', 'small unit', 'small facility'],
  miiBandMultiplier: 1.20,
  mseBandMultiplier: 1.15,
  debarmentMaximumYears: 2,
  debarmentRule: 'GFR Rule 151(iii)',
  evaluationCacheTtlSeconds: 300,
  smartEvolutionMinimumApprovers: 2,
  dcfQuorum: '2 of 3',
};

const ECONOMICS = {
  track: 'blockchain',
  model: 'permissioned-no-token',
  nativeToken: false,

  chain: {
    name: 'CBC-PRAMAAN Cerulea Private Permissioned Chain',
    chainId: 'cbc-pramaan-1',
    kind: 'hash-chained, quorum-finalised, ACL-scoped ledger behind GeM (PPP-MII compliance trust layer)',
    cryptocurrency: 'none',
    gas: 'none',
    wallets: 'none - identity is role + id (GeM identity / DSC in production)',
    mining: 'none',
    hashing: 'sha256 hex digest of UTF-8 input; sha256Json = sha256(JSON.stringify(value)) (CHN-06, CHN-07)',
    merkleRoot: 'empty list -> sha256(""); pairwise sha256(left + right), odd leaf paired with itself (CHN-08)',
    blockHash: 'sha256 of JSON {height, prevHash, merkleRoot, timestamp} in that key order; txRefs excluded (CHN-09)',
    txRef: "'tx_' + base36(now) + '_' + base36(counter) + '_' + first 10 hex of sha256Json({type, payload, timestamp}) (CHN-10)",
    blockProduction: 'one transaction per block: submitTransaction wraps each action in its own block; height = previous + 1, 0 on an empty chain (CHN-11)',
    genesisHash: "sha256('CBC-PRAMAAN / Cerulea Private Permissioned Chain / genesis') used as prevHash of block 0 (CHN-05)",
    consensus: 'DCF: each validator independently recomputes the candidate block hash; a match yields signature = sha256(nodeId + ":" + blockHash + ":cerulea-dcf-v1") with confirmedAt (CHN-13)',
    quorum: 'finalised at signatures >= ceil(3 * 2 / 3) = 2; quorum string "n/3"; failure throws "DCF consensus quorum not reached; block rejected" and nothing is written (CHN-14)',
    finality: 'synchronous: hashing, Merkle root, consensus and both inserts complete inside the call that returns the domain result (CHN-15)',
    CONSENSUS_VALIDATOR_COUNT: 3,
    CONSENSUS_THRESHOLD: 2,
    validators: VALIDATORS,
    storage: 'SQLite chain.db (WAL) at <project>/data/chain.db, /tmp/cbc-pramaan-data/chain.db on Vercel; tables blocks, transactions, logic_versions (CHN-01 .. CHN-04)',
    accessControl: 'acl {vendorIds?, ministries?, tenderIds?, caIds?, public?} on every transaction; canAccess implements ROLE-09 .. ROLE-16 (private collections)',
    smartEvolution: 'versioned logic: upgradeLogic rejects < 2 approvers and non-increasing versions, hashes old/new payloads, writes public LOGIC_UPGRADED then inserts logic_versions (CHN-25 .. CHN-27)',
    transactionTypes: ['RULE_UPDATED','BID_SUBMITTED','PREFERENCE_CALCULATED','PREFERENCE_COMMITTEE_ACTION','CA_CERTIFICATION','DEBARMENT_CREATED','DEBARMENT_WEBHOOK_EMITTED','AUDITOR_FLAGGED','LOGIC_UPGRADED'],
    constants: CONSTANTS,
    productionReplacements: 'SIM-01 separate Cerulea validator nodes; SIM-02 real digital signatures; SIM-03 GeM identity + DSC; SIM-05 real procuring-entity webhooks; SIM-10 durable storage',
  },

  tokenomics: {
    enabled: false,
    name: 'No native token (non-crypto permissioned network)',
    symbol: '-',
    totalSupply: 0,
    inflationRate: 0,
    model: 'none',
    distribution: { validators: { percent: 0 }, platformTreasury: { percent: 0 } },
  },
  gasPolicy: {
    gasless: true, baseFee: 0, burnPercent: 0, blockGasLimit: 0, elasticityMultiplier: 1, dynamic: false, priorityTip: false,
    note: 'No gas. One transaction per block, finalised synchronously by DCF quorum; no fee market.',
  },
  staking: {
    minValidatorStake: 0, unbondingPeriodDays: 0, maxValidatorCount: 3, delegationEnabled: false, minDelegationAmount: 0, slashingConditions: {},
    validatorSet: 'static, permissioned: GeM API Gateway, DPIIT National Node, Nodal Ministry Rotating Seat',
  },
  governance: {
    model: 'validator-set', quorumPercent: 67, passThresholdPercent: 67, votingPeriodDays: 0, timelockDelayHours: 0, vetoThresholdPercent: 0,
    description: 'DCF quorum 2 of 3 finalises blocks. Rule Registry: DPIIT fixed floor (Class-I >= 50, Class-II >= 20, Class-II < Class-I); nodal ministries can only raise thresholds. Smart Evolution logic upgrades need >= 2 approvers.',
  },
  security: {
    identity: 'no login: selected identity {role, id, label} carried as ?role=&id= on every request; missing/invalid resolves to VENDOR __anonymous__ (public records only)',
    privateCollections: 'AUDIT and DPIIT_ADMIN read everything; VENDOR only acl.vendorIds; CA only acl.caIds; PROCURING_ENTITY any tx with a tenderId; MINISTRY_ADMIN only acl.ministries',
    publicVerification: '/verify resolves txRef or payload hash to {found, txRef, blockHeight, blockHash, type, timestamp}; never returns payload, price or percentage',
    errorEnvelope: 'any thrown Error becomes HTTP 400 {error}',
  },
};

module.exports = { ECONOMICS, VALIDATORS, CONSTANTS };
