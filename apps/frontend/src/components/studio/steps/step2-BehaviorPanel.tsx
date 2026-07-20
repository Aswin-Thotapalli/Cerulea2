'use client';

import React, { useState } from "react";
import {
  Box, Stack, Paper, Typography, Button, Chip, Tooltip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import BoltIcon from "@mui/icons-material/Bolt";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import CodeIcon from "@mui/icons-material/Code";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from '@mui/icons-material/Close';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import HexagonOutlinedIcon from "@mui/icons-material/HexagonOutlined";
import LogicCanvas from "../logic/LogicCanvas";
import CustomScriptPanel from "../custom/CustomScriptPanel";
import { ModuleInfo } from './step2-types';

/* ------------------------------------------------------------------ */
/* Trigger seed data: pre-filled event→action pairs per module type   */
/* ------------------------------------------------------------------ */
const TRIGGER_SEEDS: Record<string, Array<{ event: string; action: string; description: string; color: string }>> = {
  'user-auth': [
    { event: 'User.Created', action: 'Send Welcome Email', description: 'Fire when a new user account is created.', color: '#3b82f6' },
    { event: 'User.LoginFailed (3x)', action: 'Lock Account + Alert', description: 'Prevent brute-force by locking after 3 failed attempts.', color: '#ef4444' },
  ],
  'token-erc20': [
    { event: 'Transfer.Completed', action: 'Update Balance Cache', description: 'Keep off-chain balance cache in sync after every transfer.', color: '#8b5cf6' },
    { event: 'Token.Minted', action: 'Emit Notification', description: 'Notify the recipient wallet when tokens are minted to them.', color: '#10b981' },
  ],
  'governance': [
    { event: 'Proposal.Created', action: 'Notify Voters', description: 'Alert all eligible voters when a new proposal is submitted.', color: '#f59e0b' },
    { event: 'Vote.Deadline.Reached', action: 'Finalize Proposal', description: 'Auto-execute the winning outcome when voting ends.', color: '#06b6d4' },
  ],
  'consensus': [
    { event: 'BlockProposal.Created', action: 'Validate Proposer Signature', description: 'Verify the proposer is in the active validator set before propagating the block.', color: '#6366f1' },
    { event: 'FinalityRecord.Created', action: 'Broadcast Finality Proof', description: 'Distribute the 2/3-supermajority finality proof to all connected peer nodes.', color: '#8b5cf6' },
    { event: 'ConsensusNode.Slashed', action: 'Emit Slash Event + Update Stake', description: 'Reduce on-chain stake balance and push alert to the validator dashboard.', color: '#ef4444' },
  ],
  'evm-config': [
    { event: 'EVMParameter.Updated', action: 'Redeploy Contract Factory', description: 'Rebuild and redeploy factory contracts to apply the new EVM configuration.', color: '#f59e0b' },
    { event: 'EVMUpgrade.Proposed', action: 'Notify All Node Operators', description: 'Alert all node operators to download and prepare the new protocol version.', color: '#06b6d4' },
  ],
  'genesis': [
    { event: 'GenesisBlock.Initialized', action: 'Bootstrap Validator Set', description: 'Populate the initial validator set from genesis allocations and start block production.', color: '#10b981' },
    { event: 'GenesisConfig.Validated', action: 'Lock Genesis Parameters', description: 'Freeze genesis configuration and mark the chain as fully bootstrapped.', color: '#3b82f6' },
  ],
  'p2p': [
    { event: 'PeerDiscovery.Completed', action: 'Update Peer Routing Table', description: 'Refresh the Kademlia routing table with newly discovered peer addresses.', color: '#06b6d4' },
    { event: 'PeerSession.Disconnected', action: 'Trigger Reconnect Logic', description: 'Attempt reconnection within 30 s if the connected-peer count drops below the minimum threshold.', color: '#f59e0b' },
  ],
  'p2p-tls': [
    { event: 'TLSCertificate.Expiring', action: 'Rotate mTLS Certificate', description: 'Auto-rotate the node mTLS certificate before expiry using the ACME provisioning flow.', color: '#10b981' },
    { event: 'PeerHandshake.Failed', action: 'Log + Temp-Ban Peer', description: 'Record the failed handshake and apply a 10-minute cooldown ban on that peer address.', color: '#ef4444' },
  ],
  'node-permissioning': [
    { event: 'AllowlistedNode.Added', action: 'Propagate Allow-List', description: 'Push the updated node allowlist to all active validators via the permissioning contract.', color: '#3b82f6' },
    { event: 'NodePermission.Revoked', action: 'Disconnect + Alert Admin', description: 'Immediately drop the revoked node connection and alert PLATFORM_ADMIN.', color: '#ef4444' },
  ],
  'validators': [
    { event: 'ValidatorDelegation.Staked', action: 'Update Voting Power', description: "Recalculate and publish the validator's voting power based on total delegated stake.", color: '#8b5cf6' },
    { event: 'ValidatorUptime.ThresholdMissed', action: 'Jail Validator', description: 'Automatically jail a validator that misses 1,000 of the last 10,000 blocks.', color: '#ef4444' },
  ],
  'tokenomics': [
    { event: 'BlockReward.Issued', action: 'Distribute to Validators', description: 'Split the AGT block reward proportionally across active validators by staked weight.', color: '#10b981' },
    { event: 'InflationMint.Triggered', action: 'Transfer to Reward Pool', description: 'Move the 5% annual inflation mint into the validator rewards pool for next-cycle distribution.', color: '#f59e0b' },
  ],
  'fees': [
    { event: 'BaseFee.Adjusted', action: 'Update Fee Oracle', description: 'Publish the new EIP-1559 base fee to the RPC fee oracle so clients quote accurate gas prices.', color: '#06b6d4' },
    { event: 'GaslessTx.Submitted', action: 'Deduct from Sponsor Pool', description: 'Verify role eligibility and deduct the gas cost from the ecosystemFarmerFund sponsor balance.', color: '#10b981' },
  ],
  'rpc': [
    { event: 'RateLimitExceeded.Detected', action: 'Throttle + Log IP', description: 'Return HTTP 429 and log the offending IP to the rate-limit registry for monitoring.', color: '#ef4444' },
    { event: 'BatchRPC.Received', action: 'Queue + Process Async', description: 'Enqueue the batch RPC call and push results back through the async response handler.', color: '#3b82f6' },
  ],
  'graphql-gateway': [
    { event: 'IntrospectionAttempt.Blocked', action: 'Log Security Event', description: 'Record unauthorized schema introspection attempts with requester IP for audit.', color: '#ef4444' },
    { event: 'QueryDepth.Exceeded', action: 'Reject + Log Abuse', description: 'Block queries with depth > 8 and log the request for abuse monitoring dashboards.', color: '#f59e0b' },
  ],
  'ws-subscriptions': [
    { event: 'LotStageEvent.Emitted', action: 'Fan-out to Subscribers', description: 'Push lot stage-transition payload in real-time to all WebSocket clients subscribed to that lot.', color: '#8b5cf6' },
    { event: 'IoTBreachAlert.Emitted', action: 'Broadcast Breach Alert', description: 'Instantly broadcast temperature breach alerts to all subscribed dashboard connections.', color: '#ef4444' },
  ],
  'api-gateway': [
    { event: 'JWTToken.Expired', action: 'Return 401 + Invalidate Session', description: 'Clear the server-side session and return 401 so the client re-authenticates cleanly.', color: '#f59e0b' },
    { event: 'FraudRule.Triggered', action: 'Block Request + Alert Admin', description: 'Immediately block the inbound request and notify PLATFORM_ADMIN of the fraud signal.', color: '#ef4444' },
  ],
  'metrics-dashboards': [
    { event: 'ValidatorDowntime.Detected', action: 'Fire PagerDuty Critical Alert', description: 'Trigger a PagerDuty critical incident when validator uptime drops below SLA threshold.', color: '#ef4444' },
    { event: 'BlockTimeAnomaly.Detected', action: 'Create Incident + Annotate Grafana', description: 'Log the block-time anomaly for ops review and add a Grafana annotation on the timeline.', color: '#f59e0b' },
  ],
  'log-shipping': [
    { event: 'AuditLog.Written', action: 'Ship to CloudWatch + ELK', description: 'Forward each tamper-evident log entry to both CloudWatch and the ELK search index.', color: '#06b6d4' },
    { event: 'ShipmentFailed.Detected', action: 'Retry with Exponential Backoff', description: 'Apply exponential backoff retry and alert ops on 3 consecutive delivery failures.', color: '#f59e0b' },
  ],
  'backups-restore': [
    { event: 'BackupSchedule.Triggered', action: 'Snapshot + Upload to S3', description: 'Create an incremental DB snapshot and upload to S3 bucket with SSE-KMS encryption.', color: '#10b981' },
    { event: 'RestoreRequest.Created', action: 'Validate Hash + Restore', description: 'Verify the backup integrity hash before initiating the restore procedure.', color: '#3b82f6' },
  ],
  'wallet-auth': [
    { event: 'WalletProfile.Created', action: 'Trigger AML Screening', description: 'Run Chainalysis KYT check on the new wallet address before granting platform access.', color: '#8b5cf6' },
    { event: 'AuthSession.Expired', action: 'Invalidate Session Keys', description: 'Revoke all session keys bound to this expired authentication session.', color: '#ef4444' },
  ],
  'session-keys': [
    { event: 'SessionKey.Created', action: 'Bind to Device Fingerprint', description: 'Register the device fingerprint and bind the key to prevent cross-device reuse.', color: '#3b82f6' },
    { event: 'SessionKey.Revoked', action: 'Cascade Revocation to Pending Txs', description: 'Cancel any in-flight gasless transactions signed with the revoked key.', color: '#ef4444' },
  ],
  'rbac': [
    { event: 'RoleAssignment.Created', action: 'Write On-chain + Propagate', description: 'Anchor the role grant on-chain and propagate the change to all enforcement middleware.', color: '#10b981' },
    { event: 'Permission.Changed', action: 'Flush Cache + Notify User', description: 'Invalidate the permission cache for the affected user and send a security notification.', color: '#f59e0b' },
  ],
  'org-accounts': [
    { event: 'OrgMember.Invited', action: 'Send Invitation Email', description: 'Send an org-invite email with onboarding link and a temporary access token.', color: '#3b82f6' },
    { event: 'OrgMember.Removed', action: 'Revoke All Access', description: 'Strip RBAC roles, invalidate sessions, and remove from the gasless sponsor allowlist.', color: '#ef4444' },
  ],
  'kyc': [
    { event: 'KYCDocument.Submitted', action: 'Queue for Verification', description: 'Route to Sumsub (non-APEDA actors) or APEDA AgriExchange registry check queue.', color: '#06b6d4' },
    { event: 'KYCVerification.Failed', action: 'Notify + Suspend Actor', description: 'Send rejection notification and set Actor.verificationStatus = SUSPENDED on-chain.', color: '#ef4444' },
  ],
  'device-trust': [
    { event: 'DeviceTrust.Created', action: 'Issue HMAC Device Token', description: 'Generate an HMAC secret for this IoT device to authenticate temperature batch ingestion.', color: '#10b981' },
    { event: 'DeviceTrust.Revoked', action: 'Block All Device Transactions', description: 'Reject all future HMAC payloads from this device ID immediately.', color: '#ef4444' },
  ],
  'gasless-relayer': [
    { event: 'GaslessSubmission.Received', action: 'Verify Cap + Relay', description: "Check the user's daily cap, verify the meta-tx signature, then relay to chain via admin wallet.", color: '#10b981' },
    { event: 'DailyCap.Exceeded', action: 'Return 429 + Log Usage', description: 'Block further gasless transactions for today and log usage to analytics.', color: '#f59e0b' },
  ],
  'did-vc-ledger': [
    { event: 'DIDDocument.Created', action: 'Anchor Hash On-chain', description: 'Write the DID document hash to the on-chain DID registry for public verification.', color: '#8b5cf6' },
    { event: 'VerifiableCredential.Issued', action: 'Emit VC Proof On-chain', description: 'Anchor the VC proof hash on-chain and notify the credential holder.', color: '#10b981' },
  ],
  'aml-screening': [
    { event: 'AMLFlagRecord.Created', action: 'Suspend Actor + Alert Admin', description: 'Immediately set Actor.verificationStatus = SUSPENDED and alert PLATFORM_ADMIN.', color: '#ef4444' },
    { event: 'AMLScreening.Passed', action: 'Mark Actor Verified', description: 'Update Actor.verificationStatus = VERIFIED and log the screening result for audit.', color: '#10b981' },
  ],
  'traceability-ledger': [
    { event: 'MangoLot.Created', action: 'Assign Lot Number On-chain', description: 'Generate lotNumber (AT-{VAR3}-{YYYY}-{SEQ5}) and write the MangoLot record to chain.', color: '#10b981' },
    { event: 'LotStageTransition.Emitted', action: 'Notify Stage Stakeholders', description: 'Push notification to all role-holders responsible for the newly entered stage.', color: '#3b82f6' },
    { event: 'LotStageTransition.REJECTED', action: 'Halt Lot + Alert', description: 'Block all further stage events for this lot and alert FARMER + APEDA_OFFICER.', color: '#ef4444' },
  ],
  'cold-chain-monitoring': [
    { event: 'IoTDeviceSession.Created', action: 'Begin Temperature Monitoring', description: 'Start accepting HMAC-validated temperature batches from the paired IoT device every 5 minutes.', color: '#06b6d4' },
    { event: 'TemperatureReading.Breach', action: 'Create BreachAlert On-chain', description: 'Write IoTBreachAlert, push notifications to operators, and fire PagerDuty if > threshold + 5°C.', color: '#ef4444' },
  ],
  'port-customs-events': [
    { event: 'ShippingBill.Filed', action: 'Validate via ICEGATE API', description: 'Verify shippingBillNumber format and existence against the ICEGATE API.', color: '#8b5cf6' },
    { event: 'LEOStatus.Received', action: 'Advance Lot to Cold Storage', description: 'Set MangoLot.currentStage = COLD_STORAGE when LEO is granted by customs.', color: '#10b981' },
  ],
  'quality-recall-ledger': [
    { event: 'RecallEvent.Created', action: 'Broadcast Recall Alert', description: 'Push urgent notification and email to all role-holders linked to the recalled lot.', color: '#ef4444' },
    { event: 'QualityViolation.Detected', action: 'Create ComplianceViolation On-chain', description: 'Write ComplianceViolation record and halt lot progression until remediation is recorded.', color: '#f59e0b' },
  ],
  'evidence-chain': [
    { event: 'DocumentHash.Created', action: 'Anchor On-chain + Pin to IPFS', description: 'Write hash to on-chain registry and pin the referenced PDF to IPFS via Pinata.', color: '#8b5cf6' },
    { event: 'EvidenceItem.Challenged', action: 'Lock Chain + Notify Arbitrator', description: 'Lock the evidence chain for this lot and alert the assigned arbitrator for review.', color: '#ef4444' },
  ],
  'trade-finance-docs': [
    { event: 'CertificateOfOrigin.Created', action: 'Validate via APEDA AgriExchange', description: 'Call APEDA AgriExchange API to verify exporter registration and CoO details.', color: '#10b981' },
    { event: 'BillOfLading.Created', action: 'Validate ISO 6346 + Activate Tracking', description: 'Check containerNumber format and activate the in-transit IoT monitoring session.', color: '#3b82f6' },
  ],
  'compliance-attestations': [
    { event: 'ComplianceAttestation.Created', action: 'Anchor + Mint Certificate NFT', description: 'Write attestation hash on-chain and mint a soulbound CertificateNFT to the issuing authority.', color: '#8b5cf6' },
    { event: 'AttestationExpiry.Approaching', action: 'Alert Issuing Authority', description: 'Send a 7-day advance warning to APEDA_OFFICER and NPPO_INSPECTOR for renewal.', color: '#f59e0b' },
  ],
  'provenance-notary': [
    { event: 'ProvenanceRecord.Created', action: 'Pin to IPFS + Anchor On-chain', description: 'Pin the document to IPFS via Pinata and anchor its hash to the on-chain provenance registry.', color: '#10b981' },
    { event: 'TrustAnchor.Revoked', action: 'Cascade Revoke Downstream Certs', description: 'Invalidate all CertificateNFTs whose trust anchor is this revoked provenance record.', color: '#ef4444' },
  ],
  'onchain-data': [
    { event: 'OnChainEvent.Emitted', action: 'Index in Subgraph', description: 'Forward the event to the Subgraph Indexer for efficient off-chain query access.', color: '#6366f1' },
    { event: 'OnChainEvent.Emitted', action: 'Ship to ELK Stack', description: 'Forward the on-chain event log to the ELK stack for full-text search and long-term audit.', color: '#06b6d4' },
  ],
  'oracles': [
    { event: 'OracleDataFeed.Updated', action: 'Push to Smart Contract Consumers', description: 'Propagate the latest oracle value to all on-chain consumers subscribed to this feed.', color: '#f59e0b' },
    { event: 'OracleFeed.StaleDetected', action: 'Alert + Switch to Backup Source', description: 'Alert PLATFORM_ADMIN and automatically switch to the configured backup data provider.', color: '#ef4444' },
  ],
  'webhooks-inbound': [
    { event: 'WebhookPayload.Received', action: 'Validate HMAC Signature', description: 'Reject the payload immediately if the HMAC-SHA256 signature does not match the shared secret.', color: '#8b5cf6' },
    { event: 'IoTBatch.Received', action: 'Queue for Dedup + Threshold Check', description: 'Enqueue the IoT batch for deduplication and breach-threshold evaluation.', color: '#06b6d4' },
  ],
  'webhooks-outbound': [
    { event: 'OutboundWebhook.Triggered', action: 'Sign Payload + Dispatch', description: 'Sign the outbound payload with the platform key and deliver to the subscriber endpoint.', color: '#3b82f6' },
    { event: 'DeliveryFailed (3x)', action: 'Mark Dead + Alert Admin', description: 'After 3 exponential-backoff retries, mark the webhook dead and notify PLATFORM_ADMIN.', color: '#ef4444' },
  ],
  'subgraph-indexer': [
    { event: 'BlockIndexed.Completed', action: 'Refresh GraphQL Query Cache', description: 'Invalidate and warm the GraphQL query cache with the latest indexed block data.', color: '#10b981' },
    { event: 'IndexLag.Detected', action: 'Alert + Trigger Re-index', description: 'Alert ops when subgraph lag exceeds 100 blocks and restart indexing from the last checkpoint.', color: '#ef4444' },
  ],
  'notifications': [
    { event: 'PushNotification.Created', action: 'Dispatch by Channel + Role', description: 'Route the notification to the correct channel (push, in-app, WhatsApp) based on actor role preference.', color: '#3b82f6' },
    { event: 'NotificationDelivery.Failed', action: 'Retry + Fallback Channel', description: 'Retry 3 times then failover to the secondary channel (e.g., SMS if push fails).', color: '#f59e0b' },
  ],
  'emails': [
    { event: 'Email.Created', action: 'Send via Resend', description: 'Submit to the Resend API from agrotrace.in sender domain and track delivery status.', color: '#10b981' },
    { event: 'ResendDelivery.Failed', action: 'Fallback to SendGrid', description: 'Retry once on Resend then transparently switch to SendGrid as backup provider.', color: '#f59e0b' },
  ],
  'audit-logs': [
    { event: 'AuditEntry.Written', action: 'Compute SHA-256 Chain Hash', description: 'Append a SHA-256 hash linking each entry to the previous one to prevent log tampering.', color: '#8b5cf6' },
    { event: 'AuditExport.Requested', action: 'Generate Signed PDF', description: 'Assemble chronological event timeline and sign the PDF with the AWS KMS platform key.', color: '#3b82f6' },
  ],
  'audit-export': [
    { event: 'AuditTrailExport.Requested', action: 'Compile + KMS-Sign PDF', description: 'Compile all LotStageTransitions in chronological order and sign the PDF with the KMS platform key.', color: '#6366f1' },
    { event: 'ExportCompleted', action: 'Upload to S3 + Email Download Link', description: 'Upload the signed PDF to S3 and email the secure download link to the requestor.', color: '#10b981' },
  ],
  'produce-grades': [
    { event: 'GradeStandard.Updated', action: 'Propagate to Active Lots', description: 'Push updated APEDA grading criteria to all lots currently in the PACKHOUSE stage.', color: '#f59e0b' },
    { event: 'GradeViolation.Detected', action: 'Block Lot Advance', description: 'Prevent the lot from progressing to TREATMENT until a grade re-assessment is recorded.', color: '#ef4444' },
  ],
  'document-signing': [
    { event: 'SignRequest.Created', action: 'Check Signer Capability', description: 'Route to on-chain wallet signature if available, otherwise delegate to DocuSign for small farmers.', color: '#8b5cf6' },
    { event: 'SignatureComplete', action: 'Anchor Document Hash On-chain', description: 'Write the document hash and signer wallet address to the on-chain ProvenanceRecord.', color: '#10b981' },
  ],
  'fraud-rules': [
    { event: 'DuplicateLot.Detected', action: 'Block + Create Fraud Alert', description: 'Block the FarmRegistration immediately and alert PLATFORM_ADMIN with duplicate lot details.', color: '#ef4444' },
    { event: 'RoleMismatch.Detected', action: 'Reject Action + Log Violation', description: 'Reject the attempted action and write a ComplianceViolation on-chain for audit.', color: '#f59e0b' },
  ],
  'privacy-compliance': [
    { event: 'ConsentRecord.Revoked', action: 'Anonymize Linked PII', description: 'Trigger the PDPB data-minimization pipeline to anonymize all PII records linked to this consent.', color: '#8b5cf6' },
    { event: 'DataRetention.Expired', action: 'Schedule Secure Deletion', description: 'Queue expired personal data for PDPB-compliant secure deletion from all storage tiers.', color: '#ef4444' },
  ],
  'treasury': [
    { event: 'FeeCollection.Received', action: 'Split Across Treasury Accounts', description: 'Distribute the per-lot fee: 60% platform, 20% validators, 10% ecosystem fund, 10% reserve.', color: '#10b981' },
    { event: 'ValidatorReward.Pending', action: 'Distribute Per-block Proportionally', description: 'Release staking rewards to validators each block, proportional to delegated stake weight.', color: '#f59e0b' },
  ],
  'escrow-settlement': [
    { event: 'EscrowRecord.Created', action: 'Lock Funds in Smart Contract', description: 'Lock buyer payment in the escrow contract pending successful lot delivery and acceptance.', color: '#8b5cf6' },
    { event: 'BuyerReceipt.Accepted', action: 'Release Funds to Exporter', description: 'Trigger EscrowRecord release and send payment notification to the FARMER.', color: '#10b981' },
    { event: 'BuyerReceipt.Rejected', action: 'Hold Escrow + Open Dispute', description: 'Keep funds locked and auto-trigger the dispute evidence assembly workflow.', color: '#ef4444' },
  ],
  'invoices-billing': [
    { event: 'Invoice.Created', action: 'Email PDF to Buyer', description: 'Send the invoice PDF (AGT-INV prefix, INR + 18% GST) to the buyer contact on record.', color: '#3b82f6' },
    { event: 'Invoice.Overdue', action: 'Send Reminder + Suspend Lot', description: 'Email a payment reminder and suspend lot progression until payment is confirmed.', color: '#f59e0b' },
  ],
  'razorpay-adapter': [
    { event: 'PaymentOrder.Created', action: 'Generate Razorpay Checkout', description: 'Create a Razorpay order with INR amount + 18% GST and return the checkout URL to the payer.', color: '#06b6d4' },
    { event: 'Payment.Confirmed', action: 'Mark Invoice PAID + Release Gate', description: 'Update Invoice.status = PAID and trigger the lot-release gate for the next stage.', color: '#10b981' },
  ],
  'soulbound-token': [
    { event: 'SoulboundToken.Minted', action: 'Register in DID Ledger', description: "Link the new soulbound token to the holder's DID document on-chain for verifiable binding.", color: '#8b5cf6' },
    { event: 'SoulboundToken.RevocationRequested', action: 'Verify Authority + Revoke', description: 'Confirm the requestor holds the APEDA_OFFICER role before executing on-chain revocation.', color: '#ef4444' },
  ],
  'erc721': [
    { event: 'NFTToken.Minted', action: 'Pin Metadata to IPFS', description: 'Upload certificate metadata JSON to IPFS via Pinata and set the on-chain tokenURI.', color: '#8b5cf6' },
    { event: 'NFTToken.TransferAttempted', action: 'Enforce Soulbound Rule', description: 'Block the transfer and revert with SOULBOUND_NON_TRANSFERABLE if the token was minted as soulbound.', color: '#ef4444' },
  ],
  '_default': [
    { event: 'Record.Created', action: 'Index for Search', description: 'Update the search index when a new record is added.', color: '#3b82f6' },
    { event: 'Record.Updated', action: 'Write Audit Log', description: 'Track all changes in the audit log for compliance.', color: '#10b981' },
  ],
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
interface BehaviorPanelProps {
  blueprintModules: ModuleInfo[];
}

export default function BehaviorPanel({ blueprintModules }: BehaviorPanelProps) {
  const theme = useTheme();

  const [customTriggers, setCustomTriggers] = useState<Record<string, Array<{ event: string; action: string; description: string; color: string }>>>({});
  const [customTriggerModuleId, setCustomTriggerModuleId] = useState<string | null>(null);
  const [newTriggerEvent, setNewTriggerEvent] = useState('');
  const [newTriggerAction, setNewTriggerAction] = useState('');
  const [newTriggerDesc, setNewTriggerDesc] = useState('');
  const [triggerModeMap, setTriggerModeMap] = useState<Record<string, 'cards' | 'visual' | 'code'>>({});

  const getTriggerMode = (modId: string) => triggerModeMap[modId] || 'cards';
  const setTriggerMode = (modId: string, mode: 'cards' | 'visual' | 'code') =>
    setTriggerModeMap((prev) => ({ ...prev, [modId]: mode }));

  return (
    <>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto', bgcolor: 'background.default' }}>
        {/* Header */}
        <Box sx={{
          px: 4, py: 2.5, borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
          bgcolor: 'background.paper',
          background: theme.palette.mode === 'dark'
            ? `linear-gradient(135deg, ${alpha('#4F46E5', 0.07)} 0%, transparent 100%)`
            : alpha(theme.palette.primary.main, 0.02),
          flexShrink: 0,
        }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                <BoltIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                <Typography variant="h6" fontWeight={800}>Logic &amp; Triggers</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Define what happens automatically when events occur in your app. Each trigger connects an event (e.g., "User created") to one or more actions (e.g., "Send email"). Pre-filled triggers are recommended best-practices for your modules.
              </Typography>
            </Box>
            <Tooltip
              title="Triggers fire automatically when entity events occur. Example: when a Payment is Created, run SendEmail and MintNFT. No backend code needed."
              placement="left" arrow
              componentsProps={{ tooltip: { sx: { bgcolor: 'background.paper', color: 'text.primary', border: '1px solid', borderColor: 'divider', boxShadow: '0 8px 32px rgba(0,0,0,0.25)', borderRadius: 2, p: 1.5, maxWidth: 300, fontSize: '0.8rem' } } }}
            >
              <Chip
                label="How triggers work"
                size="small" variant="outlined"
                icon={<AutoFixHighIcon sx={{ fontSize: '0.9rem !important' }} />}
                sx={{ fontWeight: 600, fontSize: '0.72rem', cursor: 'help', flexShrink: 0, mt: 0.5 }}
              />
            </Tooltip>
          </Stack>
        </Box>

        {/* Per-module trigger cards */}
        <Box sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
          {blueprintModules.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 12, opacity: 0.5 }}>
              <BoltIcon sx={{ fontSize: 48, mb: 1 }} />
              <Typography>No modules yet. Add modules in the Blueprint Builder first.</Typography>
            </Box>
          ) : (
            <Stack spacing={2.5}>
              {blueprintModules.map((mod) => {
                const mode = getTriggerMode(mod.id);
                const seeds = [...(TRIGGER_SEEDS[mod.id] || TRIGGER_SEEDS['_default'] || []), ...(customTriggers[mod.id] || [])];
                return (
                  <Paper
                    key={mod.id}
                    variant="outlined"
                    sx={{
                      borderRadius: 1.5, overflow: 'hidden',
                      borderColor: alpha(theme.palette.primary.main, 0.15),
                      '&:hover': { borderColor: alpha(theme.palette.primary.main, 0.28) },
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    {/* Module header */}
                    <Box sx={{
                      px: 3, py: 2, borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                      background: theme.palette.mode === 'dark'
                        ? `linear-gradient(135deg, ${alpha('#4F46E5', 0.1)} 0%, ${alpha(theme.palette.background.paper, 0.8)} 100%)`
                        : alpha(theme.palette.primary.main, 0.04),
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <HexagonOutlinedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                        <Typography variant="subtitle2" fontWeight={800}>{mod.label}</Typography>
                        {mod.category && (
                          <Chip label={mod.category} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 16 }} />
                        )}
                      </Stack>
                      <Stack direction="row" spacing={0.75}>
                        {(['cards', 'visual', 'code'] as const).map((m) => (
                          <Paper
                            key={m}
                            variant="outlined"
                            onClick={() => setTriggerMode(mod.id, m)}
                            sx={{
                              px: 1.5, py: 0.5, borderRadius: 1, cursor: 'pointer',
                              fontWeight: 700, fontSize: '0.7rem',
                              bgcolor: mode === m ? 'primary.main' : 'background.paper',
                              color: mode === m ? 'white' : 'text.secondary',
                              borderColor: mode === m ? 'primary.main' : 'divider',
                              display: 'flex', alignItems: 'center', gap: 0.5,
                            }}
                            elevation={0}
                          >
                            {m === 'cards' && <BoltIcon sx={{ fontSize: 12 }} />}
                            {m === 'visual' && <AccountTreeIcon sx={{ fontSize: 12 }} />}
                            {m === 'code' && <CodeIcon sx={{ fontSize: 12 }} />}
                            {m === 'cards' ? 'Rules' : m === 'visual' ? 'Visual' : 'Script'}
                          </Paper>
                        ))}
                      </Stack>
                    </Box>

                    {/* Content area */}
                    <Box sx={{ p: mode === 'cards' ? 2.5 : 0 }}>
                      {mode === 'cards' && (
                        <Stack spacing={1.5}>
                          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5 }}>
                            RECOMMENDED TRIGGERS FOR {mod.label.toUpperCase()}
                          </Typography>
                          <Stack spacing={1}>
                            {seeds.map((t, i) => (
                              <Paper
                                key={i}
                                variant="outlined"
                                sx={{
                                  p: 1.75, borderRadius: 1,
                                  borderColor: alpha(t.color, 0.25),
                                  bgcolor: alpha(t.color, 0.025),
                                }}
                              >
                                <Stack direction="row" alignItems="flex-start" spacing={2}>
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 0.5 }}>WHEN</Typography>
                                    <Box sx={{
                                      mt: 0.5, px: 1.25, py: 0.6, borderRadius: 0.75,
                                      display: 'inline-flex', alignItems: 'center', gap: 0.75,
                                      bgcolor: alpha(t.color, 0.08), border: `1px solid ${alpha(t.color, 0.35)}`,
                                    }}>
                                      <BoltIcon sx={{ fontSize: 12, color: t.color }} />
                                      <Typography variant="body2" fontWeight={700} sx={{ color: t.color, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                        {t.event}
                                      </Typography>
                                    </Box>
                                  </Box>
                                  <Box sx={{ mt: 2.5, color: 'text.disabled', fontWeight: 900, fontSize: '1rem', flexShrink: 0 }}>→</Box>
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 0.5 }}>THEN</Typography>
                                    <Box sx={{
                                      mt: 0.5, px: 1.25, py: 0.6, borderRadius: 0.75,
                                      display: 'inline-flex', alignItems: 'center', gap: 0.75,
                                      bgcolor: alpha(theme.palette.success.main, 0.07), border: `1px solid ${alpha(theme.palette.success.main, 0.25)}`,
                                    }}>
                                      <AutoFixHighIcon sx={{ fontSize: 12, color: 'success.main' }} />
                                      <Typography variant="body2" fontWeight={700} sx={{ color: 'success.main', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                        {t.action}
                                      </Typography>
                                    </Box>
                                  </Box>
                                  <Box sx={{ flex: 1.5 }}>
                                    <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 0.5 }}>WHY</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.4 }}>{t.description}</Typography>
                                  </Box>
                                </Stack>
                              </Paper>
                            ))}
                          </Stack>
                          <Button
                            startIcon={<AddIcon />}
                            variant="outlined"
                            size="small"
                            onClick={() => { setCustomTriggerModuleId(mod.id); setNewTriggerEvent(''); setNewTriggerAction(''); setNewTriggerDesc(''); }}
                            sx={{ borderRadius: 2, alignSelf: 'flex-start', mt: 0.5, fontWeight: 700 }}
                          >
                            Add Custom Trigger
                          </Button>
                        </Stack>
                      )}
                      {mode === 'visual' && (
                        <Box sx={{ position: 'relative', height: 400 }}>
                          <Box sx={{
                            position: 'absolute', inset: 0, zIndex: 0,
                            bgcolor: theme.palette.mode === 'dark' ? alpha('#080E24', 0.9) : alpha('#f8f9ff', 0.95),
                            backgroundImage: 'radial-gradient(rgba(79,70,229,0.15) 1px, transparent 1px)',
                            backgroundSize: '24px 24px',
                          }} />
                          <Box sx={{
                            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2,
                            display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1,
                            bgcolor: alpha(theme.palette.background.paper, 0.85),
                            borderBottom: `1px solid ${theme.palette.divider}`,
                            backdropFilter: 'blur(8px)',
                          }}>
                            <Chip label="DAPP" size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 800, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', border: 'none' }} />
                            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ fontSize: '0.68rem' }}>Visual Flow Editor</Typography>
                            <Box sx={{ flex: 1 }} />
                            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>Click + drag to connect trigger nodes</Typography>
                          </Box>
                          <Box sx={{ position: 'absolute', top: 40, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
                            <LogicCanvas />
                          </Box>
                        </Box>
                      )}
                      {mode === 'code' && (
                        <Box sx={{ position: 'relative' }}>
                          <Box sx={{
                            display: 'flex', alignItems: 'center', gap: 1, px: 2.5, py: 1.25,
                            bgcolor: '#1a1f3a',
                            borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                          }}>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {['#ef4444', '#f59e0b', '#10b981'].map(c => <Box key={c} sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: c }} />)}
                            </Box>
                            <Typography variant="caption" sx={{ color: '#6b7db3', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                              trigger.{mod.id.replace(/-/g, '_')}.ts
                            </Typography>
                            <Box sx={{ flex: 1 }} />
                            <Chip label="TypeScript" size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: alpha('#3b82f6', 0.15), color: '#60a5fa', border: 'none' }} />
                          </Box>
                          <Box sx={{ height: 480, bgcolor: theme.palette.mode === 'dark' ? '#0d1117' : '#1e1e2e' }}>
                            <CustomScriptPanel projectId="" />
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Box>
      </Box>

      {/* Custom trigger dialog */}
      <Dialog open={!!customTriggerModuleId} onClose={() => setCustomTriggerModuleId(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Add Custom Trigger</span>
          <IconButton size="small" onClick={() => setCustomTriggerModuleId(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} pt={1}>
            <TextField
              label="When (Event)" size="small" fullWidth
              placeholder="e.g. User.SignedUp, Payment.Completed"
              value={newTriggerEvent} onChange={(e) => setNewTriggerEvent(e.target.value)}
              helperText="The event that triggers this rule"
            />
            <TextField
              label="Then (Action)" size="small" fullWidth
              placeholder="e.g. Send Welcome Email, Mint NFT"
              value={newTriggerAction} onChange={(e) => setNewTriggerAction(e.target.value)}
              helperText="What happens when the event fires"
            />
            <TextField
              label="Why (Description)" size="small" fullWidth multiline rows={2}
              placeholder="Explain the business purpose of this trigger..."
              value={newTriggerDesc} onChange={(e) => setNewTriggerDesc(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCustomTriggerModuleId(null)} sx={{ borderRadius: 1 }}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!newTriggerEvent.trim() || !newTriggerAction.trim()}
            onClick={() => {
              if (!customTriggerModuleId) return;
              setCustomTriggers(prev => ({
                ...prev,
                [customTriggerModuleId]: [...(prev[customTriggerModuleId] || []), {
                  event: newTriggerEvent.trim(),
                  action: newTriggerAction.trim(),
                  description: newTriggerDesc.trim() || 'Custom trigger',
                  color: '#8b5cf6',
                }],
              }));
              setCustomTriggerModuleId(null);
            }}
            sx={{ borderRadius: 1, fontWeight: 700 }}
          >
            Add Trigger
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
