import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  planFromDivisions,
  readDivisionSubs,
  readOperatorRole,
  readStanding,
  subscriptionOpen,
} from './standing';
import {
  applicationForDivision,
  asDivision,
  divisionForApplication,
  hasDivisionAccess,
} from '@/config/divisions';

const base = 'https://apis.cerulea.test';

/** Answers each Cerulea APIs path with its own status and body. */
function stubRoutes(routes: Record<string, { status: number; body: unknown }>) {
  const paths: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const path = url.replace(base, '');
      paths.push(path);
      const answer = routes[path] ?? { status: 404, body: { error: { code: 'absent', message: path, fix: 'none' } } };
      return new Response(JSON.stringify(answer.body), {
        status: answer.status,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return paths;
}

function workspace(workspaceId: string, application: string) {
  return {
    workspaceId,
    name: workspaceId,
    slug: workspaceId,
    application,
    tier: 'x',
    state: 'active',
    ownerAccountId: 'acc-1',
    createdAt: '2026-09-01T00:00:00.000Z',
  };
}

function held(planId: string, state = 'active', cancelledAt: string | null = null) {
  return {
    status: 200,
    body: {
      subscription: { subscriptionId: `sub-${planId}`, planId, planName: planId, state, cancelledAt },
      invoices: [],
    },
  };
}

const options = { baseUrl: base, accessToken: 'access-1' };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the division and the workspace application', () => {
  it('maps each application to its division and back', () => {
    expect(divisionForApplication('dapps')).toBe('dapp');
    expect(divisionForApplication('enterprise')).toBe('enterprise');
    expect(divisionForApplication('government')).toBe('govt');
    expect(divisionForApplication('elsewhere')).toBeNull();
    expect(divisionForApplication(null)).toBeNull();
    expect(applicationForDivision('dapp')).toBe('dapps');
    expect(applicationForDivision('govt')).toBe('government');
  });

  it('reads a division id from any value', () => {
    expect(asDivision('govt')).toBe('govt');
    expect(asDivision('government')).toBeNull();
    expect(asDivision(undefined)).toBeNull();
  });
});

describe('the plan an account holds', () => {
  it('reads the divisions in order and answers free for an empty map', () => {
    expect(planFromDivisions({})).toBe('free');
    expect(planFromDivisions({ govt: 'plan_government' })).toBe('plan_government');
    expect(planFromDivisions({ enterprise: 'e', dapp: 'd' })).toBe('d');
  });

  it('counts a subscription open until it is cancelled, suspended or ended', () => {
    expect(subscriptionOpen('active', null)).toBe(true);
    expect(subscriptionOpen('past_due', null)).toBe(true);
    expect(subscriptionOpen('active', '2026-09-01T00:00:00.000Z')).toBe(false);
    expect(subscriptionOpen('cancelled', null)).toBe(false);
    expect(subscriptionOpen('suspended', null)).toBe(false);
  });

  it('keys each open subscription by the division of its workspace', async () => {
    stubRoutes({
      '/workspaces': {
        status: 200,
        body: {
          workspaces: [
            workspace('wsp-d', 'dapps'),
            workspace('wsp-e', 'enterprise'),
            workspace('wsp-g', 'government'),
            workspace('wsp-x', 'unknown'),
          ],
        },
      },
      '/studio/workspaces/wsp-d/subscription': held('plan_starter'),
      '/studio/workspaces/wsp-e/subscription': held('plan_enterprise', 'cancelled'),
      '/studio/workspaces/wsp-g/subscription': held('plan_government'),
    });
    const subs = await readDivisionSubs(options);
    expect(subs).toEqual({ dapp: 'plan_starter', govt: 'plan_government' });
    expect(hasDivisionAccess(subs, 'dapp')).toBe(true);
    expect(hasDivisionAccess(subs, 'enterprise')).toBe(false);
  });

  it('takes the first open plan when two workspaces serve one division', async () => {
    const paths = stubRoutes({
      '/workspaces': { status: 200, body: { workspaces: [workspace('wsp-1', 'dapps'), workspace('wsp-2', 'dapps')] } },
      '/studio/workspaces/wsp-1/subscription': held('plan_a'),
      '/studio/workspaces/wsp-2/subscription': held('plan_b'),
    });
    expect(await readDivisionSubs(options)).toEqual({ dapp: 'plan_a' });
    expect(paths).not.toContain('/studio/workspaces/wsp-2/subscription');
  });

  it('reads a workspace closed to billing as one without a plan', async () => {
    stubRoutes({
      '/workspaces': { status: 200, body: { workspaces: [workspace('wsp-1', 'dapps')] } },
      '/studio/workspaces/wsp-1/subscription': {
        status: 403,
        body: { error: { code: 'permissions.refused', message: 'm', fix: 'f' } },
      },
    });
    expect(await readDivisionSubs(options)).toEqual({});
  });

  it('passes on every other failure', async () => {
    stubRoutes({
      '/workspaces': { status: 200, body: { workspaces: [workspace('wsp-1', 'dapps')] } },
      '/studio/workspaces/wsp-1/subscription': {
        status: 500,
        body: { error: { code: 'service.down', message: 'Down.', fix: 'Wait.' } },
      },
    });
    await expect(readDivisionSubs(options)).rejects.toThrow('Down. Wait.');
  });
});

describe('the operator role', () => {
  it('holds when the administration read opens', async () => {
    stubRoutes({ '/studio/administration/workspaces': { status: 200, body: { workspaces: [] } } });
    expect(await readOperatorRole(options)).toBe(true);
  });

  it('is absent when Cerulea APIs refuses the read', async () => {
    stubRoutes({
      '/studio/administration/workspaces': {
        status: 403,
        body: { error: { code: 'operator.role_absent', message: 'm', fix: 'f' } },
      },
    });
    expect(await readOperatorRole(options)).toBe(false);
  });

  it('passes on a failure other than a refusal', async () => {
    stubRoutes({
      '/studio/administration/workspaces': {
        status: 503,
        body: { error: { code: 'service.down', message: 'Down.', fix: 'Wait.' } },
      },
    });
    await expect(readOperatorRole(options)).rejects.toThrow('Down. Wait.');
  });

  it('reads the whole standing in one pass', async () => {
    stubRoutes({
      '/workspaces': { status: 200, body: { workspaces: [workspace('wsp-g', 'government')] } },
      '/studio/workspaces/wsp-g/subscription': held('plan_government'),
      '/studio/administration/workspaces': {
        status: 403,
        body: { error: { code: 'operator.role_absent', message: 'm', fix: 'f' } },
      },
    });
    expect(await readStanding(options)).toEqual({
      divisionSubs: { govt: 'plan_government' },
      plan: 'plan_government',
      isOperator: false,
    });
  });
});
