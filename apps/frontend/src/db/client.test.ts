import { describe, expect, it } from 'vitest';
import { LOCAL_DATABASE_URL, resolveDatabaseDriver } from './client';

describe('resolveDatabaseDriver', () => {
  it('runs the local driver when the machine holds no hosted connection string', () => {
    expect(resolveDatabaseDriver({})).toEqual({ driver: 'local', url: LOCAL_DATABASE_URL });
  });

  it('honours a local connection string supplied by the operator', () => {
    const choice = resolveDatabaseDriver({ CERULEA_DATABASE_URL: 'postgres://localhost:6543/studio' });
    expect(choice).toEqual({ driver: 'local', url: 'postgres://localhost:6543/studio' });
  });

  it('runs the live driver when a hosted connection string is present', () => {
    const choice = resolveDatabaseDriver({ DATABASE_URL: 'postgres://hosted/studio' });
    expect(choice).toEqual({ driver: 'live', url: 'postgres://hosted/studio' });
  });

  it('names the missing value when live mode carries no hosted connection string', () => {
    expect(() => resolveDatabaseDriver({ CERULEA_MODE: 'live' })).toThrowError(/DATABASE_URL/);
  });
});
