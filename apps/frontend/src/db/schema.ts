// apps/frontend/src/db/schema.ts
import { pgTable, text, boolean, integer, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  userId: text("userId"),
  name: text("name").notNull(),
  slug: text("slug"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug"),
  description: text("description"),
  projectType: text("projectType").notNull(),
  workspaceId: text("workspaceId"),
  userId: text("userId").notNull(),
  selectedTemplateIds: text("selectedTemplateIds"),
  blueprint: text("blueprint"),
  graph: text("graph"),
  schemaJson: text("schemaJson"),
  logicJson: text("logicJson"),
  economics: text("economics"),
  legacyMode: text("legacyMode").default("none"),
  status: text("status").default("draft"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
  updatedAt: text("updatedAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
}, (t) => [
  index("idx_projects_userid").on(t.userId),
  index("idx_projects_status").on(t.status),
]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  hashedPassword: text("hashedPassword"),
  name: text("name"),
  isTestAccount: boolean("isTestAccount").default(false).notNull(),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
  updatedAt: text("updatedAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  displayName: text("displayName"),
  avatarUrl: text("avatarUrl"),
  company: text("company"),
  role: text("role"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});

export const verificationTokens = pgTable("verificationTokens", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expiresAt: text("expiresAt").notNull(),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
}, (t) => [
  index("idx_verificationtokens_identifier").on(t.identifier),
]);

export const drafts = pgTable("drafts", {
  id: text("id").primaryKey(),
  projectId: text("projectId").notNull(),
  data: text("data"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
  updatedAt: text("updatedAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
}, (t) => [
  index("idx_drafts_projectid").on(t.projectId),
]);

export const aiThreads = pgTable("aiThreads", {
  id: text("id").primaryKey(),
  userId: text("userId"),
  projectId: text("projectId"),
  title: text("title"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
  updatedAt: text("updatedAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
}, (t) => [
  index("idx_aithreads_userid").on(t.userId),
  index("idx_aithreads_projectid").on(t.projectId),
]);

export const aiMessages = pgTable("aiMessages", {
  id: text("id").primaryKey(),
  threadId: text("threadId").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  meta: text("meta"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
}, (t) => [
  index("idx_aimessages_threadid").on(t.threadId),
]);

// `plan` historically held 'free' | 'developer' | 'pro' | 'enterprise'.
// It now also holds the Cerulea Studio billing-catalog tier ids
// ('public_dapps' | 'private_dapps' | 'private_dapps_pro') — see
// src/config/billing-catalog.ts, which is the single source of truth for
// tier/add-on pricing and eligibility. 'free' and 'enterprise' remain valid
// for the always-free tier and the out-of-Studio Contact Sales flow.
export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  plan: text("plan").notNull().default("free"),
  stripeCustomerId: text("stripeCustomerId"),
  stripeSubscriptionId: text("stripeSubscriptionId"),
  status: text("status").notNull().default("inactive"),
  currentPeriodEnd: text("currentPeriodEnd"),
  lastWebhookEventId: text("lastWebhookEventId"),
  stripeTierSubscriptionItemId: text("stripeTierSubscriptionItemId"),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").notNull().default(false),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
  updatedAt: text("updatedAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
}, (t) => [
  index("idx_subscriptions_userid").on(t.userId),
]);

export const subscriptionAddons = pgTable("subscriptionAddons", {
  id: text("id").primaryKey(),
  subscriptionId: text("subscriptionId").notNull(),
  addonId: text("addonId").notNull(),
  quantity: integer("quantity").notNull().default(1),
  stripeSubscriptionItemId: text("stripeSubscriptionItemId"),
  status: text("status").notNull().default("active"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
  updatedAt: text("updatedAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
}, (t) => [
  index("idx_subscriptionaddons_subscriptionid").on(t.subscriptionId),
]);

export const billingOneTimePurchases = pgTable("billingOneTimePurchases", {
  id: text("id").primaryKey(),
  subscriptionId: text("subscriptionId"),
  userId: text("userId").notNull(),
  kind: text("kind").notNull(),
  addonId: text("addonId"),
  stripeCheckoutSessionId: text("stripeCheckoutSessionId"),
  amountCents: integer("amountCents"),
  status: text("status").notNull().default("pending"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
  updatedAt: text("updatedAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});

export const provisioningLog = pgTable("provisioningLog", {
  id: text("id").primaryKey(),
  subscriptionId: text("subscriptionId").notNull(),
  actionKey: text("actionKey").notNull(),
  payload: text("payload"),
  status: text("status").notNull().default("queued"),
  stripeEventId: text("stripeEventId"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});

export const smartContracts = pgTable("smartContracts", {
  id: text("id").primaryKey(),
  projectId: text("projectId").notNull(),
  name: text("name").notNull(),
  contractType: text("contractType").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  description: text("description"),
  whyItExists: text("whyItExists"),
  ifDisabled: text("ifDisabled"),
  abi: text("abi"),
  bytecode: text("bytecode"),
  dependencies: text("dependencies"),
  stepSources: text("stepSources"),
  source: text("source").default("module"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
  updatedAt: text("updatedAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
}, (t) => [
  index("idx_smartcontracts_projectid").on(t.projectId),
]);

export const snapshots = pgTable("snapshots", {
  id: text("id").primaryKey(),
  projectId: text("projectId").notNull(),
  userId: text("userId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  stateData: text("stateData"),
  status: text("status").notNull().default("ready"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
  updatedAt: text("updatedAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
}, (t) => [
  index("idx_snapshots_projectid").on(t.projectId),
]);

export const apiKeys = pgTable("apiKeys", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  keyHash: text("keyHash").notNull().unique(),
  name: text("name").notNull(),
  lastUsedAt: text("lastUsedAt"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
}, (t) => [
  index("idx_apikeys_userid").on(t.userId),
]);

// Records the last billing-catalog plan the user clicked "Subscribe" on,
// regardless of whether checkout completed. Useful for analytics and
// recovering abandoned checkouts.
export const userPlanSelections = pgTable("userPlanSelections", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  selectedPlan: text("selectedPlan").notNull(),
  selectedAt: text("selectedAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});

// Platform-level audit trail. Written on login, register, project CRUD,
// snapshot CRUD, billing events. Admin panel reads this for operations visibility.
export const auditLogs = pgTable("auditLogs", {
  id: text("id").primaryKey(),
  userId: text("userId"),
  actorEmail: text("actorEmail"),
  actorType: text("actorType").default("user"),
  action: text("action").notNull(),
  resource: text("resource"),
  resourceId: text("resourceId"),
  metadata: text("metadata"),
  ip: text("ip"),
  status: text("status").notNull().default("success"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});
