// apps/frontend/src/lib/manifest/groups.ts
// The twelve content groups of the Deployment Manifest.
//
// Section 11.8.2 names twelve groups and states what every one of them lists.
// This module flattens the manifest into those groups, so the atomic view
// expands every item, groups them and answers a search over them. The summary
// view reads the same groups for its counts.
//
// Every line names the screen that produces it, so finding a problem and
// fixing it take one action each.
//
// Without this module the atomic view would show a typed document rather than
// a list a reviewer reads.

import type {
  DeploymentManifest,
  ManifestGroupCounts,
} from './types';

/** The twelve groups, in the order section 11.8.2 lists them. */
export const MANIFEST_GROUPS = [
  'data',
  'actions',
  'workflows',
  'rules',
  'permissions',
  'interfaces',
  'integration',
  'chain',
  'infrastructure',
  'security',
  'modules',
  'cost',
] as const;

export type ManifestGroup = (typeof MANIFEST_GROUPS)[number];

/** The heading and the plain sentence each group carries. */
export const GROUP_WORDING: Record<
  ManifestGroup,
  { heading: string; states: string; screen: string }
> = {
  data: {
    heading: 'Data',
    states:
      'Every collection, every field, its type, whether it is required, its default, its checks, where it is stored, how open it is, its indexes and its relationships.',
    screen: 'Model, records',
  },
  actions: {
    heading: 'Actions',
    states:
      'Every action, the values it takes, the rules it checks first, what it changes, the events it sends and the roles that may run it.',
    screen: 'Model, rules and actions',
  },
  workflows: {
    heading: 'Workflows',
    states: 'Every workflow, its states, its moves, the conditions on those moves and its timers.',
    screen: 'Model, workflows',
  },
  rules: {
    heading: 'Rules',
    states: 'Every rule the system holds, as a plain sentence beside its formal form.',
    screen: 'Model, rules and actions',
  },
  permissions: {
    heading: 'Permissions',
    states:
      'Every role against every collection, with the fields it reaches and the rows it qualifies for.',
    screen: 'Model, permissions',
  },
  interfaces: {
    heading: 'Interfaces',
    states: 'Every screen, the data it shows, the actions it offers and the roles that reach it.',
    screen: 'Blueprint, views',
  },
  integration: {
    heading: 'Integration',
    states:
      'Every endpoint with its method, its path, the values it takes, what it answers and who reaches it.',
    screen: 'Blueprint, views',
  },
  chain: {
    heading: 'Chain',
    states:
      'The agreement profile with its consequences, the validator seats, the class table, the governing authority and the change process.',
    screen: 'Policies',
  },
  infrastructure: {
    heading: 'Infrastructure',
    states: 'Where the deployment runs, how many nodes it holds, its storage, its domains, its certificates and its backup schedule.',
    screen: 'Foundation',
  },
  security: {
    heading: 'Security',
    states:
      'Encryption for every collection, key custody, what a person signs in with, how long records stay and what the audit log covers.',
    screen: 'Model, permissions',
  },
  modules: {
    heading: 'Modules',
    states: 'Every part installed, the statement that caused it, and every link with its type.',
    screen: 'Compose',
  },
  cost: {
    heading: 'Cost',
    states: 'The monthly figure for the tier, the add-ons, the storage and the node count.',
    screen: 'Foundation',
  },
};

export type ManifestLine = {
  group: ManifestGroup;
  /** The name a reviewer reads at the head of the line. */
  subject: string;
  /** Every detail the group states for this line. */
  details: { label: string; value: string }[];
  /** The screen that produces this line. */
  screen: string;
  /** The words this line answers a search with. */
  terms: string;
};

function yesNo(value: boolean): string {
  return value ? 'Yes' : 'No';
}

function list(values: string[], whenEmpty: string): string {
  return values.length === 0 ? whenEmpty : values.join(', ');
}

/** The money figure in the words a person reads. */
export function plainMoney(minor: number, currency: string): string {
  const major = Math.round(minor / 100);
  return `${currency} ${major.toLocaleString('en-IN')} each month`;
}

/** Every line of one group, expanded. */
export function linesOfGroup(
  manifest: DeploymentManifest,
  group: ManifestGroup,
): ManifestLine[] {
  const screen = GROUP_WORDING[group].screen;
  const line = (subject: string, details: { label: string; value: string }[]): ManifestLine => ({
    group,
    subject,
    details,
    screen,
    terms: `${subject} ${details.map((entry) => `${entry.label} ${entry.value}`).join(' ')}`.toLowerCase(),
  });

  switch (group) {
    case 'data':
      return manifest.data.map((item) =>
        line(`${item.collection}.${item.field}`, [
          { label: 'Type', value: item.type },
          { label: 'Required', value: yesNo(item.required) },
          { label: 'Default', value: item.defaultValue ?? 'None' },
          { label: 'Checks', value: list(item.validation, 'None') },
          { label: 'Storage', value: item.storageClass },
          { label: 'Privacy', value: item.privacyClass },
          { label: 'Indexes', value: list(item.indexes, 'None') },
          { label: 'Relationships', value: list(item.relationships, 'None') },
        ]),
      );
    case 'actions':
      return manifest.actions.map((item) =>
        line(item.name || item.action, [
          {
            label: 'Values it takes',
            value: list(
              item.parameters.map(
                (parameter) =>
                  `${parameter.name} as ${parameter.type}${parameter.required ? '' : ', may be absent'}`,
              ),
              'None',
            ),
          },
          { label: 'Rules checked first', value: list(item.preconditions, 'None') },
          { label: 'What it changes', value: list(item.effects, 'Nothing') },
          { label: 'Events it sends', value: list(item.emits, 'None') },
          { label: 'Roles that may run it', value: list(item.roles, 'Every role') },
          { label: 'Class', value: item.transactionClass },
          { label: 'Agreement needed', value: `${item.threshold} percent` },
          { label: 'Waits out a delay', value: yesNo(item.mandatoryDelay) },
        ]),
      );
    case 'workflows':
      return manifest.workflows.map((item) =>
        line(item.name || item.workflow, [
          { label: 'States', value: list(item.states.map((state) => state.name), 'None') },
          {
            label: 'Moves',
            value: list(
              item.transitions.map(
                (transition) =>
                  `${transition.from} to ${transition.to}${transition.guard ? ` while ${transition.guard}` : ''}`,
              ),
              'None',
            ),
          },
          {
            label: 'Timers',
            value: list(
              item.timers.map(
                (timer) => `${timer.state} runs ${timer.action} after ${timer.afterSeconds} seconds`,
              ),
              'None',
            ),
          },
          {
            label: 'Ends at',
            value: list(
              item.states.filter((state) => state.terminal).map((state) => state.name),
              'No end state',
            ),
          },
        ]),
      );
    case 'rules':
      return manifest.rules.map((item) =>
        line(item.plainStatement || item.rule, [
          { label: 'Holds', value: item.kind },
          { label: 'Formal form', value: item.formalStatement },
          { label: 'Over', value: list(item.collections, 'The whole system') },
        ]),
      );
    case 'permissions':
      return manifest.permissions.map((item) =>
        line(`${item.role} on ${item.collection}`, [
          { label: 'May', value: list(item.capabilities, 'Nothing') },
          { label: 'Fields', value: list(item.fields, 'Every field') },
          { label: 'Rows', value: item.rowQualification },
        ]),
      );
    case 'interfaces':
      return manifest.interfaces.map((item) =>
        line(item.name || item.view, [
          { label: 'Reads', value: item.collection },
          { label: 'Shows', value: list(item.boundFields, 'Every field') },
          { label: 'Offers', value: list(item.actions, 'No action') },
          { label: 'Roles that reach it', value: list(item.roles, 'Every role') },
        ]),
      );
    case 'integration':
      return manifest.integration.map((item) =>
        line(`${item.method} ${item.path}`, [
          { label: 'Values it takes', value: list(item.parameters, 'None') },
          { label: 'Answers with', value: item.response },
          { label: 'Reached by', value: item.visibility },
        ]),
      );
    case 'chain':
      return [
        line(manifest.chain.consensusProfile, [
          { label: 'What that means', value: manifest.chain.consequence },
          { label: 'Validator seats', value: String(manifest.chain.validatorSeats) },
          {
            label: 'Class table',
            value: list(
              manifest.chain.classTable.map(
                (entry) =>
                  `${entry.transactionClass} needs ${entry.threshold} percent${entry.mandatoryDelay ? ' and waits out a delay' : ''}`,
              ),
              'None',
            ),
          },
          { label: 'Governing authority', value: list(manifest.chain.governanceAuthority, 'None') },
          { label: 'Change process', value: manifest.chain.changeProcess || 'None stated' },
          {
            label: 'Constitutional delay',
            value: `${manifest.chain.constitutionalDelayBlocks} blocks`,
          },
        ]),
      ];
    case 'infrastructure':
      return [
        line(manifest.infrastructure.target, [
          { label: 'Nodes', value: String(manifest.infrastructure.nodeCount) },
          { label: 'Storage', value: `${manifest.infrastructure.storageGigabytes} gigabytes` },
          { label: 'Domains', value: list(manifest.infrastructure.domains, 'None yet') },
          {
            label: 'Certificates',
            value: list(manifest.infrastructure.certificates, 'None yet'),
          },
          { label: 'Backups', value: manifest.infrastructure.backupSchedule },
        ]),
      ];
    case 'security':
      return manifest.security.map((item) =>
        line(item.collection, [
          { label: 'Encryption', value: item.encryption },
          { label: 'Key custody', value: item.keyCustody },
          { label: 'Sign in', value: item.authentication },
          { label: 'Retention', value: item.retention },
          { label: 'Audit', value: item.auditScope },
        ]),
      );
    case 'modules':
      return manifest.modules.map((item) =>
        line(item.module, [
          { label: 'Why it is here', value: item.outcome },
          {
            label: 'Links',
            value: list(
              item.links.map((link) => `${link.kind} to ${link.target}`),
              'None',
            ),
          },
        ]),
      );
    case 'cost':
      return [
        line(manifest.cost.tier, [
          { label: 'Monthly', value: plainMoney(manifest.cost.monthlyMinor, manifest.cost.currency) },
          {
            label: 'Add-ons',
            value: list(
              manifest.cost.addOns.map(
                (entry) => `${entry.name} at ${plainMoney(entry.monthlyMinor, manifest.cost.currency)}`,
              ),
              'None',
            ),
          },
          { label: 'Storage', value: `${manifest.cost.storageGigabytes} gigabytes` },
          { label: 'Nodes', value: String(manifest.cost.nodeCount) },
        ]),
      ];
    default:
      return [];
  }
}

/** Every line of every group, in the order section 11.8.2 lists the groups. */
export function allLines(manifest: DeploymentManifest): ManifestLine[] {
  return MANIFEST_GROUPS.flatMap((group) => linesOfGroup(manifest, group));
}

/** The lines a search reaches. An empty search reaches every line. */
export function searchLines(lines: ManifestLine[], search: string): ManifestLine[] {
  const asked = search.trim().toLowerCase();
  if (asked.length === 0) return lines;
  const words = asked.split(/\s+/);
  return lines.filter((line) => words.every((word) => line.terms.includes(word)));
}

/** The count of lines in each group. */
export function groupCounts(manifest: DeploymentManifest): Record<ManifestGroup, number> {
  const counts = {} as Record<ManifestGroup, number>;
  for (const group of MANIFEST_GROUPS) {
    counts[group] = linesOfGroup(manifest, group).length;
  }
  return counts;
}

export type SummaryLine = {
  /** The figure a reviewer scans. */
  count: number;
  /** The name of the figure in plain words. */
  heading: string;
  /** One sentence stating what the figure covers. */
  states: string;
  /** The screen that produces this figure. */
  screen: string;
};

/** The headline figures, in the words a reviewer reads. */
export function summaryLines(counts: ManifestGroupCounts): SummaryLine[] {
  return [
    {
      count: counts.collections,
      heading: 'Kinds of record',
      states: 'Every kind of record this system keeps.',
      screen: 'Model, records',
    },
    {
      count: counts.fields,
      heading: 'Fields',
      states: 'Every value held across those records.',
      screen: 'Model, records',
    },
    {
      count: counts.indexes,
      heading: 'Indexes',
      states: 'Every index that makes a search over a record fast.',
      screen: 'Model, records',
    },
    {
      count: counts.actions,
      heading: 'Actions',
      states: 'Everything a person or another system does here.',
      screen: 'Model, rules and actions',
    },
    {
      count: counts.rules,
      heading: 'Rules',
      states: 'Everything this system refuses.',
      screen: 'Model, rules and actions',
    },
    {
      count: counts.workflows,
      heading: 'Workflows',
      states: 'Every kind of work that moves through states.',
      screen: 'Model, workflows',
    },
    {
      count: counts.states,
      heading: 'States',
      states: 'Every place work rests inside a workflow.',
      screen: 'Model, workflows',
    },
    {
      count: counts.transitions,
      heading: 'Moves',
      states: 'Every step work takes from one state to another.',
      screen: 'Model, workflows',
    },
    {
      count: counts.permissionEntries,
      heading: 'Permission entries',
      states: 'Every role set against every collection it reaches.',
      screen: 'Model, permissions',
    },
    {
      count: counts.interfaces,
      heading: 'Screens',
      states: 'Every screen the deployed application publishes.',
      screen: 'Blueprint, views',
    },
    {
      count: counts.endpoints,
      heading: 'Endpoints',
      states: 'Every address another system calls.',
      screen: 'Blueprint, views',
    },
    {
      count: counts.webhooks,
      heading: 'Notifications',
      states: 'Every event this system sends outward.',
      screen: 'Blueprint, views',
    },
    {
      count: counts.modules,
      heading: 'Parts installed',
      states: 'Every part Cerulea assembled for this system.',
      screen: 'Compose',
    },
  ];
}

/** One sentence naming the size of the whole manifest. */
export function summaryHeadline(counts: ManifestGroupCounts): string {
  return (
    `This deployment installs ${counts.modules} parts, keeps ${counts.collections} kinds of record ` +
    `across ${counts.fields} fields, and offers ${counts.actions} actions behind ${counts.permissionEntries} permission entries.`
  );
}
