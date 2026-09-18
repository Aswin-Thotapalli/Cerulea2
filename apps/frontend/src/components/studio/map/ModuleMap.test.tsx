import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SEED_MODULES } from '@/lib/catalogue/seed';

import { deriveOutcomes } from '@/lib/outcomes/catalogue';
import { resolveOutcomeSelection } from '@/lib/outcomes/resolve';
import { buildModuleMap, dependencyDepths, groupNodesByOutcome, nodesByDepth } from '@/lib/map/graph';
import ModuleMap from './ModuleMap';

const modules = SEED_MODULES;
const outcomes = deriveOutcomes(modules);
const outcomeFor = (moduleId: string) =>
  outcomes.find((outcome) => outcome.anchorModuleId === moduleId)?.outcomeId as string;
const resolution = resolveOutcomeSelection([outcomeFor('rbac'), outcomeFor('kyc')], outcomes, modules);

describe('the map model', () => {
  const map = buildModuleMap(resolution, modules);

  it('carries one card per installed part', () => {
    expect(map.nodes).toHaveLength(resolution.installOrder.length);
  });

  it('gives every card the outcome that caused it', () => {
    for (const node of map.nodes) {
      expect(node.causedBy.length).toBeGreaterThan(0);
    }
  });

  it('gives every card a contribution and a removal sentence', () => {
    for (const node of map.nodes) {
      expect(node.contribution.trim().length).toBeGreaterThan(0);
      expect(node.removalConsequence.trim().length).toBeGreaterThan(0);
    }
  });

  it('places a part above every part it needs', () => {
    const depths = dependencyDepths(resolution.installOrder, modules);
    const index = new Map(modules.map((part) => [part.moduleId, part]));
    for (const moduleId of resolution.installOrder) {
      for (const dependency of index.get(moduleId)?.dependsOn ?? []) {
        if (depths[dependency] === undefined) continue;
        expect(depths[dependency]).toBeLessThan(depths[moduleId]);
      }
    }
  });

  it('reads by intent as well as by layer', () => {
    const byOutcome = groupNodesByOutcome(map);
    expect(byOutcome.length).toBeGreaterThan(0);
    const names = byOutcome.map((entry) => entry.outcome);
    expect([...names].sort((left, right) => left.localeCompare(right))).toEqual(names);
  });

  it('orders every layer by name, so the map never shifts', () => {
    for (const layer of nodesByDepth(map)) {
      const titles = layer.map((node) => node.title);
      expect([...titles].sort((left, right) => left.localeCompare(right))).toEqual(titles);
    }
  });
});

describe('the map surface', () => {
  it('asks for an outcome while nothing is chosen', () => {
    const empty = resolveOutcomeSelection([], outcomes, modules);
    render(<ModuleMap resolution={empty} modules={modules} />);
    expect(screen.getByText('The map fills once we choose an outcome')).toBeInTheDocument();
  });

  it('draws one card per part, each stating why it is here', () => {
    render(<ModuleMap resolution={resolution} modules={modules} />);
    const cards = screen.getAllByTestId('map-card');
    expect(cards).toHaveLength(resolution.installOrder.length);
    for (const card of cards) {
      expect(within(card).getByTestId('map-card-cause').textContent).toMatch(/This is here because/);
      expect(within(card).getByTestId('map-card-removal').textContent).toMatch(/Removing this stops/);
    }
  });

  it('lists the dependants before a removal proceeds', async () => {
    render(<ModuleMap resolution={resolution} modules={modules} />);
    await userEvent.click(screen.getByRole('button', { name: /Remove Wallet Authentication/ }));
    await waitFor(() => {
      expect(screen.getByText(/Removing Wallet Authentication stops/)).toBeInTheDocument();
    });
    expect(screen.getAllByTestId('removal-dependant').length).toBeGreaterThan(0);
    const dependants = screen.getAllByTestId('removal-dependant').map((node) => node.textContent);
    expect(dependants.some((text) => text?.includes('Role-Based Access Control'))).toBe(true);
  });

  it('removes nothing while the user keeps the part', async () => {
    const removed: string[] = [];
    render(<ModuleMap resolution={resolution} modules={modules} onRemoveModule={(id) => removed.push(id)} />);
    await userEvent.click(screen.getByRole('button', { name: /Remove Wallet Authentication/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Keep it' }));
    expect(removed).toEqual([]);
  });

  it('removes the part once the user confirms', async () => {
    const removed: string[] = [];
    render(<ModuleMap resolution={resolution} modules={modules} onRemoveModule={(id) => removed.push(id)} />);
    await userEvent.click(screen.getByRole('button', { name: /Remove Wallet Authentication/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Remove it anyway' }));
    expect(removed).toEqual(['wallet-auth']);
  });
});
