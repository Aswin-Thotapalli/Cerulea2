import { describe, expect, it } from 'vitest';

import {
  SECTION_SCREEN,
  asGuidance,
  classAbove,
  entriesFromReport,
  entriesFromSchema,
  fixFor,
  guidanceFor,
  guidanceHeadline,
  hasFix,
  type GuidanceEntry,
} from './guidance';
import { readBlueprintDocument } from './document';
import { putAction, putCollection, putRole, setCapabilities } from './edit';
import { applyComposition, composeSections } from './compose';
import { validateBlueprint } from './validate';
import { planFromTemplate } from '@/lib/studio/template-build';
import { SEED_MODULES, SEED_TEMPLATES } from '@/lib/catalogue/seed';
import type { Blueprint } from './types';
import type { CompilerReport } from '@/lib/cerulea-api';

function starting(): Blueprint {
  const plan = planFromTemplate(
    SEED_TEMPLATES.find((entry) => entry.projectType === 'dapp')!.id,
    SEED_TEMPLATES,
    SEED_MODULES,
  );
  const composed = composeSections(plan.moduleIds.slice(0, 4), { retentionDays: 900 });
  const base = applyComposition(readBlueprintDocument({}, 'Berth register'), composed, []);
  return putRole(base, { id: 'clerk', name: 'Clerk', credentials: [] });
}

function compilerEntry(over: Partial<GuidanceEntry> = {}): GuidanceEntry {
  return {
    code: 'validate.role_absent',
    severity: 'error',
    message: 'The permission entry p1 names the role harbour_master, which is absent.',
    fix: 'Add a role named harbour_master, or point the permission entry at one of the roles present: clerk.',
    section: 'permissions',
    path: 'permissions[0].role',
    screen: 'Model, permissions',
    source: 'compiler',
    ...over,
  };
}

const report: CompilerReport = {
  blueprintHash: 'abc',
  ok: false,
  reachedStage: 'validate',
  errorCount: 1,
  warningCount: 0,
  headline: 'The Blueprint holds one correction.',
  sections: [
    {
      section: 'permissions',
      heading: 'Permissions',
      errors: 1,
      warnings: 0,
      entries: [
        {
          code: 'validate.role_absent',
          severity: 'error',
          message: 'The permission entry p1 names the role harbour_master, which is absent.',
          fix: 'Add a role named harbour_master, or point the entry at one of the roles present.',
          section: 'permissions',
          path: 'permissions[0].role',
          screen: 'Model, permissions',
        },
      ],
    },
  ],
};

describe('reading the checks as guidance', () => {
  it('reads every entry out of the compiler report', () => {
    const entries = entriesFromReport(report);
    expect(entries).toHaveLength(1);
    expect(entries[0].source).toBe('compiler');
    expect(entries[0].screen).toBe('Model, permissions');
  });

  it('answers with nothing while no report is held', () => {
    expect(entriesFromReport(null)).toEqual([]);
  });

  it('reads the schema check in the same shape', () => {
    const broken = { ...starting(), name: '' };
    const entries = entriesFromSchema(broken);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.source).toBe('schema');
      expect(entry.fix.length).toBeGreaterThan(0);
      expect(entry.screen.length).toBeGreaterThan(0);
    }
  });

  it('names the screen for every Blueprint section', () => {
    for (const screen of Object.values(SECTION_SCREEN)) {
      expect(screen.length).toBeGreaterThan(0);
    }
  });

  it('reports one correction per place, and the compiler entry wins', () => {
    const held = setCapabilities(starting(), {
      roleId: 'harbour_master',
      collectionId: starting().collections[0].id,
      capabilities: ['Read'],
    });
    const merged = guidanceFor(held, report);
    const keys = merged.map((entry) => `${entry.section}:${entry.path}`);
    expect(new Set(keys).size).toBe(keys.length);
    const atPlace = merged.filter((entry) => entry.path === 'permissions[0].role');
    expect(atPlace).toHaveLength(1);
    expect(atPlace[0].source).toBe('compiler');
  });

  it('states what remains and how much Cerulea corrects on its own', () => {
    const held = starting();
    expect(guidanceHeadline([], held)).toContain('Nothing blocks deployment');
    const headline = guidanceHeadline(entriesFromReport(report), held);
    expect(headline).toContain('1 corrections remain');
    expect(headline).toContain('Cerulea carries out 1');
  });

  it('reads one compiler entry on its own', () => {
    expect(asGuidance(report.sections[0].entries[0]).source).toBe('compiler');
  });
});

describe('a dangling reference', () => {
  it('adds the collection the reference names', () => {
    const held = starting();
    const entry = compilerEntry({
      code: 'validate.collection_absent',
      message: 'The permission entry p1 names the collection berth_inspection, which is absent.',
      path: 'permissions[0].collection',
    });
    const fix = fixFor(entry, held);
    expect(fix?.label).toBe('Add the collection Berth inspection');
    const next = fix!.apply(held);
    expect(next.collections.some((collection) => collection.id === 'berth_inspection')).toBe(true);
    expect(validateBlueprint(next)).toEqual([]);
  });

  it('adds the record type the collection names', () => {
    const held = starting();
    const broken: Blueprint = {
      ...held,
      collections: [{ ...held.collections[0], record_type: 'berth_record' }, ...held.collections.slice(1)],
    };
    const entry = compilerEntry({
      code: 'validate.record_type_absent',
      message: 'The collection booking names the record type berth_record, which is absent.',
      path: 'collections[0].record_type',
      section: 'collections',
    });
    const fix = fixFor(entry, broken);
    expect(fix).toBeDefined();
    const next = fix!.apply(broken);
    expect(next.types.some((type) => type.id === 'berth_record')).toBe(true);
    expect(validateBlueprint(next)).toEqual([]);
  });

  it('leaves the correction to a person where no name is readable', () => {
    const entry = compilerEntry({ message: 'Something went wrong somewhere.' });
    expect(fixFor(entry, starting())).toBeUndefined();
    expect(hasFix(entry, starting())).toBe(false);
  });
});

describe('a missing purpose', () => {
  it('states the purpose and names the lawful basis', () => {
    const held = starting();
    const broken: Blueprint = {
      ...held,
      collections: [
        { ...held.collections[0], purpose: { statement: '', lawful_basis: 'Contract' } },
        ...held.collections.slice(1),
      ],
    };
    const entry = entriesFromSchema(broken).find(
      (candidate) => candidate.code === 'schema.purpose_absent',
    );
    expect(entry).toBeDefined();
    const fix = fixFor(entry!, broken);
    expect(fix?.label).toBe('State the purpose');
    const next = fix!.apply(broken);
    expect(next.collections[0].purpose.statement.length).toBeGreaterThan(10);
    expect(next.collections[0].purpose.lawful_basis).toBe('Contract');
    expect(validateBlueprint(next)).toEqual([]);
  });
});

describe('a missing class', () => {
  it('names the action routine', () => {
    const held = putAction(starting(), {
      id: 'record_booking',
      name: 'Record booking',
      params: [],
      preconditions: [],
      effects: [],
      emits: [],
      roles: ['clerk'],
      description: 'Records one booking.',
    });
    const entry = entriesFromSchema(held).find(
      (candidate) => candidate.code === 'schema.action_class_absent',
    );
    expect(entry).toBeDefined();
    expect(entry!.fix).toContain('Routine');
    const next = fixFor(entry!, held)!.apply(held);
    expect(next.actions[0].class).toBe('Routine');
    expect(validateBlueprint(next)).toEqual([]);
  });

  it('raises the class where the effects call for more', () => {
    const held = putAction(starting(), {
      id: 'move_funds',
      name: 'Move funds',
      params: [],
      preconditions: [],
      effects: [],
      emits: [],
      class: 'Routine',
      roles: ['clerk'],
      description: 'Moves value between accounts.',
    });
    const entry = compilerEntry({
      code: 'classes.declared_below_effects',
      message: 'The action move_funds declares Routine and its effects call for Financial.',
      path: 'actions[0].class',
      section: 'actions',
      elementId: 'move_funds',
    });
    const next = fixFor(entry, held)!.apply(held);
    expect(next.actions[0].class).toBe('Financial');
  });

  it('names the class one step above the class held', () => {
    expect(classAbove(undefined)).toBe('Financial');
    expect(classAbove('Routine')).toBe('Financial');
    expect(classAbove('Financial')).toBe('Structural');
    expect(classAbove('Structural')).toBe('Constitutional');
  });
});

describe('a missing role', () => {
  it('adds the role the permission names', () => {
    const held = setCapabilities(starting(), {
      roleId: 'harbour_master',
      collectionId: starting().collections[0].id,
      capabilities: ['Read'],
    });
    const entry = entriesFromSchema(held).find(
      (candidate) => candidate.code === 'schema.role_absent',
    );
    expect(entry).toBeDefined();
    const fix = fixFor(entry!, held);
    expect(fix?.label).toBe('Add the role Harbour master');
    const next = fix!.apply(held);
    expect(next.identities.roles.some((role) => role.id === 'harbour_master')).toBe(true);
    expect(validateBlueprint(next)).toEqual([]);
  });

  it('adds the role an action names', () => {
    const held = putAction(starting(), {
      id: 'record_booking',
      name: 'Record booking',
      params: [],
      preconditions: [],
      effects: [],
      emits: [],
      class: 'Routine',
      roles: ['harbour_master'],
      description: 'Records one booking.',
    });
    const entry = entriesFromSchema(held).find(
      (candidate) => candidate.code === 'schema.action_role_absent',
    );
    expect(entry).toBeDefined();
    const next = fixFor(entry!, held)!.apply(held);
    expect(next.identities.roles.some((role) => role.id === 'harbour_master')).toBe(true);
    expect(validateBlueprint(next)).toEqual([]);
  });
});

describe('the other corrections Cerulea carries out', () => {
  it('sets a retention period', () => {
    const held = starting();
    const broken: Blueprint = {
      ...held,
      collections: [
        { ...held.collections[0], retention: { period_days: 0, on_expiry: 'Archive' } },
        ...held.collections.slice(1),
      ],
    };
    const entry = entriesFromSchema(broken).find(
      (candidate) => candidate.code === 'schema.retention_period',
    );
    const next = fixFor(entry!, broken)!.apply(broken);
    expect(next.collections[0].retention.period_days).toBe(3650);
  });

  it('raises a threshold below the class it serves', () => {
    const held = starting();
    const broken: Blueprint = {
      ...held,
      governance: { ...held.governance, quorum: { ...held.governance.quorum, financial: 0 } },
    };
    const entry = entriesFromSchema(broken).find(
      (candidate) => candidate.code === 'schema.quorum_share',
    );
    const next = fixFor(entry!, broken)!.apply(broken);
    expect(next.governance.quorum.financial).toBe(67);
  });

  it('publishes a screen where the Blueprint names none', () => {
    const held = starting();
    const entry = compilerEntry({
      code: 'manifest.no_interface',
      severity: 'warning',
      message: 'The Blueprint names no view, so the deployment publishes no screen.',
      section: 'views',
      path: 'views',
      screen: 'Interface',
    });
    const next = fixFor(entry, held)!.apply(held);
    expect(next.views.length).toBe(1);
    expect(next.views[0].collection).toBe(held.collections[0].id);
    expect(validateBlueprint(next)).toEqual([]);
  });

  it('writes the sentence a rule declines a change with', () => {
    const held = starting();
    const broken: Blueprint = {
      ...held,
      rules: [
        {
          id: 'amount_positive',
          kind: 'Invariant',
          statement: '',
          expression: { kind: 'Literal', value: { kind: 'Boolean', value: true } },
          collections: [],
        },
      ],
    };
    const entry = entriesFromSchema(broken).find(
      (candidate) => candidate.code === 'schema.rule_statement_absent',
    );
    const next = fixFor(entry!, broken)!.apply(broken);
    expect(next.rules[0].statement).toContain('Amount positive');
    expect(validateBlueprint(next)).toEqual([]);
  });

  it('adds a workflow state a move names', () => {
    const held = {
      ...starting(),
      workflows: [
        {
          id: 'booking_flow',
          name: 'Booking flow',
          collection: starting().collections[0].id,
          state_field: 'id',
          initial_state: 'opened',
          states: [{ id: 'opened', name: 'Opened', terminal: false }],
          transitions: [
            { id: 'close', from_state: 'opened', to_state: 'closed' },
          ],
          timers: [],
        },
      ],
    } as Blueprint;
    const entry = entriesFromSchema(held).find(
      (candidate) => candidate.code === 'schema.workflow_state_absent',
    );
    expect(entry).toBeDefined();
    const next = fixFor(entry!, held)!.apply(held);
    expect(next.workflows[0].states.some((state) => state.id === 'closed')).toBe(true);
    expect(validateBlueprint(next)).toEqual([]);
  });

  it('adds a collection a view reads', () => {
    const held = starting();
    const broken: Blueprint = {
      ...held,
      views: [
        {
          id: 'berth_list',
          name: 'Every berth',
          collection: 'berth',
          projection: [],
          sort: [],
          aggregates: [],
          joins: [],
          roles: [],
        },
      ],
    };
    const entry = entriesFromSchema(broken).find(
      (candidate) => candidate.code === 'schema.view_collection_absent',
    );
    const next = fixFor(entry!, broken)!.apply(broken);
    expect(next.collections.some((collection) => collection.id === 'berth')).toBe(true);
  });

  it('leaves a correction Cerulea holds no action for to a person', () => {
    const entry = compilerEntry({
      code: 'validate.type_cycle',
      message: 'The type booking_record reaches itself through its fields.',
    });
    expect(fixFor(entry, starting())).toBeUndefined();
  });
});

describe('every fix leaves the Blueprint readable', () => {
  it('produces a document the schema still passes', () => {
    const held = putCollection(starting(), {
      id: 'berth',
      record_type: 'absent_record',
      primary_key: 'id',
      indexes: [],
      privacy: 'Open',
      retention: { period_days: 900, on_expiry: 'Archive' },
      purpose: { statement: 'We keep every berth.', lawful_basis: 'Contract' },
      description: 'Every berth.',
    });
    let working = held;
    for (let pass = 0; pass < 6; pass += 1) {
      const entries = entriesFromSchema(working);
      if (entries.length === 0) break;
      const next = entries.map((entry) => fixFor(entry, working)).find((fix) => fix !== undefined);
      if (next === undefined) break;
      working = next.apply(working);
    }
    expect(validateBlueprint(working)).toEqual([]);
  });
});
