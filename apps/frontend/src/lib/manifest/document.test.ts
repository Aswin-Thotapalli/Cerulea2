import { describe, expect, it } from 'vitest';

import {
  BODY_HALF_POINTS,
  BRAND,
  jsonExport,
  planFollowsRules,
  planFor,
  safeFileName,
} from './document';
import { buildWordDocument, packWordDocument } from './word';
import { EXAMPLE_MANIFEST } from './example';
import { GROUP_WORDING, MANIFEST_GROUPS, linesOfGroup } from './groups';
import { SEED_MODULES } from '@/lib/catalogue/seed';
import { screenReachable } from '@/lib/studio/screens';

const STATEMENT =
  'We run a marketplace where a buyer verifies that a listing is authentic before paying the seller.';

function plan() {
  return planFor({
    manifest: EXAMPLE_MANIFEST,
    version: 4,
    statement: STATEMENT,
    modules: SEED_MODULES,
  });
}

describe('the house format', () => {
  it('names the three brand colours and no other', () => {
    expect(BRAND.blue).toBe('004AAD');
    expect(BRAND.gold).toBe('EEC000');
    expect(BRAND.green).toBe('30B700');
  });

  it('holds one body size', () => {
    expect(BODY_HALF_POINTS).toBe(22);
  });

  it('carries no full stop in a heading', () => {
    for (const block of plan().blocks) {
      if (block.kind === 'title' || block.kind === 'heading') {
        expect(block.text.endsWith('.'), block.text).toBe(false);
      }
    }
  });

  it('numbers the first level and bolds the lead term', () => {
    const numbered = plan().blocks.filter((block) => block.kind === 'numbered');
    expect(numbered).toHaveLength(MANIFEST_GROUPS.length);
    numbered.forEach((block, position) => {
      if (block.kind !== 'numbered') return;
      expect(block.index).toBe(position + 1);
      expect(block.lead).toBe(GROUP_WORDING[MANIFEST_GROUPS[position]].heading);
      expect(block.lead.length).toBeGreaterThan(0);
    });
  });

  it('carries no em dash anywhere', () => {
    expect(planFollowsRules(plan())).toEqual([]);
  });

  it('names a fault on a plan that breaks a rule', () => {
    const faults = planFollowsRules({
      fileName: 'held',
      title: 'Held',
      blocks: [
        { kind: 'heading', text: 'A heading with a stop.', level: 1 },
        { kind: 'numbered', index: 1, lead: '', rest: 'No lead term' },
        { kind: 'paragraph', runs: [{ text: 'A sentence with an em dash — here.' }] },
      ],
    });
    expect(faults).toHaveLength(3);
  });

  it('carries the compliance wording verbatim', () => {
    const held = plan().blocks.some(
      (block) =>
        block.kind === 'paragraph' &&
        block.runs.some((run) => run.text === 'Controls implemented, certification not held.'),
    );
    expect(held).toBe(true);
  });
});

describe('the document plan', () => {
  it('names every one of the twelve groups, in order', () => {
    const numbered = plan()
      .blocks.filter((block) => block.kind === 'numbered')
      .map((block) => (block.kind === 'numbered' ? block.lead : ''));
    expect(numbered).toEqual(MANIFEST_GROUPS.map((group) => GROUP_WORDING[group].heading));
  });

  it('carries every line of every group in a table', () => {
    const tables = plan().blocks.filter((block) => block.kind === 'table');
    const held = tables.flatMap((block) => (block.kind === 'table' ? block.rows : []));
    for (const group of MANIFEST_GROUPS) {
      for (const line of linesOfGroup(EXAMPLE_MANIFEST, group)) {
        expect(
          held.some((row) => row[0] === line.subject),
          `${group} ${line.subject}`,
        ).toBe(true);
      }
    }
  });

  it('names the screen every group is edited on', () => {
    const text = plan()
      .blocks.filter((block) => block.kind === 'paragraph')
      .flatMap((block) => (block.kind === 'paragraph' ? block.runs.map((run) => run.text) : []))
      .join(' ');
    for (const group of MANIFEST_GROUPS) {
      const screen = GROUP_WORDING[group].screen;
      expect(screenReachable(screen), group).toBe(true);
      expect(text).toContain(screen);
    }
  });

  it('sets the manifest against the goal that was stated', () => {
    const text = plan()
      .blocks.filter((block) => block.kind === 'bullet')
      .map((block) => (block.kind === 'bullet' ? block.text : ''))
      .join(' ');
    expect(text).toContain('Verification anyone can carry out');
  });

  it('leaves the goal section out where no goal was stated', () => {
    const held = planFor({ manifest: EXAMPLE_MANIFEST, version: 4 });
    expect(
      held.blocks.some(
        (block) => block.kind === 'heading' && block.text.includes('goal stated'),
      ),
    ).toBe(false);
  });

  it('names a file a browser saves without complaint', () => {
    expect(safeFileName('Berth register')).toBe('berth-register');
    expect(safeFileName('  /\\?  ')).toBe('deployment-manifest');
    expect(plan().fileName).toBe('berth-register-manifest-version-4');
  });
});

describe('the Word file', () => {
  it('builds a document holding the title of the plan', () => {
    const held = buildWordDocument(plan());
    expect(held).toBeDefined();
  });

  it('packs bytes a reader saves', async () => {
    const held = await packWordDocument(plan());
    expect(held.size).toBeGreaterThan(1000);
  });
});

describe('the data file', () => {
  it('carries every group with its lines', () => {
    const held = jsonExport({
      manifest: EXAMPLE_MANIFEST,
      version: 4,
      statement: STATEMENT,
      modules: SEED_MODULES,
    }) as Record<string, unknown>;
    const groups = held.groups as Record<string, { lines: unknown[] }>;
    for (const group of MANIFEST_GROUPS) {
      expect(groups[group], group).toBeDefined();
      expect(groups[group].lines.length, group).toBe(
        linesOfGroup(EXAMPLE_MANIFEST, group).length,
      );
    }
  });

  it('carries the compliance wording and the addresses', () => {
    const held = jsonExport({ manifest: EXAMPLE_MANIFEST, version: 4 });
    expect(held.compliance).toBe('Controls implemented, certification not held.');
    expect(held.blueprintHash).toBe(EXAMPLE_MANIFEST.blueprintHash);
    expect(held.manifestHash).toBe(EXAMPLE_MANIFEST.manifestHash);
  });

  it('carries the reconciliation where a goal was stated', () => {
    const held = jsonExport({
      manifest: EXAMPLE_MANIFEST,
      version: 4,
      statement: STATEMENT,
    });
    expect(held.intent).not.toBeNull();
    expect(jsonExport({ manifest: EXAMPLE_MANIFEST, version: 4 }).intent).toBeNull();
  });
});
