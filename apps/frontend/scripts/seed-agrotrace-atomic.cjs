/**
 * Seed: AgroTrace — Atomic Build Spec (Turmeric + Mango profiles) → Cerulea Studio
 * Creates a COMPLETE, non-draft project under the owner's account, populating
 * every Studio step: Blueprint (modules + graph), Schema (entities, fields,
 * relationships), Logic (flows), Economics (permissioned AgroChain) and
 * Integrations (step-4 draft).
 *
 *   node scripts/seed-agrotrace-atomic.cjs --dry     # validate + print counts, no writes
 *   node scripts/seed-agrotrace-atomic.cjs           # seed (idempotent by slug)
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const crypto = require('crypto');

const S = require('./agrotrace/_shared.cjs');
const { MODULES, EDGES, BLUEPRINT } = require('./agrotrace/modules.cjs');
const { ENTITIES: CORE, RELS: CORE_RELS } = require('./agrotrace/entities-core.cjs');
const { FORMS, FORM_RELS } = require('./agrotrace/forms.cjs');
const { FLOWS } = require('./agrotrace/flows.cjs');
const { ECONOMICS } = require('./agrotrace/economics.cjs');
const { INTEGRATIONS } = require('./agrotrace/integrations.cjs');

const OWNER_EMAIL   = 'aswin@cbytechains.com';
const PROJECT_SLUG  = 'agrotrace';
const PROJECT_NAME  = 'AgroTrace';
const WORKSPACE     = 'Caerulean Bytechains';
const TEMPLATE_IDS  = ['ent-supply-chain'];
const DESCRIPTION   =
  'Blockchain traceability for Indian agri-exports on AgroChain (internal permissioned ledger, ' +
  'chainId agrotrace-1, 5 validators, 4-of-5 consensus, SHA-256, no crypto/no gas). Multi-tenant, ' +
  'profile-driven: Turmeric (16 stages) and Mango (12 stages, cold chain) on one engine — 21 roles, ' +
  'residue/MRL gating, two-party custody handoff, certificate anchoring, disputes, IoT breach ' +
  'detection, public QR verification, nine Indian languages, PWA. A product of Caerulean Bytechains, built on Cerulea.';

/* ─────────────────────────── Assemble ─────────────────────────── */
const ENTITIES = [...CORE, ...FORMS];
const byName = new Map();
for (const e of ENTITIES) {
  if (byName.has(e.name)) throw new Error(`Duplicate entity name: ${e.name}`);
  byName.set(e.name, e);
}
const RELATIONSHIPS = [...CORE_RELS, ...FORM_RELS].map(([from, to, type], i) => {
  const a = byName.get(from), b = byName.get(to);
  if (!a) throw new Error(`Relationship ${from} -> ${to}: unknown entity "${from}"`);
  if (!b) throw new Error(`Relationship ${from} -> ${to}: unknown entity "${to}"`);
  const t = type || 'relatedTo';
  if (!['relatedTo', 'oneToMany', 'manyToMany', 'oneToOne'].includes(t)) throw new Error(`Bad relationship type ${t}`);
  return { id: `r${String(i + 1).padStart(4, '0')}`, from: a.id, to: b.id, type: t };
});

/* ─────────────────────────── Validate ─────────────────────────── */
const homes = new Set(MODULES.map((m) => m.moduleId));
const problems = [];
for (const m of S.MODULE_HOMES) if (!homes.has(m)) problems.push(`MODULE_HOMES lists "${m}" but modules.cjs does not include it`);
for (const m of MODULES) if (!S.MODULE_HOMES.includes(m.moduleId)) problems.push(`modules.cjs has "${m.moduleId}" which is not in MODULE_HOMES`);
const seenField = new Set();
for (const e of ENTITIES) {
  if (!homes.has(e.moduleId)) problems.push(`Entity "${e.name}" homed on unknown module "${e.moduleId}"`);
  if (!Array.isArray(e.fields) || !e.fields.length) problems.push(`Entity "${e.name}" has no fields`);
  const names = new Set();
  for (const f of e.fields || []) {
    if (!S.TYPES.has(f.type)) problems.push(`${e.name}.${f.name}: bad type ${f.type}`);
    if (!S.STORAGES.has(f.storage)) problems.push(`${e.name}.${f.name}: bad storage ${f.storage}`);
    if (f.type === 'enum' && !(f.options && f.options.length)) problems.push(`${e.name}.${f.name}: enum without options`);
    if (names.has(f.name)) problems.push(`${e.name}: duplicate field ${f.name}`);
    names.add(f.name);
    if (seenField.has(f.id)) problems.push(`duplicate field id ${f.id}`);
    seenField.add(f.id);
  }
}
const nodeIds = new Set(BLUEPRINT.graph.nodes.map((n) => n.id));
for (const ed of BLUEPRINT.graph.edges) {
  if (!nodeIds.has(ed.source)) problems.push(`edge ${ed.id}: unknown source ${ed.source}`);
  if (!nodeIds.has(ed.target)) problems.push(`edge ${ed.id}: unknown target ${ed.target}`);
}
const flowIds = new Set();
for (const f of FLOWS) {
  if (!f.id || !f.name || !f.trigger || !f.description || !Array.isArray(f.steps) || !f.steps.length) problems.push(`flow ${f.id || f.name}: incomplete`);
  if (flowIds.has(f.id)) problems.push(`duplicate flow id ${f.id}`);
  flowIds.add(f.id);
}
if (problems.length) {
  console.error('\n✖ Validation failed:\n  - ' + problems.join('\n  - '));
  process.exit(1);
}

const SCHEMA = { entities: ENTITIES, relationships: RELATIONSHIPS, track: 'blockchain' };
const LOGIC  = { flows: FLOWS, track: 'blockchain' };

const totalFields = ENTITIES.reduce((n, e) => n + e.fields.length, 0);
const summary = () => {
  console.log('\nAgroTrace — build summary');
  console.log(`  Step 1 Blueprint    : ${MODULES.length} modules, ${EDGES.length} edges`);
  console.log(`  Step 2 Schema       : ${ENTITIES.length} entities (${CORE.length} collections + ${FORMS.length} stage forms), ${totalFields} fields, ${RELATIONSHIPS.length} relationships`);
  console.log(`  Step 2 Logic        : ${FLOWS.length} flows`);
  console.log(`  Step 3 Economics    : ${ECONOMICS.chain.name} (${ECONOMICS.chain.chainId}) — ${ECONOMICS.chain.validatorCount} validators, ${ECONOMICS.chain.consensusThreshold}-of-${ECONOMICS.chain.validatorCount}, no token / gasless`);
  console.log(`  Step 4 Integrations : ${Object.keys(INTEGRATIONS.configs).length} configured`);
  console.log(`  Payload sizes       : blueprint ${(JSON.stringify(BLUEPRINT).length/1024).toFixed(0)} KB, schema ${(JSON.stringify(SCHEMA).length/1024).toFixed(0)} KB, logic ${(JSON.stringify(LOGIC).length/1024).toFixed(0)} KB`);
};

/* ─────────────────────────── Main ─────────────────────────── */
async function main() {
  const dry = process.argv.includes('--dry');
  summary();
  if (dry) { console.log('\n--dry: validation passed, nothing written.'); return; }

  const { neon } = require('@neondatabase/serverless');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing in .env.local');
  const sql = neon(process.env.DATABASE_URL);
  const now = new Date().toISOString().split('.')[0] + 'Z';

  const users = await sql`SELECT id, email FROM users WHERE email = ${OWNER_EMAIL}`;
  if (!users.length) throw new Error(`Owner ${OWNER_EMAIL} not found — refusing to create accounts.`);
  const userId = users[0].id;

  let ws = await sql`SELECT id FROM workspaces WHERE name = ${WORKSPACE}`;
  let workspaceId = ws[0]?.id;
  if (!workspaceId) {
    workspaceId = crypto.randomUUID();
    await sql`INSERT INTO workspaces (id, name) VALUES (${workspaceId}, ${WORKSPACE})`;
    console.log(`Workspace created: ${workspaceId}`);
  }

  const existing = await sql`SELECT id FROM projects WHERE slug = ${PROJECT_SLUG} AND "userId" = ${userId}`;
  for (const row of existing) {
    await sql`DELETE FROM drafts WHERE "projectId" = ${row.id}`;
    await sql`DELETE FROM projects WHERE id = ${row.id}`;
    console.log(`Replaced previous project ${row.id}`);
  }

  const projectId = crypto.randomUUID();
  await sql`INSERT INTO projects (
      id, name, slug, description, "projectType", "workspaceId", "userId",
      "selectedTemplateIds", blueprint, "schemaJson", "logicJson", economics,
      "legacyMode", status, "createdAt", "updatedAt"
    ) VALUES (
      ${projectId}, ${PROJECT_NAME}, ${PROJECT_SLUG}, ${DESCRIPTION}, 'blockchain', ${workspaceId}, ${userId},
      ${JSON.stringify(TEMPLATE_IDS)}, ${JSON.stringify(BLUEPRINT)}, ${JSON.stringify(SCHEMA)}, ${JSON.stringify(LOGIC)}, ${JSON.stringify(ECONOMICS)},
      'none', 'active', ${now}, ${now}
    )`;
  await sql`INSERT INTO drafts (id, "projectId", data, "createdAt", "updatedAt")
    VALUES (${projectId + '::step4::integrations'}, ${projectId}, ${JSON.stringify({ step: 4, payload: INTEGRATIONS })}, ${now}, ${now})`;

  const check = await sql`SELECT id, name, status, "projectType", length(blueprint) bl, length("schemaJson") sj, length("logicJson") lj, length(economics) ec FROM projects WHERE id = ${projectId}`;
  console.log('\n✅ Seeded:', JSON.stringify(check[0]));
  console.log(`   Owner: ${OWNER_EMAIL} (${userId}) · status: active · template: ${TEMPLATE_IDS.join(',')}`);
  console.log('   Open Studio → My Projects → "AgroTrace".');
}

main().catch((e) => { console.error('\n✖ Seed failed:', e.message); process.exit(1); });
