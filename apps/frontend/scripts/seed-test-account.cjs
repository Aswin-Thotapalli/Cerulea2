/**
 * Seed script: creates the test account (test@cerulea.app / test1234)
 * Run with: npm run seed:test-account
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const { Client } = require('pg');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function seed() {
  // Strip channel_binding — older pg driver doesn't support it
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) throw new Error('DATABASE_URL not set in .env.local');
  const dbUrl = rawUrl.replace(/[&?]channel_binding=[^&]*/g, '').replace(/\?&/, '?');

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const email = 'test@cerulea.app';
  const password = 'test1234';
  const name = 'Test Account';

  const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    console.log('Test account already exists:', email);
    await client.end();
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  const subId = crypto.randomUUID();
  const now = new Date().toISOString().replace('T', 'T').split('.')[0] + 'Z';

  await client.query(
    `INSERT INTO users (id, email, "hashedPassword", name, "isTestAccount", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, 'true', $5, $5)`,
    [userId, email, hashedPassword, name, now]
  );

  await client.query(
    `INSERT INTO profiles (id, "userId", "displayName", "createdAt")
     VALUES ($1, $2, $3, $4)`,
    [profileId, userId, name, now]
  );

  // Give the test account a 'pro' subscription so it bypasses pricing
  await client.query(
    `INSERT INTO subscriptions (id, "userId", plan, status, "createdAt", "updatedAt")
     VALUES ($1, $2, 'pro', 'active', $3, $3)`,
    [subId, userId, now]
  );

  console.log('\u2705 Test account created:');
  console.log('   Email   :', email);
  console.log('   Password: test1234');
  console.log('   User ID :', userId);
  console.log('   Plan    : pro (active) - bypasses pricing gate');

  await client.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
