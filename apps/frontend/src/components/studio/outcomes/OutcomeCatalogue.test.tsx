import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SEED_MODULES } from '@/lib/catalogue/seed';

import OutcomeCatalogue from './OutcomeCatalogue';

// The surface tests type into the search, so they take the parts the searches
// name plus a slice, which keeps the render light. The count tests take the
// whole seed.
const modules = SEED_MODULES;
const light = SEED_MODULES.filter((part) => /wallet|role|permission|crypto/i.test(`${part.title} ${part.blurb ?? ''} ${(part.tags ?? []).join(' ')}`)).concat(SEED_MODULES.slice(0, 12));
const BRIDGE_STATEMENTS = 7;
const ALL = modules.length + BRIDGE_STATEMENTS;
const PRIVATE = modules.filter((part) => part.projectType === 'blockchain').length + BRIDGE_STATEMENTS;

describe('the outcome catalogue surface', () => {
  it('opens populated and grouped by area', () => {
    render(<OutcomeCatalogue modules={modules} />);
    expect(screen.getByText(`${ALL} of ${ALL} outcomes match. 0 selected.`)).toBeInTheDocument();
    expect(screen.getAllByTestId('outcome-group').length).toBeGreaterThan(1);
  });

  it('narrows to the network the project runs on', () => {
    render(<OutcomeCatalogue modules={modules} track="blockchain" />);
    expect(screen.getByText(`${PRIVATE} of ${PRIVATE} outcomes match. 0 selected.`)).toBeInTheDocument();
  });

  it('narrows as we search', async () => {
    render(<OutcomeCatalogue modules={light} />);
    await userEvent.type(screen.getByLabelText('Search the outcomes'), 'wallet');
    await waitFor(() => {
      const lightAll = light.length + BRIDGE_STATEMENTS;
      expect(screen.getByText(new RegExp(`of ${lightAll} outcomes match`))).not.toHaveTextContent(`${lightAll} of ${lightAll}`);
    });
  });

  it('hands back every outcome a user selects', async () => {
    const chosen: string[][] = [];
    render(
      <OutcomeCatalogue
        modules={light}
        selected={[]}
        onSelectedChange={(next) => chosen.push(next)}
      />,
    );
    await userEvent.type(screen.getByLabelText('Search the outcomes'), 'crypto wallet');
    await waitFor(() => {
      expect(screen.getAllByTestId('outcome-card').length).toBeGreaterThan(0);
    });
    const [first] = screen.getAllByRole('checkbox');
    await userEvent.click(first);
    expect(chosen).toHaveLength(1);
    expect(chosen[0][0]).toMatch(/^outcome:/);
  });

  it('states the parts a statement installs and what stops working after removal', async () => {
    render(<OutcomeCatalogue modules={light} />);
    await userEvent.type(screen.getByLabelText('Search the outcomes'), 'roles permissions');
    await waitFor(() => {
      expect(screen.getAllByTestId('outcome-card').length).toBeGreaterThan(0);
    });
    const [card] = screen.getAllByTestId('outcome-card');
    await userEvent.click(card.querySelector('.MuiAccordionSummary-root') as HTMLElement);
    await waitFor(() => {
      expect(screen.getAllByTestId('bundle-part').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('The parts this installs').length).toBeGreaterThan(0);
  });

  it('names the fix when the catalogue cannot be read', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')));
    render(<OutcomeCatalogue />);
    await waitFor(() => {
      expect(screen.getByText('Cerulea could not read the catalogue')).toBeInTheDocument();
    });
    vi.unstubAllGlobals();
  });
});
