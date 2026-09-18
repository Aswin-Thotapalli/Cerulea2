import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SEED_MODULES, SEED_TEMPLATES } from '@/lib/catalogue/seed';
import type { CatalogueTemplate } from '@/lib/catalogue/types';
import { buildFoundation, smallestTemplateFor } from '@/lib/entry/foundation';
import { indexModules, resolveDependencyClosure } from '@/lib/modules/resolve';
import EntryDoors, { type EntryAnswer } from './EntryDoors';
import StartFreshDoor, { type StartFreshChoice } from './StartFreshDoor';

const modules = SEED_MODULES;
const templates = SEED_TEMPLATES;
const catalogue = { modules, templates };

describe('the foundation a fresh project opens on', () => {
  it('picks the smallest working template on each track', () => {
    const index = indexModules(modules);
    for (const track of ['dapp', 'blockchain'] as const) {
      const chosen = smallestTemplateFor(track, templates, modules) as CatalogueTemplate;
      expect(chosen.projectType).toBe(track);
      const size = resolveDependencyClosure(chosen.modules ?? [], index).installed.length;
      for (const candidate of templates.filter((template) => template.projectType === track)) {
        const other = resolveDependencyClosure(candidate.modules ?? [], index).installed.length;
        expect(size).toBeLessThanOrEqual(other);
      }
    }
  });

  it('opens populated and states where the foundation came from', () => {
    const foundation = buildFoundation('dapp', templates, modules);
    expect(foundation).not.toBeNull();
    expect(foundation?.parts.length).toBeGreaterThan(0);
    expect(foundation?.provenance).toContain('smallest working project');
  });

  it('gives every part a plain sentence on what it contributes', () => {
    const foundation = buildFoundation('blockchain', templates, modules);
    for (const part of foundation?.parts ?? []) {
      expect(part.title.length).toBeGreaterThan(0);
      expect(part.contribution.length).toBeGreaterThan(0);
    }
  });

  it('names the part that asked for a dependency', () => {
    const foundation = buildFoundation('dapp', templates, modules);
    const pulled = (foundation?.parts ?? []).filter((part) => part.requiredBy.length > 0);
    for (const part of pulled) {
      expect(part.requiredBy.every((asker) => asker.length > 0)).toBe(true);
    }
  });
});

describe('the start fresh door', () => {
  it('never opens a blank canvas', () => {
    render(<StartFreshDoor catalogue={catalogue} />);
    expect(screen.getByText('What the project opens with')).toBeInTheDocument();
    expect(screen.getAllByTestId('foundation-part').length).toBeGreaterThan(0);
  });

  it('asks for a name before it opens the workspace', async () => {
    render(<StartFreshDoor catalogue={catalogue} />);
    expect(screen.getByRole('button', { name: /Open the workspace/i })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Project name'), 'Shipment trace');
    expect(screen.getByRole('button', { name: /Open the workspace/i })).toBeEnabled();
  });

  it('changes the foundation when the network changes', async () => {
    render(<StartFreshDoor catalogue={catalogue} />);
    const first = screen.getAllByTestId('foundation-part').map((node) => node.textContent);
    await userEvent.click(screen.getByRole('radio', { name: /Private Blockchain network/ }));
    await waitFor(() => {
      const second = screen.getAllByTestId('foundation-part').map((node) => node.textContent);
      expect(second).not.toEqual(first);
    });
  });

  it('hands back the name, the network and the foundation', async () => {
    const started: StartFreshChoice[] = [];
    render(<StartFreshDoor catalogue={catalogue} onStart={(choice) => started.push(choice)} />);
    await userEvent.type(screen.getByLabelText('Project name'), 'Shipment trace');
    await userEvent.click(screen.getByRole('button', { name: /Open the workspace/i }));
    expect(started).toHaveLength(1);
    expect(started[0].name).toBe('Shipment trace');
    expect(started[0].track).toBe('dapp');
    expect(started[0].moduleIds.length).toBeGreaterThan(0);
  });
});

describe('the three doors', () => {
  it('opens on the describe door and reaches the other two', async () => {
    render(<EntryDoors catalogue={catalogue} />);
    expect(screen.getByRole('tab', { name: 'Describe it' })).toBeInTheDocument();
    expect(screen.getByLabelText('What should this system do')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Browse it' }));
    await waitFor(() => {
      expect(screen.getByText('100 of 100 templates match.')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('tab', { name: 'Start fresh' }));
    await waitFor(() => {
      expect(screen.getByText('What the project opens with')).toBeInTheDocument();
    });
  });

  it('hands one answer shape back from every door', async () => {
    const answers: EntryAnswer[] = [];
    render(<EntryDoors catalogue={catalogue} onAnswer={(answer) => answers.push(answer)} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Start fresh' }));
    await userEvent.type(await screen.findByLabelText('Project name'), 'Shipment trace');
    await userEvent.click(screen.getByRole('button', { name: /Open the workspace/i }));
    expect(answers).toHaveLength(1);
    expect(answers[0].door).toBe('fresh');
    expect(answers[0].templateId.length).toBeGreaterThan(0);
    expect(answers[0].track).toBe('dapp');
  });
});
