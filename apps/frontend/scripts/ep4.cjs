'use strict';
let _c=8000;
const sid=()=>`s${String(++_c).padStart(5,'0')}`;
const f=(n,t,s,r,u,i,e)=>({id:sid(),name:n,type:t,storage:s,required:!!r,unique:!!u,indexed:!!i,encrypted:!!e});
const ADM={create:'admin',read:'admin',update:'admin',delete:'admin'};
const SYS={create:'admin',read:'auth',update:'admin',delete:'admin'};
const AUTH={create:'auth',read:'auth',update:'owner',delete:'admin'};
const OWN={create:'owner',read:'owner',update:'owner',delete:'admin'};
const PUB={create:'auth',read:'public',update:'owner',delete:'admin'};
const e=(m,n,d,c,fs,a,o,p)=>({id:sid(),moduleId:m,name:n,description:d||undefined,isCore:!!c,fields:fs,access:a||AUTH,onChain:!!o,apiPublic:p!==undefined?!!p:true});

module.exports=[
  /* ── traceability-ledger ── 8 entities */
  e('traceability-ledger','MangoLot','Primary mango lot lifecycle record on-chain',1,[
    f('lotId','uuid','database',1,1,1),f('lotNumber','string','on-chain',1,1,1),
    f('variety','string','on-chain',1,0,1),f('farmerId','uuid','database',1,0,1),
    f('harvestDate','datetime','on-chain',1),f('currentStage','string','on-chain',1,0,1),
    f('status','string','on-chain',1,0,1),f('destinationCountry','string','on-chain',1,0,1),
    f('currentQuantityKg','float','on-chain',1)
  ],PUB,1,1),
  e('traceability-ledger','LotStageTransition','On-chain event for each lot stage change',1,[
    f('transitionId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('fromStage','string','on-chain',1),f('toStage','string','on-chain',1),
    f('transitionedBy','address','on-chain',1),f('transitionedAt','datetime','on-chain',1),
    f('txHash','bytes32','on-chain',1,1),f('blockHeight','int','on-chain',1),
    f('notes','text','database')
  ],PUB,1,1),
  e('traceability-ledger','FarmRegistration','Farm registration record for lot origin',1,[
    f('farmRegId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('farmerId','uuid','database',1,0,1),f('apedaRegNo','string','database',1,0,1),
    f('farmLocation','string','database',1),f('estimatedQuantityKg','float','database',1),
    f('registeredAt','datetime','on-chain',1),f('txHash','bytes32','on-chain',1),
    f('farmerWallet','address','on-chain',1)
  ],AUTH,1,1),
  e('traceability-ledger','ResidueTestResult','Pesticide residue test result for a lot',1,[
    f('testId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('laboratoryId','uuid','database',1,0,1),f('outcome','string','on-chain',1,0,1),
    f('testDate','datetime','on-chain',1),f('certNumber','string','database',1,1),
    f('txHash','bytes32','on-chain',1),f('reportHash','bytes32','on-chain',1),
    f('mrlComplianceCountry','string','database',1)
  ],AUTH,1,1),
  e('traceability-ledger','PesticideResidueDetail','Individual compound reading for a residue test',0,[
    f('detailId','uuid','database',1,1,1),f('testId','uuid','database',1,0,1),
    f('compoundName','string','database',1,0,1),f('detectedPPM','float','database',1),
    f('maxPPM','float','database',1),f('exceedsLimit','boolean','database',1),
    f('analysisMethod','string','database'),f('lotId','uuid','database',1,0,1),
    f('destinationCountry','string','database',1)
  ],AUTH,0,1),
  e('traceability-ledger','MRLThreshold','Maximum Residue Level thresholds by country and compound',1,[
    f('mrlId','uuid','database',1,1,1),f('compoundName','string','database',1,0,1),
    f('countryIso','string','database',1,0,1),f('maxPPM','float','database',1),
    f('regulatoryAuthority','string','database',1),f('effectiveFrom','datetime','database',1),
    f('sourceDocument','string','database'),f('lastUpdated','datetime','database',1),
    f('updatedBy','address','database')
  ],ADM,0,1),
  e('traceability-ledger','ComplianceViolation','On-chain compliance violation record',0,[
    f('violationId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('violationType','string','on-chain',1),f('severity','string','on-chain',1),
    f('detectedAt','datetime','on-chain',1),f('txHash','bytes32','on-chain',1,1),
    f('reportedBy','address','on-chain'),f('blockHeight','int','on-chain',1),
    f('remediation','text','database')
  ],SYS,1,1),
  e('traceability-ledger','ExportDestinationRule','Export rules per destination country',1,[
    f('ruleId','uuid','database',1,1,1),f('destinationCountry','string','database',1,1),
    f('requiresVHT','boolean','database',1),f('requiresHWT','boolean','database',1),
    f('phytoCertRequired','boolean','database',1),f('mrlStandard','string','database',1),
    f('icegateRequired','boolean','database',1),f('lastReviewedAt','datetime','database',1),
    f('updatedBy','address','database',1)
  ],ADM,0,1),

  /* ── cold-chain-monitoring ── 8 entities */
  e('cold-chain-monitoring','IoTDevice','IoT temperature sensor device registration',1,[
    f('deviceId','uuid','database',1,1,1),f('deviceSerial','string','database',1,1,1),
    f('deviceType','string','database',1,0,1),f('facilityId','uuid','database',1,0,1),
    f('assignedTo','string','database',1),f('firmwareVersion','string','database'),
    f('calibratedAt','datetime','database',1),f('isActive','boolean','database',1),
    f('hmacKeyHash','bytes32','database',1,0,0,1)
  ],ADM,0,0),
  e('cold-chain-monitoring','IoTDeviceSession','Active IoT session for a lot monitoring period',1,[
    f('sessionId','uuid','database',1,1,1),f('deviceId','uuid','database',1,0,1),
    f('lotId','uuid','database',1,0,1),f('stage','string','database',1,0,1),
    f('startedAt','datetime','database',1),f('endedAt','datetime','database'),
    f('readingsCount','int','database'),f('sessionKeyHash','bytes32','database',1,0,0,1),
    f('isActive','boolean','database',1)
  ],ADM,0,0),
  e('cold-chain-monitoring','TemperatureReading','Individual temperature reading from an IoT device',0,[
    f('readingId','uuid','database',1,1,1),f('sessionId','uuid','database',1,0,1),
    f('deviceId','uuid','database',1,0,1),f('temperatureCelsius','float','database',1),
    f('humidityPct','float','database'),f('recordedAt','datetime','database',1,0,1),
    f('isBreach','boolean','database',1,0,1),f('hmacSignature','bytes32','database',1),
    f('lotId','uuid','database',1,0,1)
  ],AUTH,0,1),
  e('cold-chain-monitoring','IoTBreachAlert','Alert triggered by a temperature breach event',1,[
    f('alertId','uuid','database',1,1,1),f('sessionId','uuid','database',1,0,1),
    f('lotId','uuid','on-chain',1,0,1),f('peakTemperature','float','on-chain',1),
    f('breachThreshold','float','on-chain',1),f('breachStart','datetime','on-chain',1),
    f('alertType','string','on-chain',1),f('txHash','bytes32','on-chain',1,1),
    f('notifiedActors','json','database')
  ],SYS,1,1),
  e('cold-chain-monitoring','ColdStorageRecord','Cold storage handling record for a lot',1,[
    f('recordId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('facilityId','uuid','database',1,0,1),f('setpointCelsius','float','database',1),
    f('receivedAt','datetime','on-chain',1),f('dispatchedAt','datetime','on-chain'),
    f('txHash','bytes32','on-chain',1),f('handlerWallet','address','on-chain',1),
    f('quantityKg','float','on-chain',1)
  ],AUTH,1,1),
  e('cold-chain-monitoring','ColdChainFacility','Registered cold storage facility',1,[
    f('facilityId','uuid','database',1,1,1),f('facilityName','string','database',1),
    f('operatorId','uuid','database',1,0,1),f('location','string','database',1),
    f('certificationStatus','string','database',1),f('capacityTons','float','database'),
    f('temperatureRangeCelsius','string','database',1),f('isActive','boolean','database',1),
    f('lastAuditDate','datetime','database')
  ],PUB,0,1),
  e('cold-chain-monitoring','ContainerSensorReading','In-transit container temperature reading',0,[
    f('readingId','uuid','database',1,1,1),f('containerNumber','string','database',1,0,1),
    f('lotId','uuid','database',1,0,1),f('temperatureCelsius','float','database',1),
    f('gpsLatitude','float','database'),f('gpsLongitude','float','database'),
    f('recordedAt','datetime','database',1,0,1),f('isBreach','boolean','database',1),
    f('sensorId','string','database',1)
  ],AUTH,0,1),
  e('cold-chain-monitoring','ShockEventRecord','Shock or impact event recorded by container sensor',0,[
    f('eventId','uuid','database',1,1,1),f('containerNumber','string','database',1,0,1),
    f('lotId','uuid','on-chain',1,0,1),f('accelerationG','float','on-chain',1),
    f('eventTimestamp','datetime','on-chain',1),f('txHash','bytes32','on-chain',1),
    f('gpsLatitude','float','database'),f('gpsLongitude','float','database'),
    f('notified','boolean','database',1)
  ],SYS,1,1),

  /* ── port-customs-events ── 8 entities */
  e('port-customs-events','CustomsClearance','Customs clearance record for an export shipment',1,[
    f('clearanceId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('shippingBillNumber','string','database',1,1,1),f('exporterIEC','string','database',1,0,1),
    f('filedAt','datetime','on-chain',1),f('leoDate','datetime','on-chain'),
    f('txHash','bytes32','on-chain',1),f('customsPortCode','string','database',1),
    f('status','string','on-chain',1,0,1)
  ],AUTH,1,1),
  e('port-customs-events','PortArrivalRecord','Port arrival record for incoming container',0,[
    f('arrivalId','uuid','database',1,1,1),f('portCode','string','database',1,0,1),
    f('vesselName','string','database',1),f('containerNumber','string','database',1,0,1),
    f('arrivalDate','datetime','on-chain',1),f('lotId','uuid','on-chain',1,0,1),
    f('txHash','bytes32','on-chain',1),f('quarantineOrdered','boolean','on-chain'),
    f('inspectorId','uuid','database')
  ],AUTH,1,1),
  e('port-customs-events','ICEGATEShippingBill','ICEGATE-verified shipping bill record',1,[
    f('billId','uuid','database',1,1,1),f('shippingBillNumber','string','database',1,1,1),
    f('icegateStatus','string','database',1),f('exporterIEC','string','database',1,0,1),
    f('verifiedAt','datetime','database',1),f('leoNumber','string','database'),
    f('portCode','string','database',1),f('lastCheckedAt','datetime','database',1),
    f('apiResponseHash','bytes32','database')
  ],AUTH,0,1),
  e('port-customs-events','PortInspectionRecord','Physical port inspection record for a lot',0,[
    f('inspectionId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('inspectorId','uuid','database',1,0,1),f('inspectionDate','datetime','on-chain',1),
    f('result','string','on-chain',1),f('samplesTaken','int','database'),
    f('txHash','bytes32','on-chain',1),f('findings','text','database'),
    f('detentionOrdered','boolean','on-chain')
  ],AUTH,1,1),
  e('port-customs-events','DestinationArrival','Arrival at foreign destination port record',1,[
    f('arrivalId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('destinationPort','string','database',1),f('arrivalDate','datetime','on-chain',1),
    f('quarantineOrdered','boolean','on-chain',1),f('txHash','bytes32','on-chain',1,1),
    f('buyerId','uuid','database',1,0,1),f('inspectionScheduled','boolean','database'),
    f('blockHeight','int','on-chain',1)
  ],AUTH,1,1),
  e('port-customs-events','BillOfLading','Bill of lading issued for container shipment',1,[
    f('blId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('blNumber','string','database',1,1,1),f('containerNumber','string','database',1,0,1),
    f('vesselName','string','database',1),f('sealNumber','string','database',1),
    f('issuedAt','datetime','on-chain',1),f('txHash','bytes32','on-chain',1),
    f('shippingLineId','uuid','database',1)
  ],AUTH,1,1),
  e('port-customs-events','InTransitLog','In-transit journey log header for a container',0,[
    f('logId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('containerNumber','string','database',1,0,1),f('departurePort','string','database',1),
    f('destinationPort','string','database',1),f('totalReadings','int','database'),
    f('totalBreaches','int','database'),f('arrivalTimestamp','datetime','on-chain'),
    f('txHash','bytes32','on-chain')
  ],AUTH,1,1),
  e('port-customs-events','CustodyTransfer','Custody transfer record between supply chain actors',0,[
    f('transferId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('fromActorId','uuid','on-chain',1,0,1),f('toActorId','uuid','on-chain',1,0,1),
    f('condition','string','on-chain',1),f('status','string','on-chain',1,0,1),
    f('txHash','bytes32','on-chain',1),f('createdAt','datetime','on-chain',1),
    f('completedAt','datetime','on-chain')
  ],AUTH,1,1),

  /* ── quality-recall-ledger ── 8 entities */
  e('quality-recall-ledger','PackhouseRecord','Packhouse processing record for a lot',1,[
    f('packRecordId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('facilityId','uuid','database',1,0,1),f('acceptedQuantityKg','float','on-chain',1),
    f('receivedAt','datetime','on-chain',1),f('processingCompletedAt','datetime','on-chain'),
    f('txHash','bytes32','on-chain',1),f('supervisorWallet','address','on-chain',1),
    f('processingNotes','text','database')
  ],AUTH,1,1),
  e('quality-recall-ledger','GradingRecord','Quality grading record for a packhouse session',0,[
    f('gradingId','uuid','database',1,1,1),f('packRecordId','uuid','on-chain',1,0,1),
    f('lotId','uuid','on-chain',1,0,1),f('grade','string','on-chain',1,0,1),
    f('quantityKg','float','on-chain',1),f('gradedBy','address','on-chain',1),
    f('gradedAt','datetime','on-chain',1),f('txHash','bytes32','on-chain',1),
    f('defectNotes','text','database')
  ],AUTH,1,1),
  e('quality-recall-ledger','RecallOrder','Product recall order issued for a lot',0,[
    f('recallId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('issuedBy','address','on-chain',1),f('recallReason','string','on-chain',1),
    f('severity','string','on-chain',1),f('issuedAt','datetime','on-chain',1),
    f('txHash','bytes32','on-chain',1,1),f('affectedQuantityKg','float','on-chain'),
    f('status','string','on-chain',1,0,1)
  ],ADM,1,1),
  e('quality-recall-ledger','RecallNotification','Notification sent to actors for a recall',0,[
    f('notifId','uuid','database',1,1,1),f('recallId','uuid','database',1,0,1),
    f('recipientId','uuid','database',1,0,1),f('recipientRole','string','database',1),
    f('channel','string','database',1),f('sentAt','datetime','database',1),
    f('acknowledgedAt','datetime','database'),f('messageContent','text','database',1),
    f('deliveryStatus','string','database',1)
  ],SYS,0,0),
  e('quality-recall-ledger','RejectionDetail','Buyer rejection detail for a lot',0,[
    f('rejectionId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('buyerId','uuid','database',1,0,1),f('rejectionReason','string','on-chain',1),
    f('rejectedQuantityKg','float','on-chain',1),f('rejectedAt','datetime','on-chain',1),
    f('txHash','bytes32','on-chain',1),f('photosIpfsHash','string','database'),
    f('returnRequested','boolean','on-chain')
  ],AUTH,1,1),
  e('quality-recall-ledger','QualityInspectionReport','Third-party quality inspection report',0,[
    f('reportId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('inspectorId','uuid','database',1,0,1),f('reportDate','datetime','on-chain',1),
    f('overallGrade','string','on-chain',1),f('reportHash','bytes32','on-chain',1,1),
    f('txHash','bytes32','on-chain',1),f('findings','text','database'),
    f('passedApedaStandards','boolean','on-chain',1)
  ],AUTH,1,1),
  e('quality-recall-ledger','DisputeRecord','Dispute opened between supply chain parties',0,[
    f('disputeId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('raisedBy','address','on-chain',1),f('disputeType','string','on-chain',1),
    f('status','string','on-chain',1,0,1),f('openedAt','datetime','on-chain',1),
    f('txHash','bytes32','on-chain',1,1),f('totalEvidenceItems','int','on-chain'),
    f('assignedArbitrator','address','on-chain')
  ],AUTH,1,1),
  e('quality-recall-ledger','DisputeSettlement','Settlement record for a resolved dispute',0,[
    f('settlementId','uuid','database',1,1,1),f('disputeId','uuid','on-chain',1,0,1),
    f('settlementType','string','on-chain',1),f('settledBy','address','on-chain',1),
    f('settledAt','datetime','on-chain',1),f('txHash','bytes32','on-chain',1,1),
    f('refundAmountAGT','float','on-chain'),f('escrowAction','string','on-chain',1),
    f('notes','text','database')
  ],ADM,1,1),

  /* ── evidence-chain ── 8 entities */
  e('evidence-chain','DocumentHashRecord','SHA-256 hash of a document anchored on-chain',1,[
    f('hashRecordId','uuid','database',1,1,1),f('documentType','string','on-chain',1,0,1),
    f('lotId','uuid','on-chain',1,0,1),f('documentHash','bytes32','on-chain',1,1),
    f('anchoredBy','address','on-chain',1),f('anchoredAt','datetime','on-chain',1),
    f('txHash','bytes32','on-chain',1,1),f('ipfsRef','string','database'),
    f('storageUri','string','database',1)
  ],PUB,1,1),
  e('evidence-chain','EvidenceItem','Individual piece of evidence linked to an event',0,[
    f('evidenceId','uuid','database',1,1,1),f('relatedEventId','uuid','database',1,0,1),
    f('eventType','string','database',1,0,1),f('evidenceType','string','database',1),
    f('evidenceHash','bytes32','on-chain',1,1),f('addedAt','datetime','on-chain',1),
    f('txHash','bytes32','on-chain',1),f('ipfsRef','string','database'),
    f('lotId','uuid','database',1,0,1)
  ],AUTH,1,1),
  e('evidence-chain','ChainOfCustodyLog','Comprehensive chain of custody audit log',0,[
    f('custodyLogId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('eventSequence','int','on-chain',1),f('actorWallet','address','on-chain',1),
    f('action','string','on-chain',1),f('timestamp','datetime','on-chain',1),
    f('txHash','bytes32','on-chain',1,1),f('blockHeight','int','on-chain',1),
    f('witnessCount','int','on-chain')
  ],PUB,1,1),
  e('evidence-chain','TamperProofBundle','Tamper-proof bundle of all evidence for a lot',0,[
    f('bundleId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('bundleHash','bytes32','on-chain',1,1),f('eventCount','int','on-chain',1),
    f('createdAt','datetime','on-chain',1),f('txHash','bytes32','on-chain',1,1),
    f('storageUri','string','database'),f('ipfsCid','string','database'),
    f('signedByPlatform','boolean','on-chain',1)
  ],PUB,1,1),
  e('evidence-chain','SignatureRecord','Cryptographic signature on a document or event',0,[
    f('sigId','uuid','database',1,1,1),f('documentHash','bytes32','on-chain',1,0,1),
    f('signerAddress','address','on-chain',1,0,1),f('signature','bytes32','on-chain',1),
    f('signedAt','datetime','on-chain',1),f('txHash','bytes32','on-chain',1,1),
    f('signerRole','string','database',1),f('purposeCode','string','database'),
    f('blockHeight','int','on-chain',1)
  ],AUTH,1,1),
  e('evidence-chain','IPFSPinRecord','IPFS pin record for a document stored via Pinata',0,[
    f('pinId','uuid','database',1,1,1),f('ipfsCid','string','database',1,1,1),
    f('documentType','string','database',1),f('lotId','uuid','database',1,0,1),
    f('pinnedAt','datetime','database',1),f('redundancyPins','int','database',1),
    f('fileSizeBytes','int','database'),f('pinStatus','string','database',1),
    f('lastVerifiedAt','datetime','database')
  ],AUTH,0,0),
  e('evidence-chain','ForensicAuditRequest','Request for a forensic evidence audit',0,[
    f('requestId','uuid','database',1,1,1),f('lotId','uuid','database',1,0,1),
    f('requestedBy','address','database',1),f('requestedAt','datetime','database',1),
    f('reason','text','database',1),f('status','string','database',1,0,1),
    f('completedAt','datetime','database'),f('reportUri','string','database'),
    f('approvedBy','address','database')
  ],ADM,0,0),
  e('evidence-chain','BlockchainAnchorJob','Async job to anchor a document hash on-chain',0,[
    f('jobId','uuid','database',1,1,1),f('documentHash','bytes32','database',1,0,1),
    f('documentType','string','database',1),f('lotId','uuid','database',1,0,1),
    f('status','string','database',1,0,1),f('scheduledAt','datetime','database',1),
    f('completedAt','datetime','database'),f('txHash','bytes32','on-chain'),
    f('retryCount','int','database')
  ],SYS,0,0),

  /* ── trade-finance-docs ── 8 entities */
  e('trade-finance-docs','CertificateOfOrigin','Certificate of origin issued by APEDA',1,[
    f('cooId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('certNumber','string','database',1,1,1),f('issuedBy','string','database',1),
    f('issuedAt','datetime','on-chain',1),f('docHash','bytes32','on-chain',1,1),
    f('txHash','bytes32','on-chain',1),f('ipfsRef','string','database'),
    f('exporterApedaRegNo','string','database',1)
  ],PUB,1,1),
  e('trade-finance-docs','PhytosanitaryCertificate','NPPO phytosanitary certificate for a lot',1,[
    f('phytoId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('certNumber','string','database',1,1,1),f('issuedBy','string','database',1),
    f('outcome','string','on-chain',1,0,1),f('issuedAt','datetime','on-chain',1),
    f('validUntil','datetime','on-chain',1,0,1),f('certPdfHash','bytes32','on-chain',1,1),
    f('txHash','bytes32','on-chain',1)
  ],PUB,1,1),
  e('trade-finance-docs','ExportInspectionCert','APEDA Export Inspection Certificate',1,[
    f('eicId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('certNumber','string','database',1,1,1),f('issuedBy','string','database',1),
    f('issuedAt','datetime','on-chain',1),f('expiresAt','datetime','on-chain',1),
    f('docHash','bytes32','on-chain',1,1),f('txHash','bytes32','on-chain',1),
    f('inspectionOfficer','address','database',1)
  ],PUB,1,1),
  e('trade-finance-docs','CommercialInvoice','Commercial invoice for a trade shipment',0,[
    f('invoiceId','uuid','database',1,1,1),f('lotId','uuid','database',1,0,1),
    f('invoiceNumber','string','database',1,1),f('exporterId','uuid','database',1,0,1),
    f('buyerId','uuid','database',1,0,1),f('totalValueUSD','float','database',1),
    f('issuedAt','datetime','database',1),f('docHash','bytes32','database',1),
    f('currency','string','database',1)
  ],AUTH,0,0),
  e('trade-finance-docs','PackingList','Packing list document for a shipment',0,[
    f('packListId','uuid','database',1,1,1),f('lotId','uuid','database',1,0,1),
    f('blId','uuid','database',1,0,1),f('totalBoxes','int','database',1),
    f('netWeightKg','float','database',1),f('grossWeightKg','float','database',1),
    f('issuedAt','datetime','database',1),f('docHash','bytes32','database',1),
    f('preparedBy','address','database',1)
  ],AUTH,0,0),
  e('trade-finance-docs','LetterOfCredit','Letter of credit backing a trade transaction',0,[
    f('lcId','uuid','database',1,1,1),f('lotId','uuid','database',1,0,1),
    f('lcNumber','string','database',1,1),f('issuingBankName','string','database',1),
    f('beneficiaryId','uuid','database',1,0,1),f('amountUSD','float','database',1),
    f('expiryDate','datetime','database',1),f('docHash','bytes32','database',1),
    f('status','string','database',1,0,1)
  ],AUTH,0,0),
  e('trade-finance-docs','TreatmentRecord','Vapour heat or hot water treatment record',1,[
    f('treatmentId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('treatmentType','string','on-chain',1,0,1),f('facilityId','uuid','database',1,0,1),
    f('targetTempCelsius','float','on-chain',1),f('actualTempCelsius','float','on-chain',1),
    f('durationMinutes','int','on-chain',1),f('txHash','bytes32','on-chain',1),
    f('operatorWallet','address','on-chain',1)
  ],AUTH,1,1),
  e('trade-finance-docs','ApedaCertification','APEDA certification record with dual-cert NFT',1,[
    f('certId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('officerWallet','address','on-chain',1,0,1),f('certificationDate','datetime','on-chain',1),
    f('docHashOrigin','bytes32','on-chain',1),f('docHashInspection','bytes32','on-chain',1),
    f('txHash','bytes32','on-chain',1,1),f('nftMinted','boolean','on-chain',1),
    f('exporterApedaRegNo','string','database',1)
  ],AUTH,1,1),

  /* ── compliance-attestations ── 8 entities */
  e('compliance-attestations','ComplianceAttestation','On-chain compliance attestation by authority',1,[
    f('attestationId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('authority','string','on-chain',1),f('attestationType','string','on-chain',1),
    f('outcome','string','on-chain',1,0,1),f('attestedAt','datetime','on-chain',1),
    f('txHash','bytes32','on-chain',1,1),f('attestorWallet','address','on-chain',1),
    f('validUntil','datetime','on-chain')
  ],PUB,1,1),
  e('compliance-attestations','ComplianceCheck','Automated or manual compliance check record',0,[
    f('checkId','uuid','database',1,1,1),f('lotId','uuid','database',1,0,1),
    f('checkType','string','database',1,0,1),f('result','string','database',1,0,1),
    f('performedBy','string','database',1),f('performedAt','datetime','database',1),
    f('requiredFor','string','database',1),f('blockingStatus','boolean','database',1),
    f('detail','json','database')
  ],AUTH,0,0),
  e('compliance-attestations','APEDAApproval','APEDA officer approval for a lot export',1,[
    f('approvalId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('officerWallet','address','on-chain',1),f('approvedAt','datetime','on-chain',1),
    f('txHash','bytes32','on-chain',1,1),f('approvalType','string','on-chain',1),
    f('validFrom','datetime','on-chain',1),f('validUntil','datetime','on-chain'),
    f('notes','text','database')
  ],ADM,1,1),
  e('compliance-attestations','NPPOClearance','NPPO plant protection clearance for a lot',1,[
    f('clearanceId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('inspectorId','uuid','database',1,0,1),f('clearedAt','datetime','on-chain',1),
    f('txHash','bytes32','on-chain',1,1),f('phytoCertRef','uuid','database',1),
    f('treatmentRequired','boolean','database',1),f('clearanceStatus','string','on-chain',1),
    f('inspectionNotes','text','database')
  ],AUTH,1,1),
  e('compliance-attestations','FSSAICompliance','FSSAI food safety compliance attestation',0,[
    f('complianceId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('fssaiLicNumber','string','database',1,0,1),f('attestedBy','address','on-chain',1),
    f('attestedAt','datetime','on-chain',1),f('txHash','bytes32','on-chain',1),
    f('standardsVersion','string','database',1),f('passedChecks','json','database'),
    f('expiresAt','datetime','on-chain')
  ],AUTH,1,1),
  e('compliance-attestations','RegulatoryAuthority','Registered regulatory authority in the system',1,[
    f('authorityId','uuid','database',1,1,1),f('name','string','database',1,1),
    f('authorityCode','string','database',1,1),f('jurisdiction','string','database',1),
    f('walletAddress','address','on-chain',1,0,1),f('isActive','boolean','database',1),
    f('addedAt','datetime','database',1),f('contactEmail','string','database',1,0,0,1),
    f('authorityType','string','database',1)
  ],ADM,0,1),
  e('compliance-attestations','ComplianceViolationResolution','Resolution record for a compliance violation',0,[
    f('resolutionId','uuid','database',1,1,1),f('violationId','uuid','on-chain',1,0,1),
    f('resolvedBy','address','on-chain',1),f('resolution','text','database',1),
    f('resolvedAt','datetime','on-chain',1),f('txHash','bytes32','on-chain',1),
    f('remediationActions','json','database'),f('regulatoryAck','boolean','database'),
    f('postResolutionCheckAt','datetime','database')
  ],ADM,1,0),
  e('compliance-attestations','ComplianceReportExport','Exported compliance report for a lot or period',0,[
    f('exportId','uuid','database',1,1,1),f('reportType','string','database',1),
    f('lotId','uuid','database',0,0,1),f('fromDate','datetime','database',1),
    f('toDate','datetime','database',1),f('generatedBy','uuid','database',1),
    f('generatedAt','datetime','database',1),f('reportHash','bytes32','database',1),
    f('storageUri','string','database',1)
  ],AUTH,0,0),

  /* ── provenance-notary ── 8 entities */
  e('provenance-notary','ProvenanceRecord','On-chain provenance notarization for a lot',1,[
    f('provenanceId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('contentHash','bytes32','on-chain',1,1),f('notarizedBy','address','on-chain',1),
    f('notarizedAt','datetime','on-chain',1),f('txHash','bytes32','on-chain',1,1),
    f('ipfsCid','string','database'),f('storageUri','string','database'),
    f('blockHeight','int','on-chain',1)
  ],PUB,1,1),
  e('provenance-notary','NotarizationRequest','Request to notarize a document on-chain',0,[
    f('requestId','uuid','database',1,1,1),f('lotId','uuid','database',1,0,1),
    f('documentType','string','database',1),f('documentHash','bytes32','database',1),
    f('requestedBy','address','database',1),f('requestedAt','datetime','database',1),
    f('status','string','database',1,0,1),f('priority','string','database'),
    f('completedAt','datetime','database')
  ],AUTH,0,0),
  e('provenance-notary','CertificateNFT','Soulbound NFT issued for a lot certificate',1,[
    f('nftId','uuid','database',1,1,1),f('tokenId','int','on-chain',1,1,1),
    f('lotId','uuid','on-chain',1,0,1),f('nftType','string','on-chain',1,0,1),
    f('holderAddress','address','on-chain',1,0,1),f('mintedAt','datetime','on-chain',1),
    f('txHash','bytes32','on-chain',1,1),f('revoked','boolean','on-chain'),
    f('metadataUri','string','database')
  ],PUB,1,1),
  e('provenance-notary','ProvenanceVerificationLog','Log of provenance verification checks',0,[
    f('verifyLogId','uuid','database',1,1,1),f('provenanceId','uuid','database',1,0,1),
    f('verifierAddress','address','database',1,0,1),f('verifiedAt','datetime','database',1,0,1),
    f('result','boolean','database',1),f('hashMatched','boolean','database',1),
    f('chainConfirmed','boolean','database'),f('verificationMethod','string','database',1),
    f('clientApp','string','database')
  ],PUB,0,1),
  e('provenance-notary','QRCodeMapping','QR code mapping to a lot provenance URL',0,[
    f('qrId','uuid','database',1,1,1),f('lotId','uuid','database',1,0,1),
    f('qrCode','string','database',1,1),f('resolveUrl','string','database',1),
    f('generatedAt','datetime','database',1),f('scanCount','int','database'),
    f('lastScannedAt','datetime','database'),f('isActive','boolean','database',1),
    f('generatedBy','address','database',1)
  ],PUB,0,1),
  e('provenance-notary','ProvenanceSummary','Compiled provenance summary for a completed lot',0,[
    f('summaryId','uuid','database',1,1,1),f('lotId','uuid','database',1,0,1),
    f('stageCount','int','database',1),f('documentCount','int','database',1),
    f('certCount','int','database',1),f('compiledAt','datetime','database',1),
    f('summaryHash','bytes32','database',1,1),f('storageUri','string','database'),
    f('publiclyAccessible','boolean','database',1)
  ],PUB,0,1),
  e('provenance-notary','NotaryFeeRecord','Fee charged for a notarization operation',0,[
    f('feeId','uuid','database',1,1,1),f('provenanceId','uuid','database',1,0,1),
    f('feeAmountAGT','float','on-chain',1),f('payerAddress','address','on-chain',1),
    f('paidAt','datetime','on-chain',1),f('txHash','bytes32','on-chain',1,1),
    f('feeType','string','database',1),f('discountApplied','float','database'),
    f('invoiceRef','uuid','database')
  ],AUTH,1,0),
  e('provenance-notary','BlockchainCertAudit','Audit log of all certificate NFT operations',0,[
    f('auditId','uuid','database',1,1,1),f('tokenId','int','on-chain',1,0,1),
    f('operation','string','on-chain',1),f('performedBy','address','on-chain',1),
    f('performedAt','datetime','on-chain',1),f('txHash','bytes32','on-chain',1,1),
    f('lotId','uuid','on-chain',1,0,1),f('nftType','string','on-chain'),
    f('blockHeight','int','on-chain',1)
  ],PUB,1,1),
];
