'use strict';
let _c=9000;
const sid=()=>`s${String(++_c).padStart(5,'0')}`;
const f=(n,t,s,r,u,i,e)=>({id:sid(),name:n,type:t,storage:s,required:!!r,unique:!!u,indexed:!!i,encrypted:!!e});
const ADM={create:'admin',read:'admin',update:'admin',delete:'admin'};
const SYS={create:'admin',read:'auth',update:'admin',delete:'admin'};
const AUTH={create:'auth',read:'auth',update:'owner',delete:'admin'};
const OWN={create:'owner',read:'owner',update:'owner',delete:'admin'};
const PUB={create:'auth',read:'public',update:'owner',delete:'admin'};
const e=(m,n,d,c,fs,a,o,p)=>({id:sid(),moduleId:m,name:n,description:d||undefined,isCore:!!c,fields:fs,access:a||AUTH,onChain:!!o,apiPublic:p!==undefined?!!p:true});

module.exports=[
  /* ── onchain-data ── 8 entities */
  e('onchain-data','OnChainEvent','Immutable blockchain event record',1,[
    f('eventId','uuid','database',1,1,1),f('contractAddress','address','on-chain',1,0,1),
    f('eventName','string','on-chain',1,0,1),f('payload','json','on-chain',1),
    f('blockHeight','int','on-chain',1,0,1),f('txHash','bytes32','on-chain',1,1),
    f('emittedAt','datetime','on-chain',1),f('logIndex','int','on-chain',1),
    f('topicHash','bytes32','on-chain',1)
  ],SYS,1,1),
  e('onchain-data','StorageSlotRecord','Smart contract storage slot snapshot',0,[
    f('slotId','uuid','database',1,1,1),f('contractAddress','address','on-chain',1,0,1),
    f('slotKey','bytes32','on-chain',1),f('slotValue','bytes32','on-chain',1),
    f('blockHeight','int','on-chain',1,0,1),f('capturedAt','datetime','on-chain',1),
    f('slotType','string','database'),f('decoded','json','database'),
    f('txHash','bytes32','on-chain')
  ],ADM,1,0),
  e('onchain-data','EventIndexRecord','Indexed event record for fast off-chain querying',0,[
    f('indexId','uuid','database',1,1,1),f('eventId','uuid','database',1,0,1),
    f('lotId','uuid','database',0,0,1),f('entityType','string','database',1,0,1),
    f('entityId','uuid','database',0,0,1),f('indexedAt','datetime','database',1,0,1),
    f('searchableFields','json','database'),f('blockHeight','int','database',1),
    f('schemaVersion','string','database',1)
  ],SYS,0,1),
  e('onchain-data','ContractState','Snapshot of smart contract state at a block',0,[
    f('stateId','uuid','database',1,1,1),f('contractAddress','address','on-chain',1,0,1),
    f('blockHeight','int','on-chain',1,0,1),f('stateHash','bytes32','on-chain',1,1),
    f('capturedAt','datetime','on-chain',1),f('variableCount','int','database'),
    f('storageRoot','bytes32','on-chain',1),f('codeHash','bytes32','on-chain',1),
    f('balanceAGT','float','on-chain')
  ],ADM,1,0),
  e('onchain-data','ImmutableLookupTable','Immutable reference table anchored on-chain',0,[
    f('tableId','uuid','database',1,1,1),f('tableName','string','on-chain',1,1),
    f('entries','json','on-chain',1),f('contentHash','bytes32','on-chain',1,1),
    f('anchoredAt','datetime','on-chain',1),f('anchoredBy','address','on-chain',1),
    f('txHash','bytes32','on-chain',1,1),f('version','int','on-chain',1),
    f('description','text','database')
  ],ADM,1,1),
  e('onchain-data','DataWriteTransaction','Transaction record for on-chain data write operations',0,[
    f('writeTxId','uuid','database',1,1,1),f('txHash','bytes32','on-chain',1,1,1),
    f('contractAddress','address','on-chain',1,0,1),f('method','string','on-chain',1),
    f('callerAddress','address','on-chain',1),f('blockHeight','int','on-chain',1,0,1),
    f('gasUsed','int','on-chain',1),f('writtenAt','datetime','on-chain',1),
    f('dataSize','int','on-chain')
  ],SYS,1,0),
  e('onchain-data','ChainSyncState','Current synchronization state of off-chain indexers',0,[
    f('syncId','uuid','database',1,1,1),f('indexerName','string','database',1,0,1),
    f('lastIndexedBlock','int','database',1,0,1),f('chainHeadBlock','int','database',1),
    f('syncLag','int','database'),f('lastSyncedAt','datetime','database',1,0,1),
    f('isHealthy','boolean','database',1),f('errorCount','int','database'),
    f('indexerVersion','string','database')
  ],SYS,0,0),
  e('onchain-data','DataAccessPolicy','Policy defining who can read on-chain data via API',0,[
    f('policyId','uuid','database',1,1,1),f('contractAddress','address','database',1,0,1),
    f('readRole','string','database',1),f('writeRole','string','database',1),
    f('encryptionRequired','boolean','database',1),f('effectiveFrom','datetime','database',1),
    f('approvedBy','address','database',1),f('policyHash','bytes32','database',1,1),
    f('notes','text','database')
  ],ADM,0,0),

  /* ── oracles ── 8 entities */
  e('oracles','OracleDataFeed','Registered oracle data feed for the platform',1,[
    f('feedId','uuid','database',1,1,1),f('feedName','string','database',1,1),
    f('provider','string','database',1,0,1),f('feedType','string','database',1),
    f('updateIntervalSecs','int','database',1),f('isActive','boolean','database',1),
    f('contractAddress','address','on-chain',0,0,1),f('addedAt','datetime','database',1),
    f('description','text','database')
  ],ADM,0,0),
  e('oracles','OracleDataPoint','Single oracle data point published to chain',0,[
    f('pointId','uuid','database',1,1,1),f('feedId','uuid','database',1,0,1),
    f('value','json','on-chain',1),f('publishedAt','datetime','on-chain',1,0,1),
    f('txHash','bytes32','on-chain',1,1),f('blockHeight','int','on-chain',1),
    f('source','string','database',1),f('confidence','float','database'),
    f('signatureHash','bytes32','on-chain')
  ],SYS,1,1),
  e('oracles','IoTDataIngestion','Batch IoT sensor data ingested via oracle',0,[
    f('ingestionId','uuid','database',1,1,1),f('deviceId','uuid','database',1,0,1),
    f('lotId','uuid','database',1,0,1),f('batchSize','int','database',1),
    f('ingestedAt','datetime','database',1,0,1),f('rawDataHash','bytes32','database',1),
    f('validReadings','int','database'),f('rejectedReadings','int','database'),
    f('processingStatus','string','database',1)
  ],AUTH,0,0),
  e('oracles','APEDAApiFetch','Result of a data fetch from the APEDA AgriExchange API',0,[
    f('fetchId','uuid','database',1,1,1),f('endpoint','string','database',1),
    f('queryParams','json','database',1),f('responseCode','int','database',1),
    f('responseHash','bytes32','database'),f('fetchedAt','datetime','database',1,0,1),
    f('retryCount','int','database'),f('cacheHit','boolean','database'),
    f('recordsReturned','int','database')
  ],SYS,0,0),
  e('oracles','ICEGATEApiFetch','Result of a fetch from the ICEGATE shipping bill API',0,[
    f('fetchId','uuid','database',1,1,1),f('shippingBillNo','string','database',1,0,1),
    f('endpoint','string','database',1),f('status','string','database',1,0,1),
    f('fetchedAt','datetime','database',1,0,1),f('responseHash','bytes32','database'),
    f('retryCount','int','database'),f('leoStatus','string','database'),
    f('portCode','string','database')
  ],SYS,0,0),
  e('oracles','OracleNodeRecord','Registered oracle node operator',0,[
    f('nodeId','uuid','database',1,1,1),f('nodeAddress','address','on-chain',1,1,1),
    f('operatorName','string','database',1),f('feedsProvided','json','database'),
    f('registeredAt','datetime','database',1),f('isActive','boolean','database',1),
    f('uptimePct','float','database'),f('lastHeartbeatAt','datetime','database',0,0,1),
    f('stakeAGT','float','on-chain')
  ],ADM,0,0),
  e('oracles','OracleDisputeRecord','Disputed oracle data point with evidence',0,[
    f('disputeId','uuid','database',1,1,1),f('pointId','uuid','database',1,0,1),
    f('disputedBy','address','database',1),f('disputeReason','text','database',1),
    f('raisedAt','datetime','database',1),f('status','string','database',1,0,1),
    f('resolvedAt','datetime','database'),f('resolution','string','database'),
    f('penaltyApplied','float','database')
  ],AUTH,0,0),
  e('oracles','OracleHealthLog','Health check log for oracle data feeds',0,[
    f('logId','uuid','database',1,1,1),f('feedId','uuid','database',1,0,1),
    f('checkedAt','datetime','database',1,0,1),f('isHealthy','boolean','database',1),
    f('latencyMs','int','database'),f('lastValueAge','int','database'),
    f('alertSent','boolean','database'),f('errorDetail','text','database'),
    f('consecutiveFailures','int','database')
  ],SYS,0,0),

  /* ── webhooks-inbound ── 8 entities */
  e('webhooks-inbound','InboundWebhookEndpoint','Registered inbound webhook endpoint',1,[
    f('endpointId','uuid','database',1,1,1),f('path','string','database',1,1),
    f('secretHash','bytes32','database',1,0,0,1),f('signatureMethod','string','database',1),
    f('isActive','boolean','database',1),f('createdBy','address','database',1),
    f('createdAt','datetime','database',1),f('allowedSources','json','database'),
    f('eventTypes','json','database',1)
  ],ADM,0,0),
  e('webhooks-inbound','InboundWebhookEvent','Received inbound webhook event',0,[
    f('eventId','uuid','database',1,1,1),f('endpointId','uuid','database',1,0,1),
    f('eventType','string','database',1,0,1),f('payloadHash','bytes32','database',1),
    f('sourceIp','string','database',1),f('receivedAt','datetime','database',1,0,1),
    f('processingStatus','string','database',1,0,1),f('retryCount','int','database'),
    f('errorDetail','text','database')
  ],SYS,0,0),
  e('webhooks-inbound','WebhookSignatureVerification','Signature verification result for an inbound webhook',0,[
    f('verifyId','uuid','database',1,1,1),f('eventId','uuid','database',1,0,1),
    f('signatureHeader','string','database',1),f('computedSignature','bytes32','database',1),
    f('isValid','boolean','database',1),f('verifiedAt','datetime','database',1,0,1),
    f('endpointId','uuid','database',1),f('failureReason','string','database'),
    f('sourceIdentity','string','database')
  ],SYS,0,0),
  e('webhooks-inbound','WebhookBatchRecord','Batch of inbound webhook events processed together',0,[
    f('batchId','uuid','database',1,1,1),f('endpointId','uuid','database',1,0,1),
    f('eventCount','int','database',1),f('processedAt','datetime','database',1,0,1),
    f('successCount','int','database',1),f('failureCount','int','database'),
    f('processingTimeMs','int','database'),f('batchHash','bytes32','database'),
    f('retried','boolean','database')
  ],SYS,0,0),
  e('webhooks-inbound','WebhookRetryRecord','Retry record for a failed inbound webhook event',0,[
    f('retryId','uuid','database',1,1,1),f('eventId','uuid','database',1,0,1),
    f('attemptNumber','int','database',1),f('attemptedAt','datetime','database',1,0,1),
    f('success','boolean','database',1),f('errorCode','string','database'),
    f('nextRetryAt','datetime','database'),f('maxAttemptsReached','boolean','database'),
    f('resolvedAt','datetime','database')
  ],SYS,0,0),
  e('webhooks-inbound','WebhookSourceAllowlist','Allowlisted source IPs or domains for webhooks',0,[
    f('allowId','uuid','database',1,1,1),f('sourceIdentifier','string','database',1,1),
    f('identifierType','string','database',1),f('addedBy','address','database',1),
    f('addedAt','datetime','database',1),f('expiresAt','datetime','database'),
    f('isActive','boolean','database',1),f('notes','text','database'),
    f('endpointIds','json','database')
  ],ADM,0,0),
  e('webhooks-inbound','WebhookEventRouting','Routing rule for inbound webhook event types',0,[
    f('routingId','uuid','database',1,1,1),f('eventType','string','database',1,1),
    f('targetModule','string','database',1,0,1),f('targetAction','string','database',1),
    f('transformSchema','json','database'),f('isActive','boolean','database',1),
    f('createdBy','address','database',1),f('createdAt','datetime','database',1),
    f('notes','text','database')
  ],ADM,0,0),
  e('webhooks-inbound','WebhookDeadLetterQueue','Events that failed all retry attempts',0,[
    f('dlqId','uuid','database',1,1,1),f('eventId','uuid','database',1,0,1),
    f('endpointId','uuid','database',1,0,1),f('failedAt','datetime','database',1),
    f('totalAttempts','int','database',1),f('lastError','text','database',1),
    f('payloadHash','bytes32','database',1),f('manualRetryAllowed','boolean','database'),
    f('escalated','boolean','database')
  ],SYS,0,0),

  /* ── webhooks-outbound ── 8 entities */
  e('webhooks-outbound','OutboundWebhookSubscription','External subscription to platform events',1,[
    f('subId','uuid','database',1,1,1),f('subscriberUrl','string','database',1,0,0,1),
    f('eventTypes','json','database',1),f('signingSecretHash','bytes32','database',1,0,0,1),
    f('isActive','boolean','database',1),f('createdBy','uuid','database',1),
    f('createdAt','datetime','database',1),f('retryPolicy','string','database',1),
    f('maxRetries','int','database',1)
  ],AUTH,0,0),
  e('webhooks-outbound','OutboundWebhookDelivery','Delivery attempt for an outbound webhook',0,[
    f('deliveryId','uuid','database',1,1,1),f('subId','uuid','database',1,0,1),
    f('eventType','string','database',1,0,1),f('payload','json','database',1),
    f('deliveredAt','datetime','database',1,0,1),f('responseCode','int','database'),
    f('success','boolean','database',1),f('latencyMs','int','database'),
    f('retryOf','uuid','database')
  ],SYS,0,0),
  e('webhooks-outbound','OutboundWebhookRetry','Retry attempt for a failed outbound delivery',0,[
    f('retryId','uuid','database',1,1,1),f('deliveryId','uuid','database',1,0,1),
    f('attemptNumber','int','database',1),f('attemptedAt','datetime','database',1,0,1),
    f('responseCode','int','database'),f('success','boolean','database',1),
    f('nextRetryAt','datetime','database'),f('errorDetail','text','database'),
    f('maxReached','boolean','database')
  ],SYS,0,0),
  e('webhooks-outbound','OutboundEventLog','Log of platform events queued for outbound delivery',0,[
    f('queueId','uuid','database',1,1,1),f('eventType','string','database',1,0,1),
    f('sourceModule','string','database',1,0,1),f('lotId','uuid','database',0,0,1),
    f('payload','json','database',1),f('queuedAt','datetime','database',1,0,1),
    f('subscriberCount','int','database',1),f('deliveredCount','int','database'),
    f('failedCount','int','database')
  ],SYS,0,0),
  e('webhooks-outbound','WebhookPayloadTemplate','Template for constructing webhook payloads',0,[
    f('templateId','uuid','database',1,1,1),f('eventType','string','database',1,1),
    f('templateSchema','json','database',1),f('version','int','database',1),
    f('isActive','boolean','database',1),f('createdBy','address','database',1),
    f('createdAt','datetime','database',1),f('notes','text','database'),
    f('examplePayload','json','database')
  ],ADM,0,0),
  e('webhooks-outbound','OutboundDeadLetterQueue','Failed outbound events after all retry attempts',0,[
    f('dlqId','uuid','database',1,1,1),f('deliveryId','uuid','database',1,0,1),
    f('subId','uuid','database',1,0,1),f('failedAt','datetime','database',1),
    f('totalAttempts','int','database',1),f('lastError','text','database'),
    f('payload','json','database',1),f('escalated','boolean','database'),
    f('manualRetryAt','datetime','database')
  ],SYS,0,0),
  e('webhooks-outbound','OutboundWebhookMetrics','Delivery metrics for an outbound webhook subscription',0,[
    f('metricsId','uuid','database',1,1,1),f('subId','uuid','database',1,0,1),
    f('periodStart','datetime','database',1),f('periodEnd','datetime','database',1),
    f('totalDeliveries','int','database',1),f('successRate','float','database',1),
    f('avgLatencyMs','float','database'),f('failureCount','int','database'),
    f('generatedAt','datetime','database',1)
  ],SYS,0,0),
  e('webhooks-outbound','WebhookSubscriberProfile','Profile of an external webhook subscriber',0,[
    f('profileId','uuid','database',1,1,1),f('subscriberName','string','database',1),
    f('orgId','uuid','database',0,0,1),f('contactEmail','string','database',1,0,0,1),
    f('createdAt','datetime','database',1),f('isActive','boolean','database',1),
    f('subscriptionCount','int','database'),f('lastDeliveryAt','datetime','database'),
    f('notes','text','database')
  ],AUTH,0,0),

  /* ── subgraph-indexer ── 8 entities */
  e('subgraph-indexer','SubgraphDefinition','Deployed subgraph definition for AgroTrace',1,[
    f('subgraphId','uuid','database',1,1,1),f('name','string','database',1,1),
    f('version','string','database',1),f('schemaHash','bytes32','database',1,1),
    f('startBlock','int','database',1),f('deployedAt','datetime','database',1),
    f('isActive','boolean','database',1),f('deployedBy','address','database',1),
    f('description','text','database')
  ],ADM,0,0),
  e('subgraph-indexer','SubgraphSyncStatus','Current sync status of the subgraph indexer',0,[
    f('syncId','uuid','database',1,1,1),f('subgraphId','uuid','database',1,0,1),
    f('latestBlock','int','database',1,0,1),f('chainHead','int','database',1),
    f('syncLag','int','database'),f('lastSyncedAt','datetime','database',1,0,1),
    f('isHealthy','boolean','database',1),f('errorCount','int','database'),
    f('syncMode','string','database')
  ],SYS,0,0),
  e('subgraph-indexer','SubgraphEntity','Entity type mapped in the subgraph schema',0,[
    f('entityId','uuid','database',1,1,1),f('subgraphId','uuid','database',1,0,1),
    f('entityName','string','database',1,0,1),f('fieldCount','int','database',1),
    f('recordCount','int','database'),f('lastUpdatedAt','datetime','database',0,0,1),
    f('isImmutable','boolean','database'),f('addedAt','datetime','database',1),
    f('sourceContract','address','database')
  ],ADM,0,0),
  e('subgraph-indexer','SubgraphQueryLog','Log of queries executed against the subgraph',0,[
    f('logId','uuid','database',1,1,1),f('subgraphId','uuid','database',1,0,1),
    f('queryHash','bytes32','database',0,0,1),f('executionMs','int','database'),
    f('callerUserId','uuid','database',0,0,1),f('executedAt','datetime','database',1,0,1),
    f('cacheHit','boolean','database'),f('rowsReturned','int','database'),
    f('errorOccurred','boolean','database')
  ],SYS,0,0),
  e('subgraph-indexer','SubgraphIndexerNode','Node running the subgraph indexer service',0,[
    f('nodeId','uuid','database',1,1,1),f('nodeAddress','string','database',1,1),
    f('region','string','database',1),f('isActive','boolean','database',1),
    f('currentBlock','int','database',0,0,1),f('uptimePct','float','database'),
    f('lastHeartbeatAt','datetime','database',0,0,1),f('indexerVersion','string','database'),
    f('allocatedSubgraphs','int','database')
  ],ADM,0,0),
  e('subgraph-indexer','SubgraphUpgrade','Version upgrade record for a subgraph',0,[
    f('upgradeId','uuid','database',1,1,1),f('subgraphId','uuid','database',1,0,1),
    f('fromVersion','string','database',1),f('toVersion','string','database',1),
    f('upgradedAt','datetime','database',1),f('upgradedBy','address','database',1),
    f('migrationScript','boolean','database'),f('status','string','database',1,0,1),
    f('rollbackAvailable','boolean','database')
  ],ADM,0,0),
  e('subgraph-indexer','SubgraphErrorLog','Error log entry from the subgraph indexer',0,[
    f('errorId','uuid','database',1,1,1),f('subgraphId','uuid','database',1,0,1),
    f('errorType','string','database',1),f('blockHeight','int','database',0,0,1),
    f('message','text','database',1),f('occurredAt','datetime','database',1,0,1),
    f('resolved','boolean','database',1),f('resolvedAt','datetime','database'),
    f('retryTriggered','boolean','database')
  ],SYS,0,0),
  e('subgraph-indexer','SubgraphMetrics','Performance metrics for a subgraph over a period',0,[
    f('metricsId','uuid','database',1,1,1),f('subgraphId','uuid','database',1,0,1),
    f('periodStart','datetime','database',1),f('periodEnd','datetime','database',1),
    f('totalQueries','int','database',1),f('avgQueryMs','float','database'),
    f('cacheHitRate','float','database'),f('indexingRate','float','database'),
    f('generatedAt','datetime','database',1)
  ],SYS,0,0),

  /* ── notifications ── 8 entities */
  e('notifications','NotificationTemplate','Reusable notification message template',1,[
    f('templateId','uuid','database',1,1,1),f('templateKey','string','database',1,1),
    f('channel','string','database',1,0,1),f('subject','string','database',1),
    f('bodyTemplate','text','database',1),f('variables','json','database'),
    f('isActive','boolean','database',1),f('createdBy','address','database',1),
    f('createdAt','datetime','database',1)
  ],ADM,0,0),
  e('notifications','NotificationEvent','Platform event that triggers a notification',0,[
    f('notifId','uuid','database',1,1,1),f('eventType','string','database',1,0,1),
    f('recipientId','uuid','database',1,0,1),f('channel','string','database',1),
    f('payload','json','database',1),f('sentAt','datetime','database',1,0,1),
    f('deliveryStatus','string','database',1,0,1),f('lotRef','uuid','database'),
    f('templateId','uuid','database',1)
  ],SYS,0,0),
  e('notifications','PushNotificationToken','Push token registered for a user device',0,[
    f('tokenId','uuid','database',1,1,1),f('userId','uuid','database',1,0,1),
    f('deviceId','uuid','database',1,0,1),f('tokenHash','bytes32','database',1,1),
    f('platform','string','database',1),f('registeredAt','datetime','database',1),
    f('isActive','boolean','database',1),f('lastUsedAt','datetime','database'),
    f('expiresAt','datetime','database')
  ],OWN,0,0),
  e('notifications','NotificationPreference','User notification preference settings',0,[
    f('prefId','uuid','database',1,1,1),f('userId','uuid','database',1,0,1),
    f('channelPreferences','json','database',1),f('eventSubscriptions','json','database',1),
    f('doNotDisturbStart','string','database'),f('doNotDisturbEnd','string','database'),
    f('language','string','database'),f('updatedAt','datetime','database',1),
    f('updatedBy','address','database')
  ],OWN,0,0),
  e('notifications','NotificationDeliveryLog','Log of each notification delivery attempt',0,[
    f('logId','uuid','database',1,1,1),f('notifId','uuid','database',1,0,1),
    f('channel','string','database',1),f('attemptedAt','datetime','database',1,0,1),
    f('responseCode','int','database'),f('success','boolean','database',1),
    f('latencyMs','int','database'),f('errorDetail','text','database'),
    f('retryCount','int','database')
  ],SYS,0,0),
  e('notifications','NotificationBatch','Batch notification for a broadcast event',0,[
    f('batchId','uuid','database',1,1,1),f('eventType','string','database',1,0,1),
    f('targetRole','string','database',0,0,1),f('lotRef','uuid','database'),
    f('recipientCount','int','database',1),f('sentAt','datetime','database',1),
    f('successCount','int','database'),f('failureCount','int','database'),
    f('templateId','uuid','database',1)
  ],SYS,0,0),
  e('notifications','InAppNotification','In-app notification record for a user',0,[
    f('inAppId','uuid','database',1,1,1),f('userId','uuid','database',1,0,1),
    f('title','string','database',1),f('body','text','database',1),
    f('eventType','string','database',1,0,1),f('createdAt','datetime','database',1),
    f('readAt','datetime','database'),f('ctaUrl','string','database'),
    f('priority','string','database',1)
  ],OWN,0,0),
  e('notifications','NotificationSuppression','Suppression rule for a notification type',0,[
    f('suppressionId','uuid','database',1,1,1),f('userId','uuid','database',1,0,1),
    f('eventType','string','database',1,0,1),f('channel','string','database'),
    f('suppressedAt','datetime','database',1),f('suppressUntil','datetime','database'),
    f('reason','string','database'),f('createdBy','address','database'),
    f('isActive','boolean','database',1)
  ],OWN,0,0),

  /* ── emails ── 8 entities */
  e('emails','EmailTemplate','Transactional email template definition',1,[
    f('templateId','uuid','database',1,1,1),f('templateKey','string','database',1,1),
    f('fromEmail','string','database',1),f('subject','string','database',1),
    f('htmlTemplate','text','database',1),f('textTemplate','text','database'),
    f('variables','json','database'),f('isActive','boolean','database',1),
    f('createdAt','datetime','database',1)
  ],ADM,0,0),
  e('emails','EmailSendEvent','Record of each email send operation',0,[
    f('sendId','uuid','database',1,1,1),f('templateId','uuid','database',0,0,1),
    f('toEmail','string','database',1,0,1),f('subject','string','database',1),
    f('provider','string','database',1),f('sentAt','datetime','database',1,0,1),
    f('deliveryStatus','string','database',1,0,1),f('messageId','string','database',0,0,1),
    f('lotRef','uuid','database')
  ],SYS,0,0),
  e('emails','EmailBounceRecord','Bounce record for a failed email delivery',0,[
    f('bounceId','uuid','database',1,1,1),f('toEmail','string','database',1,0,1),
    f('sendId','uuid','database',1,0,1),f('bounceType','string','database',1),
    f('bounceCode','string','database'),f('bouncedAt','datetime','database',1,0,1),
    f('suppressed','boolean','database',1),f('providerMessageId','string','database'),
    f('retryAllowed','boolean','database')
  ],SYS,0,0),
  e('emails','EmailSuppressionList','Email addresses suppressed from future sends',0,[
    f('suppressionId','uuid','database',1,1,1),f('email','string','database',1,1,1),
    f('suppressionType','string','database',1),f('suppressedAt','datetime','database',1),
    f('suppressedBy','string','database',1),f('reason','string','database',1),
    f('provider','string','database'),f('isActive','boolean','database',1),
    f('expiresAt','datetime','database')
  ],ADM,0,0),
  e('emails','EmailDomainVerification','Domain verification record for email sending',0,[
    f('verifyId','uuid','database',1,1,1),f('domain','string','database',1,1),
    f('provider','string','database',1),f('dkimRecord','string','database'),
    f('spfRecord','string','database'),f('dmarcRecord','string','database'),
    f('verifiedAt','datetime','database'),f('isVerified','boolean','database',1),
    f('lastCheckedAt','datetime','database',1)
  ],ADM,0,0),
  e('emails','EmailCampaignRecord','Bulk email campaign record for announcements',0,[
    f('campaignId','uuid','database',1,1,1),f('campaignName','string','database',1),
    f('templateId','uuid','database',1,0,1),f('targetRole','string','database'),
    f('recipientCount','int','database',1),f('sentAt','datetime','database',1),
    f('openRate','float','database'),f('clickRate','float','database'),
    f('status','string','database',1,0,1)
  ],ADM,0,0),
  e('emails','EmailProviderHealth','Health status of an email service provider',0,[
    f('healthId','uuid','database',1,1,1),f('provider','string','database',1,0,1),
    f('checkedAt','datetime','database',1,0,1),f('deliveryRate','float','database',1),
    f('avgLatencyMs','int','database'),f('isHealthy','boolean','database',1),
    f('fallbackRequired','boolean','database'),f('incidentRef','uuid','database'),
    f('alertSent','boolean','database')
  ],SYS,0,0),
  e('emails','EmailAuditLog','Audit log for compliance-relevant email sends',0,[
    f('auditId','uuid','database',1,1,1),f('sendId','uuid','database',1,0,1),
    f('recipientRole','string','database'),f('eventType','string','database',1),
    f('lotRef','uuid','database'),f('auditedAt','datetime','database',1),
    f('retentionYears','int','database',1),f('regulatoryRef','string','database'),
    f('auditHash','bytes32','database',1)
  ],ADM,0,0),

  /* ── audit-logs ── 8 entities */
  e('audit-logs','AuditEntry','Tamper-evident audit log entry',1,[
    f('entryId','uuid','database',1,1,1),f('entityType','string','database',1,0,1),
    f('entityId','uuid','database',1,0,1),f('action','string','database',1),
    f('actorWallet','address','database',1),f('performedAt','datetime','database',1,0,1),
    f('ipAddress','string','database'),f('hashProof','bytes32','database',1,1),
    f('detail','json','database')
  ],ADM,0,0),
  e('audit-logs','AuditEntryHash','Merkle hash of an audit entry batch for integrity',0,[
    f('hashId','uuid','database',1,1,1),f('batchRef','string','database',1,1),
    f('merkleRoot','bytes32','on-chain',1,1),f('entryCount','int','database',1),
    f('batchStart','datetime','database',1),f('batchEnd','datetime','database',1),
    f('anchoredAt','datetime','on-chain',1),f('txHash','bytes32','on-chain',1,1),
    f('storageUri','string','database')
  ],ADM,1,0),
  e('audit-logs','LotAuditTrail','Complete audit trail for a specific lot',0,[
    f('trailId','uuid','database',1,1,1),f('lotId','uuid','database',1,1,1),
    f('eventCount','int','database',1),f('firstEventAt','datetime','database'),
    f('lastEventAt','datetime','database',1),f('trailHash','bytes32','database',1,1),
    f('compiledAt','datetime','database',1),f('storageUri','string','database'),
    f('isComplete','boolean','database',1)
  ],AUTH,0,1),
  e('audit-logs','UserActionLog','Log of user actions for security monitoring',0,[
    f('logId','uuid','database',1,1,1),f('walletAddress','address','database',1,0,1),
    f('action','string','database',1,0,1),f('resource','string','database',1),
    f('performedAt','datetime','database',1,0,1),f('ipAddress','string','database'),
    f('sessionId','uuid','database',0,0,1),f('riskScore','float','database'),
    f('flagged','boolean','database')
  ],SYS,0,0),
  e('audit-logs','AuditRetentionPolicy','Retention policy for audit log categories',0,[
    f('policyId','uuid','database',1,1,1),f('logCategory','string','database',1,1),
    f('retentionYears','int','database',1),f('encryptAtRest','boolean','database',1),
    f('archiveAfterYears','int','database'),f('approvedBy','address','database',1),
    f('approvedAt','datetime','database',1),f('legalBasis','string','database',1),
    f('effectiveFrom','datetime','database',1)
  ],ADM,0,0),
  e('audit-logs','ComplianceAuditReport','Regulatory compliance audit report',0,[
    f('reportId','uuid','database',1,1,1),f('reportType','string','database',1),
    f('periodStart','datetime','database',1),f('periodEnd','datetime','database',1),
    f('generatedBy','uuid','database',1),f('generatedAt','datetime','database',1),
    f('findings','json','database',1),f('reportHash','bytes32','database',1,1),
    f('submittedToRegulator','boolean','database')
  ],ADM,0,0),
  e('audit-logs','AuditSearchIndex','Searchable index for audit log queries',0,[
    f('indexId','uuid','database',1,1,1),f('entryId','uuid','database',1,0,1),
    f('lotId','uuid','database',0,0,1),f('actorWallet','address','database',0,0,1),
    f('action','string','database',1,0,1),f('entityType','string','database',0,0,1),
    f('performedAt','datetime','database',1,0,1),f('indexedAt','datetime','database',1),
    f('searchableText','text','database')
  ],ADM,0,0),
  e('audit-logs','AuditIntegrityCheck','Periodic integrity verification of audit log batches',0,[
    f('checkId','uuid','database',1,1,1),f('batchRef','string','database',1,0,1),
    f('checkedAt','datetime','database',1,0,1),f('merkleVerified','boolean','database',1),
    f('chainVerified','boolean','database'),f('entryCount','int','database',1),
    f('passed','boolean','database',1),f('failureDetail','text','database'),
    f('checkedBy','address','database',1)
  ],ADM,0,0),

  /* ── audit-export ── 8 entities */
  e('audit-export','AuditTrailExport','Exported signed audit trail PDF for a lot',1,[
    f('exportId','uuid','database',1,1,1),f('lotId','uuid','database',1,0,1),
    f('requestedBy','uuid','database',1),f('requestedAt','datetime','database',1),
    f('generatedAt','datetime','database'),f('pdfHash','bytes32','database',1,1),
    f('storageUri','string','database',1),f('signedByChain','boolean','database',1),
    f('downloadCount','int','database')
  ],AUTH,0,1),
  e('audit-export','AuditExportRequest','Request to generate an audit trail export',0,[
    f('requestId','uuid','database',1,1,1),f('lotId','uuid','database',0,0,1),
    f('exportType','string','database',1),f('fromDate','datetime','database'),
    f('toDate','datetime','database'),f('requestedBy','uuid','database',1),
    f('requestedAt','datetime','database',1),f('status','string','database',1,0,1),
    f('completedAt','datetime','database')
  ],AUTH,0,0),
  e('audit-export','ExportSignatureRecord','Cryptographic signature on an audit export document',0,[
    f('sigId','uuid','database',1,1,1),f('exportId','uuid','database',1,0,1),
    f('signerKeyRef','string','database',1,0,0,1),f('signature','bytes32','database',1),
    f('signedAt','datetime','database',1),f('kmsProvider','string','database',1),
    f('signingAlgorithm','string','database',1),f('publicKeyHash','bytes32','database',1),
    f('blockchainAnchorTxHash','bytes32','on-chain')
  ],ADM,0,0),
  e('audit-export','ExportDeliveryRecord','Delivery of an audit export to a recipient',0,[
    f('deliveryId','uuid','database',1,1,1),f('exportId','uuid','database',1,0,1),
    f('recipientId','uuid','database',1),f('deliveryMethod','string','database',1),
    f('deliveredAt','datetime','database',1),f('acknowledgedAt','datetime','database'),
    f('emailSent','boolean','database',1),f('downloadLinkExpiry','datetime','database'),
    f('accessCount','int','database')
  ],AUTH,0,0),
  e('audit-export','ExportRetentionRecord','Retention and deletion policy for audit exports',0,[
    f('retentionId','uuid','database',1,1,1),f('exportId','uuid','database',1,0,1),
    f('retainUntil','datetime','database',1),f('legalHold','boolean','database',1),
    f('scheduledDeleteAt','datetime','database'),f('deletedAt','datetime','database'),
    f('retentionBasis','string','database',1),f('approvedBy','address','database'),
    f('notes','text','database')
  ],ADM,0,0),
  e('audit-export','ExportAccessLog','Log of access events for an audit export file',0,[
    f('accessId','uuid','database',1,1,1),f('exportId','uuid','database',1,0,1),
    f('accessorId','uuid','database',1),f('accessedAt','datetime','database',1,0,1),
    f('accessMethod','string','database',1),f('ipAddress','string','database'),
    f('downloadedBytes','int','database'),f('authorizedBy','address','database'),
    f('purpose','string','database')
  ],ADM,0,0),
  e('audit-export','BatchExportJob','Batch export job for multiple lots or date range',0,[
    f('jobId','uuid','database',1,1,1),f('exportType','string','database',1),
    f('lotIds','json','database'),f('fromDate','datetime','database'),
    f('toDate','datetime','database'),f('requestedBy','uuid','database',1),
    f('status','string','database',1,0,1),f('itemCount','int','database'),
    f('completedAt','datetime','database')
  ],AUTH,0,0),
  e('audit-export','ExportEncryptionRecord','Encryption metadata for an export file at rest',0,[
    f('encId','uuid','database',1,1,1),f('exportId','uuid','database',1,0,1),
    f('algorithm','string','database',1),f('keyRef','string','database',1,0,0,1),
    f('encryptedAt','datetime','database',1),f('kmsProvider','string','database',1),
    f('keyRotatedAt','datetime','database'),f('verifiedAt','datetime','database'),
    f('integrityTag','bytes32','database',1)
  ],ADM,0,0),

  /* ── produce-grades ── 8 entities */
  e('produce-grades','ProduceGrade','Grade definition for a mango variety',1,[
    f('gradeId','uuid','database',1,1,1),f('gradeName','string','database',1,1),
    f('variety','string','database',1,0,1),f('standard','string','database',1),
    f('minWeightGrams','float','database'),f('maxWeightGrams','float','database'),
    f('colorSpec','string','database'),f('isActive','boolean','database',1),
    f('approvedBy','address','database',1)
  ],ADM,0,1),
  e('produce-grades','GradeInspectionCriteria','Detailed inspection criteria for a grade',0,[
    f('criteriaId','uuid','database',1,1,1),f('gradeId','uuid','database',1,0,1),
    f('criteriaType','string','database',1,0,1),f('specification','text','database',1),
    f('tolerancePercent','float','database'),f('measurableMin','float','database'),
    f('measurableMax','float','database'),f('effectiveFrom','datetime','database',1),
    f('reviewedBy','address','database')
  ],ADM,0,1),
  e('produce-grades','GradeChangeHistory','History of produce grade standard revisions',0,[
    f('historyId','uuid','database',1,1,1),f('gradeId','uuid','database',1,0,1),
    f('changedBy','address','database',1),f('changedAt','datetime','database',1),
    f('oldStandard','json','database',1),f('newStandard','json','database',1),
    f('changeReason','text','database',1),f('regulatoryRef','string','database'),
    f('approvalRef','uuid','database')
  ],ADM,0,0),
  e('produce-grades','GradeAssignment','Grade assignment for a specific lot',1,[
    f('assignmentId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('gradeId','uuid','database',1,0,1),f('quantityKg','float','on-chain',1),
    f('assignedBy','address','on-chain',1),f('assignedAt','datetime','on-chain',1),
    f('txHash','bytes32','on-chain',1),f('inspectionRef','uuid','database'),
    f('remarks','text','database')
  ],AUTH,1,1),
  e('produce-grades','MarketPriceReference','Reference market price for a grade and market',0,[
    f('priceId','uuid','database',1,1,1),f('gradeId','uuid','database',1,0,1),
    f('market','string','database',1,0,1),f('pricePerKgINR','float','database',1),
    f('validFrom','datetime','database',1),f('validUntil','datetime','database',1),
    f('source','string','database',1),f('updatedAt','datetime','database',1),
    f('updatedBy','address','database')
  ],ADM,0,1),
  e('produce-grades','GradeExportMapping','Mapping of produce grades to destination country standards',0,[
    f('mappingId','uuid','database',1,1,1),f('gradeId','uuid','database',1,0,1),
    f('destinationCountry','string','database',1,0,1),f('equivalentGrade','string','database',1),
    f('standard','string','database',1),f('effectiveFrom','datetime','database',1),
    f('approvedBy','address','database',1),f('notes','text','database'),
    f('isActive','boolean','database',1)
  ],ADM,0,1),
  e('produce-grades','GradeVarianceReport','Variance report when grading deviates from expected',0,[
    f('reportId','uuid','database',1,1,1),f('lotId','uuid','database',1,0,1),
    f('expectedGrade','string','database',1),f('actualGrade','string','database',1),
    f('variancePct','float','database',1),f('reportedBy','address','database',1),
    f('reportedAt','datetime','database',1),f('rootCause','text','database'),
    f('actionTaken','text','database')
  ],AUTH,0,0),
  e('produce-grades','GradeComplianceCheck','Compliance check verifying grade meets export standard',0,[
    f('checkId','uuid','database',1,1,1),f('gradeId','uuid','database',1,0,1),
    f('destinationCountry','string','database',1,0,1),f('checkResult','string','database',1),
    f('performedAt','datetime','database',1),f('performedBy','address','database'),
    f('notes','text','database'),f('nextCheckDue','datetime','database'),
    f('standardVersion','string','database',1)
  ],AUTH,0,0),

  /* ── document-signing ── 8 entities */
  e('document-signing','SignatureRequest','Request to sign a document by a wallet or DocuSign',1,[
    f('signReqId','uuid','database',1,1,1),f('documentHash','bytes32','database',1),
    f('signerAddress','address','database',0,0,1),f('signerEmail','string','database',0,0,0,1),
    f('signMethod','string','database',1),f('requestedAt','datetime','database',1),
    f('expiresAt','datetime','database',1),f('status','string','database',1,0,1),
    f('lotRef','uuid','database',0,0,1)
  ],AUTH,0,0),
  e('document-signing','SignedDocument','Record of a signed document',1,[
    f('docId','uuid','database',1,1,1),f('documentType','string','on-chain',1,0,1),
    f('documentHash','bytes32','on-chain',1,1),f('signerAddress','address','on-chain',1,0,1),
    f('signedAt','datetime','on-chain',1),f('txHash','bytes32','on-chain',1,1),
    f('signatureMethod','string','database',1),f('lotRef','uuid','database',0,0,1),
    f('ipfsRef','string','database')
  ],AUTH,1,1),
  e('document-signing','DocuSignEnvelope','DocuSign envelope created for a document signing flow',0,[
    f('envelopeId','string','database',1,1,1),f('signReqId','uuid','database',1,0,1),
    f('envelopeStatus','string','database',1,0,1),f('createdAt','datetime','database',1),
    f('completedAt','datetime','database'),f('signerEmail','string','database',1,0,0,1),
    f('documentName','string','database',1),f('expiresAt','datetime','database'),
    f('webhookDelivered','boolean','database')
  ],ADM,0,0),
  e('document-signing','SignatureVerificationLog','Log of signature verification checks',0,[
    f('verifyId','uuid','database',1,1,1),f('documentHash','bytes32','database',1,0,1),
    f('verifierAddress','address','database',1),f('isValid','boolean','database',1),
    f('verifiedAt','datetime','database',1,0,1),f('verificationMethod','string','database',1),
    f('blockchainConfirmed','boolean','database'),f('certChainValid','boolean','database'),
    f('purpose','string','database')
  ],AUTH,0,0),
  e('document-signing','SigningKey','Signing key configuration for platform document signing',0,[
    f('keyId','uuid','database',1,1,1),f('keyAlias','string','database',1,1),
    f('kmsKeyRef','string','database',1,0,0,1),f('algorithm','string','database',1),
    f('isActive','boolean','database',1),f('createdAt','datetime','database',1),
    f('rotatedAt','datetime','database'),f('approvedBy','address','database',1),
    f('purpose','string','database',1)
  ],ADM,0,0),
  e('document-signing','SignatureAuditEntry','Audit entry for each document signing event',0,[
    f('auditId','uuid','database',1,1,1),f('signReqId','uuid','database',1,0,1),
    f('event','string','database',1),f('actor','string','database',1),
    f('occurredAt','datetime','database',1,0,1),f('detail','json','database'),
    f('ipAddress','string','database'),f('hashProof','bytes32','database',1),
    f('regulatoryRef','string','database')
  ],ADM,0,0),
  e('document-signing','POADocument','Power of Attorney document for farmer delegation',0,[
    f('poaId','uuid','database',1,1,1),f('grantorWallet','address','database',1,0,1),
    f('granteeWallet','address','database',1,0,1),f('scope','json','database',1),
    f('docHash','bytes32','on-chain',1,1),f('issuedAt','datetime','on-chain',1),
    f('txHash','bytes32','on-chain',1),f('expiresAt','datetime','database'),
    f('witnessAddress','address','database')
  ],OWN,1,0),
  e('document-signing','SigningWorkflow','Multi-step document signing workflow definition',0,[
    f('workflowId','uuid','database',1,1,1),f('workflowName','string','database',1,1),
    f('documentType','string','database',1,0,1),f('steps','json','database',1),
    f('isActive','boolean','database',1),f('createdBy','address','database',1),
    f('createdAt','datetime','database',1),f('notes','text','database'),
    f('lotApplicable','boolean','database',1)
  ],ADM,0,0),

  /* ── fraud-rules ── 8 entities */
  e('fraud-rules','FraudRule','Fraud detection rule definition',1,[
    f('ruleId','uuid','database',1,1,1),f('ruleName','string','database',1,1),
    f('ruleType','string','database',1,0,1),f('conditions','json','database',1),
    f('severity','string','database',1),f('isActive','boolean','database',1),
    f('createdBy','address','database',1),f('effectiveFrom','datetime','database',1),
    f('description','text','database')
  ],ADM,0,0),
  e('fraud-rules','FraudAlert','Alert triggered by a fraud rule match',0,[
    f('alertId','uuid','database',1,1,1),f('ruleId','uuid','database',1,0,1),
    f('entityType','string','database',1),f('entityId','uuid','database',1,0,1),
    f('severity','string','database',1,0,1),f('detectedAt','datetime','database',1,0,1),
    f('status','string','database',1,0,1),f('reviewedBy','address','database'),
    f('lotRef','uuid','database')
  ],ADM,0,0),
  e('fraud-rules','DuplicateLotCheck','Duplicate mango lot detection check result',0,[
    f('checkId','uuid','database',1,1,1),f('newLotId','uuid','database',1,0,1),
    f('matchedLotId','uuid','database',0,0,1),f('isDuplicate','boolean','database',1),
    f('matchScore','float','database'),f('checkedAt','datetime','database',1,0,1),
    f('matchFields','json','database'),f('blockedCreation','boolean','database'),
    f('reviewRequired','boolean','database')
  ],SYS,0,0),
  e('fraud-rules','RoleMismatchAlert','Alert for an actor performing actions outside their role',0,[
    f('alertId','uuid','database',1,1,1),f('walletAddress','address','database',1,0,1),
    f('assignedRole','string','database',1),f('attemptedAction','string','database',1,0,1),
    f('requiredRole','string','database',1),f('detectedAt','datetime','database',1,0,1),
    f('blocked','boolean','database',1),f('ipAddress','string','database'),
    f('sessionId','uuid','database')
  ],SYS,0,0),
  e('fraud-rules','BackdatedEventCheck','Check for attempts to backdate supply chain events',0,[
    f('checkId','uuid','database',1,1,1),f('lotId','uuid','database',1,0,1),
    f('eventType','string','database',1),f('reportedTimestamp','datetime','database',1),
    f('systemTimestamp','datetime','database',1),f('discrepancyMins','int','database',1),
    f('flagged','boolean','database',1),f('checkedAt','datetime','database',1),
    f('reviewedBy','address','database')
  ],SYS,0,0),
  e('fraud-rules','FraudCaseFile','Investigation case file for a fraud alert',0,[
    f('caseId','uuid','database',1,1,1),f('alertId','uuid','database',1,0,1),
    f('openedAt','datetime','database',1),f('status','string','database',1,0,1),
    f('assignedTo','address','database'),f('evidence','json','database'),
    f('outcome','string','database'),f('closedAt','datetime','database'),
    f('regulatoryEscalated','boolean','database')
  ],ADM,0,0),
  e('fraud-rules','FraudRuleEvalLog','Log of each fraud rule evaluation run',0,[
    f('logId','uuid','database',1,1,1),f('ruleId','uuid','database',1,0,1),
    f('evaluatedAt','datetime','database',1,0,1),f('entityType','string','database',1),
    f('entityId','uuid','database',1),f('result','string','database',1),
    f('executionMs','int','database'),f('alertTriggered','boolean','database'),
    f('alertId','uuid','database')
  ],SYS,0,0),
  e('fraud-rules','FraudRuleVersion','Versioned fraud rule with change history',0,[
    f('versionId','uuid','database',1,1,1),f('ruleId','uuid','database',1,0,1),
    f('version','int','database',1),f('conditions','json','database',1),
    f('effectiveFrom','datetime','database',1),f('approvedBy','address','database',1),
    f('changeNotes','text','database'),f('ruleHash','bytes32','database',1,1),
    f('deprecatedAt','datetime','database')
  ],ADM,0,0),

  /* ── privacy-compliance ── 8 entities */
  e('privacy-compliance','DataProcessingRecord','Record of personal data processing activity',1,[
    f('recordId','uuid','database',1,1,1),f('processingPurpose','string','database',1),
    f('dataCategories','json','database',1),f('legalBasis','string','database',1),
    f('retentionPeriodDays','int','database',1),f('createdAt','datetime','database',1),
    f('reviewedAt','datetime','database'),f('controllerAddress','address','database',1),
    f('dpiaRequired','boolean','database')
  ],ADM,0,0),
  e('privacy-compliance','ConsentRecord','User consent record for personal data processing',1,[
    f('consentId','uuid','database',1,1,1),f('userId','uuid','database',1,0,1),
    f('purpose','string','database',1,0,1),f('consentedAt','datetime','database',1),
    f('withdrawnAt','datetime','database'),f('consentVersion','string','database',1),
    f('consentMethod','string','database',1),f('ipAddress','string','database'),
    f('isActive','boolean','database',1)
  ],OWN,0,0),
  e('privacy-compliance','DataSubjectRequest','Data subject access or deletion request',0,[
    f('requestId','uuid','database',1,1,1),f('userId','uuid','database',1,0,1),
    f('requestType','string','database',1,0,1),f('requestedAt','datetime','database',1),
    f('status','string','database',1,0,1),f('fulfilledAt','datetime','database'),
    f('fulfilledBy','address','database'),f('responseRef','string','database'),
    f('regulatoryDeadline','datetime','database',1)
  ],OWN,0,0),
  e('privacy-compliance','PrivacyIncidentRecord','Privacy breach or incident record',0,[
    f('incidentId','uuid','database',1,1,1),f('incidentType','string','database',1),
    f('severity','string','database',1,0,1),f('detectedAt','datetime','database',1),
    f('containedAt','datetime','database'),f('affectedUsersCount','int','database'),
    f('reportedToRegulator','boolean','database'),f('rootCause','text','database'),
    f('remediation','text','database')
  ],ADM,0,0),
  e('privacy-compliance','DataMinimizationAudit','Audit of data minimization compliance',0,[
    f('auditId','uuid','database',1,1,1),f('entityType','string','database',1,0,1),
    f('fieldName','string','database',1),f('isNecessary','boolean','database',1),
    f('retentionJustified','boolean','database',1),f('auditedAt','datetime','database',1),
    f('auditedBy','address','database',1),f('recommendedAction','string','database'),
    f('compliancePeriod','string','database')
  ],ADM,0,0),
  e('privacy-compliance','PDPBComplianceRecord','India PDPB compliance assessment record',0,[
    f('compRecordId','uuid','database',1,1,1),f('assessmentDate','datetime','database',1),
    f('overallStatus','string','database',1),f('gaps','json','database'),
    f('remediationPlan','json','database'),f('nextAssessmentDate','datetime','database'),
    f('assessedBy','address','database',1),f('dpiaStatus','string','database'),
    f('boardApproval','boolean','database')
  ],ADM,0,0),
  e('privacy-compliance','AnonymizationJob','Scheduled personal data anonymization job',0,[
    f('jobId','uuid','database',1,1,1),f('targetTable','string','database',1),
    f('targetFields','json','database',1),f('scheduledAt','datetime','database',1),
    f('completedAt','datetime','database'),f('recordsAnonymized','int','database'),
    f('status','string','database',1,0,1),f('approvedBy','address','database',1),
    f('retentionTrigger','string','database')
  ],ADM,0,0),
  e('privacy-compliance','GDPRExportPackage','Personal data export package for a data subject',0,[
    f('packageId','uuid','database',1,1,1),f('userId','uuid','database',1,0,1),
    f('requestId','uuid','database',1,0,1),f('generatedAt','datetime','database',1),
    f('packageHash','bytes32','database',1,1),f('expiresAt','datetime','database',1),
    f('downloadCount','int','database'),f('encryptionKey','bytes32','database',1,0,0,1),
    f('storageUri','string','database',1)
  ],OWN,0,0),

  /* ── treasury ── 8 entities */
  e('treasury','TreasuryAccount','Platform treasury account definition',1,[
    f('accountId','uuid','database',1,1,1),f('accountName','string','on-chain',1,1),
    f('walletAddress','address','on-chain',1,1,1),f('accountType','string','on-chain',1),
    f('balanceAGT','float','on-chain',1),f('createdAt','datetime','on-chain',1),
    f('isActive','boolean','on-chain',1),f('signatories','json','on-chain',1),
    f('requiredSignatures','int','on-chain',1)
  ],ADM,1,1),
  e('treasury','TreasuryTransaction','On-chain treasury fund movement',0,[
    f('txnId','uuid','database',1,1,1),f('fromAccount','uuid','on-chain',1,0,1),
    f('toAccount','uuid','on-chain',1,0,1),f('amountAGT','float','on-chain',1),
    f('txType','string','on-chain',1),f('txHash','bytes32','on-chain',1,1),
    f('executedAt','datetime','on-chain',1),f('approvedBy','address','on-chain',1),
    f('note','text','database')
  ],ADM,1,0),
  e('treasury','TreasuryBudget','Budget allocation for a program or expense category',0,[
    f('budgetId','uuid','database',1,1,1),f('budgetName','string','database',1),
    f('accountId','uuid','database',1,0,1),f('totalAGT','float','database',1),
    f('spentAGT','float','database'),f('periodStart','datetime','database',1),
    f('periodEnd','datetime','database',1),f('approvedBy','address','database',1),
    f('autoAlert','boolean','database')
  ],ADM,0,0),
  e('treasury','PlatformFeeCollection','Platform fee collected from a lot registration',0,[
    f('feeId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('payerWallet','address','on-chain',1,0,1),f('amountINR','float','database',1),
    f('amountAGT','float','on-chain',1),f('paymentMethod','string','database',1),
    f('collectedAt','datetime','on-chain',1),f('txHash','bytes32','on-chain',1),
    f('invoiceRef','uuid','database')
  ],AUTH,1,1),
  e('treasury','ValidatorRewardPool','Validator reward pool state for an epoch',0,[
    f('poolId','uuid','database',1,1,1),f('epochNumber','int','on-chain',1,1,1),
    f('totalRewardAGT','float','on-chain',1),f('distributedAGT','float','on-chain'),
    f('remainingAGT','float','on-chain',1),f('distributionDate','datetime','on-chain'),
    f('txHash','bytes32','on-chain'),f('validatorCount','int','on-chain',1),
    f('feeContribution','float','on-chain')
  ],SYS,1,1),
  e('treasury','EcosystemFundDisbursement','Disbursement from the ecosystem farmer fund',0,[
    f('disbId','uuid','database',1,1,1),f('recipientId','uuid','database',1,0,1),
    f('amountAGT','float','on-chain',1),f('purpose','string','database',1),
    f('txHash','bytes32','on-chain',1,1),f('disbursedAt','datetime','on-chain',1),
    f('approvedBy','address','database',1),f('governanceRef','uuid','database'),
    f('lotRef','uuid','database')
  ],ADM,1,0),
  e('treasury','TreasuryAuditRecord','Audit record for treasury fund movements',0,[
    f('auditId','uuid','database',1,1,1),f('txnId','uuid','database',1,0,1),
    f('auditedBy','address','database',1),f('auditedAt','datetime','database',1),
    f('findings','text','database'),f('auditHash','bytes32','database',1,1),
    f('passed','boolean','database',1),f('regulatoryReport','boolean','database'),
    f('nextAuditDate','datetime','database')
  ],ADM,0,0),
  e('treasury','ReserveAllocation','Allocation to the reserve fund',0,[
    f('reserveId','uuid','database',1,1,1),f('amountAGT','float','on-chain',1),
    f('allocationReason','string','database',1),f('allocatedAt','datetime','on-chain',1),
    f('txHash','bytes32','on-chain',1,1),f('approvedBy','address','database',1),
    f('governanceProposalId','uuid','database'),f('vestingRequired','boolean','database'),
    f('releaseConditions','text','database')
  ],ADM,1,0),

  /* ── escrow-settlement ── 8 entities */
  e('escrow-settlement','EscrowRecord','On-chain escrow record for a lot transaction',1,[
    f('escrowId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('buyerAddress','address','on-chain',1,0,1),f('sellerAddress','address','on-chain',1,0,1),
    f('amountAGT','float','on-chain',1),f('status','string','on-chain',1,0,1),
    f('createdAt','datetime','on-chain',1),f('txHash','bytes32','on-chain',1,1),
    f('holdPeriodHours','int','on-chain',1)
  ],AUTH,1,1),
  e('escrow-settlement','EscrowRelease','Escrow release event for a settled lot',0,[
    f('releaseId','uuid','database',1,1,1),f('escrowId','uuid','on-chain',1,0,1),
    f('releaseType','string','on-chain',1),f('amountAGT','float','on-chain',1),
    f('releasedTo','address','on-chain',1),f('releasedAt','datetime','on-chain',1),
    f('txHash','bytes32','on-chain',1,1),f('triggeredBy','string','on-chain',1),
    f('blockHeight','int','on-chain',1)
  ],SYS,1,1),
  e('escrow-settlement','EscrowHold','Active escrow hold record',0,[
    f('holdId','uuid','database',1,1,1),f('escrowId','uuid','on-chain',1,0,1),
    f('holdReason','string','on-chain',1),f('heldAt','datetime','on-chain',1),
    f('heldBy','address','on-chain',1),f('txHash','bytes32','on-chain',1),
    f('releaseCondition','text','database',1),f('expiresAt','datetime','on-chain'),
    f('autoReleaseEnabled','boolean','on-chain')
  ],ADM,1,0),
  e('escrow-settlement','PartialReleaseRecord','Partial escrow release for partial acceptance',0,[
    f('partialId','uuid','database',1,1,1),f('escrowId','uuid','on-chain',1,0,1),
    f('acceptedQuantityKg','float','on-chain',1),f('releasedAmountAGT','float','on-chain',1),
    f('retainedAmountAGT','float','on-chain',1),f('releasedAt','datetime','on-chain',1),
    f('txHash','bytes32','on-chain',1,1),f('buyerReceiptRef','uuid','database',1),
    f('blockHeight','int','on-chain',1)
  ],SYS,1,1),
  e('escrow-settlement','BuyerReceipt','Buyer acceptance or rejection record for a lot',1,[
    f('receiptId','uuid','database',1,1,1),f('lotId','uuid','on-chain',1,0,1),
    f('buyerWallet','address','on-chain',1,0,1),f('acceptanceStatus','string','on-chain',1,0,1),
    f('acceptedQuantityKg','float','on-chain'),f('receivedAt','datetime','on-chain',1),
    f('txHash','bytes32','on-chain',1,1),f('inspectionNotes','text','database'),
    f('disputeRaised','boolean','on-chain')
  ],AUTH,1,1),
  e('escrow-settlement','EscrowDisputeHold','Hold placed on escrow during a dispute',0,[
    f('holdId','uuid','database',1,1,1),f('escrowId','uuid','on-chain',1,0,1),
    f('disputeId','uuid','on-chain',1,0,1),f('heldAt','datetime','on-chain',1),
    f('txHash','bytes32','on-chain',1),f('releasedAt','datetime','on-chain'),
    f('releaseOutcome','string','on-chain'),f('arbitratorAddress','address','on-chain'),
    f('blockHeight','int','on-chain')
  ],ADM,1,0),
  e('escrow-settlement','EscrowFeeRecord','Platform fee deducted from escrow on settlement',0,[
    f('feeId','uuid','database',1,1,1),f('escrowId','uuid','on-chain',1,0,1),
    f('feeAmountAGT','float','on-chain',1),f('feePercent','float','on-chain',1),
    f('deductedAt','datetime','on-chain',1),f('txHash','bytes32','on-chain',1),
    f('destinationAccount','uuid','database',1),f('blockHeight','int','on-chain'),
    f('feeType','string','on-chain',1)
  ],SYS,1,0),
  e('escrow-settlement','SettlementAuditLog','Audit log for escrow settlement operations',0,[
    f('logId','uuid','database',1,1,1),f('escrowId','uuid','database',1,0,1),
    f('operation','string','database',1),f('performedBy','address','database',1),
    f('performedAt','datetime','database',1),f('detail','json','database'),
    f('txHash','bytes32','on-chain'),f('auditHash','bytes32','database',1),
    f('regulatoryRef','string','database')
  ],ADM,0,0),

  /* ── invoices-billing ── 8 entities */
  e('invoices-billing','Invoice','Platform invoice issued to an organization',1,[
    f('invoiceId','uuid','database',1,1,1),f('invoiceNumber','string','database',1,1),
    f('orgId','uuid','database',1,0,1),f('amountINR','float','database',1),
    f('gstPercent','float','database',1),f('totalINR','float','database',1),
    f('issuedAt','datetime','database',1),f('dueDate','datetime','database',1),
    f('status','string','database',1,0,1)
  ],AUTH,0,1),
  e('invoices-billing','InvoiceLineItem','Individual line item on a platform invoice',0,[
    f('lineItemId','uuid','database',1,1,1),f('invoiceId','uuid','database',1,0,1),
    f('description','string','database',1),f('quantity','float','database',1),
    f('unitPrice','float','database',1),f('subtotal','float','database',1),
    f('lotRef','uuid','database'),f('serviceDate','datetime','database'),
    f('hsn','string','database')
  ],AUTH,0,0),
  e('invoices-billing','PaymentRecord','Payment received for an invoice',0,[
    f('paymentId','uuid','database',1,1,1),f('invoiceId','uuid','database',1,0,1),
    f('amountINR','float','database',1),f('paymentMethod','string','database',1),
    f('paidAt','datetime','database',1),f('transactionRef','string','database',1,1),
    f('gatewayProvider','string','database',1),f('status','string','database',1,0,1),
    f('receiptRef','string','database')
  ],AUTH,0,0),
  e('invoices-billing','InvoiceReminder','Reminder sent for an unpaid invoice',0,[
    f('reminderId','uuid','database',1,1,1),f('invoiceId','uuid','database',1,0,1),
    f('sentAt','datetime','database',1),f('reminderType','string','database',1),
    f('recipientEmail','string','database',1,0,0,1),f('daysPastDue','int','database'),
    f('nextReminderAt','datetime','database'),f('autoSent','boolean','database',1),
    f('opened','boolean','database')
  ],SYS,0,0),
  e('invoices-billing','BulkDiscountRule','Bulk discount rule for high-volume lot registrations',0,[
    f('ruleId','uuid','database',1,1,1),f('minLotsPerMonth','int','database',1),
    f('maxLotsPerMonth','int','database'),f('discountPercent','float','database',1),
    f('additionalFPODiscount','float','database'),f('isActive','boolean','database',1),
    f('effectiveFrom','datetime','database',1),f('approvedBy','address','database',1),
    f('notes','text','database')
  ],ADM,0,1),
  e('invoices-billing','TaxRecord','GST and tax calculation record for an invoice',0,[
    f('taxId','uuid','database',1,1,1),f('invoiceId','uuid','database',1,0,1),
    f('taxType','string','database',1),f('taxableAmount','float','database',1),
    f('taxPercent','float','database',1),f('taxAmount','float','database',1),
    f('filedAt','datetime','database'),f('gstinRef','string','database'),
    f('periodMonth','string','database',1)
  ],ADM,0,0),
  e('invoices-billing','SubscriptionRenewal','Subscription renewal record for an organization',0,[
    f('renewalId','uuid','database',1,1,1),f('orgId','uuid','database',1,0,1),
    f('planTier','string','database',1),f('renewedAt','datetime','database',1),
    f('nextRenewalDate','datetime','database',1),f('amountINR','float','database',1),
    f('autoRenewed','boolean','database',1),f('invoiceRef','uuid','database'),
    f('discountApplied','float','database')
  ],AUTH,0,0),
  e('invoices-billing','RefundRecord','Refund issued for an overpaid invoice',0,[
    f('refundId','uuid','database',1,1,1),f('invoiceId','uuid','database',1,0,1),
    f('paymentId','uuid','database',1,0,1),f('refundAmountINR','float','database',1),
    f('refundReason','string','database',1),f('refundedAt','datetime','database',1),
    f('gatewayRefId','string','database',0,0,1),f('status','string','database',1,0,1),
    f('approvedBy','address','database')
  ],ADM,0,0),

  /* ── razorpay-adapter ── 8 entities */
  e('razorpay-adapter','RazorpayOrder','Razorpay order created for platform fee collection',1,[
    f('orderId','uuid','database',1,1,1),f('razorpayOrderId','string','database',1,1,1),
    f('orgId','uuid','database',1,0,1),f('amountINR','float','database',1),
    f('currency','string','database',1),f('status','string','database',1,0,1),
    f('createdAt','datetime','database',1),f('lotRef','uuid','database'),
    f('description','string','database')
  ],AUTH,0,0),
  e('razorpay-adapter','RazorpayPayment','Payment captured via Razorpay',0,[
    f('paymentId','uuid','database',1,1,1),f('razorpayPaymentId','string','database',1,1,1),
    f('orderId','uuid','database',1,0,1),f('amountINR','float','database',1),
    f('method','string','database',1,0,1),f('status','string','database',1,0,1),
    f('capturedAt','datetime','database',1),f('bank','string','database'),
    f('utrRef','string','database')
  ],AUTH,0,0),
  e('razorpay-adapter','RazorpayRefund','Refund initiated via Razorpay',0,[
    f('refundId','uuid','database',1,1,1),f('razorpayRefundId','string','database',1,1,1),
    f('paymentId','uuid','database',1,0,1),f('amountINR','float','database',1),
    f('reason','string','database',1),f('status','string','database',1,0,1),
    f('initiatedAt','datetime','database',1),f('processedAt','datetime','database'),
    f('notes','text','database')
  ],ADM,0,0),
  e('razorpay-adapter','RazorpayWebhookEvent','Razorpay webhook event received and processed',0,[
    f('eventId','uuid','database',1,1,1),f('razorpayEventId','string','database',1,1,1),
    f('eventType','string','database',1,0,1),f('payload','json','database',1),
    f('receivedAt','datetime','database',1),f('processed','boolean','database',1),
    f('processingStatus','string','database',1),f('entityType','string','database'),
    f('entityId','string','database')
  ],SYS,0,0),
  e('razorpay-adapter','UPIPaymentRecord','UPI payment record for Indian market transactions',0,[
    f('upiId','uuid','database',1,1,1),f('paymentId','uuid','database',1,0,1),
    f('upiVpa','string','database',1,0,0,1),f('upiTransactionId','string','database',1,1),
    f('amountINR','float','database',1),f('status','string','database',1,0,1),
    f('completedAt','datetime','database'),f('bankName','string','database'),
    f('lotRef','uuid','database')
  ],AUTH,0,0),
  e('razorpay-adapter','NetBankingRecord','Net banking payment record',0,[
    f('nbId','uuid','database',1,1,1),f('paymentId','uuid','database',1,0,1),
    f('bankCode','string','database',1,0,1),f('amountINR','float','database',1),
    f('status','string','database',1,0,1),f('initiatedAt','datetime','database',1),
    f('completedAt','datetime','database'),f('transactionRef','string','database',0,0,1),
    f('lotRef','uuid','database')
  ],AUTH,0,0),
  e('razorpay-adapter','PaymentDisputeRecord','Dispute or chargeback on a Razorpay payment',0,[
    f('disputeId','uuid','database',1,1,1),f('razorpayDisputeId','string','database',1,1),
    f('paymentId','uuid','database',1,0,1),f('amountINR','float','database',1),
    f('reason','string','database',1),f('status','string','database',1,0,1),
    f('raisedAt','datetime','database',1),f('resolvedAt','datetime','database'),
    f('respondedBy','address','database')
  ],ADM,0,0),
  e('razorpay-adapter','RazorpaySettlement','Razorpay settlement batch to bank account',0,[
    f('settlementId','uuid','database',1,1,1),f('razorpaySettlementId','string','database',1,1),
    f('amountINR','float','database',1),f('paymentCount','int','database',1),
    f('settlementDate','datetime','database',1),f('bankAccount','string','database',1,0,0,1),
    f('utr','string','database',0,0,1),f('status','string','database',1,0,1),
    f('feesDeducted','float','database')
  ],ADM,0,0),

  /* ── soulbound-token ── 8 entities */
  e('soulbound-token','SoulboundToken','Soulbound (non-transferable) token issued for credentials',1,[
    f('tokenId','int','on-chain',1,1,1),f('holderAddress','address','on-chain',1,0,1),
    f('tokenType','string','on-chain',1,0,1),f('issuerAddress','address','on-chain',1),
    f('mintedAt','datetime','on-chain',1),f('txHash','bytes32','on-chain',1,1),
    f('metadataUri','string','database'),f('revoked','boolean','on-chain'),
    f('lotRef','uuid','database',0,0,1)
  ],PUB,1,1),
  e('soulbound-token','SoulboundMintRequest','Request to mint a soulbound token for an actor',0,[
    f('requestId','uuid','database',1,1,1),f('holderAddress','address','database',1,0,1),
    f('tokenType','string','database',1),f('requestedBy','address','database',1),
    f('requestedAt','datetime','database',1),f('status','string','database',1,0,1),
    f('approvedBy','address','database'),f('lotRef','uuid','database'),
    f('approvedAt','datetime','database')
  ],ADM,0,0),
  e('soulbound-token','SoulboundRevocationRecord','Revocation record for a soulbound token',0,[
    f('revocationId','uuid','database',1,1,1),f('tokenId','int','on-chain',1,0,1),
    f('revokedBy','address','on-chain',1),f('revocationReason','string','on-chain',1),
    f('revokedAt','datetime','on-chain',1),f('txHash','bytes32','on-chain',1,1),
    f('lotRef','uuid','database'),f('regulatoryRef','uuid','database'),
    f('blockHeight','int','on-chain',1)
  ],ADM,1,1),
  e('soulbound-token','SoulboundTokenMetadata','Metadata record for a soulbound token',0,[
    f('metaId','uuid','database',1,1,1),f('tokenId','int','on-chain',1,0,1),
    f('name','string','database',1),f('description','text','database'),
    f('attributes','json','database',1),f('imageUri','string','database'),
    f('externalUrl','string','database'),f('schemaVersion','string','database',1),
    f('updatedAt','datetime','database',1)
  ],PUB,0,1),
  e('soulbound-token','SoulboundIssuerPolicy','Policy defining who can issue which token types',0,[
    f('policyId','uuid','database',1,1,1),f('issuerRole','string','database',1,1),
    f('allowedTokenTypes','json','database',1),f('requiresKyc','boolean','database',1),
    f('maxIssuancePerRole','int','database'),f('effectiveFrom','datetime','database',1),
    f('approvedBy','address','database',1),f('policyHash','bytes32','database',1,1),
    f('notes','text','database')
  ],ADM,0,0),
  e('soulbound-token','TokenHolderRegistry','Registry of all soulbound token holders',0,[
    f('registryId','uuid','database',1,1,1),f('holderAddress','address','on-chain',1,1,1),
    f('tokenCount','int','on-chain',1),f('tokenTypes','json','on-chain'),
    f('firstMintedAt','datetime','on-chain',1),f('lastMintedAt','datetime','on-chain'),
    f('isRevoked','boolean','on-chain'),f('orgId','uuid','database'),
    f('kycVerified','boolean','database',1)
  ],PUB,1,1),
  e('soulbound-token','SoulboundTransferAttemptLog','Log of blocked transfer attempts on soulbound tokens',0,[
    f('logId','uuid','database',1,1,1),f('tokenId','int','database',1,0,1),
    f('fromAddress','address','database',1),f('toAddress','address','database',1),
    f('attemptedAt','datetime','database',1,0,1),f('blocked','boolean','database',1),
    f('blockReason','string','database',1),f('callerAddress','address','database'),
    f('ipAddress','string','database')
  ],SYS,0,0),
  e('soulbound-token','TokenTypeDefinition','Definition of a soulbound token type and its rules',1,[
    f('typeId','uuid','database',1,1,1),f('typeName','string','database',1,1),
    f('issuerRole','string','database',1,0,1),f('revocable','boolean','database',1),
    f('maxHoldersPerType','int','database'),f('metadataSchema','json','database',1),
    f('createdAt','datetime','database',1),f('createdBy','address','database',1),
    f('description','text','database')
  ],ADM,0,0),

  /* ── erc721 ── 8 entities */
  e('erc721','NFTToken','ERC-721 NFT token record for AgroTrace certificates',1,[
    f('tokenId','int','on-chain',1,1,1),f('ownerAddress','address','on-chain',1,0,1),
    f('tokenUri','string','on-chain',1),f('mintedAt','datetime','on-chain',1),
    f('txHash','bytes32','on-chain',1,1),f('contractAddress','address','on-chain',1),
    f('isSoulbound','boolean','on-chain',1),f('metadataHash','bytes32','on-chain',1),
    f('lotRef','uuid','database',0,0,1)
  ],PUB,1,1),
  e('erc721','NFTTransfer','ERC-721 transfer event record',0,[
    f('transferId','uuid','database',1,1,1),f('tokenId','int','on-chain',1,0,1),
    f('fromAddress','address','on-chain',1,0,1),f('toAddress','address','on-chain',1,0,1),
    f('txHash','bytes32','on-chain',1,1),f('transferredAt','datetime','on-chain',1),
    f('blockHeight','int','on-chain',1),f('operator','address','on-chain'),
    f('transferType','string','on-chain',1)
  ],PUB,1,1),
  e('erc721','NFTApproval','ERC-721 approval grant for token transfer',0,[
    f('approvalId','uuid','database',1,1,1),f('tokenId','int','on-chain',1,0,1),
    f('ownerAddress','address','on-chain',1),f('approvedAddress','address','on-chain',1,0,1),
    f('txHash','bytes32','on-chain',1,1),f('approvedAt','datetime','on-chain',1),
    f('isRevoked','boolean','on-chain'),f('blockHeight','int','on-chain'),
    f('purpose','string','database')
  ],AUTH,1,0),
  e('erc721','NFTMetadata','Metadata record for an ERC-721 token',0,[
    f('metaId','uuid','database',1,1,1),f('tokenId','int','on-chain',1,0,1),
    f('name','string','database',1),f('description','text','database'),
    f('imageUri','string','database',1),f('attributes','json','database',1),
    f('externalUrl','string','database'),f('ipfsCid','string','database',1),
    f('schemaVersion','string','database',1)
  ],PUB,0,1),
  e('erc721','NFTMintLog','Log of each NFT mint operation',0,[
    f('mintLogId','uuid','database',1,1,1),f('tokenId','int','on-chain',1,0,1),
    f('mintedTo','address','on-chain',1,0,1),f('mintedBy','address','on-chain',1),
    f('mintedAt','datetime','on-chain',1),f('txHash','bytes32','on-chain',1,1),
    f('tokenType','string','database',1),f('lotRef','uuid','database'),
    f('blockHeight','int','on-chain',1)
  ],PUB,1,1),
  e('erc721','NFTBurnRecord','Burn record for a destroyed NFT',0,[
    f('burnId','uuid','database',1,1,1),f('tokenId','int','on-chain',1,0,1),
    f('burnedBy','address','on-chain',1),f('burnedAt','datetime','on-chain',1),
    f('txHash','bytes32','on-chain',1,1),f('burnReason','string','database',1),
    f('blockHeight','int','on-chain',1),f('lotRef','uuid','database'),
    f('replacedByTokenId','int','on-chain')
  ],ADM,1,0),
  e('erc721','NFTCollectionConfig','ERC-721 collection configuration for AgroTrace certs',1,[
    f('configId','uuid','database',1,1,1),f('contractAddress','address','on-chain',1,1,1),
    f('name','string','on-chain',1),f('symbol','string','on-chain',1),
    f('baseUri','string','database',1),f('maxSupply','int','on-chain'),
    f('isPaused','boolean','on-chain'),f('createdAt','datetime','on-chain',1),
    f('ownerAddress','address','on-chain',1)
  ],ADM,1,1),
  e('erc721','NFTRoyaltyRecord','Royalty configuration for NFT secondary market sales',0,[
    f('royaltyId','uuid','database',1,1,1),f('tokenId','int','on-chain',0,0,1),
    f('isDefault','boolean','database',1),f('royaltyPercent','float','on-chain',1),
    f('recipientAddress','address','on-chain',1,0,1),f('setAt','datetime','on-chain',1),
    f('txHash','bytes32','on-chain'),f('standard','string','database',1),
    f('approvedBy','address','database')
  ],ADM,1,0),
];
