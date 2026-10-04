import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { recordTypeOf } from '@/lib/blueprint/edit';
import type { Blueprint } from '@/lib/blueprint/types';
import Step2 from './step2';
import { harbourRegister } from './step2-fixture';
import { SAVE_DELAY_MS } from './step2-state';

vi.mock('next/navigation', () => ({ useRouter: () => ({ back: () => undefined }) }));

type Call = { url: string; method: string; body: Record<string, unknown> | null };

/** A Cerulea APIs stand in behind the two routes: one head document, one version counter. */
function fakeRoutes(start: Blueprint) {
  const state = { document: start, version: 3, calls: [] as Call[] };
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const impl = async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    const body = typeof init.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : null;
    state.calls.push({ url, method, body });
    const common = {
      ok: true,
      version: state.version,
      blueprintHash: `hash-${state.version}`,
      document: state.document,
      track: 'dapp',
      moduleIds: [],
    };
    if (url.endsWith('/schema') && method === 'GET') {
      return reply({ ...common, layout: { placement: {}, positions: {} }, seeded: false });
    }
    if (url.endsWith('/logic') && method === 'GET') {
      return reply({ ...common, layout: { drawings: {}, workflowPositions: {} } });
    }
    if (url.endsWith('/schema') && method === 'PUT') {
      if (body?.expectedVersion !== undefined && body.expectedVersion !== state.version) {
        return reply(
          {
            error: 'The Blueprint head moved. Read it again.',
            code: 'projects.version_moved',
            message: 'The Blueprint head moved.',
            fix: 'Read it again.',
            details: {},
          },
          409,
        );
      }
      if (body?.document) {
        state.document = body.document as Blueprint;
      } else if (body?.sections) {
        state.document = { ...state.document, ...(body.sections as Partial<Blueprint>) };
      }
      if (body?.document || body?.sections) state.version += 1;
      return reply({ ok: true, version: state.version, blueprintHash: `hash-${state.version}`, document: state.document, created: true });
    }
    if (url.endsWith('/logic') && method === 'PUT') {
      return reply({ ok: true, version: state.version, blueprintHash: `hash-${state.version}`, document: state.document, created: false });
    }
    return reply({ error: 'absent', code: 'route.absent', message: 'No such route.', fix: 'Call a route that exists.', details: {} }, 404);
  };
  return { state, impl: impl as unknown as typeof fetch };
}

describe('the Data schema step', () => {
  beforeEach(() => {
    // The first visit guidance stays closed, so the panels stay reachable.
    window.localStorage.setItem('guidance:dismissed:step2', '1');
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('edits at the Designer level, reads the same document at the Blueprint level and back', async () => {
    const routes = fakeRoutes(harbourRegister());
    vi.stubGlobal('fetch', routes.impl);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(<Step2 projectId="project_1" goNext={() => undefined} goPrev={() => undefined} />);

    // The step opens on the first module and its first entity.
    expect(await screen.findByLabelText('Entity name')).toHaveValue('Harbour');
    expect(screen.getByTestId('save-status')).toHaveTextContent('Version 3');

    // Level 3: open the berth and add a field named draught.
    await user.click(screen.getByRole('button', { name: 'Entity Berth' }));
    expect(screen.getByLabelText('Entity name')).toHaveValue('Berth');
    await user.click(screen.getByRole('button', { name: 'Add Field' }));
    fireEvent.change(screen.getByLabelText('Name of field 4'), { target: { value: 'draught' } });

    // The save follows the pause and carries the touched sections with the expected version.
    await act(async () => {
      vi.advanceTimersByTime(SAVE_DELAY_MS + 50);
    });
    await waitFor(() => expect(screen.getByTestId('save-status')).toHaveTextContent('Saved as version 4'));
    const put = routes.state.calls.find((call) => call.method === 'PUT' && call.url.endsWith('/schema'));
    expect(put?.body?.expectedVersion).toBe(3);
    expect(Object.keys(put?.body?.sections as object)).toEqual(['types']);
    const held = recordTypeOf(routes.state.document, routes.state.document.collections[1])!.fields;
    expect(held.map((field) => field.name)).toEqual(['id', 'length', 'status', 'draught']);

    // Level 4 reads the same document.
    await user.click(screen.getByRole('button', { name: 'Level 4, Blueprint' }));
    const text = screen.getByLabelText('The typed document') as HTMLTextAreaElement;
    expect(text.value).toContain('"draught"');
    expect(screen.getByTestId('schema-clean')).toBeInTheDocument();

    // Edit at level 4: a new description on the berth collection, saved as the whole document.
    const edited = text.value.replace('Every berth the register keeps.', 'Every berth along the quay.');
    fireEvent.change(text, { target: { value: edited } });
    await user.click(screen.getByRole('button', { name: 'Save the Blueprint' }));
    await waitFor(() => expect(routes.state.version).toBe(5));
    const whole = routes.state.calls.filter((call) => call.method === 'PUT' && call.body?.document).pop();
    expect(whole?.body?.expectedVersion).toBe(4);
    expect(routes.state.document.collections[1].description).toBe('Every berth along the quay.');

    // Back at level 3 the designer shows the edit made at level 4.
    await user.click(screen.getByRole('button', { name: 'Level 3, Designer' }));
    await user.click(screen.getByRole('button', { name: 'Entity Berth' }));
    expect(screen.getByLabelText('What this collection keeps')).toHaveValue('Every berth along the quay.');
    expect(screen.getByLabelText('Name of field 4')).toHaveValue('draught');
  });

  it('names the fix when the project has no identifier yet', async () => {
    vi.stubGlobal('fetch', fakeRoutes(harbourRegister()).impl);
    render(<Step2 projectId={null} />);
    expect(await screen.findByTestId('step-failure')).toHaveTextContent('Finish the Foundation step');
  });

  it('keeps the edit waiting and names the fix when Cerulea APIs refuses the save', async () => {
    const routes = fakeRoutes(harbourRegister());
    const refusing = (async (url: string, init: RequestInit = {}) => {
      if ((init.method ?? 'GET') === 'PUT') {
        return new Response(
          JSON.stringify({
            error: 'The Blueprint holds one correction before Cerulea saves it. types[1]: bad. Fix it.',
            code: 'blueprint.document_faulty',
            message: 'The Blueprint holds one correction before Cerulea saves it.',
            fix: 'Correct the named place, then save again.',
            details: { faults: [{ code: 'x', path: 'types[1].fields[3].name', section: 'types', message: 'The name is empty.', fix: 'Give the field a name.' }] },
          }),
          { status: 400, headers: { 'content-type': 'application/json' } },
        );
      }
      return routes.impl(url, init);
    }) as unknown as typeof fetch;
    vi.stubGlobal('fetch', refusing);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Step2 projectId="project_1" />);
    await screen.findByLabelText('Entity name');
    await user.click(screen.getByRole('button', { name: 'Add Field' }));
    await act(async () => {
      vi.advanceTimersByTime(SAVE_DELAY_MS + 50);
    });
    const strip = await screen.findByTestId('step-failure');
    expect(strip).toHaveTextContent('Give the field a name.');
    expect(screen.getByTestId('save-status')).toHaveTextContent('Save held back');
    expect(screen.getByRole('button', { name: 'Save again' })).toBeInTheDocument();
  });
});
