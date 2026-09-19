import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ApplicationChoice from './ApplicationChoice';
import { APPLICATION_VARIANTS, partsFor } from '@/lib/variants/application';
import { SEED_MODULES } from '@/lib/catalogue/seed';
import { controlsWithoutMirror } from '@/lib/studio/mirror';
import type { Application } from '@/lib/track/derive';

describe('choosing the application a workspace serves', () => {
  it('offers the three applications with their audience', () => {
    const { container } = render(<ApplicationChoice application="dapps" />);
    for (const variant of Object.values(APPLICATION_VARIANTS)) {
      expect(container.querySelector(`[data-application="${variant.application}"]`)).toBeTruthy();
      expect(screen.getByText(variant.audience)).toBeInTheDocument();
    }
  });

  it('states the parts and the tiers each application offers', () => {
    render(<ApplicationChoice application="dapps" />);
    for (const variant of Object.values(APPLICATION_VARIANTS)) {
      const offered = partsFor(variant.application, SEED_MODULES).length;
      expect(screen.getAllByText(`${offered} parts offered.`).length).toBeGreaterThan(0);
    }
  });

  it('shows the tiers of the application chosen', () => {
    const { container } = render(<ApplicationChoice application="government" />);
    for (const tier of APPLICATION_VARIANTS.government.tiers) {
      expect(container.querySelector(`[data-tier="${tier.id}"]`)).toBeTruthy();
    }
    expect(screen.getAllByText('Air-gapped').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Residency lock').length).toBeGreaterThan(0);
  });

  it('says that Government never asks the network question', () => {
    render(<ApplicationChoice application="government" />);
    expect(
      screen.getByText(/Every system runs on a private Blockchain network/),
    ).toBeInTheDocument();
  });

  it('hands back the application a person picks', async () => {
    const picked: Application[] = [];
    render(
      <ApplicationChoice application="dapps" onApplicationChange={(next) => picked.push(next)} />,
    );
    await userEvent.click(screen.getByLabelText('Cerulea for Enterprise'));
    await userEvent.click(screen.getByRole('button', { name: 'Serve Cerulea for Enterprise' }));
    expect(picked).toEqual(['enterprise']);
  });

  it('carries the mirror on the choice', () => {
    const { container } = render(<ApplicationChoice application="dapps" />);
    expect(controlsWithoutMirror(container)).toEqual([]);
    expect(
      screen.getByText(/Each one carries its own parts, its own language/),
    ).toBeInTheDocument();
  });
});
