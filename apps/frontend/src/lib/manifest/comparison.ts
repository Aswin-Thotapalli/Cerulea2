// apps/frontend/src/lib/manifest/comparison.ts
// The comparison view of the Deployment Manifest.
//
// Cerulea APIs sets the current manifest against an earlier one and answers
// with three lists of line names. A line name opens with the kind of item it
// stands for, so Studio reads that word and names the screen that produces
// the line.
//
// Without this module a comparison line would name no screen, and a reviewer
// would hunt for the place a change was made.

export type ComparisonBandKey = 'additions' | 'removals' | 'changes';

export type ComparisonBand = {
  key: ComparisonBandKey;
  /** The heading a reviewer reads. */
  heading: string;
  /** One sentence stating what the band holds. */
  states: string;
  /** The sentence shown while the band holds nothing. */
  whenEmpty: string;
  colour: 'success' | 'warning' | 'info';
};

/** The three bands, in the order a reviewer reads them. */
export const COMPARISON_BANDS: ComparisonBand[] = [
  {
    key: 'additions',
    heading: 'Added',
    states: 'Every line this deployment holds that the previous deployment lacked.',
    whenEmpty: 'This deployment adds nothing the previous deployment lacked.',
    colour: 'success',
  },
  {
    key: 'removals',
    heading: 'Removed',
    states: 'Every line the previous deployment held that this one drops.',
    whenEmpty: 'This deployment drops nothing the previous deployment held.',
    colour: 'warning',
  },
  {
    key: 'changes',
    heading: 'Changed',
    states: 'Every line both deployments hold with a different detail inside it.',
    whenEmpty: 'Every line both deployments hold carries the same detail.',
    colour: 'info',
  },
];

/**
 * The screen that produces one comparison line.
 * A line name opens with the kind of item, which Cerulea APIs writes as Field,
 * Action, Workflow, Rule, Permission, Screen or Endpoint.
 */
export const SCREEN_BY_KIND: Record<string, string> = {
  Field: 'Model, records',
  Action: 'Model, rules and actions',
  Workflow: 'Model, workflows',
  Rule: 'Model, rules and actions',
  Permission: 'Model, permissions',
  Screen: 'Interface',
  Endpoint: 'Interface',
};

/** Reads the screen out of one comparison line. */
export function screenForComparisonLine(line: string): string {
  const kind = line.trim().split(/\s+/)[0] ?? '';
  return SCREEN_BY_KIND[kind] ?? 'Blueprint';
}

/** The kinds of item a comparison line names. */
export function comparisonKinds(lines: string[]): string[] {
  return Array.from(new Set(lines.map((line) => line.trim().split(/\s+/)[0] ?? ''))).filter(
    (kind) => kind.length > 0,
  );
}

/** One sentence stating what moved between the two deployments. */
export function comparisonHeadline(input: {
  identical: boolean;
  previousBlueprintHash?: string;
  additions: string[];
  removals: string[];
  changes: string[];
}): string {
  const moved = input.additions.length + input.removals.length + input.changes.length;
  if (input.identical) {
    return 'Nothing moved. This manifest matches the previous deployment exactly.';
  }
  if (input.previousBlueprintHash === undefined) {
    return `This is the first manifest, so every one of its ${moved} lines is an addition.`;
  }
  return (
    `${moved} lines moved. ${input.additions.length} added, ` +
    `${input.removals.length} removed and ${input.changes.length} changed.`
  );
}
