-- Migration: 0001_fix_column_types.sql
-- Converts boolean-as-text and integer-as-text columns to proper native types.
--
-- IMPORTANT: Deploy the updated application code BEFORE running this migration.
-- The new code uses String(v) === 'true' pattern that works with both text and
-- boolean column types, so the transition window is safe.
--
-- Run with: psql $DATABASE_URL -f drizzle/0001_fix_column_types.sql
--        or: npm run db:migrate (if drizzle-kit is configured for migrations)

-- users.isTestAccount: text('false') → boolean DEFAULT false
ALTER TABLE "users"
  ALTER COLUMN "isTestAccount" TYPE boolean
  USING ("isTestAccount" = 'true');

ALTER TABLE "users"
  ALTER COLUMN "isTestAccount" SET DEFAULT false,
  ALTER COLUMN "isTestAccount" SET NOT NULL;

-- subscriptions.cancelAtPeriodEnd: text('false') → boolean DEFAULT false
ALTER TABLE "subscriptions"
  ALTER COLUMN "cancelAtPeriodEnd" TYPE boolean
  USING ("cancelAtPeriodEnd" = 'true');

ALTER TABLE "subscriptions"
  ALTER COLUMN "cancelAtPeriodEnd" SET DEFAULT false,
  ALTER COLUMN "cancelAtPeriodEnd" SET NOT NULL;

-- smartContracts.enabled: text('true') → boolean DEFAULT true
ALTER TABLE "smartContracts"
  ALTER COLUMN "enabled" TYPE boolean
  USING ("enabled" = 'true');

ALTER TABLE "smartContracts"
  ALTER COLUMN "enabled" SET DEFAULT true,
  ALTER COLUMN "enabled" SET NOT NULL;

-- subscriptionAddons.quantity: text('1') → integer DEFAULT 1
ALTER TABLE "subscriptionAddons"
  ALTER COLUMN "quantity" TYPE integer
  USING ("quantity"::integer);

ALTER TABLE "subscriptionAddons"
  ALTER COLUMN "quantity" SET DEFAULT 1,
  ALTER COLUMN "quantity" SET NOT NULL;

-- billingOneTimePurchases.amountCents: text → integer (nullable)
ALTER TABLE "billingOneTimePurchases"
  ALTER COLUMN "amountCents" TYPE integer
  USING ("amountCents"::integer);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_projects_userId ON projects ("userId");
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects ("status");
CREATE INDEX IF NOT EXISTS idx_drafts_projectId ON drafts ("projectId");
CREATE INDEX IF NOT EXISTS idx_aiThreads_userId ON "aiThreads" ("userId");
CREATE INDEX IF NOT EXISTS idx_aiThreads_projectId ON "aiThreads" ("projectId");
CREATE INDEX IF NOT EXISTS idx_aiMessages_threadId ON "aiMessages" ("threadId");
CREATE INDEX IF NOT EXISTS idx_subscriptions_userId ON subscriptions ("userId");
CREATE INDEX IF NOT EXISTS idx_subscriptionAddons_subscriptionId ON "subscriptionAddons" ("subscriptionId");
CREATE INDEX IF NOT EXISTS idx_smartContracts_projectId ON "smartContracts" ("projectId");
CREATE INDEX IF NOT EXISTS idx_snapshots_projectId ON snapshots ("projectId");
CREATE INDEX IF NOT EXISTS idx_apiKeys_userId ON "apiKeys" ("userId");
CREATE INDEX IF NOT EXISTS idx_verificationTokens_identifier ON "verificationTokens" ("identifier");
