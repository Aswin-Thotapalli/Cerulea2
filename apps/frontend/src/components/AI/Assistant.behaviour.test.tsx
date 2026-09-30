import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import type { Card } from '@/lib/intelligence/types';

/**
 * The chat surface for Cerulea Intelligence, past the first question.
 *
 * These tests cover the thread history, the four card actions beyond apply,
 * the keyboard and the failures each request can meet. Each one checks the
 * request the surface sent and what the surface showed after it.
 */

vi.mock('next/navigation', () => ({ usePathname: () => '/project-health/parts' }));

vi.mock('@/context/StudioContext', () => ({
  useStudio: () => ({
    projectId: 'p-1',
    selectedOutcomes: ['trace crates'],
    selectedModules: ['identity'],
  }),
}));

import Assistant from './Assistant';

type Call = { url: string; method: string; body: unknown };
type Answer = { status: number; body: unknown } | (() => Promise<Response>);

function stubRoutes(answers: Record<string, Answer>) {
  const calls: Call[] = [];
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    calls.push({ url, method, body: typeof init?.body === 'string' ? JSON.parse(init.body) : null });
    const answer = answers[`${method} ${url}`];
    if (typeof answer === 'function') return answer();
    if (!answer) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            error: { code: 'studio.route_absent', message: `No route for ${method} ${url}.`, fix: 'Name a route.' },
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

const diff: Card = {
  kind: 'diff',
  title: 'Add the verification endpoint',
  summary: 'We add one public endpoint a buyer reads.',
  patchId: 'patch 1',
  before: 'endpoints: 4',
  after: 'endpoints: 5',
  plain: 'A buyer checks a record without signing in.',
  applyUrl: '/intelligence/patches/patch-1/apply',
  discardUrl: '/intelligence/patches/patch-1/discard',
};

const form: Card = {
  kind: 'form',
  title: 'Name the collection',
  summary: 'We need one name before we add the records.',
  formId: 'form-1',
  submitLabel: 'Use this name',
  fields: [
    { name: 'collection', label: 'Collection name', plain: 'The name a person reads.', kind: 'text', required: true },
    { name: 'note', label: 'Note', plain: 'A note for the reviewer.', kind: 'text', required: false },
  ],
};

const choice: Card = {
  kind: 'choice',
  title: 'Pick the retention period',
  summary: 'We keep a record for the period we pick.',
  choiceId: 'choice-1',
  options: [
    { id: 'short', label: 'One year', plain: 'We remove a record after one year.' },
    { id: 'long', label: 'Seven years', plain: 'We keep a record for seven years.', recommended: true },
  ],
};

const preview: Card = {
  kind: 'preview',
  title: 'The buyer screen',
  summary: 'We show the screen a buyer opens.',
  screen: 'Buyer verification',
  href: '/?project=p-1&screen=buyer',
  lines: ['A buyer reads one record.'],
};

const thread = {
  'POST /api/intelligence/threads': { status: 200, body: { threadId: 'thread-1' } },
  'GET /api/intelligence/threads/thread-1': {
    status: 200,
    body: { threadId: 'thread-1', projectId: 'p-1', turns: [] },
  },
};

function withReply(cards: Card[]) {
  return {
    ...thread,
    'POST /api/intelligence/threads/thread-1/messages': {
      status: 200,
      body: { messageId: 'message-1', cards },
    },
  };
}

async function openAndAsk() {
  await userEvent.click(screen.getByRole('button', { name: 'Open Cerulea Intelligence' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Which parts does this system need?' }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the chat surface after the first question', { timeout: 30000 }, () => {
  it('opens the thread against the open project and sends the screen and the selection', async () => {
    const calls = stubRoutes(withReply([diff]));
    render(<Assistant />);
    await openAndAsk();
    await screen.findByText('We add one public endpoint a buyer reads.');

    expect(calls.find((call) => call.url === '/api/intelligence/threads')?.body).toEqual({ projectId: 'p-1' });
    expect(calls.find((call) => call.url.endsWith('/messages'))?.body).toEqual({
      text: 'Which parts does this system need?',
      interfaceState: {
        screen: 'project health',
        selection: ['trace crates', 'identity'],
        validationErrors: [],
        recentActions: [],
      },
    });
    expect(screen.getByText('Which parts does this system need?')).toBeInTheDocument();
    expect(screen.queryByText('Questions people ask first')).toBeNull();
  });

  it('shows the turns a thread already holds in the dark theme', async () => {
    stubRoutes({
      ...thread,
      'GET /api/intelligence/threads/thread-1': {
        status: 200,
        body: {
          threadId: 'thread-1',
          projectId: 'p-1',
          turns: [
            { messageId: 'm-1', role: 'person', text: 'What does the Blueprint hold?', cards: [] },
            { messageId: 'm-2', role: 'cerulea', text: 'Twelve sections, four filled.', cards: [preview] },
          ],
        },
      },
    });
    render(
      <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
        <Assistant />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Open Cerulea Intelligence' }));
    expect(await screen.findByText('Twelve sections, four filled.')).toBeInTheDocument();
    expect(screen.getByText('What does the Blueprint hold?')).toBeInTheDocument();
    expect(screen.getByText('Buyer verification')).toBeInTheDocument();
    expect(screen.queryByText('We are ready for the first question')).toBeNull();
  });

  it('names the failure when the thread history cannot be read', async () => {
    stubRoutes({
      ...thread,
      'GET /api/intelligence/threads/thread-1': () => Promise.reject(new Error('history offline')),
    });
    render(<Assistant />);
    await userEvent.click(screen.getByRole('button', { name: 'Open Cerulea Intelligence' }));
    expect(await screen.findByText('history offline')).toBeInTheDocument();
    expect(
      screen.getByText('Ask again. Report the problem to the Cerulea operator when it repeats.'),
    ).toBeInTheDocument();
  });

  it('discards a patch and states that the Blueprint kept its state', async () => {
    const calls = stubRoutes({
      ...withReply([diff]),
      'POST /api/intelligence/patches/patch%201/discard': { status: 200, body: { discarded: true } },
    });
    render(<Assistant />);
    await openAndAsk();
    await userEvent.click(await screen.findByRole('button', { name: 'Discard' }));
    expect(
      await screen.findByText('Cerulea discarded the change. The Blueprint keeps the state it holds.'),
    ).toBeInTheDocument();
    expect(calls.at(-1)).toEqual({
      url: '/api/intelligence/patches/patch%201/discard',
      method: 'POST',
      body: {},
    });
  });

  it('names the failure when a discard is refused', async () => {
    stubRoutes({
      ...withReply([diff]),
      'POST /api/intelligence/patches/patch%201/discard': {
        status: 409,
        body: { error: { code: 'patch.gone', message: 'The change is already settled.', fix: 'Ask for a new change.' } },
      },
    });
    render(<Assistant />);
    await openAndAsk();
    await userEvent.click(await screen.findByRole('button', { name: 'Discard' }));
    expect(await screen.findByText('The change is already settled.')).toBeInTheDocument();
    expect(screen.getByText('Ask for a new change.')).toBeInTheDocument();
  });

  it('names the failure when an apply is refused', async () => {
    stubRoutes({
      ...withReply([diff]),
      'POST /api/intelligence/patches/patch%201/apply': {
        status: 409,
        body: { error: { code: 'patch.stale', message: 'The Blueprint moved on.', fix: 'Ask for the change again.' } },
      },
    });
    render(<Assistant />);
    await openAndAsk();
    await userEvent.click(await screen.findByRole('button', { name: 'Apply this change' }));
    expect(await screen.findByText('The Blueprint moved on.')).toBeInTheDocument();
    expect(screen.getByText('Ask for the change again.')).toBeInTheDocument();
  });

  it('turns a submitted form into the next question', async () => {
    const calls = stubRoutes(withReply([form]));
    render(<Assistant />);
    await openAndAsk();
    fireEvent.change(await screen.findByLabelText(/Collection name/), { target: { value: 'Crates' } });
    await userEvent.click(screen.getByRole('button', { name: 'Use this name' }));
    await waitFor(() => expect(calls.filter((call) => call.url.endsWith('/messages'))).toHaveLength(2));
    const second = calls.filter((call) => call.url.endsWith('/messages'))[1];
    expect((second.body as { text: string }).text).toBe('Name the collection. Collection name: Crates. Note:');
    expect(await screen.findByText('Name the collection. Collection name: Crates. Note:')).toBeInTheDocument();
  });

  it('turns a taken option into the next question', async () => {
    const calls = stubRoutes(withReply([choice]));
    render(<Assistant />);
    await openAndAsk();
    await userEvent.click(await screen.findByRole('button', { name: 'Take this option' }));
    await waitFor(() => expect(calls.filter((call) => call.url.endsWith('/messages'))).toHaveLength(2));
    const second = calls.filter((call) => call.url.endsWith('/messages'))[1];
    expect((second.body as { text: string }).text).toBe('Pick the retention period. We take Seven years.');
  });

  it('opens the screen a preview card names', async () => {
    const assign = vi.fn();
    stubRoutes(withReply([preview]));
    render(<Assistant />);
    await openAndAsk();
    vi.stubGlobal('location', { assign, href: 'http://localhost/' });
    await userEvent.click(await screen.findByRole('button', { name: 'Open this screen' }));
    expect(assign).toHaveBeenCalledWith('/?project=p-1&screen=buyer');
  });

  it('sends on Enter, keeps a line break on Shift and Enter, and ignores a blank question', async () => {
    const calls = stubRoutes(withReply([]));
    render(<Assistant />);
    await userEvent.click(screen.getByRole('button', { name: 'Open Cerulea Intelligence' }));
    const box = await screen.findByLabelText('Ask Cerulea');
    expect(screen.getByRole('button', { name: 'Send the question' })).toBeDisabled();

    fireEvent.keyDown(box, { key: 'Enter' });
    fireEvent.change(box, { target: { value: 'Which roles hold records?' } });
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    expect(calls.filter((call) => call.url.endsWith('/messages'))).toHaveLength(0);

    fireEvent.keyDown(box, { key: 'Enter' });
    await waitFor(() => expect(calls.filter((call) => call.url.endsWith('/messages'))).toHaveLength(1));
    expect(await screen.findByText('Which roles hold records?')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Ask Cerulea')).toHaveValue(''));
  });

  it('sends the typed question through the send button', async () => {
    const calls = stubRoutes(withReply([]));
    render(<Assistant />);
    await userEvent.click(screen.getByRole('button', { name: 'Open Cerulea Intelligence' }));
    fireEvent.change(await screen.findByLabelText('Ask Cerulea'), { target: { value: '  What changed?  ' } });
    await userEvent.click(screen.getByRole('button', { name: 'Send the question' }));
    await waitFor(() => expect(calls.filter((call) => call.url.endsWith('/messages'))).toHaveLength(1));
    expect((calls.find((call) => call.url.endsWith('/messages'))?.body as { text: string }).text).toBe(
      'What changed?',
    );
  });

  it('keeps the question on screen and sends no message when no thread opens', async () => {
    const calls = stubRoutes({
      'POST /api/intelligence/threads': () => Promise.reject('threads offline'),
    });
    render(<Assistant />);
    await userEvent.click(screen.getByRole('button', { name: 'Open Cerulea Intelligence' }));
    expect(await screen.findByText('threads offline')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Ask Cerulea'), { target: { value: 'Is anyone there?' } });
    await userEvent.click(screen.getByRole('button', { name: 'Send the question' }));
    expect(await screen.findByText('Is anyone there?')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Ask Cerulea')).toBeEnabled());
    expect(calls.filter((call) => call.url.endsWith('/messages'))).toHaveLength(0);
  });

  it('names the failure when a message is refused', async () => {
    stubRoutes({
      ...thread,
      'POST /api/intelligence/threads/thread-1/messages': {
        status: 503,
        body: { error: { code: 'model.busy', message: 'The model is busy.', fix: 'Ask again in a moment.' } },
      },
    });
    render(<Assistant />);
    await openAndAsk();
    expect(await screen.findByText('The model is busy.')).toBeInTheDocument();
    expect(screen.getByText('Ask again in a moment.')).toBeInTheDocument();
  });

  it('closes the drawer and brings the launcher back', async () => {
    stubRoutes(thread);
    render(<Assistant />);
    await userEvent.click(screen.getByRole('button', { name: 'Open Cerulea Intelligence' }));
    expect(screen.queryByRole('button', { name: 'Open Cerulea Intelligence' })).toBeNull();
    const drawer = await screen.findByRole('presentation');
    await userEvent.click(within(drawer).getByRole('button', { name: 'Close Cerulea Intelligence' }));
    expect(await screen.findByRole('button', { name: 'Open Cerulea Intelligence' })).toBeInTheDocument();
  });
});
