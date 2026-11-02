// Data tests over the restored catalogue.
// The counts are the production counts after the seven repeated ids left and the
// Government set merged in. The term check runs over every copy field, so a
// forbidden word in a blurb fails here before the commit hook sees it.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import modulesSeed from './modules.seed.json';
import templatesSeed from './templates.seed.json';
import governmentSeed from './government.seed.json';
import integrationsSeed from './integrations.seed.json';
import blocksSeed from './blocks.seed.json';
import paletteSeed from './logic-palette.seed.json';
import presets from './module-entity-presets.json';
import templatePresets from './template-presets.json';
import { GLOSSARY } from './glossary';
import { ENTITIES_CATALOG } from './entities-catalog';

type Module = {
  moduleId: string;
  title: string;
  projectType: 'dapp' | 'blockchain';
  division?: string;
  blurb: string;
  longDescription: string[];
  dependsOn: string[];
  recommends: string[];
  reasonByDepId: Record<string, string>;
};
type Template = {
  id: string;
  projectType: 'dapp' | 'blockchain';
  division: string;
  title: string;
  description?: string;
  modules?: string[];
  preinstalledModules?: string[];
};

const modules = (modulesSeed as unknown as { modules: Module[] }).modules;
const templates = (templatesSeed as unknown as { templates: Template[] }).templates;
const postures = (governmentSeed as unknown as { postures: { templateId: string }[] }).postures;

// The forbidden list is the one the commit hook reads. The protocol names, the
// settings vocabulary and the retired branding all sit in it.
function forbiddenTerms(): string[] {
  const file = path.resolve(
    __dirname,
    '../../../../guardrails/forbidden-terms.txt',
  );
  return fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .filter((line) => line !== 'substrate' && line !== 'polkadot');
}

function termPattern(): RegExp {
  const escaped = forbiddenTerms().map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(^|[^a-zA-Z0-9_-])(${escaped.join('|')})([^a-zA-Z0-9_-]|$)`, 'i');
}

function copyFields(): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  for (const m of modules) {
    out.push({ where: `${m.moduleId}.title`, text: m.title });
    out.push({ where: `${m.moduleId}.blurb`, text: m.blurb });
    m.longDescription.forEach((p, i) => out.push({ where: `${m.moduleId}.longDescription[${i}]`, text: p }));
    for (const [k, v] of Object.entries(m.reasonByDepId ?? {})) out.push({ where: `${m.moduleId}.reason.${k}`, text: v });
  }
  for (const t of templates) {
    out.push({ where: `${t.id}.title`, text: t.title });
    if (t.description) out.push({ where: `${t.id}.description`, text: t.description });
  }
  for (const [key, entry] of Object.entries(GLOSSARY)) {
    out.push({ where: `glossary.${key}.term`, text: entry.term });
    out.push({ where: `glossary.${key}.definition`, text: entry.definition });
    if (entry.example) out.push({ where: `glossary.${key}.example`, text: entry.example });
  }
  for (const i of (integrationsSeed as { integrations: { id: string; description: string }[] }).integrations) {
    out.push({ where: `integration.${i.id}`, text: i.description });
  }
  for (const p of postures) out.push({ where: `posture.${p.templateId}`, text: JSON.stringify(p) });
  return out;
}

describe('catalogue counts', () => {
  it('holds 275 modules with 275 distinct ids', () => {
    expect(modules).toHaveLength(275);
    expect(new Set(modules.map((m) => m.moduleId)).size).toBe(275);
  });

  it('keeps the seven repeated ids once, under the later definition', () => {
    const later: Record<string, string> = {
      'upi-payments': 'UPI & India Payments',
      'token-vesting': 'Token Vesting & Locks',
      oracles: 'Oracle Feeds',
      'feature-flags': 'Feature Flags',
      'cms-pages': 'CMS: Pages & Content',
      i18n: 'Internationalization (i18n)',
      faucet: 'Testnet Faucet',
    };
    for (const [id, title] of Object.entries(later)) {
      const hits = modules.filter((m) => m.moduleId === id);
      expect(hits, id).toHaveLength(1);
      expect(hits[0].title).toBe(title);
    }
    const dappOracle = modules.find((m) => m.moduleId === 'oracles-dapp');
    expect(dappOracle?.projectType).toBe('dapp');
    expect(modules.find((m) => m.moduleId === 'oracles')?.projectType).toBe('blockchain');
  });

  it('holds 128 templates with distinct ids and every template names its division', () => {
    expect(templates).toHaveLength(128);
    expect(new Set(templates.map((t) => t.id)).size).toBe(128);
    const allowed = new Set(['dapp', 'shared', 'enterprise', 'govt']);
    for (const t of templates) expect(allowed.has(t.division), t.id).toBe(true);
    expect(templates.filter((t) => t.division === 'dapp')).toHaveLength(25);
    expect(templates.filter((t) => t.division === 'shared')).toHaveLength(86);
    expect(templates.filter((t) => t.division === 'enterprise')).toHaveLength(4);
    expect(templates.filter((t) => t.division === 'govt')).toHaveLength(13);
  });

  it('carries the two templates the seed products start from', () => {
    expect(templates.find((t) => t.id === 'ent-supply-chain')?.division).toBe('enterprise');
    expect(templates.find((t) => t.id === 'govt-procurement')?.division).toBe('govt');
  });

  it('holds the Government set once: 10 modules, 13 templates, 13 postures', () => {
    const govModules = modules.filter((m) => m.division === 'govt').map((m) => m.moduleId);
    expect(govModules).toHaveLength(10);
    expect(govModules).toEqual(
      expect.arrayContaining([
        'govt-identity',
        'govt-records-registry',
        'govt-transparency-portal',
        'govt-grievance',
        'govt-esign',
        'govt-legal-audit',
        'govt-interdept',
        'permit-issuance',
        'licence-register',
        'public-ballot-tally',
      ]),
    );
    // The built parts production already covered left under the production name.
    for (const gone of ['inter-department-transfer', 'welfare-delivery', 'public-health-records']) {
      expect(modules.find((m) => m.moduleId === gone), gone).toBeUndefined();
    }
    const govTemplates = templates.filter((t) => t.division === 'govt').map((t) => t.id);
    expect(govTemplates).toHaveLength(13);
    expect(govTemplates.filter((id) => id.startsWith('gov-'))).toHaveLength(0);
    expect(postures.map((p) => p.templateId).sort()).toEqual([...govTemplates].sort());
  });

  it('holds 7 Enterprise modules and 4 Enterprise templates', () => {
    expect(modules.filter((m) => m.division === 'enterprise')).toHaveLength(7);
    expect(templates.filter((t) => t.division === 'enterprise')).toHaveLength(4);
  });

  it('keeps the other catalogue files at the production counts', () => {
    expect((integrationsSeed as { integrations: unknown[] }).integrations).toHaveLength(45);
    expect((blocksSeed as { blocks: unknown[] }).blocks).toHaveLength(52);
    const palette = paletteSeed as { dapp: unknown[]; blockchain: unknown[] };
    expect(palette.dapp).toHaveLength(14);
    expect(palette.blockchain).toHaveLength(10);
    expect(Object.keys((presets as { presets: Record<string, unknown> }).presets)).toHaveLength(126);
    expect(Object.keys((presets as { templatePresets: Record<string, unknown> }).templatePresets)).toHaveLength(100);
    expect(Object.keys((templatePresets as { templates: Record<string, unknown> }).templates)).toHaveLength(100);
    expect(Object.keys(GLOSSARY)).toHaveLength(26);
    expect(ENTITIES_CATALOG).toHaveLength(30);
    expect(ENTITIES_CATALOG.reduce((n, e) => n + e.fields.length, 0)).toBe(204);
  });

  it('resolves every Government reference and every reference the restore touched', () => {
    const ids = new Set(modules.map((m) => m.moduleId));
    for (const m of modules.filter((x) => x.division === 'govt')) {
      for (const r of [...m.dependsOn, ...m.recommends]) expect(ids.has(r), `${m.moduleId} -> ${r}`).toBe(true);
    }
    for (const t of templates.filter((x) => x.division === 'govt')) {
      for (const r of t.modules ?? []) expect(ids.has(r), `${t.id} -> ${r}`).toBe(true);
    }
    for (const m of modules.filter((x) => x.projectType === 'dapp')) {
      expect(m.dependsOn.includes('oracles') || m.recommends.includes('oracles'), m.moduleId).toBe(false);
    }
  });
});

describe('catalogue copy', () => {
  it('passes the term check on every copy field', () => {
    const pattern = termPattern();
    const hits = copyFields().filter((f) => pattern.test(f.text));
    expect(hits.map((h) => h.where)).toEqual([]);
  });

  it('carries no em dash and capitalises Blockchain in prose', () => {
    const fields = copyFields().filter((f) => !f.where.startsWith('posture.'));
    expect(fields.filter((f) => f.text.includes('—')).map((f) => f.where)).toEqual([]);
    expect(fields.filter((f) => /\bblockchain\b/.test(f.text)).map((f) => f.where)).toEqual([]);
  });

  it('addresses no reader as you', () => {
    const fields = copyFields().filter(
      (f) => !/know-your-customer|know your business/i.test(f.text),
    );
    expect(fields.filter((f) => /\byou(r)?\b/i.test(f.text)).map((f) => f.where)).toEqual([]);
  });

  it('carries the September prose corrections', () => {
    expect(modules.find((m) => m.moduleId === 'evm-config')?.title).toBe('EVM Parameters');
    expect(modules.find((m) => m.moduleId === 'tokenomics')?.blurb).toBe('Set supply, issuance, and rewards.');
    expect(templates.find((t) => t.id === 'chain-enterprise-defi-l2')?.description).toContain('the fees the operator sets');
  });
});
