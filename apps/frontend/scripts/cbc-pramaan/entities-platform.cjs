const { E, ACCESS, F, ID, REF, CHAIN, ENT } = require('./_shared.cjs');

/**
 * CBC-PRAMAAN seed - platform entities.
 *
 * Everything in this file is the *platform* half of the blueprint: the constants,
 * identities, access rules, design tokens, rule-registry seed rows, engine lookup
 * tables, API surface, screens, seed / scenario harness, ops scripts and the
 * documented PoC simplifications.
 *
 * The domain half (Vendor, Tender, RuleConfig, BidRecord, PreferenceOutcome,
 * ChainTransaction, FinalizedBlock, DebarmentRecord, CACertificationRecord,
 * LogicVersion, IntegrityCheckResult, VerificationLookup, Analytics) lives in the
 * sibling core file and is only referenced by name from RELS below.
 *
 * Transcribed from SPEC.md v1.0 (16 September 2026):
 *   section 1  ENUM-14 constants
 *   section 2  ROLE-01 .. ROLE-18
 *   section 5.1 TABLE 13 seeded rule set
 *   section 6.5 ENG-32 .. ENG-41 status precedence and reason texts
 *   section 6.6 ENG-42 .. ENG-56 decision paths (ENUM-12 / ENUM-13)
 *   section 7  API-01 .. API-25, APX-01 .. APX-04
 *   section 8  SHL-01 .. SHL-09, UI primitives, TABLE 26 design tokens
 *   section 9  every SCR-* row across the ten routes
 *   section 10 TABLE 43 .. TABLE 47 seed data, scenarios and checks
 *   section 11 OPS-01 .. OPS-08
 *   section 12 SIM-01 .. SIM-10
 *
 * Style note: the spec prints some reason texts with an em dash; they are
 * transcribed here with a hyphen so the file stays em-dash free.
 */

// ---------------------------------------------------------------------------
// Long literal texts lifted verbatim from the spec (kept here so the field
// definitions below stay readable).
// ---------------------------------------------------------------------------

const CUSTOM_RULE_TEXT_8523 =
  'For software products, local content shall be assessed based on the proportion of Indian ' +
  'development team person-hours to total person-hours, verified through project management ' +
  'records and HR documentation. No automated formula exists; the Tender Committee must ' +
  'manually validate against this rule text.';

const FLOOR_NOTICE_TEXT =
  'The smart contract rejects any Class-I threshold below 50% or Class-II threshold below 20%. ' +
  'A nodal ministry can only raise thresholds, never lower them.';

const FLOOR_REJECTION_TEXT =
  'Rejected: Class-I threshold must be >= 50 and Class-II threshold must be >= 20 and less than ' +
  'Class-I threshold. Nodal ministries can only raise thresholds, never lower them.';

const FOOTER_TEXT =
  'SHL-07 footer, two lines: "CBC-PRAMAAN Proof of Concept: non-crypto, permissioned Cerulea ' +
  'private chain. Demonstration data only." and "(c) Caerulean Bytechains Private Limited ' +
  '- Blockchain for Good". SHL-02 sidebar footer chip: "Non-crypto - permissioned - ' +
  'demonstration data only."';

const REASON_TEMPLATES =
  'ENG-33 DEBARRED: "Vendor is on the cross-ministry debarment registry (debarred by {authority}, ' +
  'reason: {reason}). Bid is blocked." | ' +
  'ENG-34 BELOW_THRESHOLD_FOR_CLAIM: "Vendor claimed {claimed} but computed classification is ' +
  '{computed} - declared percentage is below the applicable threshold for the claimed class." | ' +
  'ENG-35 NON_LOCAL_ON_DOMESTIC: "Vendor is a Non-Local supplier bidding on a domestic tender - ' +
  'not permitted (only Global Tender Enquiries allow Non-Local bidders)." | ' +
  'ENG-36 PARA_3A: "HSN {hsn} is a Para 3A mandatory-sourcing item for this SI/EPC/Turnkey/Service ' +
  'tender, and the vendor is not Class-I." | ' +
  'ENG-37 MANUAL_CUSTOM: "CUSTOM calculation method - manual Tender Committee validation required." | ' +
  'ENG-38 NEAR_THRESHOLD (component variant): "Component(s) failed their individual threshold ' +
  'despite the weighted average passing: {names} - flagged for closer examination."; otherwise ' +
  '"Declared percentage is close to the classification threshold boundary - flagged for closer ' +
  'examination." | ' +
  'ENG-39 FIRST_DECLARATION: "First-time declaration by this vendor for HSN {hsn} - no historical ' +
  'baseline exists for comparison." | ' +
  'ENG-40 GREEN: "Declaration meets the applicable threshold; no anomalies; not debarred." | ' +
  'ENG-32 ANOMALIES has no fixed sentence: the AnomalyFlag descriptions produced by ENG-12 .. ENG-15 ' +
  'are used as the reason lines.';

const DESIGN_TOKEN_VALUES =
  'surface group: page #F4F6F9, surface #FFFFFF, surface-sunken #EEF1F5, overlay rgba(18,32,58,0.5). ' +
  'ink group: ink-primary #11274A, ink-secondary #475A7D, ink-muted #8695AC. ' +
  'border group: border #E2E8F0, border-strong #CBD5E1. ' +
  'brand group: brand #004AAD, brand-hover #003C8F, brand-active #002D6B, brand-tint #EAF1FC, ' +
  'brand-tint-strong #D3E3F9, brand-navy #12305C, brand-gold #EEC000, brand-green #30B700. ' +
  'semantic group: good #0CA30C / good-tint #E7F7E7, warning #B8790A / warning-tint #FDF1DC, ' +
  'critical #D03B3B / critical-tint #FBE9E9. ' +
  'series group: series-1 #2A78D6, series-2 #1BAF7A, series-3 #C98500, series-4 #008300, ' +
  'series-5 #4A3AA7, series-6 #E34948, series-7 #E87BA4, series-8 #EB6834. ' +
  'chart group: chart-grid #E7E9EE, chart-axis #CBD1DB. ' +
  'radius group: radius-sm 6px, radius-md 10px, radius-lg 14px, radius-xl 20px. ' +
  'shadow group: shadow-xs, shadow-sm, shadow-md, shadow-lg (all navy-tinted). ' +
  'Fixed chart colour mapping, never cycled: Class-I -> series-1, Class-II -> series-2, ' +
  'Manual -> series-3, Non-Local -> series-6.';

const IDENTITY_PRESETS =
  'ROLE-03 vendors (7): bharat-precision-electronics, deccan-systems, krishna-integrated-devices, ' +
  'godavari-components (Reseller of Krishna), indus-global-traders, sabarmati-systems, ' +
  'chambal-devices. ROLE-04 procuring entity (1): procuring-entity-1 "Procuring Entity: Tender ' +
  'Committee". ROLE-05 ministry admins (3): MeitY, DoT, DPIIT - the id is the ministry name and is ' +
  'matched against rule ACLs. ROLE-06 DPIIT admin (1): dpiit-national. ROLE-07 CVC / Audit (1): cvc. ' +
  'ROLE-08 CA (1): Sharma-and-Associates-FR-2201::ICAI-M-118824, where the CA key is ' +
  'firmRegistration + "::" + membershipNumber. Fourteen presets in total, plus the ROLE-16 ' +
  'fallback identity VENDOR "__anonymous__" which is never offered in the switcher.';

const STACK_TEXT =
  'OPS-07 reference stack: Next.js 16 App Router, React 19, TypeScript, Tailwind 4, Recharts 3, ' +
  'better-sqlite3, zod, Radix primitives, lucide icons, date-fns.';

// ---------------------------------------------------------------------------
// 1. Chain parameters and governance (section 1, ENUM-14)
// ---------------------------------------------------------------------------

const PlatformConstants = ENT(
  'chain-params-governance',
  'PlatformConstants',
  'ENUM-14: the fourteen network-wide constants every engine, screen and API reads. One singleton ' +
    'row. Changing any of these changes classification, preference or debarment behaviour, so they ' +
    'are governed at the chain-parameter layer rather than being inlined in code.',
  [
    ID(),
    F('dpiitClassIFloorPercent', 'int', {
      req: 1, label: 'DPIIT Class-I floor', unit: '%', def: 50,
      desc: 'RUL-02 / RUL-03: a non-CUSTOM rule update is rejected when classI < 50',
    }),
    F('dpiitClassIIFloorPercent', 'int', {
      req: 1, label: 'DPIIT Class-II floor', unit: '%', def: 20,
      desc: 'RUL-02: classII >= 20 AND classII < classI, skipped entirely when method is CUSTOM',
    }),
    F('nearThresholdBandPoints', 'int', {
      req: 1, label: 'Near-threshold band', unit: 'points', def: 2,
      desc: 'ENG-09: nearThreshold when abs(effective - classI) <= 2 or abs(effective - classII) <= 2. Raised to 3 by the SEED-12 logic upgrade payload',
    }),
    F('caCertificateMandatoryAboveRupees', 'float', {
      req: 1, label: 'CA certificate mandatory above', unit: 'INR', def: 100000000,
      desc: 'ENG-21: isCACertificationRequired(tender) = estimatedValueRupees > 100,000,000 (Rs 10 crore)',
    }),
    F('caMismatchTolerancePoints', 'int', {
      req: 1, label: 'CA mismatch tolerance', unit: 'points', def: 5,
      desc: 'ENG-22: delta = abs(certified - effectivePercent or 0); mismatch = delta >= 5',
    }),
    F('sameProductDeltaThresholdPoints', 'int', {
      req: 1, label: 'Same-product delta threshold', unit: 'points', def: 10,
      desc: 'ENG-12: SAME_PRODUCT_DIFFERENT_PERCENT flagged when abs(new - prior) >= 10',
    }),
    F('volumeMismatchThresholdUnits', 'int', {
      req: 1, label: 'Volume mismatch threshold', unit: 'units', def: 10000,
      desc: 'ENG-15: cumulative quantity (all prior + new) >= 10,000 against a small-facility location',
    }),
    F('smallFacilityKeywords', 'json', {
      req: 1, label: 'Small-facility keywords', def: '["small workshop","small unit","small facility"]',
      desc: 'ENG-15: a prior manufacturingLocation containing any of these keywords arms the volume check',
    }),
    F('miiBandMultiplier', 'float', {
      req: 1, label: 'MII band multiplier', def: 1.20,
      desc: 'ENG-46 / ENG-48: Class-I purchase-preference band, bandLimit = round(l1Price * 1.20, 2)',
    }),
    F('mseBandMultiplier', 'float', {
      req: 1, label: 'MSE band multiplier', def: 1.15,
      desc: 'ENG-54 / ENG-56: MSE purchase-preference band, bandLimit = round(l1Price * 1.15, 2)',
    }),
    F('debarmentMaximumYears', 'int', {
      req: 1, label: 'Debarment maximum', unit: 'years', def: 2,
      desc: 'ENG-16: throws "Debarment end date exceeds the maximum 2-year limit under GFR Rule 151(iii)"',
    }),
    F('evaluationCacheTtlSeconds', 'int', {
      req: 1, label: 'Evaluation cache TTL', unit: 'seconds', def: 300,
      desc: 'API-02 / APX-04: 5 minutes, keyed per tender + role + id, invalidated by prefix "evaluation:" on any rule update (RUL-10)',
    }),
    F('smartEvolutionMinimumApprovers', 'int', {
      req: 1, label: 'Smart Evolution minimum approvers', unit: 'approvers', def: 2,
      desc: 'CHN-26 / API-25: upgradeLogic rejects fewer than 2 approvers with "requires multi-signature approval"',
    }),
    F('dcfQuorum', 'string', {
      req: 1, label: 'DCF quorum', def: '2 of 3',
      desc: 'CHN-14: finalised at signatures >= ceil(3 * 2 / 3) = 2 of the 3 validators; quorum string stored as "n/3"',
    }),
  ],
  { access: ACCESS.ADM }
);

// ---------------------------------------------------------------------------
// 2. Roles and identities (section 2, ROLE-01 .. ROLE-18)
// ---------------------------------------------------------------------------

const Identity = ENT(
  'govt-identity',
  'Identity',
  'ROLE-01 .. ROLE-08: the preset identity list. There is no login - the UI carries the selected ' +
    'identity on every request as ?role= and ?id= query parameters and the server enforces ' +
    'visibility (CHN-22). Fourteen presets across the six roles, plus the __anonymous__ fallback. ' +
    IDENTITY_PRESETS,
  [
    ID(),
    F('role', 'enum', {
      req: 1, idx: 1, label: 'Role', options: E.Role,
      desc: 'ENUM-01 / ROLE-01: exactly six roles. Screens are gated to one role each (ROLE-17)',
    }),
    F('identityId', 'enum', {
      req: 1, uniq: 1, idx: 1, label: 'Identity id', options: E.IdentityId,
      desc: 'ROLE-01: the id half of {role, id, label}. Ministry ids are the ministry name itself (ROLE-05); the CA id is firmRegistration + "::" + membershipNumber (ROLE-08)',
    }),
    F('label', 'string', {
      req: 1, label: 'Label',
      desc: 'ROLE-01: the human label shown in the identity switcher, grouped by role label with a role colour dot (SHL-06)',
    }),
    F('isDefault', 'boolean', {
      label: 'Default identity',
      desc: 'ROLE-02 default = procuring-entity-1',
    }),
    F('storageKey', 'string', {
      label: 'Local storage key', def: 'cbc-pramaan-identity',
      desc: 'persisted client-side, re-resolved against presets on load',
    }),
    F('notes', 'text', {
      label: 'Notes',
      desc: 'ROLE-17: a screen scoped to role X, viewed as any other role, renders a "sign in as" card listing that role preset identities; clicking one switches identity in place',
    }),
  ],
  { access: ACCESS.PUB }
);

const AccessRule = ENT(
  'tx-access-policy',
  'AccessRule',
  'ROLE-09 .. ROLE-16: the eight private-collection rules that canAccess(tx, identity) implements ' +
    'exactly (CHN-22). Every chain transaction carries acl {vendorIds?, ministries?, tenderIds?, ' +
    'caIds?, public?} (ENT-25) and reads are filtered through these rules ' +
    '(CHN-23, API-07, API-11). The chain explorer (API-21) is deliberately not ACL-filtered.',
  [
    ID(),
    F('ruleId', 'string', {
      req: 1, uniq: 1, idx: 1, label: 'Rule id',
      desc: 'ROLE-09 public, ROLE-10 AUDIT, ROLE-11 DPIIT_ADMIN, ROLE-12 VENDOR, ROLE-13 CA, ROLE-14 PROCURING_ENTITY, ROLE-15 MINISTRY_ADMIN, ROLE-16 anonymous fallback',
    }),
    F('role', 'enum', {
      label: 'Role', options: E.Role,
      desc: 'null = public rule',
    }),
    F('aclField', 'enum', {
      req: 1, label: 'ACL field matched',
      options: ['public', 'vendorIds', 'caIds', 'tenderIds', 'ministries', 'ALL'],
      desc: 'ALL = the role reads every transaction on the ledger (AUDIT and DPIIT_ADMIN)',
    }),
    F('condition', 'text', {
      req: 1, label: 'Condition',
      desc: 'ROLE-12 a reseller bid also lists the OEM id in acl.vendorIds; ROLE-14 any transaction with at least one tenderId in its ACL',
    }),
    F('fallback', 'boolean', {
      label: 'Fallback rule',
      desc: 'ROLE-16 anonymous -> public only. Missing or invalid role/id resolves to VENDOR "__anonymous__" (APX-02)',
    }),
  ],
  { access: ACCESS.ADM }
);

// ---------------------------------------------------------------------------
// 3. Theme and branding (ROLE-18, TABLE 26)
// ---------------------------------------------------------------------------

const RoleColourToken = ENT(
  'theme-branding',
  'RoleColourToken',
  'ROLE-18: the six role colour tokens used by the identity switcher dot (SHL-06) and every role ' +
    'badge. VENDOR series-1, PROCURING_ENTITY series-2, MINISTRY_ADMIN series-5, DPIIT_ADMIN brand, ' +
    'AUDIT series-6, CA series-3. Six rows, one per ENUM-01 role.',
  [
    ID(),
    F('role', 'enum', { req: 1, uniq: 1, label: 'Role', options: E.Role }),
    F('token', 'enum', {
      req: 1, label: 'Colour token', options: E.RoleColourToken,
      desc: 'Resolves against the TABLE 26 series and brand tokens on DesignToken',
    }),
  ],
  { access: ACCESS.ADM }
);

const DesignToken = ENT(
  'theme-branding',
  'DesignToken',
  'TABLE 26 (section 8.3): the full design-token set, 38 rows across nine groups. ' + DESIGN_TOKEN_VALUES,
  [
    ID(),
    F('token', 'string', {
      req: 1, uniq: 1, idx: 1, label: 'Token',
      desc: 'CSS custom-property name, for example page, ink-primary, brand-tint-strong, series-6, chart-axis, radius-lg, shadow-md',
    }),
    F('group', 'enum', {
      req: 1, idx: 1, label: 'Group', options: E.DesignTokenGroup,
      desc: 'Nine groups: surface, ink, border, brand, semantic, series, chart, radius, shadow',
    }),
    F('value', 'string', {
      req: 1, label: 'Value',
      desc: 'Hex, rgba, pixel radius or shadow recipe. Full table: ' + DESIGN_TOKEN_VALUES,
    }),
    F('notes', 'text', {
      label: 'Notes',
      desc: 'SHL-04 tricolour accent bar: 3px gradient gold 0-20%, brand 35-65%, green 80-100%. SCR-N-03 stacked bars and SCR-C-03 tone rules read the fixed chart mapping, never a cycled palette',
    }),
  ],
  { access: ACCESS.ADM }
);

// ---------------------------------------------------------------------------
// 4. Rule Registry seed set (section 5.1, TABLE 13)
// ---------------------------------------------------------------------------

const RuleRegistrySeedRow = ENT(
  'govt-records-registry',
  'RuleRegistrySeedRow',
  'TABLE 13 (section 5.1): the seven seeded rule rows written as RULE_UPDATED transactions by ' +
    'SEED-01 into blocks 0-6. The wildcard "*" row is the DPIIT default that any HSN without its ' +
    'own rule resolves to (RUL-01); requesting "*" unseeded throws "DPIIT default rule has not ' +
    'been seeded". Rows: * DPIIT 50/20 STANDARD; 8471 MeitY 50/20 COMPONENT_LEVEL; 8443 MeitY ' +
    '50/20 STANDARD; 8517 DoT 60 then 65 /20 STANDARD para3A; 2523 DPIIT 50/20 STANDARD para3A; ' +
    '8523 MeitY 50/20 CUSTOM; 8544 DPIIT 50/20 STANDARD PLI-linked. Seven rows, eight versions ' +
    'once SEED-11 raises 8517.',
  [
    ID(),
    F('hsnCode', 'enum', {
      req: 1, uniq: 1, idx: 1, label: 'HSN code', options: E.HsnCode,
      desc: 'RUL-01: "*" is the DPIIT default row',
    }),
    F('label', 'enum', { req: 1, label: 'Label', options: E.HsnLabel }),
    F('ministry', 'enum', {
      req: 1, idx: 1, label: 'Nodal ministry', options: E.Ministry,
      desc: 'RUL-05: the RULE_UPDATED ACL is public = true with ministries = [ministry] (ROLE-15)',
    }),
    F('classIThreshold', 'int', {
      req: 1, label: 'Class-I threshold', unit: '%',
      desc: 'RUL-02 floor check: classI >= 50, skipped entirely when method is CUSTOM',
    }),
    F('classIIThreshold', 'int', {
      req: 1, label: 'Class-II threshold', unit: '%',
      desc: 'RUL-02 floor check: classII >= 20 AND classII < classI',
    }),
    F('method', 'enum', {
      req: 1, label: 'Calculation method', options: E.CalculationMethod,
      desc: 'ENUM-04: WEIGHTED_MODULE falls through to the STANDARD path in the PoC (SIM-07)',
    }),
    F('para3A', 'boolean', {
      label: 'Para 3A mandatory sourcing',
      desc: 'ENG-31: violated when the tender is SI_EPC_TURNKEY_SERVICE and the computed class is not Class-I or MANUAL_REQUIRED. True for 8517 and 2523',
    }),
    F('pliLinked', 'boolean', {
      label: 'PLI-linked',
      desc: 'ENG-01: a PLI manufacturer on a PLI-linked rule is deemed CLASS_II before any other branch. True for 8544',
    }),
    F('effectiveDate', 'date', {
      req: 1, label: 'Effective date',
      desc: '* 2017-06-15, 8471 2021-02-01, 8443 2021-02-01, 8517 2020-08-01 then 2026-07-01, 2523 2019-05-01, 8523 2022-01-01, 8544 2021-11-01',
    }),
    F('version', 'int', {
      req: 1, label: 'Version', def: 1,
      desc: 'RUL-04: newVersion = latest existing version for that HSN + 1, else 1; newConfig.supersedes = old version',
    }),
    F('notes', 'text', {
      label: 'Notes',
      desc: '8517 v1 60 then v2 65 effective 2026-07-01 (SEED-11, admin dot-admin-demo). 8523 carries the CUSTOM rule text: ' + CUSTOM_RULE_TEXT_8523 +
        ' A rejected non-CUSTOM update returns HTTP 400 with: ' + FLOOR_REJECTION_TEXT,
    }),
  ],
  { access: ACCESS.ADM }
);

const Hsn8471Component = ENT(
  'govt-records-registry',
  'Hsn8471Component',
  'Section 5.1 component definitions for HSN 8471 (Computers / IT hardware, COMPONENT_LEVEL ' +
    'method). Five rows whose weights sum to 100: PCB/Motherboard 40% must be local; Power Supply ' +
    '15% threshold 50%; Enclosure/Chassis 10% threshold 80%; Assembly & Testing 20% must be local; ' +
    'Software/OS 15% no gate. Consumed by ENG-03 .. ENG-06 and rendered by SCR-S1-12.',
  [
    ID(),
    F('name', 'enum', { req: 1, uniq: 1, label: 'Component', options: E.ComponentName }),
    F('weightPercent', 'int', {
      req: 1, label: 'Weight', unit: '%',
      desc: 'ENG-05: effectivePercent = round(sum(declared * weight) / 100). 40 + 15 + 10 + 20 + 15 = 100',
    }),
    F('gate', 'enum', {
      req: 1, label: 'Gate', options: E.ComponentGate,
      desc: 'ENG-04 / ENT-03: MUST_BE_LOCAL passes only at declared >= 100 (null threshold + mustBeLocal); THRESHOLD passes at declared >= thresholdPercent; NO_GATE always passes. A missing declaration counts as 0',
    }),
    F('thresholdPercent', 'int', {
      label: 'Threshold', unit: '%',
      desc: 'Null for MUST_BE_LOCAL and NO_GATE rows. Power Supply 50, Enclosure/Chassis 80',
    }),
  ],
  { access: ACCESS.ADM }
);

// ---------------------------------------------------------------------------
// 5. Engine lookup tables (section 6.5 and 6.6)
// ---------------------------------------------------------------------------

const StatusReasonTemplate = ENT(
  'smart-legal-contract',
  'StatusReasonTemplate',
  'ENG-32 .. ENG-40: the nine status-reason rows of the Bid Submission orchestrator. ENG-32 fixes ' +
    'the precedence and the first match wins: 1 RED debarred, 2 RED below-threshold-for-claim, ' +
    '3 RED non-local-on-domestic, 4 RED Para 3A, 5 YELLOW manual (CUSTOM), 6 YELLOW anomalies, ' +
    '7 YELLOW nearThreshold, 8 YELLOW first declaration for this HSN, 9 GREEN. Nine rows, one per ' +
    'ENUM StatusReasonKey.',
  [
    ID(),
    F('key', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Reason key', options: E.StatusReasonKey }),
    F('status', 'enum', {
      req: 1, label: 'Resulting status', options: E.ComplianceStatus,
      desc: 'ENUM-03: aggregated per bid, exactly one value',
    }),
    F('precedence', 'int', {
      req: 1, label: 'Precedence',
      desc: 'first match wins: 1 debarred, 2 below-threshold-for-claim, 3 non-local-on-domestic, 4 Para 3A, 5 manual CUSTOM, 6 anomalies, 7 nearThreshold, 8 first declaration, 9 GREEN',
    }),
    F('template', 'text', {
      req: 1, label: 'Reason template',
      desc: 'The exact spec sentence with {placeholders}. ' + REASON_TEMPLATES,
    }),
    F('condition', 'text', {
      req: 1, label: 'Condition',
      desc: 'ENG-29 belowThresholdForClaim = computed != MANUAL AND ((claimed CLASS_I AND computed != CLASS_I) OR (claimed CLASS_II AND computed == NON_LOCAL)); ENG-30 nonLocalOnDomestic = computed == NON_LOCAL AND tenderType == DOMESTIC; ENG-31 para3AViolation = rule.para3A AND category == SI_EPC_TURNKEY_SERVICE AND computed not in {CLASS_I, MANUAL_REQUIRED}',
    }),
  ],
  { access: ACCESS.ADM }
);

const DecisionPathDef = ENT(
  'smart-legal-contract',
  'DecisionPathDef',
  'ENG-42 .. ENG-56 with ENUM-12 and ENUM-13: the twenty closed decision paths of the Purchase ' +
    'Preference Decision Engine - nine with no MSE preference (ENUM-12) and eleven with MSE ' +
    'preference active (ENUM-13). Each row fixes the L1 profile, the divisibility, the cascade ' +
    'multiplier and the award rule, so the engine is a lookup rather than a branch tree. ' +
    'ENG-48 offerCascade: bandLimit = round(l1Price * multiplier, 2), candidates within band are ' +
    'offered in ascending price order and the first acceptance wins (SIM-04: the PoC always ' +
    'accepts); out-of-band candidates are recorded with offered = false. Twenty rows.',
  [
    ID(),
    F('path', 'enum', {
      req: 1, uniq: 1, idx: 1, label: 'Decision path', options: E.DecisionPath,
      desc: 'ENUM-12 nine MII paths plus ENUM-13 eleven MSE paths, including the ENG-44 terminal path NO_ELIGIBLE_BIDDERS which writes nothing to the chain',
    }),
    F('msePreferenceActive', 'boolean', {
      req: 1, label: 'MSE preference active',
      desc: 'ENT-02 tender.msePreferenceActive. False selects the ENUM-12 matrix, true the ENUM-13 matrix',
    }),
    F('l1IsMSE', 'boolean', {
      label: 'L1 is MSE',
      desc: 'ENG-47: the trace records the combined status "{MSE|Non-MSE} + {Class-I|Non-Class-I}". Null on the MII paths and on NO_ELIGIBLE_BIDDERS',
    }),
    F('l1IsClassI', 'boolean', {
      label: 'L1 is Class-I',
      desc: 'Null where the path does not depend on it (NO_ELIGIBLE_BIDDERS, no-candidate paths)',
    }),
    F('divisibility', 'string', {
      label: 'Divisibility',
      desc: 'ENUM-05 DIVISIBLE or NON_DIVISIBLE, null where the path applies to both',
    }),
    F('cascadeMultiplier', 'enum', {
      label: 'Cascade multiplier', options: E.CascadeMultiplier,
      desc: 'ENG-48: 1.20 for the MII / Class-I band (ENG-51, ENG-52, ENG-55), 1.15 for the MSE band (ENG-54, ENG-56). Null where no cascade runs',
    }),
    F('awardRule', 'text', {
      req: 1, label: 'Award rule',
      desc: 'ENG-49 and ENG-50 full quantity to L1 at L1 price. ENG-51 divisible MII: round(qty/2) to L1, remainder to the cascade winner, both at L1 price; no winner gives full to L1. ENG-52 non-divisible MII: the winner takes the entire quantity at L1 price. ENG-53 MSE + Class-I L1: full award to L1. ENG-54 Non-MSE + Class-I L1: round(qty * 0.75) to L1 and the remainder to an MSE cascade winner at 1.15, at L1 price. ENG-55 MSE + Non-Class-I L1: tier 1 MSE+Class-I at 1.20 then tier 2 Non-MSE+Class-I at 1.20, divisible 50/50 or non-divisible winner-takes-all. ENG-56 Non-MSE + Non-Class-I L1: tier 1 MSE at 1.15 then tier 2 Class-I at 1.20, divisible 50/50 or non-divisible full. Every no-winner branch awards the full quantity to L1',
    }),
    F('traceLabel', 'text', {
      label: 'Trace label',
      desc: "'extended pattern' for the divisible MSE cases (SIM-08): the divisible MSE+Non-Class-I and Non-MSE+Non-Class-I branches extend the documented non-divisible pattern and their ENG-48 trace steps say so. Trace steps overall follow ENG-42 .. ENG-48: Pre-filter, Consistency flags, Rank by price, Class-I candidates, Classify L1, Offer cascade, Award",
    }),
  ],
  { access: ACCESS.ADM }
);

// ---------------------------------------------------------------------------
// 6. API surface (section 7)
// ---------------------------------------------------------------------------

const ApiEndpoint = ENT(
  'api-gateway',
  'ApiEndpoint',
  'API-01 .. API-25: the complete route table, twenty-five endpoints in three groups - six GeM ' +
    'trigger points (API-01 .. API-06), thirteen read endpoints (API-07 .. API-19) and six chain ' +
    'explorer endpoints (API-20 .. API-25). All routes live under /api/v1, identity is read from ' +
    '?role= and ?id=, and any thrown Error becomes HTTP 400 {error: message} (APX-01).',
  [
    ID(),
    F('apiId', 'string', {
      req: 1, uniq: 1, idx: 1, label: 'API id',
      desc: 'API-01 .. API-25 as printed in TABLE 21, TABLE 22 and TABLE 23',
    }),
    F('group', 'enum', {
      req: 1, idx: 1, label: 'Group', options: E.ApiGroup,
      desc: 'GEM_TRIGGER (6), READ (13), CHAIN_EXPLORER (6)',
    }),
    F('method', 'enum', { req: 1, label: 'Method', options: E.HttpMethod }),
    F('path', 'string', {
      req: 1, idx: 1, label: 'Path',
      desc: 'under /api/v1',
    }),
    F('trigger', 'enum', {
      label: 'GeM trigger point', options: E.TriggerPoint,
      desc: 'Set only on API-01 .. API-06: 1 Bid Submission, 2 Bid Evaluation, 3 Preference Calculation, 4 CA Certification, 5 Debarment, 6 Rule Update',
    }),
    F('params', 'text', {
      label: 'Params',
      desc: 'Query and path parameters, for example role, id, tenderId, vendorId, bidId, caKey, hsnCode, type, module, ref',
    }),
    F('body', 'text', {
      label: 'Body',
      desc: 'ENT-05 BidSubmissionInput, ENT-06 CACertificationInput, ENT-07 DebarmentInput, ENT-08 RuleUpdateInput, ENT-09 CommitteeActionInput, ENT-10 LogicUpgradeInput. Null on every GET',
    }),
    F('returns', 'text', {
      req: 1, label: 'Returns',
      desc: 'API-01 {status, computedClass, ruleVersion, reasons[], anomalies[], txRef, blockHeight, bid}; API-02 {tenderId, cachedAt, bids[], fromCache?}; API-19 serves docs/openapi.yaml as text/yaml',
    }),
    F('errorCases', 'text', {
      label: 'Error cases',
      desc: 'API-04 "Unknown bid" on a bad bidId; API-06 HTTP 400 below the DPIIT floor; API-23 "Provide a transaction reference or declaration hash via ?ref=" when ref is missing; API-25 400 when fewer than 2 approvers',
    }),
    F('aclFiltered', 'boolean', {
      label: 'ACL filtered',
      desc: 'True for the private-collection reads (API-07, API-11 and the evaluation endpoint). API-21 is deliberately not ACL-filtered because the explorer is the AUDIT role tool',
    }),
    F('cached', 'boolean', {
      label: 'Cached',
      desc: 'API-02 5 min per tender+role+id',
    }),
  ],
  { access: ACCESS.ADM }
);

const ApiBehaviour = ENT(
  'api-gateway',
  'ApiBehaviour',
  'APX-01 .. APX-04 (TABLE 24): the four cross-cutting API behaviours that every route inherits - ' +
    'the error envelope, identity parsing, the client helper and the in-memory TTL cache. Four rows.',
  [
    ID(),
    F('key', 'string', {
      req: 1, uniq: 1, idx: 1, label: 'Key',
      desc: 'APX-01 error envelope, APX-02 identity parsing, APX-03 client helper, APX-04 in-memory TTL cache',
    }),
    F('rule', 'text', {
      req: 1, label: 'Rule',
      desc: 'APX-01 any exception in a handler returns 400 with {error: string}. APX-02 role must be one of the six roles and id must be non-empty, otherwise VENDOR "__anonymous__". APX-03 apiGet / apiPost append role and id to the query string when an identity is supplied, fetch with cache: "no-store" and throw the error string on non-OK. APX-04 get / set (default 5 min) / invalidate by prefix / clear',
    }),
    F('appliesTo', 'text', {
      req: 1, label: 'Applies to',
      desc: 'APX-01 and APX-02 apply to all 25 routes; APX-03 to every client call; APX-04 only to the evaluation endpoint (API-02), cleared wholesale on a rule update (RUL-10, SIM-06)',
    }),
  ],
  { access: ACCESS.ADM }
);

// ---------------------------------------------------------------------------
// 7. Shell, primitives and screens (sections 8 and 9)
// ---------------------------------------------------------------------------

const AppScreen = ENT(
  'cms-pages',
  'AppScreen',
  'Section 9: the ten routes of the application - / (home, no gate), /simulator (no gate), ' +
    '/vendor (VENDOR), /procuring-entity (PROCURING_ENTITY), /ministry-admin (MINISTRY_ADMIN), ' +
    '/dpiit-admin (DPIIT_ADMIN), /audit (AUDIT), /ca (CA), /analytics (no gate) and /verify (no ' +
    'gate). Nine of them appear in the SHL-02 sidebar across three groups: Simulate (GeM ' +
    'Simulator), Dashboards (Vendor, Procuring Entity, Ministry Admin, DPIIT Admin) and Trust & ' +
    'Transparency (Audit Explorer, CA Portal, Analytics, Verify). Ten rows.',
  [
    ID(),
    F('route', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Route', options: E.ScreenRoute }),
    F('title', 'string', {
      req: 1, label: 'Title',
      desc: 'SCR-S-01 "GeM Simulator Console", SCR-V-01 "Vendor View ({vendorId})", SCR-P-01 "Procuring Entity Compliance Panel", SCR-M-01 "Nodal Ministry Admin ({ministry})", SCR-D-01 "DPIIT Admin: National View", SCR-A-01 "CVC / Audit Explorer", SCR-C-01 "CA / Auditor Portal", SCR-N-01 "Compliance Analytics Dashboard", SCR-Z-01 "Public Verification"',
    }),
    F('gate', 'enum', {
      req: 1, label: 'Role gate', options: E.ScreenGate,
      desc: 'ROLE-17: a screen scoped to role X, viewed as any other role, renders a "sign in as" card listing that role preset identities',
    }),
    F('sidebarGroup', 'enum', {
      label: 'Sidebar group', options: E.SidebarGroup,
      desc: 'SHL-02. Null for the home route, which is reached from the logo (SHL-05)',
    }),
    F('dataCalls', 'text', {
      label: 'Data calls',
      desc: 'SCR-V-02 GET /bids?vendorId={id} with identity plus GET /debarments filtered client-side; SCR-C-02 GET /auditors/{encoded caKey}; /analytics GET /analytics; /audit GET /chain/blocks, /chain/transactions and /chain/integrity; /verify GET /chain/verify?ref=',
    }),
    F('description', 'text', {
      label: 'Description',
      desc: 'The sub-header line, for example SCR-A-01 "Read-only access across the entire immutable ledger.", SCR-C-01 "Certification history and risk profile for this auditor identity only.", SCR-N-01 "Aggregate views derived live from the finalized chain event log."',
    }),
  ],
  { access: ACCESS.ADM }
);

const ScreenElement = ENT(
  'cms-pages',
  'ScreenElement',
  'Every SCR-* row of section 9, in order, field by field and panel by panel: 93 rows across the ' +
    'ten routes - SCR-H 4, SCR-S 4, SCR-S1 15, SCR-S2 3, SCR-S3 6, SCR-S4 7, SCR-S5 7, SCR-S6 9, ' +
    'SCR-V 6, SCR-P 7, SCR-M 3, SCR-D 3, SCR-A 5, SCR-C 4, SCR-N 5, SCR-Z 5.',
  [
    ID(),
    F('screenRoute', 'enum', {
      req: 1, idx: 1, label: 'Screen route', options: E.ScreenRoute,
      desc: 'The six simulator form groups (SCR-S1 .. SCR-S6) all belong to /simulator; SCR-P-02 and SCR-P-03 re-embed the SCR-S2 and SCR-S3 panels on /procuring-entity and SCR-M-03 re-embeds SCR-S6 on /ministry-admin',
    }),
    F('elementId', 'string', {
      req: 1, uniq: 1, idx: 1, label: 'Element id',
      desc: 'e.g. SCR-S1-07',
    }),
    F('order', 'int', { req: 1, label: 'Order', desc: 'Render order within the screen, as printed in the spec table' }),
    F('kind', 'enum', {
      req: 1, label: 'Kind',
      options: ['header', 'tabs', 'form-field', 'select', 'checkbox', 'button', 'table', 'stat-tiles', 'banner', 'list', 'chart', 'panel', 'empty-state', 'result-card', 'search', 'notice', 'trace', 'hero', 'grid', 'pillars'],
    }),
    F('label', 'string', {
      req: 1, label: 'Label',
      desc: 'The visible label or caption, for example "Quoted Price / Unit (Rs)", "Open Bids for Evaluation", "Create Debarment (cross-ministry)", "Update Rule (on-chain)"',
    }),
    F('specification', 'text', {
      req: 1, label: 'Specification',
      desc: 'The acceptance text. Long literals include SCR-S6-08 floor notice: "' + FLOOR_NOTICE_TEXT +
        '"; SCR-S1-13 renders the 8523 custom rule text: "' + CUSTOM_RULE_TEXT_8523 +
        '"; SCR-S4-06 mandatory notice: above Rs 10 cr a warning badge plus "CA/auditor certificate is mandatory at execution (Build Spec 6.3)." and below it a neutral badge plus "Self-certification remains sufficient; this CA certificate is optional here."',
    }),
    F('defaultValue', 'string', {
      label: 'Default value',
      desc: 'SCR-S1-03 Class-I, SCR-S1-04 50000, SCR-S1-05 100, SCR-S1-07 "Demo Product", SCR-S1-08 "Pune, Maharashtra", SCR-S1-14 60, SCR-S4-03 60, SCR-S4-04 "Sharma-and-Associates-FR-2201", SCR-S4-05 "ICAI-M-118824", SCR-S5-02 "Ministry of Defence", SCR-S5-03 today and today + 2 years, SCR-S5-06 "False declaration of local content", SCR-S6-06 "dot-admin-demo", SCR-P-06 "tender-committee-demo"',
    }),
    F('visibleWhen', 'text', {
      label: 'Visible when',
      desc: 'SCR-S1-06 the OEM Reference input appears only for a Reseller; SCR-S1-10 the PLI checkbox only when the resolved rule is pliLinked; SCR-S1-11 the Para 3A warning badge only when the rule has para3A; SCR-S1-12 / 13 / 14 are mutually exclusive on the rule method; SCR-V-03 the debarment banner only on an active debarment; SCR-V-04 stat tiles only when bids exist; SCR-S-04 the request/response panel only after the first call',
    }),
  ],
  { access: ACCESS.ADM }
);

const SimulatorTab = ENT(
  'cms-pages',
  'SimulatorTab',
  'SCR-S-02: the six pill tabs of the GeM Simulator Console (/simulator), one per GeM trigger ' +
    'point. The card title and description change with the active tab, and each tab drives one of ' +
    'API-01 .. API-06. Six rows: Bid Submission, Bid Evaluation, Preference Calculation, CA ' +
    'Certification, Debarment, Rule Update.',
  [
    ID(),
    F('tab', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Tab', options: E.SimulatorTab }),
    F('order', 'int', { req: 1, label: 'Order', desc: '1 to 6 in the SCR-S-02 pill order' }),
    F('trigger', 'enum', {
      req: 1, label: 'Trigger point', options: E.TriggerPoint,
      desc: 'The GeM trigger the tab stands in for (section 7.1)',
    }),
    F('apiId', 'string', {
      req: 1, label: 'API id',
      desc: 'API-01 POST /bids, API-02 GET /tenders/{id}/evaluation, API-03 POST /tenders/{id}/preference, API-04 POST /certifications, API-05 POST /debarments, API-06 POST /rules',
    }),
    F('cardTitle', 'string', { req: 1, label: 'Card title' }),
    F('cardDescription', 'text', {
      label: 'Card description',
      desc: 'SCR-S-01 frames the whole console: "Stands in for GeM...". SCR-S-03 loads /meta (API-18) once and shows skeletons until loaded with a "Refreshing reference data" hint while refreshing',
    }),
  ],
  { access: ACCESS.ADM }
);

const UiPrimitive = ENT(
  'cms-pages',
  'UiPrimitive',
  'Section 8.2: the twenty-four UI primitives, one component each - Card, CardHeader, CardTitle, ' +
    'CardDescription, CardContent, PageHeader, SectionLabel, Button, Badge, StatusBadge, Input, ' +
    'Label, Select, Textarea, Checkbox, Table, Th, Td, Tr, Mono, Divider, EmptyState, Skeleton, ' +
    'StatTile and PillTabs. Twenty-four rows.',
  [
    ID(),
    F('name', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Primitive', options: E.UiPrimitive }),
    F('variants', 'json', {
      label: 'Variants',
      desc: 'Button variants ' + JSON.stringify(E.ButtonVariant) + ' plus size sm, loading and icon; Badge tones ' + JSON.stringify(E.BadgeTone) + '; StatusBadge ' + JSON.stringify(E.ComplianceStatus),
    }),
    F('description', 'text', {
      req: 1, label: 'Description',
      desc: 'PageHeader = icon + title + description + optional actions; EmptyState = icon + title + description; StatTile = label, value, icon, tone; PillTabs = id + label + icon; Checkbox ships with its label; Table splits into Table / Th / Td / Tr',
    }),
  ],
  { access: ACCESS.ADM }
);

const ShellElement = ENT(
  'cms-pages',
  'ShellElement',
  'SHL-01 .. SHL-09 (TABLE 25, section 8.1): the nine application-shell parts - root layout, ' +
    'desktop sidebar, mobile drawer, tricolour accent bar, top bar, identity switcher, footer, ' +
    'content column and brand assets. Nine rows.',
  [
    ID(),
    F('shellId', 'string', {
      req: 1, uniq: 1, idx: 1, label: 'Shell id',
      desc: 'SHL-01 root layout, SHL-02 sidebar desktop, SHL-03 sidebar mobile drawer, SHL-04 tricolour accent bar, SHL-05 top bar, SHL-06 identity switcher, SHL-07 footer, SHL-08 content column, SHL-09 brand assets',
    }),
    F('name', 'string', { req: 1, label: 'Name' }),
    F('specification', 'text', {
      req: 1, label: 'Specification',
      desc: 'SHL-01 title "CBC-PRAMAAN: Make in India Compliance Trust Layer", body background = page token, wraps everything in RoleProvider then AppShell. SHL-02 fixed 16rem, three groups, active item = tinted background + brand dot. SHL-03 18rem drawer opened from the top-bar menu button, overlay and close button dismiss it. SHL-04 3px gradient gold 0-20%, brand 35-65%, green 80-100% at the top of the sidebar and the content column. SHL-05 sticky translucent bar with a "Viewing as" label plus the identity switcher on the right and the full logo (desktop) or mark (mobile) linking home. SHL-06 dropdown grouped by role label with a role colour dot (ROLE-18), current identity ticked, click-outside closes, selection persists to localStorage. SHL-08 max-width 72rem, page padding 1rem mobile / 2rem desktop, fade-in on route change. SHL-09 /brand/cerulea-icon.svg, /brand/cerulea-logo.png, /brand/cerulea-logo-source.svg with LogoMark and LogoFull components plus favicon and icon.svg. ' + FOOTER_TEXT,
    }),
  ],
  { access: ACCESS.ADM }
);

// ---------------------------------------------------------------------------
// 8. Seed, scenarios and checks (section 10)
// ---------------------------------------------------------------------------

const SeedStep = ENT(
  'test-data-factory',
  'SeedStep',
  'TABLE 45 (section 10.2): the deterministic seed sequence, thirteen steps producing 26 ' +
    'finalized blocks over the master data of TABLE 43 (7 vendors) and TABLE 44 (5 tenders). ' +
    'SEED-01 writes the seven rules into blocks 0-6, SEED-02 .. SEED-08 write nine bids and three ' +
    'CA certifications, SEED-09 and SEED-10 write the two debarments with their webhook and ' +
    'auditor fan-out, SEED-11 raises the 8517 rule to v2 and SEED-12 upgrades the classification ' +
    'engine. SEED-13 records the expected baseline. Thirteen rows.',
  [
    ID(),
    F('stepId', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Step id', options: E.SeedStepId }),
    F('order', 'int', { req: 1, label: 'Order', desc: '1 to 13, run strictly in order so block heights are reproducible' }),
    F('title', 'string', { req: 1, label: 'Title' }),
    F('txType', 'enum', {
      label: 'Transaction type', options: E.TxType,
      desc: 'ENUM-11. Null on SEED-13, which asserts rather than writes',
    }),
    F('vendorId', 'enum', {
      label: 'Vendor', options: E.VendorId,
      desc: 'TABLE 43. Null on the multi-vendor and non-vendor steps (SEED-01, SEED-08, SEED-11, SEED-12, SEED-13)',
    }),
    F('tenderId', 'enum', {
      label: 'Tender', options: E.TenderId,
      desc: 'TABLE 44. Null on the non-tender steps',
    }),
    F('payloadSummary', 'text', {
      req: 1, label: 'Payload summary',
      desc: 'SEED-02 Deccan on T-003 COMPONENT_LEVEL 100/70/85/100/20, Class-I, Rs 95,000 x 100, OEM, Chennai, "Rack Server Chassis Assembly". SEED-03 Godavari on T-001 60/55/70/100/0, Class-I, Rs 27,000 x 150, MSE reseller of Krishna, Vijayawada. SEED-04 Sabarmati on T-003 100/90/90/100/20, Class-I, Rs 112,000 x 80, Ahmedabad, "Server Motherboard Assembly". SEED-05 Sabarmati on T-001 30 on every component, Class-II, Rs 41,000 x 80, same product and location. SEED-06 Deccan on T-001 100/90/95/100/50, Class-I, Rs 48,000 x 200, Chennai. SEED-07 Indus on T-002 declared 15% claiming Class-I, Rs 780,000 x 40, Manesar. SEED-08 three T-002 bids (Deccan 70% Rs 850,000; Krishna 65% Rs 820,000; Bharat 62% Rs 870,000 MSE, each qty 60, Noida) each followed by a Sharma & Associates certification at the same percentage. SEED-09 Chambal, Ministry of Defence, 2025-04-01 to 2027-03-31, MOD-2025-TENDER-0042, penalty Rs 500,000. SEED-10 Krishna, DoT, 2026-01-15 to 2028-01-14, T-002, penalty Rs 300,000. SEED-11 DoT raises 8517 Class-I 60 to 65 effective 2026-07-01, admin dot-admin-demo. SEED-12 classification-engine v1 to v2, approvers cerulea-platform-admin and dpiit-domain-expert, payload nearThresholdBandPoints 2 to 3',
    }),
    F('expectedOutcome', 'text', {
      req: 1, label: 'Expected outcome',
      desc: 'SEED-02 YELLOW (first-time on 8471). SEED-03 YELLOW. SEED-04 about 86% baseline. SEED-05 YELLOW with SAME_PRODUCT_DIFFERENT_PERCENT. SEED-06 GREEN control. SEED-07 RED control. SEED-08 three certifications with no mismatch. SEED-09 emits DEBARMENT_WEBHOOK_EMITTED, no CA certs to flag. SEED-10 triggers AUDITOR_FLAGGED for Sharma & Associates with 2 other certs',
    }),
    F('blocksProduced', 'int', {
      req: 1, label: 'Blocks produced',
      desc: 'CHN-11 one transaction per block. The thirteen steps total 26 finalized blocks',
    }),
  ],
  { access: ACCESS.ADM }
);

const AcceptanceScenario = ENT(
  'test-data-factory',
  'AcceptanceScenario',
  'TABLE 46 (section 10.3, Build Spec 13): the twelve acceptance scenarios SCN-01 .. SCN-12, ' +
    'covering classification colours, eligibility, divisible and non-divisible preference, the MSE ' +
    'matrix, Para 3A, certification at execution, the pre-seeded cross-tender anomaly, ' +
    'cross-ministry debarment, auditor accountability, the CUSTOM method and rule update with ' +
    'Smart Evolution. Twelve rows.',
  [
    ID(),
    F('scenarioId', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Scenario id', options: E.ScenarioId }),
    F('title', 'string', { req: 1, label: 'Title' }),
    F('setup', 'text', {
      req: 1, label: 'Setup',
      desc: 'SCN-03 T-001 with Deccan Class-II @500, Bharat Class-I @550 and Krishna Class-I @620, all non-MSE. SCN-04 T-001 with a non-MSE Class-I L1 @500 and an MSE Class-I @560. SCN-05 T-005 with Deccan Class-II @400 and Bharat Class-I @440. SCN-11 T-004 on HSN 8523',
    }),
    F('expected', 'text', {
      req: 1, label: 'Expected',
      desc: 'SCN-01 100/70/85/100/20 gives GREEN Class-I 82%; 48% against a 50% threshold while claiming Class-I gives RED; 51% gives YELLOW. SCN-02 Indus claiming Non-Local is RED on T-001 (domestic) and allowed on T-003 (GTE). SCN-03 50% Deccan @500 and 50% Bharat matched @500, Krishna outside the 600 band. SCN-04 75% to L1 and 25% to the MSE bidder at 500. SCN-05 Bharat takes all 10,000 units at 400 via NON_DIVISIBLE_L1_NOT_CLASS_I_MATCHED. SCN-06 a non-Class-I bid on T-002 is RED at submission and excluded at pre-filter. SCN-07 T-002 (Rs 15 cr) shows "mandatory at execution". SCN-08 Sabarmati flagged SAME_PRODUCT_DIFFERENT_PERCENT, about 86% versus 30%. SCN-09 any Chambal bid is RED citing Ministry of Defence on any tender. SCN-10 Sharma & Associates risk 0% before and 33% after debarring Krishna. SCN-11 returns YELLOW "manual Tender Committee validation required". SCN-12 returns oldConfig v1 and newConfig v2 with admin and timestamp',
    }),
    F('status', 'enum', { req: 1, label: 'Run status', options: E.RunStatus, def: 'PENDING' }),
  ],
  { access: ACCESS.ADM }
);

const CrossCuttingCheck = ENT(
  'test-data-factory',
  'CrossCuttingCheck',
  'TABLE 47 (section 10.4): the four cross-cutting checks CHK-01 public verification, CHK-02 ' +
    'chain integrity, CHK-03 read-model rebuild and CHK-04 private collection isolation. Four rows.',
  [
    ID(),
    F('checkId', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Check id', options: E.CheckId }),
    F('title', 'string', { req: 1, label: 'Title' }),
    F('expectation', 'text', {
      req: 1, label: 'Expectation',
      desc: 'CHK-01 any txRef from a response resolves on /verify with block height, hash and integrity, and never a price or percentage (CHN-21). CHK-02 "Run Integrity Check" re-hashes every block and reports valid (CHN-20, SCR-A-03). CHK-03 recomputing analytics twice yields identical JSON (ENG-66, OPS-03). CHK-04 switching between two vendor identities on /vendor shows disjoint declaration lists (ROLE-12)',
    }),
    F('status', 'enum', { req: 1, label: 'Run status', options: E.RunStatus, def: 'PENDING' }),
  ],
  { access: ACCESS.ADM }
);

const SeedBaseline = ENT(
  'test-data-factory',
  'SeedBaseline',
  'SEED-13 (TABLE 45): the expected baseline after a clean seed, asserted by OPS-02 and OPS-03. ' +
    'One singleton row: 9 bids (1 GREEN, 7 YELLOW, 1 RED), 3 certifications, 2 debarments, ' +
    '1 anomaly, 26 finalized blocks, integrity valid and a CA risk score of 33%.',
  [
    ID(),
    F('totalBids', 'int', { req: 1, label: 'Total bids', def: 9 }),
    F('greenBids', 'int', { req: 1, label: 'GREEN bids', def: 1, desc: 'SEED-06, Deccan on T-001' }),
    F('yellowBids', 'int', { req: 1, label: 'YELLOW bids', def: 7 }),
    F('redBids', 'int', { req: 1, label: 'RED bids', def: 1, desc: 'SEED-07, Indus on T-002' }),
    F('certifications', 'int', { req: 1, label: 'Certifications', def: 3, desc: 'SEED-08, all by Sharma & Associates at the declared percentage, no mismatch' }),
    F('debarments', 'int', { req: 1, label: 'Debarments', def: 2, desc: 'SEED-09 Chambal and SEED-10 Krishna' }),
    F('anomalies', 'int', { req: 1, label: 'Anomalies', def: 1, desc: 'SEED-05, SAME_PRODUCT_DIFFERENT_PERCENT on Sabarmati' }),
    F('finalizedBlocks', 'int', { req: 1, label: 'Finalized blocks', def: 26, desc: 'CHN-11 one transaction per block; blocks 0-6 are the seven seeded rules' }),
    F('integrityValid', 'boolean', { req: 1, label: 'Integrity valid', def: true, desc: 'CHN-20 walk of every block after the seed' }),
    F('caRiskScorePercent', 'int', { req: 1, label: 'CA risk score', unit: '%', def: 33, desc: 'ENG-25: 1 problematic certification out of 3 for Sharma-and-Associates-FR-2201::ICAI-M-118824 (SCN-10)' }),
  ],
  { access: ACCESS.ADM }
);

// ---------------------------------------------------------------------------
// 9. Operational scripts and hosting (section 11)
// ---------------------------------------------------------------------------

const OpsScript = ENT(
  'dev-sandbox',
  'OpsScript',
  'OPS-01 .. OPS-05 (TABLE 48): the five operational entry points - reset-chain, seed, ' +
    'rebuild-readmodel, the auto-seed instrumentation hook and the idempotent ensureSeeded guard. ' +
    'Five rows.',
  [
    ID(),
    F('script', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Script', options: E.OpsScript }),
    F('description', 'text', {
      req: 1, label: 'Description',
      desc: 'OPS-01 reset-chain, OPS-02 seed, OPS-03 rebuild-readmodel, OPS-04 auto-seed on start, OPS-05 idempotent ensureSeeded',
    }),
    F('behaviour', 'text', {
      req: 1, label: 'Behaviour',
      desc: 'OPS-01 deletes data/chain.db, chain.db-wal and chain.db-shm if present, then prints a hint to reseed. OPS-02 runs the section 10.2 sequence with per-step logging then prints the integrity result and total block count. OPS-03 computes analytics twice and asserts equality, printing totals and integrity. OPS-04 is a server instrumentation hook: on the Node runtime, if no RULE_UPDATED exists it runs the seed, so a cold /tmp ledger on Vercel self-populates. OPS-05 seeds only when the Rule Registry is empty and returns whether it did',
    }),
    F('exitCodeOnFailure', 'int', {
      label: 'Exit code on failure',
      desc: 'OPS-03 exits 1 on an analytics mismatch (CHK-03). The other scripts do not define a failure exit code',
    }),
  ],
  { access: ACCESS.ADM }
);

const HostingConfig = ENT(
  'dev-sandbox',
  'HostingConfig',
  'OPS-06, OPS-07 and OPS-08 (TABLE 48): hosting, the reference stack and the measured dev-server ' +
    'latencies. One singleton row.',
  [
    ID(),
    F('liveUrl', 'string', { req: 1, label: 'Live URL', def: 'https://cbc-pramaan.cerulea.io' }),
    F('altUrl', 'string', { label: 'Alternate URL', def: 'https://cbc-pramaan.vercel.app' }),
    F('repo', 'string', { req: 1, label: 'Repository', def: 'github.com/CAERULEAN-BYTECHAINS-PRIVATE-LIMITED/CBC-PRAMAAN' }),
    F('branch', 'string', { req: 1, label: 'Deploy branch', def: 'main', desc: 'OPS-06: auto-deployed from main' }),
    F('stack', 'text', { req: 1, label: 'Stack', desc: STACK_TEXT, def: STACK_TEXT }),
    F('bidSubmissionLatencyMs', 'string', {
      label: 'Bid submission latency', unit: 'ms', def: '120-139',
      desc: 'OPS-08, measured on the dev server',
    }),
    F('preferenceLatencyMs', 'string', {
      label: 'Preference latency', unit: 'ms', def: '136-175',
      desc: 'OPS-08, measured on the dev server',
    }),
    F('finality', 'string', {
      req: 1, label: 'Finality', def: 'synchronous',
      desc: 'CHN-15 / OPS-08: hashing, Merkle root, consensus and both inserts complete inside the call that returns the domain result',
    }),
  ],
  { access: ACCESS.ADM }
);

// ---------------------------------------------------------------------------
// 10. PoC simplifications (section 12)
// ---------------------------------------------------------------------------

const PocSimplification = ENT(
  'local-chain-devnet',
  'PocSimplification',
  'SIM-01 .. SIM-10 (TABLE 49, section 12): the ten explicit PoC simplifications and what a ' +
    'production build must replace them with - in-process validators, deterministic signatures, ' +
    'query-string identity, price-match auto-accept, the webhook recorded as a chain event, ' +
    'wholesale evaluation-cache invalidation, WEIGHTED_MODULE falling through to STANDARD, the ' +
    'extended divisible MSE cascades, static master data and ephemeral SQLite storage. Ten rows.',
  [
    ID(),
    F('simId', 'enum', { req: 1, uniq: 1, idx: 1, label: 'Simplification id', options: E.SimplificationId }),
    F('title', 'string', { req: 1, label: 'Title' }),
    F('pocBehaviour', 'text', {
      req: 1, label: 'PoC behaviour',
      desc: 'SIM-01 three DCF validators run in one process. SIM-02 the validator signature is a salted sha256, not a digital signature scheme. SIM-03 role/id query parameters stand in for GeM identity and DSC. SIM-04 every offered candidate accepts. SIM-05 debarment fan-out is recorded on-chain. SIM-06 a rule update clears all evaluation cache entries. SIM-07 WEIGHTED_MODULE falls through to STANDARD. SIM-08 the two divisible MSE branches extend the documented non-divisible pattern and their trace steps say "extended pattern". SIM-09 vendors and tenders are hardcoded. SIM-10 a SQLite file, ephemeral on Vercel and reseeded on cold start',
    }),
    F('productionReplacement', 'text', {
      req: 1, label: 'Production replacement',
      desc: 'SIM-01 separate Cerulea nodes. SIM-02 a real digital signature scheme. SIM-03 GeM identity and DSC infrastructure. SIM-04 a vendor negotiation channel. SIM-05 real calls to external procuring-entity endpoints. SIM-06 per-HSN cache invalidation. SIM-07 modelled module weights. SIM-08 documented divisible MSE branches. SIM-09 GeM records referenced by id. SIM-10 durable storage',
    }),
  ],
  { access: ACCESS.ADM }
);

// ---------------------------------------------------------------------------
// 11. Notifications (ENG-18, ENG-24, RUL-05, CHN-26)
// ---------------------------------------------------------------------------

const NotificationEvent = ENT(
  'notifications',
  'NotificationEvent',
  'The outbound notice raised alongside a chain write: ENG-18 debarment fan-out to ' +
    'ALL_PROCURING_ENTITIES (recorded on-chain in the PoC, SIM-05), ENG-24 auditor flagging of a ' +
    'CA who certified a later-debarred vendor, RUL-05 a rule update for the nodal ministry, ' +
    'CHN-26 a Smart Evolution logic upgrade, and ENG-59 a committee decision on a preference ' +
    'outcome. Five kinds. Visibility follows the underlying transaction ACL (ROLE-09 .. ROLE-15).',
  [
    ID(),
    F('kind', 'enum', {
      req: 1, idx: 1, label: 'Kind',
      options: ['DEBARMENT_NOTICE', 'AUDITOR_FLAGGED', 'RULE_UPDATED', 'LOGIC_UPGRADED', 'COMMITTEE_DECISION'],
      desc: 'Maps onto the ENUM-11 transaction types DEBARMENT_WEBHOOK_EMITTED, AUDITOR_FLAGGED, RULE_UPDATED, LOGIC_UPGRADED and PREFERENCE_COMMITTEE_ACTION',
    }),
    F('recipientRole', 'enum', {
      req: 1, idx: 1, label: 'Recipient role', options: E.Role,
      desc: 'ENG-18 fans out to every PROCURING_ENTITY; ENG-24 notices reach AUDIT and CA; RUL-05 notices reach the MINISTRY_ADMIN named on the rule',
    }),
    F('recipientId', 'string', {
      idx: 1, label: 'Recipient id',
      desc: 'The identity id (ROLE-01). Null on a broadcast such as ENT-22 recipients = ALL_PROCURING_ENTITIES',
    }),
    F('txRef', 'string', {
      req: 1, idx: 1, label: 'Transaction ref',
      desc: 'CHN-10: the chain transaction the notice was raised for, resolvable on /verify (CHN-21)',
    }),
    F('subject', 'string', { req: 1, label: 'Subject' }),
    F('body', 'text', { label: 'Body' }),
    F('sentAt', 'datetime', { req: 1, label: 'Sent at' }),
  ],
  { access: ACCESS.AUTH }
);

// ---------------------------------------------------------------------------

const ENTITIES = [
  PlatformConstants,
  Identity,
  AccessRule,
  RoleColourToken,
  DesignToken,
  RuleRegistrySeedRow,
  Hsn8471Component,
  StatusReasonTemplate,
  DecisionPathDef,
  ApiEndpoint,
  ApiBehaviour,
  AppScreen,
  ScreenElement,
  SimulatorTab,
  UiPrimitive,
  ShellElement,
  SeedStep,
  AcceptanceScenario,
  CrossCuttingCheck,
  SeedBaseline,
  OpsScript,
  HostingConfig,
  PocSimplification,
  NotificationEvent,
];

/** [fromEntityName, toEntityName, type] - resolved to ids by the seeder. */
const RELS = [
  // Access policy governs what a reader sees on the ledger (ROLE-09 .. ROLE-16, CHN-22)
  ['AccessRule', 'ChainTransaction', 'relatedTo'],
  ['Identity', 'RoleColourToken', 'relatedTo'],

  // Rule registry: the seeded rows become RuleConfig versions on chain (SEED-01, RUL-04)
  ['RuleRegistrySeedRow', 'RuleConfig', 'relatedTo'],
  ['Hsn8471Component', 'RuleRegistrySeedRow', 'relatedTo'],

  // Engine lookup tables drive the two computed records
  ['StatusReasonTemplate', 'BidRecord', 'relatedTo'],
  ['DecisionPathDef', 'PreferenceOutcome', 'relatedTo'],

  // API surface and screens
  ['ApiEndpoint', 'AppScreen', 'relatedTo'],
  ['AppScreen', 'ScreenElement', 'oneToMany'],
  ['AppScreen', 'SimulatorTab', 'oneToMany'],

  // Seed harness (section 10)
  ['SeedStep', 'ChainTransaction', 'relatedTo'],
  ['SeedStep', 'Vendor', 'relatedTo'],
  ['SeedStep', 'Tender', 'relatedTo'],
  ['AcceptanceScenario', 'SeedStep', 'relatedTo'],
  ['CrossCuttingCheck', 'IntegrityCheckResult', 'relatedTo'],
  ['CrossCuttingCheck', 'VerificationLookup', 'relatedTo'],
  ['CrossCuttingCheck', 'Analytics', 'relatedTo'],

  // Ops and simplifications
  ['HostingConfig', 'OpsScript', 'oneToMany'],
  ['PocSimplification', 'FinalizedBlock', 'relatedTo'],

  // Notices raised alongside a chain write
  ['NotificationEvent', 'DebarmentRecord', 'relatedTo'],
  ['NotificationEvent', 'CACertificationRecord', 'relatedTo'],
  ['NotificationEvent', 'LogicVersion', 'relatedTo'],
];

module.exports = { ENTITIES, RELS };
