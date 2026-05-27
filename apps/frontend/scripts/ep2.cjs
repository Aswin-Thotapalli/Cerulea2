'use strict';
let _c=6000;
const sid=()=>`s${String(++_c).padStart(5,'0')}`;
const f=(n,t,s,r,u,i,e)=>({id:sid(),name:n,type:t,storage:s,required:!!r,unique:!!u,indexed:!!i,encrypted:!!e});
const ADM={create:'admin',read:'admin',update:'admin',delete:'admin'};
const SYS={create:'admin',read:'auth',update:'admin',delete:'admin'};
const AUTH={create:'auth',read:'auth',update:'owner',delete:'admin'};
const PUB={create:'auth',read:'public',update:'owner',delete:'admin'};
const e=(m,n,d,c,fs,a,o,p)=>({id:sid(),moduleId:m,name:n,description:d||undefined,isCore:!!c,fields:fs,access:a||AUTH,onChain:!!o,apiPublic:p!==undefined?!!p:true});

module.exports=[
  /* ── fees ── 8 entities */
  e('fees','BaseFeeSnapshot','Base fee sampled at each block',1,[
    f('snapshotId','uuid','database',1,1,1),f('blockHeight','int','on-chain',1,1,1),
    f('baseFeeAGT','float','on-chain',1),f('targetGasUsed','int','on-chain'),
    f('actualGasUsed','int','on-chain'),f('adjustmentFactor','float','on-chain'),
    f('capturedAt','datetime','on-chain',1),f('eip1559Compliant','boolean','on-chain'),
    f('blockUtilizationPct','float','on-chain')
  ],SYS,1,1),
  e('fees','GasUsageStat','Aggregated gas usage statistics per block range',0,[
    f('statId','uuid','database',1,1,1),f('fromBlock','int','on-chain',1,0,1),
    f('toBlock','int','on-chain',1,0,1),f('totalGasUsed','int','on-chain',1),
    f('avgGasPerTx','float','on-chain'),f('peakGasBlock','int','on-chain'),
    f('totalTxCount','int','on-chain',1),f('periodStart','datetime','on-chain',1),
    f('periodEnd','datetime','on-chain',1)
  ],SYS,1,1),
  e('fees','FeeCollectionRecord','Platform fees collected per transaction',0,[
    f('collectionId','uuid','database',1,1,1),f('txHash','bytes32','on-chain',1,1,1),
    f('senderAddress','address','on-chain',1,0,1),f('feeAmountAGT','float','on-chain',1),
    f('burnedAmount','float','on-chain',1),f('validatorShare','float','on-chain',1),
    f('collectedAt','datetime','on-chain',1),f('blockHeight','int','on-chain',1,0,1),
    f('feeType','string','on-chain',1)
  ],SYS,1,1),
  e('fees','GasRefundRecord','Gas refund issued to a transaction sender',0,[
    f('refundId','uuid','database',1,1,1),f('txHash','bytes32','on-chain',1,0,1),
    f('recipientAddress','address','on-chain',1,0,1),f('refundAmountAGT','float','on-chain',1),
    f('refundReason','string','on-chain',1),f('refundedAt','datetime','on-chain',1),
    f('originalGasLimit','int','on-chain'),f('unusedGas','int','on-chain',1),
    f('blockHeight','int','on-chain',1)
  ],SYS,1,0),
  e('fees','FeePolicy','Active gas fee policy configuration',1,[
    f('policyId','uuid','database',1,1,1),f('baseFee','float','database',1),
    f('dynamicAdjustment','boolean','database',1),f('burnPercent','float','database',1),
    f('validatorRewardPercent','float','database',1),f('maxFeePerGas','float','database',1),
    f('effectiveFrom','datetime','database',1),f('approvedBy','address','database',1),
    f('policyHash','bytes32','database',1,1)
  ],ADM,0,0),
  e('fees','SponsoredTxRecord','Gasless transaction sponsored by the relayer',0,[
    f('sponsorId','uuid','database',1,1,1),f('txHash','bytes32','on-chain',1,1,1),
    f('senderAddress','address','on-chain',1,0,1),f('relayerAddress','address','on-chain',1),
    f('sponsoredFeeAGT','float','on-chain',1),f('sponsoredAt','datetime','on-chain',1),
    f('senderRole','string','database',1,0,1),f('lotRef','uuid','database'),
    f('budgetConsumedAGT','float','on-chain')
  ],SYS,1,0),
  e('fees','FeeBudgetAllocation','Annual fee budget allocated to a role or org',0,[
    f('budgetId','uuid','database',1,1,1),f('allocatedForRole','string','database',1,0,1),
    f('totalBudgetAGT','float','database',1),f('usedBudgetAGT','float','database'),
    f('periodStart','datetime','database',1),f('periodEnd','datetime','database',1),
    f('approvedBy','address','database',1),f('autoRenew','boolean','database',1),
    f('remainingAGT','float','database')
  ],ADM,0,0),
  e('fees','FeeAnomalyAlert','Alert triggered when fee pattern deviates from normal',0,[
    f('alertId','uuid','database',1,1,1),f('alertType','string','database',1),
    f('detectedAt','datetime','database',1,0,1),f('deviationPercent','float','database',1),
    f('affectedBlocks','json','database'),f('severity','string','database',1),
    f('resolved','boolean','database',1),f('resolvedAt','datetime','database'),
    f('notes','text','database')
  ],SYS,0,0),

  /* ── rpc ── 8 entities */
  e('rpc','RPCEndpoint','Configured RPC endpoint for chain interaction',1,[
    f('endpointId','uuid','database',1,1,1),f('url','string','database',1,1,1),
    f('protocol','string','database',1),f('authType','string','database',1),
    f('rateLimitPerMin','int','database',1),f('isActive','boolean','database',1),
    f('region','string','database',1),f('addedAt','datetime','database',1),
    f('tlsEnabled','boolean','database',1)
  ],ADM,0,0),
  e('rpc','RPCRequestLog','Log of each RPC request made to the endpoint',0,[
    f('logId','uuid','database',1,1,1),f('method','string','database',1,0,1),
    f('callerAddress','address','database',0,0,1),f('responseTimeMs','int','database'),
    f('statusCode','int','database',1),f('requestedAt','datetime','database',1,0,1),
    f('endpointId','uuid','database',1,0,1),f('payloadSizeBytes','int','database'),
    f('errorMessage','text','database')
  ],SYS,0,0),
  e('rpc','RPCRateLimit','Rate limit rules per API key or IP range',0,[
    f('ruleId','uuid','database',1,1,1),f('keyOrIp','string','database',1,0,1),
    f('requestsPerMin','int','database',1),f('burstAllowance','int','database'),
    f('appliedAt','datetime','database',1),f('expiresAt','datetime','database'),
    f('isActive','boolean','database',1),f('appliedBy','address','database',1),
    f('rateLimitTier','string','database',1)
  ],ADM,0,0),
  e('rpc','RPCApiKey','API key issued for authenticated RPC access',0,[
    f('keyId','uuid','database',1,1,1),f('keyHash','bytes32','database',1,1,1),
    f('issuedTo','uuid','database',1,0,1),f('issuedAt','datetime','database',1),
    f('expiresAt','datetime','database',1),f('allowedMethods','json','database'),
    f('isRevoked','boolean','database',1),f('lastUsedAt','datetime','database'),
    f('callCount','int','database')
  ],ADM,0,0),
  e('rpc','RPCHealthCheck','Periodic health check result for an RPC endpoint',0,[
    f('checkId','uuid','database',1,1,1),f('endpointId','uuid','database',1,0,1),
    f('checkedAt','datetime','database',1,0,1),f('latencyMs','int','database',1),
    f('isHealthy','boolean','database',1),f('blockHeight','int','database'),
    f('errorDetail','text','database'),f('checkVersion','string','database'),
    f('alertSent','boolean','database')
  ],SYS,0,0),
  e('rpc','RPCThrottleEvent','Throttle event fired when rate limit is exceeded',0,[
    f('throttleId','uuid','database',1,1,1),f('keyOrIp','string','database',1,0,1),
    f('throttledAt','datetime','database',1,0,1),f('requestsInWindow','int','database',1),
    f('limitThreshold','int','database',1),f('endpointId','uuid','database',1),
    f('penaltyUntil','datetime','database'),f('notificationSent','boolean','database'),
    f('autoUnblocked','boolean','database')
  ],SYS,0,0),
  e('rpc','RPCMethodWhitelist','Whitelist of allowed JSON-RPC methods per key tier',0,[
    f('listId','uuid','database',1,1,1),f('tierName','string','database',1,1),
    f('allowedMethods','json','database',1),f('blockedMethods','json','database'),
    f('effectiveFrom','datetime','database',1),f('approvedBy','address','database',1),
    f('notes','text','database'),f('version','int','database',1),
    f('updatedAt','datetime','database',1)
  ],ADM,0,0),
  e('rpc','RPCErrorSummary','Aggregated error summary for an RPC endpoint over a period',0,[
    f('summaryId','uuid','database',1,1,1),f('endpointId','uuid','database',1,0,1),
    f('periodStart','datetime','database',1),f('periodEnd','datetime','database',1),
    f('totalErrors','int','database',1),f('errorRate','float','database',1),
    f('topErrorCode','string','database'),f('avgResponseMs','float','database'),
    f('generatedAt','datetime','database',1)
  ],SYS,0,0),

  /* ── graphql-gateway ── 8 entities */
  e('graphql-gateway','GraphQLSchema','Versioned GraphQL schema served by the gateway',1,[
    f('schemaId','uuid','database',1,1,1),f('version','string','database',1,1),
    f('schemaHash','bytes32','database',1,1),f('deployedAt','datetime','database',1),
    f('typeCount','int','database'),f('queryCount','int','database'),
    f('mutationCount','int','database'),f('isActive','boolean','database',1),
    f('deployedBy','address','database',1)
  ],ADM,0,0),
  e('graphql-gateway','GraphQLQueryLog','Log of every GraphQL query executed',0,[
    f('logId','uuid','database',1,1,1),f('operationName','string','database',0,0,1),
    f('operationType','string','database',1),f('executionMs','int','database'),
    f('callerUserId','uuid','database',0,0,1),f('executedAt','datetime','database',1,0,1),
    f('errorCount','int','database'),f('cacheHit','boolean','database'),
    f('payloadSizeBytes','int','database')
  ],SYS,0,0),
  e('graphql-gateway','GraphQLRateLimit','Rate limit config per user or role for the gateway',0,[
    f('limitId','uuid','database',1,1,1),f('roleOrUserId','string','database',1,0,1),
    f('queriesPerMin','int','database',1),f('complexityLimit','int','database',1),
    f('depthLimit','int','database',1),f('appliedAt','datetime','database',1),
    f('isActive','boolean','database',1),f('appliedBy','address','database',1),
    f('overrideReason','text','database')
  ],ADM,0,0),
  e('graphql-gateway','GraphQLResolver','Resolver definition for a GraphQL field',0,[
    f('resolverId','uuid','database',1,1,1),f('typeName','string','database',1,0,1),
    f('fieldName','string','database',1,0,1),f('resolverType','string','database',1),
    f('dataSource','string','database',1),f('authRequired','boolean','database',1),
    f('cacheEnabled','boolean','database'),f('cacheTtlSecs','int','database'),
    f('addedAt','datetime','database',1)
  ],ADM,0,0),
  e('graphql-gateway','GraphQLDeprecationRecord','Deprecated fields and types in the GraphQL schema',0,[
    f('deprecationId','uuid','database',1,1,1),f('typeName','string','database',1),
    f('fieldName','string','database'),f('deprecatedAt','datetime','database',1),
    f('removalTargetDate','datetime','database',1),f('replacedBy','string','database'),
    f('reason','text','database',1),f('affectedClients','int','database'),
    f('notificationSent','boolean','database',1)
  ],ADM,0,0),
  e('graphql-gateway','GraphQLErrorLog','GraphQL execution error log entry',0,[
    f('errorId','uuid','database',1,1,1),f('operationName','string','database',0,0,1),
    f('errorCode','string','database',1),f('message','text','database',1),
    f('path','json','database'),f('occurredAt','datetime','database',1,0,1),
    f('callerUserId','uuid','database',0,0,1),f('schemaVersion','string','database'),
    f('resolved','boolean','database')
  ],SYS,0,0),
  e('graphql-gateway','GraphQLSubscriptionSession','Active GraphQL subscription session',0,[
    f('sessionId','uuid','database',1,1,1),f('userId','uuid','database',1,0,1),
    f('subscriptionName','string','database',1,0,1),f('variables','json','database'),
    f('createdAt','datetime','database',1),f('lastEventAt','datetime','database'),
    f('eventsDelivered','int','database'),f('isActive','boolean','database',1),
    f('expiresAt','datetime','database',1)
  ],AUTH,0,0),
  e('graphql-gateway','GraphQLIntrospectionAudit','Audit log of introspection queries',0,[
    f('auditId','uuid','database',1,1,1),f('callerIp','string','database',1),
    f('callerUserId','uuid','database',0,0,1),f('queriedAt','datetime','database',1,0,1),
    f('schemaVersion','string','database'),f('blocked','boolean','database',1),
    f('blockReason','string','database'),f('userAgent','string','database'),
    f('requestId','uuid','database',1)
  ],ADM,0,0),

  /* ── ws-subscriptions ── 8 entities */
  e('ws-subscriptions','WebSocketChannel','Named event channel for WebSocket subscriptions',1,[
    f('channelId','uuid','database',1,1,1),f('channelName','string','database',1,1),
    f('eventTypes','json','database',1),f('authRequired','boolean','database',1),
    f('maxSubscribers','int','database'),f('isActive','boolean','database',1),
    f('createdAt','datetime','database',1),f('createdBy','address','database',1),
    f('description','text','database')
  ],ADM,0,0),
  e('ws-subscriptions','WebSocketSession','Active WebSocket session for a subscriber',0,[
    f('sessionId','uuid','database',1,1,1),f('userId','uuid','database',1,0,1),
    f('channelId','uuid','database',1,0,1),f('connectedAt','datetime','database',1),
    f('disconnectedAt','datetime','database'),f('eventsReceived','int','database'),
    f('clientIp','string','database',1),f('userAgent','string','database'),
    f('isActive','boolean','database',1)
  ],AUTH,0,0),
  e('ws-subscriptions','WebSocketEventLog','Log of each event delivered over WebSocket',0,[
    f('eventId','uuid','database',1,1,1),f('channelId','uuid','database',1,0,1),
    f('eventType','string','database',1,0,1),f('payload','json','database',1),
    f('publishedAt','datetime','database',1,0,1),f('subscriberCount','int','database'),
    f('deliveredCount','int','database'),f('failedCount','int','database'),
    f('sourceModule','string','database',1)
  ],SYS,0,0),
  e('ws-subscriptions','WebSocketRateLimit','Rate limit rules for WebSocket connections',0,[
    f('ruleId','uuid','database',1,1,1),f('roleOrUserId','string','database',1,0,1),
    f('messagesPerMin','int','database',1),f('maxConnections','int','database',1),
    f('appliedAt','datetime','database',1),f('isActive','boolean','database',1),
    f('appliedBy','address','database',1),f('penaltyDurationMins','int','database'),
    f('notes','text','database')
  ],ADM,0,0),
  e('ws-subscriptions','WebSocketHeartbeatLog','Ping-pong heartbeat log for connection health',0,[
    f('heartbeatId','uuid','database',1,1,1),f('sessionId','uuid','database',1,0,1),
    f('sentAt','datetime','database',1,0,1),f('receivedAt','datetime','database'),
    f('latencyMs','int','database'),f('isAlive','boolean','database',1),
    f('failureCount','int','database'),f('lastFailureAt','datetime','database'),
    f('autoDisconnected','boolean','database')
  ],SYS,0,0),
  e('ws-subscriptions','WebSocketAuthToken','Auth token used to authenticate a WebSocket connection',0,[
    f('tokenId','uuid','database',1,1,1),f('userId','uuid','database',1,0,1),
    f('tokenHash','bytes32','database',1,1),f('issuedAt','datetime','database',1),
    f('expiresAt','datetime','database',1),f('channelsAllowed','json','database'),
    f('isRevoked','boolean','database',1),f('lastUsedAt','datetime','database'),
    f('revokedAt','datetime','database')
  ],AUTH,0,0),
  e('ws-subscriptions','WebSocketErrorRecord','Error record for a failed WebSocket event delivery',0,[
    f('errorId','uuid','database',1,1,1),f('sessionId','uuid','database',1,0,1),
    f('eventId','uuid','database',0,0,1),f('errorCode','string','database',1),
    f('errorMessage','text','database',1),f('occurredAt','datetime','database',1,0,1),
    f('retryCount','int','database'),f('resolved','boolean','database',1),
    f('resolvedAt','datetime','database')
  ],SYS,0,0),
  e('ws-subscriptions','WebSocketMetricSummary','Hourly metric summary for a WebSocket channel',0,[
    f('summaryId','uuid','database',1,1,1),f('channelId','uuid','database',1,0,1),
    f('periodStart','datetime','database',1),f('periodEnd','datetime','database',1),
    f('peakSubscribers','int','database',1),f('totalEventsPublished','int','database',1),
    f('deliverySuccessRate','float','database',1),f('avgLatencyMs','float','database'),
    f('generatedAt','datetime','database',1)
  ],SYS,0,0),

  /* ── api-gateway ── 8 entities */
  e('api-gateway','APIRoute','Registered API route definition with auth policy',1,[
    f('routeId','uuid','database',1,1,1),f('path','string','database',1,1),
    f('method','string','database',1,0,1),f('authType','string','database',1),
    f('rateLimitPerMin','int','database',1),f('isActive','boolean','database',1),
    f('addedAt','datetime','database',1),f('serviceTarget','string','database',1),
    f('timeoutMs','int','database')
  ],ADM,0,0),
  e('api-gateway','APIAccessLog','Log of every API request through the gateway',0,[
    f('logId','uuid','database',1,1,1),f('routeId','uuid','database',1,0,1),
    f('callerUserId','uuid','database',0,0,1),f('callerIp','string','database',1),
    f('method','string','database',1),f('statusCode','int','database',1),
    f('responseTimeMs','int','database'),f('requestedAt','datetime','database',1,0,1),
    f('payloadSizeBytes','int','database')
  ],SYS,0,0),
  e('api-gateway','APIKey','API key issued to an external consumer',0,[
    f('keyId','uuid','database',1,1,1),f('keyHash','bytes32','database',1,1,1),
    f('issuedTo','uuid','database',1,0,1),f('issuedAt','datetime','database',1),
    f('expiresAt','datetime','database',1),f('scopes','json','database',1),
    f('isRevoked','boolean','database',1),f('lastUsedAt','datetime','database'),
    f('revokedReason','text','database')
  ],ADM,0,0),
  e('api-gateway','APIRateLimitPolicy','Rate limit policy applied to an API key or role',0,[
    f('policyId','uuid','database',1,1,1),f('targetType','string','database',1),
    f('targetId','string','database',1,0,1),f('requestsPerMin','int','database',1),
    f('burstAllowance','int','database'),f('appliedAt','datetime','database',1),
    f('isActive','boolean','database',1),f('appliedBy','address','database',1),
    f('notes','text','database')
  ],ADM,0,0),
  e('api-gateway','APIThrottleEvent','Throttle event when a caller exceeds rate limit',0,[
    f('throttleId','uuid','database',1,1,1),f('callerKeyOrIp','string','database',1,0,1),
    f('routeId','uuid','database',1,0,1),f('throttledAt','datetime','database',1,0,1),
    f('requestsInWindow','int','database',1),f('limitThreshold','int','database',1),
    f('penaltyUntil','datetime','database'),f('notificationSent','boolean','database'),
    f('autoUnblocked','boolean','database')
  ],SYS,0,0),
  e('api-gateway','APICertificate','TLS certificate pinned for an external API consumer',0,[
    f('certId','uuid','database',1,1,1),f('consumerId','uuid','database',1,0,1),
    f('certFingerprint','bytes32','database',1,1),f('issuedAt','datetime','database',1),
    f('expiresAt','datetime','database',1,0,1),f('pinnedAt','datetime','database',1),
    f('pinnedBy','address','database',1),f('isRevoked','boolean','database',1),
    f('keyAlgorithm','string','database')
  ],ADM,0,0),
  e('api-gateway','APIVersionRecord','Version record for a public API version lifecycle',0,[
    f('versionId','uuid','database',1,1,1),f('version','string','database',1,1),
    f('basePathPrefix','string','database',1,1),f('releasedAt','datetime','database',1),
    f('deprecatedAt','datetime','database'),f('sunsetAt','datetime','database'),
    f('isActive','boolean','database',1),f('changelogUrl','string','database'),
    f('routeCount','int','database',1)
  ],ADM,0,0),
  e('api-gateway','APIGatewayHealthEvent','Health event raised for API gateway service',0,[
    f('eventId','uuid','database',1,1,1),f('eventType','string','database',1),
    f('severity','string','database',1,0,1),f('message','text','database',1),
    f('occurredAt','datetime','database',1,0,1),f('resolvedAt','datetime','database'),
    f('affectedRoutes','json','database'),f('rootCause','text','database'),
    f('postMortemRef','uuid','database')
  ],SYS,0,0),

  /* ── metrics-dashboards ── 8 entities */
  e('metrics-dashboards','MetricDefinition','Definition of a tracked platform metric',1,[
    f('metricId','uuid','database',1,1,1),f('metricName','string','database',1,1),
    f('category','string','database',1,0,1),f('unit','string','database',1),
    f('aggregation','string','database',1),f('retentionDays','int','database',1),
    f('alertEnabled','boolean','database',1),f('addedAt','datetime','database',1),
    f('description','text','database')
  ],ADM,0,0),
  e('metrics-dashboards','MetricDataPoint','Single data point for a tracked metric',0,[
    f('pointId','uuid','database',1,1,1),f('metricId','uuid','database',1,0,1),
    f('value','float','database',1),f('labels','json','database'),
    f('capturedAt','datetime','database',1,0,1),f('source','string','database',1),
    f('blockHeight','int','database',0,0,1),f('aggregationPeriod','string','database'),
    f('isAnomaly','boolean','database')
  ],SYS,0,0),
  e('metrics-dashboards','Dashboard','User-facing metrics dashboard definition',0,[
    f('dashboardId','uuid','database',1,1,1),f('name','string','database',1),
    f('description','text','database'),f('panels','json','database',1),
    f('createdBy','uuid','database',1),f('createdAt','datetime','database',1),
    f('isPublic','boolean','database',1),f('refreshIntervalSecs','int','database'),
    f('lastViewedAt','datetime','database')
  ],AUTH,0,1),
  e('metrics-dashboards','AlertRule','Metric threshold alert rule configuration',0,[
    f('ruleId','uuid','database',1,1,1),f('metricId','uuid','database',1,0,1),
    f('condition','string','database',1),f('threshold','float','database',1),
    f('severityLevel','string','database',1),f('isActive','boolean','database',1),
    f('notifyChannels','json','database',1),f('createdAt','datetime','database',1),
    f('createdBy','address','database',1)
  ],ADM,0,0),
  e('metrics-dashboards','AlertFiring','Record of a fired metric alert',0,[
    f('alertId','uuid','database',1,1,1),f('ruleId','uuid','database',1,0,1),
    f('firedAt','datetime','database',1,0,1),f('resolvedAt','datetime','database'),
    f('triggerValue','float','database',1),f('thresholdValue','float','database',1),
    f('notifiedChannels','json','database'),f('isResolved','boolean','database',1),
    f('acknowledgedBy','address','database')
  ],SYS,0,0),
  e('metrics-dashboards','MetricRollup','Hourly or daily metric rollup for reporting',0,[
    f('rollupId','uuid','database',1,1,1),f('metricId','uuid','database',1,0,1),
    f('granularity','string','database',1),f('periodStart','datetime','database',1,0,1),
    f('periodEnd','datetime','database',1),f('minValue','float','database'),
    f('maxValue','float','database'),f('avgValue','float','database',1),
    f('dataPointCount','int','database',1)
  ],SYS,0,0),
  e('metrics-dashboards','MetricExportJob','Scheduled metric export job for compliance',0,[
    f('jobId','uuid','database',1,1,1),f('exportFormat','string','database',1),
    f('metricIds','json','database',1),f('startDate','datetime','database',1),
    f('endDate','datetime','database',1),f('requestedBy','uuid','database',1),
    f('requestedAt','datetime','database',1),f('status','string','database',1,0,1),
    f('outputUrl','string','database')
  ],AUTH,0,0),
  e('metrics-dashboards','ValidatorMetricReport','Validator-specific performance metric report',0,[
    f('reportId','uuid','database',1,1,1),f('validatorId','uuid','database',1,0,1),
    f('reportDate','string','database',1,0,1),f('blocksMissed','int','database',1),
    f('avgBlockTimeMs','float','database',1),f('networkUptimePct','float','database',1),
    f('slashRisk','string','database',1),f('generatedAt','datetime','database',1),
    f('publiclyVisible','boolean','database',1)
  ],SYS,0,1),

  /* ── log-shipping ── 8 entities */
  e('log-shipping','LogShippingConfig','Configuration for log destination shipping',1,[
    f('configId','uuid','database',1,1,1),f('destination','string','database',1),
    f('protocol','string','database',1),f('endpoint','string','database',1,0,0,1),
    f('retentionYears','int','database',1),f('encryptionEnabled','boolean','database',1),
    f('isActive','boolean','database',1),f('createdAt','datetime','database',1),
    f('createdBy','address','database',1)
  ],ADM,0,0),
  e('log-shipping','LogShipmentRecord','Record of a completed log batch shipment',0,[
    f('shipmentId','uuid','database',1,1,1),f('configId','uuid','database',1,0,1),
    f('batchSize','int','database',1),f('shippedAt','datetime','database',1,0,1),
    f('compressionRatio','float','database'),f('destinationAck','boolean','database',1),
    f('retryCount','int','database'),f('errorDetail','text','database'),
    f('logPeriodEnd','datetime','database',1)
  ],SYS,0,0),
  e('log-shipping','LogRetentionPolicy','Retention policy per log category',0,[
    f('policyId','uuid','database',1,1,1),f('logCategory','string','database',1,1),
    f('retentionDays','int','database',1),f('compressAfterDays','int','database'),
    f('archiveAfterDays','int','database'),f('deleteAfterDays','int','database',1),
    f('encryptAtRest','boolean','database',1),f('approvedAt','datetime','database',1),
    f('approvedBy','address','database',1)
  ],ADM,0,0),
  e('log-shipping','ChainEventLog','Blockchain event log entry shipped to ELK',0,[
    f('logId','uuid','database',1,1,1),f('txHash','bytes32','on-chain',0,0,1),
    f('eventType','string','database',1,0,1),f('contractAddress','address','on-chain'),
    f('blockHeight','int','on-chain',1,0,1),f('loggedAt','datetime','on-chain',1),
    f('rawPayload','json','database'),f('indexedAt','datetime','database',1,0,1),
    f('elkDocId','string','database')
  ],SYS,0,0),
  e('log-shipping','APIAccessLogArchive','Archived API access log record for compliance',0,[
    f('archiveId','uuid','database',1,1,1),f('callerIp','string','database',1),
    f('routePath','string','database',1),f('method','string','database',1),
    f('statusCode','int','database',1),f('requestedAt','datetime','database',1,0,1),
    f('responseTimeMs','int','database'),f('callerUserId','uuid','database',0,0,1),
    f('archiveBatchId','uuid','database',1)
  ],ADM,0,0),
  e('log-shipping','LogShippingHealthCheck','Health check result for a log shipping destination',0,[
    f('checkId','uuid','database',1,1,1),f('configId','uuid','database',1,0,1),
    f('checkedAt','datetime','database',1,0,1),f('isReachable','boolean','database',1),
    f('latencyMs','int','database'),f('lastSuccessAt','datetime','database'),
    f('consecutiveFailures','int','database'),f('alertSent','boolean','database'),
    f('errorDetail','text','database')
  ],SYS,0,0),
  e('log-shipping','LogTamperProofHash','Tamper-evident hash for a log batch',0,[
    f('hashId','uuid','database',1,1,1),f('batchRef','uuid','database',1,0,1),
    f('batchHash','bytes32','database',1,1),f('logCount','int','database',1),
    f('generatedAt','datetime','database',1,0,1),f('anchoredOnChain','boolean','on-chain'),
    f('chainTxHash','bytes32','on-chain'),f('storageUri','string','database'),
    f('verifiedAt','datetime','database')
  ],ADM,1,0),
  e('log-shipping','LogAlertRule','Alert rule for abnormal log patterns',0,[
    f('ruleId','uuid','database',1,1,1),f('patternRegex','string','database',1),
    f('logCategory','string','database',1,0,1),f('severityLevel','string','database',1),
    f('actionOnMatch','string','database',1),f('isActive','boolean','database',1),
    f('createdBy','address','database',1),f('createdAt','datetime','database',1),
    f('lastMatchedAt','datetime','database')
  ],ADM,0,0),

  /* ── backups-restore ── 8 entities */
  e('backups-restore','BackupSchedule','Backup schedule configuration',1,[
    f('scheduleId','uuid','database',1,1,1),f('backupType','string','database',1),
    f('cronExpression','string','database',1),f('destination','string','database',1),
    f('encryptionEnabled','boolean','database',1),f('retentionDays','int','database',1),
    f('isActive','boolean','database',1),f('createdAt','datetime','database',1),
    f('createdBy','address','database',1)
  ],ADM,0,0),
  e('backups-restore','BackupRecord','Record of a completed backup run',0,[
    f('backupId','uuid','database',1,1,1),f('scheduleId','uuid','database',1,0,1),
    f('backupType','string','database',1),f('startedAt','datetime','database',1,0,1),
    f('completedAt','datetime','database'),f('sizeBytes','int','database'),
    f('storageUri','string','database',1,0,0,1),f('backupHash','bytes32','database',1,1),
    f('status','string','database',1,0,1)
  ],ADM,0,0),
  e('backups-restore','RestoreRecord','Record of a restore operation performed',0,[
    f('restoreId','uuid','database',1,1,1),f('backupId','uuid','database',1,0,1),
    f('restoredBy','address','database',1),f('startedAt','datetime','database',1),
    f('completedAt','datetime','database'),f('targetEnvironment','string','database',1),
    f('status','string','database',1,0,1),f('rollbackAvailable','boolean','database',1),
    f('postRestoreCheckPassed','boolean','database')
  ],ADM,0,0),
  e('backups-restore','BackupIntegrityCheck','Integrity verification for a backup artifact',0,[
    f('checkId','uuid','database',1,1,1),f('backupId','uuid','database',1,0,1),
    f('checkedAt','datetime','database',1,0,1),f('hashVerified','boolean','database',1),
    f('decryptionTested','boolean','database'),f('restoreSimulated','boolean','database'),
    f('checkedBy','address','database',1),f('passed','boolean','database',1),
    f('failureDetail','text','database')
  ],ADM,0,0),
  e('backups-restore','DisasterRecoveryPlan','DR plan version for the AgroTrace network',1,[
    f('planId','uuid','database',1,1,1),f('version','int','database',1,1),
    f('rpoHours','float','database',1),f('rtoHours','float','database',1),
    f('approvedBy','address','database',1),f('approvedAt','datetime','database',1),
    f('lastDrillDate','datetime','database'),f('nextDrillDate','datetime','database'),
    f('planDocHash','bytes32','database',1)
  ],ADM,0,0),
  e('backups-restore','BackupStorageLocation','Configured storage location for backup artifacts',0,[
    f('locationId','uuid','database',1,1,1),f('provider','string','database',1),
    f('region','string','database',1),f('bucket','string','database',1,0,0,1),
    f('encryptionKeyRef','string','database',1,0,0,1),f('accessVerifiedAt','datetime','database'),
    f('isActive','boolean','database',1),f('replicationEnabled','boolean','database'),
    f('addedAt','datetime','database',1)
  ],ADM,0,0),
  e('backups-restore','BackupAnomalyAlert','Alert raised when a scheduled backup fails',0,[
    f('alertId','uuid','database',1,1,1),f('scheduleId','uuid','database',1,0,1),
    f('alertType','string','database',1),f('firedAt','datetime','database',1,0,1),
    f('missedRunAt','datetime','database',1),f('consecutiveMisses','int','database',1),
    f('notifiedChannels','json','database'),f('resolvedAt','datetime','database'),
    f('rootCause','text','database')
  ],SYS,0,0),
  e('backups-restore','EncryptionKeyRotationLog','Log of encryption key rotations for backup data',0,[
    f('rotationId','uuid','database',1,1,1),f('oldKeyRef','string','database',1,0,0,1),
    f('newKeyRef','string','database',1,0,0,1),f('rotatedAt','datetime','database',1),
    f('rotatedBy','address','database',1),f('affectedBackups','int','database',1),
    f('completedAt','datetime','database'),f('re-encryptionStatus','string','database',1),
    f('kmsProvider','string','database',1)
  ],ADM,0,0),
];
