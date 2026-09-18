import { describe, expect, it } from 'vitest';
import modulesSeed from '@/data/modules.seed.json';
import templatesSeed from '@/data/templates.seed.json';
import type { CatalogueModule, CatalogueTemplate } from '@/lib/catalogue/types';
import { buildRelationCatalogue, edgesWithin, linkTypeForRelation } from './relations';
import { answerFeedsQuestion, resolveFeedsLinks } from './feeds';

const modules = (modulesSeed as { modules: CatalogueModule[] }).modules;
const templates = (templatesSeed as { templates: CatalogueTemplate[] }).templates;
const catalogue = buildRelationCatalogue(templates);
const everything = modules.map((part) => part.moduleId);

describe('the relation catalogue', () => {
  it('sorts every relation word the templates use', () => {
    const words = new Set<string>();
    for (const template of templates) {
      for (const edge of template.edges ?? []) words.add(edge.rel);
    }
    for (const word of words) {
      expect(['feeds', 'triggers', 'governs', 'none']).toContain(linkTypeForRelation(word));
    }
  });

  it('records the templates behind every edge', () => {
    for (const edge of catalogue.edges) {
      expect(edge.templates.length).toBeGreaterThan(0);
      expect(edge.relations.length).toBeGreaterThan(0);
    }
  });

  it('keeps only the parts the project holds', () => {
    const held = ['kyc', 'erc20'];
    for (const edge of edgesWithin(catalogue, 'governs', held)) {
      expect(held).toContain(edge.from);
      expect(held).toContain(edge.to);
    }
  });

  it('builds the same catalogue every time', () => {
    expect(buildRelationCatalogue(templates)).toEqual(catalogue);
  });
});

describe('feeds links over the whole catalogue', () => {
  const result = resolveFeedsLinks(everything, modules, catalogue);

  it('draws an arrow where one source is the only candidate', () => {
    expect(result.derived.length).toBeGreaterThan(0);
    for (const link of result.derived) {
      expect(link.type).toBe('feeds');
      expect(link.origin).toBe('derived');
      expect(link.removable).toBe(false);
    }
  });

  it('asks where several parts could be the source', () => {
    expect(result.questions.length).toBeGreaterThan(0);
    for (const question of result.questions) {
      expect(question.options.length).toBeGreaterThan(1);
      expect(question.question).toContain(question.toTitle);
    }
  });

  it('never both derives and asks about one receiving part', () => {
    const asked = new Set(result.questions.map((question) => question.to));
    for (const link of result.derived) {
      expect(asked.has(link.to)).toBe(false);
    }
  });

  it('names every part by its plain name inside the question', () => {
    for (const question of result.questions) {
      expect(question.toTitle).not.toBe(question.to);
      for (const option of question.options) {
        expect(option.reason.length).toBeGreaterThan(10);
      }
    }
  });

  it('asks about the receiving parts the catalogue shows as ambiguous', () => {
    const asked = result.questions.map((question) => question.to);
    expect(asked).toContain('analytics');
    expect(asked).toContain('explorer');
  });

  it('produces the same result every time', () => {
    expect(resolveFeedsLinks(everything, modules, catalogue)).toEqual(result);
  });
});

describe('answering a feeds question', () => {
  const result = resolveFeedsLinks(everything, modules, catalogue);
  const question = result.questions.find((candidate) => candidate.to === 'analytics');

  it('draws an arrow for every source the user picked', () => {
    const picked = [question!.options[0].from, question!.options[1].from];
    const links = answerFeedsQuestion(question!, picked, modules, catalogue);
    expect(links).toHaveLength(2);
    expect(links.map((link) => link.from).sort()).toEqual([...picked].sort());
    for (const link of links) {
      expect(link.origin).toBe('chosen');
      expect(link.removable).toBe(true);
      expect(link.to).toBe('analytics');
    }
  });

  it('draws nothing while no source is picked', () => {
    expect(answerFeedsQuestion(question!, [], modules, catalogue)).toEqual([]);
  });

  it('ignores a source the catalogue records no relation for', () => {
    expect(answerFeedsQuestion(question!, ['wallet-auth'], modules, catalogue)).toEqual([]);
  });
});

describe('feeds links inside one small project', () => {
  it('draws nothing while the project holds no related pair', () => {
    const result = resolveFeedsLinks(['wallet-auth', 'rbac'], modules, catalogue);
    expect(result.derived).toEqual([]);
    expect(result.questions).toEqual([]);
  });
});
