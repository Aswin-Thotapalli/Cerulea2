// apps/frontend/src/lib/studio/readiness.ts
// The readiness checklist.
// The six steps collapse into a list of what remains before deployment. Every
// line comes from the Blueprint validation report the Cerulea APIs compiler
// produces, or from a step the person has not finished.
// Every line names the screen that closes it, so nobody hunts for the place.
// Without the checklist a person would deploy without knowing what is missing.

import type { CompilerReport } from '@/lib/cerulea-api';
import type { BuildState } from '@/lib/studio/project-state';

export type ReadinessItem = {
  id: string;
  /** What remains, or what already holds. */
  subject: string;
  /** The step that closes this item. */
  screen: string;
  /** What to do, in one sentence. */
  fix: string;
  state: 'done' | 'remaining' | 'advisory';
};

export type Readiness = {
  items: ReadinessItem[];
  remaining: number;
  advisory: number;
  ready: boolean;
  headline: string;
};

/** The six steps, with the screen each one names. */
export const STEP_ITEMS: { key: keyof BuildState['steps']; subject: string; screen: string; fix: string }[] = [
  {
    key: 'foundation',
    subject: 'The name, the network and the network properties are set.',
    screen: 'Step 1 Foundation',
    fix: 'Open Step 1, check the name and the network, then save.',
  },
  {
    key: 'compose',
    subject: 'The outcomes this system delivers are chosen.',
    screen: 'Step 2 Compose',
    fix: 'Open Step 2 and pick the statements this system should deliver.',
  },
  {
    key: 'model',
    subject: 'The records, the permissions, the rules and the workflows are in place.',
    screen: 'Step 3 Model',
    fix: 'Open Step 3, check each surface, then save the model.',
  },
  {
    key: 'policies',
    subject: 'The deployment profile is chosen.',
    screen: 'Step 4 Policies',
    fix: 'Open Step 4, answer the five questions and choose a profile.',
  },
  {
    key: 'interfaceAuthoring',
    subject: 'The generated application is authored.',
    screen: 'Step 5 Interface',
    fix: 'Open Step 5 and check the screens Cerulea generated.',
  },
  {
    key: 'verify',
    subject: 'The model ran against generated traffic.',
    screen: 'Step 6 Verify',
    fix: 'Run the simulation on this screen and read the measured behaviour.',
  },
];

/**
 * Builds the checklist.
 *
 * A compiler error is something that remains. A compiler warning is advisory,
 * worth reading before deployment. A step nobody finished is something that
 * remains. Deployment opens once nothing remains.
 */
export function buildReadiness(input: {
  report: CompilerReport | null;
  buildState: BuildState | null;
  simulationRun: boolean;
}): Readiness {
  const items: ReadinessItem[] = [];

  for (const entry of STEP_ITEMS) {
    const done =
      entry.key === 'verify'
        ? input.simulationRun || (input.buildState?.steps.verify ?? false)
        : (input.buildState?.steps[entry.key] ?? false);
    items.push({
      id: `step.${entry.key}`,
      subject: entry.subject,
      screen: entry.screen,
      fix: entry.fix,
      state: done ? 'done' : 'remaining',
    });
  }

  if (input.report) {
    for (const section of input.report.sections) {
      for (const entry of section.entries) {
        items.push({
          id: `${entry.code}:${entry.path}`,
          subject: entry.message,
          screen: entry.screen,
          fix: entry.fix,
          state: entry.severity === 'error' ? 'remaining' : 'advisory',
        });
      }
    }
    if (input.report.ok && input.report.errorCount === 0) {
      items.push({
        id: 'compiler.clean',
        subject: 'The Blueprint passes every check the compiler runs.',
        screen: 'Step 6 Verify',
        fix: 'Nothing to do. The Blueprint is ready to deploy.',
        state: 'done',
      });
    }
  }

  const remaining = items.filter((entry) => entry.state === 'remaining').length;
  const advisory = items.filter((entry) => entry.state === 'advisory').length;
  return {
    items,
    remaining,
    advisory,
    ready: remaining === 0,
    headline:
      remaining === 0
        ? advisory === 0
          ? 'Nothing remains. This system is ready to deploy.'
          : `Nothing blocks deployment. ${advisory} items are worth reading first.`
        : `${remaining} items remain before deployment.`,
  };
}
