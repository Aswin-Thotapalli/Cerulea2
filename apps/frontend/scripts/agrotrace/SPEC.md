AgroTrace
Atomic Build Specification for Cerulea Studio
Blockchain traceability for Indian agri-exports. A product of Caerulean Bytechains, built on Cerulea.
Generated from the live codebase. Current as of September 2026.

# 0. How to read this and build order
AgroTrace is a multi-tenant, profile-driven traceability platform on an internal blockchain (AgroChain). Two commodity profiles ship today, Turmeric and Mango, on one engine. Build the atoms below in this order.
- 1. Pick-lists: define every enumeration (Section 1).
- 2. Collections: define every data collection and its fields (Section 2).
- 3. Chain: configure the AgroChain ledger, validators and transaction types (Section 3).
- 4. Roles: define the participant roles and their access (Section 4).
- 5. Profiles: define each commodity chain as an ordered list of stages (Section 5).
- 6. Forms: define the data-entry form for every stage, field by field (Section 6).
- 7. Rules: wire the workflows: anchoring, gating, consensus handoff, status machine (Section 7).
- 8. Screens: build the dashboards, records, explorer and public verify (Section 8).
- 9. Access: apply tenant isolation, role gating and security (Section 9).
- 10. Localisation and brand: nine languages, PWA, brand (Section 10).

# 1. Enumerations (pick-lists)
Every field that is a choice draws from one of these fixed lists.

[TABLE 1]
| Pick-list | Values |
|---|---|
| UserRole (21) | PLATFORM_ADMIN, EXPORTER, FARMER, LABORATORY, PACKHOUSE, TREATMENT_FACILITY, NPPO_INSPECTOR, APEDA_OFFICER, CUSTOMS_BROKER, COLD_STORAGE, FREIGHT_FORWARDER, SHIPPING_LINE, PORT_ARRIVAL, IMPORT_CUSTOMS, BUYER, BOILING_UNIT, DRYING_YARD, POLISHING_MILL, COMMISSION_AGENT, PROCESSING_UNIT, SPICES_BOARD_OFFICER |
| UserStatus | INVITED, ACTIVE, SUSPENDED, DEACTIVATED |
| TenantStatus | PENDING_APPROVAL, ACTIVE, SUSPENDED, DEACTIVATED |
| SubscriptionTier | STARTER, GROWTH, ENTERPRISE |
| UnitType | CARTONS, CRATES, BAGS |
| LotStatus | REGISTERED, RESIDUE_TEST_PASSED, RESIDUE_TEST_FAILED, RESIDUE_TEST_CONDITIONAL, IN_SHIPMENT |
| ShipmentStatus (15) | REGISTERED, RESIDUE_TESTED, PACKHOUSE_PROCESSED, TREATED, PHYTO_CLEARED, APEDA_CERTIFIED, CUSTOMS_CLEARED, IN_COLD_STORAGE, WITH_FORWARDER, VESSEL_LOADED, IN_TRANSIT, ARRIVED, DELIVERED, DISPUTED, DISPUTE_RESOLVED |
| ChainStatus / TransactionStatus | PENDING, CONFIRMED, FAILED |
| BlockStatus | PENDING_CONSENSUS, FINALISED |
| NodeStatus | ONLINE, OFFLINE |
| MrlStandard | FSSAI, EU, JAPAN, CODEX, CUSTOM |
| ResidueTestResult | PASS, FAIL, CONDITIONAL_PASS, PENDING |
| Incoterm | FOB, CIF, CFR, EXW |
| CertificateType | PHYTOSANITARY, CERTIFICATE_OF_ORIGIN, EXPORT_INSPECTION, FUMIGATION, TREATMENT, BILL_OF_LADING, OTHER |
| DisputeStatus | OPEN, EXPORTER_RESPONDED, CLOSED |
| DisputeResolutionOutcome | EXPORTER_ACCEPTED, BUYER_ACCEPTED, PARTIAL_SETTLEMENT, REFERRED_TO_ARBITRATION |
| ExportJobStatus | PENDING, PROCESSING, COMPLETE, FAILED |
| MangoVariety | ALPHONSO, KESAR, BANGANAPALLI, DASHERI |
| ChainTxType (10) | LOT_REGISTERED, RESIDUE_TEST_RECORDED, SHIPMENT_CREATED, EVENT_RECORDED, CERTIFICATE_ANCHORED, CUSTODY_TRANSFERRED, BREACH_RECORDED, DISPUTE_INITIATED, DISPUTE_RESOLVED, COMPLIANCE_OVERRIDE |

# 2. Data collections (entities)
Every collection is scoped to a tenant. Chain fields (chainTxHash, chainBlockNumber, chainStatus) appear on every anchored record: they hold the on-chain proof.

### Tenant
One per exporter organisation.

[TABLE 2]
| Field | Type |
|---|---|
| legalName | text |
| apedaRegistrationNumber | text |
| gstin | text |
| primaryContactName / Email / Phone | text |
| status | TenantStatus |
| subscriptionTier | SubscriptionTier |
| maxActiveShipments | int |
| maxParticipantAccounts | int |

### User
A participant login. Belongs to one tenant, carries one role and a wallet.

[TABLE 3]
| Field | Type |
|---|---|
| tenantId | ref Tenant |
| role | UserRole |
| email | text (unique) |
| passwordHash | text |
| fullName | text |
| organisationName | text |
| walletAddress | text (0x + 40 hex) |
| status | UserStatus |
| commodityKey | text (profile scope) |
| isSuperAdmin | bool |

### Lot
The harvest batch. Origin of the chain.

[TABLE 4]
| Field | Type |
|---|---|
| lotId | text (LOT-<COMMODITY>-YYYY-NNNN) |
| commodityKey | text |
| variety | text |
| attributes | json (profile-specific) |
| farmName / farmerName | text |
| village / district / state | text |
| harvestDate | date |
| quantityKg | decimal |
| numUnits | int |
| unitType | UnitType |
| apedaRegNumber | text |
| fssaiLicense | text |
| status | LotStatus |
| chainTxHash / chainBlockNumber / chainStatus | chain proof |
| registeredById | ref User |

### ResidueTest
Lab pesticide-residue test on a lot. Gates export.

[TABLE 5]
| Field | Type |
|---|---|
| lotId | ref Lot |
| mrlStandard | MrlStandard |
| result | ResidueTestResult |
| labName | text |
| nablAccreditationNumber | text |
| reportReference | text |
| reportDate | date |
| testedBy | text |
| pesticideResults | json array {name, detectedPpm, mrlLimitPpm, result} |
| documentS3Key / documentHash | file + sha256 |
| chain proof | ... |

### Shipment
The export consignment. Carries the chain of custody events.

[TABLE 6]
| Field | Type |
|---|---|
| shipmentId | text |
| lotId | ref Lot |
| originPortCode / destinationPortCode | text |
| destinationCountry | text |
| incoterm | Incoterm |
| declaredFobValueUsd | decimal |
| hsCode | text |
| vesselName / voyageNumber | text |
| expectedLoadingDate / actualLoadingDate / etaDestination | date |
| currentStatus | ShipmentStatus |
| complianceScore | decimal |
| hasBreach / breachType | bool / text |
| chain proof | ... |
| createdById | ref User |

### ShipmentEvent
One recorded step in the chain of custody. The atomic on-chain event.

[TABLE 7]
| Field | Type |
|---|---|
| shipmentId | ref Shipment |
| eventType | text (see Section 5) |
| eventLabel | text |
| actorUserId / actorWalletAddress | ref / text |
| actorOrganisation / actorRole | text |
| metadata | json (the form fields, see Section 6) |
| recordedAt | datetime |
| chain proof | ... |

### Certificate
A document anchored by its hash (phyto, COO, treatment, etc.).

[TABLE 8]
| Field | Type |
|---|---|
| shipmentId | ref Shipment |
| certType | CertificateType |
| certificateNumber | text |
| issueDate / validityDate | date |
| issuingAuthority | text |
| documentS3Key / documentHash | file + sha256 |
| fileSize / originalFilename | int / text |
| chain proof | ... |

### CustodyTransfer
A two-party transfer of custody.

[TABLE 9]
| Field | Type |
|---|---|
| shipmentId | ref Shipment |
| fromOrganisation / toOrganisation | text |
| transferTimestamp | datetime |
| location | text |
| conditionNotes | text |
| quantityKg | decimal |
| chain proof | ... |

### TelemetryReading + IotDevice
Cold-chain sensor stream (temperature / humidity) for reefer breach detection.

[TABLE 10]
| Field | Type |
|---|---|
| IotDevice | deviceId, shipmentId, type, status |
| TelemetryReading | shipmentId, readingTimestamp, value(s), breach flag |

### Dispute + DisputeEvidence
Buyer rejection / discrepancy handling.

[TABLE 11]
| Field | Type |
|---|---|
| shipmentId | ref Shipment |
| initiatedById | ref User |
| rejectionType / reasonCategory | text |
| description | text |
| rejectedQuantityKg / claimedValueUsd | decimal |
| status | DisputeStatus |
| resolutionOutcome | DisputeResolutionOutcome |
| DisputeEvidence | documents attached to a dispute |

### Chain collections
The ledger itself.

[TABLE 12]
| Field | Type |
|---|---|
| ChainBlock | blockNumber, blockHash, previousBlockHash, merkleRoot, status, producerNodeId, finalisedAt |
| ChainTransaction | txHash, blockNumber, blockPosition, fromWallet, txType, payloadHash, payload, status |
| ChainConsensusVote | block + validator node vote |
| ChainNode | nodeId, name, location, status, latency |

### PlatformSettings + ComplianceMatrix + AuditLog + Notification + WebhookConfig + ChatMessage
Platform config, per-commodity compliance rules, audit trail, alerts, integrations, messaging.

[TABLE 13]
| Field | Type |
|---|---|
| PlatformSettings | chainName, chainId, consensusThreshold, mempoolMin/MaxDelaySeconds |
| ComplianceMatrix | per-commodity required checks / certificates before export |
| AuditLog | who did what, when |
| WebhookConfig + WebhookDelivery | outbound integrations |

# 3. Blockchain layer (AgroChain)
An internal, permissioned ledger. No cryptocurrency, no gas, no external wallet: users never touch crypto. Every record above is anchored here.
- Chain: name "AgroChain", chainId "agrotrace-1".
- Hashing: SHA-256 throughout. txHash = sha256(txData); payloadHash = sha256(payload).
- Blocks: hash-linked. Each block stores previousBlockHash, a Merkle root of its transactions, and a producer node. Genesis previousBlockHash = 64 zeros.
- Validators: five validator nodes (Mumbai, Singapore, and three more), round-robin block producer selection.
- Consensus: four-of-five threshold (consensusThreshold = 4). A block moves PENDING_CONSENSUS -> FINALISED when it reaches the threshold; otherwise it does not finalise.
- Mempool: a submitted transaction waits a randomised 5 to 20 seconds before it is mined (the ChainBadge shows amber, then green on finalisation).
- Wallets: each participant has a deterministic wallet address (0x + 40 hex). Every event is attributed to its actor wallet (signed action).
- Transaction types (10): LOT_REGISTERED, RESIDUE_TEST_RECORDED, SHIPMENT_CREATED, EVENT_RECORDED, CERTIFICATE_ANCHORED, CUSTODY_TRANSFERRED, BREACH_RECORDED, DISPUTE_INITIATED, DISPUTE_RESOLVED, COMPLIANCE_OVERRIDE.

# 4. Roles
Each participant logs in with one role. Roles are the actors in the chain.

[TABLE 14]
| Role / group | Duty |
|---|---|
| PLATFORM_ADMIN | Platform / tenant operator. Switches commodity profiles; sees everything within scope. |
| Super Admin | A platform admin flagged isSuperAdmin: adds user management on top. |
| EXPORTER | The operating account. Registers lots, books exports, sees the full book. |
| FARMER | Registers the harvest lot from the farm / orchard (mobile portal). |
| LABORATORY | Runs the residue test (and, for turmeric, the quality assay). |
| Turmeric chain | BOILING_UNIT, DRYING_YARD, POLISHING_MILL, COMMISSION_AGENT (mandi), PROCESSING_UNIT, SPICES_BOARD_OFFICER. |
| Mango chain | PACKHOUSE, TREATMENT_FACILITY (VHT/HWT), NPPO_INSPECTOR (phyto), APEDA_OFFICER (COO / export inspection). |
| Shared logistics | FREIGHT_FORWARDER, CUSTOMS_BROKER, SHIPPING_LINE, COLD_STORAGE, PORT_ARRIVAL, IMPORT_CUSTOMS. |
| BUYER | The overseas importer. Confirms receipt, or raises a dispute. |
Two-party handoff: at each change of custody the receiving role reviews the declared quantity and either accepts (co-signs on chain) or flags a discrepancy. Both signatures sit on one record.

# 5. Commodity profiles (the chains)
A profile is an ordered list of stages. Each stage = a role that records one event type, which advances the shipment to a new status. Order matters.

## 5A. Turmeric profile

[TABLE 15]
| # | Role | Stage | Event type | Resulting status |
|---|---|---|---|---|
| 1 | Farmer | Register lot | LOT_REGISTERED | (lot created) |
| 2 | Laboratory | Residue test | RESIDUE_TEST_RECORDED | RESIDUE_TESTED |
| 3 | Boiling Unit | Boiling / curing | CURING_COMPLETED | (batch advances) |
| 4 | Drying Yard | Drying | DRYING_COMPLETED | - |
| 5 | Polishing Mill | Polishing | POLISHING_COMPLETED | - |
| 6 | Commission Agent | Mandi first sale | MANDI_FIRST_SALE | - |
| 7 | Processing Unit | Sterilise & grind | STERILISATION_GRINDING_COMPLETED | - |
| 8 | Laboratory | Quality assay | LAB_ASSAY_COMPLETED | - |
| 9 | Spices Board Officer | Export certification | SPICES_BOARD_REGISTRATION_ISSUED | - |
| 10 | Exporter | Book export | EXPORT_BOOKED | - |
| 11 | Freight Forwarder | Forwarder handoff | FREIGHT_HANDOFF | WITH_FORWARDER |
| 12 | Customs Broker | Export clearance | CUSTOMS_CLEARED |
| 13 | Shipping Line | Vessel loading | VESSEL_LOADED |
| 14 | Destination Port | Arrival | VESSEL_ARRIVED | ARRIVED |
| 15 | Import Customs | Import clearance | IMPORT_CLEARED | - |
| 16 | Overseas Buyer | Receipt & acceptance | BUYER_ACCEPTANCE | DELIVERED |
Note: at origin, customs clearance precedes vessel loading (the Let Export Order allows loading). Turmeric is a dry spice with no cold-chain stage.

## 5B. Mango profile

[TABLE 16]
| # | Role | Stage | Event type | Resulting status |
|---|---|---|---|---|
| 1 | Farmer | Register lot | LOT_REGISTERED | (lot created) |
| 2 | Laboratory | Residue test | RESIDUE_TEST_RECORDED | RESIDUE_TESTED |
| 3 | Packhouse | Grading & packing | PACKHOUSE_PROCESSED |
| 4 | Treatment Facility | Vapour heat treatment | TREATMENT_COMPLETED | TREATED |
| 5 | NPPO Inspector | Phytosanitary certificate | PHYTO_CERTIFICATE_ISSUED | PHYTO_CLEARED |
| 6 | APEDA Officer | Certificate of Origin | COO_ISSUED | APEDA_CERTIFIED |
| 6b | APEDA Officer | Export inspection | EXPORT_INSPECTION_ISSUED | - |
| 7 | Customs Broker | Export clearance | CUSTOMS_CLEARED |
| 8 | Cold Storage | Reefer custody | COLD_STORAGE_ENTRY | IN_COLD_STORAGE |
| 9 | Freight Forwarder | Custody transfer | CUSTODY_TRANSFER | WITH_FORWARDER |
| 10 | Shipping Line | Vessel loading | VESSEL_LOADED |
| 11 | Overseas Buyer | Arrival | BUYER_ARRIVAL | ARRIVED |
| 12 | Overseas Buyer | Acceptance | BUYER_ACCEPTANCE | DELIVERED |
Mango runs on a cold chain (reefer). Treatment is vapour heat / hot water against fruit fly, required for many markets.

# 6. Forms (fields per stage)
The atomic data-entry spec. Each stage records these fields; they become the event metadata anchored on chain.

## 6.0 Lot registration (shared)

[TABLE 17]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| variety | Variety / cultivar | select | Yes | commodity-specific (e.g. ALPHONSO, KESAR / ARMOOR_NIZAMABAD, LAKADONG) |
| farmName | Farm / orchard name | text | Yes |  |
| farmerName | Farmer legal name | text | Yes |  |
| village | Village | text | Yes |  |
| district | District | text | Yes |  |
| state | State | select | Yes | Indian states |
| harvestDate | Harvest date | date | Yes |  |
| quantityKg | Total quantity | number | Yes | kg |
| numUnits | Number of units | number | Yes |  |
| unitType | Unit type | select | Yes | CARTONS / CRATES / BAGS |
| apedaRegNumber | APEDA registration number | text | Yes |  |
| fssaiLicense | FSSAI licence number | text | Yes |  |
| gpsCoordinates | GPS coordinates | text | No | optional lat/long |
| (turmeric extras) | Initial moisture, raw batch value, soil type | mixed | No | profile attributes |

## 6.1 Residue test (shared)

[TABLE 18]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| mrlStandard | MRL standard | select | Yes | FSSAI / EU / JAPAN / CODEX / CUSTOM |
| result | Result | select | Yes | PASS / FAIL / CONDITIONAL_PASS |
| labName | Laboratory | text | Yes |  |
| nablAccreditationNumber | NABL accreditation number | text | No |  |
| reportReference | Report reference | text | Yes |  |
| reportDate | Report date | date | Yes |  |
| testedBy | Tested by | text | Yes |  |
| pesticideResults | Pesticide panel | table | Yes | rows of {name, detectedPpm, mrlLimitPpm, result} |
| document | Report document | file | No | anchored by SHA-256 hash |

## 6.2 Turmeric stage forms

### Boiling Unit (CURING_COMPLETED)

[TABLE 19]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| boilingLotId | Boiling lot ID | text | Yes |  |
| rawInputWeight | Raw rhizomes loaded | number | Yes | kg |
| boilingDate | Boiling date | date | Yes |  |
| curingMethod | Curing method | select | Yes | Open pan / Steam / Perforated drum boiling |
| boilingDuration | Boiling duration | number | Yes | min |
| alkalineAid | Alkaline aid added | select | No | None / Sodium bicarbonate / Slaked lime |
| donenessIndicator | Doneness check | select | Yes | froth+aroma / soft / underdone |
| curedOutputWeight | Cured output weight | number | Yes | kg |
| operatorNotes | Operator notes | textarea | No |  |

### Drying Yard (DRYING_COMPLETED)

[TABLE 20]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| dryingMethod | Drying method | select | Yes | sun / raised platform / solar tunnel / mechanical |
| dryingStartDate | Drying start date | date | No |  |
| completionDate | Completion date | date | Yes |  |
| dryingDays | Number of drying days | number | Yes | days |
| startMoisture | Moisture at start | number | No | % |
| finalMoisture | Final moisture content | number | Yes | % |
| driedWeight | Weight after drying | number | Yes | kg |
| turningFrequency | Turning frequency | select | No |  |
| remarks | Remarks | textarea | No |  |

### Polishing Mill (POLISHING_COMPLETED)

[TABLE 21]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| polishingDate | Polishing date | date | Yes |  |
| polishingType | Polishing type | select | Yes | manual / mechanical / water / colour-coated |
| inputDriedKg | Input dried fingers | number | Yes | kg |
| outputPolishedKg | Output polished fingers | number | Yes | kg |
| polishingLossPct | Polishing loss | number | No | % |
| numberOfDrumCycles | Drum cycles | number | No |  |
| grade | Grade / finger size | select | Yes | bulb / finger bold / medium / small / broken |
| appearance | Appearance & colour | select | No |  |
| remarks | Remarks | textarea | No |  |

### Commission Agent (MANDI_FIRST_SALE)

[TABLE 22]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| apmcMarketYard | APMC market yard | select | Yes | Nizamabad / Armoor / Jagtial / Warangal / Bodhan |
| mandiLotNumber | Mandi lot number | text | Yes |  |
| quantitySold | Quantity sold | number | Yes | quintal |
| modalSalePrice | Modal sale price | number | Yes | INR/quintal |
| buyerTraderName | Buyer / licensed trader | text | Yes |  |
| pattedReceiptNumber | APMC sale receipt (patti) no. | text | Yes |  |
| marketFeePercent | Market fee / commission | number | Yes | % |
| saleDate | Sale date | date | Yes |  |

### Processing Unit (STERILISATION_GRINDING_COMPLETED)

[TABLE 23]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| batchCode | Processing batch code | text | Yes |  |
| processingDate | Sterilise & grind date | date | Yes |  |
| sterilisationMethod | Sterilisation method | select | Yes | Steam (ETO-free) / ETO / Steam+microwave / Untreated |
| grindMesh | Grind mesh | number | Yes | mesh |
| curcuminContent | Curcumin content | number | Yes | % |
| outputPowderWeight | Output powder weight | number | Yes | kg |
| packingType | Packing type | select | Yes | LDPE-lined PP / HDPE drum / kraft / FIBC |
| packSize | Pack size | number | Yes | kg |
| processingNotes | Processing notes | textarea | No |  |

### Laboratory quality assay (LAB_ASSAY_COMPLETED)

[TABLE 24]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| curcuminContent | Curcumin content | number | Yes | % |
| leadChromate | Lead chromate | select | Yes | Negative / Detected |
| ethyleneOxide | Ethylene oxide | number | Yes | mg/kg |
| aflatoxinB1 | Aflatoxin B1 | number | Yes | ppb |
| moisturePostProcess | Moisture (post-process) | number | Yes | % |
| mrlStandard | MRL standard | select | Yes | EU / CODEX / FSSAI |
| labName | Laboratory | text | Yes |  |
| nablAccreditationNumber | NABL number | text | No |  |
| reportReference | Report reference | text | No |  |
| reportDate | Report date | date | Yes |  |
| testedBy | Tested by | text | No |  |

### Spices Board Officer (SPICES_BOARD_REGISTRATION_ISSUED)

[TABLE 25]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| spicesBoardCertNo | Spices Board certificate number | text | Yes |  |
| cresRegistrationNo | Exporter CRES / RCMC number | text | Yes |  |
| inspectionDate | Inspection date | date | Yes |  |
| issueDate | Issue date | date | Yes |  |
| validUpto | Valid upto | date | Yes |  |
| qualityGrade | Quality grade | select | Yes | Nizamabad Bulb/Finger, Rajapore, Salem, Erode, NS |
| curcuminVerified | Curcumin verified | number | Yes | % |
| mrlComplianceStatus | EU MRL / aflatoxin / ETO compliance | select | Yes | Compliant / Non-compliant |
| officerRemarks | Officer name, designation & remarks | textarea | No |  |

### Exporter (EXPORT_BOOKED)

[TABLE 26]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| exportContractNo | Export contract number | text | Yes |  |
| buyerName | Overseas buyer | text | Yes |  |
| destinationCountry | Destination country | text | Yes |  |
| incoterm | Incoterm | select | Yes | FOB / CIF / CFR / EXW |
| portOfLoading | Port of loading | select | Yes | Nhava Sheva / Chennai / Visakhapatnam |
| declaredFobValueUsd | Declared FOB value | number | Yes | USD |
| bookingDate | Booking date | date | Yes |  |

## 6.3 Turmeric logistics forms

### Freight Forwarder (FREIGHT_HANDOFF)

[TABLE 27]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| bookingNumber | Booking number | text | Yes |  |
| forwarderName | Freight forwarder | text | Yes |  |
| containerNumber | Container number | text | Yes |  |
| containerType | Container type | select | Yes | 20ft GP / 40ft GP / 40ft HC / 20ft Reefer |
| sealNumber | Seal number | text | No |  |
| handoffDate | Handoff date | date | Yes |  |

### Customs Broker (CUSTOMS_CLEARED)

[TABLE 28]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| shippingBillNo | Shipping bill number | text | Yes |  |
| shippingBillDate | Shipping bill date | date | Yes |  |
| portOfLoading | Port of loading | select | Yes |  |
| letExportOrderDate | Let Export Order (LEO) date | date | Yes |  |
| chaLicenseNo | CHA licence number | text | No |  |
| remarks | Remarks | textarea | No |  |

### Shipping Line (VESSEL_LOADED)

[TABLE 29]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| vesselName | Vessel name | text | Yes |  |
| voyageNumber | Voyage number | text | Yes |  |
| billOfLadingNo | Bill of lading number | text | Yes |  |
| loadingDate | Loading date | date | Yes |  |
| etaDestination | ETA at destination | date | No |  |
| remarks | Remarks | textarea | No |  |

### Destination Port (VESSEL_ARRIVED)

[TABLE 30]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| arrivalDate | Arrival date | date | Yes |  |
| dischargePort | Discharge port | text | Yes |  |
| vesselName | Vessel | text | No |  |
| outturnQuantityKg | Outturn quantity | number | Yes | kg |
| containerCondition | Container condition | select | Yes | Intact / minor damage / reefer alarm / seal broken |
| remarks | Remarks | textarea | No |  |

### Import Customs (IMPORT_CLEARED)

[TABLE 31]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| billOfEntryNo | Bill of Entry number | text | Yes |  |
| clearanceDate | Import clearance date | date | Yes |  |
| dutyVatPaidEur | Duty and VAT paid | number | No | EUR |
| examinationStatus | Examination status | select | Yes | released / examined+released / documents verified |
| importBrokerLicence | Import broker / CHA licence | text | No |  |
| remarks | Remarks | textarea | No |  |

### Overseas Buyer (BUYER_ACCEPTANCE)

[TABLE 32]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| grnNumber | Goods receipt (GRN) number | text | Yes |  |
| receivedCondition | Received condition | select | Yes | Good / minor damage / major damage / short |
| acceptanceDate | Acceptance date | date | Yes |  |
| remarks | Remarks | textarea | No |  |

## 6.4 Mango stage forms

### Packhouse (PACKHOUSE_PROCESSED)

[TABLE 33]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| acceptedKg | Accepted quantity | number | Yes | kg |
| rejectedKg | Rejected quantity | number | Yes | kg |
| gradeBreakdown | Grade A/B/C breakdown | text | Yes | % |
| boxCount | Total box count | number | Yes |  |
| packhouseRegNumber | Packhouse registration number | text | Yes |  |

### Treatment Facility (TREATMENT_COMPLETED)

[TABLE 34]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| treatmentType | Treatment type | text | Yes | VHT / HWT |
| temperatureCelsius | Temperature | number | Yes | C |
| durationMinutes | Duration | number | Yes | min |
| coreTemperatureAchieved | Core temperature achieved | number | Yes | C |
| certificateReference | Treatment certificate reference | text | Yes |  |

### NPPO Inspector (PHYTO_CERTIFICATE_ISSUED)

[TABLE 35]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| certificateNumber | Certificate number | text | Yes |  |
| issueDate | Issue date | date | Yes |  |
| validityDate | Validity date | date | No |  |
| pestFindings | Pest findings | text | Yes | e.g. Nil |

### APEDA Officer - Certificate of Origin (COO_ISSUED)

[TABLE 36]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| certificateNumber | COO number | text | Yes |  |
| issueDate | Issue date | date | Yes |  |
| hsCode | HS code | text | Yes |  |

### APEDA Officer - Export inspection (EXPORT_INSPECTION_ISSUED)

[TABLE 37]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| certificateNumber | EIC number | text | Yes |  |
| inspectionDate | Inspection date | date | Yes |  |
| sampleSize | Sample size | number | No | kg |
| resultsSummary | Results summary | text | No |  |

### Customs (CUSTOMS_CLEARED)

[TABLE 38]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| shippingBillNumber | Shipping bill number | text | Yes |  |
| shippingBillDate | Shipping bill date | date | Yes |  |
| leoDate | LEO date | date | Yes |  |
| leoNumber | LEO number | text | Yes |  |
| icegateReference | ICEGATE reference | text | No |  |

### Cold Storage (COLD_STORAGE_ENTRY)

[TABLE 39]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| facilityName | Cold storage facility | text | Yes |  |
| targetTempMinCelsius | Min target temperature | number | Yes | C |
| targetTempMaxCelsius | Max target temperature | number | Yes | C |
| actualTempAtEntry | Actual temperature at entry | number | Yes | C |
| palletCount | Pallet count | number | Yes |  |

### Freight Forwarder (CUSTODY_TRANSFER)

[TABLE 40]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| fromOrganisation | Transferring organisation | text | Yes |  |
| toOrganisation | Receiving organisation | text | Yes |  |
| location | Location / port | text | Yes |  |
| quantityKg | Quantity | number | Yes | kg |
| conditionNotes | Condition notes | text | No |  |

### Shipping Line (VESSEL_LOADED)

[TABLE 41]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| vesselName | Vessel name | text | Yes |  |
| voyageNumber | Voyage number | text | Yes |  |
| blNumber | Bill of lading number | text | Yes |  |
| blDate | B/L date | date | No |  |
| portOfLoading | Port of loading | text | Yes |  |
| portOfDischarge | Port of discharge | text | Yes |  |
| eta | ETA | date | No |  |

### Overseas Buyer - Arrival (BUYER_ARRIVAL)

[TABLE 42]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| arrivalDate | Arrival date | date | Yes |  |
| portOfDischarge | Port of discharge | text | Yes |  |
| importInspectionFindings | Import inspection findings | text | No |  |

### Overseas Buyer - Acceptance (BUYER_ACCEPTANCE)

[TABLE 43]
| Field key | Label | Type | Required | Options / unit |
|---|---|---|---|---|
| acceptanceDate | Acceptance date | date | Yes |  |
| conditionNotes | Condition notes | text | No |  |

# 7. Workflows and rules
- Anchor everything: every create / record action submits a chain transaction and stamps chainTxHash + chainStatus on the record. The ChainBadge shows amber until the block finalises (green).
- Commodity-aware IDs: lot ids are LOT-<CODE>-YYYY-NNNN (TURM, MANGO). The code is derived from the lot commodity.
- Auto-consignment: when a turmeric lot is registered it opens a consignment so it lands in the first processing queue.
- Residue / MRL gating: a lot must pass the residue test (pesticide panel vs the chosen MRL standard) before it can move to export. Fail blocks it; conditional flags a retest.
- Two-party consensus handoff: at each custody change the receiver reviews the declared quantity and records HANDOFF_ACCEPTED (co-sign) or HANDOFF_DISPUTED. The next step is gated on acceptance.
- Status state machine: each event type maps to a resulting ShipmentStatus (Section 5). Queues are driven by status: a role sees the shipments sitting at the status it acts on.
- Compliance score + breach: a shipment carries a compliance score; a cold-chain temperature / moisture excursion sets hasBreach and records a BREACH_RECORDED transaction.
- Disputes: a buyer can open a dispute (DISPUTE_INITIATED); the exporter responds; resolution (DISPUTE_RESOLVED) carries an outcome. Evidence documents attach to the dispute.
- Certificates: documents (phyto, COO, treatment, B/L) are uploaded, hashed with SHA-256, and anchored (CERTIFICATE_ANCHORED) so the file can be verified against the ledger.
- Record permission: only a non-admin role user can record an event on a shipment, and only while it is not DELIVERED or DISPUTE_RESOLVED.

# 8. Screens
- Auth: login, refresh; invite-code farmer signup.
- Farmer portal: phone-friendly: register a batch, track its status and linked shipment.
- Exporter dashboard: metric tiles, chain-verified strip, the full book.
- Per-role dashboards: each role opens to a work queue of the items sitting at its stage, then records its step (queue -> record modal -> submit & anchor).
- Lots: list, detail, and the registration form.
- Shipments: list, kanban, and detail. Detail carries the on-chain event timeline (each row with its block), Record event, Upload certificate, and a telemetry tab for cold chain.
- Compliance: the checks and certificates required before export, per commodity.
- Disputes: open / respond / resolve.
- Chain Explorer: blocks, transactions, transaction detail, a validator map, and a consensus panel.
- IoT devices: the reefer sensors and their telemetry.
- Team / Users: participant management (super admin).
- Reports: audit-trail PDF export per shipment.
- Public Verify: a QR code opens a public verification page with the full journey, certificates and compliance scorecard - no login.
- Admin: tenants, platform settings, the compliance matrix editor.

# 9. Access and security
- Tenant isolation: every collection is scoped to a tenant; a user only ever sees their tenant.
- Role-based navigation: each role has a minimal allow-list of screens.
- Profile scoping: a user is scoped to one commodity profile; platform admin switches profiles; super admin adds user management.
- Auth: JWT access + refresh tokens; password history; sessions; login-attempt throttling.
- On-chain signing: every event is attributed to the actor wallet.
- Document integrity: files are hashed (SHA-256) and anchored so they verify against the ledger.
- Audit log: who did what, when.
- Data protection: at rest and in transit; hash-linked blocks confirmed by validator consensus so no single party can rewrite history.

# 10. Localisation, brand and delivery
- Languages: nine Indian languages: English, Hindi, Bengali, Gujarati, Kannada, Marathi, Punjabi, Tamil, Telugu.
- PWA: installable, mobile-first for field capture.
- Internal blockchain: AgroChain: no crypto, no gas, no external wallet for users.
- Brand: AgroTrace. A product of Caerulean Bytechains Private Limited, built on Cerulea.
- Links: agrotrace.cerulea.io (app), cerulea.io (platform), cbytechains.com (company).