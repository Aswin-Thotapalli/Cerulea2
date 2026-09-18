// apps/frontend/src/db/client.ts
// Cerulea Studio reads and writes project records in PostgreSQL.
// Two drivers sit behind one interface.
// The live driver speaks to the hosted PostgreSQL service over HTTP.
// The local driver speaks to a PostgreSQL server on this machine.
// Studio serves no saved project while both drivers stay unreachable.
import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleOverHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleOverPool } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

/** The PostgreSQL server Cerulea uses when the machine holds no hosted credential. */
export const LOCAL_DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/cerulea';

export type DatabaseDriverChoice = {
  driver: 'live' | 'local';
  url: string;
};

/**
 * Picks the database driver from the environment values.
 * CERULEA_MODE=live demands DATABASE_URL and names the value when it is absent.
 * Every other case runs the local driver against a PostgreSQL server on this machine.
 */
export function resolveDatabaseDriver(env: Record<string, string | undefined>): DatabaseDriverChoice {
  const hostedUrl = env.DATABASE_URL?.trim();
  const mode = env.CERULEA_MODE?.trim().toLowerCase();

  if (mode === 'live') {
    if (!hostedUrl) {
      throw new Error(
        'Cerulea runs in live mode and DATABASE_URL carries no value. ' +
        'Add DATABASE_URL to .env.local with the hosted PostgreSQL connection string, ' +
        'or set CERULEA_MODE=local to use the PostgreSQL server on this machine.',
      );
    }
    return { driver: 'live', url: hostedUrl };
  }

  if (hostedUrl) {
    return { driver: 'live', url: hostedUrl };
  }

  return { driver: 'local', url: env.CERULEA_DATABASE_URL?.trim() || LOCAL_DATABASE_URL };
}

function createDatabase() {
  const choice = resolveDatabaseDriver(process.env);
  if (choice.driver === 'live') {
    return drizzleOverHttp(neon(choice.url), { schema });
  }
  return drizzleOverPool(new Pool({ connectionString: choice.url }), { schema });
}

let instance: ReturnType<typeof createDatabase> | null = null;

/** Builds the driver on first use, so a build without a database still completes. */
function database(): ReturnType<typeof createDatabase> {
  if (!instance) instance = createDatabase();
  return instance;
}

export const db = new Proxy({} as ReturnType<typeof createDatabase>, {
  get(_target, property, receiver) {
    return Reflect.get(database() as object, property, receiver);
  },
  has(_target, property) {
    return Reflect.has(database() as object, property);
  },
});

// Legacy export aliases kept so existing imports keep resolving
export { schema };
