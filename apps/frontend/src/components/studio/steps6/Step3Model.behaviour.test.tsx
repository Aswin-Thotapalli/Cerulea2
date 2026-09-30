import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import Step3Model, { MODEL_SURFACES } from './Step3Model';
import { applyComposition, composeSections } from '@/lib/blueprint/compose';
import { readBlueprintDocument } from '@/lib/blueprint/document';
import type { BuildState } from '@/lib/studio/project-state';

const blueprint = applyComposition(
  readBlueprintDocument({ name: 'Berth register' }),
  composeSections(['wallet-auth']),
  [],
);

const buildState: BuildState = {
  version: 1,
  disclosureLevel: 3,
  foundation: {
    projectName: 'Berth register',
    summary: '',
    application: 'enterprise',
    track: 'blockchain',
    trackOverridden: false,
    templateId: '',
    publishSelectedRecords: false,
    blockSeconds: 3,
    historyRetentionDays: 3650,
  },
  compose: {
    outcomeIds: [],
    moduleIds: ['analytics', 'emails'],
    removedModuleIds: [],
    chosenLinks: [
      { kind: 'feeds', from: 'wallet-auth', to: 'analytics' },
      { kind: 'triggers', from: 'analytics', to: 'emails' },
    ],
  },
  policies: { answers: {}, chosenProfileId: '' },
  execution: { substrate: 'Native', reason: '' },
  steps: {
    foundation: true,
    compose: true,
    model: false,
    policies: false,
    interfaceAuthoring: false,
    verify: false,
  },
  wizardComplete: false,
  wizardCompletedAt: '',
};

type Call = { url: string; method: string; body: unknown };

function stubFetch(options: { refuseBlueprint?: boolean } = {}) {
  const calls: Call[] = [];
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ url, method, body });
    const answer = (payload: unknown, status = 200) =>
      Promise.resolve(
        new Response(JSON.stringify(payload), {
          status,
          headers: { 'content-type': 'application/json' },
        }),
      );
    if (url.endsWith('/build-state')) {
      return answer(
        method === 'PUT' ? { buildState: (body as { buildState: BuildState }).buildState } : { buildState },
      );
    }
    if (url.endsWith('/blueprint')) {
      if (method === 'PUT') {
        return options.refuseBlueprint
          ? answer(
              {
                error: {
                  code: 'blueprint.version_conflict',
                  message: 'Another person saved this Blueprint first.',
                  fix: 'Open the project again and repeat the change.',
                },
              },
              409,
            )
          : answer({ blueprint: { version: 5 } });
      }
      return answer({ version: 4, document: blueprint });
    }
    return answer({
      project: {
        projectId: 'p-7',
        name: 'Berth register',
        summary: '',
        state: 'draft',
        headVersion: 4,
      },
    });
  });
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Step 3 Model', { timeout: 60000 }, () => {
  it('opens on the records surface once the project arrives', async () => {
    const calls = stubFetch();
    render(<Step3Model projectId="p-7" />);
    expect(screen.getByText('Cerulea is opening the model.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Step 3 of 6')).toBeInTheDocument());
    expect(screen.getByText(MODEL_SURFACES[0].note)).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(calls.map((call) => call.url)).toEqual(
      expect.arrayContaining([
        '/api/projects/p-7',
        '/api/projects/p-7/blueprint',
        '/api/projects/p-7/build-state',
      ]),
    );
  });

  it('moves between the four surfaces and states what each one covers', async () => {
    stubFetch();
    render(<Step3Model projectId="p-7" />);
    await waitFor(() => expect(screen.getByText('Step 3 of 6')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('tab', { name: 'Permissions' }));
    expect(screen.getByText('Who reaches what.')).toBeInTheDocument();
    expect(
      screen.getByText('A role reaches nothing until this matrix says so'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Rules and actions' }));
    expect(screen.getByText('What the system does, and what it refuses.')).toBeInTheDocument();
    expect(screen.getByLabelText('Analytics triggers Transactional Emails')).toBeChecked();

    fireEvent.click(screen.getByRole('tab', { name: 'Workflows' }));
    expect(screen.getByText('How a record moves through its states.')).toBeInTheDocument();
    expect(screen.getByText('A workflow gives a record an order')).toBeInTheDocument();
  });

  it('opens on the surface the caller names', async () => {
    stubFetch();
    render(<Step3Model projectId="p-7" surface="workflows" />);
    await waitFor(() =>
      expect(screen.getByText('A workflow gives a record an order')).toBeInTheDocument(),
    );
    expect(screen.getByRole('tab', { name: 'Workflows' })).toHaveAttribute('aria-selected', 'true');
  });

  it('saves the Blueprint then the build state and reports that it saved', async () => {
    const calls = stubFetch();
    const onContinue = vi.fn();
    render(<Step3Model projectId="p-7" onContinue={onContinue} />);
    await waitFor(() => expect(screen.getByText('Step 3 of 6')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Save the model' }));
    await waitFor(() =>
      expect(screen.getByText(/^Cerulea saved the model as version \d+\.$/)).toBeInTheDocument(),
    );
    expect(onContinue).toHaveBeenCalledTimes(1);

    const blueprintWrite = calls.find(
      (call) => call.method === 'PUT' && call.url.endsWith('/blueprint'),
    );
    expect(blueprintWrite?.body).toMatchObject({
      note: 'Changed the model on the entities surface',
      expectedVersion: 4,
    });
    const buildWrite = calls.find(
      (call) => call.method === 'PUT' && call.url.endsWith('/build-state'),
    );
    const written = (buildWrite?.body as { buildState: BuildState }).buildState;
    expect(written.compose.chosenLinks).toEqual([
      { kind: 'feeds', from: 'wallet-auth', to: 'analytics' },
      { kind: 'triggers', from: 'analytics', to: 'emails' },
    ]);
    expect(written.steps.model).toBe(false);
  });

  it('marks the step done once a collection carries a permission', async () => {
    const calls = stubFetch();
    render(<Step3Model projectId="p-7" surface="permissions" />);
    await waitFor(() => expect(screen.getByLabelText('Read for Owner on User')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Read for Owner on User'));
    fireEvent.click(screen.getByRole('button', { name: 'Save the model' }));
    await waitFor(() =>
      expect(calls.some((call) => call.method === 'PUT' && call.url.endsWith('/build-state'))).toBe(
        true,
      ),
    );
    const blueprintWrite = calls.find(
      (call) => call.method === 'PUT' && call.url.endsWith('/blueprint'),
    );
    const document = (blueprintWrite?.body as { document: { permissions: { id: string }[] } })
      .document;
    expect(document.permissions.map((entry) => entry.id)).toEqual(['owner_on_user']);
    expect(blueprintWrite?.body).toMatchObject({
      note: 'Changed the model on the permissions surface',
    });
    const buildWrite = calls.find(
      (call) => call.method === 'PUT' && call.url.endsWith('/build-state'),
    );
    expect((buildWrite?.body as { buildState: BuildState }).buildState.steps.model).toBe(true);
  });

  it('writes the triggers a person switched off', async () => {
    const calls = stubFetch();
    render(<Step3Model projectId="p-7" surface="logic" />);
    await waitFor(() =>
      expect(screen.getByLabelText('Analytics triggers Transactional Emails')).toBeChecked(),
    );
    fireEvent.click(screen.getByLabelText('Analytics triggers Transactional Emails'));
    expect(screen.getByLabelText('Analytics triggers Transactional Emails')).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Save the model' }));
    await waitFor(() =>
      expect(calls.some((call) => call.method === 'PUT' && call.url.endsWith('/build-state'))).toBe(
        true,
      ),
    );
    const buildWrite = calls.find(
      (call) => call.method === 'PUT' && call.url.endsWith('/build-state'),
    );
    expect((buildWrite?.body as { buildState: BuildState }).buildState.compose.chosenLinks).toEqual(
      [{ kind: 'feeds', from: 'wallet-auth', to: 'analytics' }],
    );
  });

  it('names the failure and its fix and leaves the build state alone when the Blueprint save fails', async () => {
    const calls = stubFetch({ refuseBlueprint: true });
    const onContinue = vi.fn();
    render(<Step3Model projectId="p-7" onContinue={onContinue} />);
    await waitFor(() => expect(screen.getByText('Step 3 of 6')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Save the model' }));
    await waitFor(() =>
      expect(screen.getByText('Another person saved this Blueprint first.')).toBeInTheDocument(),
    );
    expect(screen.getByText('Open the project again and repeat the change.')).toBeInTheDocument();
    expect(calls.some((call) => call.method === 'PUT' && call.url.endsWith('/build-state'))).toBe(
      false,
    );
    expect(onContinue).not.toHaveBeenCalled();
    expect(screen.queryByText(/Cerulea saved the model/)).not.toBeInTheDocument();
  });

  it('clears the saved notice when a person closes it', async () => {
    stubFetch();
    render(<Step3Model projectId="p-7" />);
    await waitFor(() => expect(screen.getByText('Step 3 of 6')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Save the model' }));
    await waitFor(() =>
      expect(screen.getByText(/^Cerulea saved the model as version \d+\.$/)).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(
      screen.queryByText(/^Cerulea saved the model as version \d+\.$/),
    ).not.toBeInTheDocument();
  });
});
