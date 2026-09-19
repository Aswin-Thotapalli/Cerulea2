import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import PublicationGate, { gateStatement, publicationBlocked } from './PublicationGate';

const findings = [
  {
    area: 'contrast',
    severity: 'failure',
    guideline: 'Guideline 1.4.3 Contrast, minimum',
    screen: 'Every booking',
    component: 'The amount column heading',
    problem: 'The heading reads at 2.1 against the surface behind it.',
    fix: 'Darken the heading colour until it reaches 4.5 against the surface.',
  },
  {
    area: 'keyboard',
    severity: 'failure',
    guideline: 'Guideline 2.1.1 Keyboard',
    screen: 'Record a booking',
    component: 'The berth picker',
    problem: 'A person using the keyboard never reaches the picker.',
    fix: 'Give the picker a place in the focus order.',
  },
];

function stubFetch(body: unknown, status = 200) {
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

describe('reading a publication decision', () => {
  it('holds publication while no report is held', () => {
    expect(publicationBlocked(null)).toBe(true);
    expect(gateStatement(null)).toContain('has not checked');
  });

  it('holds publication while the report fails', () => {
    const report = { version: 4, passes: false, headline: 'Two faults.', findings };
    expect(publicationBlocked(report)).toBe(true);
    expect(gateStatement(report)).toContain('2 faults');
  });

  it('holds publication while the engine names a block', () => {
    const report = {
      version: 4,
      passes: true,
      headline: 'Two faults.',
      findings,
      publication: {
        blocked: true as const,
        message: 'Publication waits on two contrast faults.',
        fix: 'Correct the contrast, then check again.',
      },
    };
    expect(publicationBlocked(report)).toBe(true);
    expect(gateStatement(report)).toBe('Publication waits on two contrast faults.');
  });

  it('lets publication through once the report passes', () => {
    const report = { version: 4, passes: true, headline: 'Everything passes.', findings: [] };
    expect(publicationBlocked(report)).toBe(false);
    expect(gateStatement(report)).toContain('Nothing holds deployment back');
  });
});

describe('the publication gate', () => {
  it('reads the accessibility report of the generated application', async () => {
    const seen = stubFetch({ version: 4, passes: true, headline: 'Passes.', findings: [] });
    render(<PublicationGate projectId="p-1" />);
    await waitFor(() => expect(screen.getByTestId('publication-gate')).toBeInTheDocument());
    expect(seen[0]).toBe('/api/projects/p-1/accessibility');
  });

  it('lets deployment through on a clean report', async () => {
    stubFetch({ version: 4, passes: true, headline: 'Passes.', findings: [] });
    const decisions: boolean[] = [];
    render(<PublicationGate projectId="p-1" onDecision={(held) => decisions.push(held)} />);
    await waitFor(() => expect(screen.getByTestId('gate-state')).toHaveTextContent('Ready to deploy'));
    expect(decisions).toEqual([true]);
    expect(screen.getByText('Nothing holds deployment back')).toBeInTheDocument();
  });

  it('blocks deployment on a failing report and names every fix', async () => {
    stubFetch({
      version: 4,
      passes: false,
      headline: 'Two faults.',
      findings,
      publication: {
        blocked: true,
        message: 'Publication waits on two faults.',
        fix: 'Open the screen each line names.',
      },
    });
    const decisions: boolean[] = [];
    render(<PublicationGate projectId="p-1" onDecision={(held) => decisions.push(held)} />);
    await waitFor(() =>
      expect(screen.getByTestId('gate-state')).toHaveTextContent('Deployment waits'),
    );
    expect(decisions).toEqual([false]);
    const shown = screen.getByTestId('gate-findings');
    for (const finding of findings) {
      expect(shown).toHaveTextContent(finding.problem);
      expect(shown).toHaveTextContent(finding.fix);
      expect(shown).toHaveTextContent(finding.screen);
      expect(shown).toHaveTextContent(finding.guideline);
    }
  });

  it('blocks deployment and names the fix when the check cannot run', async () => {
    stubFetch(
      {
        error: {
          code: 'compiler.description_absent',
          message: 'The Blueprint holds corrections to make, so Cerulea generated no application.',
          fix: 'Make the corrections the checklist names, then check again.',
          details: {},
        },
      },
      404,
    );
    const decisions: boolean[] = [];
    render(<PublicationGate projectId="p-1" onDecision={(held) => decisions.push(held)} />);
    await waitFor(() => expect(screen.getByTestId('gate-failure')).toBeInTheDocument());
    expect(decisions).toEqual([false]);
    expect(screen.getByTestId('gate-state')).toHaveTextContent('Deployment waits');
    expect(
      screen.getByText('Make the corrections the checklist names, then check again.'),
    ).toBeInTheDocument();
  });
});
