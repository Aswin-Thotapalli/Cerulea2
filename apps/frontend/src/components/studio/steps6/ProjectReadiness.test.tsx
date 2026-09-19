import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import ProjectReadiness from './ProjectReadiness';

function stubFetch(status: number, body: unknown) {
  const seen: string[] = [];
  vi.stubGlobal('fetch', (url: string) => {
    seen.push(url);
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });
  return seen;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the readiness line on a project', () => {
  it('reads the checklist for that project', async () => {
    const seen = stubFetch(200, {
      remaining: 2,
      advisory: 1,
      ready: false,
      headline: '2 items remain before deployment.',
    });
    render(<ProjectReadiness projectId="p-1" />);
    await waitFor(() => expect(screen.getByText('2 remaining')).toBeInTheDocument());
    expect(seen[0]).toBe('/api/projects/p-1/readiness');
  });

  it('states that a project is ready once nothing remains', async () => {
    stubFetch(200, {
      remaining: 0,
      advisory: 0,
      ready: true,
      headline: 'Nothing remains. This system is ready to deploy.',
    });
    render(<ProjectReadiness projectId="p-1" />);
    await waitFor(() => expect(screen.getByText('Ready to deploy')).toBeInTheDocument());
  });

  it('points at the project when the checklist cannot be read here', async () => {
    stubFetch(422, {
      error: {
        code: 'compiler.report_holds',
        message: 'The Blueprint holds corrections.',
        fix: 'Open the project and read the checklist there.',
        details: {},
      },
    });
    render(<ProjectReadiness projectId="p-1" />);
    await waitFor(() =>
      expect(screen.getByText('Read it in the project')).toBeInTheDocument(),
    );
  });
});
