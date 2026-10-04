// Shared fixture for the level tests: one project, one build state, the five
// policy questions, the Dapps templates of the catalogue, and a fetch stub that
// records every call and answers each Studio route the levels read.
import { vi } from 'vitest';

import templatesSeed from '@/data/templates.seed.json';
import type { CatalogueTemplate } from '@/lib/catalogue/types';
import { DECLARATION_IDS } from '@/lib/studio/template-build';
import type { BuildState } from '@/lib/studio/project-state';

export const DAPP_TEMPLATES = (
  templatesSeed as unknown as { templates: (CatalogueTemplate & { division: string })[] }
).templates.filter((entry) => entry.projectType === 'dapp');

export const firstTemplate = DAPP_TEMPLATES[0];

export const buildState: BuildState = {
  version: 1,
  disclosureLevel: 1,
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

export const questions = DECLARATION_IDS.map((id) => ({
  id,
  question: `We ask about ${id}`,
  explanation: `This answer settles the ${id} rule.`,
  options: [
    { value: `${id}-first`, label: `${id} first option`, meaning: `The first ${id} outcome.` },
    { value: `${id}-second`, label: `${id} second option`, meaning: `The second ${id} outcome.` },
  ],
}));

export type RecordedCall = { url: string; method: string; body: unknown };

/**
 * Stubs fetch for the level screens. `document` is what the Blueprint document
 * route answers on GET; `state` is the build state the build-state route answers.
 */
export function stubFetch(input: { document?: unknown; state?: BuildState } = {}): RecordedCall[] {
  const calls: RecordedCall[] = [];
  const held = { document: input.document ?? { name: 'Berth register' }, state: input.state ?? buildState };
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
    if (url.includes('/build-state')) {
      if (method === 'PUT') {
        held.state = (body as { buildState: BuildState }).buildState;
      }
      return answer({ buildState: held.state });
    }
    if (url.endsWith('/policies')) {
      return answer(
        method === 'POST'
          ? {
              profiles: [
                {
                  profileId: 'profile-balanced',
                  point: { routinePercent: 67, constitutionalPercent: 90 },
                  consequences: ['Everyday work settles quickly.'],
                },
              ],
            }
          : { questions, limits: { statements: [] } },
      );
    }
    if (url.startsWith('/api/templates')) return answer(DAPP_TEMPLATES);
    if (url.includes('/blueprint/document')) {
      if (method === 'PUT') {
        held.document = (body as { document: unknown }).document;
        return answer({ blueprint: { version: 2 }, created: true });
      }
      return answer({ version: 1, document: held.document });
    }
    if (url.includes('/workspaces')) return answer([]);
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
