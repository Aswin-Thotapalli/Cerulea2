import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import modulesSeed from '@/data/modules.seed.json';
import templatesSeed from '@/data/templates.seed.json';
import type { CatalogueModule, CatalogueTemplate } from '@/lib/catalogue/types';
import IntentDoor, { type IntentChoice } from './IntentDoor';

const catalogue = {
  modules: (modulesSeed as { modules: CatalogueModule[] }).modules,
  templates: (templatesSeed as { templates: CatalogueTemplate[] }).templates,
};

const DESCRIPTION = 'We track every handling step of a shipment and let a buyer verify the goods.';

describe('the intent door', () => {
  it('opens with starter lines, so the field never stands blank', () => {
    render(<IntentDoor catalogue={catalogue} />);
    const starters = catalogue.templates
      .map((template) => template.description ?? '')
      .filter((text) => text.length > 30)
      .slice(0, 3);
    expect(starters).toHaveLength(3);
    for (const starter of starters) {
      expect(screen.getByText(starter)).toBeInTheDocument();
    }
  });

  it('proposes a track, templates and outcomes, each with a reason', async () => {
    render(<IntentDoor catalogue={catalogue} />);
    await userEvent.type(screen.getByLabelText('What should this system do'), DESCRIPTION);
    await userEvent.click(screen.getByRole('button', { name: /Show what Cerulea proposes/i }));

    await waitFor(() => {
      expect(screen.getByText('The templates that match')).toBeInTheDocument();
    });
    expect(screen.getByText('The network Cerulea proposes')).toBeInTheDocument();
    expect(screen.getByText('The outcomes that match')).toBeInTheDocument();
    expect(screen.getAllByText(/Our description mentions/i).length).toBeGreaterThan(1);
  });

  it('lets a user override the track the proposal names', async () => {
    const accepted: IntentChoice[] = [];
    render(<IntentDoor catalogue={catalogue} onAccept={(choice) => accepted.push(choice)} />);
    await userEvent.type(screen.getByLabelText('What should this system do'), DESCRIPTION);
    await userEvent.click(screen.getByRole('button', { name: /Show what Cerulea proposes/i }));

    await waitFor(() => {
      expect(screen.getByLabelText('A private Blockchain network')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByLabelText('A private Blockchain network'));
    await userEvent.click(screen.getByRole('button', { name: /Start from this proposal/i }));

    expect(accepted).toHaveLength(1);
    expect(accepted[0].track).toBe('blockchain');
    expect(accepted[0].templateId.length).toBeGreaterThan(0);
    expect(accepted[0].outcomeIds.length).toBeGreaterThan(0);
  });

  it('asks for more words when the description reaches nothing', async () => {
    render(<IntentDoor catalogue={catalogue} />);
    await userEvent.type(screen.getByLabelText('What should this system do'), 'zzzq wwwv');
    await userEvent.click(screen.getByRole('button', { name: /Show what Cerulea proposes/i }));

    await waitFor(() => {
      expect(screen.getByText('Cerulea found no match yet')).toBeInTheDocument();
    });
  });

  it('names the fix when the catalogue cannot be read', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')));
    render(<IntentDoor />);
    await waitFor(() => {
      expect(screen.getByText('Cerulea could not read the catalogue')).toBeInTheDocument();
    });
    expect(screen.getByText(/Check that Studio is running/i)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
