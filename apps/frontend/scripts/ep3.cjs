'use strict';
let _c=7000;
const sid=()=>`s${String(++_c).padStart(5,'0')}`;
const f=(n,t,s,r,u,i,e)=>({id:sid(),name:n,type:t,storage:s,required:!!r,unique:!!u,indexed:!!i,encrypted:!!e});
const ADM={create:'admin',read:'admin',update:'admin',delete:'admin'};
const SYS={create:'admin',read:'auth',update:'admin',delete:'admin'};
const AUTH={create:'auth',read:'auth',update:'owner',delete:'admin'};
const OWN={create:'owner',read:'owner',update:'owner',delete:'admin'};
const PUB={create:'auth',read:'public',update:'owner',delete:'admin'};
const e=(m,n,d,c,fs,a,o,p)=>({id:sid(),moduleId:m,name:n,description:d||undefined,isCore:!!c,fields:fs,access:a||AUTH,onChain:!!o,apiPublic:p!==undefined?!!p:true});

module.exports=[
  /* ── wallet-auth ── 8 entities */
  e('wallet-auth','WalletProfile','Registered wallet with authentication metadata',1,[
    f('walletId','uuid','database',1,1,1),f('walletAddress','address','on-chain',1,1,1),
    f('walletType','string','database',1,0,1),f('chainId','string','database',1),
    f('registeredAt','datetime','on-chain',1),f('isActive','boolean','database',1),
    f('lastSignedAt','datetime','database',0,0,1),f('publicKeyHash','bytes32','database',1),
    f('recoveryEmailHash','bytes32','database',0,0,0,1)
  ],PUB,1,1),
  e('wallet-auth','WalletNonce','Single-use nonce for wallet signature challenge',0,[
    f('nonceId','uuid','database',1,1,1),f('walletAddress','address','database',1,0,1),
    f('nonce','string','database',1,1),f('issuedAt','datetime','database',1),
    f('expiresAt','datetime','database',1,0,1),f('consumed','boolean','database',1),
    f('consumedAt','datetime','database'),f('ipAddress','string','database'),
    f('userAgent','string','database')
  ],SYS,0,0),
  e('wallet-auth','AuthSession','Active authentication session for a wallet',1,[
    f('sessionId','uuid','database',1,1,1),f('walletId','uuid','database',1,0,1),
    f('sessionToken','bytes32','database',1,1,0,1),f('createdAt','datetime','database',1),
    f('expiresAt','datetime','database',1,0,1),f('ipAddress','string','database'),
    f('deviceFingerprint','bytes32','database',0,0,1),f('isRevoked','boolean','database',1),
    f('lastActivityAt','datetime','database')
  ],OWN,0,0),
  e('wallet-auth','WalletSignatureLog','Log of every wallet signature verification',0,[
    f('logId','uuid','database',1,1,1),f('walletAddress','address','database',1,0,1),
    f('signatureHash','bytes32','database',1),f('verified','boolean','database',1),
    f('operation','string','database',1,0,1),f('signedAt','datetime','database',1,0,1),
    f('ipAddress','string','database'),f('failureReason','string','database'),
    f('sessionId','uuid','database',0,0,1)
  ],OWN,0,0),
  e('wallet-auth','WalletRecoveryRequest','Recovery request for a lost or compromised wallet',0,[
    f('requestId','uuid','database',1,1,1),f('walletId','uuid','database',1,0,1),
    f('requestType','string','database',1),f('requestedAt','datetime','database',1),
    f('status','string','database',1,0,1),f('verificationMethod','string','database',1),
    f('verifiedAt','datetime','database'),f('newWalletAddress','address','database'),
    f('adminApprovedBy','address','database')
  ],ADM,0,0),
  e('wallet-auth','MultiSigWallet','Multi-signature wallet for org treasury operations',0,[
    f('multisigId','uuid','database',1,1,1),f('multisigAddress','address','on-chain',1,1,1),
    f('orgId','uuid','database',1,0,1),f('signerAddresses','json','on-chain',1),
    f('requiredSignatures','int','on-chain',1),f('totalSigners','int','on-chain',1),
    f('createdAt','datetime','on-chain',1),f('isActive','boolean','on-chain',1),
    f('purpose','string','database',1)
  ],AUTH,1,1),
  e('wallet-auth','WalletVerificationEvent','Verification event for a wallet address',0,[
    f('eventId','uuid','database',1,1,1),f('walletAddress','address','database',1,0,1),
    f('verificationType','string','database',1),f('verifiedAt','datetime','database',1),
    f('verifiedBy','address','database',1),f('status','string','database',1),
    f('txHash','bytes32','on-chain'),f('kycRefId','uuid','database'),
    f('expiresAt','datetime','database')
  ],SYS,1,0),
  e('wallet-auth','BlockedWalletRecord','Wallet address blocked from platform access',0,[
    f('blockId','uuid','database',1,1,1),f('walletAddress','address','on-chain',1,1,1),
    f('blockReason','string','database',1),f('blockedBy','address','database',1),
    f('blockedAt','datetime','on-chain',1),f('expiresAt','datetime','database'),
    f('amlFlagRef','uuid','database'),f('appealStatus','string','database'),
    f('txHash','bytes32','on-chain',1)
  ],ADM,1,0),

  /* ── session-keys ── 8 entities */
  e('session-keys','SessionKey','Delegated session key for gasless UX operations',1,[
    f('keyId','uuid','database',1,1,1),f('keyAddress','address','on-chain',1,1,1),
    f('ownerAddress','address','on-chain',1,0,1),f('permittedOperations','json','on-chain',1),
    f('createdAt','datetime','on-chain',1),f('expiresAt','datetime','on-chain',1,0,1),
    f('isRevoked','boolean','on-chain',1),f('txHash','bytes32','on-chain',1),
    f('usageCount','int','on-chain')
  ],OWN,1,0),
  e('session-keys','SessionKeyUsageLog','Log of each operation performed with a session key',0,[
    f('logId','uuid','database',1,1,1),f('keyId','uuid','database',1,0,1),
    f('operation','string','database',1,0,1),f('txHash','bytes32','on-chain',0,0,1),
    f('performedAt','datetime','database',1,0,1),f('gasSponsored','boolean','database'),
    f('targetContract','address','database'),f('resultStatus','string','database',1),
    f('ipAddress','string','database')
  ],OWN,0,0),
  e('session-keys','SessionKeyRevocationLog','Log of session key revocation events',0,[
    f('revocationId','uuid','database',1,1,1),f('keyId','uuid','database',1,0,1),
    f('revokedBy','address','database',1),f('revokedAt','datetime','on-chain',1),
    f('revocationReason','string','database',1),f('txHash','bytes32','on-chain',1),
    f('emergencyRevoke','boolean','database'),f('affectedOps','int','database'),
    f('notificationSent','boolean','database')
  ],OWN,1,0),
  e('session-keys','SessionKeyPolicy','Policy defining allowed operations for session keys',0,[
    f('policyId','uuid','database',1,1,1),f('policyName','string','database',1,1),
    f('allowedContracts','json','database',1),f('allowedMethods','json','database',1),
    f('maxGasPerOp','int','database'),f('maxLifetimeMins','int','database',1),
    f('requiresKyc','boolean','database',1),f('createdBy','address','database',1),
    f('effectiveFrom','datetime','database',1)
  ],ADM,0,0),
  e('session-keys','SessionKeyQuota','Gas quota assigned to a session key',0,[
    f('quotaId','uuid','database',1,1,1),f('keyId','uuid','database',1,0,1),
    f('maxSponsoredAGT','float','database',1),f('usedAGT','float','database'),
    f('quotaPeriodDays','int','database',1),f('periodStart','datetime','database',1),
    f('autoRenew','boolean','database',1),f('warningThreshold','float','database'),
    f('lastResetAt','datetime','database')
  ],OWN,0,0),
  e('session-keys','SessionKeyBatch','Batch of session keys issued in one operation',0,[
    f('batchId','uuid','database',1,1,1),f('issuedTo','uuid','database',1,0,1),
    f('keyCount','int','database',1),f('purpose','string','database',1),
    f('issuedAt','datetime','database',1),f('expiresAt','datetime','database',1),
    f('issuedBy','address','database',1),f('policyId','uuid','database',1,0,1),
    f('notes','text','database')
  ],ADM,0,0),
  e('session-keys','SessionKeyAuditEntry','Audit entry for session key lifecycle events',0,[
    f('auditId','uuid','database',1,1,1),f('keyId','uuid','database',1,0,1),
    f('eventType','string','database',1),f('occurredAt','datetime','database',1,0,1),
    f('actor','address','database',1),f('detail','json','database'),
    f('ipAddress','string','database'),f('riskScore','float','database'),
    f('flagged','boolean','database')
  ],SYS,0,0),
  e('session-keys','SessionKeyRenewalRequest','Request to renew an expiring session key',0,[
    f('requestId','uuid','database',1,1,1),f('keyId','uuid','database',1,0,1),
    f('requestedBy','address','database',1),f('requestedAt','datetime','database',1),
    f('newExpiresAt','datetime','database',1),f('status','string','database',1,0,1),
    f('approvedBy','address','database'),f('approvedAt','datetime','database'),
    f('txHash','bytes32','on-chain')
  ],OWN,0,0),

  /* ── rbac ── 8 entities */
  e('rbac','Role','Platform role definition with permission set',1,[
    f('roleId','uuid','database',1,1,1),f('roleName','string','database',1,1),
    f('description','text','database'),f('permissions','json','database',1),
    f('isSystemRole','boolean','database',1),f('createdAt','datetime','database',1),
    f('createdBy','address','database',1),f('maxAssignees','int','database'),
    f('parentRoleId','uuid','database')
  ],ADM,0,0),
  e('rbac','RoleAssignment','Assignment of a role to a user wallet',1,[
    f('assignmentId','uuid','database',1,1,1),f('walletAddress','address','on-chain',1,0,1),
    f('roleId','uuid','database',1,0,1),f('orgId','uuid','database',0,0,1),
    f('assignedBy','address','database',1),f('assignedAt','datetime','on-chain',1),
    f('expiresAt','datetime','database'),f('txHash','bytes32','on-chain'),
    f('isActive','boolean','on-chain',1)
  ],ADM,1,0),
  e('rbac','PermissionDefinition','Fine-grained permission definition',0,[
    f('permId','uuid','database',1,1,1),f('resource','string','database',1,0,1),
    f('action','string','database',1,0,1),f('effect','string','database',1),
    f('conditions','json','database'),f('createdAt','datetime','database',1),
    f('createdBy','address','database',1),f('isActive','boolean','database',1),
    f('description','text','database')
  ],ADM,0,0),
  e('rbac','RoleRevocationLog','Log of role revocations',0,[
    f('revocationId','uuid','database',1,1,1),f('assignmentId','uuid','database',1,0,1),
    f('revokedBy','address','database',1),f('revokedAt','datetime','on-chain',1),
    f('revocationReason','string','database',1),f('txHash','bytes32','on-chain'),
    f('emergencyRevoke','boolean','database'),f('notificationSent','boolean','database'),
    f('appealAllowed','boolean','database')
  ],ADM,1,0),
  e('rbac','RolePolicyVersion','Versioned role-permission mapping',0,[
    f('versionId','uuid','database',1,1,1),f('roleId','uuid','database',1,0,1),
    f('version','int','database',1),f('permissions','json','database',1),
    f('effectiveFrom','datetime','database',1),f('approvedBy','address','database',1),
    f('policyHash','bytes32','database',1,1),f('changeNotes','text','database'),
    f('deprecatedAt','datetime','database')
  ],ADM,0,0),
  e('rbac','AccessCheckLog','Log of access control check results',0,[
    f('checkId','uuid','database',1,1,1),f('walletAddress','address','database',1,0,1),
    f('resource','string','database',1,0,1),f('action','string','database',1),
    f('allowed','boolean','database',1),f('checkedAt','datetime','database',1,0,1),
    f('roleApplied','string','database'),f('conditionMet','boolean','database'),
    f('denyReason','string','database')
  ],SYS,0,0),
  e('rbac','OrgRoleTemplate','Default role set template for a new organization type',0,[
    f('templateId','uuid','database',1,1,1),f('templateName','string','database',1,1),
    f('orgType','string','database',1),f('defaultRoles','json','database',1),
    f('autoAssignOnJoin','boolean','database',1),f('createdBy','address','database',1),
    f('createdAt','datetime','database',1),f('isActive','boolean','database',1),
    f('notes','text','database')
  ],ADM,0,0),
  e('rbac','RoleEscalationRequest','Temporary privilege escalation request',0,[
    f('requestId','uuid','database',1,1,1),f('requestedBy','address','database',1,0,1),
    f('targetRole','uuid','database',1,0,1),f('justification','text','database',1),
    f('requestedAt','datetime','database',1),f('durationHours','int','database',1),
    f('status','string','database',1,0,1),f('approvedBy','address','database'),
    f('expiresAt','datetime','database')
  ],ADM,0,0),

  /* ── org-accounts ── 8 entities */
  e('org-accounts','Organization','Platform organization (exporter, FPO, lab etc.)',1,[
    f('orgId','uuid','database',1,1,1),f('orgName','string','database',1),
    f('orgType','string','database',1,0,1),f('adminWallet','address','on-chain',1,0,1),
    f('apedaRegNo','string','database',0,0,1),f('jurisdictionCode','string','database',1),
    f('kycStatus','string','database',1,0,1),f('createdAt','datetime','database',1),
    f('isActive','boolean','database',1)
  ],AUTH,0,1),
  e('org-accounts','OrgMember','Member of an organization with a role',1,[
    f('memberId','uuid','database',1,1,1),f('orgId','uuid','database',1,0,1),
    f('walletAddress','address','on-chain',1,0,1),f('role','string','database',1,0,1),
    f('joinedAt','datetime','database',1),f('invitedBy','address','database'),
    f('isActive','boolean','database',1),f('permissionsOverride','json','database'),
    f('lastActivityAt','datetime','database')
  ],AUTH,0,0),
  e('org-accounts','OrgInvitation','Invitation to join an organization',0,[
    f('inviteId','uuid','database',1,1,1),f('orgId','uuid','database',1,0,1),
    f('inviteeEmail','string','database',1,0,0,1),f('invitedBy','address','database',1),
    f('invitedAt','datetime','database',1),f('expiresAt','datetime','database',1),
    f('status','string','database',1,0,1),f('assignedRole','string','database',1),
    f('acceptedAt','datetime','database')
  ],AUTH,0,0),
  e('org-accounts','OrgCredential','Organization-level credential (APEDA, NABL, ISO)',0,[
    f('credId','uuid','database',1,1,1),f('orgId','uuid','database',1,0,1),
    f('credentialType','string','database',1,0,1),f('credentialNumber','string','database',1),
    f('issuedBy','string','database',1),f('issuedAt','datetime','database',1),
    f('expiresAt','datetime','database',1,0,1),f('docHash','bytes32','database',1),
    f('verifiedAt','datetime','database')
  ],AUTH,0,0),
  e('org-accounts','OrgKYCRecord','KYC verification record for an organization',0,[
    f('kycId','uuid','database',1,1,1),f('orgId','uuid','database',1,0,1),
    f('kycStatus','string','database',1,0,1),f('verifiedBy','string','database',1),
    f('verifiedAt','datetime','database',1),f('expiresAt','datetime','database',1,0,1),
    f('docHash','bytes32','database',1,0,0,1),f('recheckRequired','boolean','database'),
    f('amlCheckPassed','boolean','database')
  ],OWN,0,0),
  e('org-accounts','OrgActivityLog','Activity audit log for an organization account',0,[
    f('logId','uuid','database',1,1,1),f('orgId','uuid','database',1,0,1),
    f('actorWallet','address','database',1),f('action','string','database',1,0,1),
    f('resourceType','string','database',1),f('resourceId','uuid','database'),
    f('performedAt','datetime','database',1,0,1),f('ipAddress','string','database'),
    f('detail','json','database')
  ],SYS,0,0),
  e('org-accounts','OrgSubscriptionPlan','Platform subscription plan for an organization',0,[
    f('planId','uuid','database',1,1,1),f('orgId','uuid','database',1,0,1),
    f('planTier','string','database',1),f('monthlyFeeINR','float','database',1),
    f('startDate','datetime','database',1),f('endDate','datetime','database'),
    f('autoRenew','boolean','database',1),f('lotQuota','int','database'),
    f('addOns','json','database')
  ],AUTH,0,0),
  e('org-accounts','OrgSuspensionRecord','Record of an organization suspension',0,[
    f('suspensionId','uuid','database',1,1,1),f('orgId','uuid','database',1,0,1),
    f('reason','text','database',1),f('suspendedBy','address','database',1),
    f('suspendedAt','datetime','on-chain',1),f('liftedAt','datetime','on-chain'),
    f('txHash','bytes32','on-chain'),f('complianceRef','uuid','database'),
    f('appealStatus','string','database')
  ],ADM,1,0),

  /* ── kyc ── 8 entities */
  e('kyc','KYCApplication','KYC application submitted by a user',1,[
    f('applicationId','uuid','database',1,1,1),f('walletAddress','address','database',1,0,1),
    f('applicantName','string','database',1,0,0,1),f('idType','string','database',1),
    f('idNumber','string','database',1,0,0,1),f('submittedAt','datetime','database',1),
    f('status','string','database',1,0,1),f('reviewedBy','string','database'),
    f('providerRef','string','database')
  ],OWN,0,0),
  e('kyc','KYCDocument','Identity document uploaded for KYC verification',0,[
    f('docId','uuid','database',1,1,1),f('applicationId','uuid','database',1,0,1),
    f('documentType','string','database',1),f('fileHash','bytes32','database',1,1),
    f('uploadedAt','datetime','database',1),f('verifiedAt','datetime','database'),
    f('expiresAt','datetime','database',0,0,1),f('ocrDataHash','bytes32','database',0,0,0,1),
    f('rejectionReason','string','database')
  ],OWN,0,0),
  e('kyc','KYCVerificationResult','Result of KYC verification by a provider',1,[
    f('resultId','uuid','database',1,1,1),f('applicationId','uuid','database',1,0,1),
    f('provider','string','database',1),f('overallStatus','string','database',1,0,1),
    f('riskScore','float','database',1),f('checks','json','database',1,0,0,1),
    f('verifiedAt','datetime','database',1),f('expiresAt','datetime','database',1,0,1),
    f('providerRefId','string','database')
  ],OWN,0,0),
  e('kyc','ActorCredential','Credential (APEDA, NABL cert, FSSAI license) of an actor',1,[
    f('credId','uuid','database',1,1,1),f('actorWallet','address','database',1,0,1),
    f('credentialType','string','database',1,0,1),f('credentialNumber','string','database',1),
    f('issuingAuthority','string','database',1),f('issuedAt','datetime','database',1),
    f('expiryDate','datetime','database',1,0,1),f('docHash','bytes32','database',1,0,0,1),
    f('verifiedAt','datetime','database')
  ],AUTH,0,1),
  e('kyc','APEDARegistration','APEDA registration record for an exporter',1,[
    f('registrationId','uuid','database',1,1,1),f('apedaRegNo','string','database',1,1,1),
    f('exporterName','string','database',1),f('walletAddress','address','database',1,0,1),
    f('registeredAt','datetime','database',1),f('expiresAt','datetime','database',1,0,1),
    f('commodities','json','database',1),f('verifiedViaApi','boolean','database',1),
    f('apiLastCheckedAt','datetime','database')
  ],AUTH,0,1),
  e('kyc','KYCRecheckSchedule','Scheduled periodic KYC recheck for an actor',0,[
    f('scheduleId','uuid','database',1,1,1),f('applicationId','uuid','database',1,0,1),
    f('nextCheckDate','datetime','database',1,0,1),f('intervalDays','int','database',1),
    f('lastCompletedAt','datetime','database'),f('reminderSent','boolean','database'),
    f('status','string','database',1),f('createdBy','address','database'),
    f('notes','text','database')
  ],SYS,0,0),
  e('kyc','KYCRejectionRecord','Formal record of a KYC application rejection',0,[
    f('rejectionId','uuid','database',1,1,1),f('applicationId','uuid','database',1,0,1),
    f('rejectionCode','string','database',1),f('rejectionReason','text','database',1),
    f('rejectedBy','string','database',1),f('rejectedAt','datetime','database',1),
    f('appealAllowed','boolean','database',1),f('appealDeadline','datetime','database'),
    f('notificationSent','boolean','database',1)
  ],OWN,0,0),
  e('kyc','KYCAuditTrail','Audit trail for all KYC verification events',0,[
    f('trailId','uuid','database',1,1,1),f('applicationId','uuid','database',1,0,1),
    f('eventType','string','database',1),f('actor','string','database',1),
    f('occurredAt','datetime','database',1,0,1),f('detail','json','database'),
    f('ipAddress','string','database'),f('hashProof','bytes32','database',1),
    f('regulatoryRef','string','database')
  ],ADM,0,0),

  /* ── device-trust ── 8 entities */
  e('device-trust','RegisteredDevice','IoT or user device registered with the platform',1,[
    f('deviceId','uuid','database',1,1,1),f('deviceFingerprint','bytes32','database',1,1,1),
    f('ownerWallet','address','database',1,0,1),f('deviceType','string','database',1,0,1),
    f('registeredAt','datetime','database',1),f('isActive','boolean','database',1),
    f('trustLevel','string','database',1),f('lastSeenAt','datetime','database',0,0,1),
    f('publicKeyCert','bytes32','database',1,0,0,1)
  ],AUTH,0,0),
  e('device-trust','DeviceBindingRecord','Binding of a device to a user account',0,[
    f('bindingId','uuid','database',1,1,1),f('deviceId','uuid','database',1,0,1),
    f('walletAddress','address','database',1,0,1),f('boundAt','datetime','database',1),
    f('bindingMethod','string','database',1),f('isActive','boolean','database',1),
    f('revokedAt','datetime','database'),f('revokedBy','address','database'),
    f('ipAddress','string','database')
  ],OWN,0,0),
  e('device-trust','DeviceTrustScore','Current trust score for a registered device',0,[
    f('scoreId','uuid','database',1,1,1),f('deviceId','uuid','database',1,0,1),
    f('trustScore','float','database',1),f('lastUpdatedAt','datetime','database',1,0,1),
    f('riskFactors','json','database'),f('recommendedAction','string','database'),
    f('autoBlockThreshold','float','database'),f('manualOverride','boolean','database'),
    f('reviewedBy','address','database')
  ],SYS,0,0),
  e('device-trust','DeviceSessionRecord','Device-linked session for IoT data ingestion',0,[
    f('sessionId','uuid','database',1,1,1),f('deviceId','uuid','database',1,0,1),
    f('sessionToken','bytes32','database',1,1,0,1),f('createdAt','datetime','database',1),
    f('expiresAt','datetime','database',1,0,1),f('lotRef','uuid','database',0,0,1),
    f('stage','string','database',1),f('isActive','boolean','database',1),
    f('bytesIngested','int','database')
  ],OWN,0,0),
  e('device-trust','DeviceRevokedRecord','Record of a device revocation or block',0,[
    f('revocationId','uuid','database',1,1,1),f('deviceId','uuid','database',1,0,1),
    f('revokedBy','address','database',1),f('revocationReason','string','database',1),
    f('revokedAt','datetime','database',1),f('blockType','string','database',1),
    f('unblockAllowed','boolean','database'),f('notificationSent','boolean','database'),
    f('amlFlagRef','uuid','database')
  ],ADM,0,0),
  e('device-trust','DeviceAuditLog','Audit log of device trust events',0,[
    f('logId','uuid','database',1,1,1),f('deviceId','uuid','database',1,0,1),
    f('eventType','string','database',1),f('actor','address','database',1),
    f('occurredAt','datetime','database',1,0,1),f('detail','json','database'),
    f('ipAddress','string','database'),f('flagged','boolean','database'),
    f('riskScore','float','database')
  ],SYS,0,0),
  e('device-trust','DeviceCertificate','Mutual-TLS certificate for an IoT device',0,[
    f('certId','uuid','database',1,1,1),f('deviceId','uuid','database',1,0,1),
    f('certFingerprint','bytes32','database',1,1),f('issuedAt','datetime','database',1),
    f('expiresAt','datetime','database',1,0,1),f('issuedBy','string','database',1),
    f('keyAlgorithm','string','database',1),f('isRevoked','boolean','database',1),
    f('revokedAt','datetime','database')
  ],ADM,0,0),
  e('device-trust','DeviceCapabilityProfile','Capability profile defining what a device can report',0,[
    f('profileId','uuid','database',1,1,1),f('deviceType','string','database',1,1),
    f('sensors','json','database',1),f('samplingIntervalSecs','int','database',1),
    f('maxPayloadBytes','int','database'),f('firmwareVersion','string','database',1),
    f('supportedProtocols','json','database'),f('createdBy','address','database',1),
    f('effectiveFrom','datetime','database',1)
  ],ADM,0,0),

  /* ── gasless-relayer ── 8 entities */
  e('gasless-relayer','RelayRequest','Gasless relay request from a sponsored user',1,[
    f('requestId','uuid','database',1,1,1),f('senderAddress','address','database',1,0,1),
    f('targetContract','address','database',1),f('calldata','bytes32','database',1,0,0),
    f('estimatedGas','int','database',1),f('requestedAt','datetime','database',1),
    f('status','string','database',1,0,1),f('sponsorRole','string','database',1),
    f('priority','string','database')
  ],AUTH,0,0),
  e('gasless-relayer','RelayTransaction','On-chain relayed transaction record',0,[
    f('relayId','uuid','database',1,1,1),f('requestId','uuid','database',1,0,1),
    f('txHash','bytes32','on-chain',1,1,1),f('relayerAddress','address','on-chain',1),
    f('gasUsed','int','on-chain',1),f('feeAmountAGT','float','on-chain',1),
    f('relayedAt','datetime','on-chain',1),f('blockHeight','int','on-chain',1),
    f('success','boolean','on-chain',1)
  ],SYS,1,0),
  e('gasless-relayer','RelayBudget','Sponsor budget allocated for gasless relaying',0,[
    f('budgetId','uuid','database',1,1,1),f('sponsorRole','string','database',1,0,1),
    f('totalBudgetAGT','float','database',1),f('usedAGT','float','database'),
    f('periodStart','datetime','database',1),f('periodEnd','datetime','database',1),
    f('autoRenew','boolean','database',1),f('warningThresholdPct','float','database'),
    f('approvedBy','address','database',1)
  ],ADM,0,0),
  e('gasless-relayer','RelayPolicyRule','Rule defining operations eligible for relay',0,[
    f('ruleId','uuid','database',1,1,1),f('eligibleRole','string','database',1,0,1),
    f('allowedContracts','json','database',1),f('allowedMethods','json','database',1),
    f('maxGasPerOp','int','database',1),f('dailyOpsLimit','int','database',1),
    f('isActive','boolean','database',1),f('effectiveFrom','datetime','database',1),
    f('approvedBy','address','database',1)
  ],ADM,0,0),
  e('gasless-relayer','RelayFailureLog','Log of failed relay attempts',0,[
    f('failureId','uuid','database',1,1,1),f('requestId','uuid','database',1,0,1),
    f('failureReason','string','database',1),f('failedAt','datetime','database',1,0,1),
    f('retryCount','int','database'),f('finalStatus','string','database',1),
    f('gasEstimateAGT','float','database'),f('relayerError','text','database'),
    f('notificationSent','boolean','database')
  ],SYS,0,0),
  e('gasless-relayer','RelayMetricSummary','Hourly summary of relay service metrics',0,[
    f('summaryId','uuid','database',1,1,1),f('periodStart','datetime','database',1),
    f('periodEnd','datetime','database',1),f('totalRequests','int','database',1),
    f('successRate','float','database',1),f('totalGasSponsored','float','database'),
    f('avgRelayTimeMs','float','database'),f('topRole','string','database'),
    f('generatedAt','datetime','database',1)
  ],SYS,0,0),
  e('gasless-relayer','RelayerNode','Active node serving as gasless relayer',0,[
    f('nodeId','uuid','database',1,1,1),f('nodeAddress','address','on-chain',1,1,1),
    f('isActive','boolean','database',1),f('uptimePct','float','database'),
    f('txThroughput','int','database'),f('registeredAt','datetime','database',1),
    f('lastHeartbeatAt','datetime','database',0,0,1),f('region','string','database'),
    f('operatedBy','address','database',1)
  ],ADM,0,0),
  e('gasless-relayer','RelayNonceRecord','Nonce management to prevent relay replay attacks',0,[
    f('nonceId','uuid','database',1,1,1),f('senderAddress','address','database',1,0,1),
    f('currentNonce','int','database',1),f('lastUsedAt','datetime','database',1),
    f('usageCount','int','database'),f('lastTxHash','bytes32','database'),
    f('replayAttempts','int','database'),f('blockedUntil','datetime','database'),
    f('updatedAt','datetime','database',1)
  ],SYS,0,0),

  /* ── did-vc-ledger ── 8 entities */
  e('did-vc-ledger','DIDDocument','Decentralized Identity Document anchored on-chain',1,[
    f('did','string','on-chain',1,1,1),f('controllerAddress','address','on-chain',1,0,1),
    f('publicKeys','json','on-chain',1),f('serviceEndpoints','json','on-chain'),
    f('created','datetime','on-chain',1),f('updated','datetime','on-chain',1),
    f('deactivated','boolean','on-chain'),f('documentHash','bytes32','on-chain',1,1),
    f('txHash','bytes32','on-chain',1)
  ],PUB,1,1),
  e('did-vc-ledger','VerifiableCredential','Verifiable credential issued to an actor',1,[
    f('vcId','string','on-chain',1,1,1),f('issuerDid','string','on-chain',1,0,1),
    f('holderDid','string','on-chain',1,0,1),f('credentialType','string','on-chain',1,0,1),
    f('issuanceDate','datetime','on-chain',1),f('expirationDate','datetime','on-chain'),
    f('credentialHash','bytes32','on-chain',1,1),f('revoked','boolean','on-chain'),
    f('txHash','bytes32','on-chain',1)
  ],AUTH,1,1),
  e('did-vc-ledger','VCRevocationRecord','On-chain revocation record for a VC',0,[
    f('revocationId','uuid','database',1,1,1),f('vcId','string','on-chain',1,0,1),
    f('issuerDid','string','on-chain',1),f('revocationReason','string','on-chain',1),
    f('revokedAt','datetime','on-chain',1),f('txHash','bytes32','on-chain',1,1),
    f('revocationStatusHash','bytes32','on-chain'),f('notifiedHolder','boolean','database'),
    f('blockHeight','int','on-chain',1)
  ],ADM,1,1),
  e('did-vc-ledger','DIDKeyRotation','Key rotation event for a DID document',0,[
    f('rotationId','uuid','database',1,1,1),f('did','string','on-chain',1,0,1),
    f('oldKeyFragment','string','on-chain',1),f('newPublicKey','string','on-chain',1),
    f('rotatedAt','datetime','on-chain',1),f('txHash','bytes32','on-chain',1,1),
    f('rotatedBy','address','on-chain',1),f('reason','string','database'),
    f('blockHeight','int','on-chain',1)
  ],AUTH,1,0),
  e('did-vc-ledger','VCPresentationLog','Log of VC presentation events for verification',0,[
    f('presentationId','uuid','database',1,1,1),f('vcId','string','database',1,0,1),
    f('holderAddress','address','database',1,0,1),f('verifierAddress','address','database',1,0,1),
    f('presentedAt','datetime','database',1,0,1),f('verificationResult','boolean','database',1),
    f('purpose','string','database',1),f('nonce','string','database',1),
    f('expiresAt','datetime','database')
  ],OWN,0,0),
  e('did-vc-ledger','IssuerRegistry','Registry of authorized VC issuers on-chain',0,[
    f('registryId','uuid','database',1,1,1),f('issuerDid','string','on-chain',1,1,1),
    f('issuerName','string','database',1),f('credentialTypes','json','on-chain',1),
    f('authorizedAt','datetime','on-chain',1),f('authorizedBy','address','on-chain',1),
    f('isActive','boolean','on-chain',1),f('txHash','bytes32','on-chain',1),
    f('jurisdiction','string','database')
  ],ADM,1,1),
  e('did-vc-ledger','VCSchema','Schema definition for a verifiable credential type',0,[
    f('schemaId','string','on-chain',1,1,1),f('credentialType','string','on-chain',1,1),
    f('schemaVersion','string','on-chain',1),f('propertiesHash','bytes32','on-chain',1,1),
    f('publishedAt','datetime','on-chain',1),f('publishedBy','address','on-chain',1),
    f('isActive','boolean','on-chain',1),f('txHash','bytes32','on-chain',1),
    f('description','text','database')
  ],ADM,1,1),
  e('did-vc-ledger','VCStatusList','Status list for efficient bulk VC revocation checks',0,[
    f('listId','uuid','database',1,1,1),f('issuerDid','string','on-chain',1,0,1),
    f('listIndex','int','on-chain',1),f('bitstring','bytes32','on-chain',1),
    f('updatedAt','datetime','on-chain',1,0,1),f('txHash','bytes32','on-chain',1),
    f('entriesCount','int','on-chain',1),f('purpose','string','on-chain',1),
    f('blockHeight','int','on-chain',1)
  ],ADM,1,1),

  /* ── aml-screening ── 8 entities */
  e('aml-screening','AMLScreeningRequest','AML screening request for a new wallet',1,[
    f('requestId','uuid','database',1,1,1),f('walletAddress','address','database',1,0,1),
    f('provider','string','database',1),f('requestedAt','datetime','database',1),
    f('status','string','database',1,0,1),f('triggeredBy','string','database',1),
    f('orgId','uuid','database',0,0,1),f('urgencyLevel','string','database'),
    f('providerRefId','string','database')
  ],SYS,0,0),
  e('aml-screening','AMLScreeningResult','Result of an AML screening check',1,[
    f('resultId','uuid','database',1,1,1),f('requestId','uuid','database',1,0,1),
    f('riskScore','float','database',1),f('riskCategory','string','database',1,0,1),
    f('sanctionsHit','boolean','database',1),f('pepMatch','boolean','database',1),
    f('adverseMediaHit','boolean','database'),f('checkedAt','datetime','database',1),
    f('providerDetail','json','database',0,0,0,1)
  ],ADM,0,0),
  e('aml-screening','AMLFlagRecord','Record of an AML flag raised for a wallet',0,[
    f('flagId','uuid','database',1,1,1),f('walletAddress','address','on-chain',1,0,1),
    f('flagType','string','on-chain',1),f('severity','string','on-chain',1),
    f('flaggedAt','datetime','on-chain',1),f('txHash','bytes32','on-chain',1),
    f('flaggedBy','string','database',1),f('reviewRequired','boolean','database',1),
    f('reviewedAt','datetime','database')
  ],ADM,1,0),
  e('aml-screening','AMLReviewDecision','Manual review decision on an AML flag',0,[
    f('decisionId','uuid','database',1,1,1),f('flagId','uuid','database',1,0,1),
    f('reviewedBy','address','database',1),f('decision','string','database',1),
    f('reasoning','text','database',1),f('decidedAt','datetime','database',1),
    f('escalatedTo','address','database'),f('txHash','bytes32','on-chain'),
    f('regulatoryReport','boolean','database')
  ],ADM,0,0),
  e('aml-screening','AMLRecheckRecord','Scheduled re-screening of a previously cleared wallet',0,[
    f('recheckId','uuid','database',1,1,1),f('walletAddress','address','database',1,0,1),
    f('scheduledFor','datetime','database',1,0,1),f('intervalDays','int','database',1),
    f('lastResult','string','database'),f('completedAt','datetime','database'),
    f('status','string','database',1),f('triggeredBy','string','database'),
    f('providerUsed','string','database')
  ],SYS,0,0),
  e('aml-screening','SanctionsListVersion','Version of sanctions list used for screening',0,[
    f('listId','uuid','database',1,1,1),f('listName','string','database',1),
    f('provider','string','database',1),f('version','string','database',1),
    f('publishedAt','datetime','database',1),f('downloadedAt','datetime','database',1),
    f('entryCount','int','database',1),f('isActive','boolean','database',1),
    f('checksum','bytes32','database',1,1)
  ],ADM,0,0),
  e('aml-screening','AMLCaseFile','Formal AML investigation case file',0,[
    f('caseId','uuid','database',1,1,1),f('flagId','uuid','database',1,0,1),
    f('walletAddress','address','database',1,0,1),f('openedAt','datetime','database',1),
    f('status','string','database',1,0,1),f('assignedTo','address','database'),
    f('closedAt','datetime','database'),f('outcome','string','database'),
    f('sarFiled','boolean','database')
  ],ADM,0,0),
  e('aml-screening','AMLAlertConfig','Configuration for AML alert thresholds',0,[
    f('configId','uuid','database',1,1,1),f('provider','string','database',1),
    f('riskScoreThreshold','float','database',1),f('autoBlockThreshold','float','database',1),
    f('recheckIntervalDays','int','database',1),f('screenOnboarding','boolean','database',1),
    f('screenOnTransact','boolean','database',1),f('approvedBy','address','database',1),
    f('effectiveFrom','datetime','database',1)
  ],ADM,0,0),
];
