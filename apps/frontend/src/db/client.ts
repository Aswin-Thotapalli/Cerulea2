// apps/frontend/src/db/client.ts
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const DB_PATH =
  process.env.DRIZZLE_SQLITE_PATH ||
  path.resolve(process.cwd(), '.data', 'cerulea.sqlite');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('foreign_keys = ON');

// Base tables (correct: IF NOT EXISTS)
sqlite.exec(`
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  projectType TEXT NOT NULL,              -- 'dapp' | 'blockchain'
  workspaceId TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(workspaceId) REFERENCES workspaces(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspaceId);
`);

// Ensure columns exist (handles legacy writers and new features)
function ensureColumn(table: string, colName: string, colTypeWithDefault: string) {
  const info = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  const exists = info.some(c => c.name === colName);
  if (!exists) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${colName} ${colTypeWithDefault}`);
  }
}

// Align columns used by the app (legacy + current)
ensureColumn('projects', 'selectedTemplateIds', 'JSON');            // Step 0
ensureColumn('projects', 'blueprint', 'JSON');                      // Step 1 canonical
ensureColumn('projects', 'graph', 'JSON');                          // legacy writes (avoid crashes)
ensureColumn('projects', 'schemaJson', 'JSON');                     // Step 2 schema
ensureColumn('projects', 'logicJson', 'JSON');                      // Step 2 logic/flows
ensureColumn('projects', 'economics', 'JSON');                      // Step 3 config
ensureColumn('projects', 'status', `TEXT DEFAULT 'draft'`);         // project status

// Backfill status for older rows
sqlite.exec(`UPDATE projects SET status='draft' WHERE status IS NULL`);

// Optional updatedAt trigger
try {
  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_projects_updatedAt
    AFTER UPDATE ON projects
    FOR EACH ROW
    BEGIN
      UPDATE projects SET updatedAt = datetime('now') WHERE id = NEW.id;
    END;
  `);
} catch {
  // ignore if not supported
}

export const db = drizzle(sqlite, { schema });
export { sqlite as rawSqlite, DB_PATH as databasePath };
