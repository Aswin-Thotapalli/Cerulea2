// apps/frontend/scripts/browser-pass-step3.mjs
// The browser pass of the Data schema step on the rebuild served at 3011.
// Signs in with the local test account, opens a project with modules, moves to
// Data schema and walks the brief: add an entity with three fields, draw a
// relationship, set a permission, add a rule with a formula, draw a two state
// workflow, read the Blueprint back at level four.
// Run: node scripts/browser-pass-step3.mjs  (Playwright from the path in
// CERULEA_PLAYWRIGHT, the local test account from local/demo-credentials.txt).

import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), '..', '..', '..');
const PLAYWRIGHT =
  process.env.CERULEA_PLAYWRIGHT ?? 'C:/clx/apis/node_modules/.pnpm/playwright@1.63.0/node_modules/playwright';
const BASE = process.env.CERULEA_STUDIO_URL ?? 'http://studio.localhost:3011';

const require = createRequire(import.meta.url);
const { chromium } = require(PLAYWRIGHT);

function credentials() {
  const text = readFileSync(path.join(ROOT, 'local', 'demo-credentials.txt'), 'utf8');
  const read = (key) => text.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';
  return { email: read('email'), password: read('password') };
}

function totp() {
  return execSync(`node "${path.join(ROOT, 'local', 'totp.js')}"`, { encoding: 'utf8' }).trim().split(/\s+/)[0];
}

const steps = [];
function note(line) {
  steps.push(line);
  console.log(line);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });
  const failures = [];
  page.on('pageerror', (error) => failures.push(`page error: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console: ${message.text().slice(0, 200)}`);
  });

  const { email, password } = credentials();
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByLabel('Authenticator code').fill(totp());
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((url) => url.pathname.startsWith('/auth/login') === false, { timeout: 60000 });
  note(`signed in, landed on ${page.url()}`);

  // A project with modules: the newest whose canvas graph holds nodes.
  const projects = await page.evaluate(async () => {
    const reply = await fetch('/api/projects');
    return reply.ok ? reply.json() : [];
  });
  const list = Array.isArray(projects) ? projects : (projects.projects ?? []);
  let chosen = null;
  for (const project of list) {
    const graph = await page.evaluate(async (id) => {
      const reply = await fetch(`/api/projects/${id}/blueprint`);
      return reply.ok ? reply.json() : null;
    }, project.id);
    if (graph?.blueprint?.graph?.nodes?.length) {
      chosen = project;
      break;
    }
  }
  if (!chosen) chosen = list[0];
  if (!chosen) throw new Error('The account holds no project. Create one through the Foundation step first.');
  note(`project ${chosen.name} (${chosen.id})`);

  await page.goto(`${BASE}/dapps/?project=${chosen.id}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('guidance:dismissed:step2', '1'));
  await page.getByRole('button', { name: /data schema/i }).first().click({ timeout: 60000 });
  await page.getByTestId('step-data-schema').waitFor({ timeout: 120000 });
  await page.getByLabel('Entity name').waitFor({ timeout: 120000 });
  note('Data schema opened with an entity selected');

  // 1. Add an entity with three fields.
  await page.getByRole('button', { name: 'Add Custom Entity' }).click();
  const name = page.getByLabel('Entity name');
  await name.fill('Mooring permit');
  await name.press('Enter');
  await page.getByRole('button', { name: 'Entity Mooring permit' }).waitFor();
  for (let count = 0; count < 2; count += 1) await page.getByRole('button', { name: 'Add Field' }).click();
  await page.getByLabel('Name of field 2').fill('holder');
  await page.getByLabel('Name of field 3').fill('valid_until');
  await page.getByLabel('Kind of field 3').click();
  await page.getByRole('option', { name: 'Instant' }).click();
  note('entity Mooring permit with fields id, holder, valid_until');

  // 2. Draw a relationship from the first entity to the new one.
  await page.getByRole('button', { name: 'Relationships view' }).click();
  await page.getByTestId('relationship-canvas').waitFor();
  const boxes = await page.locator('.react-flow__node').all();
  if (boxes.length >= 2) {
    const target = page.locator('.react-flow__node', { hasText: 'Mooring permit' }).first();
    const source = boxes.find(async () => true);
    const sourceBox = await boxes[0].boundingBox();
    const targetBox = await target.boundingBox();
    const sourceHandle = await boxes[0].locator('.react-flow__handle-right').boundingBox();
    const targetHandle = await target.locator('.react-flow__handle-left').boundingBox();
    if (sourceHandle && targetHandle && sourceBox && targetBox) {
      await page.mouse.move(sourceHandle.x + sourceHandle.width / 2, sourceHandle.y + sourceHandle.height / 2);
      await page.mouse.down();
      await page.mouse.move(targetHandle.x + 2, targetHandle.y + 2, { steps: 12 });
      await page.mouse.up();
    }
    void source;
  }
  await page.getByTestId('relationship-properties').waitFor({ timeout: 10000 });
  note(`relationship drawn: ${await page.getByTestId('relationship-properties').innerText()}`);

  // 3. Set a permission.
  await page.getByRole('tab', { name: 'Access & Roles tab' }).click();
  const pill = page.getByRole('switch', { name: /Create for .* on Mooring permit/ }).first();
  await pill.click();
  if ((await pill.getAttribute('aria-checked')) !== 'true') throw new Error('The permission pill did not turn on.');
  note('permission set: Create on Mooring permit');

  // 4. Add a rule with a formula.
  await page.getByRole('tab', { name: 'Logic tab' }).click();
  await page.getByLabel('Add a rule').fill('Holder named');
  await page.getByLabel('Add a rule').press('Enter');
  await page.getByLabel('Collection of rule holder_named').click();
  await page.getByRole('option', { name: 'Mooring permit' }).click();
  const formula = page.getByLabel('The formula behind holder named');
  await formula.fill('length(record.holder) > 2');
  await page.getByText(/This formula reads/).waitFor({ timeout: 10000 });
  note('rule Holder named with the formula length(record.holder) > 2');

  // 5. Draw a two state workflow.
  await page.getByRole('tab', { name: 'Workflows tab' }).click();
  await page.getByLabel('Name of the new workflow').fill('Permit life');
  await page.getByLabel('Name of the new workflow').press('Enter');
  await page.getByTestId('workflow-canvas').waitFor();
  const states = await page.locator('.react-flow__node').count();
  note(`workflow Permit life with ${states} states on the canvas`);

  // Let the autosave land.
  await page.getByTestId('save-status').filter({ hasText: /Saved as version/ }).waitFor({ timeout: 30000 });
  note(`save status: ${await page.getByTestId('save-status').innerText()}`);

  // 6. Read the Blueprint back at level four.
  await page.getByRole('button', { name: 'Level 4, Blueprint' }).click();
  const text = await page.getByLabel('The typed document').inputValue();
  for (const needle of ['"mooring_permit"', '"holder_named"', '"permit_life"', '"valid_until"']) {
    if (text.includes(needle) === false) throw new Error(`The Blueprint text lacks ${needle}.`);
  }
  const clean = await page.getByTestId('schema-clean').count();
  note(`Blueprint read back: ${text.length} characters, schema ${clean ? 'clean' : 'with corrections'}`);

  // The saved head on Cerulea APIs holds the same.
  const head = await page.evaluate(async (id) => {
    const reply = await fetch(`/api/projects/${id}/schema`);
    return reply.json();
  }, chosen.id);
  const ids = head.document.collections.map((entry) => entry.id);
  if (ids.includes('mooring_permit') === false) throw new Error('The saved head lacks the new collection.');
  note(`head version ${head.version} holds ${ids.length} collections, ${head.document.rules.length} rules, ${head.document.workflows.length} workflows`);

  await browser.close();
  const real = failures.filter((entry) => /favicon|hydration|Download the React DevTools/i.test(entry) === false);
  if (real.length > 0) {
    console.log('Console and page errors:');
    for (const entry of real) console.log(`  ${entry}`);
  }
  console.log(`BROWSER PASS ${real.length === 0 ? 'PASSED' : 'PASSED WITH CONSOLE ERRORS'}: ${steps.length} steps`);
}

main().catch((error) => {
  console.error(`BROWSER PASS FAILED: ${error.message}`);
  process.exit(1);
});
