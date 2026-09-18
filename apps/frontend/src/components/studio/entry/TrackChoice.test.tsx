import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SEED_MODULES, SEED_TEMPLATES } from '@/lib/catalogue/seed';

import StartFreshDoor from './StartFreshDoor';

const catalogue = {
  modules: SEED_MODULES,
  templates: SEED_TEMPLATES,
};

describe('the network control inside the start fresh door', () => {
  it('shows the question for Dapps and starts on the public-access chain', () => {
    render(<StartFreshDoor catalogue={catalogue} application="dapps" />);
    const publicOption = screen.getByRole('radio', { name: /Public-access chain/ }) as HTMLInputElement;
    expect(publicOption.checked).toBe(true);
    expect(screen.getByRole('radio', { name: /Private Blockchain network/ })).toBeInTheDocument();
  });

  it('shows the question for Enterprise and keeps records private', () => {
    render(<StartFreshDoor catalogue={catalogue} application="enterprise" />);
    const privateOption = screen.getByRole('radio', { name: /Private Blockchain network/ }) as HTMLInputElement;
    expect(privateOption.checked).toBe(true);
    expect(
      screen.getByRole('switch', { name: /Publish chosen records to the public-access chain/ }),
    ).toBeInTheDocument();
  });

  it('never asks the question for Government', () => {
    render(<StartFreshDoor catalogue={catalogue} application="government" />);
    expect(screen.queryByRole('radio')).toBeNull();
    const statement = screen.getByTestId('track-statement');
    expect(statement.textContent).toContain('Private Blockchain network');
  });

  it('lets a Dapps user override the network, and follows the change', async () => {
    render(<StartFreshDoor catalogue={catalogue} application="dapps" />);
    const before = screen.getAllByTestId('foundation-part').length;
    await userEvent.click(screen.getByRole('radio', { name: /Private Blockchain network/ }));
    await waitFor(() => {
      expect(screen.getByText(/We set this network by hand/)).toBeInTheDocument();
    });
    expect(screen.getAllByTestId('foundation-part').length).not.toBe(before);
  });

  it('carries the publishing choice back with the project', async () => {
    const started: Array<{ publishSelectedRecords: boolean; track: string }> = [];
    render(
      <StartFreshDoor
        catalogue={catalogue}
        application="enterprise"
        onStart={(choice) => started.push(choice)}
      />,
    );
    await userEvent.click(
      screen.getByRole('switch', { name: /Publish chosen records to the public-access chain/ }),
    );
    await userEvent.type(screen.getByLabelText('Project name'), 'Supplier ledger');
    await userEvent.click(screen.getByRole('button', { name: /Open the workspace/i }));
    expect(started).toHaveLength(1);
    expect(started[0].track).toBe('blockchain');
    expect(started[0].publishSelectedRecords).toBe(true);
  });
});
