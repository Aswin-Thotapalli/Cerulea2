// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The project route handlers, one branch at a time.
 *
 * Each test signs an account in or out, answers the Cerulea APIs calls the
 * handler sends, and reads the status and the body the handler returns. The
 * fake Cerulea APIs records every call, so each test also checks the address,
 * the method and the body the handler sent.
 */

const state = vi.hoisted(() => ({ signedIn: true }));

vi.mock('next/headers', () => ({
  cookies: () => ({
    getAll: () => [{ name: 'next-auth.session-token', value: 'session' }],
  }),
  headers: () => new Headers({ host: '127.0.0.1:3000' }),
}));

vi.mock('next-auth/jwt', () => ({
  getToken: async () =>
    state.signedIn
      ? {
          cerulea: {
            accountId: 'act_project_suite',
            email: 'projects@cerulea.test',
            displayName: 'Ravi Kumar',
            accessToken: 'tok_project_suite',
          },
        }
      : null,
}));

import * as list from './route';
import * as one from './[id]/route';
import * as blueprintRoute from './[id]/blueprint/route';
import * as versionsRoute from './[id]/blueprint/versions/route';
import * as buildState from './[id]/build-state/route';
import * as checkpoints from './[id]/checkpoints/route';
import * as manifest from './[id]/manifest/route';
import * as policies from './[id]/policies/route';
import * as simulation from './[id]/simulation/route';

const BASE = 'http://cerulea-apis.test';
const STUDIO = 'http://127.0.0.1:3000';

type Call = { method: string; path: string; body: unknown; authorization: string | null };
type Answer = { method: string; path: string; status: number; body: unknown; unreachable: boolean };

let calls: Call[] = [];
let answers: Answer[] = [];

function answer(method: string, path: string, body: unknown, status = 200): void {
  answers.push({ method, path, status, body, unreachable: false });
}

function unreachable(method: string, path: string): void {
  answers.push({ method, path, status: 0, body: null, unreachable: true });
}

function refusal(code: string, message: string, fix: string) {
  return { error: { code, message, fix, details: {} } };
}

beforeEach(() => {
  state.signedIn = true;
  calls = [];
  answers = [];
  process.env.NEXTAUTH_SECRET = 'project-route-suite';
  process.env.CERULEA_API_URL = BASE;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const url = new URL(String(input));
      const path = `${url.pathname}${url.search}`;
      const method = init.method ?? 'GET';
      const headers = (init.headers ?? {}) as Record<string, string>;
      calls.push({
        method,
        path,
        body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
        authorization: headers.authorization ?? null,
      });
      const match = answers.find((entry) => entry.method === method && entry.path === path);
      if (!match) {
        return Response.json(
          refusal('suite.unanswered', `The suite holds no answer for ${method} ${path}.`, 'Add one.'),
          { status: 404 },
        );
      }
      if (match.unreachable) throw new TypeError('fetch failed');
      return Response.json(match.body, { status: match.status });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const registry = {
  workspaceId: 'wsp_registry',
  name: 'Registry office',
  slug: 'registry-office',
  application: 'government',
  tier: 'standard',
  state: 'open',
  ownerAccountId: 'act_project_suite',
  createdAt: '2026-01-04T09:00:00.000Z',
};

const shop = {
  ...registry,
  workspaceId: 'wsp_shop',
  name: 'Loyalty shop',
  application: 'dapps',
};

function project(projectId: string, name: string, updatedAt: string) {
  return { projectId, name, state: 'draft', updatedAt, createdAt: '2026-01-01T00:00:00.000Z' };
}

const context = { params: { id: 'prj_land' } };

function get(path: string): Request {
  return new Request(`${STUDIO}${path}`);
}

function send(method: string, path: string, body: unknown): Request {
  return new Request(`${STUDIO}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function read(response: Response): Promise<{ status: number; body: any }> {
  return { status: response.status, body: await response.json() };
}

describe('the project list route', () => {
  function answerListing(): void {
    answer('GET', '/workspaces', { workspaces: [registry, shop] });
    answer('GET', '/workspaces/wsp_registry/projects', {
      projects: [
        project('prj_land', 'Land titles', '2026-02-01T00:00:00.000Z'),
        project('prj_birth', 'Birth register', '2026-05-01T00:00:00.000Z'),
      ],
    });
    answer('GET', '/workspaces/wsp_shop/projects', {
      projects: [project('prj_points', 'Loyalty points', '2026-03-01T00:00:00.000Z')],
    });
  }

  it('refuses with no session', async () => {
    state.signedIn = false;
    const { status, body } = await read(await list.GET(get('/api/projects')));
    expect(status).toBe(401);
    expect(body.error.code).toBe('session.absent');
  });

  it('lists every project of every workspace, newest first, with the workspace it lives in', async () => {
    answerListing();
    const { status, body } = await read(await list.GET(get('/api/projects')));
    expect(status).toBe(200);
    expect(body.projects.map((entry: { name: string }) => entry.name)).toEqual([
      'Birth register',
      'Loyalty points',
      'Land titles',
    ]);
    expect(body.projects[1]).toMatchObject({
      workspaceName: 'Loyalty shop',
      workspaceApplication: 'dapps',
    });
    expect(body.workspaces).toHaveLength(2);
  });

  it('keeps only the projects whose name holds the search', async () => {
    answerListing();
    const { body } = await read(await list.GET(get('/api/projects?q=%20REGISTER%20')));
    expect(body.projects.map((entry: { projectId: string }) => entry.projectId)).toEqual(['prj_birth']);
  });

  it('relays a failure listing the workspaces', async () => {
    answer(
      'GET',
      '/workspaces',
      refusal('account.suspended', 'The account is suspended.', 'Ask the operator to reopen it.'),
      403,
    );
    const { status, body } = await read(await list.GET(get('/api/projects')));
    expect(status).toBe(403);
    expect(body.error.code).toBe('account.suspended');
  });

  it('refuses a new project with no session', async () => {
    state.signedIn = false;
    const { status } = await read(await list.POST(send('POST', '/api/projects', { name: 'Title deeds' })));
    expect(status).toBe(401);
  });

  it('asks for a longer name', async () => {
    const { status, body } = await read(await list.POST(send('POST', '/api/projects', { name: 'T' })));
    expect(status).toBe(400);
    expect(body.error.code).toBe('project.name_short');
    expect(calls).toHaveLength(0);
  });

  it('opens the project in the named workspace and answers 201 with that workspace', async () => {
    answer('GET', '/workspaces', { workspaces: [registry, shop] });
    answer('POST', '/workspaces/wsp_shop/projects', {
      project: { projectId: 'prj_new', name: 'Gift cards' },
      blueprint: { version: 1 },
    });

    const { status, body } = await read(
      await list.POST(
        send('POST', '/api/projects', {
          name: 'Gift cards',
          summary: 'Cards a shopper redeems.',
          workspaceId: 'wsp_shop',
        }),
      ),
    );

    expect(status).toBe(201);
    expect(body.project.projectId).toBe('prj_new');
    expect(body.workspace.workspaceId).toBe('wsp_shop');
    const opened = calls.find((call) => call.method === 'POST');
    expect(opened).toMatchObject({
      path: '/workspaces/wsp_shop/projects',
      body: { name: 'Gift cards', summary: 'Cards a shopper redeems.' },
      authorization: 'Bearer tok_project_suite',
    });
  });

  it('relays a refusal opening the project', async () => {
    answer('GET', '/workspaces', { workspaces: [registry] });
    answer(
      'POST',
      '/workspaces/wsp_registry/projects',
      refusal('project.limit', 'The plan holds five projects.', 'Choose a larger plan.'),
      402,
    );
    const { status, body } = await read(await list.POST(send('POST', '/api/projects', { name: 'Title deeds' })));
    expect(status).toBe(402);
    expect(body.error.fix).toBe('Choose a larger plan.');
  });
});

describe('the single project route', () => {
  it('refuses every method with no session', async () => {
    state.signedIn = false;
    expect((await one.GET(get('/api/projects/prj_land'), context)).status).toBe(401);
    expect((await one.PATCH(send('PATCH', '/api/projects/prj_land', { name: 'Deeds' }), context)).status).toBe(401);
    expect((await one.DELETE(get('/api/projects/prj_land'), context)).status).toBe(401);
  });

  it('reads the project', async () => {
    answer('GET', '/projects/prj_land', { project: project('prj_land', 'Land titles', '2026-02-01T00:00:00.000Z') });
    const { status, body } = await read(await one.GET(get('/api/projects/prj_land'), context));
    expect(status).toBe(200);
    expect(body.project.name).toBe('Land titles');
  });

  it('relays a missing project', async () => {
    answer('GET', '/projects/prj_land', refusal('project.absent', 'Cerulea holds no such project.', 'Open the list.'), 404);
    const { status, body } = await read(await one.GET(get('/api/projects/prj_land'), context));
    expect(status).toBe(404);
    expect(body.error.code).toBe('project.absent');
  });

  it('asks for a known state on a change', async () => {
    const { status, body } = await read(
      await one.PATCH(send('PATCH', '/api/projects/prj_land', { state: 'archived' }), context),
    );
    expect(status).toBe(400);
    expect(body.error.code).toBe('project.change_unclear');
    expect(calls).toHaveLength(0);
  });

  it('sends the change and returns the updated project', async () => {
    answer('PATCH', '/projects/prj_land', { project: { projectId: 'prj_land', name: 'Title deeds' } });
    const { status, body } = await read(
      await one.PATCH(send('PATCH', '/api/projects/prj_land', { name: 'Title deeds', state: 'building' }), context),
    );
    expect(status).toBe(200);
    expect(body.project.name).toBe('Title deeds');
    expect(calls[0].body).toEqual({ name: 'Title deeds', state: 'building' });
  });

  it('relays a refusal on a change', async () => {
    answer('PATCH', '/projects/prj_land', refusal('project.closed', 'The project is closed.', 'Reopen it first.'), 409);
    const { status } = await read(
      await one.PATCH(send('PATCH', '/api/projects/prj_land', { summary: 'Deeds' }), context),
    );
    expect(status).toBe(409);
  });

  it('closes the project by setting its state', async () => {
    answer('PATCH', '/projects/prj_land', { project: { projectId: 'prj_land', state: 'closed' } });
    const { status, body } = await read(await one.DELETE(get('/api/projects/prj_land'), context));
    expect(status).toBe(200);
    expect(body.project.state).toBe('closed');
    expect(calls[0]).toMatchObject({ method: 'PATCH', body: { state: 'closed' } });
  });

  it('answers 503 when Cerulea APIs is unreachable on close', async () => {
    unreachable('PATCH', '/projects/prj_land');
    const { status, body } = await read(await one.DELETE(get('/api/projects/prj_land'), context));
    expect(status).toBe(503);
    expect(body.error.code).toBe('service.unreachable');
  });
});

describe('the Blueprint route', () => {
  it('refuses both methods with no session', async () => {
    state.signedIn = false;
    expect((await blueprintRoute.GET(get('/api/projects/prj_land/blueprint'), context)).status).toBe(401);
    expect(
      (await blueprintRoute.PUT(send('PUT', '/api/projects/prj_land/blueprint', { document: {} }), context)).status,
    ).toBe(401);
  });

  it('reads the version and the hash the query names', async () => {
    answer('GET', '/projects/prj_land/blueprint?version=3&blueprintHash=bph_three', {
      version: 3,
      blueprintHash: 'bph_three',
      document: { name: 'Land titles' },
    });
    const { status, body } = await read(
      await blueprintRoute.GET(get('/api/projects/prj_land/blueprint?version=3&blueprintHash=bph_three'), context),
    );
    expect(status).toBe(200);
    expect(body.document.name).toBe('Land titles');
  });

  it('reads the head when the query names nothing', async () => {
    answer('GET', '/projects/prj_land/blueprint', { version: 9, blueprintHash: 'bph_head', document: {} });
    const { body } = await read(await blueprintRoute.GET(get('/api/projects/prj_land/blueprint'), context));
    expect(body.version).toBe(9);
  });

  it('relays a failure reading the Blueprint', async () => {
    answer('GET', '/projects/prj_land/blueprint', refusal('blueprint.absent', 'No Blueprint.', 'Save one.'), 404);
    const { status } = await read(await blueprintRoute.GET(get('/api/projects/prj_land/blueprint'), context));
    expect(status).toBe(404);
  });

  it('asks for a whole expected version', async () => {
    const { status, body } = await read(
      await blueprintRoute.PUT(
        send('PUT', '/api/projects/prj_land/blueprint', { document: {}, expectedVersion: 1.5 }),
        context,
      ),
    );
    expect(status).toBe(400);
    expect(body.error.code).toBe('blueprint.body_absent');
  });

  it('saves the document with the note and the expected version', async () => {
    answer('PUT', '/projects/prj_land/blueprint', { blueprint: { version: 5 }, created: true });
    const { status, body } = await read(
      await blueprintRoute.PUT(
        send('PUT', '/api/projects/prj_land/blueprint', {
          document: { name: 'Land titles' },
          note: 'Added the survey feed.',
          expectedVersion: 4,
        }),
        context,
      ),
    );
    expect(status).toBe(200);
    expect(body.created).toBe(true);
    expect(calls[0].body).toEqual({
      document: { name: 'Land titles' },
      note: 'Added the survey feed.',
      expectedVersion: 4,
    });
  });

  it('relays a version conflict on save', async () => {
    answer(
      'PUT',
      '/projects/prj_land/blueprint',
      refusal('blueprint.version_moved', 'Someone saved first.', 'Reload the Blueprint.'),
      409,
    );
    const { status, body } = await read(
      await blueprintRoute.PUT(send('PUT', '/api/projects/prj_land/blueprint', { document: {} }), context),
    );
    expect(status).toBe(409);
    expect(body.error.fix).toBe('Reload the Blueprint.');
  });
});

describe('the Blueprint versions route', () => {
  it('refuses with no session', async () => {
    state.signedIn = false;
    expect((await versionsRoute.GET(get('/api/projects/prj_land/blueprint/versions'), context)).status).toBe(401);
  });

  it('compares two versions when the query names both', async () => {
    answer('GET', '/projects/prj_land/blueprint/comparison?from=2&to=5', {
      from: 2,
      to: 5,
      changedSections: ['collections'],
      identical: false,
    });
    const { status, body } = await read(
      await versionsRoute.GET(get('/api/projects/prj_land/blueprint/versions?from=2&to=5'), context),
    );
    expect(status).toBe(200);
    expect(body.changedSections).toEqual(['collections']);
  });

  it('lists the versions with the limit the query names', async () => {
    answer('GET', '/projects/prj_land/blueprint/versions?limit=5', { versions: [{ version: 5 }] });
    const { body } = await read(
      await versionsRoute.GET(get('/api/projects/prj_land/blueprint/versions?limit=5&from=2'), context),
    );
    expect(body.versions).toEqual([{ version: 5 }]);
  });

  it('relays a failure', async () => {
    answer(
      'GET',
      '/projects/prj_land/blueprint/versions',
      refusal('project.forbidden', 'No access.', 'Ask the owner.'),
      403,
    );
    const { status } = await read(await versionsRoute.GET(get('/api/projects/prj_land/blueprint/versions'), context));
    expect(status).toBe(403);
  });
});

describe('the build state route', () => {
  it('reads the build state with the three substrates', async () => {
    answer('GET', '/studio/projects/prj_land/build-state', {
      projectId: 'prj_land',
      buildState: { execution: { substrate: 'Native' } },
      rowVersion: 3,
    });
    answer('GET', '/studio/execution-substrates', { substrates: [{ substrate: 'Native' }] });
    const { status, body } = await read(await buildState.GET(get('/api/projects/prj_land/build-state'), context));
    expect(status).toBe(200);
    expect(body).toEqual({
      projectId: 'prj_land',
      buildState: { execution: { substrate: 'Native' } },
      rowVersion: 3,
      substrates: [{ substrate: 'Native' }],
    });
  });

  it('refuses a save with no session', async () => {
    state.signedIn = false;
    const { status } = await read(
      await buildState.PUT(send('PUT', '/api/projects/prj_land/build-state', { buildState: {} }), context),
    );
    expect(status).toBe(401);
  });

  it('asks for the build state on a save', async () => {
    for (const body of [{ state: {} }, 'not json', '42']) {
      const { status, body: reply } = await read(
        await buildState.PUT(send('PUT', '/api/projects/prj_land/build-state', body), context),
      );
      expect(status).toBe(400);
      expect(reply.error.code).toBe('build_state.body_absent');
    }
    expect(calls).toHaveLength(0);
  });

  it('saves the build state it receives', async () => {
    answer('PUT', '/studio/projects/prj_land/build-state', { projectId: 'prj_land', rowVersion: 4 });
    const { status, body } = await read(
      await buildState.PUT(
        send('PUT', '/api/projects/prj_land/build-state', { buildState: { disclosureLevel: 2 } }),
        context,
      ),
    );
    expect(status).toBe(200);
    expect(body.rowVersion).toBe(4);
    expect(calls[0].body).toEqual({ buildState: { disclosureLevel: 2 } });
  });

  it('relays a refusal on save', async () => {
    answer(
      'PUT',
      '/studio/projects/prj_land/build-state',
      refusal('build_state.invalid', 'The level is out of range.', 'Choose one through four.'),
      422,
    );
    const { status, body } = await read(
      await buildState.PUT(send('PUT', '/api/projects/prj_land/build-state', { buildState: {} }), context),
    );
    expect(status).toBe(422);
    expect(body.error.fix).toBe('Choose one through four.');
  });
});

describe('the checkpoints route', () => {
  it('refuses both methods with no session', async () => {
    state.signedIn = false;
    expect((await checkpoints.GET(get('/api/projects/prj_land/checkpoints'), context)).status).toBe(401);
    expect(
      (await checkpoints.POST(send('POST', '/api/projects/prj_land/checkpoints', { label: 'Go' }), context)).status,
    ).toBe(401);
  });

  it('lists the checkpoints', async () => {
    answer('GET', '/projects/prj_land/checkpoints', { checkpoints: [{ checkpointId: 'chk_1' }] });
    const { body } = await read(await checkpoints.GET(get('/api/projects/prj_land/checkpoints'), context));
    expect(body.checkpoints).toEqual([{ checkpointId: 'chk_1' }]);
  });

  it('relays a failure listing the checkpoints', async () => {
    unreachable('GET', '/projects/prj_land/checkpoints');
    const { status } = await read(await checkpoints.GET(get('/api/projects/prj_land/checkpoints'), context));
    expect(status).toBe(503);
  });

  it('asks for a label of two characters', async () => {
    const { status, body } = await read(
      await checkpoints.POST(send('POST', '/api/projects/prj_land/checkpoints', { label: 'G' }), context),
    );
    expect(status).toBe(400);
    expect(body.error.code).toBe('checkpoint.label_short');
  });

  it('takes a checkpoint at the named version and answers 201', async () => {
    answer('POST', '/projects/prj_land/checkpoints', { checkpoint: { checkpointId: 'chk_2', version: 3 } });
    const { status, body } = await read(
      await checkpoints.POST(
        send('POST', '/api/projects/prj_land/checkpoints', { label: 'Survey done', version: 3 }),
        context,
      ),
    );
    expect(status).toBe(201);
    expect(body.checkpoint.version).toBe(3);
    expect(calls[0].body).toEqual({ label: 'Survey done', version: 3 });
  });

  it('relays a refusal taking the checkpoint', async () => {
    answer('POST', '/projects/prj_land/checkpoints', refusal('checkpoint.version_absent', 'No version 9.', 'Pick another.'), 404);
    const { status } = await read(
      await checkpoints.POST(send('POST', '/api/projects/prj_land/checkpoints', { label: 'Go on', version: 9 }), context),
    );
    expect(status).toBe(404);
  });
});

describe('the Deployment Manifest route', () => {
  it('reads the view, the version and the comparison the query names', async () => {
    answer('GET', '/projects/prj_land/deployment-manifest?view=comparison&version=4&against=2', { items: 3 });
    const { status, body } = await read(
      await manifest.GET(
        get('/api/projects/prj_land/manifest?view=comparison&version=4&against=2'),
        context,
      ),
    );
    expect(status).toBe(200);
    expect(body.items).toBe(3);
  });

  it('falls back to the summary view and drops a version that is no whole positive number', async () => {
    answer('GET', '/projects/prj_land/deployment-manifest?view=summary', { items: 1 });
    const { status } = await read(
      await manifest.GET(get('/api/projects/prj_land/manifest?view=everything&version=2.5&against=%20'), context),
    );
    expect(status).toBe(200);
    expect(calls[0].path).toBe('/projects/prj_land/deployment-manifest?view=summary');
  });
});

describe('the policies route', () => {
  const answers5 = {
    confirmation: 'MaximumCertainty',
    operators: 'SeveralOrganisations',
    errorCost: 'Irreversible',
    split: 'HaltToStayConsistent',
    retention: 'Permanent',
  };

  it('reads the five questions', async () => {
    answer('GET', '/studio/policies/questions', { questions: [{ id: 'confirmation' }] });
    const { status, body } = await read(await policies.GET());
    expect(status).toBe(200);
    expect(body.questions).toEqual([{ id: 'confirmation' }]);
  });

  it('refuses the profiles with no session', async () => {
    state.signedIn = false;
    const { status } = await read(await policies.POST(send('POST', '/api/projects/prj_land/policies', answers5)));
    expect(status).toBe(401);
  });

  it('asks for all five answers', async () => {
    const { status, body } = await read(
      await policies.POST(send('POST', '/api/projects/prj_land/policies', { ...answers5, retention: 'Forever' })),
    );
    expect(status).toBe(400);
    expect(body.error.code).toBe('policies.declarations_incomplete');
    expect(calls).toHaveLength(0);
  });

  it('sends the five answers and returns the profiles', async () => {
    answer('POST', '/studio/policies/profiles', { profiles: [{ profileId: 'prf_safe' }] });
    const { status, body } = await read(
      await policies.POST(send('POST', '/api/projects/prj_land/policies', answers5)),
    );
    expect(status).toBe(200);
    expect(body.profiles).toEqual([{ profileId: 'prf_safe' }]);
    expect(calls[0].body).toEqual(answers5);
  });

  it('relays a failure reading the profiles', async () => {
    answer('POST', '/studio/policies/profiles', refusal('policies.search_failed', 'No valid point.', 'Relax one answer.'), 422);
    const { status, body } = await read(
      await policies.POST(send('POST', '/api/projects/prj_land/policies', answers5)),
    );
    expect(status).toBe(422);
    expect(body.error.fix).toBe('Relax one answer.');
  });
});

describe('the simulation route', () => {
  it('refuses with no session', async () => {
    state.signedIn = false;
    const { status } = await read(
      await simulation.POST(send('POST', '/api/projects/prj_land/simulation', {}), context),
    );
    expect(status).toBe(401);
  });

  it('asks for a count between one and fifty', async () => {
    const { status, body } = await read(
      await simulation.POST(send('POST', '/api/projects/prj_land/simulation', { transactionsPerClass: 80 }), context),
    );
    expect(status).toBe(400);
    expect(body.error.code).toBe('simulation.request_unclear');
  });

  it('runs with an empty request when the body is no JSON', async () => {
    answer('POST', '/studio/projects/prj_land/simulation', { classes: [] });
    const { status } = await read(
      await simulation.POST(send('POST', '/api/projects/prj_land/simulation', 'no body'), context),
    );
    expect(status).toBe(200);
    expect(calls[0].body).toEqual({});
  });

  it('sends the count and the version and returns the measurement', async () => {
    answer('POST', '/studio/projects/prj_land/simulation', {
      classes: [{ name: 'Routine', finalised: 10 }],
    });
    const { status, body } = await read(
      await simulation.POST(
        send('POST', '/api/projects/prj_land/simulation', { transactionsPerClass: 10, version: 4 }),
        context,
      ),
    );
    expect(status).toBe(200);
    expect(body.classes[0].finalised).toBe(10);
    expect(calls[0]).toMatchObject({
      path: '/studio/projects/prj_land/simulation',
      body: { transactionsPerClass: 10, version: 4 },
    });
  });

  it('relays a failure from the Blockchain', async () => {
    answer('POST', '/studio/projects/prj_land/simulation', refusal('chain.halted', 'The node halted.', 'Restart the node.'), 502);
    const { status } = await read(
      await simulation.POST(send('POST', '/api/projects/prj_land/simulation', {}), context),
    );
    expect(status).toBe(502);
  });
});
