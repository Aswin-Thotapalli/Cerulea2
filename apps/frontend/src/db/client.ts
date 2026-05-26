// apps/frontend/src/db/client.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Add it to .env.local (Neon connection string) for local dev, ' +
    'and to Vercel Environment Variables for production.'
  );
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });

// Legacy export aliases kept so existing imports don't break
export { schema };
