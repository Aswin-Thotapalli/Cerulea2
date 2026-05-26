// apps/frontend/src/db/schema.ts
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const now = sql`now()`;

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug"),
  description: text("description"),
  projectType: text("projectType").notNull(),
  workspaceId: text("workspaceId"),
  userId: text("userId"),
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
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  hashedPassword: text("hashedPassword"),
  name: text("name"),
  isTestAccount: text("isTestAccount").default("false"),
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
});

export const drafts = pgTable("drafts", {
  id: text("id").primaryKey(),
  projectId: text("projectId").notNull(),
  data: text("data"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
  updatedAt: text("updatedAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});

export const aiThreads = pgTable("aiThreads", {
  id: text("id").primaryKey(),
  userId: text("userId"),
  projectId: text("projectId"),
  title: text("title"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
  updatedAt: text("updatedAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});

export const aiMessages = pgTable("aiMessages", {
  id: text("id").primaryKey(),
  threadId: text("threadId").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  meta: text("meta"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  plan: text("plan").notNull().default("free"),
  stripeCustomerId: text("stripeCustomerId"),
  stripeSubscriptionId: text("stripeSubscriptionId"),
  status: text("status").notNull().default("inactive"),
  currentPeriodEnd: text("currentPeriodEnd"),
  createdAt: text("createdAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
  updatedAt: text("updatedAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});

export const smartContracts = pgTable("smartContracts", {
  id: text("id").primaryKey(),
  projectId: text("projectId").notNull(),
  name: text("name").notNull(),
  contractType: text("contractType").notNull(),
  enabled: text("enabled").notNull().default("true"),
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
});

export const userPlanSelections = pgTable("userPlanSelections", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  selectedPlan: text("selectedPlan").notNull(),
  selectedAt: text("selectedAt").default(sql`to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`).notNull(),
});
