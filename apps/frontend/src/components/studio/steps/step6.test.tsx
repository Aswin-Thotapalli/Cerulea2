import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { StudioProvider } from '@/context/StudioContext';
import Step6 from './step6';
import Step5, { bindingWords, localFaults } from './step5';

const section = {
  screens: [
    {
      id: 'shipment_list',
      kind: 'list',
      route: '/shipment',
      collection: 'shipment',
      roles: ['inspector'],
      title_key: 'screen.shipment_list.title',
      offline_capture: false,
      components: [
        {
          id: 'page',
          component: 'page',
          visibility: [],
          overrides: [],
          properties: [],
          children: [
            {
              id: 'main',
              component: 'section',
              label_key: 'screen.shipment_list.main.label',
              visibility: [],
              overrides: [{ breakpoint: 'desktop', visible: true, span: 12, order: 0 }],
              properties: [],
              children: [
                {
                  id: 'records_table',
                  component: 'table',
                  binding: { kind: 'Collection', collection: 'shipment' },
                  label_key: 'screen.shipment_list.records_table.label',
                  visibility: [],
                  overrides: [{ breakpoint: 'desktop', visible: true, span: 12, order: 0 }],
                  properties: [{ name: 'page_size', value: '25' }],
                  children: [],
                },
                {
                  id: 'records_chart',
                  component: 'chart',
                  binding: { kind: 'Collection', collection: 'shipment' },
                  label_key: 'screen.shipment_list.records_chart.label',
                  visibility: [],
                  overrides: [{ breakpoint: 'desktop', visible: false, span: 0, order: 1 }],
                  properties: [],
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  theme: { colour_light: [{ name: 'brand', value: '#004AAD' }], colour_dark: [], type_scale: [], spacing: [] },
  breakpoints: [{ id: 'desktop', min_width: 1200, columns: 12, label_key: 'width.desktop' }],
  translations: [
    {
      language: 'en',
      entries: [
        { key: 'screen.shipment_list.title', text: 'Shipments' },
        { key: 'screen.shipment_list.records_table.label', text: 'Every shipment Cerulea holds' },
        { key: 'screen.shipment_list.records_chart.label', text: 'Shipments under each grade' },
      ],
    },
  ],
  conflict_rules: [],
  default_language: 'en',
};

const workspace = {
  projectId: 'prj_1',
  version: 3,
  blueprintHash: 'hash-3',
  authored: false,
  generated: { section, omissions: ['Cerulea generated no screen for lot. No role carries the read capability over it.'], faults: [] },
  catalogue: {
    components: [
      { kind: 'table', group: 'data', binds: 'collection', holdsChildren: true, summary: 'Rows and columns of records.', properties: ['page_size'] },
      { kind: 'chart', group: 'data', binds: 'collection', holdsChildren: true, summary: 'A picture of counts.', properties: [] },
      { kind: 'empty_state', group: 'feedback', binds: 'nothing', holdsChildren: false, summary: 'What a person reads when nothing is held.', properties: [] },
    ],
    groups: ['data', 'feedback'],
    breakpoints: section.breakpoints,
    theme: section.theme,
    styleSheet: '',
  },
  roles: [{ role: 'inspector', name: 'Inspector', screens: 1 }],
  endpoints: [{ method: 'GET', path: '/v1/deployments/x/records/shipment', parameters: [], response: 'a page of shipments', visibility: '' }],
  endpointsNote: '',
};

const buildState = {
  version: 1,
  disclosureLevel: 2,
  foundation: { projectName: 'AgroTrace', summary: 'Trace mango lots.', application: 'enterprise', track: 'blockchain', trackOverridden: false, templateId: '', publishSelectedRecords: false, blockSeconds: 3, historyRetentionDays: 3650 },
  compose: { outcomeIds: [], moduleIds: ['supply-chain'], removedModuleIds: [], chosenLinks: [] },
  policies: { answers: {}, chosenProfileId: 'balanced' },
  execution: { substrate: 'Native', reason: '' },
  steps: { foundation: true, compose: true, model: true, policies: true, interfaceAuthoring: true, verify: false },
  wizardComplete: false,
  wizardCompletedAt: '',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const calls: { url: string; method: string; body: unknown }[] = [];

function answer(url: string, init?: RequestInit): Response {
  const method = init?.method ?? 'GET';
  const path = url.replace(/\?.*$/, '');
  calls.push({ url, method, body: typeof init?.body === 'string' ? JSON.parse(init.body) : null });
  if (path === '/api/projects/prj_1') return json({ project: { id: 'prj_1', name: 'AgroTrace', projectType: 'blockchain', status: 'draft' } });
  if (path === '/api/projects/prj_1/interface' && method === 'GET') return json(workspace);
  if (path === '/api/projects/prj_1/interface' && method === 'PUT') return json({ version: 4, blueprintHash: 'hash-4', created: true, faults: [] });
  if (path === '/api/projects/prj_1/build-state') return json({ projectId: 'prj_1', buildState, rowVersion: 1 });
  if (path === '/api/projects/prj_1/readiness') return json({ ready: false, remaining: 1, advisory: 0, compilerOk: true, items: [] });
  if (path === '/api/projects/prj_1/accessibility') return json({ version: 3, authored: false, passes: true, headline: 'Every screen passes.', findings: [] });
  if (path === '/api/projects/prj_1/deployments') return json({ deployments: [] });
  if (path === '/api/projects/prj_1/compile') return json({ ok: true, report: { ok: true, errorCount: 0, warningCount: 0, sections: [], blueprintHash: 'hash-3' } });
  if (path === '/api/projects/prj_1/manifest') return json({ view: 'summary', version: 3, summary: { collections: 1, fields: 3, indexes: 0, actions: 1, workflows: 0, states: 0, transitions: 0, rules: 0, permissionEntries: 1, interfaces: 1, endpoints: 1, webhooks: 0, modules: 1 } });
  return json({ error: `No answer for ${method} ${path}`, code: 'test.unnamed', message: `No answer for ${method} ${path}`, fix: 'Add one.', details: {} }, 404);
}

beforeEach(() => {
  calls.length = 0;
  window.localStorage.setItem('guidance:dismissed:step6', '1');
  window.localStorage.setItem('guidance:dismissed:step5', '1');
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => answer(String(input), init)));
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('Deploy & UI', () => {
  it('shows the two sub-steps, opens on the Interface and reports the sub-step to the shell', async () => {
    const onSubStepChange = vi.fn();
    render(
      <StudioProvider>
        <Step6 projectId="prj_1" onSubStepChange={onSubStepChange} />
      </StudioProvider>,
    );
    const bar = screen.getByTestId('deploy-sub-steps');
    expect(within(bar).getByText('Interface')).toBeInTheDocument();
    expect(within(bar).getByText('Verify and deploy')).toBeInTheDocument();
    expect(onSubStepChange).toHaveBeenCalledWith(0);
    expect(await screen.findByTestId('step5-interface')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-records_table')).toHaveTextContent('Every shipment Cerulea holds');
    expect(screen.getByTestId('step5-hidden')).toHaveTextContent('Shipments under each grade');
    expect(screen.getByTestId('step5-omissions')).toHaveTextContent('no screen for lot');

    await userEvent.click(screen.getByTestId('to-verify'));
    expect(onSubStepChange).toHaveBeenLastCalledWith(1);
    expect(await screen.findByTestId('step6-verify-deploy')).toBeInTheDocument();
    expect(screen.getByTestId('pipeline')).toHaveTextContent('Checks');
    expect(screen.getByTestId('pipeline')).toHaveTextContent('Record the deployment');
    await waitFor(() => expect(screen.getByTestId('deploy-hold')).toHaveTextContent('Items remain before deployment'));
    expect(screen.getByTestId('deploy-now')).toBeDisabled();
    expect(screen.queryByTestId('deployment-console')).toBeNull();
  });
});

describe('the Interface sub-step', () => {
  it('renames a component and saves the Views section into the Blueprint through Cerulea APIs', async () => {
    const onSaved = vi.fn();
    render(
      <StudioProvider>
        <Step5 projectId="prj_1" embedded onSaved={onSaved} />
      </StudioProvider>,
    );
    await screen.findByTestId('step5-interface');
    await userEvent.click(screen.getByTestId('canvas-records_table'));
    const name = within(screen.getByTestId('step5-inspector')).getByLabelText('Name');
    fireEvent.change(name, { target: { value: 'Shipments on the water' } });
    expect(screen.getByTestId('inspector-binding')).toHaveTextContent('Collection shipment');
    expect(screen.getByTestId('step5-save-state')).toHaveTextContent('Changes wait to save');
    // The builder saves on its own after the pause, so the Blueprint holds what the canvas shows.
    await waitFor(() => expect(calls.some((call) => call.method === 'PUT' && call.url === '/api/projects/prj_1/interface')).toBe(true), { timeout: 10000 });
    const saved = calls.find((call) => call.method === 'PUT') as { body: { section: typeof section; expectedVersion: number } };
    expect(saved.body.expectedVersion).toBe(3);
    const english = saved.body.section.translations[0].entries.find((entry) => entry.key === 'screen.shipment_list.records_table.label');
    expect(english?.text).toBe('Shipments on the water');
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(4));
    expect(screen.getByTestId('step5-save-state')).toHaveTextContent('Saved as Blueprint version 4');
  });

  it('shows a hidden component again and holds the save while a dropped component has no binding', async () => {
    render(
      <StudioProvider>
        <Step5 projectId="prj_1" embedded />
      </StudioProvider>,
    );
    await screen.findByTestId('step5-interface');
    const hidden = screen.getByTestId('step5-hidden');
    await userEvent.click(within(hidden).getByTestId('AddIcon'));
    expect(await screen.findByTestId('canvas-records_chart')).toBeInTheDocument();
    expect(screen.queryByTestId('step5-hidden')).toBeNull();

    const faults = localFaults(
      { ...section, screens: [{ ...section.screens[0], components: [{ id: 'page', component: 'page', visibility: [], overrides: [], properties: [], children: [{ id: 'main', component: 'section', visibility: [], overrides: [], properties: [], children: [{ id: 'chart', component: 'chart', visibility: [], overrides: [], properties: [], children: [] }] }] }] }] } as never,
      workspace.catalogue.components as never,
    );
    expect(faults).toHaveLength(1);
    expect(faults[0].fix).toMatch(/Choose a binding/);
    expect(bindingWords({ kind: 'Field', collection: 'shipment', field: 'grade' } as never)).toBe('Field shipment.grade');
    expect(bindingWords(undefined)).toBe('Bound to nothing yet');
  });
});
