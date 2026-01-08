// apps/frontend/src/db/schema.ts
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * Workspaces
 */
export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('createdAt').default(sql`datetime('now')`).notNull(),
});

/**
 * Projects
 * - Keep JSON columns as TEXT; we store JSON.stringify(...) and parse on read.
 * - $type<unknown>() helps TS know these hold JSON.
 */
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),

  name: text('name').notNull(),
  slug: text('slug'),
  description: text('description'),

  // 'dapp' | 'blockchain'
  projectType: text('projectType').notNull(),

  // FK (logical; enforced at DB init with pragma/trigger)
  workspaceId: text('workspaceId'),

  // Step 0
  selectedTemplateIds: text('selectedTemplateIds').$type<unknown>(),

  // Step 1 (canonical) + legacy graph (kept to avoid crashes if older code writes to it)
  blueprint: text('blueprint').$type<unknown>(),
  graph: text('graph').$type<unknown>(),

  // Step 2 (schema + logic)
  schemaJson: text('schemaJson').$type<unknown>(),
  logicJson: text('logicJson').$type<unknown>(),

  // Step 3 (economics / payments config)
  economics: text('economics').$type<unknown>(),

  // Project lifecycle status (draft|active|archived …)
  status: text('status').default('draft'),

  createdAt: text('createdAt').default(sql`datetime('now')`).notNull(),
  updatedAt: text('updatedAt').default(sql`datetime('now')`).notNull(),
});
