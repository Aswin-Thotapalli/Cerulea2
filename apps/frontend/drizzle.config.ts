// apps/frontend/drizzle.config.ts
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // load DATABASE_URL from .env.local

import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Put it in apps/frontend/.env.local');
}

// Strip channel_binding param — older pg driver used by drizzle-kit doesn't support it
const rawUrl = process.env.DATABASE_URL!;
const dbUrl = rawUrl.replace(/[&?]channel_binding=[^&]*/g, '').replace(/\?&/, '?');

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',               // where migrations will be written
  dialect: 'postgresql',
  dbCredentials: {
    url: dbUrl,
    ssl: 'require',
  } as any,
  verbose: true,
  strict: true,
});
