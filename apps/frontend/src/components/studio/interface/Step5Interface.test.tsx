// apps/frontend/src/components/studio/interface/Step5Interface.test.tsx
// Step 5 opens on a finished application and edits it.

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Step5Interface, { reachedBy, readableWorkspace } from './Step5Interface';
import PreviewFrame, { frameDocument, frameWidth } from './PreviewFrame';
import AccessibilityReport from './AccessibilityReport';
import { bindsWords } from './ComponentPalette';
import type {
  AccessibilityOutcome,
  ComponentCatalogue,
  GeneratedInterface,
  PreviewOutcome,
} from '@/lib/interface/types';

const catalogue: ComponentCatalogue = {
  components: [
    {
      kind: 'page',
      group: 'layout',
      binds: 'nothing',
      holdsChildren: true,
      summary: 'The whole screen.',
      properties: [],
    },
    {
      kind: 'table',
      group: 'data',
      binds: 'collection',
      holdsChildren: true,
      summary: 'Records shown as rows and columns.',
      properties: ['sort_field'],
    },
  ],
  groups: ['layout', 'data'],
  breakpoints: [
    { id: 'phone', min_width: 0, columns: 4, label_key: 'breakpoint.phone' },
    { id: 'desktop', min_width: 1024, columns: 12, label_key: 'breakpoint.desktop' },
  ],
  theme: {
    colour_light: [{ name: 'brand_primary', value: '#004AAD' }],
    colour_dark: [{ name: 'brand_primary', value: '#9CC0F0' }],
    type_scale: [{ name: 'size_body', value: '16px' }],
    spacing: [{ name: 'unit', value: '8px' }],
  },
  styleSheet: ':root { --cerulea-colour-brand-primary: #004AAD; }',
};

const generated: GeneratedInterface = {
  section: {
    screens: [
      {
        id: 'parcels_list',
        kind: 'list',
        route: '/parcels',
        collection: 'parcels',
        roles: ['registrar', 'holder'],
        title_key: 'screen.parcels_list.title',
        offline_capture: false,
        components: [
          {
            id: 'page',
            component: 'page',
            visibility: [],
            overrides: [],
            properties: [],
            children: [],
          },
        ],
      },
      {
        id: 'parcels_create',
        kind: 'create',
        route: '/parcels/new',
        collection: 'parcels',
        action: 'register_parcel',
        roles: ['registrar'],
        title_key: 'screen.parcels_create.title',
        offline_capture: true,
        components: [
          {
            id: 'page',
            component: 'page',
            visibility: [],
            overrides: [],
            properties: [],
            children: [],
          },
        ],
      },
    ],
    theme: catalogue.theme,
    breakpoints: catalogue.breakpoints,
    translations: [
      {
        language: 'en',
        entries: [
          { key: 'screen.parcels_list.title', text: 'Parcels' },
          { key: 'screen.parcels_create.title', text: 'Add a parcel' },
          { key: 'breakpoint.phone', text: 'Phone' },
          { key: 'breakpoint.desktop', text: 'Desktop' },
        ],
      },
    ],
    conflict_rules: [],
    default_language: 'en',
  },
  omissions: ['Cerulea generated no edit form for parcels. The Blueprint declares no action that writes a record to it.'],
  faults: [],
};

const preview: PreviewOutcome = {
  role: 'registrar',
  roleName: 'Registrar',
  breakpoint: 'desktop',
  mode: 'light',
  language: 'en',
  navigation: [{ screen: 'parcels_list', route: '/parcels', labelKey: 'screen.parcels_list.title', kind: 'list' }],
  screens: [
    {
      id: 'parcels_list',
      kind: 'list',
      route: '/parcels',
      titleKey: 'screen.parcels_list.title',
      title: 'Parcels',
      markup: '<table><caption>Every parcel</caption></table>',
    },
  ],
  styleSheet: ':root { --cerulea-colour-surface: #FFFFFF; }',
  note: '',
};

const accessibility: AccessibilityOutcome = {
  passes: true,
  headline: 'Every screen meets the Web Content Accessibility Guidelines version 2.2 level AA.',
  findings: [],
};

function answer(body: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const workspace = {
  projectId: 'p-1',
  version: 3,
  generated,
  catalogue,
  roles: [
    { role: 'registrar', name: 'Registrar', screens: 2 },
    { role: 'holder', name: 'Parcel holder', screens: 1 },
  ],
  endpoints: [
    {
      method: 'GET',
      path: '/parcels/{parcel_id}',
      parameters: ['parcel_id'],
      response: 'One parcel record',
      visibility: 'registrar, holder',
    },
  ],
  endpointsNote: '',
};

type Seen = { url: string; method: string; body: unknown; headers: Record<string, string> };

/** Stands in for the Studio routes the screen calls, and records every call. */
function studioRoutes(overrides: Record<string, unknown> = {}): Seen[] {
  const seen: Seen[] = [];
  let buildState = {
    version: 1,
    steps: {
      foundation: true,
      compose: true,
      model: true,
      policies: true,
      interfaceAuthoring: false,
      verify: false,
    },
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = String(input);
      const method = init.method ?? 'GET';
      const body =
        typeof init.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : {};
      seen.push({ url, method, body, headers: (init.headers ?? {}) as Record<string, string> });
      if (url === '/api/projects/p-1/interface') {
        return answer(
          overrides.workspace ?? workspace,
          (overrides.workspaceStatus as number | undefined) ?? 200,
        );
      }
      if (url === '/api/projects/p-1/interface/preview') {
        return answer(overrides.preview ?? { ...preview, role: body.role, mode: body.mode });
      }
      if (url === '/api/projects/p-1/interface/bindings') {
        return answer(
          overrides.bindings ?? {
            role: body.role,
            component: body.component,
            choices: [
              {
                binding: { kind: 'Collection', collection: 'parcels' },
                label: 'Parcels',
                summary: 'Every parcel record the role reads.',
                collection: 'parcels',
              },
            ],
          },
        );
      }
      if (url === '/api/projects/p-1/accessibility') {
        return answer(overrides.accessibility ?? { version: 3, ...accessibility });
      }
      if (url === '/api/projects/p-1/build-state') {
        if (method === 'PUT') buildState = body.buildState as typeof buildState;
        return answer({ buildState });
      }
      return answer(
        { error: { code: 'route.absent', message: 'No route.', fix: 'Call a route Studio serves.' } },
        404,
      );
    }),
  );
  return seen;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

async function opened(): Promise<void> {
  await waitFor(() => expect(screen.getByTestId('step5-interface')).toBeInTheDocument(), {
    timeout: 15000,
  });
}

describe('Step 5 Interface', { timeout: 40000 }, () => {
  it('opens on the application the engine generated', async () => {
    studioRoutes();
    render(<Step5Interface projectId="p-1" />);
    await opened();
    expect(screen.getByText(/2 screens across 1 collection/)).toBeInTheDocument();
    expect(screen.getAllByText('Parcels').length).toBeGreaterThan(0);
    expect(screen.getByText('Add a parcel')).toBeInTheDocument();
    expect(screen.getAllByText('List · /parcels · Registrar, Parcel holder').length).toBe(2);
  });

  it('reaches Cerulea APIs through the Studio routes alone and carries no token', async () => {
    const seen = studioRoutes();
    const person = userEvent.setup();
    render(<Step5Interface projectId="p-1" />);
    await opened();
    await person.click(screen.getByRole('tab', { name: 'Preview' }));
    await waitFor(() => expect(screen.getByTestId('preview-frame')).toBeInTheDocument());
    expect(seen.length).toBeGreaterThan(1);
    for (const call of seen) {
      expect(call.url.startsWith('/api/projects/p-1/')).toBe(true);
      expect(Object.keys(call.headers).map((name) => name.toLowerCase())).not.toContain(
        'authorization',
      );
      expect(Object.keys(call.body as Record<string, unknown>)).not.toContain('document');
      expect(Object.keys(call.body as Record<string, unknown>)).not.toContain('accessToken');
    }
  });

  it('states what the engine left out and why', async () => {
    studioRoutes();
    render(<Step5Interface projectId="p-1" />);
    await waitFor(() => expect(screen.getByTestId('step5-omissions')).toBeInTheDocument());
    expect(screen.getByText(/no edit form for parcels/)).toBeInTheDocument();
  });

  it('lists the corrections the engine names', async () => {
    studioRoutes({
      workspace: {
        ...workspace,
        generated: {
          ...generated,
          faults: [
            {
              area: 'binding',
              screen: 'Parcels',
              component: 'table',
              problem: 'The table reads a collection the role cannot reach.',
              fix: 'Grant the role read on parcels in the permission matrix.',
            },
          ],
        },
      },
    });
    render(<Step5Interface projectId="p-1" />);
    await waitFor(() => expect(screen.getByTestId('step5-faults')).toBeInTheDocument());
    expect(screen.getByText(/Grant the role read on parcels/)).toBeInTheDocument();
  });

  it('says whether a screen captures records without a connection', async () => {
    studioRoutes();
    const person = userEvent.setup();
    render(<Step5Interface projectId="p-1" />);
    await waitFor(() => expect(screen.getByTestId('panel-screens')).toBeInTheDocument(), {
      timeout: 15000,
    });
    expect(screen.getByText('This screen reads records and writes nothing.')).toBeInTheDocument();
    await person.click(screen.getByText('Add a parcel'));
    expect(
      screen.getByText('This screen captures records without a connection.'),
    ).toBeInTheDocument();
  });

  it('lists the endpoints with the role names that reach them', async () => {
    studioRoutes();
    const person = userEvent.setup();
    render(<Step5Interface projectId="p-1" />);
    await opened();
    await person.click(screen.getByRole('tab', { name: 'Endpoints' }));
    expect(screen.getByText('GET /parcels/{parcel_id}')).toBeInTheDocument();
    expect(screen.getByText(/Reached by Registrar, Parcel holder\./)).toBeInTheDocument();
  });

  it('names the reason when the endpoint list is empty', async () => {
    studioRoutes({
      workspace: {
        ...workspace,
        endpoints: [],
        endpointsNote:
          'Cerulea read no endpoint list for this version. The compiler holds two corrections.',
      },
    });
    const person = userEvent.setup();
    render(<Step5Interface projectId="p-1" />);
    await opened();
    await person.click(screen.getByRole('tab', { name: 'Endpoints' }));
    expect(screen.getByText(/The compiler holds two corrections/)).toBeInTheDocument();
  });

  it('offers the component set grouped the way the engine publishes it', async () => {
    studioRoutes();
    const person = userEvent.setup();
    render(<Step5Interface projectId="p-1" />);
    await opened();
    await person.click(screen.getByRole('tab', { name: 'Components' }));
    expect(screen.getByTestId('component-palette')).toBeInTheDocument();
    expect(screen.getByLabelText('table')).toBeInTheDocument();
    expect(screen.getByText('Records shown as rows and columns.')).toBeInTheDocument();
  });

  it('offers only the bindings the engine admits for the role', async () => {
    const seen = studioRoutes();
    const person = userEvent.setup();
    render(<Step5Interface projectId="p-1" />);
    await opened();
    await person.click(screen.getByRole('tab', { name: 'Components' }));
    await person.click(screen.getByLabelText('table'));
    await waitFor(() => expect(screen.getByTestId('binding-picker')).toBeInTheDocument());
    expect(screen.getByText('Every parcel record the role reads.')).toBeInTheDocument();
    expect(screen.getByText('Bindings the Registrar role reaches')).toBeInTheDocument();
    const asked = seen.find((call) => call.url === '/api/projects/p-1/interface/bindings');
    expect(asked?.body).toEqual({ role: 'registrar', component: 'table' });
  });

  it('says plainly that a layout component reads nothing', async () => {
    studioRoutes();
    const person = userEvent.setup();
    render(<Step5Interface projectId="p-1" />);
    await opened();
    await person.click(screen.getByRole('tab', { name: 'Components' }));
    await person.click(screen.getByLabelText('page'));
    await waitFor(() => expect(screen.getByTestId('binding-none')).toBeInTheDocument());
  });

  it('shows the preview as the role, width and mode a person chooses', async () => {
    const seen = studioRoutes();
    const person = userEvent.setup();
    render(<Step5Interface projectId="p-1" />);
    await opened();
    await person.click(screen.getByRole('tab', { name: 'Preview' }));
    await waitFor(() => expect(screen.getByTestId('preview-frame')).toBeInTheDocument());
    expect(screen.getByText(/Registrar · Desktop · Light theme/)).toBeInTheDocument();
    expect(screen.getByTestId('preview-document')).toHaveAttribute(
      'title',
      'Parcels as the Registrar role',
    );
    const asked = seen.filter((call) => call.url === '/api/projects/p-1/interface/preview');
    expect(asked[asked.length - 1]?.body).toEqual({
      role: 'registrar',
      breakpoint: 'desktop',
      mode: 'light',
    });
  });

  it('shows the accessibility gate', async () => {
    studioRoutes();
    const person = userEvent.setup();
    render(<Step5Interface projectId="p-1" />);
    await opened();
    await person.click(screen.getByRole('tab', { name: 'Accessibility' }));
    await waitFor(() => expect(screen.getByTestId('accessibility-report')).toBeInTheDocument());
    expect(screen.getByText('Ready to publish')).toBeInTheDocument();
  });

  it('shows the theme tokens every screen reads', async () => {
    studioRoutes();
    const person = userEvent.setup();
    render(<Step5Interface projectId="p-1" />);
    await opened();
    await person.click(screen.getByRole('tab', { name: 'Theme' }));
    expect(screen.getByText('#004AAD')).toBeInTheDocument();
    expect(screen.getByText('#9CC0F0')).toBeInTheDocument();
  });

  it('names the translation file beside the application', async () => {
    studioRoutes();
    const person = userEvent.setup();
    render(<Step5Interface projectId="p-1" />);
    await opened();
    await person.click(screen.getByRole('tab', { name: 'Translation' }));
    expect(screen.getByText('strings.en.json')).toBeInTheDocument();
  });

  it('records the check in the build state and keeps every other step', async () => {
    const seen = studioRoutes();
    const person = userEvent.setup();
    const continued = vi.fn();
    render(<Step5Interface projectId="p-1" onContinue={continued} />);
    await opened();
    await person.click(screen.getByTestId('step5-continue'));
    await waitFor(() => expect(continued).toHaveBeenCalledTimes(1));
    const saved = seen.find(
      (call) => call.url === '/api/projects/p-1/build-state' && call.method === 'PUT',
    );
    expect(
      (saved?.body as { buildState: { steps: Record<string, boolean> } }).buildState.steps,
    ).toEqual({
      foundation: true,
      compose: true,
      model: true,
      policies: true,
      interfaceAuthoring: true,
      verify: false,
    });
    expect(screen.getByText(/Cerulea recorded the check/)).toBeInTheDocument();
  });

  it('names the fix when the Studio route answers with a failure', async () => {
    studioRoutes({
      workspaceStatus: 400,
      workspace: {
        error: {
          code: 'blueprint.shape_unexpected',
          message: 'The Blueprint carries a value the schema rejects.',
          fix: 'Correct the named section and save the Blueprint again.',
        },
      },
    });
    render(<Step5Interface projectId="p-1" />);
    await waitFor(() => expect(screen.getByTestId('step5-failure')).toBeInTheDocument());
    expect(screen.getByText(/Correct the named section/)).toBeInTheDocument();
  });
});

describe('the endpoint reach sentence', () => {
  it('reads role names in place of the identifiers the manifest carries', () => {
    expect(
      reachedBy('registrar, holder', { registrar: 'Registrar', holder: 'Parcel holder' }),
    ).toBe('Registrar, Parcel holder');
    expect(reachedBy('every role', {})).toBe('every role');
    expect(reachedBy('auditor', { registrar: 'Registrar' })).toBe('auditor');
  });
});

describe('the preview frame', () => {
  it('sizes itself to the width on show', () => {
    expect(frameWidth('phone')).toBe(390);
    expect(frameWidth('tablet')).toBe(834);
    expect(frameWidth('desktop')).toBe(1280);
  });

  it('carries the style sheet and the mode into the frame', () => {
    const held = frameDocument(preview, '<p>held</p>');
    expect(held).toContain('data-theme="light"');
    expect(held).toContain('--cerulea-colour-surface');
    expect(held).toContain('<p>held</p>');
  });

  it('states the reason when a role reaches no screen', () => {
    render(
      <PreviewFrame
        preview={{
          ...preview,
          screens: [],
          note: 'The Visitor role reaches no screen. Grant the role a capability in the permission matrix.',
        }}
      />,
    );
    expect(screen.getByTestId('preview-empty')).toBeInTheDocument();
    expect(screen.getByText(/permission matrix/)).toBeInTheDocument();
  });
});

describe('the accessibility report', () => {
  it('holds publication and names where to start', () => {
    render(
      <AccessibilityReport
        outcome={{
          passes: false,
          headline: '1 correction stands between this application and the guidelines.',
          findings: [
            {
              area: 'contrast',
              severity: 'failure',
              guideline: 'Contrast, minimum, 1.4.3',
              screen: 'every screen',
              component: 'text_primary on surface',
              problem: 'Body text reaches 2.1 to one and needs 4.5 to one.',
              fix: 'Darken text_primary until the ratio reaches 4.5 to one.',
            },
          ],
          publication: {
            blocked: true,
            message: '1 correction stands between this application and the guidelines.',
            fix: 'Start with text_primary on surface on every screen.',
          },
        }}
      />,
    );
    expect(screen.getByText('Publication waits')).toBeInTheDocument();
    expect(screen.getByText(/Start with text_primary/)).toBeInTheDocument();
    expect(screen.getByText(/Darken text_primary/)).toBeInTheDocument();
  });
});

describe('the component palette', () => {
  it('names what each component reads', () => {
    expect(bindsWords('collection')).toBe('Reads a collection');
    expect(bindsWords('field')).toBe('Collects one field');
    expect(bindsWords('action')).toBe('Runs an action');
    expect(bindsWords('workflow')).toBe('Follows a workflow');
    expect(bindsWords('nothing')).toBe('Reads nothing');
  });
});

describe('reading the Step 5 answer', () => {
  it('accepts the answer the Studio route sends and refuses any other shape', () => {
    expect(readableWorkspace(workspace)).toBe(true);
    expect(readableWorkspace({ project: { projectId: 'p-1' } })).toBe(false);
    expect(readableWorkspace({ ...workspace, roles: undefined })).toBe(false);
    expect(readableWorkspace(null)).toBe(false);
  });
});
