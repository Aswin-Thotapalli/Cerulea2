// apps/frontend/src/db/schema.ts
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Workspaces
 */
export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("createdAt").default(sql`datetime('now')`).notNull(),
});

/**
 * Projects
 * - Keep JSON columns as TEXT; we store JSON.stringify(...) and parse on read.
 * - $type<unknown>() helps TS know these hold JSON.
 */
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),

  name: text("name").notNull(),
  slug: text("slug"),
  description: text("description"),

  // 'dapp' | 'blockchain'
  projectType: text("projectType").notNull(),

  // FK (logical; enforced at DB init with pragma/trigger)
  workspaceId: text("workspaceId"),

  // Step 0
  selectedTemplateIds: text("selectedTemplateIds").$type<unknown>(),

  // Step 1 (canonical) + legacy graph (kept to avoid crashes if older code writes to it)
  blueprint: text("blueprint").$type<unknown>(),
  graph: text("graph").$type<unknown>(),

  // Step 2 (schema + logic)
  schemaJson: text("schemaJson").$type<unknown>(),
  logicJson: text("logicJson").$type<unknown>(),

  // Step 3 (economics / payments config)
  economics: text("economics").$type<unknown>(),

  // Project lifecycle status (draft|active|archived …)
  status: text("status").default("draft"),

  createdAt: text("createdAt").default(sql`datetime('now')`).notNull(),
  updatedAt: text("updatedAt").default(sql`datetime('now')`).notNull(),
});

/**
 * Users (for auth)
 */
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),

  email: text("email").notNull(), // unique enforced by DB init
  passwordHash: text("passwordHash"), // nullable if you later support OAuth
  name: text("name"),

  createdAt: text("createdAt").default(sql`datetime('now')`).notNull(),
  updatedAt: text("updatedAt").default(sql`datetime('now')`).notNull(),
});

/**
 * Profiles (optional, used by register flow in your routes)
 */
export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(), // FK to users.id (created in DB init)
  displayName: text("displayName"),
  avatarUrl: text("avatarUrl"),
  createdAt: text("createdAt").default(sql`datetime('now')`).notNull(),
});

/**
 * Verification Tokens (forgot/reset password)
 */
export const verificationTokens = sqliteTable("verificationTokens", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(), // usually email
  token: text("token").notNull(),
  expiresAt: text("expiresAt").notNull(), // ISO string
  createdAt: text("createdAt").default(sql`datetime('now')`).notNull(),
});

/**
 * Drafts (project drafts)
 */
export const drafts = sqliteTable("drafts", {
  id: text("id").primaryKey(),
  projectId: text("projectId").notNull(),
  data: text("data").$type<unknown>(), // JSON stored as text
  createdAt: text("createdAt").default(sql`datetime('now')`).notNull(),
  updatedAt: text("updatedAt").default(sql`datetime('now')`).notNull(),
});

/**
 * AI Threads
 */
export const aiThreads = sqliteTable("aiThreads", {
  id: text("id").primaryKey(),

  // optional links; keep flexible
  userId: text("userId"),
  projectId: text("projectId"),
  title: text("title"),

  createdAt: text("createdAt").default(sql`datetime('now')`).notNull(),
  updatedAt: text("updatedAt").default(sql`datetime('now')`).notNull(),
});

/**
 * AI Messages
 */
export const aiMessages = sqliteTable("aiMessages", {
  id: text("id").primaryKey(),
  threadId: text("threadId").notNull(),

  // "user" | "assistant" | "system"
  role: text("role").notNull(),
  content: text("content").notNull(),

  // optional JSON metadata (tokens, model, etc)
  meta: text("meta").$type<unknown>(),

  createdAt: text("createdAt").default(sql`datetime('now')`).notNull(),
});
