import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import modulesSeed from '@/data/modules.seed.json';
import templatesSeed from '@/data/templates.seed.json';
import type { CatalogueModule, CatalogueTemplate } from '@/lib/catalogue/types';
import { buildRelationCatalogue } from '@/lib/map/relations';
import { resolveFeedsLinks } from '@/lib/map/feeds';
import { LINK_STYLE } from '@/lib/map/links';
import FeedsPicker from './FeedsPicker';
import LinkList from './LinkList';

const modules = (modulesSeed as { modules: CatalogueModule[] }).modules;
const templates = (templatesSeed as { templates: CatalogueTemplate[] }).templates;
const catalogue = buildRelationCatalogue(templates);
const everything = modules.map((part) => part.moduleId);
const result = resolveFeedsLinks(everything, modules, catalogue);
const titleById = Object.fromEntries(modules.map((part) => [part.moduleId, part.title]));

describe('the feeds picker', () => {
  it('says so when Cerulea settled every arrow', () => {
    render(<FeedsPicker questions={[]} answers={{}} onAnswerChange={() => undefined} />);
    expect(screen.getByText('Cerulea settled every arrow on its own')).toBeInTheDocument();
  });

  it('asks one question per receiving part with several sources', () => {
    render(<FeedsPicker questions={result.questions} answers={{}} onAnswerChange={() => undefined} />);
    expect(screen.getAllByTestId('feeds-question')).toHaveLength(result.questions.length);
  });

  it('offers only the sources the catalogue records', () => {
    const [question] = result.questions;
    render(<FeedsPicker questions={[question]} answers={{}} onAnswerChange={() => undefined} />);
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(question.options.length);
  });

  it('hands the chosen sources back', async () => {
    const [question] = result.questions;
    const answers: Array<{ to: string; sources: string[] }> = [];
    render(
      <FeedsPicker
        questions={[question]}
        answers={{}}
        onAnswerChange={(to, sources) => answers.push({ to, sources })}
      />,
    );
    await userEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(answers).toHaveLength(1);
    expect(answers[0].to).toBe(question.to);
    expect(answers[0].sources).toEqual([question.options[0].from]);
  });
});

describe('a feeds link draws as an arrow', () => {
  it('carries an arrow head', () => {
    expect(LINK_STYLE.feeds.arrow).toBe(true);
    render(<LinkList links={result.derived.slice(0, 3)} titleById={titleById} />);
    const [sample] = screen.getAllByTestId('link-sample-feeds');
    expect(sample.querySelector('line')?.getAttribute('data-arrow')).toBe('yes');
  });

  it('marks a derived arrow as drawn by Cerulea', () => {
    render(<LinkList links={result.derived.slice(0, 1)} titleById={titleById} />);
    expect(screen.getByText('Cerulea drew this')).toBeInTheDocument();
  });
});
