import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Step2Compose from './Step2Compose';

const buildState = {
  version: 1,
  foundation: {
    projectName: 'Berth register',
    summary: '',
    application: 'dapps',
    track: 'dapp',
    trackOverridden: false,
    templateId: '',
    publishSelectedRecords: false,
    blockSeconds: 3,
    historyRetentionDays: 900,
  },
  compose: {
    outcomeIds: ['outcome:wallet-auth'],
    moduleIds: [],
    removedModuleIds: [],
    chosenLinks: [],
  },
  policies: { answers: {}, chosenProfileId: '' },
  execution: { substrate: 'Native', reason: '' },
  steps: {
    foundation: true,
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
    if (url.endsWith('/build-state')) return answer({ buildState });
    if (url.includes('/blueprint')) {
      return answer(
        init?.method === 'PUT'
          ? { blueprint: { version: 2 }, created: true }
          : { version: 1, document: { name: 'Berth register' } },
      );
    }
    return answer({
      project: {
        projectId: 'p-1',
        name: 'Berth register',
        summary: '',
        state: 'draft',
        headVersion: 1,
      },
    });
  });
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Step 2 Compose', () => {
  it('opens on the outcomes already selected and draws the map Cerulea assembled', { timeout: 40000 }, async () => {
    stubFetch();
    render(<Step2Compose projectId="p-1" />);
    await waitFor(
      () => expect(screen.getByText('What Cerulea assembled')).toBeInTheDocument(),
      { timeout: 15000 },
    );
  });

  it('states the records the selection installs into the model', { timeout: 40000 }, async () => {
    stubFetch();
    render(<Step2Compose projectId="p-1" />);
    await waitFor(
      () => expect(screen.getByText('What this installs into the model')).toBeInTheDocument(),
      { timeout: 15000 },
    );
    expect(screen.getByText('Every user the system keeps.')).toBeInTheDocument();
  });

  it('saves the selection to the build state and the records to the Blueprint', { timeout: 40000 }, async () => {
    const calls = stubFetch();
    render(<Step2Compose projectId="p-1" />);
    await waitFor(
      () => expect(screen.getByText('What Cerulea assembled')).toBeInTheDocument(),
      { timeout: 15000 },
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }));
    await waitFor(
      () =>
        expect(
          calls.some((call) => call.url.includes('/blueprint') && call.init?.method === 'PUT'),
        ).toBe(true),
      { timeout: 15000 },
    );
    const savedState = calls.find(
      (call) => call.url.endsWith('/build-state') && call.init?.method === 'PUT',
    );
    const stateBody = JSON.parse(String(savedState?.init?.body));
    expect(stateBody.buildState.compose.outcomeIds).toEqual(['outcome:wallet-auth']);
    expect(stateBody.buildState.compose.moduleIds.length).toBeGreaterThan(0);
    expect(stateBody.buildState.steps.compose).toBe(true);

    const savedBlueprint = calls.find(
      (call) => call.url.includes('/blueprint') && call.init?.method === 'PUT',
    );
    const blueprintBody = JSON.parse(String(savedBlueprint?.init?.body));
    const ids = blueprintBody.document.collections.map((entry: { id: string }) => entry.id);
    expect(ids).toContain('user');
    expect(blueprintBody.document.collections[0].retention.period_days).toBe(900);
  });
});
