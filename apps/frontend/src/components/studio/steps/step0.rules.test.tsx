import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { deriveTrack } from '@/lib/track/derive';
import { PHASE_TO_SUBSTEP, dappAccess, nameFromSentence } from './step0';
import DescribeDoor, { type ProposalReply } from './step0-DescribeDoor';
import NetworkPanel from './step0-NetworkPanel';

describe('the Foundation rules', () => {
  it('names a project from the first words of the sentence', () => {
    expect(nameFromSentence('we track every handling step of a shipment and let a buyer verify it.')).toBe('We track every handling step of');
    expect(nameFromSentence('Hi')).toBe('New system');
  });

  it('reads what the Dapps tier opens', () => {
    expect(dappAccess('public_dapps')).toEqual({ publicDapp: true, privateDapp: false });
    expect(dappAccess('private_dapps')).toEqual({ publicDapp: false, privateDapp: true });
    expect(dappAccess('pro')).toEqual({ publicDapp: true, privateDapp: true });
    expect(dappAccess('plan_starter')).toEqual({ publicDapp: true, privateDapp: false });
    expect(dappAccess(null)).toEqual({ publicDapp: true, privateDapp: false });
  });

  it('reports the Describe it door as the first sub-step and the details as the last', () => {
    expect(PHASE_TO_SUBSTEP.describe).toBe(0);
    expect(PHASE_TO_SUBSTEP['dapp-type']).toBe(PHASE_TO_SUBSTEP['legacy-question']);
    expect(PHASE_TO_SUBSTEP.details).toBe(4);
  });
});

describe('the network panel', () => {
  it('shows the division badge, the two properties with their sentences and a fix out of bounds', async () => {
    const onBlock = vi.fn();
    render(
      <NetworkPanel
        division="enterprise"
        derivation={deriveTrack('enterprise')}
        onDerivationChange={() => undefined}
        publishSelected={false}
        onPublishSelectedChange={() => undefined}
        planNote={null}
        blockSeconds={3}
        onBlockSecondsChange={onBlock}
        historyRetentionDays={99999}
        onHistoryRetentionDaysChange={() => undefined}
      />,
    );
    expect(screen.getByTestId('division-badge')).toHaveTextContent('Cerulea for Enterprise');
    expect(screen.getByText(/Cerulea commits close to 20 blocks each minute/)).toBeInTheDocument();
    expect(screen.getByText(/Lower this to at most 36500 days/)).toBeInTheDocument();
    expect(screen.getByText(/Cerulea gathers transactions and commits them together/)).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /Publish chosen records/ })).toBeInTheDocument();
    await userEvent.clear(screen.getByTestId('block-seconds'));
    await userEvent.type(screen.getByTestId('block-seconds'), '5');
    expect(onBlock).toHaveBeenCalled();
  });

  it('shows the plan line beside a gated network', () => {
    render(
      <NetworkPanel
        division="dapp"
        derivation={deriveTrack('dapps')}
        onDerivationChange={() => undefined}
        publishSelected={false}
        onPublishSelectedChange={() => undefined}
        planNote="A private dApp needs the Private Dapps plan."
        blockSeconds={3}
        onBlockSecondsChange={() => undefined}
        historyRetentionDays={3650}
        onHistoryRetentionDaysChange={() => undefined}
      />,
    );
    expect(screen.getByTestId('plan-note')).toHaveTextContent('Private Dapps plan');
  });
});

const catalogueReply: ProposalReply = {
  ok: true,
  answeredBy: 'catalogue',
  note: 'The catalogue words answered.',
  applicationHint: null,
  proposal: {
    description: 'We track shipments.',
    empty: false,
    track: { track: 'blockchain', label: 'A private Blockchain network', reason: 'The closest templates run on a private Blockchain network.' },
    templates: [
      { id: 'chain-supply', title: 'Supply Chain', description: 'Track shipments.', projectType: 'blockchain', moduleIds: ['intake'], reason: 'Our description mentions shipments.' },
    ],
    outcomes: [
      { outcomeId: 'outcome:intake', moduleId: 'intake', statement: 'Record each arriving shipment', group: 'Records', projectType: 'blockchain', contribution: 'Every arrival is recorded.', removalConsequence: 'Nothing records arrivals.', reason: 'Our description mentions shipments.' },
      { outcomeId: 'outcome:inspection', moduleId: 'inspection', statement: 'Let an inspector sign before release', group: 'Quality', projectType: 'blockchain', contribution: 'An inspector signs.', removalConsequence: 'Nobody signs.', reason: 'Our description mentions inspector.' },
    ],
  },
};

const intelligenceReply: ProposalReply = {
  ...catalogueReply,
  answeredBy: 'intelligence',
  note: 'Cerulea Intelligence read the sentence and named these.',
  applicationHint: { application: 'government', reason: 'A public body keeps the register.' },
  proposal: {
    ...catalogueReply.proposal,
    templates: [
      { id: 'govt-register', title: 'Public Register', description: 'A register.', projectType: 'blockchain', moduleIds: ['register'], reason: 'A register fits a public body.' },
    ],
    outcomes: [catalogueReply.proposal.outcomes[1]],
  },
};

function askWith(slow: Promise<ProposalReply>) {
  return vi.fn((_projectId: string, _description: string, source: 'catalogue' | 'intelligence') =>
    source === 'catalogue' ? Promise.resolve(catalogueReply) : slow,
  );
}

describe('the Describe it door', () => {
  it('creates the project, shows the catalogue proposal at once and lets the Cerulea Intelligence answer replace it', async () => {
    let settle: (reply: ProposalReply) => void = () => undefined;
    const slow = new Promise<ProposalReply>((resolve) => { settle = resolve; });
    const ask = askWith(slow);
    const createProject = vi.fn(async () => 'proj_1');
    const onAccept = vi.fn();
    render(<DescribeDoor application="enterprise" projectId={null} createProject={createProject} onAccept={onAccept} onBrowse={() => undefined} ask={ask} />);

    await userEvent.type(screen.getByLabelText('What should this system do'), 'We track shipments.');
    await userEvent.click(screen.getByRole('button', { name: /Show what Cerulea proposes/ }));

    await waitFor(() => expect(screen.getByTestId('proposal-source')).toHaveTextContent('Cerulea Intelligence is reading the sentence'), { timeout: 15000 });
    expect(createProject).toHaveBeenCalledWith('We track shipments.');
    expect(ask).toHaveBeenCalledWith('proj_1', 'We track shipments.', 'catalogue');
    expect(ask).toHaveBeenCalledWith('proj_1', 'We track shipments.', 'intelligence');
    expect(screen.getAllByTestId('proposed-outcome')).toHaveLength(2);
    expect(screen.getByText('Supply Chain')).toBeInTheDocument();
    expect(screen.getByText(/The closest templates run on a private Blockchain network/)).toBeInTheDocument();

    settle(intelligenceReply);
    await waitFor(() => expect(screen.getByTestId('proposal-source')).toHaveTextContent('Cerulea Intelligence read the sentence'), { timeout: 15000 });
    expect(screen.getByText('Public Register')).toBeInTheDocument();
    expect(screen.getAllByTestId('proposed-outcome')).toHaveLength(1);
    expect(screen.getByText(/This reads like a Government system/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Start from this proposal/ }));
    expect(onAccept).toHaveBeenCalledTimes(1);
    const choice = onAccept.mock.calls[0][0];
    expect(choice.template.id).toBe('govt-register');
    expect(choice.outcomeIds).toEqual(['outcome:inspection']);
    expect(choice.derivation.track).toBe('blockchain');
  });

  it('keeps an adjusted proposal and offers the Cerulea Intelligence one beside it', async () => {
    let settle: (reply: ProposalReply) => void = () => undefined;
    const slow = new Promise<ProposalReply>((resolve) => { settle = resolve; });
    render(<DescribeDoor application="enterprise" projectId="proj_1" createProject={async () => 'proj_1'} onAccept={() => undefined} onBrowse={() => undefined} ask={askWith(slow)} />);
    await userEvent.type(screen.getByLabelText('What should this system do'), 'We track shipments.');
    await userEvent.click(screen.getByRole('button', { name: /Show what Cerulea proposes/ }));
    await waitFor(() => expect(screen.getAllByTestId('proposed-outcome')).toHaveLength(2), { timeout: 15000 });
    await userEvent.click(screen.getAllByTestId('proposed-outcome')[0]);
    settle(intelligenceReply);
    await waitFor(() => expect(screen.getByText(/Cerulea Intelligence proposes a different set/)).toBeInTheDocument(), { timeout: 15000 });
    expect(screen.getByText('Supply Chain')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Use it' }));
    await waitFor(() => expect(screen.getByText('Public Register')).toBeInTheDocument(), { timeout: 15000 });
  });

  it('opens the gallery instead on request', async () => {
    const onBrowse = vi.fn();
    render(<DescribeDoor application="dapps" projectId={null} createProject={async () => 'p'} onAccept={() => undefined} onBrowse={onBrowse} ask={askWith(Promise.resolve(catalogueReply))} />);
    await userEvent.click(screen.getByRole('button', { name: /Browse the templates instead/ }));
    expect(onBrowse).toHaveBeenCalledTimes(1);
  });
});
