// apps/frontend/src/lib/deployment/plain.ts
// Turns the values a deployment record stores into words a person reads.
// Cerulea APIs stores stage names, states and outcome sentences for the
// operator log. The deployed system page shows the same record to a person
// with no technical background, so each value reads here as plain words.
// Without this module the page prints stored names such as rolled_back,
// the deployment identifier and the address of the account behind it.

/** The seven deployment stages, each with the name a person reads. */
const STAGE_NAMES: Record<string, string> = {
  verify: 'Checks',
  provision: 'Resources',
  start: 'Start the network',
  install: 'Install the Blueprint',
  publish: 'Publish',
  health: 'Health checks',
  record: 'Record the deployment',
};

/** The states one stage holds. */
const STAGE_STATES: Record<string, string> = {
  pending: 'Waiting',
  queued: 'Queued',
  running: 'Running',
  succeeded: 'Done',
  failed: 'Failed',
  rolled_back: 'Rolled back',
  skipped: 'Skipped',
  cancelled: 'Cancelled',
};

/** The states a whole deployment holds. */
const DEPLOYMENT_STATES: Record<string, string> = {
  pending: 'Waiting to start',
  queued: 'Queued',
  running: 'In progress',
  succeeded: 'Finished',
  failed: 'Stopped with a failure',
  rolled_back: 'Rolled back',
  cancelled: 'Cancelled',
};

/** The states a project holds. */
const PROJECT_STATES: Record<string, string> = {
  draft: 'Draft',
  deployed: 'Deployed',
  archived: 'Archived',
};

/** Reads a stored value as one phrase in sentence case. */
export function sentenceWords(value: string): string {
  const words = value
    .split(/[\s_-]+/)
    .filter((word) => word.length > 0)
    .join(' ');
  return words.length === 0 ? words : `${words[0].toUpperCase()}${words.slice(1)}`;
}

/** The name of one deployment stage. */
export function stageName(name: string): string {
  return STAGE_NAMES[name] ?? sentenceWords(name);
}

/** The state of one deployment stage. */
export function stageState(state: string): string {
  return STAGE_STATES[state] ?? sentenceWords(state);
}

/** The state of a whole deployment. */
export function deploymentState(state: string): string {
  return DEPLOYMENT_STATES[state] ?? sentenceWords(state);
}

/** The state of a project. */
export function projectState(state: string): string {
  return PROJECT_STATES[state] ?? sentenceWords(state);
}

/** Writes one instant as a date and a time a person reads. */
function readableInstant(instant: string): string {
  const parsed = new Date(instant);
  if (Number.isNaN(parsed.getTime())) {
    return instant;
  }
  return parsed.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Reads the outcome sentence of one stage as plain words.
 *
 * The deployment identifier reads as this deployment. A Blueprint content hash
 * reads as the Blueprint version. The address of the account behind the
 * deployment stays out of the sentence. An instant reads as a date and a time.
 * A count of one peer reads in the singular.
 */
export function plainOutcome(outcome: string): string {
  return outcome
    .replace(/\bdep_[0-9a-z]+\b/g, 'this deployment')
    .replace(/\bBlueprint [0-9a-f]{8,}\b/g, 'the Blueprint version')
    .replace(/\s+by [^\s@]+@[^\s@]+?(?=\s|\.|,|$)/g, '')
    .replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/g, (instant) =>
      readableInstant(instant),
    )
    .replace(/\b1 peers\b/g, '1 peer');
}
