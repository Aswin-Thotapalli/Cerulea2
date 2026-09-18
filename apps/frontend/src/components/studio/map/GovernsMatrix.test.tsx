import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import modulesSeed from '@/data/modules.seed.json';
import templatesSeed from '@/data/templates.seed.json';
import type { CatalogueModule, CatalogueTemplate } from '@/lib/catalogue/types';
import { buildRelationCatalogue } from '@/lib/map/relations';
import { derivePermissionMatrix, deriveGovernsLinks } from '@/lib/map/governs';
import GovernsMatrix from './GovernsMatrix';
import LinkList from './LinkList';

const modules = (modulesSeed as { modules: CatalogueModule[] }).modules;
const templates = (templatesSeed as { templates: CatalogueTemplate[] }).templates;
const catalogue = buildRelationCatalogue(templates);
const matrix = derivePermissionMatrix(['wallet-auth', 'rbac', 'kyc'], modules, catalogue);
const titleById = Object.fromEntries(modules.map((part) => [part.moduleId, part.title]));

describe('the permission matrix view', () => {
  it('lists one row per part that decides access', () => {
    render(<GovernsMatrix matrix={matrix} modules={modules} />);
    expect(screen.getAllByTestId('governs-role')).toHaveLength(matrix.roles.length);
  });

  it('states what happens without a row', () => {
    render(<GovernsMatrix matrix={matrix} modules={modules} />);
    expect(screen.getByText(/accepts every caller/)).toBeInTheDocument();
  });

  it('asks for an outcome while nothing decides access', () => {
    render(<GovernsMatrix matrix={{ roles: [], grants: [] }} modules={modules} />);
    expect(screen.getByText('No part decides access in this project yet')).toBeInTheDocument();
  });
});

describe('a governs link on the map', () => {
  it('draws as a dotted line a user cannot remove', () => {
    const links = deriveGovernsLinks(matrix);
    render(<LinkList links={links} titleById={titleById} />);
    const [sample] = screen.getAllByTestId('link-sample-governs');
    const line = sample.querySelector('line');
    expect(line?.getAttribute('data-stroke')).toBe('dotted');
    expect(line?.getAttribute('data-arrow')).toBe('no');
    expect(screen.getAllByText('Fixed').length).toBe(links.length);
  });
});
