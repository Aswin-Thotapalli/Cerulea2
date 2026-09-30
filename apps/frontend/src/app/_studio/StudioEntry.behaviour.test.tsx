import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { EntryAnswer } from '@/components/studio/entry/EntryDoors';

/**
 * The door into Studio.
 *
 * A visitor holding a project lands in it. A visitor holding none meets the
 * three doors, and an answer from a door opens a new project. These tests
 * check the requests the door sends and the screen it shows for each case.
 */

vi.mock('@/components/studio/steps6/StudioProject', () => ({
  default: ({ projectId }: { projectId: string }) => (
    <div data-testid="studio-project">Project open: {projectId}</div>
  ),
}));

let nextAnswer: EntryAnswer;

vi.mock('@/components/studio/entry/EntryDoors', () => ({
  default: ({ onAnswer }: { onAnswer?: (answer: EntryAnswer) => void }) => (
    <button type="button" onClick={() => onAnswer?.(nextAnswer)}>
      Answer the door
    </button>
  ),
}));

import StudioEntry from './StudioEntry';

type Call = { url: string; method: string; body: unknown };
type Reply = { status: number; body: unknown };

function stubRoutes(answers: Record<string, Reply | (() => Promise<Response>)>) {
  const calls: Call[] = [];
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    calls.push({
      url,
      method,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
    });
    const answer = answers[`${method} ${url}`];
    if (typeof answer === 'function') return answer();
    if (!answer) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            error: {
              code: 'studio.route_absent',
              message: `Studio holds no route for ${method} ${url}.`,
              fix: 'Name a route the door calls.',
            },
          }),
          { status: 404, headers: { 'content-type': 'application/json' } },
        ),
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify(answer.body), {
        status: answer.status,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });
  return calls;
}

const heldState = {
  disclosureLevel: 2,
  foundation: {
    application: 'dapps',
    projectName: '',
    summary: '',
    track: 'blockchain',
    templateId: '',
    publishSelectedRecords: true,
  },
  compose: { outcomeIds: ['kept'], moduleIds: ['m-1'] },
  execution: { substrate: 'Native', reason: '' },
};

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  nextAnswer = {
    door: 'describe',
    description: 'Trace every shipment from farm to shop',
    track: 'dapp',
    templateId: 'tpl-supply',
    outcomeIds: ['trace', 'verify'],
    publishSelectedRecords: false,
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the door into Studio', { timeout: 30000 }, () => {
  it('opens the project the address names without reading the listing', async () => {
    const calls = stubRoutes({});
    render(<StudioEntry projectId="p-named" />);
    expect(await screen.findByTestId('studio-project')).toHaveTextContent('Project open: p-named');
    expect(calls).toHaveLength(0);
  });

  it('opens the newest project and writes it into the address', async () => {
    const calls = stubRoutes({
      'GET /api/projects': {
        status: 200,
        body: {
          projects: [
            { projectId: 'p-new', name: 'Newest', workspaceId: 'w', workspaceApplication: 'dapps', updatedAt: '' },
            { projectId: 'p-old', name: 'Older', workspaceId: 'w', workspaceApplication: 'dapps', updatedAt: '' },
          ],
        },
      },
    });
    render(<StudioEntry />);
    expect(screen.getByText('Cerulea is reading your work.')).toBeInTheDocument();
    expect(await screen.findByTestId('studio-project')).toHaveTextContent('Project open: p-new');
    expect(window.location.search).toBe('?project=p-new');
    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual(['GET /api/projects']);
  });

  it('shows the three doors when the visitor holds no project', async () => {
    stubRoutes({ 'GET /api/projects': { status: 200, body: { projects: [] } } });
    render(<StudioEntry />);
    expect(await screen.findByRole('button', { name: 'Answer the door' })).toBeInTheDocument();
    expect(screen.queryByTestId('studio-project')).toBeNull();
  });

  it('opens a project from a door answer and writes the answer into the build state', async () => {
    const calls = stubRoutes({
      'GET /api/projects': { status: 200, body: { projects: [] } },
      'POST /api/projects': { status: 201, body: { project: { projectId: 'p 7' } } },
      'GET /api/projects/p%207/build-state': { status: 200, body: { buildState: heldState } },
      'PUT /api/projects/p%207/build-state': { status: 200, body: { saved: true } },
    });
    render(<StudioEntry />);
    await userEvent.click(await screen.findByRole('button', { name: 'Answer the door' }));
    expect(await screen.findByTestId('studio-project')).toHaveTextContent('Project open: p 7');

    const created = calls.find((call) => call.method === 'POST');
    expect(created?.body).toEqual({
      name: 'Trace every shipment from farm to shop',
      summary: 'Trace every shipment from farm to shop',
    });
    const written = calls.find((call) => call.method === 'PUT');
    expect(written?.body).toEqual({
      buildState: {
        ...heldState,
        disclosureLevel: 1,
        foundation: {
          ...heldState.foundation,
          projectName: 'Trace every shipment from farm to shop',
          summary: 'Trace every shipment from farm to shop',
          track: 'dapp',
          templateId: 'tpl-supply',
          publishSelectedRecords: false,
        },
        compose: { ...heldState.compose, outcomeIds: ['trace', 'verify'] },
      },
    });
    expect(window.location.search).toBe('?project=p%207');
  });

  it('names an unnamed project and keeps the held track when the answer carries none', async () => {
    nextAnswer = {
      door: 'fresh',
      track: undefined as unknown as EntryAnswer['track'],
      templateId: undefined as unknown as string,
      publishSelectedRecords: undefined as unknown as boolean,
    };
    const calls = stubRoutes({
      'GET /api/projects': { status: 200, body: { projects: [] } },
      'POST /api/projects': { status: 201, body: { project: { projectId: 'p-8' } } },
      'GET /api/projects/p-8/build-state': { status: 200, body: { buildState: heldState } },
      'PUT /api/projects/p-8/build-state': { status: 200, body: { saved: true } },
    });
    render(<StudioEntry />);
    await userEvent.click(await screen.findByRole('button', { name: 'Answer the door' }));
    await screen.findByTestId('studio-project');

    expect(calls.find((call) => call.method === 'POST')?.body).toEqual({
      name: 'New system',
      summary: '',
    });
    const written = calls.find((call) => call.method === 'PUT')?.body as {
      buildState: typeof heldState;
    };
    expect(written.buildState.disclosureLevel).toBe(2);
    expect(written.buildState.foundation).toMatchObject({
      projectName: 'New system',
      track: 'blockchain',
      templateId: '',
      publishSelectedRecords: true,
    });
    expect(written.buildState.compose.outcomeIds).toEqual([]);
  });

  it('shows the opening notice while the project is being created', async () => {
    let release: (value: Response) => void = () => undefined;
    stubRoutes({
      'GET /api/projects': { status: 200, body: { projects: [] } },
      'POST /api/projects': () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    });
    render(<StudioEntry />);
    await userEvent.click(await screen.findByRole('button', { name: 'Answer the door' }));
    expect(await screen.findByText('Cerulea is opening the project.')).toBeInTheDocument();
    release(
      new Response(JSON.stringify({ error: { message: 'The workspace is full.', fix: 'Close a project first.' } }), {
        status: 409,
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(await screen.findByText('The workspace is full. Close a project first.')).toBeInTheDocument();
    expect(screen.getByText('Close a project first.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Answer the door' })).toBeInTheDocument();
  });

  it('shows the message and the fix a failed listing named', async () => {
    stubRoutes({
      'GET /api/projects': {
        status: 503,
        body: {
          error: {
            code: 'projects.absent',
            message: 'Cerulea APIs is starting.',
            fix: 'Open Studio again in a minute.',
          },
        },
      },
    });
    render(<StudioEntry />);
    expect(
      await screen.findByText('Cerulea APIs is starting. Open Studio again in a minute.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Open Studio again in a minute.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Answer the door' })).toBeInTheDocument();
  });

  it('offers the general fix when the network itself fails and reloads on request', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new Error('The network dropped.')));
    const reload = vi.fn();
    vi.stubGlobal('location', { href: 'http://localhost/', reload });
    render(<StudioEntry />);
    expect(await screen.findByText('The network dropped.')).toBeInTheDocument();
    expect(
      screen.getByText('Open Studio again. Report the problem to the Cerulea operator when it repeats.'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Open again' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('describes a thrown value that is no error', async () => {
    vi.stubGlobal('fetch', () => Promise.reject('offline'));
    render(<StudioEntry />);
    expect(await screen.findByText('offline')).toBeInTheDocument();
  });
});
