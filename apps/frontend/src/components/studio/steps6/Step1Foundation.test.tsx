import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Step1Foundation from './Step1Foundation';

const project = {
  projectId: 'p-1',
  name: 'Berth register',
  summary: 'A register of berths.',
  state: 'draft',
  headVersion: 1,
};

const buildState = {
  version: 1,
  foundation: {
    projectName: 'Berth register',
    summary: 'A register of berths.',
    application: 'enterprise',
    track: 'blockchain',
    trackOverridden: false,
    templateId: '',
    publishSelectedRecords: false,
    blockSeconds: 3,
    historyRetentionDays: 3650,
  },
  compose: { outcomeIds: [], moduleIds: [], removedModuleIds: [], chosenLinks: [] },
  policies: { answers: {}, chosenProfileId: '' },
  execution: { substrate: 'Native', reason: '' },
  steps: {
    foundation: false,
    compose: false,
    model: false,
    policies: false,
    interfaceAuthoring: false,
    verify: false,
  },
  wizardComplete: false,
  wizardCompletedAt: '',
};

function stubFetch() {
  const calls: { url: string; init?: RequestInit }[] = [];
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const answer = (body: unknown) =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    if (url.endsWith('/build-state')) {
      return answer(init?.method === 'PUT' ? { buildState } : { buildState });
    }
    if (url.includes('/blueprint')) {
      return answer(
        init?.method === 'PUT'
          ? { blueprint: { version: 2 }, created: true }
          : { version: 1, document: { name: 'Berth register', summary: 'A register of berths.' } },
      );
    }
    if (url === '/api/workspaces') {
      return answer({ workspaces: [{ workspaceId: 'w-1', name: 'Port authority', application: 'enterprise' }] });
    }
    return answer({ project });
  });
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Step 1 Foundation', () => {
  it('opens populated rather than blank', async () => {
    stubFetch();
    render(<Step1Foundation projectId="p-1" />);
    await waitFor(() =>
      expect(screen.getByDisplayValue('Berth register')).toBeInTheDocument(),
    );
    expect(screen.getByDisplayValue('A register of berths.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Port authority')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3650')).toBeInTheDocument();
  });

  it('states what every technical control does and what breaks without it', async () => {
    stubFetch();
    render(<Step1Foundation projectId="p-1" />);
    await waitFor(() =>
      expect(
        screen.getByText(/Cerulea gathers transactions and commits them together/),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(/raises message volume across validators/)).toBeInTheDocument();
    expect(screen.getByText(/Every node keeps the history for this long/)).toBeInTheDocument();
    expect(screen.getByText(/lowers storage cost and stops an audit reaching further back/)).toBeInTheDocument();
  });

  it('states the network it derived and the reason behind it', async () => {
    stubFetch();
    render(<Step1Foundation projectId="p-1" />);
    await waitFor(() =>
      expect(screen.getByText(/Cerulea for Enterprise/)).toBeInTheDocument(),
    );
    expect(screen.getByText(/keeps records private by default/)).toBeInTheDocument();
  });

  it('names the fix on a value outside the bounds and holds the save closed', async () => {
    stubFetch();
    render(<Step1Foundation projectId="p-1" />);
    await waitFor(() => expect(screen.getByDisplayValue('3')).toBeInTheDocument());
    const field = screen.getByDisplayValue('3');
    await userEvent.clear(field);
    await userEvent.type(field, '90');
    await waitFor(() =>
      expect(screen.getByText('Lower this to at most 60 seconds.')).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Save and continue' })).toBeDisabled();
  });

  it('saves the foundation to the build state and the Blueprint', async () => {
    const calls = stubFetch();
    render(<Step1Foundation projectId="p-1" />);
    await waitFor(() => expect(screen.getByDisplayValue('Berth register')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    await waitFor(() =>
      expect(
        calls.some((call) => call.url.endsWith('/build-state') && call.init?.method === 'PUT'),
      ).toBe(true),
    );
    const saved = calls.find(
      (call) => call.url.endsWith('/build-state') && call.init?.method === 'PUT',
    );
    const body = JSON.parse(String(saved?.init?.body));
    expect(body.buildState.steps.foundation).toBe(true);
    expect(body.buildState.foundation.blockSeconds).toBe(3);
  });
});
