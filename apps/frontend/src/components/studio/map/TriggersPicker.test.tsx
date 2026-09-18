import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import modulesSeed from '@/data/modules.seed.json';
import templatesSeed from '@/data/templates.seed.json';
import type { CatalogueModule, CatalogueTemplate } from '@/lib/catalogue/types';
import { buildRelationCatalogue } from '@/lib/map/relations';
import { createTriggerLink, validTriggerPairs, type TriggerPair } from '@/lib/map/triggers';
import LinkList from './LinkList';
import TriggersPicker from './TriggersPicker';

const modules = (modulesSeed as { modules: CatalogueModule[] }).modules;
const templates = (templatesSeed as { templates: CatalogueTemplate[] }).templates;
const catalogue = buildRelationCatalogue(templates);
const everything = modules.map((part) => part.moduleId);
const pairs = validTriggerPairs(everything, modules, catalogue);
const titleById = Object.fromEntries(modules.map((part) => [part.moduleId, part.title]));

describe('the triggers picker', () => {
  it('lists one line per valid pair and nothing else', () => {
    render(<TriggersPicker pairs={pairs} chosen={[]} onToggle={() => undefined} />);
    expect(screen.getAllByTestId('trigger-pair')).toHaveLength(pairs.length);
  });

  it('says so while the project holds no valid pair', () => {
    render(<TriggersPicker pairs={[]} chosen={[]} onToggle={() => undefined} />);
    expect(screen.getByText('No pair in this project can trigger another yet')).toBeInTheDocument();
  });

  it('states what happens once a line is on', () => {
    const [pair] = pairs;
    render(<TriggersPicker pairs={[pair]} chosen={[]} onToggle={() => undefined} />);
    expect(screen.getByText(new RegExp(pair.effect.slice(0, 30)))).toBeInTheDocument();
  });

  it('hands the chosen pair back', async () => {
    const [pair] = pairs;
    const toggled: Array<{ pair: TriggerPair; next: boolean }> = [];
    render(
      <TriggersPicker pairs={[pair]} chosen={[]} onToggle={(next, on) => toggled.push({ pair: next, next: on })} />,
    );
    await userEvent.click(screen.getByRole('switch'));
    expect(toggled).toHaveLength(1);
    expect(toggled[0].pair.from).toBe(pair.from);
    expect(toggled[0].next).toBe(true);
  });
});

describe('a triggers link on the map', () => {
  it('draws as a dashed arrow a user may remove', () => {
    const [pair] = pairs;
    const link = createTriggerLink(pair.from, pair.to, pairs);
    render(<LinkList links={[link]} titleById={titleById} />);
    const [sample] = screen.getAllByTestId('link-sample-triggers');
    const line = sample.querySelector('line');
    expect(line?.getAttribute('data-stroke')).toBe('dashed');
    expect(line?.getAttribute('data-arrow')).toBe('yes');
    expect(screen.getByText('We drew this')).toBeInTheDocument();
    expect(screen.getByText('Remove')).toBeInTheDocument();
  });
});
