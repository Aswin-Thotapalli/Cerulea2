/**
 * CBC-PRAMAAN - Step 2 behaviour: LOGIC flows.
 * Grounded in SPEC.md Sections 4 to 12 (CHN, RUL, ENG, API, SHL, SCR, SEED, SCN, OPS, SIM).
 * A. Chain layer, CHN-05 to CHN-27 (flow01-flow12)
 * B. Rule Registry, RUL-01 to RUL-10 (flow13-flow17)
 * C. Classification Engine, ENG-01 to ENG-09 (flow18-flow23)
 * D. Consistency Engine, ENG-10 to ENG-15 (flow24-flow27)
 * E. Debarment, Certification and Auditor Accountability, ENG-16 to ENG-26 (flow28-flow33)
 * F. Trigger 1 Bid Submission orchestrator, ENG-27 to ENG-41 (flow34-flow37)
 * G. Trigger 2 Bid Evaluation, API-02 and APX-04 (flow38)
 * H. Trigger 3 Purchase Preference Decision Engine, ENG-42 to ENG-60 (flow39-flow47)
 * I. Analytics read model, ENG-61 to ENG-66 (flow48)
 * J. API surface and application shell, APX-01 to APX-03, ROLE-17, SHL-06, SCR-Z, SCR-A (flow49-flow53)
 * K. Deterministic seed SEED-01 to SEED-13 and acceptance scenarios SCN-01 to SCN-12 (flow54-flow66)
 * L. Operations and PoC simplifications, OPS-01 to OPS-05, SIM-01 to SIM-10 (flow67-flow69)
 * Non-crypto, permissioned: no tokens, no wallets, no gas, no mining, no payments.
 */

const FLOWS = [
  /* === A. CHAIN LAYER (Cerulea private permissioned simulator) ========== */

  {
    id: 'flow01',
    name: 'Deterministic Hashing and Merkle Root',
    trigger: 'A candidate FinalizedBlock is assembled by CeruleaClient before consensus',
    description: 'sha256 and sha256Json are the only digest primitives on the chain, and merkleRoot folds the block payload hashes pairwise into a single root. Block 0 uses the fixed genesis digest as its prevHash.',
    steps: [
      'Compute sha256(string) as the hex digest of the UTF-8 input and sha256Json(value) as sha256 of JSON.stringify(value)',
      'Collect the payload_hash of every transaction in the candidate block as the Merkle leaves',
      'Return sha256 of the empty string when the leaf list is empty, otherwise hash pairs as sha256(left + right) and pair an odd leaf with itself',
      'Repeat the pairwise fold until a single merkleRoot value remains',
      'Set prevHash to sha256 of "CBC-PRAMAAN / Cerulea Private Permissioned Chain / genesis" when the chain is empty, otherwise to the previous FinalizedBlock hash',
    ],
  },
  {
    id: 'flow02',
    name: 'Block Header Hash and txRef Minting',
    trigger: 'submitTransaction builds a ChainTransaction envelope and its block header',
    description: 'computeBlockHash digests only {height, prevHash, merkleRoot, timestamp} in that key order and deliberately excludes txRefs. Every transaction reference carries a time component, a counter and a payload fingerprint.',
    steps: [
      'Build the header object with the keys height, prevHash, merkleRoot and timestamp in exactly that order',
      'Set blockHash = sha256Json(header) and keep txRefs out of the digest so the header stays stable',
      'Mint txRef as "tx_" + base36(now) + "_" + base36(counter) + "_" + the first 10 hex characters of sha256Json({type, payload, timestamp})',
      'Store payload_hash = sha256Json(payload) on the transactions row so verifyChainIntegrity can recompute the Merkle root later',
      'Persist the ChainTransaction with its type, payload, timestamp, blockHeight, blockHash and ChainAcl',
    ],
  },
  {
    id: 'flow03',
    name: 'One Transaction Per Block',
    trigger: 'Any engine or API route calls CeruleaClient.submitTransaction',
    description: 'Every domain action is wrapped in its own block, so block height and transaction count move together. Block height is the previous height plus one, or 0 on an empty chain.',
    steps: [
      'Read MAX(height) from the blocks table and set newHeight to that value plus one, or 0 when the chain is empty',
      'Place the single minted txRef in the block txRefs list and compute merkleRoot over its one payload hash',
      'Run the DCF consensus round over the candidate header before touching storage',
      'Insert the blocks row (height, prev_hash, merkle_root, hash, timestamp, quorum, signatures_json) then the transactions row (tx_ref, block_height, type, payload_json, acl_json, timestamp, payload_hash)',
      'Return txRef, blockHeight and blockHash to the caller so the record can be stamped',
    ],
  },
  {
    id: 'flow04',
    name: 'DCF Consensus Round Across Three Validators',
    trigger: 'A candidate block header is ready, before any row is written',
    description: 'Three ValidatorNode entries independently recompute the candidate block hash and sign it. The signature is a salted digest, not a digital signature scheme (SIM-02).',
    steps: [
      'Load the validator set: validator-gem-gateway "GeM API Gateway (CBC-PRAMAAN Integration)", validator-dpiit "DPIIT National Node" and validator-nodal-ministry "Nodal Ministry Rotating Seat"',
      'Have each validator independently recompute the block hash from the header rather than trusting the proposer value',
      'On a match emit signature = sha256(nodeId + ":" + blockHash + ":cerulea-dcf-v1")',
      'Build a ValidatorSignature {nodeId, organization, confirmedHash, signature, confirmedAt} for every confirming node',
      'Serialise the collected signatures into signatures_json on the blocks row',
    ],
  },
  {
    id: 'flow05',
    name: 'Quorum of Two of Three or Reject the Block',
    trigger: 'The consensus round finishes collecting ValidatorSignature entries',
    description: 'Finalisation needs signatures >= ceil(3 * 2 / 3) = 2. A failed round throws and nothing at all is written to the ledger.',
    steps: [
      'Count the validators whose recomputed confirmedHash equals the candidate blockHash',
      'Finalise the block when the count is 2 or more and record the quorum string in the form "n/3"',
      'Throw "DCF consensus quorum not reached; block rejected" when the count is below 2',
      'Write neither the blocks row nor the transactions row on rejection, so the domain action leaves no trace',
      'Let the API error envelope surface the rejection as HTTP 400 {error} to the caller',
    ],
  },
  {
    id: 'flow06',
    name: 'Synchronous Finality, No Pending State',
    trigger: 'Any of the six GeM trigger points writes to the chain',
    description: 'Hashing, Merkle root, consensus and both inserts complete inside the same call that returns the domain result. There is no mempool, no pending status and no confirmation polling.',
    steps: [
      'Run hashing, Merkle root computation, the DCF round and both inserts inside the single submitTransaction call',
      'Return the domain result already carrying txRef, blockHeight and blockHash',
      'Stamp blockHeight and txRef onto BidRecord, CACertificationRecord, DebarmentRecord, RuleUpdateRecord and PreferenceOutcome before responding',
      'Let the UI read the finalised record immediately after the POST with no retry loop',
      'Keep measured latency in the observed band (bid submission about 120-139 ms, preference about 136-175 ms)',
    ],
  },
  {
    id: 'flow07',
    name: 'Ledger Read Paths',
    trigger: 'Any read endpoint or screen needs transactions or blocks from the ledger',
    description: 'All reads run in ascending block height at the storage layer, and the explorer endpoints reverse them for display. getTransaction joins blocks so the caller always receives blockHash.',
    steps: [
      'getTransaction(txRef) joins transactions to blocks to return blockHash, and returns null when the reference is absent',
      'queryTransactionsByType(type) uses the type index on transactions and orders by block_height ascending',
      'queryAllTransactions() returns the full ledger ascending by block height',
      'getAllBlocks() returns blocks ascending and getBlockTxRefs(height) looks up the txRefs for each block',
      'Reverse to descending height in GET /chain/blocks and GET /chain/transactions so the explorer shows newest first',
    ],
  },
  {
    id: 'flow08',
    name: 'Chain Integrity Walk',
    trigger: 'GET /chain/integrity or the Audit Explorer "Run Integrity Check" button',
    description: 'verifyChainIntegrity re-derives every link of the chain from stored data and stops at the first inconsistency. It returns an IntegrityCheckResult naming the broken height and the reason.',
    steps: [
      'Walk the blocks ascending with expectedPrev initialised to the genesis hash for block 0',
      'Compare block.prevHash against expectedPrev and fail with reason "prevHash mismatch"',
      'Recompute merkleRoot from the payload_hash values of the block transactions and fail with reason "merkleRoot mismatch"',
      'Recompute the header hash from {height, prevHash, merkleRoot, timestamp} and fail with reason "block hash mismatch"',
      'Return {valid: false, blocksChecked, brokenAtHeight, reason} at the first failure, otherwise {valid: true, blocksChecked}',
    ],
  },
  {
    id: 'flow09',
    name: 'Public Verification Lookup Without Payload',
    trigger: 'GET /chain/verify?ref= from the public /verify screen',
    description: 'verifyRecordByHashOrTxRef proves that a record exists and is anchored, and never returns the payload. No commercial value or declared percentage is ever exposed.',
    steps: [
      'Match the supplied ref against tx_ref first, then against payload_hash',
      'Return the VerificationLookup {found, txRef, blockHeight, blockHash, type, timestamp} and nothing else',
      'Return found = false when neither column matches, with no other detail',
      'Pair the lookup with chainIntegrityValid from verifyChainIntegrity in the same response',
      'Throw "Provide a transaction reference or declaration hash via ?ref=" when the parameter is missing',
    ],
  },
  {
    id: 'flow10',
    name: 'ACL Evaluation in canAccess',
    trigger: 'Any visibility-filtered read of a ChainTransaction by an Identity',
    description: 'canAccess implements ROLE-09 to ROLE-16 exactly against the ChainAcl {vendorIds, ministries, tenderIds, caIds, public}. getVisibleTransactionsByType and getAllVisibleTransactions are thin filters over it.',
    steps: [
      'Grant access to every identity when acl.public is true',
      'Grant full ledger access to the AUDIT and DPIIT_ADMIN roles',
      'Grant VENDOR access only when acl.vendorIds contains its id, which is how a reseller bid also reaches the authorising OEM id',
      'Grant CA access only when acl.caIds contains firmRegistration + "::" + membershipNumber, and MINISTRY_ADMIN access only when acl.ministries contains its ministry name',
      'Grant PROCURING_ENTITY access to any transaction carrying at least one tenderId in its ACL',
      'Resolve a missing or invalid role or id to VENDOR "__anonymous__", which sees public records only',
    ],
  },
  {
    id: 'flow11',
    name: 'Hydrate the Envelope Over Stored Placeholders',
    trigger: 'Any record read back out of a ChainTransaction payload',
    description: 'Payloads are written before their own txRef exists, so they carry the placeholders empty string and -1. hydrate always overwrites them from the envelope.',
    steps: [
      'Read the stored payload_json for the transaction',
      'Return {...payload, txRef, blockHeight} so the envelope values win over the stored placeholders',
      'Guarantee that an empty txRef or a blockHeight of -1 never reaches a screen or an API response',
      'Apply hydrate uniformly on BidRecord, CACertificationRecord, DebarmentRecord, RuleUpdateRecord and PreferenceOutcome reads',
    ],
  },
  {
    id: 'flow12',
    name: 'Smart Evolution Logic Upgrade',
    trigger: 'POST /chain/upgrade-logic with a LogicUpgradeInput',
    description: 'Versioned engine logic is upgraded on chain under multi-signature approval, and the upgrade itself is a public LOGIC_UPGRADED transaction. getLogicHistory replays the full lineage of a module.',
    steps: [
      'Read getCurrentLogicVersion(module) as MAX(version) from logic_versions, defaulting to 1',
      'Reject the input when approvers has fewer than 2 entries with the multi-signature approval error, returned as HTTP 400',
      'Reject the input when newVersion is less than or equal to the current version',
      'Hash oldLogicPayload (null when absent) and newLogicPayload into oldLogicHash and newLogicHash',
      'Write a public LOGIC_UPGRADED transaction carrying LogicUpgradedPayload {module, oldVersion, newVersion, description, approvers, oldLogicHash, newLogicHash, activatedAt}',
      'Insert the LogicVersion row into logic_versions with that txRef, and serve getLogicHistory(module) ascending by version with approvers parsed',
    ],
  },

  /* === B. RULE REGISTRY ================================================= */

  {
    id: 'flow13',
    name: 'Wildcard HSN Rule Resolution',
    trigger: 'getRuleConfig(hsnCode) is called by classification, analytics or a form',
    description: 'The current rule for an HSN is the highest version on chain, and any HSN without its own rule falls back to the DPIIT default row "*". Requesting the wildcard before it is seeded is a hard error.',
    steps: [
      'Select the highest-version newConfig among the RULE_UPDATED records for that hsnCode',
      'Fall back to the "*" DPIIT default row when the HSN has no rule of its own',
      'Throw "DPIIT default rule has not been seeded" when "*" is requested and no wildcard record exists',
      'Return the RuleConfig with classIThreshold, classIIThreshold, method, components, customRuleText, para3A, pliLinked, version and ministry',
      'Use the same resolver in the Bid Submission form so the declaration section matches the rule that will actually be applied',
    ],
  },
  {
    id: 'flow14',
    name: 'DPIIT Floor Enforcement on Rule Update',
    trigger: 'POST /rules with a RuleUpdateInput whose method is not CUSTOM',
    description: 'A nodal ministry can only raise thresholds, never lower them below the DPIIT floor of 50 and 20. The floor check is skipped entirely when the method is CUSTOM.',
    steps: [
      'Skip the floor check completely when input.method is CUSTOM',
      'Evaluate isFloorRespected as classIThreshold >= 50 AND classIIThreshold >= 20 AND classIIThreshold < classIThreshold',
      'Throw "Rejected: Class-I threshold must be >= 50 and Class-II threshold must be >= 20 and less than Class-I threshold. Nodal ministries can only raise thresholds, never lower them." when the check fails',
      'Return the rejection as HTTP 400 {error} and render it in the red ERROR panel of the Rule Update form',
      'Show the standing floor notice on the form so the constraint is visible before submission',
    ],
  },
  {
    id: 'flow15',
    name: 'Rule Versioning and Supersedes',
    trigger: 'A RuleUpdateInput passes the floor check',
    description: 'Each accepted update mints the next version for that HSN and links back to the version it replaces. Components and custom rule text are carried forward unless the update supplies new ones.',
    steps: [
      'Read the latest existing version for that hsnCode and set newVersion to that value plus one, else 1',
      'Carry existing components and customRuleText forward when the input does not supply replacements',
      'Set newConfig.supersedes to the old version number and newConfig.effectiveDate from the input',
      'Capture the full previous RuleConfig as oldConfig, or null when this is the first version',
      'Mint ruleUpdateId as "rule_" + hsnCode + "_v" + newVersion and build the RuleUpdateRecord with adminIdentity and timestamp',
    ],
  },
  {
    id: 'flow16',
    name: 'RULE_UPDATED Record and Rule Reads',
    trigger: 'A versioned RuleUpdateRecord is ready to be anchored',
    description: 'Rule changes are public so every vendor can see the thresholds they are judged against, and the owning ministry is named in the ACL. All rule read endpoints project off these records.',
    steps: [
      'Submit RULE_UPDATED carrying oldConfig, newConfig, adminIdentity and timestamp',
      'Set the ChainAcl to public = true with ministries = [ministry]',
      'Serve getRuleHistory(hsnCode) as all versions for that HSN ascending, and listAllRuleHistory() as every RULE_UPDATED record ascending by timestamp',
      'Serve listAllCurrentRules() as one row per HSN at its highest version, sorted by hsnCode',
      'Feed GET /rules, GET /rules/history and the Ministry Admin category table from those projections',
    ],
  },
  {
    id: 'flow17',
    name: 'Evaluation Cache Invalidation After a Rule Update',
    trigger: 'updateRule finishes writing a RULE_UPDATED transaction',
    description: 'A threshold change can flip the status of already submitted bids, so every cached evaluation is dropped. The in-memory TTL cache is used only by the evaluation endpoint.',
    steps: [
      'Call cache.invalidate with the prefix "evaluation:" on a successful rule update',
      'Drop every key carrying that prefix regardless of which HSN actually changed (SIM-06)',
      'Recompute the next GET /tenders/{tenderId}/evaluation from the ledger and re-cache it with the 5 minute TTL',
      'Leave all other read paths untouched because nothing else uses the cache',
    ],
  },

  /* === C. CLASSIFICATION ENGINE ========================================= */

  {
    id: 'flow18',
    name: 'PLI Deemed Class-II Override',
    trigger: 'classify() runs on a BidSubmissionInput whose resolved rule is pliLinked',
    description: 'A PLI manufacturer bidding under a PLI-linked rule is deemed Class-II before any other branch is considered. The override never marks the result as near threshold.',
    steps: [
      'Evaluate the PLI branch before the CUSTOM, COMPONENT_LEVEL and STANDARD branches',
      'Require both rule.pliLinked and input.isPLIManufacturer to be true',
      'Set computedClass = CLASS_II, pliDeemed = true and nearThreshold = false on the ClassificationResult',
      'Set effectivePercent to declaredLocalContentPercent when supplied, otherwise null, and record the deeming reason',
      'Show the "PLI manufacturer for this item" checkbox only when the resolved rule is pliLinked, which in the seeded set is HSN 8544 Cables',
    ],
  },
  {
    id: 'flow19',
    name: 'CUSTOM Method Yields MANUAL_REQUIRED',
    trigger: 'The resolved RuleConfig for the bid HSN has method CUSTOM',
    description: 'No automated formula exists for a CUSTOM rule, so the engine records the declaration and hands the decision to the Tender Committee. HSN 8523 software is the seeded CUSTOM rule.',
    steps: [
      'Set computedClass = MANUAL_REQUIRED, which exists only on ClassificationResult and never on a claim',
      'Set effectivePercent to the declared percentage when supplied, otherwise null',
      'Push rule.customRuleText into the ClassificationResult reasons so the committee reads the governing text',
      'Skip every threshold comparison and leave nearThreshold false',
      'Let the aggregation step map this to YELLOW with "CUSTOM calculation method - manual Tender Committee validation required."',
    ],
  },
  {
    id: 'flow20',
    name: 'Component-Level Validation and Gating',
    trigger: 'The resolved rule has method COMPONENT_LEVEL, as on HSN 8471',
    description: 'Every ComponentDefinition is gated individually before any weighted average is computed. A missing declaration is treated as zero, never as a pass.',
    steps: [
      'Throw when the rule carries no components, and throw when the input carries no componentDeclarations',
      'Match each declaration to its ComponentDefinition by name and treat a missing declaration as declaredPercent 0',
      'Pass a mustBeLocal component only at declaredPercent >= 100',
      'Pass a numeric thresholdPercent component at declaredPercent >= thresholdPercent',
      'Pass automatically when thresholdPercent is null and mustBeLocal is not set (the ungated case)',
      'Emit a componentBreakdown row {name, declaredPercent, thresholdPercent, pass, weightPercent} for every component',
    ],
  },
  {
    id: 'flow21',
    name: 'Component-Level Weighted Percent and Near-Threshold',
    trigger: 'All COMPONENT_LEVEL gates have been evaluated for the bid',
    description: 'The weighted average decides the class while the individual gates decide whether the bid is flagged. A component that fails its own gate forces nearThreshold true even when the average passes comfortably.',
    steps: [
      'Compute effectivePercent = round(sum(declaredPercent * weightPercent) / 100) across the rule components',
      'Run classifyByPercent on that effectivePercent against the rule thresholds',
      'Set nearThreshold true when the result is within 2 points of either threshold OR any component failed its gate',
      'Carry the failed component names forward so the aggregation step can name them in the flag reason',
      'Apply the seeded HSN 8471 weights: PCB/Motherboard 40 must be local, Power Supply 15 threshold 50, Enclosure/Chassis 10 threshold 80, Assembly & Testing 20 must be local, Software/OS 15 no gate',
    ],
  },
  {
    id: 'flow22',
    name: 'Standard and Weighted-Module Path',
    trigger: 'The resolved rule has method STANDARD or WEIGHTED_MODULE',
    description: 'A single declared percentage is compared against the two thresholds of the resolved rule version. WEIGHTED_MODULE falls through to the STANDARD path in the PoC (SIM-07).',
    steps: [
      'Throw when declaredLocalContentPercent is missing from the input',
      'Set effectivePercent = declaredLocalContentPercent and run classifyByPercent against the rule thresholds',
      'Write a reason line citing both thresholds, the rule version and the owning ministry',
      'Add a claim-mismatch reason when computedClass differs from input.claimedClass',
      'Route WEIGHTED_MODULE through this same branch because no module weights are modelled',
    ],
  },
  {
    id: 'flow23',
    name: 'Percent to Class and the Near-Threshold Band',
    trigger: 'An effectivePercent has been derived by any classification branch',
    description: 'classifyByPercent and isNearThreshold are pure helpers shared by the STANDARD and COMPONENT_LEVEL paths. The near-threshold band is a fixed 2 points on either side of either threshold.',
    steps: [
      'Return CLASS_I when effectivePercent >= rule.classIThreshold',
      'Return CLASS_II when effectivePercent >= rule.classIIThreshold but below the Class-I threshold',
      'Return NON_LOCAL otherwise',
      'Set isNearThreshold true when abs(effective - classIThreshold) <= 2 OR abs(effective - classIIThreshold) <= 2',
      'Keep the band at the PlatformConstants value of 2 points, which the seeded LOGIC_UPGRADED proposes moving to 3 in classification-engine v2',
    ],
  },

  /* === D. CONSISTENCY ENGINE (cross-tender memory) ====================== */

  {
    id: 'flow24',
    name: 'Anomaly: Same Product, Different Percent',
    trigger: 'The Consistency Engine runs over the full bid history of the vendor after classification',
    description: 'A vendor that declares materially different local content for the same product across tenders is flagged. The threshold is a delta of 10 points or more.',
    steps: [
      'Match prior bids by same product, defined as trimmed and lower-cased productName equality',
      'Skip any prior bid whose classification effectivePercent is null',
      'Compute abs(newPercent - priorPercent) for each remaining prior bid',
      'Raise an AnomalyFlag of type SAME_PRODUCT_DIFFERENT_PERCENT when the delta is 10 points or more',
      'Name both tenderIds and the point delta in the description and set relatedTxRef to the prior bid txRef',
    ],
  },
  {
    id: 'flow25',
    name: 'Anomaly: Sudden Classification Jump',
    trigger: 'A vendor submits a bid for a product it has declared before',
    description: 'A vendor whose declared class has only ever been lower for this product and now jumps upward is flagged for attention. Anomalies never block a bid, they push its status to YELLOW.',
    steps: [
      'Rank classes as NON_LOCAL 0, CLASS_II 1, CLASS_I 2 and MANUAL_REQUIRED -1',
      'Require at least one same-product prior bid before evaluating the rule',
      'Raise SUDDEN_CLASSIFICATION_JUMP only when every prior rank is strictly lower than the new rank',
      'Describe the movement from the prior class or classes to the newly computed class',
      'Attach the flag to the BidRecord anomalies list without excluding the bid from evaluation',
    ],
  },
  {
    id: 'flow26',
    name: 'Anomaly: Geographic Inconsistency',
    trigger: 'A bid declares a manufacturingLocation for a product with prior declarations',
    description: 'The same product manufactured from a location never used before for that product is flagged. Comparison is on trimmed, lower-cased location strings.',
    steps: [
      'Build the set of trimmed, lower-cased manufacturingLocation values from the same-product history',
      'Skip the rule when that set is empty because there is no baseline',
      'Raise GEOGRAPHIC_INCONSISTENCY when the new location is not a member of the set',
      'List the previously declared locations alongside the new one in the description',
    ],
  },
  {
    id: 'flow27',
    name: 'Anomaly: Volume Capacity Mismatch',
    trigger: 'Cumulative quantity is recomputed after a new bid for a previously declared product',
    description: 'A vendor that has declared a small facility and is cumulatively supplying at industrial volume is flagged. The threshold is 10,000 cumulative units.',
    steps: [
      'Scan the prior declared locations for the small-facility keywords "small workshop", "small unit" and "small facility"',
      'Sum quantity across every prior bid plus the new one to get the cumulative units',
      'Raise VOLUME_CAPACITY_MISMATCH when a keyword matched and the cumulative total is 10,000 units or more',
      'Format the cumulative total with en-IN grouping in the AnomalyFlag description',
    ],
  },

  /* === E. DEBARMENT, CERTIFICATION, AUDITOR ACCOUNTABILITY ============== */

  {
    id: 'flow28',
    name: 'Two-Year Debarment Guard',
    trigger: 'POST /debarments with a DebarmentInput',
    description: 'GFR Rule 151(iii) caps a debarment at two years, and the engine refuses anything longer before touching the chain. The form defaults the end date to today plus two years.',
    steps: [
      'Parse startDate and endDate from the DebarmentInput',
      'Compute the maximum permitted end date as startDate plus 2 years',
      'Throw "Debarment end date exceeds the maximum 2-year limit under GFR Rule 151(iii)" when endDate is later',
      'Return the rejection as HTTP 400 {error} with no chain write',
      'Label the End Date field with GFR Rule 151(iii) on the Debarment form so the cap is visible',
    ],
  },
  {
    id: 'flow29',
    name: 'Debarment Record and Cross-Ministry Fan-Out',
    trigger: 'A DebarmentInput passes the two-year guard',
    description: 'Debarment is recorded publicly with no per-ministry silo, which is what makes it cross-ministry. The notification to procuring entities is recorded as a chain event rather than an outbound call (SIM-05).',
    steps: [
      'Mint debarmentId as "debar_" + vendorId + "_" + base36 time',
      'Write DEBARMENT_CREATED with a public ACL so every identity on the network can read it',
      'Immediately write DEBARMENT_WEBHOOK_EMITTED, also public, carrying DebarmentWebhookPayload {debarmentId, recipients: "ALL_PROCURING_ENTITIES", notifiedAt}',
      'Return the hydrated DebarmentRecord with txRef and blockHeight from the envelope',
      'Serve the full public registry through GET /debarments for the DPIIT and vendor screens',
    ],
  },
  {
    id: 'flow30',
    name: 'False Declaration Triggers the Auditor Accountability Ledger',
    trigger: 'A DEBARMENT_CREATED record whose reason matches /false declaration/i',
    description: 'When a vendor is debarred for a false declaration, every CA who certified that vendor is flagged along with all of their other certificates. The flag is public so the whole network can see the auditor exposure.',
    steps: [
      'Test the debarment reason against /false declaration/i and call flagAuditorForVendorDebarment on a match',
      'Find every CA key that has certified the debarred vendor across all tenders',
      'For each such CA key collect every OTHER certId written by that CA into flaggedCertIds and count totalCertsByCA',
      'Write a public AUDITOR_FLAGGED transaction carrying AuditorFlaggedPayload {caKey, triggeringVendorId, triggeringDebarmentId, flaggedCertIds, totalCertsByCA, flaggedAt}',
      'Skip the routine silently when the debarred vendor has no certifications, as with the seeded Chambal Devices debarment',
    ],
  },
  {
    id: 'flow31',
    name: 'Pre-Bid Debarment Check',
    trigger: 'Step 1 of the Bid Submission pipeline, and the vendor and DPIIT screens',
    description: 'preBidDebarmentCheck decides whether the vendor is under an active debarment at the moment of the bid. It returns the matching record so the reason and authority can be quoted verbatim.',
    steps: [
      'Load every DEBARMENT_CREATED record for the vendorId from the public registry',
      'Treat a record as active when the supplied timestamp falls within [startDate, endDate]',
      'Return the matching DebarmentRecord so the orchestrator can quote debarringAuthority and reason',
      'Render the red DEBARRED banner on /vendor with "Debarred by {authority}: {reason} (until {endDate})" when one is active',
      'Mark rows ACTIVE or EXPIRED on the DPIIT registry table by comparing endDate with today',
    ],
  },
  {
    id: 'flow32',
    name: 'CA Certification Requirement, Mismatch and Private ACL',
    trigger: 'POST /certifications with a CACertificationInput',
    description: 'A CA certificate is mandatory above Rs 10 crore and a mismatch of 5 points or more against the declared content is recorded. The certification is a private collection readable only by the vendor, the tender committee and the certifying CA.',
    steps: [
      'Compute isCACertificationRequired(tender) as estimatedValueRupees > 100,000,000 and return it as wasRequired',
      'Throw "Unknown bid" when the bidId does not resolve to a BidRecord',
      'Compute delta = abs(certifiedLocalContentPercent - (bid classification effectivePercent or 0)) and set mismatch true when delta >= 5',
      'Build the CA key as caFirmRegistrationNumber + "::" + caMembershipNumber and mint certId as "cert_" + bidId + "_" + base36',
      'Write CA_CERTIFICATION with ACL vendorIds [vendorId], tenderIds [tenderId], caIds [caKey] and public false',
      'Return {certId, mismatch, mismatchDeltaPercent, wasRequired, txRef, blockHeight, certification}',
    ],
  },
  {
    id: 'flow33',
    name: 'Auditor Risk Profile',
    trigger: 'GET /auditors or GET /auditors/{caKey}, and the CA Portal on load',
    description: 'AuditorRiskProfile is derived and never stored, so it always reflects the current debarment registry. riskScore is the share of a CA certificates whose vendor was later debarred for a false declaration.',
    steps: [
      'Enumerate distinct CA keys with listAllCAKeys() across every CA_CERTIFICATION',
      'Collect the certifications written under the requested caKey',
      'Mark a certification problematic when its vendorId appears in any debarment whose reason matches a false declaration',
      'Compute riskScore = problematicCertifications / totalCertifications, and 0 when the CA has no certifications',
      'Deduplicate problematicVendorIds and recompute the whole profile on every read rather than persisting it',
      'Tone the CA Portal risk tile good at 0, warning below 50% and critical at or above 50%',
    ],
  },

  /* === F. TRIGGER 1: BID SUBMISSION ORCHESTRATOR ======================== */

  {
    id: 'flow34',
    name: 'Bid Submission Lookups and Rule Resolution',
    trigger: 'POST /bids with a BidSubmissionInput',
    description: 'The orchestrator resolves static GeM master data and the governing rule before any engine runs. Unknown master data is a hard 400 rather than a silent default.',
    steps: [
      'Resolve the Tender by tenderId and throw "Unknown tender" when it is absent',
      'Resolve the Vendor by vendorId and throw "Unknown vendor" when it is absent',
      'Resolve the RuleConfig with getRuleConfig(input.hsnCode), falling back to the "*" wildcard row',
      'Capture rule.version as ruleVersion and rule.ministry for the record ACL and the analytics attribution',
      'Mint bidId as "bid_" + tenderId + "_" + vendorId + "_" + base36 time',
    ],
  },
  {
    id: 'flow35',
    name: 'Bid Submission Pipeline Order',
    trigger: 'Master data and the rule have been resolved for a bid',
    description: 'The four pipeline stages always run in the same order so the result is deterministic for identical inputs and rule version. The whole pipeline is anchored in a single transaction.',
    steps: [
      'Stage 1: run preBidDebarmentCheck for the vendor at the submission timestamp',
      'Stage 2: run the Classification Engine to produce the ClassificationResult (PLI, CUSTOM, COMPONENT_LEVEL or STANDARD branch)',
      'Stage 3: run the Consistency Engine over the full bid history of the vendor across all tenders',
      'Stage 4: aggregate status and statusReasons under the ENG-32 precedence ladder',
      'Assemble the BidRecord {bidId, txRef, tenderId, vendorId, input, classification, anomalies, debarred, status, statusReasons, createdAt, blockHeight} and submit one BID_SUBMITTED transaction',
      'Return {status, computedClass, ruleVersion, reasons, anomalies, txRef, blockHeight, bid}',
    ],
  },
  {
    id: 'flow36',
    name: 'Status Precedence and Reason Texts',
    trigger: 'Aggregation stage of the Bid Submission pipeline',
    description: 'Nine precedence levels are evaluated in order and the first match wins, producing exactly one ComplianceStatus per bid. Each level has a fixed reason text from StatusReasonTemplate.',
    steps: [
      'RED 1 debarred: "Vendor is on the cross-ministry debarment registry (debarred by {authority}, reason: {reason}). Bid is blocked."',
      'RED 2 belowThresholdForClaim (computed is not MANUAL_REQUIRED and either claimed CLASS_I with computed not CLASS_I, or claimed CLASS_II with computed NON_LOCAL): "Vendor claimed {claimed} but computed classification is {computed} - declared percentage is below the applicable threshold for the claimed class."',
      'RED 3 nonLocalOnDomestic (computed NON_LOCAL and tenderType DOMESTIC): "Vendor is a Non-Local supplier bidding on a domestic tender - not permitted (only Global Tender Enquiries allow Non-Local bidders)."',
      'RED 4 para3AViolation (rule.para3A and procurementCategory SI_EPC_TURNKEY_SERVICE and computed not in {CLASS_I, MANUAL_REQUIRED}): "HSN {hsn} is a Para 3A mandatory-sourcing item for this SI/EPC/Turnkey/Service tender, and the vendor is not Class-I."',
      'YELLOW 5 CUSTOM: "CUSTOM calculation method - manual Tender Committee validation required."; YELLOW 6 any anomalies raised by the Consistency Engine',
      'YELLOW 7 nearThreshold: "Component(s) failed their individual threshold despite the weighted average passing: {names} - flagged for closer examination." when components failed, else "Declared percentage is close to the classification threshold boundary - flagged for closer examination."',
      'YELLOW 8 first declaration: "First-time declaration by this vendor for HSN {hsn} - no historical baseline exists for comparison."; otherwise GREEN: "Declaration meets the applicable threshold; no anomalies; not debarred."',
    ],
  },
  {
    id: 'flow37',
    name: 'BID_SUBMITTED Access Control',
    trigger: 'A completed BidRecord is anchored on the chain',
    description: 'A bid is a private collection: only the bidding vendor, its authorising OEM, the tender committee, the owning ministry and the two oversight roles can read it. The ACL is what makes vendor isolation testable.',
    steps: [
      'Set acl.vendorIds to [vendorId] and append oemReference when vendorType is RESELLER',
      'Set acl.tenderIds to [tenderId] so any PROCURING_ENTITY identity can read it',
      'Set acl.ministries to [rule.ministry] so the owning nodal ministry can read it',
      'Leave acl.public unset so AUDIT and DPIIT_ADMIN reach it only through their blanket read rules',
      'Verify isolation by switching between two vendor identities on /vendor and confirming disjoint declaration lists',
    ],
  },

  /* === G. TRIGGER 2: BID EVALUATION ===================================== */

  {
    id: 'flow38',
    name: 'Cached, ACL-Filtered Bid Evaluation',
    trigger: 'GET /tenders/{tenderId}/evaluation with role and id',
    description: 'The evaluation view is computed per tender and per caller identity, then cached for five minutes. Two identities on the same tender can legitimately see different rows.',
    steps: [
      'Build the cache key as "evaluation:" + tenderId + ":" + role + ":" + id',
      'Return the EvaluationCacheEntry with fromCache true when it is under the 5 minute TTL',
      'Otherwise read BID_SUBMITTED transactions through getVisibleTransactionsByType so canAccess filters them, then keep the rows for this tenderId',
      'Project each visible bid into an EvaluationRow {vendorId, bidId, status, computedClass, quotedPricePerUnit, anomalies, reasons, txRef}',
      'Store the result with cachedAt and return {tenderId, cachedAt, bids}',
      'Render "No bids yet" when no visible bid exists for the tender',
    ],
  },

  /* === H. TRIGGER 3: PURCHASE PREFERENCE DECISION ENGINE ================ */

  {
    id: 'flow39',
    name: 'Preference Pre-Filter of RED Bids',
    trigger: 'POST /tenders/{tenderId}/preference',
    description: 'Every RED bid is removed before ranking, with the reason preserved for the committee. This is where debarment, Para 3A and eligibility failures actually bite.',
    steps: [
      'Load every BID_SUBMITTED record for the tender',
      'Exclude each bid whose status is RED and push {vendorId, reason} into excludedBidders using its first statusReason',
      'Keep the remaining bids as eligibleBidders',
      'Append a DecisionTraceStep "Pre-filter" carrying the eligible and excluded counts',
      'Render the excluded list as the red "Excluded at pre-filter" panel on the preference screen',
    ],
  },
  {
    id: 'flow40',
    name: 'Consistency Flags Surfaced to the Committee',
    trigger: 'Eligible bidders have been established for the tender',
    description: 'Anomalies are advisory, not disqualifying, so flagged bidders stay in the running but are named in the decision trace. The committee decides what to do with them.',
    steps: [
      'Walk the eligible bids and collect those carrying AnomalyFlag entries',
      'Format each as "vendorId: TYPE, TYPE" using the AnomalyType keys',
      'Store the formatted list on anomaliesFlagged of the PreferenceOutcome',
      'Append the matching DecisionTraceStep so the flags appear in the ordered trace',
      'Do not exclude any flagged bidder from ranking or from price matching',
    ],
  },
  {
    id: 'flow41',
    name: 'No Eligible Bidders',
    trigger: 'The pre-filter leaves the eligible bidder list empty',
    description: 'A tender where every bid is RED produces a full explanatory outcome but writes nothing to the chain. There is no award to anchor.',
    steps: [
      'Set decisionPath to NO_ELIGIBLE_BIDDERS',
      'Return an empty quantitySplit with no l1VendorId award',
      'Keep excludedBidders and the accumulated decision trace steps on the outcome',
      'Skip the chain write entirely so no PREFERENCE_CALCULATED transaction is created',
      'Render the outcome header and the red excluded list with no award rows',
    ],
  },
  {
    id: 'flow42',
    name: 'Rank by Price and Collect Class-I Candidates',
    trigger: 'At least one eligible bidder remains after the pre-filter',
    description: 'L1 is simply the lowest quoted price per unit, and every other Class-I bidder becomes a purchase-preference candidate with a recorded margin row. The MII band is 1.20 times the L1 price.',
    steps: [
      'Sort the eligible bidders by quotedPricePerUnit ascending and take the first as L1, recording l1VendorId and l1Price',
      'Append the DecisionTraceStep "Rank by price" with the ordered list',
      'For every non-L1 Class-I bidder record {candidateVendorId, candidatePrice, withinBand: candidatePrice <= l1Price * 1.20, bandLimit}',
      'Append a marginCalculations row {vendorId, l1Price, bandLimit, candidatePrice} with bandLimit rounded to 2 decimals',
      'Trace the combined L1 status as "{MSE|Non-MSE} + {Class-I|Non-Class-I}" together with whether tender.msePreferenceActive is set',
    ],
  },
  {
    id: 'flow43',
    name: 'offerCascade Price Matching',
    trigger: 'A decision branch calls offerCascade(candidates, l1Price, multiplier)',
    description: 'Candidates inside the band are offered the L1 price in ascending price order and the first acceptance ends the cascade. In the PoC every offered candidate accepts (SIM-04).',
    steps: [
      'Compute bandLimit = round(l1Price * multiplier, 2) using 1.20 for MII and 1.15 for MSE',
      'Sort the candidate list ascending by price and mark each as withinBand when price <= bandLimit',
      'Offer a price match at l1Price to each within-band candidate in order and stop at the first acceptance',
      'Record every out-of-band candidate as a PriceMatchOffer with offered = false',
      'Append a DecisionTraceStep for each offer so the cascade is fully reconstructable',
      'Return the winning candidate, or nothing when no candidate was within the band',
    ],
  },
  {
    id: 'flow44',
    name: 'MII Decision Paths Without MSE Preference',
    trigger: 'Preference is computed for a tender with msePreferenceActive off',
    description: 'The Make in India ladder gives Class-I bidders a 20% price-match window over a non-Class-I L1. Divisible tenders split the award, non-divisible tenders do not.',
    steps: [
      'L1 is Class-I: award the full quantity to L1 at l1Price under DIVISIBLE_L1_CLASS_I or NON_DIVISIBLE_L1_CLASS_I',
      'No Class-I candidate exists: award the full quantity to L1 under DIVISIBLE_NO_CLASS_I_CANDIDATE or NON_DIVISIBLE_NO_CLASS_I_CANDIDATE',
      'Divisible with a non-Class-I L1: run offerCascade at 1.20, give round(totalQuantity / 2) to L1 and the remainder to the winner, both at l1Price, under DIVISIBLE_L1_NOT_CLASS_I_SPLIT_50_50',
      'Non-divisible with a non-Class-I L1: run offerCascade at 1.20 and give the winner the entire quantity at l1Price under NON_DIVISIBLE_L1_NOT_CLASS_I_MATCHED',
      'No candidate accepts in either case: award the full quantity to L1 under the matching ..._NO_MATCH_FULL_TO_L1 path',
    ],
  },
  {
    id: 'flow45',
    name: 'MSE Preference Matrix',
    trigger: 'Preference is computed for a tender with msePreferenceActive on',
    description: 'MSE status and Class-I status of the L1 bidder select one of four branches, each with its own multipliers and tiers. MSE matching uses the 1.15 band and MII matching uses 1.20.',
    steps: [
      'MSE and Class-I L1: award the full quantity to L1 under MSE_CLASS_I_L1_FULL_AWARD',
      'Non-MSE and Class-I L1: award round(totalQuantity * 0.75) to L1, then cascade MSE candidates at 1.15 for the remaining 25% at l1Price under NON_MSE_CLASS_I_L1_75_25_MSE',
      'MSE and non-Class-I L1: cascade tier 1 MSE plus Class-I candidates at 1.20, then tier 2 Non-MSE plus Class-I candidates at 1.20',
      'Non-MSE and non-Class-I L1: cascade tier 1 MSE candidates at 1.15, then tier 2 Class-I candidates at 1.20',
      'In both non-Class-I branches split 50/50 with the winner when DIVISIBLE and give the winner the whole quantity when NON_DIVISIBLE; award everything to L1 when no candidate accepts',
      'Label the divisible cascade trace steps "extended pattern" because they extend the documented non-divisible pattern (SIM-08)',
    ],
  },
  {
    id: 'flow46',
    name: 'PREFERENCE_CALCULATED Record and Latest Outcome',
    trigger: 'A decision path has produced a quantitySplit for the tender',
    description: 'The full PreferenceOutcome, including every trace step and offer, is anchored in one transaction so the award is reconstructable end to end. The tender committee and every eligible bidder can read it.',
    steps: [
      'Assemble the PreferenceOutcome with decisionPath, l1VendorId, l1Price, eligibleBidders, excludedBidders, classICandidates, priceMatchOffers, msePreferenceApplied, para3AEnforced, quantitySplit, marginCalculations, anomaliesFlagged and steps',
      'Submit PREFERENCE_CALCULATED with ACL tenderIds [tenderId] and vendorIds set to the eligible bidder ids',
      'Hydrate txRef and blockHeight from the envelope into the returned outcome',
      'Serve getLatestPreferenceOutcome(tenderId) as the most recent outcome by createdAt, hydrated, and null when none exists',
      'Render the decisionPath badge, the L1 trophy badge, the award rows and the ordered decision trace on the preference panel',
    ],
  },
  {
    id: 'flow47',
    name: 'Committee Action on a Recommendation',
    trigger: 'POST /tenders/{tenderId}/preference/action from the Procuring Entity panel',
    description: 'The Tender Committee accepts, modifies or overrides the computed recommendation, and the decision is anchored publicly against the recommendation it responds to. Prior decisions stay visible on the tender.',
    steps: [
      'Accept a CommitteeActionInput with tenderId, preferenceTxRef, action ACCEPTED, MODIFIED or OVERRIDDEN, optional remarks, optional modifiedQuantitySplit and committeeIdentity',
      'Default remarks to the empty string and modifiedQuantitySplit to null when not supplied',
      'Write PREFERENCE_COMMITTEE_ACTION carrying the CommitteeActionPayload with ACL tenderIds [tenderId] and public true',
      'Return {txRef, blockHeight} and show the success line with the new reference',
      'List every prior committee action for the tender in chain order with the action, the remarks or "(no remarks)" and the en-IN timestamp',
    ],
  },

  /* === I. ANALYTICS READ MODEL ========================================== */

  {
    id: 'flow48',
    name: 'Analytics Read Model and Determinism',
    trigger: 'GET /analytics, the DPIIT National View and the Analytics Dashboard',
    description: 'Analytics is derived live from the finalized chain event log and never stored. Two consecutive computations over the same chain must be JSON-identical.',
    steps: [
      'Compute the value of each bid as quotedPricePerUnit * quantity',
      'Attribute each bid to the ministry of the rule for its HSN, else the wildcard rule ministry, else "Unknown"',
      'Bucket by computedClass into classI, classII, nonLocal and manual per ministry, with totalValue alongside',
      'Build vendorConcentration by summing value and bid count per vendor with legalName, sorted by value descending',
      'Build para3AImpact for every rule with para3A true: total bids on that HSN, Class-I bid count and the Class-I share, using 0 when there are no bids',
      'Have the rebuild-readmodel script compute the Analytics object twice and assert JSON equality, exiting 1 on any mismatch',
    ],
  },

  /* === J. API SURFACE AND APPLICATION SHELL ============================= */

  {
    id: 'flow49',
    name: 'API Error Envelope and Identity Parsing',
    trigger: 'Any request to a route under /api/v1',
    description: 'Every handler converts a thrown Error into HTTP 400 {error: message}, which is how engine rejections reach the UI. Identity travels as query parameters because there is no login.',
    steps: [
      'Wrap each handler so any thrown Error becomes HTTP 400 with the body {error: message}',
      'Read role and id from the query string on every request',
      'Accept the identity only when role is one of the six Role values and id is non-empty',
      'Resolve anything else to VENDOR "__anonymous__", which can read public records only',
      'Have apiGet and apiPost append role and id when an identity is supplied, fetch with cache "no-store" and throw the error string on a non-OK response',
    ],
  },
  {
    id: 'flow50',
    name: 'Role Gate and Identity Switcher',
    trigger: 'A gated screen is opened, or the identity switcher in the top bar is used',
    description: 'A screen scoped to one role renders a sign-in card instead of an access error when viewed as another role. The selected identity persists in the browser and is re-resolved against the preset list on load.',
    steps: [
      'Compare the active Identity role with the role the screen is gated to',
      'On a mismatch render the "sign in as" card listing that role preset identities and switch identity in place when one is clicked',
      'Group the top bar switcher by role label with the role colour dot and tick the current identity',
      'Close the switcher on a click outside and persist the selection to the localStorage key cbc-pramaan-identity',
      'Re-resolve the stored identity against the preset list on load and fall back to the default procuring-entity-1 Tender Committee',
    ],
  },
  {
    id: 'flow51',
    name: 'Public Verification Screen',
    trigger: 'A visitor submits a reference on /verify (no gate)',
    description: 'Anyone can prove that a record is anchored without seeing anything commercial. The screen shows existence, position in the chain and the current integrity verdict.',
    steps: [
      'Accept a txRef or a SHA-256 hash, submit on Enter and keep the Verify button disabled while the input is empty',
      'Call GET /chain/verify with the reference and read back the lookup plus chainIntegrityValid',
      'Render the green "Record found" card with type, block height, the full block hash and the formatted timestamp, or the red "Not found" card',
      'Render the integrity line as "Valid, no tampering detected" or "Tampered"',
      'Never display a price, a quantity or a declared percentage anywhere on this screen',
      'Render any API error message in a red error card',
    ],
  },
  {
    id: 'flow52',
    name: 'Audit Explorer Integrity Check and Ledger Search',
    trigger: 'The /audit screen is opened as the AUDIT identity',
    description: 'The explorer is the oversight tool, so its chain endpoints are deliberately not ACL-filtered. Integrity is re-verified on demand and the whole ledger is searchable.',
    steps: [
      'Gate the screen to AUDIT and load blocks and transactions through the unfiltered chain explorer endpoints',
      'Show stat tiles for finalized blocks, total transactions and chain integrity as Not checked, Valid or Tampered',
      'Call GET /chain/integrity from "Run Integrity Check" and show VALID with "{n} blocks independently re-hashed and verified"',
      'On failure append ", broken at height {h} ({reason})" using the IntegrityCheckResult reason',
      'Filter the ledger case-insensitively on txRef, type or any substring of the JSON payload',
      'Show block height, type badge, txRef and timestamp newest first, capped at 100 rows with the "Showing first 100 of {n} matches." caption',
    ],
  },
  {
    id: 'flow53',
    name: 'Notification Fan-Out on Chain Events',
    trigger: 'DEBARMENT_WEBHOOK_EMITTED, AUDITOR_FLAGGED, RULE_UPDATED or LOGIC_UPGRADED is finalized',
    description: 'Each public governance event raises a NotificationEvent for the identities that need to act on it. The notification carries only chain coordinates, never the payload.',
    steps: [
      'On DEBARMENT_WEBHOOK_EMITTED raise a debarment notice for ALL_PROCURING_ENTITIES and for the debarred vendor',
      'On AUDITOR_FLAGGED raise an auditor notice for the flagged CA identity and for the AUDIT role',
      'On RULE_UPDATED raise a rule change notice for the owning ministry and, because the record is public, for every vendor',
      'On LOGIC_UPGRADED raise a public notice naming the module and the new version',
      'Carry only type, txRef and blockHeight on the NotificationEvent so ACL rules still govern the underlying record',
    ],
  },

  /* === K. DETERMINISTIC SEED AND ACCEPTANCE SCENARIOS =================== */

  {
    id: 'flow54',
    name: 'Deterministic Seed Sequence to 26 Blocks',
    trigger: 'npm run seed, or ensureSeeded on a cold start with an empty Rule Registry',
    description: 'The seed writes SEED-01 to SEED-12 in a fixed order so the demonstration ledger is byte-stable at 26 finalized blocks. The final step asserts the expected baseline.',
    steps: [
      'SEED-01: write the seven RULE_UPDATED rows from the seeded rule set into blocks 0 to 6 ("*" DPIIT, 8471 MeitY COMPONENT_LEVEL, 8443 MeitY, 8517 DoT v1 at 60, 2523 DPIIT Para 3A, 8523 MeitY CUSTOM, 8544 DPIIT PLI-linked)',
      'SEED-02 to SEED-07: Deccan on T-003 (100/70/85/100/20, Class-I, Rs 95,000 x 100, Chennai) YELLOW first-time on 8471; Godavari on T-001 (60/55/70/100/0, Class-I, Rs 27,000 x 150, MSE reseller of Krishna, Vijayawada) YELLOW; Sabarmati baseline on T-003 (100/90/90/100/20, Rs 112,000 x 80, Ahmedabad) at about 86%; Sabarmati anomaly on T-001 (30 on every component, Class-II, Rs 41,000 x 80, same product and location) YELLOW; Deccan GREEN control on T-001 (100/90/95/100/50, Rs 48,000 x 200); Indus RED control on T-002 (declared 15% while claiming Class-I, Rs 780,000 x 40, Manesar)',
      'SEED-08: three T-002 bids (Deccan 70% at Rs 850,000; Krishna 65% at Rs 820,000; Bharat 62% at Rs 870,000 as MSE; each quantity 60 from Noida), each followed by a Sharma & Associates CA_CERTIFICATION at the same percentage so no mismatch is raised',
      'SEED-09: debar Chambal Devices (Ministry of Defence, "False declaration of local content", 2025-04-01 to 2027-03-31, linked MOD-2025-TENDER-0042, penalty Rs 500,000) and emit the public webhook; no CA certificates exist so nothing is flagged',
      'SEED-10: debar Krishna Integrated Devices (DoT, same reason, 2026-01-15 to 2028-01-14, linked T-002, penalty Rs 300,000), emit the webhook and write AUDITOR_FLAGGED naming the 2 other Sharma & Associates certificates',
      'SEED-11 and SEED-12: raise HSN 8517 Class-I from 60 to 65 effective 2026-07-01 as dot-admin-demo, then upgrade classification-engine v1 to v2 with approvers cerulea-platform-admin and dpiit-domain-expert over a nearThresholdBandPoints change from 2 to 3',
      'SEED-13: assert the baseline of 9 bids (1 GREEN, 7 YELLOW, 1 RED), 3 certifications, 2 debarments, 1 anomaly, 26 finalized blocks, valid chain integrity and a CA risk score of 33%',
    ],
  },
  {
    id: 'flow55',
    name: 'SCN-01 · Classification GREEN, YELLOW and RED',
    trigger: 'Three Bid Submissions on T-001 (HSN 8471, COMPONENT_LEVEL, MeitY)',
    description: 'One tender and one vendor produce all three ComplianceStatus values purely by changing the declaration. This is the baseline demonstration of the Classification Engine.',
    steps: [
      'Submit Deccan Systems on T-001 with components 100/70/85/100/20 while claiming CLASS_I',
      'Expect GREEN with computedClass CLASS_I and effectivePercent 82',
      'Resubmit declaring 48% against the 50% Class-I threshold while still claiming Class-I and expect RED with the below-threshold-for-claim reason',
      'Declare 51% and expect YELLOW because the result sits inside the 2-point near-threshold band',
      'Confirm all three outcomes return a txRef and a blockHeight from a finalized block',
    ],
  },
  {
    id: 'flow56',
    name: 'SCN-02 · Eligibility on domestic versus global tenders',
    trigger: 'Indus Global Traders declares NON_LOCAL on T-001 and then on T-003',
    description: 'Only a Global Tender Enquiry admits Non-Local bidders, so the identical declaration passes on one tender and is blocked on the other. TenderType alone decides it.',
    steps: [
      'Submit Indus Global Traders claiming NON_LOCAL on T-001, which is DOMESTIC',
      'Expect RED with "Vendor is a Non-Local supplier bidding on a domestic tender - not permitted (only Global Tender Enquiries allow Non-Local bidders)."',
      'Submit the same declaration on T-003, which is GLOBAL_TENDER_ENQUIRY, and expect it to be admitted',
      'Compute preference on T-001 and confirm the Non-Local bid sits in excludedBidders',
      'Compute preference on T-003 and confirm the same vendor appears in eligibleBidders',
    ],
  },
  {
    id: 'flow57',
    name: 'SCN-03 · Divisible preference inside the 20% band',
    trigger: 'Preference computed on T-001 (DIVISIBLE, 1000 units) with three non-MSE bids',
    description: 'A Class-II L1 triggers the MII cascade and a Class-I bidder inside the 1.20 band takes half the award at the L1 price. A candidate outside the band is recorded but never offered.',
    steps: [
      'Seed T-001 with Deccan as Class-II at Rs 500, Bharat as Class-I at Rs 550 and Krishna as Class-I at Rs 620, all treated as non-MSE',
      'Rank by price so L1 is Deccan at 500 and compute bandLimit = 500 * 1.20 = 600',
      'Mark Bharat withinBand true at 550 and Krishna withinBand false at 620 because 620 exceeds the 600 band',
      'Offer the match to Bharat first as the lowest in-band candidate and record its acceptance at 500',
      'Award 500 units (50%) to Deccan at 500 and 500 units (50%) to Bharat matched at 500 under DIVISIBLE_L1_NOT_CLASS_I_SPLIT_50_50',
      'Record Krishna as a PriceMatchOffer with offered = false and keep its margin row for the committee',
    ],
  },
  {
    id: 'flow58',
    name: 'SCN-04 · MSE and MII preference combined',
    trigger: 'Preference computed on T-001 with msePreferenceActive on and a Class-I L1',
    description: 'A non-MSE Class-I L1 keeps 75% of the award while an MSE bidder inside the 1.15 band takes the remaining 25% at the L1 price. This is the NON_MSE_CLASS_I_L1_75_25_MSE path.',
    steps: [
      'Set the L1 bidder as non-MSE Class-I at Rs 500 and an MSE Class-I bidder at Rs 560',
      'Compute bandLimit = round(500 * 1.15, 2) = 575 so the MSE candidate at 560 is within band',
      'Award round(1000 * 0.75) = 750 units to L1 at 500',
      'Offer the remaining 250 units to the MSE bidder at the matched price of 500 and record the acceptance',
      'Set decisionPath NON_MSE_CLASS_I_L1_75_25_MSE and msePreferenceApplied true',
    ],
  },
  {
    id: 'flow59',
    name: 'SCN-05 · Non-divisible preference',
    trigger: 'Preference computed on T-005 (NON_DIVISIBLE, 10,000 units, cement, HSN 2523)',
    description: 'A non-divisible tender cannot be split, so a matching Class-I candidate takes the entire quantity at the L1 price. The Class-II L1 receives nothing.',
    steps: [
      'Seed T-005 with Deccan as Class-II at Rs 400 and Bharat as Class-I at Rs 440',
      'Rank by price so L1 is Deccan at 400 and compute bandLimit = 400 * 1.20 = 480',
      'Mark Bharat withinBand true because 440 is below 480 and offer it the match',
      'Award all 10,000 units to Bharat at the matched price of 400 with no split entry for Deccan',
      'Set decisionPath NON_DIVISIBLE_L1_NOT_CLASS_I_MATCHED',
    ],
  },
  {
    id: 'flow60',
    name: 'SCN-06 · Para 3A mandatory sourcing',
    trigger: 'A non-Class-I bid is submitted on T-002 (HSN 8517, SI_EPC_TURNKEY_SERVICE)',
    description: 'Para 3A applies only to SI/EPC/Turnkey/Service procurement, and on those tenders anything below Class-I is blocked outright. The block is enforced twice: at submission and again at pre-filter.',
    steps: [
      'Confirm the resolved 8517 rule has para3A true and that T-002 has procurementCategory SI_EPC_TURNKEY_SERVICE',
      'Submit a bid whose computed class is neither CLASS_I nor MANUAL_REQUIRED',
      'Expect RED with "HSN 8517 is a Para 3A mandatory-sourcing item for this SI/EPC/Turnkey/Service tender, and the vendor is not Class-I."',
      'Compute preference on T-002 and confirm the bid appears in excludedBidders with that reason',
      'Confirm para3AEnforced is true on the resulting PreferenceOutcome',
    ],
  },
  {
    id: 'flow61',
    name: 'SCN-07 · CA certificate at execution',
    trigger: 'CA Certification submitted against a T-002 bid (Rs 15 crore)',
    description: 'Above Rs 10 crore the CA certificate is mandatory at execution, and the certified percentage is checked against the declaration. The certificate is anchored in a private collection.',
    steps: [
      'Open the CA Certification form for T-002 and confirm the warning badge with "CA/auditor certificate is mandatory at execution (Build Spec §6.3)."',
      'Select a bid and certify at the same percentage the vendor declared',
      'Expect wasRequired true, mismatch false and mismatchDeltaPercent 0',
      'Certify a second bid 8 points away from its declaration and expect mismatch true with mismatchDeltaPercent 8',
      'Confirm the CA_CERTIFICATION is readable by the vendor, the tender committee, the certifying CA, AUDIT and DPIIT_ADMIN only',
    ],
  },
  {
    id: 'flow62',
    name: 'SCN-08 · Cross-tender anomaly from the seed',
    trigger: 'T-001 evaluation viewed after the deterministic seed has run',
    description: 'Sabarmati Systems declared about 86% for a product on T-003 and 30% for the same product on T-001, which the Consistency Engine remembers across tenders. The bid stays eligible but is flagged.',
    steps: [
      'Open the T-001 evaluation as procuring-entity-1 and find Sabarmati Systems flagged SAME_PRODUCT_DIFFERENT_PERCENT',
      'Confirm the description contrasts the two tenders and names the point delta between about 86% and 30%',
      'Confirm relatedTxRef points at the earlier T-003 bid transaction',
      'Open /vendor as sabarmati-systems and see the same flag on the compliance history timeline',
      'Confirm the bid status is YELLOW and that it is not excluded at preference pre-filter',
    ],
  },
  {
    id: 'flow63',
    name: 'SCN-09 · Cross-ministry debarment',
    trigger: 'Any bid submitted for Chambal Devices on any tender after SEED-09',
    description: 'The debarment record is public with no per-ministry silo, so a Ministry of Defence debarment blocks bids on tenders owned by MeitY, DoT or DPIIT alike. This is the cross-ministry claim in one test.',
    steps: [
      'Submit a bid for Chambal Devices on a MeitY tender and let preBidDebarmentCheck match the Ministry of Defence record',
      'Expect RED with "Vendor is on the cross-ministry debarment registry (debarred by Ministry of Defence, reason: False declaration of local content). Bid is blocked."',
      'Repeat on a tender owned by a different ministry and expect the identical outcome',
      'Confirm the DPIIT Cross-Ministry Debarment Registry lists the vendor as ACTIVE with its penalty and linked tender',
      'Confirm the bid is excluded at preference pre-filter with the same reason',
    ],
  },
  {
    id: 'flow64',
    name: 'SCN-10 · Auditor accountability',
    trigger: 'Krishna Integrated Devices is debarred for a false declaration (SEED-10)',
    description: 'Debarring a certified vendor retroactively moves the risk score of the CA who certified it, because the profile is recomputed on every read. The other certificates by that CA are named on chain.',
    steps: [
      'Read GET /auditors before the debarment and confirm Sharma & Associates shows a risk score of 0%',
      'Create the DoT debarment for Krishna with a false-declaration reason',
      'Re-read the profile and confirm riskScore 33%, that is 1 problematic certification of 3 total',
      'Open /ca as the Sharma-and-Associates-FR-2201::ICAI-M-118824 identity and confirm the Krishna row shows the Flagged badge',
      'Find the AUDITOR_FLAGGED transaction in the Audit Explorer listing the 2 other certIds and totalCertsByCA 3',
    ],
  },
  {
    id: 'flow65',
    name: 'SCN-11 · CUSTOM method on software',
    trigger: 'A bid submitted on T-004 (HSN 8523, MeitY, CUSTOM method)',
    description: 'A CUSTOM rule has no automated formula, so the declaration is recorded verbatim and routed to the Tender Committee. The result is always YELLOW, never GREEN or RED on threshold grounds.',
    steps: [
      'Select T-004 and confirm the form shows the MeitY custom rule text about Indian development team person-hours',
      'Enter a declared percentage into the recorded-only input and submit the bid',
      'Expect computedClass MANUAL_REQUIRED with the custom rule text carried in the classification reasons',
      'Expect status YELLOW with "CUSTOM calculation method - manual Tender Committee validation required."',
      'Confirm no threshold comparison ran and that the DPIIT floor check is skipped for this rule',
    ],
  },
  {
    id: 'flow66',
    name: 'SCN-12 · Rule update and Smart Evolution',
    trigger: 'The DoT Ministry Admin raises the HSN 8517 Class-I threshold to 65',
    description: 'A threshold change is itself a chain record with the full before and after configuration, and the Smart Evolution ledger shows the engine version it runs under. Both are visible in the explorer.',
    steps: [
      'Submit the rule update as MINISTRY_ADMIN DoT with classIThreshold 65 and adminIdentity dot-admin-demo',
      'Expect the RuleUpdateRecord to carry oldConfig at version 1 with threshold 60 and newConfig at version 2 with supersedes 1, adminIdentity and timestamp',
      'Refresh the Ministry Admin category rules table and confirm HSN 8517 now reads v2',
      'Confirm the evaluation cache was invalidated by the update',
      'Find the RULE_UPDATED transaction and the seeded LOGIC_UPGRADED transaction in the Audit Explorer and in GET /chain/logic-history',
    ],
  },

  /* === L. OPERATIONS AND POC SIMPLIFICATIONS ============================ */

  {
    id: 'flow67',
    name: 'Operational Scripts: Reset, Seed, Rebuild',
    trigger: 'An operator runs reset-chain, seed or rebuild-readmodel',
    description: 'Three scripts cover the whole lifecycle of the demonstration ledger. Each ends by reporting chain integrity so a broken state is caught immediately.',
    steps: [
      'reset-chain deletes data/chain.db, chain.db-wal and chain.db-shm when present and prints a hint to reseed',
      'seed runs the deterministic sequence with per-step logging, then prints the integrity result and the total block count',
      'rebuild-readmodel computes the Analytics object twice, exits 1 on any mismatch and prints the totals plus integrity',
      'Keep the SQLite file at <project>/data/chain.db locally and at /tmp/cbc-pramaan-data/chain.db on Vercel, in WAL journal mode',
    ],
  },
  {
    id: 'flow68',
    name: 'Auto-Seed on Cold Start',
    trigger: 'The Node runtime boots and the server instrumentation hook fires',
    description: 'An ephemeral /tmp ledger on Vercel self-populates to the same 26 blocks on the first request after a cold start. ensureSeeded is idempotent so repeat boots are free.',
    steps: [
      'Register the instrumentation hook so it runs only on the Node runtime',
      'Query the ledger for any RULE_UPDATED transaction to decide whether the Rule Registry is populated',
      'Call ensureSeeded when none exists and return whether it actually seeded',
      'Skip the whole sequence when the Rule Registry already has rows, so a warm process never double-seeds',
      'Leave the cold instance holding the identical deterministic baseline of 26 finalized blocks',
    ],
  },
  {
    id: 'flow69',
    name: 'PoC Simplifications and Their Production Replacements',
    trigger: 'Reading the build as a specification for the production Cerulea deployment',
    description: 'Ten behaviours are deliberately simulated in the proof of concept and each has a named production replacement. Nothing here changes the recorded semantics, only the infrastructure behind them.',
    steps: [
      'SIM-01 and SIM-02: three DCF validators run in one process and sign with a salted sha256; production runs separate Cerulea nodes under a real digital signature scheme',
      'SIM-03: role and id query parameters stand in for the GeM identity and DSC infrastructure',
      'SIM-04 and SIM-05: every offered price match auto-accepts and the debarment fan-out is a chain event; production needs a vendor negotiation channel and real procuring-entity webhook delivery',
      'SIM-06 and SIM-07: a rule update clears all evaluation cache entries and WEIGHTED_MODULE falls through to STANDARD; production scopes invalidation to the affected HSN and models module weights',
      'SIM-08: the two divisible MSE cascades extend the documented non-divisible pattern and say "extended pattern" in the decision trace',
      'SIM-09 and SIM-10: vendors and tenders are hardcoded and the SQLite file is ephemeral on Vercel; production references GeM master records by id and uses durable storage',
    ],
  },
];

module.exports = { FLOWS };
