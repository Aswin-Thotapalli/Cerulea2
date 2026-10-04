import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { deriveTrack, type TrackDerivation } from '@/lib/track/derive';
import TrackChoice from './TrackChoice';

/** Holds the derivation the way the Foundation step holds it, so a change shows. */
function Harness({
  application,
  onPublish,
}: {
  application: 'dapps' | 'enterprise' | 'government';
  onPublish?: (next: boolean) => void;
}) {
  const [derivation, setDerivation] = React.useState<TrackDerivation>(() => deriveTrack(application));
  const [publish, setPublish] = React.useState(false);
  return (
    <TrackChoice
      derivation={derivation}
      onChange={setDerivation}
      publishSelected={publish}
      onPublishSelectedChange={(next) => {
        setPublish(next);
        onPublish?.(next);
      }}
    />
  );
}

describe('the network control', () => {
  it('shows the question for Dapps and starts on the public-access chain', () => {
    render(<Harness application="dapps" />);
    const publicOption = screen.getByRole('radio', { name: /Public-access chain/ }) as HTMLInputElement;
    expect(publicOption.checked).toBe(true);
    expect(screen.getByRole('radio', { name: /Private Blockchain network/ })).toBeInTheDocument();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('shows the question for Enterprise, keeps records private and offers publishing', () => {
    render(<Harness application="enterprise" />);
    const privateOption = screen.getByRole('radio', { name: /Private Blockchain network/ }) as HTMLInputElement;
    expect(privateOption.checked).toBe(true);
    expect(
      screen.getByRole('switch', { name: /Publish chosen records to the public-access chain/ }),
    ).toBeInTheDocument();
  });

  it('never asks the question for Government', () => {
    render(<Harness application="government" />);
    expect(screen.queryByRole('radio')).toBeNull();
    const statement = screen.getByTestId('track-statement');
    expect(statement.textContent).toContain('Private Blockchain network');
    expect(statement.textContent).toContain('Cerulea for Government');
  });

  it('lets a Dapps user override the network and states the reason', async () => {
    render(<Harness application="dapps" />);
    await userEvent.click(screen.getByRole('radio', { name: /Private Blockchain network/ }));
    expect(screen.getByText(/We set this network by hand/)).toBeInTheDocument();
    const privateOption = screen.getByRole('radio', { name: /Private Blockchain network/ }) as HTMLInputElement;
    expect(privateOption.checked).toBe(true);
  });

  it('carries the publishing choice back', async () => {
    const seen: boolean[] = [];
    render(<Harness application="enterprise" onPublish={(next) => seen.push(next)} />);
    await userEvent.click(
      screen.getByRole('switch', { name: /Publish chosen records to the public-access chain/ }),
    );
    expect(seen).toEqual([true]);
  });
});
