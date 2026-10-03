// apps/frontend/src/components/dashboard/wording.ts
// The plain language every Dashboard panel puts beside a figure.
// A person reading a panel sees a sentence rather than an internal name, and
// every figure carries a statement of what it means.
// Without this module a panel would print raw identifiers.

/** Turns an audit action name into the sentence a reader understands. */
export function describeAction(action: string): string {
  const [area, deed] = action.split('.');
  const readable = String(deed ?? action).split('_').join(' ');
  return `${readable.charAt(0).toUpperCase()}${readable.slice(1)} on a ${String(area)
    .split('_')
    .join(' ')}`;
}

/** Turns a block count into the plain phrase beside a delay. */
export function describeDelay(blocks: number, secondsEachBlock = 3): string {
  const seconds = blocks * secondsEachBlock;
  const hours = seconds / 3600;
  if (hours >= 24) return `${blocks} blocks, close to ${(hours / 24).toFixed(1)} days`;
  if (hours >= 1) return `${blocks} blocks, close to ${hours.toFixed(1)} hours`;
  return `${blocks} blocks, close to ${(seconds / 60).toFixed(0)} minutes`;
}

/** Turns a cadence in seconds into the phrase beside a feed. */
export function describeCadence(seconds: number): string {
  if (seconds >= 3600) return `every ${(seconds / 3600).toFixed(1)} hours`;
  if (seconds >= 60) return `every ${(seconds / 60).toFixed(0)} minutes`;
  return `every ${seconds} seconds`;
}

/** Names a validator without showing a person a long address in full. */
export function shortAccount(account: string): string {
  if (account.length <= 14) return account;
  return `${account.slice(0, 8)}…${account.slice(-4)}`;
}

/** The share of authoring turns a validator took, as a whole percentage. */
export function participationPercent(authored: number, missed: number): number {
  const total = authored + missed;
  if (total === 0) return 100;
  return Math.round((authored / total) * 100);
}

/** Shows the opening of a content address, which is enough to compare two saves. */
export function shortHash(hash: string): string {
  return hash.slice(0, 12);
}

/** Turns the section counts into one readable line. */
export function describeCounts(counts: Record<string, number>): string {
  const named: [string, string][] = [
    ['collections', 'collections'],
    ['actions', 'actions'],
    ['workflows', 'workflows'],
    ['permissions', 'permission entries'],
    ['rules', 'rules'],
  ];
  return named.map(([key, label]) => `${counts[key] ?? 0} ${label}`).join(', ');
}

/** Builds the export a reviewer downloads, one row per event. */
export function toDelimitedText(
  events: {
    occurredAt: string;
    actorEmail: string;
    action: string;
    subjectType: string;
    subjectId: string;
    outcome: string;
  }[],
): string {
  const header = 'occurred_at,actor,action,subject_type,subject,outcome';
  const rows = events.map((entry) =>
    [
      entry.occurredAt,
      entry.actorEmail,
      entry.action,
      entry.subjectType,
      entry.subjectId,
      entry.outcome,
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(','),
  );
  return [header, ...rows].join('\n');
}

/** The plain sentence beside each access key scope. */
export const SCOPE_MEANING: Record<string, string> = {
  'records.read': 'Reads records from a collection.',
  'records.write': 'Adds and changes records in a collection.',
  'actions.invoke': 'Runs an action the Blueprint declares.',
  'events.subscribe': 'Receives the change stream as it happens.',
  'proofs.read': 'Reads the inclusion proof for a record.',
};

/** The plain sentence beside each workspace role. */
export const ROLE_MEANING: Record<string, string> = {
  owner: 'Holds the workspace, transfers ownership and closes the workspace.',
  administrator: 'Invites people, changes roles, manages keys and manages billing.',
  builder: 'Builds projects, writes Blueprints, takes checkpoints and deploys.',
  reviewer: 'Reads the work, the audit record and the billing figures.',
  viewer: 'Reads the workspace, its members and its projects.',
};

/** The plain sentence beside each transaction class. */
export const CLASS_MEANING: Record<string, string> = {
  Routine:
    'Everyday records, such as a scan or a status change. The lowest threshold keeps them fast.',
  Financial:
    'Movements of value. A higher threshold protects money at the cost of a little more time.',
  Structural:
    'Changes to the shape of the system, such as a new collection. A high threshold keeps the model stable.',
  Constitutional:
    'Changes to the rules that govern the rules. The highest threshold, and a mandatory delay before the change takes effect.',
};
