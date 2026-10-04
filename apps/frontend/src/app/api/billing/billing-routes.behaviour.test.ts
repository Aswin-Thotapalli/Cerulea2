// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The Studio billing routes, one call each.
 *
 * Each test signs the account in or out, answers the Cerulea APIs call the
 * route sends, and reads what the route answers the screen. The fake Cerulea
 * APIs records every call, so each test also checks the path, the method, the
 * body, the division and the origin the route sent.
 */

const state = vi.hoisted(() => ({ signedIn: true, cookieDivision: '' as string }));

vi.mock('next/headers', () => ({
  cookies: () => ({
    getAll: () => [{ name: 'next-auth.session-token', value: 'session' }],
    get: (name: string) =>
      name === 'cerulea.division' && state.cookieDivision
        ? { name, value: state.cookieDivision }
        : undefined,
  }),
  headers: () => new Headers({ host: 'studio.localhost:3011' }),
}));

vi.mock('next-auth/jwt', () => ({
  getToken: async () =>
    state.signedIn
      ? {
          cerulea: {
            accountId: 'acc_billing_suite',
            email: 'billing@cerulea.test',
            displayName: 'Bela Nair',
            accessToken: 'tok_billing_suite',
          },
        }
      : null,
}));

import * as access from './access/route';
import * as addonCheckout from './addons/checkout/route';
import * as catalogue from './catalogue/route';
import * as checkout from './checkout/route';
import * as customer from './customer/route';
import * as exportRoute from './export/route';
import * as invoiceDocument from './invoices/[id]/document/route';
import * as invoices from './invoices/route';
import * as paymentMethod from './payment-method/route';
import * as subscription from './subscription/route';
import * as addons from './subscription/addons/route';
import * as removeAddon from './subscription/addons/remove/route';
import * as cancel from './subscription/cancel/route';
import * as changeTier from './subscription/change-tier/route';
import * as resume from './subscription/resume/route';
import { studioDocumentAddress, studioOrigin, withDivision } from './_shared/commerce';

const BASE = 'http://cerulea-apis.test';
const STUDIO = 'http://studio.localhost:3011';

type Call = { method: string; path: string; body: unknown; headers: Record<string, string> };
type Answer = {
  method: string;
  path: string;
  status: number;
  body: unknown;
  headers?: Record<string, string>;
  raw?: boolean;
};

let calls: Call[] = [];
let answers: Answer[] = [];

function answer(method: string, path: string, body: unknown, status = 200, extra: Partial<Answer> = {}): void {
  answers.push({ method, path, status, body, ...extra });
}

function refusal(code: string, message: string, fix: string) {
  return { error: { code, message, fix, details: { field: 'suite' } } };
}

beforeEach(() => {
  state.signedIn = true;
  state.cookieDivision = '';
  calls = [];
  answers = [];
  process.env.NEXTAUTH_SECRET = 'billing-route-suite';
  process.env.CERULEA_API_URL = BASE;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const url = new URL(String(input));
      const path = `${url.pathname}${url.search}`;
      const method = init.method ?? 'GET';
      const headers = Object.fromEntries(
        Object.entries((init.headers ?? {}) as Record<string, string>).map(([key, value]) => [
          key.toLowerCase(),
          value,
        ]),
      );
      calls.push({
        method,
        path,
        body: typeof init.body === 'string' ? JSON.parse(init.body) : null,
        headers,
      });
      const found = answers.find((entry) => entry.method === method && entry.path === path);
      if (!found) {
        return new Response(JSON.stringify(refusal('suite.unplanned', `No answer for ${method} ${path}.`, 'Plan it.')), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (found.raw) {
        return new Response(String(found.body), { status: found.status, headers: found.headers });
      }
      return new Response(JSON.stringify(found.body), {
        status: found.status,
        headers: { 'content-type': 'application/json', ...(found.headers ?? {}) },
      });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function request(path: string, init: RequestInit = {}): Request {
  return new Request(`${STUDIO}${path}`, init);
}

function json(path: string, method: string, body: unknown): Request {
  return request(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('the shared billing bridge', () => {
  it('reads the Studio origin from the request and from a proxy header', () => {
    expect(studioOrigin(request('/api/billing/checkout'))).toBe(STUDIO);
    expect(
      studioOrigin(
        request('/api/billing/checkout', {
          headers: { 'x-forwarded-host': 'studio.cerulea.io', 'x-forwarded-proto': 'https' },
        }),
      ),
    ).toBe('https://studio.cerulea.io');
  });

  it('adds the division to a success address on this site only', () => {
    expect(withDivision(`${STUDIO}/pricing/success?return=%2Fdashboard`, 'dapp')).toBe(
      `${STUDIO}/pricing/success?return=%2Fdashboard&division=dapp`,
    );
    expect(withDivision('/pricing/success', 'govt')).toBe('/pricing/success?division=govt');
    expect(withDivision('https://pay.example/session/1', 'dapp')).toBe('https://pay.example/session/1');
    expect(withDivision(undefined, 'dapp')).toBeUndefined();
  });

  it('points an invoice document at the Studio route and leaves an outside address alone', () => {
    expect(studioDocumentAddress('inv_1', '/studio/billing/invoices/inv_1/document?format=pdf', 'pdf')).toBe(
      '/api/billing/invoices/inv_1/document?format=pdf',
    );
    expect(studioDocumentAddress('inv_1', 'https://pay.example/invoice.pdf', 'pdf')).toBe(
      'https://pay.example/invoice.pdf',
    );
    expect(studioDocumentAddress('inv_1', null, 'html')).toBeNull();
  });
});

describe('the subscription read', () => {
  it('asks Cerulea APIs for the division named in the address, with the token and the device', async () => {
    answer('GET', '/studio/billing/subscription?division=enterprise', {
      ok: true,
      division: 'enterprise',
      subscription: { id: 'sub_1', tierId: 'ent_sme', status: 'active', cancelAtPeriodEnd: false, currentPeriodEnd: null, billing: 'one_time' },
      tier: { id: 'ent_sme', name: 'SME' },
      addons: [],
      oneTimePurchases: [],
    });
    const reply = await subscription.GET(request('/api/billing/subscription?division=enterprise'));
    expect(reply.status).toBe(200);
    const body = await reply.json();
    expect(body.ok).toBe(true);
    expect(body.division).toBe('enterprise');
    expect(body.tier.name).toBe('SME');
    expect(calls[0].headers.authorization).toBe('Bearer tok_billing_suite');
    expect(calls[0].headers['x-cerulea-device']).toBe('Cerulea Studio');
  });

  it('reads the division from the cookie the gate writes', async () => {
    state.cookieDivision = 'govt';
    answer('GET', '/studio/billing/subscription?division=govt', { ok: true, subscription: null, tier: null, addons: [], oneTimePurchases: [] });
    const reply = await subscription.GET(request('/api/billing/subscription'));
    expect(reply.status).toBe(200);
    expect(calls[0].path).toBe('/studio/billing/subscription?division=govt');
  });

  it('names the missing division when nothing carries one', async () => {
    const reply = await subscription.GET(request('/api/billing/subscription'));
    expect(reply.status).toBe(400);
    const body = await reply.json();
    expect(body.code).toBe('billing.division_unnamed');
    expect(body.error).toContain('division=dapp');
    expect(calls).toHaveLength(0);
  });

  it('asks for a sign in when nobody signed in', async () => {
    state.signedIn = false;
    const reply = await subscription.GET(request('/api/billing/subscription?division=dapp'));
    expect(reply.status).toBe(401);
    expect((await reply.json()).code).toBe('session.absent');
  });

  it('passes a Cerulea refusal through with its status and fix', async () => {
    answer('GET', '/studio/billing/subscription?division=dapp', refusal('billing.read_refused', 'The member holds no billing read.', 'Ask the owner.'), 403);
    const reply = await subscription.GET(request('/api/billing/subscription?division=dapp'));
    expect(reply.status).toBe(403);
    const body = await reply.json();
    expect(body.code).toBe('billing.read_refused');
    expect(body.fix).toBe('Ask the owner.');
    expect(body.error).toBe('The member holds no billing read. Ask the owner.');
  });
});

describe('the checkout', () => {
  it('sends the tier, the add-ons, the division and the Studio origin, and marks the success address with the division', async () => {
    answer('POST', '/studio/billing/checkout', {
      ok: true,
      url: `${STUDIO}/pricing/success`,
      devMode: true,
      workspaceId: 'wsp_1',
      subscriptionId: 'sub_2',
    });
    const reply = await checkout.POST(
      json('/api/billing/checkout', 'POST', {
        tierId: 'public_dapps',
        addons: [{ addonId: 'extra_rpc', quantity: 2 }],
        division: 'dapp',
      }),
    );
    expect(reply.status).toBe(200);
    const body = await reply.json();
    expect(body.url).toBe(`${STUDIO}/pricing/success?division=dapp`);
    expect(calls[0].body).toEqual({
      tierId: 'public_dapps',
      addons: [{ addonId: 'extra_rpc', quantity: 2 }],
      division: 'dapp',
      origin: STUDIO,
    });
  });

  it('keeps a return address on this site and drops one naming another site', async () => {
    answer('POST', '/studio/billing/checkout', { ok: true, url: '/pricing/success?return=%2Fdapps', workspaceId: 'wsp_1' });
    await checkout.POST(json('/api/billing/checkout', 'POST', { tierId: 'public_dapps', division: 'dapp', returnUrl: '/dapps' }));
    expect(calls[0].body).toMatchObject({ returnUrl: '/dapps' });
    calls = [];
    answers = [];
    answer('POST', '/studio/billing/checkout', { ok: true, url: '/pricing/success', workspaceId: 'wsp_1' });
    await checkout.POST(json('/api/billing/checkout', 'POST', { tierId: 'public_dapps', division: 'dapp', returnUrl: '//attacker.example/' }));
    expect(calls[0].body).not.toHaveProperty('returnUrl');
  });

  it('refuses a body without a tier before any call leaves', async () => {
    const reply = await checkout.POST(json('/api/billing/checkout', 'POST', { addons: [] }));
    expect(reply.status).toBe(400);
    expect((await reply.json()).code).toBe('billing.tier_unnamed');
    expect(calls).toHaveLength(0);
  });
});

describe('the subscription changes', () => {
  it('cancels at the end of the period by default', async () => {
    answer('POST', '/studio/billing/subscription/cancel', { ok: true, atPeriodEnd: true });
    const reply = await cancel.POST(json('/api/billing/subscription/cancel', 'POST', { division: 'dapp' }));
    expect(reply.status).toBe(200);
    expect(calls[0].body).toEqual({ atPeriodEnd: true, division: 'dapp', origin: STUDIO });
  });

  it('resumes a pending end', async () => {
    answer('POST', '/studio/billing/subscription/resume', { ok: true });
    const reply = await resume.POST(json('/api/billing/subscription/resume', 'POST', { division: 'dapp' }));
    expect((await reply.json()).ok).toBe(true);
    expect(calls[0].path).toBe('/studio/billing/subscription/resume');
  });

  it('changes the tier and reports the add-ons removed', async () => {
    answer('POST', '/studio/billing/subscription/change-tier', { ok: true, tierId: 'private_dapps', removedAddons: ['Extra RPC'] });
    const reply = await changeTier.POST(json('/api/billing/subscription/change-tier', 'POST', { tierId: 'private_dapps', division: 'dapp' }));
    const body = await reply.json();
    expect(body.removedAddons).toEqual(['Extra RPC']);
    expect(calls[0].body).toMatchObject({ tierId: 'private_dapps', division: 'dapp' });
  });

  it('refuses a tier change without a tier', async () => {
    const reply = await changeTier.POST(json('/api/billing/subscription/change-tier', 'POST', { division: 'dapp' }));
    expect(reply.status).toBe(400);
  });

  it('sets the whole add-on selection with PATCH', async () => {
    answer('PATCH', '/studio/billing/subscription/addons', { ok: true, addons: [{ addonId: 'extra_rpc', quantity: 1 }] });
    const reply = await addons.PATCH(
      json('/api/billing/subscription/addons', 'PATCH', { selections: [{ addonId: 'extra_rpc', quantity: 1 }], division: 'dapp' }),
    );
    expect(reply.status).toBe(200);
    expect(calls[0].method).toBe('PATCH');
    expect(calls[0].body).toMatchObject({ selections: [{ addonId: 'extra_rpc', quantity: 1 }] });
  });

  it('removes one add-on at once', async () => {
    answer('POST', '/studio/billing/subscription/addons/remove', { ok: true });
    await removeAddon.POST(json('/api/billing/subscription/addons/remove', 'POST', { addonId: 'extra_rpc', division: 'dapp' }));
    expect(calls[0].body).toMatchObject({ addonId: 'extra_rpc' });
  });

  it('starts a one time add-on purchase', async () => {
    answer('POST', '/studio/billing/addons/checkout', { ok: true, url: `${STUDIO}/dashboard/billing?purchase=success`, workspaceId: 'wsp_1' });
    const reply = await addonCheckout.POST(json('/api/billing/addons/checkout', 'POST', { addonId: 'custom_domain', division: 'dapp' }));
    expect((await reply.json()).url).toContain('/dashboard/billing?purchase=success');
  });

  it('buys a chain data export in the named format', async () => {
    answer('POST', '/studio/billing/export', { ok: true, url: `${STUDIO}/dashboard/billing?export=success`, workspaceId: 'wsp_1', downloadUrl: '/exports/1.csv' });
    const reply = await exportRoute.POST(json('/api/billing/export', 'POST', { format: 'csv', division: 'dapp' }));
    expect((await reply.json()).downloadUrl).toBe('/exports/1.csv');
    expect(calls[0].body).toMatchObject({ format: 'csv' });
  });

  it('refuses an export format outside csv and pdf', async () => {
    const reply = await exportRoute.POST(json('/api/billing/export', 'POST', { format: 'xlsx', division: 'dapp' }));
    expect(reply.status).toBe(400);
  });

  it('opens the payment method page', async () => {
    answer('POST', '/studio/billing/payment-method', { ok: true, url: `${BASE}/local/payments/method/1`, devMode: true });
    const reply = await paymentMethod.POST(json('/api/billing/payment-method', 'POST', { division: 'dapp' }));
    expect((await reply.json()).url).toContain('/local/payments/method/1');
  });
});

describe('the billing details', () => {
  it('reads the customer of the division', async () => {
    answer('GET', '/studio/billing/customer?division=dapp', { ok: true, name: 'Bela Nair', phone: null, address: null, taxIds: [] });
    const reply = await customer.GET(request('/api/billing/customer?division=dapp'));
    expect((await reply.json()).name).toBe('Bela Nair');
  });

  it('writes an address, adds a tax identifier and removes one with the same PATCH', async () => {
    answer('PATCH', '/studio/billing/customer', { ok: true });
    await customer.PATCH(
      json('/api/billing/customer', 'PATCH', {
        division: 'dapp',
        address: { line1: '1 Road', city: 'Hyderabad', state: 'Telangana', postal_code: '500001', country: 'IN' },
      }),
    );
    await customer.PATCH(json('/api/billing/customer', 'PATCH', { division: 'dapp', addTaxId: { type: 'in_gst', value: '36AAAAA0000A1Z5' } }));
    await customer.PATCH(json('/api/billing/customer', 'PATCH', { division: 'dapp', removeTaxId: 'tax_1' }));
    expect(calls.map((call) => call.body)).toEqual([
      expect.objectContaining({ address: expect.objectContaining({ line1: '1 Road', country: 'IN' }) }),
      expect.objectContaining({ addTaxId: { type: 'in_gst', value: '36AAAAA0000A1Z5' } }),
      expect.objectContaining({ removeTaxId: 'tax_1' }),
    ]);
  });

  it('refuses an address without a two letter country before any call leaves', async () => {
    const reply = await customer.PATCH(
      json('/api/billing/customer', 'PATCH', { division: 'dapp', address: { line1: '1 Road', city: 'Hyderabad', country: 'India' } }),
    );
    expect(reply.status).toBe(400);
    expect((await reply.json()).code).toBe('billing.customer_unreadable');
    expect(calls).toHaveLength(0);
  });
});

describe('the invoices', () => {
  it('lists the invoices with their document links pointed at Studio', async () => {
    answer('GET', '/studio/billing/invoices?division=dapp&starting_after=inv_0', {
      ok: true,
      hasMore: false,
      invoices: [
        {
          id: 'inv_1',
          number: 'CB-0001',
          date: 1760000000,
          amountPaid: 4000,
          amountDue: 0,
          currency: 'usd',
          status: 'paid',
          pdfUrl: '/studio/billing/invoices/inv_1/document?format=pdf',
          viewUrl: '/studio/billing/invoices/inv_1/document?format=html',
          description: null,
        },
      ],
    });
    const reply = await invoices.GET(request('/api/billing/invoices?division=dapp&starting_after=inv_0'));
    const body = await reply.json();
    expect(body.invoices[0].pdfUrl).toBe('/api/billing/invoices/inv_1/document?format=pdf');
    expect(body.invoices[0].viewUrl).toBe('/api/billing/invoices/inv_1/document?format=html');
  });

  it('serves one invoice document with the token and passes the headers through', async () => {
    answer('GET', '/studio/billing/invoices/inv_1/document?format=pdf', '%PDF-1.4 suite', 200, {
      raw: true,
      headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="CB-0001.pdf"' },
    });
    const reply = await invoiceDocument.GET(request('/api/billing/invoices/inv_1/document?format=pdf'), {
      params: Promise.resolve({ id: 'inv_1' }),
    });
    expect(reply.status).toBe(200);
    expect(reply.headers.get('content-type')).toBe('application/pdf');
    expect(reply.headers.get('content-disposition')).toBe('attachment; filename="CB-0001.pdf"');
    expect(await reply.text()).toBe('%PDF-1.4 suite');
    expect(calls[0].headers.authorization).toBe('Bearer tok_billing_suite');
  });

  it('reports a refused invoice document in the Studio failure shape', async () => {
    answer('GET', '/studio/billing/invoices/inv_9/document?format=html', refusal('billing.invoice_absent', 'Cerulea holds no invoice with that identifier.', 'Read the invoice list.'), 404);
    const reply = await invoiceDocument.GET(request('/api/billing/invoices/inv_9/document'), {
      params: Promise.resolve({ id: 'inv_9' }),
    });
    expect(reply.status).toBe(404);
    expect((await reply.json()).code).toBe('billing.invoice_absent');
  });

  it('asks for a sign in before serving a document', async () => {
    state.signedIn = false;
    const reply = await invoiceDocument.GET(request('/api/billing/invoices/inv_1/document'), {
      params: Promise.resolve({ id: 'inv_1' }),
    });
    expect(reply.status).toBe(401);
  });
});

describe('the catalogue and the standing', () => {
  it('serves the catalogue of one division without a sign in', async () => {
    state.signedIn = false;
    answer('GET', '/studio/catalogue?division=govt', { currency: 'usd', complianceSentence: 'Controls implemented, certification not held.', divisions: [{ division: 'govt', tiers: [], addons: [] }] });
    const reply = await catalogue.GET(request('/api/billing/catalogue?division=govt'));
    const body = await reply.json();
    expect(body.ok).toBe(true);
    expect(body.divisions[0].division).toBe('govt');
    expect(calls[0].headers.authorization).toBeUndefined();
  });

  it('serves the whole catalogue when no division is named', async () => {
    answer('GET', '/studio/catalogue', { currency: 'usd', complianceSentence: 'x', divisions: [] });
    const reply = await catalogue.GET(request('/api/billing/catalogue'));
    expect(reply.status).toBe(200);
  });

  it('reads the standing of the account in every division', async () => {
    answer('GET', '/studio/access', { accountId: 'acc_billing_suite', operator: false, subscriptions: { dapp: 'public_dapps' }, divisions: [] });
    const reply = await access.GET();
    const body = await reply.json();
    expect(body.subscriptions.dapp).toBe('public_dapps');
    expect(calls[0].headers.authorization).toBe('Bearer tok_billing_suite');
  });
});
