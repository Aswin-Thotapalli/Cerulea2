import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ValidationGuidance from './ValidationGuidance';
import { readBlueprintDocument } from '@/lib/blueprint/document';
import { setCapabilities } from '@/lib/blueprint/edit';
import type { Blueprint } from '@/lib/blueprint/types';

function baseDocument(): Blueprint {
  const held = readBlueprintDocument(
    {
      name: 'Berth register',
      types: [
        {
          id: 'booking_record',
          kind: 'Record',
          fields: [
            {
              name: 'id',
              type: { kind: 'Text' },
              required: true,
              validation: [],
              description: 'The value naming one booking.',
            },
          ],
          description: 'One booking record.',
        },
      ],
      collections: [
        {
          id: 'booking',
          record_type: 'booking_record',
          primary_key: 'id',
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
  return setCapabilities(held, {
    roleId: 'harbour_master',
    collectionId: 'booking',
    capabilities: ['Read'],
  });
}

const report = {
  blueprintHash: 'abc',
  ok: false,
  reachedStage: 'validate',
  errorCount: 1,
  warningCount: 0,
  headline: 'The Blueprint holds one correction.',
  sections: [
    {
      section: 'permissions',
      heading: 'Permissions',
      errors: 1,
      warnings: 0,
      entries: [
        {
          code: 'validate.role_absent',
          severity: 'error',
          message: 'The permission entry p1 names the role harbour_master, which is absent.',
          fix: 'Add a role named harbour_master, or point the entry at a role the Blueprint holds.',
          section: 'permissions',
          path: 'permissions[0].role',
          screen: 'Model, permissions',
        },
      ],
    },
  ],
};

function stubFetch(document: Blueprint) {
  const calls: { url: string; method: string; body: unknown }[] = [];
  let held = document;
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
    calls.push({ url, method, body });
    const answer = (payload: unknown) =>
      Promise.resolve(
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    if (url.endsWith('/compile')) return answer({ report });
    if (url.endsWith('/build-state')) {
      return answer({
        buildState: {
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
        },
      });
    }
    if (url.includes('/blueprint')) {
      if (method === 'PUT') {
        held = (body as { document: Blueprint }).document;
        return answer({ blueprint: { version: 2 }, created: true });
      }
      return answer({ version: 1, document: held });
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

describe('validation as guidance', () => {
  it('renders every correction with its fix sentence', { timeout: 40000 }, async () => {
    stubFetch(baseDocument());
    render(<ValidationGuidance projectId="p-1" />);
    await waitFor(() => expect(screen.getByTestId('validation-guidance')).toBeInTheDocument(), {
      timeout: 15000,
    });
    await waitFor(() =>
      expect(
        screen.getByText(
          'The permission entry p1 names the role harbour_master, which is absent.',
        ),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText(
        'Add a role named harbour_master, or point the entry at a role the Blueprint holds.',
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Model, permissions').length).toBeGreaterThan(0);
  });

  it('states how many corrections Cerulea makes on its own', { timeout: 40000 }, async () => {
    stubFetch(baseDocument());
    render(<ValidationGuidance projectId="p-1" />);
    await waitFor(() => expect(screen.getByText(/corrections remain/)).toBeInTheDocument(), {
      timeout: 15000,
    });
    expect(screen.getByText(/Cerulea carries out/)).toBeInTheDocument();
  });

  it('performs the fix on the Blueprint in one action', { timeout: 40000 }, async () => {
    const calls = stubFetch(baseDocument());
    render(<ValidationGuidance projectId="p-1" />);
    const action = await screen.findByRole(
      'button',
      { name: 'Add the role Harbour master' },
      { timeout: 15000 },
    );
    await userEvent.click(action);
    await waitFor(() =>
      expect(calls.some((call) => call.url.includes('/blueprint') && call.method === 'PUT')).toBe(
        true,
      ),
    );
    const written = calls.find(
      (call) => call.url.includes('/blueprint') && call.method === 'PUT',
    )?.body as { document: Blueprint };
    expect(
      written.document.identities.roles.some((role) => role.id === 'harbour_master'),
    ).toBe(true);
    await waitFor(() => expect(screen.getByText('Cerulea made the correction')).toBeInTheDocument());
  });
});
