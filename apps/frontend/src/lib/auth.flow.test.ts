import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const serverSession = vi.hoisted(() => vi.fn());

vi.mock('next-auth/next', () => ({ getServerSession: serverSession }));

import { authOptions, getSession, rotateWhenDue, type CeruleaTokenSet } from './auth';

type Call = { url: string; init: RequestInit };

const base = 'https://apis.cerulea.test';

function stubFetch(status: number, body: unknown) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return calls;
}

const account = {
  accountId: 'acc-7',
  email: 'harbour@cerulea.test',
  displayName: 'Harbour Clerk',
  state: 'active',
  multiFactorActive: true,
  createdAt: '2026-09-01T00:00:00.000Z',
};

const session = {
  sessionId: 'ses-7',
  accessToken: 'access-7',
  refreshToken: 'refresh-7',
  expiresAt: '2026-09-30T10:15:00.000Z',
  refreshExpiresAt: '2026-10-14T10:00:00.000Z',
  rotationCount: 0,
};

const tokenSet: CeruleaTokenSet = {
  accountId: 'acc-7',
  email: 'harbour@cerulea.test',
  displayName: 'Harbour Clerk',
  accessToken: 'access-7',
  refreshToken: 'refresh-7',
  accessExpiresAt: '2026-09-30T10:15:00.000Z',
  refreshExpiresAt: '2026-10-14T10:00:00.000Z',
  sessionId: 'ses-7',
};

type Authorize = (credentials: Record<string, string> | undefined, request: unknown) => Promise<unknown>;

function authorize(): Authorize {
  const provider = authOptions.providers[0] as unknown as { options: { authorize: Authorize } };
  return provider.options.authorize;
}

type JwtCallback = (input: { token: Record<string, unknown>; user?: unknown }) => Promise<Record<string, unknown>>;
type SessionCallback = (input: {
  session: { user?: Record<string, unknown> };
  token: Record<string, unknown>;
}) => Promise<{ user?: Record<string, unknown> }>;

const jwt = authOptions.callbacks!.jwt as unknown as JwtCallback;
const sessionCallback = authOptions.callbacks!.session as unknown as SessionCallback;

let heldUrl: string | undefined;

beforeEach(() => {
  heldUrl = process.env.CERULEA_API_URL;
  process.env.CERULEA_API_URL = base;
});

afterEach(() => {
  if (heldUrl === undefined) delete process.env.CERULEA_API_URL;
  else process.env.CERULEA_API_URL = heldUrl;
  vi.unstubAllGlobals();
  vi.useRealTimers();
  serverSession.mockReset();
});

describe('signing in with the Cerulea account provider', () => {
  it('names the fix when any of the three values is absent', async () => {
    for (const credentials of [
      undefined,
      { email: '', password: 'p', multiFactorCode: '1' },
      { email: 'a@cerulea.test', password: '', multiFactorCode: '1' },
      { email: 'a@cerulea.test', password: 'p', multiFactorCode: '' },
    ]) {
      await expect(authorize()(credentials, {})).rejects.toThrowError(
        'Cerulea needs the address, the password and the six digit code. Fill all three and sign in again.',
      );
    }
  });

  it('trims and lowers the address, trims the code and carries the issued pair', async () => {
    const calls = stubFetch(201, { account, session });
    const user = await authorize()(
      { email: '  Harbour@Cerulea.TEST ', password: ' kept as typed ', multiFactorCode: ' 123456 ' },
      {},
    );
    expect(calls[0].url).toBe(`${base}/sessions`);
    expect(calls[0].init.method).toBe('POST');
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      email: 'harbour@cerulea.test',
      password: ' kept as typed ',
      multiFactorCode: '123456',
    });
    expect(user).toEqual({
      id: 'acc-7',
      email: 'harbour@cerulea.test',
      name: 'Harbour Clerk',
      image: null,
      cerulea: tokenSet,
    });
  });

  it('passes the message and the fix Cerulea APIs named', async () => {
    stubFetch(401, {
      error: {
        code: 'sessions.code_refused',
        message: 'The authenticator code does not match.',
        fix: 'Type the code the authenticator shows now.',
      },
    });
    await expect(
      authorize()({ email: 'a@cerulea.test', password: 'p', multiFactorCode: '000000' }, {}),
    ).rejects.toThrowError('The authenticator code does not match. Type the code the authenticator shows now.');
  });

  it('passes on a failure that did not come from Cerulea APIs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        headers: { get: () => {
          throw new TypeError('headers unreadable');
        } },
      })),
    );
    await expect(
      authorize()({ email: 'a@cerulea.test', password: 'p', multiFactorCode: '1' }, {}),
    ).rejects.toThrowError(TypeError);
  });
});

describe('the token callback', () => {
  it('stores the issued pair and the account on first sign in', async () => {
    const token = await jwt({ token: { sub: 'x' }, user: { id: 'acc-7', cerulea: tokenSet } });
    expect(token.cerulea).toEqual(tokenSet);
    expect(token.userId).toBe('acc-7');
  });

  it('leaves the token alone when the signed in user carries no pair', async () => {
    const token = await jwt({ token: { sub: 'x' }, user: { id: 'acc-7' } });
    expect(token).toEqual({ sub: 'x' });
  });

  it('leaves a token with no pair alone on later calls', async () => {
    const calls = stubFetch(200, {});
    const token = await jwt({ token: { sub: 'y' } });
    expect(token).toEqual({ sub: 'y' });
    expect(calls).toHaveLength(0);
  });

  it('rotates a pair near its end through the refresh route on later calls', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-30T10:14:30.000Z'));
    const rotatedAccount = { ...account, accountId: 'acc-8', displayName: 'Harbour Master' };
    const rotatedSession = { ...session, accessToken: 'access-8', refreshToken: 'refresh-8', sessionId: 'ses-8' };
    const calls = stubFetch(200, { account: rotatedAccount, session: rotatedSession });
    const token = await jwt({ token: { cerulea: tokenSet } });
    expect(calls[0].url).toBe(`${base}/sessions/refresh`);
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ refreshToken: 'refresh-7' });
    expect(token.userId).toBe('acc-8');
    expect((token.cerulea as CeruleaTokenSet).accessToken).toBe('access-8');
    expect((token.cerulea as CeruleaTokenSet).displayName).toBe('Harbour Master');
  });
});

describe('rotation failures', () => {
  it('asks the person to sign in again when the failure names no fix', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        headers: { get: () => {
          throw new Error('broken');
        } },
      })),
    );
    const closed = await rotateWhenDue(
      { ...tokenSet, accessExpiresAt: '2026-09-30T10:00:00.000Z' },
      new Date('2026-09-30T10:00:00.000Z'),
    );
    expect(closed.accessToken).toBe('');
    expect(closed.signInFix).toBe('Sign in again to open a new session.');
    expect(closed.refreshToken).toBe('refresh-7');
  });

  it('treats an unreadable refresh window as closed', async () => {
    const calls = stubFetch(200, {});
    const closed = await rotateWhenDue(
      { ...tokenSet, accessExpiresAt: '2026-09-30T10:00:00.000Z', refreshExpiresAt: 'someday' },
      new Date('2026-09-30T10:00:00.000Z'),
    );
    expect(closed.signInFix).toBe('The session reached its end. Sign in again to continue.');
    expect(calls).toHaveLength(0);
  });
});

describe('the session callback', () => {
  it('copies the account and states whether the session is open', async () => {
    const open = await sessionCallback({ session: { user: {} }, token: { cerulea: tokenSet } });
    expect(open.user).toEqual({
      id: 'acc-7',
      email: 'harbour@cerulea.test',
      name: 'Harbour Clerk',
      sessionOpen: true,
      signInFix: undefined,
    });

    const closed = await sessionCallback({
      session: { user: {} },
      token: { cerulea: { ...tokenSet, accessToken: '', signInFix: 'Sign in again.' } },
    });
    expect(closed.user?.sessionOpen).toBe(false);
    expect(closed.user?.signInFix).toBe('Sign in again.');
  });

  it('leaves the session alone when the token carries no pair or the session no user', async () => {
    expect(await sessionCallback({ session: { user: { name: 'kept' } }, token: {} })).toEqual({
      user: { name: 'kept' },
    });
    expect(await sessionCallback({ session: {}, token: { cerulea: tokenSet } })).toEqual({});
  });
});

describe('reading the session on the server', () => {
  it('asks next-auth with the Studio options', async () => {
    serverSession.mockResolvedValue({ user: { id: 'acc-7' } });
    await expect(getSession()).resolves.toEqual({ user: { id: 'acc-7' } });
    expect(serverSession).toHaveBeenCalledWith(authOptions);
  });
});

describe('the session cookie', () => {
  async function cookieFor(address: string | undefined, domain: string | undefined) {
    const held = { url: process.env.NEXTAUTH_URL, domain: process.env.AUTH_COOKIE_DOMAIN };
    if (address === undefined) delete process.env.NEXTAUTH_URL;
    else process.env.NEXTAUTH_URL = address;
    if (domain === undefined) delete process.env.AUTH_COOKIE_DOMAIN;
    else process.env.AUTH_COOKIE_DOMAIN = domain;
    try {
      vi.resetModules();
      const fresh = await import('./auth');
      return fresh.authOptions.cookies!.sessionToken!;
    } finally {
      if (held.url === undefined) delete process.env.NEXTAUTH_URL;
      else process.env.NEXTAUTH_URL = held.url;
      if (held.domain === undefined) delete process.env.AUTH_COOKIE_DOMAIN;
      else process.env.AUTH_COOKIE_DOMAIN = held.domain;
    }
  }

  it('uses the plain cookie name with no secure flag on a plain address', async () => {
    const cookie = await cookieFor('http://localhost:3000', undefined);
    expect(cookie.name).toBe('next-auth.session-token');
    expect(cookie.options).toEqual({ httpOnly: true, sameSite: 'lax', path: '/', secure: false });
  });

  it('holds no secure flag when the address is absent', async () => {
    const cookie = await cookieFor(undefined, undefined);
    expect(cookie.name).toBe('next-auth.session-token');
    expect(cookie.options.secure).toBe(false);
  });

  it('uses the secure cookie name and the named domain on an https address', async () => {
    const cookie = await cookieFor('https://studio.cerulea.test', '.cerulea.test');
    expect(cookie.name).toBe('__Secure-next-auth.session-token');
    expect(cookie.options).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: true,
      domain: '.cerulea.test',
    });
  });
});
