CAERULEAN BYTECHAINS PRIVATE LIMITED
CBC-PRAMAAN
Atomic Build List for Cerulea Studio
Cerulea Bytechains Compliance, Procurement Record And Make-in-India Assurance Network
A blockchain-based PPP-MII compliance trust layer behind GeM. Non-crypto, permissioned. No tokens, wallets, or mining.
Derived from the working PoC (Next.js 16 / TypeScript / SQLite chain simulator) at cbc-pramaan.cerulea.io.
Every item below is a single, independently buildable, independently testable unit. Build in section order; IDs are stable and can be used as ticket keys.
Version 1.0  ·  16 September 2026

# Contents

# 0. How to use this list
The list is layered bottom-up. Each layer only depends on the layers above it in this document, so a build can proceed strictly in section order and have something demonstrable at the end of every section.

[TABLE 1]
| Section | Layer | What you get once it is done |
|---|---|---|
| 1 | Vocabulary and enumerations | Every named value the rest of the system uses. |
| 2 | Roles and identities | The six stakeholder roles and 14 demo identities. |
| 3 | Data entities | Every record shape that is stored or returned. |
| 4 | Chain layer (Cerulea simulator) | Hash-chained, quorum-finalized, ACL-scoped ledger. |
| 5 | Rule Registry | Per-HSN thresholds with the DPIIT floor enforced. |
| 6 | Engines | Classification, Consistency, Debarment, Certification, Preference. |
| 7 | API surface | The six GeM trigger points plus read and explorer endpoints. |
| 8 | Application shell and design tokens | Navigation, identity switcher, role gate, primitives. |
| 9 | Screens | Nine screens, field by field, panel by panel. |
| 10 | Seed data and demo scenarios | Deterministic baseline plus the 12 acceptance scenarios. |
| 11 | Operational scripts and deployment | Reset, seed, rebuild, auto-seed, hosting facts. |
| 12 | Explicit PoC simplifications | What is simulated and what a production build must replace. |
ID convention. ENUM (enumerations), ROLE (roles), ENT (entities), CHN (chain), RUL (rule registry), ENG (engines), API (endpoints), SHL (shell), SCR (screens), SEED (seed data), SCN (scenarios), OPS (operations), SIM (simplifications).

# 1. Vocabulary and enumerations
Each enumeration is a closed set. Build them first as shared types so every later item references one definition.

[TABLE 2]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| ENUM-01 | Role | VENDOR, PROCURING_ENTITY, MINISTRY_ADMIN, DPIIT_ADMIN, AUDIT, CA. Exactly six. |
| ENUM-02 | SupplierClass | CLASS_I, CLASS_II, NON_LOCAL. A fourth computed-only value MANUAL_REQUIRED exists on ClassificationResult, never on a claim. |
| ENUM-03 | ComplianceStatus | GREEN, YELLOW, RED. Aggregated per bid, one value. |
| ENUM-04 | CalculationMethod | STANDARD, COMPONENT_LEVEL, WEIGHTED_MODULE, CUSTOM. WEIGHTED_MODULE falls through to the STANDARD path in the PoC. |
| ENUM-05 | ProcurementDivisibility | DIVISIBLE, NON_DIVISIBLE. |
| ENUM-06 | TenderType | DOMESTIC, GLOBAL_TENDER_ENQUIRY. Only GTE admits NON_LOCAL bidders. |
| ENUM-07 | VendorType | OEM, RESELLER. A RESELLER carries an oemReference (the authorizing OEM's vendorId). |
| ENUM-08 | ProcurementCategory | GOODS, SI_EPC_TURNKEY_SERVICE. Para 3A's Class-I-only gate applies only to SI_EPC_TURNKEY_SERVICE. |
| ENUM-09 | AnomalyType | SAME_PRODUCT_DIFFERENT_PERCENT, SUDDEN_CLASSIFICATION_JUMP, GEOGRAPHIC_INCONSISTENCY, VOLUME_CAPACITY_MISMATCH. |
| ENUM-10 | CommitteeAction | ACCEPTED, MODIFIED, OVERRIDDEN. |
| ENUM-11 | Chain transaction types | RULE_UPDATED, BID_SUBMITTED, PREFERENCE_CALCULATED, PREFERENCE_COMMITTEE_ACTION, CA_CERTIFICATION, DEBARMENT_CREATED, DEBARMENT_WEBHOOK_EMITTED, AUDITOR_FLAGGED, LOGIC_UPGRADED. Nine types, string-keyed. |
| ENUM-12 | Decision paths (no MSE preference) | DIVISIBLE_L1_CLASS_I, NON_DIVISIBLE_L1_CLASS_I, DIVISIBLE_NO_CLASS_I_CANDIDATE, NON_DIVISIBLE_NO_CLASS_I_CANDIDATE, DIVISIBLE_L1_NOT_CLASS_I_SPLIT_50_50, DIVISIBLE_L1_NOT_CLASS_I_NO_MATCH_FULL_TO_L1, NON_DIVISIBLE_L1_NOT_CLASS_I_MATCHED, NON_DIVISIBLE_L1_NOT_CLASS_I_NO_MATCH_FULL_TO_L1, NO_ELIGIBLE_BIDDERS. |
| ENUM-13 | Decision paths (MSE preference active) | MSE_CLASS_I_L1_FULL_AWARD, NON_MSE_CLASS_I_L1_75_25_MSE, NON_MSE_CLASS_I_L1_75_25_NO_MSE_MATCH_FULL_TO_L1, MSE_NON_CLASS_I_L1_DIVISIBLE_50_50_CASCADE, MSE_NON_CLASS_I_L1_DIVISIBLE_NO_MATCH_FULL_TO_L1, MSE_NON_CLASS_I_L1_NON_DIVISIBLE_MATCHED, MSE_NON_CLASS_I_L1_NON_DIVISIBLE_NO_MATCH_FULL_TO_L1, NON_MSE_NON_CLASS_I_L1_DIVISIBLE_50_50_CASCADE, NON_MSE_NON_CLASS_I_L1_DIVISIBLE_NO_MATCH_FULL_TO_L1, NON_MSE_NON_CLASS_I_L1_NON_DIVISIBLE_MATCHED, NON_MSE_NON_CLASS_I_L1_NON_DIVISIBLE_NO_MATCH_FULL_TO_L1. |
| ENUM-14 | Constants | DPIIT Class-I floor 50; Class-II floor 20; near-threshold band 2 points; CA certificate mandatory above Rs 10 crore (100,000,000); CA mismatch tolerance 5 points; same-product delta threshold 10 points; volume mismatch threshold 10,000 cumulative units; small-facility keywords 'small workshop', 'small unit', 'small facility'; MII band multiplier 1.20; MSE band multiplier 1.15; debarment maximum 2 years (GFR Rule 151(iii)); evaluation cache TTL 5 minutes; Smart Evolution minimum approvers 2; DCF quorum 2 of 3. |

# 2. Roles and identities
There is no login. The UI carries a selected identity (role + id) on every request as query parameters, and the server enforces visibility. Screens are gated to one role each.

[TABLE 3]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| ROLE-01 | Identity shape | { role: Role; id: string; label: string }. Persisted client-side under localStorage key cbc-pramaan-identity, re-resolved against the preset list on load. |
| ROLE-02 | Default identity | Procuring Entity: Tender Committee (procuring-entity-1). |
| ROLE-03 | Vendor identities (7) | bharat-precision-electronics, deccan-systems, krishna-integrated-devices, godavari-components (Reseller), indus-global-traders, sabarmati-systems, chambal-devices. |
| ROLE-04 | Procuring Entity identity (1) | procuring-entity-1, label 'Procuring Entity: Tender Committee'. |
| ROLE-05 | Ministry Admin identities (3) | MeitY, DoT, DPIIT. The id is the ministry name and is matched against rule ACLs. |
| ROLE-06 | DPIIT Admin identity (1) | dpiit-national. |
| ROLE-07 | CVC / Audit identity (1) | cvc. |
| ROLE-08 | CA identity (1) | Sharma-and-Associates-FR-2201::ICAI-M-118824. The CA key is firmRegistration + '::' + membershipNumber. |
| ROLE-09 | Access rule: public | Any transaction with acl.public = true is readable by every identity. |
| ROLE-10 | Access rule: AUDIT | Reads every transaction on the ledger. |
| ROLE-11 | Access rule: DPIIT_ADMIN | Reads every transaction on the ledger. |
| ROLE-12 | Access rule: VENDOR | Reads a transaction only when acl.vendorIds contains its id. A reseller's bid also lists the OEM's id. |
| ROLE-13 | Access rule: CA | Reads only when acl.caIds contains its CA key. |
| ROLE-14 | Access rule: PROCURING_ENTITY | Reads any transaction that has at least one tenderId in its ACL. |
| ROLE-15 | Access rule: MINISTRY_ADMIN | Reads only when acl.ministries contains its ministry name. |
| ROLE-16 | Unauthenticated fallback | Missing or invalid role/id resolves to VENDOR '__anonymous__', which can see public records only. |
| ROLE-17 | Role gate UI | A screen scoped to role X, viewed as any other role, renders a 'sign in as' card listing that role's preset identities. Clicking one switches identity in place. |
| ROLE-18 | Role colour tokens | VENDOR series-1, PROCURING_ENTITY series-2, MINISTRY_ADMIN series-5, DPIIT_ADMIN brand, AUDIT series-6, CA series-3. |

# 3. Data entities
Vendors and tenders are static GeM master data (no create endpoint). Everything else is an on-chain transaction payload, read back by hydrating txRef and blockHeight from the envelope.

## 3.1 Master data

[TABLE 4]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| ENT-01 | Vendor | vendorId, legalName, type (OEM | RESELLER), isMSE, udyamRegistrationNumber?, oemReference?. |
| ENT-02 | Tender | tenderId, title, hsnCode, estimatedValueRupees, tenderType, divisibility, totalQuantity, msePreferenceActive, procurementCategory? (GOODS | SI_EPC_TURNKEY_SERVICE). |
| ENT-03 | ComponentDefinition | name, weightPercent, thresholdPercent (number | null), mustBeLocal?. null threshold + mustBeLocal = 100% gate; null threshold without mustBeLocal = ungated. |
| ENT-04 | RuleConfig | ministry, hsnCode, hsnLabel, classIThreshold, classIIThreshold, method, components?, customRuleText?, para3A, pliLinked, effectiveDate, version, supersedes?. |

## 3.2 Inputs (request bodies)

[TABLE 5]
| ID | Entity | Fields |
|---|---|---|
| ENT-05 | BidSubmissionInput | tenderId, vendorId, hsnCode, declaredLocalContentPercent? (STANDARD / WEIGHTED_MODULE / CUSTOM), componentDeclarations? [{name, declaredPercent}] (COMPONENT_LEVEL), claimedClass, quotedPricePerUnit, quantity, isMSE, vendorType, oemReference?, declarationPdfHash, manufacturingLocation, productName, claimMSEPreference?, isPLIManufacturer?. |
| ENT-06 | CACertificationInput | bidId, certifiedLocalContentPercent, caFirmRegistrationNumber, caMembershipNumber, certificatePdfHash. |
| ENT-07 | DebarmentInput | vendorId, reason, startDate, endDate, debarringAuthority, linkedTenders[], penaltyAmountRupees?. |
| ENT-08 | RuleUpdateInput | ministry, hsnCode, hsnLabel, classIThreshold, classIIThreshold, method, components?, customRuleText?, para3A, pliLinked, effectiveDate, adminIdentity. |
| ENT-09 | CommitteeActionInput | tenderId, preferenceTxRef, action, remarks?, modifiedQuantitySplit?, committeeIdentity. |
| ENT-10 | LogicUpgradeInput | module, description, approvers[] (min 2), newVersion, oldLogicPayload, newLogicPayload. |

## 3.3 Records (chain payloads)

[TABLE 6]
| ID | Entity | Fields |
|---|---|---|
| ENT-11 | ClassificationResult | computedClass (SupplierClass | MANUAL_REQUIRED), method, ruleVersion, effectivePercent (number | null), componentBreakdown? [{name, declaredPercent, thresholdPercent, pass, weightPercent}], pliDeemed, nearThreshold, reasons[]. |
| ENT-12 | AnomalyFlag | type (AnomalyType), description, relatedTxRef?. |
| ENT-13 | BidRecord | bidId ('bid_' + tenderId + '_' + vendorId + '_' + base36 time), txRef, tenderId, vendorId, input, classification, anomalies[], debarred, status, statusReasons[], createdAt, blockHeight. |
| ENT-14 | CACertificationRecord | certId ('cert_' + bidId + '_' + base36), txRef, bidId, vendorId, tenderId, input, declaredPercent, mismatch, mismatchDeltaPercent, createdAt, blockHeight. |
| ENT-15 | DebarmentRecord | debarmentId ('debar_' + vendorId + '_' + base36), vendorId, reason, startDate, endDate, debarringAuthority, linkedTenders[], penaltyAmountRupees?, createdAt, txRef, blockHeight. |
| ENT-16 | RuleUpdateRecord | ruleUpdateId ('rule_' + hsn + '_v' + n), txRef, ministry, hsnCode, oldConfig (RuleConfig | null), newConfig, adminIdentity, timestamp, blockHeight. |
| ENT-17 | PriceMatchOffer | candidateVendorId, candidatePrice, withinBand, bandLimit, offered, accepted?. |
| ENT-18 | DecisionTraceStep | step, detail, data?. |
| ENT-19 | PreferenceOutcome | tenderId, txRef, decisionPath, l1VendorId, l1Price, eligibleBidders[], excludedBidders[{vendorId, reason}], classICandidates[{vendorId, price, withinBand}], priceMatchOffers[], mseePreferenceApplied, para3AEnforced, quantitySplit[{vendorId, quantity, price}], marginCalculations[{vendorId, l1Price, bandLimit, candidatePrice}], anomaliesFlagged[], steps[], committeeAction?, committeeRemarks?, createdAt, blockHeight. |
| ENT-20 | CommitteeActionPayload | tenderId, preferenceTxRef, action, remarks, modifiedQuantitySplit | null, committeeIdentity, timestamp. |
| ENT-21 | AuditorFlaggedPayload | caKey, triggeringVendorId, triggeringDebarmentId, flaggedCertIds[], totalCertsByCA, flaggedAt. |
| ENT-22 | DebarmentWebhookPayload | debarmentId, recipients ('ALL_PROCURING_ENTITIES'), notifiedAt. |
| ENT-23 | LogicUpgradedPayload | module, oldVersion, newVersion, description, approvers[], oldLogicHash | null, newLogicHash, activatedAt. |
| ENT-24 | AuditorRiskProfile (derived) | caKey, totalCertifications, problematicCertifications, riskScore (0..1), problematicVendorIds[]. Never stored; recomputed on read. |
| ENT-25 | ChainTransaction<T> | txRef, type, payload, timestamp, blockHeight, blockHash, acl {vendorIds?, ministries?, tenderIds?, caIds?, public?}. |
| ENT-26 | FinalizedBlock | height, prevHash, merkleRoot, timestamp, txRefs[], hash, signatures[ValidatorSignature], quorum ('n/3'). |
| ENT-27 | ValidatorSignature | nodeId, organization, confirmedHash, signature, confirmedAt. |
| ENT-28 | IntegrityCheckResult | valid, blocksChecked, brokenAtHeight?, reason? ('prevHash mismatch' | 'merkleRoot mismatch' | 'block hash mismatch'). |
| ENT-29 | Analytics (derived) | totalBids, classShareByMinistry[{ministry, classI, classII, nonLocal, manual, totalValue}], vendorConcentration[{vendorId, legalName, totalValue, bidCount}] sorted desc, anomalyCount, debarmentCount, para3AImpact[{hsnCode, ministry, totalBids, classIBids, classIShare}]. |

# 4. Chain layer (Cerulea private permissioned chain simulator)
A single façade (CeruleaClient) is the only thing engines and routes import. Swapping the simulator for the production Cerulea platform touches only this façade.

## 4.1 Storage

[TABLE 7]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| CHN-01 | SQLite file location | Local: <project>/data/chain.db. On Vercel: /tmp/cbc-pramaan-data/chain.db. WAL journal mode. |
| CHN-02 | Table blocks | height INTEGER PK, prev_hash, merkle_root, hash, timestamp, quorum, signatures_json. All NOT NULL. |
| CHN-03 | Table transactions | tx_ref PK, block_height, type, payload_json, acl_json, timestamp, payload_hash. Index on type. |
| CHN-04 | Table logic_versions | id AUTOINCREMENT, module, version, description, old_version, approvers_json, old_logic_hash, new_logic_hash, activated_at, tx_ref. |
| CHN-05 | Genesis hash | sha256('CBC-PRAMAAN / Cerulea Private Permissioned Chain / genesis'). Used as prevHash of block 0. |

## 4.2 Hashing and blocks

[TABLE 8]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| CHN-06 | sha256(string) | Hex digest of UTF-8 input. |
| CHN-07 | sha256Json(value) | sha256 of JSON.stringify(value). |
| CHN-08 | merkleRoot(leaves[]) | Empty list returns sha256(''). Pairwise sha256(left + right); odd leaf is paired with itself. Repeat to one root. |
| CHN-09 | computeBlockHash(header) | sha256 of JSON {height, prevHash, merkleRoot, timestamp} in that key order. txRefs deliberately excluded. |
| CHN-10 | txRef format | 'tx_' + base36(now) + '_' + base36(counter) + '_' + first 10 hex of sha256Json({type, payload, timestamp}). |
| CHN-11 | One transaction per block | submitTransaction wraps each action in its own block. Block height = previous height + 1 (or 0 on an empty chain). |

## 4.3 DCF consensus

[TABLE 9]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| CHN-12 | Validator set (3) | validator-gem-gateway 'GeM API Gateway (CBC-PRAMAAN Integration)'; validator-dpiit 'DPIIT National Node'; validator-nodal-ministry 'Nodal Ministry Rotating Seat'. |
| CHN-13 | Consensus round | Each validator independently recomputes the candidate block hash. A match yields a signature = sha256(nodeId + ':' + blockHash + ':cerulea-dcf-v1') with confirmedAt. |
| CHN-14 | Quorum | Finalized when signatures >= ceil(3 * 2 / 3) = 2. Quorum string 'n/3'. Failure throws 'DCF consensus quorum not reached; block rejected' and nothing is written. |
| CHN-15 | Synchronous finality | Hashing, Merkle root, consensus and both inserts complete inside the same call that returns the domain result. |

## 4.4 Reads, verification, private collections

[TABLE 10]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| CHN-16 | getTransaction(txRef) | Joined with blocks to return blockHash. Null when absent. |
| CHN-17 | queryTransactionsByType(type) | Ascending block height. |
| CHN-18 | queryAllTransactions() | Ascending block height. |
| CHN-19 | getAllBlocks() / getBlockTxRefs(height) | Blocks ascending; txRefs looked up per block. |
| CHN-20 | verifyChainIntegrity() | Walk blocks ascending: prev_hash must equal previous hash (genesis for block 0); recomputed Merkle root of the block's payload_hashes must equal merkle_root; recomputed header hash must equal hash. First failure returns {valid: false, brokenAtHeight, reason}. |
| CHN-21 | verifyRecordByHashOrTxRef(ref) | Match tx_ref first, then payload_hash. Returns only {found, txRef, blockHeight, blockHash, type, timestamp}. Never returns payload. |
| CHN-22 | canAccess(tx, identity) | Implements ROLE-09 to ROLE-15 exactly. |
| CHN-23 | getVisibleTransactionsByType / getAllVisibleTransactions | Type or full query filtered through canAccess. |
| CHN-24 | hydrate(tx) | Returns {...payload, txRef, blockHeight} so stored placeholders ('' and -1) are always overwritten by the envelope. |

## 4.5 Smart Evolution (versioned logic)

[TABLE 11]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| CHN-25 | getCurrentLogicVersion(module) | MAX(version) from logic_versions, default 1. |
| CHN-26 | upgradeLogic(input) | Reject if approvers < 2 ('requires multi-signature approval'). Reject if newVersion <= current. Hash old and new payloads, write a public LOGIC_UPGRADED transaction, then insert into logic_versions with that txRef. |
| CHN-27 | getLogicHistory(module) | Rows ascending by version with approvers parsed. |

# 5. Rule Registry
A fixed layer (DPIIT defaults, hardcoded) and a configurable layer (per ministry, per HSN, stored as RULE_UPDATED transactions). The current rule for an HSN is the highest version on chain.

[TABLE 12]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| RUL-01 | Wildcard HSN | '*' is the DPIIT default row. Any HSN without its own rule resolves to '*'. Requesting '*' when unseeded throws 'DPIIT default rule has not been seeded'. |
| RUL-02 | Floor check | isFloorRespected: classI >= 50 AND classII >= 20 AND classII < classI. Skipped entirely when method is CUSTOM. |
| RUL-03 | updateRule rejection | Non-CUSTOM update failing the floor throws: 'Rejected: Class-I threshold must be >= 50 and Class-II threshold must be >= 20 and less than Class-I threshold. Nodal ministries can only raise thresholds, never lower them.' API returns HTTP 400. |
| RUL-04 | Versioning | newVersion = (latest existing version for that HSN) + 1, else 1. newConfig.supersedes = old version. |
| RUL-05 | Record written | RULE_UPDATED with oldConfig (full previous RuleConfig or null), newConfig, adminIdentity, timestamp. ACL: public = true, ministries = [ministry]. |
| RUL-06 | getRuleConfig(hsn) | Highest-version newConfig for that HSN, else wildcard. |
| RUL-07 | getRuleHistory(hsn) | All versions ascending. |
| RUL-08 | listAllCurrentRules() | One row per HSN (highest version), sorted by hsnCode. |
| RUL-09 | listAllRuleHistory() | All RULE_UPDATED records ascending by timestamp. |
| RUL-10 | Cache invalidation | A successful rule update clears every cache key prefixed 'evaluation:'. |

## 5.1 Seeded rule set (7 rows)

[TABLE 13]
| HSN | Label | Ministry | Class-I | Class-II | Method | Para 3A | PLI | Effective |
|---|---|---|---|---|---|---|---|---|
| * | All other categories (DPIIT default) | DPIIT | 50 | 20 | STANDARD | no | 2017-06-15 |
| 8471 | Computers / IT hardware | MeitY | 50 | 20 | COMPONENT_LEVEL | no | 2021-02-01 |
| 8443 | Printers | MeitY | 50 | 20 | STANDARD | no | 2021-02-01 |
| 8517 | Telecom equipment | DoT | 60 (v1) then 65 (v2) | 20 | STANDARD | yes | no | 2020-08-01 / 2026-07-01 |
| 2523 | Cement | DPIIT | 50 | 20 | STANDARD | yes | no | 2019-05-01 |
| 8523 | Software / recorded media | MeitY | 50 | 20 | CUSTOM | no | 2022-01-01 |
| 8544 | Cables | DPIIT | 50 | 20 | STANDARD | no | yes | 2021-11-01 |
HSN 8471 component definitions (weights sum to 100): PCB/Motherboard 40%, must be local; Power Supply 15%, threshold 50%; Enclosure/Chassis 10%, threshold 80%; Assembly & Testing 20%, must be local; Software/OS 15%, no gate.
HSN 8523 custom rule text: 'For software products, local content shall be assessed based on the proportion of Indian development team person-hours to total person-hours, verified through project management records and HR documentation. No automated formula exists; the Tender Committee must manually validate against this rule text.'

# 6. Engines
Every engine is deterministic: identical inputs and rule version always produce identical output. Classification and Consistency are pure functions; the others write to the chain.

## 6.1 Classification Engine

[TABLE 14]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| ENG-01 | PLI override | If rule.pliLinked AND input.isPLIManufacturer: computedClass = CLASS_II, pliDeemed = true, nearThreshold = false, effectivePercent = declared or null. Evaluated before any other branch. |
| ENG-02 | CUSTOM branch | computedClass = MANUAL_REQUIRED, effectivePercent = declared or null, reasons include the rule's customRuleText. |
| ENG-03 | COMPONENT_LEVEL validation | Throw if the rule has no components. Throw if the input has no componentDeclarations. |
| ENG-04 | COMPONENT_LEVEL gating | Per component: mustBeLocal passes only at declared >= 100; numeric threshold passes at declared >= threshold; null threshold always passes. Missing declaration counts as 0. |
| ENG-05 | COMPONENT_LEVEL weighted percent | effectivePercent = round(sum(declared * weight) / 100). |
| ENG-06 | COMPONENT_LEVEL nearThreshold | true if within 2 points of either threshold OR any component failed its gate. |
| ENG-07 | STANDARD / WEIGHTED_MODULE | Throw if declaredLocalContentPercent is missing. effectivePercent = declared. Reason line cites both thresholds, rule version and ministry. Adds a claim-mismatch reason if computed != claimed. |
| ENG-08 | classifyByPercent | >= classI gives CLASS_I; >= classII gives CLASS_II; else NON_LOCAL. |
| ENG-09 | isNearThreshold | abs(effective - classI) <= 2 OR abs(effective - classII) <= 2. |

## 6.2 Consistency Engine (cross-tender memory)

[TABLE 15]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| ENG-10 | Inputs | New input, its effectivePercent, its class rank (NON_LOCAL 0, CLASS_II 1, CLASS_I 2, MANUAL -1), and the vendor's full bid history across all tenders. |
| ENG-11 | Product matching | Same product = trimmed, lower-cased productName equality. |
| ENG-12 | SAME_PRODUCT_DIFFERENT_PERCENT | For each prior same-product bid with a non-null percent, flag when abs(new - prior) >= 10. Description names both tenders and the point delta; relatedTxRef = prior txRef. |
| ENG-13 | SUDDEN_CLASSIFICATION_JUMP | Flag when the vendor has same-product history and every prior rank is strictly lower than the new rank. |
| ENG-14 | GEOGRAPHIC_INCONSISTENCY | Flag when same-product history exists and the new manufacturingLocation (trimmed, lower-cased) is not in the set of prior locations. |
| ENG-15 | VOLUME_CAPACITY_MISMATCH | If any prior bid's location contains a small-facility keyword and cumulative quantity (all prior + new) >= 10,000, flag with the en-IN formatted total. |

## 6.3 Debarment Engine

[TABLE 16]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| ENG-16 | Duration guard | Throw 'Debarment end date exceeds the maximum 2-year limit under GFR Rule 151(iii)' if end > start + 2 years. |
| ENG-17 | Record | DEBARMENT_CREATED written with public ACL. No per-ministry silo. |
| ENG-18 | Webhook fan-out | Immediately after, write DEBARMENT_WEBHOOK_EMITTED (public) with recipients 'ALL_PROCURING_ENTITIES'. |
| ENG-19 | Auditor trigger | If reason matches /false declaration/i, call the Auditor Accountability flag routine (ENG-24). |
| ENG-20 | preBidDebarmentCheck(vendorId, at) | Active when at is within [startDate, endDate] of any record for that vendor. Returns the matching record. |

## 6.4 Certification Engine and Auditor Accountability Ledger

[TABLE 17]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| ENG-21 | isCACertificationRequired(tender) | estimatedValueRupees > 100,000,000. |
| ENG-22 | Mismatch | delta = abs(certified - bid.effectivePercent or 0); mismatch = delta >= 5. |
| ENG-23 | Record | CA_CERTIFICATION with ACL vendorIds [vendor], tenderIds [tender], caIds [caKey], public false. |
| ENG-24 | flagAuditorForVendorDebarment | For each CA key that certified the debarred vendor: write public AUDITOR_FLAGGED listing every OTHER cert by that CA (flaggedCertIds), totalCertsByCA, triggering vendor and debarment. |
| ENG-25 | getAuditorRiskProfile(caKey, debarments) | problematic = certs whose vendorId appears in any debarment with a false-declaration reason. riskScore = problematic / total (0 when no certs). problematicVendorIds deduplicated. |
| ENG-26 | listAllCAKeys() | Distinct CA keys across all certifications. |

## 6.5 Bid Submission orchestrator (Trigger 1)

[TABLE 18]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| ENG-27 | Lookups | Throw 'Unknown tender' / 'Unknown vendor' if absent. Resolve rule by input.hsnCode. |
| ENG-28 | Pipeline order | 1 debarment pre-check, 2 classification, 3 consistency over the vendor's full history, 4 aggregation. |
| ENG-29 | belowThresholdForClaim | computed != MANUAL AND ((claimed CLASS_I AND computed != CLASS_I) OR (claimed CLASS_II AND computed == NON_LOCAL)). |
| ENG-30 | nonLocalOnDomestic | computed == NON_LOCAL AND tender.tenderType == DOMESTIC. |
| ENG-31 | para3AViolation | rule.para3A AND tender.procurementCategory == SI_EPC_TURNKEY_SERVICE AND computed not in {CLASS_I, MANUAL_REQUIRED}. |
| ENG-32 | Status precedence (first match wins) | RED debarred > RED below-threshold-for-claim > RED non-local-on-domestic > RED Para 3A > YELLOW manual (CUSTOM) > YELLOW anomalies > YELLOW nearThreshold > YELLOW first declaration for this HSN > GREEN. |
| ENG-33 | Reason text: debarred | 'Vendor is on the cross-ministry debarment registry (debarred by {authority}, reason: {reason}). Bid is blocked.' |
| ENG-34 | Reason text: below threshold | 'Vendor claimed {claimed} but computed classification is {computed} — declared percentage is below the applicable threshold for the claimed class.' |
| ENG-35 | Reason text: non-local | 'Vendor is a Non-Local supplier bidding on a domestic tender — not permitted (only Global Tender Enquiries allow Non-Local bidders).' |
| ENG-36 | Reason text: Para 3A | 'HSN {hsn} is a Para 3A mandatory-sourcing item for this SI/EPC/Turnkey/Service tender, and the vendor is not Class-I.' |
| ENG-37 | Reason text: CUSTOM | 'CUSTOM calculation method — manual Tender Committee validation required.' |
| ENG-38 | Reason text: nearThreshold | If any component failed: 'Component(s) failed their individual threshold despite the weighted average passing: {names} — flagged for closer examination.' Else: 'Declared percentage is close to the classification threshold boundary — flagged for closer examination.' |
| ENG-39 | Reason text: first-time | 'First-time declaration by this vendor for HSN {hsn} — no historical baseline exists for comparison.' (No prior bid by this vendor on the same HSN.) |
| ENG-40 | Reason text: GREEN | 'Declaration meets the applicable threshold; no anomalies; not debarred.' |
| ENG-41 | Record ACL | BID_SUBMITTED with vendorIds [vendor, oemReference if any], tenderIds [tender], ministries [rule.ministry]. |

## 6.6 Purchase Preference Decision Engine (Trigger 3)

[TABLE 19]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| ENG-42 | Pre-filter | Exclude every RED bid, recording {vendorId, reason}. Trace step 'Pre-filter' with counts. |
| ENG-43 | Consistency flags step | List eligible bidders with anomalies as 'vendor: TYPE, TYPE'. Not excluded, flagged for committee attention. |
| ENG-44 | No eligible bidders | decisionPath NO_ELIGIBLE_BIDDERS, empty split, no chain write. |
| ENG-45 | Ranking | Sort eligible by quotedPricePerUnit ascending; L1 = first. Trace 'Rank by price'. |
| ENG-46 | Class-I candidates and margins | For every non-L1 Class-I bidder record price, withinBand (price <= L1 * 1.2) and a margin row with bandLimit rounded to 2 decimals. |
| ENG-47 | Classify L1 | Trace combined status '{MSE|Non-MSE} + {Class-I|Non-Class-I}' and whether MSE preference is active. |
| ENG-48 | offerCascade(candidates, l1Price, multiplier) | bandLimit = round(l1 * multiplier, 2). Candidates within band, ascending price, are each offered a match; first acceptance wins (PoC: always accepts). Out-of-band candidates are listed as offered = false. Each offer is a trace step. |
| ENG-49 | MII path, L1 Class-I | Full quantity to L1 at L1 price. |
| ENG-50 | MII path, no Class-I candidate | Full quantity to L1. |
| ENG-51 | MII path, divisible, L1 not Class-I | Cascade at 1.20. Winner: round(qty/2) to L1, remainder to winner, both at L1 price. No winner: full to L1. |
| ENG-52 | MII path, non-divisible, L1 not Class-I | Cascade at 1.20. Winner takes entire quantity at L1 price. No winner: full to L1. |
| ENG-53 | MSE matrix, MSE + Class-I L1 | Full award to L1. |
| ENG-54 | MSE matrix, Non-MSE + Class-I L1 | round(qty * 0.75) to L1; cascade MSE candidates at 1.15 for the remainder at L1 price; no winner gives full to L1. |
| ENG-55 | MSE matrix, MSE + Non-Class-I L1 | Tier 1 MSE+Class-I candidates at 1.20, then tier 2 Non-MSE+Class-I at 1.20. Divisible: 50/50 with winner. Non-divisible: winner takes all. No winner: full to L1. Trace labels say 'extended pattern' for the divisible case. |
| ENG-56 | MSE matrix, Non-MSE + Non-Class-I L1 | Tier 1 MSE candidates at 1.15, then tier 2 Class-I candidates at 1.20. Divisible 50/50 or non-divisible full; no winner gives full to L1. |
| ENG-57 | Record | PREFERENCE_CALCULATED with ACL tenderIds [tender], vendorIds = eligible bidder ids. |
| ENG-58 | getLatestPreferenceOutcome(tenderId) | Most recent by createdAt, hydrated; null when none. |
| ENG-59 | recordCommitteeAction | PREFERENCE_COMMITTEE_ACTION, ACL tenderIds [tender], public true. Remarks default to ''. |
| ENG-60 | getCommitteeActionsForTender | All committee payloads for the tender in chain order. |

## 6.7 Analytics read model

[TABLE 20]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| ENG-61 | Bid value | quotedPricePerUnit * quantity. |
| ENG-62 | Ministry attribution | Rule for bid's HSN, else wildcard rule, else 'Unknown'. |
| ENG-63 | Class buckets | classI / classII / nonLocal / manual by computedClass, plus totalValue, per ministry. |
| ENG-64 | Vendor concentration | Sum of value and count per vendor, with legalName, sorted by value descending. |
| ENG-65 | Para 3A impact | For each rule with para3A: bids on that HSN, Class-I count, share (0 when no bids). |
| ENG-66 | Determinism | Two consecutive computations over the same chain must be JSON-identical (asserted by the rebuild script). |

# 7. API surface
All routes live under /api/v1. Every handler wraps its work so any thrown Error becomes HTTP 400 {error: message}. Identity is read from ?role= and ?id= query parameters.

## 7.1 The six GeM trigger points

[TABLE 21]
| ID | Method + path | Trigger | Body / params | Returns |
|---|---|---|---|---|
| API-01 | POST /bids | 1 Bid Submission | BidSubmissionInput | {status, computedClass, ruleVersion, reasons[], anomalies[], txRef, blockHeight, bid} |
| API-02 | GET /tenders/{tenderId}/evaluation | 2 Bid Evaluation | role, id | {tenderId, cachedAt, bids[{vendorId, bidId, status, computedClass, quotedPricePerUnit, anomalies, reasons, txRef}], fromCache?}. Cached 5 min per tender+role+id. |
| API-03 | POST /tenders/{tenderId}/preference | 3 Preference Calculation | none | PreferenceOutcome |
| API-04 | POST /certifications | 4 CA Certification | CACertificationInput | {certId, mismatch, mismatchDeltaPercent, wasRequired, txRef, blockHeight, certification}. 'Unknown bid' on bad bidId. |
| API-05 | POST /debarments | 5 Debarment | DebarmentInput | DebarmentRecord |
| API-06 | POST /rules | 6 Rule Update | RuleUpdateInput | RuleUpdateRecord; 400 when below the DPIIT floor. Invalidates evaluation cache. |

## 7.2 Read endpoints

[TABLE 22]
| ID | Method + path | Params | Returns |
|---|---|---|---|
| API-07 | GET /bids | role, id, tenderId?, vendorId? | BidRecord[] visible to the caller (private collections). |
| API-08 | GET /tenders/{tenderId}/preference |  | Latest PreferenceOutcome or null. |
| API-09 | POST /tenders/{tenderId}/preference/action | CommitteeAction body (minus tenderId) | {txRef, blockHeight} |
| API-10 | GET /tenders/{tenderId}/preference/action |  | Committee action payloads for the tender. |
| API-11 | GET /certifications | role, id, bidId?, caKey? | Visible CACertificationRecord[]. |
| API-12 | GET /debarments |  | Full public registry. |
| API-13 | GET /rules |  | Current RuleConfig per HSN. |
| API-14 | GET /rules/history | hsnCode? | History for one HSN, or all RULE_UPDATED records. |
| API-15 | GET /auditors |  | AuditorRiskProfile[] for every CA key. |
| API-16 | GET /auditors/{caKey} | caKey URL-encoded | {profile, certifications[]} |
| API-17 | GET /analytics |  | Analytics object (ENT-29). |
| API-18 | GET /meta |  | {vendors[], tenders[], rules[]} reference data for form dropdowns. |
| API-19 | GET /openapi |  | docs/openapi.yaml as text/yaml. |

## 7.3 Chain explorer endpoints

[TABLE 23]
| ID | Method + path | Params | Returns |
|---|---|---|---|
| API-20 | GET /chain/blocks |  | FinalizedBlock[] with txRefs, descending height. |
| API-21 | GET /chain/transactions | type? | ChainTransaction[] descending height, optionally filtered by type. Not ACL-filtered (explorer is the AUDIT role's tool). |
| API-22 | GET /chain/integrity |  | IntegrityCheckResult. |
| API-23 | GET /chain/verify | ref (required) | verifyRecordByHashOrTxRef result plus chainIntegrityValid. Error 'Provide a transaction reference or declaration hash via ?ref=' when missing. |
| API-24 | GET /chain/logic-history | module (default 'rule-registry') | LogicUpgradeRecord[]. |
| API-25 | POST /chain/upgrade-logic | LogicUpgradeInput | LogicUpgradeRecord; 400 when fewer than 2 approvers. |

## 7.4 Cross-cutting API behaviour

[TABLE 24]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| APX-01 | Error envelope | Any exception in a handler returns 400 with {error: string}. |
| APX-02 | Identity parsing | role must be one of the six roles and id must be non-empty; otherwise VENDOR '__anonymous__'. |
| APX-03 | Client helper | apiGet / apiPost append role and id to the query string when an identity is supplied; fetch with cache: 'no-store'; throw the error string on non-OK. |
| APX-04 | In-memory TTL cache | get / set (default 5 min) / invalidate by prefix / clear. Used only by the evaluation endpoint. |

# 8. Application shell and design tokens

## 8.1 Shell

[TABLE 25]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| SHL-01 | Root layout | Title 'CBC-PRAMAAN: Make in India Compliance Trust Layer'. Body background = page token. Wraps everything in RoleProvider then AppShell. |
| SHL-02 | Sidebar (desktop, fixed 16rem) | Three groups. Simulate: GeM Simulator. Dashboards: Vendor, Procuring Entity, Ministry Admin, DPIIT Admin. Trust & Transparency: Audit Explorer, CA Portal, Analytics, Verify. Active item = tinted background + brand dot. Footer chip: 'Non-crypto · permissioned · demonstration data only.' |
| SHL-03 | Sidebar (mobile drawer) | Opened from a menu button in the top bar, overlay closes it, close button top-right, 18rem wide. |
| SHL-04 | Tricolour accent bar | 3px gradient gold 0-20%, brand 35-65%, green 80-100% at the top of the sidebar and the content column. |
| SHL-05 | Top bar | Sticky, translucent. 'Viewing as' label + identity switcher on the right; full logo (desktop) or mark (mobile) linking home. |
| SHL-06 | Identity switcher | Dropdown grouped by role label with a role colour dot; current identity ticked; click-outside closes; selection persists to localStorage. |
| SHL-07 | Footer | 'CBC-PRAMAAN Proof of Concept: non-crypto, permissioned Cerulea private chain. Demonstration data only.' and '© Caerulean Bytechains Private Limited · Blockchain for Good'. |
| SHL-08 | Content column | max-width 72rem, page padding 1rem (mobile) / 2rem (desktop), fade-in animation on route change. |
| SHL-09 | Brand assets | /brand/cerulea-icon.svg, /brand/cerulea-logo.png, /brand/cerulea-logo-source.svg; LogoMark and LogoFull components; favicon and icon.svg. |

## 8.2 UI primitives (one component each)
Card, CardHeader, CardTitle, CardDescription, CardContent, PageHeader (icon + title + description + optional actions), SectionLabel, Button (variants default / outline / ghost / destructive; size sm; loading; icon), Badge (tones brand / neutral / good / warning / critical), StatusBadge (GREEN / YELLOW / RED), Input, Label, Select, Textarea, Checkbox (with label), Table / Th / Td / Tr, Mono, Divider, EmptyState (icon + title + description), Skeleton, StatTile (label, value, icon, tone), PillTabs (id + label + icon).

## 8.3 Design tokens

[TABLE 26]
| Token | Value | Token | Value |
|---|---|---|---|
| page | #F4F6F9 | brand | #004AAD |
| surface | #FFFFFF | brand-hover | #003C8F |
| surface-sunken | #EEF1F5 | brand-active | #002D6B |
| overlay | rgba(18,32,58,0.5) | brand-tint | #EAF1FC |
| ink-primary | #11274A | brand-tint-strong | #D3E3F9 |
| ink-secondary | #475A7D | brand-navy | #12305C |
| ink-muted | #8695AC | brand-gold | #EEC000 |
| border | #E2E8F0 | brand-green | #30B700 |
| border-strong | #CBD5E1 | good / tint | #0CA30C / #E7F7E7 |
| series-1 | #2A78D6 | warning / tint | #B8790A / #FDF1DC |
| series-2 | #1BAF7A | critical / tint | #D03B3B / #FBE9E9 |
| series-3 | #C98500 | series-6 | #E34948 |
| series-4 | #008300 | series-7 / 8 | #E87BA4 / #EB6834 |
| series-5 | #4A3AA7 | chart-grid / axis | #E7E9EE / #CBD1DB |
| radius sm / md / lg / xl | 6 / 10 / 14 / 20 px | shadows | xs, sm, md, lg (navy-tinted) |
Chart colour mapping (fixed, never cycled): Class-I series-1, Class-II series-2, Manual series-3, Non-Local series-6.

# 9. Screens
Nine routes plus the home page. Each screen lists its gate, its data calls, and every visible element in order.

## 9.1 Home  (/)

[TABLE 27]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| SCR-H-01 | Hero | Brand gradient card, faint icon watermark, 'Proof of Concept' pill, title, full-form subtitle, one-paragraph description, three chips (Non-crypto, Permissioned, No tokens, wallets, or mining), button 'Open the GeM Simulator'. |
| SCR-H-02 | How to use (3 steps) | 1 Pick a role (gold), 2 Drive an action (brand), 3 See it recorded (green). |
| SCR-H-03 | Pillars (3) | Immutable by construction; Automated, not manual; Cross-tender memory. |
| SCR-H-04 | Screen grid (9 cards) | One card per route with icon, title, description, hover arrow. |

## 9.2 GeM Simulator Console  (/simulator)  gate: none

[TABLE 28]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| SCR-S-01 | Header | 'GeM Simulator Console' with description 'Stands in for GeM…'. |
| SCR-S-02 | Pill tabs (6) | Bid Submission, Bid Evaluation, Preference Calculation, CA Certification, Debarment, Rule Update. Card title and description change with the active tab. |
| SCR-S-03 | Reference data | Loads /meta once; shows skeletons until loaded and a 'Refreshing reference data' hint while refreshing. |
| SCR-S-04 | Request / Response panel | Two-column: left shows METHOD chip + URL + pretty JSON request; right shows RESPONSE (green) or ERROR (red) JSON. Max height 18rem with scroll. Shown after the first call on every form. |

### Bid Submission form (Trigger 1)

[TABLE 29]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| SCR-S1-01 | Tender select | Options '{id}: {title} (HSN {hsn})'. Drives the rule shown below. |
| SCR-S1-02 | Vendor select | legalName of each vendor. |
| SCR-S1-03 | Claimed Class select | Class-I / Class-II / Non-Local. Default Class-I. |
| SCR-S1-04 | Quoted Price / Unit (Rs) | number, default 50000. |
| SCR-S1-05 | Quantity | number, default 100. |
| SCR-S1-06 | Vendor Type select | OEM / Reseller. Reseller reveals 'OEM Reference' text input. |
| SCR-S1-07 | Product Name | text, default 'Demo Product'. |
| SCR-S1-08 | Manufacturing Location | text, default 'Pune, Maharashtra'. |
| SCR-S1-09 | MSE checkbox | 'MSE (Micro/Small Enterprise)'. |
| SCR-S1-10 | PLI checkbox | 'PLI manufacturer for this item', visible only when the resolved rule is pliLinked. |
| SCR-S1-11 | Declaration section badges | Method badge (STANDARD etc.) and a warning badge 'Para 3A mandatory sourcing' when the rule has para3A. |
| SCR-S1-12 | Declaration: COMPONENT_LEVEL | One number input per rule component labelled '{name} (weight n%)' with sub-label 'must be locally manufactured' / 'threshold n%' / 'no gate'. |
| SCR-S1-13 | Declaration: CUSTOM | Shows customRuleText, then a number input 'declared % (recorded, not auto-validated)'. |
| SCR-S1-14 | Declaration: STANDARD | 'Declared Local Content %' (default 60) with helper 'Class-I threshold n% · Class-II threshold n%'. |
| SCR-S1-15 | Submit | Button 'Submit Bid'. declarationPdfHash is generated as 'sha256-demo-' + base36 time. After response, a 'Result:' StatusBadge appears beside the button. |

### Bid Evaluation panel (Trigger 2)

[TABLE 30]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| SCR-S2-01 | Tender select + button | 'Open Bids for Evaluation'. Calls the evaluation endpoint with the current identity. |
| SCR-S2-02 | Results table | Columns Vendor, Status (badge), Class, Price/Unit (en-IN), Reasons (joined with '; '), Tx Ref (14 chars + ellipsis). |
| SCR-S2-03 | Empty state | 'No bids yet' when the tender has none visible. |

### Preference Calculation panel (Trigger 3)

[TABLE 31]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| SCR-S3-01 | Tender select | Options '{id}: {title} ({divisible|non_divisible}, MSE pref on|off)'. |
| SCR-S3-02 | Button | 'Compute Preference' posts to the preference endpoint. |
| SCR-S3-03 | Outcome header badges | decisionPath (brand), 'MSE preference applied' (if true), 'Para 3A enforced' (if true), trophy badge 'L1: {vendor} @ Rs{price}'. |
| SCR-S3-04 | Award list | One row per quantitySplit entry: vendor · quantity units @ Rs price. |
| SCR-S3-05 | Excluded at pre-filter | Red list of vendor: reason. |
| SCR-S3-06 | Decision trace | Ordered list on a left rail: 'step: detail' for every trace step. |

### CA Certification form (Trigger 4)

[TABLE 32]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| SCR-S4-01 | Tender select | Options '{id}: {title} (Rs{value/1e7 to 1 dp} cr)'. Changing it reloads bids as the AUDIT identity. |
| SCR-S4-02 | Bid select | Options '{vendorId}: declared n%'; placeholder 'No bids for this tender yet'. |
| SCR-S4-03 | Certified Local Content % | number, default 60. |
| SCR-S4-04 | CA Firm Registration Number | text, default 'Sharma-and-Associates-FR-2201'. |
| SCR-S4-05 | CA Membership Number | text, default 'ICAI-M-118824'. |
| SCR-S4-06 | Mandatory notice | Above Rs 10 cr: warning badge + 'CA/auditor certificate is mandatory at execution (Build Spec §6.3).' Below: neutral badge + 'Self-certification remains sufficient; this CA certificate is optional here.' |
| SCR-S4-07 | Submit | 'Submit CA Certification', disabled without a bid. certificatePdfHash generated as 'sha256-cert-demo-' + base36 time. |

### Debarment form (Trigger 5)

[TABLE 33]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| SCR-S5-01 | Vendor select | legalName list. |
| SCR-S5-02 | Debarring Authority | text, default 'Ministry of Defence'. |
| SCR-S5-03 | Start Date / End Date | date inputs; defaults today and today + 2 years. End label cites GFR Rule 151(iii). |
| SCR-S5-04 | Linked Tenders | comma-separated text, split and trimmed. |
| SCR-S5-05 | Penalty Amount (Rs, optional) | number or blank. |
| SCR-S5-06 | Reason | textarea, default 'False declaration of local content', with warning note that such reasons trigger the Auditor Accountability Ledger. |
| SCR-S5-07 | Submit | Destructive button 'Create Debarment (cross-ministry)'. |

### Rule Update form (Trigger 6)

[TABLE 34]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| SCR-S6-01 | HSN Code select | Options '{hsn}: {label} (v{n})'. Selecting auto-fills every other field from the current rule. |
| SCR-S6-02 | Ministry | text. |
| SCR-S6-03 | Class-I Threshold % | number; label shows '(floor 50, current n)'. |
| SCR-S6-04 | Class-II Threshold % | number; label shows '(floor 20, current n)'. |
| SCR-S6-05 | Method select | STANDARD / COMPONENT_LEVEL / WEIGHTED_MODULE / CUSTOM. |
| SCR-S6-06 | Admin Identity (DSC stand-in) | text, default 'dot-admin-demo'. |
| SCR-S6-07 | Checkboxes | 'Para 3A mandatory sourcing'; 'PLI-linked (deemed Class-II)'. |
| SCR-S6-08 | Floor notice | Lock icon: 'The smart contract rejects any Class-I threshold below 50% or Class-II threshold below 20%. A nodal ministry can only raise thresholds, never lower them.' |
| SCR-S6-09 | Submit | 'Update Rule (on-chain)'. Carries existing components and customRuleText forward; effectiveDate = today. On success calls onUpdated to refresh reference data. |

## 9.3 Vendor View  (/vendor)  gate: VENDOR

[TABLE 35]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| SCR-V-01 | Header | 'Vendor View ({vendorId})' with 'Your declarations only…'. |
| SCR-V-02 | Data | GET /bids?vendorId={id} with identity; GET /debarments filtered client-side to this vendor. |
| SCR-V-03 | Debarment banner | Red card 'DEBARRED' + 'Debarred by {authority}: {reason} (until {endDate})' when an active debarment exists. |
| SCR-V-04 | Stat tiles (4) | Total declarations, Green, Yellow, Red. Shown only when bids exist. |
| SCR-V-05 | Compliance History Timeline | Newest first, left rail with dots. Each entry: StatusBadge, tenderId, productName, computedClass badge, effectivePercent badge (if not null), reasons joined by '; ', date · txRef (18 chars) · block #. |
| SCR-V-06 | Empty state | 'No declarations yet' with hint to use the Simulator. |

## 9.4 Procuring Entity Compliance Panel  (/procuring-entity)  gate: PROCURING_ENTITY

[TABLE 36]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| SCR-P-01 | Header | 'Procuring Entity Compliance Panel'. |
| SCR-P-02 | Bid Evaluation card | Embeds the Bid Evaluation panel (SCR-S2). |
| SCR-P-03 | Compute Preference card | Embeds the Preference panel (SCR-S3). |
| SCR-P-04 | Committee Decision card | Tender select then the Committee Action panel below. |
| SCR-P-05 | Committee Action panel: empty | Dashed box 'No preference recommendation has been computed for this tender yet.' with Refresh button. |
| SCR-P-06 | Committee Action panel: form | Shows 'Committee decision on {txRef 18 chars}'; Action select (Accept / Modify / Override); Committee Identity text (default 'tender-committee-demo'); Remarks textarea '(required for modify/override)'; button 'Record Committee Decision (on-chain)'; success line 'Recorded: {txRef}'. |
| SCR-P-07 | Prior decisions | List 'ACTION: remarks or (no remarks) · en-IN timestamp' for every prior committee action on the tender. |

## 9.5 Nodal Ministry Admin  (/ministry-admin)  gate: MINISTRY_ADMIN

[TABLE 37]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| SCR-M-01 | Header | 'Nodal Ministry Admin ({ministry})'. |
| SCR-M-02 | Category Rules table | Columns HSN (mono), Label, Ministry, Class-I %, Class-II %, Method (badge), Flags (Para 3A warning badge, PLI neutral badge), Version (v{n}). Default filter = own ministry; ghost button toggles 'Show all ministries' / 'Show only my ministry'. Caption '{n} categories configured'. |
| SCR-M-03 | Update a Rule card | Embeds the Rule Update form (SCR-S6); refreshes the table on success. |

## 9.6 DPIIT Admin: National View  (/dpiit-admin)  gate: DPIIT_ADMIN

[TABLE 38]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| SCR-D-01 | Header | 'DPIIT Admin: National View' with link 'Full Analytics Dashboard' to /analytics. |
| SCR-D-02 | Stat tiles (4) | Total bids, Anomalies flagged, Active debarments, Ministries with activity. |
| SCR-D-03 | Cross-Ministry Debarment Registry table | Columns Vendor, Reason, Debarring Authority, Start, End, Penalty (Rs en-IN or N/A), Status (ACTIVE if endDate >= today else EXPIRED). |

## 9.7 CVC / Audit Explorer  (/audit)  gate: AUDIT

[TABLE 39]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| SCR-A-01 | Header | 'CVC / Audit Explorer', 'Read-only access across the entire immutable ledger.' |
| SCR-A-02 | Stat tiles (3) | Finalized blocks, Total transactions, Chain integrity (Not checked / Valid / Tampered). |
| SCR-A-03 | Chain Integrity Check card | Button 'Run Integrity Check'. Result badge VALID or TAMPERED with '{n} blocks independently re-hashed and verified' and, on failure, ', broken at height {h} ({reason})'. |
| SCR-A-04 | Search Ledger | Text input with search icon, placeholder 'Search by tx ref, event type, vendor id, hash…'. Filters on txRef, type, or any substring of the JSON payload (case-insensitive). |
| SCR-A-05 | Ledger table | Columns Block (#h), Type (badge), Tx Ref (mono), Timestamp. Newest first, first 100 rows, then 'Showing first 100 of {n} matches.' |

## 9.8 CA / Auditor Portal  (/ca)  gate: CA

[TABLE 40]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| SCR-C-01 | Header | 'CA / Auditor Portal', 'Certification history and risk profile for this auditor identity only.' |
| SCR-C-02 | Data | GET /auditors/{encoded caKey}. |
| SCR-C-03 | Stat tiles (3) | Total certifications; Flagged (vendor later debarred) in critical tone when > 0; Auditor risk score as a percentage, tone good at 0, warning below 50%, critical at or above 50%. |
| SCR-C-04 | Certification History table | Columns Vendor, Tender, Declared %, Certified %, Mismatch ('±{delta}pt' critical badge or 'No'), Flagged ('Flagged' badge when the vendor is in problematicVendorIds else 'N/A'), Tx Ref (14 chars). |

## 9.9 Compliance Analytics Dashboard  (/analytics)  gate: none

[TABLE 41]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| SCR-N-01 | Header | 'Compliance Analytics Dashboard', 'Aggregate views derived live from the finalized chain event log.' |
| SCR-N-02 | Stat tiles (4) | Total bids, Anomalies flagged, Debarments, Para 3A categories tracked. |
| SCR-N-03 | Stacked bar chart | 'Procurement Value by Classification, per Ministry'. X = ministry, Y = Rs in lakhs ('Rs{n}L'), stacked Class-I, Class-II, Non-Local, Manual in that order, custom tooltip with Rs formatting, circle legend. |
| SCR-N-04 | Vendor Concentration chart | Horizontal bars, top 5 vendors by cumulative bid value, opacity fading 12% per rank. |
| SCR-N-05 | Para 3A Impact table | Columns HSN, Ministry, Total Bids, Class-I Share (progress bar + percentage). |

## 9.10 Public Verification  (/verify)  gate: none

[TABLE 42]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| SCR-Z-01 | Header | 'Public Verification' with the statement that no commercial value is ever exposed. |
| SCR-Z-02 | Input + button | Placeholder 'tx_… or a SHA-256 hash'; Enter key submits; button 'Verify' disabled when empty. |
| SCR-Z-03 | Result card | Green header 'Record found' or red 'Not found'. When found: Type, Block height (#), Block hash (mono, full), Recorded (formatted date). |
| SCR-Z-04 | Integrity line | 'Chain integrity' + badge 'Valid, no tampering detected' or 'Tampered'. |
| SCR-Z-05 | Error card | Red card with the API error message. |

# 10. Seed data and demonstration scenarios

## 10.1 Master data
Vendors (7).

[TABLE 43]
| vendorId | Legal name | Type | MSE | Extra |
|---|---|---|---|---|
| bharat-precision-electronics | Bharat Precision Electronics | OEM | yes | UDYAM-TN-03-0001234 |
| deccan-systems | Deccan Systems Pvt Ltd | OEM | no |  |
| krishna-integrated-devices | Krishna Integrated Devices Ltd | OEM | no |  |
| godavari-components | Godavari Components | RESELLER | yes | oemReference krishna-integrated-devices |
| indus-global-traders | Indus Global Traders | OEM | no |  |
| sabarmati-systems | Sabarmati Systems | OEM | no |  |
| chambal-devices | Chambal Devices | OEM | no |  |
Tenders (5).

[TABLE 44]
| tenderId | Title | HSN | Value (Rs) | Type | Divisibility | Qty | MSE pref | Category |
|---|---|---|---|---|---|---|---|---|
| T-001 | Desktop computers, 1000 units | 8471 | 85,00,000 | DOMESTIC | DIVISIBLE | 1000 | on | GOODS |
| T-002 | Telecom equipment supply | 8517 | 15,00,00,000 | DOMESTIC | DIVISIBLE | 200 | off | SI_EPC_TURNKEY_SERVICE |
| T-003 | High-performance servers | 8471 | 60,00,00,000 | GLOBAL_TENDER_ENQUIRY | DIVISIBLE | 500 | off | GOODS |
| T-004 | Software licenses | 8523 | 2,00,00,000 | DOMESTIC | NON_DIVISIBLE | 500 | off | GOODS |
| T-005 | Cement supply for works | 2523 | 40,00,00,000 | DOMESTIC | NON_DIVISIBLE | 10000 | off | GOODS |

## 10.2 Seed sequence (deterministic, 26 finalized blocks)

[TABLE 45]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| SEED-01 | Rules | Seven RULE_UPDATED records from the rule set in 5.1 (blocks 0-6). |
| SEED-02 | Deccan on T-003 | COMPONENT_LEVEL 100/70/85/100/20, Class-I, Rs 95,000 x 100, OEM, Chennai, 'Rack Server Chassis Assembly'. Expected YELLOW (first-time on 8471). |
| SEED-03 | Godavari on T-001 | 60/55/70/100/0, Class-I, Rs 27,000 x 150, MSE reseller of Krishna, Vijayawada, 'Desktop PC Model Q (Krishna OEM)'. YELLOW. |
| SEED-04 | Sabarmati on T-003 (baseline) | 100/90/90/100/20, Class-I, Rs 112,000 x 80, Ahmedabad, 'Server Motherboard Assembly'. About 86%. |
| SEED-05 | Sabarmati on T-001 (anomaly) | 30 on every component, Class-II, Rs 41,000 x 80, same product and location. YELLOW with SAME_PRODUCT_DIFFERENT_PERCENT. |
| SEED-06 | Deccan on T-001 (GREEN control) | 100/90/95/100/50, Class-I, Rs 48,000 x 200, Chennai, 'Desktop PC Model D'. GREEN. |
| SEED-07 | Indus on T-002 (RED control) | declared 15%, claims Class-I, Rs 780,000 x 40, Manesar, 'Telecom Base Station Unit'. RED. |
| SEED-08 | Three T-002 bids + CA certs | Deccan 70% Rs 850,000; Krishna 65% Rs 820,000; Bharat 62% Rs 870,000 (MSE); each qty 60, Noida, then a CA_CERTIFICATION by Sharma & Associates at the same percentage (no mismatch). |
| SEED-09 | Chambal debarment | Ministry of Defence, 'False declaration of local content', 2025-04-01 to 2027-03-31, linked MOD-2025-TENDER-0042, penalty Rs 500,000. Emits webhook; no CA certs to flag. |
| SEED-10 | Krishna debarment | DoT, same reason, 2026-01-15 to 2028-01-14, linked T-002, penalty Rs 300,000. Triggers AUDITOR_FLAGGED for Sharma & Associates (2 other certs). |
| SEED-11 | Rule 8517 v2 | DoT raises Class-I 60 to 65, effective 2026-07-01, admin 'dot-admin-demo'. |
| SEED-12 | Logic upgrade | classification-engine v1 to v2, approvers cerulea-platform-admin + dpiit-domain-expert, payload nearThresholdBandPoints 2 to 3. |
| SEED-13 | Expected baseline | 9 bids (1 GREEN, 7 YELLOW, 1 RED), 3 certifications, 2 debarments, 1 anomaly, 26 blocks, integrity valid, CA risk score 33%. |

## 10.3 Acceptance scenarios (Build Spec §13)

[TABLE 46]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| SCN-01 | Classification GREEN / YELLOW / RED | T-001 Deccan 100/70/85/100/20 gives GREEN Class-I 82%. Declaring 48% against a 50% threshold while claiming Class-I gives RED. Declaring 51% gives YELLOW (near threshold). |
| SCN-02 | Eligibility | Indus claiming Non-Local on T-001 (domestic) is RED and blocked; the same on T-003 (GTE) is allowed. |
| SCN-03 | Divisible preference, 20% band | T-001: Deccan Class-II @500, Bharat Class-I @550, Krishna Class-I @620, all non-MSE. Result 50% Deccan @500, 50% Bharat matched @500; Krishna outside the 600 band. |
| SCN-04 | MSE + MII combined | T-001: L1 non-MSE Class-I @500, MSE Class-I @560. Result 75% to L1, 25% to the MSE bidder at 500. |
| SCN-05 | Non-divisible preference | T-005: Deccan Class-II @400, Bharat Class-I @440 (within 480). Bharat takes all 10,000 units at 400 (NON_DIVISIBLE_L1_NOT_CLASS_I_MATCHED). |
| SCN-06 | Para 3A mandatory sourcing | T-002 non-Class-I bid is RED at submission and excluded at pre-filter. |
| SCN-07 | Certificate at execution | T-002 (Rs 15 cr) shows 'mandatory at execution'; submitting anchors the cert and checks mismatch. |
| SCN-08 | Cross-tender anomaly (pre-seeded) | Sabarmati flagged SAME_PRODUCT_DIFFERENT_PERCENT (about 86% vs 30%) in T-001 evaluation and in its vendor view. |
| SCN-09 | Cross-ministry debarment | Any bid by Chambal Devices is RED citing Ministry of Defence, on any tender. |
| SCN-10 | Auditor accountability | Sharma & Associates risk 0% before, 33% after debarring Krishna for false declaration; Krishna's cert row shows Flagged; AUDITOR_FLAGGED visible in the explorer. |
| SCN-11 | CUSTOM method | T-004 (8523) shows MeitY's rule text, records the percentage, returns YELLOW 'manual Tender Committee validation required'. |
| SCN-12 | Rule update and Smart Evolution | Raising 8517 to 65 returns oldConfig v1 and newConfig v2 with admin and timestamp; Ministry Admin shows v2; explorer shows RULE_UPDATED and the seeded LOGIC_UPGRADED. |

## 10.4 Cross-cutting checks

[TABLE 47]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| CHK-01 | Public verification | Any txRef from a response resolves on /verify with block height, hash and integrity, and no price or percentage. |
| CHK-02 | Chain integrity | 'Run Integrity Check' re-hashes every block and reports valid. |
| CHK-03 | Read-model rebuild | Recomputing analytics twice yields identical JSON. |
| CHK-04 | Private collection isolation | Switching between two vendor identities on /vendor shows disjoint declaration lists. |

# 11. Operational scripts and deployment

[TABLE 48]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| OPS-01 | reset-chain | Delete data/chain.db, chain.db-wal, chain.db-shm if present; print a hint to reseed. |
| OPS-02 | seed | Run the seed sequence (10.2) with per-step logging, then print the integrity result and total block count. |
| OPS-03 | rebuild-readmodel | Compute analytics twice, assert equality (exit 1 on mismatch), print totals and integrity. |
| OPS-04 | Auto-seed on start | Server instrumentation hook: on the Node runtime, if no RULE_UPDATED exists, run the seed. Makes a cold /tmp ledger on Vercel self-populate. |
| OPS-05 | Idempotent ensureSeeded | Seeds only when the Rule Registry is empty; returns whether it did. |
| OPS-06 | Hosting | Live at https://cbc-pramaan.cerulea.io (also cbc-pramaan.vercel.app), auto-deployed from main of github.com/CAERULEAN-BYTECHAINS-PRIVATE-LIMITED/CBC-PRAMAAN. |
| OPS-07 | Stack (reference) | Next.js 16 App Router, React 19, TypeScript, Tailwind 4, Recharts 3, better-sqlite3, zod, Radix primitives, lucide icons, date-fns. |
| OPS-08 | Measured latency (dev server) | Bid submission about 120-139 ms; preference about 136-175 ms; finality synchronous. |

# 12. Explicit PoC simplifications to replace in production

[TABLE 49]
| ID | Atomic item | Specification / acceptance |
|---|---|---|
| SIM-01 | Validators in-process | Three DCF validators run in one process; production uses separate Cerulea nodes. |
| SIM-02 | Deterministic signatures | Validator 'signature' is a salted sha256, not a digital signature scheme. |
| SIM-03 | Identity via query string | role/id query parameters stand in for GeM's identity and DSC infrastructure. |
| SIM-04 | Price-match auto-accept | Every offered candidate accepts; production needs a vendor negotiation channel. |
| SIM-05 | Webhook as chain event | Debarment fan-out is recorded on-chain instead of calling external procuring-entity endpoints. |
| SIM-06 | Evaluation cache invalidation | A rule update clears all evaluation cache entries, not only the affected HSN. |
| SIM-07 | WEIGHTED_MODULE | Falls through to STANDARD; no module weights are modelled. |
| SIM-08 | Divisible MSE cascades | The two divisible MSE+Non-Class-I and Non-MSE+Non-Class-I branches extend the documented non-divisible pattern; trace steps say 'extended pattern'. |
| SIM-09 | Master data static | Vendors and tenders are hardcoded; production references GeM records by id. |
| SIM-10 | Storage | SQLite file, ephemeral on Vercel, reseeded on cold start. |