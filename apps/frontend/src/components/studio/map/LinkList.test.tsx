import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SEED_MODULES } from '@/lib/catalogue/seed';

import { deriveOutcomes } from '@/lib/outcomes/catalogue';
import { resolveOutcomeSelection } from '@/lib/outcomes/resolve';
import { deriveRequiresLinks } from '@/lib/map/links';
import LinkList from './LinkList';
import ModuleMap from './ModuleMap';

const modules = SEED_MODULES;
const outcomes = deriveOutcomes(modules);
const outcomeFor = (moduleId: string) =>
  outcomes.find((outcome) => outcome.anchorModuleId === moduleId)?.outcomeId as string;
const resolution = resolveOutcomeSelection([outcomeFor('rbac')], outcomes, modules);
const links = deriveRequiresLinks(resolution.installOrder, modules);
const titleById = Object.fromEntries(modules.map((part) => [part.moduleId, part.title]));

describe('the link list', () => {
  it('says so while nothing connects', () => {
    render(<LinkList links={[]} titleById={titleById} />);
    expect(screen.getByText(/Nothing connects yet/)).toBeInTheDocument();
  });

  it('draws requires as a solid line with no arrow', () => {
    render(<LinkList links={links} titleById={titleById} />);
    const [sample] = screen.getAllByTestId('link-sample-requires');
    const line = sample.querySelector('line');
    expect(line?.getAttribute('data-stroke')).toBe('solid');
    expect(line?.getAttribute('data-arrow')).toBe('no');
    expect(line?.getAttribute('stroke-dasharray')).toBeNull();
  });

  it('names both parts by their plain names', () => {
    render(<LinkList links={links} titleById={titleById} />);
    const [row] = screen.getAllByTestId('map-link');
    expect(within(row).getByText('Role-Based Access Control')).toBeInTheDocument();
    expect(within(row).getByText('Wallet Authentication')).toBeInTheDocument();
  });

  it('marks a derived link as fixed and offers no removal', () => {
    render(<LinkList links={links} titleById={titleById} />);
    const [row] = screen.getAllByTestId('map-link');
    expect(within(row).getByText('Cerulea drew this')).toBeInTheDocument();
    expect(within(row).getByText('Fixed')).toBeInTheDocument();
    expect(within(row).queryByText('Remove')).toBeNull();
  });

  it('states what the link means and what breaks without it', () => {
    render(<LinkList links={links} titleById={titleById} />);
    expect(screen.getByText(/This part needs the part at the other end/)).toBeInTheDocument();
  });
});

describe('the map draws its links', () => {
  it('shows the requires links beside the cards', () => {
    render(<ModuleMap resolution={resolution} modules={modules} />);
    expect(screen.getByText('How the parts connect')).toBeInTheDocument();
    expect(screen.getByTestId('link-group-requires')).toBeInTheDocument();
  });
});
