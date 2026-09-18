import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SEED_MODULES, SEED_TEMPLATES } from '@/lib/catalogue/seed';

import TemplateGalleryDoor from './TemplateGalleryDoor';

const catalogue = {
  modules: SEED_MODULES,
  templates: SEED_TEMPLATES,
};

describe('the gallery door', () => {
  it('opens populated with the whole template catalogue', () => {
    render(<TemplateGalleryDoor catalogue={catalogue} />);
    expect(screen.getByText('100 of 100 templates match.')).toBeInTheDocument();
    expect(screen.getAllByTestId('template-tile')).toHaveLength(100);
  });

  it('narrows the gallery as we search', async () => {
    render(<TemplateGalleryDoor catalogue={catalogue} />);
    await userEvent.type(screen.getByLabelText('Search the templates'), 'wallet');
    await waitFor(() => {
      const tiles = screen.getAllByTestId('template-tile');
      expect(tiles.length).toBeGreaterThan(0);
      expect(tiles.length).toBeLessThan(100);
    });
  });

  it('narrows the gallery by difficulty', async () => {
    render(<TemplateGalleryDoor catalogue={catalogue} />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Difficulty' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Starter' }));
    await waitFor(() => {
      for (const tile of screen.getAllByTestId('template-tile')) {
        expect(within(tile).getByText('Starter')).toBeInTheDocument();
      }
    });
  });

  it('carries a difficulty badge and its reason on every card', () => {
    render(<TemplateGalleryDoor catalogue={catalogue} />);
    const [tile] = screen.getAllByTestId('template-tile');
    expect(within(tile).getByText(/Cerulea installs \d+ parts across \d+ areas/)).toBeInTheDocument();
  });

  it('hands back the template a user starts from', async () => {
    const chosen: Array<{ templateId: string }> = [];
    render(<TemplateGalleryDoor catalogue={catalogue} onChoose={(choice) => chosen.push(choice)} />);
    await userEvent.type(screen.getByLabelText('Search the templates'), 'crypto wallet');
    await waitFor(() => {
      expect(screen.getAllByTestId('template-tile').length).toBeGreaterThan(0);
    });
    const [tile] = screen.getAllByTestId('template-tile');
    await userEvent.click(within(tile).getByRole('button', { name: /Start from this template/i }));
    expect(chosen).toHaveLength(1);
    expect(chosen[0].templateId.length).toBeGreaterThan(0);
  });

  it('names the fix when no template matches', async () => {
    render(<TemplateGalleryDoor catalogue={catalogue} />);
    await userEvent.type(screen.getByLabelText('Search the templates'), 'zzzqwx');
    await waitFor(() => {
      expect(screen.getByText('No template matches yet')).toBeInTheDocument();
    });
    expect(screen.getByText(/Remove a word from the search/i)).toBeInTheDocument();
  });
});
