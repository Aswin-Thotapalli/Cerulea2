// apps/frontend/src/lib/studio/foundation-controls.ts
// The network properties Step 1 sets, each with its plain sentence.
// Every technical control carries a statement of what the control does and
// what breaks without it, so a non-technical person still decides well.
// Without these sentences a control would be a number with no meaning.

export type ControlBound = {
  least: number;
  most: number;
  fallback: number;
};

export type ControlWording = {
  label: string;
  /** What the control does, in one sentence. */
  does: string;
  /** What breaks when the control is set wrongly. */
  breaks: string;
  bound: ControlBound;
  unit: string;
};

export const BLOCK_SECONDS: ControlWording = {
  label: 'Seconds between blocks',
  does:
    'Cerulea gathers transactions and commits them together at this interval. A shorter interval confirms work sooner.',
  breaks:
    'A very short interval raises message volume across validators, so a slow network starts missing turns. A long interval makes every confirmation wait.',
  bound: { least: 1, most: 60, fallback: 3 },
  unit: 'seconds',
};

export const HISTORY_RETENTION_DAYS: ControlWording = {
  label: 'Days of provable history',
  does:
    'Every node keeps the history for this long, so a record stays provable against the chain across that window.',
  breaks:
    'A short window lowers storage cost and stops an audit reaching further back. A long window keeps every proof and raises the storage every node carries.',
  bound: { least: 1, most: 36500, fallback: 3650 },
  unit: 'days',
};

/** Holds a value inside the bounds the control declares. */
export function withinBound(value: number, bound: ControlBound): number {
  if (!Number.isFinite(value)) return bound.fallback;
  const whole = Math.round(value);
  if (whole < bound.least) return bound.least;
  if (whole > bound.most) return bound.most;
  return whole;
}

/** Names the correction when a value falls outside the bounds. */
export function boundFix(value: number, control: ControlWording): string | null {
  if (!Number.isFinite(value)) {
    return `Type a whole number of ${control.unit} between ${control.bound.least} and ${control.bound.most}.`;
  }
  if (value < control.bound.least) {
    return `Raise this to at least ${control.bound.least} ${control.unit}.`;
  }
  if (value > control.bound.most) {
    return `Lower this to at most ${control.bound.most} ${control.unit}.`;
  }
  return null;
}

/** States what the chosen interval means for a person waiting on a confirmation. */
export function describeBlockSeconds(seconds: number): string {
  const perMinute = Math.round(60 / Math.max(1, seconds));
  return `Cerulea commits close to ${perMinute} blocks each minute at this interval.`;
}

/** States what the chosen window means for an audit. */
export function describeRetention(days: number): string {
  if (days >= 365) {
    return `An audit reaches back close to ${(days / 365).toFixed(1)} years with a proof for every record.`;
  }
  return `An audit reaches back ${days} days with a proof for every record.`;
}
