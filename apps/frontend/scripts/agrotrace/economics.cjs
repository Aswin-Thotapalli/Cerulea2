/**
 * AgroTrace — Step 3 economics.
 * AgroChain is an internal, permissioned ledger: NO cryptocurrency, NO gas, NO
 * external wallet. Step 3 reads the step3-compatible keys (tokenomics/gasPolicy/
 * staking/governance) and honours nativeToken:false + gasPolicy.gasless (see
 * step3.tsx). The `chain` block is the authoritative AgroChain configuration.
 */
const VALIDATORS = [
  { nodeId: 'agrochain-mumbai-1',    name: 'Validator 1 — Mumbai',    location: 'Mumbai, IN',    status: 'ONLINE' },
  { nodeId: 'agrochain-singapore-1', name: 'Validator 2 — Singapore', location: 'Singapore, SG', status: 'ONLINE' },
  { nodeId: 'agrochain-node-3',      name: 'Validator 3',             location: 'per deployment', status: 'ONLINE' },
  { nodeId: 'agrochain-node-4',      name: 'Validator 4',             location: 'per deployment', status: 'ONLINE' },
  { nodeId: 'agrochain-node-5',      name: 'Validator 5',             location: 'per deployment', status: 'ONLINE' },
];

const ECONOMICS = {
  track: 'blockchain',
  model: 'permissioned-no-token',
  nativeToken: false,

  chain: {
    name: 'AgroChain',
    chainId: 'agrotrace-1',
    kind: 'internal permissioned ledger',
    cryptocurrency: 'none',
    gas: 'none',
    externalWallet: 'none — users never touch crypto',
    hashing: 'SHA-256 throughout: txHash = sha256(txData); payloadHash = sha256(payload)',
    blocks: 'hash-linked; each block stores previousBlockHash, a Merkle root of its transactions, and a producer node; genesis previousBlockHash = 64 zeros',
    validators: VALIDATORS,
    validatorCount: 5,
    producerSelection: 'round-robin',
    consensus: 'four-of-five threshold (consensusThreshold = 4); block moves PENDING_CONSENSUS -> FINALISED at threshold, otherwise it does not finalise',
    consensusThreshold: 4,
    blockStatuses: ['PENDING_CONSENSUS', 'FINALISED'],
    mempool: { minDelaySeconds: 5, maxDelaySeconds: 20, selection: 'randomised', badge: 'ChainBadge amber while pending, green on finalisation' },
    wallets: 'each participant has a deterministic wallet address (0x + 40 hex); every event is attributed to its actor wallet (signed action)',
    txTypes: ['LOT_REGISTERED','RESIDUE_TEST_RECORDED','SHIPMENT_CREATED','EVENT_RECORDED','CERTIFICATE_ANCHORED','CUSTODY_TRANSFERRED','BREACH_RECORDED','DISPUTE_INITIATED','DISPUTE_RESOLVED','COMPLIANCE_OVERRIDE'],
  },

  // step3-compatible shapes (permissioned values)
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
    gasless: true,
    baseFee: 0,
    burnPercent: 0,
    blockGasLimit: 0,
    elasticityMultiplier: 1,
    dynamic: false,
    priorityTip: false,
    note: 'No gas. Transactions are free; the mempool delay (5–20 s) is a consensus timing property, not a fee market.',
  },
  staking: {
    minValidatorStake: 0,
    unbondingPeriodDays: 0,
    maxValidatorCount: 5,
    delegationEnabled: false,
    minDelegationAmount: 0,
    slashingConditions: {},
    validatorSet: 'static, permissioned (5 nodes, allowlisted via node-permissioning)',
  },
  governance: {
    model: 'validator-set',
    quorumPercent: 80,
    passThresholdPercent: 80,
    votingPeriodDays: 0,
    timelockDelayHours: 0,
    vetoThresholdPercent: 0,
    description: '4-of-5 validator consensus finalises blocks. Platform admins manage tenants, platform settings and the per-commodity compliance matrix. COMPLIANCE_OVERRIDE is an on-chain, audited transaction type.',
  },

  platformBilling: {
    kind: 'SaaS subscription (off-chain)',
    tiers: ['STARTER', 'GROWTH', 'ENTERPRISE'],
    limits: 'per tenant: maxActiveShipments, maxParticipantAccounts',
    note: 'No on-chain fees of any kind.',
  },
};

module.exports = { ECONOMICS, VALIDATORS };
