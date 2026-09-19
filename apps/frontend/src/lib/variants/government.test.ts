import { describe, expect, it } from 'vitest';

import {
  GOVERNMENT_MODULES,
  GOVERNMENT_POSTURES,
  GOVERNMENT_TEMPLATES,
  STANDARD_POSTURE,
  authoredForGovernment,
  modulesForApplication,
  organisationCountFor,
  postureFor,
  postureLines,
  retentionDaysFor,
  templatesForApplication,
  thresholdFor,
} from './government';
import { partsFor, templatesForVariant } from './application';
import { SEED_MODULES, SEED_TEMPLATES } from '@/lib/catalogue/seed';
import { describeTemplates } from '@/lib/templates/gallery';
import { deriveOutcomes } from '@/lib/outcomes/catalogue';
import { indexModules, resolveDependencyClosure } from '@/lib/modules/resolve';

describe('the Government content package', () => {
  it('ships every Government module the package authored', () => {
    expect(GOVERNMENT_MODULES.length).toBeGreaterThan(0);
    for (const part of GOVERNMENT_MODULES) {
      expect(part.moduleId.length).toBeGreaterThan(0);
      expect(part.projectType).toBe('blockchain');
      expect(part.blurb?.length ?? 0).toBeGreaterThan(10);
      expect(part.longDescription?.length ?? 0).toBeGreaterThan(0);
      expect(part.tags).toContain('government');
    }
  });

  it('ships every Government template the package authored', () => {
    expect(GOVERNMENT_TEMPLATES.length).toBeGreaterThan(0);
    for (const template of GOVERNMENT_TEMPLATES) {
      expect(template.projectType).toBe('blockchain');
      expect(template.title.length).toBeGreaterThan(0);
      expect(template.description?.length ?? 0).toBeGreaterThan(10);
      expect((template.modules ?? []).length).toBeGreaterThan(0);
      expect(template.tags).toContain('government');
    }
  });

  it('carries a posture for every Government template', () => {
    for (const template of GOVERNMENT_TEMPLATES) {
      expect(postureFor(template.id), template.id).toBeDefined();
    }
    expect(GOVERNMENT_POSTURES).toHaveLength(GOVERNMENT_TEMPLATES.length);
  });

  it('names the reason for every dependency it records', () => {
    for (const part of GOVERNMENT_MODULES) {
      for (const dependency of part.dependsOn ?? []) {
        expect(part.reasonByDepId?.[dependency], `${part.moduleId} ${dependency}`).toBeDefined();
      }
    }
  });
});

describe('the Government set reaches the catalogue', () => {
  it('joins the Government modules for Government alone', () => {
    const held = modulesForApplication('government', SEED_MODULES);
    expect(held.length).toBe(SEED_MODULES.length + GOVERNMENT_MODULES.length);
    expect(modulesForApplication('dapps', SEED_MODULES)).toHaveLength(SEED_MODULES.length);
  });

  it('joins the Government templates for Government alone', () => {
    const held = templatesForApplication('government', SEED_TEMPLATES);
    expect(held.length).toBe(SEED_TEMPLATES.length + GOVERNMENT_TEMPLATES.length);
    expect(templatesForApplication('enterprise', SEED_TEMPLATES)).toHaveLength(
      SEED_TEMPLATES.length,
    );
  });

  it('offers every Government module through the part subset', () => {
    const offered = partsFor('government', SEED_MODULES).map((part) => part.moduleId);
    for (const part of GOVERNMENT_MODULES) {
      expect(offered, part.moduleId).toContain(part.moduleId);
      expect(authoredForGovernment(part.moduleId)).toBe(true);
    }
  });

  it('shows every Government template in the gallery', () => {
    const cards = describeTemplates(
      templatesForVariant('government', SEED_TEMPLATES),
      partsFor('government', SEED_MODULES),
    );
    for (const template of GOVERNMENT_TEMPLATES) {
      const card = cards.find((entry) => entry.template.id === template.id);
      expect(card, template.id).toBeDefined();
      expect(card!.difficultyReason.length).toBeGreaterThan(10);
    }
  });

  it('derives an outcome for every Government module', () => {
    const outcomes = deriveOutcomes(partsFor('government', SEED_MODULES));
    for (const part of GOVERNMENT_MODULES) {
      const outcome = outcomes.find((entry) => entry.anchorModuleId === part.moduleId);
      expect(outcome, part.moduleId).toBeDefined();
      expect(outcome!.statement.length).toBeGreaterThan(5);
      expect(outcome!.removalConsequence.length).toBeGreaterThan(10);
    }
  });

  it('resolves every Government template against the parts on offer', () => {
    const offered = partsFor('government', SEED_MODULES);
    const index = indexModules(offered);
    const everything = new Set(SEED_MODULES.map((part) => part.moduleId));
    for (const template of GOVERNMENT_TEMPLATES) {
      const closure = resolveDependencyClosure(template.modules ?? [], index);
      expect(closure.installed.length, template.id).toBeGreaterThan(0);
      for (const name of template.modules ?? []) {
        expect(closure.installed, `${template.id} ${name}`).toContain(name);
      }
      // A name the whole catalogue lacks stays missing here too. A name
      // Cerulea for Government withholds never appears in the closure at all.
      for (const name of closure.missing) {
        expect(everything.has(name), `${template.id} withheld ${name}`).toBe(false);
      }
    }
  });
});

describe('the Government posture', () => {
  const templateId = GOVERNMENT_TEMPLATES[0].id;

  it('holds the four things section 11.9 makes standard', () => {
    const lines = postureLines(templateId);
    expect(lines.map((line) => line.id)).toEqual([
      'air_gapped',
      'residency',
      'governance',
      'retention',
    ]);
    for (const line of lines) {
      expect(line.standard, line.id).toBe(true);
      expect(line.states.length, line.id).toBeGreaterThan(20);
      expect(line.heading.endsWith('.'), line.id).toBe(false);
    }
  });

  it('names the organisations that agree to a change', () => {
    const governance = postureLines(templateId).find((line) => line.id === 'governance')!;
    const held = postureFor(templateId)!;
    for (const organisation of held.governance.organisations) {
      expect(governance.states).toContain(organisation.title);
    }
    expect(organisationCountFor(templateId)).toBe(held.governance.organisations.length);
  });

  it('holds the extended retention every Government template states', () => {
    for (const template of GOVERNMENT_TEMPLATES) {
      const held = postureFor(template.id)!;
      expect(held.deployment.retention.default_years, template.id).toBeGreaterThanOrEqual(7);
      expect(retentionDaysFor(template.id)).toBe(held.deployment.retention.default_years * 365);
    }
  });

  it('installs air-gapped and locks residency on every Government template', () => {
    for (const template of GOVERNMENT_TEMPLATES) {
      const held = postureFor(template.id)!;
      expect(held.deployment.air_gapped, template.id).toBe(true);
      expect(held.deployment.residency.jurisdiction.length, template.id).toBeGreaterThan(0);
    }
  });

  it('raises the threshold with the transaction class', () => {
    expect(thresholdFor(templateId, 'Routine')).toBe(51);
    expect(thresholdFor(templateId, 'Financial')).toBe(67);
    expect(thresholdFor(templateId, 'Structural')).toBe(80);
    expect(thresholdFor(templateId, 'Constitutional')).toBe(90);
    expect(thresholdFor(templateId, 'Nonsense')).toBeUndefined();
  });

  it('holds the standard posture where no Government template was chosen', () => {
    const lines = postureLines('');
    expect(lines).toHaveLength(4);
    for (const line of lines) expect(line.standard).toBe(true);
    expect(retentionDaysFor('')).toBe(STANDARD_POSTURE.retention.default_years * 365);
    expect(organisationCountFor('')).toBe(3);
  });
});
