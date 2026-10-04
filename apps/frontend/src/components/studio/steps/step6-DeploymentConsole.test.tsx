import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import type { DeploymentView } from '@/lib/deployment/reads';
import DeploymentConsole, { activeStage, consoleLines, liveApplicationPath, progressOf, stageWords } from './step6-DeploymentConsole';
import { deployHold } from './step6-VerifyDeploy';

function stage(number: number, name: string, status: DeploymentView['stages'][number]['status'], outcome: string | null, started = true): DeploymentView['stages'][number] {
  return {
    number,
    name,
    status,
    startedAt: started ? `2026-10-04T08:0${number}:00.000Z` : null,
    endedAt: started && status !== 'running' ? `2026-10-04T08:0${number}:30.000Z` : null,
    outcome,
    detail: null,
  };
}

const running: DeploymentView = {
  id: 'dep_running',
  status: 'running',
  record: null,
  projectId: 'prj_1',
  blueprintHash: 'abcdef0123456789aaaa',
  target: 'local',
  startedAt: '2026-10-04T08:00:00.000Z',
  endedAt: null,
  rolledBackAt: null,
  failureReason: null,
  stages: [
    stage(1, 'verify', 'succeeded', 'The compiler passed and the tier permits two validators.'),
    stage(2, 'provision', 'succeeded', 'Cerulea allocated 1 gigabyte and wrote the genesis file.'),
    stage(3, 'start', 'running', null),
    stage(4, 'install', 'pending', 'Installs the Blueprint.', false),
    stage(5, 'publish', 'pending', null, false),
    stage(6, 'health', 'pending', null, false),
    stage(7, 'record', 'pending', null, false),
  ],
};

const failed: DeploymentView = {
  ...running,
  id: 'dep_failed',
  status: 'failed',
  endedAt: '2026-10-04T08:03:30.000Z',
  rolledBackAt: '2026-10-04T08:03:40.000Z',
  failureReason: 'Stage three found no block after 30 seconds.',
  stages: [
    stage(1, 'verify', 'skipped', 'Cerulea removed the compiler artefacts.'),
    stage(2, 'provision', 'skipped', 'Cerulea removed the storage and the genesis file.'),
    stage(3, 'start', 'failed', 'No block after 30 seconds. Cerulea stopped the processes.'),
    stage(4, 'install', 'skipped', 'Cerulea stopped before this stage, so the stage created nothing.', false),
    stage(5, 'publish', 'skipped', 'Cerulea stopped before this stage, so the stage created nothing.', false),
    stage(6, 'health', 'skipped', 'Cerulea stopped before this stage, so the stage created nothing.', false),
    stage(7, 'record', 'skipped', 'Cerulea stopped before this stage, so the stage created nothing.', false),
  ],
};

const succeeded: DeploymentView = {
  ...running,
  id: 'dep_done',
  status: 'succeeded',
  endedAt: '2026-10-04T08:07:30.000Z',
  stages: running.stages.map((held) => ({ ...held, status: 'succeeded', startedAt: held.startedAt ?? '2026-10-04T08:05:00.000Z', endedAt: '2026-10-04T08:07:00.000Z', outcome: held.outcome ?? `Stage ${held.number} finished.` })),
};

describe('the console lines', () => {
  it('writes one line per stage that ran, from the outcome Cerulea APIs recorded, and nothing for a pending stage', () => {
    const lines = consoleLines(running);
    expect(lines.map((line) => line.key)).toEqual(['head-id', 'head-blueprint', 'stage-1', 'stage-2', 'stage-3']);
    expect(lines[2].text).toBe('> Stage 1 Checks: Done. The compiler passed and the tier permits two validators.');
    expect(lines[4].text).toBe('> Stage 3 Start the network: Running.');
    expect(progressOf(running)).toBe(29);
    expect(activeStage(running)?.name).toBe('start');
  });

  it('names a rolled back stage and the failure, and states that nothing partial remains', () => {
    expect(stageWords(failed.stages[0], failed)).toBe('Rolled back');
    expect(stageWords(failed.stages[3], failed)).toBe('Skipped');
    const lines = consoleLines(failed);
    expect(lines.find((line) => line.key === 'stage-1')?.text).toBe('> Stage 1 Checks: Rolled back. Cerulea removed the compiler artefacts.');
    expect(lines.find((line) => line.key === 'stage-3')?.tone).toBe('failed');
    expect(lines.find((line) => line.key === 'failure-line')?.text).toBe('> Stage three found no block after 30 seconds.');
    expect(lines[lines.length - 1].text).toContain('nothing partial remains');
    expect(liveApplicationPath('prj_1', failed)).toBeNull();
  });

  it('links the live application once every stage finished', () => {
    expect(progressOf(succeeded)).toBe(100);
    expect(liveApplicationPath('prj_1', succeeded)).toBe('/api/projects/prj_1/application?deployment=dep_done');
    expect(consoleLines(succeeded)[consoleLines(succeeded).length - 1].text).toBe('> Every stage finished. The deployment is live.');
  });
});

describe('the console', () => {
  it('shows an empty terminal before any deployment', () => {
    render(<DeploymentConsole projectId="prj_1" deployment={null} busy={false} />);
    expect(screen.getByText(/No deployment yet/)).toBeInTheDocument();
    expect(screen.queryByTestId('console-progress')).toBeNull();
  });

  it('shows the stage lines, the progress and the failure panel of a failed deployment', () => {
    render(<DeploymentConsole projectId="prj_1" deployment={failed} busy={false} onAskIntelligence={() => undefined} />);
    expect(screen.getByTestId('console-stage-3')).toHaveTextContent('No block after 30 seconds');
    expect(screen.getByTestId('console-failure')).toHaveTextContent('DEPLOYMENT FAILED');
    expect(screen.getByRole('button', { name: /Ask Cerulea AI/ })).toBeInTheDocument();
    expect(screen.getByTestId('console-progress')).toHaveTextContent('0%');
  });

  it('shows the live application link after a success', () => {
    render(<DeploymentConsole projectId="prj_1" deployment={succeeded} busy={false} />);
    const link = screen.getByRole('link', { name: /Open the live application/ });
    expect(link).toHaveAttribute('href', '/api/projects/prj_1/application?deployment=dep_done');
    expect(screen.getByTestId('console-progress')).toHaveTextContent('100%');
  });
});

describe('the hold on Deploy Now', () => {
  it('holds while a deployment runs, when the gate blocks, when the compiler faults and when items remain', () => {
    expect(deployHold({ ready: true, gate: null, moving: true, compilerOk: true })).toMatch(/running/);
    expect(deployHold({ ready: true, gate: { passes: false, headline: 'x', findings: [], publication: { blocked: true, message: 'Publication waits.', fix: 'Label the inputs.' } }, moving: false, compilerOk: true })).toBe('Publication waits. Label the inputs.');
    expect(deployHold({ ready: false, gate: null, moving: false, compilerOk: false })).toMatch(/corrections/);
    expect(deployHold({ ready: false, gate: null, moving: false, compilerOk: true })).toMatch(/Items remain/);
    expect(deployHold({ ready: true, gate: { passes: true, headline: 'x', findings: [] }, moving: false, compilerOk: true })).toBeNull();
  });
});
