AquaTrace
Cerulea Studio Build Spec
Broken down by Studio building block · transcribed from source, no assumptions
Caerulean Bytechains Private Limited  ·  Generated 2026-09-16
Contents

# 0. Build order
Build the blocks in this order; each depends on the ones above it. Sections 1–3 are the shared foundation, 4–7 define behaviour, 8–10 are the surface.

[TABLE 1]
| # | Block | Depends on | Why / what it produces |
|---|---|---|---|
| 1 | Enumerations | — | Closed value lists. Create first; form fields pick from them. |
| 2 | Data collections | — | Lookup registries (species, gear, destinations). Reference fields point at these. |
| 3 | AquaChain | (entities named later) | Transaction & certificate types, and chain settings (signing, blocks, consensus). Every record anchors here. |
| 4 | Roles | 1, 2 | The actors and their permissions. Reference the stages they will perform. |
| 5 | Profiles | 1–4 | Each profile = a category + an ordered stage pipeline composed from shared + new blocks. |
| 6 | Forms | 1, 2, 3 | The entities/fields captured at each stage. Fields bind to enumerations, collections and semantic roles. |
| 7 | Rules | 6 | Validation, monitoring alerts, prerequisites, handoff agreements, certificate mandates. |
| 8 | Screens | 4–7 | The pages that render the forms, work queue, records, chain explorer and public verify. |
| 9 | Access & security | 4 | RBAC, tenant isolation, auth (JWT/MFA), key custody, validator consensus. |
| 10 | Localisation / brand / links | 5 | Locales, per-profile terminology & palette, public URLs and QR links. |

# 1. Enumerations
Closed value lists a form field selects from (field type "enum"). 27 distinct enumerations. "Scope" shows which profile(s) use it.

### ARRIVAL_PORTS   Shared · 9 values · used by: shipping_event.arrival_port

[TABLE 2]
| Value | Label |
|---|---|
| rotterdam | Port of Rotterdam, Netherlands |
| ny_nj | Port of New York and New Jersey, United States |
| shanghai | Port of Shanghai, China |
| singapore | Port of Singapore |
| tokyo | Port of Tokyo, Japan |
| jebel_ali | Jebel Ali Port, Dubai |
| hamburg | Port of Hamburg, Germany |
| busan | Port of Busan, South Korea |
| felixstowe | Port of Felixstowe, United Kingdom |

### BORDER_POSTS   Shared · 6 values · used by: import_event.border_control_post

[TABLE 3]
| Value | Label |
|---|---|
| fda_newark | FDA import entry, Newark, United States |
| bcp_rotterdam | Border Control Post, Rotterdam, European Union |
| gacc_shanghai | GACC inspection, Shanghai, China |
| sfa_singapore | SFA checkpoint, Singapore |
| mhlw_tokyo | MHLW imported food inspection, Tokyo, Japan |
| dm_dubai | Dubai Municipality food control |

### CARRIER_FLAGS   Wild · 8 values · used by: transhipment_event.carrier_flag

[TABLE 4]
| Value | Label |
|---|---|
| india | India |
| sri_lanka | Sri Lanka |
| oman | Oman |
| iran | Iran |
| thailand | Thailand |
| myanmar | Myanmar |
| singapore | Singapore |
| panama | Panama |

### CARRIERS   Shared · 5 values · used by: shipping_event.vessel_name

[TABLE 5]
| Value | Label |
|---|---|
| bluewave | BlueWave Container Line |
| meridian | Meridian Ocean Lines |
| seabridge | SeaBridge Shipping |
| coralstar | CoralStar Reefer Line |
| transindus | TransIndus Maritime |

### CATCH_AREAS   Wild · 6 values · used by: fishing_trip.catch_area

[TABLE 6]
| Value | Label |
|---|---|
| fao51_arabian_sea | Arabian Sea (FAO area 51, Western Indian Ocean) |
| fao51_lakshadweep | Lakshadweep Sea (FAO area 51) |
| fao57_bay_of_bengal | Bay of Bengal (FAO area 57, Eastern Indian Ocean) |
| fao57_andaman | Andaman and Nicobar waters (FAO area 57) |
| fao51_gulf_of_kutch | Gulf of Kutch (FAO area 51) |
| fao57_palk_bay | Palk Bay and Gulf of Mannar (FAO area 57) |

### CUSTOMS_BROKERS   Shared · 5 values · used by: customs_event.customs_broker

[TABLE 7]
| Value | Label |
|---|---|
| harbourgate | Harbourgate Clearing Agents |
| trident | Trident Customs House Agents |
| anchorline | Anchorline Logistics |
| sagarclear | Sagar Clearing Services |
| portway | Portway Customs House Agents |

### DISTRIBUTORS   Shared · 8 values · used by: distribution_event.distributor_name

[TABLE 8]
| Value | Label |
|---|---|
| north_atlantic | North Atlantic Seafoods |
| harvesttable | HarvestTable Distribution |
| freshline | FreshLine Foodservice |
| coldcrest | ColdCrest Distributors |
| bayfront | Bayfront Repackers |
| seasupply | SeaSupply Partners |
| oriental_dist | Oriental Bay Distribution |
| gulf_fresh | Gulf Fresh Logistics |

### FISHING_HARBOURS   Wild · 10 values · used by: landing_event.landing_location

[TABLE 9]
| Value | Label |
|---|---|
| visakhapatnam_fh | Visakhapatnam Fishing Harbour, Andhra Pradesh |
| kochi_fh | Kochi Fisheries Harbour (Thoppumpady), Kerala |
| chennai_fh | Kasimedu Fishing Harbour, Chennai |
| mangalore_fh | Mangalore Fishing Harbour (Bunder), Karnataka |
| veraval_fh | Veraval Fishing Harbour, Gujarat |
| sassoon_dock | Sassoon Dock, Mumbai |
| paradip_fh | Paradip Fishing Harbour, Odisha |
| tuticorin_fh | Tuticorin Fishing Harbour, Tamil Nadu |
| digha_fh | Digha Mohana Fishing Harbour, West Bengal |
| ratnagiri_fh | Ratnagiri Fishing Harbour, Maharashtra |

### LOADING_PORTS   Shared · 9 values · used by: customs_event.port_of_loading, shipping_event.departure_port

[TABLE 10]
| Value | Label |
|---|---|
| visakhapatnam | Visakhapatnam Port, Andhra Pradesh |
| jnpt | Jawaharlal Nehru Port (Nhava Sheva), Navi Mumbai |
| kochi | Cochin Port, Kochi |
| chennai | Chennai Port, Tamil Nadu |
| kolkata | Kolkata Port (Syama Prasad Mookerjee) |
| tuticorin | V O Chidambaranar Port, Tuticorin |
| krishnapatnam | Krishnapatnam Port, Andhra Pradesh |
| pipavav | Pipavav Port, Gujarat |
| mangalore | New Mangalore Port, Karnataka |

### OVERSEAS_BUYERS   Shared · 11 values · used by: consignment.buyer, import_event.importer_name

[TABLE 11]
| Value | Label |
|---|---|
| north_atlantic | North Atlantic Seafoods |
| meridian_foods | Meridian Foods International |
| ocean_harvest | Ocean Harvest Trading |
| bluecrest | BlueCrest Seafood Imports |
| pacific_gate | Pacific Gate Foods |
| nordic_waters | Nordic Waters A/S |
| sakura_marine | Sakura Marine Foods |
| oriental_bay | Oriental Bay Seafood |
| gulf_pearl | Gulf Pearl Foods |
| everfresh | EverFresh Global |
| marbella | Marbella Seafood Group |

### RESIDUE_SUBSTANCES   Shared · 11 values · used by: lab_report.substance

[TABLE 12]
| Value | Label |
|---|---|
| chloramphenicol | Chloramphenicol |
| nitrofuran_aoz | Nitrofuran metabolite AOZ (furazolidone) |
| nitrofuran_amoz | Nitrofuran metabolite AMOZ (furaltadone) |
| nitrofuran_ahd | Nitrofuran metabolite AHD (nitrofurantoin) |
| nitrofuran_sem | Nitrofuran metabolite SEM (nitrofurazone) |
| malachite_green | Malachite green and leucomalachite green |
| oxytetracycline | Oxytetracycline |
| tetracycline | Tetracycline |
| enrofloxacin | Enrofloxacin and ciprofloxacin |
| metronidazole | Metronidazole (nitroimidazole) |
| sulphonamides | Sulphonamides (total) |

### RETAILERS   Shared · 10 values · used by: retail_event.retailer_name

[TABLE 13]
| Value | Label |
|---|---|
| greenbasket | GreenBasket Supermarkets |
| marlinmart | MarlinMart |
| freshco | FreshCo Stores |
| harbourfoods | Harbour Foods |
| metromart | MetroMart Wholesale |
| valuecart | ValueCart Club |
| dailyfresh | DailyFresh Retail |
| seaside_market | Seaside Market |
| orientmart | OrientMart |
| gulf_super | Gulf Superstore |

### SCREENING_METHODS   Farmed · 5 values · used by: broodstock_event.screening_method, hatchery_event.screening_method

[TABLE 14]
| Value | Label |
|---|---|
| realtime_pcr | Real-time PCR (qPCR) |
| nested_pcr | Nested PCR |
| conventional_pcr | Conventional PCR |
| histopathology | Histopathology |
| bioassay | Bioassay challenge |

### SEED_SCREENING_RESULT   Farmed · 4 values · used by: hatchery_event.seed_screening_result

[TABLE 15]
| Value | Label |
|---|---|
| clear | Clear, no listed pathogen detected |
| detected | Pathogen detected, lot held |
| pending | Result pending |
| not_tested | Not tested |

### SPF_PANELS   Farmed · 5 values · used by: broodstock_event.spf_panel, hatchery_event.pathogen_panel

[TABLE 16]
| Value | Label |
|---|---|
| woah_penaeid_full | WOAH penaeid panel (WSSV, IHHNV, TSV, YHV, IMNV, NHP, DIV1) |
| caa_core | CAA core panel (WSSV, IHHNV, MBV, HPV) |
| wssv_ehp_ahpnd | WSSV, EHP and AHPND (VpAHPND) panel |
| wssv_ihhnv | WSSV and IHHNV only |
| mrnv_panel | Scampi panel (MrNV, XSV, WSSV) |

### SPF_STATUS   Farmed · 5 values · used by: broodstock_event.spf_status, hatchery_event.broodstock_health_status

[TABLE 17]
| Value | Label |
|---|---|
| spf | Specific Pathogen Free (SPF) |
| spr | Specific Pathogen Resistant (SPR) |
| spt | Specific Pathogen Tolerant (SPT) |
| high_health | High health, screened but not SPF certified |
| not_certified | Not certified |

### TESTING_LABORATORIES   Farmed + Shared · 6 values · used by: lab_report.laboratory, broodstock_event.screening_laboratory, hatchery_event.screening_laboratory

[TABLE 18]
| Value | Label |
|---|---|
| eia_kochi | Export Inspection Agency Laboratory, Kochi |
| eia_visakhapatnam | Export Inspection Agency Laboratory, Visakhapatnam |
| mpeda_nellore | MPEDA Quality Control Laboratory, Nellore |
| coastal_analytics | Coastal Analytical Labs, Bengaluru |
| blueleaf_labs | BlueLeaf Testing Laboratory, Chennai |
| meridian_labs | Meridian Food Testing, Mumbai |

### WELFARE_STANDARDS   Shared · 8 values · used by: processing_batch.human_welfare_standard

[TABLE 19]
| Value | Label |
|---|---|
| sa8000 | SA8000 Social Accountability |
| bap | Best Aquaculture Practices (BAP) |
| brcgs | BRCGS Food Safety |
| sedex_smeta | SEDEX SMETA |
| bsci | amfori BSCI |
| msc_coc | MSC Chain of Custody |
| iso22000 | ISO 22000 |
| none | None declared |

### crop_cycle.farming_method   Farmed · 3 values · used by: crop_cycle.farming_method

[TABLE 20]
| Value | Label |
|---|---|
| brackishwater_pond | Brackishwater pond |
| freshwater_pond | Freshwater pond |
| cage | Cage culture |

### fishing_trip.position_source   Wild · 4 values · used by: fishing_trip.position_source

[TABLE 21]
| Value | Label |
|---|---|
| voyage_report | Voyage reporting under a Letter of Authorisation |
| satellite | Satellite position record |
| harbour_register | Harbour entry and exit register |
| skipper_entry | Skipper entry at landing |

### handling_event.operation   Shared · 5 values · used by: handling_event.operation

[TABLE 22]
| Value | Label |
|---|---|
| deheading | De-heading |
| grading | Grading |
| peeling | Peeling |
| washing | Washing |
| cleaning | Cleaning |

### harvest_event.farming_method   Farmed · 3 values · used by: harvest_event.farming_method

[TABLE 23]
| Value | Label |
|---|---|
| brackishwater_pond | Brackishwater pond |
| freshwater_pond | Freshwater pond |
| cage | Cage culture |

### hatchery_event.post_larval_stage   Farmed · 5 values · used by: hatchery_event.post_larval_stage

[TABLE 24]
| Value | Label |
|---|---|
| pl8 | PL8 |
| pl10 | PL10 |
| pl12 | PL12 |
| pl15 | PL15 |
| pl20 | PL20 |

### input_application_event.input_type   Farmed · 5 values · used by: input_application_event.input_type

[TABLE 25]
| Value | Label |
|---|---|
| feed | Pelleted feed |
| probiotic | Probiotic |
| mineral | Mineral or conditioner |
| therapeutant | Therapeutant |
| health_product | Health product |

### lot_transform_event.operation   Shared · 2 values · used by: lot_transform_event.operation

[TABLE 26]
| Value | Label |
|---|---|
| split | Split (one lot to several) |
| merge | Merge (several lots to one) |

### lot_transform_event.unit   Shared · 4 values · used by: lot_transform_event.unit

[TABLE 27]
| Value | Label |
|---|---|
| kg | Kilograms (kg) |
| tonne | Tonnes |
| count | Count (pieces) |
| carton | Cartons |

### processing_plant.approval_scope   Shared · 5 values · used by: processing_plant.approval_scope

[TABLE 28]
| Value | Label |
|---|---|
| eu_listed | European Union listed |
| us_fda | United States FDA |
| china_gacc | China GACC registered |
| multi_market | Multiple markets |
| domestic_only | Domestic market only |

# 2. Data collections
Lookup registries a form field points at (field type "reference", via a collection key). Item sets are per profile.

### species   Farmed + Wild
Farmed:

[TABLE 29]
| Key | Label | Attributes |
|---|---|---|
| vannamei | Pacific white shrimp (Penaeus vannamei) | scientific: Penaeus vannamei |
| monodon | Black tiger shrimp (Penaeus monodon) | scientific: Penaeus monodon |
| scampi | Freshwater scampi (Macrobrachium rosenbergii) | scientific: Macrobrachium rosenbergii |
| seabass | Asian seabass | scientific: Lates calcarifer |
| tilapia | Tilapia | scientific: Oreochromis niloticus |
Wild:

[TABLE 30]
| Key | Label | Attributes |
|---|---|---|
| squid | Squid | group: cephalopod |
| cuttlefish | Cuttlefish | group: cephalopod |
| octopus | Octopus | group: cephalopod |
| indian_mackerel | Indian mackerel | group: small_pelagic |
| oil_sardine | Oil sardine | group: small_pelagic |
| anchovy | Anchovy | group: small_pelagic |
| threadfin_bream | Threadfin bream | group: demersal |
| ribbonfish | Ribbonfish | group: demersal |
| croaker | Croaker | group: demersal |
| wild_shrimp | Wild caught shrimp | group: shrimp |

### product_forms   Farmed + Wild
Farmed:

[TABLE 31]
| Key | Label | Attributes |
|---|---|---|
| hoso | Head-on shell-on (HOSO) |  |
| hlso | Headless shell-on (HLSO) |  |
| pd | Peeled and deveined (PD) |  |
| pud | Peeled undeveined (PUD) |  |
| cooked | Cooked |  |
| value_added | Value added |  |
Wild:

[TABLE 32]
| Key | Label | Attributes |
|---|---|---|
| whole | Whole |  |
| headed | Headed |  |
| gutted | Gutted |  |
| cleaned | Cleaned |  |
| fillet | Fillet |  |

### count_grades   Farmed

[TABLE 33]
| Key | Label | Attributes |
|---|---|---|
| u15 | Under 15 |  |
| 16_20 | 16 to 20 |  |
| 21_25 | 21 to 25 |  |
| 26_30 | 26 to 30 |  |
| 31_40 | 31 to 40 |  |
| 41_50 | 41 to 50 |  |
| 51_60 | 51 to 60 |  |

### destinations   Farmed + Wild
Farmed:

[TABLE 34]
| Key | Label | Attributes |
|---|---|---|
| united_states | United States |  |
| european_union | European Union |  |
| china | China |  |
| south_east_asia | South East Asia |  |
| japan | Japan |  |
| middle_east | Middle East |  |
Wild:

[TABLE 35]
| Key | Label | Attributes |
|---|---|---|
| united_states | United States |  |
| european_union | European Union |  |
| china | China |  |
| south_east_asia | South East Asia |  |
| japan | Japan |  |
| middle_east | Middle East |  |

### vessel_classes   Wild

[TABLE 36]
| Key | Label | Attributes |
|---|---|---|
| mechanised | Mechanised | landings_share: 82 |
| motorised | Motorised | landings_share: 17 |
| artisanal | Artisanal | landings_share: 1 |

### gear_types   Wild

[TABLE 37]
| Key | Label | Attributes |
|---|---|---|
| trawl_net | Trawl net |  |
| bag_net | Bag net |  |
| seine | Seine |  |
| gill_net | Gill net |  |
| ring_seine | Ring seine |  |
| hand_line | Hand line |  |

# 3. AquaChain
The permissioned ledger every record anchors to. Below: the chain settings, the transaction types (event kinds), and the certificate types.

## 3.1  Chain settings & mechanics

[TABLE 38]
| Setting / mechanism | Value / behaviour |
|---|---|
| Signing | Each event is signed with the acting party’s own ed25519 key (blockchain/keys.ts). |
| Hashing | SHA-256 over the canonical event payload. |
| Block structure | Transactions batched into a block with a Merkle root; each block carries previousHash → blockHash (hash-linked chain). |
| Block production | A producer node seals a block every BLOCK_INTERVAL_MS (default 5000 ms) when transactions are pending (blockchain/producer.ts). |
| Validator set | CONSENSUS_VALIDATOR_COUNT validator nodes (default 5) co-sign each block (blockchain/nodes.ts). |
| Finality threshold | A block finalises at CONSENSUS_THRESHOLD signatures (default 4 of 5). |
| Key custody | Each actor holds an ed25519 keypair; the private key is encrypted at rest with CHAIN_MASTER_KEY (32-byte / 64-hex master key). |
| Two-party handoff | On a custody transfer the unit enters AWAITING_ACCEPTANCE; the receiver co-signs (ACCEPTED) or opens a dispute (DISPUTED). |
| On-chain entities | Entities flagged anchoredOnChain are written to the ledger: organisation, processing_plant, processing_batch, lab_report, handling_event, transport_event, ship_receive_event, lot_transform_event, consignment, certificate, document_anchor, customs_event, shipping_event, import_event, distribution_event, retail_event, crop_cycle, broodstock_event, hatchery_event, input_application_event, growout_reading, sampling_event, harvest_event, fishing_trip, onvessel_processing_event, transhipment_event, landing_event, auction_event. |
| Explorer | A public/authenticated explorer shows finalized blocks, confirmed & pending transactions, the head block, and re-verifies the chain end to end (blockchain/explorer.ts). |

## 3.2  Transaction types (on-chain event kinds)

[TABLE 39]
| Scope | Key | Label | Category | Anchors entity |
|---|---|---|---|---|
| Shared | tx_register | Register organisation | register | organisation |
| Shared | tx_register_plant | Register processing plant | register | processing_plant |
| Shared | tx_processing | Record processing batch | event | processing_batch |
| Shared | tx_cold_storage | Record freezing and cold storage | event | processing_batch |
| Shared | tx_lab_result | Record laboratory result | event | lab_report |
| Shared | tx_handling | Record handling site event | event | handling_event |
| Shared | tx_transport | Record transport leg | event | transport_event |
| Shared | tx_ship_receive | Ship and receive | handoff | ship_receive_event |
| Shared | tx_split | Split lot | split | lot_transform_event |
| Shared | tx_merge | Merge lots | merge | lot_transform_event |
| Shared | tx_consignment | Assemble consignment | event | consignment |
| Shared | tx_customs | Record customs clearance | event | customs_event |
| Shared | tx_shipping | Record ocean freight leg | event | shipping_event |
| Shared | tx_import | Record import clearance | event | import_event |
| Shared | tx_distribution | Record distribution | event | distribution_event |
| Shared | tx_retail | Record retail delivery | event | retail_event |
| Shared | tx_certificate | Issue certificate | certificate |
| Shared | tx_document_anchor | Anchor document | document_anchor |
| Farmed | tx_broodstock | Create broodstock lot | origin_create | broodstock_event |
| Farmed | tx_hatchery | Record hatchery seed production | event | hatchery_event |
| Farmed | tx_stocking | Record pond stocking | event | crop_cycle |
| Farmed | tx_input_application | Record input application | event | input_application_event |
| Farmed | tx_growout | Record grow-out reading | event | growout_reading |
| Farmed | tx_sampling | Record pre-harvest sample | event | sampling_event |
| Farmed | tx_harvest | Record harvest | event | harvest_event |
| Wild | tx_fishing | Record fishing event | origin_create | fishing_trip |
| Wild | tx_onvessel_processing | Record on-vessel processing | event | onvessel_processing_event |
| Wild | tx_transhipment | Record transhipment | event | transhipment_event |
| Wild | tx_landing | Record landing | event | landing_event |
| Wild | tx_auction | Record auction and first sale | merge | auction_event |

## 3.3  Certificate types

[TABLE 40]
| Scope | Key | Label | Anchors | Issuer kind | Issuer | Mand. | Applies / validity |
|---|---|---|---|---|---|---|---|
| Shared | cert_establishment | Establishment approval | processing_plant | regulator | eia | yes |  |
| Shared | cert_health | Health certificate | consignment | regulator | eia | yes |  |
| Shared | cert_origin | Certificate of origin | consignment | regulator | eic | yes |  |
| Farmed | cert_caa_unit | Coastal aquaculture unit registration | crop_cycle | regulator | caa | yes |  |
| Farmed | cert_mpeda_enrolment | MPEDA farm enrolment | crop_cycle | regulator | mpeda | no | dest: european_union |
| Farmed | cert_coc_inputs | Certificate of Compliance for antibiotic free inputs | input_application_event | regulator | caa | yes |  |
| Farmed | cert_shaphari | SHAPHARI certification | crop_cycle | regulator | mpeda | no |  |
| Farmed | cert_fssai | FSSAI licence | processing_plant | regulator | fssai | yes |  |
| Wild | cert_vessel_registration | Vessel Registration Certificate | fishing_trip | regulator | realcraft | yes |  |
| Wild | cert_fishing_licence | Fishing Licence Certificate | fishing_trip | regulator | state_fisheries | yes |  |
| Wild | cert_letter_authorisation | Letter of Authorisation (high seas) | fishing_trip | regulator | dof | no |  |
| Wild | cert_catch | Catch certificate | consignment | regulator | dof | yes | dest: european_union |
| Wild | cert_msc | Marine Stewardship Council certification | fishing_trip | regulator | msc | no |  |
| Wild | cert_fssai_wild | FSSAI licence | processing_plant | regulator | fssai | yes |  |

# 4. Roles
All actors and their permissions. Platform roles (admin, super-admin) are covered in §9. Read-only roles never advance the workflow.

[TABLE 41]
| Scope | Key | Label | R/O | Stages performed | Permissions (action · entity) |
|---|---|---|---|---|---|
| Shared | plant_quality_manager | Plant quality manager |  | stage_processing / stage_freezing_cold_storage | record_event · processing_batch / create · lab_report / record_event · lab_report / accept_handoff · ship_receive_event / flag_discrepancy · ship_receive_event / record_event · lot_transform_event / read · * |
| Shared | exporter_administrator | Exporter administrator |  | stage_export_documentation | record_event · consignment / issue_certificate · certificate / record_event · document_anchor / read · * |
| Shared | customs_broker | Customs broker |  | stage_customs | accept_handoff · ship_receive_event / flag_discrepancy · ship_receive_event / record_event · customs_event / read · * |
| Shared | transporter | Reefer logistics operator |  | stage_shipping | accept_handoff · ship_receive_event / flag_discrepancy · ship_receive_event / record_event · shipping_event / record_event · transport_event / read · * |
| Shared | importer | Importer |  | stage_import | accept_handoff · ship_receive_event / flag_discrepancy · ship_receive_event / record_event · import_event / read · * |
| Shared | distributor | Distributor or repacker |  | stage_distribution | accept_handoff · ship_receive_event / flag_discrepancy · ship_receive_event / record_event · distribution_event / read · * |
| Shared | retailer | Retailer or food service buyer |  | stage_retail | accept_handoff · ship_receive_event / flag_discrepancy · ship_receive_event / record_event · retail_event / read · * |
| Shared | agent_dealer | Agent or dealer |  | — | accept_handoff · ship_receive_event / flag_discrepancy · ship_receive_event / record_event · ship_receive_event / record_event · lot_transform_event / read · * |
| Shared | regulator_auditor | Regulator or auditor | yes | — | verify · * |
| Farmed | broodstock_multiplication_centre | Broodstock multiplication centre |  | stage_broodstock | create · broodstock_event / read · * |
| Farmed | hatchery_operator | Hatchery operator |  | stage_hatchery | accept_handoff · broodstock_event / flag_discrepancy · broodstock_event / record_event · hatchery_event / read · * |
| Farmed | farmer | Farmer |  | stage_stocking / stage_input_application / stage_growout / stage_sampling / stage_harvest | accept_handoff · hatchery_event / flag_discrepancy · hatchery_event / record_event · crop_cycle / record_event · input_application_event / record_event · growout_reading / record_event · sampling_event / record_event · harvest_event / read · * |
| Farmed | preprocessing_operator | Pre-processing operator |  | stage_preprocessing | accept_handoff · ship_receive_event / flag_discrepancy · ship_receive_event / record_event · handling_event / record_event · lot_transform_event / read · * |
| Farmed | dealer_trader | Dealer or trader |  | stage_farm_gate_receipt | accept_handoff · ship_receive_event / flag_discrepancy · ship_receive_event / record_event · ship_receive_event / record_event · lot_transform_event / read · * |
| Farmed | nucleus_breeding_centre | Nucleus breeding centre |  | — | read · * |
| Farmed | seed_agent | Seed agent |  | — | read · * |
| Farmed | feed_manufacturer | Feed manufacturer |  | — | read · * |
| Farmed | input_dealer | Feed and input dealer |  | — | read · * |
| Farmed | aqua_technician | Aqua technician |  | — | read · * |
| Farmed | pond_lessor | Pond lessor |  | — | read · * |
| Farmed | harvest_contractor | Harvest contractor |  | — | read · * |
| Farmed | commission_agent | Commission agent |  | — | read · * |
| Farmed | buying_agent | Buying agent |  | — | read · * |
| Wild | skipper | Skipper |  | stage_fishing / stage_onvessel_processing / stage_transhipment / stage_landing | create · fishing_trip / record_event · onvessel_processing_event / record_event · transhipment_event / record_event · landing_event / read · * |
| Wild | auctioneer | Auctioneer |  | stage_auction | accept_handoff · ship_receive_event / record_event · auction_event / record_event · lot_transform_event / read · * |
| Wild | assembler_supplier | Assembler or supplier |  | stage_assembly | accept_handoff · ship_receive_event / flag_discrepancy · ship_receive_event / record_event · ship_receive_event / record_event · lot_transform_event / read · * |
| Wild | wholesaler | Wholesaler |  | stage_wholesale | accept_handoff · ship_receive_event / flag_discrepancy · ship_receive_event / record_event · ship_receive_event / read · * |
| Wild | cleaning_operator | Cleaning and pre-processing operator |  | stage_cleaning | accept_handoff · ship_receive_event / flag_discrepancy · ship_receive_event / record_event · handling_event / record_event · lot_transform_event / read · * |
| Wild | boat_owner | Boat owner |  | — | read · * |
| Wild | financier | Financier |  | — | read · * |
| Wild | ice_fuel_supplier | Ice plant and fuel supplier |  | — | read · * |
| Wild | commission_agent | Commission agent |  | — | read · * |
| Wild | buying_agent | Buying agent |  | — | read · * |

# 5. Profiles
Each profile is a category with an ordered stage pipeline, composed from shared + profile-specific blocks. Stages below are the fully ordered pipeline (base + new), with the transaction each emits, its prerequisite, the form entity, and the handoff to the next role.

## Farmed Aquaculture  (farmed)
Key: farmed_aquaculture     Version: 1     Origin-unit entity: broodstock_event     Name locales: en=Farmed Aquaculture, te=saagaru saagu

[TABLE 42]
| Order | Stage key | Label | Role | Emits | Requires | Form entity | Handoff → role (declared) · repeat |
|---|---|---|---|---|---|---|---|
| 10 | stage_broodstock | Broodstock lot supply | broodstock_multiplication_centre | tx_broodstock | — | broodstock_event | → hatchery_operator (broodstock_lot, species) |
| 20 | stage_hatchery | Hatchery seed production | hatchery_operator | tx_hatchery | tx_broodstock | hatchery_event | → farmer (seed_lot, seed_quantity) |
| 30 | stage_stocking | Pond stocking | farmer | tx_stocking | tx_hatchery | crop_cycle | no handoff |
| 40 | stage_input_application | Feed and input application | farmer | tx_input_application | tx_stocking | input_application_event | no handoff / repeatable |
| 50 | stage_growout | Grow-out | farmer | tx_growout | tx_stocking | growout_reading | no handoff / repeatable |
| 60 | stage_sampling | Pre-harvest sampling | farmer | tx_sampling | tx_stocking | sampling_event | no handoff / repeatable |
| 70 | stage_harvest | Harvest and farm-gate sale | farmer | tx_harvest | tx_stocking | harvest_event | → dealer_trader (harvest_weight, count_grade) |
| 75 | stage_farm_gate_receipt | Dealer receipt and dispatch | dealer_trader | tx_ship_receive | tx_harvest | ship_receive_event | → preprocessing_operator (quantity) |
| 80 | stage_preprocessing | Pre-processing | preprocessing_operator | tx_handling | tx_ship_receive | handling_event | → plant_quality_manager (output_lot_ref) |
| 100 | stage_processing | Processing plant | plant_quality_manager | tx_processing | — | processing_batch | no handoff |
| 110 | stage_freezing_cold_storage | Freezing and cold storage | plant_quality_manager | tx_cold_storage | tx_processing | processing_batch | → exporter_administrator (finished_weight) |
| 120 | stage_export_documentation | Export documentation | exporter_administrator | tx_consignment | tx_cold_storage | consignment | → customs_broker (total_weight) |
| 130 | stage_customs | Customs clearance | customs_broker | tx_customs | tx_consignment | customs_event | → transporter (shipping_bill_number) |
| 140 | stage_shipping | Ocean freight | transporter | tx_shipping | tx_customs | shipping_event | → importer (container_number) |
| 150 | stage_import | Import clearance | importer | tx_import | tx_shipping | import_event | → distributor (import_entry_number) |
| 160 | stage_distribution | Distribution | distributor | tx_distribution | tx_import | distribution_event | → retailer (quantity) |
| 170 | stage_retail | Retail delivery | retailer | tx_retail | tx_distribution | retail_event | no handoff |

## Wild Capture  (wild)
Key: wild_capture     Version: 1     Origin-unit entity: fishing_trip     Name locales: en=Wild Capture, ta=kaadu meen pidippu

[TABLE 43]
| Order | Stage key | Label | Role | Emits | Requires | Form entity | Handoff → role (declared) · repeat |
|---|---|---|---|---|---|---|---|
| 10 | stage_fishing | Fishing trip | skipper | tx_fishing | — | fishing_trip | no handoff |
| 20 | stage_onvessel_processing | On-vessel processing | skipper | tx_onvessel_processing | tx_fishing | onvessel_processing_event | no handoff / repeatable |
| 30 | stage_transhipment | Transhipment | skipper | tx_transhipment | tx_fishing | transhipment_event | no handoff / repeatable |
| 40 | stage_landing | Landing | skipper | tx_landing | tx_fishing | landing_event | → auctioneer (landed_weight) |
| 50 | stage_auction | Auction and first sale | auctioneer | tx_auction | tx_landing | auction_event | → assembler_supplier (weight) |
| 60 | stage_assembly | Assembly and consolidation | assembler_supplier | tx_ship_receive | tx_auction | ship_receive_event | → wholesaler (quantity) |
| 70 | stage_wholesale | Wholesale holding | wholesaler | tx_ship_receive | ship_receive_event | → cleaning_operator (quantity) |
| 80 | stage_cleaning | Cleaning and pre-processing | cleaning_operator | tx_handling | tx_ship_receive | handling_event | → plant_quality_manager (output_lot_ref) |
| 100 | stage_processing | Processing plant | plant_quality_manager | tx_processing | — | processing_batch | no handoff |
| 110 | stage_freezing_cold_storage | Freezing and cold storage | plant_quality_manager | tx_cold_storage | tx_processing | processing_batch | → exporter_administrator (finished_weight) |
| 120 | stage_export_documentation | Export documentation | exporter_administrator | tx_consignment | tx_cold_storage | consignment | → customs_broker (total_weight) |
| 130 | stage_customs | Customs clearance | customs_broker | tx_customs | tx_consignment | customs_event | → transporter (shipping_bill_number) |
| 140 | stage_shipping | Ocean freight | transporter | tx_shipping | tx_customs | shipping_event | → importer (container_number) |
| 150 | stage_import | Import clearance | importer | tx_import | tx_shipping | import_event | → distributor (import_entry_number) |
| 160 | stage_distribution | Distribution | distributor | tx_distribution | tx_import | distribution_event | → retailer (quantity) |
| 170 | stage_retail | Retail delivery | retailer | tx_retail | tx_distribution | retail_event | no handoff |

# 6. Forms
Every entity is a capture form. Fields bind to an enumeration (§1), a data collection (§2), or a typed value. "Semantic role" is how the engine treats the field generically. Stage(s) that use each form are shown.

### Organisation  (organisation)   Shared · on-chain
Used at stage(s): (not a stage form)    ·    plural: Organisations

[TABLE 44]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | legal_name | Legal name | yes | text | party_identifier |
| 2 | party_gln | Party global location number | no | text | party_identifier |
| 3 | iec_code | Importer Exporter Code | no | text | operating_licence |
| 4 | address | Registered address | no | multiline | origin_attribute |

### Processing plant  (processing_plant)   Shared · on-chain
Used at stage(s): (not a stage form)    ·    plural: Processing plants

[TABLE 45]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | plant_name | Plant name | yes | text | party_identifier |
| 2 | establishment_number | Establishment approval number | yes | text | operating_licence |
| 3 | location | Plant location | no | geo_point | geo_position |
| 4 | approval_scope | Approval market scope | no | enum → processing_plant.approval_scope | certification_status |

### Processing batch  (processing_batch)   Shared · on-chain
Used at stage(s): stage_processing, stage_freezing_cold_storage    ·    plural: Processing batches

[TABLE 46]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | batch_number | Production batch number | yes | text | batch_identifier |
| 2 | input_lot_ref | Input lot | yes | text | parent_lot_ref |
| 3 | species | Species | yes | collection → species | species |
| 4 | product_form | Product form | yes | collection → product_forms | product_form |
| 5 | raw_weight | Raw weight | yes | quantity (min 0, unit kg) | weight |
| 6 | finished_weight | Finished weight | yes | quantity (min 0, unit kg) | weight |
| 7 | yield_factor | Yield factor | no | number (min 0, max 1) | yield_factor |
| 8 | production_date | Production date | yes | date | event_date |
| 9 | operating_licence | Operating licence | no | text | operating_licence |
| 10 | human_welfare_policy | Human welfare policy in force | yes | boolean | human_welfare_indicator |
| 11 | human_welfare_standard | Human welfare standard claimed | no | enum → WELFARE_STANDARDS | human_welfare_indicator |

### Laboratory report  (lab_report)   Shared · on-chain
Used at stage(s): (not a stage form)    ·    plural: Laboratory reports

[TABLE 47]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | sample_id | Sealed sample identifier | yes | text | lot_identifier |
| 2 | source_lot_ref | Source lot | yes | text | parent_lot_ref |
| 3 | substance | Substance tested | yes | enum → RESIDUE_SUBSTANCES | origin_attribute |
| 4 | residue_value | Residue reading | yes | number (min 0, unit ug/kg) | residue_metric |
| 5 | residue_limit | Maximum residue limit | yes | number (min 0, unit ug/kg) | compliance_limit |
| 6 | result_pass | Within limit | yes | boolean | certification_status |
| 7 | tested_on | Test date | yes | date | event_date |
| 8 | laboratory | Testing laboratory | yes | enum → TESTING_LABORATORIES | party_identifier |

### Handling site event  (handling_event)   Shared · on-chain
Used at stage(s): stage_preprocessing, stage_cleaning    ·    plural: Handling site events

[TABLE 48]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | site_id | Site identifier | yes | text | location_identifier |
| 2 | site_position | Site position | yes | geo_point | geo_position |
| 3 | approval_number | Government approval number | yes | text | operating_licence |
| 4 | controlling_party | Controlling party | yes | text | party_identifier |
| 5 | in_audit_scope | Within current audit scope | yes | boolean | certification_status |
| 6 | operation | Operation performed | yes | enum → handling_event.operation | origin_attribute |
| 7 | input_lot_ref | Input lot | yes | text | parent_lot_ref |
| 8 | output_lot_ref | Output lot | yes | text | child_lot_ref |

### Transport leg  (transport_event)   Shared · on-chain
Used at stage(s): (not a stage form)    ·    plural: Transport legs

[TABLE 49]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | lot_ref | Lot moved | yes | text | lot_identifier |
| 2 | from_location | Departure location | yes | text | location_identifier |
| 3 | to_location | Arrival location | yes | text | location_identifier |
| 4 | departure_time | Departure time | yes | datetime | event_date |
| 5 | arrival_time | Arrival time | yes | datetime | event_date |
| 6 | logger_fitted | Temperature logger fitted | yes | boolean | origin_attribute |
| 7 | temperature_max | Highest temperature on the leg | no | number (unit C) | temperature_metric |

### Custody transfer  (ship_receive_event)   Shared · on-chain
Used at stage(s): stage_farm_gate_receipt, stage_assembly, stage_wholesale    ·    plural: Custody transfers

[TABLE 50]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | lot_ref | Lot transferred | yes | text | lot_identifier |
| 2 | source_party | Source party | yes | text | party_identifier |
| 3 | destination_party | Destination party | yes | text | party_identifier |
| 4 | quantity | Quantity transferred | yes | quantity (min 0, unit kg) | quantity |
| 5 | event_time | Transfer time | yes | datetime | event_date |

### Lot transformation  (lot_transform_event)   Shared · on-chain
Used at stage(s): (not a stage form)    ·    plural: Lot transformations

[TABLE 51]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | operation | Transformation | yes | enum → lot_transform_event.operation | origin_attribute |
| 2 | input_lots | Input lots | yes | multiline | parent_lot_ref |
| 3 | output_lots | Output lots | yes | multiline | child_lot_ref |
| 4 | unit | Unit of measure | yes | enum → lot_transform_event.unit | unit_of_measure |

### Export consignment  (consignment)   Shared · on-chain
Used at stage(s): stage_export_documentation    ·    plural: Export consignments

[TABLE 52]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | consignment_number | Consignment number | yes | text | consignment_identifier |
| 2 | destination | Destination market | yes | collection → destinations | origin_attribute |
| 3 | buyer | Buyer | yes | enum → OVERSEAS_BUYERS | party_identifier |
| 4 | input_lots | Contained lots | yes | multiline | parent_lot_ref |
| 5 | total_weight | Total net weight | yes | quantity (min 0, unit kg) | weight |
| 6 | export_date | Export date | yes | date | event_date |

### Certificate  (certificate)   Shared · on-chain
Used at stage(s): (not a stage form)    ·    plural: Certificates

[TABLE 53]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | certificate_number | Certificate number | yes | text | certificate_reference |
| 2 | anchored_lot_ref | Subject lot or entity | yes | text | lot_identifier |
| 3 | issuer | Issuing authority | yes | text | party_identifier |
| 4 | issued_on | Issue date | yes | date | event_date |
| 5 | valid_until | Valid until | no | date | event_date |
| 6 | document_digest | Document digest | yes | text | document_digest |

### Anchored document  (document_anchor)   Shared · on-chain
Used at stage(s): (not a stage form)    ·    plural: Anchored documents

[TABLE 54]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | document_number | Document number | yes | text | certificate_reference |
| 2 | document_digest | Document digest | yes | text | document_digest |
| 3 | issuer | Issuer | yes | text | party_identifier |
| 4 | valid_until | Valid until | no | date | event_date |

### Customs clearance  (customs_event)   Shared · on-chain
Used at stage(s): stage_customs    ·    plural: Customs clearances

[TABLE 55]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | consignment_ref | Consignment | yes | text | consignment_identifier |
| 2 | shipping_bill_number | Shipping bill number | yes | text | certificate_reference |
| 3 | port_of_loading | Port of loading | yes | enum → LOADING_PORTS | location_identifier |
| 4 | customs_broker | Customs broker | yes | enum → CUSTOMS_BROKERS | party_identifier |
| 5 | cleared_date | Customs cleared date | yes | date | event_date |

### Ocean freight leg  (shipping_event)   Shared · on-chain
Used at stage(s): stage_shipping    ·    plural: Ocean freight legs

[TABLE 56]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | consignment_ref | Consignment | yes | text | consignment_identifier |
| 2 | container_number | Reefer container number | yes | text | origin_attribute |
| 3 | seal_number | Container seal number | yes | text | origin_attribute |
| 4 | vessel_name | Carrier line | yes | enum → CARRIERS | party_identifier |
| 5 | bill_of_lading | Bill of lading | yes | text | certificate_reference |
| 6 | departure_port | Departure port | yes | enum → LOADING_PORTS | location_identifier |
| 7 | arrival_port | Arrival port | yes | enum → ARRIVAL_PORTS | location_identifier |
| 8 | sail_date | Sail date | yes | date | event_date |
| 9 | reefer_setpoint | Reefer set point | no | number (unit C) | temperature_metric |

### Import clearance  (import_event)   Shared · on-chain
Used at stage(s): stage_import    ·    plural: Import clearances

[TABLE 57]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | consignment_ref | Consignment | yes | text | consignment_identifier |
| 2 | border_control_post | Border control post | yes | enum → BORDER_POSTS | location_identifier |
| 3 | import_entry_number | Import entry number | yes | text | certificate_reference |
| 4 | importer_name | Importer | yes | enum → OVERSEAS_BUYERS | party_identifier |
| 5 | cleared_date | Import cleared date | yes | date | event_date |

### Distribution  (distribution_event)   Shared · on-chain
Used at stage(s): stage_distribution    ·    plural: Distributions

[TABLE 58]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | input_lot_ref | Received lot | yes | text | parent_lot_ref |
| 2 | output_lot_ref | Repacked lot | yes | text | child_lot_ref |
| 3 | distributor_name | Distributor | yes | enum → DISTRIBUTORS | party_identifier |
| 4 | quantity | Quantity | yes | quantity (min 0, unit kg) | quantity |
| 5 | relabel_date | Repack date | yes | date | event_date |

### Retail delivery  (retail_event)   Shared · on-chain
Used at stage(s): stage_retail    ·    plural: Retail deliveries

[TABLE 59]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | input_lot_ref | Received lot | yes | text | parent_lot_ref |
| 2 | retailer_name | Retailer or food service buyer | yes | enum → RETAILERS | party_identifier |
| 3 | destination_market | Destination market | yes | collection → destinations | origin_attribute |
| 4 | quantity | Quantity delivered | yes | quantity (min 0, unit kg) | quantity |
| 5 | sale_date | Delivery date | yes | date | event_date |

### Pond stocking  (crop_cycle)   Farmed · on-chain · parent: broodstock_event
Used at stage(s): stage_stocking    ·    plural: Pond stockings

[TABLE 60]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | crop_code | Crop cycle code | yes | text | lot_identifier |
| 2 | pond_id | Pond identifier | yes | text | location_identifier |
| 3 | farm_registration | Coastal aquaculture unit registration | yes | text | operating_licence |
| 4 | mpeda_enrolment | MPEDA farm enrolment number | no | text | operating_licence |
| 5 | species | Species stocked | yes | collection → species | species |
| 6 | farming_method | Farming method | yes | enum → crop_cycle.farming_method | farming_method |
| 7 | pond_position | Pond position | yes | geo_point | geo_position |
| 8 | seed_source_lot | Seed source lot | yes | text | parent_lot_ref |
| 9 | stocking_date | Stocking date | yes | date | event_date |
| 10 | seed_quantity | Seed quantity released | yes | quantity (min 0, unit count) | quantity |
| 11 | stocking_density | Stocking density | yes | number (min 0, unit per_m2) | origin_attribute |

### Broodstock lot  (broodstock_event)   Farmed · ORIGIN UNIT · on-chain
Used at stage(s): stage_broodstock    ·    plural: Broodstock lots

[TABLE 61]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | broodstock_lot | Broodstock lot code | yes | text | origin_identifier |
| 2 | source_centre | Broodstock multiplication centre | yes | text | party_identifier |
| 3 | centre_registration | Broodstock multiplication centre registration | yes | text | operating_licence |
| 4 | species | Species | yes | collection → species | species |
| 5 | spf_status | Broodstock health status (certified by breeding centre) | yes | enum → SPF_STATUS | certification_status |
| 6 | spf_panel | Pathogen panel screened | yes | enum → SPF_PANELS | certification_status |
| 7 | screening_method | Screening method | yes | enum → SCREENING_METHODS | origin_attribute |
| 8 | screening_laboratory | Screening laboratory | yes | enum → TESTING_LABORATORIES | party_identifier |
| 9 | health_certificate_number | Health certificate number | yes | text | certificate_reference |
| 10 | screened_on | Screening date | yes | date | event_date |
| 11 | broodstock_count | Number of broodstock | yes | quantity (min 0, unit count) | quantity |
| 12 | supply_date | Supply date | yes | date | event_date |

### Hatchery dispatch  (hatchery_event)   Farmed · on-chain
Used at stage(s): stage_hatchery    ·    plural: Hatchery dispatches

[TABLE 62]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | seed_lot | Post-larvae seed lot | yes | text | lot_identifier |
| 2 | broodstock_source | Broodstock source lot | yes | text | parent_lot_ref |
| 3 | tank_harvest_date | Tank harvest date | yes | date | event_date |
| 4 | hatchery_registration | Hatchery unit registration (CAA) | yes | text | operating_licence |
| 5 | post_larval_stage | Post-larval stage at dispatch | yes | enum → hatchery_event.post_larval_stage | origin_attribute |
| 6 | seed_quantity | Seed quantity | yes | quantity (min 0, unit count) | quantity |
| 7 | broodstock_health_status | Source broodstock health status | yes | enum → SPF_STATUS | certification_status |
| 8 | seed_screening_result | Seed PCR screening result | yes | enum → SEED_SCREENING_RESULT | certification_status |
| 9 | pathogen_panel | Pathogen panel tested | yes | enum → SPF_PANELS | origin_attribute |
| 10 | screening_method | Screening method | yes | enum → SCREENING_METHODS | origin_attribute |
| 11 | screening_laboratory | Testing laboratory | yes | enum → TESTING_LABORATORIES | party_identifier |
| 12 | seed_health_certificate_number | Seed health certificate number issued | yes | text | certificate_reference |
| 13 | screened_on | Seed test date | yes | date | event_date |
| 14 | destination_farm | Destination farm | yes | text | party_identifier |

### Feed and input application  (input_application_event)   Farmed · on-chain · parent: crop_cycle
Used at stage(s): stage_input_application    ·    plural: Feed and input applications

[TABLE 63]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | input_type | Input type | yes | enum → input_application_event.input_type | origin_attribute |
| 2 | product_name | Product name | yes | text | origin_attribute |
| 3 | product_batch | Product batch | yes | text | origin_attribute |
| 4 | caa_certified | On the Coastal Aquaculture Authority certified list | yes | boolean | certification_status |
| 5 | quantity | Quantity applied | yes | quantity (min 0, unit kg) | quantity |
| 6 | applied_on | Application date | yes | date | event_date |

### Grow-out reading  (growout_reading)   Farmed · on-chain · parent: crop_cycle
Used at stage(s): stage_growout    ·    plural: Grow-out readings

[TABLE 64]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | reading_date | Reading date | yes | date | event_date |
| 2 | salinity | Salinity | no | number (unit ppt) | monitoring_metric |
| 3 | dissolved_oxygen | Dissolved oxygen | no | number (unit mg/L) | monitoring_metric |
| 4 | ph | Acidity (pH) | no | number (min 0, max 14) | monitoring_metric |
| 5 | ammonia | Ammonia | no | number (unit mg/L) | monitoring_metric |
| 6 | estimated_body_weight | Estimated average body weight | no | number (unit g) | monitoring_metric |
| 7 | mortality_observed | Stress or mortality observed | yes | boolean | origin_attribute |

### Pre-harvest sampling  (sampling_event)   Farmed · on-chain · parent: crop_cycle
Used at stage(s): stage_sampling    ·    plural: Pre-harvest samplings

[TABLE 65]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | sample_id | Sealed sample identifier | yes | text | lot_identifier |
| 2 | sample_position | Position sample drawn | yes | geo_point | geo_position |
| 3 | drawn_at | Time drawn | yes | datetime | event_date |
| 4 | drawn_by | Person drawing the sample | yes | text | party_identifier |

### Harvest  (harvest_event)   Farmed · on-chain · parent: crop_cycle
Used at stage(s): stage_harvest    ·    plural: Harvests

[TABLE 66]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | harvest_lot | Harvest lot (crate code) | yes | text | lot_identifier |
| 2 | farming_method | Farming method | yes | enum → harvest_event.farming_method | farming_method |
| 3 | harvest_date | Harvest date | yes | date | harvest_date |
| 4 | harvest_weight | Harvest weight | yes | quantity (min 0, unit kg) | weight |
| 5 | count_grade | Predominant count grade | yes | collection → count_grades | quality_grade_metric |
| 6 | agreed_rate | Agreed rate | yes | number (min 0, unit INR/kg) | origin_attribute |
| 7 | deductions | Deductions | no | number (unit INR) | origin_attribute |

### Fishing trip  (fishing_trip)   Wild · ORIGIN UNIT · on-chain
Used at stage(s): stage_fishing    ·    plural: Fishing trips

[TABLE 67]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | trip_code | Trip code | yes | text | origin_identifier |
| 2 | vessel_registration | Vessel Registration Certificate number | yes | text | operating_licence |
| 3 | fishing_licence | Fishing Licence Certificate number | yes | text | operating_licence |
| 4 | letter_of_authorisation | Letter of Authorisation (high seas) | no | text | operating_licence |
| 5 | vessel_class | Vessel class | yes | collection → vessel_classes | origin_attribute |
| 6 | catch_lot | Catch lot | yes | text | lot_identifier |
| 7 | catch_area | Catch area | yes | enum → CATCH_AREAS | catch_area |
| 8 | trip_start | Trip start date | yes | date | event_date |
| 9 | trip_end | Trip end date | yes | date | event_date |
| 10 | capture_date | Capture date | yes | date | capture_date |
| 11 | gear_type | Gear type | yes | collection → gear_types | gear_type |
| 12 | species | Species | yes | collection → species | species |
| 13 | weight | Catch weight | yes | quantity (min 0, unit kg) | weight |
| 14 | position_source | Position and trip-date source | yes | enum → fishing_trip.position_source | position_source |

### On-vessel processing  (onvessel_processing_event)   Wild · on-chain · parent: fishing_trip
Used at stage(s): stage_onvessel_processing    ·    plural: On-vessel processing events

[TABLE 68]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | lot_ref | Catch lot | yes | text | lot_identifier |
| 2 | product_form | Product form after processing | yes | collection → product_forms | product_form |
| 3 | processed_weight | Weight after processing | yes | quantity (min 0, unit kg) | weight |

### Transhipment  (transhipment_event)   Wild · on-chain · parent: fishing_trip
Used at stage(s): stage_transhipment    ·    plural: Transhipments

[TABLE 69]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | lot_ref | Catch lot | yes | text | lot_identifier |
| 2 | carrier_vessel_name | Carrier vessel name | yes | text | party_identifier |
| 3 | carrier_vessel_id | Carrier vessel identification | yes | text | party_identifier |
| 4 | carrier_flag | Carrier flag | yes | enum → CARRIER_FLAGS | origin_attribute |
| 5 | location | Transhipment location | yes | geo_point | geo_position |
| 6 | tranship_date | Transhipment date | yes | date | event_date |
| 7 | authorisation | Transhipment authorisation | yes | text | operating_licence |

### Landing  (landing_event)   Wild · on-chain · parent: fishing_trip
Used at stage(s): stage_landing    ·    plural: Landings

[TABLE 70]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | lot_ref | Catch lot | yes | text | lot_identifier |
| 2 | landing_location | Landing location | yes | enum → FISHING_HARBOURS | location_identifier |
| 3 | landing_date | Landing date | yes | date | event_date |
| 4 | landing_authorisation | Landing authorisation | no | text | operating_licence |
| 5 | landed_weight | Landed weight | yes | quantity (min 0, unit kg) | weight |

### Auction and first sale  (auction_event)   Wild · on-chain · parent: fishing_trip
Used at stage(s): stage_auction    ·    plural: Auctions and first sales

[TABLE 71]
| # | Field key | Label | Req | Type / binding | Semantic role |
|---|---|---|---|---|---|
| 1 | merchant_lot | Merchant lot | yes | text | child_lot_ref |
| 2 | contributing_lots | Contributing catch lots | yes | multiline | parent_lot_ref |
| 3 | buyer | Buyer (merchant or agent) | yes | text | party_identifier |
| 4 | weight | Lot weight | yes | quantity (min 0, unit kg) | quantity |
| 5 | sale_date | Sale date | yes | date | event_date |

# 7. Rules

## 7.1  Monitoring rules (alerts)

[TABLE 72]
| Scope | Key | Label | Entity · field | Op | Threshold / limit | Message |
|---|---|---|---|---|---|---|
| Farmed | rule_dissolved_oxygen_low | Dissolved oxygen below safe level | growout_reading · dissolved_oxygen | lt | 4 | Dissolved oxygen has fallen below 4 mg/L, a stress threshold for the crop. |
| Farmed | rule_ammonia_high | Ammonia above safe level | growout_reading · ammonia | gt | 0.1 | Ammonia has risen above 0.1 mg/L, indicating a water quality problem. |
| Farmed | rule_residue_breach | Residue above maximum residue limit | lab_report · residue_value | gt | limit: residue_limit | A residue reading has exceeded its maximum residue limit. The affected lot must be held. |
| Farmed | rule_input_not_certified | Input not on the certified list | input_application_event · caa_certified | eq | 0 | An input was applied that is not on the Coastal Aquaculture Authority certified list. |
| Farmed | rule_transport_temperature | First-mile temperature excursion | transport_event · temperature_max | gt | 4 | The transport leg exceeded 4 C, outside the chilled range for iced product. |
| Wild | rule_residue_breach | Residue above maximum residue limit | lab_report · residue_value | gt | limit: residue_limit | A residue reading has exceeded its maximum residue limit. The affected lot must be held. |
| Wild | rule_transport_temperature | Transport temperature excursion | transport_event · temperature_max | gt | 4 | The transport leg exceeded 4 C, outside the chilled range for iced product. |

## 7.2  Quality parameters (tracked readings)

[TABLE 73]
| Scope | Key | Label | Entity · field | Unit |
|---|---|---|---|---|
| Farmed | qp_salinity | Salinity | growout_reading · salinity | ppt |
| Farmed | qp_dissolved_oxygen | Dissolved oxygen | growout_reading · dissolved_oxygen | mg/L |
| Farmed | qp_ph | Acidity (pH) | growout_reading · ph |  |
| Farmed | qp_ammonia | Ammonia | growout_reading · ammonia | mg/L |
| Farmed | qp_count_grade | Count grade | harvest_event · count_grade |  |
| Farmed | qp_residue | Residue reading | lab_report · residue_value | ug/kg |
| Wild | qp_landed_weight | Landed weight | landing_event · landed_weight | kg |
| Wild | qp_residue | Residue reading | lab_report · residue_value | ug/kg |

## 7.3  Field validation rules
Constraints declared on form fields (beyond required/typed). "required: yes" fields are marked in §6.

[TABLE 74]
| Scope | Field | Type | Constraint |
|---|---|---|---|
| Shared | organisation.legal_name | text | minLen 2, maxLen 200 |
| Shared | processing_batch.raw_weight | quantity | min 0 |
| Shared | processing_batch.finished_weight | quantity | min 0 |
| Shared | processing_batch.yield_factor | number | min 0, max 1 |
| Shared | lab_report.residue_value | number | min 0 |
| Shared | lab_report.residue_limit | number | min 0 |
| Shared | ship_receive_event.quantity | quantity | min 0 |
| Shared | consignment.total_weight | quantity | min 0 |
| Shared | distribution_event.quantity | quantity | min 0 |
| Shared | retail_event.quantity | quantity | min 0 |
| Farmed | crop_cycle.seed_quantity | quantity | min 0 |
| Farmed | crop_cycle.stocking_density | number | min 0 |
| Farmed | broodstock_event.broodstock_count | quantity | min 0 |
| Farmed | hatchery_event.seed_quantity | quantity | min 0 |
| Farmed | input_application_event.quantity | quantity | min 0 |
| Farmed | growout_reading.ph | number | min 0, max 14 |
| Farmed | harvest_event.harvest_weight | quantity | min 0 |
| Farmed | harvest_event.agreed_rate | number | min 0 |
| Wild | fishing_trip.weight | quantity | min 0 |
| Wild | onvessel_processing_event.processed_weight | quantity | min 0 |
| Wild | landing_event.landed_weight | quantity | min 0 |
| Wild | auction_event.weight | quantity | min 0 |

## 7.4  Sequencing & handoff rules

[TABLE 75]
| Rule kind | How it works |
|---|---|
| Stage prerequisite | A stage with "Requires" (see §5) becomes actionable only once that transaction exists on the unit. |
| Repeatable stage | A stage marked repeatable (grow-out reading, on-vessel processing, transhipment) can be recorded many times and never advances the pipeline pointer. |
| Two-party handoff | A stage with a handoff routes the unit to the next role’s incoming queue; the receiver co-signs the declared fields (ACCEPTED) or flags a discrepancy (DISPUTED). |
| Lab pass | A laboratory result’s pass is derived from residue reading ≤ maximum residue limit (see §7.1 rule on lab_report). |
| Certificate mandate | Mandatory certificate types (§3.3) must be anchored for a shipment to score fully compliant on the public verify scorecard. |

# 8. Screens
The application pages (React routes). Public pages need no account; the rest require an authenticated session; admin pages require a platform admin.

[TABLE 76]
| Route | Screen | Access | Purpose |
|---|---|---|---|
| /login | Login | Public | Email + password sign-in; prompts for the TOTP code when MFA is enabled. |
| /accept-invite | Accept invite | Public (token) | An invited user sets their password and joins their organisation and role. |
| /verify, /verify/:code | Public verification | Public | Enter a code or scan the QR to see a shipment’s full chain of custody, compliance scorecard, certificates and lab results — no account needed. |
| /dashboard | Role workspace | Authenticated | KPI tiles, chain-verified banner, live alerts, incoming custody handoffs to accept/dispute, the work queue (record the next step / lab result), and origin-create / supply forms. |
| /records | Records list | Authenticated | All origin units in the user’s scope with their live on-chain status. |
| /records/:id | Record detail | Authenticated | One shipment’s chain-of-custody timeline (every on-chain event), lab results, certificates, disputes, and its QR / public-verify link. |
| /explorer | AquaChain explorer | Authenticated | Finalized blocks, confirmed & pending transactions, the head block, end-to-end verification, and recent blocks with their hashes and validator votes. |
| /admin | Admin | Platform admin | Manage users, roles and invitations; a platform admin may also switch between profiles. |

# 9. Access & security

## 9.1  Permission model (RBAC)
Permission actions: create · read · update · accept_handoff · flag_discrepancy · issue_certificate · record_event · verify. Each role (§4) holds a list of {action · entity} grants; entity "*" means any entity.

## 9.2  Platform roles

[TABLE 77]
| Platform role | Capability |
|---|---|
| platform_admin | Switches between profiles; administers within a tenant. |
| platform_super_admin | Everything an admin can do, plus user management and system settings. |

## 9.3  Tenancy, authentication & key custody

[TABLE 78]
| Control | Setting / behaviour |
|---|---|
| Tenant isolation | Every organisation and its records are scoped to a tenant; a normal user is bound to exactly one category (profile). |
| Access token (JWT) | Short-lived, default 900 s (15 min). |
| Refresh token | Default 1,209,600 s (14 days). |
| Multi-factor auth | TOTP; issuer label "AquaTrace" (MFA_ISSUER). |
| Chain key custody | Per-actor ed25519 keypair; private key encrypted at rest with the 32-byte CHAIN_MASTER_KEY. |
| Validator consensus | 5 validators, block finalises at 4 signatures (§3.1). |
| Read-only oversight | regulator_auditor holds verify + read* and never advances the workflow. |
| Rate limiting | Default 120 requests per 60 s window. |

# 10. Localisation, brand & links

## 10.1  Locales
Supported locales: en (English) · te (Telugu) · ta (Tamil) · ml (Malayalam) · or (Odia) · bn (Bengali) · gu (Gujarati) · mr (Marathi) · kn (Kannada)
English is the complete base; any missing key falls back to English. Labels and terminology are localised text.

## 10.2  Per-profile terminology overrides

### Farmed — terminology

[TABLE 79]
| Core term | Renamed to |
|---|---|
| origin_unit | Broodstock lot |
| lot | Harvest lot |
| producer | Farmer |
| facility | Pond |
| harvest | Harvest |
| handoff | Custody handover |

### Wild — terminology

[TABLE 80]
| Core term | Renamed to |
|---|---|
| origin_unit | Fishing trip |
| lot | Catch lot |
| producer | Skipper |
| facility | Vessel |
| harvest | Capture |
| handoff | Auction handover |

## 10.3  Branding
Farmed — logo: brand/farmed-logo.svg   ·   palette: primary #0f766e, secondary #065f46, accent #10b981, surface #f0fdfa, on-surface #0f172a
Wild — logo: brand/wild-logo.svg   ·   palette: primary #0369a1, secondary #075985, accent #0ea5e9, surface #f0f9ff, on-surface #0f172a

## 10.4  Links

[TABLE 81]
| Link | Value |
|---|---|
| Product | aquatrace.cerulea.io |
| Public verify | aquatrace.cerulea.io/verify/<shipment-code>  (also a QR code on each record) |
| Company | cerulea.io |
| Contact | anirudh@cbytechains.com |