import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Assistant, { describeFailure, screenName } from './Assistant';
import CardSurface, { type CardActions } from '@/components/studio/intelligence/CardSurface';
import { StudioProvider } from '@/context/StudioContext';
import { StudioRouteError } from '@/lib/apiClient';
import type { Card } from '@/lib/intelligence/types';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

type Reply = { status: number; body: unknown };

function stubRoutes(answers: Record<string, Reply>) {
  const seen: { url: string; method: string; body: unknown }[] = [];
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    seen.push({
      url,
      method,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
    });
    const answer = answers[`${method} ${url}`] ?? answers[url];
    if (!answer) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            error: {
              code: 'studio.route_absent',
              message: `Studio holds no route for ${method} ${url}.`,
              fix: 'Name a route the surface calls.',
              details: {},
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
  return seen;
}

function host() {
  return render(
    <StudioProvider>
      <Assistant />
    </StudioProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const everyKind: Card[] = [
  {
    kind: 'diff',
    title: 'Add the verification endpoint',
    summary: 'We add one public endpoint a buyer reads.',
    patchId: 'patch-1',
    before: 'endpoints: 4',
    after: 'endpoints: 5',
    plain: 'A buyer checks a record without signing in.',
    applyUrl: '/intelligence/patches/patch-1/apply',
    discardUrl: '/intelligence/patches/patch-1/discard',
  },
  {
    kind: 'form',
    title: 'Name the collection',
    summary: 'We need one name before we add the records.',
    formId: 'form-1',
    submitLabel: 'Use this name',
    fields: [
      {
        name: 'collection',
        label: 'Collection name',
        plain: 'The name a person reads on the screen.',
        kind: 'text',
        required: true,
      },
    ],
  },
  {
    kind: 'choice',
    title: 'Pick the retention period',
    summary: 'We keep a record for the period you pick.',
    choiceId: 'choice-1',
    options: [
      { id: 'short', label: 'One year', plain: 'We remove a record after one year.' },
      {
        id: 'long',
        label: 'Seven years',
        plain: 'We keep a record for seven years.',
        recommended: true,
      },
    ],
  },
  {
    kind: 'preview',
    title: 'The buyer screen',
    summary: 'We show the screen a buyer opens.',
    screen: 'Buyer verification',
    href: '/?project=p-1',
    lines: ['A buyer reads one record.'],
  },
  {
    kind: 'data',
    title: 'Roles in this project',
    summary: 'We read four roles from the Blueprint.',
    columns: ['Role', 'Records'],
    rows: [['Buyer', '2']],
  },
  {
    kind: 'progress',
    title: 'Checking the Blueprint',
    summary: 'We check every section in turn.',
    stage: 'Reading the permissions',
    completed: 3,
    total: 12,
    settled: false,
  },
  {
    kind: 'artefact',
    title: 'The Deployment Manifest',
    summary: 'We produced the document for the reviewer.',
    artefactId: 'artefact-1',
    name: 'manifest.docx',
    mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    href: '/api/projects/p-1/manifest/document',
  },
];

const noActions: CardActions = {
  applyPatch: () => undefined,
  discardPatch: () => undefined,
  submitForm: () => undefined,
  submitChoice: () => undefined,
  openScreen: () => undefined,
};

describe('the card surface', () => {
  it('renders a real component for every card kind', () => {
    const { container } = render(<CardSurface cards={everyKind} actions={noActions} />);
    for (const card of everyKind) {
      expect(container.querySelector(`[data-card-kind="${card.kind}"]`)).toBeTruthy();
    }
  });

  it('carries the plain summary of every card', () => {
    render(<CardSurface cards={everyKind} actions={noActions} />);
    for (const card of everyKind) {
      expect(screen.getByText(card.summary)).toBeInTheDocument();
    }
  });

  it('offers apply and discard on a diff card', async () => {
    const applied: string[] = [];
    const discarded: string[] = [];
    render(
      <CardSurface
        cards={[everyKind[0]]}
        actions={{
          ...noActions,
          applyPatch: (card) => applied.push(card.patchId),
          discardPatch: (card) => discarded.push(card.patchId),
        }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Apply this change' }));
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(applied).toEqual(['patch-1']);
    expect(discarded).toEqual(['patch-1']);
  });
});

describe('the chat surface', () => {
  it('opens a thread and renders the cards Cerulea emitted', async () => {
    const seen = stubRoutes({
      'POST /api/intelligence/threads': { status: 200, body: { threadId: 'thread-1' } },
      '/api/intelligence/threads/thread-1': {
        status: 200,
        body: { threadId: 'thread-1', projectId: 'p-1', turns: [] },
      },
      'POST /api/intelligence/threads/thread-1/messages': {
        status: 200,
        body: { messageId: 'message-1', cards: [everyKind[0]] },
      },
    });
    host();
    await userEvent.click(screen.getByRole('button', { name: 'Open Cerulea Intelligence' }));
    await waitFor(() => expect(seen.some((call) => call.url.endsWith('/threads'))).toBe(true));
    await userEvent.click(
      screen.getByRole('button', { name: 'What remains before we deploy?' }),
    );
    await waitFor(() =>
      expect(screen.getByText('We add one public endpoint a buyer reads.')).toBeInTheDocument(),
    );
    const sent = seen.find((call) => call.url.endsWith('/messages'));
    expect(sent?.body).toMatchObject({
      text: 'What remains before we deploy?',
      interfaceState: { screen: 'The project workspace' },
    });
  });

  it('shows the message Cerulea named together with its fix', async () => {
    stubRoutes({
      'POST /api/intelligence/threads': {
        status: 503,
        body: {
          error: {
            code: 'intelligence.absent',
            message: 'Cerulea Intelligence is starting.',
            fix: 'Open the surface again in a moment.',
            details: {},
          },
        },
      },
    });
    host();
    await userEvent.click(screen.getByRole('button', { name: 'Open Cerulea Intelligence' }));
    await waitFor(() =>
      expect(screen.getByText('Cerulea Intelligence is starting.')).toBeInTheDocument(),
    );
    expect(screen.getByText('Open the surface again in a moment.')).toBeInTheDocument();
  });

  it('invents no reply while the routes answer with a failure', async () => {
    stubRoutes({});
    host();
    await userEvent.click(screen.getByRole('button', { name: 'Open Cerulea Intelligence' }));
    await waitFor(() =>
      expect(screen.getByText(/Studio holds no route for POST/)).toBeInTheDocument(),
    );
    expect(document.querySelectorAll('[data-card-kind]')).toHaveLength(0);
  });

  it('applies a patch through the Studio proxy', async () => {
    const seen = stubRoutes({
      'POST /api/intelligence/threads': { status: 200, body: { threadId: 'thread-1' } },
      '/api/intelligence/threads/thread-1': {
        status: 200,
        body: { threadId: 'thread-1', projectId: 'p-1', turns: [] },
      },
      'POST /api/intelligence/threads/thread-1/messages': {
        status: 200,
        body: { messageId: 'message-1', cards: [everyKind[0]] },
      },
      'POST /api/intelligence/patches/patch-1/apply': {
        status: 200,
        body: { checkpointId: 'check-1', version: 4 },
      },
    });
    host();
    await userEvent.click(screen.getByRole('button', { name: 'Open Cerulea Intelligence' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'What remains before we deploy?' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Apply this change' })).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Apply this change' }));
    await waitFor(() => expect(screen.getByText(/checkpoint check-1/)).toBeInTheDocument());
    expect(seen.some((call) => call.url === '/api/intelligence/patches/patch-1/apply')).toBe(true);
  });
});

describe('the surface helpers', () => {
  it('splits the message from the fix a route named', () => {
    const failure = describeFailure(
      new StudioRouteError(
        {
          code: 'intelligence.absent',
          message: 'Cerulea Intelligence is starting.',
          fix: 'Ask again in a moment.',
          details: {},
        },
        503,
      ),
    );
    expect(failure).toEqual({
      message: 'Cerulea Intelligence is starting.',
      fix: 'Ask again in a moment.',
    });
  });

  it('names the screen in the words a person uses', () => {
    expect(screenName('/')).toBe('The project workspace');
    expect(screenName('/dashboard/networks')).toBe('dashboard');
    expect(screenName(null)).toBe('Studio');
  });
});
