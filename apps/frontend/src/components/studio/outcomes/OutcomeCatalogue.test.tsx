import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SEED_MODULES } from '@/lib/catalogue/seed';

import OutcomeCatalogue from './OutcomeCatalogue';

const modules = SEED_MODULES;

describe('the outcome catalogue surface', () => {
  it('opens populated and grouped by area', () => {
    render(<OutcomeCatalogue modules={modules} />);
    expect(screen.getByText('232 of 232 outcomes match. 0 selected.')).toBeInTheDocument();
    expect(screen.getAllByTestId('outcome-group').length).toBeGreaterThan(1);
  });

  it('narrows to the network the project runs on', () => {
    render(<OutcomeCatalogue modules={modules} track="blockchain" />);
    expect(screen.getByText('107 of 107 outcomes match. 0 selected.')).toBeInTheDocument();
  });

  it('narrows as we search', async () => {
    render(<OutcomeCatalogue modules={modules} />);
    await userEvent.type(screen.getByLabelText('Search the outcomes'), 'wallet');
    await waitFor(() => {
      expect(screen.getByText(/of 232 outcomes match/)).not.toHaveTextContent('232 of 232');
    });
  });

  it('hands back every outcome a user selects', async () => {
    const chosen: string[][] = [];
    render(
      <OutcomeCatalogue
        modules={modules}
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
    render(<OutcomeCatalogue modules={modules} />);
    await userEvent.type(screen.getByLabelText('Search the outcomes'), 'roles permissions');
    await waitFor(() => {
      expect(screen.getAllByTestId('outcome-card').length).toBeGreaterThan(0);
    });
    const [card] = screen.getAllByTestId('outcome-card');
    await userEvent.click(card.querySelector('.MuiAccordionSummary-root') as HTMLElement);
    await waitFor(() => {
      expect(screen.getAllByTestId('bundle-part').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('The parts this installs')).toBeInTheDocument();
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
