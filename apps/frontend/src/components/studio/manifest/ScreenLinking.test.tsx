import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import StudioProject from '@/components/studio/steps6/StudioProject';
import { EXAMPLE_MANIFEST } from '@/lib/manifest/example';
import { GROUP_WORDING, MANIFEST_GROUPS, linesOfGroup } from '@/lib/manifest/groups';
import { screenTarget } from '@/lib/studio/screens';
import type { BuildState } from '@/lib/studio/project-state';

const buildState: BuildState = {
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
    interfaceAuthoring: true,
    verify: true,
  },
  wizardComplete: true,
  wizardCompletedAt: '2026-09-19T10:00:00.000Z',
};

function stubFetch() {
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const answer = (body: unknown, status = 200) =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status,
          headers: { 'content-type': 'application/json' },
        }),
      );
    if (url.endsWith('/build-state')) return answer({ buildState });
    if (url.includes('/manifest')) {
      if (url.includes('view=summary')) {
        return answer({ view: 'summary', version: 4, summary: EXAMPLE_MANIFEST.summary });
      }
      if (url.includes('view=comparison')) {
        return answer({
          view: 'comparison',
          version: 4,
          comparison: {
            currentBlueprintHash: 'hash',
            additions: [],
            removals: [],
            changes: [],
            identical: true,
          },
        });
      }
      return answer({ view: 'atomic', version: 4, manifest: EXAMPLE_MANIFEST });
    }
    if (url.endsWith('/compile')) {
      return answer({
        report: {
          blueprintHash: 'hash',
          ok: true,
          reachedStage: 'manifest',
          errorCount: 0,
          warningCount: 0,
          headline: 'Nothing blocks deployment.',
          sections: [],
        },
      });
    }
    if (url.endsWith('/readiness')) {
      return answer({ remaining: 0, advisory: 0, ready: true, headline: 'Nothing remains.' });
    }
    if (url.endsWith('/policies')) {
      return answer(method === 'POST' ? { profiles: [] } : { questions: [], limits: {} });
    }
    if (url.endsWith('/workspaces')) return answer({ workspaces: [] });
    if (url.includes('/blueprint/versions')) return answer({ versions: [] });
    if (url.includes('/blueprint')) {
      return answer(
        method === 'PUT'
          ? { blueprint: { version: 2 }, created: true }
          : { version: 1, document: { name: 'Berth register' } },
      );
    }
    if (url.endsWith('/simulation')) return answer({ runs: [] });
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
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('every manifest line opens the screen that produces it', () => {
  it('names the screen on a line of every group', () => {
    for (const group of MANIFEST_GROUPS) {
      const lines = linesOfGroup(EXAMPLE_MANIFEST, group);
      expect(lines.length, group).toBeGreaterThan(0);
      for (const line of lines) {
        const target = screenTarget(line.screen);
        expect(target, `${group} ${line.subject}`).toBeDefined();
        expect(target!.area.length).toBeGreaterThan(0);
      }
    }
  });

  it(
    'opens the records area from a data line of the manifest',
    { timeout: 60000 },
    async () => {
      stubFetch();
      render(<StudioProject projectId="p-1" />);
      await waitFor(() => expect(screen.getByTestId('deployment-manifest')).toBeInTheDocument(), {
        timeout: 20000,
      });
      await waitFor(() => expect(screen.getByTestId('manifest-summary')).toBeInTheDocument(), {
        timeout: 20000,
      });
      await userEvent.click(screen.getAllByRole('button', { name: 'Model, records' })[0]);
      await waitFor(() => expect(screen.getByText('What the system keeps.')).toBeInTheDocument(), {
        timeout: 20000,
      });
      expect(screen.getByRole('tab', { name: 'Records', selected: true })).toBeInTheDocument();
    },
  );

  it(
    'opens the permission matrix from a permissions line of the manifest',
    { timeout: 60000 },
    async () => {
      stubFetch();
      render(<StudioProject projectId="p-1" />);
      await waitFor(() => expect(screen.getByTestId('manifest-summary')).toBeInTheDocument(), {
        timeout: 20000,
      });
      await userEvent.click(screen.getAllByRole('button', { name: 'Model, permissions' })[0]);
      await waitFor(() => expect(screen.getByText('Who reaches what.')).toBeInTheDocument(), {
        timeout: 20000,
      });
      expect(
        screen.getByRole('tab', { name: 'Permissions', selected: true }),
      ).toBeInTheDocument();
    },
  );

  it(
    'opens the policies area from the chain group screen',
    { timeout: 60000 },
    async () => {
      stubFetch();
      render(<StudioProject projectId="p-1" />);
      await waitFor(() => expect(screen.getByTestId('manifest-summary')).toBeInTheDocument(), {
        timeout: 20000,
      });
      expect(GROUP_WORDING.chain.screen).toBe('Policies');
      await userEvent.click(screen.getAllByRole('tab', { name: 'Policies' })[0]);
      await waitFor(() => expect(screen.getByText('Step 4 of 6')).toBeInTheDocument(), {
        timeout: 20000,
      });
    },
  );
});
