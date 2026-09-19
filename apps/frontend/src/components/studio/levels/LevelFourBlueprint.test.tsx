import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LevelFourBlueprint from './LevelFourBlueprint';
import { readBlueprintDocument } from '@/lib/blueprint/document';
import { writeBlueprintText } from '@/lib/blueprint/validate';

const document = readBlueprintDocument(
  {
    name: 'Berth register',
    summary: 'We register every berth booking.',
    types: [
      {
        id: 'booking_record',
        kind: 'Record',
        fields: [
          {
            name: 'amount',
            type: { kind: 'Integer' },
            required: true,
            validation: [],
            description: 'The amount the booking carries.',
          },
        ],
        description: 'One booking record.',
      },
    ],
    collections: [
      {
        id: 'booking',
        record_type: 'booking_record',
        primary_key: 'amount',
        indexes: [],
        privacy: 'Open',
        retention: { period_days: 900, on_expiry: 'Archive' },
        purpose: {
          statement: 'We keep every booking so the register stays provable.',
          lawful_basis: 'Contract',
        },
        description: 'Every booking the system keeps.',
      },
    ],
  },
  'Berth register',
);

const buildState = {
  version: 1,
  disclosureLevel: 4,
  foundation: {
    projectName: 'Berth register',
    summary: '',
    application: 'enterprise',
    track: 'blockchain',
    trackOverridden: false,
    templateId: '',
    publishSelectedRecords: false,
    blockSeconds: 3,
    historyRetentionDays: 900,
  },
  compose: { outcomeIds: [], moduleIds: [], removedModuleIds: [], chosenLinks: [] },
  policies: { answers: {}, chosenProfileId: '' },
  execution: { substrate: 'Native', reason: '' },
  steps: {
    foundation: true,
    compose: true,
    model: true,
    policies: true,
    interfaceAuthoring: false,
    verify: false,
  },
  wizardComplete: false,
  wizardCompletedAt: '',
};

function stubFetch() {
  const calls: { url: string; method: string; body: unknown }[] = [];
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    calls.push({
      url,
      method,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
    });
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
        method === 'PUT'
          ? { blueprint: { version: 2 }, created: true }
          : { version: 1, document },
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

describe('disclosure level four', () => {
  it('opens on the typed document and states that it passes', { timeout: 40000 }, async () => {
    stubFetch();
    render(<LevelFourBlueprint projectId="p-1" />);
    await waitFor(() => expect(screen.getByTestId('schema-clean')).toBeInTheDocument(), {
      timeout: 15000,
    });
    const field = screen.getByLabelText('The typed document') as HTMLTextAreaElement;
    expect(field.value).toBe(writeBlueprintText(document));
  });

  it('states what the document holds in plain words', { timeout: 40000 }, async () => {
    stubFetch();
    render(<LevelFourBlueprint projectId="p-1" />);
    await waitFor(() => expect(screen.getByText('What this document holds')).toBeInTheDocument(), {
      timeout: 15000,
    });
    expect(screen.getByText('This system keeps 1 kinds of record.')).toBeInTheDocument();
  });

  it('names every correction with its place and its fix', { timeout: 40000 }, async () => {
    stubFetch();
    render(<LevelFourBlueprint projectId="p-1" />);
    await waitFor(() => expect(screen.getByTestId('schema-clean')).toBeInTheDocument(), {
      timeout: 15000,
    });
    const field = screen.getByLabelText('The typed document');
    await userEvent.clear(field);
    await userEvent.paste(
      JSON.stringify({ ...document, collections: [{ ...document.collections[0], id: 'Berth' }] }),
    );
    await waitFor(() => expect(screen.getByTestId('schema-faults')).toBeInTheDocument());
    expect(screen.getByText(/collections\[0\].id/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save the Blueprint' })).toBeDisabled();
  });

  it('saves the same document back unchanged', { timeout: 40000 }, async () => {
    const calls = stubFetch();
    render(<LevelFourBlueprint projectId="p-1" />);
    await waitFor(() => expect(screen.getByTestId('schema-clean')).toBeInTheDocument(), {
      timeout: 15000,
    });
    await userEvent.click(screen.getByRole('button', { name: 'Save the Blueprint' }));
    await waitFor(() =>
      expect(calls.some((call) => call.url.includes('/blueprint') && call.method === 'PUT')).toBe(
        true,
      ),
    );
    const written = calls.find(
      (call) => call.url.includes('/blueprint') && call.method === 'PUT',
    )?.body as { document: unknown };
    expect(written.document).toEqual(document);
  });
});
