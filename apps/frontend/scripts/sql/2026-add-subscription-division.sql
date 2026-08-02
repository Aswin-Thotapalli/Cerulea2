-- Migration: add `division` to subscriptions
-- Runs at DIVISIONS CUTOVER only, directly against Neon prod.
--
-- Hand-written (not drizzle-kit generate) on purpose: the drizzle meta snapshot
-- has drifted from schema.ts (it wants to rename unrelated tables), so an
-- auto-generated migration would try to apply unrelated changes to prod. This
-- statement is targeted and idempotent — safe to run more than once.
--
-- Apply with:  psql "$DATABASE_URL" -f scripts/sql/2026-add-subscription-division.sql

ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "division" text NOT NULL DEFAULT 'dapp';

CREATE INDEX IF NOT EXISTS "idx_subscriptions_user_division"
  ON "subscriptions" ("userId", "division");

-- Existing rows are backfilled to 'dapp' by the DEFAULT above. After cutover,
-- every new subscription row must set `division` explicitly at creation time.
