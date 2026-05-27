'use strict';
let _c=5000;
const sid=()=>`s${String(++_c).padStart(5,'0')}`;
const f=(n,t,s,r,u,i,e)=>({id:sid(),name:n,type:t,storage:s,required:!!r,unique:!!u,indexed:!!i,encrypted:!!e});
const ADM={create:'admin',read:'admin',update:'admin',delete:'admin'};
const SYS={create:'admin',read:'auth',update:'admin',delete:'admin'};
const AUTH={create:'auth',read:'auth',update:'owner',delete:'admin'};
const PUB={create:'auth',read:'public',update:'owner',delete:'admin'};
const e=(m,n,d,c,fs,a,o,p)=>({id:sid(),moduleId:m,name:n,description:d||undefined,isCore:!!c,fields:fs,access:a||AUTH,onChain:!!o,apiPublic:p!==undefined?!!p:true});

module.exports=[
  /* ── consensus ── 8 entities */
  e('consensus','ConsensusNode','Active validator node participating in DCF consensus',1,[
    f('nodeId','uuid','database',1,1,1),f('validatorAddress','address','on-chain',1,1,1),
    f('publicKey','string','on-chain',1),f('nodeVersion','string','database',1),
    f('lastActiveBlock','int','on-chain',0,0,1),f('consensusWeight','float','on-chain',1),
    f('jailStatus','string','on-chain',0,0,1),f('region','string','database',0,0,1),
    f('softwareCommit','string','database')
  ],ADM,1,0),
  e('consensus','ConsensusRound','Single DCF consensus round for a block height',1,[
    f('roundId','uuid','database',1,1,1),f('blockHeight','int','on-chain',1,0,1),
    f('proposerAddress','address','on-chain',1),f('voteCount','int','on-chain',1),
    f('finalized','boolean','on-chain',1),f('startedAt','datetime','on-chain',1),
    f('finalizedAt','datetime','on-chain'),f('roundDurationMs','int','database'),
    f('participantCount','int','on-chain')
  ],ADM,1,0),
  e('consensus','BlockProposal','Block proposal submitted by a validator',0,[
    f('proposalId','uuid','database',1,1,1),f('blockHeight','int','on-chain',1,0,1),
    f('proposerAddress','address','on-chain',1),f('parentHash','bytes32','on-chain',1),
    f('transactionCount','int','on-chain'),f('proposedAt','datetime','on-chain',1),
    f('status','string','on-chain',1,0,1),f('blockSize','int','on-chain'),
    f('txRoot','bytes32','on-chain',1)
  ],SYS,1,1),
  e('consensus','ConsensusVote','Validator vote within a DCF consensus round',0,[
    f('voteId','uuid','database',1,1,1),f('roundId','uuid','on-chain',1,0,1),
    f('voterAddress','address','on-chain',1,0,1),f('voteType','string','on-chain',1),
    f('signature','bytes32','on-chain',1),f('votedAt','datetime','on-chain',1),
    f('blockHeight','int','on-chain',1,0,1),f('voteWeight','float','on-chain'),
    f('precommit','boolean','on-chain')
  ],SYS,1,1),
  e('consensus','FinalityRecord','Immutable record of a finalized block',1,[
    f('blockHeight','int','on-chain',1,1,1),f('blockHash','bytes32','on-chain',1,1),
    f('finalizedAt','datetime','on-chain',1),f('validatorCount','int','on-chain',1),
    f('quorumReached','boolean','on-chain',1),f('checkpointHash','bytes32','on-chain'),
    f('totalGasUsed','int','on-chain'),f('txCount','int','on-chain',1),
    f('epochNumber','int','on-chain',1,0,1)
  ],SYS,1,1),
  e('consensus','ConsensusSlashEvent','Slashing event triggered by validator misbehaviour',0,[
    f('slashId','uuid','database',1,1,1),f('validatorAddress','address','on-chain',1,0,1),
    f('slashType','string','on-chain',1),f('slashPercent','float','on-chain',1),
    f('evidenceHash','bytes32','on-chain',1),f('slashedAt','datetime','on-chain',1),
    f('txHash','bytes32','on-chain',1),f('jailDurationHours','int','on-chain'),
    f('slashAmountAGT','float','on-chain',1)
  ],ADM,1,1),
  e('consensus','EpochTransition','Epoch boundary record with validator set change',0,[
    f('epochId','uuid','database',1,1,1),f('epochNumber','int','on-chain',1,1,1),
    f('startBlock','int','on-chain',1),f('endBlock','int','on-chain'),
    f('activeValidators','int','on-chain',1),f('totalStakeAGT','float','on-chain',1),
    f('epochRewardAGT','float','on-chain'),f('transitionTxHash','bytes32','on-chain'),
    f('completedAt','datetime','on-chain',1)
  ],SYS,1,1),
  e('consensus','ConsensusParameters','Active consensus configuration snapshot',1,[
    f('paramSetId','uuid','database',1,1,1),f('blockTimeSecs','int','database',1),
    f('finalityRounds','int','database',1),f('quorumThresholdPct','float','database',1),
    f('maxValidators','int','database',1),f('minValidators','int','database',1),
    f('effectiveFrom','datetime','database',1),f('appliedByGovernanceProp','uuid','database'),
    f('approvedAt','datetime','database')
  ],ADM,0,0),

  /* ── evm-config ── 8 entities */
  e('evm-config','ChainParameters','Core EVM chain configuration',1,[
    f('paramId','uuid','database',1,1,1),f('chainId','string','database',1,1),
    f('networkName','string','database',1),f('forkVersion','string','database',1),
    f('blockGasLimit','int','database',1),f('maxCodeSizeBytes','int','database',1),
    f('effectiveFrom','datetime','database',1),f('londonForkEnabled','boolean','database',1),
    f('eip1559Enabled','boolean','database',1)
  ],ADM,0,0),
  e('evm-config','EVMUpgrade','Scheduled or completed EVM protocol upgrade',0,[
    f('upgradeId','uuid','database',1,1,1),f('upgradeType','string','database',1),
    f('targetBlock','int','database',1),f('proposedBy','address','database',1),
    f('activationBlock','int','database',0,0,1),f('status','string','database',1,0,1),
    f('activatedAt','datetime','database'),f('changeDescription','text','database',1),
    f('governanceProposalId','uuid','database')
  ],ADM,0,0),
  e('evm-config','ContractCodePolicy','Policy governing smart contract deployment',0,[
    f('policyId','uuid','database',1,1,1),f('maxContractSize','int','database',1),
    f('deployerWhitelistEnabled','boolean','database',1),f('bytecodeScanEnabled','boolean','database',1),
    f('enforceFrom','datetime','database',1),f('createdBy','address','database',1),
    f('notes','text','database'),f('allowedDeployerCount','int','database'),
    f('policyVersion','int','database',1)
  ],ADM,0,0),
  e('evm-config','EVMForkActivation','Record of an EVM fork going live on-chain',0,[
    f('forkName','string','database',1,1,1),f('activationBlock','int','on-chain',1,1,1),
    f('featureFlags','json','database',1),f('activatedAt','datetime','on-chain',1),
    f('activatedByValidator','address','on-chain',1),f('changesetHash','bytes32','on-chain',1),
    f('peerConsensusReached','boolean','on-chain',1),f('rollbackAvailable','boolean','database'),
    f('networkVersion','string','database',1)
  ],ADM,1,0),
  e('evm-config','OpcodePolicy','Allowlist and denylist for EVM opcodes',0,[
    f('policyId','uuid','database',1,1,1),f('restrictedOpcodes','json','database',1),
    f('allowedOpcodes','json','database',1),f('enforceFrom','datetime','database',1),
    f('policyReason','text','database'),f('reviewedBy','address','database',1),
    f('approvedAt','datetime','database'),f('policyHash','bytes32','database',1),
    f('affectedContracts','int','database')
  ],ADM,0,0),
  e('evm-config','EVMAuditEntry','Audit record of every EVM configuration change',0,[
    f('auditId','uuid','database',1,1,1),f('changeType','string','database',1),
    f('oldValue','json','database'),f('newValue','json','database',1),
    f('changedBy','address','database',1),f('changedAt','datetime','database',1),
    f('txHash','bytes32','on-chain'),f('auditHash','bytes32','database',1),
    f('approvedByMultisig','boolean','database')
  ],ADM,1,0),
  e('evm-config','DeployerWhitelist','Addresses approved to deploy smart contracts',1,[
    f('entryId','uuid','database',1,1,1),f('deployerAddress','address','on-chain',1,1,1),
    f('organizationId','uuid','database',1),f('addedBy','address','database',1),
    f('addedAt','datetime','on-chain',1),f('expiresAt','datetime','database'),
    f('contractsDeployed','int','database'),f('isActive','boolean','on-chain',1),
    f('notes','text','database')
  ],ADM,1,1),
  e('evm-config','GasConfigHistory','Historical log of gas configuration changes',0,[
    f('historyId','uuid','database',1,1,1),f('blockGasLimit','int','database',1),
    f('baseFeePerGas','float','database',1),f('elasticityMultiplier','float','database',1),
    f('burnPercent','float','database',1),f('effectiveFrom','datetime','database',1),
    f('proposedBy','address','database',1),f('approvedAt','datetime','database'),
    f('changeReason','text','database')
  ],ADM,0,0),

  /* ── genesis ── 8 entities */
  e('genesis','GenesisAllocation','Token allocation assigned at genesis block',1,[
    f('allocationId','uuid','database',1,1,1),f('recipientAddress','address','on-chain',1,0,1),
    f('tokenAmount','float','on-chain',1),f('allocationPurpose','string','database',1),
    f('vestingSchedule','string','database'),f('lockedUntil','datetime','on-chain'),
    f('genesisBlockHash','bytes32','on-chain',1),f('allocationBucket','string','database',1),
    f('claimedAt','datetime','on-chain')
  ],ADM,1,1),
  e('genesis','GenesisValidatorSeat','Initial validator seat registered at chain launch',1,[
    f('seatId','uuid','database',1,1,1),f('validatorAddress','address','on-chain',1,1,1),
    f('initialStake','float','on-chain',1),f('validatorName','string','database',1),
    f('jurisdiction','string','database'),f('pubKey','string','on-chain',1),
    f('registeredAt','datetime','on-chain',1),f('nodeEndpoint','string','database'),
    f('operatorOrg','string','database',1)
  ],ADM,1,1),
  e('genesis','GenesisConfigSnapshot','Immutable snapshot of genesis configuration',1,[
    f('snapshotId','uuid','database',1,1,1),f('chainId','string','database',1),
    f('genesisHash','bytes32','on-chain',1,1),f('validatorCount','int','database',1),
    f('totalAllocatedTokens','float','database',1),f('createdAt','datetime','database',1),
    f('fileSha256','bytes32','database',1),f('snapshotVersion','int','database',1),
    f('auditedBy','address','database')
  ],ADM,0,0),
  e('genesis','InitialTokenGrant','Token grants issued to roles at genesis',0,[
    f('grantId','uuid','database',1,1,1),f('recipientRole','string','database',1),
    f('recipientAddress','address','on-chain',1,0,1),f('grantAmount','float','on-chain',1),
    f('grantPurpose','string','database',1),f('vestingPeriodDays','int','database'),
    f('grantedAt','datetime','on-chain',1),f('cliffDays','int','database'),
    f('grantHash','bytes32','on-chain',1)
  ],ADM,1,0),
  e('genesis','ChainBootRecord','First-boot record for the AgroTrace network',1,[
    f('bootId','uuid','database',1,1,1),f('genesisTimestamp','datetime','on-chain',1,1),
    f('firstBlockHash','bytes32','on-chain',1,1),f('bootstrapNodeCount','int','database',1),
    f('genesisValidatorCount','int','database',1),f('networkId','string','database',1),
    f('chainLaunchDate','datetime','database',1),f('launchTeamMultisig','address','database',1),
    f('sovereignChainEnabled','boolean','database',1)
  ],ADM,1,0),
  e('genesis','NetworkFoundingEvent','Significant event recorded at chain inception',0,[
    f('eventId','uuid','database',1,1,1),f('eventType','string','database',1),
    f('description','text','database',1),f('participantCount','int','database'),
    f('txHash','bytes32','on-chain'),f('recordedAt','datetime','on-chain',1),
    f('proposalRef','string','database'),f('ipfsRef','string','database'),
    f('witnessCount','int','database')
  ],ADM,1,0),
  e('genesis','GenesisSmartContract','Smart contract deployed at genesis',0,[
    f('contractId','uuid','database',1,1,1),f('contractAddress','address','on-chain',1,1,1),
    f('contractName','string','database',1),f('bytecodeHash','bytes32','on-chain',1,1),
    f('abiHash','bytes32','database',1),f('deployedAt','datetime','on-chain',1),
    f('deployerAddress','address','on-chain',1),f('contractPurpose','text','database',1),
    f('isUpgradeable','boolean','database')
  ],ADM,1,1),
  e('genesis','GenesisAuditLog','Audit trail for all genesis configuration decisions',0,[
    f('logId','uuid','database',1,1,1),f('decision','string','database',1),
    f('decidedBy','address','database',1),f('rationale','text','database',1),
    f('approvedAt','datetime','database',1),f('auditHash','bytes32','database',1),
    f('linkedProposal','uuid','database'),f('reviewerCount','int','database',1),
    f('signedOffAt','datetime','database')
  ],ADM,0,0),

  /* ── p2p ── 8 entities */
  e('p2p','PeerNode','Peer node in the AgroTrace P2P network',1,[
    f('peerId','string','database',1,1,1),f('peerAddress','string','database',1,1,1),
    f('publicKey','string','database',1),f('nodeType','string','database',1,0,1),
    f('lastSeenAt','datetime','database',0,0,1),f('region','string','database'),
    f('connectionStatus','string','database',1,0,1),f('protocolVersion','string','database',1),
    f('uptimePct','float','database')
  ],ADM,0,0),
  e('p2p','BootstrapNode','Hardcoded bootstrap entry point for new node onboarding',1,[
    f('bootstrapId','uuid','database',1,1,1),f('endpoint','string','database',1,1),
    f('publicKey','string','database',1),f('location','string','database'),
    f('maintainedBy','string','database',1),f('lastCheckedAt','datetime','database'),
    f('isActive','boolean','database',1),f('avgResponseMs','float','database'),
    f('successfulConnections','int','database')
  ],ADM,0,0),
  e('p2p','PeerBanRecord','Record of a peer banned from the network',0,[
    f('banId','uuid','database',1,1,1),f('peerAddress','string','database',1,0,1),
    f('banReason','string','database',1),f('bannedBy','string','database',1),
    f('bannedAt','datetime','database',1),f('expiresAt','datetime','database'),
    f('banType','string','database',1),f('appealStatus','string','database'),
    f('incidentRef','uuid','database')
  ],ADM,0,0),
  e('p2p','NetworkHealthSnapshot','Periodic snapshot of P2P network health metrics',0,[
    f('snapshotId','uuid','database',1,1,1),f('connectedPeers','int','database',1),
    f('avgLatencyMs','float','database'),f('messagesThroughput','int','database'),
    f('capturedAt','datetime','database',1,0,1),f('healthScore','float','database'),
    f('warningCount','int','database'),f('networkPartitionRisk','string','database'),
    f('bandwidthUsageMbps','float','database')
  ],SYS,0,0),
  e('p2p','PeerConnectionLog','Log of each peer connect and disconnect event',0,[
    f('logId','uuid','database',1,1,1),f('peerId','string','database',1,0,1),
    f('connectionType','string','database',1),f('connectTime','datetime','database',1),
    f('disconnectTime','datetime','database'),f('bytesSent','int','database'),
    f('bytesReceived','int','database'),f('disconnectReason','string','database'),
    f('sessionDurationSecs','int','database')
  ],SYS,0,0),
  e('p2p','GossipMessageRecord','Record of gossip protocol messages exchanged',0,[
    f('messageId','string','database',1,1,1),f('topic','string','database',1,0,1),
    f('originPeer','string','database',1),f('propagatedTo','int','database'),
    f('messageHash','bytes32','database',1),f('sentAt','datetime','database',1),
    f('ttl','int','database'),f('hopsCount','int','database'),
    f('deliveredCount','int','database')
  ],SYS,0,0),
  e('p2p','NetworkTopologyMap','Point-in-time map of peer connectivity',0,[
    f('mapId','uuid','database',1,1,1),f('capturedAt','datetime','database',1,0,1),
    f('totalNodes','int','database',1),f('validatorNodes','int','database',1),
    f('fullNodes','int','database'),f('lightNodes','int','database'),
    f('avgDegree','float','database'),f('clusteringCoefficient','float','database'),
    f('diameterEstimate','int','database')
  ],SYS,0,0),
  e('p2p','PeerSyncStatus','Synchronization status of a peer with the chain head',0,[
    f('syncId','uuid','database',1,1,1),f('peerId','string','database',1,0,1),
    f('currentBlock','int','database',1,0,1),f('targetBlock','int','database',1),
    f('syncPercent','float','database'),f('syncMode','string','database',1),
    f('syncStartedAt','datetime','database',1),f('lastSyncedAt','datetime','database'),
    f('catchUpLag','int','database')
  ],SYS,0,0),

  /* ── p2p-tls ── 8 entities */
  e('p2p-tls','TLSCertificate','TLS certificate for peer node mutual authentication',1,[
    f('certId','uuid','database',1,1,1),f('subjectAddress','string','database',1,0,1),
    f('issuerAddress','string','database',1),f('publicKey','string','database',1),
    f('serialNumber','string','database',1,1),f('validFrom','datetime','database',1),
    f('validUntil','datetime','database',1,0,1),f('keyAlgorithm','string','database',1),
    f('fingerprint','bytes32','database',1,1)
  ],ADM,0,0),
  e('p2p-tls','TLSHandshakeLog','Log of every mTLS handshake attempt',0,[
    f('handshakeId','uuid','database',1,1,1),f('peerId','string','database',1,0,1),
    f('cipherSuite','string','database',1),f('handshakeMs','int','database'),
    f('tlsVersion','string','database',1),f('succeededAt','datetime','database',1),
    f('errorCode','string','database'),f('initiatorRole','string','database'),
    f('clientCertPresented','boolean','database',1)
  ],SYS,0,0),
  e('p2p-tls','CertRotationEvent','Record of TLS certificate rotation for a peer',0,[
    f('rotationId','uuid','database',1,1,1),f('oldCertId','uuid','database',1,0,1),
    f('newCertId','uuid','database',1,0,1),f('rotatedBy','string','database',1),
    f('rotationReason','string','database'),f('rotatedAt','datetime','database',1),
    f('txHash','bytes32','on-chain'),f('autoRotated','boolean','database',1),
    f('downtimeMs','int','database')
  ],ADM,1,0),
  e('p2p-tls','RevokedCertRecord','Revoked TLS certificate entry in the network CRL',0,[
    f('revocationId','uuid','database',1,1,1),f('certId','uuid','database',1,0,1),
    f('revokedBy','string','database',1),f('revocationReason','string','database',1),
    f('revokedAt','datetime','database',1),f('crlEntryHash','bytes32','database'),
    f('affectedPeers','int','database'),f('notificationSent','boolean','database'),
    f('remediationDeadline','datetime','database')
  ],ADM,0,0),
  e('p2p-tls','CipherSuitePolicy','Approved TLS cipher suites policy for the network',0,[
    f('policyId','uuid','database',1,1,1),f('allowedSuites','json','database',1),
    f('minimumTLSVersion','string','database',1),f('enforceFrom','datetime','database',1),
    f('reviewedBy','string','database',1),f('approvedAt','datetime','database',1),
    f('expiresAt','datetime','database'),f('policyHash','bytes32','database',1),
    f('exemptedNodes','json','database')
  ],ADM,0,0),
  e('p2p-tls','TLSAlertRecord','TLS alert triggered during a peer session',0,[
    f('alertId','uuid','database',1,1,1),f('peerId','string','database',1,0,1),
    f('alertType','string','database',1),f('alertLevel','string','database',1),
    f('description','text','database'),f('occurredAt','datetime','database',1),
    f('resolved','boolean','database',1),f('resolutionAction','text','database'),
    f('resolvedAt','datetime','database')
  ],SYS,0,0),
  e('p2p-tls','CAConfiguration','Certificate Authority config for mTLS infrastructure',1,[
    f('caId','uuid','database',1,1,1),f('caName','string','database',1),
    f('caCertHash','bytes32','database',1,1),f('issuerDn','string','database',1),
    f('validFrom','datetime','database',1),f('validUntil','datetime','database',1),
    f('keyAlgorithm','string','database',1),f('isRoot','boolean','database',1),
    f('crlUrl','string','database')
  ],ADM,0,0),
  e('p2p-tls','MutualAuthSession','Completed mTLS mutual authentication session record',0,[
    f('sessionId','uuid','database',1,1,1),f('clientPeerId','string','database',1,0,1),
    f('serverPeerId','string','database',1,0,1),f('negotiatedCipher','string','database',1),
    f('sessionCreatedAt','datetime','database',1),f('sessionExpiresAt','datetime','database',1),
    f('bytesExchanged','int','database'),f('reauthCount','int','database'),
    f('terminatedAt','datetime','database')
  ],SYS,0,0),

  /* ── node-permissioning ── 8 entities */
  e('node-permissioning','AllowlistedNode','Node approved to join the AgroTrace network',1,[
    f('entryId','uuid','database',1,1,1),f('nodeAddress','address','on-chain',1,1,1),
    f('publicKey','string','on-chain',1),f('operatorName','string','database',1),
    f('addedBy','address','database',1),f('addedAt','datetime','on-chain',1),
    f('expiresAt','datetime','database'),f('jurisdictionCode','string','database',1),
    f('participantType','string','database',1)
  ],ADM,1,1),
  e('node-permissioning','NodeJoinRequest','Application to join the network as a node operator',0,[
    f('requestId','uuid','database',1,1,1),f('nodeAddress','address','database',1,0,1),
    f('publicKey','string','database',1),f('operatorOrg','string','database',1),
    f('justification','text','database',1),f('requestedAt','datetime','database',1),
    f('status','string','database',1,0,1),f('reviewerAddress','address','database'),
    f('supportingDocHash','bytes32','database')
  ],ADM,0,0),
  e('node-permissioning','NodePermissionDecision','Decision record on a node join request',0,[
    f('decisionId','uuid','database',1,1,1),f('requestId','uuid','database',1,0,1),
    f('decidedBy','address','on-chain',1),f('decision','string','on-chain',1),
    f('reason','text','database'),f('decidedAt','datetime','on-chain',1),
    f('effectiveAt','datetime','on-chain'),f('txHash','bytes32','on-chain'),
    f('governanceRef','uuid','database')
  ],ADM,1,0),
  e('node-permissioning','NodeOperatorProfile','Operator profile for each permissioned node',1,[
    f('profileId','uuid','database',1,1,1),f('operatorAddress','address','on-chain',1,1,1),
    f('organizationId','uuid','database',1),f('jurisdiction','string','database',1),
    f('licenseNumber','string','database',0,0,0,1),f('verifiedAt','datetime','database'),
    f('isActive','boolean','on-chain',1),f('operatorEmail','string','database',1,0,0,1),
    f('kycRefId','uuid','database')
  ],ADM,1,0),
  e('node-permissioning','NodeRemovalRecord','Record of a node removed from the network',0,[
    f('removalId','uuid','database',1,1,1),f('nodeAddress','address','on-chain',1,0,1),
    f('removedBy','address','on-chain',1),f('removalReason','string','database',1),
    f('removedAt','datetime','on-chain',1),f('offboardingStatus','string','database',1),
    f('txHash','bytes32','on-chain',1),f('dataRetentionPolicy','string','database'),
    f('appealWindowEndAt','datetime','database')
  ],ADM,1,0),
  e('node-permissioning','PermissionChangeAudit','Audit log of all node permission changes',0,[
    f('auditId','uuid','database',1,1,1),f('changeType','string','database',1),
    f('targetNodeAddress','address','database',1,0,1),f('changedBy','address','database',1),
    f('oldStatus','string','database'),f('newStatus','string','database',1),
    f('changedAt','datetime','database',1),f('auditHash','bytes32','database',1),
    f('linkedDecisionId','uuid','database')
  ],ADM,0,0),
  e('node-permissioning','NodeComplianceCheck','Periodic compliance check for a permissioned node',0,[
    f('checkId','uuid','database',1,1,1),f('nodeAddress','address','database',1,0,1),
    f('checkType','string','database',1),f('checkResult','string','database',1),
    f('performedBy','address','database',1),f('performedAt','datetime','database',1),
    f('nextCheckDue','datetime','database',1),f('findings','text','database'),
    f('remediation','text','database')
  ],ADM,0,0),
  e('node-permissioning','PermissioningPolicyVersion','Versioned policy defining node permissioning rules',1,[
    f('policyId','uuid','database',1,1,1),f('version','int','database',1,1,1),
    f('rulesJson','json','database',1),f('effectiveFrom','datetime','database',1),
    f('approvedBy','address','database',1),f('policyHash','bytes32','database',1,1),
    f('deprecatedAt','datetime','database'),f('changeNotes','text','database'),
    f('approvedAt','datetime','database',1)
  ],ADM,0,0),

  /* ── validators ── 8 entities */
  e('validators','ValidatorProfile','Registered validator operator profile',1,[
    f('validatorId','uuid','database',1,1,1),f('walletAddress','address','on-chain',1,1,1),
    f('validatorName','string','database',1),f('commissionRate','float','on-chain',1),
    f('operatorOrg','string','database'),f('region','string','database'),
    f('joinedAt','datetime','on-chain',1),f('website','string','database'),
    f('selfStakeAGT','float','on-chain',1)
  ],ADM,1,1),
  e('validators','ValidatorStakeRecord','Current stake position of a validator',1,[
    f('stakeId','uuid','database',1,1,1),f('validatorId','uuid','on-chain',1,0,1),
    f('stakedAGT','float','on-chain',1),f('delegatedAGT','float','on-chain'),
    f('totalStake','float','on-chain',1),f('effectiveFrom','datetime','on-chain',1),
    f('status','string','on-chain',1,0,1),f('unbondingAGT','float','on-chain'),
    f('rewardsEarnedAGT','float','on-chain')
  ],ADM,1,1),
  e('validators','BlockProductionLog','Record of a block produced by a validator',0,[
    f('logId','uuid','database',1,1,1),f('validatorId','uuid','database',1,0,1),
    f('blockHeight','int','on-chain',1,1,1),f('blockHash','bytes32','on-chain',1),
    f('txCount','int','on-chain'),f('proposedAt','datetime','on-chain',1),
    f('timeTakenMs','int','database'),f('gasUsed','int','on-chain'),
    f('rewardAGT','float','on-chain')
  ],SYS,1,1),
  e('validators','JailRecord','Validator jailing event record',0,[
    f('jailId','uuid','database',1,1,1),f('validatorId','uuid','on-chain',1,0,1),
    f('jailReason','string','on-chain',1),f('jailStart','datetime','on-chain',1),
    f('jailEnd','datetime','on-chain'),f('slashAmount','float','on-chain'),
    f('unjailedBy','address','on-chain'),f('missedBlocksCount','int','on-chain',1),
    f('txHash','bytes32','on-chain',1)
  ],ADM,1,1),
  e('validators','ValidatorDelegation','Delegation from a token holder to a validator',0,[
    f('delegationId','uuid','database',1,1,1),f('delegatorAddress','address','on-chain',1,0,1),
    f('validatorId','uuid','on-chain',1,0,1),f('delegatedAGT','float','on-chain',1),
    f('delegatedAt','datetime','on-chain',1),f('unbondingAt','datetime','on-chain'),
    f('txHash','bytes32','on-chain',1),f('rewardsClaimedAGT','float','on-chain'),
    f('autoCompound','boolean','on-chain')
  ],AUTH,1,1),
  e('validators','ValidatorRotationEvent','Scheduled rotation of the active validator set',0,[
    f('rotationId','uuid','database',1,1,1),f('outgoingValidatorId','uuid','on-chain',1),
    f('incomingValidatorId','uuid','on-chain',1),f('rotationReason','string','on-chain',1),
    f('rotatedAt','datetime','on-chain',1),f('txHash','bytes32','on-chain',1),
    f('epochNumber','int','on-chain',1),f('consensusVoteHash','bytes32','on-chain'),
    f('stakeDelta','float','on-chain')
  ],ADM,1,1),
  e('validators','ValidatorRewardClaim','Reward claim made by a validator or delegator',0,[
    f('claimId','uuid','database',1,1,1),f('validatorId','uuid','on-chain',1,0,1),
    f('claimerAddress','address','on-chain',1,0,1),f('claimAmountAGT','float','on-chain',1),
    f('claimType','string','on-chain',1),f('claimedAt','datetime','on-chain',1),
    f('epochRef','int','on-chain',1),f('txHash','bytes32','on-chain',1),
    f('claimStatus','string','on-chain',1)
  ],AUTH,1,1),
  e('validators','ValidatorUptimeRecord','Daily uptime record for each active validator',0,[
    f('uptimeId','uuid','database',1,1,1),f('validatorId','uuid','database',1,0,1),
    f('date','string','database',1,0,1),f('missedBlocks','int','database',1),
    f('expectedBlocks','int','database',1),f('uptimePct','float','database',1),
    f('slashRisk','string','database',1),f('monitoredBy','string','database'),
    f('reportGeneratedAt','datetime','database',1)
  ],SYS,0,1),

  /* ── tokenomics ── 8 entities */
  e('tokenomics','TokenVestingSchedule','Vesting schedule for an allocation recipient',1,[
    f('scheduleId','uuid','database',1,1,1),f('beneficiaryAddress','address','on-chain',1,0,1),
    f('totalTokens','float','on-chain',1),f('cliffDate','datetime','on-chain',1),
    f('vestingEndDate','datetime','on-chain',1),f('claimedTokens','float','on-chain'),
    f('allocationBucket','string','database',1),f('releaseFrequency','string','database',1),
    f('vestingContractAddress','address','on-chain')
  ],ADM,1,1),
  e('tokenomics','TokenDistributionRecord','One-time or periodic token distribution event',0,[
    f('distId','uuid','database',1,1,1),f('recipientAddress','address','on-chain',1,0,1),
    f('recipientRole','string','database',1),f('amount','float','on-chain',1),
    f('distributionDate','datetime','on-chain',1),f('txHash','bytes32','on-chain',1),
    f('reason','string','database',1),f('approvedByGovernance','boolean','database'),
    f('taxWithheld','float','database')
  ],ADM,1,1),
  e('tokenomics','BurnEventRecord','AGT token burn event on-chain record',0,[
    f('burnId','uuid','database',1,1,1),f('burnedAmount','float','on-chain',1),
    f('burnSource','string','on-chain',1),f('triggerTx','bytes32','on-chain',1,0,1),
    f('totalBurnedToDate','float','on-chain'),f('burnedAt','datetime','on-chain',1),
    f('initiatorAddress','address','on-chain'),f('burnPercent','float','on-chain'),
    f('blockHeight','int','on-chain',1)
  ],SYS,1,1),
  e('tokenomics','InflationEpochRecord','Inflation tokens minted and distributed each epoch',0,[
    f('epochId','uuid','database',1,1,1),f('epochNumber','int','on-chain',1,1,1),
    f('startBlock','int','on-chain',1),f('endBlock','int','on-chain',1),
    f('inflationRate','float','on-chain',1),f('tokensIssued','float','on-chain',1),
    f('distributedAt','datetime','on-chain',1),f('validatorSharePct','float','on-chain'),
    f('networkSupplyAfter','float','on-chain',1)
  ],SYS,1,1),
  e('tokenomics','SupplyAuditSnapshot','Periodic token supply audit snapshot',0,[
    f('snapshotId','uuid','database',1,1,1),f('capturedAt','datetime','database',1,0,1),
    f('totalSupply','float','on-chain',1),f('circulatingSupply','float','on-chain',1),
    f('lockedTokens','float','on-chain'),f('burnedTokens','float','on-chain'),
    f('treasuryBalance','float','on-chain',1),f('stakedTokens','float','on-chain'),
    f('unbondingTokens','float','on-chain')
  ],SYS,1,1),
  e('tokenomics','TokenomicsGovernanceVote','Vote on a tokenomics governance proposal',0,[
    f('voteId','uuid','database',1,1,1),f('proposalId','uuid','on-chain',1,0,1),
    f('voterAddress','address','on-chain',1,0,1),f('voteType','string','on-chain',1),
    f('tokensWeighted','float','on-chain',1),f('votedAt','datetime','on-chain',1),
    f('outcome','string','on-chain',0,0,1),f('delegatedFrom','address','on-chain'),
    f('quorumContribution','float','on-chain')
  ],AUTH,1,1),
  e('tokenomics','FarmerIncentiveGrant','Ecosystem fund grant issued to a farmer or FPO',0,[
    f('grantId','uuid','database',1,1,1),f('recipientId','uuid','database',1,0,1),
    f('recipientType','string','database',1),f('grantAmountAGT','float','on-chain',1),
    f('grantReason','string','database',1),f('issuedAt','datetime','on-chain',1),
    f('txHash','bytes32','on-chain',1),f('lotRef','uuid','database'),
    f('approvedByOfficer','address','database',1)
  ],ADM,1,0),
  e('tokenomics','TreasuryAllocationRecord','Allocation of treasury funds to a program or bucket',0,[
    f('allocationId','uuid','database',1,1,1),f('bucket','string','database',1,0,1),
    f('amountAGT','float','on-chain',1),f('purposeCode','string','database',1),
    f('allocatedAt','datetime','on-chain',1),f('txHash','bytes32','on-chain',1),
    f('approvedBy','address','database',1),f('releaseSchedule','string','database'),
    f('governanceProposalId','uuid','database')
  ],ADM,1,0),
];
