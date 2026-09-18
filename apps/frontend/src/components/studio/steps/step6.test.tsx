import { readFileSync } from 'node:fs';
import path from 'node:path';
import { webcrypto } from 'node:crypto';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudioProvider } from '@/context/StudioContext';
import Step6, { completedStageShare, stageDurationSeconds } from './step6';

const SOURCE = readFileSync(path.join(__dirname, 'step6.tsx'), 'utf8');

const stages = [
  {
    name: 'Read the Blueprint',
    status: 'succeeded',
    startedAt: '2026-09-19T04:00:00.000Z',
    endedAt: '2026-09-19T04:00:06.000Z',
    outcome: 'Twelve sections read.',
  },
  {
    name: 'Open the domains',
    status: 'running',
    startedAt: '2026-09-19T04:00:06.000Z',
    endedAt: null,
    outcome: null,
  },
];

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('the deployment step source', () => {
  it('carries no scripted log array', () => {
    expect(SOURCE).not.toMatch(/SCRIPTED_LOGS|INFRA_LOG_POOL|BLOCKCHAIN_LOG_POOL/);
  });

  it('invents no metric and no progress', () => {
    expect(SOURCE).not.toMatch(/Math\.random/);
    expect(SOURCE).not.toMatch(/setInterval/);
  });

  it('names no external agreement protocol', () => {
    expect(SOURCE.toLowerCase()).not.toMatch(/\baura\b|\bgrandpa\b|\bbabe\b/);
  });
});

describe('completedStageShare', () => {
  it('counts settled stages only', () => {
    expect(completedStageShare([])).toBe(0);
    expect(completedStageShare(stages as never)).toBe(50);
  });
});

describe('stageDurationSeconds', () => {
  it('reads the elapsed time a stage reported', () => {
    expect(stageDurationSeconds(stages[0] as never)).toBe(6);
    expect(stageDurationSeconds(stages[1] as never)).toBeNull();
  });
});

describe('the deployment step screen', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', webcrypto);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the stage list Cerulea APIs reported', async () => {
    const seen: string[] = [];
    vi.stubGlobal('fetch', (input: string, init?: RequestInit) => {
      seen.push(`${init?.method ?? 'GET'} ${input}`);
      if (input.includes('/api/projects/')) {
        return Promise.resolve(jsonResponse({ blueprint: { types: ['Shipment'] } }));
      }
      if (input.endsWith('/v1/deployments')) {
        return Promise.resolve(jsonResponse({ deploymentId: 'dep-42' }));
      }
      return Promise.resolve(
        jsonResponse({ id: 'dep-42', status: 'running', stages, record: null }),
      );
    });

    render(
      <StudioProvider>
        <Step6 projectId="p-9" />
      </StudioProvider>,
    );

    expect(screen.getByText(/Cerulea APIs reports the stage list once a deployment starts/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Deploy this project/i }));

    await waitFor(() => {
      expect(screen.getByText('Read the Blueprint')).toBeInTheDocument();
    });
    expect(screen.getByText('Open the domains')).toBeInTheDocument();
    expect(screen.getByText('Twelve sections read.')).toBeInTheDocument();
    expect(seen.some((call) => call.startsWith('POST http://localhost:4000/v1/deployments'))).toBe(true);
    expect(seen.some((call) => call.includes('/v1/deployments/dep-42'))).toBe(true);
  });

  it('names the fix when the project holds no saved Blueprint', async () => {
    vi.stubGlobal('fetch', (input: string) => {
      if (input.includes('/api/projects/')) return Promise.resolve(jsonResponse({ blueprint: null }));
      return Promise.resolve(jsonResponse({}));
    });

    render(
      <StudioProvider>
        <Step6 projectId="p-9" />
      </StudioProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: /Deploy this project/i }));

    await waitFor(() => {
      expect(screen.getByText(/holds no saved Blueprint/i)).toBeInTheDocument();
    });
  });

  it('asks for a project before it deploys anything', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', (input: string) => {
      calls.push(input);
      return Promise.resolve(jsonResponse({}));
    });

    render(
      <StudioProvider>
        <Step6 />
      </StudioProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: /Deploy this project/i }));

    await waitFor(() => {
      expect(screen.getByText(/Open a project first/i)).toBeInTheDocument();
    });
    expect(calls).toHaveLength(0);
  });
});
