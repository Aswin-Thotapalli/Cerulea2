import { afterEach, describe, expect, it, vi } from 'vitest';

import { needsRotation, refreshWindowClosed, rotateWhenDue } from './auth';
import type { CeruleaTokenSet } from './auth';
import * as client from './cerulea-api';

const now = new Date('2026-09-19T10:00:00.000Z');

function tokenSet(overrides: Partial<CeruleaTokenSet> = {}): CeruleaTokenSet {
  return {
    accountId: 'acc-1',
    email: 'person@cerulea.test',
    displayName: 'A Person',
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    accessExpiresAt: '2026-09-19T10:15:00.000Z',
    refreshExpiresAt: '2026-10-03T10:00:00.000Z',
    sessionId: 'ses-1',
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('token rotation', () => {
  it('leaves a fresh access token alone', () => {
    expect(needsRotation('2026-09-19T10:15:00.000Z', now)).toBe(false);
  });

  it('rotates inside the last minute of the access token', () => {
    expect(needsRotation('2026-09-19T10:00:30.000Z', now)).toBe(true);
  });

  it('treats a value it cannot read as due for rotation', () => {
    expect(needsRotation('not a time', now)).toBe(true);
  });

  it('reports a closed refresh window', () => {
    expect(refreshWindowClosed('2026-09-19T09:00:00.000Z', now)).toBe(true);
    expect(refreshWindowClosed('2026-10-03T10:00:00.000Z', now)).toBe(false);
  });
});

describe('rotateWhenDue', () => {
  it('returns the same pair while the access token holds', async () => {
    const set = tokenSet();
    expect(await rotateWhenDue(set, now)).toBe(set);
  });

  it('asks Cerulea APIs for a new pair when the access token is near its end', async () => {
    vi.spyOn(client, 'refreshSession').mockResolvedValue({
      account: {
        accountId: 'acc-1',
        email: 'person@cerulea.test',
        displayName: 'A Person',
        state: 'active',
        multiFactorActive: true,
        createdAt: '2026-09-01T00:00:00.000Z',
      },
      session: {
        sessionId: 'ses-2',
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
        expiresAt: '2026-09-19T10:15:00.000Z',
        refreshExpiresAt: '2026-10-03T10:00:00.000Z',
        rotationCount: 1,
      },
    });
    const rotated = await rotateWhenDue(tokenSet({ accessExpiresAt: '2026-09-19T10:00:10.000Z' }), now);
    expect(rotated.accessToken).toBe('access-2');
    expect(rotated.refreshToken).toBe('refresh-2');
    expect(rotated.sessionId).toBe('ses-2');
  });

  it('names the fix and empties the access token when the refresh window closed', async () => {
    const closed = await rotateWhenDue(
      tokenSet({
        accessExpiresAt: '2026-09-19T09:00:00.000Z',
        refreshExpiresAt: '2026-09-18T09:00:00.000Z',
      }),
      now,
    );
    expect(closed.accessToken).toBe('');
    expect(closed.signInFix).toMatch(/Sign in again/);
  });

  it('carries the fix Cerulea named when the rotation itself fails', async () => {
    vi.spyOn(client, 'refreshSession').mockRejectedValue(
      new client.CeruleaApiError(
        {
          code: 'sessions.refresh_replayed',
          message: 'That refresh token was used already.',
          fix: 'Sign in again. Cerulea closed every session on the account.',
          details: {},
        },
        401,
      ),
    );
    const closed = await rotateWhenDue(tokenSet({ accessExpiresAt: '2026-09-19T10:00:10.000Z' }), now);
    expect(closed.accessToken).toBe('');
    expect(closed.signInFix).toMatch(/closed every session/);
  });
});
